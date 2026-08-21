import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { api, setTokens, getAccessToken, setUnauthorizedHandler } from '../api/client';
import type { AuthUser } from '../api/types';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  sessionExpired: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (slug: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    if (!getAccessToken()) {
      setLoading(false);
      return;
    }
    api
      .get<AuthUser>('/auth/me')
      .then(setUser)
      .catch(() => setTokens(null, null))
      .finally(() => setLoading(false));
  }, []);

  // Any request anywhere in the app that comes back unauthenticated with no
  // way to recover (refresh failed, or there was never a valid session)
  // drops the user here — without this, a screen whose fetch 401s just
  // sits there silently instead of bouncing back to the Login screen.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser((prev) => {
        if (prev) setSessionExpired(true);
        return null;
      });
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    const data = await api.post<{ access_token: string; refresh_token: string; user: AuthUser }>(
      '/auth/login',
      { identifier, password }
    );
    setTokens(data.access_token, data.refresh_token);
    const me = await api.get<AuthUser>('/auth/me');
    setSessionExpired(false);
    setUser(me);
  }, []);

  const logout = useCallback(() => {
    api.post('/auth/logout').catch(() => {});
    setTokens(null, null);
    setSessionExpired(false);
    setUser(null);
    // Otherwise the address bar is left showing wherever they were (e.g.
    // /admin/team) while the Login screen renders over it — and the next
    // login (same tab, possibly a different user) would inherit that
    // stale path instead of starting clean.
    window.history.replaceState(null, '', '/');
  }, []);

  const hasPermission = useCallback(
    (slug: string) => user?.permissions.includes(slug) ?? false,
    [user]
  );

  return (
    <AuthContext.Provider value={{ user, loading, sessionExpired, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
