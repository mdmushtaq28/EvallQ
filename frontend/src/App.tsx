import React from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AppProvider, useApp } from './context/AppContext';
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

const MainLayout: React.FC = () => {
  const { activeTab, sidebarCollapsed, toggleSidebar, isAuthModalOpen, setAuthModalOpen } = useApp();

  const renderActivePage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage />;
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
      case 'teacher-dashboard':
      case 'teacher-assignments':
      case 'teacher-review':
      case 'teacher-analytics':
        return <TeacherDashboardPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-black text-white font-sans selection:bg-[#8052FF] selection:text-white">
      {/* Navigation Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebar}
      />

      {/* Main Workspace Column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={toggleSidebar}
        />

        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {renderActivePage()}
        </main>
      </div>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <MainLayout />
      </AppProvider>
    </ThemeProvider>
  );
}
