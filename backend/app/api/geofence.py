from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from bson import ObjectId
from datetime import datetime
from app.database import get_database
from app.models.geofence import GeofenceCreate, GeofenceUpdate, GeofenceResponse
from app.api.auth import get_current_admin

router = APIRouter(prefix="/geofence", tags=["Geofencing & Office Locations"])

@router.get("", response_model=List[GeofenceResponse])
@router.get("/", response_model=List[GeofenceResponse])
async def list_geofences(current_admin: dict = Depends(get_current_admin)):
    """List all configured office geofence perimeters"""
    db = get_database()
    cursor = db.geofences.find().sort("created_at", -1)
    results = []
    async for doc in cursor:
        results.append(GeofenceResponse(
            id=str(doc["_id"]),
            name=doc["name"],
            latitude=doc["latitude"],
            longitude=doc["longitude"],
            radius_meters=doc.get("radius_meters", 100.0),
            address=doc.get("address"),
            is_active=doc.get("is_active", True),
            created_at=doc.get("created_at"),
            updated_at=doc.get("updated_at")
        ))
    return results

@router.get("/public-active", response_model=List[dict])
async def list_active_geofences_public():
    """Public endpoint for mobile app to load active office locations & perimeters"""
    db = get_database()
    cursor = db.geofences.find({"is_active": True})
    results = []
    async for doc in cursor:
        results.append({
            "id": str(doc["_id"]),
            "name": doc["name"],
            "latitude": doc["latitude"],
            "longitude": doc["longitude"],
            "radius_meters": doc.get("radius_meters", 100.0),
            "address": doc.get("address")
        })
    return results

@router.post("", response_model=GeofenceResponse)
@router.post("/", response_model=GeofenceResponse)
async def create_geofence(payload: GeofenceCreate, current_admin: dict = Depends(get_current_admin)):
    """Create a new office geofence location"""
    db = get_database()
    doc = payload.model_dump()
    doc["created_at"] = datetime.utcnow()
    
    res = await db.geofences.insert_one(doc)
    doc_id = str(res.inserted_id)

    # Log to audit trail
    admin_id = str(current_admin.get("_id") or current_admin.get("id") or "SYSTEM")
    admin_name = current_admin.get("name", "Administrator")
    await db.audit_logs.insert_one({
        "admin_id": admin_id,
        "admin_name": admin_name,
        "action": "GEOFENCE_CREATED",
        "details": {"geofence_id": doc_id, "name": payload.name, "radius": payload.radius_meters},
        "timestamp": datetime.utcnow()
    })

    return GeofenceResponse(id=doc_id, **doc)

@router.patch("/{geofence_id}", response_model=GeofenceResponse)
async def update_geofence(
    geofence_id: str, 
    payload: GeofenceUpdate, 
    current_admin: dict = Depends(get_current_admin)
):
    """Update geofence radius, coordinates or active status"""
    db = get_database()
    try:
        g_id = ObjectId(geofence_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Geofence ID")

    existing = await db.geofences.find_one({"_id": g_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Geofence location not found")

    update_dict = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update_dict:
        return GeofenceResponse(id=str(existing["_id"]), **existing)

    update_dict["updated_at"] = datetime.utcnow()
    await db.geofences.update_one({"_id": g_id}, {"$set": update_dict})
    updated = await db.geofences.find_one({"_id": g_id})

    # Log audit
    admin_id = str(current_admin.get("_id") or current_admin.get("id") or "SYSTEM")
    admin_name = current_admin.get("name", "Administrator")
    await db.audit_logs.insert_one({
        "admin_id": admin_id,
        "admin_name": admin_name,
        "action": "GEOFENCE_UPDATED",
        "details": {"geofence_id": geofence_id, "changes": update_dict},
        "timestamp": datetime.utcnow()
    })

    return GeofenceResponse(
        id=str(updated["_id"]),
        name=updated["name"],
        latitude=updated["latitude"],
        longitude=updated["longitude"],
        radius_meters=updated.get("radius_meters", 100.0),
        address=updated.get("address"),
        is_active=updated.get("is_active", True),
        created_at=updated.get("created_at"),
        updated_at=updated.get("updated_at")
    )

@router.delete("/{geofence_id}")
async def delete_geofence(geofence_id: str, current_admin: dict = Depends(get_current_admin)):
    """Delete a geofence location"""
    db = get_database()
    try:
        g_id = ObjectId(geofence_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Geofence ID")

    existing = await db.geofences.find_one({"_id": g_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Geofence location not found")

    await db.geofences.delete_one({"_id": g_id})
    return {"message": f"Geofence '{existing.get('name')}' deleted successfully"}

@router.post("/set-current-office")
async def set_current_office_location(payload: dict):
    """Sets the active office geofence location to user's real GPS coordinates with 150m radius"""
    db = get_database()
    lat = float(payload.get("latitude"))
    lon = float(payload.get("longitude"))
    name = payload.get("name", "Active Office Location (150m)")

    # Update or insert active geofence
    await db.geofences.update_many({}, {"$set": {"is_active": False}})
    
    doc = {
        "name": name,
        "latitude": lat,
        "longitude": lon,
        "radius_meters": 150.0,
        "address": f"Real GPS Office Coordinates ({lat:.5f}, {lon:.5f})",
        "is_active": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    await db.geofences.insert_one(doc)
    
    return {
        "status": "SUCCESS",
        "message": f"Office Geofence set to your exact current location with 150m radius ({lat:.5f}, {lon:.5f})",
        "geofence": {
            "name": name,
            "latitude": lat,
            "longitude": lon,
            "radius_meters": 150.0
        }
    }
