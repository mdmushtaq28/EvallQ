import React from 'react';
import {
  LayoutDashboard,
  Bot,
  BookOpen,
  Target,
  BarChart3,
  Settings,
  ShieldCheck,
  Cpu,
  ChevronRight,
  GraduationCap,
  ClipboardList,
  CheckSquare,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Badge } from '../common/Badge';
import type { TabType } from '../../types';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed }) => {
  const { activeTab, setActiveTab, userRole, aiStatus, isDemoMode } = useApp();

  const studentNavigationItems: Array<{
    id: TabType;
    label: string;
    icon: React.ReactNode;
    badge?: string;
  }> = [
    {
      id: 'dashboard',
      label: 'Home',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      id: 'tutor',
      label: 'AI Tutor',
      icon: <Bot className="w-5 h-5" />,
      badge: 'Local LLM',
    },
    {
      id: 'study',
      label: 'Study Materials',
      icon: <BookOpen className="w-5 h-5" />,
      badge: 'RAG',
    },
    {
      id: 'focus',
      label: 'Focus Mode',
      icon: <Target className="w-5 h-5" />,
      badge: 'Vision',
    },
    {
      id: 'assessment',
      label: 'Assessments',
      icon: <GraduationCap className="w-5 h-5" />,
      badge: 'OCR + AI',
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <BarChart3 className="w-5 h-5" />,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-5 h-5" />,
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
      label: 'Teacher Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      id: 'teacher-assignments',
      label: 'Assignments',
      icon: <ClipboardList className="w-5 h-5" />,
      badge: 'Rubrics',
    },
    {
      id: 'teacher-review',
      label: 'Review Queue',
      icon: <CheckSquare className="w-5 h-5" />,
      badge: 'OCR Verify',
    },
    {
      id: 'teacher-analytics',
      label: 'Class Analytics',
      icon: <BarChart3 className="w-5 h-5" />,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-5 h-5" />,
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
      <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#8052FF]/15 border border-[#8052FF]/30 flex items-center justify-center text-[#8052FF]">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center tracking-tight">
                <span className="font-medium text-base text-white">
                  Evall
                </span>
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
        <div className="px-4 py-2.5 bg-black border-b border-white/[0.08] flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Badge variant="success" dot size="sm">
              ON-DEVICE AI
            </Badge>
            <span className="text-[10px] text-[#9A9A9A] font-mono">OFFLINE FIRST</span>
          </div>
          {isDemoMode && (
            <div className="flex items-center justify-between bg-[#FFB829]/10 border border-[#FFB829]/30 px-2.5 py-1 rounded-full text-[11px] text-[#FFB829] font-medium">
              <span>DEMO MODE</span>
              <span className="text-[9px] text-[#FFB829]/80">SIMULATION</span>
            </div>
          )}
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
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
                className={`transition-colors ${
                  isActive ? 'text-white' : 'text-[#9A9A9A] group-hover:text-white'
                }`}
              >
                {item.icon}
              </div>

              {!collapsed && (
                <>
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-white/[0.05] text-[#9A9A9A] border border-white/[0.08]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/80" />}
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* Hardware Target & Privacy Pill at bottom */}
      {!collapsed && (
        <div className="p-3.5 m-3 rounded-[18px] bg-[#0A0A0A] border border-white/[0.08] text-xs text-[#9A9A9A]">
          <div className="flex items-center gap-2 mb-1 text-white font-normal text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#34D399]" />
            <span>Zero Cloud Telemetry</span>
          </div>
          <p className="text-[10px] text-[#9A9A9A] font-light leading-tight">
            Runtime: <span className="text-white font-mono">100% On-Device</span>
          </p>
          <div className="mt-2 pt-2 border-t border-white/[0.08] flex items-center justify-between text-[10px]">
            <span className="text-[#9A9A9A]">Local Engine</span>
            <span
              className={`font-mono ${
                aiStatus === 'LOCAL_AI'
                  ? 'text-[#34D399]'
                  : aiStatus === 'DEMO_MODE'
                  ? 'text-[#FFB829]'
                  : 'text-[#9A9A9A]'
              }`}
            >
              {aiStatus === 'NOT_INSTALLED' ? 'STANDBY' : aiStatus}
            </span>
          </div>
        </div>
      )}
    </aside>
  );
};
