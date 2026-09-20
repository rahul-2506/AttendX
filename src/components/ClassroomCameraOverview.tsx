import React, { useState, useRef, useEffect } from 'react';
import { 
  Maximize2, 
  Minimize2, 
  Video, 
  ScanFace,
  Eye, 
  EyeOff, 
  Camera,
  Layers,
  Sparkles,
  MapPin
} from 'lucide-react';
import { DetectedFace, SystemSettings } from '../types';

interface ClassroomCameraOverviewProps {
  detectedFaces?: DetectedFace[];
  settings?: SystemSettings;
  onSnapshotTaken?: (url: string) => void;
  isPaused?: boolean;
}

export const ClassroomCameraOverview: React.FC<ClassroomCameraOverviewProps> = ({
  detectedFaces = [],
  settings,
  onSnapshotTaken,
  isPaused = false,
}) => {
  const [viewMode, setViewMode] = useState<'map' | 'camera'>('map');
  const [useRealWebcam, setUseRealWebcam] = useState(false);
  const [webcamActive, setWebcamActive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    if (useRealWebcam && viewMode === 'camera' && !isPaused) {
      navigator.mediaDevices?.getUserMedia({ video: { width: 640, height: 480 } })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.play();
          }
          setWebcamActive(true);
        })
        .catch(() => {
          setUseRealWebcam(false);
          setWebcamActive(false);
        });
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        const currentStream = videoRef.current.srcObject as MediaStream;
        currentStream.getTracks().forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }
      setWebcamActive(false);
    }
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [useRealWebcam, viewMode, isPaused]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div 
      ref={containerRef}
      id="classroom-camera-overview-card"
      className="relative flex flex-col rounded-2xl bg-[#18191e] border border-white/[0.06] overflow-hidden shadow-sm h-[200px]"
    >
      {/* Top right fullscreen and camera toggles */}
      <div className="absolute top-2.5 right-2.5 z-30 flex items-center gap-1.5">
        <button
          onClick={() => setViewMode(viewMode === 'map' ? 'camera' : 'map')}
          className="px-2 py-1 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 text-[10px] font-mono text-gray-300 hover:text-white flex items-center gap-1 transition-colors"
          title="Toggle between Classroom Radar Grid and AI Optical Camera"
        >
          {viewMode === 'map' ? <Camera className="w-3 h-3 text-[#f08b70]" /> : <ScanFace className="w-3 h-3 text-[#f08b70]" />}
          <span>{viewMode === 'map' ? 'Cam' : 'Grid'}</span>
        </button>

        <button
          onClick={toggleFullscreen}
          className="w-7 h-7 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 text-gray-300 hover:text-white flex items-center justify-center transition-colors"
          title="Expand View"
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>

      {viewMode === 'map' ? (
        /* Dark Stylized Classroom Spatial Grid with Active Student Seating Nodes */
        <div className="relative w-full h-full bg-[#121317] select-none overflow-hidden flex items-center justify-center">
          {/* Grid pattern representing classroom rows and desks */}
          <svg className="absolute inset-0 w-full h-full opacity-35" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="classroom-grid" width="28" height="28" patternUnits="userSpaceOnUse">
                <path d="M 28 0 L 0 0 0 28" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.8" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#classroom-grid)" />
            {/* Seating row depth guides */}
            <path d="M -20,80 Q 80,40 160,110 T 360,60" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeDasharray="3,3" />
            <path d="M 30,160 Q 140,120 240,180 T 400,130" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          </svg>

          {/* Desk and classroom zone labels */}
          <span className="absolute top-[18%] left-[8%] text-[8.5px] font-mono text-gray-500">Row A • 01</span>
          <span className="absolute top-[32%] left-[24%] text-[8.5px] font-mono text-gray-500">Row A • 02</span>
          <span className="absolute top-[48%] left-[6%] text-[8.5px] font-mono text-gray-500">Row B • 01</span>
          <span className="absolute top-[16%] right-[32%] text-[8.5px] font-mono text-gray-500">Row B • 02</span>
          <span className="absolute top-[36%] right-[14%] text-[8.5px] font-mono text-gray-500">Row C • 01</span>
          <span className="absolute bottom-[24%] right-[22%] text-[8.5px] font-mono text-gray-500">Row C • 02</span>
          <span className="absolute bottom-[10%] right-[8%] text-[8.5px] font-mono text-gray-500">Entrance Door</span>

          {/* Optical Coverage / Surveillance Field Angle in Signature Coral */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M 205,108 C 240,112 280,128 320,165 S 390,195 420,205"
              fill="none"
              stroke="#f08b70"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Animated Field Vector */}
            <path
              d="M 205,108 C 240,112 280,128 320,165 S 390,195 420,205"
              fill="none"
              stroke="#ffd37c"
              strokeWidth="2.5"
              strokeDasharray="6,12"
              strokeLinecap="round"
              className="animate-pulse"
            />
          </svg>

          {/* Active Detected Student Seat Marker (Lab 3 Zone B Desk A-03) */}
          <div className="absolute left-[38%] top-[46%] -translate-x-1/2 -translate-y-1/2 z-20 flex items-center gap-1.5 cursor-pointer">
            <div className="relative flex items-center justify-center">
              <div className="w-5 h-5 rounded-full bg-[#70d65c]/30 animate-ping absolute" />
              <div className="w-4 h-4 rounded-full bg-[#70d65c] border-2 border-[#121317] flex items-center justify-center shadow-lg">
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>
            </div>
            <div className="px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-sm border border-white/20 text-[10px] font-bold text-white tracking-wide">
              Desk A-03
            </div>
          </div>
        </div>
      ) : (
        /* Video / Camera View */
        <div className="relative w-full h-full bg-[#0d0e12] flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={`w-full h-full object-cover ${webcamActive ? 'block' : 'hidden'}`}
          />

          {!webcamActive && (
            <div className="relative w-full h-full bg-gradient-to-b from-[#16171d] to-[#0f1013] flex flex-col items-center justify-center p-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2">
                <Camera className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-white">AI Vision Stream (1080p • 30 FPS)</span>
              <button
                onClick={() => setUseRealWebcam(true)}
                className="mt-2 px-2.5 py-1 rounded-lg bg-[#f08b70] text-[#121316] font-semibold text-[11px] hover:bg-[#fa9c83] transition-colors"
              >
                Connect Laptop Webcam
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
