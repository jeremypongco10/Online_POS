import { useEffect } from 'react';
import Tab from '@mui/material/Tab';
import { SectionTabs } from './SectionTabs';
import { ProductsScreen } from './ProductsScreen';
import { CategoriesScreen } from './CategoriesScreen';
import { useAuth } from '../auth/AuthContext';
import { useRouteState } from '../routing';

type Tab = 'products' | 'categories';
const TABS: Tab[] = ['products', 'categories'];
const TAB_LABELS: Record<Tab, string> = { products: 'Products', categories: 'Categories' };
const TAB_PERMISSIONS: Record<Tab, string> = { products: 'products.view', categories: 'categories.view' };

export function CatalogScreen() {
  const { hasPermission } = useAuth();
  // A role can hold categories.view without products.view (or vice
  // versa) — the tab list, and which one it opens to by default, has to
  // reflect whichever this particular user actually has.
  const availableTabs = TABS.filter((t) => hasPermission(TAB_PERMISSIONS[t]));
  const [tab, setTab] = useRouteState<Tab>(2, TABS, availableTabs[0] ?? 'products', (t) => `/admin/catalog/${t}`);

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

      {tab === 'products' && hasPermission('products.view') && <ProductsScreen />}
      {tab === 'categories' && hasPermission('categories.view') && <CategoriesScreen />}
    </div>
  );
}
