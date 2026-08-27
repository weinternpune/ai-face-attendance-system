from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from app.database import get_database
from app.models.attendance import AttendanceVerifyRequest, MobileAttendanceVerifyRequest, ActiveChallengeVerifyRequest, AttendanceCorrectionRequest, TodayStats, AttendanceStatus
from app.services.ai_service import ai_service
from app.services.matching_service import matching_service
from app.services.attendance_service import attendance_service
from app.services.geofence_service import geofence_service
from app.core.websocket import ws_manager
from app.api.auth import get_current_admin

router = APIRouter(prefix="/attendance", tags=["Attendance System"])

@router.post("/verify")
async def verify_kiosk_face(payload: AttendanceVerifyRequest):
    """
    Main Kiosk Endpoint:
    Receives camera frame base64, validates face & liveness, matches embedding against active users,
    marks attendance or handles duplicate / unrecognized states according to PRD.
    """
    db = get_database()
    
    # 1. Decode frame
    image = ai_service.decode_base64_image(payload.image_base64)
    if image is None:
        raise HTTPException(status_code=400, detail="Invalid image data")

    # 2. Face Detection & Liveness Check
    face_detected, is_live, cropped_face, meta = ai_service.detect_face_and_liveness(image)
    
    if not face_detected:
        return {
            "status_code": "NO_FACE",
            "message": "No face detected in camera frame. Please look directly at the camera."
        }

    if not is_live:
        # Anti-spoofing alert & Notification
        await db.audit_logs.insert_one({
            "action": "SPOOF_ATTEMPT_BLOCKED",
            "details": {"device_id": payload.device_id, "meta": meta},
            "timestamp": datetime.utcnow()
        })
        await db.notifications.insert_one({
            "title": "🚨 Spoof Attempt Blocked",
            "message": f"Photo or screen presentation detected on {payload.device_id}.",
            "type": "ALERT",
            "category": "SECURITY",
            "is_read": False,
            "created_at": datetime.utcnow()
        })
        await ws_manager.broadcast({
            "event": "SECURITY_ALERT",
            "data": {"title": "Spoof Attempt Blocked", "device_id": payload.device_id}
        })
        return {
            "status_code": "SPOOF_DETECTED",
            "message": "Liveness check failed. Spoofing or photo display detected."
        }

    # 3. Generate query embedding
    query_emb = ai_service.generate_face_embedding(image)
    if not query_emb:
        return {
            "status_code": "EMBEDDING_FAILED",
            "message": "Could not extract clear facial features. Please adjust lighting."
        }

    # 4. Fetch all active users with enrolled embeddings
    cursor = db.users.find({"status": "Active", "face_embeddings": {"$exists": True, "$ne": []}})
    registered_users = await cursor.to_list(length=1000)

    # 5. Run matching algorithm
    matched_user = None
    confidence = 0.0
    action = "REJECT"

    if registered_users:
        matched_user, confidence, action = matching_service.find_best_match(query_emb, registered_users)

    if action != "ACCEPT" or not matched_user:
        await db.audit_logs.insert_one({
            "action": "UNKNOWN_FACE_DETECTED",
            "details": {
                "device_id": payload.device_id,
                "confidence": round(confidence * 100, 2),
                "reason": "Face not enrolled or match confidence below threshold"
            },
            "timestamp": datetime.utcnow()
        })
        await ws_manager.broadcast({
            "event": "UNKNOWN_FACE",
            "data": {"device_id": payload.device_id, "confidence": round(confidence * 100, 2)}
        })
        return {
            "status_code": "UNKNOWN_FACE",
            "message": "Face Not Recognized. Please contact the administrator to enroll.",
            "confidence": round(confidence * 100, 2)
        }

    # 6. Action == "ACCEPT" -> Process Attendance
    result = await attendance_service.process_attendance(matched_user, confidence, payload.device_id, verification_mode="KIOSK")
    return result

