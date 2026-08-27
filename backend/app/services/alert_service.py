from datetime import datetime
from typing import Dict, Any, List, Optional
import logging
from app.database import get_database
from app.core.websocket import ws_manager

logger = logging.getLogger("uvicorn")

class AlertService:
    async def generate_daily_digest(self) -> Dict[str, Any]:
        """
        Generates and logs an automated daily attendance summary digest for HR/Management.
        """
        db = get_database()
        today = datetime.now().strftime("%Y-%m-%d")

        # Headcount stats
        total_employees = await db.users.count_documents({"status": "Active", "role": {"$ne": "Admin"}})
        if total_employees == 0:
            total_employees = await db.users.count_documents({"status": "Active"})

        today_records = await db.attendance.find({"date": today}).to_list(length=2000)
        approved_leaves = await db.leaves.count_documents({
            "status": "Approved",
            "start_date": {"$lte": today},
            "end_date": {"$gte": today}
        })

        present_count = sum(1 for r in today_records if r.get("status") in ["Present", "Late"])
        late_count = sum(1 for r in today_records if r.get("status") == "Late")
        leave_count = sum(1 for r in today_records if r.get("status") == "Leave") + approved_leaves
        absent_count = max(0, total_employees - (present_count + leave_count))
        turnout = round((present_count / max(1, total_employees)) * 100, 1)

        digest_payload = {
            "date": today,
            "generated_at": datetime.utcnow().isoformat(),
            "metrics": {
                "total_staff": total_employees,
                "present": present_count,
                "late": late_count,
                "absent": absent_count,
                "on_leave": leave_count,
                "turnout_percentage": turnout
            },
            "channel": "EMAIL_DIGEST",
            "recipient": "hr@weintern.com",
            "status": "DELIVERED"
        }

        # Store in alerts log
        res = await db.alerts_log.insert_one(dict(digest_payload))
        digest_payload["id"] = str(res.inserted_id)
        digest_payload.pop("_id", None)

        # Create in-app notification
        await db.notifications.insert_one({
            "title": f"📋 Daily Attendance Digest: {today}",
            "message": f"Daily Summary: {present_count}/{total_employees} Present ({turnout}%), {late_count} Late, {absent_count} Absent.",
            "type": "INFO",
            "category": "DIGEST",
            "is_read": False,
            "created_at": datetime.utcnow()
        })

        # Broadcast via WebSocket
        await ws_manager.broadcast({
            "event": "DAILY_DIGEST_SENT",
            "data": digest_payload
        })

        logger.info(f"Daily Attendance Digest sent for {today}: {turnout}% turnout")
        return digest_payload

    async def send_employee_alert(
        self, 
        employee_id: str, 
        alert_type: str, # "LATE_NOTICE", "ABSENT_NOTICE", "CUSTOM"
        custom_message: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Sends an automated notification (Email / WhatsApp simulated) to an employee.
        """
        db = get_database()
        user = await db.users.find_one({"employee_id": employee_id})
        emp_name = user.get("name", "Employee") if user else "Employee"
        email = user.get("email", "staff@weintern.com") if user else "staff@weintern.com"

        title = f"Attendance Notice: {alert_type.replace('_', ' ').title()}"
        if alert_type == "LATE_NOTICE":
            msg = custom_message or f"Hello {emp_name}, our biometric system noted a late arrival today. Please ensure compliance with shift hours."
        elif alert_type == "ABSENT_NOTICE":
            msg = custom_message or f"Hello {emp_name}, you have been marked Absent today as no kiosk or mobile check-in was registered."
        else:
            msg = custom_message or f"Hello {emp_name}, you have a new attendance notice from WeIntern HR."

        doc = {
            "employee_id": employee_id,
            "employee_name": emp_name,
            "recipient_email": email,
            "alert_type": alert_type,
            "title": title,
            "message": msg,
            "channel": "EMAIL_AND_WHATSAPP",
            "status": "SENT",
            "timestamp": datetime.utcnow().isoformat()
        }

        res = await db.alerts_log.insert_one(dict(doc))
        doc["id"] = str(res.inserted_id)
        doc.pop("_id", None)

        # Notify via in-app
        await db.notifications.insert_one({
            "title": f"📩 Alert Sent to {emp_name}",
            "message": f"[{alert_type}] {msg}",
            "type": "WARNING" if "LATE" in alert_type or "ABSENT" in alert_type else "INFO",
            "category": "COMMUNICATION",
            "is_read": False,
            "created_at": datetime.utcnow()
        })

        return doc

alert_service = AlertService()
