import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import type { CartTotals } from './posTypes';
import { formatMoney, POS_ACCENT } from './format';

/**
 * Deliberately container-less: this sits inside the receipt panel's tinted
 * summary band, which already separates it from the white item list, and
 * the Hold/Pay buttons directly below are themselves strong box shapes.
 * Giving TOTAL its own card on top of that read as a third competing
 * chip — closer to a disabled input than a figure — so the hierarchy here
 * is carried by type size, weight and colour, with one rule for structure.
 */
export function TotalsPanel({ totals, itemCount }: { totals: CartTotals; itemCount: number }) {
  return (
    <Stack spacing={0.75}>
      <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
        {/* Line count, not summed quantity: a cart mixing whole pieces
            with a weighed item would otherwise read "2.5 items", which
            looks like a bug. "Items" here means line items, the same
            sense a printed receipt uses. */}
        <Typography variant="body2" color="text.secondary">
          Subtotal{itemCount > 0 && ` (${itemCount} item${itemCount === 1 ? '' : 's'})`}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.primary', fontVariantNumeric: 'tabular-nums' }}>
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
      <Divider sx={{ borderColor: 'rgba(15, 23, 42, 0.12)' }} />

      {/* The one number the cashier reads out loud — the largest thing on
          this side of the screen, and the only one in the accent colour. */}
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Typography variant="body2" sx={{ fontWeight: 700, letterSpacing: '0.06em', color: 'text.secondary' }}>
          TOTAL
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 800, color: POS_ACCENT, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
          {formatMoney(totals.total)}
        </Typography>
      </Stack>

      {/* Below the total and visibly quieter, because this is a
          disclosure, not a charge: shelf prices already contain the VAT,
          so it is being reported out of the total rather than added to
          it. Printed above the total as its own line it read as "+VAT"
          and made the subtotal look short by that amount. */}
      <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
        <Typography variant="caption" color="text.secondary">
          VAT included
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
          {formatMoney(totals.taxTotal)}
        </Typography>
      </Stack>
    </Stack>
  );
}
