from datetime import datetime, time, timedelta, timezone
from typing import Dict, Any, Tuple, Optional
import logging
from app.config import settings
from app.database import get_database
from app.models.attendance import AttendanceStatus
from app.core.websocket import ws_manager
from app.core.timezone import (
    get_system_tz, 
    get_local_now, 
    get_current_date_and_time, 
    get_today_date_str, 
    get_current_time_str
)

logger = logging.getLogger("uvicorn")

class AttendanceService:
    @staticmethod
    def get_current_date_and_time() -> Tuple[str, str]:
        """Returns (YYYY-MM-DD, HH:MM:SS AM/PM) in configured timezone (IST)."""
        return get_current_date_and_time()

    async def calculate_shift_status(self, user: Dict[str, Any], current_dt: Optional[datetime] = None) -> AttendanceStatus:
        """Determines if the scan is Present or Late based on assigned or default Shift in local timezone"""
        if current_dt is None:
            current_dt = get_local_now()

        db = get_database()
        shift_name = user.get("shift_name") or "General Shift"
        shift = None
        
        if db is not None:
            try:
                # Look up shift in DB
                shift = await db.shifts.find_one({"name": shift_name})
                if not shift:
                    # Check default shift
                    shift = await db.shifts.find_one({"is_default": True})
            except Exception as e:
                logger.warning(f"Error querying shift: {e}")

        start_time_str = None
        grace_mins = 15

        if shift and "start_time" in shift:
            start_time_str = shift["start_time"]
            grace_mins = int(shift.get("grace_period_minutes", 15))
        else:
            start_time_str = settings.OFFICE_START_TIME
            grace_mins = 15

        if start_time_str:
            try:
                start_parts = start_time_str.split(":")
                shift_hour = int(start_parts[0])
                shift_minute = int(start_parts[1]) if len(start_parts) > 1 else 0

                # Compute minute offset from start of day in local time
                current_minutes = current_dt.hour * 60 + current_dt.minute + (current_dt.second / 60.0)
                shift_start_minutes = shift_hour * 60 + shift_minute
                late_cutoff_minutes = shift_start_minutes + grace_mins

                if current_minutes > late_cutoff_minutes:
                    return AttendanceStatus.LATE
                return AttendanceStatus.PRESENT
            except Exception as e:
                logger.warning(f"Error calculating shift status: {e}")

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
        
        if not entry_dt or not exit_dt:
            return 0.0, 0.0, "Short Hours"

        # If checkout crosses midnight
        if exit_dt < entry_dt:
            exit_dt += timedelta(days=1)

        total_seconds = (exit_dt - entry_dt).total_seconds()
        if total_seconds < 0:
            return 0.0, 0.0, "Short Hours"

        working_hours = round(total_seconds / 3600.0, 2)
        overtime_hours = max(0.0, round(working_hours - standard_hours, 2))

        if working_hours >= (standard_hours - 0.5) or working_hours >= 7.5:
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
        Implements PRD Rules + Shift logic + Mobile Geofencing + Working Hours & Checkout in IST/Local Time
        """
        db = get_database()
        user_id_str = str(user["_id"])
        today_date, current_time = self.get_current_date_and_time()
        now_dt = get_local_now()

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

            seconds_since_entry = 0
            entry_dt = self.parse_time_str(entry_time, today_date) if entry_time else None
            if entry_dt:
                # Localize entry_dt
                tz = get_system_tz()
                entry_dt_local = entry_dt.replace(tzinfo=tz)
                seconds_since_entry = (now_dt - entry_dt_local).total_seconds()
            elif created_at:
                if created_at.tzinfo is None:
                    created_at = created_at.replace(tzinfo=timezone.utc)
                seconds_since_entry = (datetime.now(timezone.utc) - created_at).total_seconds()

            if punch_action == "CHECKOUT" or seconds_since_entry >= MIN_CHECKOUT_INTERVAL_SECONDS:
                # Find user shift for standard hours if configured
                standard_hours = 8.0
                shift_name = user.get("shift_name")
                if shift_name:
                    shift_doc = await db.shifts.find_one({"name": shift_name})
                    if shift_doc and "start_time" in shift_doc and "end_time" in shift_doc:
                        try:
                            s_parts = shift_doc["start_time"].split(":")
                            e_parts = shift_doc["end_time"].split(":")
                            s_h = int(s_parts[0]) + int(s_parts[1]) / 60.0
                            e_h = int(e_parts[0]) + int(e_parts[1]) / 60.0
                            if e_h > s_h:
                                standard_hours = round(e_h - s_h, 1)
                        except Exception:
                            pass

                working_hours, ot_hours, duration_status = self.calculate_work_duration(
                    entry_time, 
                    current_time, 
                    today_date,
                    standard_hours=standard_hours
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
            remaining_mins = max(1, round((MIN_CHECKOUT_INTERVAL_SECONDS - max(0, seconds_since_entry)) / 60))
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

        # First scan of the day: Calculate dynamic status (Present vs Late) in local timezone
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
