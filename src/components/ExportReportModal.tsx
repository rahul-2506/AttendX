import React, { useState } from 'react';
import { 
  X, 
  Download, 
  FileText, 
  Check, 
  Copy, 
  Calendar, 
  Clock, 
  Users,
  Share2
} from 'lucide-react';
import { Student, ClassSession } from '../types';

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: ClassSession;
  students: Student[];
}

export const ExportReportModal: React.FC<ExportReportModalProps> = ({
  isOpen,
  onClose,
  session,
  students,
}) => {
  const [copied, setCopied] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState<'csv' | 'pdf' | 'json'>('csv');

  if (!isOpen) return null;

  const generateCSV = () => {
    const headers = ['Roll Number', 'Student Name', 'Department', 'Status', 'Presence %', 'Present Minutes', 'Away Minutes', 'Last Seen'];
    const rows = students.map(s => [
      s.rollNumber,
      `"${s.name}"`,
      `"${s.department}"`,
      s.status.toUpperCase(),
      `${s.presencePercentage}%`,
      `${s.presentMinutes}m`,
      `${s.awayMinutes}m`,
      s.lastSeen
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  };

  const handleCopy = () => {
    const csvData = generateCSV();
    navigator.clipboard.writeText(csvData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const csvData = generateCSV();
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ATTENDX_${session.courseCode}_Attendance_${session.date.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        id="export-report-modal"
        className="w-full max-w-xl bg-[#16171c] border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-[#1a1b21]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Export Attendance Report</h3>
              <p className="text-[11px] text-gray-400">Classroom session attendance audit sheet</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-4 text-xs">
          {/* Session Overview Box */}
          <div className="p-4 rounded-xl bg-[#1b1d24] border border-white/[0.06] flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-white font-bold text-sm">
                {session.courseCode}: {session.courseName}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Avg: {session.averagePresence}%
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-gray-400 font-mono text-[11px]">
              <span>{session.section} • {session.room}</span>
              <span>{session.date}</span>
              <span>{session.startTime} – {session.endTime}</span>
            </div>
          </div>

          {/* Format selection */}
          <div className="flex items-center gap-3">
            <span className="text-gray-400 font-semibold">Format:</span>
            <div className="flex items-center gap-2">
              {(['csv', 'pdf', 'json'] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setDownloadFormat(fmt)}
                  className={`px-3 py-1.5 rounded-lg uppercase font-mono text-xs font-semibold border transition-colors ${
                    downloadFormat === fmt
                      ? 'bg-[#ea5d38] text-black border-[#ea5d38]'
                      : 'bg-[#202227] text-gray-400 border-white/[0.08] hover:text-white'
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Data Preview Box */}
          <div className="flex flex-col gap-1.5">
            <span className="text-gray-400 font-semibold text-[11px]">Preview (First 3 Records):</span>
            <div className="p-3 rounded-xl bg-[#121316] border border-white/[0.06] font-mono text-[10.5px] text-gray-300 max-h-36 overflow-y-auto leading-relaxed">
              <div className="text-gray-500 border-b border-white/[0.06] pb-1 mb-1">
                ROLL_NO, NAME, STATUS, PRESENCE_PCT, PRESENT_MIN
              </div>
              {students.slice(0, 3).map(s => (
                <div key={s.id} className="py-0.5">
                  {s.rollNumber}, {s.name}, {s.status.toUpperCase()}, {s.presencePercentage}%, {s.presentMinutes}m
                </div>
              ))}
              <div className="text-gray-500 pt-1 mt-1 border-t border-white/[0.06]">
                ... and {students.length - 3} more student records.
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#202227] hover:bg-[#282a32] border border-white/[0.08] text-gray-300 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied to Clipboard' : 'Copy CSV Data'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#ea5d38] hover:bg-[#f2724f] text-[#0e0f12] font-semibold transition-colors shadow-md"
            >
              <Download className="w-4 h-4" />
              <span>Download {downloadFormat.toUpperCase()} File</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
