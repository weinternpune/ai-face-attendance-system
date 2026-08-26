from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from bson import ObjectId
from datetime import datetime
from pydantic import BaseModel, Field
from app.database import get_database
from app.models.shift import ShiftCreate, ShiftResponse
from app.api.auth import get_current_admin

router = APIRouter(prefix="/shifts", tags=["Shift Management"])

class ShiftUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    grace_period_minutes: Optional[int] = None
    late_threshold_minutes: Optional[int] = None
    description: Optional[str] = None
    is_default: Optional[bool] = None

@router.get("", response_model=List[ShiftResponse])
async def list_shifts(current_admin: dict = Depends(get_current_admin)):
    """List all configured work shifts"""
    db = get_database()
    cursor = db.shifts.find().sort("start_time", 1)
    shifts = []
    async for s in cursor:
        shifts.append(ShiftResponse(
            id=str(s["_id"]),
            name=s["name"],
            code=s["code"],
            start_time=s["start_time"],
            end_time=s["end_time"],
            grace_period_minutes=s.get("grace_period_minutes", 15),
            late_threshold_minutes=s.get("late_threshold_minutes", 30),
            description=s.get("description"),
            is_default=s.get("is_default", False),
            created_at=s.get("created_at")
        ))
    
    # If no shifts in DB, initialize defaults
    if not shifts:
        defaults = [
            {"name": "General Shift", "code": "GEN", "start_time": "09:00", "end_time": "18:00", "grace_period_minutes": 30, "late_threshold_minutes": 45, "description": "Standard 9 AM to 6 PM with 30 min grace", "is_default": True, "created_at": datetime.utcnow()},
            {"name": "Morning Shift", "code": "MOR", "start_time": "07:00", "end_time": "16:00", "grace_period_minutes": 15, "late_threshold_minutes": 30, "description": "Early morning shift 7 AM to 4 PM", "is_default": False, "created_at": datetime.utcnow()},
            {"name": "Evening Shift", "code": "EVE", "start_time": "14:00", "end_time": "23:00", "grace_period_minutes": 15, "late_threshold_minutes": 30, "description": "Afternoon to night shift", "is_default": False, "created_at": datetime.utcnow()},
        ]
        for d in defaults:
            res = await db.shifts.insert_one(d)
            shifts.append(ShiftResponse(id=str(res.inserted_id), **d))

    return shifts

@router.post("", response_model=ShiftResponse)
async def create_shift(payload: ShiftCreate, current_admin: dict = Depends(get_current_admin)):
    """Create a new work shift"""
    db = get_database()
    
    # Check duplicate name or code
    existing = await db.shifts.find_one({"$or": [{"name": payload.name}, {"code": payload.code}]})
    if existing:
        raise HTTPException(status_code=400, detail="Shift with this name or code already exists")

    if payload.is_default:
        await db.shifts.update_many({}, {"$set": {"is_default": False}})

    doc = payload.dict()
    doc["created_at"] = datetime.utcnow()
    res = await db.shifts.insert_one(doc)

    return ShiftResponse(id=str(res.inserted_id), **doc)

@router.patch("/{shift_id}", response_model=ShiftResponse)
async def update_shift(shift_id: str, payload: ShiftUpdate, current_admin: dict = Depends(get_current_admin)):
    """Update existing shift timings, grace periods and details"""
    db = get_database()
    try:
        s_id = ObjectId(shift_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid shift ID")

    shift = await db.shifts.find_one({"_id": s_id})
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")

    update_dict = {k: v for k, v in payload.dict().items() if v is not None}
    if not update_dict:
        return ShiftResponse(id=str(shift["_id"]), **shift)

    if update_dict.get("is_default"):
        await db.shifts.update_many({"_id": {"$ne": s_id}}, {"$set": {"is_default": False}})

    update_dict["updated_at"] = datetime.utcnow()
    await db.shifts.update_one({"_id": s_id}, {"$set": update_dict})

    updated_shift = await db.shifts.find_one({"_id": s_id})
    
    # Log to audit
    admin_id = str(current_admin.get("_id") or current_admin.get("id") or "SYSTEM")
    admin_name = current_admin.get("name", "Administrator")
    await db.audit_logs.insert_one({
        "admin_id": admin_id,
        "admin_name": admin_name,
        "action": "SHIFT_UPDATED",
        "details": {"shift_id": shift_id, "shift_name": updated_shift.get("name"), "changes": update_dict},
        "timestamp": datetime.utcnow()
    })

    return ShiftResponse(
        id=str(updated_shift["_id"]),
        name=updated_shift["name"],
        code=updated_shift["code"],
        start_time=updated_shift["start_time"],
        end_time=updated_shift["end_time"],
        grace_period_minutes=updated_shift.get("grace_period_minutes", 15),
        late_threshold_minutes=updated_shift.get("late_threshold_minutes", 30),
        description=updated_shift.get("description"),
        is_default=updated_shift.get("is_default", False),
        created_at=updated_shift.get("created_at")
    )

@router.delete("/{shift_id}")
async def delete_shift(shift_id: str, current_admin: dict = Depends(get_current_admin)):
    """Delete a shift"""
    db = get_database()
    try:
        s_id = ObjectId(shift_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid shift ID")

    shift = await db.shifts.find_one({"_id": s_id})
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")

    if shift.get("is_default"):
        raise HTTPException(status_code=400, detail="Cannot delete the default shift. Mark another shift as default first.")

    res = await db.shifts.delete_one({"_id": s_id})
    return {"message": f"Shift '{shift.get('name')}' deleted successfully"}
