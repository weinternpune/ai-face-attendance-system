from fastapi import APIRouter, Depends
from typing import Optional
from app.database import get_database
from app.api.auth import get_current_admin

router = APIRouter(prefix="/audit", tags=["Audit & Security Logs"])

@router.get("/")
async def get_audit_logs(
    action: Optional[str] = None, 
    limit: int = 100, 
    current_admin: dict = Depends(get_current_admin)
):
    """Retrieve traceable audit logs (Section 16.4 & 20)"""
    db = get_database()
    query = {}
    if action:
        query["action"] = action

    cursor = db.audit_logs.find(query).sort("timestamp", -1).limit(limit)
    logs = []
    async for l in cursor:
        logs.append({
            "id": str(l["_id"]),
            "admin_id": l.get("admin_id"),
            "admin_name": l.get("admin_name"),
            "action": l.get("action"),
            "target_user_id": l.get("target_user_id"),
            "target_user_name": l.get("target_user_name"),
            "details": l.get("details"),
            "timestamp": l.get("timestamp")
        })
    return logs
