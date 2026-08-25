from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from app.database import get_database
from app.models.attendance import AttendanceVerifyRequest, AttendanceCorrectionRequest, TodayStats, AttendanceStatus
from app.services.ai_service import ai_service
from app.services.matching_service import matching_service
from app.services.attendance_service import attendance_service
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
    print(f"[*] Received Kiosk frame from device {payload.device_id}, length: {len(payload.image_base64)}")
    
    # 1. Decode frame
    image = ai_service.decode_base64_image(payload.image_base64)
    if image is None:
        print("[!] Failed to decode base64 image")
        raise HTTPException(status_code=400, detail="Invalid image data")

    print(f"[*] Frame shape: {image.shape}")

    # 2. Face Detection & Liveness Check
    face_detected, is_live, cropped_face, meta = ai_service.detect_face_and_liveness(image)
    print(f"[*] Detection result: face_detected={face_detected}, is_live={is_live}, meta={meta}")
    
    if not face_detected:
        return {
            "status_code": "NO_FACE",
            "message": "No face detected in camera frame. Please look directly at the camera."
        }

    if not is_live:
        # Anti-spoofing alert
        await db.audit_logs.insert_one({
            "action": "SPOOF_ATTEMPT_BLOCKED",
            "details": {"device_id": payload.device_id, "meta": meta},
            "timestamp": datetime.utcnow()
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
        # Log unrecognized face event in Audit Logs (PRD Section 6.3 & Section 11)
        await db.audit_logs.insert_one({
            "action": "UNKNOWN_FACE_DETECTED",
            "details": {
                "device_id": payload.device_id,
                "confidence": round(confidence * 100, 2),
                "reason": "Face not enrolled or match confidence below threshold"
            },
            "timestamp": datetime.utcnow()
        })
        return {
            "status_code": "UNKNOWN_FACE",
            "message": "Face Not Recognized. Please contact the administrator to enroll.",
            "confidence": round(confidence * 100, 2)
        }

    # 6. Action == "ACCEPT" -> Process Attendance
    result = await attendance_service.process_attendance(matched_user, confidence, payload.device_id)
    return result

@router.get("/today-stats", response_model=TodayStats)
async def get_today_stats(current_admin: dict = Depends(get_current_admin)):
    """Summary overview for Admin Dashboard (Section 12.1)"""
    db = get_database()
    today_date, _ = attendance_service.get_current_date_and_time()

    total_employees = await db.users.count_documents({"status": "Active"})
    
    today_records = await db.attendance.find({"date": today_date}).to_list(length=1000)
    
    present_count = sum(1 for r in today_records if r.get("status") in ["Present", "Late"])
    late_count = sum(1 for r in today_records if r.get("status") == "Late")
    leave_count = sum(1 for r in today_records if r.get("status") == "Leave")
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
    """Today's Live Attendance Table (Section 12.2)"""
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
    """Admin manual attendance correction with full audit logging (Section 12.3 & 16.4)"""
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
    await db.audit_logs.insert_one({
        "admin_id": str(current_admin["_id"]),
        "admin_name": current_admin.get("name"),
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

    return {"message": "Attendance record updated successfully with audit trail."}
