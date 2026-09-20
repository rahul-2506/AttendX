import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Video, 
  VideoOff, 
  Maximize2, 
  Settings, 
  RefreshCw, 
  Camera, 
  AlertCircle,
  Eye,
  EyeOff,
  Minimize2,
  Loader2,
  Sparkles,
  Layers,
  Cpu
} from 'lucide-react';
import { DetectedFace, SystemSettings } from '../types';
import { apiService } from '../services/api';
import { wsService } from '../services/websocket';
import { detectedFacesOnCamera as mockSimulatedFaces } from '../data/mockData';

interface CameraFeedProps {
  detectedFaces?: DetectedFace[];
  settings?: SystemSettings;
  sessionId?: string;
  onOpenSettings?: () => void;
  onSnapshotTaken?: (dataUrl: string) => void;
  isPaused: boolean;
  setIsPaused: (paused: boolean) => void;
}

export const CameraFeed: React.FC<CameraFeedProps> = ({
  detectedFaces = [],
  settings,
  sessionId,
  onOpenSettings,
  onSnapshotTaken,
  isPaused,
  setIsPaused,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isProcessingRef = useRef<boolean>(false);

  // Mode state: 'real' uses pure OpenCV YuNet+SFace backend, 'demo' uses simulated mode
  const [cameraMode, setCameraMode] = useState<'real' | 'demo'>('real');
  const [webcamActive, setWebcamActive] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [visionWarning, setVisionWarning] = useState<string | null>(null);
  const [showOverlays, setShowOverlays] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);

  // Real data-driven detections from computer-vision backend
  const [realDetections, setRealDetections] = useState<DetectedFace[]>([]);

  // Start the laptop webcam using navigator.mediaDevices.getUserMedia()
  const startCamera = useCallback(async () => {
    setIsStarting(true);
    setWebcamError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setWebcamError('Webcam access is not supported by your browser.');
      setIsStarting(false);
      return;
    }

    try {
      // Request webcam stream from client browser
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setWebcamActive(true);
      setWebcamError(null);
    } catch (err: any) {
      console.error('[ATTENDX Camera] getUserMedia error:', err);
      let message = 'Could not access webcam.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = 'Camera permission denied. Please allow camera permissions in your browser address bar.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = 'No webcam found on this device. Please connect a camera.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        message = 'Webcam is currently in use by another application or browser tab.';
      } else if (err.message) {
        message = err.message;
      }
      setWebcamError(message);
      setWebcamActive(false);
    } finally {
      setIsStarting(false);
    }
  }, []);

  // Stop the webcam stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setWebcamActive(false);
    setRealDetections([]);
  }, []);

  // Real frame sampling pipeline: Samples video frame -> POST /api/camera/process-frame
  useEffect(() => {
    if (!webcamActive || isPaused || cameraMode !== 'real') {
      if (cameraMode === 'real' && !webcamActive) {
        setRealDetections([]);
      }
      return;
    }

    if (!captureCanvasRef.current) {
      captureCanvasRef.current = document.createElement('canvas');
    }

    const intervalId = setInterval(async () => {
      if (isProcessingRef.current || !videoRef.current || isPaused) return;

      const video = videoRef.current;
      if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) return;

      try {
        isProcessingRef.current = true;
        const canvas = captureCanvasRef.current;
        if (!canvas) return;

        // Downscale frame for efficient real-time CPU processing
        const targetWidth = 640;
        const targetHeight = Math.round((video.videoHeight / video.videoWidth) * targetWidth) || 360;

        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
        const base64Data = canvas.toDataURL('image/jpeg', 0.7);

        // Send real video frame with active sessionId to FastAPI vision pipeline
        const res = await apiService.processFrame(base64Data, sessionId);

        if (res) {
          const apiStatus = (res as any).status;
          if (apiStatus === 'vision_unavailable') {
            setVisionWarning((res as any).reason || 'Detection model unavailable');
            setRealDetections([]);
          } else {
            setVisionWarning(null);
            const detections = res.detections || [];
            setRealDetections(detections);
          }
        }
      } catch (err) {
        // Silent error handling for frame processing tick
      } finally {
        isProcessingRef.current = false;
      }
    }, 380); // Sample ~2.6 frames per second

    return () => clearInterval(intervalId);
  }, [webcamActive, isPaused, cameraMode, sessionId]);

  // Subscribe to WebSocket detection broadcasts as fallback / synchronization
  useEffect(() => {
    const unsubDetections = wsService.on('camera_detections', (data: any) => {
      if (cameraMode === 'real' && webcamActive && !isPaused && data?.detections) {
        setRealDetections(data.detections);
      }
    });

    return () => {
      unsubDetections();
    };
  }, [cameraMode, webcamActive, isPaused]);

  // Sync Pause/Resume with stream track activity
  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !isPaused;
      });
    }
    if (videoRef.current) {
      if (isPaused) {
        videoRef.current.pause();
      } else if (webcamActive) {
        videoRef.current.play().catch(() => {});
      }
    }
  }, [isPaused, webcamActive]);

  // Clean up tracks when component unmounts
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Handle Fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Active detections based on explicit mode
  const activeDetections: DetectedFace[] = cameraMode === 'real' 
    ? realDetections 
    : (webcamActive ? [] : mockSimulatedFaces);

  // Capture snapshot from the live video feed
  const triggerSnapshot = () => {
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 200);

    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      if (webcamActive && videoRef.current) {
        ctx.drawImage(videoRef.current, 0, 0, 1280, 720);
      } else {
        ctx.fillStyle = '#14161b';
        ctx.fillRect(0, 0, 1280, 720);
        ctx.fillStyle = '#ea5d38';
        ctx.font = '24px sans-serif';
        ctx.fillText('ATTENDX Frame Capture — ' + new Date().toLocaleTimeString(), 40, 60);
      }
      if (onSnapshotTaken) {
        onSnapshotTaken(canvas.toDataURL('image/jpeg'));
      }
    }
  };

  return (
    <div 
      ref={containerRef}
      id="camera-feed-card"
      className="relative flex flex-col rounded-2xl bg-[#15161a] border border-white/[0.06] overflow-hidden shadow-sm transition-all"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#17181d]">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${webcamActive && !isPaused ? 'bg-emerald-400 animate-live-pulse' : 'bg-gray-500'}`} />
          <span className="text-sm font-bold text-white tracking-tight">
            Camera Feed
          </span>

          {/* Explicit Mode Indicator Badge */}
          {cameraMode === 'real' ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
              <Cpu className="w-3 h-3 text-cyan-400" />
              REAL CAMERA
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-purple-400" />
              DEMO MODE
            </span>
          )}

          {webcamActive && (
            <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              ● Connected
            </span>
          )}
        </div>

        {/* Mode Switcher & Stream info */}
        <div className="flex items-center gap-2 text-xs">
          <button
            id="camera-mode-toggle-btn"
            onClick={() => {
              const nextMode = cameraMode === 'real' ? 'demo' : 'real';
              setCameraMode(nextMode);
              if (nextMode === 'demo') {
                setRealDetections([]);
              }
            }}
            className="px-2 py-0.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[11px] font-mono text-gray-300 hover:text-white transition-colors cursor-pointer"
            title={`Switch to ${cameraMode === 'real' ? 'Demo Mode' : 'Real Camera'}`}
          >
            {cameraMode === 'real' ? 'Switch to Demo' : 'Switch to Real'}
          </button>

          <span className="hidden md:inline-flex text-[11px] text-gray-400 font-mono">
            {webcamActive ? '1080p • Live' : 'Standby'}
          </span>
        </div>
      </div>

      {/* Main Video Viewport */}
      <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] min-h-[220px] bg-[#0c0d10] overflow-hidden flex items-center justify-center">
        {/* Flash effect on snapshot */}
        {isFlashing && (
          <div className="absolute inset-0 bg-white/40 z-40 transition-opacity duration-200 pointer-events-none" />
        )}

        {/* Real HTML5 Video element connected to browser MediaStream */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`absolute inset-0 w-full h-full object-cover ${webcamActive && !isPaused ? 'block' : 'hidden'}`}
        />

        {/* Standby / Initial State with clear "Start Camera" Control */}
        {!webcamActive && cameraMode === 'real' && (
          <div className="relative w-full h-full bg-gradient-to-b from-[#14161c] via-[#101217] to-[#0d0e12] flex flex-col items-center justify-center p-6 text-center select-none overflow-hidden">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px]" />

            <div className="relative z-10 flex flex-col items-center max-w-xs">
              <div className="w-12 h-12 rounded-2xl bg-[#ea5d38]/15 border border-[#ea5d38]/30 text-[#ea5d38] flex items-center justify-center mb-3 shadow-lg">
                <Camera className="w-6 h-6" />
              </div>

              <h4 className="text-sm font-bold text-white mb-1">
                Live Laptop Webcam
              </h4>
              <p className="text-[11.5px] text-gray-400 mb-4 leading-relaxed">
                Connect your browser camera for real-time YuNet detection and SFace biometric recognition.
              </p>

              {webcamError && (
                <div className="mb-3 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start gap-2 text-left">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{webcamError}</span>
                </div>
              )}

              <button
                id="start-camera-hero-btn"
                onClick={startCamera}
                disabled={isStarting}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#ea5d38] hover:bg-[#fa6d48] active:scale-98 text-white font-semibold text-xs shadow-lg shadow-[#ea5d38]/20 transition-all cursor-pointer disabled:opacity-60"
              >
                {isStarting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Connecting Camera...</span>
                  </>
                ) : (
                  <>
                    <Video className="w-4 h-4" />
                    <span>Start Camera</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Standby UI for Demo Mode */}
        {!webcamActive && cameraMode === 'demo' && (
          <div className="relative w-full h-full bg-gradient-to-b from-[#181422] to-[#0e0c14] flex flex-col items-center justify-center p-6 text-center select-none">
            <Sparkles className="w-8 h-8 text-purple-400 mb-2" />
            <h4 className="text-sm font-bold text-white mb-1">Demo Simulation Mode</h4>
            <p className="text-[11px] text-gray-400 mb-3 max-w-xs">
              Simulating continuous classroom presence state machine events.
            </p>
            <button
              onClick={startCamera}
              className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors"
            >
              Start Webcam in Demo
            </button>
          </div>
        )}

        {/* Vision Warning Banner if YuNet weights are missing or failed */}
        {visionWarning && webcamActive && (
          <div className="absolute top-3 left-3 right-3 z-30 px-3 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-2 backdrop-blur-md">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{visionWarning}</span>
          </div>
        )}

        {/* Paused Overlay */}
        {webcamActive && isPaused && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center gap-2 z-30">
            <VideoOff className="w-8 h-8 text-amber-400" />
            <span className="text-sm font-semibold text-white">Monitoring Paused</span>
            <button
              onClick={() => setIsPaused(false)}
              className="mt-1 px-3 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-medium hover:bg-amber-500/30 transition-colors cursor-pointer"
            >
              Resume Feed
            </button>
          </div>
        )}

        {/* Real Dynamic Bounding Boxes from Computer Vision Pipeline */}
        {webcamActive && showOverlays && !isPaused && activeDetections.length > 0 && (
          <div className="absolute inset-0 pointer-events-none z-20">
            {activeDetections.map((face, idx) => {
              const isRecognized = face.status === 'recognized' && face.name;
              const isUncertain = face.status === 'uncertain';
              
              let borderColor = 'border-amber-400/90';
              let tagBg = 'bg-[#2a1d10]/95 text-amber-300 border-amber-500/50';

              if (isRecognized) {
                borderColor = 'border-emerald-400/90';
                tagBg = 'bg-[#102a1c]/95 text-emerald-300 border-emerald-500/50';
              } else if (isUncertain) {
                borderColor = 'border-amber-400/90';
                tagBg = 'bg-[#2a2410]/95 text-amber-300 border-amber-500/50';
              }

              const displayName = isRecognized ? face.name : (isUncertain ? `${face.name || 'Student'} (Tracking)` : 'UNKNOWN PERSON');
              const hasConfidence = face.confidence > 0;

              return (
                <div
                  key={face.track_id || face.id || `face-${idx}`}
                  style={{
                    left: `${face.bbox.x}%`,
                    top: `${face.bbox.y}%`,
                    width: `${face.bbox.width}%`,
                    height: `${face.bbox.height}%`,
                  }}
                  className={`absolute border-2 ${borderColor} rounded-lg transition-all duration-150`}
                >
                  {/* Corner Accent Brackets */}
                  <div className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-white" />
                  <div className="absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 border-white" />
                  <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2 border-white" />
                  <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-white" />

                  {/* Recognition Floating Pill */}
                  <div className="absolute -top-7 left-0 whitespace-nowrap">
                    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10.5px] font-mono font-medium border shadow-md ${tagBg}`}>
                      <span>{displayName}</span>
                      {hasConfidence && (
                        <span className="opacity-80">• {Math.round(face.confidence)}%</span>
                      )}
                      {isRecognized && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Live Status Overlay Tag */}
        {webcamActive && !isPaused && (
          <div className="absolute bottom-3 left-3 z-20 pointer-events-none">
            <div className="px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-mono text-gray-300 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{cameraMode === 'real' ? 'LIVE • YUNET CV' : 'LIVE • DEMO'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-t border-white/[0.06] bg-[#17181d]">
        {/* Left: Start / Stop Camera Toggle */}
        <div className="flex items-center gap-2">
          {webcamActive ? (
            <button
              id="stop-camera-btn"
              onClick={stopCamera}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/30 transition-colors cursor-pointer"
              title="Stop Camera Stream"
            >
              <VideoOff className="w-3.5 h-3.5" />
              <span>Stop Camera</span>
            </button>
          ) : (
            <button
              id="start-camera-bar-btn"
              onClick={startCamera}
              disabled={isStarting}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#ea5d38] hover:bg-[#fa6d48] text-white transition-colors cursor-pointer shadow-sm disabled:opacity-60"
              title="Start Laptop Webcam"
            >
              {isStarting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Video className="w-3.5 h-3.5" />}
              <span>Start Camera</span>
            </button>
          )}

          {webcamError && !webcamActive && (
            <span className="text-[11px] text-red-400 flex items-center gap-1 truncate max-w-[180px]" title={webcamError}>
              <AlertCircle className="w-3 h-3 shrink-0" /> Error
            </span>
          )}
        </div>

        {/* Right: Functional View Controls */}
        <div className="flex items-center gap-1.5">
          {/* Pause / Resume Button */}
          {webcamActive && (
            <button
              id="pause-monitoring-btn"
              onClick={() => setIsPaused(!isPaused)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                isPaused 
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' 
                  : 'bg-[#202227] text-gray-300 border-white/[0.08] hover:text-white'
              }`}
              title={isPaused ? 'Resume Camera Monitoring' : 'Pause Camera Monitoring'}
            >
              {isPaused ? <RefreshCw className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
              <span>{isPaused ? 'Resume' : 'Pause'}</span>
            </button>
          )}

          {/* Toggle HUD Overlays */}
          {webcamActive && (
            <button
              id="toggle-overlays-btn"
              onClick={() => setShowOverlays(!showOverlays)}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                showOverlays 
                  ? 'bg-[#202227] text-gray-200 border-white/[0.12]' 
                  : 'bg-transparent text-gray-500 border-transparent hover:text-gray-300'
              }`}
              title="Toggle AI Bounding Boxes"
            >
              {showOverlays ? <Eye className="w-3.5 h-3.5 text-cyan-400" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* Camera Settings Shortcut */}
          {onOpenSettings && (
            <button
              id="camera-settings-btn"
              onClick={onOpenSettings}
              className="w-7 h-7 rounded-lg bg-[#202227] hover:bg-[#282a32] border border-white/[0.08] flex items-center justify-center text-gray-400 hover:text-white transition-colors cursor-pointer"
              title="Camera & Vision Settings"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Fullscreen Button */}
          <button
            id="fullscreen-toggle-btn"
            onClick={toggleFullscreen}
            className="w-7 h-7 rounded-lg bg-[#202227] hover:bg-[#282a32] border border-white/[0.08] flex items-center justify-center text-gray-400 hover:text-white transition-colors cursor-pointer"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
