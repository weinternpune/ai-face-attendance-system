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

    @staticmethod
    def parse_time_str(time_str: str, date_str: str) -> Optional[datetime]:
        """Parses 'HH:MM:SS AM/PM' or 'HH:MM' with 'YYYY-MM-DD' to datetime"""
        if not time_str or not date_str:
            return None
        formats = [
            "%Y-%m-%d %I:%M:%S %p", 
            "%Y-%m-%d %I:%M %p", 
            "%Y-%m-%d %H:%M:%S", 
            "%Y-%m-%d %H:%M"
        ]
        for fmt in formats:
            try:
                return datetime.strptime(f"{date_str} {time_str.strip()}", fmt)
            except ValueError:
                continue
        return None

    def calculate_work_duration(
        self, 
        entry_time_str: str, 
        exit_time_str: str, 
        date_str: str,
        standard_hours: float = 8.0
    ) -> Tuple[float, float, str]:
        """
        Calculates (working_hours, overtime_hours, work_duration_status)
        """
        entry_dt = self.parse_time_str(entry_time_str, date_str)
        exit_dt = self.parse_time_str(exit_time_str, date_str)
        
        if not entry_dt or not exit_dt or exit_dt <= entry_dt:
            return 0.0, 0.0, "Short Hours"

        total_seconds = (exit_dt - entry_dt).total_seconds()
        working_hours = round(total_seconds / 3600.0, 2)
        overtime_hours = max(0.0, round(working_hours - standard_hours, 2))

        if working_hours >= standard_hours:
            duration_status = "Full Day"
        elif working_hours >= 4.0:
            duration_status = "Half Day"
        else:
            duration_status = "Short Hours"

        return working_hours, overtime_hours, duration_status

    async def process_attendance(
        self, 
        user: Dict[str, Any], 
        confidence: float, 
        device_id: str = "KIOSK-01",
        verification_mode: str = "KIOSK",
        location_name: Optional[str] = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        distance_meters: Optional[float] = None,
        punch_action: Optional[str] = "AUTO" # "AUTO", "CHECKIN", "CHECKOUT"
    ) -> Dict[str, Any]:
        """
        Implements PRD Rules + Shift logic + Mobile Geofencing + Working Hours & Checkout
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
            entry_time = existing_record.get("entry_time")
            created_at = existing_record.get("created_at")
            # Minimum 30 minutes (1800 seconds) required between Punch-In and Punch-Out (Exit)
            MIN_CHECKOUT_INTERVAL_SECONDS = 1800  # 30 minutes

            if punch_action == "CHECKOUT" or seconds_since_entry >= MIN_CHECKOUT_INTERVAL_SECONDS:
                working_hours, ot_hours, duration_status = self.calculate_work_duration(
                    entry_time, 
                    current_time, 
                    today_date
                )

                await db.attendance.update_one(
                    {"_id": existing_record["_id"]},
                    {"$set": {
                        "exit_time": current_time,
                        "working_hours": working_hours,
                        "overtime_hours": ot_hours,
                        "work_duration": duration_status,
                        "updated_at": datetime.utcnow()
                    }}
                )

                checkout_payload = {
                    "status_code": "CHECKOUT_SUCCESS",
                    "message": f"Exit Recorded Successfully at {current_time} ({working_hours}h worked)",
                    "attendance_id": str(existing_record["_id"]),
                    "user": {
                        "id": user_id_str,
                        "name": user["name"],
                        "employee_id": user["employee_id"],
                        "department": user.get("department", "General"),
                        "role": user.get("role", "Employee")
                    },
                    "entry_time": entry_time,
                    "exit_time": current_time,
                    "working_hours": working_hours,
                    "overtime_hours": ot_hours,
                    "work_duration": duration_status,
                    "status": existing_record.get("status"),
                    "confidence": round(confidence * 100, 2)
                }

                # Broadcast live checkout update via WebSocket
                await ws_manager.broadcast({
                    "event": "ATTENDANCE_CHECKOUT",
                    "data": checkout_payload
                })

                return checkout_payload

            # Scan within 30 minutes of In-Time: Return duplicate scan notice
            remaining_mins = max(1, round((MIN_CHECKOUT_INTERVAL_SECONDS - seconds_since_entry) / 60))
            res = {
                "status_code": "ALREADY_MARKED",
                "message": f"Attendance already marked at {entry_time}. Exit punch available after 30 mins (in {remaining_mins}m).",
                "user": {
                    "id": user_id_str,
                    "name": user["name"],
                    "employee_id": user["employee_id"],
                    "department": user.get("department", "General"),
                    "role": user.get("role", "Employee")
                },
                "entry_time": existing_record.get("entry_time"),
                "status": existing_record.get("status"),
                "confidence": confidence,
                "verification_mode": existing_record.get("verification_mode", "KIOSK"),
                "location_name": existing_record.get("location_name")
            }
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
            "working_hours": 0.0,
            "overtime_hours": 0.0,
            "work_duration": "In Progress",
            "status": status.value,
            "recognition_confidence": round(confidence * 100, 2),
            "device_id": device_id,
            "verification_mode": verification_mode,
            "location_name": location_name,
            "latitude": latitude,
            "longitude": longitude,
            "distance_meters": distance_meters,
            "is_manual_correction": False,
            "created_at": datetime.utcnow()
        }

        try:
            result = await db.attendance.insert_one(attendance_doc)
            attendance_id = str(result.inserted_id)
        except Exception:
            # If concurrent scan already inserted the record, return duplicate response
            existing_record = await db.attendance.find_one({
                "user_id": user_id_str,
                "date": today_date
            })
            if existing_record:
                return {
                    "status_code": "ALREADY_MARKED",
                    "message": "Attendance already marked for today",
                    "user": {
                        "id": user_id_str,
                        "name": user["name"],
                        "employee_id": user["employee_id"],
                        "department": user.get("department", "General"),
                        "role": user.get("role", "Employee")
                    },
                    "entry_time": existing_record.get("entry_time"),
                    "status": existing_record.get("status"),
                    "confidence": confidence,
                    "verification_mode": existing_record.get("verification_mode", "KIOSK"),
                    "location_name": existing_record.get("location_name")
                }
            attendance_id = "DUPLICATE"

        # If marked Late, create a notification
        if status == AttendanceStatus.LATE:
            await db.notifications.insert_one({
                "title": f"Late Arrival: {user['name']}",
                "message": f"{user['name']} ({user['employee_id']}) clocked in late at {current_time} ({verification_mode}).",
                "type": "WARNING",
                "category": "ATTENDANCE",
                "is_read": False,
                "created_at": datetime.utcnow()
            })

        response_payload = {
            "status_code": "SUCCESS",
            "message": "Attendance Marked Successfully via " + ("Mobile Geofence" if verification_mode == "MOBILE_GEOFENCE" else "Kiosk"),
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
            "confidence": round(confidence * 100, 2),
            "verification_mode": verification_mode,
            "location_name": location_name,
            "distance_meters": distance_meters
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
                "verification_mode": verification_mode,
                "location_name": location_name,
                "distance_meters": distance_meters,
                "is_manual_correction": False
            }
        })

        return response_payload

attendance_service = AttendanceService()
