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

/** A read-only label/value grid for a "View" modal — the counterpart to an Add/Edit form's fields, without any inputs. */
export function DetailView({ fields }: { fields: DetailField[] }) {
  return (
    <Grid container spacing={1.5}>
      {fields.map((f) => (
        <Grid key={f.label} size={{ xs: 12, sm: f.fullWidth ? 12 : 6 }}>
          <Paper
            variant="outlined"
            sx={{
              height: '100%',
              p: 1.5,
              borderRadius: 2,
              bgcolor: 'action.hover',
              borderColor: 'transparent',
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 600, display: 'block', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.6875rem' }}
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
