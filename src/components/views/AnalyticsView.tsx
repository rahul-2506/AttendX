import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { 
  TrendingUp, 
  Clock, 
  Users, 
  Calendar, 
  ArrowUpRight, 
  AlertCircle,
  BarChart3,
  Filter,
  BookOpen
} from 'lucide-react';
import { ClassCourse } from '../../types';
import { apiService } from '../../services/api';

export const AnalyticsView: React.FC = () => {
  const [classes, setClasses] = useState<ClassCourse[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('all');
  const [overview, setOverview] = useState({
    overallAttendance: 0.0,
    overallAttendanceDelta: '+0.0%',
    avgPresenceDurationMinutes: 0.0,
    totalClassDurationMinutes: 60,
    avgQuorumPercentage: 0.0,
    flaggedProlongedCount: 0,
    totalEnrolled: 0,
    totalSessions: 0,
  });

  const [trends, setTrends] = useState<{
    weeklyAttendance: any[];
    statusDistribution: any[];
    departmentBreakdown: any[];
  }>({
    weeklyAttendance: [],
    statusDistribution: [],
    departmentBreakdown: []
  });

  const [classAnalytics, setClassAnalytics] = useState<any | null>(null);

  useEffect(() => {
    apiService.getClasses().then(setClasses);
  }, []);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const classFilter = selectedClassId !== 'all' ? selectedClassId : undefined;
        const [ov, tr, sessions] = await Promise.all([
          apiService.getAnalyticsOverview(classFilter),
          apiService.getAnalyticsTrends(classFilter),
          apiService.listSessions(classFilter)
        ]);

        if (ov) {
          setOverview({
            ...ov,
            totalSessions: sessions ? sessions.length : 0
          });
        }
        if (tr) setTrends(tr);

        if (classFilter) {
          const ca = await apiService.getClassAnalytics(classFilter);
          setClassAnalytics(ca);
        } else {
          setClassAnalytics(null);
        }
      } catch (err) {
        console.warn('Could not load analytics data');
      }
    };

    loadAnalytics();
  }, [selectedClassId]);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Top Header with Class Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-950/80 border border-zinc-800 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-coral-500/10 border border-coral-500/20 flex items-center justify-center text-coral-400">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Classroom & Student Analytics</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Continuous presence metrics, attendance trends, and quorum statistics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-400">
            <Filter className="w-3.5 h-3.5 text-zinc-400" />
            <span>Scope:</span>
            <select 
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="bg-transparent text-xs text-zinc-200 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-zinc-900 text-zinc-200">All Courses (Aggregate)</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id} className="bg-zinc-900 text-zinc-200">
                  {c.course_code} - {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between shadow-lg">
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              Overall Attendance
            </span>
            <span className="text-3xl font-extrabold font-mono text-white mt-1">
              {overview.overallAttendance}%
            </span>
            <span className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
              Class semester average
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between shadow-lg">
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              Avg Presence Duration
            </span>
            <span className="text-3xl font-extrabold font-mono text-white mt-1">
              {overview.avgPresenceDurationMinutes}m
            </span>
            <span className="text-xs text-zinc-400 mt-1">
              Target: {overview.totalClassDurationMinutes}m lecture
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-coral-500/10 border border-coral-500/20 text-coral-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between shadow-lg">
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              Enrolled Students
            </span>
            <span className="text-3xl font-extrabold font-mono text-white mt-1">
              {overview.totalEnrolled}
            </span>
            <span className="text-xs text-zinc-400 mt-1">
              {overview.totalSessions} Total Sessions Run
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between shadow-lg">
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              Prolonged Absences
            </span>
            <span className="text-3xl font-extrabold font-mono text-red-400 mt-1">
              {overview.flaggedProlongedCount}
            </span>
            <span className="text-xs text-zinc-400 mt-1">
              &gt; 10m absence events
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Status Distribution Breakdown */}
        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
          <h3 className="text-sm font-bold text-zinc-200">Attendance State Breakdown</h3>
          <div className="h-64 flex items-center justify-center">
            {trends.statusDistribution.some(s => s.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={trends.statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {trends.statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-xs text-zinc-500">No session attendance data recorded yet</div>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
            {trends.statusDistribution.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-zinc-400">{item.name}:</span>
                <span className="font-bold text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Class Session Trends */}
        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
          <h3 className="text-sm font-bold text-zinc-200">Presence Trend Over Sessions</h3>
          <div className="h-64 flex items-center justify-center">
            {classAnalytics?.session_trends && classAnalytics.session_trends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={classAnalytics.session_trends}>
                  <defs>
                    <linearGradient id="colorPresence" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ea5d38" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#ea5d38" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#71717a" fontSize={11} />
                  <YAxis stroke="#71717a" fontSize={11} domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="average_presence" stroke="#ea5d38" fillOpacity={1} fill="url(#colorPresence)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-xs text-zinc-500">
                Run classroom attendance sessions to generate trend curves.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
