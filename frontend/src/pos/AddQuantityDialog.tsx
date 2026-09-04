import { useEffect, useRef, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import type { ProductWithStorePrice } from '../api/types';
import { formatMoney, POS_ACCENT } from './format';
import { IS_TOUCH } from '../isTouch';

interface Props {
  /** null = closed. Kept as the product itself (not a boolean `open`) so the dialog always has something to show right up through its close transition, instead of blanking a frame early. */
  product: ProductWithStorePrice | null;
  onClose: () => void;
  onConfirm: (quantity: number) => void;
  /** Fired once the dialog has fully left the screen. The caller does the actual cart work here — see ProductSearch for why that ordering matters. */
  onExited?: () => void;
}

const BACKSPACE = '⌫';

/** Rows of the in-dialog keypad. Laid out phone-style (1 at top-left), which is what a calculator/till keypad uses and what muscle memory expects here. */
const KEYPAD_ROWS: string[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', BACKSPACE],
];

/**
 * Opened by a long-press on a product (see useLongPress) — the plain-click
 * path still adds exactly one unit, unchanged; this is for a cashier who
 * knows up front they need several, so they aren't clicking the same tile
 * repeatedly (or reaching for the search box's "5*" scan prefix, which
 * needs a barcode/SKU to type and doesn't help for a mouse/touch pick).
 *
 * No unit precision here (decimal_places/step) — that's already correctly
 * enforced where it needs to be: PosScreen's addProduct rounds whatever
 * quantity it's given to the product's real unit step before it ever
 * reaches the cart, the same as the search box's own quantity prefix. This
 * just needs to collect a positive number.
 */
export function AddQuantityDialog({ product, onClose, onConfirm, onExited }: Props) {
  const [quantity, setQuantity] = useState('1');
  /** True until the cashier's first keypad/stepper press — see pressKey. */
  const [pristine, setPristine] = useState(true);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Resets fresh for every product this dialog is opened for, not just once
  // — otherwise quantifying one product to "5" would silently carry that
  // number into the next, unrelated product.
  useEffect(() => {
    if (product) {
      setQuantity('1');
      setPristine(true);
    }
  }, [product]);

  const parsed = parseFloat(quantity);
  const valid = Number.isFinite(parsed) && parsed > 0;
  const unitPrice = product ? parseFloat(product.selling_price ?? '0') || 0 : 0;

  function confirm() {
    if (!valid) return;
    onConfirm(parsed);
  }

  function step(delta: number) {
    setPristine(false);
    const next = Math.max(1, (Number.isFinite(parsed) ? parsed : 0) + delta);
    setQuantity(String(next));
  }

  /**
   * The in-dialog keypad's only writer. `pristine` makes the first press
   * replace the default "1" rather than append to it — pressing 5 means 5,
   * not 15 — which is what every till's quantity entry does and what a
   * cashier expects after the value is shown pre-highlighted on desktop.
   */
  function pressKey(key: string) {
    const base = pristine ? '' : quantity;
    setPristine(false);

    if (key === BACKSPACE) {
      setQuantity(base.slice(0, -1));
      return;
    }
    if (key === '.') {
      // One decimal point only, and "." alone means "0." — a weighed item
      // (see the unit's decimal_places) is the reason this key exists.
      setQuantity(base.includes('.') ? base : `${base || '0'}.`);
      return;
    }
    setQuantity(base + key);
  }

  return (
    <Dialog
      open={product !== null}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      // No fade-out, anywhere. The exit animation is ~200ms during which
      // the dialog is still on screen after the cashier has already
      // committed — on a till that reads as lag, not polish. Opening keeps
      // its animation: that one runs while the cashier is still moving
      // their hand, so it costs nothing. Zero here also means onExited
      // fires promptly, which is what the caller's cart work waits on.
      transitionDuration={{ enter: 195, exit: 0 }}
      // Anchored near the top on touch rather than vertically centered, and
      // height-capped in dvh (the unit that tracks the actually-visible
      // area). Both are belt-and-braces now that the keypad below means no
      // OS keyboard should ever appear over this dialog at all — but a
      // dialog that starts near the top and can't outgrow the visible area
      // is the right shape on a tablet regardless of what any given
      // Android build does with its system UI.
      sx={{
        ...(IS_TOUCH && { '& .MuiDialog-container': { alignItems: 'flex-start', pt: { xs: 4, sm: 6 } } }),
      }}
      slotProps={{
        paper: { sx: { maxHeight: '85dvh', display: 'flex', flexDirection: 'column' } },
        // onEntered is desktop only: it selects the default "1" so typing a
        // number overwrites it instead of appending. On touch there's
        // nothing to select into — the keypad writes the value and the
        // field is deliberately never focusable-for-typing (see
        // readOnly/inputMode on it). onExited is for both.
        transition: {
          ...(IS_TOUCH ? {} : { onEntered: () => inputRef.current?.select() }),
          onExited: () => onExited?.(),
        },
      }}
    >
      <DialogTitle sx={{ pr: 6 }}>
        Add quantity
        <IconButton onClick={onClose} aria-label="Close" sx={{ position: 'absolute', right: 8, top: 8, color: 'text.secondary' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {product && (
          <Stack spacing={2.5}>
            <Box>
              <Typography sx={{ fontWeight: 700 }} noWrap title={product.name}>
                {product.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {unitPrice > 0 ? `${formatMoney(unitPrice)} each` : 'No price set'}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', justifyContent: 'center' }}>
              <IconButton
                onClick={() => step(-1)}
                aria-label="Decrease quantity"
                sx={{ border: '1px solid', borderColor: 'divider' }}
              >
                <RemoveIcon />
              </IconButton>
              <Box
                component="input"
                ref={inputRef}
                type="number"
                min="0"
                step="any"
                autoFocus={!IS_TOUCH}
                // Touch never gets the OS keyboard here — not on open, not
                // on a deliberate tap. readOnly plus inputMode="none" is
                // belt-and-braces: the field can still be tapped and show
                // a caret, but Android has nothing to raise. The keypad
                // below is the input method instead. This is the actual
                // fix for the ~2s black screen: on Android, opening the
                // on-screen keyboard over a page that's in the Fullscreen
                // API makes the system tear fullscreen down and rebuild
                // it, and that rebuild is the black frame — which is
                // exactly why it only ever happened once the quantity had
                // been typed (quantity 1 is the default and needs no
                // typing at all).
                readOnly={IS_TOUCH}
                inputMode={IS_TOUCH ? 'none' : undefined}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirm();
                }}
                sx={{
                  width: 90,
                  textAlign: 'center',
                  fontSize: 28,
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontFamily: 'inherit',
                  color: 'inherit',
                  // The custom −/+ buttons either side already do this
                  // job — the browser's own tiny spin arrows are a second,
                  // redundant way to do the same thing crowded into the
                  // same control.
                  MozAppearance: 'textfield',
                  '&::-webkit-inner-spin-button, &::-webkit-outer-spin-button': {
                    WebkitAppearance: 'none',
                    margin: 0,
                  },
                }}
              />
              <IconButton
                onClick={() => step(1)}
                aria-label="Increase quantity"
                sx={{ border: '1px solid', borderColor: 'divider' }}
              >
                <AddIcon />
              </IconButton>
            </Stack>

            {/*
              Touch only. This is what replaces Android's on-screen keyboard
              — the keyboard is what tore fullscreen down and produced the
              ~2s black screen, so the way out is to never need it. It's
              also simply better here than the OS keyboard was: bigger
              targets, no half-screen overlay, and a cashier can enter "24"
              in two taps without the dialog moving.

              Desktop keeps the physical keyboard (the field is a normal
              typable input there) and doesn't need this.
            */}
            {IS_TOUCH && (
              <Stack spacing={1}>
                {KEYPAD_ROWS.map((row) => (
                  <Stack key={row.join('')} direction="row" spacing={1}>
                    {row.map((key) => (
                      <Button
                        key={key}
                        onClick={() => pressKey(key)}
                        variant="outlined"
                        color="inherit"
                        aria-label={key === BACKSPACE ? 'Backspace' : key}
                        sx={{
                          flex: 1,
                          // Comfortably past the ~44px minimum touch target,
                          // since this is the one control a cashier taps
                          // repeatedly and in a hurry.
                          minHeight: 52,
                          fontSize: 20,
                          fontWeight: 700,
                          borderColor: 'divider',
                          color: 'text.primary',
                        }}
                      >
                        {key}
                      </Button>
                    ))}
                  </Stack>
                ))}
              </Stack>
            )}

            {!valid && (
              <Typography variant="caption" color="error.main" sx={{ textAlign: 'center' }}>
                Enter a quantity greater than zero.
              </Typography>
            )}
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={confirm}
          variant="contained"
          disabled={!valid}
          sx={{ bgcolor: POS_ACCENT, '&:hover': { bgcolor: POS_ACCENT } }}
        >
          {valid && unitPrice > 0 ? `Add · ${formatMoney(unitPrice * parsed)}` : 'Add to cart'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
