import React, { useState } from 'react';
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

const MainLayout: React.FC = () => {
  const { activeTab } = useApp();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const renderActivePage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage />;
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
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Workspace Column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {renderActivePage()}
        </main>
      </div>
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
