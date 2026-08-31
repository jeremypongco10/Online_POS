import { useEffect, useRef, useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import GridViewIcon from '@mui/icons-material/GridView';
import ViewListIcon from '@mui/icons-material/ViewList';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import { api } from '../api/client';
import type { Category, ProductWithStorePrice } from '../api/types';
import { formatMoney, POS_ACCENT, THIN_SCROLLBAR_SX } from './format';
import { SearchField } from '../SearchField';
import { CategoryPills } from './CategoryPills';
import { ProductGrid } from './ProductGrid';

type CategoryNode = Category & { children: CategoryNode[] };
type ViewMode = 'grid' | 'list';

interface Props {
  companyId: number;
  storeId: number | null;
  onAdd: (product: ProductWithStorePrice) => void;
  /** Add Customer / overflow / account controls — rendered here, next to the search bar, since there's no separate header row above it anymore. */
  toolbarExtra?: ReactNode;
  /** Refund/Return/Cancellation — pinned below the results, outside the scrollable area. */
  bottomExtra?: ReactNode;
}

/**
 * Category browsing + name/SKU/barcode search feeding a product grid (or
 * list) — barcode matching and category_id filtering are both already
 * supported server-side (ProductsController's $searchableFields includes
 * 'barcode', category_id is an accepted list filter), so a barcode scanner
 * that types into this same focused field "just works" with no dedicated
 * scan endpoint — the trailing icon is a visual affordance, not a separate
 * scan integration.
 */
export function ProductSearch({ companyId, storeId, onAdd, toolbarExtra, bottomExtra }: Props) {
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [results, setResults] = useState<ProductWithStorePrice[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    api.get<CategoryNode[]>('/categories/tree').then(setCategories).catch(() => setCategories([]));
  }, [companyId]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!storeId) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(() => {
      setLoading(true);
      const params = new URLSearchParams({
        company_id: String(companyId),
        store_id: String(storeId),
        is_active: '1',
        // 100 is the backend's own hard cap (ProductsController) — high
        // enough that a real catalog isn't silently truncated the way a
        // smaller page size was (a 25th product never showed under "All"
        // with no way to reach it, since this grid has no pagination UI).
        per_page: '100',
      });
      if (query.trim() !== '') params.set('q', query.trim());
      if (categoryId !== null) params.set('category_id', String(categoryId));

      api
        .get<ProductWithStorePrice[]>(`/products?${params.toString()}`)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, categoryId, companyId, storeId]);

  function handleAdd(product: ProductWithStorePrice) {
    onAdd(product);
  }

  const toggleButtonSx = {
    gap: 0.5,
    px: 1.5,
    textTransform: 'none',
    fontWeight: 600,
    '&.Mui-selected': { bgcolor: `${POS_ACCENT}1a`, color: POS_ACCENT, '&:hover': { bgcolor: `${POS_ACCENT}26` } },
  } as const;

  return (
    <Box sx={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexShrink: 0 }}>
        <SearchField
          id="pos-product-search"
          value={query}
          onChange={setQuery}
          placeholder="Search by product name, barcode or SKU"
          autoFocus
          fullWidth
          // Overrides SearchField's own 260px floor — on a narrow phone the
          // toolbar has less than 260px to spare once the view toggle, the
          // overflow menu, and the account avatar are accounted for, and
          // without this the avatar gets pushed past the edge of the
          // viewport and becomes completely unreachable.
          sx={{ minWidth: 0 }}
          trailingAdornment={
            <IconButton size="small" aria-label="Scan barcode" tabIndex={-1} sx={{ color: 'text.secondary' }}>
              <QrCodeScannerIcon fontSize="small" />
            </IconButton>
          }
        />
        {/* Fixed-footprint slot, always present — toggling the spinner's opacity instead of
            mounting/unmounting it means the toolbar's height never changes, so category pills
            and the results grid below never jump when a search starts or finishes. */}
        <Box sx={{ width: 14, height: 14, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress size={14} thickness={5} sx={{ color: POS_ACCENT, opacity: loading ? 1 : 0 }} />
        </Box>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          size="small"
          onChange={(_, v: ViewMode | null) => v && setViewMode(v)}
          sx={{ flexShrink: 0 }}
        >
          <ToggleButton value="grid" sx={toggleButtonSx} aria-label="Grid view">
            <Tooltip title="Grid view">
              <GridViewIcon fontSize="small" />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="list" sx={toggleButtonSx} aria-label="List view">
            <Tooltip title="List view">
              <ViewListIcon fontSize="small" />
            </Tooltip>
          </ToggleButton>
        </ToggleButtonGroup>
        {toolbarExtra}
      </Stack>

      <Box sx={{ mt: 2, flexShrink: 0 }}>
        <CategoryPills categories={categories} selected={categoryId} onSelect={setCategoryId} />
      </Box>

      {/* Only this results area scrolls — everything else in this panel, above and below it, stays put. */}
      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', mt: 2, pr: 0.5, ...THIN_SCROLLBAR_SX }}>
        {viewMode === 'grid' ? (
          <ProductGrid products={results} onAdd={handleAdd} />
        ) : (
          <ProductListView results={results} onAdd={handleAdd} />
        )}
      </Box>

      {bottomExtra && <Box sx={{ mt: 2, flexShrink: 0 }}>{bottomExtra}</Box>}
    </Box>
  );
}

function ProductListView({
  results,
  onAdd,
}: {
  results: ProductWithStorePrice[];
  onAdd: (product: ProductWithStorePrice) => void;
}) {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 1, overflow: 'hidden' }}>
      <List disablePadding>
        {results.map((p, i) => {
          const unpriced = p.selling_price === null;
          return (
            <ListItemButton key={p.id} divider={i < results.length - 1} disabled={unpriced} onClick={() => !unpriced && onAdd(p)}>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 1.25 }}>
                <Typography variant="body2" sx={{ flex: 1 }}>
                  {p.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {p.sku}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: unpriced ? 'error.main' : POS_ACCENT }}>
                  {unpriced ? 'No price set' : formatMoney(parseFloat(p.selling_price as string))}
                </Typography>
              </Stack>
            </ListItemButton>
          );
        })}
      </List>
    </Paper>
  );
}
