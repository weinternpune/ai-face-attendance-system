import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { Sparkles, Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('admin@weintern.com');
  const [password, setPassword] = useState('admin@weintern123');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiClient.post('/auth/login', { email, password });
      localStorage.setItem('weintern_token', res.data.access_token);
      localStorage.setItem('weintern_user', JSON.stringify(res.data.user));
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060913] flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Ambient Glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full glass-panel rounded-3xl p-8 sm:p-10 shadow-2xl space-y-6 border border-slate-800 relative z-10 animate-scale-up">
        
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="relative inline-block">
            <div className="bg-white/95 px-4 py-2 rounded-2xl border border-white/40 shadow-xl shadow-sky-500/15 inline-flex items-center justify-center">
              <img 
                src="/weintern-logo.png" 
                alt="WeIntern Logo" 
                className="h-8 sm:h-9 w-auto object-contain"
              />
            </div>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">AI Vision Portal</h1>
            <p className="text-xs text-slate-400 font-medium mt-1">Biometric Attendance & Administrative Console</p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-2.5 text-rose-400 text-xs animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Admin Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-2xl text-xs sm:text-sm text-white focus:border-amber-400 focus:outline-none transition shadow-inner"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Master Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-2xl text-xs sm:text-sm text-white focus:border-amber-400 focus:outline-none transition shadow-inner"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 hover:from-amber-400 hover:to-yellow-200 text-slate-950 font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg shadow-amber-500/30 transition hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 mt-2"
          >
            {loading ? 'Authenticating...' : 'Sign In to Console'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-2 text-center border-t border-slate-800/80">
          <p className="text-[11px] text-slate-400">
            Default credentials: <code className="text-amber-400 font-mono">admin@weintern.com</code> / <code className="text-amber-400 font-mono">admin@weintern123</code>
          </p>
        </div>

      </div>
    </div>
  );
}
