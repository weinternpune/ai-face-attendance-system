from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional, Dict, Any
from bson import ObjectId
from datetime import datetime
from pydantic import BaseModel
from app.database import get_database
from app.models.user import UserCreate, UserResponse, FaceEnrollmentRequest, UserStatus
from app.core.security import get_password_hash
from app.api.auth import get_current_admin, get_current_user
from app.services.ai_service import ai_service
from app.core.websocket import ws_manager

router = APIRouter(prefix="/users", tags=["Users & Employees"])

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    employee_type: Optional[str] = None
    shift_name: Optional[str] = None
    status: Optional[str] = None

@router.post("", response_model=dict)
@router.post("/", response_model=dict)
async def create_employee(user_in: UserCreate, current_admin: dict = Depends(get_current_admin)):
    db = get_database()
    
    existing_email = await db.users.find_one({"email": user_in.email.lower()})
    if existing_email:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    
    existing_id = await db.users.find_one({"employee_id": user_in.employee_id.upper()})
    if existing_id:
        raise HTTPException(status_code=400, detail="Employee ID already exists")

    doc = user_in.model_dump()
    doc["email"] = doc["email"].lower().strip()
    doc["employee_id"] = doc["employee_id"].upper().strip()
    doc["created_at"] = datetime.utcnow()
    doc["face_embeddings"] = []
    
    if user_in.password and len(user_in.password.strip()) > 0:
        doc["hashed_password"] = get_password_hash(user_in.password.strip())
        doc.pop("password", None)
    else:
        doc["hashed_password"] = None
        doc.pop("password", None)

    result = await db.users.insert_one(doc)
    inserted_id_str = str(result.inserted_id)
    
    admin_id = str(current_admin.get("_id") or current_admin.get("id") or "SYSTEM")
    admin_name = current_admin.get("name", "Administrator")

    await db.audit_logs.insert_one({
        "admin_id": admin_id,
        "admin_name": admin_name,
        "action": "EMPLOYEE_REGISTERED",
        "target_user_id": inserted_id_str,
        "target_user_name": doc["name"],
        "details": {"employee_id": doc["employee_id"], "role": doc["role"], "shift": doc.get("shift_name")},
        "timestamp": datetime.utcnow()
    })

    return {
        "message": "Employee registered successfully. Ready for face enrollment.",
        "user_id": inserted_id_str,
        "employee_id": doc["employee_id"]
    }

