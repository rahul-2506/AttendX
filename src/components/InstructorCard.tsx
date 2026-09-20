import React from 'react';
import { MessageSquare, BellRing } from 'lucide-react';

interface InstructorCardProps {
  name?: string;
  role?: string;
  avatarUrl?: string;
  onMessage?: () => void;
  onAlert?: () => void;
}

export const InstructorCard: React.FC<InstructorCardProps> = ({
  name = 'Prof. Rahul M.',
  role = 'Course Instructor',
  avatarUrl = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  onMessage,
  onAlert,
}) => {
  return (
    <div 
      id="instructor-profile-card"
      className="flex items-center justify-between p-3 sm:p-3.5 rounded-2xl bg-[#18191e] border border-white/[0.06] shadow-sm select-none"
    >
      {/* Left: Avatar + Title & Name */}
      <div className="flex items-center gap-3 min-w-0">
        <img 
          src={avatarUrl} 
          alt={name}
          className="w-10 h-10 rounded-xl object-cover border border-white/10 shrink-0"
        />
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] text-gray-400 leading-tight uppercase font-medium">
            {role}
          </span>
          <span className="text-xs sm:text-[13px] font-bold text-white truncate mt-0.5">
            {name}
          </span>
        </div>
      </div>

      {/* Right: Round Action Buttons */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={onMessage}
          className="w-8 h-8 rounded-full bg-[#22242b] hover:bg-[#2c2e36] text-gray-300 hover:text-white flex items-center justify-center border border-white/[0.06] transition-colors"
          title="Send Class Notification"
        >
          <MessageSquare className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onAlert}
          className="w-8 h-8 rounded-full bg-[#22242b] hover:bg-[#2c2e36] text-gray-300 hover:text-white flex items-center justify-center border border-white/[0.06] transition-colors"
          title="Trigger Classroom Alert"
        >
          <BellRing className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
