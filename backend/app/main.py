from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
from datetime import datetime

from app.config import settings
from app.database import connect_to_mongo, close_mongo_connection, get_database
from app.core.security import get_password_hash
from app.core.websocket import ws_manager
from app.api import auth, users, attendance, reports, audit, shifts, leaves, notifications, geofence, alerts

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

    # Auto-seed default shifts if empty
    existing_shifts = await db.shifts.count_documents({})
    if existing_shifts == 0:
        default_shifts = [
            {"name": "General Shift", "code": "GEN", "start_time": "09:00", "end_time": "18:00", "grace_period_minutes": 30, "late_threshold_minutes": 45, "description": "Standard 9 AM to 6 PM (30 min grace)", "is_default": True, "created_at": datetime.utcnow()},
            {"name": "Morning Shift", "code": "MOR", "start_time": "07:00", "end_time": "16:00", "grace_period_minutes": 15, "late_threshold_minutes": 30, "description": "Early morning 7 AM to 4 PM", "is_default": False, "created_at": datetime.utcnow()},
            {"name": "Evening Shift", "code": "EVE", "start_time": "14:00", "end_time": "23:00", "grace_period_minutes": 15, "late_threshold_minutes": 30, "description": "Afternoon to night 2 PM to 11 PM", "is_default": False, "created_at": datetime.utcnow()},
        ]
        await db.shifts.insert_many(default_shifts)
        logger.info("Initialized default work shifts (General, Morning, Evening).")

    # Auto-seed default office geofence if empty
    existing_geofences = await db.geofences.count_documents({})
    if existing_geofences == 0:
        default_geofence = {
            "name": "WeIntern Pune HQ",
            "latitude": 18.5204,
            "longitude": 73.8567,
            "radius_meters": 150.0,
            "address": "WeIntern Innovation Campus, FC Road, Pune, Maharashtra 411005",
            "is_active": True,
            "created_at": datetime.utcnow()
        }
        await db.geofences.insert_one(default_geofence)
        logger.info("Initialized default Office Geofence (WeIntern Pune HQ).")

    yield

    # Shutdown
    await close_mongo_connection()

app = FastAPI(
    title="WeIntern AI Face Attendance System",
    version="3.0.0",
    description="Enterprise AI Biometric Attendance, Kiosk, Shifts, Leaves & Mobile Geofencing API",
    lifespan=lifespan
)

# Enable CORS for Frontend (Local Vite, Vercel, Netlify)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
app.include_router(shifts.router, prefix="/api")
app.include_router(leaves.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(geofence.router, prefix="/api")
app.include_router(alerts.router, prefix="/api")

# Real-time WebSocket Endpoint
@app.websocket("/ws/attendance")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Echo heartbeat or client messages if any
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        ws_manager.disconnect(websocket)

@app.get("/")
async def root():
    return {
        "message": "Welcome to WeIntern AI Face Attendance API v2.0",
        "docs": "/docs",
        "health": "/api/health"
    }

@app.get("/api/health")
async def health_check():
    return {
        "status": "online",
        "version": "2.0.0",
        "service": "WeIntern AI Attendance Engine",
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.utcnow().isoformat()
    }
