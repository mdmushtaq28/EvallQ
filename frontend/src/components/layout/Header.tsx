import React from 'react';
import {
  Sun,
  Moon,
  WifiOff,
  Sliders,
  Menu,
  RefreshCw,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useApp } from '../../context/AppContext';
import { Badge } from '../common/Badge';

interface HeaderProps {
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { theme, toggleTheme } = useTheme();
  const {
    activeTab,
    userRole,
    setUserRole,
    aiStatus,
    isDemoMode,
    toggleDemoMode,
    backendConnected,
    backendLoading,
    retryBackendConnection,
  } = useApp();

  const titleMap: Record<string, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Dashboard Overview',
      subtitle: 'Evaluate less. Teach more. Private on-device intelligence.',
    },
    tutor: {
      title: 'AI Tutor',
      subtitle: 'Conversational reasoning and concept mastery grounded in your curriculum',
    },
    study: {
      title: 'Smart Study Materials',
      subtitle: 'Local document ingestion, semantic chunking, and grounded synthesis',
    },
    focus: {
      title: 'Focus Mode',
      subtitle: 'On-device computer vision attention monitoring (zero cloud upload)',
    },
    assessment: {
      title: 'Assessment Intelligence',
      subtitle: 'Real OCR, rubric-based evaluation, and curriculum learning gap discovery',
    },
    analytics: {
      title: 'Study Analytics',
      subtitle: 'Locally aggregated study velocity, attention trends, and question metrics',
    },
    settings: {
      title: 'System & Model Settings',
      subtitle: 'Manage local runtimes, inference hardware targets, and privacy configs',
    },
    'teacher-dashboard': {
      title: 'Teacher Dashboard',
      subtitle: 'Class performance overview, review queue, and assignment analytics',
    },
    'teacher-assignments': {
      title: 'Assignment Management',
      subtitle: 'Create course assessments, set maximum marks, and configure rubrics',
    },
    'teacher-review': {
      title: 'Teacher Submission Review',
      subtitle: 'Human-in-the-loop OCR verification, score override, and final approval',
    },
    'teacher-analytics': {
      title: 'Class Analytics & Insights',
      subtitle: 'Topic mastery distribution, common misconceptions, and student progress',
    },
  };

  const current = titleMap[activeTab] || { title: 'EvallQ', subtitle: 'Evaluate less. Teach more.' };

  return (
    <header className="h-16 bg-black border-b border-white/[0.08] px-6 flex items-center justify-between z-20 transition-colors">
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-[#9A9A9A] hover:text-white hover:bg-white/[0.05] transition-colors"
          title="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-sm lg:text-base font-normal text-white tracking-tight">
            {current.title}
          </h1>
          <p className="text-xs text-[#9A9A9A] font-light hidden sm:block">
            {current.subtitle}
          </p>
        </div>
      </div>

      {/* Right Action & Status Area */}
      <div className="flex items-center gap-3">
        {/* Backend Live Connection Status */}
        {backendLoading ? (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] text-xs text-[#9A9A9A] font-light">
            <RefreshCw className="w-3 h-3 animate-spin text-[#8052FF]" />
            <span className="font-mono text-[11px]">Connecting...</span>
          </div>
        ) : backendConnected ? (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#15846E]/15 border border-[#15846E]/30 text-xs text-[#34D399] font-normal">
            <span className="w-1.5 h-1.5 rounded-full bg-[#15846E] animate-pulse" />
            <span className="font-mono text-[11px]">Backend Live</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] text-xs text-[#9A9A9A] font-light">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span className="font-mono text-[11px]">Offline</span>
            <button
              onClick={retryBackendConnection}
              className="ml-1 text-[#9A9A9A] hover:text-[#8052FF] transition-colors"
              title="Retry connection"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Role Selector: Student vs Teacher */}
        <div className="flex items-center p-1 rounded-full bg-white/[0.04] border border-white/[0.08]">
          <button
            onClick={() => setUserRole('student')}
            className={`px-3.5 py-1 rounded-full text-xs transition-all tracking-tight ${
              userRole === 'student'
                ? 'bg-[#8052FF] text-white font-medium shadow-sm'
                : 'text-[#9A9A9A] hover:text-white font-light'
            }`}
          >
            Student
          </button>
          <button
            onClick={() => setUserRole('teacher')}
            className={`px-3.5 py-1 rounded-full text-xs transition-all tracking-tight ${
              userRole === 'teacher'
                ? 'bg-[#8052FF] text-white font-medium shadow-sm'
                : 'text-[#9A9A9A] hover:text-white font-light'
            }`}
          >
            Teacher
          </button>
        </div>

        {/* Local First Badge */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] text-xs text-[#9A9A9A]">
          <WifiOff className="w-3 h-3 text-[#9A9A9A]" />
          <span className="font-mono text-[10px] tracking-wider uppercase">LOCAL FIRST</span>
        </div>

        {/* Model Status Badge */}
        {aiStatus === 'LOCAL_AI' ? (
          <Badge variant="success" dot size="sm">
            AI READY
          </Badge>
        ) : aiStatus === 'DEMO_MODE' ? (
          <Badge variant="warning" dot size="sm">
            DEMO
          </Badge>
        ) : (
          <Badge variant="outline" size="sm">
            STANDBY
          </Badge>
        )}

        {/* Demo Mode Toggle Button */}
        <button
          onClick={toggleDemoMode}
          className={`px-3 py-1 text-xs font-medium rounded-full border transition-all flex items-center gap-1.5 ${
            isDemoMode
              ? 'bg-[#FFB829]/15 text-[#FFB829] border-[#FFB829]/30'
              : 'bg-white/[0.03] text-[#9A9A9A] border-white/[0.08] hover:text-white hover:border-white/[0.18]'
          }`}
          title="Toggle Demo Mode"
        >
          <Sliders className="w-3 h-3" />
          <span>{isDemoMode ? 'Demo ON' : 'Demo'}</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full text-[#9A9A9A] hover:text-white hover:bg-white/[0.05] transition-colors"
          title={`Switch theme`}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-[#FFB829]" />
          ) : (
            <Moon className="w-4 h-4 text-[#9A9A9A]" />
          )}
        </button>
      </div>
    </header>
  );
};
