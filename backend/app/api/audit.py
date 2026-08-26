from fastapi import APIRouter, Depends
from typing import Optional
from datetime import datetime, timezone
from app.database import get_database
from app.api.auth import get_current_admin

router = APIRouter(prefix="/audit", tags=["Audit & Security Logs"])

@router.get("")
@router.get("/")
async def get_audit_logs(
    action: Optional[str] = None, 
    limit: int = 100, 
    current_admin: dict = Depends(get_current_admin)
):
    """Retrieve traceable audit logs with standardized UTC ISO 8601 timestamps"""
    db = get_database()
    query = {}
    if action:
        query["action"] = action

    cursor = db.audit_logs.find(query).sort("timestamp", -1).limit(limit)
    logs = []
    async for l in cursor:
        raw_ts = l.get("timestamp")
        formatted_ts = None
        if isinstance(raw_ts, datetime):
            # Ensure ISO format with UTC Z indicator so browser converts to local IST perfectly
            if raw_ts.tzinfo is None:
                formatted_ts = raw_ts.replace(tzinfo=timezone.utc).isoformat()
            else:
                formatted_ts = raw_ts.isoformat()
        elif isinstance(raw_ts, (int, float)):
            try:
                formatted_ts = datetime.fromtimestamp(raw_ts, tz=timezone.utc).isoformat()
            except Exception:
                formatted_ts = datetime.now(timezone.utc).isoformat()
        elif isinstance(raw_ts, str):
            if not raw_ts.endswith("Z") and "+" not in raw_ts:
                formatted_ts = raw_ts + "Z"
            else:
                formatted_ts = raw_ts
        else:
            formatted_ts = datetime.now(timezone.utc).isoformat()

        logs.append({
            "id": str(l["_id"]),
            "admin_id": l.get("admin_id"),
            "admin_name": l.get("admin_name"),
            "action": l.get("action"),
            "target_user_id": l.get("target_user_id"),
            "target_user_name": l.get("target_user_name"),
            "details": l.get("details"),
            "timestamp": formatted_ts
        })
    return logs
