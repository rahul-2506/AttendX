import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Users,
  MapPin,
  Calendar,
  Play,
  Plus,
  ChevronRight,
  MoreVertical,
  Trash2,
  Edit3,
  Layers,
  GraduationCap
} from 'lucide-react';
import { ClassCourse } from '../../types';
import { apiService } from '../../services/api';
import { ClassDetailModal } from '../modals/ClassDetailModal';

interface ClassesViewProps {
  onStartSession: (classId: string) => void;
  onOpenAddStudentModal: (classId: string) => void;
}

export const ClassesView: React.FC<ClassesViewProps> = ({
  onStartSession,
  onOpenAddStudentModal
}) => {
  const [classes, setClasses] = useState<ClassCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Class Form State
  const [newClassName, setNewClassName] = useState('');
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newSection, setNewSection] = useState('Section A');
  const [newRoom, setNewRoom] = useState('AB3-204');
  const [creating, setCreating] = useState(false);

  const loadClasses = async () => {
    try {
      setLoading(true);
      const data = await apiService.getClasses();
      setClasses(data);
    } catch (err) {
      console.error('Failed to load classes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClasses();
  }, []);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim() || !newCourseCode.trim()) return;

    try {
      setCreating(true);
      await apiService.createClass({
        name: newClassName.trim(),
        course_code: newCourseCode.trim().toUpperCase(),
        section: newSection.trim(),
        room: newRoom.trim()
      });
      setShowCreateModal(false);
      setNewClassName('');
      setNewCourseCode('');
      await loadClasses();
    } catch (err) {
      console.error('Failed to create class:', err);
      alert('Error creating class.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteClass = async (classId: string, className: string) => {
    if (!confirm(`Are you sure you want to delete "${className}"? This will remove all enrollments and timetable entries for this course.`)) return;
    try {
      await apiService.deleteClass(classId);
      setClasses((prev) => prev.filter((c) => c.id !== classId));
    } catch (err) {
      console.error('Failed to delete class:', err);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-coral-500/10 text-coral-400 border border-coral-500/20 tracking-wide uppercase">
              Course Management
            </span>
            <span className="text-zinc-500">•</span>
            <span className="text-zinc-400 text-xs font-medium">{classes.length} Permanent Classes</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Faculty Classes & Courses</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Manage your permanent classrooms, student enrollment rosters, and weekly timetables.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-coral-500 to-amber-500 hover:from-coral-600 hover:to-amber-600 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-coral-950/40 cursor-pointer self-start sm:self-auto transition-all"
        >
          <Plus className="w-4 h-4" />
          Create New Class
        </button>
      </div>

      {/* Classes Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-60 rounded-2xl bg-zinc-900/40 border border-zinc-800 animate-pulse" />
          ))}
        </div>
      ) : classes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {classes.map((cls) => (
            <div
              key={cls.id}
              className="group rounded-2xl border border-zinc-800/80 hover:border-zinc-700 bg-zinc-900/50 hover:bg-zinc-900/80 p-6 transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-coral-500/15 border border-coral-500/30 flex items-center justify-center text-coral-400 font-bold font-mono text-xs">
                      {cls.course_code.substring(0, 3)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-mono text-xs font-semibold text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded">
                          {cls.course_code}
                        </span>
                        <span className="text-xs text-zinc-400 font-medium">{cls.section}</span>
                      </div>
                      <h3 className="text-base font-bold text-zinc-100 group-hover:text-coral-400 transition-colors">
                        {cls.name}
                      </h3>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteClass(cls.id, cls.name)}
                    className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                    title="Delete Class"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Class Meta */}
                <div className="space-y-2 py-3 border-y border-zinc-800/60 text-xs text-zinc-400">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                      Room / Lab
                    </span>
                    <span className="text-zinc-200 font-medium">{cls.room}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-zinc-400" />
                      Enrolled Students
                    </span>
                    <span className="text-zinc-200 font-semibold">{cls.enrolled_count} Students</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                      Timetable Slots
                    </span>
                    <span className="text-zinc-200 font-medium">
                      {cls.timetable ? `${cls.timetable.length} weekly sessions` : 'No slots'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-5 pt-1 flex items-center gap-2.5">
                <button
                  onClick={() => setSelectedClassId(cls.id)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-zinc-700/60"
                >
                  <BookOpen className="w-3.5 h-3.5 text-coral-400" />
                  View Class Details
                </button>

                <button
                  onClick={() => onStartSession(cls.id)}
                  className="py-2.5 px-3.5 rounded-xl bg-coral-500/20 hover:bg-coral-500 hover:text-white text-coral-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-coral-500/30"
                  title="Launch Session for this Class"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Start
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 px-4 rounded-2xl border border-zinc-800 bg-zinc-900/30">
          <GraduationCap className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-zinc-300">No Classes Configured Yet</h3>
          <p className="text-sm text-zinc-500 mt-1 max-w-sm mx-auto">
            Create your first class course to start enrolling students and tracking attendance.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 px-5 py-2.5 rounded-xl bg-coral-500 hover:bg-coral-600 text-white font-semibold text-xs inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create First Class
          </button>
        </div>
      )}

      {/* Create New Class Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-coral-500/15 border border-coral-500/30 flex items-center justify-center text-coral-400">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Create New Course / Class</h3>
                <p className="text-xs text-zinc-400">Define course details for your teaching timetable</p>
              </div>
            </div>

            <form onSubmit={handleCreateClass} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Subject / Course Name</label>
                <input
                  type="text"
                  required
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="e.g. Distributed Systems"
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-700 p-2.5 text-zinc-200 focus:outline-none focus:border-coral-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-300 mb-1">Course Code</label>
                  <input
                    type="text"
                    required
                    value={newCourseCode}
                    onChange={(e) => setNewCourseCode(e.target.value)}
                    placeholder="e.g. CSE401"
                    className="w-full rounded-xl bg-zinc-950 border border-zinc-700 p-2.5 font-mono text-zinc-200 focus:outline-none focus:border-coral-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-300 mb-1">Section</label>
                  <input
                    type="text"
                    required
                    value={newSection}
                    onChange={(e) => setNewSection(e.target.value)}
                    placeholder="e.g. Section A"
                    className="w-full rounded-xl bg-zinc-950 border border-zinc-700 p-2.5 text-zinc-200 focus:outline-none focus:border-coral-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Classroom / Lab Location</label>
                <input
                  type="text"
                  required
                  value={newRoom}
                  onChange={(e) => setNewRoom(e.target.value)}
                  placeholder="e.g. AB3-204"
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-700 p-2.5 text-zinc-200 focus:outline-none focus:border-coral-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2.5 rounded-xl font-semibold bg-gradient-to-r from-coral-500 to-amber-500 hover:from-coral-600 hover:to-amber-600 text-white shadow-lg shadow-coral-950/40 cursor-pointer disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Save Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Class Detail Modal */}
      {selectedClassId && (
        <ClassDetailModal
          classId={selectedClassId}
          isOpen={Boolean(selectedClassId)}
          onClose={() => {
            setSelectedClassId(null);
            loadClasses();
          }}
          onStartSession={(cid) => {
            setSelectedClassId(null);
            onStartSession(cid);
          }}
          onOpenAddStudentModal={(cid) => onOpenAddStudentModal(cid)}
        />
      )}
    </div>
  );
};
