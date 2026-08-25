import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import CameraFeed from '../components/CameraFeed';
import apiClient from '../api/client';
import { 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  ShieldCheck, 
  Sparkles, 
  Clock, 
  UserCheck,
  ArrowLeft,
  Scan,
  Zap,
  Activity
} from 'lucide-react';

export default function Kiosk() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [scanState, setScanState] = useState('STANDBY'); // STANDBY, SUCCESS, ALREADY_MARKED, UNKNOWN, SPOOF
  const [resultData, setResultData] = useState(null);
  const [lastApiStatus, setLastApiStatus] = useState('Camera Ready');
  const isProcessingRef = useRef(false);
  const resetTimerRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleFrameCapture = async (base64Frame) => {
    if (isProcessingRef.current || scanState === 'SUCCESS' || scanState === 'ALREADY_MARKED') {
      return;
    }

    isProcessingRef.current = true;
    try {
      setLastApiStatus('Analyzing face geometry...');
      const response = await apiClient.post('/attendance/verify', {
        image_base64: base64Frame,
        device_id: 'KIOSK-MAIN-ENTRANCE'
      });

      const res = response.data;
      setLastApiStatus(res.message || res.status_code);

      if (res.status_code === 'SUCCESS') {
        setResultData(res);
        setScanState('SUCCESS');
        triggerAutoReset(4000);
      } else if (res.status_code === 'ALREADY_MARKED') {
        setResultData(res);
        setScanState('ALREADY_MARKED');
        triggerAutoReset(3500);
      } else if (res.status_code === 'UNKNOWN_FACE' || res.status_code === 'NO_REGISTERED_USERS') {
        setResultData(res);
        setScanState('UNKNOWN');
        triggerAutoReset(3000);
      } else if (res.status_code === 'SPOOF_DETECTED') {
        setResultData(res);
        setScanState('SPOOF');
        triggerAutoReset(3000);
      } else {
        if (scanState !== 'SUCCESS' && scanState !== 'ALREADY_MARKED' && scanState !== 'UNKNOWN') {
          setScanState('STANDBY');
        }
      }
    } catch (err) {
      console.error('Kiosk verification error:', err);
      setLastApiStatus('API Server Offline');
    } finally {
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 500);
    }
  };

  const triggerAutoReset = (delayMs = 3500) => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => {
      setScanState('STANDBY');
      setResultData(null);
      setLastApiStatus('Camera Ready');
    }, delayMs);
  };

  return (
    <div className="min-h-screen bg-[#060913] flex flex-col justify-between p-4 sm:p-6 lg:p-10 relative overflow-hidden">
      
      {/* Background Ambient Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Banner */}
      <div className="max-w-6xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between glass-panel rounded-2xl p-4 sm:p-5 border border-slate-800/80 shadow-xl gap-4 z-10">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <div className="flex items-center gap-3">
            <div className="bg-white/95 px-3 py-1.5 rounded-xl border border-white/40 shadow-lg shadow-sky-500/10 flex items-center justify-center">
              <img 
                src="/weintern-logo.png" 
                alt="WeIntern Logo" 
                className="h-6 sm:h-7 w-auto object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-amber-400 font-extrabold text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/30 uppercase tracking-wider">
                  Entrance Kiosk
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 font-medium">Real-Time Biometric Attendance & Access Engine</p>
            </div>
          </div>

          <Link
            to="/dashboard"
            className="sm:hidden text-xs text-amber-400 font-semibold px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
          </Link>
        </div>

        {/* Real-time Clock Card */}
        <div className="flex items-center gap-3 sm:gap-4 bg-slate-950/70 px-4 py-2 rounded-2xl border border-slate-800/80 w-full sm:w-auto justify-between sm:justify-end">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <div className="text-right">
            <div className="text-lg sm:text-2xl font-black text-white font-mono tracking-widest leading-none">
              {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-400 font-medium tracking-wide mt-0.5">
              {currentTime.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Kiosk Visual Workspace */}
      <div className="max-w-6xl w-full mx-auto my-auto grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-10 items-center py-6 sm:py-8 z-10">
        
        {/* Camera Column */}
        <div className="lg:col-span-7 space-y-3 sm:space-y-4">
          <div className="relative rounded-3xl overflow-hidden shadow-[0_0_60px_rgba(245,158,11,0.12)] border border-slate-800/90">
            <CameraFeed 
              onFrameCapture={handleFrameCapture} 
              isScanning={scanState === 'STANDBY'} 
              captureIntervalMs={1000}
            />
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-3 px-2">
            <div className="flex items-center gap-2 bg-slate-950/80 px-3.5 py-2 rounded-2xl border border-slate-800 shadow-inner">
              <Activity className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>Diagnostic: <strong className="text-white">{lastApiStatus}</strong></span>
            </div>
            
            <button
              type="button"
              onClick={() => {
                const canvas = document.querySelector('canvas');
                const video = document.querySelector('video');
                if (video && canvas) {
                  canvas.width = video.videoWidth || 640;
                  canvas.height = video.videoHeight || 480;
                  const ctx = canvas.getContext('2d');
                  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                  const frame = canvas.toDataURL('image/jpeg', 0.85);
                  handleFrameCapture(frame);
                }
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 font-bold text-xs rounded-xl border border-slate-700 shadow-md transition hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <Scan className="w-3.5 h-3.5" /> Scan Face Now
            </button>
          </div>
        </div>

        {/* Dynamic State Screen Display */}
        <div className="lg:col-span-5">
          <div className="glass-panel border border-slate-800/90 rounded-3xl p-6 sm:p-10 shadow-2xl min-h-[320px] sm:min-h-[400px] flex flex-col justify-center text-center transition-all duration-300 relative overflow-hidden">
            
            {/* STANDBY STATE */}
            {scanState === 'STANDBY' && (
              <div className="space-y-4 sm:space-y-5 animate-spring-in">
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-amber-500/20 to-amber-400/5 animate-subtle-pulse blur-sm" />
                  <div className="relative w-full h-full rounded-3xl bg-slate-950/80 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
                    <UserCheck className="w-10 h-10 sm:w-12 sm:h-12" />
                  </div>
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                    WEINTERN ATTENDANCE
                  </h2>
                  <p className="text-amber-400 text-xs sm:text-sm font-semibold mt-1">
                    Please look directly at the camera
                  </p>
                </div>
                <div className="pt-4 border-t border-slate-800/80 text-[11px] sm:text-xs text-slate-400 max-w-xs mx-auto">
                  Position your face inside the golden guideline box for instant recognition.
                </div>
              </div>
            )}

            {/* SUCCESS RECOGNITION */}
            {scanState === 'SUCCESS' && resultData && (
              <div className="space-y-4 sm:space-y-5 animate-spring-in">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-emerald-500/20 to-emerald-400/10 border-2 border-emerald-400 flex items-center justify-center mx-auto text-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.4)]">
                  <CheckCircle2 className="w-12 h-12 sm:w-14 sm:h-14" />
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white">
                    Welcome, {resultData.user?.name}!
                  </h2>
                  <p className="text-slate-300 text-xs sm:text-sm font-mono mt-1">
                    ID: <strong className="text-amber-400">{resultData.user?.employee_id}</strong> • {resultData.user?.department}
                  </p>
                </div>

                <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs sm:text-sm font-extrabold mx-auto shadow-md">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  🟢 Attendance Marked ({resultData.status || 'Present'})
                </div>

                <div className="text-xs text-slate-400 flex items-center justify-center gap-2 pt-1 font-mono">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>Entry: <strong className="text-white">{resultData.entry_time}</strong> (Match: {resultData.confidence}%)</span>
                </div>
              </div>
            )}

            {/* ALREADY MARKED STATE */}
            {scanState === 'ALREADY_MARKED' && resultData && (
              <div className="space-y-4 sm:space-y-5 animate-spring-in">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-blue-500/20 to-cyan-400/10 border-2 border-cyan-400 flex items-center justify-center mx-auto text-cyan-400 shadow-[0_0_40px_rgba(6,182,212,0.4)]">
                  <Clock className="w-12 h-12 sm:w-14 sm:h-14" />
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white">
                    Welcome back, {resultData.user?.name}!
                  </h2>
                  <p className="text-slate-300 text-xs sm:text-sm font-mono mt-1">
                    ID: <strong className="text-amber-400">{resultData.user?.employee_id}</strong>
                  </p>
                </div>

                <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-cyan-500/15 border border-cyan-500/40 text-cyan-400 text-xs sm:text-sm font-extrabold mx-auto shadow-md">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  🟢 Attendance Already Marked
                </div>

                <p className="text-xs text-slate-400 pt-1">
                  First Recorded Entry Today: <strong className="text-white font-mono">{resultData.entry_time}</strong>
                </p>
              </div>
            )}

            {/* UNKNOWN PERSON */}
            {scanState === 'UNKNOWN' && (
              <div className="space-y-4 sm:space-y-5 animate-gentle-shake">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-rose-500/20 to-red-400/10 border-2 border-rose-500 flex items-center justify-center mx-auto text-rose-400 shadow-[0_0_40px_rgba(244,63,94,0.4)]">
                  <HelpCircle className="w-12 h-12 sm:w-14 sm:h-14" />
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-rose-400">
                    Face Not Recognized
                  </h2>
                  <p className="text-slate-300 text-xs sm:text-sm mt-1.5">
                    Please contact the administrator to enroll.
                  </p>
                </div>
                <div className="pt-2 text-[11px] text-slate-400">
                  Unrecognized attempt logged for security review.
                </div>
              </div>
            )}

            {/* SPOOF DETECTED */}
            {scanState === 'SPOOF' && (
              <div className="space-y-4 sm:space-y-5 animate-shake">
                <div className="w-20 h-20 rounded-3xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center mx-auto text-amber-400">
                  <AlertCircle className="w-12 h-12" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-amber-400">
                    Liveness Check Failed
                  </h2>
                  <p className="text-slate-300 text-xs sm:text-sm mt-1">
                    Please look at the camera in person (Anti-spoof triggered).
                  </p>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>

      {/* Kiosk Footer */}
      <div className="text-center text-xs text-slate-400 border-t border-slate-800/80 pt-4 z-10">
        WeIntern AI Workforce Platform • Production Build 1.0
      </div>

    </div>
  );
}
