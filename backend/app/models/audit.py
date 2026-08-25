from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime

class AuditLog(BaseModel):
    id: Optional[str] = None
    admin_id: Optional[str] = None
    admin_name: Optional[str] = None
    action: str  # "MANUAL_ATTENDANCE_CORRECTION", "FACE_ENROLLED", "USER_DISABLED", "UNKNOWN_FACE_DETECTED"
    target_user_id: Optional[str] = None
    target_user_name: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
