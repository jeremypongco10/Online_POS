import type { ReactNode } from 'react';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';

export interface DetailField {
  label: string;
  value: ReactNode;
  /** Full-width row — for longer text like a description or address. */
  fullWidth?: boolean;
}

/** The Active/Inactive badge used across every table's Status column — reused here so a View modal reads the same way the list does. */
export function StatusChip({ active }: { active: boolean }) {
  return <Chip size="small" label={active ? 'Active' : 'Inactive'} color={active ? 'success' : 'default'} sx={{ fontWeight: 600 }} />;
}

/**
 * A read-only label/value grid for a "View" modal — the counterpart to an
 * Add/Edit form's fields, without any inputs. `dense` trades the padded
 * tinted-card look for a tighter, more fields-per-row layout — for a
 * page-level detail panel (not a modal) where the full-size cards read as
 * too much vertical space for what's mostly short values.
 */
export function DetailView({ fields, dense }: { fields: DetailField[]; dense?: boolean }) {
  return (
    <Grid container spacing={dense ? 1 : 1.5}>
      {fields.map((f) => (
        <Grid
          key={f.label}
          size={{
            xs: 12,
            sm: f.fullWidth ? 12 : dense ? 4 : 6,
            md: dense ? (f.fullWidth ? 12 : 2) : undefined,
          }}
        >
          <Paper
            variant="outlined"
            sx={{
              height: '100%',
              p: dense ? 1 : 1.5,
              borderRadius: 2,
              bgcolor: 'action.hover',
              borderColor: 'transparent',
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 600, display: 'block', mb: 0.25, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.6875rem' }}
            >
              {f.label}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-word' }} component="div">
              {f.value ?? '—'}
            </Typography>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
}
