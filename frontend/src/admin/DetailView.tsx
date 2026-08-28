import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
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

function FieldCard({ f, dense }: { f: DetailField; dense?: boolean }) {
  return (
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
  );
}

/**
 * A read-only label/value grid for a "View" modal — the counterpart to an
 * Add/Edit form's fields, without any inputs. `dense` trades the padded
 * tinted-card look for a tighter, more fields-per-row layout — for a
 * page-level detail panel or a compact modal where the full-size cards read
 * as too much vertical space for what's mostly short values.
 *
 * Dense mode uses a native CSS grid (`auto-fill`/`minmax`) rather than MUI's
 * breakpoint-based Grid: breakpoints key off viewport width, but a dense
 * grid can just as easily sit inside a narrow modal on a wide screen as a
 * full-width page panel — sizing columns off the *container's* rendered
 * width is what keeps values like "VAT (12.0000%)" from wrapping into a
 * cramped multi-line mess when the viewport is wide but the container isn't.
 */
export function DetailView({ fields, dense }: { fields: DetailField[]; dense?: boolean }) {
  if (dense) {
    return (
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 1 }}>
        {fields.map((f) => (
          <Box key={f.label} sx={{ gridColumn: f.fullWidth ? '1 / -1' : undefined }}>
            <FieldCard f={f} dense />
          </Box>
        ))}
      </Box>
    );
  }

  return (
    <Grid container spacing={1.5}>
      {fields.map((f) => (
        <Grid key={f.label} size={{ xs: 12, sm: f.fullWidth ? 12 : 6 }}>
          <FieldCard f={f} />
        </Grid>
      ))}
    </Grid>
  );
}
