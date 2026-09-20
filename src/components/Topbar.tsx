import React, { useState } from 'react';
import { 
  Search, 
  Bell, 
  ChevronDown, 
  SlidersHorizontal, 
  Clock, 
  X,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ScanFace,
  Calendar,
  BookOpen,
  Radio,
  History,
  BarChart3
} from 'lucide-react';
import { NavigationTab } from './Sidebar';

interface TopbarProps {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  onOpenExportModal: () => void;
  onTakeSnapshot: () => void;
  onOpenSettings: () => void;
  isLiveSessionActive?: boolean;
}

export const Topbar: React.FC<TopbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenExportModal,
  onTakeSnapshot,
  onOpenSettings,
  isLiveSessionActive = false,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);

  return (
    <header 
      id="top-header"
      className="relative z-20 flex flex-wrap items-center justify-between gap-4 px-5 sm:px-8 lg:px-10 py-4 bg-[#0c0d10] border-b border-white/[0.04] shrink-0 select-none"
    >
      {/* 1. Left: Brand Logo */}
      <div 
        onClick={() => setActiveTab('today')}
        className="flex items-center gap-2.5 cursor-pointer group"
      >
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#ea5d38] to-[#c2410c] flex items-center justify-center shadow-md shadow-orange-950/30 text-white font-bold">
          <ScanFace className="w-4 h-4 text-white transition-transform group-hover:scale-110" />
        </div>
        <span className="text-xl font-bold tracking-tight text-white font-sans transition-colors group-hover:text-gray-200">
          ATTEND<span className="text-[#f08b70]">X</span>
        </span>
      </div>

      {/* 2. Center: Navigation Capsule Pill Bar */}
      <nav className="flex items-center p-1 rounded-full bg-[#18191e] border border-white/[0.08] shadow-sm text-xs font-medium">
        {/* Today's Classes */}
        <button
          id="nav-tab-today"
          onClick={() => setActiveTab('today')}
          className={`px-3.5 py-1.5 rounded-full transition-all duration-150 ${
            activeTab === 'today'
              ? 'bg-[#24262e] text-white shadow-xs font-semibold'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Today's Classes
        </button>

        {/* Classes */}
        <button
          id="nav-tab-classes"
          onClick={() => setActiveTab('classes')}
          className={`px-3.5 py-1.5 rounded-full transition-all duration-150 ${
            activeTab === 'classes'
              ? 'bg-[#24262e] text-white shadow-xs font-semibold'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Classes
        </button>

        {/* Live Classroom */}
        <button
          id="nav-tab-live"
          onClick={() => setActiveTab('live')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-all duration-150 ${
            activeTab === 'live'
              ? 'bg-[#24262e] text-white shadow-xs font-semibold'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isLiveSessionActive ? 'bg-emerald-400 animate-pulse' : 'bg-[#f08b70]'}`} />
          <span>Live Classroom</span>
        </button>

        {/* History */}
        <button
          id="nav-tab-history"
          onClick={() => setActiveTab('history')}
          className={`px-3.5 py-1.5 rounded-full transition-all duration-150 ${
            activeTab === 'history'
              ? 'bg-[#24262e] text-white shadow-xs font-semibold'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          History
        </button>

        {/* Analytics */}
        <button
          id="nav-tab-analytics"
          onClick={() => setActiveTab('analytics')}
          className={`px-3.5 py-1.5 rounded-full transition-all duration-150 ${
            activeTab === 'analytics'
              ? 'bg-[#24262e] text-white shadow-xs font-semibold'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          Analytics
        </button>
      </nav>

      {/* 3. Right: Search Trigger, Notifications & Faculty Profile */}
      <div className="flex items-center gap-3">
        {/* Search Modal Trigger */}
        <button
          onClick={() => setShowSearchModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 hover:text-white border border-white/[0.04] transition-all text-xs cursor-pointer"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden md:inline text-[11px]">Search student / course...</span>
          <kbd className="hidden lg:inline px-1.5 py-0.5 text-[9px] font-mono bg-white/[0.06] text-gray-400 rounded">
            ⌘K
          </kbd>
        </button>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button 
            id="notifications-btn"
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.04] flex items-center justify-center text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#ea5d38]" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-[#16171c] border border-white/[0.08] rounded-2xl shadow-2xl p-3 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.06]">
                <span className="font-semibold text-white">Classroom Alerts</span>
                <span className="text-[10px] text-gray-400">All caught up</span>
              </div>
              <div className="flex flex-col gap-2">
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1 shrink-0" />
                  <div>
                    <div className="font-medium text-white">Timetable Engine Active</div>
                    <div className="text-[11px] text-gray-400">Classes synchronized for today's teaching schedule</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Teacher Profile Menu */}
        <div className="relative">
          <button 
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2.5 p-1 pl-1.5 pr-2.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.04] transition-colors cursor-pointer"
          >
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
              alt="Faculty Avatar"
              className="w-7 h-7 rounded-full object-cover border border-white/[0.1]"
            />
            <span className="text-xs font-medium text-white hidden sm:inline">Prof. Rahul M.</span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-[#16171c] border border-white/[0.08] rounded-2xl shadow-2xl p-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-2 border-b border-white/[0.06] mb-1">
                <div className="font-semibold text-white">Prof. Rahul M.</div>
                <div className="text-[11px] text-gray-400">rahul.m@attendx.edu</div>
              </div>
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  setActiveTab('settings');
                }}
                className="w-full text-left px-3 py-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer"
              >
                System Settings
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
