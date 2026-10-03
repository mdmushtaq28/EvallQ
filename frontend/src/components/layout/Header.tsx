import React from 'react';
import {
  Sun,
  Moon,
  WifiOff,
  Sliders,
  Menu,
  RefreshCw,
  User,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useApp } from '../../context/AppContext';

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
    currentUser,
    setAuthModalOpen,
    isDemoMode,
    toggleDemoMode,
    backendConnected,
    backendLoading,
    retryBackendConnection,
  } = useApp();

  const titleMap: Record<string, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Student Dashboard',
      subtitle: 'Personalized study progress, assigned curriculum, and local AI reasoning',
    },
    'student-assignments': {
      title: 'My Course Assignments',
      subtitle: 'Complete assigned teacher questions with typed answers and instant AI rubric evaluation',
    },
    'student-solve': {
      title: 'Assignment Solver',
      subtitle: 'Carefully answer each question below. Submitted answers are evaluated against grading rubrics.',
    },
    'student-result': {
      title: 'Assessment Evaluation Result',
      subtitle: 'Verified score, teacher feedback, concept learning gaps, and targeted AI Tutor bridge',
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
      subtitle: 'Human-in-the-loop verification, score override, and final approval',
    },
    'teacher-analytics': {
      title: 'Class Intelligence & Analytics',
      subtitle: 'Calculated topic mastery, frequently missed questions, and Qwen AI teaching insights',
    },
  };

  const current = titleMap[activeTab] || { title: 'EvallQ', subtitle: 'Evaluate less. Teach more.' };

  return (
    <header className="h-16 bg-black border-b border-white/[0.08] px-4 sm:px-6 flex items-center justify-between z-20 transition-colors">
      <div className="flex items-center gap-4 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-[#9A9A9A] hover:text-white hover:bg-white/[0.05] transition-colors shrink-0"
          title="Toggle Navigation Menu (☰)"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <h1 className="text-sm lg:text-base font-normal text-white tracking-tight truncate">
            {current.title}
          </h1>
          <p className="text-xs text-[#9A9A9A] font-light hidden sm:block truncate">
            {current.subtitle}
          </p>
        </div>
      </div>

      {/* Right Action & Status Area */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Backend Live Connection Status */}
        {backendLoading ? (
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] text-xs text-[#9A9A9A] font-light">
            <RefreshCw className="w-3 h-3 animate-spin text-[#8052FF]" />
            <span className="font-mono text-[11px]">Connecting...</span>
          </div>
        ) : backendConnected ? (
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#15846E]/15 border border-[#15846E]/30 text-xs text-[#34D399] font-normal">
            <span className="w-1.5 h-1.5 rounded-full bg-[#15846E] animate-pulse" />
            <span className="font-mono text-[11px]">Backend Live</span>
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] text-xs text-[#9A9A9A] font-light">
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

        {/* Current User Quick Badge */}
        <button
          onClick={() => setAuthModalOpen(true)}
          className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-colors text-xs text-white"
          title="Click to Switch User / Sign In"
        >
          <div className="w-5 h-5 rounded-full bg-[#8052FF]/20 flex items-center justify-center text-[#8052FF]">
            <User className="w-3 h-3" />
          </div>
          <span className="hidden sm:inline font-medium text-xs">
            {currentUser?.name || (userRole === 'teacher' ? 'Prof. Robert Chen' : 'Alex Rivera')}
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/[0.06] text-[#9A9A9A] uppercase">
            {userRole}
          </span>
        </button>

        {/* Role Fast Selector: Student vs Teacher */}
        <div className="flex items-center p-0.5 rounded-full bg-white/[0.04] border border-white/[0.08]">
          <button
            onClick={() => setUserRole('student')}
            className={`px-2.5 sm:px-3 py-1 rounded-full text-xs transition-all tracking-tight ${
              userRole === 'student'
                ? 'bg-[#8052FF] text-white font-medium shadow-sm'
                : 'text-[#9A9A9A] hover:text-white font-light'
            }`}
          >
            Student
          </button>
          <button
            onClick={() => setUserRole('teacher')}
            className={`px-2.5 sm:px-3 py-1 rounded-full text-xs transition-all tracking-tight ${
              userRole === 'teacher'
                ? 'bg-[#8052FF] text-white font-medium shadow-sm'
                : 'text-[#9A9A9A] hover:text-white font-light'
            }`}
          >
            Teacher
          </button>
        </div>

        {/* Local First Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] text-xs text-[#9A9A9A]">
          <WifiOff className="w-3 h-3 text-[#9A9A9A]" />
          <span className="font-mono text-[10px] tracking-wider uppercase">LOCAL FIRST</span>
        </div>

        {/* Demo Mode Toggle Button */}
        <button
          onClick={toggleDemoMode}
          className={`px-2.5 sm:px-3 py-1 text-xs font-medium rounded-full border transition-all flex items-center gap-1.5 ${
            isDemoMode
              ? 'bg-[#FFB829]/15 text-[#FFB829] border-[#FFB829]/30'
              : 'bg-white/[0.03] text-[#9A9A9A] border-white/[0.08] hover:text-white hover:border-white/[0.18]'
          }`}
          title="Toggle Demo Mode"
        >
          <Sliders className="w-3 h-3" />
          <span className="hidden sm:inline">{isDemoMode ? 'Demo ON' : 'Demo'}</span>
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
