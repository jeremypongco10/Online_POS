import { useEffect } from 'react';
import Tab from '@mui/material/Tab';
import { SectionTabs } from './SectionTabs';
import { UsersScreen } from './UsersScreen';
import { RolesScreen } from './RolesScreen';
import { useAuth } from '../auth/AuthContext';
import { useRouteState } from '../routing';

type Tab = 'users' | 'roles';
const TABS: Tab[] = ['users', 'roles'];
const TAB_LABELS: Record<Tab, string> = { users: 'Users', roles: 'Roles' };
const TAB_PERMISSIONS: Record<Tab, string> = { users: 'users.view', roles: 'roles.view' };

export function TeamScreen() {
  const { hasPermission } = useAuth();
  // A role can hold roles.view without users.view (or vice versa) — the
  // tab list, and which one it opens to by default, has to reflect
  // whichever this particular user actually has.
  const availableTabs = TABS.filter((t) => hasPermission(TAB_PERMISSIONS[t]));
  const [tab, setTab] = useRouteState<Tab>(2, TABS, availableTabs[0] ?? 'users', (t) => `/admin/team/${t}`);

  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.includes(tab)) {
      setTab(availableTabs[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, availableTabs.join(',')]);

  return (
    <div>
      <SectionTabs value={tab} onChange={setTab}>
        {availableTabs.map((t) => (
          <Tab key={t} value={t} label={TAB_LABELS[t]} />
        ))}
      </SectionTabs>

      {tab === 'users' && hasPermission('users.view') && <UsersScreen />}
      {tab === 'roles' && hasPermission('roles.view') && <RolesScreen />}
    </div>
  );
}
