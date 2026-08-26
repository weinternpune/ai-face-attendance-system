from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from bson import ObjectId
from datetime import datetime
from app.database import get_database
from app.models.leave import LeaveApplyRequest, LeaveActionRequest, LeaveResponse, LeaveStatus
from app.api.auth import get_current_admin
from app.core.websocket import ws_manager

router = APIRouter(prefix="/leaves", tags=["Leave & Regularization"])

@router.get("", response_model=List[LeaveResponse])
async def list_all_leaves(
    status_filter: Optional[str] = None, 
    current_admin: dict = Depends(get_current_admin)
):
    """Admin endpoint to list employee leave applications"""
    db = get_database()
    query = {}
    if status_filter and status_filter.lower() != "all":
        query["status"] = status_filter

    cursor = db.leaves.find(query).sort("applied_at", -1)
    leaves = []
    async for l in cursor:
        leaves.append(LeaveResponse(
            id=str(l["_id"]),
            employee_id=l["employee_id"],
            employee_name=l["employee_name"],
            department=l.get("department", "General"),
            leave_type=l["leave_type"],
            start_date=l["start_date"],
            end_date=l["end_date"],
            reason=l["reason"],
            is_half_day=l.get("is_half_day", False),
            status=l["status"],
            applied_at=l["applied_at"],
            admin_remarks=l.get("admin_remarks"),
            approved_by=l.get("approved_by"),
            action_at=l.get("action_at")
        ))
    return leaves

@router.post("/apply", response_model=LeaveResponse)
async def apply_for_leave(payload: LeaveApplyRequest):
    """Public or Authenticated endpoint to apply for leave/regularization"""
    db = get_database()
    
    # Find employee details
    user = await db.users.find_one({"employee_id": payload.employee_id})
    emp_name = user["name"] if user else (payload.employee_name or "Employee")
    dept = user.get("department", "General") if user else "General"

    doc = {
        "employee_id": payload.employee_id,
        "employee_name": emp_name,
        "department": dept,
        "leave_type": payload.leave_type.value,
        "start_date": payload.start_date,
        "end_date": payload.end_date,
        "reason": payload.reason,
        "is_half_day": payload.is_half_day,
        "status": LeaveStatus.PENDING.value,
        "applied_at": datetime.utcnow()
    }
    
    res = await db.leaves.insert_one(doc)
    leave_id = str(res.inserted_id)

    # Create in-app notification for admin
    await db.notifications.insert_one({
        "title": f"New Leave Request: {emp_name}",
        "message": f"{emp_name} ({payload.employee_id}) applied for {payload.leave_type.value} ({payload.start_date} to {payload.end_date}).",
        "type": "INFO",
        "category": "LEAVE",
        "is_read": False,
        "created_at": datetime.utcnow()
    })

    # Broadcast notification over WebSocket
    await ws_manager.broadcast({
        "event": "NEW_LEAVE_REQUEST",
        "data": {
            "id": leave_id,
            "employee_id": payload.employee_id,
            "employee_name": emp_name,
            "leave_type": payload.leave_type.value,
            "start_date": payload.start_date,
            "end_date": payload.end_date
        }
    })

    return LeaveResponse(id=leave_id, **doc)

@router.patch("/{leave_id}/action", response_model=LeaveResponse)
async def review_leave(
    leave_id: str, 
    payload: LeaveActionRequest, 
    current_admin: dict = Depends(get_current_admin)
):
    """Admin endpoint to Approve or Reject leave request"""
    db = get_database()
    try:
        l_obj_id = ObjectId(leave_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid leave ID")

    leave = await db.leaves.find_one({"_id": l_obj_id})
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")

    update_fields = {
        "status": payload.status.value,
        "admin_remarks": payload.admin_remarks,
        "approved_by": current_admin.get("name", "Admin"),
        "action_at": datetime.utcnow()
    }

    await db.leaves.update_one({"_id": l_obj_id}, {"$set": update_fields})
    updated_leave = await db.leaves.find_one({"_id": l_obj_id})

    # Log to Audit Trail
    admin_id = str(current_admin.get("_id") or current_admin.get("id") or "SYSTEM")
    admin_name = current_admin.get("name", "Administrator")
    await db.audit_logs.insert_one({
        "admin_id": admin_id,
        "admin_name": admin_name,
        "action": f"LEAVE_{payload.status.value.upper()}",
        "target_user_id": leave.get("employee_id"),
        "target_user_name": leave.get("employee_name"),
        "details": {
            "leave_id": leave_id,
            "leave_type": leave.get("leave_type"),
            "dates": f"{leave.get('start_date')} to {leave.get('end_date')}",
            "remarks": payload.admin_remarks
        },
        "timestamp": datetime.utcnow()
    })

    # Broadcast update
    await ws_manager.broadcast({
        "event": "LEAVE_STATUS_CHANGED",
        "data": {
            "leave_id": leave_id,
            "status": payload.status.value,
            "employee_id": leave["employee_id"]
        }
    })

    return LeaveResponse(
        id=str(updated_leave["_id"]),
        employee_id=updated_leave["employee_id"],
        employee_name=updated_leave["employee_name"],
        department=updated_leave.get("department", "General"),
        leave_type=updated_leave["leave_type"],
        start_date=updated_leave["start_date"],
        end_date=updated_leave["end_date"],
        reason=updated_leave["reason"],
        is_half_day=updated_leave.get("is_half_day", False),
        status=updated_leave["status"],
        applied_at=updated_leave["applied_at"],
        admin_remarks=updated_leave.get("admin_remarks"),
        approved_by=updated_leave.get("approved_by"),
        action_at=updated_leave.get("action_at")
    )
