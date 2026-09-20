import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  BookOpen,
  Users,
  MapPin,
  Play,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  AlertCircle,
  Radio,
  Plus
} from 'lucide-react';
import { TodayScheduleData, TodayScheduleItem, ClassCourse } from '../../types';
import { apiService } from '../../services/api';

interface TodayScheduleViewProps {
  onStartSession: (classId: string, item: TodayScheduleItem) => void;
  onViewClass: (classId: string) => void;
  onNavigateToLive: () => void;
  activeSessionId?: string | null;
}

export const TodayScheduleView: React.FC<TodayScheduleViewProps> = ({
  onStartSession,
  onViewClass,
  onNavigateToLive,
  activeSessionId
}) => {
  const [scheduleData, setScheduleData] = useState<TodayScheduleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedForStart, setSelectedForStart] = useState<TodayScheduleItem | null>(null);
  const [starting, setStarting] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');

  const loadSchedule = async () => {
    try {
      setLoading(true);
      const data = await apiService.getTodaySchedule();
      setScheduleData(data);
    } catch (err) {
      console.error('Failed to load today schedule:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedule();
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleConfirmStart = async () => {
    if (!selectedForStart) return;
    try {
      setStarting(true);
      await apiService.startClassSession(selectedForStart.class_id);
      onStartSession(selectedForStart.class_id, selectedForStart);
      setSelectedForStart(null);
    } catch (err) {
      console.error('Failed to start session:', err);
      alert('Could not start class session. Please try again.');
    } finally {
      setStarting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse">
            <Radio className="w-3 h-3 animate-spin" /> LIVE NOW
          </span>
        );
      case 'NOW':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-coral-500/20 text-coral-400 border border-coral-500/30">
            <Clock className="w-3 h-3" /> SCHEDULED NOW
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700/50">
            <CheckCircle2 className="w-3 h-3 text-zinc-400" /> COMPLETED
          </span>
        );
      case 'UPCOMING':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/20">
            <Clock className="w-3 h-3" /> UPCOMING
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Teacher Hero Header */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-gradient-to-r from-zinc-900/90 via-zinc-900/50 to-zinc-950 p-6 md:p-8 backdrop-blur-md">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-coral-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-coral-500/10 text-coral-400 border border-coral-500/20 tracking-wide uppercase">
                Faculty Classroom Hub
              </span>
              <span className="text-zinc-500 text-sm">•</span>
              <span className="text-zinc-400 text-sm flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                {scheduleData?.date_str || new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Today's Scheduled Classes
            </h1>
            <p className="text-zinc-400 text-sm mt-1">
              Welcome back, <span className="text-zinc-200 font-medium">Prof. Rahul M.</span> Select a class from your timetable to launch real-time vision attendance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Live Clock Card */}
            <div className="px-4 py-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <div>
                <div className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider">Classroom Clock</div>
                <div className="text-lg font-mono font-bold text-zinc-100">{currentTime || '14:00:00'}</div>
              </div>
            </div>

            {/* Quick Resume if Active Session */}
            {scheduleData?.active_session && (
              <button
                onClick={onNavigateToLive}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium text-sm flex items-center gap-2 shadow-lg shadow-emerald-950/40 hover:from-emerald-500 hover:to-teal-500 transition-all cursor-pointer"
              >
                <Radio className="w-4 h-4 animate-pulse" />
                Resume Live Class
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Classes Timetable Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-zinc-200">Daily Timetable Schedule</h2>
            <span className="px-2 py-0.5 rounded-full text-xs bg-zinc-800 text-zinc-400 font-medium">
              {scheduleData?.classes.length || 0} Slots
            </span>
          </div>
          <button
            onClick={loadSchedule}
            className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Refresh Schedule
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-56 rounded-2xl bg-zinc-900/40 border border-zinc-800 animate-pulse" />
            ))}
          </div>
        ) : scheduleData?.classes && scheduleData.classes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {scheduleData.classes.map((item) => {
              const isClassActive = item.status === 'ACTIVE' || (activeSessionId && item.active_session_id === activeSessionId);
              
              return (
                <div
                  key={item.timetable_id}
                  className={`group relative rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden p-6 ${
                    isClassActive
                      ? 'bg-zinc-900/90 border-emerald-500/40 shadow-lg shadow-emerald-950/20'
                      : item.status === 'NOW'
                      ? 'bg-zinc-900/70 border-coral-500/40 hover:border-coral-500/60 shadow-lg shadow-coral-950/20'
                      : 'bg-zinc-900/50 border-zinc-800/80 hover:border-zinc-700/80 hover:bg-zinc-900/70'
                  }`}
                >
                  {/* Top Bar with Course Code and Status */}
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-zinc-800 text-zinc-200 border border-zinc-700/60">
                            {item.course_code}
                          </span>
                          <span className="text-xs text-zinc-400 font-medium">{item.section}</span>
                        </div>
                        <h3 className="text-lg font-bold text-zinc-100 group-hover:text-coral-400 transition-colors">
                          {item.course_name}
                        </h3>
                      </div>
                      {getStatusBadge(isClassActive ? 'ACTIVE' : item.status)}
                    </div>

                    {/* Class Details Info */}
                    <div className="space-y-2.5 py-3 border-y border-zinc-800/60 text-sm">
                      <div className="flex items-center justify-between text-zinc-400">
                        <span className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-zinc-400" />
                          Time Slot
                        </span>
                        <span className="text-zinc-200 font-medium font-mono text-xs">
                          {item.start_time} – {item.end_time}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-zinc-400">
                        <span className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-zinc-400" />
                          Room / Lab
                        </span>
                        <span className="text-zinc-200 font-medium">{item.room}</span>
                      </div>

                      <div className="flex items-center justify-between text-zinc-400">
                        <span className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-zinc-400" />
                          Enrolled Roster
                        </span>
                        <span className="text-zinc-200 font-semibold">
                          {item.enrolled_count > 0 ? `${item.enrolled_count} Students` : '0 Students (Empty)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-5 pt-1 flex items-center gap-2.5">
                    {isClassActive ? (
                      <button
                        onClick={onNavigateToLive}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-950/30"
                      >
                        <Radio className="w-3.5 h-3.5" />
                        Live Classroom Active
                      </button>
                    ) : (
                      <button
                        onClick={() => setSelectedForStart(item)}
                        className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          item.status === 'NOW'
                            ? 'bg-gradient-to-r from-coral-500 to-amber-500 hover:from-coral-600 hover:to-amber-600 text-white shadow-lg shadow-coral-950/30'
                            : 'bg-zinc-800 hover:bg-coral-500 hover:text-white text-zinc-200 border border-zinc-700/60'
                        }`}
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Start Session
                      </button>
                    )}

                    <button
                      onClick={() => onViewClass(item.class_id)}
                      className="p-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border border-zinc-700/50 transition-colors cursor-pointer"
                      title="View Class Roster & Details"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 px-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/30">
            <BookOpen className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-zinc-300">No Classes Scheduled for Today</h3>
            <p className="text-sm text-zinc-500 mt-1 max-w-sm mx-auto">
              Your timetable is clear for today. You can manage courses or enroll students in the Classes tab.
            </p>
          </div>
        )}
      </div>

      {/* Start Session Confirmation Modal */}
      {selectedForStart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-coral-500/15 border border-coral-500/30 flex items-center justify-center text-coral-400">
                <Play className="w-5 h-5 fill-current" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Start Classroom Session</h3>
                <p className="text-xs text-zinc-400">Initialize attendance tracking for this class</p>
              </div>
            </div>

            <div className="rounded-xl bg-zinc-950/80 border border-zinc-800 p-4 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400">Subject / Course:</span>
                <span className="text-zinc-100 font-semibold">{selectedForStart.course_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Course Code:</span>
                <span className="text-zinc-100 font-mono font-medium">{selectedForStart.course_code} ({selectedForStart.section})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Room:</span>
                <span className="text-zinc-100">{selectedForStart.room}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Scheduled Time:</span>
                <span className="text-zinc-100 font-mono text-xs">{selectedForStart.start_time} – {selectedForStart.end_time}</span>
              </div>
              <div className="flex justify-between border-t border-zinc-800 pt-2">
                <span className="text-zinc-400">Eligible Enrolled Students:</span>
                <span className="text-coral-400 font-bold">{selectedForStart.enrolled_count} Students</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5 text-xs text-amber-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <span>
                The AI vision engine will <strong>ONLY</strong> recognize students enrolled in {selectedForStart.course_name}. Un-enrolled individuals will be flagged as Unknown.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedForStart(null)}
                disabled={starting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmStart}
                disabled={starting}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-coral-500 to-amber-500 hover:from-coral-600 hover:to-amber-600 text-white shadow-lg shadow-coral-950/40 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {starting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Starting Session...
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Start Class Session
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
