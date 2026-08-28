import { useEffect } from 'react';
import Tab from '@mui/material/Tab';
import { SectionTabs } from './SectionTabs';
import { SalesReportsScreen } from './reports/SalesReportsScreen';
import { InventoryReportsScreen } from './reports/InventoryReportsScreen';
import { AuditTrailScreen } from './AuditTrailScreen';
import { useAuth } from '../auth/AuthContext';
import { useRouteState } from '../routing';

type Tab = 'sales' | 'inventory' | 'audit';
const TABS: Tab[] = ['sales', 'inventory', 'audit'];
const TAB_LABELS: Record<Tab, string> = { sales: 'Sales', inventory: 'Inventory', audit: 'Audit Trail' };
const TAB_PERMISSIONS: Record<Tab, string> = { sales: 'reports.view', inventory: 'reports.view', audit: 'audit.view' };

export function ReportsScreen() {
  const { hasPermission } = useAuth();
  const availableTabs = TABS.filter((t) => hasPermission(TAB_PERMISSIONS[t]));
  const [tab, setTab] = useRouteState<Tab>(2, TABS, availableTabs[0] ?? 'sales', (t) => `/admin/reports/${t}`);

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

      {tab === 'sales' && <SalesReportsScreen />}
      {tab === 'inventory' && <InventoryReportsScreen />}
      {tab === 'audit' && <AuditTrailScreen />}
    </div>
  );
}
