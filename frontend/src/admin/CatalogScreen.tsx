import Tab from '@mui/material/Tab';
import { SectionTabs } from './SectionTabs';
import { ProductsScreen } from './ProductsScreen';
import { CategoriesScreen } from './CategoriesScreen';
import { useRouteState } from '../routing';

type Tab = 'products' | 'categories';
const TABS: Tab[] = ['products', 'categories'];

export function CatalogScreen() {
  const [tab, setTab] = useRouteState<Tab>(2, TABS, 'products', (t) => `/admin/catalog/${t}`);

  return (
    <div>
      <SectionTabs value={tab} onChange={setTab}>
        <Tab value="products" label="Products" />
        <Tab value="categories" label="Categories" />
      </SectionTabs>

      {tab === 'products' && <ProductsScreen />}
      {tab === 'categories' && <CategoriesScreen />}
    </div>
  );
}
