import React, { createContext, useContext, useState, useEffect } from 'react';
import type {
  TabType,
  UserRole,
  AIModelStatus,
  InferenceDevice,
  SystemModelStatus,
  ModelStatusResponse,
  AuthUser,
} from '../types';
import { useBackendStatus } from '../hooks/useBackendStatus';
import { api } from '../services/api';
import { routeToTab, tabToRoute, isAuthRoute, navigateTo, isTeacherRoute, isStudentRoute } from '../lib/router';
import { useAuth } from './AuthContext';

interface AppContextType {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  currentUser: AuthUser | null;
  setCurrentUser: (user: AuthUser | null) => void;
  aiStatus: AIModelStatus;
  setAiStatus: (status: AIModelStatus) => void;
  isDemoMode: boolean;
  setDemoMode: (val: boolean) => void;
  toggleDemoMode: () => void;
  inferenceDevice: InferenceDevice;
  setInferenceDevice: (device: InferenceDevice) => void;
  systemStatus: SystemModelStatus;
  updateSystemStatus: (status: Partial<SystemModelStatus>) => void;

  // Sidebar navigation state
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;

  // Auth modal & methods
  isAuthModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  login: (email: string, password?: string, role?: string) => Promise<boolean>;
  logout: () => void;
  switchDemoUser: (role: 'teacher' | 'student', studentEmail?: string) => Promise<void>;

  // Student Assignment workflow
  selectedAssignmentId: string | null;
  setSelectedAssignmentId: (id: string | null) => void;
  selectedStudentSubmissionId: string | null;
  setSelectedStudentSubmissionId: (id: string | null) => void;

  // Assessment -> AI Tutor transition context
  tutorInitialPrompt: string | null;
  setTutorInitialPrompt: (prompt: string | null) => void;

  // Teacher Review routing state
  selectedTeacherSubmissionId: string | null;
  setSelectedTeacherSubmissionId: (id: string | null) => void;

  // Backend live integration
  backendConnected: boolean;
  backendLoading: boolean;
  backendError: string | null;
  modelStatus: ModelStatusResponse | null;
  retryBackendConnection: () => Promise<void>;
}

const defaultSystemStatus: SystemModelStatus = {
  llmStatus: 'not_installed',
  speechStatus: 'not_installed',
  visionStatus: 'ready',
  activeDevice: 'CPU',
  deviceTarget: 'On-Device Local AI Engine',
  isEngineActive: true,
  quantization: 'INT4 / Local Quantized',
  memoryUsageMb: 248,
};

const defaultStudentUser: AuthUser = {
  id: 'student-1',
  name: 'Alex Rivera',
  email: 'student@evallq.ai',
  role: 'STUDENT',
};

