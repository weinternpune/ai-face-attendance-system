import asyncio
import httpx
import sys
from datetime import datetime

# Force UTF-8 output on Windows terminal
sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://localhost:8000/api"

async def run_payroll_test():
    print("\n=======================================================")
    print(" [*] PHASE 3 - MODULE 2: PAYROLL & WORKING HOURS TEST")
    print("=======================================================\n")

    async with httpx.AsyncClient(timeout=10.0) as client:
        # 1. Admin Login
        print("1. Authenticating Admin...")
        login_payload = {
            "email": "admin@weintern.com",
            "password": "admin@weintern123"
        }
        res = await client.post(f"{BASE_URL}/auth/login", json=login_payload)
        assert res.status_code == 200, f"Login failed: {res.text}"
        token = res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("   [PASS] Authenticated successfully as Admin.")

        # 2. Test Monthly Payroll Analytics
        current_month = datetime.now().strftime("%Y-%m")
        print(f"\n2. Testing Monthly Payroll Intelligence (Month: {current_month})...")
        res = await client.get(f"{BASE_URL}/reports/payroll?month={current_month}", headers=headers)
        assert res.status_code == 200, f"Payroll calculation failed: {res.text}"
        data = res.json()
        
        print(f"   [PASS] Payroll Report Generated for Month: {data['month']}")
        print(f"   [PASS] Total Payroll Profiles Evaluated: {data['total_employees']}")
        print(f"   [PASS] Standard Working Days in Base: {data['standard_working_days']}")
        print(f"   [PASS] Total Productive Hours Logged: {data['total_hours_logged']} hrs")
        print(f"   [PASS] Total Overtime (OT) Logged: {data['total_overtime_hours']} hrs")

        # 3. Verify Employee Payroll Row Breakdown
        print("\n3. Testing Employee Payroll Row Breakdown...")
        employees = data.get("employees", [])
        if employees:
            sample = employees[0]
            print(f"   [PASS] Sample Employee: {sample['name']} ({sample['employee_id']})")
            print(f"      - Department: {sample['department']}")
            print(f"      - Shift: {sample['shift_name']}")
            print(f"      - Days Present: {sample['days_present']}")
            print(f"      - Days Late: {sample['days_late']}")
            print(f"      - Paid Leaves: {sample['paid_leaves']}")
            print(f"      - Net Payable Days: {sample['payable_days']} / {sample['total_working_days']}")
            print(f"      - Attendance Rate: {sample['attendance_rate_percent']}%")

        # 4. Test Payroll CSV Export
        print(f"\n4. Testing 1-Click Payroll Spreadsheet Download (.CSV)...")
        res = await client.get(f"{BASE_URL}/reports/payroll-csv?month={current_month}", headers=headers)
        assert res.status_code == 200, f"Payroll CSV download failed: {res.text}"
        assert "text/csv" in res.headers.get("content-type", ""), "Expected text/csv content type"
        csv_text = res.text
        assert "Employee ID" in csv_text and "Payable Days" in csv_text, "Missing payroll CSV headers"
        first_line = csv_text.strip().split("\n")[0]
        print(f"   [PASS] CSV Headers: {first_line}")
        print(f"   [PASS] Payroll CSV Size: {len(res.content)} bytes")

    print("\n=======================================================")
    print(" [***] PHASE 3 MODULE 2 (PAYROLL & WORKING HOURS) 100% PASS!")
    print("=======================================================\n")

if __name__ == "__main__":
    asyncio.run(run_payroll_test())
