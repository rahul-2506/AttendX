import React from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  UserCheck, 
  UserX, 
  PlayCircle, 
  Clock, 
  RotateCcw,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { ActivityEvent } from '../types';

interface ActivityFeedProps {
  events: ActivityEvent[];
  onSelectEvent?: (event: ActivityEvent) => void;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  events,
  onSelectEvent,
}) => {
  const getEventIcon = (type: ActivityEvent['type']) => {
    switch (type) {
      case 'present':
        return <UserCheck className="w-3.5 h-3.5 text-emerald-400" />;
      case 'away':
        return <Clock className="w-3.5 h-3.5 text-amber-400" />;
      case 'prolonged':
        return <AlertTriangle className="w-3.5 h-3.5 text-red-400 animate-pulse" />;
      case 'unknown':
        return <UserX className="w-3.5 h-3.5 text-purple-400" />;
      case 'system':
      default:
        return <PlayCircle className="w-3.5 h-3.5 text-[#ea5d38]" />;
    }
  };

  const getBadgeStyle = (type: ActivityEvent['type']) => {
    switch (type) {
      case 'present':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'away':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'prolonged':
        return 'bg-red-500/15 text-red-300 border-red-500/30';
      case 'unknown':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'system':
      default:
        return 'bg-white/[0.06] text-gray-300 border-white/[0.08]';
    }
  };

  return (
    <div 
      id="recent-activities-card"
      className="flex flex-col rounded-2xl bg-[#15161a] border border-white/[0.06] overflow-hidden shadow-sm p-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-white tracking-tight">
            Recent Activity
          </h2>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-live-pulse" />
        </div>

        <span className="text-[11px] font-mono text-gray-400">
          Real-time Audit Log
        </span>
      </div>

      {/* Events Stream */}
      <div className="flex flex-col divide-y divide-white/[0.04] mt-1 max-h-[300px] overflow-y-auto">
        {events.map((evt) => {
          return (
            <div
              key={evt.id}
              onClick={() => onSelectEvent && onSelectEvent(evt)}
              className="group flex items-center justify-between gap-3 py-3 px-2 rounded-xl hover:bg-white/[0.03] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Tiny Status Icon Box */}
                <div className="w-7 h-7 rounded-lg bg-[#202227] border border-white/[0.06] flex items-center justify-center shrink-0">
                  {getEventIcon(evt.type)}
                </div>

                {/* Event info */}
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-medium text-gray-200 group-hover:text-white transition-colors truncate">
                    {evt.message}
                  </span>
                  <span className="text-[10px] font-mono text-gray-400">
                    {evt.studentId ? `${evt.studentId} • ` : ''}Zone B Camera 1
                  </span>
                </div>
              </div>

              {/* Timestamp & Badge */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-mono text-gray-400">
                  {evt.timestamp}
                </span>

                {evt.badgeText && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border ${getBadgeStyle(evt.type)}`}>
                    {evt.badgeText}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