@router.post("/enroll-face")
async def enroll_face(payload: FaceEnrollmentRequest, current_admin: dict = Depends(get_current_admin)):
    """
    Captures multi-angle face samples and generates embeddings with DPDP Act consent.
    """
    db = get_database()
    
    try:
        user_obj_id = ObjectId(payload.user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID format")

    user = await db.users.find_one({"_id": user_obj_id})
    if not user:
        raise HTTPException(status_code=404, detail="Employee not found")

    if not payload.consent_given:
        raise HTTPException(
            status_code=400, 
            detail="Biometric consent is mandatory under the DPDP Act 2023 for face enrollment."
        )

    embeddings = []
    for idx, b64_img in enumerate(payload.face_images):
        img_np = ai_service.decode_base64_image(b64_img)
        if img_np is None:
            continue
        
        emb = ai_service.generate_face_embedding(img_np)
        if emb:
            embeddings.append(emb)

    if not embeddings:
        raise HTTPException(
            status_code=400, 
            detail="Could not generate valid facial embeddings from images. Please ensure face is centered with clear lighting."
        )

    admin_id = str(current_admin.get("_id") or current_admin.get("id") or "SYSTEM")
    admin_name = current_admin.get("name", "Administrator")

    consent_record = {
        "consent_given": True,
        "purpose": "Biometric Office Attendance Verification",
        "timestamp": payload.consent_timestamp or datetime.utcnow().isoformat(),
        "consented_by_admin": admin_name,
        "compliance_act": "Digital Personal Data Protection Act (DPDP) 2023",
        "vector_dimensions": len(embeddings[0]) if embeddings else 0
    }

    await db.users.update_one(
        {"_id": user_obj_id},
        {
            "$set": {
                "face_embeddings": embeddings,
                "consent_record": consent_record,
                "updated_at": datetime.utcnow()
            }
        }
    )

    sample_count = len(embeddings)
    await db.audit_logs.insert_one({
        "admin_id": admin_id,
        "admin_name": admin_name,
        "action": "FACE_ENROLLED",
        "target_user_id": str(user["_id"]),
        "target_user_name": user.get("name"),
        "details": {"samples_stored": sample_count},
        "timestamp": datetime.utcnow()
    })

    return {
        "message": f"Successfully enrolled face with {sample_count} multi-angle samples.",
        "user_id": payload.user_id,
        "sample_count": sample_count
    }

@router.get("")
@router.get("/")
async def list_employees(
    department: Optional[str] = None,
    status: Optional[str] = None,
    current_admin: dict = Depends(get_current_admin)
):
    db = get_database()
    query = {}
    if department:
        query["department"] = department
    if status:
        query["status"] = status

    cursor = db.users.find(query).sort("name", 1)
    users = []
    async for u in cursor:
        users.append({
            "id": str(u["_id"]),
            "name": u.get("name"),
            "employee_id": u.get("employee_id"),
            "email": u.get("email"),
            "phone": u.get("phone"),
            "role": u.get("role"),
            "department": u.get("department"),
            "designation": u.get("designation"),
            "employee_type": u.get("employee_type"),
            "shift_name": u.get("shift_name", "General Shift"),
            "status": u.get("status", "Active"),
            "has_face_enrolled": len(u.get("face_embeddings", [])) > 0,
            "created_at": u.get("created_at")
        })
    return users

@router.patch("/{user_id}")
async def update_employee_details(
    user_id: str, 
    payload: UserUpdate, 
    current_admin: dict = Depends(get_current_admin)
):
    db = get_database()
    try:
        user_obj_id = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    user = await db.users.find_one({"_id": user_obj_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    update_dict = {k: v for k, v in payload.dict().items() if v is not None}
    if not update_dict:
        return {"message": "No changes provided"}

    update_dict["updated_at"] = datetime.utcnow()
    await db.users.update_one({"_id": user_obj_id}, {"$set": update_dict})

    admin_id = str(current_admin.get("_id") or current_admin.get("id") or "SYSTEM")
    admin_name = current_admin.get("name", "Administrator")

    await db.audit_logs.insert_one({
        "admin_id": admin_id,
        "admin_name": admin_name,
        "action": "USER_DETAILS_UPDATED",
        "target_user_id": user_id,
        "target_user_name": user.get("name"),
        "details": update_dict,
        "timestamp": datetime.utcnow()
    })

    return {"message": "Employee details updated successfully"}

@router.patch("/{user_id}/status")
async def toggle_employee_status(user_id: str, new_status: UserStatus, current_admin: dict = Depends(get_current_admin)):
    db = get_database()
    try:
        user_obj_id = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    user = await db.users.find_one({"_id": user_obj_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await db.users.update_one({"_id": user_obj_id}, {"$set": {"status": new_status.value, "updated_at": datetime.utcnow()}})

    admin_id = str(current_admin.get("_id") or current_admin.get("id") or "SYSTEM")
    admin_name = current_admin.get("name", "Administrator")

    await db.audit_logs.insert_one({
        "admin_id": admin_id,
        "admin_name": admin_name,
        "action": "USER_STATUS_CHANGED",
        "target_user_id": user_id,
        "target_user_name": user.get("name"),
        "details": {"new_status": new_status.value},
        "timestamp": datetime.utcnow()
    })

    return {"message": f"Employee status updated to {new_status.value}"}

@router.delete("/{user_id}")
async def delete_employee(user_id: str, current_admin: dict = Depends(get_current_admin)):
    db = get_database()
    try:
        user_obj_id = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    user = await db.users.find_one({"_id": user_obj_id})
    if not user:
        raise HTTPException(status_code=404, detail="Employee not found")

    if user.get("role") == "Admin":
        raise HTTPException(status_code=400, detail="Root Administrator accounts cannot be deleted.")

    # 1. Delete user
    await db.users.delete_one({"_id": user_obj_id})

    # 2. Clean up attendance & leaves records for this employee
    await db.attendance.delete_many({
        "$or": [
            {"user_id": user_id},
            {"employee_id": user.get("employee_id")}
        ]
    })
    await db.leaves.delete_many({
        "$or": [
            {"employee_id": user.get("employee_id")}
        ]
    })

    # 3. Log to Audit
    admin_id = str(current_admin.get("_id") or current_admin.get("id") or "SYSTEM")
    admin_name = current_admin.get("name", "Administrator")

    await db.audit_logs.insert_one({
        "admin_id": admin_id,
        "admin_name": admin_name,
        "action": "EMPLOYEE_DELETED",
        "target_user_id": user_id,
        "target_user_name": user.get("name"),
        "details": {"employee_id": user.get("employee_id")},
        "timestamp": datetime.utcnow()
    })

    # 4. Broadcast live update over WebSocket
    await ws_manager.broadcast({
        "event": "EMPLOYEE_DELETED",
        "data": {"employee_id": user.get("employee_id"), "name": user.get("name")}
    })

    return {"message": f"Employee {user.get('name')} and associated attendance data deleted successfully"}

# -------------------------------------------------------------
# Phase 3 Module 4: Employee Self-Service Portal Endpoints
# -------------------------------------------------------------

@router.get("/me/profile")
async def get_my_profile(current_user: dict = Depends(get_current_user)):
    """Personal employee profile details"""
    return {
        "id": str(current_user.get("_id") or current_user.get("id")),
        "name": current_user.get("name"),
        "employee_id": current_user.get("employee_id"),
        "email": current_user.get("email"),
        "phone": current_user.get("phone"),
        "role": current_user.get("role", "Employee"),
        "department": current_user.get("department", "General"),
        "designation": current_user.get("designation", "Staff"),
        "employee_type": current_user.get("employee_type", "Full-Time"),
        "shift_name": current_user.get("shift_name", "General Shift"),
        "has_enrolled_face": len(current_user.get("face_embeddings", [])) > 0,
        "enrolled_samples_count": len(current_user.get("face_embeddings", [])),
        "status": current_user.get("status", "Active")
    }

@router.get("/me/attendance")
async def get_my_attendance_history(current_user: dict = Depends(get_current_user)):
    """Personal employee attendance logs"""
    db = get_database()
    u_id = str(current_user.get("_id") or current_user.get("id"))
    emp_id = current_user.get("employee_id")

    cursor = db.attendance.find({
        "$or": [
            {"user_id": u_id},
            {"employee_id": emp_id}
        ]
    }).sort("date", -1).limit(60)

    records = []
    async for r in cursor:
        records.append({
            "id": str(r["_id"]),
            "date": r.get("date"),
            "entry_time": r.get("entry_time"),
            "exit_time": r.get("exit_time") or "—",
            "working_hours": r.get("working_hours", 0.0),
            "overtime_hours": r.get("overtime_hours", 0.0),
            "work_duration": r.get("work_duration", "In Progress"),
            "status": r.get("status"),
            "verification_mode": r.get("verification_mode", "KIOSK"),
            "location_name": r.get("location_name")
        })
    return records

@router.get("/me/leaves")
async def get_my_leaves(current_user: dict = Depends(get_current_user)):
    """Personal employee leave requests & balance tracking"""
    db = get_database()
    emp_id = current_user.get("employee_id")

    cursor = db.leaves.find({"employee_id": emp_id}).sort("applied_at", -1)
    leaves = []
    async for l in cursor:
        leaves.append({
            "id": str(l["_id"]),
            "leave_type": l.get("leave_type"),
            "start_date": l.get("start_date"),
            "end_date": l.get("end_date"),
            "reason": l.get("reason"),
            "status": l.get("status"),
            "admin_remarks": l.get("admin_remarks"),
            "applied_at": l.get("applied_at")
        })

    # Calculate standard balances (Casual: 12, Sick: 10, Paid: 15)
    used_casual = sum(1 for l in leaves if l["leave_type"] == "Casual Leave" and l["status"] == "Approved")
    used_sick = sum(1 for l in leaves if l["leave_type"] == "Sick Leave" and l["status"] == "Approved")
    used_paid = sum(1 for l in leaves if l["leave_type"] == "Paid Leave" and l["status"] == "Approved")

    return {
        "leaves": leaves,
        "balances": {
            "casual_leave": {"total": 12, "used": used_casual, "remaining": max(0, 12 - used_casual)},
            "sick_leave": {"total": 10, "used": used_sick, "remaining": max(0, 10 - used_sick)},
            "paid_leave": {"total": 15, "used": used_paid, "remaining": max(0, 15 - used_paid)}
        }
    }
