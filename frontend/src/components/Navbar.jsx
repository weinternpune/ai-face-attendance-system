import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import weinternLogo from '../assets/weintern-logo.png';
import { 
  ScanFace, 
  LayoutDashboard, 
  UserPlus, 
  Users, 
  FileSpreadsheet, 
  ShieldAlert, 
  LogOut, 
  Menu, 
  X 
} from 'lucide-react';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const user = JSON.parse(localStorage.getItem('weintern_user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('weintern_token');
    localStorage.removeItem('weintern_user');
    navigate('/login');
  };

  const navItems = [
    { label: 'Live Kiosk', path: '/kiosk', icon: ScanFace, highlight: true },
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Enroll Face', path: '/enroll', icon: UserPlus },
    { label: 'Employees', path: '/employees', icon: Users },
    { label: 'Reports', path: '/reports', icon: FileSpreadsheet },
    { label: 'Audit Logs', path: '/audit', icon: ShieldAlert },
  ];

  return (
    <nav className="glass-panel sticky top-0 z-50 border-b border-slate-800/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-2">
          
          {/* Official WeIntern Brand Logo */}
          <Link to="/dashboard" className="flex items-center space-x-2 sm:space-x-3 group shrink-0 min-w-0">
            <div className="relative flex items-center shrink-0">
              <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/20 to-sky-500/20 rounded-2xl blur-md opacity-40 group-hover:opacity-80 transition duration-300"></div>
              <div className="relative bg-white/95 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl border border-white/40 shadow-md flex items-center justify-center transition group-hover:scale-105">
                <img 
                  src={weinternLogo} 
                  alt="WeIntern Logo" 
                  className="h-5 sm:h-7 w-auto object-contain"
                />
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider sm:tracking-widest px-1.5 sm:px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-amber-400/10 text-amber-400 border border-amber-400/30 shadow-inner truncate">
                  AI Face Vision
                </span>
              </div>
              <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium tracking-wide truncate hidden min-[400px]:block">
                Attendance System
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden xl:flex items-center space-x-1 bg-slate-950/60 p-1.5 rounded-2xl border border-slate-800/60">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                    item.highlight
                      ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-bold shadow-md shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02]'
                      : isActive
                      ? 'bg-slate-800 text-amber-400 border border-amber-400/30 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-850'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${item.highlight ? 'text-slate-950 stroke-[2.5]' : isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* User Controls & Mobile Toggle */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            {user.name ? (
              <div className="flex items-center space-x-2 sm:space-x-3 pl-1 sm:pl-3 sm:border-l border-slate-800">
                <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-gradient-to-tr from-slate-800 to-slate-700 border border-slate-700 flex items-center justify-center text-[10px] sm:text-xs font-bold text-amber-400 shadow-inner">
                  {user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </div>
                <div className="text-left hidden md:block">
                  <div className="text-xs font-bold text-white leading-none truncate max-w-[120px]">{user.name}</div>
                  <div className="text-[10px] text-amber-400 font-semibold tracking-wide mt-0.5">{user.role || 'Admin'}</div>
                </div>
                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 border border-transparent hover:border-rose-500/20 transition"
                >
                  <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="text-[11px] sm:text-xs font-bold text-amber-400 hover:text-slate-950 hover:bg-amber-400 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl border border-amber-400/30 transition shadow-sm"
              >
                Login
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-2 rounded-xl text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:bg-slate-800 focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-slate-800/90 bg-slate-950/95 backdrop-blur-2xl px-4 pt-3 pb-6 space-y-2 animate-fade-slide-up shadow-2xl">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition ${
                  item.highlight
                    ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-bold shadow-lg shadow-amber-500/20'
                    : isActive
                    ? 'bg-slate-800 text-amber-400 border border-amber-400/30'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
