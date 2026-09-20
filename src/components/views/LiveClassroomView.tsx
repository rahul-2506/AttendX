import React, { useState } from 'react';
import {
  Radio,
  Clock,
  MapPin,
  Users,
  StopCircle,
  AlertTriangle,
  Play,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ShieldCheck
} from 'lucide-react';
import { StatCards } from '../StatCards';
import { SessionContextBar } from '../SessionContextBar';
import { PresenceHeatmap } from '../PresenceHeatmap';
import { PresenceTimeline } from '../PresenceTimeline';
import { CameraFeed } from '../CameraFeed';
import { InstructorCard } from '../InstructorCard';
import { StudentTable } from '../StudentTable';
import { VisionDiagnosticsPanel } from '../VisionDiagnosticsPanel';
import { Student, DetectedFace, HeatmapStudentRow, ActivityEvent, SystemSettings, ClassSession } from '../../types';

interface LiveClassroomViewProps {
  students: Student[];
  detectedFaces: DetectedFace[];
  heatmapRows: HeatmapStudentRow[];
  activityEvents: ActivityEvent[];
  settings: SystemSettings;
  currentSession: ClassSession | null;
  onSelectStudent: (student: Student) => void;
  onOpenSettings: () => void;
  onOpenExportModal: () => void;
  onTakeSnapshot: () => void;
  onEndSession: () => void;
  isPaused: boolean;
  setIsPaused: (paused: boolean) => void;
  isSessionActive: boolean;
  setIsSessionActive: (active: boolean) => void;
}

