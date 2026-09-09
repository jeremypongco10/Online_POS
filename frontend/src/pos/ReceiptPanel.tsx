import { useEffect, useRef, useState, type ReactNode } from 'react';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CreditCardOutlinedIcon from '@mui/icons-material/CreditCardOutlined';
import LoyaltyOutlinedIcon from '@mui/icons-material/LoyaltyOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import type { CartTotals, CartLine } from './posTypes';
import type { Bagger, Customer, PaymentMethodOption, Store } from '../api/types';
import { POS_ACCENT, posRaisedButtonSx, THIN_SCROLLBAR_SX } from './format';
import { Cart } from './Cart';
import { TotalsPanel } from './TotalsPanel';
import { PaymentPanel, type Payment } from './PaymentPanel';
import { KeyHint } from './KeyHint';

interface Props {
  /** The store this terminal is ringing up on. The whole record rather than just its name, because the letterhead prints the same block the receipt does — address, and the BIR identifiers behind its own show_bir_details switch. */
  store: Store | null;
  /** Who's ringing up, and on which terminal — the same two facts printed under a receipt's store letterhead, shown here for the same reason. */
  cashierName: string;
  registerName: string | null;
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

/**
 * Its own component purely so the clock's per-second tick re-renders one
 * text node instead of the whole ReceiptPanel — the cart, totals and
 * payment panel all sit under that, and none of them have any reason to
 * re-render on a tick.
 */
function SessionClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    // tabular-nums keeps every digit the same width, so the line doesn't
    // shift sideways each second as the digits change.
    <Typography variant="caption" sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
      {now.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'medium' })}
    </Typography>
  );
}

/** Right panel: one continuous card styled like a printed receipt — store letterhead, cashier/terminal/time, customer/bagger (when attached), item list, totals, payment, and Pay, all inside a single border. Hold/Return/Cancellation live in the product panel's Actions row instead — see CartActionsRow. */
export function ReceiptPanel({
  store,
  cashierName,
  registerName,
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

  // Up/down scroll controls for the item list — same reasoning as
  // CategoryPills' left/right chevrons: a long cart (a big grocery run,
  // easily 20+ lines) otherwise leans entirely on a thin native scrollbar
  // with no visible affordance, which is easy to miss on a touch terminal
  // and fiddly to grab precisely with a mouse. Mirrors that component's
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
        borderRadius: 0,
        overflow: 'hidden',
        minWidth: 0,
        // The outlined variant's own border is the divider on paper, but
        // at 1px against two white panels it read as barely there —
        // "dry", not so much a seam between two cards as an accidental
        // gap. A soft shadow cast leftward, over the product grid, gives
        // this column the same lifted-off-the-page depth ProductCard's
        // own hairline shadow gives a tile — the border stays for a crisp
        // edge, the shadow is what actually makes it read as one surface
        // sitting in front of another rather than two flats touching.
        //
        // Top/bottom deliberately don't get the same treatment: this
        // panel runs the full height of the screen (see PosScreen), so
        // its top and bottom edges sit flush against the browser
        // viewport's own edges — there's no surface beyond either one to
        // cast a shadow onto, and the layout's own overflow:hidden would
        // clip it invisibly even if there were. See PosHeader instead for
        // the product column's own top seam.
        boxShadow: '-6px 0 16px -10px rgba(16, 24, 40, 0.22)',
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
      {/* The store letterhead — bold like a receipt's own masthead line,
          not a caption like Customer/Bagger below it, and always shown
          rather than gated on a presence check: every sale happens at
          some store, so there's no "nothing to show" state for this the
          way there is for an unattached customer.

          Cashier, terminal and the clock sit directly under it, exactly
          where a printed receipt prints them — they used to live in a
          full-width StatusBar footer along the bottom of the screen,
          which cost a whole bar of vertical space to say what this
          letterhead was already half-saying. Connectivity was the one
          thing in that footer that isn't receipt content, so it moved to
          PosHeader instead.

          The address comes along too, but deliberately NOT the TIN/MIN/
          S/N block the printed receipt carries under it: those are static
          store registration details a cashier never acts on, and at this
          column's width they wrapped to a second line of fine print for
          no one's benefit. They remain legally required on the receipt
          itself, so ReceiptModal still prints all three — this is a
          display decision about the live panel, not about the document. */}
      <Stack sx={{ px: 2.5, pt: 1.5, pb: 1, flexShrink: 0 }}>
        {store?.name && (
          <Typography sx={{ fontWeight: 700, fontSize: 15, textAlign: 'center' }} noWrap title={store.name}>
            {store.name}
          </Typography>
        )}
        {store?.address && (
          <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'center', lineHeight: 1.35 }}>
            {store.address}
          </Typography>
        )}
        <Stack
          direction="row"
          spacing={0.75}
          sx={{ alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', mt: 0.5 }}
        >
          <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: 0 }} noWrap title={cashierName}>
            {cashierName}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            ·
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: 0 }} noWrap>
            {registerName ?? '—'}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            ·
          </Typography>
          <SessionClock />
        </Stack>
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
              bgcolor: 'rgba(255,255,255,0.9)',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 2px 6px rgba(16, 24, 40, 0.15)',
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
              bgcolor: 'rgba(255,255,255,0.9)',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 2px 6px rgba(16, 24, 40, 0.15)',
              '&:hover': { bgcolor: '#fff', borderColor: POS_ACCENT, color: POS_ACCENT },
            }}
          >
            <KeyboardArrowDownIcon fontSize="small" />
          </IconButton>
        )}
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
          // Plain white now, matching the cart list above it — was tinted
          // first '#f4f6fa' then 'action.hover' to read as a separate
          // summary zone, but both left a visible seam against the rest
          // of this all-white card. The top border below is enough on
          // its own to mark where the totals band starts.
          bgcolor: '#fff',
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <TotalsPanel totals={totals} itemCount={lines.length} />

        {/* Hold Sale moved to the product panel's Actions row (see
            CartActionsRow) alongside the other sale-property controls —
            Pay is the one action that belongs down here beside the
            payment flow it actually opens, so it now runs the full
            width alone rather than sharing this row with a button that
            no longer needs to be next to it. */}
        <Button
          id="pos-pay-button"
          variant="contained"
          size="large"
          disableElevation
          startIcon={<CreditCardOutlinedIcon />}
          disabled={paymentDisabled || lines.length === 0}
          onClick={() => setPaymentDialogOpen(true)}
          sx={{
            width: '100%',
            py: 1.35,
            borderRadius: 2.5,
            textTransform: 'none',
            fontWeight: 700,
            fontSize: 16,
            letterSpacing: '0.01em',
            // The raised surface, brand-tinted glow and press behaviour
            // all come from posRaisedButtonSx now — this button is where
            // that treatment started, but it lives in format.ts so the
            // other primary buttons across the POS share it rather than
            // each carrying a near-miss copy.
            ...posRaisedButtonSx(POS_ACCENT),
          }}
        >
          Pay
          <KeyHint label="F11" onAccent />
        </Button>
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
