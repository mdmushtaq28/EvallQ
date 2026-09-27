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
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Badge } from '../common/Badge';
import type { TabType } from '../../types';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed }) => {
  const { activeTab, setActiveTab, aiStatus, isDemoMode } = useApp();

  const navigationItems: Array<{
    id: TabType;
    label: string;
    icon: React.ReactNode;
    badge?: string;
  }> = [
    {
      id: 'dashboard',
      label: 'Dashboard',
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

  return (
    <aside
      className={`h-screen bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-300 z-30 select-none ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-rose-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm tracking-wider text-white">
                  FOCUSFLOW
                </span>
                <span className="font-light text-sm text-indigo-400">AI</span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium tracking-tight">
                Private AI Study Companion
              </p>
            </div>
          </div>
        ) : (
          <div className="w-10 h-10 mx-auto rounded-xl bg-gradient-to-tr from-indigo-600 to-rose-500 flex items-center justify-center text-white shadow-md">
            <Cpu className="w-5 h-5" />
          </div>
        )}
      </div>

      {/* On-Device Badge & Demo Warning */}
      {!collapsed && (
        <div className="px-4 py-3 bg-slate-950/40 border-b border-slate-800/60 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Badge variant="success" dot size="sm">
              ON-DEVICE AI
            </Badge>
            <span className="text-[10px] text-slate-400 font-mono">LOCAL-FIRST AI</span>
          </div>
          {isDemoMode && (
            <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/30 px-2 py-1 rounded text-[11px] text-amber-300 font-medium">
              <span>DEMO MODE</span>
              <span className="text-[9px] text-amber-400/80">SIMULATED UI</span>
            </div>
          )}
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {navigationItems.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 group relative ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <div
                className={`transition-colors ${
                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-400'
                }`}
              >
                {item.icon}
              </div>

              {!collapsed && (
                <>
                  <span className="flex-1 text-left tracking-wide">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                        isActive
                          ? 'bg-indigo-700 text-indigo-100'
                          : 'bg-slate-800 text-slate-400 border border-slate-700/60'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-indigo-200" />}
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* Hardware Target & Privacy Pill at bottom */}
      {!collapsed && (
        <div className="p-3 m-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-400">
          <div className="flex items-center gap-2 mb-1.5 text-slate-300 font-medium text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Zero Cloud Telemetry</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-tight">
            Target: <span className="text-slate-300 font-mono">Snapdragon X NPU</span>
          </p>
          <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
            <span className="text-slate-500">Status</span>
            <span
              className={`font-semibold font-mono ${
                aiStatus === 'LOCAL_AI'
                  ? 'text-emerald-400'
                  : aiStatus === 'DEMO_MODE'
                  ? 'text-amber-400'
                  : 'text-slate-400'
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
