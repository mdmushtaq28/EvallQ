import React from 'react';
import {
  Sun,
  Moon,
  Cpu,
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
    aiStatus,
    isDemoMode,
    toggleDemoMode,
    systemStatus,
    backendConnected,
    backendLoading,
    retryBackendConnection,
  } = useApp();

  const titleMap: Record<string, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Dashboard Overview',
      subtitle: 'Learn smarter. Stay focused. Keep your data on your device.',
    },
    tutor: {
      title: 'AI Tutor',
      subtitle: 'On-device private conversational tutoring with multi-turn reasoning',
    },
    study: {
      title: 'Smart Study Materials',
      subtitle: 'Local PDF ingestion, semantic chunking, and document-grounded RAG',
    },
    focus: {
      title: 'Focus Mode',
      subtitle: 'On-device computer vision attention monitoring (no cloud video upload)',
    },
    analytics: {
      title: 'Study Analytics',
      subtitle: 'Locally aggregated study velocity, attention trends, and question metrics',
    },
    settings: {
      title: 'System & Model Settings',
      subtitle: 'Manage local runtimes, inference hardware targets, and privacy configs',
    },
  };

  const current = titleMap[activeTab] || { title: 'FocusFlow AI', subtitle: '' };

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between z-20 transition-colors">
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base font-bold text-slate-900 dark:text-slate-100">
            {current.title}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
            {current.subtitle}
          </p>
        </div>
      </div>

      {/* Right Action & Status Area */}
      <div className="flex items-center gap-3">
        {/* Backend Live Connection Status */}
        {backendLoading ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-500 font-medium">
            <RefreshCw className="w-3 h-3 animate-spin text-indigo-400" />
            <span className="font-mono text-[11px]">Backend checking...</span>
          </div>
        ) : backendConnected ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-[11px]">Backend Connected</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span className="w-2 h-2 rounded-full border border-slate-400 dark:border-slate-500" />
            <span className="font-mono text-[11px]">Backend Offline</span>
            <button
              onClick={retryBackendConnection}
              className="ml-1 p-0.5 text-slate-400 hover:text-indigo-400 transition-colors"
              title="Retry connection to FastAPI server"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Offline Badge */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
          <WifiOff className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-mono text-[11px]">LOCAL-FIRST AI</span>
        </div>

        {/* Inference Device Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
          <Cpu className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-[11px] font-mono">
            {systemStatus.activeDevice} (Dev) &rarr; Snapdragon Target
          </span>
        </div>

        {/* Model Status Badge */}
        {aiStatus === 'LOCAL_AI' ? (
          <Badge variant="success" dot size="sm">
            LOCAL AI READY
          </Badge>
        ) : aiStatus === 'DEMO_MODE' ? (
          <Badge variant="warning" dot size="sm">
            DEMO SIMULATION
          </Badge>
        ) : (
          <Badge variant="outline" size="sm">
            ● LOCAL RUNTIME STANDBY
          </Badge>
        )}

        {/* Demo Mode Toggle Button */}
        <button
          onClick={toggleDemoMode}
          className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 ${
            isDemoMode
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white'
          }`}
          title="Toggle Demo Mode for UI evaluation"
        >
          <Sliders className="w-3 h-3" />
          <span>{isDemoMode ? 'Demo ON' : 'Demo Mode'}</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600" />
          )}
        </button>
      </div>
    </header>
  );
};
