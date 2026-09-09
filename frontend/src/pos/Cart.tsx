import { memo, useEffect, useState, type RefObject } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import type { CartLine } from './posTypes';
import { calculateLine, lineTaxIndicator } from './posTypes';
import { discountTypeLabel } from './discountTypes';
import { formatMoney, formatQuantity, POS_ACCENT, TAX_INDICATOR_LABELS } from './format';

interface Props {
  lines: CartLine[];
  /** The most recently added/updated line, from any add path (tile click or scan) — scrolls it into view and briefly highlights it, so a cashier can always see what just landed in the cart. */
  lastAddedKey: string | null;
  onQuantityChange: (key: string, quantity: number) => void;
  /** Opens the supervisor-approval dialog. The line is only dropped once that returns approved — this never removes anything by itself. */
  onRequestVoid: (line: CartLine) => void;
  /**
   * The line F10 has stepped the selection onto, if any (see PosScreen).
   * Deliberately a selected *key* rather than DOM focus: the search box
   * must keep focus at all times so a barcode scanner always has
   * somewhere to type, which rules out moving focus onto a row.
   */
  selectedKey: string | null;
  /**
   * Tapping a row selects it, which is what reveals that line's controls
   * (discount / quantity / void — see CartRow). Tapping the selected row
   * again clears the selection and puts them away.
   */
  onSelectLine: (key: string) => void;
  /** ReceiptPanel's own scrollable cart list — see scrollRowIntoView below for why this is threaded through instead of calling row.scrollIntoView() directly. */
  scrollContainerRef: RefObject<HTMLDivElement | null>;
}

/**
 * A hand-rolled replacement for `row.scrollIntoView()`, scoped to exactly
 * one container.
 *
 * The native call walks up *every* scrollable ancestor to bring the target
 * into view — and PosScreen's root is `overflow: hidden`, which still
 * counts as scrollable to the browser even though nothing ever draws a
 * scrollbar on it. The moment the root's real content is even a hair
 * taller than its calculated `calc(100dvh / var(--pos-zoom,1))` height —
 * easy to hit, since that's a zoom-dependent calculation — scrollIntoView
 * would nudge the *root* too, and the whole screen (header included)
 * visibly jumped every time an item was added. Computing the scroll
 * position by hand against one named container can never touch anything
 * else, at any zoom level.
 *
 * getBoundingClientRect on both elements, rather than `row.offsetTop`,
 * because offsetTop is relative to the nearest *positioned* ancestor,
 * which isn't reliably the scroll container here — the rect subtraction
 * below is correct regardless of what sits in between, and cancels out
 * the page's own CSS zoom identically for both elements.
 */
function scrollRowIntoView(container: HTMLElement, row: HTMLElement, align: 'center' | 'nearest', smooth: boolean) {
  const containerRect = container.getBoundingClientRect();
  const rowRect = row.getBoundingClientRect();
  const rowTop = rowRect.top - containerRect.top + container.scrollTop;
  const rowBottom = rowTop + rowRect.height;

  let target: number;
  if (align === 'center') {
    target = rowTop - container.clientHeight / 2 + rowRect.height / 2;
  } else if (rowTop < container.scrollTop) {
    target = rowTop;
  } else if (rowBottom > container.scrollTop + container.clientHeight) {
    target = rowBottom - container.clientHeight;
  } else {
    return; // already fully visible — 'nearest' means the minimum scroll, which here is none.
  }

  container.scrollTo({ top: target, behavior: smooth ? 'smooth' : 'auto' });
}

// A monospace stack, not the UI's regular sans font, is what actually reads as "receipt" —
// it's what every dot-matrix/thermal receipt printer renders in, and it's what keeps a column
// of prices lining up by eye even without a real table underneath.
const RECEIPT_FONT = 'ui-monospace, "SFMono-Regular", "Courier New", monospace';

const CART_ROW_DOM_ID = (key: string) => `cart-row-${key}`;

/**
 * The class the row's hover rule reaches for to reveal a line's controls
 * on a mouse, and the marker for everything that's hidden until then.
 */
const REVEAL_CLASS = 'pos-cart-row-controls';

/**
 * Hidden with `visibility` rather than `display: none` (or by not
 * rendering at all) so the controls keep occupying their space while
 * put away — every row stays exactly the height it is today, and
 * selecting one can never shove the rows under it out from beneath a
 * finger that's about to tap one of them. `visibility: hidden` also
 * takes them out of the tab order and the accessibility tree while
 * they're invisible, which `opacity: 0` alone would not.
 */
const revealSx = (revealed: boolean) => ({
  visibility: revealed ? ('visible' as const) : ('hidden' as const),
  opacity: revealed ? 1 : 0,
  transition: 'opacity 0.15s ease, visibility 0.15s ease',
});


