import { useEffect, useState } from 'react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import { api } from '../api/client';
import type { Bagger } from '../api/types';
import { SearchableSelect } from '../admin/SearchableSelect';
import { POS_ACCENT } from './format';
import { initialsForName } from './productColor';

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
    <Stack spacing={2}>
      {/* The dialog's own title already says "Bagger" — this reads as the
          answer to that question (who's assigned right now), not a
          second label for the same thing. */}
      <Stack
        direction="row"
        spacing={1.5}
        sx={{ alignItems: 'center', p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}
      >
        <Avatar
          sx={{
            width: 44,
            height: 44,
            fontWeight: 700,
            bgcolor: bagger ? POS_ACCENT : 'action.selected',
            color: bagger ? '#fff' : 'text.secondary',
          }}
        >
          {bagger ? initialsForName(bagger.name) : <Inventory2OutlinedIcon fontSize="small" />}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary">
            Current bagger
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 700 }} noWrap>
            {bagger ? bagger.name : 'None assigned'}
          </Typography>
        </Box>
        {bagger && (
          <Button size="small" color="inherit" onClick={() => onSelect(null)} sx={{ flexShrink: 0 }}>
            Clear
          </Button>
        )}
      </Stack>

      <SearchableSelect
        label="Assign a bagger"
        // `autoFocus` alone loses a race against MUI Dialog's own
        // focus-trap, which reasserts focus (onto the title bar's Close
        // button) once the open transition finishes — ProductBrowser
        // focuses this input explicitly via wrapperId, from the Dialog's
        // `onEntered`, which fires after that trap has already run.
        autoFocus
        wrapperId="bagger-select-wrapper"
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
        <Typography variant="body2" color="text.secondary">
          No active baggers assigned to this store.
        </Typography>
      )}
    </Stack>
  );
}
