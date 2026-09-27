import React, { createContext, useContext, useState } from 'react';
import type { TabType, AIModelStatus, InferenceDevice, SystemModelStatus, ModelStatusResponse } from '../types';
import { useBackendStatus } from '../hooks/useBackendStatus';

interface AppContextType {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  aiStatus: AIModelStatus;
  setAiStatus: (status: AIModelStatus) => void;
  isDemoMode: boolean;
  setDemoMode: (val: boolean) => void;
  toggleDemoMode: () => void;
  inferenceDevice: InferenceDevice;
  setInferenceDevice: (device: InferenceDevice) => void;
  systemStatus: SystemModelStatus;
  updateSystemStatus: (status: Partial<SystemModelStatus>) => void;

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
  deviceTarget: 'Snapdragon X Elite / X Plus / Snapdragon X2',
  isSnapdragonDetected: false,
  npuAvailable: false,
  quantization: 'INT4 / W4A16 (Qualcomm AI Hub Target)',
  memoryUsageMb: 248,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [aiStatus, setAiStatus] = useState<AIModelStatus>('NOT_INSTALLED');
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [inferenceDevice, setInferenceDevice] = useState<InferenceDevice>('AUTO');
  const [systemStatus, setSystemStatus] = useState<SystemModelStatus>(defaultSystemStatus);

  // Live backend connection & model status
  const {
    connected: backendConnected,
    loading: backendLoading,
    error: backendError,
    modelStatus,
    retry: retryBackendConnection,
  } = useBackendStatus();

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
        aiStatus,
        setAiStatus,
        isDemoMode,
        setDemoMode: setIsDemoMode,
        toggleDemoMode,
        inferenceDevice,
        setInferenceDevice,
        systemStatus,
        updateSystemStatus,
        backendConnected,
        backendLoading,
        backendError,
        modelStatus,
        retryBackendConnection,
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
