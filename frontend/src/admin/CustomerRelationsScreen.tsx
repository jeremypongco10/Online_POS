import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { CustomersScreen } from './CustomersScreen';
import { ReturnsScreen } from './ReturnsScreen';
import { useRouteState } from '../routing';

type Tab = 'customers' | 'returns';
const TABS: Tab[] = ['customers', 'returns'];

export function CustomerRelationsScreen() {
  const [tab, setTab] = useRouteState<Tab>(2, TABS, 'customers', (t) => `/admin/customers/${t}`);

  return (
    <div>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', mb: 2.25 }}>
        <Typography variant="h5">Customers</Typography>
      </Stack>

      <Tabs
        value={tab}
        onChange={(_, value) => setTab(value)}
        sx={{ mb: 2.25, borderBottom: '1px solid', borderColor: 'divider', minHeight: 40 }}
      >
        <Tab value="customers" label="Customers" sx={{ minHeight: 40, textTransform: 'none' }} />
        <Tab value="returns" label="Returns" sx={{ minHeight: 40, textTransform: 'none' }} />
      </Tabs>

      {tab === 'customers' && <CustomersScreen />}
      {tab === 'returns' && <ReturnsScreen />}
    </div>
  );
}