@router.post("/mobile-verify")
async def verify_mobile_geofence(payload: MobileAttendanceVerifyRequest):
    """
    Phase 3 Mobile Geofencing Endpoint:
    1. Validates employee GPS location against configured office geofences.
    2. Validates face frame & liveness.
    3. Matches biometric vector and stamps attendance with location details.
    """
    db = get_database()

    # 1. Geofence Perimeter Validation
    cursor = db.geofences.find({"is_active": True})
    active_geofences = await cursor.to_list(length=100)

    is_inside, matched_fence, dist = geofence_service.evaluate_geofences(
        payload.latitude, 
        payload.longitude, 
        active_geofences
    )

    if not is_inside and matched_fence:
        fence_name = matched_fence.get("name", "Office Perimeter")
        radius = matched_fence.get("radius_meters", 100.0)
        
        # Log failed geofence attempt to audit
        await db.audit_logs.insert_one({
            "action": "GEOFENCE_REJECTED",
            "details": {
                "latitude": payload.latitude,
                "longitude": payload.longitude,
                "distance_meters": dist,
                "allowed_radius": radius,
                "target_geofence": fence_name
            },
            "timestamp": datetime.utcnow()
        })

        return {
            "status_code": "GEOFENCE_REJECTED",
            "message": f"Outside office geofence. You are {int(dist)}m away from '{fence_name}' (Allowed: {int(radius)}m).",
            "distance_meters": dist,
            "allowed_radius": radius,
            "fence_name": fence_name
        }

    fence_name = matched_fence.get("name") if matched_fence else "Default Office Zone"

    # 2. Decode & validate image
    image = ai_service.decode_base64_image(payload.image_base64)
    if image is None:
        raise HTTPException(status_code=400, detail="Invalid image data")

    # 3. Face Detection & Liveness
    face_detected, is_live, _, meta = ai_service.detect_face_and_liveness(image)
    if not face_detected:
        return {
            "status_code": "NO_FACE",
            "message": "No face detected in selfie. Please look directly at your front camera."
        }

    if not is_live:
        await db.notifications.insert_one({
            "title": "🚨 Mobile Spoof Blocked",
            "message": f"Mobile photo spoof attempt detected from GPS ({payload.latitude}, {payload.longitude}).",
            "type": "ALERT",
            "category": "SECURITY",
            "is_read": False,
            "created_at": datetime.utcnow()
        })
        return {
            "status_code": "SPOOF_DETECTED",
            "message": "Liveness check failed. Please ensure natural lighting and look directly into the camera."
        }

    # 4. Generate Embedding
    query_emb = ai_service.generate_face_embedding(image)
    if not query_emb:
        return {
            "status_code": "EMBEDDING_FAILED",
            "message": "Could not extract facial features. Please adjust camera angle."
        }

    # 5. Match against active enrolled users
    cursor = db.users.find({"status": "Active", "face_embeddings": {"$exists": True, "$ne": []}})
    registered_users = await cursor.to_list(length=1000)

    matched_user, confidence, action = matching_service.find_best_match(query_emb, registered_users)

    if action != "ACCEPT" or not matched_user:
        return {
            "status_code": "UNKNOWN_FACE",
            "message": "Face Not Recognized. Please contact HR/Admin to register your face biometrics.",
            "confidence": round(confidence * 100, 2)
        }

    # 6. Process Mobile Attendance
    result = await attendance_service.process_attendance(
        user=matched_user,
        confidence=confidence,
        device_id=payload.device_id or "MOBILE_SELF_SERVICE",
        verification_mode="MOBILE_GEOFENCE",
        location_name=fence_name,
        latitude=payload.latitude,
        longitude=payload.longitude,
        distance_meters=dist
    )
    return result

@router.get("/challenge")
async def get_active_liveness_challenge():
    """
    Phase 3 Module 3: Returns a random unpredictable active anti-spoofing challenge.
    """
    import random
    challenges = [
        {
            "challenge_type": "SMILE",
            "title": "Smile at the Camera 😊",
            "instruction": "Please smile naturally so our AI verifies active liveness.",
            "icon": "Smile",
            "timeout_seconds": 12
        },
        {
            "challenge_type": "BLINK",
            "title": "Blink Your Eyes 👁️",
            "instruction": "Please blink your eyes naturally once or twice.",
            "icon": "Eye",
            "timeout_seconds": 12
        },
        {
            "challenge_type": "HEAD_TURN",
            "title": "Turn Head Slightly 🔄",
            "instruction": "Please turn your head slightly to either side.",
            "icon": "RotateCcw",
            "timeout_seconds": 12
        }
    ]
    return random.choice(challenges)

