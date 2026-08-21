import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { SuppliersScreen } from './SuppliersScreen';
import { PurchaseOrdersScreen } from './PurchaseOrdersScreen';
import { useRouteState } from '../routing';

type Tab = 'suppliers' | 'purchase-orders';
const TABS: Tab[] = ['suppliers', 'purchase-orders'];

export function PurchasingScreen() {
  const [tab, setTab] = useRouteState<Tab>(2, TABS, 'suppliers', (t) => `/admin/purchasing/${t}`);

  return (
    <div>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', mb: 2.25 }}>
        <Typography variant="h5">Purchasing</Typography>
      </Stack>

      <Tabs
        value={tab}
        onChange={(_, value) => setTab(value)}
        sx={{ mb: 2.25, borderBottom: '1px solid', borderColor: 'divider', minHeight: 40 }}
      >
        <Tab value="suppliers" label="Suppliers" sx={{ minHeight: 40, textTransform: 'none' }} />
        <Tab value="purchase-orders" label="Purchase Orders" sx={{ minHeight: 40, textTransform: 'none' }} />
      </Tabs>

      {tab === 'suppliers' && <SuppliersScreen />}
      {tab === 'purchase-orders' && <PurchaseOrdersScreen />}
    </div>
  );
}
