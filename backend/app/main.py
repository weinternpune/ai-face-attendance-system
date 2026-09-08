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

    # Auto-seed default demo employee
    existing_employee = await db.users.find_one({"email": "employee@weintern.com"})
    if not existing_employee:
        default_emp_pass = os.getenv("DEFAULT_STAFF_PASSWORD", "weintern_staff_demo")
        emp_doc = {
            "name": "Demo Staff Member",
            "employee_id": "EMP101",
            "email": "employee@weintern.com",
            "phone": "+91-9876500000",
            "role": "Employee",
            "department": "Engineering",
            "designation": "Software Engineer",
            "employee_type": "Full-Time",
            "shift_name": "General Shift",
            "status": "Active",
            "hashed_password": get_password_hash(default_emp_pass),
            "face_embeddings": [],
            "created_at": datetime.utcnow()
        }
        await db.users.insert_one(emp_doc)
        logger.info("Initialized default Demo Employee account")

    # Auto-seed default HR account
    existing_hr = await db.users.find_one({"email": "hr@weintern.com"})
    if not existing_hr:
        default_hr_pass = os.getenv("DEFAULT_HR_PASSWORD", "weintern_hr_demo")
        hr_doc = {
            "name": "HR Operations Lead",
            "employee_id": "HR001",
            "email": "hr@weintern.com",
            "phone": "+91-9876511111",
            "role": "HR",
            "department": "Human Resources",
            "designation": "HR Manager",
            "employee_type": "Full-Time",
            "shift_name": "General Shift",
            "status": "Active",
            "hashed_password": get_password_hash(default_hr_pass),
            "face_embeddings": [],
            "created_at": datetime.utcnow()
        }
        await db.users.insert_one(hr_doc)
        logger.info("Initialized default HR account")

    # Auto-seed default shifts if empty
    existing_shifts = await db.shifts.count_documents({})
    if existing_shifts == 0:
        default_shifts = [
            {"name": "General Shift", "code": "GEN", "start_time": "10:00", "end_time": "19:00", "grace_period_minutes": 30, "late_threshold_minutes": 45, "description": "Standard 10 AM to 7 PM (30 min grace)", "is_default": True, "created_at": datetime.utcnow()},
            {"name": "Morning Shift", "code": "MOR", "start_time": "07:00", "end_time": "16:00", "grace_period_minutes": 15, "late_threshold_minutes": 30, "description": "Early morning 7 AM to 4 PM", "is_default": False, "created_at": datetime.utcnow()},
            {"name": "Evening Shift", "code": "EVE", "start_time": "14:00", "end_time": "23:00", "grace_period_minutes": 15, "late_threshold_minutes": 30, "description": "Afternoon to night 2 PM to 11 PM", "is_default": False, "created_at": datetime.utcnow()},
        ]
        await db.shifts.insert_many(default_shifts)
        logger.info("Initialized default work shifts (General 10 AM-7 PM, Morning, Evening).")

    # Auto-seed default office geofence if empty
    existing_geofences = await db.geofences.count_documents({})
    if existing_geofences == 0:
        default_geofence = {
            "name": "WeIntern Pvt Ltd - City Vista",
            "latitude": 18.5529,
            "longitude": 73.9436,
            "radius_meters": 150.0,
            "address": "Office 05, 3rd Floor, B Wing, City Vista, Fountain Road, Kharadi, Pune, Maharashtra 411014",
            "is_active": True,
            "created_at": datetime.utcnow()
        }
        await db.geofences.insert_one(default_geofence)
        logger.info("Initialized default Office Geofence (WeIntern Pvt Ltd - City Vista).")

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
