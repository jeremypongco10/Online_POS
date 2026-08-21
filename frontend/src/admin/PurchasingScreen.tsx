import Tab from '@mui/material/Tab';
import { SectionTabs } from './SectionTabs';
import { SuppliersScreen } from './SuppliersScreen';
import { PurchaseOrdersScreen } from './PurchaseOrdersScreen';
import { useRouteState } from '../routing';

type Tab = 'suppliers' | 'purchase-orders';
const TABS: Tab[] = ['suppliers', 'purchase-orders'];

export function PurchasingScreen() {
  const [tab, setTab] = useRouteState<Tab>(2, TABS, 'suppliers', (t) => `/admin/purchasing/${t}`);

  return (
    <div>
      <SectionTabs value={tab} onChange={setTab}>
        <Tab value="suppliers" label="Suppliers" />
        <Tab value="purchase-orders" label="Purchase Orders" />
      </SectionTabs>

      {tab === 'suppliers' && <SuppliersScreen />}
      {tab === 'purchase-orders' && <PurchaseOrdersScreen />}
    </div>
  );
}
