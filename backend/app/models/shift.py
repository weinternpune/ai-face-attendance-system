from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ShiftCreate(BaseModel):
    name: str = Field(..., description="Shift name e.g. General, Morning, Night")
    code: str = Field(..., description="Shift code e.g. GEN, MOR, NGT")
    start_time: str = Field(..., description="Start time in HH:MM (24h) format e.g. 09:00")
    end_time: str = Field(..., description="End time in HH:MM (24h) format e.g. 18:00")
    grace_period_minutes: int = Field(default=15, description="Grace period for punch-in")
    late_threshold_minutes: int = Field(default=30, description="Minutes after start before marked Late")
    description: Optional[str] = None
    is_default: bool = False

class ShiftResponse(BaseModel):
    id: str
    name: str
    code: str
    start_time: str
    end_time: str
    grace_period_minutes: int
    late_threshold_minutes: int
    description: Optional[str] = None
    is_default: bool = False
    created_at: Optional[datetime] = None
