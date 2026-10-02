import { useEffect, useState } from 'react';
import Tab from '@mui/material/Tab';
import { SectionTabs } from './SectionTabs';
import { SuppliersScreen } from './SuppliersScreen';
import { PurchaseOrdersScreen, type PoIntent } from './PurchaseOrdersScreen';
import type { SupplierDirectoryRow } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { useRouteState } from '../routing';

type Tab = 'suppliers' | 'purchase-orders';
const TABS: Tab[] = ['purchase-orders', 'suppliers'];
const TAB_LABELS: Record<Tab, string> = { suppliers: 'Suppliers', 'purchase-orders': 'Purchase Orders' };
const TAB_PERMISSIONS: Record<Tab, string> = { suppliers: 'suppliers.view', 'purchase-orders': 'purchases.view' };

export function PurchasingScreen() {
  const { hasPermission } = useAuth();
  // A role can hold purchases.view without suppliers.view (or vice
  // versa) — the tab list, and which one it opens to by default, has to
  // reflect whichever this particular user actually has.
  const availableTabs = TABS.filter((t) => hasPermission(TAB_PERMISSIONS[t]));
  const [tab, setTab] = useRouteState<Tab>(2, TABS, availableTabs[0] ?? 'suppliers', (t) => `/admin/purchasing/${t}`);
  // Handed from Suppliers to Purchase Orders when a supplier's "View all
  // orders" or "New purchase order" is used; cleared once acted on.
  const [poIntent, setPoIntent] = useState<PoIntent | null>(null);
  const goToOrders = (s: SupplierDirectoryRow, action: PoIntent['action']) => {
    setPoIntent({ supplier: { id: s.id, name: s.name, contact_name: s.contact_name, phone: s.phone, email: s.email }, action });
    setTab('purchase-orders');
  };
  const canOrders = hasPermission('purchases.view');

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

      {tab === 'suppliers' && hasPermission('suppliers.view') && (
        <SuppliersScreen
          onViewOrders={canOrders ? (s) => goToOrders(s, 'view') : undefined}
          onNewOrder={canOrders ? (s) => goToOrders(s, 'new') : undefined}
        />
      )}
      {tab === 'purchase-orders' && hasPermission('purchases.view') && (
        <PurchaseOrdersScreen intent={poIntent} onIntentHandled={() => setPoIntent(null)} />
      )}
    </div>
  );
}
