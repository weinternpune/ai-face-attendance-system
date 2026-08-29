import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../api/client';
import { 
  MapPin, 
  Camera, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  Navigation, 
  ShieldCheck, 
  Clock, 
  Building2, 
  ArrowLeft,
  Sparkles,
  UserCheck,
  Smartphone
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function MobileCheckin() {
  const [geofences, setGeofences] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [locLoading, setLocLoading] = useState(true);
  const [locError, setLocError] = useState('');
  const [nearestFence, setNearestFence] = useState(null);
  const [distanceMeters, setDistanceMeters] = useState(null);
  const [isInside, setIsInside] = useState(false);

  // Camera & Verification State
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [streamActive, setStreamActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null); // { status_code, message, user, entry_time, ... }

  // Load Active Geofences
  useEffect(() => {
    const fetchFences = async () => {
      try {
        const res = await apiClient.get('/geofence/public-active');
        setGeofences(res.data);
      } catch (err) {
        console.warn('Failed to load active geofences:', err);
      }
    };
    fetchFences();
  }, []);

  // Haversine Client Distance Calculation
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // meters
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  // Track GPS Location
  const detectLocation = () => {
    setLocLoading(true);
    setLocError('');
    if (!navigator.geolocation) {
      setLocError('Geolocation is not supported by your device browser.');
      setLocLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setUserLocation({ latitude: lat, longitude: lon, accuracy: pos.coords.accuracy });
        setLocLoading(false);

        // Evaluate distance to geofences
        if (geofences.length > 0) {
          let minD = Infinity;
          let closest = null;
          geofences.forEach((f) => {
            const d = calculateDistance(lat, lon, f.latitude, f.longitude);
            if (d < minD) {
              minD = d;
              closest = f;
            }
          });
          setNearestFence(closest);
          setDistanceMeters(minD);
          setIsInside(closest ? minD <= (closest.radius_meters || 100) : true);
        } else {
          setIsInside(true);
        }
      },
      (err) => {
        setLocError(`GPS Permission denied: ${err.message}. Please allow location access.`);
        setLocLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => {
    if (geofences.length >= 0) {
      detectLocation();
    }
  }, [geofences]);

  // Start Front Camera
  const startCamera = async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setStreamActive(true);
        };
      }
    } catch (err) {
      setCameraError('Camera access denied. Please enable camera permissions.');
      setStreamActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach((t) => t.stop());
      videoRef.current.srcObject = null;
      setStreamActive(false);
    }
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  // Capture & Submit Attendance
  const handleVerify = async () => {
    if (!userLocation) {
      alert('Waiting for GPS coordinates. Please enable location.');
      detectLocation();
      return;
    }

    if (!videoRef.current || !canvasRef.current) return;
    setVerifying(true);
    setVerifyResult(null);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const base64Image = canvas.toDataURL('image/jpeg', 0.85);

      const payload = {
        image_base64: base64Image,
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        device_id: 'MOBILE_PWA_CLIENT'
      };

      const res = await apiClient.post('/attendance/mobile-verify', payload);
      setVerifyResult(res.data);
    } catch (err) {
      setVerifyResult({
        status_code: 'ERROR',
        message: err.response?.data?.detail || 'Network error verifying attendance'
      });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 font-sans flex flex-col items-center justify-start p-3 sm:p-6 pb-20">
      
      {/* Top Bar */}
      <div className="w-full max-w-md flex items-center justify-between py-3 border-b border-slate-800/80 mb-4">
        <Link to="/dashboard" className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <div className="flex items-center gap-1.5 font-black text-sm text-white tracking-tight">
          <Smartphone className="w-4 h-4 text-amber-400" /> WeIntern Mobile Check-In
        </div>
        <span className="w-8" />
      </div>

      <div className="w-full max-w-md space-y-4">
        
        {/* GPS Geofence Radar Status Card */}
        <div className={`glass-panel p-4 sm:p-5 rounded-3xl border transition-all duration-300 shadow-xl relative overflow-hidden ${
          locLoading
            ? 'border-slate-800 bg-slate-950/60'
            : isInside
            ? 'border-emerald-500/40 bg-emerald-950/20 shadow-emerald-500/5'
            : 'border-rose-500/40 bg-rose-950/20 shadow-rose-500/5'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                locLoading
                  ? 'bg-slate-800 border-slate-700 text-slate-400'
                  : isInside
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                  : 'bg-rose-500/20 border-rose-500/40 text-rose-400'
              }`}>
                <MapPin className={`w-4 h-4 ${locLoading ? 'animate-bounce' : ''}`} />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-xs sm:text-sm">
                  {locLoading
                    ? 'Detecting GPS Satellite Coordinates...'
                    : isInside
                    ? 'Inside Office Perimeter'
                    : 'Outside Office Perimeter'}
                </h3>
                <span className="text-[10px] text-slate-400">
                  {nearestFence ? nearestFence.name : 'Office Geofence Zone'}
                </span>
              </div>
            </div>

            <button
              onClick={detectLocation}
              disabled={locLoading}
              title="Refresh GPS"
              className="p-2 bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-800 text-slate-300 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${locLoading ? 'animate-spin text-amber-400' : ''}`} />
            </button>
          </div>

          {/* GPS Distance Metrics */}
          {userLocation && distanceMeters !== null && nearestFence && (
            <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <div className="text-slate-400 text-[11px]">
                Current Distance: <span className={`font-bold ${isInside ? 'text-emerald-400' : 'text-rose-400'}`}>{distanceMeters}m</span>
              </div>
              <div className="text-[11px] text-slate-400">
                Allowed Radius: <span className="text-amber-400 font-bold">{nearestFence.radius_meters}m</span>
              </div>
            </div>
          )}

          {locError && (
            <p className="text-[11px] text-rose-400 mt-2 font-medium bg-rose-500/10 p-2 rounded-xl border border-rose-500/20">
              {locError}
            </p>
          )}
        </div>

        {/* Live Camera Viewport */}
        <div className="glass-panel p-3 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden flex flex-col items-center">
          <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-800/80">
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100"
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Target Reticle Overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="hud-corner-tl" />
              <div className="hud-corner-tr" />
              <div className="hud-corner-bl" />
              <div className="hud-corner-br" />
              <div className="laser-scan" />
              <div className={`w-44 h-56 rounded-3xl border-2 border-dashed transition-all duration-300 ${
                isInside ? 'border-amber-400/70 shadow-[0_0_25px_rgba(245,158,11,0.2)]' : 'border-slate-600/50'
              }`} />
            </div>

            {/* Verification Processing Overlay */}
            {verifying && (
              <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center space-y-2 text-amber-400 z-20 animate-fadeIn">
                <RefreshCw className="w-8 h-8 animate-spin" />
                <span className="text-xs font-bold text-white tracking-wide">
                  Matching Biometrics & Geofence...
                </span>
              </div>
            )}
          </div>

          {cameraError && (
            <p className="text-xs text-rose-400 mt-2 text-center p-2">{cameraError}</p>
          )}

          {/* Action Trigger Button */}
          <button
            onClick={handleVerify}
            disabled={verifying || locLoading || !streamActive}
            className={`w-full mt-3 py-3.5 rounded-2xl font-black text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 shadow-xl transition-all cursor-pointer ${
              !isInside
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:brightness-110 shadow-amber-500/20'
                : 'btn-primary shadow-amber-500/30'
            }`}
          >
            <Camera className="w-4 h-4" />
            {verifying ? 'Verifying...' : 'Tap to Mark Biometric Attendance'}
          </button>
        </div>

        {/* Result Feedback Modal Card */}
        {verifyResult && (
          <div className={`glass-panel p-5 rounded-3xl border animate-fadeIn shadow-2xl space-y-3 ${
            verifyResult.status_code === 'SUCCESS' || verifyResult.status_code === 'CHECKOUT_SUCCESS'
              ? 'border-emerald-500/50 bg-emerald-950/30'
              : verifyResult.status_code === 'ALREADY_MARKED'
              ? 'border-cyan-500/50 bg-cyan-950/30'
              : 'border-rose-500/50 bg-rose-950/30'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                verifyResult.status_code === 'SUCCESS' || verifyResult.status_code === 'CHECKOUT_SUCCESS'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : verifyResult.status_code === 'ALREADY_MARKED'
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'bg-rose-500/20 text-rose-400'
              }`}>
                {verifyResult.status_code === 'SUCCESS' || verifyResult.status_code === 'CHECKOUT_SUCCESS' ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : verifyResult.status_code === 'ALREADY_MARKED' ? (
                  <Clock className="w-6 h-6" />
                ) : (
                  <XCircle className="w-6 h-6" />
                )}
              </div>

              <div>
                <h4 className="font-bold text-white text-sm">
                  {verifyResult.status_code === 'SUCCESS'
                    ? 'Attendance Recorded!'
                    : verifyResult.status_code === 'CHECKOUT_SUCCESS'
                    ? 'Exit / Punch Out Recorded! (✅)'
                    : verifyResult.status_code === 'ALREADY_MARKED'
                    ? 'Already Clocked In Today'
                    : 'Verification Unsuccessful'}
                </h4>
                <p className="text-xs text-slate-300 mt-0.5">{verifyResult.message}</p>
              </div>
            </div>

            {verifyResult.user && (
              <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Employee:</span>
                  <span className="font-bold text-white">{verifyResult.user.name} ({verifyResult.user.employee_id})</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Entry Time:</span>
                  <span className="font-mono text-amber-400 font-bold">{verifyResult.entry_time}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Status Flag:</span>
                  <span className={`font-bold ${verifyResult.status === 'Late' ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {verifyResult.status}
                  </span>
                </div>
                {verifyResult.location_name && (
                  <div className="flex items-center justify-between text-slate-400 border-t border-slate-800/80 pt-1">
                    <span>Location:</span>
                    <span className="text-cyan-400 font-semibold">{verifyResult.location_name}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
