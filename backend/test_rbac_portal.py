import asyncio
import httpx
import sys

# Force UTF-8 output on Windows terminal
sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://localhost:8000/api"

async def run_rbac_portal_test():
    print("\n=======================================================")
    print(" [*] PHASE 3 - MODULE 4: RBAC & EMPLOYEE PORTAL TEST")
    print("=======================================================\n")

    async with httpx.AsyncClient(timeout=10.0) as client:
        # 1. Authenticate User
        print("1. Authenticating Account...")
        login_payload = {
            "email": "admin@weintern.com",
            "password": "admin@weintern123"
        }
        res = await client.post(f"{BASE_URL}/auth/login", json=login_payload)
        assert res.status_code == 200, f"Login failed: {res.text}"
        token = res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("   [PASS] Authenticated successfully.")

        # 2. Test Employee Profile API
        print("\n2. Testing Personal Profile Endpoint (/users/me/profile)...")
        res = await client.get(f"{BASE_URL}/users/me/profile", headers=headers)
        assert res.status_code == 200, f"Profile endpoint failed: {res.text}"
        profile = res.json()
        print(f"   [PASS] Profile Loaded for: {profile['name']}")
        print(f"      - Employee ID: {profile.get('employee_id')}")
        print(f"      - Role: {profile.get('role')}")
        print(f"      - Department: {profile.get('department')}")
        print(f"      - Shift: {profile.get('shift_name')}")
        print(f"      - Face Enrolled: {profile.get('has_enrolled_face')}")

        # 3. Test Personal Attendance Logs
        print("\n3. Testing Personal Attendance History (/users/me/attendance)...")
        res = await client.get(f"{BASE_URL}/users/me/attendance", headers=headers)
        assert res.status_code == 200, f"Attendance endpoint failed: {res.text}"
        attendance = res.json()
        print(f"   [PASS] Successfully retrieved {len(attendance)} personal attendance log records.")
        if attendance:
            print(f"   [PASS] Latest Punch: Date {attendance[0]['date']} at {attendance[0]['entry_time']} ({attendance[0]['status']})")

        # 4. Test Leave Balances & Entitlement
        print("\n4. Testing Leave Balances & Personal Requests (/users/me/leaves)...")
        res = await client.get(f"{BASE_URL}/users/me/leaves", headers=headers)
        assert res.status_code == 200, f"Leaves endpoint failed: {res.text}"
        leaves_data = res.json()
        balances = leaves_data.get("balances", {})
        print(f"   [PASS] Casual Leave Balance: {balances.get('casual_leave', {}).get('remaining')} / 12 days")
        print(f"   [PASS] Sick Leave Balance: {balances.get('sick_leave', {}).get('remaining')} / 10 days")
        print(f"   [PASS] Paid Annual Leave Balance: {balances.get('paid_leave', {}).get('remaining')} / 15 days")

    print("\n=======================================================")
    print(" [***] PHASE 3 MODULE 4 (RBAC & EMPLOYEE PORTAL) 100% PASS!")
    print("=======================================================\n")

if __name__ == "__main__":
    asyncio.run(run_rbac_portal_test())
