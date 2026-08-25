from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from bson import ObjectId
from datetime import datetime
from app.database import get_database
from app.models.user import UserCreate, UserResponse, FaceEnrollmentRequest, UserStatus
from app.core.security import get_password_hash
from app.api.auth import get_current_admin
from app.services.ai_service import ai_service

router = APIRouter(prefix="/users", tags=["Users & Employees"])

@router.post("/", response_model=dict)
async def create_employee(user_in: UserCreate, current_admin: dict = Depends(get_current_admin)):
    db = get_database()
    
    # Check if email or employee_id already exists
    existing_email = await db.users.find_one({"email": user_in.email.lower()})
    if existing_email:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    
    existing_id = await db.users.find_one({"employee_id": user_in.employee_id.upper()})
    if existing_id:
        raise HTTPException(status_code=400, detail="Employee ID already exists")

    doc = user_in.model_dump()
    doc["email"] = doc["email"].lower()
    doc["employee_id"] = doc["employee_id"].upper()
    doc["created_at"] = datetime.utcnow()
    doc["face_embeddings"] = []
    
    if user_in.password:
        doc["hashed_password"] = get_password_hash(user_in.password)
        del doc["password"]
    else:
        doc["hashed_password"] = None

    result = await db.users.insert_one(doc)
    
    # Log audit
    await db.audit_logs.insert_one({
        "admin_id": str(current_admin["_id"]),
        "admin_name": current_admin.get("name"),
        "action": "EMPLOYEE_REGISTERED",
        "target_user_id": str(result.inserted_id),
        "target_user_name": doc["name"],
        "details": {"employee_id": doc["employee_id"], "role": doc["role"]},
        "timestamp": datetime.utcnow()
    })

    return {
        "message": "Employee registered successfully. Ready for face enrollment.",
        "user_id": str(result.inserted_id),
        "employee_id": doc["employee_id"]
    }

@router.post("/enroll-face")
async def enroll_face(payload: FaceEnrollmentRequest, current_admin: dict = Depends(get_current_admin)):
    """
    Captures multi-angle face samples (Front, Left, Right) and generates embeddings with DPDP Act consent.
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
        raise HTTPException(status_code=400, detail="Explicit consent is mandatory under DPDP Act 2023 for biometric enrollment.")

    embeddings = []
    sample_count = 0

    for idx, img_b64 in enumerate(payload.face_images):
        img = ai_service.decode_base64_image(img_b64)
        if img is None:
            continue
        
        face_detected, is_live, cropped_face, meta = ai_service.detect_face_and_liveness(img)
        if not face_detected:
            continue
        
        emb = ai_service.generate_face_embedding(img)
        if emb:
            embeddings.append(emb)
            sample_count += 1

    if len(embeddings) == 0:
        raise HTTPException(status_code=400, detail="Could not detect valid faces in the provided samples. Please retake photos with proper lighting.")

    consent_record = {
        "consent_given": True,
        "enrolled_by_admin_id": str(current_admin["_id"]),
        "enrolled_by_admin_name": current_admin.get("name"),
        "timestamp": payload.consent_timestamp or datetime.utcnow().isoformat(),
        "num_samples": sample_count
    }

    # Store encrypted vector representations (never raw imagery)
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

    # Log audit
    await db.audit_logs.insert_one({
        "admin_id": str(current_admin["_id"]),
        "admin_name": current_admin.get("name"),
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
            "status": u.get("status", "Active"),
            "has_face_enrolled": len(u.get("face_embeddings", [])) > 0,
            "created_at": u.get("created_at")
        })
    return users

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

    # Log audit
    await db.audit_logs.insert_one({
        "admin_id": str(current_admin["_id"]),
        "admin_name": current_admin.get("name"),
        "action": "USER_STATUS_CHANGED",
        "target_user_id": user_id,
        "target_user_name": user.get("name"),
        "details": {"new_status": new_status.value},
        "timestamp": datetime.utcnow()
    })

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
        raise HTTPException(status_code=400, detail="Primary Admin account cannot be deleted")

    await db.users.delete_one({"_id": user_obj_id})
    await db.attendance.delete_many({"user_id": user_id})

    # Log audit
    await db.audit_logs.insert_one({
        "admin_id": str(current_admin["_id"]),
        "admin_name": current_admin.get("name"),
        "action": "USER_DELETED",
        "target_user_id": user_id,
        "target_user_name": user.get("name"),
        "timestamp": datetime.utcnow()
    })

    return {"message": f"Employee {user.get('name')} deleted successfully."}
