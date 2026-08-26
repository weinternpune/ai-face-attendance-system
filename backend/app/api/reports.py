from fastapi import APIRouter, Depends, HTTPException, Response
from typing import Optional
from datetime import datetime, timedelta
import pandas as pd
import io
from app.database import get_database
from app.api.auth import get_current_admin

router = APIRouter(prefix="/reports", tags=["Reports & Exports"])

@router.get("/daily-csv")
async def export_daily_csv(date: Optional[str] = None, current_admin: dict = Depends(get_current_admin)):
    """Export Daily Attendance CSV"""
    db = get_database()
    target_date = date or datetime.now().strftime("%Y-%m-%d")

    records = await db.attendance.find({"date": target_date}).to_list(length=2000)

    if not records:
        df = pd.DataFrame(columns=["Employee ID", "Full Name", "Department", "Date", "Entry Time", "Exit Time", "Status", "Confidence (%)", "Manual Correction"])
    else:
        rows = []
        for r in records:
            rows.append({
                "Employee ID": r.get("employee_id"),
                "Full Name": r.get("employee_name"),
                "Department": r.get("department"),
                "Date": r.get("date"),
                "Entry Time": r.get("entry_time"),
                "Exit Time": r.get("exit_time") or "—",
                "Status": r.get("status"),
                "Confidence (%)": r.get("recognition_confidence"),
                "Manual Correction": "Yes" if r.get("is_manual_correction") else "No"
            })
        df = pd.DataFrame(rows)

    stream = io.StringIO()
    df.to_csv(stream, index=False)
    csv_data = stream.getvalue()

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=weintern_attendance_{target_date}.csv"}
    )

@router.get("/range-csv")
async def export_range_csv(start_date: str, end_date: str, current_admin: dict = Depends(get_current_admin)):
    """Export Attendance CSV for Custom Date Range"""
    db = get_database()
    records = await db.attendance.find({
        "date": {"$gte": start_date, "$lte": end_date}
    }).sort("date", -1).to_list(length=10000)

    if not records:
        df = pd.DataFrame(columns=["Employee ID", "Full Name", "Department", "Date", "Entry Time", "Exit Time", "Status", "Confidence (%)", "Manual Correction"])
    else:
        rows = []
        for r in records:
            rows.append({
                "Employee ID": r.get("employee_id"),
                "Full Name": r.get("employee_name"),
                "Department": r.get("department"),
                "Date": r.get("date"),
                "Entry Time": r.get("entry_time"),
                "Exit Time": r.get("exit_time") or "—",
                "Status": r.get("status"),
                "Confidence (%)": r.get("recognition_confidence"),
                "Manual Correction": "Yes" if r.get("is_manual_correction") else "No"
            })
        df = pd.DataFrame(rows)

    stream = io.StringIO()
    df.to_csv(stream, index=False)
    csv_data = stream.getvalue()

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=weintern_attendance_{start_date}_to_{end_date}.csv"}
    )

@router.get("/summary")
async def get_attendance_summary(days: int = 7, current_admin: dict = Depends(get_current_admin)):
    """Weekly/Monthly attendance rate summary per employee"""
    db = get_database()
    today = datetime.now()
    start_date = (today - timedelta(days=days)).strftime("%Y-%m-%d")

    users = await db.users.find({"status": "Active"}).to_list(length=500)
    records = await db.attendance.find({"date": {"$gte": start_date}}).to_list(length=5000)

    summary_list = []
    for u in users:
        u_id = str(u["_id"])
        u_records = [r for r in records if r.get("user_id") == u_id]
        
        present_days = sum(1 for r in u_records if r.get("status") in ["Present", "Late"])
        late_days = sum(1 for r in u_records if r.get("status") == "Late")
        
        rate = round((present_days / max(1, days)) * 100, 1)
        
        summary_list.append({
            "employee_id": u.get("employee_id"),
            "name": u.get("name"),
            "department": u.get("department"),
            "role": u.get("role"),
            "total_days_evaluated": days,
            "present_days": present_days,
            "late_days": late_days,
            "attendance_rate_percent": min(100.0, rate)
        })

    return summary_list

@router.get("/department-analytics")
async def get_department_analytics(current_admin: dict = Depends(get_current_admin)):
    """Department-wise attendance & punctuality breakdown for today"""
    db = get_database()
    today_date = datetime.now().strftime("%Y-%m-%d")

    users = await db.users.find({"status": "Active"}).to_list(length=1000)
    today_records = await db.attendance.find({"date": today_date}).to_list(length=1000)

    dept_map = {}
    for u in users:
        dept = u.get("department") or "General"
        if dept not in dept_map:
            dept_map[dept] = {"department": dept, "total_members": 0, "present": 0, "late": 0, "absent": 0}
        dept_map[dept]["total_members"] += 1

    for r in today_records:
        dept = r.get("department") or "General"
        if dept in dept_map:
            if r.get("status") in ["Present", "Late"]:
                dept_map[dept]["present"] += 1
            if r.get("status") == "Late":
                dept_map[dept]["late"] += 1

    result = []
    for dept, data in dept_map.items():
        total = data["total_members"]
        data["absent"] = max(0, total - data["present"])
        data["attendance_rate"] = round((data["present"] / max(1, total)) * 100, 1)
        data["punctuality_rate"] = round(((data["present"] - data["late"]) / max(1, data["present"])) * 100, 1) if data["present"] > 0 else 0
        result.append(data)

    return result
