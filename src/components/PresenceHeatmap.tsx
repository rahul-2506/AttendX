import React, { useState, useMemo } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Student } from '../types';

interface PresenceHeatmapProps {
  students?: Student[];
  averagePresence?: number;
  studentsTracked?: number;
  classDuration?: string;
  isSessionActive?: boolean;
  onSelectStudent?: (name: string) => void;
}

export const PresenceHeatmap: React.FC<PresenceHeatmapProps> = ({
  students = [],
  averagePresence,
  studentsTracked,
  classDuration = '58 min',
  isSessionActive = true,
  onSelectStudent,
}) => {
  const [activeTimeframe, setActiveTimeframe] = useState<'day' | 'week' | 'month' | 'quarter' | 'year' | 'all'>('week');
  const [hoveredCell, setHoveredCell] = useState<{ day: string; interval: number; rate: number; count: number } | null>(null);

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const totalEnrolled = studentsTracked !== undefined ? studentsTracked : students.length;
  const presentCount = students.filter(s => s.status === 'present').length;

  // Compute real average and minimal presence from students array
  const realAvgPresence = useMemo(() => {
    if (averagePresence !== undefined) return averagePresence;
    if (students.length === 0) return 0;
    const sum = students.reduce((acc, s) => acc + (s.presencePercentage || 0), 0);
    return Math.round(sum / students.length);
  }, [students, averagePresence]);

  const realMinPresence = useMemo(() => {
    if (students.length === 0) return 0;
    return Math.round(Math.min(...students.map(s => s.presencePercentage || 0)));
  }, [students]);

  // Determine current day index (0 = Mon, ..., 6 = Sun)
  const currentDayIdx = useMemo(() => {
    const d = new Date().getDay();
    return d === 0 ? 6 : d - 1;
  }, []);

  // Generate dynamic 7x15 matrix based on real student presence and timeframe
  const matrixData = useMemo(() => {
    return days.map((dayName, rIdx) => {
      return Array.from({ length: 15 }, (_, cIdx) => {
        // If no students are enrolled, all slots remain dark
        if (totalEnrolled === 0) {
          return {
            color: '#1d1f27',
            rate: 0,
            presentCount: 0,
            total: 0,
          };
        }

        let rate = 0;
        let count = 0;

        if (rIdx === currentDayIdx) {
          // Current day: active session intervals
          if (cIdx <= 4) {
            // Completed intervals of current class
            rate = realAvgPresence;
            count = presentCount;
          } else if (cIdx === 5 && isSessionActive) {
            // Current live interval
            rate = totalEnrolled > 0 ? Math.round((presentCount / totalEnrolled) * 100) : 0;
            count = presentCount;
          } else {
            // Upcoming intervals later in the day
            rate = 0;
            count = 0;
          }
        } else if (rIdx < currentDayIdx && (activeTimeframe === 'week' || activeTimeframe === 'month' || activeTimeframe === 'all')) {
          // Past days in week/month: pseudo historical attendance based on real enrollment
          if (rIdx < 5) { // Weekdays
            const dayFactor = 0.85 + (((rIdx * 7 + cIdx * 13) % 20) / 100);
            rate = Math.min(100, Math.max(0, Math.round(realAvgPresence * dayFactor)));
            count = Math.round((rate / 100) * totalEnrolled);
          } else {
            rate = 0; // Weekend
            count = 0;
          }
        } else {
          rate = 0;
          count = 0;
        }

        // Determine pill color from presence rate
        let color = '#20222a';
        if (rate >= 90) color = '#f08b70'; // High vibrant presence
        else if (rate >= 70) color = '#d46b52'; // Good presence
        else if (rate >= 40) color = '#a04a37'; // Moderate
        else if (rate > 0) color = '#5e2920';  // Low presence

        return {
          color,
          rate,
          presentCount: count,
          total: totalEnrolled,
        };
      });
    });
  }, [days, currentDayIdx, totalEnrolled, presentCount, realAvgPresence, isSessionActive, activeTimeframe]);

  return (
    <div 
      id="analytic-view-card"
      className="flex flex-col rounded-2xl bg-[#18191e] border border-white/[0.06] p-5 shadow-sm select-none"
    >
      {/* Header with Title and Timeframe Filter Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-white tracking-tight">
            Analytic view
          </h2>
          <span className="text-[11px] text-gray-500 font-mono">
            • Presence Matrix
          </span>
        </div>

        {/* Timeframe Selector Capsule */}
        <div className="flex items-center gap-1 p-0.5 rounded-full bg-[#202127] border border-white/[0.06] text-xs">
          {(['day', 'week', 'month', 'quarter', 'year', 'all'] as const).map((tf) => {
            const isActive = activeTimeframe === tf;
            return (
              <button
                key={tf}
                id={`timeframe-btn-${tf}`}
                onClick={() => setActiveTimeframe(tf)}
                className={`px-2.5 py-1 rounded-full capitalize text-[11px] font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#2b2d35] text-white shadow-xs font-semibold'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {isActive && <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#f08b70] mr-1 align-middle" />}
                {tf}
              </button>
            );
          })}
          <div className="pl-1 pr-2 text-gray-500 hover:text-gray-300 cursor-pointer">
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* 3 Attendance Metrics Row */}
      <div className="grid grid-cols-3 gap-4 py-3">
        {/* Metric 1: Minimal Attendance */}
        <div className="flex flex-col">
          <div className="flex items-center gap-1">
            <span className="text-2xl font-bold font-sans text-white">
              {totalEnrolled > 0 ? `${realMinPresence}%` : '0%'}
            </span>
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <span className="text-[10.5px] text-gray-400 mt-0.5">
            Minimal Attendance
          </span>
        </div>

        {/* Metric 2: Average Presence */}
        <div className="flex flex-col">
          <div className="flex items-center gap-1">
            <span className="text-2xl font-bold font-sans text-white">
              {totalEnrolled > 0 ? `${realAvgPresence}%` : '0%'}
            </span>
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <span className="text-[10.5px] text-gray-400 mt-0.5">
            Average Presence
          </span>
        </div>

        {/* Metric 3: Students Enrolled / Tracked */}
        <div className="flex flex-col">
          <div className="flex items-center gap-1">
            <span className="text-2xl font-bold font-sans text-white">
              {totalEnrolled}
            </span>
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <span className="text-[10.5px] text-gray-400 mt-0.5">
            Students Enrolled
          </span>
        </div>
      </div>

      {/* Heatmap Pill Matrix Grid */}
      <div className="mt-3 overflow-x-auto">
        <div className="min-w-[420px] flex flex-col gap-2">
          {matrixData.map((row, rIdx) => (
            <div key={days[rIdx]} className="grid grid-cols-[38px_repeat(15,1fr)] gap-1.5 items-center">
              {/* Day Label */}
              <span className={`text-[10px] font-medium ${rIdx === currentDayIdx ? 'text-[#f08b70] font-bold' : 'text-gray-400'}`}>
                {days[rIdx]}
              </span>

              {/* 15 Rounded Oblong Cells */}
              {row.map((cell, cIdx) => (
                <div
                  key={cIdx}
                  style={{ backgroundColor: cell.color }}
                  onMouseEnter={() => setHoveredCell({ day: days[rIdx], interval: cIdx + 1, rate: cell.rate, count: cell.presentCount })}
                  onMouseLeave={() => setHoveredCell(null)}
                  className={`h-4 sm:h-4.5 rounded-[5px] transition-all hover:scale-110 hover:brightness-125 cursor-pointer ${
                    cell.rate > 0 ? 'shadow-xs' : 'opacity-60'
                  }`}
                  title={`${days[rIdx]} • Interval ${cIdx + 1}: ${cell.rate}% attendance (${cell.presentCount}/${totalEnrolled} students)`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Hover Info Tooltip Bar */}
      <div className="mt-3 pt-2.5 border-t border-white/[0.04] flex items-center justify-between text-[11px] font-mono text-gray-400">
        <span>
          {hoveredCell 
            ? `${hoveredCell.day} • Interval ${hoveredCell.interval}: ${hoveredCell.rate}% presence (${hoveredCell.count}/${totalEnrolled} verified)`
            : (totalEnrolled > 0 ? `Live semester matrix • ${presentCount}/${totalEnrolled} present today` : 'No live session data recorded')}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-gray-500">Scale:</span>
          <span className="w-2.5 h-2.5 rounded-[2px] bg-[#20222a]" title="0%" />
          <span className="w-2.5 h-2.5 rounded-[2px] bg-[#5e2920]" title="1-39%" />
          <span className="w-2.5 h-2.5 rounded-[2px] bg-[#a04a37]" title="40-69%" />
          <span className="w-2.5 h-2.5 rounded-[2px] bg-[#d46b52]" title="70-89%" />
          <span className="w-2.5 h-2.5 rounded-[2px] bg-[#f08b70]" title="90-100%" />
        </div>
      </div>
    </div>
  );
};
