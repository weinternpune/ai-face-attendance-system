import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Kiosk from './pages/Kiosk';
import Dashboard from './pages/Dashboard';
import Enrollment from './pages/Enrollment';
import Employees from './pages/Employees';
import Leaves from './pages/Leaves';
import Shifts from './pages/Shifts';
import Reports from './pages/Reports';
import AuditLogs from './pages/AuditLogs';
import Login from './pages/Login';

// Protected route wrapper to redirect to login if no auth token
function ProtectedRoute({ children }) {
  const token = localStorage.getItem('weintern_token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

// Redirects logged in user from /login or / to /dashboard
function RootRedirect() {
  const token = localStorage.getItem('weintern_token');
  return <Navigate to={token ? "/dashboard" : "/login"} replace />;
}

function Layout({ children }) {
  const location = useLocation();
  const isFullscreen = location.pathname === '/kiosk' || location.pathname === '/login';

  return (
    <div className="min-h-screen bg-[#060913] flex flex-col font-sans">
      {!isFullscreen && <Navbar />}
      <main className="flex-1">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          {/* Root defaults to login or dashboard based on authentication */}
          <Route path="/" element={<RootRedirect />} />
          
          {/* Public Entrance Kiosk (No login needed for employees to scan face) */}
          <Route path="/kiosk" element={<Kiosk />} />
          
          {/* Admin Login */}
          <Route path="/login" element={<Login />} />
          
          {/* Protected Admin/HR Routes */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/leaves" 
            element={
              <ProtectedRoute>
                <Leaves />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/shifts" 
            element={
              <ProtectedRoute>
                <Shifts />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/enroll" 
            element={
              <ProtectedRoute>
                <Enrollment />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/employees" 
            element={
              <ProtectedRoute>
                <Employees />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/reports" 
            element={
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/audit" 
            element={
              <ProtectedRoute>
                <AuditLogs />
              </ProtectedRoute>
            } 
          />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}