const defaultTeacherUser: AuthUser = {
  id: 'teacher-1',
  name: 'Prof. Robert Chen',
  email: 'teacher@evallq.ai',
  role: 'TEACHER',
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role: authRole, user: authUser, profile: authProfile } = useAuth();
  const [userRole, setUserRoleState] = useState<UserRole>(() => authRole || 'student');

  // Keep AppContext role strictly in sync with verified Supabase Auth
  useEffect(() => {
    if (authRole) {
      if (authRole !== userRole) {
        setUserRoleState(authRole);
      }
      const path = typeof window !== 'undefined' ? window.location.pathname : '/';
      if (authRole === 'teacher' && (path === '/' || isStudentRoute(path))) {
        setActiveTabState('teacher-dashboard');
      } else if (authRole === 'student' && isTeacherRoute(path)) {
        setActiveTabState('dashboard');
      }
    }
  }, [authRole, userRole]);

  // Keep currentUser in sync with verified Supabase Auth profile
  useEffect(() => {
    if (authUser) {
      setCurrentUser({
        id: authUser.id,
        name: authProfile?.full_name || authUser.user_metadata?.full_name || (authRole === 'teacher' ? 'Prof. Robert Chen' : 'Alex Rivera'),
        email: authUser.email || '',
        role: authRole === 'teacher' ? 'TEACHER' : 'STUDENT',
      });
    }
  }, [authUser, authProfile, authRole]);

  const [activeTab, setActiveTabState] = useState<TabType>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (!isAuthRoute(path) && path !== '/') {
        return routeToTab(path);
      }
      const saved = localStorage.getItem('evallq_active_tab') as TabType;
      if (saved) return saved;
    }
    return 'dashboard';
  });

  const setActiveTab = (tab: TabType) => {
    setActiveTabState(tab);
    if (typeof window !== 'undefined') {
      localStorage.setItem('evallq_active_tab', tab);
      const targetRoute = tabToRoute(tab);
      if (window.location.pathname !== targetRoute) {
        navigateTo(targetRoute);
      }
    }
  };

  // Synchronize activeTab whenever the browser history or URL changes
  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname;
      if (!isAuthRoute(path)) {
        const tab = routeToTab(path, userRole);
        setActiveTabState(tab);
        localStorage.setItem('evallq_active_tab', tab);
      }
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, [userRole]);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(defaultStudentUser);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [isAuthModalOpen, setAuthModalOpen] = useState<boolean>(false);

  const [aiStatus, setAiStatus] = useState<AIModelStatus>('NOT_INSTALLED');
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [inferenceDevice, setInferenceDevice] = useState<InferenceDevice>('AUTO');
  const [systemStatus, setSystemStatus] = useState<SystemModelStatus>(defaultSystemStatus);

  const [selectedAssignmentId, setSelectedAssignmentIdState] = useState<string | null>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('evallq_selected_assignment_id') : null;
  });

  const setSelectedAssignmentId = (id: string | null) => {
    setSelectedAssignmentIdState(id);
    if (typeof window !== 'undefined') {
      if (id) localStorage.setItem('evallq_selected_assignment_id', id);
      else localStorage.removeItem('evallq_selected_assignment_id');
    }
  };

  const [selectedStudentSubmissionId, setSelectedStudentSubmissionIdState] = useState<string | null>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('evallq_selected_submission_id') : null;
  });

  const setSelectedStudentSubmissionId = (id: string | null) => {
    setSelectedStudentSubmissionIdState(id);
    if (typeof window !== 'undefined') {
      if (id) localStorage.setItem('evallq_selected_submission_id', id);
      else localStorage.removeItem('evallq_selected_submission_id');
    }
  };

  const [tutorInitialPrompt, setTutorInitialPrompt] = useState<string | null>(null);
  const [selectedTeacherSubmissionId, setSelectedTeacherSubmissionId] = useState<string | null>(null);

  // Live backend connection & model status
  const {
    connected: backendConnected,
    loading: backendLoading,
    error: backendError,
    modelStatus,
    retry: retryBackendConnection,
  } = useBackendStatus();

  // Try authenticating default user on startup
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = api.getAuthToken();
        if (token) {
          const me = await api.getMe();
          if (me) {
            setCurrentUser(me);
            setUserRoleState(me.role.toLowerCase() as UserRole);
            return;
          }
        }
        // Auto-login Alex Rivera only if no authenticated session exists and no auth role set
        if (!authRole && !authUser) {
          const res = await api.login({ email: 'student@evallq.ai', password: 'student123' });
          if (res?.user) {
            setCurrentUser(res.user);
            setUserRoleState('student');
          }
        }
      } catch (err) {
        console.warn('Backend auto-login on startup deferred:', err);
      }
    };

    initializeAuth();
  }, [authRole, authUser]);

  const login = async (email: string, password?: string, role?: string): Promise<boolean> => {
    try {
      const res = await api.login({ email, password, role });
      if (res?.user) {
        setCurrentUser(res.user);
        const roleLower = res.user.role.toLowerCase() as UserRole;
        setUserRoleState(roleLower);
        if (roleLower === 'teacher') {
          setActiveTab('teacher-dashboard');
        } else {
          setActiveTab('dashboard');
        }
        setAuthModalOpen(false);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Login error:', err);
      throw err;
    }
  };

  const logout = () => {
    api.setAuthToken(null);
    setCurrentUser(null);
    setAuthModalOpen(true);
  };

  const switchDemoUser = async (role: 'teacher' | 'student', studentEmail?: string) => {
    try {
      if (role === 'teacher') {
        const res = await api.login({ email: 'teacher@evallq.ai', password: 'teacher123', role: 'TEACHER' });
        if (res?.user) {
          setCurrentUser(res.user);
          setUserRoleState('teacher');
          setActiveTab('teacher-dashboard');
        }
      } else {
        const email = studentEmail || 'student@evallq.ai';
        const res = await api.login({ email, password: 'student123', role: 'STUDENT' });
        if (res?.user) {
          setCurrentUser(res.user);
          setUserRoleState('student');
          setActiveTab('dashboard');
        }
      }
    } catch (err) {
      // Fallback local switch if network is down
      if (role === 'teacher') {
        setCurrentUser(defaultTeacherUser);
        setUserRoleState('teacher');
        setActiveTab('teacher-dashboard');
      } else {
        setCurrentUser(defaultStudentUser);
        setUserRoleState('student');
        setActiveTab('dashboard');
      }
    }
  };

  const setUserRole = (role: UserRole) => {
    if (authRole && role !== authRole) {
      console.warn(`Role change to ${role} prevented: User is authenticated as ${authRole}.`);
      return;
    }
    switchDemoUser(role);
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => !prev);
  };

  const toggleDemoMode = () => {
    setIsDemoMode(prev => {
      const next = !prev;
      setAiStatus(next ? 'DEMO_MODE' : 'NOT_INSTALLED');
      return next;
    });
  };

  const updateSystemStatus = (status: Partial<SystemModelStatus>) => {
    setSystemStatus(prev => ({ ...prev, ...status }));
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        userRole,
        setUserRole,
        currentUser,
        setCurrentUser,
        aiStatus,
        setAiStatus,
        isDemoMode,
        setDemoMode: setIsDemoMode,
        toggleDemoMode,
        inferenceDevice,
        setInferenceDevice,
        systemStatus,
        updateSystemStatus,
        sidebarCollapsed,
        setSidebarCollapsed,
        toggleSidebar,
        isAuthModalOpen,
        setAuthModalOpen,
        login,
        logout,
        switchDemoUser,
        backendConnected,
        backendLoading,
        backendError,
        modelStatus,
        retryBackendConnection,
        selectedAssignmentId,
        setSelectedAssignmentId,
        selectedStudentSubmissionId,
        setSelectedStudentSubmissionId,
        tutorInitialPrompt,
        setTutorInitialPrompt,
        selectedTeacherSubmissionId,
        setSelectedTeacherSubmissionId,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
