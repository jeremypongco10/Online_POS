import { useEffect, useState } from 'react';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import { api } from '../api/client';
import type { Bagger } from '../api/types';
import { SearchableSelect } from '../admin/SearchableSelect';

interface Props {
  storeId: number | null;
  bagger: Bagger | null;
  onSelect: (bagger: Bagger | null) => void;
}

export function BaggerPanel({ storeId, bagger, onSelect }: Props) {
  const [baggers, setBaggers] = useState<Bagger[]>([]);

  useEffect(() => {
    if (!storeId) {
      setBaggers([]);
      return;
    }
    api
      .get<Bagger[]>(`/stores/${storeId}/baggers`)
      .then(setBaggers)
      .catch(() => setBaggers([]));
  }, [storeId]);

  return (
    <Paper variant="outlined" sx={{ p: 2.25, borderRadius: 1.5 }}>
      <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: '0.06em' }}>
        Bagger
      </Typography>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'baseline', mt: 1.25, mb: 1.5 }}>
        <Typography variant="body2" color="text.secondary" sx={{ width: 70, flexShrink: 0 }}>
          Bagger:
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {bagger ? bagger.name : '—'}
        </Typography>
      </Stack>
      <SearchableSelect
        value={bagger?.id ? String(bagger.id) : ''}
        onChange={(v) => {
          // Backend JSON encodes bigint columns as strings (e.g. "3"), so
          // compare numerically rather than with strict === — a plain
          // `b.id === Number(v)` would always be false and silently reset
          // the selection back to "No bagger".
          const selected = baggers.find((b) => Number(b.id) === Number(v)) ?? null;
          onSelect(selected);
        }}
        fullWidth
        options={[{ value: '', label: 'No bagger' }, ...baggers.map((b) => ({ value: String(b.id), label: b.name }))]}
      />
      {storeId && baggers.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          No active baggers assigned to this store.
        </Typography>
      )}
    </Paper>
  );
}
