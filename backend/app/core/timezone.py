import zoneinfo
from datetime import datetime, timezone, timedelta
from typing import Tuple

def get_system_tz():
    """Returns the configured timezone (default Asia/Kolkata / IST)."""
    try:
        from app.config import settings
        tz_name = getattr(settings, "TIMEZONE", "Asia/Kolkata")
        return zoneinfo.ZoneInfo(tz_name)
    except Exception:
        # Fallback to Indian Standard Time (UTC+5:30)
        return timezone(timedelta(hours=5, minutes=30))

def get_local_now() -> datetime:
    """Returns the current datetime in the configured local timezone."""
    tz = get_system_tz()
    return datetime.now(tz)

def get_current_date_and_time() -> Tuple[str, str]:
    """Returns (YYYY-MM-DD, HH:MM:SS AM/PM) in the configured local timezone."""
    now = get_local_now()
    date_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%I:%M:%S %p")
    return date_str, time_str

def get_today_date_str() -> str:
    """Returns today's date formatted as YYYY-MM-DD in the configured local timezone."""
    return get_local_now().strftime("%Y-%m-%d")

def get_current_time_str() -> str:
    """Returns current time formatted as HH:MM:SS AM/PM in the configured local timezone."""
    return get_local_now().strftime("%I:%M:%S %p")

def get_current_month_str() -> str:
    """Returns current year-month as YYYY-MM in the configured local timezone."""
    return get_local_now().strftime("%Y-%m")
