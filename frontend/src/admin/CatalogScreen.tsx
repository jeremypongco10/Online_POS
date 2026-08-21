import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { ProductsScreen } from './ProductsScreen';
import { CategoriesScreen } from './CategoriesScreen';
import { useRouteState } from '../routing';

type Tab = 'products' | 'categories';
const TABS: Tab[] = ['products', 'categories'];

export function CatalogScreen() {
  const [tab, setTab] = useRouteState<Tab>(2, TABS, 'products', (t) => `/admin/catalog/${t}`);

  return (
    <div>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', mb: 2.25 }}>
        <Typography variant="h5">Catalog</Typography>
      </Stack>

      <Tabs
        value={tab}
        onChange={(_, value) => setTab(value)}
        sx={{ mb: 2.25, borderBottom: '1px solid', borderColor: 'divider', minHeight: 40 }}
      >
        <Tab value="products" label="Products" sx={{ minHeight: 40, textTransform: 'none' }} />
        <Tab value="categories" label="Categories" sx={{ minHeight: 40, textTransform: 'none' }} />
      </Tabs>

      {tab === 'products' && <ProductsScreen />}
      {tab === 'categories' && <CategoriesScreen />}
    </div>
  );
}
