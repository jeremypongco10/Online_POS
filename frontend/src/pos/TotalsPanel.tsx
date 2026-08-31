import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import type { CartTotals } from './posTypes';
import { formatMoney, POS_ACCENT } from './format';

export function TotalsPanel({ totals }: { totals: CartTotals }) {
  return (
    <Stack spacing={0.6}>
      <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
        <Typography variant="body2" color="text.secondary">
          Subtotal
        </Typography>
        <Typography variant="body2">{formatMoney(totals.subtotal)}</Typography>
      </Stack>
      <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
        <Typography variant="body2" color="text.secondary">
          Discount
        </Typography>
        <Typography variant="body2">{formatMoney(totals.discountTotal)}</Typography>
      </Stack>
      <Divider sx={{ borderStyle: 'dashed', my: 0.75 }} />
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          TOTAL
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 700, color: POS_ACCENT }}>
          {formatMoney(totals.total)}
        </Typography>
      </Stack>
    </Stack>
  );
}
