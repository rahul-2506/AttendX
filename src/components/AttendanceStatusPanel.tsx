import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  ChevronRight, 
  Clock, 
  AlertTriangle,
  UserCheck,
  UserX,
  ExternalLink
} from 'lucide-react';
import { Student, AttendanceStatus } from '../types';

interface AttendanceStatusPanelProps {
  students: Student[];
  onSelectStudent: (student: Student) => void;
}

export const AttendanceStatusPanel: React.FC<AttendanceStatusPanelProps> = ({
  students,
  onSelectStudent,
}) => {
  const [filter, setFilter] = useState<'all' | 'present' | 'away' | 'prolonged'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredStudents = students.filter((s) => {
    const matchesFilter = filter === 'all' ? true : s.status === filter;
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.rollNumber.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (status: AttendanceStatus, awayMinutes: number) => {
    switch (status) {
      case 'present':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Present
          </span>
        );
      case 'away':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Away ({awayMinutes}m)
          </span>
        );
      case 'prolonged':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            Prolonged ({awayMinutes}m)
          </span>
        );
      case 'unknown':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            Unknown
          </span>
        );
    }
  };

  return (
    <div 
      id="attendance-status-card"
      className="flex flex-col h-full rounded-2xl bg-[#15161a] border border-white/[0.06] overflow-hidden shadow-sm"
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] bg-[#17181d]">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-white tracking-tight">
            Attendance Status
          </h2>
          <span className="text-xs text-gray-500 font-mono">
            ({students.filter(s => s.status === 'present').length}/{students.length})
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-live-pulse" />
            Live Sync
          </span>
        </div>
      </div>

      {/* Filter Chips & Search Bar */}
      <div className="p-3 border-b border-white/[0.04] bg-[#141519] flex flex-col gap-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search student or roll no..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#1c1d24] text-xs text-white placeholder-gray-500 rounded-xl pl-8 pr-3 py-1.5 border border-white/[0.06] focus:outline-none focus:border-white/[0.2]"
          />
        </div>

        <div className="flex items-center gap-1 text-[11px]">
          <button
            onClick={() => setFilter('all')}
            className={`px-2 py-1 rounded-lg transition-colors font-medium ${
              filter === 'all'
                ? 'bg-[#22242b] text-white border border-white/[0.1]'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('present')}
            className={`px-2 py-1 rounded-lg transition-colors font-medium ${
              filter === 'present'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Present (47)
          </button>
          <button
            onClick={() => setFilter('away')}
            className={`px-2 py-1 rounded-lg transition-colors font-medium ${
              filter === 'away'
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/25'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Away (2)
          </button>
          <button
            onClick={() => setFilter('prolonged')}
            className={`px-2 py-1 rounded-lg transition-colors font-medium ${
              filter === 'prolonged'
                ? 'bg-red-500/15 text-red-300 border border-red-500/25'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Prolonged (1)
          </button>
        </div>
      </div>

      {/* Student List */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04] max-h-[380px] p-1">
        {filteredStudents.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-500">
            No students matching criteria.
          </div>
        ) : (
          filteredStudents.map((student) => {
            return (
              <div
                key={student.id}
                onClick={() => onSelectStudent(student)}
                className="group flex items-center justify-between px-3.5 py-2.5 rounded-xl hover:bg-white/[0.03] transition-colors cursor-pointer"
              >
                {/* Left: Avatar + Name + Roll */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <img 
                      src={student.avatar} 
                      alt={student.name}
                      className="w-8 h-8 rounded-full object-cover border border-white/10"
                    />
                    <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#15161a] ${
                      student.status === 'present' ? 'bg-emerald-400' :
                      student.status === 'away' ? 'bg-amber-400' :
                      student.status === 'prolonged' ? 'bg-red-400' : 'bg-gray-400'
                    }`} />
                  </div>

                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-white group-hover:text-[#ea5d38] transition-colors truncate">
                      {student.name}
                    </span>
                    <span className="text-[11px] font-mono text-gray-400 truncate">
                      {student.rollNumber} • {student.lastSeen}
                    </span>
                  </div>
                </div>

                {/* Right: Presence % + Status badge */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-bold text-white font-mono">
                      {student.presencePercentage}%
                    </span>
                    <div className="w-12 h-1 bg-white/[0.08] rounded-full overflow-hidden mt-1">
                      <div 
                        className={`h-full rounded-full ${
                          student.presencePercentage >= 90 ? 'bg-emerald-400' :
                          student.presencePercentage >= 75 ? 'bg-amber-400' : 'bg-red-400'
                        }`}
                        style={{ width: `${student.presencePercentage}%` }}
                      />
                    </div>
                  </div>

                  {getStatusBadge(student.status, student.awayMinutes)}
                  <ChevronRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-gray-300 transition-colors" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Summary */}
      <div className="p-3 border-t border-white/[0.06] bg-[#141519] flex items-center justify-between text-xs text-gray-400">
        <span className="font-mono text-[11px]">
          Session: 58m elapsed of 60m
        </span>
        <span className="text-emerald-400 font-semibold font-mono text-[11px]">
          Avg: 96%
        </span>
      </div>
    </div>
  );
};
