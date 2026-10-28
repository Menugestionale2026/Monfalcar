import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api } from './api';
import { AUTH_LOST_EVENT } from './api/appsScriptApi';
import type { AdminUser } from '../types';
import { Loading } from '../components/Notice';

interface AuthState {
  user: AdminUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Entra con il codice del link "password dimenticata" */
  redeemReset: (token: string) => Promise<void>;
  /** true se il collegamento al servizio non ha risposto al caricamento: l'accesso salvato non è stato controllato */
  offline: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .getSession()
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .catch(() => {
        if (!cancelled) {
          setUser(null);
          setOffline(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const u = await api.signIn(email, password);
    setUser(u);
  }, []);

  const signOut = useCallback(async () => {
    await api.signOut();
    setUser(null);
  }, []);

  const redeemReset = useCallback(async (token: string) => {
    const u = await api.redeemResetToken(token);
    setUser(u);
  }, []);

  // Il servizio dice che l'accesso non vale più (scaduto, password cambiata da un altro dispositivo...)
  useEffect(() => {
    const onLost = () => setUser(null);
    window.addEventListener(AUTH_LOST_EVENT, onLost);
    return () => window.removeEventListener(AUTH_LOST_EVENT, onLost);
  }, []);

  const value = useMemo(
    () => ({ user, loading, offline, signIn, signOut, redeemReset }),
    [user, loading, offline, signIn, signOut, redeemReset],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth va usato dentro AuthProvider');
  return ctx;
}

/** Mostra la pagina solo a chi ha fatto l'accesso come gestore. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  // Entrato con la password provvisoria o dal link "password dimenticata": prima si sceglie la nuova password.
  if (api.isRecoverySession() && location.pathname !== '/admin/account') return <Navigate to="/admin/account" replace />;
  return <>{children}</>;
}
