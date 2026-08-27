import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Kiosk from './pages/Kiosk';
import Dashboard from './pages/Dashboard';
import Enrollment from './pages/Enrollment';
import Employees from './pages/Employees';
import Leaves from './pages/Leaves';
import Shifts from './pages/Shifts';
import Reports from './pages/Reports';
import Payroll from './pages/Payroll';
import AuditLogs from './pages/AuditLogs';
import GeofenceSettings from './pages/GeofenceSettings';
import MobileCheckin from './pages/MobileCheckin';
import EmployeePortal from './pages/EmployeePortal';
import Login from './pages/Login';

// Auto smooth-scroll to top on every page change
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }, [pathname]);
  return null;
}

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
  const isFullscreen = location.pathname === '/kiosk' || location.pathname === '/login' || location.pathname === '/mobile-checkin';

  return (
    <div className="min-h-screen bg-[#060913] flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      <ScrollToTop />
      {!isFullscreen && <Navbar />}
      <main className="flex-1 w-full animate-fadeIn transition-opacity duration-300">
        {children}
      </main>
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

          {/* Public Mobile Self Check-In with Geofencing */}
          <Route path="/mobile-checkin" element={<MobileCheckin />} />
          
          {/* Admin Login */}
          <Route path="/login" element={<Login />} />
          
          {/* Protected Admin/HR Routes */}
          <Route 
            path="/portal" 
            element={
              <ProtectedRoute>
                <EmployeePortal />
              </ProtectedRoute>
            } 
          />
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
            path="/geofence" 
            element={
              <ProtectedRoute>
                <GeofenceSettings />
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
            path="/payroll" 
            element={
              <ProtectedRoute>
                <Payroll />
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
