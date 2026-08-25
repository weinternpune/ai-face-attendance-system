from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
from datetime import datetime

from app.config import settings
from app.database import connect_to_mongo, close_mongo_connection, get_database
from app.core.security import get_password_hash
from app.api import auth, users, attendance, reports, audit

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("uvicorn")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Connect to MongoDB & Seed default admin if needed
    await connect_to_mongo()
    db = get_database()
    
    # Auto-seed default administrator
    existing_admin = await db.users.find_one({"role": "Admin"})
    if not existing_admin:
        admin_doc = {
            "name": settings.DEFAULT_ADMIN_NAME,
            "employee_id": "ADM001",
            "email": settings.DEFAULT_ADMIN_EMAIL.lower(),
            "phone": "+91-9876543210",
            "role": "Admin",
            "department": "Management",
            "designation": "System Administrator",
            "employee_type": "Full-Time",
            "status": "Active",
            "hashed_password": get_password_hash(settings.DEFAULT_ADMIN_PASSWORD),
            "face_embeddings": [],
            "created_at": datetime.utcnow()
        }
        await db.users.insert_one(admin_doc)
        logger.info(f"Initialized default Admin account: {settings.DEFAULT_ADMIN_EMAIL}")

    yield

    # Shutdown
    await close_mongo_connection()

app = FastAPI(
    title="WeIntern AI Face Attendance System",
    version="1.0.0",
    description="Production-grade AI Biometric Attendance and Kiosk API",
    lifespan=lifespan
)

# Enable CORS for Frontend (Local Vite, Vercel, Netlify)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permits local frontend and deployed Vercel domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(attendance.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(audit.router, prefix="/api")

@app.get("/")
async def root():
    return {
        "message": "Welcome to WeIntern AI Face Attendance API",
        "docs": "/docs",
        "health": "/api/health"
    }

@app.get("/api/health")
async def health_check():
    return {
        "status": "online",
        "service": "WeIntern AI Attendance Engine",
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.utcnow().isoformat()
    }
