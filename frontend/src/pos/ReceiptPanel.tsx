import { useEffect, useRef, useState, type ReactNode } from 'react';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import CreditCardOutlinedIcon from '@mui/icons-material/CreditCardOutlined';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutlineOutlined';
import LoyaltyOutlinedIcon from '@mui/icons-material/LoyaltyOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import type { CartTotals, CartLine } from './posTypes';
import type { Bagger, Customer, PaymentMethodOption } from '../api/types';
import { POS_ACCENT, POS_ACTION_TINTS, posRaisedButtonSx, THIN_SCROLLBAR_SX } from './format';
import { Cart } from './Cart';
import { TotalsPanel } from './TotalsPanel';
import { PaymentPanel, type Payment } from './PaymentPanel';
import { KeyHint } from './KeyHint';

interface Props {
  /** Shown here only while attached — these are the same two facts the printed receipt carries, so the cashier can confirm them before taking payment rather than after. */
  customer: Customer | null;
  bagger: Bagger | null;
  lines: CartLine[];
  /** The most recently added/updated cart line — Cart uses it to scroll that row into view and briefly highlight it. */
  lastAddedKey: string | null;
  /** The cart line F10's selection currently sits on — forwarded to Cart. See PosScreen for why this is a selection rather than DOM focus. */
  selectedCartKey: string | null;
  /** Clicking a line selects it (and opens its controls); clicking the selected one again closes it. */
  onSelectCartLine: (key: string) => void;
  onQuantityChange: (key: string, quantity: number) => void;
  onRequestVoid: (line: CartLine) => void;
  totals: CartTotals;
  checkoutError: string | null;
  paymentMethods: PaymentMethodOption[];
  submitting: boolean;
  paymentDisabled: boolean;
  onCheckout: (payments: Payment[]) => void;
  saleCounter: number;
  /** So PosScreen's keyboard shortcuts know to stay disabled while this dialog is up — its open state lives here, not in PosScreen. */
  onPaymentDialogOpenChange?: (open: boolean) => void;
  /** True once a transaction is under way — items in the cart, OR a customer/bagger attached with none yet. Gates Hold and the header's clear button, which both apply to an attributed-but-empty sale; Pay deliberately still needs real lines. See PosScreen's saleStarted. */
  saleStarted: boolean;
  /** Empties the cart from its own header's bin button. Optional so this panel still renders without one; it is wired to the same handler the Cancel action uses, approval rule included. */
  onCancel?: () => void;
  /** Parks the sale rather than finishing it — see the Hold/Pay pair's own doc comment below for why this sits here rather than among CartActionsRow's sale-property toggles. */
  onHold: () => void;
}

const SectionDivider = () => <Divider sx={{ borderStyle: 'dashed' }} />;

/**
 * Icon + value only, no text label — Customer and Bagger share one row
 * this way instead of each claiming a full line. The icon alone is enough
 * to tell them apart (loyalty tag vs. bag), the way the buttons that open
 * these dialogs already do.
 */
function InlineFact({ icon, value, trailing }: { icon: ReactNode; value: string; trailing?: ReactNode }) {
  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', minWidth: 0, flex: '0 1 auto' }}>
      <Box sx={{ display: 'flex', color: 'text.secondary', flexShrink: 0 }}>{icon}</Box>
      <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 700, minWidth: 0 }} noWrap title={value}>
        {value}
      </Typography>
      {trailing}
    </Stack>
  );
}

