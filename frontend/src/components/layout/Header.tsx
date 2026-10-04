import React from 'react';
import {
  WifiOff,
  Menu,
  RefreshCw,
  User,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
  onNavigate?: (route: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, onNavigate }) => {
  const { theme } = useTheme();
  const { user, profile, role: authRole } = useAuth();
  const {
    activeTab,
    userRole,
    setUserRole,
    currentUser,
    setAuthModalOpen,
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
    profile: {
      title: 'User Profile & Identity',
      subtitle: 'Manage your verified account credentials, system role, and personalization settings',
    },
  };

  const current = titleMap[activeTab] || { title: 'EvallQ', subtitle: 'Evaluate less. Teach more.' };

  return (
    <header className={`h-16 border-b px-4 sm:px-6 flex items-center justify-between z-20 transition-colors ${
      theme === 'dark'
        ? 'bg-black border-white/[0.08] text-white'
        : 'bg-white border-slate-200 text-slate-900'
    }`}>
      <div className="flex items-center gap-4 min-w-0">
        <button
          onClick={onToggleSidebar}
          className={`p-2 rounded-xl transition-colors shrink-0 ${
            theme === 'dark'
              ? 'text-[#9A9A9A] hover:text-white hover:bg-white/[0.05]'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          }`}
          title="Toggle Navigation Menu (☰)"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <h1 className={`text-sm lg:text-base font-normal tracking-tight truncate ${
            theme === 'dark' ? 'text-white' : 'text-slate-900'
          }`}>
            {current.title}
          </h1>
          <p className={`text-xs font-light hidden sm:block truncate ${
            theme === 'dark' ? 'text-[#9A9A9A]' : 'text-slate-500'
          }`}>
            {current.subtitle}
          </p>
        </div>
      </div>

      {/* Right Action & Status Area */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Backend Live Connection Status */}
        {backendLoading ? (
          <div className={`hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-light ${
            theme === 'dark'
              ? 'bg-white/[0.03] border border-white/[0.08] text-[#9A9A9A]'
              : 'bg-slate-100 border border-slate-200 text-slate-600'
          }`}>
            <RefreshCw className="w-3 h-3 animate-spin text-[#8052FF]" />
            <span className="font-mono text-[11px]">Connecting...</span>
          </div>
        ) : backendConnected ? (
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#15846E]/15 border border-[#15846E]/30 text-xs text-[#34D399] font-normal">
            <span className="w-1.5 h-1.5 rounded-full bg-[#15846E] animate-pulse" />
            <span className="font-mono text-[11px]">Backend Live</span>
          </div>
        ) : (
          <div className={`hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-light ${
            theme === 'dark'
              ? 'bg-white/[0.03] border border-white/[0.08] text-[#9A9A9A]'
              : 'bg-slate-100 border border-slate-200 text-slate-600'
          }`}>
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
          onClick={() => (onNavigate ? onNavigate('/profile') : setAuthModalOpen(true))}
          className={`flex items-center gap-2 px-2.5 py-1 rounded-full border transition-colors text-xs ${
            theme === 'dark'
              ? 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08] text-white'
              : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800'
          }`}
          title="Click to View Profile / Account"
        >
          <div className="w-5 h-5 rounded-full bg-[#8052FF]/20 flex items-center justify-center text-[#8052FF]">
            <User className="w-3 h-3" />
          </div>
          <span className="hidden sm:inline font-medium text-xs">
            {profile?.full_name || user?.user_metadata?.full_name || currentUser?.name || (userRole === 'teacher' ? 'Prof. Robert Chen' : 'Alex Rivera')}
          </span>
          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded uppercase ${
            theme === 'dark'
              ? 'bg-white/[0.06] text-[#9A9A9A]'
              : 'bg-slate-200 text-slate-600'
          }`}>
            {authRole || userRole}
          </span>
        </button>

        {/* Role Fast Selector: Student vs Teacher */}
        <div className={`flex items-center p-0.5 rounded-full ${
          theme === 'dark'
            ? 'bg-white/[0.04] border border-white/[0.08]'
            : 'bg-slate-100 border border-slate-200'
        }`}>
          <button
            onClick={() => setUserRole('student')}
            className={`px-2.5 sm:px-3 py-1 rounded-full text-xs transition-all tracking-tight ${
              userRole === 'student'
                ? 'bg-[#8052FF] text-white font-medium shadow-sm'
                : theme === 'dark'
                  ? 'text-[#9A9A9A] hover:text-white font-light'
                  : 'text-slate-500 hover:text-slate-900 font-light'
            }`}
          >
            Student
          </button>
          <button
            onClick={() => setUserRole('teacher')}
            className={`px-2.5 sm:px-3 py-1 rounded-full text-xs transition-all tracking-tight ${
              userRole === 'teacher'
                ? 'bg-[#8052FF] text-white font-medium shadow-sm'
                : theme === 'dark'
                  ? 'text-[#9A9A9A] hover:text-white font-light'
                  : 'text-slate-500 hover:text-slate-900 font-light'
            }`}
          >
            Teacher
          </button>
        </div>

        {/* Local First Badge */}
        <div className={`hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs ${
          theme === 'dark'
            ? 'bg-white/[0.03] border border-white/[0.08] text-[#9A9A9A]'
            : 'bg-slate-100 border border-slate-200 text-slate-600'
        }`}>
          <WifiOff className="w-3 h-3" />
          <span className="font-mono text-[10px] tracking-wider uppercase">LOCAL FIRST</span>
        </div>
      </div>
    </header>
  );
};
