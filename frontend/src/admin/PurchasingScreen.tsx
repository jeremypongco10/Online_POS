import { useEffect } from 'react';
import Tab from '@mui/material/Tab';
import { SectionTabs } from './SectionTabs';
import { SuppliersScreen } from './SuppliersScreen';
import { PurchaseOrdersScreen } from './PurchaseOrdersScreen';
import { useAuth } from '../auth/AuthContext';
import { useRouteState } from '../routing';

type Tab = 'suppliers' | 'purchase-orders';
const TABS: Tab[] = ['suppliers', 'purchase-orders'];
const TAB_LABELS: Record<Tab, string> = { suppliers: 'Suppliers', 'purchase-orders': 'Purchase Orders' };
const TAB_PERMISSIONS: Record<Tab, string> = { suppliers: 'suppliers.view', 'purchase-orders': 'purchases.view' };

export function PurchasingScreen() {
  const { hasPermission } = useAuth();
  // A role can hold purchases.view without suppliers.view (or vice
  // versa) — the tab list, and which one it opens to by default, has to
  // reflect whichever this particular user actually has.
  const availableTabs = TABS.filter((t) => hasPermission(TAB_PERMISSIONS[t]));
  const [tab, setTab] = useRouteState<Tab>(2, TABS, availableTabs[0] ?? 'suppliers', (t) => `/admin/purchasing/${t}`);

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

      {tab === 'suppliers' && hasPermission('suppliers.view') && <SuppliersScreen />}
      {tab === 'purchase-orders' && hasPermission('purchases.view') && <PurchaseOrdersScreen />}
    </div>
  );
}