/** Right panel: one continuous card styled like a printed receipt — a store letterhead, cashier/terminal/time, customer/bagger (when attached), item list, totals, payment, and the Hold/Pay pair, all inside a single border. Return/Cancellation live in the product panel's Actions row instead — see CartActionsRow. */
export function ReceiptPanel({
  customer,
  bagger,
  lines,
  lastAddedKey,
  selectedCartKey,
  onSelectCartLine,
  onQuantityChange,
  onRequestVoid,
  totals,
  checkoutError,
  paymentMethods,
  submitting,
  paymentDisabled,
  onCheckout,
  saleCounter,
  onPaymentDialogOpenChange,
  onCancel,
  saleStarted,
  onHold,
}: Props) {
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const activeItemCount = lines.filter((line) => !line.voided).length;
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

  // Up/down scroll controls for the item list — same reasoning as
  // a horizontal strip's left/right chevrons: a long cart (a big grocery run,
  // easily 20+ lines) otherwise leans entirely on a thin native scrollbar
  // with no visible affordance, which is easy to miss on a touch terminal
  // and fiddly to grab precisely with a mouse. Mirrors that pattern's
  // own show-only-when-there's-somewhere-to-go approach rather than
  // always rendering both.
  const cartScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  function updateCartScrollButtons() {
    const el = cartScrollRef.current;
    if (!el) return;
    setCanScrollUp(el.scrollTop > 4);
    setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 4);
  }

  useEffect(() => {
    updateCartScrollButtons();
    const el = cartScrollRef.current;
    if (!el) return;
    // Content height changes with the cart itself (an add/remove/void) and
    // with the panel's own height (viewport resize) — both can flip
    // whether there's anything above/below to scroll to.
    const resizeObserver = new ResizeObserver(updateCartScrollButtons);
    resizeObserver.observe(el);
    el.addEventListener('scroll', updateCartScrollButtons);
    return () => {
      resizeObserver.disconnect();
      el.removeEventListener('scroll', updateCartScrollButtons);
    };
  }, [lines.length]);

  function scrollCartBy(delta: number) {
    cartScrollRef.current?.scrollBy({ top: delta, behavior: 'smooth' });
  }

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
        // A rounded floating card again. This was squared off and docked
        // hard against the window edge for a while, which is the right
        // call when the panel is the only surface on its side of the
        // screen — but the product grid beside it is now a field of
        // rounded cards under a rounded pill strip, and a single
        // square-cornered slab against all of that read as the one
        // element that had missed the restyle. Its column supplies the
        // margin the corners need (see PosScreen).
        borderRadius: 3,
        overflow: 'hidden',
        minWidth: 0,
        // A soft lift rather than the flat, borders-only treatment this
        // carried while it was docked: floating, it needs to sit above
        // the page rather than be cut out of it.
        boxShadow: '0 6px 24px rgba(15, 23, 42, 0.07)',
        // Hard-bounded to the column's exact height, always — the header
        // and footer (Totals/Payment/Pay) must never be pushed out of
        // view. The cart item list below is the only flex
        // item without a floor, so it's the only thing that ever shrinks
        // or scrolls to make room; it absorbs all of the size pressure.
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* The cart's own masthead. This used to be the receipt letterhead
          — store name over a cashier/terminal/clock line — but all of
          that identity moved up to PosHeader, which spans both columns
          and says it once for the whole screen instead of once per panel.
          What's left here is what this panel alone can answer: what it is,
          how much is in it, and how to empty it.

          The count is deliberately `activeItemCount`, not lines.length: a
          voided line stays in the cart struck through, and counting it
          would disagree with the totals directly below, which already
          exclude it. */}
      <Stack
        direction="row"
        sx={{ alignItems: 'center', gap: 1.25, px: 2.5, py: 1.75, flexShrink: 0 }}
      >
        <ShoppingCartOutlinedIcon sx={{ color: POS_ACCENT, fontSize: 24 }} />
        <Typography sx={{ fontWeight: 800, fontSize: 19, letterSpacing: '-0.02em', flex: 1, minWidth: 0 }}>
          Cart
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, whiteSpace: 'nowrap' }}>
          {activeItemCount} {activeItemCount === 1 ? 'item' : 'items'}
        </Typography>
        {/* Clearing the cart IS cancelling the sale — same action, same
            supervisor-approval rule (see PosScreen's handleCancel), rather
            than a second quieter path that empties a till's cart without
            the sign-off the Cancel button would have required. Disabled on
            an already-empty cart so it can't fire a void approval for
            nothing. */}
        {onCancel && (
          <Tooltip title={saleStarted ? 'Clear cart' : 'Nothing to clear'}>
            <span>
              <IconButton
                size="small"
                onClick={onCancel}
                disabled={!saleStarted}
                aria-label="Clear cart"
                sx={{ color: 'text.secondary', '&:hover': { color: 'error.main', bgcolor: 'rgba(220,38,38,0.08)' } }}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        )}
      </Stack>
      <SectionDivider />

      {/* Customer/Bagger only — the cashier is named in the letterhead
          above instead, since that's where a receipt carries it. Still
          hidden entirely on a walk-in sale with no bagger, so this
          doesn't reappear as a header with nothing in it. */}
      {(customer || bagger) && (
        <>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap', px: 2.5, pt: 1.5, pb: 1, flexShrink: 0 }}>
            {customer && (
              <InlineFact
                icon={<LoyaltyOutlinedIcon sx={{ fontSize: 14 }} />}
                value={customer.name}
                // Points are already loaded with the customer (see
                // CustomersController::attachPoints), so showing the
                // balance here costs nothing and answers "do they have
                // enough to redeem?" without reopening the dialog. Absent
                // for a role without loyalty.view, hence the undefined
                // check.
                trailing={
                  customer.points !== undefined && customer.points !== null ? (
                    <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                      · {customer.points.toLocaleString('en-PH')} pts
                    </Typography>
                  ) : undefined
                }
              />
            )}
            {bagger && <InlineFact icon={<Inventory2OutlinedIcon sx={{ fontSize: 14 }} />} value={bagger.name} />}
          </Stack>
          <SectionDivider />
        </>
      )}

      {/* The only scrollable region in this card — no floor on its height, so totals/payment/Pay below can never be pushed out of view, even with a very long cart on a short screen.
          position:relative so the up/down scroll buttons below can anchor to this box specifically, not the whole card. */}
      <Box sx={{ position: 'relative', flex: 1, minHeight: 0 }}>
        <Box ref={cartScrollRef} sx={{ height: '100%', overflowY: 'auto', px: 2, pt: 1.5, pb: 1, ...THIN_SCROLLBAR_SX }}>
          <Cart
            lines={lines}
            lastAddedKey={lastAddedKey}
            selectedKey={selectedCartKey}
            onSelectLine={onSelectCartLine}
            scrollContainerRef={cartScrollRef}
            onQuantityChange={onQuantityChange}
            onRequestVoid={onRequestVoid}
          />
        </Box>

        {/* Floating rather than reserving their own row above/below the
            list — this panel's height is already fully spoken for (see
            the card's own comment on why the list is the only flexible
            region), so a fixed control row would eat directly into it.
            Semi-opaque so a scrolled line item is still legible right
            behind the button rather than hidden under a solid disc. */}
        {canScrollUp && (
          <IconButton
            size="small"
            onClick={() => scrollCartBy(-220)}
            aria-label="Scroll cart up"
            sx={{
              position: 'absolute',
              top: 6,
              right: 10,
              bgcolor: 'rgba(255,255,255,0.92)',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: 'none',
              '&:hover': { bgcolor: '#fff', borderColor: POS_ACCENT, color: POS_ACCENT },
            }}
          >
            <KeyboardArrowUpIcon fontSize="small" />
          </IconButton>
        )}
        {canScrollDown && (
          <IconButton
            size="small"
            onClick={() => scrollCartBy(220)}
            aria-label="Scroll cart down"
            sx={{
              position: 'absolute',
              bottom: 6,
              right: 10,
              bgcolor: 'rgba(255,255,255,0.92)',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: 'none',
              '&:hover': { bgcolor: '#fff', borderColor: POS_ACCENT, color: POS_ACCENT },
            }}
          >
            <KeyboardArrowDownIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      {/* A tinted band with a solid top edge, not just another dashed rule on the same white:
          the totals and checkout actions are a summary zone, and against the white item list
          above they need an actual background change to read as one instead of as more rows.

          Just Totals and Pay — the cashier/terminal/time line that used
          to sit wedged between them stayed off this band on its trip
          back up to the header (see above): crammed this close to the
          TOTAL figure, small grey text right under a bold blue number
          read as clutter rather than as a caption. */}
      <Stack
        spacing={2.5}
        sx={{
          px: 2.5,
          py: 2,
          flexShrink: 0,
          // Plain white now, matching the cart list above it — was tinted
          // first '#f4f6fa' then 'action.hover' to read as a separate
          // summary zone, but both left a visible seam against the rest
          // of this all-white card. The top border below is enough on
          // its own to mark where the totals band starts.
          bgcolor: '#f8fafc',
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        {/* Not `lines.length` — a voided line stays in the cart, struck
            through (see Cart.tsx / CartLine.voided), but `totals` already
            excludes it from Subtotal, so the item count next to it has to
            match or the two would visibly disagree. */}
        <TotalsPanel totals={totals} itemCount={activeItemCount} />

        {/* Hold and Pay side by side, Hold on the left — back here after
            a stretch spent in CartActionsRow among the other sale-
            property toggles (Discount, Void Item). Moved back on
            request: whatever the reasoning for grouping it with those
            was, it's the payment flow this pair belongs next to in
            practice — "finish this sale" and "park it instead" are the
            two things a cashier is actually choosing between at the
            point they'd reach for either button, so they read better as
            one decision than as two buttons a whole column apart.
            Narrower than Pay and outlined rather than filled, so Pay
            still reads as the button this row is FOR at a glance — Hold
            is the exception taken, not the default. */}
        <Stack direction="row" spacing={1.25}>
          <Button
            id="pos-action-hold"
            variant="outlined"
            size="large"
            startIcon={<PauseCircleOutlineIcon />}
            disabled={!saleStarted}
            onClick={onHold}
            sx={{
              flex: '0 0 auto',
              px: 2.25,
              // The tallest pair of buttons on the screen, and the two
              // most-pressed: this is the finger target the rest of the
              // POS's 48px controls are scaled against.
              minHeight: 56,
              borderRadius: 2.5,
              textTransform: 'none',
              fontWeight: 700,
              fontSize: 16,
              borderColor: `${POS_ACTION_TINTS.hold}5c`,
              color: POS_ACTION_TINTS.hold,
              '&:hover': { borderColor: POS_ACTION_TINTS.hold, bgcolor: `${POS_ACTION_TINTS.hold}0f` },
            }}
          >
            Hold
            <KeyHint label="F6" />
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
              minHeight: 56,
              borderRadius: 2.5,
              textTransform: 'none',
              fontWeight: 700,
              fontSize: 17,
              letterSpacing: '0.01em',
              // The surface and press behaviour both come from
              // posRaisedButtonSx — this button is where that treatment
              // started, but it lives in format.ts so the other primary
              // buttons across the POS share it rather than each carrying
              // a near-miss copy.
              ...posRaisedButtonSx(POS_ACTION_TINTS.pay),
            }}
          >
            Pay
            <KeyHint label="F11" onAccent />
          </Button>
        </Stack>
      </Stack>

      <PaymentPanel
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