export const LiveClassroomView: React.FC<LiveClassroomViewProps> = ({
  students,
  detectedFaces,
  heatmapRows,
  activityEvents,
  settings,
  currentSession,
  onSelectStudent,
  onOpenSettings,
  onOpenExportModal,
  onTakeSnapshot,
  onEndSession,
  isPaused,
  setIsPaused,
  isSessionActive,
  setIsSessionActive,
}) => {
  const [showEndModal, setShowEndModal] = useState(false);
  const [ending, setEnding] = useState(false);

  const presentCount = students.filter(s => s.status === 'present').length;
  const awayCount = students.filter(s => s.status === 'away').length;
  const prolongedCount = students.filter(s => s.status === 'prolonged').length;
  const notDetectedCount = students.filter(s => s.status === 'not_detected').length;
  const selectedStudent = students.find(s => s.status === 'present') || students[0];

  const handleConfirmEndSession = async () => {
    try {
      setEnding(true);
      await onEndSession();
      setShowEndModal(false);
    } finally {
      setEnding(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
      {/* 1. Classroom Top Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 p-6 md:p-7 shadow-xl">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                ● LIVE CLASSROOM
              </span>
              <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-zinc-800 text-zinc-200 border border-zinc-700">
                {currentSession?.courseCode || 'CSE302'}
              </span>
              <span className="text-xs text-zinc-400 font-medium">{currentSession?.section || 'Section B'}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {currentSession?.courseName || 'Operating Systems'}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400 mt-2">
              <span className="flex items-center gap-1.5 text-zinc-300">
                <Clock className="w-3.5 h-3.5 text-coral-400" />
                {currentSession?.startTime || '02:00 PM'} – {currentSession?.endTime || '03:00 PM'}
              </span>
              <span className="text-zinc-600">•</span>
              <span className="flex items-center gap-1.5 text-zinc-300">
                <MapPin className="w-3.5 h-3.5 text-coral-400" />
                {currentSession?.room || 'AB3-204'}
              </span>
              <span className="text-zinc-600">•</span>
              <span className="flex items-center gap-1.5 text-zinc-300">
                <Users className="w-3.5 h-3.5 text-coral-400" />
                <strong className="text-white">{students.length}</strong> Enrolled in this Class
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start lg:self-center">
            <button
              onClick={() => setShowEndModal(true)}
              className="px-5 py-2.5 rounded-xl bg-red-500/15 hover:bg-red-500 text-red-300 hover:text-white font-semibold text-xs border border-red-500/30 transition-all flex items-center gap-2 shadow-lg shadow-red-950/30 cursor-pointer"
            >
              <StopCircle className="w-4 h-4" />
              End Session
            </button>
          </div>
        </div>
      </div>

      {/* 1.5. Live Vision Diagnostics Drawer */}
      <VisionDiagnosticsPanel />

      {/* 2. Live Metrics Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-emerald-500/30 shadow-lg shadow-emerald-950/10 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold uppercase tracking-wider">
            <span>Present</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          </div>
          <div className="my-2">
            <span className="text-3xl font-extrabold text-emerald-400">{presentCount}</span>
            <span className="text-zinc-500 text-xs ml-1.5 font-medium">/ {students.length}</span>
          </div>
          <div className="text-[11px] text-zinc-400">Actively recognized on camera</div>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-amber-500/30 shadow-lg shadow-amber-950/10 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold uppercase tracking-wider">
            <span>Temporarily Away</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          </div>
          <div className="my-2">
            <span className="text-3xl font-extrabold text-amber-400">{awayCount}</span>
            <span className="text-zinc-500 text-xs ml-1.5 font-medium">(&lt; 5m grace)</span>
          </div>
          <div className="text-[11px] text-zinc-400">Temporary absence buffer</div>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-red-500/30 shadow-lg shadow-red-950/10 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold uppercase tracking-wider">
            <span>Prolonged Absence</span>
            <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
          </div>
          <div className="my-2">
            <span className="text-3xl font-extrabold text-red-400">{prolongedCount}</span>
            <span className="text-zinc-500 text-xs ml-1.5 font-medium">(&gt; 10m limit)</span>
          </div>
          <div className="text-[11px] text-zinc-400">Flagged for faculty review</div>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 shadow-lg shadow-black/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold uppercase tracking-wider">
            <span>Not Detected</span>
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-500" />
          </div>
          <div className="my-2">
            <span className="text-3xl font-extrabold text-zinc-300">{notDetectedCount}</span>
            <span className="text-zinc-500 text-xs ml-1.5 font-medium">unseen</span>
          </div>
          <div className="text-[11px] text-zinc-400">Enrolled but not yet seen</div>
        </div>
      </div>

      {/* 3. Middle 3-Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
        {/* Left Column: Presence Heatmap */}
        <div className="md:col-span-12 lg:col-span-5 flex flex-col">
          <PresenceHeatmap
            students={students}
            isSessionActive={isSessionActive}
            onSelectStudent={(name) => {
              const std = students.find(s => s.name === name);
              if (std) onSelectStudent(std);
            }}
          />
        </div>

        {/* Middle Column: Presence Timeline */}
        <div className="md:col-span-12 lg:col-span-4 flex flex-col">
          <PresenceTimeline
            selectedStudent={selectedStudent}
            onOpenOptions={onOpenSettings}
          />
        </div>

        {/* Right Column: Live Camera Feed */}
        <div className="md:col-span-12 lg:col-span-3 flex flex-col gap-4 justify-between">
          <CameraFeed
            detectedFaces={detectedFaces}
            settings={settings}
            sessionId={currentSession?.id}
            onOpenSettings={onOpenSettings}
            onSnapshotTaken={onTakeSnapshot}
            isPaused={isPaused}
            setIsPaused={setIsPaused}
          />

          <InstructorCard
            name={currentSession?.instructor || 'Prof. Rahul M.'}
            role="Course Faculty"
            onMessage={() => {}}
            onAlert={() => {}}
          />
        </div>
      </div>

      {/* 4. Bottom Section: Live Student Roster for THIS Class */}
      <StudentTable
        students={students}
        onSelectStudent={onSelectStudent}
        onExportCSV={onOpenExportModal}
      />

      {/* End Session Confirmation Modal */}
      {showEndModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400">
                <StopCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">End {currentSession?.courseName || 'Class'} Session?</h3>
                <p className="text-xs text-zinc-400">Finalize attendance records and stop live computer-vision monitoring</p>
              </div>
            </div>

            <div className="rounded-xl bg-zinc-950/80 border border-zinc-800 p-4 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-400">Total Enrolled Students:</span>
                <span className="text-zinc-100 font-bold">{students.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Students Present:</span>
                <span className="text-emerald-400 font-bold">{presentCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Temporarily Away:</span>
                <span className="text-amber-400 font-bold">{awayCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Prolonged Absence:</span>
                <span className="text-red-400 font-bold">{prolongedCount}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-800/60 border border-zinc-700/50 text-xs text-zinc-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Attendance logs and audit analytics will be saved under {currentSession?.courseName}.</span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowEndModal(false)}
                disabled={ending}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmEndSession}
                disabled={ending}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-950/40 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {ending ? 'Finalizing Session...' : 'End Session & Save Attendance'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
