import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import type { CartTotals } from './posTypes';
import { formatMoney, POS_ACCENT } from './format';
import { currencySymbol } from '../regional';
import { useAuth } from '../auth/AuthContext';

/**
 * Deliberately container-less: this sits inside the receipt panel's tinted
 * summary band, which already separates it from the white item list, and
 * the Hold/Pay buttons directly below are themselves strong box shapes.
 * Giving TOTAL its own card on top of that read as a third competing
 * chip — closer to a disabled input than a figure — so the hierarchy here
 * is carried by type size, weight and colour, with one rule for structure.
 */
export function TotalsPanel({ totals, itemCount }: { totals: CartTotals; itemCount: number }) {
  const { user } = useAuth();

  return (
    <Stack spacing={1}>
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
      {/* Only on a sale that actually has one. A Senior Citizen / PWD line
          loses its VAT before the 20% is taken off what remains, so without
          this line Subtotal − Discount visibly fails to reach TOTAL — see
          CartTotals.vatExemptionTotal. */}
      {totals.vatExemptionTotal > 0 && (
        <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">
            Less VAT (exempt)
          </Typography>
          <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums', color: 'success.main' }}>
            -{formatMoney(totals.vatExemptionTotal)}
          </Typography>
        </Stack>
      )}

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
      {/* The theme's own hairline, not a hand-mixed rgba — one divider
          weight across the whole POS is most of what "flat, bordered
          surfaces" amounts to in practice. */}
      <Divider />

      {/* The one number the cashier reads out loud — the largest thing on
          this side of the screen, and the only one in the accent colour. */}
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Typography variant="body2" sx={{ fontWeight: 700, letterSpacing: '0.06em', color: 'text.secondary' }}>
          TOTAL
        </Typography>
        {/* The only figure on this panel that carries the symbol. Every
            line above it is part of the same running arithmetic and
            repeating the sign on each one just adds noise — but TOTAL is
            the number that gets read out, written down and handed over,
            so it says what currency it is in. */}
        <Typography variant="h4" sx={{ fontWeight: 800, color: POS_ACCENT, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
          <Box component="span" sx={{ fontSize: '0.62em', fontWeight: 700, mr: 0.4, verticalAlign: 'baseline' }}>
            {currencySymbol(user?.currency)}
          </Box>
          {formatMoney(totals.total)}
        </Typography>
      </Stack>

      {/* No tax breakdown here — deliberately, and not for want of the
          figures: VAT, VAT-exempt and zero-rated sales are all computed
          (calculateCart), and the server recomputes them independently at
          checkout. They belong on the receipt, which prints them behind
          the store's own show_bir_details switch (ReceiptModal), not on
          the panel a cashier watches while ringing up — nothing here is
          acted on, so a breakdown of how TOTAL divides up is reading
          material in the one place that should stay a single figure.

          "Less VAT (exempt)" above is not an exception to that: it's part
          of the subtraction reaching TOTAL, and without it Subtotal minus
          Discount visibly fails to land on the total shown. */}
    </Stack>
  );
}
