import Tab from '@mui/material/Tab';
import { SectionTabs } from './SectionTabs';
import { CustomersScreen } from './CustomersScreen';
import { ReturnsScreen } from './ReturnsScreen';
import { useRouteState } from '../routing';

type Tab = 'customers' | 'returns';
const TABS: Tab[] = ['customers', 'returns'];

export function CustomerRelationsScreen() {
  const [tab, setTab] = useRouteState<Tab>(2, TABS, 'customers', (t) => `/admin/customers/${t}`);

  return (
    <div>
      <SectionTabs value={tab} onChange={setTab}>
        <Tab value="customers" label="Customers" />
        <Tab value="returns" label="Returns" />
      </SectionTabs>

      {tab === 'customers' && <CustomersScreen />}
      {tab === 'returns' && <ReturnsScreen />}
    </div>
  );
}
