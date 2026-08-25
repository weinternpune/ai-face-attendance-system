from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum

class AttendanceStatus(str, Enum):
    PRESENT = "Present"
    ABSENT = "Absent"
    LATE = "Late"
    LEAVE = "Leave"

class AttendanceRecord(BaseModel):
    id: Optional[str] = None
    user_id: str
    employee_id: str
    employee_name: str
    department: str
    date: str  # YYYY-MM-DD
    entry_time: str  # HH:MM:SS AM/PM
    exit_time: Optional[str] = None
    status: AttendanceStatus = AttendanceStatus.PRESENT
    recognition_confidence: float
    device_id: Optional[str] = "KIOSK-01"
    is_manual_correction: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class AttendanceVerifyRequest(BaseModel):
    image_base64: str
    device_id: Optional[str] = "KIOSK-01"

class AttendanceCorrectionRequest(BaseModel):
    status: AttendanceStatus
    entry_time: Optional[str] = None
    reason: str

class TodayStats(BaseModel):
    total_employees: int
    present: int
    absent: int
    late: int
    on_leave: int