export function Cart({ lines, lastAddedKey, selectedKey, onSelectLine, scrollContainerRef, onQuantityChange, onRequestVoid }: Props) {
  // Mirrors lastAddedKey but self-clears — the parent's key only changes on
  // the NEXT add, so without a local timeout the highlight would just stay
  // lit on whatever was last added instead of fading like a flash.
  const [highlightKey, setHighlightKey] = useState<string | null>(null);

  useEffect(() => {
    if (!lastAddedKey) return;
    const container = scrollContainerRef.current;
    const row = document.getElementById(CART_ROW_DOM_ID(lastAddedKey));
    // 'center' rather than 'nearest' — 'nearest' does the *minimum* scroll needed, which is
    // zero (i.e. no visible movement at all) whenever the row is already even barely in view,
    // making the whole feature look broken on a short-ish cart. 'center' always lands the row
    // in a clearly visible spot, so adding an item reliably produces a visible scroll.
    if (container && row) scrollRowIntoView(container, row, 'center', true);
    setHighlightKey(lastAddedKey);
    const id = setTimeout(() => setHighlightKey(null), 1200);
    return () => clearTimeout(id);
  }, [lastAddedKey, scrollContainerRef]);

  // Keeps the F10 selection visible as it steps past the bottom (or top)
  // of the visible list. 'nearest' rather than 'center': this fires on
  // every step, so the minimum scroll that reveals the row is what keeps
  // moving within an already-visible stretch from jerking the list.
  useEffect(() => {
    if (!selectedKey) return;
    const container = scrollContainerRef.current;
    const row = document.getElementById(CART_ROW_DOM_ID(selectedKey));
    if (container && row) scrollRowIntoView(container, row, 'nearest', false);
  }, [selectedKey, scrollContainerRef]);

  if (lines.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          textAlign: 'center',
          color: 'text.secondary',
          pt: 3,
          pb: 5,
          gap: 0.75,
        }}
      >
        <ShoppingCartOutlinedIcon sx={{ fontSize: 40, opacity: 0.35, mb: 1 }} />
        <Typography variant="body1" color="text.primary" sx={{ fontWeight: 600 }}>
          Cart is empty
        </Typography>
        <Typography variant="body2">Add a product to get started</Typography>
      </Box>
    );
  }

  return (
    <Stack>
      {lines.map((line) => (
        <CartRow
          key={line.key}
          line={line}
          highlighted={line.key === highlightKey}
          selected={line.key === selectedKey}
          onSelect={onSelectLine}
          onQuantityChange={onQuantityChange}
          onRequestVoid={onRequestVoid}
        />
      ))}
    </Stack>
  );
}

/**
 * Memoized, and the reason the three callbacks above are useCallback'd in
 * PosScreen. Without this every line in the cart re-rendered on every cart
 * change, so adding an item got steadily slower as the basket filled —
 * measured at 341ms for the first item, 587ms for the second, 668ms for
 * the third on a throttled tablet. A real grocery run is 20+ lines.
 *
 * The bail-out works because addProduct/updateQuantity/updateDiscount all
 * rebuild `lines` with .map, which hands back the *same* object for every
 * untouched line — so only the line that actually changed sees a new
 * `line` prop and re-renders.
 */
