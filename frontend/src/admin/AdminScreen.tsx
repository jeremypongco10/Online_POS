import { AdminLayout, type AdminSection } from './AdminLayout';
import { DashboardBody } from '../dashboard/DashboardScreen';
import { CatalogScreen } from './CatalogScreen';
import { InventoryScreen } from './InventoryScreen';
import { PurchasingScreen } from './PurchasingScreen';
import { CustomerRelationsScreen } from './CustomerRelationsScreen';
import { CashDrawersScreen } from './CashDrawersScreen';
import { TeamScreen } from './TeamScreen';
import { ReportsScreen } from './ReportsScreen';
import { SettingsScreen } from './SettingsScreen';
import { useRouteState } from '../routing';

const SECTIONS: AdminSection[] = ['dashboard', 'products', 'inventory', 'purchasing', 'customers', 'cash', 'team', 'reports', 'settings'];

interface Props {
  onBackToPos: () => void;
}

export function AdminScreen({ onBackToPos }: Props) {
  const [section, setSection] = useRouteState<AdminSection>(1, SECTIONS, 'dashboard', (s) => `/admin/${s}`);

  /**
   * Jump to another section AND land on a specific tab within it — what
   * the Setup Guide's pricing and opening-stock steps need, since those
   * finish outside Settings.
   *
   * The replaceState has to come after setSection, not before: setSection
   * pushes its own `/admin/{section}` synchronously, so a path written
   * first would simply be overwritten. Both run inside this handler,
   * before React re-renders — so by the time the destination screen mounts
   * and its own useRouteState reads window.location, the deeper path is
   * already the one in the bar and it opens on the right tab.
   */
  const goToSectionTab = ({ section: next, tab }: { section: AdminSection; tab: string }) => {
    setSection(next);
    window.history.replaceState(null, '', `/admin/${next}/${tab}`);
  };

  return (
    <AdminLayout section={section} onSectionChange={setSection} onBackToPos={onBackToPos}>
      {section === 'dashboard' && <DashboardBody onNavigate={setSection} onBackToPos={onBackToPos} />}
      {section === 'products' && <CatalogScreen />}
      {section === 'inventory' && <InventoryScreen />}
      {section === 'purchasing' && <PurchasingScreen />}
      {section === 'customers' && <CustomerRelationsScreen />}
      {section === 'cash' && <CashDrawersScreen />}
      {section === 'team' && <TeamScreen />}
      {section === 'reports' && <ReportsScreen />}
      {section === 'settings' && <SettingsScreen onNavigateSection={goToSectionTab} />}
    </AdminLayout>
  );
}
