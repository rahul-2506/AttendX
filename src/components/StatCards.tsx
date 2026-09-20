import React from 'react';
import { 
  Users, 
  Clock, 
  AlertTriangle, 
  ArrowUpRight,
  TrendingDown
} from 'lucide-react';

interface StatCardsProps {
  presentCount?: number;
  awayCount?: number;
  prolongedCount?: number;
  totalEnrolled?: number;
  onFilterStatus?: (status: string) => void;
}

export const StatCards: React.FC<StatCardsProps> = ({
  presentCount = 47,
  awayCount = 2,
  prolongedCount = 1,
  totalEnrolled = 50,
  onFilterStatus,
}) => {
  return (
    <div className="flex flex-wrap lg:flex-nowrap items-center gap-3.5 select-none">
      {/* 1. Students Present Card */}
      <div 
        id="stat-students-present"
        onClick={() => onFilterStatus && onFilterStatus('present')}
        className="flex-1 min-w-[200px] flex items-center justify-between p-4 rounded-2xl bg-[#18191e] border border-white/[0.06] hover:border-white/[0.12] transition-all cursor-pointer shadow-sm"
      >
        <div className="flex items-center gap-3.5">
          {/* Sub square rounded icon container */}
          <div className="w-12 h-12 rounded-xl bg-[#22242b] border border-white/[0.06] flex items-center justify-center text-emerald-400 shrink-0">
            <Users className="w-5 h-5" />
          </div>

          <div className="flex flex-col">
            <span className="text-[11px] text-gray-400 font-medium">
              Students Present
            </span>
            <span className="text-2xl font-bold font-sans text-white mt-0.5 tracking-tight">
              {presentCount < 10 ? `0${presentCount}` : presentCount}
            </span>
          </div>
        </div>

        {/* Green Delta Trend */}
        <div className="text-[11px] font-semibold text-[#5cd69a] flex items-center gap-0.5 self-end mb-1 font-mono">
          <span>+4.2%</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* 2. Temporarily Away Card */}
      <div 
        id="stat-temporarily-away"
        onClick={() => onFilterStatus && onFilterStatus('away')}
        className="flex-1 min-w-[200px] flex items-center justify-between p-4 rounded-2xl bg-[#18191e] border border-white/[0.06] hover:border-white/[0.12] transition-all cursor-pointer shadow-sm"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#22242b] border border-white/[0.06] flex items-center justify-center text-amber-400 shrink-0">
            <Clock className="w-5 h-5" />
          </div>

          <div className="flex flex-col">
            <span className="text-[11px] text-gray-400 font-medium">
              Temporarily Away
            </span>
            <span className="text-2xl font-bold font-sans text-white mt-0.5 tracking-tight">
              {awayCount < 10 ? `0${awayCount}` : awayCount}
            </span>
          </div>
        </div>

        {/* Amber / Grace Active Delta Trend */}
        <div className="text-[11px] font-semibold text-[#f08b70] flex items-center gap-0.5 self-end mb-1 font-mono">
          <span>&lt; 5 min</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* 3. Prolonged Absence Card */}
      <div 
        id="stat-prolonged-absence"
        onClick={() => onFilterStatus && onFilterStatus('prolonged')}
        className="flex-1 min-w-[200px] flex items-center justify-between p-4 rounded-2xl bg-[#18191e] border border-white/[0.06] hover:border-white/[0.12] transition-all cursor-pointer shadow-sm"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#22242b] border border-white/[0.06] flex items-center justify-center text-red-400 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>

          <div className="flex flex-col">
            <span className="text-[11px] text-gray-400 font-medium">
              Prolonged Absence
            </span>
            <span className="text-2xl font-bold font-sans text-white mt-0.5 tracking-tight">
              {prolongedCount < 10 ? `0${prolongedCount}` : prolongedCount}
            </span>
          </div>
        </div>

        {/* Action Needed Badge */}
        <div className="text-[11px] font-semibold text-[#f08b70] flex items-center gap-0.5 self-end mb-1 font-mono">
          <span>Flagged</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
};
