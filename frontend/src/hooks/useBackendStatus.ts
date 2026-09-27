import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import type { ModelStatusResponse } from '../types';

export interface BackendStatusState {
  connected: boolean;
  loading: boolean;
  error: string | null;
  modelStatus: ModelStatusResponse | null;
  retry: () => Promise<void>;
}

export const useBackendStatus = (): BackendStatusState => {
  const [connected, setConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [modelStatus, setModelStatus] = useState<ModelStatusResponse | null>(null);

  const checkStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Verify health endpoint
      const health = await api.getHealth();
      if (health.status === 'healthy') {
        setConnected(true);
        // 2. Fetch model status
        try {
          const status = await api.getModelStatus();
          setModelStatus(status);
        } catch {
          // If model status fails but health passes, keep connected
        }
      } else {
        setConnected(false);
        setError('Backend returned unhealthy status.');
      }
    } catch (err) {
      setConnected(false);
      setModelStatus(null);
      setError(
        err instanceof Error ? err.message : 'Backend unavailable. Ensure FastAPI is running.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  return {
    connected,
    loading,
    error,
    modelStatus,
    retry: checkStatus,
  };
};
