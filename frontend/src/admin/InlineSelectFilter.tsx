import type { ReactNode } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  minWidth?: number;
  children: ReactNode;
}

/** A `select` filter for a ListToolbar's `extra` slot, with its label inline instead of stacked above (which would make it taller than the rest of the toolbar row). */
export function InlineSelectFilter({ label, value, onChange, minWidth = 180, children }: Props) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
        {label}
      </Typography>
      <TextField select value={value} onChange={(e) => onChange(e.target.value)} sx={{ minWidth }}>
        {children}
      </TextField>
    </Stack>
  );
}
