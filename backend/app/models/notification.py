from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum

class NotificationType(str, Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    ALERT = "ALERT"
    SUCCESS = "SUCCESS"

class NotificationCreate(BaseModel):
    title: str
    message: str
    type: NotificationType = NotificationType.INFO
    category: str = "SYSTEM" # SECURITY, ATTENDANCE, LEAVE, SYSTEM
    metadata: Optional[Dict[str, Any]] = None

class NotificationResponse(BaseModel):
    id: str
    title: str
    message: str
    type: str
    category: str
    is_read: bool = False
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime
