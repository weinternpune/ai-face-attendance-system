from pydantic import BaseModel, Field
from typing import List, Optional, Any
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    ADMIN = "Admin"
    HR = "HR"
    EMPLOYEE = "Employee"
    INTERN = "Intern"

class EmployeeType(str, Enum):
    FULL_TIME = "Full-Time"
    INTERN = "Intern"
    CONTRACT = "Contract"

class UserStatus(str, Enum):
    ACTIVE = "Active"
    DISABLED = "Disabled"

class UserBase(BaseModel):
    name: str
    employee_id: str
    email: str
    phone: Optional[str] = None
    role: UserRole = UserRole.INTERN
    department: str
    designation: Optional[str] = None
    employee_type: EmployeeType = EmployeeType.INTERN
    joining_date: Optional[str] = None
    shift_name: Optional[str] = "General Shift"
    status: UserStatus = UserStatus.ACTIVE

class UserCreate(UserBase):
    password: Optional[str] = None

class FaceEnrollmentRequest(BaseModel):
    user_id: Optional[str] = None
    face_images: Optional[List[str]] = None  # Base64 encoded images (Front, Left, Right, Neutral)
    images_base64: Optional[List[str]] = None
    consent_given: bool = True
    dpdp_consent: Optional[bool] = None
    consent_timestamp: Optional[str] = None

class UserResponse(UserBase):
    id: str
    has_face_enrolled: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None

class UserInDB(UserBase):
    hashed_password: Optional[str] = None
    face_embeddings: List[List[float]] = []
    consent_record: Optional[dict] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
