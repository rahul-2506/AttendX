import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  ShieldCheck, 
  LayoutGrid, 
  List, 
  MoreVertical,
  CheckCircle2,
  Clock,
  AlertTriangle,
  GraduationCap
} from 'lucide-react';
import { Student } from '../../types';

interface StudentsViewProps {
  students: Student[];
  onOpenAddModal: () => void;
  onSelectStudent: (student: Student) => void;
  onDeleteStudent?: (studentId: string) => Promise<void> | void;
}

export const StudentsView: React.FC<StudentsViewProps> = ({
  students,
  onOpenAddModal,
  onSelectStudent,
  onDeleteStudent,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterDepartment, setFilterDepartment] = useState('all');

  const filteredStudents = students.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.rollNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = filterDepartment === 'all' || s.department === filterDepartment;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Top Banner / Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#15161a] border border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#ea5d38]/15 border border-[#ea5d38]/25 flex items-center justify-center text-[#ea5d38]">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">Registered Students</h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-white/[0.06] text-gray-300">
                {students.length} Total
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Enrolled students with biometric facial templates for CSE302
            </p>
          </div>
        </div>

        {/* Add Student Button */}
        <button
          id="add-student-btn"
          onClick={onOpenAddModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs text-[#0e0f12] bg-[#ea5d38] hover:bg-[#f2724f] active:scale-[0.98] transition-all shadow-md self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4 text-[#0e0f12]" />
          <span>Enroll New Student</span>
        </button>
      </div>

      {/* Filter and View Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search student by name or roll number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#15161a] text-xs text-white placeholder-gray-500 rounded-xl pl-9 pr-3 py-2 border border-white/[0.06] focus:outline-none focus:border-white/[0.2]"
          />
        </div>

        {/* Right filters & View toggle */}
        <div className="flex items-center gap-2">
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="bg-[#15161a] border border-white/[0.06] text-xs text-gray-300 rounded-xl px-3 py-2 focus:outline-none"
          >
            <option value="all">All Departments</option>
            <option value="Data Science & AI">Data Science & AI</option>
            <option value="Computer Science">Computer Science</option>
          </select>

          <div className="flex items-center p-1 rounded-xl bg-[#15161a] border border-white/[0.06]">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-[#22242a] text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
              title="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-[#22242a] text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Empty State when no students are enrolled */}
      {filteredStudents.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl bg-[#15161a] border border-white/[0.06]">
          <div className="w-14 h-14 rounded-2xl bg-[#ea5d38]/15 border border-[#ea5d38]/25 text-[#ea5d38] flex items-center justify-center mb-3">
            <Users className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">No students enrolled yet</h3>
          <p className="text-xs text-gray-400 mb-5 max-w-sm leading-relaxed">
            Enroll your first students with real facial biometric templates from the webcam to start tracking classroom attendance.
          </p>
          <button
            id="empty-add-student-btn"
            onClick={onOpenAddModal}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs text-white bg-[#ea5d38] hover:bg-[#fa6d48] active:scale-98 transition-all cursor-pointer shadow-lg shadow-[#ea5d38]/20"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Student</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredStudents.map((student) => {
            return (
              <div
                key={student.id}
                onClick={() => onSelectStudent(student)}
                className="group relative flex flex-col p-4 rounded-2xl bg-[#15161a] border border-white/[0.06] hover:border-white/[0.15] transition-all cursor-pointer shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="relative">
                    <img 
                      src={student.avatar} 
                      alt={student.name}
                      className="w-12 h-12 rounded-xl object-cover border border-white/10 group-hover:border-[#ea5d38] transition-colors"
                    />
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#15161a]" />
                  </div>

                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Enrolled
                  </span>
                </div>

                <div className="flex flex-col mt-3 min-w-0">
                  <span className="text-sm font-bold text-white group-hover:text-[#ea5d38] transition-colors truncate">
                    {student.name}
                  </span>
                  <span className="text-[11px] font-mono text-gray-400">
                    {student.rollNumber}
                  </span>
                  <span className="text-[11px] text-gray-500 truncate mt-0.5">
                    {student.department}
                  </span>
                </div>

                {/* Metrics bar */}
                <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-500">Attendance</span>
                    <span className="font-mono font-bold text-white">{student.presencePercentage}%</span>
                  </div>

                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-gray-500">Confidence</span>
                    <span className="font-mono text-emerald-400 font-semibold">{student.confidence}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List mode */
        <div className="flex flex-col divide-y divide-white/[0.04] rounded-2xl bg-[#15161a] border border-white/[0.06] overflow-hidden">
          {filteredStudents.map((student) => (
            <div
              key={student.id}
              onClick={() => onSelectStudent(student)}
              className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.025] transition-colors cursor-pointer text-xs"
            >
              <div className="flex items-center gap-3">
                <img src={student.avatar} alt={student.name} className="w-8 h-8 rounded-full object-cover border border-white/10" />
                <div className="flex flex-col">
                  <span className="font-semibold text-white">{student.name}</span>
                  <span className="text-[11px] text-gray-400 font-mono">{student.rollNumber} • {student.department}</span>
                </div>
              </div>

              <div className="flex items-center gap-6 font-mono">
                <span className="text-emerald-400 font-semibold">{student.presencePercentage}% Presence</span>
                <span className="text-gray-400">Match: {student.confidence}%</span>
                <button className="p-1 rounded-lg text-gray-400 hover:text-white">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
