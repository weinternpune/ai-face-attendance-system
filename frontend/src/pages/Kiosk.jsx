import React, { useState, useEffect, useRef } from 'react';
import CameraFeed from '../components/CameraFeed';
import apiClient from '../api/client';
import weinternLogo from '../assets/weintern-logo.png';
import { 
  CheckCircle2, 
  AlertTriangle, 
  UserCheck, 
  HelpCircle, 
  ShieldAlert, 
  Clock, 
  Sparkles,
  Volume2,
  VolumeX,
  Languages,
  Activity,
  ArrowLeft,
  Scan
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Kiosk() {
  const [scanState, setScanState] = useState('STANDBY'); // STANDBY, SUCCESS, ALREADY_MARKED, UNKNOWN, SPOOF, ERROR
  const [resultData, setResultData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [voiceLang, setVoiceLang] = useState('en-US'); // 'en-US' or 'hi-IN'
  const [isMuted, setIsMuted] = useState(false);
  const [lastApiStatus, setLastApiStatus] = useState('Camera Ready');
  
  const resetTimerRef = useRef(null);
  const audioContextRef = useRef(null);

  // Real-time ticking clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Unlock AudioContext and Speech on interaction
  const unlockAudio = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioCtx();
        }
        if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume();
        }
      }
      if ('speechSynthesis' in window && window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch (e) {
      console.warn('Audio unlock error:', e);
    }
  };

  // Web Audio Synthesized Chime (100% Offline & Reliable)
  const playChime = (type = 'success', force = false) => {
    if (isMuted && !force) return;
    try {
      unlockAudio();
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.15); // E5
        osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.3); // G5
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.6);
      } else if (type === 'duplicate') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
        osc.frequency.setValueAtTime(440, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime); // A3
        osc.frequency.exponentialRampToValueAtTime(164.81, ctx.currentTime + 0.3); // E3
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
      }
    } catch (e) {
      console.warn('Audio chime error:', e);
    }
  };

  // Text-To-Speech Voice Feedback (English & Hindi)
  const speakFeedback = (textEn, textHi, force = false) => {
    if ((isMuted && !force) || !('speechSynthesis' in window)) return;
    try {
      unlockAudio();
      window.speechSynthesis.cancel();
      const textToSpeak = voiceLang === 'hi-IN' ? (textHi || textEn) : textEn;
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.lang = voiceLang;

      // Select matching voice
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        const selectedVoice = voices.find(v => v.lang && v.lang.toLowerCase().includes(voiceLang.substring(0, 2).toLowerCase()));
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
      }
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  };

  // Toggle Voice Lang
  const toggleLanguage = () => {
    unlockAudio();
    const nextLang = voiceLang === 'en-US' ? 'hi-IN' : 'en-US';
    setVoiceLang(nextLang);
    setTimeout(() => {
      speakFeedback(
        'English voice activated',
        'Hindi voice activated',
        true
      );
    }, 50);
  };

  // Toggle Sound & Unmute with instant audio feedback
  const toggleMute = () => {
    unlockAudio();
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    if (!nextMuted) {
      // User is UNMUTING: play immediate confirmation chime & speak
      playChime('success', true);
      setTimeout(() => {
        speakFeedback(
          'Sound and voice enabled',
          'Awaaz chalu ho gayi hai',
          true
        );
      }, 100);
    } else {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    }
  };

  const scheduleReset = (delay = 4000) => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => {
      setScanState('STANDBY');
      setResultData(null);
      setIsProcessing(false);
    }, delay);
  };

  const handleFrameCapture = async (base64Image) => {
    if (isProcessing || scanState !== 'STANDBY') return;
    setIsProcessing(true);
    setLastApiStatus('Analyzing facial features...');

    try {
      const response = await apiClient.post('/attendance/verify', {
        image_base64: base64Image,
        device_id: 'KIOSK-ENTRANCE-01'
      });

      const res = response.data;
      setResultData(res);
      setLastApiStatus(res.message || res.status_code);

      switch (res.status_code) {
        case 'MARKED_PRESENT':
        case 'MARKED_LATE':
          setScanState('SUCCESS');
          playChime('success');
          speakFeedback(
            `Welcome ${res.user?.name || 'Employee'}. Attendance recorded.`,
            `Swagatam ${res.user?.name || 'Karmchari'}. Aapki attendance darj ho gayi hai.`
          );
          scheduleReset(4000);
          break;

        case 'ALREADY_MARKED':
          setScanState('ALREADY_MARKED');
          playChime('duplicate');
          speakFeedback(
            `Attendance already marked for ${res.user?.name || 'you'} at ${res.entry_time || 'earlier today'}.`,
            `Aapki attendance pehle se darj hai ${res.user?.name || ''}.`
          );
          scheduleReset(3500);
          break;

        case 'UNKNOWN_FACE':
          setScanState('UNKNOWN');
          playChime('error');
          speakFeedback(
            'Face not recognized. Please contact admin to enroll.',
            'Chehra pehchana nahi gaya. Kripya admin se sampark karein.'
          );
          scheduleReset(3500);
          break;

        case 'SPOOF_DETECTED':
          setScanState('SPOOF');
          playChime('error');
          speakFeedback(
            'Security Alert: Liveness check failed.',
            'Suraksha Chetavni: Jeevanta jaanch asaphal rahi.'
          );
          scheduleReset(4000);
          break;

        case 'NO_FACE':
        case 'EMBEDDING_FAILED':
        default:
          setIsProcessing(false);
          break;
      }
    } catch (err) {
      console.error('Kiosk verification error:', err);
      setLastApiStatus('API connection error');
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060913] flex flex-col justify-between p-3 sm:p-6 lg:p-8 relative overflow-hidden font-sans">
      
      {/* Background Ambient Glows */}
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Banner - Clean Light Theme for Transparent WeIntern Logo */}
      <div className="max-w-6xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between bg-white/95 backdrop-blur-2xl rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm gap-4 z-10">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <div className="flex items-center gap-3.5">
            <img 
              src={weinternLogo} 
              alt="WeIntern Logo" 
              className="h-7 sm:h-8 w-auto object-contain transition duration-200 hover:scale-105"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-blue-700 font-black text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 uppercase tracking-wider">
                  Entrance Kiosk
                </span>
                <span className="text-emerald-700 font-mono text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 font-bold">
                  v2.0 Live
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium">Real-Time Biometric Attendance & Access Engine</p>
            </div>
          </div>

          <Link
            to="/dashboard"
            className="sm:hidden text-xs text-blue-700 font-bold px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
          </Link>
        </div>

        {/* Audio Controls & Clock */}
        <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
          
          {/* Sound & Voice Toggle Controls */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <button
              onClick={toggleMute}
              title={isMuted ? "Unmute Voice & Sound" : "Mute Sound"}
              className={`p-2 rounded-xl transition flex items-center gap-1 text-xs font-bold cursor-pointer ${
                isMuted 
                  ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              <span className="hidden md:inline">{isMuted ? 'Muted' : 'Voice ON'}</span>
            </button>

            <button
              onClick={toggleLanguage}
              title="Switch Voice Language"
              className="p-2 rounded-xl bg-white hover:bg-slate-50 text-blue-700 border border-slate-200 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <Languages className="w-4 h-4" />
              <span>{voiceLang === 'en-US' ? 'EN' : 'HI'}</span>
            </button>
          </div>

          {/* Real-time Clock Card */}
          <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-200 shadow-xs">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <div className="text-right">
              <div className="text-lg sm:text-2xl font-black text-slate-900 font-mono tracking-widest leading-none">
                {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
              </div>
              <div className="text-[10px] sm:text-[11px] text-slate-500 font-medium tracking-wide mt-0.5">
                {currentTime.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Kiosk Visual Workspace */}
      <div className="max-w-6xl w-full mx-auto my-auto grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-10 items-center py-6 sm:py-8 z-10">
        
        {/* Camera Column */}
        <div className="lg:col-span-7 space-y-3 sm:space-y-4">
          <div className="relative rounded-3xl overflow-hidden shadow-[0_0_60px_rgba(245,158,11,0.12)]">
            <CameraFeed 
              onFrameCapture={handleFrameCapture} 
              isScanning={scanState === 'STANDBY'} 
              captureIntervalMs={1000}
              scanState={scanState}
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

        {/* Dynamic State Screen Display (PRD 3-Color Engine) */}
        <div className="lg:col-span-5">
          <div className={`glass-panel rounded-3xl p-6 sm:p-10 shadow-2xl min-h-[320px] sm:min-h-[400px] flex flex-col justify-center text-center transition-all duration-300 relative overflow-hidden ${
            scanState === 'SUCCESS'
              ? 'border-2 border-emerald-400 bg-emerald-500/[0.07] shadow-[0_0_50px_rgba(16,185,129,0.35)]'
              : scanState === 'ALREADY_MARKED'
              ? 'border-2 border-blue-400 bg-blue-500/[0.07] shadow-[0_0_50px_rgba(59,130,246,0.35)]'
              : (scanState === 'UNKNOWN' || scanState === 'SPOOF')
              ? 'border-2 border-rose-500 bg-rose-500/[0.07] shadow-[0_0_50px_rgba(244,63,94,0.35)]'
              : 'border border-slate-800/90'
          }`}>
            
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

            {/* 🟢 GREEN SUCCESS STATE (PRD Specification 1) */}
            {scanState === 'SUCCESS' && resultData && (
              <div className="space-y-4 animate-spring-in">
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 rounded-3xl flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(16,185,129,0.45)]">
                  <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12 stroke-[2.5]" />
                </div>
                
                <div>
                  <span className="px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/25 text-emerald-300 border border-emerald-400/60 shadow-sm inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    {resultData.status === 'Present' ? '✓ Checked In (On Time)' : '⚠️ Checked In (Late Arrival)'}
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-white mt-2">
                    {resultData.user?.name}
                  </h2>
                  <p className="text-xs text-emerald-300/90 font-mono mt-0.5 font-bold">
                    {resultData.user?.employee_id} • {resultData.user?.department}
                  </p>
                </div>

                <div className="bg-slate-950/90 border border-emerald-500/30 rounded-2xl p-4 max-w-xs mx-auto space-y-1.5 text-xs shadow-inner">
                  <div className="flex justify-between text-slate-300">
                    <span>Punch Time:</span>
                    <strong className="text-emerald-400 font-mono font-bold text-sm">{resultData.entry_time}</strong>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Match Confidence:</span>
                    <strong className="text-emerald-400 font-mono font-bold">{resultData.confidence}%</strong>
                  </div>
                </div>
              </div>
            )}

            {/* 🔵 BLUE ALREADY MARKED DUPLICATE STATE (PRD Specification 2) */}
            {scanState === 'ALREADY_MARKED' && resultData && (
              <div className="space-y-4 animate-spring-in">
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-blue-500/20 border-2 border-blue-400 text-blue-400 rounded-3xl flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(59,130,246,0.45)]">
                  <Clock className="w-10 h-10 sm:w-12 sm:h-12" />
                </div>

                <div>
                  <span className="px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-blue-500/25 text-blue-300 border border-blue-400/60 shadow-sm inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                    Already Marked Today
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-white mt-2">
                    {resultData.user?.name}
                  </h2>
                  <p className="text-xs text-blue-300/90 font-mono mt-0.5 font-bold">
                    {resultData.user?.employee_id} • {resultData.user?.department}
                  </p>
                </div>

                <div className="bg-slate-950/90 border border-blue-500/30 rounded-2xl p-4 max-w-xs mx-auto text-xs text-slate-300 space-y-1">
                  <p>Attendance already recorded for today at <strong className="text-blue-400 font-mono text-sm font-bold">{resultData.entry_time}</strong>.</p>
                  <p className="text-[11px] text-slate-400">Duplicate entry avoided as per PRD Section 10.</p>
                </div>
              </div>
            )}

            {/* 🔴 RED UNKNOWN FACE STATE (PRD Specification 3) */}
            {scanState === 'UNKNOWN' && (
              <div className="space-y-4 animate-spring-in">
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-rose-500/20 border-2 border-rose-400 text-rose-400 rounded-3xl flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(244,63,94,0.45)]">
                  <HelpCircle className="w-10 h-10 sm:w-12 sm:h-12" />
                </div>

                <div>
                  <span className="px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-500/25 text-rose-300 border border-rose-400/60 shadow-sm inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
                    Face Not Recognized
                  </span>
                  <h2 className="text-2xl font-black text-rose-400 mt-2">Access Unverified</h2>
                </div>

                <div className="bg-slate-950/90 border border-rose-500/30 rounded-2xl p-4 max-w-xs mx-auto text-xs text-rose-200">
                  <p>No matching employee 128-D vector template found. Please contact the Admin to complete facial enrollment.</p>
                </div>
              </div>
            )}

            {/* 🔴 RED SPOOF DETECTED STATE (PRD Security Alert) */}
            {scanState === 'SPOOF' && (
              <div className="space-y-4 animate-spring-in">
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-rose-500/20 border-2 border-rose-400 text-rose-400 rounded-3xl flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(244,63,94,0.45)]">
                  <ShieldAlert className="w-10 h-10 sm:w-12 sm:h-12" />
                </div>

                <div>
                  <span className="px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-500/25 text-rose-300 border border-rose-400/60 shadow-sm">
                    Anti-Spoofing Alert
                  </span>
                  <h2 className="text-2xl font-black text-rose-400 mt-2">Presentation Attack Blocked</h2>
                </div>

                <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 max-w-xs mx-auto text-xs text-rose-300">
                  <p>2D Screen or printed photo presentation detected. Security event logged to immutable audit trail.</p>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>

      {/* Footer Branding Bar */}
      <div className="max-w-6xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between text-slate-500 text-[11px] sm:text-xs pt-4 border-t border-slate-800/80 gap-2 z-10 font-medium">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Local OpenCV Vision AI Active • 128-D Vector Match Engine</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Voice: <strong className="text-slate-300">{voiceLang === 'en-US' ? 'English (US)' : 'Hindi (IN)'}</strong></span>
          <Link to="/dashboard" className="text-amber-400 hover:text-amber-300 font-bold">
            Admin Dashboard →
          </Link>
        </div>
      </div>

    </div>
  );
}
