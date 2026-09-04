import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Popover from '@mui/material/Popover';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import SellOutlinedIcon from '@mui/icons-material/SellOutlined';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import type { CartLine } from './posTypes';
import { calculateLine } from './posTypes';
import { formatMoney, formatQuantity, taxIndicatorFor, POS_ACCENT, TAX_INDICATOR_LABELS } from './format';

interface Props {
  lines: CartLine[];
  /** The most recently added/updated line, from any add path (tile click or scan) — scrolls it into view and briefly highlights it, so a cashier can always see what just landed in the cart. */
  lastAddedKey: string | null;
  onDiscountChange: (key: string, discount: number) => void;
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
}

// A monospace stack, not the UI's regular sans font, is what actually reads as "receipt" —
// it's what every dot-matrix/thermal receipt printer renders in, and it's what keeps a column
// of prices lining up by eye even without a real table underneath.
const RECEIPT_FONT = 'ui-monospace, "SFMono-Regular", "Courier New", monospace';

const CART_ROW_DOM_ID = (key: string) => `cart-row-${key}`;


export function Cart({ lines, lastAddedKey, selectedKey, onDiscountChange, onQuantityChange, onRequestVoid }: Props) {
  // Mirrors lastAddedKey but self-clears — the parent's key only changes on
  // the NEXT add, so without a local timeout the highlight would just stay
  // lit on whatever was last added instead of fading like a flash.
  const [highlightKey, setHighlightKey] = useState<string | null>(null);

  useEffect(() => {
    if (!lastAddedKey) return;
    // 'center' rather than 'nearest' — 'nearest' does the *minimum* scroll needed, which is
    // zero (i.e. no visible movement at all) whenever the row is already even barely in view,
    // making the whole feature look broken on a short-ish cart. 'center' always lands the row
    // in a clearly visible spot, so adding an item reliably produces a visible scroll.
    document.getElementById(CART_ROW_DOM_ID(lastAddedKey))?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightKey(lastAddedKey);
    const id = setTimeout(() => setHighlightKey(null), 1200);
    return () => clearTimeout(id);
  }, [lastAddedKey]);

  // Keeps the F10 selection visible as it steps past the bottom (or top)
  // of the visible list. 'nearest' rather than 'center': this fires on
  // every step, so the minimum scroll that reveals the row is what keeps
  // moving within an already-visible stretch from jerking the list.
  useEffect(() => {
    if (!selectedKey) return;
    document.getElementById(CART_ROW_DOM_ID(selectedKey))?.scrollIntoView({ block: 'nearest' });
  }, [selectedKey]);

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
          onDiscountChange={onDiscountChange}
          onQuantityChange={onQuantityChange}
          onRequestVoid={onRequestVoid}
        />
      ))}
    </Stack>
  );
}

function CartRow({
  line,
  highlighted,
  selected,
  onDiscountChange,
  onQuantityChange,
  onRequestVoid,
}: {
  line: CartLine;
  highlighted: boolean;
  selected: boolean;
  onDiscountChange: (key: string, discount: number) => void;
  onQuantityChange: (key: string, quantity: number) => void;
  onRequestVoid: (line: CartLine) => void;
}) {
  const totals = calculateLine(line);
  const [discountAnchor, setDiscountAnchor] = useState<HTMLElement | null>(null);
  const [discountText, setDiscountText] = useState(String(line.discount || ''));

  // One step of whatever precision this line's unit carries — 1 for a
  // whole-piece item, 0.001 for a weighed one — so "−" on 1.250 KG lands
  // on 1.249 rather than 0.250.
  const indicator = taxIndicatorFor(line.taxRate);

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
        '&:hover': { bgcolor: selected ? `${POS_ACCENT}14` : highlighted ? `${POS_ACCENT}0a` : 'action.hover' },
        '&:last-of-type': { borderBottom: 'none' },
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
          <Tooltip title={line.discount > 0 ? `Discount: -${formatMoney(line.discount)}` : 'Add discount'}>
            <Box
              component="button"
              type="button"
              onClick={(e) => setDiscountAnchor(e.currentTarget)}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.25,
                border: 'none',
                background: 'none',
                p: 0,
                cursor: 'pointer',
                color: line.discount > 0 ? 'success.main' : 'text.secondary',
                '&:hover': { color: 'success.main' },
              }}
            >
              <SellOutlinedIcon sx={{ fontSize: 13 }} />
              {line.discount > 0 && (
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 13 }}>
                  -{formatMoney(line.discount)}
                </Typography>
              )}
            </Box>
          </Tooltip>
        </Stack>

        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexShrink: 0 }}>
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

      <Popover
        open={Boolean(discountAnchor)}
        anchorEl={discountAnchor}
        onClose={() => setDiscountAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Stack direction="row" spacing={1} sx={{ p: 1.5, alignItems: 'center' }}>
          <TextField
            label="Discount"
            type="number"
            size="small"
            autoFocus
            slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
            value={discountText}
            onChange={(e) => setDiscountText(e.target.value)}
            sx={{ width: 120 }}
          />
          <Button
            size="small"
            variant="contained"
            onClick={() => {
              onDiscountChange(line.key, parseFloat(discountText) || 0);
              setDiscountAnchor(null);
            }}
          >
            Apply
          </Button>
        </Stack>
      </Popover>
    </Box>
  );
}
