import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import type { CartTotals } from './posTypes';
import { formatMoney, POS_ACCENT } from './format';

export function TotalsPanel({ totals }: { totals: CartTotals }) {
  return (
    <Stack spacing={0.75}>
      <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
        <Typography variant="body2" color="text.secondary">
          Subtotal
        </Typography>
        <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {formatMoney(totals.subtotal)}
        </Typography>
      </Stack>
      <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
        <Typography variant="body2" color="text.secondary">
          Discount
        </Typography>
        <Typography
          variant="body2"
          sx={{ fontVariantNumeric: 'tabular-nums', color: totals.discountTotal > 0 ? 'success.main' : 'text.primary' }}
        >
          {totals.discountTotal > 0 ? `-${formatMoney(totals.discountTotal)}` : formatMoney(0)}
        </Typography>
      </Stack>

      <Divider sx={{ borderStyle: 'dashed', my: 0.5 }} />

      {/* The one number the cashier reads out loud — deliberately the
          largest thing on the receipt side, well clear of the line items. */}
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Typography variant="body2" sx={{ fontWeight: 700, letterSpacing: '0.06em', color: 'text.secondary' }}>
          TOTAL
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 800, color: POS_ACCENT, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
          {formatMoney(totals.total)}
        </Typography>
      </Stack>
    </Stack>
  );
}
