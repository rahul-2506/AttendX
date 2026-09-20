import React from 'react';
import { 
  Building2, 
  AlertTriangle, 
  SlidersHorizontal,
  Download, 
  Camera,
  Calendar
} from 'lucide-react';

interface SessionContextBarProps {
  onOpenExportModal?: () => void;
  onTakeSnapshot?: () => void;
  onFilterClick?: () => void;
  onFlagReview?: () => void;
  isSessionActive?: boolean;
  setIsSessionActive?: (active: boolean) => void;
}

export const SessionContextBar: React.FC<SessionContextBarProps> = ({
  onOpenExportModal,
  onTakeSnapshot,
  onFilterClick,
  onFlagReview,
  isSessionActive = true,
}) => {
  return (
    <div 
      id="classroom-session-bar"
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 rounded-2xl bg-[#18191e] border border-white/[0.06] shadow-sm select-none"
    >
      {/* Left: Building Icon + Class Session info */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-[#22242b] border border-white/[0.06] flex items-center justify-center text-gray-300 shrink-0">
          <Building2 className="w-4 h-4 text-[#f08b70]" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white leading-tight">
              Classroom Session: Lab 3 (Zone B)
            </span>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-white/[0.06] text-gray-300">
              CSE302 • Sec B
            </span>
          </div>
          <span className="text-[11px] text-gray-400 leading-tight mt-0.5 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-gray-500" /> Today — Operating Systems (09:00 AM – 10:00 AM)
          </span>
        </div>
      </div>

      {/* Right Side: Flag Alert + Filter + Download Report + Capture Snapshot */}
      <div className="flex flex-wrap items-center gap-3 self-end sm:self-auto">
        {/* Flag Alert */}
        <div 
          onClick={onFlagReview}
          className="flex items-center gap-1.5 text-xs text-[#f08b70] cursor-pointer hover:opacity-90 transition-opacity"
          title="Inspect Flagged Student"
        >
          <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
          <span className="font-medium text-[11.5px]">1 Prolonged absence flagged (Karthik S)</span>
        </div>

        {/* Filter / Threshold Settings Button */}
        <button
          onClick={onFilterClick}
          className="w-8 h-8 rounded-full bg-[#22242b] hover:bg-[#2c2e36] text-gray-300 hover:text-white flex items-center justify-center border border-white/[0.06] transition-colors"
          title="Camera & Absence Thresholds"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
        </button>

        {/* Download Report Pill Button */}
        <button
          id="context-download-report-btn"
          onClick={onOpenExportModal}
          className="px-3.5 py-1.5 rounded-full text-xs font-medium text-gray-200 bg-[#22242b] hover:bg-[#2c2e36] border border-white/[0.06] transition-colors"
        >
          Download report
        </button>

        {/* Capture Snapshot / Primary Action Pill Button in Signature Coral/Peach */}
        <button
          id="context-take-snapshot-btn"
          onClick={onTakeSnapshot}
          className="px-4 py-1.5 rounded-full text-xs font-bold text-[#121316] bg-[#f08b70] hover:bg-[#fa9c83] active:scale-[0.98] transition-all shadow-sm flex items-center gap-1.5"
        >
          <Camera className="w-3.5 h-3.5 text-[#121316]" />
          <span>Capture snapshot</span>
        </button>
      </div>
    </div>
  );
};
