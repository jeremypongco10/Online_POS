import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { SalesReportsScreen } from './reports/SalesReportsScreen';
import { InventoryReportsScreen } from './reports/InventoryReportsScreen';
import { useRouteState } from '../routing';

type Tab = 'sales' | 'inventory';
const TABS: Tab[] = ['sales', 'inventory'];

export function ReportsScreen() {
  const [tab, setTab] = useRouteState<Tab>(2, TABS, 'sales', (t) => `/admin/reports/${t}`);

  return (
    <div>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', mb: 2.25 }}>
        <Typography variant="h5">Reports</Typography>
      </Stack>

      <Tabs
        value={tab}
        onChange={(_, value) => setTab(value)}
        sx={{ mb: 2.25, borderBottom: '1px solid', borderColor: 'divider', minHeight: 40 }}
      >
        <Tab value="sales" label="Sales" sx={{ minHeight: 40, textTransform: 'none' }} />
        <Tab value="inventory" label="Inventory" sx={{ minHeight: 40, textTransform: 'none' }} />
      </Tabs>

      {tab === 'sales' && <SalesReportsScreen />}
      {tab === 'inventory' && <InventoryReportsScreen />}
    </div>
  );
}
