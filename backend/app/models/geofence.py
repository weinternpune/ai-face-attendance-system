from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class GeofenceBase(BaseModel):
    name: str = Field(..., description="Office location name e.g. WeIntern Pune HQ")
    latitude: float = Field(..., description="GPS Latitude (-90 to +90)")
    longitude: float = Field(..., description="GPS Longitude (-180 to +180)")
    radius_meters: float = Field(default=100.0, description="Allowed radius in meters")
    address: Optional[str] = Field(default=None, description="Full office physical address")
    is_active: bool = Field(default=True, description="Whether geofence is active for attendance")

class GeofenceCreate(GeofenceBase):
    pass

class GeofenceUpdate(BaseModel):
    name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    radius_meters: Optional[float] = None
    address: Optional[str] = None
    is_active: Optional[bool] = None

class GeofenceResponse(GeofenceBase):
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
