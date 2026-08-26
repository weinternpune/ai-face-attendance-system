import React, { useRef, useEffect, useState } from 'react';
import { CameraOff, RefreshCw, CheckCircle2, Clock, HelpCircle, ShieldAlert } from 'lucide-react';

export default function CameraFeed({ 
  onFrameCapture, 
  isScanning = true, 
  captureIntervalMs = 1000,
  scanState = 'STANDBY' // STANDBY, SUCCESS, ALREADY_MARKED, UNKNOWN, SPOOF
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [streamActive, setStreamActive] = useState(false);
  const [error, setError] = useState(null);

  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setStreamActive(true);
        };
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setError('Webcam permission required. Please allow camera access in your browser settings.');
      setStreamActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setStreamActive(false);
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    let interval = null;
    if (streamActive && isScanning) {
      interval = setInterval(() => {
        captureFrame();
      }, captureIntervalMs);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [streamActive, isScanning, captureIntervalMs]);

  const captureFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !streamActive || video.readyState < 2) return null;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    const canvasCtx = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = height;

    canvasCtx.drawImage(video, 0, 0, width, height);

    const base64Image = canvas.toDataURL('image/jpeg', 0.85);
    if (onFrameCapture && base64Image && base64Image.length > 500) {
      onFrameCapture(base64Image);
    }
    return base64Image;
  };

  // Determine dynamic PRD Colors for Viewfinder
  const isSuccess = scanState === 'SUCCESS';
  const isAlreadyMarked = scanState === 'ALREADY_MARKED';
  const isErrorOrUnknown = scanState === 'UNKNOWN' || scanState === 'SPOOF';

  return (
    <div className={`relative w-full aspect-[4/3] sm:aspect-video bg-slate-950/90 rounded-3xl overflow-hidden border transition-all duration-300 flex items-center justify-center group ${
      isSuccess 
        ? 'border-emerald-400 shadow-[0_0_50px_rgba(16,185,129,0.35)] ring-4 ring-emerald-400/20' 
        : isAlreadyMarked 
        ? 'border-blue-400 shadow-[0_0_50px_rgba(59,130,246,0.35)] ring-4 ring-blue-400/20' 
        : isErrorOrUnknown 
        ? 'border-rose-500 shadow-[0_0_50px_rgba(244,63,94,0.35)] ring-4 ring-rose-500/20' 
        : 'border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.6)]'
    }`}>
      {error ? (
        <div className="text-center p-6 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-400">
            <CameraOff className="w-7 h-7" />
          </div>
          <p className="text-slate-400 text-xs sm:text-sm max-w-xs">{error}</p>
          <button
            onClick={startCamera}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-amber-500/20 transition hover:scale-105"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reconnect Camera
          </button>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover transform -scale-x-100"
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Futuristic Biometric HUD Viewfinder Overlay (Green/Blue/Red PRD Colors) */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-4">
            <div className={`relative w-52 h-64 sm:w-72 sm:h-84 md:w-80 md:h-96 rounded-3xl overflow-hidden backdrop-blur-[0.5px] transition-all duration-300 border-2 ${
              isSuccess
                ? 'border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.5)]'
                : isAlreadyMarked
                ? 'border-blue-400 shadow-[0_0_30px_rgba(59,130,246,0.5)]'
                : isErrorOrUnknown
                ? 'border-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.5)]'
                : 'border-amber-400/40'
            }`}>
              
              {/* Active Scanner Beam (Only in Standby) */}
              {scanState === 'STANDBY' && (
                <div className="biometric-scanner-beam" />
              )}
              
              {/* Corner Bracket Accents */}
              <div className={`absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 ${
                isSuccess ? 'border-emerald-400 shadow-[0_0_8px_#10b981]' : isAlreadyMarked ? 'border-blue-400 shadow-[0_0_8px_#3b82f6]' : isErrorOrUnknown ? 'border-rose-500 shadow-[0_0_8px_#f43f5e]' : 'border-amber-400 shadow-[0_0_8px_#f59e0b]'
              }`} />
              <div className={`absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 ${
                isSuccess ? 'border-emerald-400 shadow-[0_0_8px_#10b981]' : isAlreadyMarked ? 'border-blue-400 shadow-[0_0_8px_#3b82f6]' : isErrorOrUnknown ? 'border-rose-500 shadow-[0_0_8px_#f43f5e]' : 'border-amber-400 shadow-[0_0_8px_#f59e0b]'
              }`} />
              <div className={`absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 ${
                isSuccess ? 'border-emerald-400 shadow-[0_0_8px_#10b981]' : isAlreadyMarked ? 'border-blue-400 shadow-[0_0_8px_#3b82f6]' : isErrorOrUnknown ? 'border-rose-500 shadow-[0_0_8px_#f43f5e]' : 'border-amber-400 shadow-[0_0_8px_#f59e0b]'
              }`} />
              <div className={`absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 ${
                isSuccess ? 'border-emerald-400 shadow-[0_0_8px_#10b981]' : isAlreadyMarked ? 'border-blue-400 shadow-[0_0_8px_#3b82f6]' : isErrorOrUnknown ? 'border-rose-500 shadow-[0_0_8px_#f43f5e]' : 'border-amber-400 shadow-[0_0_8px_#f59e0b]'
              }`} />
              
              {/* Center Crosshair or Status Icon Overlay */}
              {scanState === 'STANDBY' ? (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 opacity-40 flex items-center justify-center">
                  <div className="w-full h-0.5 bg-amber-400" />
                  <div className="h-full w-0.5 bg-amber-400 absolute" />
                </div>
              ) : isSuccess ? (
                <div className="absolute inset-0 bg-emerald-500/10 flex items-center justify-center animate-spring-in">
                  <CheckCircle2 className="w-16 h-16 text-emerald-400 animate-pulse" />
                </div>
              ) : isAlreadyMarked ? (
                <div className="absolute inset-0 bg-blue-500/10 flex items-center justify-center animate-spring-in">
                  <Clock className="w-16 h-16 text-blue-400 animate-pulse" />
                </div>
              ) : (
                <div className="absolute inset-0 bg-rose-500/10 flex items-center justify-center animate-spring-in">
                  <HelpCircle className="w-16 h-16 text-rose-400 animate-pulse" />
                </div>
              )}

            </div>
          </div>
        </>
      )}
    </div>
  );
}
