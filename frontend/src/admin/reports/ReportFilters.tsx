import type { ReactNode } from 'react';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import type { Store } from '../../api/types';

interface Props {
  stores: Store[];
  storeId: string;
  onStoreChange: (storeId: string) => void;
  from: string;
  onFromChange: (from: string) => void;
  to: string;
  onToChange: (to: string) => void;
  /** Some reports (store-sales) always break out every store, so the store filter doesn't apply. */
  hideStore?: boolean;
  children?: ReactNode;
}

export function ReportFilters({ stores, storeId, onStoreChange, from, onFromChange, to, onToChange, hideStore, children }: Props) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ mb: 2.25, flexWrap: 'wrap' }}>
      {!hideStore && (
        <TextField select label="Store" value={storeId} onChange={(e) => onStoreChange(e.target.value)} sx={{ minWidth: 160 }}>
          <MenuItem value="">All Stores</MenuItem>
          {stores.map((s) => (
            <MenuItem key={s.id} value={s.id}>
              {s.name}
            </MenuItem>
          ))}
        </TextField>
      )}
      <TextField
        label="From"
        type="date"
        value={from}
        onChange={(e) => onFromChange(e.target.value)}
        slotProps={{ inputLabel: { shrink: true } }}
        sx={{ minWidth: 160 }}
      />
      <TextField
        label="To"
        type="date"
        value={to}
        onChange={(e) => onToChange(e.target.value)}
        slotProps={{ inputLabel: { shrink: true } }}
        sx={{ minWidth: 160 }}
      />
      {children}
    </Stack>
  );
}
