import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { UsersScreen } from './UsersScreen';
import { RolesScreen } from './RolesScreen';
import { useRouteState } from '../routing';

type Tab = 'users' | 'roles';
const TABS: Tab[] = ['users', 'roles'];

export function TeamScreen() {
  const [tab, setTab] = useRouteState<Tab>(2, TABS, 'users', (t) => `/admin/team/${t}`);

  return (
    <div>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', mb: 2.25 }}>
        <Typography variant="h5">Team</Typography>
      </Stack>

      <Tabs
        value={tab}
        onChange={(_, value) => setTab(value)}
        sx={{ mb: 2.25, borderBottom: '1px solid', borderColor: 'divider', minHeight: 40 }}
      >
        <Tab value="users" label="Users" sx={{ minHeight: 40, textTransform: 'none' }} />
        <Tab value="roles" label="Roles" sx={{ minHeight: 40, textTransform: 'none' }} />
      </Tabs>

      {tab === 'users' && <UsersScreen />}
      {tab === 'roles' && <RolesScreen />}
    </div>
  );
}
