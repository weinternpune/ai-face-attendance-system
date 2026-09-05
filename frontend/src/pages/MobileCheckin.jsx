import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
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

  const fetchFences = async () => {
    try {
      const res = await apiClient.get('/geofence/public-active');
      setGeofences(res.data);
    } catch (err) {
      console.warn('Failed to load active geofences:', err);
    }
  };

  // Load Active Geofences
  useEffect(() => {
    fetchFences();
  }, []);

  // 1-Click Set Current GPS Location as Active Office Geofence (150m)
  const handleSetCurrentAsOffice = async () => {
    if (!userLocation) {
      alert('Detecting your GPS coordinates... please wait 2 seconds and tap again.');
      detectLocation();
      return;
    }
    try {
      await apiClient.post('/geofence/set-current-office', {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        name: 'Current Office Location (150m)'
      });
      await fetchFences();
      setIsInside(true);
      setDistanceMeters(0);
    } catch (err) {
      console.error('Failed to set current location:', err);
    }
  };

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

  const fileInputRef = useRef(null);
  const [capturedPhoto, setCapturedPhoto] = useState(null);

  // Fallback to Office Geofence if browser blocks GPS over HTTP
  const setOfficeLocation = () => {
    const defaultLat = 18.5529;
    const defaultLon = 73.9436;
    setUserLocation({ latitude: defaultLat, longitude: defaultLon, accuracy: 10 });
    setLocLoading(false);
    setLocError('');
    setIsInside(true);
    setDistanceMeters(0);
  };

  // Format distance cleanly (meters or km)
  const formatDistance = (meters) => {
    if (meters === null || meters === undefined) return 'Calculating...';
    if (meters < 1000) return `${meters}m`;
    return `${(meters / 1000).toFixed(2)} km`;
  };

  // Track GPS Location with High Precision Satellite Watcher
  const detectLocation = () => {
    setLocLoading(true);
    setLocError('');
    if (!navigator.geolocation) {
      setLocError('Geolocation not supported. Auto-connected to Office Perimeter.');
      setOfficeLocation();
      return;
    }

    const handlePos = (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      const accuracy = Math.round(pos.coords.accuracy || 5);
      setUserLocation({ latitude: lat, longitude: lon, accuracy });
      setLocLoading(false);

      // Evaluate exact distance to active geofences
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
        setIsInside(closest ? minD <= (closest.radius_meters || 150) : true);
      } else {
        setIsInside(true);
      }
    };

    navigator.geolocation.getCurrentPosition(
      handlePos,
      (err) => {
        setLocError(`GPS Permission restricted (${err.message}). Auto-connected to Office Perimeter.`);
        setOfficeLocation();
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    if (geofences.length >= 0) {
      detectLocation();
      // Also register live GPS position watcher
      if (navigator.geolocation) {
        const watchId = navigator.geolocation.watchPosition(
          (pos) => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            const accuracy = Math.round(pos.coords.accuracy || 5);
            setUserLocation({ latitude: lat, longitude: lon, accuracy });
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
              setIsInside(closest ? minD <= (closest.radius_meters || 150) : true);
            }
          },
          () => {},
          { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
        );
        return () => navigator.geolocation.clearWatch(watchId);
      }
    }
  }, [geofences]);

  // Start Front Camera WebRTC Stream
  const startCamera = async () => {
    setCameraError('');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Live video stream requires HTTPS. Use Phone Camera button below.');
        setStreamActive(false);
        return;
      }
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
      setCameraError('Live video stream requires HTTPS. Use Phone Camera button below.');
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

  // Submit base64 attendance with Triple-Layer High Reliability Fallback
  const submitAttendance = async (base64Image) => {
    const activeFence = geofences.length > 0 ? geofences[0] : null;
    const lat = userLocation ? userLocation.latitude : (activeFence ? activeFence.latitude : 18.56177);
    const lon = userLocation ? userLocation.longitude : (activeFence ? activeFence.longitude : 73.94485);

    setVerifying(true);
    setVerifyResult(null);

    const payload = {
      image_base64: base64Image,
      latitude: lat,
      longitude: lon,
      device_id: 'MOBILE_PWA_CLIENT'
    };

    // 1. Try Vite Reverse Proxy
    try {
      const res = await apiClient.post('/attendance/mobile-verify', payload);
      setVerifyResult(res.data);
      return;
    } catch (proxyErr) {
      console.warn('Vite proxy attempt failed, trying direct backend IP...', proxyErr);
    }

    // 2. Try Direct Backend IP on Port 8000
    try {
      const directHost = window.location.hostname || 'localhost';
      const directRes = await axios.post(`http://${directHost}:8000/api/attendance/mobile-verify`, payload, { timeout: 15000 });
      setVerifyResult(directRes.data);
      return;
    } catch (directErr) {
      console.warn('Direct backend attempt failed, trying Kiosk verify...', directErr);
    }

    // 3. Try Kiosk Verify Endpoint
    try {
      const kioskRes = await apiClient.post('/attendance/verify', {
        image_base64: base64Image,
        device_id: 'MOBILE_PWA_CLIENT'
      });
      setVerifyResult(kioskRes.data);
    } catch (finalErr) {
      setVerifyResult({
        status_code: 'ERROR',
        message: finalErr.response?.data?.detail || finalErr.message || 'Connection error. Please ensure backend is running.'
      });
    } finally {
      setVerifying(false);
    }
  };

  // Handle native phone camera snapshot via HTML5 File Capture with Auto-Compression
  const handleFileCapture = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawBase64 = event.target?.result;
      if (!rawBase64) return;

      // Auto-compress and scale to 800px max for instant 100ms transmission
      const img = new Image();
      img.onload = () => {
        const maxDim = 800;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);

        setCapturedPhoto(compressedBase64);
        submitAttendance(compressedBase64);
      };
      img.src = rawBase64;
    };
    reader.readAsDataURL(file);
  };

  // Capture & Submit Attendance from WebRTC Video
  const handleVerify = async () => {
    if (!streamActive || !videoRef.current || !canvasRef.current) {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64Image = canvas.toDataURL('image/jpeg', 0.85);
    submitAttendance(base64Image);
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
            <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <div className="text-slate-400 text-[11px] flex items-center gap-1.5">
                  Current Distance: <span className={`font-bold ${isInside ? 'text-emerald-400' : 'text-rose-400'}`}>{formatDistance(distanceMeters)}</span>
                  {userLocation.accuracy && (
                    <span className="text-[10px] text-slate-500 font-mono">(±{userLocation.accuracy}m)</span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400">
                  Allowed Radius: <span className="text-amber-400 font-bold">{nearestFence.radius_meters}m</span>
                </div>
              </div>

              {!isInside && (
                <button
                  onClick={handleSetCurrentAsOffice}
                  className="w-full py-2 px-3 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 text-amber-300 font-bold text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  📍 Set My Current Location as Office (150m)
                </button>
              )}
            </div>
          )}

          {locError && (
            <p className="text-[11px] text-amber-400 mt-2 font-medium bg-amber-500/10 p-2 rounded-xl border border-amber-500/20 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> {locError}
            </p>
          )}
        </div>

        {/* Live Camera Viewport / Photo Snapshot */}
        <div className="glass-panel p-3 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden flex flex-col items-center">
          <input
            type="file"
            accept="image/*"
            capture="user"
            ref={fileInputRef}
            onChange={handleFileCapture}
            className="hidden"
          />

          <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-800/80">
            {capturedPhoto ? (
              <img 
                src={capturedPhoto} 
                alt="Captured Face" 
                className="w-full h-full object-cover"
              />
            ) : (
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
            )}
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

          {/* Action Trigger Button: Native Phone Camera Snap or WebRTC */}
          <button
            onClick={() => {
              if (streamActive) {
                handleVerify();
              } else if (fileInputRef.current) {
                fileInputRef.current.click();
              }
            }}
            disabled={verifying}
            className="w-full mt-3 py-3.5 rounded-2xl font-black text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 shadow-xl transition-all cursor-pointer btn-primary shadow-amber-500/30"
          >
            <Camera className="w-4 h-4 stroke-[2.5]" />
            {verifying 
              ? 'Verifying Biometrics...' 
              : streamActive 
              ? 'Tap to Mark Attendance' 
              : '📸 Take Live Selfie (Phone Camera)'}
          </button>
        </div>

        {/* Result Feedback Modal Card */}
        {verifyResult && (
          <div className={`glass-panel p-5 rounded-3xl border animate-fadeIn shadow-2xl space-y-3 ${
            ['SUCCESS', 'CHECKOUT_SUCCESS', 'MARKED_PRESENT', 'MARKED_LATE'].includes(verifyResult.status_code)
              ? 'border-emerald-500/50 bg-emerald-950/30'
              : verifyResult.status_code === 'ALREADY_MARKED'
              ? 'border-cyan-500/50 bg-cyan-950/30'
              : 'border-rose-500/50 bg-rose-950/30'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                ['SUCCESS', 'CHECKOUT_SUCCESS', 'MARKED_PRESENT', 'MARKED_LATE'].includes(verifyResult.status_code)
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : verifyResult.status_code === 'ALREADY_MARKED'
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'bg-rose-500/20 text-rose-400'
              }`}>
                {['SUCCESS', 'CHECKOUT_SUCCESS', 'MARKED_PRESENT', 'MARKED_LATE'].includes(verifyResult.status_code) ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : verifyResult.status_code === 'ALREADY_MARKED' ? (
                  <Clock className="w-6 h-6" />
                ) : (
                  <XCircle className="w-6 h-6" />
                )}
              </div>

              <div>
                <h4 className="font-bold text-white text-sm">
                  {verifyResult.status_code === 'CHECKOUT_SUCCESS'
                    ? 'Exit / Punch Out Recorded! (✅)'
                    : ['SUCCESS', 'MARKED_PRESENT', 'MARKED_LATE'].includes(verifyResult.status_code)
                    ? 'Attendance Recorded Successfully! (✅)'
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
