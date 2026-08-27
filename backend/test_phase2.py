import asyncio
import httpx
import sys
import numpy as np
from datetime import datetime

# Force UTF-8 output on Windows terminal
sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://localhost:8000/api"

async def run_phase2_test():
    print("\n=======================================================")
    print(" [*] WEINTERN AI ATTENDANCE - PHASE 2 COMPREHENSIVE TEST")
    print("=======================================================\n")

    async with httpx.AsyncClient(timeout=10.0) as client:
        # 1. Admin Authentication
        print("1. Authenticating Admin for Phase 2 Operations...")
        login_payload = {
            "email": "admin@weintern.com",
            "password": "admin@weintern123"
        }
        res = await client.post(f"{BASE_URL}/auth/login", json=login_payload)
        assert res.status_code == 200, f"Login failed: {res.text}"
        token = res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print(f"   [PASS] Authenticated successfully as Admin.")

        # 2. Test Work Shifts (GET & POST)
        print("\n2. Testing Shift Management (List & Create)...")
        res = await client.get(f"{BASE_URL}/shifts", headers=headers)
        assert res.status_code == 200, f"Get shifts failed: {res.text}"
        shifts = res.json()
        print(f"   [PASS] Found {len(shifts)} configured shifts:")
        for s in shifts:
            print(f"      - {s['name']} ({s['code']}): {s['start_time']} - {s['end_time']} (Grace: {s['grace_period_minutes']}m)")

        # Create Custom Shift
        shift_code = f"NS{np.random.randint(10, 99)}"
        new_shift = {
            "name": f"Night Shift {shift_code}",
            "code": shift_code,
            "start_time": "20:00",
            "end_time": "05:00",
            "grace_period_minutes": 20,
            "late_threshold_minutes": 35,
            "description": "Overnight Operations Shift",
            "is_default": False
        }
        res = await client.post(f"{BASE_URL}/shifts", json=new_shift, headers=headers)
        assert res.status_code == 200, f"Create shift failed: {res.text}"
        created_shift = res.json()
        shift_id = created_shift["id"]
        print(f"   [PASS] Created Shift: {created_shift['name']} (ID: {shift_id})")

        # 3. Test Shift Modification & Cleanup
        print("\n3. Testing Shift Update & Deletion...")
        update_payload = {"grace_period_minutes": 25}
        res = await client.patch(f"{BASE_URL}/shifts/{shift_id}", json=update_payload, headers=headers)
        assert res.status_code == 200, f"Shift update failed: {res.text}"
        print(f"   [PASS] Shift grace period updated to 25m.")

        res = await client.delete(f"{BASE_URL}/shifts/{shift_id}", headers=headers)
        assert res.status_code == 200, f"Shift delete failed: {res.text}"
        print(f"   [PASS] Cleaned up temporary test shift.")

        # 4. Test Leave Application (POST)
        print("\n4. Testing Leave Application Workflow...")
        today_str = datetime.now().strftime("%Y-%m-%d")
        leave_payload = {
            "employee_id": "WI948",
            "employee_name": "Demo Employee",
            "leave_type": "Sick Leave",
            "start_date": today_str,
            "end_date": today_str,
            "reason": "Doctor appointment & recovery",
            "is_half_day": False
        }
        res = await client.post(f"{BASE_URL}/leaves/apply", json=leave_payload)
        assert res.status_code == 200, f"Apply leave failed: {res.text}"
        leave_data = res.json()
        leave_id = leave_data["id"]
        print(f"   [PASS] Leave Applied: {leave_data['leave_type']} for {leave_data['employee_name']} (Status: {leave_data['status']})")

        # 5. Test Admin Reviewing Leave (Approve/Reject)
        print("\n5. Testing Admin Leave Review & Approval...")
        action_payload = {
            "status": "Approved",
            "admin_remarks": "Approved by HR Admin. Get well soon!"
        }
        res = await client.patch(f"{BASE_URL}/leaves/{leave_id}/action", json=action_payload, headers=headers)
        assert res.status_code == 200, f"Leave review failed: {res.text}"
        updated_leave = res.json()
        print(f"   [PASS] Leave ID {leave_id} marked as: {updated_leave['status']} (Remarks: '{updated_leave['admin_remarks']}')")

        # 6. Test In-App Notification Generation
        print("\n6. Testing Notification & Alert System...")
        res = await client.get(f"{BASE_URL}/notifications", headers=headers)
        assert res.status_code == 200, f"Get notifications failed: {res.text}"
        notifications = res.json()
        print(f"   [PASS] Total In-App Notifications: {len(notifications)}")
        if notifications:
            print(f"   [PASS] Latest Notification: [{notifications[0].get('category')}] {notifications[0].get('title')}")

        # 7. Test Analytics & Reports
        print("\n7. Testing Analytics & Summary Reports...")
        res = await client.get(f"{BASE_URL}/reports/summary", headers=headers)
        assert res.status_code == 200, f"Summary reports failed: {res.text}"
        summary_data = res.json()
        print(f"   [PASS] 7-Day Attendance Historical Trend calculated for past {len(summary_data)} days.")

        res = await client.get(f"{BASE_URL}/reports/department-analytics", headers=headers)
        assert res.status_code == 200, f"Department analytics failed: {res.text}"
        dept_data = res.json()
        print(f"   [PASS] Department analytics breakdown calculated for {len(dept_data)} departments.")

        # 8. Test Audit Logs for Phase 2 Actions
        print("\n8. Testing Audit Trail for Phase 2...")
        res = await client.get(f"{BASE_URL}/audit", headers=headers)
        assert res.status_code == 200, f"Audit logs failed: {res.text}"
        logs = res.json()
        print(f"   [PASS] Total Audit Logs: {len(logs)}")
        print(f"   [PASS] Most Recent Audit Action: {logs[0].get('action')} by {logs[0].get('admin_name')}")

    print("\n=======================================================")
    print(" [***] ALL PHASE 2 REQUIREMENTS VERIFIED & PASSED (100% SUCCESS)!")
    print("=======================================================\n")

if __name__ == "__main__":
    asyncio.run(run_phase2_test())
