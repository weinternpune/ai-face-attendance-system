import React, { useState, useEffect } from 'react';
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
  ShieldCheck,
  Zap,
  ChevronRight
} from 'lucide-react';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifDrawerOpen, setNotifDrawerOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const user = JSON.parse(localStorage.getItem('weintern_user') || '{}');

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

  const navItems = [
    { label: 'Live Kiosk', path: '/kiosk', icon: ScanFace, highlight: true },
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Leaves', path: '/leaves', icon: Calendar },
    { label: 'Shifts', path: '/shifts', icon: Clock },
    { label: 'Enroll Face', path: '/enroll', icon: UserPlus },
    { label: 'Employees', path: '/employees', icon: Users },
    { label: 'Reports', path: '/reports', icon: FileSpreadsheet },
    { label: 'Audit Logs', path: '/audit', icon: ShieldAlert },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-2xl border-b border-slate-200 shadow-sm transition-all duration-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-2">
          
          {/* Brand Logo - Transparent Native on Crisp Light Header */}
          <Link to="/dashboard" className="flex items-center space-x-2.5 sm:space-x-3.5 group shrink-0 min-w-0">
            <div className="relative flex items-center shrink-0">
              <img 
                src={weinternLogo} 
                alt="WeIntern Logo" 
                className="h-7 sm:h-9 w-auto object-contain transition duration-200 group-hover:scale-105"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/90 shadow-xs truncate">
                  AI Face Vision v2.0
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-semibold tracking-wide truncate hidden min-[440px]:block mt-0.5">
                Attendance & Workforce Management
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links (Light Theme) */}
          <div className="hidden xl:flex items-center space-x-1 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                    item.highlight
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold shadow-md shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.03]'
                      : isActive
                      ? 'bg-white text-blue-700 shadow-xs border border-slate-200/90 font-extrabold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/70 font-semibold'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${item.highlight ? 'text-white stroke-[2.5]' : isActive ? 'text-blue-600' : 'text-slate-500'}`} />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Notification Bell, User Profile & Actions */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setNotifDrawerOpen(!notifDrawerOpen)}
                className="p-2 sm:p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 border border-slate-200 transition relative cursor-pointer hover:scale-105 active:scale-95"
                title="Notifications & Alerts"
              >
                <Bell className={`w-4 h-4 ${unreadCount > 0 ? 'text-amber-500 animate-bell-wobble' : 'text-slate-600'}`} />
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
                className="btn-primary text-xs px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl font-bold"
              >
                Admin Login
              </Link>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-2 rounded-lg sm:rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Notifications Drawer */}
      {notifDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-sm bg-white border-l border-slate-200 h-full p-5 flex flex-col justify-between shadow-2xl animate-slide-in">
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

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-6 space-y-1 shadow-xl animate-fadeIn">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition ${
                  item.highlight
                    ? 'bg-blue-600 text-white font-extrabold shadow-md shadow-blue-500/20'
                    : isActive
                    ? 'bg-blue-50 text-blue-700 border border-blue-200/80 font-extrabold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
