import { useEffect, useRef, useState } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { api } from '../api/client';
import type { InventoryStockRow } from '../api/types';
import { fmtQty, n, stockStatus, STOCK_STATUS_META } from './inventoryUtils';

interface Props {
  storeId: string;
  value: InventoryStockRow | null;
  onChange: (row: InventoryStockRow | null) => void;
  label?: string;
  autoFocus?: boolean;
  error?: boolean;
  helperText?: string;
}

/**
 * Type-to-search product picker scoped to one branch: each option shows
 * what that branch has on hand, which is the number every adjustment and
 * transfer decision starts from. Searches the server (name, SKU or
 * barcode) instead of loading the whole catalog, so it works the same
 * with 100 products or 10,000. A scanned barcode lands here as typed text.
 */
export function StockProductPicker({ storeId, value, onChange, label = 'Product', autoFocus, error, helperText }: Props) {
  const [input, setInput] = useState('');
  const [options, setOptions] = useState<InventoryStockRow[]>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The box shows the selected product's label; that label isn't a search,
  // so searching uses only what the user actually typed.
  const optionLabel = (o: InventoryStockRow) => `${o.name} (${o.sku})`;
  const query = value && input === optionLabel(value) ? '' : input.trim();

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!storeId) {
      setOptions([]);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(() => {
      api
        .get<InventoryStockRow[]>(`/inventory/stock?store_id=${storeId}&per_page=12&q=${encodeURIComponent(query)}`)
        .then(setOptions)
        .catch(() => setOptions([]))
        .finally(() => setLoading(false));
    }, 220);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query, storeId]);

  return (
    <Autocomplete
      options={value && !options.some((o) => o.product_id === value.product_id) ? [value, ...options] : options}
      value={value}
      onChange={(_, row) => onChange(row)}
      inputValue={input}
      // 'reset' is MUI writing the chosen product's name into the box — keep it, or a preselected product shows as blank.
      onInputChange={(_, text) => setInput(text)}
      filterOptions={(x) => x}
      getOptionLabel={optionLabel}
      isOptionEqualToValue={(a, b) => a.product_id === b.product_id}
      loading={loading}
      disabled={!storeId}
      noOptionsText={query ? 'No tracked product matches' : 'Start typing a name, SKU or barcode'}
      renderOption={(props, o) => {
        const { key, ...rest } = props as typeof props & { key: string };
        const status = STOCK_STATUS_META[stockStatus(n(o.quantity), n(o.reorder_level))];
        return (
          <Box component="li" key={key} {...rest} sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                {o.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {o.sku}
                {o.barcode ? ` · ${o.barcode}` : ''}
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 700, color: status.sx, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
              {fmtQty(o.quantity)} {o.unit ?? ''}
            </Typography>
          </Box>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          autoFocus={autoFocus}
          error={error}
          helperText={helperText ?? (storeId ? undefined : 'Pick a branch first')}
          slotProps={{
            ...params.slotProps,
            input: {
              ...params.slotProps.input,
              endAdornment: (
                <>
                  {loading ? <CircularProgress size={16} /> : null}
                  {params.slotProps.input.endAdornment}
                </>
              ),
            },
          }}
        />
      )}
    />
  );
}
