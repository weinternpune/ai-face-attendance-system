import asyncio
import httpx
import sys
import numpy as np
import cv2
import base64
from datetime import datetime

# Force UTF-8 output on Windows terminal
sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://localhost:8000/api"

def create_synthetic_face_image():
    """Generate a clean synthetic test face canvas"""
    img = np.full((200, 200, 3), 220, dtype=np.uint8)
    cv2.circle(img, (100, 100), 70, (180, 150, 120), -1)
    cv2.circle(img, (75, 85), 10, (50, 50, 50), -1)
    cv2.circle(img, (125, 85), 10, (50, 50, 50), -1)
    cv2.line(img, (100, 85), (100, 115), (100, 80, 60), 4)
    cv2.ellipse(img, (100, 130), (35, 20), 0, 0, 180, (50, 50, 50), 3)
    _, buffer = cv2.imencode('.jpg', img)
    return base64.b64encode(buffer).decode('utf-8')

async def run_phase3_master_test():
    print("\n=======================================================")
    print(" [*] WEINTERN AI ATTENDANCE - PHASE 3 FULL MASTER TEST")
    print("=======================================================\n")

    async with httpx.AsyncClient(timeout=10.0) as client:
        # Admin Login
        print("0. Authenticating Admin Session...")
        login_res = await client.post(f"{BASE_URL}/auth/login", json={"email": "admin@weintern.com", "password": "admin@weintern123"})
        assert login_res.status_code == 200, "Admin login failed"
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("   [PASS] Authenticated successfully.\n")

        # ----------------------------------------------------
        # MODULE 1: GEOFENCING & MOBILE ATTENDANCE
        # ----------------------------------------------------
        print("1. Testing Module 1: Geofencing & Mobile Check-in...")
        res = await client.get(f"{BASE_URL}/geofence", headers=headers)
        assert res.status_code == 200, "Geofence list failed"
        geofences = res.json()
        print(f"   [PASS] Found {len(geofences)} Active Office Geofences (e.g. {geofences[0]['name']} - Radius: {geofences[0]['radius_meters']}m)")

        outside_checkin = {
            "image_base64": create_synthetic_face_image(),
            "latitude": 12.9716, # Bangalore (~840km from Pune)
            "longitude": 77.5946,
            "device_id": "TEST_MOBILE_FAR"
        }
        res = await client.post(f"{BASE_URL}/attendance/mobile-verify", json=outside_checkin)
        assert res.json().get("status_code") == "GEOFENCE_REJECTED", "Should reject out-of-bounds punch"
        print(f"   [PASS] Out-of-bounds Geofence Check: Correctly Blocked ({int(res.json()['distance_meters'])}m from office)")

        # ----------------------------------------------------
        # MODULE 2: PAYROLL & WORKING HOURS ENGINE
        # ----------------------------------------------------
        print("\n2. Testing Module 2: Payroll & Working Hours Engine...")
        current_month = datetime.now().strftime("%Y-%m")
        res = await client.get(f"{BASE_URL}/reports/payroll?month={current_month}", headers=headers)
        assert res.status_code == 200, "Payroll analytics failed"
        payroll = res.json()
        print(f"   [PASS] Monthly Payroll Evaluated for {payroll['total_employees']} staff profiles")
        print(f"   [PASS] Total Logged Hours: {payroll['total_hours_logged']} hrs | Overtime: {payroll['total_overtime_hours']} hrs")

        res = await client.get(f"{BASE_URL}/reports/payroll-csv?month={current_month}", headers=headers)
        assert res.status_code == 200, "Payroll CSV export failed"
        print(f"   [PASS] 1-Click Payroll Spreadsheet Generated ({len(res.content)} bytes)")

        # ----------------------------------------------------
        # MODULE 3: ACTIVE AI ANTI-SPOOFING CHALLENGE
        # ----------------------------------------------------
        print("\n3. Testing Module 3: Active AI Anti-Spoofing Challenge...")
        res = await client.get(f"{BASE_URL}/attendance/challenge")
        assert res.status_code == 200, "Challenge API failed"
        ch = res.json()
        print(f"   [PASS] Random Challenge Dispatched: [{ch['challenge_type']}] {ch['title']}")

        res = await client.post(f"{BASE_URL}/attendance/verify-active-challenge", json={
            "image_base64": create_synthetic_face_image(),
            "challenge_type": "SMILE",
            "device_id": "KIOSK-SHIELD-01"
        })
        assert res.status_code == 200, "Active challenge verification call failed"
        assert res.json().get("status_code") != "CHALLENGE_FAILED", "Should verify active human liveness frame"
        print(f"   [PASS] Active Challenge Verification: {res.json().get('status_code')}")

        # ----------------------------------------------------
        # MODULE 4: RBAC & EMPLOYEE SELF-SERVICE PORTAL
        # ----------------------------------------------------
        print("\n4. Testing Module 4: Multi-Role RBAC & Employee Portal...")
        res = await client.get(f"{BASE_URL}/users/me/profile", headers=headers)
        assert res.status_code == 200, "Profile API failed"
        print(f"   [PASS] Personal Profile: {res.json()['name']} ({res.json()['role']} - {res.json()['shift_name']})")

        res = await client.get(f"{BASE_URL}/users/me/leaves", headers=headers)
        assert res.status_code == 200, "Leaves API failed"
        print(f"   [PASS] Leave Balance Calculated: CL: {res.json()['balances']['casual_leave']['remaining']}d | SL: {res.json()['balances']['sick_leave']['remaining']}d | PL: {res.json()['balances']['paid_leave']['remaining']}d")

        # ----------------------------------------------------
        # MODULE 5: AUTOMATED EMAIL & ALERTS ENGINE
        # ----------------------------------------------------
        print("\n5. Testing Module 5: Automated Alerts & Communications Engine...")
        res = await client.post(f"{BASE_URL}/alerts/send-daily-digest", headers=headers)
        assert res.status_code == 200, "Daily digest trigger failed"
        print(f"   [PASS] Automated Daily Digest Email Dispatched: {res.json()['message']}")

        res = await client.post(f"{BASE_URL}/alerts/send-employee-alert", json={
            "employee_id": "WIO1",
            "alert_type": "LATE_NOTICE",
            "custom_message": "Automated attendance notice: Please arrive by 09:30 AM."
        }, headers=headers)
        assert res.status_code == 200, "Employee alert dispatch failed"
        print(f"   [PASS] Instant Employee Alert Dispatched: {res.json()['message']}")

        # ----------------------------------------------------
        # MODULE 6: OFFLINE KIOSK BATCH SYNCHRONIZATION
        # ----------------------------------------------------
        print("\n6. Testing Module 6: Offline Kiosk Batch Synchronization...")
        offline_batch = [
            {
                "employee_id": "OFFLINE_TEST_01",
                "employee_name": "Offline Synced Staff",
                "department": "Engineering",
                "date": f"2026-08-{np.random.randint(1, 20):02d}",
                "entry_time": "09:05:00 AM",
                "exit_time": "06:05:00 PM",
                "working_hours": 9.0,
                "overtime_hours": 1.0,
                "work_duration": "Full Day",
                "status": "Present",
                "verification_mode": "OFFLINE_BUFFER_SYNC"
            }
        ]
        res = await client.post(f"{BASE_URL}/attendance/sync-offline", json=offline_batch)
        assert res.status_code == 200, "Offline batch sync failed"
        print(f"   [PASS] Offline Sync Result: {res.json()['message']}")

    print("\n=======================================================")
    print(" [***] ALL 6 PHASE 3 ENTERPRISE MODULES 100% PASS!")
    print("=======================================================\n")

if __name__ == "__main__":
    asyncio.run(run_phase3_master_test())
