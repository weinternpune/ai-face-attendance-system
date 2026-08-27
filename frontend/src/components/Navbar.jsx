import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import weinternLogo from '../assets/weintern-logo.png';
import apiClient from '../api/client';
import { 
  ScanFace, 
  LayoutDashboard, 
  UserPlus, 
  Users, 
  FileSpreadsheet, 
  ShieldAlert, 
  LogOut, 
  Menu, 
  X, 
  Calendar, 
  Clock, 
  Bell, 
  Check, 
  AlertCircle, 
  MapPin, 
  Smartphone, 
  DollarSign, 
  User, 
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  Sparkles,
  Layers
} from 'lucide-react';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifDrawerOpen, setNotifDrawerOpen] = useState(false);
  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const user = JSON.parse(localStorage.getItem('weintern_user') || '{}');
  
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setAdminDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setAdminDropdownOpen(false);
  }, [location.pathname]);

  const fetchNotifications = async () => {
    try {
      const res = await apiClient.get('/notifications');
      setNotifications(res.data);
      setUnreadCount(res.data.filter(n => !n.is_read).length);
    } catch (e) {
      // ignore offline errors
    }
  };

  useEffect(() => {
    if (user.name) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 10000);
      return () => clearInterval(interval);
    }
  }, [user.name]);

  const handleMarkAllRead = async () => {
    try {
      await apiClient.post('/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('weintern_token');
    localStorage.removeItem('weintern_user');
    navigate('/login');
  };

  const formatNotificationTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      let iso = String(dateStr);
      if (!iso.endsWith('Z') && !iso.includes('+')) {
        iso += 'Z';
      }
      const d = new Date(iso);
      if (isNaN(d.getTime())) return String(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return '';
    }
  };

  // Primary Navigation (Always visible on Desktop)
  const primaryNav = [
    { label: 'Live Kiosk', path: '/kiosk', icon: ScanFace, highlight: true },
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'My Portal', path: '/portal', icon: User },
    { label: 'Mobile Check-In', path: '/mobile-checkin', icon: Smartphone },
  ];

  // Administration Management Tools (In Dropdown on Desktop, Full List on Mobile)
  const adminNav = [
    { label: 'Payroll Engine', path: '/payroll', icon: DollarSign, desc: 'Working hours, OT & monthly salary statements' },
    { label: 'Geofence Settings', path: '/geofence', icon: MapPin, desc: 'Office GPS perimeter & remote check-in radius' },
    { label: 'Employee Directory', path: '/employees', icon: Users, desc: 'Manage workforce profiles & designations' },
    { label: 'Face Biometrics Enrollment', path: '/enroll', icon: UserPlus, desc: 'Multi-angle AI face embedding enrollment' },
    { label: 'Leaves Management', path: '/leaves', icon: Calendar, desc: 'Approve, reject & track staff time off' },
    { label: 'Shift Roster Master', path: '/shifts', icon: Clock, desc: 'Configure shift timings & grace periods' },
    { label: 'Analytics Reports', path: '/reports', icon: FileSpreadsheet, desc: '7-day turnout trends & performance metrics' },
    { label: 'Security Audit Logs', path: '/audit', icon: ShieldAlert, desc: 'Immutable compliance trail & system events' },
  ];

  const isAdminActive = adminNav.some(item => location.pathname === item.path);

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-2xl border-b border-slate-200 shadow-xs transition-all duration-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-2">
          
          {/* Brand Logo */}
          <Link to="/dashboard" className="flex items-center space-x-2.5 sm:space-x-3.5 group shrink-0 min-w-0">
            <div className="relative flex items-center shrink-0">
              <img 
                src={weinternLogo} 
                alt="WeIntern Logo" 
                className="h-7 sm:h-9 w-auto object-contain transition duration-200 group-hover:scale-105"
              />
            </div>
            <div className="min-w-0 hidden min-[380px]:block">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/90 shadow-xs truncate">
                  AI Face Vision v3.0
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-semibold tracking-wide truncate hidden md:block mt-0.5">
                Workforce Intelligence System
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center space-x-1.5 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
            {primaryNav.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`h-9 flex items-center gap-1.5 px-3.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer select-none shrink-0 ${
                    item.highlight
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold shadow-md shadow-blue-500/25 hover:brightness-110 active:brightness-95'
                      : isActive
                      ? 'bg-white text-blue-700 shadow-xs border border-slate-200/90 font-extrabold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/70 font-semibold'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${item.highlight ? 'text-white stroke-[2.5]' : isActive ? 'text-blue-600 stroke-[2.2]' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {/* Admin Management Tools Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setAdminDropdownOpen(!adminDropdownOpen)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                  isAdminActive
                    ? 'bg-white text-blue-700 shadow-xs border border-slate-200/90 font-extrabold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/70 font-semibold'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                <span>Management</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${adminDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {adminDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-slate-200 shadow-2xl p-2 z-50 animate-spring-in space-y-1">
                  <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    Administration & Tools
                  </div>
                  <div className="max-h-80 overflow-y-auto space-y-0.5 pr-1">
                    {adminNav.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setAdminDropdownOpen(false)}
                          className={`flex items-start gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
                            isActive
                              ? 'bg-blue-50 text-blue-700 border border-blue-200/80 font-extrabold'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 leading-tight">{item.label}</div>
                            <p className="text-[10px] text-slate-500 font-normal mt-0.5 leading-snug">{item.desc}</p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Action Controls: Notification Bell, Profile, Mobile Menu */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setNotifDrawerOpen(!notifDrawerOpen)}
                className="p-2 sm:p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 border border-slate-200 transition relative cursor-pointer hover:scale-105 active:scale-95"
                title="Notifications & Alerts"
              >
                <Bell className={`w-4 h-4 ${unreadCount > 0 ? 'text-amber-500 animate-pulse' : 'text-slate-600'}`} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white font-bold text-[9px] flex items-center justify-center animate-pulse shadow-md shadow-rose-500/40">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            </div>

            {user.name ? (
              <div className="flex items-center space-x-2 sm:space-x-3 pl-1 sm:pl-3 sm:border-l border-slate-200">
                <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-[10px] sm:text-xs font-black shadow-sm shadow-blue-500/20">
                  {user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </div>
                <div className="text-left hidden md:block">
                  <div className="text-xs font-bold text-slate-900 leading-none truncate max-w-[120px]">{user.name}</div>
                  <div className="text-[10px] text-blue-600 font-bold tracking-wide mt-0.5">{user.role || 'Admin'}</div>
                </div>
                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition border border-slate-200 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="btn-primary text-xs px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl font-bold shadow-md"
              >
                Admin Login
              </Link>
            )}

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg sm:rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Notifications Slide-Over Drawer */}
      {notifDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-sm bg-white border-l border-slate-200 h-full p-5 flex flex-col justify-between shadow-2xl animate-spring-in">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-slate-900 text-sm">Notifications & Alerts</h3>
                </div>
                <button onClick={() => setNotifDrawerOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center justify-between py-2.5 text-xs border-b border-slate-100">
                <span className="text-slate-500 font-semibold">{unreadCount} unread alerts</span>
                {unreadCount > 0 && (
                  <button 
                    onClick={handleMarkAllRead}
                    className="text-blue-600 hover:text-blue-700 font-bold text-[11px] cursor-pointer"
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              {/* Notification List */}
              <div className="overflow-y-auto max-h-[calc(100vh-180px)] space-y-2.5 py-3 pr-1 text-xs">
                {notifications.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <ShieldCheck className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-medium">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div 
                      key={notif.id}
                      className={`p-3.5 rounded-2xl border transition ${
                        notif.is_read 
                          ? 'bg-slate-50 border-slate-200/80 text-slate-600' 
                          : 'bg-blue-50/50 border-blue-200 text-slate-900 shadow-xs'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-bold text-xs ${notif.type === 'ALERT' ? 'text-rose-600' : notif.type === 'WARNING' ? 'text-amber-600' : 'text-blue-600'}`}>
                          {notif.title}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {formatNotificationTime(notif.created_at)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-snug">{notif.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 text-center text-[11px] text-slate-400 font-medium">
              Real-Time WebSocket Feed Active • WeIntern
            </div>
          </div>
        </div>
      )}

      {/* Mobile Slide-Over Navigation Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-6 space-y-4 shadow-2xl animate-fadeIn max-h-[85vh] overflow-y-auto">
          
          {/* Primary Quick Links */}
          <div className="space-y-1">
            <div className="px-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Quick Access</div>
            {primaryNav.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all select-none ${
                    item.highlight
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold shadow-md shadow-blue-500/20'
                      : isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200/80 font-extrabold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${item.highlight ? 'text-white stroke-[2.5]' : isActive ? 'text-blue-600' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Admin Management Tools */}
          <div className="space-y-1 pt-2 border-t border-slate-100">
            <div className="px-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Management & Settings</div>
            {adminNav.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200/80 font-extrabold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 text-slate-500" />
                    <span>{item.label}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </Link>
              );
            })}
          </div>

        </div>
      )}
    </nav>
  );
}
