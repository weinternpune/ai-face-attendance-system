from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from bson import ObjectId
from datetime import datetime
from app.database import get_database
from app.models.notification import NotificationResponse
from app.api.auth import get_current_admin

router = APIRouter(prefix="/notifications", tags=["Notification Center"])

@router.get("", response_model=List[NotificationResponse])
async def get_notifications(current_admin: dict = Depends(get_current_admin)):
    """Fetch recent system and security notifications"""
    db = get_database()
    cursor = db.notifications.find().sort("created_at", -1).limit(50)
    items = []
    async for n in cursor:
        items.append(NotificationResponse(
            id=str(n["_id"]),
            title=n["title"],
            message=n["message"],
            type=n.get("type", "INFO"),
            category=n.get("category", "SYSTEM"),
            is_read=n.get("is_read", False),
            metadata=n.get("metadata"),
            created_at=n.get("created_at", datetime.utcnow())
        ))
    return items

@router.patch("/{notif_id}/read")
async def mark_notification_read(notif_id: str, current_admin: dict = Depends(get_current_admin)):
    """Mark single notification as read"""
    db = get_database()
    try:
        n_id = ObjectId(notif_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid notification ID")

    await db.notifications.update_one({"_id": n_id}, {"$set": {"is_read": True}})
    return {"message": "Notification marked as read"}

@router.post("/mark-all-read")
async def mark_all_read(current_admin: dict = Depends(get_current_admin)):
    """Mark all notifications as read"""
    db = get_database()
    await db.notifications.update_many({"is_read": False}, {"$set": {"is_read": True}})
    return {"message": "All notifications marked as read"}
