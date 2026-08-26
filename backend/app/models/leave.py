from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum

class LeaveType(str, Enum):
    CASUAL = "Casual Leave"
    SICK = "Sick Leave"
    WFH = "Work From Home"
    REGULARIZATION = "Attendance Regularization"
    OTHER = "Other"

class LeaveStatus(str, Enum):
    PENDING = "Pending"
    APPROVED = "Approved"
    REJECTED = "Rejected"

class LeaveApplyRequest(BaseModel):
    employee_id: str
    employee_name: Optional[str] = None
    leave_type: LeaveType
    start_date: str = Field(..., description="YYYY-MM-DD")
    end_date: str = Field(..., description="YYYY-MM-DD")
    reason: str
    is_half_day: bool = False

class LeaveActionRequest(BaseModel):
    status: LeaveStatus # APPROVED or REJECTED
    admin_remarks: Optional[str] = None

class LeaveResponse(BaseModel):
    id: str
    employee_id: str
    employee_name: str
    department: Optional[str] = None
    leave_type: str
    start_date: str
    end_date: str
    reason: str
    is_half_day: bool
    status: str
    applied_at: datetime
    admin_remarks: Optional[str] = None
    approved_by: Optional[str] = None
    action_at: Optional[datetime] = None
