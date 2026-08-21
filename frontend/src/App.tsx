import { useEffect, useLayoutEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { canAccessPos } from './auth/posAccess';
import { ConfirmProvider } from './ConfirmDialog';
import { SnackbarProvider } from './Snackbar';
import { Login } from './Login';
import { PosScreen } from './pos/PosScreen';
import { AdminScreen } from './admin/AdminScreen';
import { useRouteState } from './routing';
import './pos/pos.css';
import './admin/admin.css';

type View = 'pos' | 'admin';
const VIEWS: View[] = ['pos', 'admin'];

function Gate() {
  const { user, loading } = useAuth();
  const [view, setView] = useRouteState<View>(0, VIEWS, 'pos', (v) => (v === 'pos' ? '/' : `/${v}`));

  // Applies once per login, not on every render — otherwise clicking
  // "Back to POS" from the Back Office would immediately bounce a
  // non-cashier user right back out again, since that click also lands
  // them on view==='pos' at path '/'.
  const appliedDefaultFor = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (!user || appliedDefaultFor.current === user.id) return;
    appliedDefaultFor.current = user.id;

    const noExplicitPathVisited = window.location.pathname === '/';
    if (!canAccessPos(user) && noExplicitPathVisited) {
      setView('admin');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // AuthContext.logout() already resets the URL itself back to "/" — this
  // clears the in-memory view state (and the redirect guard above) to
  // match, so a same-tab re-login doesn't inherit wherever the previous
  // session happened to be when they logged out. Guarded on the ref so it
  // never fires on first mount, before the initial auth check resolves.
  useEffect(() => {
    if (loading || user || appliedDefaultFor.current === null) return;
    appliedDefaultFor.current = null;
    setView('pos');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  if (loading) return <div className="loading-screen">Loading…</div>;
  if (!user) return <Login />;

  if (view === 'admin') {
    return <AdminScreen onBackToPos={() => setView('pos')} />;
  }

  // Not just a default-landing preference — a non-cashier role has no POS
  // access at all, so even a direct link to "/" falls back to the Back
  // Office instead of ever rendering the register.
  if (view === 'pos' && !canAccessPos(user)) {
    return <AdminScreen onBackToPos={() => setView('pos')} />;
  }

  return <PosScreen onOpenAdmin={() => setView('admin')} />;
}

function App() {
  return (
    <AuthProvider>
      <SnackbarProvider>
        <ConfirmProvider>
          <Gate />
        </ConfirmProvider>
      </SnackbarProvider>
    </AuthProvider>
  );
}

export default App;
