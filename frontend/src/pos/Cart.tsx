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
import CloseIcon from '@mui/icons-material/Close';
import SellOutlinedIcon from '@mui/icons-material/SellOutlined';
import type { CartLine } from './posTypes';
import { calculateLine } from './posTypes';
import { formatMoney, formatQuantity, POS_ACCENT } from './format';

interface Props {
  lines: CartLine[];
  /** The most recently added/updated line, from any add path (tile click or scan) — scrolls it into view and briefly highlights it, so a cashier can always see what just landed in the cart. */
  lastAddedKey: string | null;
  onDiscountChange: (key: string, discount: number) => void;
  onRemove: (key: string) => void;
}

// A monospace stack, not the UI's regular sans font, is what actually reads as "receipt" —
// it's what every dot-matrix/thermal receipt printer renders in, and it's what keeps a column
// of prices lining up by eye even without a real table underneath.
const RECEIPT_FONT = 'ui-monospace, "SFMono-Regular", "Courier New", monospace';

const CART_ROW_DOM_ID = (key: string) => `cart-row-${key}`;

export function Cart({ lines, lastAddedKey, onDiscountChange, onRemove }: Props) {
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
          onDiscountChange={onDiscountChange}
          onRemove={onRemove}
        />
      ))}
    </Stack>
  );
}

function CartRow({
  line,
  highlighted,
  onDiscountChange,
  onRemove,
}: {
  line: CartLine;
  highlighted: boolean;
  onDiscountChange: (key: string, discount: number) => void;
  onRemove: (key: string) => void;
}) {
  const totals = calculateLine(line);
  const [discountAnchor, setDiscountAnchor] = useState<HTMLElement | null>(null);
  const [discountText, setDiscountText] = useState(String(line.discount || ''));

  return (
    <Box
      id={CART_ROW_DOM_ID(line.key)}
      sx={{
        // Dashed rather than solid — the same "torn perforation" line every
        // printed receipt uses between line items, instead of a spreadsheet
        // row border.
        py: 0.3,
        borderBottom: '1px dashed',
        borderColor: 'divider',
        // A brief tint on whatever a scan just touched — fades back out on
        // its own once `highlighted` clears (see Cart's highlightKey timeout)
        // rather than needing a second transition/animation to reverse.
        bgcolor: highlighted ? `${POS_ACCENT}1f` : 'transparent',
        transition: 'background-color 0.4s ease',
        '&:hover': { bgcolor: highlighted ? `${POS_ACCENT}1f` : 'action.hover' },
        '&:last-of-type': { borderBottom: 'none' },
      }}
    >
      {/* Line 1, receipt-style: description on the left, extended price on the right. */}
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', gap: 1.5 }}>
        {/* Typography defaults to a 1.5 line-height meant for paragraphs — left alone, that padded
            each of these two lines far more than the row's own py did. */}
        <Typography sx={{ fontFamily: RECEIPT_FONT, fontWeight: 700, fontSize: 13, lineHeight: 1.2, minWidth: 0 }} noWrap title={line.product.name}>
          {line.product.name}
        </Typography>
        <Typography sx={{ fontFamily: RECEIPT_FONT, fontWeight: 700, fontSize: 13, lineHeight: 1.2, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
          {formatMoney(totals.gross)}
        </Typography>
      </Stack>

      {/* Line 2: the qty × unit-price breakdown a receipt prints under the description, plus the
          only editable controls this line has (the printed page has none) at the trailing edge. */}
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mt: 0.25, gap: 1 }}>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
          <Typography sx={{ fontFamily: RECEIPT_FONT, fontSize: 11, lineHeight: 1.2, color: 'text.secondary', whiteSpace: 'nowrap' }}>
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
              <SellOutlinedIcon sx={{ fontSize: 11 }} />
              {line.discount > 0 && (
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 11 }}>
                  -{formatMoney(line.discount)}
                </Typography>
              )}
            </Box>
          </Tooltip>
        </Stack>

        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexShrink: 0 }}>
          <Tooltip title="Remove">
            <IconButton
              onClick={() => onRemove(line.key)}
              aria-label="Remove"
              sx={{
                width: 20,
                height: 20,
                p: 0,
                color: 'text.secondary',
                '&:hover': { color: 'error.main', backgroundColor: (t) => `color-mix(in srgb, ${t.palette.error.main} 12%, transparent)` },
              }}
            >
              <CloseIcon sx={{ fontSize: 14 }} />
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