const CartRow = memo(function CartRow({
  line,
  highlighted,
  selected,
  onSelect,
  onQuantityChange,
  onRequestVoid,
}: {
  line: CartLine;
  highlighted: boolean;
  selected: boolean;
  onSelect: (key: string) => void;
  onQuantityChange: (key: string, quantity: number) => void;
  onRequestVoid: (line: CartLine) => void;
}) {
  const totals = calculateLine(line);

  // A VAT-exempt discount type (Senior Citizen/PWD) overrides the line's
  // own tax rate to 'E' — the exemption comes from the discount, not
  // from the product's tax_rate_id. See lineTaxIndicator's own docblock.
  const indicator = lineTaxIndicator(line);
  const discountLabel = discountTypeLabel(line.discountType);

  // One step of whatever precision this line's unit carries — 1 for a
  // whole-piece item, 0.001 for a weighed one — so "−" on 1.250 KG lands
  // on 1.249 rather than 0.250.
  const step = 1 / 10 ** (line.unit?.decimal_places ?? 0);
  // Deliberately floored at one step rather than allowed to reach zero:
  // decrementing to nothing would be a removal, and removals are exactly
  // what the supervisor-approved Void path exists to gate. Letting "−"
  // empty a line would be a way around that.
  const atMinimum = line.quantity - step < step / 2;

  return (
    <Box
      id={CART_ROW_DOM_ID(line.key)}
      // Marked for the selection F10 steps through, and announced as
      // the current row to assistive tech. Deliberately NOT focusable:
      // focus belongs to the search box at all times so a scanner
      // always has somewhere to type (see PosScreen's cart selection).
      aria-current={selected ? 'true' : undefined}
      // The whole row is the target, not a dedicated handle — on a
      // tablet the row is the only thing big enough to hit reliably,
      // and there's nothing else a tap on a cart line could sensibly
      // mean. Same selection F10 drives, so keyboard and touch land on
      // one state rather than two parallel ones.
      onClick={() => onSelect(line.key)}
      sx={{
        // Dashed rather than solid — the same "torn perforation" line every
        // printed receipt uses between line items, instead of a spreadsheet
        // row border.
        py: 0.85,
        // Left padding specifically clears the highlight rule drawn at
        // this box's leading edge — without it the product name sits
        // flush against that bar the moment a row lights up. The dashed
        // divider is on this same box, so it still spans the full width
        // rather than being inset along with the content.
        px: 1,
        borderBottom: '1px dashed',
        borderColor: 'divider',
        // A brief marker on whatever a scan just touched — fades back out
        // on its own once `highlighted` clears (see Cart's highlightKey
        // timeout) rather than needing a second transition to reverse.
        //
        // An accent rule down the leading edge plus a barely-there wash,
        // rather than the flat 12%-opacity block this replaced: that read
        // as a coloured panel bolted onto a white receipt, and it muddied
        // the monospace text sitting on top of it. The rule is drawn as an
        // inset shadow so it costs no layout — a real border-left would
        // indent every row by 3px whether highlighted or not.
        //
        // The F10 selection reuses the same two devices at full
        // strength: a thicker leading rule and a slightly stronger
        // wash. It has to carry on its own what a focus ring normally
        // would — the row is never focused (the search box keeps focus
        // for the scanner), so there's no browser-drawn ring to lean
        // on and this is the only thing marking where the cashier is.
        bgcolor: selected ? `${POS_ACCENT}14` : highlighted ? `${POS_ACCENT}0a` : 'transparent',
        boxShadow: `inset ${selected ? 4 : 3}px 0 0 ${selected ? POS_ACCENT : highlighted ? POS_ACCENT : 'transparent'}`,
        transition: 'background-color 0.4s ease, box-shadow 0.4s ease',
        cursor: 'pointer',
        '&:hover': { bgcolor: selected ? `${POS_ACCENT}14` : highlighted ? `${POS_ACCENT}0a` : 'action.hover' },
        '&:last-of-type': { borderBottom: 'none' },
        // A mouse doesn't need the extra click: hovering a row is already
        // an unambiguous "this line", so the controls come out under the
        // cursor exactly as they always did and nothing about desktop use
        // changes. Guarded by `hover: hover` because a touch screen
        // reports a *sticky* hover — the last-tapped row would keep its
        // controls out permanently, which is the behaviour being replaced.
        '@media (hover: hover)': {
          [`&:hover .${REVEAL_CLASS}`]: { visibility: 'visible', opacity: 1 },
        },
      }}
    >
      {/* Line 1, receipt-style: description on the left, extended price on the right. */}
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', gap: 1.5 }}>
        {/* Typography defaults to a 1.5 line-height meant for paragraphs — left alone, that padded
            each of these two lines far more than the row's own py did. */}
        <Typography sx={{ fontFamily: RECEIPT_FONT, fontWeight: 700, fontSize: 15, lineHeight: 1.25, minWidth: 0 }} noWrap title={line.product.name}>
          {line.product.name}
        </Typography>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'baseline', flexShrink: 0 }}>
          <Typography sx={{ fontFamily: RECEIPT_FONT, fontWeight: 700, fontSize: 15, lineHeight: 1.25, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
            {formatMoney(totals.gross)}
          </Typography>
          {/* Trailing the amount, exactly where a BIR receipt prints it.
              Deliberately quiet — it's a classification a customer checks
              on request, not something a cashier reads every line. */}
          <Tooltip title={TAX_INDICATOR_LABELS[indicator] ?? indicator}>
            <Typography
              component="span"
              sx={{ fontFamily: RECEIPT_FONT, fontSize: 12, fontWeight: 700, color: 'text.disabled', cursor: 'help' }}
            >
              {indicator}
            </Typography>
          </Tooltip>
        </Stack>
      </Stack>

      {/* Line 2: the qty × unit-price breakdown a receipt prints under the description, plus the
          only editable controls this line has (the printed page has none) at the trailing edge. */}
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mt: 0.25, gap: 1 }}>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
          <Typography sx={{ fontFamily: RECEIPT_FONT, fontSize: 13, lineHeight: 1.25, color: 'text.secondary', whiteSpace: 'nowrap' }}>
            {formatQuantity(line.quantity, line.unit?.abbreviation ?? null, line.unit?.decimal_places ?? 0)} × {formatMoney(line.unitPrice)}
          </Typography>
          {/* A figure printed on the receipt once a discount has actually
              landed on this line — informational only. Discounts are
              chosen once for the whole sale via the Discount control
              (F5, see CartActionsRow), not per row any more, so there's
              nothing here to click. */}
          {line.discount > 0 && (
            <Tooltip title={`${discountLabel ?? 'Discount'}: -${formatMoney(line.discount)}`}>
              <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 13, color: 'success.main' }}>
                -{formatMoney(line.discount)}
              </Typography>
            </Tooltip>
          )}
        </Stack>

        {/* Put away until this row is the selected one. A cart is read far
            more often than it's edited — a cashier scans, the customer
            watches the list, and only occasionally does a line need
            fixing — so a stepper and a void button repeated down every
            row was permanent clutter over what is meant to read as a
            printed receipt, and on a tablet it was four small targets per
            line sitting close enough together to mis-tap. Revealing them
            on the tapped row alone means the cashier commits to a line
            first, then acts on it.

            stopPropagation because these sit inside the row's own click
            target: without it, adjusting a quantity would bubble up,
            toggle the selection back off and take the very buttons being
            pressed away mid-adjustment. */}
        <Stack
          direction="row"
          spacing={0.75}
          className={REVEAL_CLASS}
          onClick={(e) => e.stopPropagation()}
          sx={{ alignItems: 'center', flexShrink: 0, ...revealSx(selected) }}
        >
          {/* Quantity correction is unauthorized on purpose — a mis-scan
              fixed mid-queue shouldn't need a supervisor walked over, and
              nothing here can reach zero (see atMinimum). Clearing a line
              outright is the gated action. */}
          {/* A soft pill track with the buttons floating inside it, rather
              than the boxed-and-divided control this replaced — three
              hairline-separated cells read like a spreadsheet widget next
              to the receipt's clean type. Same 32px outer footprint, so
              the touch target didn't shrink: the 28px buttons plus the
              track's own 2px inset add back up. */}
          <Stack
            direction="row"
            sx={{
              alignItems: 'center',
              borderRadius: 999,
              bgcolor: 'action.hover',
              p: '2px',
            }}
          >
            <Tooltip title={atMinimum ? 'Use Void to remove this item' : 'Reduce quantity'}>
              {/* span, because a disabled MUI button doesn't fire the
                  events Tooltip listens for and would show nothing at
                  exactly the moment the hint is most useful. */}
              <span>
                <IconButton
                  onClick={() => onQuantityChange(line.key, line.quantity - step)}
                  disabled={atMinimum}
                  aria-label="Reduce quantity"
                  sx={{
                    width: 28,
                    height: 28,
                    p: 0,
                    color: 'text.secondary',
                    // Lifts out of the track on hover as a white disc —
                    // the affordance the removed borders used to carry.
                    '&:hover': { bgcolor: 'background.paper', color: POS_ACCENT },
                  }}
                >
                  <RemoveIcon sx={{ fontSize: 17 }} />
                </IconButton>
              </span>
            </Tooltip>
            <Typography
              sx={{
                fontFamily: RECEIPT_FONT,
                fontSize: 13,
                fontWeight: 700,
                minWidth: 26,
                textAlign: 'center',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formatQuantity(line.quantity, null, line.unit?.decimal_places ?? 0)}
            </Typography>
            <Tooltip title="Increase quantity">
              <IconButton
                onClick={() => onQuantityChange(line.key, line.quantity + step)}
                aria-label="Increase quantity"
                sx={{
                  width: 28,
                  height: 28,
                  p: 0,
                  color: 'text.secondary',
                  '&:hover': { bgcolor: 'background.paper', color: POS_ACCENT },
                }}
              >
                <AddIcon sx={{ fontSize: 17 }} />
              </IconButton>
            </Tooltip>
          </Stack>

          <Tooltip title="Void item (needs supervisor approval)">
            <IconButton
              onClick={() => onRequestVoid(line)}
              aria-label="Void item"
              sx={{
                width: 32,
                height: 32,
                p: 0,
                color: 'text.secondary',
                '&:hover': { color: 'error.main', backgroundColor: (t) => `color-mix(in srgb, ${t.palette.error.main} 12%, transparent)` },
              }}
            >
              <BlockOutlinedIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>
    </Box>
  );
});
