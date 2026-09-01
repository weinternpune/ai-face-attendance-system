import asyncio
from app.database import get_database, connect_to_mongo

async def list_enrolled_faces():
    await connect_to_mongo()
    db = get_database()
    users = await db.users.find({}).to_list(20)
    print("=== REGISTERED USERS IN DB ===")
    for u in users:
        emb_count = len(u.get("face_embeddings", []))
        print(f"Name: {u.get('name')} | Email: {u.get('email')} | ID: {u.get('employee_id')} | Role: {u.get('role')} | Status: {u.get('status')} | Enrolled Faces: {emb_count}")

if __name__ == "__main__":
    asyncio.run(list_enrolled_faces())
