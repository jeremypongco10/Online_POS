import { useEffect, useState } from 'react';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutlineOutlined';
import CreditCardOutlinedIcon from '@mui/icons-material/CreditCardOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutlineOutlined';
import Typography from '@mui/material/Typography';
import type { CartTotals, CartLine } from './posTypes';
import type { PaymentMethodOption } from '../api/types';
import { POS_ACCENT, THIN_SCROLLBAR_SX } from './format';
import { Cart } from './Cart';
import { TotalsPanel } from './TotalsPanel';
import { PaymentPanel, type Payment } from './PaymentPanel';

interface Props {
  cashierName: string;
  lines: CartLine[];
  onQuantityChange: (key: string, quantity: number) => void;
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

/** Right panel: one continuous card styled like a printed receipt — cashier name, item list, totals, payment, and Hold/Pay all inside a single border. Store/receipt#/date live in the account menu instead; Refund/Return/Cancellation live in the product panel's Actions row. */
export function ReceiptPanel({
  cashierName,
  lines,
  onQuantityChange,
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
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', px: 2.5, pt: 1, pb: 0.75, flexShrink: 0 }}>
        <PersonOutlineIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
        <Typography variant="caption" color="text.secondary">
          Cashier: <Box component="span" sx={{ color: 'text.primary', fontWeight: 700 }}>{cashierName}</Box>
        </Typography>
      </Stack>
      <SectionDivider />

      {/* The only scrollable region in this card — no floor on its height, so totals/payment/actions/Hold/Pay below can never be pushed out of view, even with a very long cart on a short screen. */}
      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 2.5, pt: 2, pb: 2, ...THIN_SCROLLBAR_SX }}>
        <Cart lines={lines} onQuantityChange={onQuantityChange} onDiscountChange={onDiscountChange} onRemove={onRemove} />
      </Box>

      <Stack spacing={2} sx={{ p: 2.5, pt: 0, flexShrink: 0 }}>
        <SectionDivider />

        <TotalsPanel totals={totals} />

        <SectionDivider />

        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            size="large"
            startIcon={<PauseCircleOutlineIcon />}
            disabled={lines.length === 0}
            onClick={onHold}
            sx={{ flex: 1, borderRadius: 999, color: POS_ACCENT, borderColor: POS_ACCENT, '&:hover': { borderColor: POS_ACCENT, bgcolor: `${POS_ACCENT}0d` } }}
          >
            Hold Sale
          </Button>
          <Button
            id="pos-pay-button"
            variant="contained"
            size="large"
            startIcon={<CreditCardOutlinedIcon />}
            disabled={paymentDisabled || lines.length === 0}
            onClick={() => setPaymentDialogOpen(true)}
            sx={{ flex: 1, bgcolor: POS_ACCENT, '&:hover': { bgcolor: POS_ACCENT }, borderRadius: 999 }}
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
