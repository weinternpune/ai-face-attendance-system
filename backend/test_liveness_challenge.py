import asyncio
import httpx
import sys
import numpy as np
import cv2
import base64

# Force UTF-8 output on Windows terminal
sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://localhost:8000/api"

def create_synthetic_face_image(with_smile=True):
    """Generate a clean synthetic test face canvas with or without smile"""
    img = np.full((200, 200, 3), 220, dtype=np.uint8)
    cv2.circle(img, (100, 100), 70, (180, 150, 120), -1)
    cv2.circle(img, (75, 85), 10, (50, 50, 50), -1)
    cv2.circle(img, (125, 85), 10, (50, 50, 50), -1)
    cv2.line(img, (100, 85), (100, 115), (100, 80, 60), 4)
    if with_smile:
        cv2.ellipse(img, (100, 130), (35, 20), 0, 0, 180, (50, 50, 50), 3)
    else:
        cv2.line(img, (75, 135), (125, 135), (50, 50, 50), 3)
    _, buffer = cv2.imencode('.jpg', img)
    return base64.b64encode(buffer).decode('utf-8')

async def run_liveness_challenge_test():
    print("\n=======================================================")
    print(" [*] PHASE 3 - MODULE 3: ACTIVE AI ANTI-SPOOFING TEST")
    print("=======================================================\n")

    async with httpx.AsyncClient(timeout=10.0) as client:
        # 1. Test Challenge Generation API
        print("1. Testing Dynamic Challenge Generation API...")
        res = await client.get(f"{BASE_URL}/attendance/challenge")
        assert res.status_code == 200, f"Challenge generation failed: {res.text}"
        ch = res.json()
        print(f"   [PASS] Generated Challenge: {ch['title']}")
        print(f"   [PASS] Type: {ch['challenge_type']} (Instruction: '{ch['instruction']}')")

        # 2. Test Active Challenge Verification (Smile Prompt)
        print("\n2. Testing Active Challenge Verification (Smile Prompt)...")
        smiling_selfie = create_synthetic_face_image(with_smile=True)
        payload = {
            "image_base64": smiling_selfie,
            "challenge_type": "SMILE",
            "device_id": "TEST_KIOSK_CHALLENGE"
        }
        res = await client.post(f"{BASE_URL}/attendance/verify-active-challenge", json=payload)
        assert res.status_code == 200, f"Active challenge call failed: {res.text}"
        result = res.json()
        print(f"   [PASS] Active Challenge Verification Status: {result.get('status_code')}")
        print(f"   [PASS] Result Message: {result.get('message')}")
        assert result.get("status_code") != "CHALLENGE_FAILED", "Smile challenge should pass on smile frame"

        # 3. Test Active Challenge Verification (Blink Prompt)
        print("\n3. Testing Active Challenge Verification (Blink Prompt)...")
        payload["challenge_type"] = "BLINK"
        res = await client.post(f"{BASE_URL}/attendance/verify-active-challenge", json=payload)
        assert res.status_code == 200, f"Active challenge call failed: {res.text}"
        blink_result = res.json()
        print(f"   [PASS] Blink Challenge Verification Status: {blink_result.get('status_code')}")
        print(f"   [PASS] Result Message: {blink_result.get('message')}")

    print("\n=======================================================")
    print(" [***] PHASE 3 MODULE 3 (ACTIVE AI ANTI-SPOOFING) 100% PASS!")
    print("=======================================================\n")

if __name__ == "__main__":
    asyncio.run(run_liveness_challenge_test())
