import { useEffect } from 'react';
import Tab from '@mui/material/Tab';
import { SectionTabs } from './SectionTabs';
import { CustomersScreen } from './CustomersScreen';
import { ReturnsScreen } from './ReturnsScreen';
import { useAuth } from '../auth/AuthContext';
import { useRouteState } from '../routing';

type Tab = 'customers' | 'returns';
const TABS: Tab[] = ['customers', 'returns'];
const TAB_LABELS: Record<Tab, string> = { customers: 'Customers', returns: 'Returns' };
const TAB_PERMISSIONS: Record<Tab, string> = { customers: 'customers.view', returns: 'returns.view' };

export function CustomerRelationsScreen() {
  const { hasPermission } = useAuth();
  // A role can hold returns.view without customers.view (or vice versa)
  // — the tab list, and which one it opens to by default, has to
  // reflect whichever this particular user actually has.
  const availableTabs = TABS.filter((t) => hasPermission(TAB_PERMISSIONS[t]));
  const [tab, setTab] = useRouteState<Tab>(2, TABS, availableTabs[0] ?? 'customers', (t) => `/admin/customers/${t}`);

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

      {tab === 'customers' && hasPermission('customers.view') && <CustomersScreen />}
      {tab === 'returns' && hasPermission('returns.view') && <ReturnsScreen />}
    </div>
  );
}
