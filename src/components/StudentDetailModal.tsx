import React, { useState } from 'react';
import { 
  X, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Camera, 
  Calendar,
  Mail,
  UserCheck,
  FileText,
  RotateCcw,
  Trash2
} from 'lucide-react';
import { Student } from '../types';

interface StudentDetailModalProps {
  student: Student | null;
  onClose: () => void;
  onUpdateStatus?: (studentId: string, newStatus: Student['status']) => void;
  onDeleteStudent?: (studentId: string) => Promise<void> | void;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  student,
  onClose,
  onUpdateStatus,
  onDeleteStudent,
}) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!student) return null;

  const handleDelete = async () => {
    if (!onDeleteStudent) return;
    setIsDeleting(true);
    try {
      await onDeleteStudent(student.id);
      onClose();
    } finally {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        id="student-detail-modal"
        className="w-full max-w-xl bg-[#16171c] border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-[#1a1b21]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 shrink-0">
              <img src={student.avatar} alt={student.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  {student.name}
                </h3>
                <span className="font-mono text-xs text-gray-400">
                  ({student.rollNumber})
                </span>
              </div>
              <span className="text-xs text-gray-400">
                {student.department} • {student.batch}
              </span>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex flex-col gap-5 text-xs">
          {/* Status Alert Banner if away or prolonged */}
          {student.status !== 'present' && (
            <div className={`p-3.5 rounded-xl border flex items-start gap-3 ${
              student.status === 'prolonged' 
                ? 'bg-red-500/10 border-red-500/20 text-red-300' 
                : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
            }`}>
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex flex-col">
                <span className="font-semibold">
                  {student.status === 'prolonged' ? 'Prolonged Absence Detected' : 'Temporary Absence in Grace Period'}
                </span>
                <span className="text-[11px] opacity-80 mt-0.5">
                  Away for {student.awayMinutes} minutes. Last verified at {student.lastSeen}.
                </span>
              </div>
            </div>
          )}

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-[#1b1d24] border border-white/[0.06] flex flex-col">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
                Presence Rate
              </span>
              <span className="text-2xl font-bold font-mono text-white mt-1">
                {student.presencePercentage}%
              </span>
              <div className="w-full h-1 bg-white/[0.08] rounded-full overflow-hidden mt-2">
                <div 
                  className={`h-full rounded-full ${
                    student.presencePercentage >= 90 ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                  style={{ width: `${student.presencePercentage}%` }}
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#1b1d24] border border-white/[0.06] flex flex-col">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
                Present Duration
              </span>
              <span className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                {student.presentMinutes}m
              </span>
              <span className="text-[10px] text-gray-400 mt-1">
                of 60m session
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#1b1d24] border border-white/[0.06] flex flex-col">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
                Recognition Score
              </span>
              <span className="text-2xl font-bold font-mono text-[#ea5d38] mt-1">
                {student.confidence}%
              </span>
              <span className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" /> Face Enrolled
              </span>
            </div>
          </div>

          {/* Timeline & Continuous Presence Logs */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Session Tracking Timeline (CSE302)
            </span>
            <div className="p-3 rounded-xl bg-[#1b1d24] border border-white/[0.06] flex flex-col gap-2 font-mono text-[11px]">
              <div className="flex items-center justify-between text-gray-300">
                <span>09:00 AM — Initial Recognition</span>
                <span className="text-emerald-400">Match (97%)</span>
              </div>
              <div className="flex items-center justify-between text-gray-300">
                <span>09:30 AM — Mid-session Quorum Check</span>
                <span className="text-emerald-400">Verified</span>
              </div>
              {student.awayMinutes > 0 && (
                <div className="flex items-center justify-between text-amber-300">
                  <span>{student.lastSeen} — Face disappeared from Zone B</span>
                  <span>Absent timer started</span>
                </div>
              )}
            </div>
          </div>

          {/* Delete Confirmation Warning Bar */}
          {confirmDelete && (
            <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-between gap-3 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 text-red-300">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span className="text-xs">Delete student & facial template permanently?</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-gray-300 text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="confirm-delete-student-btn"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeleting ? 'Deleting...' : 'Confirm Delete'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/[0.06]">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onUpdateStatus && onUpdateStatus(student.id, 'present');
                  onClose();
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-medium transition-colors"
              >
                Mark Present
              </button>
              <button
                onClick={() => {
                  onUpdateStatus && onUpdateStatus(student.id, 'away');
                  onClose();
                }}
                className="px-3 py-1.5 rounded-xl bg-[#22242c] hover:bg-[#2b2d37] border border-white/[0.08] text-gray-300 transition-colors"
              >
                Grant Grace Time
              </button>
            </div>

            <div className="flex items-center gap-2">
              {onDeleteStudent && !confirmDelete && (
                <button
                  type="button"
                  id="delete-student-btn"
                  onClick={() => setConfirmDelete(true)}
                  className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-medium transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              )}

              <button
                onClick={onClose}
                className="px-4 py-1.5 rounded-xl bg-[#ea5d38] hover:bg-[#f2724f] text-[#0e0f12] font-semibold transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
