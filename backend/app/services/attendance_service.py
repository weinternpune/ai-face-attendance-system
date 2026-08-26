from datetime import datetime, time, timedelta
from typing import Dict, Any, Tuple, Optional
import logging
from app.config import settings
from app.database import get_database
from app.models.attendance import AttendanceStatus
from app.core.websocket import ws_manager

logger = logging.getLogger("uvicorn")

class AttendanceService:
    @staticmethod
    def get_current_date_and_time() -> Tuple[str, str]:
        now = datetime.now()
        date_str = now.strftime("%Y-%m-%d")
        time_str = now.strftime("%I:%M:%S %p")
        return date_str, time_str

    async def calculate_shift_status(self, user: Dict[str, Any], current_dt: datetime) -> AttendanceStatus:
        """Determines if the scan is Present or Late based on assigned or default Shift"""
        db = get_database()
        shift_name = user.get("shift_name") or "General Shift"
        
        # Look up shift in DB
        shift = await db.shifts.find_one({"name": shift_name})
        if not shift:
            # Check default shift
            shift = await db.shifts.find_one({"is_default": True})

        if shift and "start_time" in shift:
            try:
                start_parts = shift["start_time"].split(":")
                grace_mins = int(shift.get("grace_period_minutes", 15))
                shift_start_time = time(int(start_parts[0]), int(start_parts[1]))
                
                # Combine today's date with shift start
                today = current_dt.date()
                shift_start_dt = datetime.combine(today, shift_start_time)
                late_cutoff_dt = shift_start_dt + timedelta(minutes=grace_mins)

                if current_dt > late_cutoff_dt:
                    return AttendanceStatus.LATE
                return AttendanceStatus.PRESENT
            except Exception as e:
                logger.warning(f"Error calculating shift status: {e}")

        # Fallback to config OFFICE_START_TIME
        try:
            start_parts = settings.OFFICE_START_TIME.split(":")
            threshold_time = time(int(start_parts[0]), int(start_parts[1]))
            if current_dt.time() > threshold_time:
                return AttendanceStatus.LATE
        except Exception:
            pass

        return AttendanceStatus.PRESENT

    async def process_attendance(
        self, 
        user: Dict[str, Any], 
        confidence: float, 
        device_id: str = "KIOSK-01"
    ) -> Dict[str, Any]:
        """
        Implements PRD Rules + Phase 2 Real-Time & Shift logic
        """
        db = get_database()
        user_id_str = str(user["_id"])
        today_date, current_time = self.get_current_date_and_time()
        now_dt = datetime.now()

        # Check existing attendance for today
        existing_record = await db.attendance.find_one({
            "user_id": user_id_str,
            "date": today_date
        })

        if existing_record:
            res = {
                "status_code": "ALREADY_MARKED",
                "message": "Attendance already marked",
                "user": {
                    "id": user_id_str,
                    "name": user["name"],
                    "employee_id": user["employee_id"],
                    "department": user.get("department", "General"),
                    "role": user.get("role", "Employee")
                },
                "entry_time": existing_record.get("entry_time"),
                "status": existing_record.get("status"),
                "confidence": confidence
            }
            # Broadcast duplicate scan event
            await ws_manager.broadcast({
                "event": "SCAN_DUPLICATE",
                "data": res
            })
            return res

        # First scan of the day: Calculate dynamic status (Present vs Late)
        status = await self.calculate_shift_status(user, now_dt)

        attendance_doc = {
            "user_id": user_id_str,
            "employee_id": user["employee_id"],
            "employee_name": user["name"],
            "department": user.get("department", "General"),
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
        attendance_id = str(result.inserted_id)

        # If marked Late, create a notification
        if status == AttendanceStatus.LATE:
            await db.notifications.insert_one({
                "title": f"Late Arrival: {user['name']}",
                "message": f"{user['name']} ({user['employee_id']}) clocked in late at {current_time}.",
                "type": "WARNING",
                "category": "ATTENDANCE",
                "is_read": False,
                "created_at": datetime.utcnow()
            })

        response_payload = {
            "status_code": "SUCCESS",
            "message": "Attendance Marked Successfully",
            "attendance_id": attendance_id,
            "user": {
                "id": user_id_str,
                "name": user["name"],
                "employee_id": user["employee_id"],
                "department": user.get("department", "General"),
                "role": user.get("role", "Employee")
            },
            "entry_time": current_time,
            "status": status.value,
            "confidence": round(confidence * 100, 2)
        }

        # Broadcast live punch-in event to all connected dashboards via WebSocket
        await ws_manager.broadcast({
            "event": "NEW_ATTENDANCE",
            "data": {
                "id": attendance_id,
                "employee_id": user["employee_id"],
                "employee_name": user["name"],
                "department": user.get("department", "General"),
                "entry_time": current_time,
                "status": status.value,
                "recognition_confidence": round(confidence * 100, 2),
                "device_id": device_id,
                "is_manual_correction": False
            }
        })

        return response_payload

attendance_service = AttendanceService()
