import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import sys
import os

# Set UTF-8 encoding for Windows terminal
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Adjust path to import settings
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.config import settings

async def remove_employee(emp_query: str = "WI001"):
    print("\n=======================================================")
    print(" 🗑️  WEINTERN EMPLOYEE & DATA CLEANUP UTILITY")
    print("=======================================================\n")
    print(f"[*] Connecting to MongoDB at: {settings.MONGODB_URL} (DB: {settings.DATABASE_NAME})")
    
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]

    # Find matching user by Employee ID, Name, or Email
    user = await db.users.find_one({
        "$or": [
            {"employee_id": {"$regex": f"^{emp_query}$", "$options": "i"}},
            {"name": {"$regex": emp_query, "$options": "i"}},
            {"email": {"$regex": emp_query, "$options": "i"}}
        ]
    })

    if not user:
        print(f"\n[-] No employee found matching '{emp_query}'.")
        print("[*] Current registered employees in Database:")
        cursor = db.users.find({}, {"name": 1, "employee_id": 1, "email": 1, "role": 1})
        async for u in cursor:
            print(f"    • {u.get('name')} | ID: {u.get('employee_id')} | Email: {u.get('email')} | Role: {u.get('role')}")
    else:
        user_id_str = str(user["_id"])
        emp_id = user.get("employee_id", "N/A")
        emp_name = user.get("name", "N/A")

        print(f"\n[+] Found Target Employee:")
        print(f"    • Name: {emp_name}")
        print(f"    • Employee ID: {emp_id}")
        print(f"    • Email: {user.get('email')}")
        print(f"    • MongoDB ID: {user_id_str}")

        # 1. Delete from users
        del_user = await db.users.delete_one({"_id": user["_id"]})
        print(f"\n[✓] Deleted from 'users' collection ({del_user.deleted_count} record)")

        # 2. Delete attendance records
        del_att = await db.attendance.delete_many({
            "$or": [
                {"user_id": user_id_str},
                {"employee_id": {"$regex": f"^{emp_id}$", "$options": "i"}},
                {"employee_name": {"$regex": emp_name, "$options": "i"}}
            ]
        })
        print(f"[✓] Deleted {del_att.deleted_count} attendance records from Dashboard & Kiosk stream")

        # 3. Delete leave applications
        del_leaves = await db.leaves.delete_many({
            "$or": [
                {"employee_id": {"$regex": f"^{emp_id}$", "$options": "i"}},
                {"employee_name": {"$regex": emp_name, "$options": "i"}}
            ]
        })
        print(f"[✓] Deleted {del_leaves.deleted_count} leave requests from 'leaves' collection")

        # 4. Log Audit event
        await db.audit_logs.insert_one({
            "action": "EMPLOYEE_PURGED_VIA_SCRIPT",
            "target_user_id": user_id_str,
            "target_user_name": emp_name,
            "details": {"employee_id": emp_id, "script": "delete_employee.py"},
            "timestamp": asyncio.get_event_loop().time()
        })

        print(f"\n[🎉 SUCCESS] Employee '{emp_name}' ({emp_id}) and all associated records deleted!")

    client.close()
    print("\n=======================================================\n")

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "WI001"
    asyncio.run(remove_employee(target))
