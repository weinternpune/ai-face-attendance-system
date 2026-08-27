from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from app.database import get_database
from app.services.alert_service import alert_service
from app.api.auth import get_current_admin

router = APIRouter(prefix="/alerts", tags=["Automated Alerts & Communications"])

class EmployeeAlertRequest(BaseModel):
    employee_id: str
    alert_type: str = "LATE_NOTICE" # "LATE_NOTICE", "ABSENT_NOTICE", "CUSTOM"
    custom_message: Optional[str] = None

@router.post("/send-daily-digest")
async def trigger_daily_digest(current_admin: dict = Depends(get_current_admin)):
    """Triggers the automated morning attendance digest email to HR/Management"""
    digest = await alert_service.generate_daily_digest()
    return {
        "message": "Daily Attendance Digest dispatched successfully",
        "digest": digest
    }

@router.post("/send-employee-alert")
async def send_single_alert(payload: EmployeeAlertRequest, current_admin: dict = Depends(get_current_admin)):
    """Dispatches an instant email/WhatsApp attendance notification to an employee"""
    alert = await alert_service.send_employee_alert(
        employee_id=payload.employee_id,
        alert_type=payload.alert_type,
        custom_message=payload.custom_message
    )
    return {
        "message": f"Alert sent to employee {payload.employee_id}",
        "alert": alert
    }

@router.get("/history")
async def get_alert_history(limit: int = 50, current_admin: dict = Depends(get_current_admin)):
    """Lists dispatch history of all automated alerts and digests"""
    db = get_database()
    cursor = db.alerts_log.find().sort("timestamp", -1).limit(limit)
    results = []
    async for a in cursor:
        results.append({
            "id": str(a["_id"]),
            "recipient": a.get("employee_name") or a.get("recipient") or "HR Management",
            "alert_type": a.get("alert_type") or a.get("channel"),
            "title": a.get("title") or "Daily Attendance Digest",
            "message": a.get("message") or f"Turnout: {a.get('metrics', {}).get('turnout_percentage')}%",
            "status": a.get("status", "SENT"),
            "timestamp": a.get("timestamp") or a.get("generated_at")
        })
    return results
