import React from 'react';
import {
  LayoutDashboard,
  Bot,
  BookOpen,
  Target,
  BarChart3,
  Settings,
  Cpu,
  ChevronRight,
  GraduationCap,
  ClipboardList,
  CheckSquare,
  LogOut,
  User,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { TabType } from '../../types';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed }) => {
  const {
    activeTab,
    setActiveTab,
    userRole,
    currentUser,
    logout,
    setAuthModalOpen,
  } = useApp();

  const studentNavigationItems: Array<{
    id: TabType;
    label: string;
    icon: React.ReactNode;
    badge?: string;
  }> = [
    {
      id: 'dashboard',
      label: 'Home',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'student-assignments',
      label: 'My Assignments',
      icon: <ClipboardList className="w-4 h-4" />,
      badge: 'Active',
    },
    {
      id: 'student-result',
      label: 'My Results',
      icon: <GraduationCap className="w-4 h-4" />,
    },
    {
      id: 'tutor',
      label: 'AI Tutor',
      icon: <Bot className="w-4 h-4" />,
      badge: 'Local LLM',
    },
    {
      id: 'study',
      label: 'Study Materials',
      icon: <BookOpen className="w-4 h-4" />,
      badge: 'RAG',
    },
    {
      id: 'focus',
      label: 'Focus Mode',
      icon: <Target className="w-4 h-4" />,
      badge: 'Vision',
    },
    {
      id: 'assessment',
      label: 'Scan Assessment',
      icon: <GraduationCap className="w-4 h-4" />,
      badge: 'OCR',
    },
    {
      id: 'analytics',
      label: 'My Progress',
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  const teacherNavigationItems: Array<{
    id: TabType;
    label: string;
    icon: React.ReactNode;
    badge?: string;
  }> = [
    {
      id: 'teacher-dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'teacher-assignments',
      label: 'Assignments',
      icon: <ClipboardList className="w-4 h-4" />,
      badge: 'Rubrics',
    },
    {
      id: 'teacher-review',
      label: 'Review Queue',
      icon: <CheckSquare className="w-4 h-4" />,
      badge: 'Live',
    },
    {
      id: 'teacher-analytics',
      label: 'Class Intelligence',
      icon: <BarChart3 className="w-4 h-4" />,
      badge: 'AI Insights',
    },
    {
      id: 'assessment',
      label: 'Rapid OCR Ingest',
      icon: <GraduationCap className="w-4 h-4" />,
      badge: 'Scan',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  const navigationItems = userRole === 'teacher' ? teacherNavigationItems : studentNavigationItems;

  return (
    <aside
      className={`h-screen bg-black border-r border-white/[0.08] flex flex-col transition-all duration-300 z-30 select-none ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="p-4 sm:p-5 border-b border-white/[0.08] flex items-center justify-between">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#8052FF]/15 border border-[#8052FF]/30 flex items-center justify-center text-[#8052FF]">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center tracking-tight">
                <span className="font-medium text-base text-white">Evall</span>
                <span className="font-semibold text-base text-[#8052FF]">Q</span>
              </div>
              <p className="text-[10px] text-[#9A9A9A] font-light tracking-tight">
                Evaluate less. Teach more.
              </p>
            </div>
          </div>
        ) : (
          <div className="w-9 h-9 mx-auto rounded-full bg-[#8052FF]/15 border border-[#8052FF]/30 flex items-center justify-center text-[#8052FF]">
            <Cpu className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* On-Device Badge & Demo Warning */}
      {!collapsed && (
        <div className="px-4 py-2 bg-black border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-mono text-[#9A9A9A] uppercase tracking-wider">
              {userRole === 'teacher' ? 'Instructor Portal' : 'Student Portal'}
            </span>
          </div>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/[0.05] text-[#9A9A9A]">
            LOCAL AI
          </span>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        {navigationItems.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-full text-xs font-medium transition-all duration-150 group relative tracking-tight ${
                isActive
                  ? 'bg-[#8052FF] text-white shadow-sm font-medium'
                  : 'text-[#9A9A9A] hover:text-white hover:bg-white/[0.04]'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <div
                className={`transition-colors shrink-0 ${
                  isActive ? 'text-white' : 'text-[#9A9A9A] group-hover:text-white'
                }`}
              >
                {item.icon}
              </div>

              {!collapsed && (
                <>
                  <span className="flex-1 text-left truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full font-mono shrink-0 ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-white/[0.05] text-[#9A9A9A] border border-white/[0.08]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-3 h-3 text-white/80 shrink-0" />}
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Profile & Sign Out Footer */}
      {!collapsed ? (
        <div className="p-3 m-3 rounded-2xl bg-[#0A0A0A] border border-white/[0.08]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-7 h-7 rounded-full bg-[#8052FF]/20 border border-[#8052FF]/30 flex items-center justify-center text-[#8052FF] shrink-0">
                <User className="w-3.5 h-3.5" />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-medium text-white truncate">
                  {currentUser?.name || (userRole === 'teacher' ? 'Prof. Robert Chen' : 'Alex Rivera')}
                </p>
                <p className="text-[10px] text-[#777] font-mono truncate">
                  {currentUser?.email || (userRole === 'teacher' ? 'teacher@evallq.ai' : 'student@evallq.ai')}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 pt-2 border-t border-white/[0.06]">
            <button
              onClick={() => setAuthModalOpen(true)}
              className="flex-1 py-1 px-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[10px] text-[#9A9A9A] hover:text-white transition-colors flex items-center justify-center gap-1"
              title="Switch Accounts"
            >
              <Sparkles className="w-2.5 h-2.5 text-[#FFB829]" />
              <span>Switch</span>
            </button>
            <button
              onClick={logout}
              className="py-1 px-2 rounded-lg bg-white/[0.04] hover:bg-rose-500/20 text-[10px] text-[#9A9A9A] hover:text-rose-400 transition-colors flex items-center justify-center gap-1"
              title="Sign Out"
            >
              <LogOut className="w-2.5 h-2.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="p-3 border-t border-white/[0.08] flex flex-col items-center gap-2">
          <button
            onClick={() => setAuthModalOpen(true)}
            className="w-8 h-8 rounded-full bg-white/[0.04] hover:bg-[#8052FF]/20 text-[#9A9A9A] hover:text-[#8052FF] flex items-center justify-center transition-colors"
            title="Switch User / Sign In"
          >
            <User className="w-4 h-4" />
          </button>
        </div>
      )}
    </aside>
  );
};