@router.post("/verify-active-challenge")
async def verify_active_challenge(payload: ActiveChallengeVerifyRequest):
    """
    Phase 3 Module 3: Verifies active interactive anti-spoofing challenge + biometric face match.
    """
    db = get_database()

    # 1. Decode Frame
    image = ai_service.decode_base64_image(payload.image_base64)
    if image is None:
        raise HTTPException(status_code=400, detail="Invalid image data")

    # 2. Evaluate Active Challenge
    is_passed, challenge_msg, meta = ai_service.evaluate_active_challenge(
        image=image, 
        challenge_type=payload.challenge_type
    )

    if not is_passed:
        return {
            "status_code": "CHALLENGE_FAILED",
            "message": challenge_msg,
            "challenge_type": payload.challenge_type,
            "metadata": meta
        }

    # 3. Passive Texture Liveness check
    face_detected, is_live, _, _ = ai_service.detect_face_and_liveness(image)
    if not face_detected:
        return {
            "status_code": "NO_FACE",
            "message": "No face detected in camera frame."
        }

    # 4. Generate Embedding & Match
    query_emb = ai_service.generate_face_embedding(image)
    if not query_emb:
        return {
            "status_code": "EMBEDDING_FAILED",
            "message": "Could not extract facial embedding."
        }

    cursor = db.users.find({"status": "Active", "face_embeddings": {"$exists": True, "$ne": []}})
    registered_users = await cursor.to_list(length=1000)

    matched_user, confidence, action = matching_service.find_best_match(query_emb, registered_users)

    if action != "ACCEPT" or not matched_user:
        return {
            "status_code": "UNKNOWN_FACE",
            "message": "Challenge passed, but face is not recognized in employee records.",
            "confidence": round(confidence * 100, 2)
        }

    # 5. Process Attendance with Active Liveness confirmation
    result = await attendance_service.process_attendance(
        user=matched_user,
        confidence=confidence,
        device_id=payload.device_id or "KIOSK-ACTIVE-CHALLENGE",
        verification_mode="ACTIVE_AI_LIVENESS"
    )
    result["challenge_passed"] = True
    result["challenge_type"] = payload.challenge_type
    return result

@router.get("/today-stats", response_model=TodayStats)
async def get_today_stats(current_admin: dict = Depends(get_current_admin)):
    """Summary overview for Admin Dashboard"""
    db = get_database()
    today_date, _ = attendance_service.get_current_date_and_time()

    # Count active employees eligible for attendance (excluding System Admin)
    total_employees = await db.users.count_documents({"status": "Active", "role": {"$ne": "Admin"}})
    if total_employees == 0:
        total_employees = await db.users.count_documents({"status": "Active"})
    
    today_records = await db.attendance.find({"date": today_date}).to_list(length=1000)
    
    # Also check approved leaves covering today
    approved_leaves_count = await db.leaves.count_documents({
        "status": "Approved",
        "start_date": {"$lte": today_date},
        "end_date": {"$gte": today_date}
    })

    present_count = sum(1 for r in today_records if r.get("status") in ["Present", "Late"])
    late_count = sum(1 for r in today_records if r.get("status") == "Late")
    leave_count = sum(1 for r in today_records if r.get("status") == "Leave") + approved_leaves_count
    absent_count = max(0, total_employees - (present_count + leave_count))

    return TodayStats(
        total_employees=total_employees,
        present=present_count,
        absent=absent_count,
        late=late_count,
        on_leave=leave_count
    )

@router.get("/today")
async def get_today_attendance(current_admin: dict = Depends(get_current_admin)):
    """Today's Live Attendance Table"""
    db = get_database()
    today_date, _ = attendance_service.get_current_date_and_time()

    cursor = db.attendance.find({"date": today_date}).sort("entry_time", -1)
    records = []
    async for r in cursor:
        records.append({
            "id": str(r["_id"]),
            "user_id": r.get("user_id"),
            "employee_id": r.get("employee_id"),
            "employee_name": r.get("employee_name"),
            "department": r.get("department"),
            "entry_time": r.get("entry_time"),
            "exit_time": r.get("exit_time", "—"),
            "status": r.get("status"),
            "confidence": r.get("recognition_confidence"),
            "is_manual": r.get("is_manual_correction", False)
        })
    return records

