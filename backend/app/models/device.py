from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum

class CameraStatus(str, Enum):
    ONLINE = "Online"
    OFFLINE = "Offline"
    FAULT = "Fault"

class Device(BaseModel):
    id: Optional[str] = None
    device_id: str
    device_name: str
    location: str = "Main Entrance"
    camera_status: CameraStatus = CameraStatus.ONLINE
    last_active: datetime = Field(default_factory=datetime.utcnow)
