import type { ReactNode } from 'react';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { SearchableSelect } from '../SearchableSelect';
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
        <SearchableSelect
          label="Store"
          value={storeId}
          onChange={onStoreChange}
          sx={{ minWidth: 160 }}
          options={[{ value: '', label: 'All Stores' }, ...stores.map((s) => ({ value: String(s.id), label: s.name }))]}
        />
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
