from datetime import datetime, time
from typing import Dict, Any, Tuple, Optional
import logging
from app.config import settings
from app.database import get_database
from app.models.attendance import AttendanceStatus

logger = logging.getLogger("uvicorn")

class AttendanceService:
    @staticmethod
    def get_current_date_and_time() -> Tuple[str, str]:
        now = datetime.now()
        date_str = now.strftime("%Y-%m-%d")
        time_str = now.strftime("%I:%M:%S %p")
        return date_str, time_str

    @staticmethod
    def is_late(entry_time_str: str) -> bool:
        """Determines if the scan is after configured office start time (e.g. 09:30 AM)"""
        try:
            now_time = datetime.now().time()
            start_parts = settings.OFFICE_START_TIME.split(":")
            threshold_time = time(int(start_parts[0]), int(start_parts[1]))
            return now_time > threshold_time
        except Exception:
            return False

    async def process_attendance(
        self, 
        user: Dict[str, Any], 
        confidence: float, 
        device_id: str = "KIOSK-01"
    ) -> Dict[str, Any]:
        """
        Implements PRD Section 10 Rules:
        - If first scan of the day -> Record Present/Late with entry timestamp.
        - If already marked today -> Return ALREADY_MARKED status with existing entry time.
        """
        db = get_database()
        user_id_str = str(user["_id"])
        today_date, current_time = self.get_current_date_and_time()

        # Check existing attendance for today
        existing_record = await db.attendance.find_one({
            "user_id": user_id_str,
            "date": today_date
        })

        if existing_record:
            return {
                "status_code": "ALREADY_MARKED",
                "message": "Attendance already marked",
                "user": {
                    "id": user_id_str,
                    "name": user["name"],
                    "employee_id": user["employee_id"],
                    "department": user["department"],
                    "role": user["role"]
                },
                "entry_time": existing_record.get("entry_time"),
                "status": existing_record.get("status"),
                "confidence": confidence
            }

        # First scan of the day
        status = AttendanceStatus.LATE if self.is_late(current_time) else AttendanceStatus.PRESENT

        attendance_doc = {
            "user_id": user_id_str,
            "employee_id": user["employee_id"],
            "employee_name": user["name"],
            "department": user["department"],
            "date": today_date,
            "entry_time": current_time,
            "exit_time": None,
            "status": status.value,
            "recognition_confidence": round(confidence * 100, 2),
            "device_id": device_id,
            "is_manual_correction": False,
            "created_at": datetime.utcnow()
        }

        result = await db.attendance.insert_one(attendance_doc)

        return {
            "status_code": "SUCCESS",
            "message": "Attendance Marked Successfully",
            "attendance_id": str(result.inserted_id),
            "user": {
                "id": user_id_str,
                "name": user["name"],
                "employee_id": user["employee_id"],
                "department": user["department"],
                "role": user["role"]
            },
            "entry_time": current_time,
            "status": status.value,
            "confidence": round(confidence * 100, 2)
        }

attendance_service = AttendanceService()
