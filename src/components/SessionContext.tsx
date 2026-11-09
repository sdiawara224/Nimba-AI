'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { installApiSessionBridge, setSessionToken } from '@/lib/client-session';

export interface AppSession {
  userId: string;
  email: string;
  credits: number;
  mode: 'demo' | 'supabase';
  isAdmin: boolean;
}

interface AppState {
  session: AppSession | null;
  mode: 'demo' | 'supabase';
  aiEnabled: boolean;
  paymentsConfigured: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const SessionContext = createContext<AppState | null>(null);

const initialState: Omit<AppState, 'refresh' | 'logout' | 'loading'> = {
  session: null,
  mode: 'supabase',
  aiEnabled: false,
  paymentsConfigured: false,
};

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initialState);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/session', { cache: 'no-store' });
      if (!response.ok) throw new Error('Session indisponible');
      const data = (await response.json()) as Omit<AppState, 'refresh' | 'logout' | 'loading'>;
      setState({
        session: data.session ?? null,
        mode: data.mode === 'demo' ? 'demo' : 'supabase',
        aiEnabled: Boolean(data.aiEnabled),
        paymentsConfigured: Boolean(data.paymentsConfigured),
      });
    } catch {
      setState(initialState);
    } finally {
      setLoading(false);
    }
  }, []);

  // Installe le pont AVANT le premier refresh : même sans aucun cookie,
  // /api/session recevra le jeton conservé en mémoire / localStorage.
  useEffect(() => installApiSessionBridge(), []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    }).catch(() => undefined);
    setSessionToken(null);
    await refresh();
  }, [refresh]);

  const value = useMemo<AppState>(
    () => ({ ...state, loading, refresh, logout }),
    [state, loading, refresh, logout],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useApp doit être utilisé dans SessionProvider');
  return ctx;
}
