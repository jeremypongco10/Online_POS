import { AdminLayout, type AdminSection } from './AdminLayout';
import { DashboardBody } from '../dashboard/DashboardScreen';
import { CatalogScreen } from './CatalogScreen';
import { InventoryScreen } from './InventoryScreen';
import { PurchasingScreen } from './PurchasingScreen';
import { CustomerRelationsScreen } from './CustomerRelationsScreen';
import { TeamScreen } from './TeamScreen';
import { ReportsScreen } from './ReportsScreen';
import { SettingsScreen } from './SettingsScreen';
import { useRouteState } from '../routing';

const SECTIONS: AdminSection[] = ['dashboard', 'catalog', 'inventory', 'purchasing', 'customers', 'team', 'reports', 'settings'];

interface Props {
  onBackToPos: () => void;
}

export function AdminScreen({ onBackToPos }: Props) {
  const [section, setSection] = useRouteState<AdminSection>(1, SECTIONS, 'dashboard', (s) => `/admin/${s}`);

  return (
    <AdminLayout section={section} onSectionChange={setSection} onBackToPos={onBackToPos}>
      {section === 'dashboard' && <DashboardBody />}
      {section === 'catalog' && <CatalogScreen />}
      {section === 'inventory' && <InventoryScreen />}
      {section === 'purchasing' && <PurchasingScreen />}
      {section === 'customers' && <CustomerRelationsScreen />}
      {section === 'team' && <TeamScreen />}
      {section === 'reports' && <ReportsScreen />}
      {section === 'settings' && <SettingsScreen />}
    </AdminLayout>
  );
}
