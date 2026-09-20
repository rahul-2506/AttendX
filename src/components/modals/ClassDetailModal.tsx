import React, { useState, useEffect } from 'react';
import {
  X,
  BookOpen,
  Users,
  Calendar,
  History,
  BarChart3,
  Plus,
  Upload,
  Play,
  Trash2,
  CheckCircle2,
  Clock,
  MapPin,
  Camera,
  AlertTriangle,
  TrendingUp,
  UserCheck
} from 'lucide-react';
import { ClassCourse, Student, TimetableEntry, ClassAnalytics } from '../../types';
import { apiService } from '../../services/api';
import { ImportStudentsModal } from './ImportStudentsModal';

interface ClassDetailModalProps {
  classId: string;
  isOpen: boolean;
  onClose: () => void;
  onStartSession: (classId: string) => void;
  onOpenAddStudentModal: (classId: string) => void;
}

export const ClassDetailModal: React.FC<ClassDetailModalProps> = ({
  classId,
  isOpen,
  onClose,
  onStartSession,
  onOpenAddStudentModal
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'timetable' | 'history' | 'analytics'>('overview');
  const [classData, setClassData] = useState<ClassCourse | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<ClassAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);

  // New timetable entry form state
  const [newDay, setNewDay] = useState<number>(0);
  const [newStartTime, setNewStartTime] = useState('02:00 PM');
  const [newEndTime, setNewEndTime] = useState('03:00 PM');
  const [newRoom, setNewRoom] = useState('');
  const [addingSlot, setAddingSlot] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cls, stList, sessList, anly] = await Promise.all([
        apiService.getClass(classId),
        apiService.getClassStudents(classId),
        apiService.getClassSessions(classId),
        apiService.getClassAnalytics(classId)
      ]);
      setClassData(cls);
      setStudents(stList);
      setSessions(sessList);
      setAnalytics(anly);
      if (cls) setNewRoom(cls.room);
    } catch (err) {
      console.error('Failed to load class details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && classId) {
      loadData();
    }
  }, [isOpen, classId]);

  if (!isOpen) return null;

  const handleUnenroll = async (studentId: string, studentName: string) => {
    if (!confirm(`Remove ${studentName} from this class roster?`)) return;
    try {
      await apiService.unenrollStudent(classId, studentId);
      setStudents((prev) => prev.filter((s) => s.id !== studentId));
    } catch (err) {
      console.error('Failed to unenroll student:', err);
    }
  };

  const handleAddTimetableSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setAddingSlot(true);
      await fetch(`http://localhost:8000/api/classes/${classId}/timetable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          day_of_week: Number(newDay),
          start_time: newStartTime,
          end_time: newEndTime,
          room: newRoom || classData?.room || 'AB3-204'
        })
      });
      await loadData();
    } catch (err) {
      console.error('Failed to add timetable slot:', err);
    } finally {
      setAddingSlot(false);
    }
  };

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-5xl max-h-[90vh] rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-coral-500/15 border border-coral-500/30 flex items-center justify-center text-coral-400 font-bold font-mono text-sm">
              {classData?.course_code || 'CLS'}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-mono font-semibold text-coral-400 bg-coral-500/10 px-2 py-0.5 rounded border border-coral-500/20">
                  {classData?.course_code}
                </span>
                <span className="text-xs text-zinc-400 font-medium">{classData?.section}</span>
                <span className="text-zinc-600">•</span>
                <span className="text-xs text-zinc-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-zinc-400" />
                  {classData?.room}
                </span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">{classData?.name || 'Class Details'}</h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                onClose();
                onStartSession(classId);
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-coral-500 to-amber-500 hover:from-coral-600 hover:to-amber-600 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-coral-950/40 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Start Live Session
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation Capsule */}
        <div className="px-6 py-2.5 bg-zinc-950/40 border-b border-zinc-800/80 flex items-center gap-2 overflow-x-auto">
          {[
            { key: 'overview', label: 'Overview', icon: BookOpen },
            { key: 'students', label: `Students (${students.length})`, icon: Users },
            { key: 'timetable', label: 'Timetable', icon: Calendar },
            { key: 'history', label: `Attendance History (${sessions.length})`, icon: History },
            { key: 'analytics', label: 'Class Analytics', icon: BarChart3 }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-coral-400' : 'text-zinc-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-6 h-6 border-2 border-coral-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800">
                      <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-1">Enrolled Students</div>
                      <div className="text-2xl font-bold text-zinc-100">{students.length}</div>
                      <div className="text-xs text-zinc-400 mt-1">Eligible for AI recognition</div>
                    </div>

                    <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800">
                      <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-1">Face Biometrics</div>
                      <div className="text-2xl font-bold text-emerald-400">
                        {students.filter((s) => s.faceRegistered).length} / {students.length}
                      </div>
                      <div className="text-xs text-zinc-400 mt-1">Ready for live camera tracking</div>
                    </div>

                    <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800">
                      <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-1">Sessions Held</div>
                      <div className="text-2xl font-bold text-zinc-100">{sessions.length}</div>
                      <div className="text-xs text-zinc-400 mt-1">Total completed lectures</div>
                    </div>

                    <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800">
                      <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-1">Avg Presence</div>
                      <div className="text-2xl font-bold text-coral-400">{analytics?.average_presence_percentage || 0}%</div>
                      <div className="text-xs text-zinc-400 mt-1">Class average active duration</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Class Info Card */}
                    <div className="p-5 rounded-xl bg-zinc-950/50 border border-zinc-800 space-y-3">
                      <h3 className="text-sm font-semibold text-zinc-200">Course Information</h3>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
                          <span className="text-zinc-400">Course Code:</span>
                          <span className="text-zinc-200 font-mono font-medium">{classData?.course_code}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
                          <span className="text-zinc-400">Section:</span>
                          <span className="text-zinc-200">{classData?.section}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
                          <span className="text-zinc-400">Classroom / Lab:</span>
                          <span className="text-zinc-200">{classData?.room}</span>
                        </div>
                        <div className="flex justify-between py-1.5">
                          <span className="text-zinc-400">Instructor:</span>
                          <span className="text-zinc-200 font-semibold">{classData?.teacher_name || 'Prof. Rahul M.'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Roster Snapshot */}
                    <div className="p-5 rounded-xl bg-zinc-950/50 border border-zinc-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-zinc-200">Enrolled Roster ({students.length})</h3>
                        <button
                          onClick={() => setActiveTab('students')}
                          className="text-xs text-coral-400 hover:text-coral-300 font-medium"
                        >
                          Manage Students →
                        </button>
                      </div>

                      {students.length === 0 ? (
                        <div className="text-center py-6 text-zinc-400 text-xs">
                          No students enrolled yet in this class.
                          <div className="mt-2 flex justify-center gap-2">
                            <button
                              onClick={() => onOpenAddStudentModal(classId)}
                              className="px-3 py-1.5 rounded-lg bg-coral-500 hover:bg-coral-600 text-white font-medium"
                            >
                              + Add Student
                            </button>
                            <button
                              onClick={() => setShowImportModal(true)}
                              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium"
                            >
                              Import CSV
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {students.slice(0, 4).map((s) => (
                            <div key={s.id} className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/60 text-xs">
                              <div className="flex items-center gap-2.5">
                                <img src={s.avatar} alt={s.name} className="w-6 h-6 rounded-full object-cover" />
                                <div>
                                  <div className="font-medium text-zinc-200">{s.name}</div>
                                  <div className="text-[10px] text-zinc-400 font-mono">{s.rollNumber}</div>
                                </div>
                              </div>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                s.faceRegistered ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400'
                              }`}>
                                {s.faceRegistered ? 'Face Enrolled' : 'No Face Sample'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: STUDENTS */}
              {activeTab === 'students' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-200">Class Enrolled Students</h3>
                      <p className="text-xs text-zinc-400">Students registered in this course eligible for attendance tracking</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowImportModal(true)}
                        className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 border border-zinc-700 cursor-pointer transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Import CSV
                      </button>
                      <button
                        onClick={() => onOpenAddStudentModal(classId)}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-coral-500 to-amber-500 hover:from-coral-600 hover:to-amber-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-coral-950/30 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Student
                      </button>
                    </div>
                  </div>

                  {students.length === 0 ? (
                    <div className="text-center py-16 px-4 rounded-2xl border border-zinc-800 bg-zinc-950/40">
                      <Users className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
                      <h4 className="text-sm font-semibold text-zinc-300">No Students Enrolled in this Class</h4>
                      <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                        Add individual students or import a batch CSV list to register students for {classData?.name}.
                      </p>
                      <div className="mt-4 flex justify-center gap-3">
                        <button
                          onClick={() => onOpenAddStudentModal(classId)}
                          className="px-4 py-2 rounded-xl bg-coral-500 hover:bg-coral-600 text-white text-xs font-semibold"
                        >
                          + Add First Student
                        </button>
                        <button
                          onClick={() => setShowImportModal(true)}
                          className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold"
                        >
                          Import Students CSV
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 uppercase font-semibold text-[10px] tracking-wider">
                          <tr>
                            <th className="px-4 py-3">Student Name</th>
                            <th className="px-4 py-3">Roll / ID</th>
                            <th className="px-4 py-3">Department</th>
                            <th className="px-4 py-3">Biometrics</th>
                            <th className="px-4 py-3">Presence Rate</th>
                            <th className="px-4 py-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/60">
                          {students.map((s) => (
                            <tr key={s.id} className="hover:bg-zinc-900/50 transition-colors">
                              <td className="px-4 py-3 font-medium text-zinc-200 flex items-center gap-3">
                                <img src={s.avatar} alt={s.name} className="w-7 h-7 rounded-full object-cover border border-zinc-700" />
                                <div>
                                  <div>{s.name}</div>
                                  <div className="text-[10px] text-zinc-400">{s.email}</div>
                                </div>
                              </td>
                              <td className="px-4 py-3 font-mono text-zinc-300 font-semibold">{s.rollNumber}</td>
                              <td className="px-4 py-3 text-zinc-400">{s.department}</td>
                              <td className="px-4 py-3">
                                {s.faceRegistered ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                    <CheckCircle2 className="w-3 h-3" /> Enrolled
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                    <Camera className="w-3 h-3" /> Pending Face
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <span className="font-semibold text-zinc-200">{s.presencePercentage}%</span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => handleUnenroll(s.id, s.name)}
                                  className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                                  title="Unenroll from this class"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: TIMETABLE */}
              {activeTab === 'timetable' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-200">Weekly Scheduled Time Slots</h3>
                    <p className="text-xs text-zinc-400">Class timetable determines when this session appears on Today's Schedule</p>
                  </div>

                  {/* Existing Slots */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {classData?.timetable && classData.timetable.length > 0 ? (
                      classData.timetable.map((tt) => (
                        <div key={tt.id} className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-coral-500/15 text-coral-400 border border-coral-500/30">
                              {dayNames[tt.day_of_week] || 'Weekday'}
                            </span>
                            <span className="text-xs font-mono font-medium text-zinc-300">
                              {tt.start_time} – {tt.end_time}
                            </span>
                          </div>
                          <div className="text-xs text-zinc-400 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                            {tt.room || classData.room}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full py-8 text-center text-xs text-zinc-500">
                        No timetable entries defined yet.
                      </div>
                    )}
                  </div>

                  {/* Add New Timetable Entry Form */}
                  <div className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 space-y-4">
                    <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">Add Timetable Slot</h4>
                    <form onSubmit={handleAddTimetableSlot} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Day of Week</label>
                        <select
                          value={newDay}
                          onChange={(e) => setNewDay(Number(e.target.value))}
                          className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-coral-500"
                        >
                          {dayNames.map((name, idx) => (
                            <option key={idx} value={idx}>{name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Start Time</label>
                        <input
                          type="text"
                          value={newStartTime}
                          onChange={(e) => setNewStartTime(e.target.value)}
                          placeholder="02:00 PM"
                          className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-coral-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-400 mb-1">End Time</label>
                        <input
                          type="text"
                          value={newEndTime}
                          onChange={(e) => setNewEndTime(e.target.value)}
                          placeholder="03:00 PM"
                          className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-coral-500"
                        />
                      </div>

                      <div className="flex items-end">
                        <button
                          type="submit"
                          disabled={addingSlot}
                          className="w-full py-2 px-4 rounded-xl bg-zinc-800 hover:bg-coral-500 hover:text-white text-zinc-200 text-xs font-semibold transition-all cursor-pointer border border-zinc-700 flex items-center justify-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Schedule Slot
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* TAB 4: HISTORY */}
              {activeTab === 'history' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-200">Past Class Attendance Sessions</h3>
                      <p className="text-xs text-zinc-400">Audit logs and attendance archives for {classData?.name}</p>
                    </div>
                  </div>

                  {sessions.length === 0 ? (
                    <div className="text-center py-16 px-4 rounded-2xl border border-zinc-800 bg-zinc-950/40">
                      <History className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
                      <h4 className="text-sm font-semibold text-zinc-300">No Past Sessions Yet</h4>
                      <p className="text-xs text-zinc-400 mt-1">
                        When you start and end a live class session, historical presence logs will be preserved here.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sessions.map((sess) => (
                        <div
                          key={sess.id}
                          className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-zinc-200 text-sm">
                                {new Date(sess.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                              <span className="text-xs text-zinc-400 font-mono">
                                ({new Date(sess.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-800 text-zinc-300">
                                {sess.duration_minutes || 60} mins
                              </span>
                            </div>
                            <div className="text-xs text-zinc-400">
                              Room: {sess.room} • Instructor: {sess.instructor}
                            </div>
                          </div>

                          <div className="flex items-center gap-6 text-xs">
                            <div>
                              <div className="text-zinc-400">Present</div>
                              <div className="font-bold text-emerald-400">{sess.students_present} / {sess.total_enrolled}</div>
                            </div>
                            <div>
                              <div className="text-zinc-400">Away / Prolonged</div>
                              <div className="font-bold text-amber-400">{sess.temporarily_away + sess.prolonged_absence}</div>
                            </div>
                            <div>
                              <div className="text-zinc-400">Avg Presence</div>
                              <div className="font-bold text-coral-400">{sess.average_presence}%</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: ANALYTICS */}
              {activeTab === 'analytics' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800">
                      <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-1">Average Attendance Rate</div>
                      <div className="text-2xl font-bold text-emerald-400">{analytics?.average_attendance_rate || 0}%</div>
                    </div>
                    <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800">
                      <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-1">Average Active Presence</div>
                      <div className="text-2xl font-bold text-coral-400">{analytics?.average_presence_percentage || 0}%</div>
                    </div>
                    <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800">
                      <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-1">Average Away Time</div>
                      <div className="text-2xl font-bold text-amber-400">{analytics?.average_away_minutes || 0}m</div>
                    </div>
                    <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800">
                      <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-1">Prolonged Absences Flagged</div>
                      <div className="text-2xl font-bold text-red-400">{analytics?.prolonged_absence_count || 0}</div>
                    </div>
                  </div>

                  {/* Top and Low Attendees */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="p-5 rounded-xl bg-zinc-950/50 border border-zinc-800 space-y-3">
                      <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                        Highest Attendance Students
                      </h4>
                      {analytics?.top_attendees && analytics.top_attendees.length > 0 ? (
                        <div className="space-y-2 text-xs">
                          {analytics.top_attendees.map((s) => (
                            <div key={s.id} className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/60">
                              <span className="font-medium text-zinc-200">{s.name} ({s.roll_number})</span>
                              <span className="font-bold text-emerald-400">{s.presence_percentage}%</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-zinc-400 py-4 text-center">No attendance session data yet</div>
                      )}
                    </div>

                    <div className="p-5 rounded-xl bg-zinc-950/50 border border-zinc-800 space-y-3">
                      <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        Low Presence / At-Risk
                      </h4>
                      {analytics?.low_attendees && analytics.low_attendees.length > 0 ? (
                        <div className="space-y-2 text-xs">
                          {analytics.low_attendees.map((s) => (
                            <div key={s.id} className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/60">
                              <span className="font-medium text-zinc-200">{s.name} ({s.roll_number})</span>
                              <span className="font-bold text-amber-400">{s.presence_percentage}%</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-zinc-400 py-4 text-center">No attendance session data yet</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* CSV Import Modal */}
      {showImportModal && classData && (
        <ImportStudentsModal
          classId={classId}
          className={classData.name}
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            loadData();
          }}
        />
      )}
    </div>
  );
};
