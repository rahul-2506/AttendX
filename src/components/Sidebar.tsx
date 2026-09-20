import React from 'react';
import { 
  ScanFace, 
  BookOpen, 
  BarChart3, 
  History, 
  Settings, 
  LogOut,
  ChevronRight,
  Radio,
  Calendar,
  Layers,
  GraduationCap
} from 'lucide-react';

export type NavigationTab = 'today' | 'classes' | 'live' | 'history' | 'analytics' | 'settings';

interface SidebarProps {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  isLiveSessionActive?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  collapsed,
  setCollapsed,
  isLiveSessionActive = false,
}) => {
  const navItems = [
    {
      id: 'today' as NavigationTab,
      label: "Today's Classes",
      icon: Calendar,
      badge: 'TIMETABLE',
    },
    {
      id: 'classes' as NavigationTab,
      label: 'Classes & Courses',
      icon: BookOpen,
    },
    {
      id: 'live' as NavigationTab,
      label: 'Live Classroom',
      icon: Radio,
      badge: isLiveSessionActive ? 'LIVE' : undefined,
    },
    {
      id: 'history' as NavigationTab,
      label: 'Attendance History',
      icon: History,
    },
    {
      id: 'analytics' as NavigationTab,
      label: 'Class Analytics',
      icon: BarChart3,
    },
  ];

  return (
    <aside 
      id="main-sidebar"
      className={`relative z-20 flex flex-col justify-between h-full bg-[#121316] border-r border-white/[0.06] transition-all duration-300 ease-in-out shrink-0 select-none ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Top Branding Section */}
      <div className="flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-white/[0.04]">
          <div 
            onClick={() => setActiveTab('today')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#ea5d38] to-[#c2410c] flex items-center justify-center text-white shadow-lg shadow-orange-950/40">
              <ScanFace className="w-5 h-5 transition-transform group-hover:scale-105" />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="text-base font-bold tracking-tight text-white font-sans">
                  ATTEND<span className="text-[#f08b70]">X</span>
                </span>
                <span className="text-[10px] text-gray-400 font-mono tracking-wider uppercase">
                  Faculty Edition
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1.5 p-3 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`group relative flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-[#ea5d38] text-white shadow-md shadow-[#ea5d38]/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                } ${collapsed ? 'justify-center px-0' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
                {!collapsed && (
                  <span className="flex-1 text-left font-medium tracking-wide">
                    {item.label}
                  </span>
                )}
                {!collapsed && item.badge && (
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                    isActive 
                      ? 'bg-black/30 text-white' 
                      : item.badge === 'LIVE'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse'
                      : 'bg-white/[0.06] text-gray-400'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Faculty Profile & Settings */}
      <div className="p-3 border-t border-white/[0.04] flex flex-col gap-1.5">
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-white/[0.08] text-white'
              : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
          } ${collapsed ? 'justify-center px-0' : ''}`}
        >
          <Settings className="w-4 h-4 text-gray-400" />
          {!collapsed && <span>System Settings</span>}
        </button>

        {/* Teacher Mini Profile */}
        <div className={`p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center gap-3 ${
          collapsed ? 'justify-center' : ''
        }`}>
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
            alt="Prof. Rahul M."
            className="w-8 h-8 rounded-full object-cover border border-white/[0.1]"
          />
          {!collapsed && (
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-semibold text-white truncate">Prof. Rahul M.</span>
              <span className="text-[10px] text-gray-400 truncate">Computer Science Dept</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
