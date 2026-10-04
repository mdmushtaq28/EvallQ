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
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import type { TabType } from '../../types';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onNavigate?: (route: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggleCollapse, onNavigate }) => {
  const { theme, setTheme, toggleTheme } = useTheme();
  const { user, profile, role: authRole, logout: supabaseLogout } = useAuth();
  const {
    activeTab,
    setActiveTab,
    userRole,
    currentUser,
    setAuthModalOpen,
  } = useApp();

  const effectiveRole = authRole || userRole;

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
      id: 'profile',
      label: 'My Profile',
      icon: <User className="w-4 h-4" />,
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
      id: 'profile',
      label: 'My Profile',
      icon: <User className="w-4 h-4" />,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  const navigationItems = effectiveRole === 'teacher' ? teacherNavigationItems : studentNavigationItems;

  return (
    <aside
      className={`h-screen border-r flex flex-col transition-all duration-300 z-30 select-none ${
        theme === 'dark'
          ? 'bg-black border-white/[0.08] text-white'
          : 'bg-white border-slate-200 text-slate-900'
      } ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className={`p-4 sm:p-5 border-b flex items-center justify-between ${
        theme === 'dark' ? 'border-white/[0.08]' : 'border-slate-200'
      }`}>
        {!collapsed ? (
          <>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#8052FF]/15 border border-[#8052FF]/30 flex items-center justify-center text-[#8052FF]">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center tracking-tight">
                  <span className={`font-medium text-base ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Evall</span>
                  <span className="font-semibold text-base text-[#8052FF]">Q</span>
                </div>
                <p className={`text-[10px] font-light tracking-tight ${theme === 'dark' ? 'text-[#9A9A9A]' : 'text-slate-500'}`}>
                  Evaluate less. Teach more.
                </p>
              </div>
            </div>
            <button
              onClick={onToggleCollapse}
              className={`p-1.5 rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'text-[#9A9A9A] hover:text-white hover:bg-white/[0.06]'
                  : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="Collapse sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </>
        ) : (
          <div className="w-full flex flex-col items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-[#8052FF]/15 border border-[#8052FF]/30 flex items-center justify-center text-[#8052FF]">
              <Cpu className="w-4 h-4" />
            </div>
            <button
              onClick={onToggleCollapse}
              className={`p-1.5 rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'text-[#9A9A9A] hover:text-white hover:bg-white/[0.06]'
                  : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="Expand sidebar"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* On-Device Badge */}
      {!collapsed && (
        <div className={`px-4 py-2 border-b flex items-center justify-between ${
          theme === 'dark' ? 'bg-black border-white/[0.08]' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className={`text-[10px] font-mono uppercase tracking-wider ${
              theme === 'dark' ? 'text-[#9A9A9A]' : 'text-slate-500'
            }`}>
              {userRole === 'teacher' ? 'Instructor Portal' : 'Student Portal'}
            </span>
          </div>
          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
            theme === 'dark' ? 'bg-white/[0.05] text-[#9A9A9A]' : 'bg-slate-200 text-slate-600'
          }`}>
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
              onClick={() => {
                if (item.id === 'profile' && onNavigate) {
                  onNavigate('/profile');
                } else {
                  setActiveTab(item.id);
                }
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-full text-xs font-medium transition-all duration-150 group relative tracking-tight ${
                isActive
                  ? 'bg-[#8052FF] text-white shadow-sm font-medium'
                  : theme === 'dark'
                    ? 'text-[#9A9A9A] hover:text-white hover:bg-white/[0.04]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <div
                className={`transition-colors shrink-0 ${
                  isActive
                    ? 'text-white'
                    : theme === 'dark'
                      ? 'text-[#9A9A9A] group-hover:text-white'
                      : 'text-slate-500 group-hover:text-slate-900'
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
                          : theme === 'dark'
                            ? 'bg-white/[0.05] text-[#9A9A9A] border border-white/[0.08]'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
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

      {/* Dark & Bright Theme Switcher in Toggle Sidebar */}
      <div className={`px-3 py-2.5 border-t ${
        theme === 'dark' ? 'border-white/[0.08]' : 'border-slate-200'
      }`}>
        {!collapsed ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <span className={`text-[10px] font-mono uppercase tracking-wider ${
                theme === 'dark' ? 'text-[#9A9A9A]' : 'text-slate-500'
              }`}>
                Theme
              </span>
              <span className="text-[10px] font-medium text-[#8052FF]">
                {theme === 'dark' ? 'Dark' : 'Bright'}
              </span>
            </div>
            <div className={`p-1 rounded-xl flex items-center gap-1 ${
              theme === 'dark'
                ? 'bg-white/[0.04] border border-white/[0.08]'
                : 'bg-slate-100 border border-slate-200'
            }`}>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                  theme === 'dark'
                    ? 'bg-[#8052FF] text-white shadow-sm'
                    : 'text-[#9A9A9A] hover:text-white'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Dark</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                  theme === 'light'
                    ? 'bg-[#8052FF] text-white shadow-sm'
                    : theme === 'dark'
                      ? 'text-[#9A9A9A] hover:text-white'
                      : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Bright</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={toggleTheme}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                theme === 'dark'
                  ? 'bg-white/[0.04] hover:bg-white/[0.08] text-[#FFB829] border border-white/[0.08]'
                  : 'bg-slate-100 hover:bg-slate-200 text-[#8052FF] border border-slate-200'
              }`}
              title={theme === 'dark' ? 'Switch to Bright Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
          </div>
        )}
      </div>

      {/* User Profile & Sign Out Footer */}
      {!collapsed ? (
        <div className={`p-3 m-3 rounded-2xl border ${
          theme === 'dark'
            ? 'bg-[#0A0A0A] border-white/[0.08]'
            : 'bg-slate-50 border-slate-200'
        }`}>
          <div
            onClick={() => (onNavigate ? onNavigate('/profile') : setActiveTab('profile'))}
            className="flex items-center justify-between mb-2 cursor-pointer group"
            title="Click to view profile"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-7 h-7 rounded-full bg-[#8052FF]/20 border border-[#8052FF]/30 flex items-center justify-center text-[#8052FF] shrink-0">
                <User className="w-3.5 h-3.5" />
              </div>
              <div className="overflow-hidden">
                <p className={`text-xs font-medium truncate group-hover:text-[#8052FF] transition-colors ${
                  theme === 'dark' ? 'text-white' : 'text-slate-900'
                }`}>
                  {profile?.full_name || user?.user_metadata?.full_name || currentUser?.name || (effectiveRole === 'teacher' ? 'Prof. Robert Chen' : 'Alex Rivera')}
                </p>
                <p className={`text-[10px] font-mono truncate ${
                  theme === 'dark' ? 'text-[#777]' : 'text-slate-400'
                }`}>
                  {profile?.email || user?.email || currentUser?.email || (effectiveRole === 'teacher' ? 'teacher@evallq.ai' : 'student@evallq.ai')}
                </p>
              </div>
            </div>
          </div>

          <div className={`flex items-center gap-1.5 pt-2 border-t ${
            theme === 'dark' ? 'border-white/[0.06]' : 'border-slate-200'
          }`}>
            <button
              onClick={() => setAuthModalOpen(true)}
              className={`flex-1 py-1 px-2 rounded-lg text-[10px] transition-colors flex items-center justify-center gap-1 ${
                theme === 'dark'
                  ? 'bg-white/[0.04] hover:bg-white/[0.08] text-[#9A9A9A] hover:text-white'
                  : 'bg-white hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
              title="Switch Accounts"
            >
              <Sparkles className="w-2.5 h-2.5 text-[#FFB829]" />
              <span>Switch</span>
            </button>
            <button
              onClick={supabaseLogout}
              className={`py-1 px-2 rounded-lg text-[10px] transition-colors flex items-center justify-center gap-1 ${
                theme === 'dark'
                  ? 'bg-white/[0.04] hover:bg-rose-500/20 text-[#9A9A9A] hover:text-rose-400'
                  : 'bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200'
              }`}
              title="Sign Out"
            >
              <LogOut className="w-2.5 h-2.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      ) : (
        <div className={`p-3 border-t flex flex-col items-center gap-2 ${
          theme === 'dark' ? 'border-white/[0.08]' : 'border-slate-200'
        }`}>
          <button
            onClick={() => setAuthModalOpen(true)}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              theme === 'dark'
                ? 'bg-white/[0.04] hover:bg-[#8052FF]/20 text-[#9A9A9A] hover:text-[#8052FF]'
                : 'bg-slate-100 hover:bg-[#8052FF]/15 text-slate-500 hover:text-[#8052FF]'
            }`}
            title="Switch User / Sign In"
          >
            <User className="w-4 h-4" />
          </button>
        </div>
      )}
    </aside>
  );
};
