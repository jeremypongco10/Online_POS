import { useEffect, useState } from 'react';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutlineOutlined';
import CreditCardOutlinedIcon from '@mui/icons-material/CreditCardOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutlineOutlined';
import type { CartTotals, CartLine } from './posTypes';
import type { PaymentMethodOption } from '../api/types';
import { POS_ACCENT, THIN_SCROLLBAR_SX } from './format';
import { Cart } from './Cart';
import { TotalsPanel } from './TotalsPanel';
import { PaymentPanel, type Payment } from './PaymentPanel';

interface Props {
  cashierName: string;
  lines: CartLine[];
  /** The most recently added/updated cart line — Cart uses it to scroll that row into view and briefly highlight it. */
  lastAddedKey: string | null;
  onDiscountChange: (key: string, discount: number) => void;
  onRemove: (key: string) => void;
  totals: CartTotals;
  checkoutError: string | null;
  paymentMethods: PaymentMethodOption[];
  submitting: boolean;
  paymentDisabled: boolean;
  onCheckout: (payments: Payment[]) => void;
  saleCounter: number;
  onHold: () => void;
  /** So PosScreen's keyboard shortcuts know to stay disabled while this dialog is up — its open state lives here, not in PosScreen. */
  onPaymentDialogOpenChange?: (open: boolean) => void;
}

const SectionDivider = () => <Divider sx={{ borderStyle: 'dashed' }} />;

/** Right panel: one continuous card styled like a printed receipt — cashier line, item list, totals, payment, and Hold/Pay all inside a single border. Store/terminal context lives in PosHeader (which sits over the product column only, so this panel carries its own header); Refund/Return/Cancellation live in the product panel's Actions row. */
export function ReceiptPanel({
  cashierName,
  lines,
  lastAddedKey,
  onDiscountChange,
  onRemove,
  totals,
  checkoutError,
  paymentMethods,
  submitting,
  paymentDisabled,
  onCheckout,
  saleCounter,
  onHold,
  onPaymentDialogOpenChange,
}: Props) {
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  // A successful checkout (or a Hold) resets the sale and bumps saleCounter
  // — close the dialog along with it rather than leaving it open over an
  // empty cart. A failed checkout doesn't bump saleCounter, so the dialog
  // correctly stays open with its error shown.
  useEffect(() => {
    setPaymentDialogOpen(false);
  }, [saleCounter]);
  useEffect(() => {
    onPaymentDialogOpenChange?.(paymentDialogOpen);
  }, [paymentDialogOpen, onPaymentDialogOpenChange]);

  return (
    <Paper
      variant="outlined"
      // Forces this whole subtree onto the theme's light color scheme
      // (white paper, dark ink) regardless of the app's own dark/light
      // setting — matches the "printed receipt" look this card is meant
      // to have. Works because theme.ts sets cssVariables.colorSchemeSelector
      // to 'class': MUI generates both `.light` and `.dark` variable blocks
      // and every var(--mui-palette-*) below resolves against whichever
      // one wraps it, so a bare className here is enough — no per-color
      // overrides needed in Cart/TotalsPanel/PaymentPanel.
      className="light"
      sx={{
        borderRadius: 0,
        overflow: 'hidden',
        minWidth: 0,
        // Hard-bounded to the column's exact height, always — the header
        // and footer (Totals/Payment/Actions/Hold/Pay) must never be
        // pushed out of view. The cart item list below is the only flex
        // item without a floor, so it's the only thing that ever shrinks
        // or scrolls to make room; it absorbs all of the size pressure.
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Receipt-style header line. PosHeader is scoped to the product
          column now, so this panel needs to name its own cashier rather
          than borrowing one from a bar above it. */}
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', px: 2.5, pt: 1.5, pb: 1, flexShrink: 0 }}>
        <PersonOutlineIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
        <Typography variant="caption" color="text.secondary">
          Cashier:{' '}
          <Box component="span" sx={{ color: 'text.primary', fontWeight: 700 }}>
            {cashierName}
          </Box>
        </Typography>
      </Stack>
      <SectionDivider />

      {/* The only scrollable region in this card — no floor on its height, so totals/payment/actions/Hold/Pay below can never be pushed out of view, even with a very long cart on a short screen. */}
      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 2, pt: 1, pb: 1, ...THIN_SCROLLBAR_SX }}>
        <Cart lines={lines} lastAddedKey={lastAddedKey} onDiscountChange={onDiscountChange} onRemove={onRemove} />
      </Box>

      {/* A tinted band with a solid top edge, not just another dashed rule on the same white:
          the totals and checkout actions are a summary zone, and against the white item list
          above they need an actual background change to read as one instead of as more rows. */}
      {/* The one gap this Stack controls is totals -> buttons, and it needs to be generous:
          the TOTAL figure is set at h4, so a tighter gap left its descenders almost touching
          the Pay button. */}
      <Stack
        spacing={2.5}
        sx={{
          px: 2.5,
          py: 2,
          flexShrink: 0,
          bgcolor: '#f4f6fa',
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <TotalsPanel totals={totals} />

        {/* Pay is the primary action and carries the accent alone; Hold
            Sale is deliberately neutral. Two equally-accented buttons
            side by side made the cashier read both before acting. */}
        <Stack direction="row" spacing={1.25}>
          <Button
            variant="outlined"
            size="large"
            startIcon={<PauseCircleOutlineIcon />}
            disabled={lines.length === 0}
            onClick={onHold}
            sx={{
              flex: '0 0 auto',
              px: 2.5,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              color: 'text.secondary',
              borderColor: 'divider',
              '&:hover': { borderColor: 'text.secondary', bgcolor: 'action.hover' },
            }}
          >
            Hold
          </Button>
          <Button
            id="pos-pay-button"
            variant="contained"
            size="large"
            disableElevation
            startIcon={<CreditCardOutlinedIcon />}
            disabled={paymentDisabled || lines.length === 0}
            onClick={() => setPaymentDialogOpen(true)}
            sx={{
              flex: 1,
              py: 1.35,
              bgcolor: POS_ACCENT,
              '&:hover': { bgcolor: '#1d4ed8' },
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 700,
              fontSize: 16,
            }}
          >
            Pay
          </Button>
        </Stack>
      </Stack>

      <PaymentPanel
        key={saleCounter}
        open={paymentDialogOpen}
        onClose={() => setPaymentDialogOpen(false)}
        total={totals.total}
        disabled={paymentDisabled}
        submitting={submitting}
        checkoutError={checkoutError}
        methods={paymentMethods}
        onCheckout={onCheckout}
      />
    </Paper>
  );
}
