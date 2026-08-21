import { useEffect, useRef, useState } from 'react';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import Stack from '@mui/material/Stack';
import { api } from '../api/client';
import type { ProductWithStorePrice } from '../api/types';
import { formatMoney } from './format';
import { SearchField } from '../SearchField';

interface Props {
  companyId: number;
  storeId: number | null;
  onAdd: (product: ProductWithStorePrice) => void;
}

export function ProductSearch({ companyId, storeId, onAdd }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductWithStorePrice[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim() === '' || !storeId) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(() => {
      setLoading(true);
      api
        .get<ProductWithStorePrice[]>(
          `/products?company_id=${companyId}&store_id=${storeId}&is_active=1&per_page=8&q=${encodeURIComponent(query)}`
        )
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, companyId, storeId]);

  return (
    <Paper variant="outlined" sx={{ p: 2.25, borderRadius: 1.5 }}>
      <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: '0.06em' }}>
        Product Search
      </Typography>
      <SearchField
        value={query}
        onChange={setQuery}
        autoFocus
        fullWidth
        sx={{ mt: 1.25 }}
      />
      {loading && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Searching…
        </Typography>
      )}
      {results.length > 0 && (
        <Paper variant="outlined" sx={{ mt: 1.25, borderRadius: 1, overflow: 'hidden' }}>
          <List disablePadding>
            {results.map((p) => {
              const unpriced = p.selling_price === null;
              return (
                <ListItemButton
                  key={p.id}
                  divider
                  disabled={unpriced}
                  onClick={() => {
                    if (unpriced) return;
                    onAdd(p);
                    setQuery('');
                    setResults([]);
                  }}
                >
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 1.25 }}>
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      {p.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {p.sku}
                    </Typography>
                    <Typography variant="caption" color={unpriced ? 'error.main' : 'text.secondary'}>
                      {unpriced ? 'No price set' : formatMoney(parseFloat(p.selling_price as string))}
                    </Typography>
                  </Stack>
                </ListItemButton>
              );
            })}
          </List>
        </Paper>
      )}
    </Paper>
  );
}
