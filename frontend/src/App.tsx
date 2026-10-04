import React, { useState, useEffect } from 'react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardPage } from './pages/DashboardPage';
import { AITutorPage } from './pages/AITutorPage';
import { StudyMaterialsPage } from './pages/StudyMaterialsPage';
import { FocusModePage } from './pages/FocusModePage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AssessmentPage } from './pages/AssessmentPage';
import { TeacherDashboardPage } from './pages/TeacherDashboardPage';
import { StudentAssignmentsPage } from './pages/StudentAssignmentsPage';
import { StudentAssignmentSolvePage } from './pages/StudentAssignmentSolvePage';
import { StudentResultPage } from './pages/StudentResultPage';
import { AuthModal } from './components/auth/AuthModal';

// Supabase Authentication Pages
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';
import { VerifyEmailPage } from './pages/auth/VerifyEmailPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { ProfilePage } from './pages/auth/ProfilePage';
import { Cpu } from 'lucide-react';
import { isTeacherRoute, isStudentRoute } from './lib/router';

interface RoleAppProps {
  onNavigate: (route: string) => void;
}

/**
 * TEACHER APPLICATION FRONTEND
 * Exclusively renders Teacher Dashboard, Teacher Navigation, Rubric & Assignment Authoring,
 * Submission Review Queue, and Class Intelligence.
 */
const TeacherApp: React.FC<RoleAppProps> = ({ onNavigate }) => {
  const { theme } = useTheme();
  const {
    activeTab,
    setActiveTab,
    sidebarCollapsed,
    toggleSidebar,
    isAuthModalOpen,
    setAuthModalOpen,
  } = useApp();

  // Role Protection: Ensure teacher starts on teacher dashboard and cannot be on student-only routes
  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/' || isStudentRoute(path)) {
      setActiveTab('teacher-dashboard');
    }
  }, [setActiveTab]);

  const renderTeacherPage = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfilePage onNavigate={onNavigate} />;
      case 'settings':
        return <SettingsPage />;
      case 'assessment':
        return <AssessmentPage />;
      case 'teacher-dashboard':
      case 'teacher-assignments':
      case 'teacher-review':
      case 'teacher-analytics':
      default:
        return <TeacherDashboardPage />;
    }
  };

  return (
    <div className={`flex h-screen w-screen overflow-hidden ${
      theme === 'dark' ? 'bg-black text-white' : 'bg-[#F8FAFC] text-slate-900'
    } font-sans selection:bg-[#8052FF] selection:text-white transition-colors duration-200`}>
      {/* Teacher Navigation Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebar}
        role="teacher"
        onNavigate={onNavigate}
      />

      {/* Main Teacher Workspace Column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Teacher Header */}
        <Header
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={toggleSidebar}
          role="teacher"
        />

        {/* Scrollable Teacher Page Content */}
        <main className={`flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 ${
          theme === 'dark' ? 'bg-black text-white' : 'bg-[#F8FAFC] text-slate-900'
        }`}>
          {renderTeacherPage()}
        </main>
      </div>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onNavigate={onNavigate}
      />
    </div>
  );
};

/**
 * STUDENT APPLICATION FRONTEND
 * Exclusively renders Student Dashboard, Course Assignments, Assignment Solver,
 * Evaluated Results, AI Tutor, Smart Study Materials, Focus Mode, and Analytics.
 */
const StudentApp: React.FC<RoleAppProps> = ({ onNavigate }) => {
  const { theme } = useTheme();
  const {
    activeTab,
    setActiveTab,
    sidebarCollapsed,
    toggleSidebar,
    isAuthModalOpen,
    setAuthModalOpen,
  } = useApp();

  // Role Protection: Prevent students from accessing any teacher-only routes
  useEffect(() => {
    const path = window.location.pathname;
    if (isTeacherRoute(path)) {
      setActiveTab('dashboard');
    }
  }, [setActiveTab]);

  const renderStudentPage = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfilePage onNavigate={onNavigate} />;
      case 'settings':
        return <SettingsPage />;
      case 'student-assignments':
        return <StudentAssignmentsPage />;
      case 'student-solve':
        return <StudentAssignmentSolvePage />;
      case 'student-result':
        return <StudentResultPage />;
      case 'tutor':
        return <AITutorPage />;
      case 'study':
        return <StudyMaterialsPage />;
      case 'focus':
        return <FocusModePage />;
      case 'assessment':
        return <AssessmentPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'dashboard':
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className={`flex h-screen w-screen overflow-hidden ${
      theme === 'dark' ? 'bg-black text-white' : 'bg-[#F8FAFC] text-slate-900'
    } font-sans selection:bg-[#8052FF] selection:text-white transition-colors duration-200`}>
      {/* Student Navigation Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebar}
        role="student"
        onNavigate={onNavigate}
      />

      {/* Main Student Workspace Column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Student Header */}
        <Header
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={toggleSidebar}
          role="student"
        />

        {/* Scrollable Student Page Content */}
        <main className={`flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 ${
          theme === 'dark' ? 'bg-black text-white' : 'bg-[#F8FAFC] text-slate-900'
        }`}>
          {renderStudentPage()}
        </main>
      </div>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onNavigate={onNavigate}
      />
    </div>
  );
};

const AppRouter: React.FC = () => {
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname);
  const { loading, isAuthenticated, isEmailVerified, role } = useAuth();

  // Listen to browser forward/back buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new Event('popstate'));
    }
    setCurrentPath(path);
  };

  // 1. Loading splash: prevents flickering or premature wrong-role rendering during session restoration
  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-black text-white">
        <div className="w-12 h-12 rounded-2xl bg-[#8052FF]/15 border border-[#8052FF]/30 flex items-center justify-center text-[#8052FF] animate-pulse mb-3">
          <Cpu className="w-6 h-6" />
        </div>
        <div className="flex items-center gap-1 text-base font-semibold tracking-tight">
          <span>Evall</span>
          <span className="text-[#8052FF]">Q</span>
        </div>
        <p className="text-xs text-[#9A9A9A] font-mono mt-1">Initializing secure session...</p>
      </div>
    );
  }

  // 2. Explicit Auth Routes (Accessible without being logged in)
  if (currentPath === '/signup') {
    return <SignupPage onNavigate={navigate} />;
  }
  if (currentPath === '/verify-email') {
    return <VerifyEmailPage onNavigate={navigate} />;
  }
  if (currentPath === '/forgot-password') {
    return <ForgotPasswordPage onNavigate={navigate} />;
  }
  if (currentPath === '/reset-password') {
    return <ResetPasswordPage onNavigate={navigate} />;
  }
  if (currentPath === '/login') {
    return <LoginPage onNavigate={navigate} onSuccess={() => navigate('/')} />;
  }

  // 3. Protected Route Security Gate:
  // If not authenticated, redirect to Login
  if (!isAuthenticated) {
    return <LoginPage onNavigate={navigate} onSuccess={() => navigate('/')} />;
  }

  // 4. Verification Security Gate:
  // If authenticated but email is unverified, redirect to Email Verification
  if (!isEmailVerified) {
    return <VerifyEmailPage onNavigate={navigate} />;
  }

  // 5. Two Distinct Role-Based Frontends
  // Renders strictly according to verified Supabase profile role
  const effectiveRole = role === 'teacher' ? 'teacher' : 'student';

  if (effectiveRole === 'teacher') {
    return <TeacherApp onNavigate={navigate} />;
  }

  return <StudentApp onNavigate={navigate} />;
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppProvider>
          <AppRouter />
        </AppProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
