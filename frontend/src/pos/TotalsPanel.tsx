import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import type { CartTotals } from './posTypes';
import { formatMoney } from './format';

export function TotalsPanel({ totals }: { totals: CartTotals }) {
  return (
    <Paper variant="outlined" sx={{ p: 2.25, borderRadius: 1.5 }}>
      <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: '0.06em' }}>
        Tax &amp; Totals
      </Typography>
      <Stack sx={{ mt: 1 }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', py: 0.6 }}>
          <Typography variant="body2">Subtotal</Typography>
          <Typography variant="body2">{formatMoney(totals.subtotal)}</Typography>
        </Stack>
        <Stack direction="row" sx={{ justifyContent: 'space-between', py: 0.6 }}>
          <Typography variant="body2">Discount</Typography>
          <Typography variant="body2">-{formatMoney(totals.discountTotal)}</Typography>
        </Stack>
        <Stack direction="row" sx={{ justifyContent: 'space-between', py: 0.6 }}>
          <Typography variant="body2">Tax</Typography>
          <Typography variant="body2">{formatMoney(totals.taxTotal)}</Typography>
        </Stack>
        <Divider sx={{ mt: 1, mb: 1.5 }} />
        <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Total
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {formatMoney(totals.total)}
          </Typography>
        </Stack>
      </Stack>
    </Paper>
  );
}
