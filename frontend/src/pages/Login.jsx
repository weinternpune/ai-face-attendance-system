import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import weinternLogo from '../assets/weintern-logo.png';

import {
  Sparkles,
  Lock,
  Mail,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('admin@weintern.com');
  const [password, setPassword] = useState('WeInternAdminPass2026');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // ============================================================
  // NORMAL LOGIN
  // ============================================================
  const handleLogin = async (e) => {
    e.preventDefault();

    setError(null);
    setLoading(true);

    try {
      const res = await apiClient.post('/auth/login', {
        email,
        password,
      });

      localStorage.setItem('weintern_token', res.data.access_token);
      localStorage.setItem(
        'weintern_user',
        JSON.stringify(res.data.user)
      );

      // Role-Based Smart Navigation
      const role = res.data.user?.role;

      if (role === 'Employee' || role === 'Intern') {
        navigate('/portal');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Backend API not reachable (404). Please ensure VITE_API_URL is configured in Vercel environment variables.');
      } else if (!err.response) {
        setError('Network Error: Cannot connect to Backend server. Please verify your internet connection or backend status.');
      } else {
        setError(
          err.response?.data?.detail ||
            'Invalid email or password'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // 1-CLICK LOGIN
  // ============================================================
  const quickLogin = async (role) => {
    const credentials = {
      admin: {
        email: 'admin@weintern.com',
        password: 'WeInternAdminPass2026',
      },

      hr: {
        email: 'hr@weintern.com',
        password: 'weintern_hr_demo',
      },

      employee: {
        email: 'employee@weintern.com',
        password: 'weintern_staff_demo',
      },
    };

    const selectedCredentials = credentials[role];

    if (!selectedCredentials) {
      setError('Invalid test login');
      return;
    }

    setError(null);
    setLoading(true);

    // Show selected credentials in the form as well
    setEmail(selectedCredentials.email);
    setPassword(selectedCredentials.password);

    try {
      const res = await apiClient.post(
        '/auth/login',
        selectedCredentials
      );

      localStorage.setItem(
        'weintern_token',
        res.data.access_token
      );

      localStorage.setItem(
        'weintern_user',
        JSON.stringify(res.data.user)
      );

      // Role-Based Smart Navigation
      const userRole = res.data.user?.role;

      if (
        userRole === 'Employee' ||
        userRole === 'Intern'
      ) {
        navigate('/portal');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Backend API not reachable (404). Please ensure VITE_API_URL is configured in Vercel environment variables.');
      } else if (!err.response) {
        setError('Network Error: Cannot connect to Backend server. Please verify your internet connection or backend status.');
      } else {
        setError(
          err.response?.data?.detail ||
            'Test login failed. Please check the backend.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">

      {/* Background Ambient Glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Light Card for Transparent WeIntern Logo */}
      <div className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-10 shadow-2xl space-y-6 border border-slate-200 relative z-10 animate-scale-up">

        {/* Brand Header */}
        <div className="text-center space-y-3">

          <div className="relative inline-block">
            <img
              src={weinternLogo}
              alt="WeIntern Logo"
              className="h-10 sm:h-12 w-auto object-contain mx-auto transition duration-200 hover:scale-105"
            />
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              AI Vision Portal
            </h1>

            <p className="text-xs text-slate-500 font-medium mt-1">
              Biometric Attendance & Administrative Console
            </p>
          </div>

        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-rose-700 text-xs">

            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />

            <span>{error}</span>

          </div>
        )}

        {/* Login Form */}
        <form
          onSubmit={handleLogin}
          className="space-y-4"
        >

          {/* Email */}
          <div>

            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Email Address
            </label>

            <div className="relative">

              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />

              <input
                type="email"
                required
                placeholder="admin@weintern.com or employee email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-900 focus:border-blue-500 focus:outline-none transition shadow-inner"
              />

            </div>

          </div>

          {/* Password */}
          <div>

            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Password
            </label>

            <div className="relative flex items-center">

              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />

              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-900 focus:border-blue-500 focus:outline-none transition shadow-inner"
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(!showPassword)
                }
                className="absolute right-3 p-1.5 text-slate-400 hover:text-blue-600 transition cursor-pointer rounded-lg hover:bg-slate-100"
                title={
                  showPassword
                    ? 'Hide password'
                    : 'Show password'
                }
              >

                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}

              </button>

            </div>

          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3.5 text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2 mt-2 cursor-pointer shadow-lg shadow-amber-500/25 disabled:opacity-60 disabled:cursor-not-allowed"
          >

            {loading
              ? 'Authenticating...'
              : 'Sign In to Portal'}

            <ArrowRight className="w-4 h-4" />

          </button>

        </form>

        {/* Quick Demo Credentials Helper */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">

          <span className="font-semibold text-slate-600">
            1-Click Test Logins:
          </span>

          <div className="flex flex-wrap items-center gap-1.5">

            {/* ADMIN */}
            <button
              type="button"
              onClick={() => quickLogin('admin')}
              disabled={loading}
              className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold border border-blue-200 text-[10px] transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '...' : 'Admin'}
            </button>

            {/* HR */}
            <button
              type="button"
              onClick={() => quickLogin('hr')}
              disabled={loading}
              className="px-2 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold border border-purple-200 text-[10px] transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '...' : 'HR'}
            </button>

            {/* EMPLOYEE */}
            <button
              type="button"
              onClick={() => quickLogin('employee')}
              disabled={loading}
              className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold border border-amber-200 text-[10px] transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '...' : 'Employee'}
            </button>

          </div>

        </div>

        {/* Footer */}
        <div className="text-center pt-2 border-t border-slate-100 text-[11px] text-slate-400">

          WeIntern Technologies AI Biometrics • DPDP Act Compliant

        </div>

      </div>

    </div>
  );
}
