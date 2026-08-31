import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
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

// Protected route wrapper with strict Role-Based Access Control (RBAC)
function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem('weintern_token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles && allowedRoles.length > 0) {
    const user = JSON.parse(localStorage.getItem('weintern_user') || '{}');
    const userRole = user.role || 'Employee';
    if (!allowedRoles.includes(userRole)) {
      // If employee tries to access admin-only route, redirect to employee portal
      return <Navigate to="/portal" replace />;
    }
  }

  return children;
}

// Smart Root Redirect based on Authentication & Role
function RootRedirect() {
  const token = localStorage.getItem('weintern_token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  const user = JSON.parse(localStorage.getItem('weintern_user') || '{}');
  const userRole = user.role || 'Employee';
  if (userRole === 'Employee' || userRole === 'Intern') {
    return <Navigate to="/portal" replace />;
  }
  return <Navigate to="/dashboard" replace />;
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
      {!isFullscreen && <Footer />}
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
          
          {/* Protected Routes by Role */}
          <Route 
            path="/portal" 
            element={
              <ProtectedRoute allowedRoles={['Admin', 'HR', 'Employee', 'Intern']}>
                <EmployeePortal />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['Admin', 'HR']}>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/leaves" 
            element={
              <ProtectedRoute allowedRoles={['Admin', 'HR']}>
                <Leaves />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/shifts" 
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <Shifts />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/geofence" 
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <GeofenceSettings />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/enroll" 
            element={
              <ProtectedRoute allowedRoles={['Admin', 'HR']}>
                <Enrollment />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/employees" 
            element={
              <ProtectedRoute allowedRoles={['Admin', 'HR']}>
                <Employees />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/reports" 
            element={
              <ProtectedRoute allowedRoles={['Admin', 'HR']}>
                <Reports />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/payroll" 
            element={
              <ProtectedRoute allowedRoles={['Admin', 'HR']}>
                <Payroll />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/audit" 
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
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