@router.patch("/{attendance_id}/correct")
async def manual_correct_attendance(
    attendance_id: str, 
    payload: AttendanceCorrectionRequest, 
    current_admin: dict = Depends(get_current_admin)
):
    """Admin manual attendance correction with full audit logging"""
    db = get_database()
    try:
        att_obj_id = ObjectId(attendance_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid attendance ID")

    record = await db.attendance.find_one({"_id": att_obj_id})
    if not record:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    old_status = record.get("status")
    update_data = {
        "status": payload.status.value,
        "is_manual_correction": True,
        "updated_at": datetime.utcnow()
    }
    if payload.entry_time:
        update_data["entry_time"] = payload.entry_time

    await db.attendance.update_one({"_id": att_obj_id}, {"$set": update_data})

    # Log to Audit Trail
    admin_id = str(current_admin.get("_id") or current_admin.get("id") or "SYSTEM")
    admin_name = current_admin.get("name", "Administrator")
    await db.audit_logs.insert_one({
        "admin_id": admin_id,
        "admin_name": admin_name,
        "action": "MANUAL_ATTENDANCE_CORRECTION",
        "target_user_id": record.get("user_id"),
        "target_user_name": record.get("employee_name"),
        "details": {
            "attendance_id": attendance_id,
            "old_status": old_status,
            "new_status": payload.status.value,
            "reason": payload.reason
        },
        "timestamp": datetime.utcnow()
    })

    # Broadcast correction update
    await ws_manager.broadcast({
        "event": "ATTENDANCE_CORRECTED",
        "data": {
            "attendance_id": attendance_id,
            "status": payload.status.value,
            "entry_time": payload.entry_time or record.get("entry_time")
        }
    })

    return {"message": "Attendance record updated successfully with audit trail."}

@router.post("/sync-offline")
async def sync_offline_attendance(batch: List[dict]):
    """
    Phase 3 Module 6: Receives queued offline attendance stamps from Kiosk/Mobile when internet reconnects.
    """
    db = get_database()
    synced_count = 0
    errors = []

    for item in batch:
        emp_id = item.get("employee_id")
        date_str = item.get("date")
        if not emp_id or not date_str:
            continue

        # Check if already recorded
        existing = await db.attendance.find_one({"employee_id": emp_id, "date": date_str})
        if existing:
            continue

        # Look up employee
        user = await db.users.find_one({"employee_id": emp_id})
        emp_name = user.get("name", item.get("employee_name", "Employee")) if user else item.get("employee_name", "Employee")
        u_id = str(user["_id"]) if user else item.get("user_id", "OFFLINE_USER")
        dept = user.get("department", "General") if user else item.get("department", "General")

        doc = {
            "user_id": u_id,
            "employee_id": emp_id,
            "employee_name": emp_name,
            "department": dept,
            "date": date_str,
            "entry_time": item.get("entry_time"),
            "exit_time": item.get("exit_time"),
            "working_hours": item.get("working_hours", 0.0),
            "overtime_hours": item.get("overtime_hours", 0.0),
            "work_duration": item.get("work_duration", "Full Day"),
            "status": item.get("status", "Present"),
            "recognition_confidence": item.get("confidence", 95.0),
            "device_id": item.get("device_id", "KIOSK-OFFLINE-SYNC"),
            "verification_mode": item.get("verification_mode", "OFFLINE_SYNC"),
            "is_offline_sync": True,
            "is_manual_correction": False,
            "created_at": datetime.utcnow()
        }

        await db.attendance.insert_one(doc)
        synced_count += 1

    if synced_count > 0:
        # Create in-app notification for admin
        await db.notifications.insert_one({
            "title": "📶 Offline Attendance Synced",
            "message": f"Successfully synced {synced_count} offline attendance punch records to database.",
            "type": "INFO",
            "category": "SYSTEM",
            "is_read": False,
            "created_at": datetime.utcnow()
        })

    return {
        "status": "SUCCESS",
        "synced_count": synced_count,
        "message": f"Successfully synced {synced_count} offline attendance records."
    }

