from motor.motor_asyncio import AsyncIOMotorClient
import logging
from app.config import settings

logger = logging.getLogger("uvicorn")

class Database:
    client: AsyncIOMotorClient = None
    db = None

db = Database()

async def connect_to_mongo():
    logger.info(f"Connecting to MongoDB at {settings.MONGODB_URL}...")
    db.client = AsyncIOMotorClient(settings.MONGODB_URL)
    db.db = db.client[settings.DATABASE_NAME]
    
    # Create indexes for optimal queries
    try:
        await db.db.users.create_index("email", unique=True)
        await db.db.users.create_index("employee_id", unique=True)
        await db.db.attendance.create_index([("user_id", 1), ("date", 1)])
        await db.db.attendance.create_index("date")
        await db.db.audit_logs.create_index("timestamp")
        logger.info("MongoDB connected successfully with required indexes.")
    except Exception as e:
        logger.warning(f"Index creation notice: {e}")

async def close_mongo_connection():
    if db.client:
        db.client.close()
        logger.info("MongoDB connection closed.")

def get_database():
    return db.db
