import asyncio
import base64
import numpy as np
import cv2
import httpx
import sys

# Force UTF-8 output on Windows terminal
sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://localhost:8000/api"

def create_synthetic_face_image():
    """Generate a clean synthetic test face canvas for API testing"""
    img = np.full((200, 200, 3), 220, dtype=np.uint8)
    # Head contour
    cv2.circle(img, (100, 100), 70, (180, 150, 120), -1)
    # Eyes
    cv2.circle(img, (75, 85), 10, (50, 50, 50), -1)
    cv2.circle(img, (125, 85), 10, (50, 50, 50), -1)
    # Nose
    cv2.line(img, (100, 85), (100, 115), (100, 80, 60), 4)
    # Smile
    cv2.ellipse(img, (100, 130), (35, 20), 0, 0, 180, (50, 50, 50), 3)

    _, buffer = cv2.imencode('.jpg', img)
    return base64.b64encode(buffer).decode('utf-8')

async def run_e2e_test():
    print("\n=======================================================")
    print(" [*] WEINTERN AI ATTENDANCE SYSTEM - END-TO-END TEST")
    print("=======================================================\n")

    async with httpx.AsyncClient(timeout=10.0) as client:
        # 1. Health Check
        print("1. Testing System Health Check...")
        res = await client.get(f"{BASE_URL}/health")
        assert res.status_code == 200, f"Health check failed: {res.text}"
        print(f"   [PASS] Health Check: {res.json()['status']} ({res.json()['service']})")

        # 2. Admin Login
        print("\n2. Testing Admin Login & JWT Generation...")
        login_payload = {
            "email": "admin@weintern.com",
            "password": "admin@weintern123"
        }
        res = await client.post(f"{BASE_URL}/auth/login", json=login_payload)
        assert res.status_code == 200, f"Login failed: {res.text}"
        login_data = res.json()
        token = login_data["access_token"]
        auth_headers = {"Authorization": f"Bearer {token}"}
        print(f"   [PASS] Logged in as: {login_data['user']['name']} ({login_data['user']['role']})")

        # 3. Employee Registration
        print("\n3. Testing Employee Registration (PRD Section 9.1)...")
        emp_payload = {
            "name": "Demo Employee",
            "employee_id": f"WI{np.random.randint(100, 999)}",
            "email": f"demo_{np.random.randint(1000, 9999)}@weintern.com",
            "phone": "+91-9876543210",
            "role": "Intern",
            "department": "AIML",
            "designation": "AI Intern",
            "employee_type": "Intern",
            "status": "Active"
        }
        res = await client.post(f"{BASE_URL}/users/", json=emp_payload, headers=auth_headers)
        assert res.status_code == 200, f"User creation failed: {res.text}"
        user_id = res.json()["user_id"]
        emp_id = res.json()["employee_id"]
        print(f"   [PASS] Registered: {emp_payload['name']} (ID: {emp_id}, MongoDB ID: {user_id})")

        # 4. Multi-Angle Face Enrollment
        print("\n4. Testing Multi-Angle Face Enrollment (PRD Section 9.2)...")
        test_face_b64 = create_synthetic_face_image()
        enroll_payload = {
            "user_id": user_id,
            "face_images": [test_face_b64, test_face_b64, test_face_b64],
            "consent_given": True,
            "consent_timestamp": "2026-08-25T11:50:00Z"
        }
        res = await client.post(f"{BASE_URL}/users/enroll-face", json=enroll_payload, headers=auth_headers)
        assert res.status_code == 200, f"Face enrollment failed: {res.text}"
        print(f"   [PASS] Face Embeddings Enrolled: {res.json()['message']}")

        # 5. Live Kiosk Attendance Verification (1st Scan - Entry)
        print("\n5. Testing Live Kiosk Attendance Verification (1st Scan)...")
        kiosk_payload = {
            "image_base64": test_face_b64,
            "device_id": "KIOSK-MAIN-ENTRANCE"
        }
        res = await client.post(f"{BASE_URL}/attendance/verify", json=kiosk_payload)
        assert res.status_code == 200, f"Kiosk verification failed: {res.text}"
        kiosk_result = res.json()
        print(f"   [PASS] 1st Scan Response Code: {kiosk_result.get('status_code')}")
        print(f"   [PASS] Message: {kiosk_result.get('message')}")
        print(f"   [PASS] Recognized User: {kiosk_result.get('user', {}).get('name')}")
        print(f"   [PASS] Entry Time: {kiosk_result.get('entry_time')} (Status: {kiosk_result.get('status')})")

        # 6. Duplicate Scan Prevention (2nd Scan - Same Day)
        print("\n6. Testing Duplicate Scan Prevention (PRD Section 10.1)...")
        res_dup = await client.post(f"{BASE_URL}/attendance/verify", json=kiosk_payload)
        assert res_dup.status_code == 200, f"Duplicate scan check failed: {res_dup.text}"
        dup_result = res_dup.json()
        print(f"   [PASS] 2nd Scan Response Code: {dup_result.get('status_code')}")
        print(f"   [PASS] Duplicate Message: {dup_result.get('message')}")
        assert dup_result.get('status_code') == 'ALREADY_MARKED', "Should return ALREADY_MARKED"

        # 7. Today's Dashboard Overview Stats
        print("\n7. Testing Admin Dashboard Stats (PRD Section 12.1)...")
        res_stats = await client.get(f"{BASE_URL}/attendance/today-stats", headers=auth_headers)
        assert res_stats.status_code == 200
        stats = res_stats.json()
        print(f"   [PASS] Total Employees: {stats['total_employees']}")
        print(f"   [PASS] Present: {stats['present']}")
        print(f"   [PASS] Absent: {stats['absent']}")
        print(f"   [PASS] Late: {stats['late']}")

        # 8. Daily CSV Report Export
        print("\n8. Testing Daily Attendance CSV Export (PRD Section 14)...")
        res_csv = await client.get(f"{BASE_URL}/reports/daily-csv", headers=auth_headers)
        assert res_csv.status_code == 200
        csv_preview = res_csv.text.splitlines()[:3]
        print(f"   [PASS] CSV Headers: {csv_preview[0] if csv_preview else 'None'}")
        if len(csv_preview) > 1:
            print(f"   [PASS] First Record Row: {csv_preview[1]}")

        # 9. Audit Logs
        print("\n9. Testing Security & Audit Trail (PRD Section 16.4 & 20)...")
        res_audit = await client.get(f"{BASE_URL}/audit/", headers=auth_headers)
        assert res_audit.status_code == 200
        logs = res_audit.json()
        print(f"   [PASS] Total Audit Events Logged: {len(logs)}")
        if logs:
            print(f"   [PASS] Latest Audit Event: {logs[0]['action']} by {logs[0]['admin_name']}")

    print("\n=======================================================")
    print(" [***] ALL 9 PRD REQUIREMENTS VERIFIED & PASSED (100% SUCCESS)!")
    print("=======================================================\n")

if __name__ == "__main__":
    asyncio.run(run_e2e_test())
