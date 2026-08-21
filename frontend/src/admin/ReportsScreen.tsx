import Tab from '@mui/material/Tab';
import { SectionTabs } from './SectionTabs';
import { SalesReportsScreen } from './reports/SalesReportsScreen';
import { InventoryReportsScreen } from './reports/InventoryReportsScreen';
import { useRouteState } from '../routing';

type Tab = 'sales' | 'inventory';
const TABS: Tab[] = ['sales', 'inventory'];

export function ReportsScreen() {
  const [tab, setTab] = useRouteState<Tab>(2, TABS, 'sales', (t) => `/admin/reports/${t}`);

  return (
    <div>
      <SectionTabs value={tab} onChange={setTab}>
        <Tab value="sales" label="Sales" />
        <Tab value="inventory" label="Inventory" />
      </SectionTabs>

      {tab === 'sales' && <SalesReportsScreen />}
      {tab === 'inventory' && <InventoryReportsScreen />}
    </div>
  );
}
