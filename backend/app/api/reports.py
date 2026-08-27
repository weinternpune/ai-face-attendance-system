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
    """7-Day Historical Daily Attendance Trend (Headcount, Late, Turnout Rate)"""
    db = get_database()
    today = datetime.now()
    start_date = (today - timedelta(days=days)).strftime("%Y-%m-%d")

    total_active = await db.users.count_documents({"status": "Active", "role": {"$ne": "Admin"}})
    if total_active == 0:
        total_active = await db.users.count_documents({"status": "Active"})
    records = await db.attendance.find({"date": {"$gte": start_date}}).to_list(length=5000)

    daily_trend = []
    for i in range(days):
        day_date = (today - timedelta(days=i)).strftime("%Y-%m-%d")
        day_records = [r for r in records if r.get("date") == day_date]
        
        present_count = sum(1 for r in day_records if r.get("status") in ["Present", "Late"])
        late_count = sum(1 for r in day_records if r.get("status") == "Late")
        turnout = round((present_count / max(1, total_active)) * 100, 1) if total_active > 0 else 0
        
        daily_trend.append({
            "date": day_date,
            "present": present_count,
            "late": late_count,
            "total_registered": total_active,
            "turnout_rate": min(100.0, turnout)
        })

    return daily_trend

@router.get("/employee-performance")
async def get_employee_performance(days: int = 7, current_admin: dict = Depends(get_current_admin)):
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

    users = await db.users.find({"status": "Active", "role": {"$ne": "Admin"}}).to_list(length=1000)
    if not users:
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

@router.get("/payroll")
async def get_monthly_payroll(month: Optional[str] = None, current_admin: dict = Depends(get_current_admin)):
    """
    Phase 3 Module 2: Monthly Working Hours & Payroll Intelligence Calculation.
    month format: 'YYYY-MM' (Defaults to current month)
    """
    db = get_database()
    target_month = month or datetime.now().strftime("%Y-%m")

    # Fetch active employees
    users = await db.users.find({"status": "Active", "role": {"$ne": "Admin"}}).to_list(length=1000)
    if not users:
        users = await db.users.find({"status": "Active"}).to_list(length=1000)

    # Fetch all attendance records for the month
    # Regex match date starting with target_month
    records = await db.attendance.find({
        "date": {"$regex": f"^{target_month}"}
    }).to_list(length=20000)

    # Fetch all approved leaves for the month
    leaves = await db.leaves.find({
        "status": "Approved",
        "$or": [
            {"start_date": {"$regex": f"^{target_month}"}},
            {"end_date": {"$regex": f"^{target_month}"}}
        ]
    }).to_list(length=5000)

    # Compute working days in month (approx 26 working days standard)
    year, mon = map(int, target_month.split("-"))
    days_in_month = 30 if mon in [4, 6, 9, 11] else 28 if mon == 2 else 31
    standard_working_days = 26

    payroll_list = []
    total_payroll_hours = 0.0
    total_ot_hours = 0.0

    for u in users:
        u_id = str(u["_id"])
        emp_id = u.get("employee_id")
        u_records = [r for r in records if r.get("user_id") == u_id or r.get("employee_id") == emp_id]

        present_days = sum(1 for r in u_records if r.get("status") in ["Present", "Late"])
        late_days = sum(1 for r in u_records if r.get("status") == "Late")
        half_days = sum(1 for r in u_records if r.get("work_duration") == "Half Day")
        
        # Working hours sum
        total_hours = sum(float(r.get("working_hours", 0.0) or 0.0) for r in u_records)
        ot_hours = sum(float(r.get("overtime_hours", 0.0) or 0.0) for r in u_records)

        total_payroll_hours += total_hours
        total_ot_hours += ot_hours

        # Leaves for this user
        u_leaves = [l for l in leaves if l.get("employee_id") == emp_id]
        paid_leaves = sum(1 for l in u_leaves if l.get("leave_type") in ["Casual Leave", "Sick Leave", "Paid Leave"])
        unpaid_leaves = sum(1 for l in u_leaves if l.get("leave_type") == "Unpaid Leave")

        # Net Payable Days calculation
        payable_days = max(0.0, round(present_days - (half_days * 0.5) + paid_leaves, 1))
        att_rate = min(100.0, round((present_days / max(1, standard_working_days)) * 100, 1))

        payroll_list.append({
            "employee_id": emp_id,
            "name": u.get("name"),
            "department": u.get("department", "General"),
            "designation": u.get("designation", "Staff"),
            "shift_name": u.get("shift_name", "General Shift"),
            "month": target_month,
            "total_working_days": standard_working_days,
            "days_present": present_days,
            "days_late": late_days,
            "half_days": half_days,
            "paid_leaves": paid_leaves,
            "unpaid_leaves": unpaid_leaves,
            "payable_days": payable_days,
            "total_working_hours": round(total_hours, 2),
            "total_overtime_hours": round(ot_hours, 2),
            "attendance_rate_percent": att_rate
        })

    return {
        "month": target_month,
        "standard_working_days": standard_working_days,
        "total_employees": len(payroll_list),
        "total_hours_logged": round(total_payroll_hours, 2),
        "total_overtime_hours": round(total_ot_hours, 2),
        "employees": payroll_list
    }

@router.get("/payroll-csv")
async def export_payroll_csv(month: Optional[str] = None, current_admin: dict = Depends(get_current_admin)):
    """Export Monthly Payroll & Working Hours Spreadsheet (.CSV)"""
    target_month = month or datetime.now().strftime("%Y-%m")
    data = await get_monthly_payroll(month=target_month, current_admin=current_admin)
    employees = data.get("employees", [])

    if not employees:
        df = pd.DataFrame(columns=[
            "Employee ID", "Full Name", "Department", "Designation", "Shift", "Month",
            "Working Days", "Days Present", "Days Late", "Half Days", "Paid Leaves", 
            "Payable Days", "Total Hours", "Overtime (OT) Hours", "Attendance Rate (%)"
        ])
    else:
        rows = []
        for e in employees:
            rows.append({
                "Employee ID": e["employee_id"],
                "Full Name": e["name"],
                "Department": e["department"],
                "Designation": e["designation"],
                "Shift": e["shift_name"],
                "Month": e["month"],
                "Working Days": e["total_working_days"],
                "Days Present": e["days_present"],
                "Days Late": e["days_late"],
                "Half Days": e["half_days"],
                "Paid Leaves": e["paid_leaves"],
                "Payable Days": e["payable_days"],
                "Total Hours": e["total_working_hours"],
                "Overtime (OT) Hours": e["total_overtime_hours"],
                "Attendance Rate (%)": e["attendance_rate_percent"]
            })
        df = pd.DataFrame(rows)

    stream = io.StringIO()
    df.to_csv(stream, index=False)
    csv_data = stream.getvalue()

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=weintern_payroll_statement_{target_month}.csv"}
    )
