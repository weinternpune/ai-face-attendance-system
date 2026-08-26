import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import sys
import os

# Ensure UTF-8 output on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Adjust path to import settings
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.config import settings

async def deduplicate_atasi():
    print("\n=======================================================")
    print(" 🧹  DEDUPLICATING ATASI PRADHAN RECORDS")
    print("=======================================================\n")
    print(f"[*] Connecting to MongoDB at: {settings.MONGODB_URL}")
    
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]

    # Find all users named "Atasi Pradhan" (case-insensitive) or with ID like WI01 / WI001
    cursor = db.users.find({
        "$or": [
            {"name": {"$regex": "atasi pradhan", "$options": "i"}},
            {"employee_id": {"$regex": "^WI01$", "$options": "i"}},
            {"employee_id": {"$regex": "^WI001$", "$options": "i"}}
        ]
    }).sort("created_at", 1)

    matching_users = []
    async for u in cursor:
        matching_users.append(u)

    print(f"[i] Found {len(matching_users)} matching user records in database:")
    for idx, u in enumerate(matching_users, start=1):
        print(f"    {idx}. ID: {u.get('employee_id')} | Name: {u.get('name')} | Email: {u.get('email')} | MongoDB ID: {str(u['_id'])}")

    if len(matching_users) == 0:
        print("\n[-] No records found matching 'Atasi Pradhan' or 'WI01'.")
    elif len(matching_users) == 1:
        print(f"\n[✓] Only 1 record exists ({matching_users[0].get('name')} - {matching_users[0].get('employee_id')}). No duplicate to delete.")
    else:
        # Determine the one to KEEP:
        # Priority 1: employee_id == "WI01"
        # Priority 2: first one
        keep_user = None
        for u in matching_users:
            if u.get("employee_id", "").upper() in ["WI01", "WI001"]:
                keep_user = u
                break
        
        if not keep_user:
            keep_user = matching_users[0]

        print(f"\n[★ KEEPING MAIN RECORD]:")
        print(f"    • Name: {keep_user.get('name')}")
        print(f"    • Employee ID: {keep_user.get('employee_id')}")
        print(f"    • Email: {keep_user.get('email')}")
        print(f"    • Mongo ID: {str(keep_user['_id'])}")

        # Delete all other duplicate users
        deleted_count = 0
        for u in matching_users:
            if str(u["_id"]) != str(keep_user["_id"]):
                dup_id_str = str(u["_id"])
                dup_emp_id = u.get("employee_id")
                
                # Delete user doc
                await db.users.delete_one({"_id": u["_id"]})
                
                # Clean duplicate attendance if tagged with this specific dup ID
                if dup_emp_id and dup_emp_id != keep_user.get("employee_id"):
                    await db.attendance.delete_many({"employee_id": dup_emp_id})
                    await db.leaves.delete_many({"employee_id": dup_emp_id})

                print(f"[✓] Deleted duplicate: {u.get('name')} (ID: {dup_emp_id}, Mongo ID: {dup_id_str})")
                deleted_count += 1

        print(f"\n[🎉 SUCCESS] Deleted {deleted_count} duplicate record(s). Main record '{keep_user.get('name')}' ({keep_user.get('employee_id')}) is preserved!")

    client.close()
    print("\n=======================================================\n")

if __name__ == "__main__":
    asyncio.run(deduplicate_atasi())
