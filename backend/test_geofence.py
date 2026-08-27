import asyncio
import httpx
import sys
import numpy as np
import cv2
import base64

# Force UTF-8 output on Windows terminal
sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://localhost:8000/api"

def create_synthetic_face_image():
    """Generate a clean synthetic test face canvas for API testing"""
    img = np.full((200, 200, 3), 220, dtype=np.uint8)
    cv2.circle(img, (100, 100), 70, (180, 150, 120), -1)
    cv2.circle(img, (75, 85), 10, (50, 50, 50), -1)
    cv2.circle(img, (125, 85), 10, (50, 50, 50), -1)
    cv2.line(img, (100, 85), (100, 115), (100, 80, 60), 4)
    cv2.ellipse(img, (100, 130), (35, 20), 0, 0, 180, (50, 50, 50), 3)
    _, buffer = cv2.imencode('.jpg', img)
    return base64.b64encode(buffer).decode('utf-8')

async def run_geofence_test():
    print("\n=======================================================")
    print(" [*] PHASE 3 - MODULE 1: GEOFENCING & MOBILE TEST")
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

        # 2. List Configured Geofences
        print("\n2. Testing Geofence Listing (Admin & Public)...")
        res = await client.get(f"{BASE_URL}/geofence", headers=headers)
        assert res.status_code == 200, f"List geofences failed: {res.text}"
        geofences = res.json()
        print(f"   [PASS] Found {len(geofences)} configured office geofences:")
        for g in geofences:
            print(f"      - {g['name']}: Lat {g['latitude']}, Lon {g['longitude']} (Radius: {g['radius_meters']}m)")

        # 3. Create Custom Test Geofence
        print("\n3. Testing Office Geofence Creation...")
        new_fence = {
            "name": "WeIntern Tech Park Testing Zone",
            "latitude": 18.5500,
            "longitude": 73.9000,
            "radius_meters": 100.0,
            "address": "Magarpatta Cybercity, Pune",
            "is_active": True
        }
        res = await client.post(f"{BASE_URL}/geofence", json=new_fence, headers=headers)
        assert res.status_code == 200, f"Create geofence failed: {res.text}"
        created = res.json()
        fence_id = created["id"]
        print(f"   [PASS] Created Geofence: {created['name']} (ID: {fence_id})")

        # 4. Update Geofence Radius
        print("\n4. Testing Geofence Modification...")
        res = await client.patch(f"{BASE_URL}/geofence/{fence_id}", json={"radius_meters": 200.0}, headers=headers)
        assert res.status_code == 200, f"Update geofence failed: {res.text}"
        print("   [PASS] Updated Geofence radius to 200m.")

        # 5. Test Mobile Verification - OUTSIDE Geofence (Should be REJECTED)
        print("\n5. Testing Mobile Check-in OUTSIDE Geofence (Distance Rejection)...")
        dummy_selfie = create_synthetic_face_image()
        outside_payload = {
            "image_base64": dummy_selfie,
            "latitude": 19.0760, # Mumbai (~120km away from Pune)
            "longitude": 72.8777,
            "device_id": "TEST_MOBILE_OUTSIDE"
        }
        res = await client.post(f"{BASE_URL}/attendance/mobile-verify", json=outside_payload)
        assert res.status_code == 200, f"Mobile verify call failed: {res.text}"
        outside_result = res.json()
        assert outside_result["status_code"] == "GEOFENCE_REJECTED", f"Expected GEOFENCE_REJECTED, got: {outside_result}"
        print(f"   [PASS] Correctly Rejected: {outside_result['message']}")
        print(f"   [PASS] Calculated Distance: {outside_result.get('distance_meters')}m (Max Allowed: {outside_result.get('allowed_radius')}m)")

        # 6. Test Mobile Verification - INSIDE Geofence Boundary
        print("\n6. Testing Mobile Check-in INSIDE Geofence Boundary...")
        inside_payload = {
            "image_base64": dummy_selfie,
            "latitude": 18.5501, # ~15 meters from 18.5500, 73.9000
            "longitude": 73.9001,
            "device_id": "TEST_MOBILE_INSIDE"
        }
        res = await client.post(f"{BASE_URL}/attendance/mobile-verify", json=inside_payload)
        assert res.status_code == 200, f"Mobile verify call failed: {res.text}"
        inside_result = res.json()
        # Should pass geofence filter (might report UNKNOWN_FACE or SUCCESS depending on face match)
        assert inside_result["status_code"] != "GEOFENCE_REJECTED", f"Should have passed geofence, but got: {inside_result}"
        print(f"   [PASS] Geofence Validation Passed! (Result: {inside_result['status_code']})")

        # 7. Clean up Temporary Test Geofence
        print("\n7. Cleaning Up Test Geofence...")
        res = await client.delete(f"{BASE_URL}/geofence/{fence_id}", headers=headers)
        assert res.status_code == 200, f"Delete geofence failed: {res.text}"
        print("   [PASS] Test geofence cleaned up successfully.")

    print("\n=======================================================")
    print(" [***] PHASE 3 MODULE 1 (GEOFENCING & MOBILE) 100% PASS!")
    print("=======================================================\n")

if __name__ == "__main__":
    asyncio.run(run_geofence_test())
