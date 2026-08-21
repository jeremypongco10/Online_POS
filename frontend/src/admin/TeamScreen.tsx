import Tab from '@mui/material/Tab';
import { SectionTabs } from './SectionTabs';
import { UsersScreen } from './UsersScreen';
import { RolesScreen } from './RolesScreen';
import { useRouteState } from '../routing';

type Tab = 'users' | 'roles';
const TABS: Tab[] = ['users', 'roles'];

export function TeamScreen() {
  const [tab, setTab] = useRouteState<Tab>(2, TABS, 'users', (t) => `/admin/team/${t}`);

  return (
    <div>
      <SectionTabs value={tab} onChange={setTab}>
        <Tab value="users" label="Users" />
        <Tab value="roles" label="Roles" />
      </SectionTabs>

      {tab === 'users' && <UsersScreen />}
      {tab === 'roles' && <RolesScreen />}
    </div>
  );
}
