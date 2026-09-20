import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Users, 
  Download, 
  ChevronRight, 
  CheckCircle2, 
  Search, 
  FileSpreadsheet,
  BookOpen,
  MapPin,
  Filter
} from 'lucide-react';
import { ClassSession, ClassCourse } from '../../types';
import { apiService } from '../../services/api';

interface AttendanceHistoryViewProps {
  onOpenExportModal: () => void;
  onSelectSession: (session: ClassSession) => void;
}

export const AttendanceHistoryView: React.FC<AttendanceHistoryViewProps> = ({
  onOpenExportModal,
  onSelectSession,
}) => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [classes, setClasses] = useState<ClassCourse[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [sessData, classList] = await Promise.all([
          apiService.listSessions(selectedClassId !== 'all' ? selectedClassId : undefined),
          apiService.getClasses()
        ]);
        if (sessData) setSessions(sessData);
        if (classList) setClasses(classList);
      } catch (err) {
        console.warn('Could not load session history');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [selectedClassId]);

  const filteredSessions = sessions.filter((s) => {
    const name = s.course_name || s.courseName || '';
    const code = s.course_code || s.courseCode || '';
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          code.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-950/80 border border-zinc-800 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-coral-500/10 border border-coral-500/20 flex items-center justify-center text-coral-400">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">Classroom Attendance History</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
                {sessions.length} Completed Sessions
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Class-scoped historical presence archives and attendance records
            </p>
          </div>
        </div>

        <button
          onClick={onOpenExportModal}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs text-white bg-gradient-to-r from-coral-500 to-amber-500 hover:from-coral-600 hover:to-amber-600 shadow-lg shadow-coral-950/40 transition-all self-start sm:self-auto cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Export Master CSV Report</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search sessions by subject or course code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900 text-xs text-white placeholder-zinc-500 rounded-xl pl-10 pr-3.5 py-2.5 border border-zinc-800 focus:outline-none focus:border-coral-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-400">
            <Filter className="w-3.5 h-3.5 text-zinc-400" />
            <span>Class:</span>
            <select 
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="bg-transparent text-xs text-zinc-200 font-medium focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-zinc-900 text-zinc-200">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id} className="bg-zinc-900 text-zinc-200">
                  {c.course_code} - {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Sessions List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-zinc-900/40 border border-zinc-800 animate-pulse" />
          ))}
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="text-center py-20 px-4 rounded-2xl border border-zinc-800 bg-zinc-900/30">
          <BookOpen className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-zinc-300">No Historical Sessions Found</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            Completed classroom attendance sessions for this course filter will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSessions.map((session) => {
            const courseName = session.course_name || session.courseName || 'Operating Systems';
            const courseCode = session.course_code || session.courseCode || 'CSE302';
            const section = session.section || 'Section B';
            const room = session.room || 'AB3-204';
            const totalEnrolled = session.total_enrolled || session.totalEnrolled || 0;
            const studentsPresent = session.students_present ?? session.studentsPresent ?? 0;
            const away = (session.temporarily_away ?? session.temporarilyAway ?? 0) + (session.prolonged_absence ?? session.prolongedAbsence ?? 0);
            const avgPresence = session.average_presence ?? session.averagePresence ?? 0;
            const dateStr = session.start_time 
              ? new Date(session.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : 'Recent Session';

            return (
              <div
                key={session.id}
                onClick={() => onSelectSession(session as any)}
                className="group p-5 rounded-2xl border border-zinc-800/80 hover:border-zinc-700 bg-zinc-900/50 hover:bg-zinc-900/80 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-zinc-800 border border-zinc-700/60 flex items-center justify-center font-mono font-bold text-coral-400 text-xs">
                    {courseCode.substring(0, 3)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-xs font-semibold text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded">
                        {courseCode}
                      </span>
                      <span className="text-xs text-zinc-400">{section}</span>
                      <span className="text-zinc-600">•</span>
                      <span className="text-xs text-zinc-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-zinc-400" />
                        {room}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white group-hover:text-coral-400 transition-colors">
                      {courseName}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-6 text-xs">
                  <div>
                    <div className="text-zinc-400">Date</div>
                    <div className="font-semibold text-zinc-200">{dateStr}</div>
                  </div>

                  <div>
                    <div className="text-zinc-400">Present</div>
                    <div className="font-bold text-emerald-400">
                      {studentsPresent} <span className="text-zinc-500 font-normal">/ {totalEnrolled}</span>
                    </div>
                  </div>

                  <div>
                    <div className="text-zinc-400">Avg Presence</div>
                    <div className="font-bold text-coral-400">{avgPresence}%</div>
                  </div>

                  <div className="p-2 rounded-xl bg-zinc-800/60 text-zinc-400 group-hover:text-white transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
