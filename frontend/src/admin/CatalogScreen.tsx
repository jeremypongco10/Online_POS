import { useEffect } from 'react';
import Tab from '@mui/material/Tab';
import { SectionTabs } from './SectionTabs';
import { ProductsScreen } from './ProductsScreen';
import { CategoriesScreen } from './CategoriesScreen';
import { AddProductsScreen } from './AddProductsScreen';
import { ProductLookupScreen } from './ProductLookupScreen';
import { useAuth } from '../auth/AuthContext';
import { useRouteState } from '../routing';

type Tab = 'products' | 'categories' | 'add' | 'search';
// Most-used-first: find something that already exists, browse the full
// list, create something new, then manage categories (supporting data,
// touched least often). This order also drives the default landing tab —
// see availableTabs[0] below.
const TABS: Tab[] = ['search', 'products', 'add', 'categories'];
const TAB_LABELS: Record<Tab, string> = { products: 'Products', categories: 'Categories', add: 'Add New Products', search: 'Search Product' };
// Adding products is gated on the same permission the existing Add Product
// button already required. Search only reads product data (plus inventory,
// handled gracefully if that permission is missing — see
// ProductLookupScreen), so it rides on products.view like the list itself.
const TAB_PERMISSIONS: Record<Tab, string> = {
  products: 'products.view',
  categories: 'categories.view',
  add: 'products.create',
  search: 'products.view',
};

export function CatalogScreen() {
  const { hasPermission } = useAuth();
  // A role can hold categories.view without products.view (or vice
  // versa) — the tab list, and which one it opens to by default, has to
  // reflect whichever this particular user actually has.
  const availableTabs = TABS.filter((t) => hasPermission(TAB_PERMISSIONS[t]));
  const [tab, setTab] = useRouteState<Tab>(2, TABS, availableTabs[0] ?? 'search', (t) => `/admin/catalog/${t}`);

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

      {tab === 'search' && hasPermission('products.view') && <ProductLookupScreen />}
      {tab === 'products' && hasPermission('products.view') && <ProductsScreen />}
      {tab === 'add' && hasPermission('products.create') && <AddProductsScreen />}
      {tab === 'categories' && hasPermission('categories.view') && <CategoriesScreen />}
    </div>
  );
}
