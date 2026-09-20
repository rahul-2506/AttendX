import React from 'react';
import { 
  MoreHorizontal, 
  MapPin, 
  Clock, 
  UserCheck,
  Building2,
  ScanFace,
  Layers,
  Sparkles
} from 'lucide-react';
import { Student } from '../types';

interface PresenceTimelineProps {
  selectedStudent?: Student | null;
  onOpenOptions?: () => void;
}

export const PresenceTimeline: React.FC<PresenceTimelineProps> = ({
  selectedStudent,
  onOpenOptions,
}) => {
  if (!selectedStudent) {
    return (
      <div 
        id="presence-timeline-card"
        className="flex flex-col rounded-2xl bg-[#18191e] border border-white/[0.06] p-5 shadow-sm h-full justify-between select-none"
      >
        <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.06]">
          <h2 className="text-sm font-bold text-white tracking-tight">
            Presence Timeline
          </h2>
        </div>

        <div className="flex flex-col items-center justify-center p-8 text-center my-auto">
          <Clock className="w-8 h-8 text-gray-600 mb-2" />
          <span className="text-xs font-semibold text-gray-300">No Student Selected</span>
          <span className="text-[11px] text-gray-500 mt-1 max-w-[200px]">
            Enroll students or click a student from the table to view their real-time presence timeline.
          </span>
        </div>
      </div>
    );
  }

  const student = selectedStudent;

  const getStatusBadge = () => {
    switch (student.status) {
      case 'present':
        return (
          <div className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-live-pulse" />
            <span>Present</span>
          </div>
        );
      case 'away':
        return (
          <div className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#e6f088]/15 text-[#d9e855] border border-[#d9e855]/30 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#d9e855] animate-pulse" />
            <span>Grace Active ({student.awayMinutes}m)</span>
          </div>
        );
      case 'prolonged':
        return (
          <div className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-red-500/15 text-red-400 border border-red-500/30 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            <span>Prolonged ({student.awayMinutes}m)</span>
          </div>
        );
      default:
        return (
          <div className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            <span>Unknown Face</span>
          </div>
        );
    }
  };

  return (
    <div 
      id="presence-timeline-card"
      className="flex flex-col rounded-2xl bg-[#18191e] border border-white/[0.06] p-5 shadow-sm h-full justify-between select-none"
    >
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.06]">
          <h2 className="text-sm font-bold text-white tracking-tight">
            Presence Timeline
          </h2>
          <button 
            onClick={onOpenOptions}
            className="w-7 h-7 rounded-lg bg-[#22242a] hover:bg-[#2c2e36] text-gray-400 hover:text-white flex items-center justify-center transition-colors"
            title="Session Options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Student Roll / Session ID & Status Badge */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-semibold tracking-wider text-gray-400">
              Student / Session ID
            </span>
            <span className="text-xs font-mono font-bold text-white mt-0.5">
              {student.rollNumber} • {student.name}
            </span>
          </div>

          {getStatusBadge()}
        </div>

        {/* Vertical Presence Timeline with Connected Dashed Line */}
        <div className="relative mt-5 pl-5 flex flex-col gap-4">
          {/* Connecting Vertical Dashed Line */}
          <div className="absolute left-[7px] top-2 bottom-3 w-[1.5px] border-l-2 border-dashed border-white/20" />

          {/* Point 1: Current Presence Verification */}
          <div className="relative flex items-start justify-between gap-2">
            <div className={`absolute -left-[20px] top-1 w-2.5 h-2.5 rounded-full ${student.status === 'present' ? 'bg-[#70d65c] ring-4 ring-[#70d65c]/20' : 'bg-amber-400 ring-4 ring-amber-400/20'}`} />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] text-gray-400 uppercase font-semibold tracking-wider">
                Live Camera Status
              </span>
              <span className="text-xs font-semibold text-white truncate">
                {student.status === 'present' ? 'Verified in Camera View' : (student.status === 'away' ? `Away (${student.awayMinutes}m)` : 'Prolonged Absence')}
              </span>
            </div>
            <span className="text-[10px] font-mono text-gray-400 shrink-0 text-right">
              {student.lastSeen || 'Now'}
            </span>
          </div>

          {/* Point 2: Optical Biometric Confidence */}
          <div className="relative flex items-start justify-between gap-2">
            <div className="absolute -left-[19px] top-1 w-2 h-2 rounded-full bg-cyan-400" />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] text-gray-400 uppercase font-semibold tracking-wider">
                AI Optical Biometrics
              </span>
              <span className="text-xs font-semibold text-white truncate">
                SFace 128D Template ({student.confidence}% Match)
              </span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 shrink-0 text-right font-semibold">
              Enrolled
            </span>
          </div>

          {/* Point 3: Total Session Presence */}
          <div className="relative flex items-start justify-between gap-2">
            <div className="absolute -left-[19px] top-1 w-2 h-2 rounded-full bg-white/40" />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] text-gray-400 uppercase font-semibold tracking-wider">
                Session Presence
              </span>
              <span className="text-xs font-semibold text-white truncate">
                {student.presentMinutes}m active ({student.presencePercentage}% presence)
              </span>
            </div>
            <span className="text-[10px] font-mono text-gray-400 shrink-0 text-right">
              {student.presencePercentage}%
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Summary Meta Items (Course & Duration) */}
      <div className="pt-4 border-t border-white/[0.06] flex flex-col gap-2.5 mt-4">
        <div className="flex items-center gap-2.5 text-xs text-gray-300">
          <div className="w-6 h-6 rounded-md bg-[#22242b] border border-white/[0.06] flex items-center justify-center shrink-0">
            <Building2 className="w-3.5 h-3.5 text-gray-400" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] text-gray-400 leading-tight">Course & Room</span>
            <span className="text-[11.5px] font-medium text-white truncate">CSE302 • Computer Science Lab 3</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 text-xs text-gray-300">
          <div className="w-6 h-6 rounded-md bg-[#22242b] border border-white/[0.06] flex items-center justify-center shrink-0">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] text-gray-400 leading-tight">Session Duration</span>
            <span className="text-[11.5px] font-medium text-white truncate">{student.presentMinutes}m recorded of 60m session</span>
          </div>
        </div>
      </div>
    </div>
  );
};
