# 🚀 WeIntern AI Face Attendance System

AI-Powered Biometric Attendance & Office Entry System built in full alignment with the **WeIntern PRD Specification (Version 1.0)**.

---

## 🏗️ Architecture & Tech Stack

- **Frontend:** React (Vite) + Tailwind CSS + Lucide Icons (WeIntern Navy & Gold palette)
- **Backend API:** Python FastAPI (Async REST APIs + JWT Auth)
- **AI Recognition Pipeline:** Google MediaPipe (Face Detection & Liveness/Anti-Spoofing) + 3D Landmark Vector Embeddings
- **Database:** MongoDB (Local or MongoDB Atlas Free Tier)
- **Compliance:** Built-in compliance with India's **DPDP Act 2023** (Explicit biometric consent, encrypted mathematical vector storage, no raw frame retention).

---

## 📁 Directory Structure

```
ai-face-attendance-system/
├── backend/
│   ├── app/
│   │   ├── api/             # API Endpoints (Auth, Users, Attendance, Reports, Audit)
│   │   ├── core/            # Security & JWT hashing
│   │   ├── models/          # Pydantic Schemas (User, Attendance, Device, Audit)
│   │   ├── services/        # AI Service, Vector Matching & Attendance rules
│   │   ├── config.py        # Settings
│   │   ├── database.py      # Async MongoDB Motor Client
│   │   └── main.py          # FastAPI Application
│   ├── requirements.txt     # Python Dependencies (Conflict-Free)
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/             # Axios API Client
│   │   ├── components/      # Navbar, CameraFeed, Modals
│   │   ├── pages/           # Kiosk, Dashboard, Enrollment, Employees, Reports, Audit, Login
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── .env.example
└── docker-compose.yml
```

---

## ⚡ Quick Start (Local Setup)

### 1. Backend Setup
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Backend API will be running on `http://localhost:8000` (API Docs at `http://localhost:8000/docs`).

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend will be running on `http://localhost:5173`.

---

## 🔑 Default Administrator Credentials
On first boot, the system automatically initializes the root administrator:
* **Email:** `admin@weintern.com`
* **Password:** `admin@weintern123`

---

## ☁️ 100% Free Cloud Deployment Guide

### A. Database (MongoDB Atlas) — ₹0
1. Create a free account at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas).
2. Create an **M0 Free Shared Cluster**.
3. Copy your connection string (`mongodb+srv://...`) and paste it as `MONGODB_URL` in your backend environment variables.

### B. Backend (Render / Hugging Face Spaces) — ₹0
1. Push this repository to GitHub.
2. Link to [Render.com](https://render.com/) as a **Web Service** (Root directory: `backend`).
3. Set Build Command: `pip install -r requirements.txt` and Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.

### C. Frontend (Vercel) — ₹0
1. Go to [vercel.com](https://vercel.com/) and import your repository.
2. Select Root Directory as `frontend`.
3. Set Environment Variable: `VITE_API_URL=https://your-backend.onrender.com/api`.
4. Click **Deploy**.

---

## 🛡️ Key PRD Features Implemented

1. **Modular AI Pipeline (Section 8):** Face detection, landmark alignment, anti-spoofing liveness check, vector embedding generation, and cosine similarity threshold matching.
2. **Kiosk Screen Specifications (Section 7):** Standby mode, Green Success confirmation, Blue "Already Marked" feedback, and Red "Face Not Recognized" warning.
3. **Attendance Rules (Section 10):** First scan records entry time and flags `Late` if after 09:30 AM; subsequent scans on the same day prevent duplicate records.
4. **Multi-Angle Face Enrollment (Section 9.2):** Guided captures (Front, Slight Left, Slight Right, Neutral) with explicit DPDP Act 2023 consent checkbox.
5. **Admin Dashboard & Audit Trail (Section 12 & 16.4):** Real-time headcount cards (Total, Present, Late, Absent, Leave), live attendance table, manual corrections modal, and immutable audit logs.
6. **Reports & Exports (Section 14):** One-click Daily attendance CSV download and 7-day attendance compliance rate analytics.
