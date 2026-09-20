import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  SlidersHorizontal, 
  MoreVertical, 
  CheckSquare, 
  Square,
  ArrowUpDown,
  Download
} from 'lucide-react';
import { Student, AttendanceStatus } from '../types';

interface StudentTableProps {
  students: Student[];
  onSelectStudent: (student: Student) => void;
  onExportCSV?: () => void;
}

export const StudentTable: React.FC<StudentTableProps> = ({
  students,
  onSelectStudent,
  onExportCSV,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'present' | 'away' | 'prolonged'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const pageSize = 10;

  const filteredStudents = students.filter((s) => {
    if (activeFilter === 'all') return true;
    return s.status === activeFilter;
  });

  const totalPages = Math.ceil(filteredStudents.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedStudents = filteredStudents.slice(startIndex, startIndex + pageSize);

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedStudents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedStudents.map(s => s.id));
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const getStatusBadge = (status: AttendanceStatus) => {
    switch (status) {
      case 'present':
        return (
          <span className="inline-block px-3 py-0.5 rounded-full text-[11px] font-medium bg-[#10291d] text-[#5cd69a] border border-[#5cd69a]/20">
            Present
          </span>
        );
      case 'away':
        return (
          <span className="inline-block px-3 py-0.5 rounded-full text-[11px] font-medium bg-[#e6f088]/10 text-[#d9e855] border border-[#d9e855]/25">
            Away
          </span>
        );
      case 'prolonged':
        return (
          <span className="inline-block px-3 py-0.5 rounded-full text-[11px] font-medium bg-[#f08b70]/10 text-[#f08b70] border border-[#f08b70]/25">
            Prolonged
          </span>
        );
      case 'not_detected':
        return (
          <span className="inline-block px-3 py-0.5 rounded-full text-[11px] font-medium bg-zinc-800/80 text-zinc-400 border border-zinc-700/40">
            Not Seen
          </span>
        );
      case 'unknown':
      default:
        return (
          <span className="inline-block px-3 py-0.5 rounded-full text-[11px] font-medium bg-zinc-800/80 text-zinc-400 border border-zinc-700/40">
            Not Seen
          </span>
        );
    }
  };

  return (
    <div 
      id="recent-activities-table-card"
      className="flex flex-col rounded-2xl bg-[#18191e] border border-white/[0.06] overflow-hidden shadow-sm p-5 select-none"
    >
      {/* Top Header with Title, Filter Pills, and Pagination Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4">
        {/* Title and Filter Pills */}
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-sm font-bold text-white tracking-tight">
            Recent Activities
          </h2>

          <div className="flex items-center gap-1 p-0.5 rounded-full bg-[#202127] border border-white/[0.06] text-xs">
            <button
              onClick={() => { setActiveFilter('all'); setCurrentPage(1); }}
              className={`px-3 py-1 rounded-full text-[11.5px] font-medium transition-all ${
                activeFilter === 'all'
                  ? 'bg-[#2b2d35] text-white shadow-xs font-semibold'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {activeFilter === 'all' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#f08b70] mr-1.5 align-middle" />}
              All ({students.length})
            </button>

            <button
              onClick={() => { setActiveFilter('present'); setCurrentPage(1); }}
              className={`px-3 py-1 rounded-full text-[11.5px] font-medium transition-all ${
                activeFilter === 'present'
                  ? 'bg-[#2b2d35] text-white shadow-xs font-semibold'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Present ({students.filter(s => s.status === 'present').length})
            </button>

            <button
              onClick={() => { setActiveFilter('away'); setCurrentPage(1); }}
              className={`px-3 py-1 rounded-full text-[11.5px] font-medium transition-all ${
                activeFilter === 'away'
                  ? 'bg-[#2b2d35] text-white shadow-xs font-semibold'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Away ({students.filter(s => s.status === 'away').length})
            </button>

            <button
              onClick={() => { setActiveFilter('prolonged'); setCurrentPage(1); }}
              className={`px-3 py-1 rounded-full text-[11.5px] font-medium transition-all ${
                activeFilter === 'prolonged'
                  ? 'bg-[#2b2d35] text-white shadow-xs font-semibold'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Prolonged ({students.filter(s => s.status === 'prolonged').length})
            </button>
          </div>
        </div>

        {/* Right Side: Customize / Export Button & Pagination */}
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <button 
            onClick={onExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#22242b] hover:bg-[#2c2e36] border border-white/[0.06] text-gray-300 hover:text-white transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400" />
            <span>Customize</span>
          </button>

          <span className="font-mono text-gray-400 text-xs">
            {startIndex + 1}–{Math.min(startIndex + pageSize, filteredStudents.length)} of {filteredStudents.length}
          </span>

          <div className="flex items-center gap-1">
            <button
              id="pagination-prev-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="w-7 h-7 rounded-lg bg-[#22242b] hover:bg-[#2c2e36] border border-white/[0.06] flex items-center justify-center text-gray-400 hover:text-white transition-colors disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              id="pagination-next-btn"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="w-7 h-7 rounded-lg bg-[#22242b] hover:bg-[#2c2e36] border border-white/[0.06] flex items-center justify-center text-gray-400 hover:text-white transition-colors disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-white/[0.06] text-gray-400 font-medium">
              <th className="py-3 px-3 w-8">
                <button 
                  onClick={toggleSelectAll}
                  className="text-gray-500 hover:text-gray-300"
                >
                  {selectedIds.length === paginatedStudents.length && paginatedStudents.length > 0 ? (
                    <CheckSquare className="w-4 h-4 text-[#f08b70]" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
              </th>
              <th className="py-3 px-3 font-semibold text-gray-300">
                <div className="flex items-center gap-1 cursor-pointer">
                  <span>Student ID</span>
                  <ArrowUpDown className="w-3 h-3 text-gray-500" />
                </div>
              </th>
              <th className="py-3 px-3 font-semibold text-gray-300">
                <div className="flex items-center gap-1 cursor-pointer">
                  <span>Student Name</span>
                  <ArrowUpDown className="w-3 h-3 text-gray-500" />
                </div>
              </th>
              <th className="py-3 px-3 font-semibold text-gray-300">
                <div className="flex items-center gap-1 cursor-pointer">
                  <span>Presence %</span>
                  <ArrowUpDown className="w-3 h-3 text-gray-500" />
                </div>
              </th>
              <th className="py-3 px-3 font-semibold text-gray-300">
                <div className="flex items-center gap-1 cursor-pointer">
                  <span>Department</span>
                  <ArrowUpDown className="w-3 h-3 text-gray-500" />
                </div>
              </th>
              <th className="py-3 px-3 font-semibold text-gray-300">
                <div className="flex items-center gap-1 cursor-pointer">
                  <span>Present Time</span>
                  <ArrowUpDown className="w-3 h-3 text-gray-500" />
                </div>
              </th>
              <th className="py-3 px-3 font-semibold text-gray-300">
                <div className="flex items-center gap-1 cursor-pointer">
                  <span>Away Time</span>
                  <ArrowUpDown className="w-3 h-3 text-gray-500" />
                </div>
              </th>
              <th className="py-3 px-3 font-semibold text-gray-300">
                <div className="flex items-center gap-1 cursor-pointer">
                  <span>Last Seen</span>
                  <ArrowUpDown className="w-3 h-3 text-gray-500" />
                </div>
              </th>
              <th className="py-3 px-3 font-semibold text-gray-300">
                <div className="flex items-center gap-1 cursor-pointer">
                  <span>Confidence</span>
                  <ArrowUpDown className="w-3 h-3 text-gray-500" />
                </div>
              </th>
              <th className="py-3 px-3 font-semibold text-gray-300">
                <div className="flex items-center gap-1 cursor-pointer">
                  <span>Attendance Status</span>
                  <ArrowUpDown className="w-3 h-3 text-gray-500" />
                </div>
              </th>
              <th className="py-3 px-3 w-8 text-right pr-2"></th>
            </tr>
          </thead>

          <tbody className="divide-y divide-white/[0.04]">
            {paginatedStudents.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-8 text-center text-xs text-gray-500 font-sans">
                  No attendance activity recorded yet. Enroll students in the Students tab to start tracking.
                </td>
              </tr>
            ) : (
              paginatedStudents.map((student) => {
                const isSelected = selectedIds.includes(student.id);

                return (
                <tr
                  key={student.id}
                  onClick={() => onSelectStudent(student)}
                  className={`group hover:bg-white/[0.025] transition-colors cursor-pointer ${
                    isSelected ? 'bg-white/[0.03]' : ''
                  }`}
                >
                  {/* Checkbox */}
                  <td 
                    className="py-3.5 px-3"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelect(student.id);
                    }}
                  >
                    <button className="text-gray-500 hover:text-gray-300">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-[#f08b70]" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </td>

                  {/* Student Roll ID */}
                  <td className="py-3.5 px-3 font-mono text-gray-200">
                    {student.rollNumber}
                  </td>

                  {/* Student Avatar + Name */}
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-2.5">
                      <img 
                        src={student.avatar} 
                        alt={student.name}
                        className="w-6 h-6 rounded-full object-cover border border-white/10"
                      />
                      <span className="font-semibold text-white group-hover:text-[#f08b70] transition-colors">
                        {student.name}
                      </span>
                    </div>
                  </td>

                  {/* Presence % */}
                  <td className="py-3.5 px-3 font-mono font-bold text-white">
                    {student.presencePercentage}%
                  </td>

                  {/* Department */}
                  <td className="py-3.5 px-3 text-gray-300">
                    {student.department}
                  </td>

                  {/* Present Time */}
                  <td className="py-3.5 px-3 text-gray-300 font-mono">
                    {student.presentMinutes} min
                  </td>

                  {/* Away Time */}
                  <td className="py-3.5 px-3 font-mono">
                    <span className={student.awayMinutes > 5 ? 'text-red-400 font-semibold' : 'text-gray-400'}>
                      {student.awayMinutes} min
                    </span>
                  </td>

                  {/* Last Seen */}
                  <td className="py-3.5 px-3 text-gray-300 font-mono">
                    {student.lastSeen}
                  </td>

                  {/* Confidence */}
                  <td className="py-3.5 px-3 font-mono text-gray-200">
                    {student.confidence}%
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-3">
                    {getStatusBadge(student.status)}
                  </td>

                  {/* Menu button */}
                  <td className="py-3.5 px-3 text-right pr-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectStudent(student);
                      }}
                      className="text-gray-500 hover:text-white p-1 rounded transition-colors"
                      title="Inspect Student"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            }))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
