import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import SearchOffOutlinedIcon from '@mui/icons-material/SearchOffOutlined';
import type { CartLine } from './posTypes';
import { calculateLine } from './posTypes';
import { formatMoney, formatQuantity, posRaisedButtonSx } from './format';

interface Props {
  open: boolean;
  /** The cart being searched — this only ever looks at lines already rung up, never the product catalogue, since voiding something not in the cart makes no sense. */
  lines: CartLine[];
  /**
   * Skips the search step and opens straight into the quantity step for
   * this line — PosScreen passes one in when Delete voids the line
   * already selected via F10 (see posShortcuts.ts's 'cart' entry), since
   * the line is already known there and searching for it again would be
   * pure friction. Left undefined for the ordinary path, opened from the
   * "Void Item" button, which always starts at the search field.
   */
  initialLine?: CartLine | null;
  onClose: () => void;
  /**
   * Hands back which line and how much of it to void. This dialog's own
   * job stops there — PosScreen turns the pair into a VoidSubject and
   * opens the same supervisor-approval flow every other void goes
   * through (see VoidApprovalDialog); nothing is ever removed from the
   * cart directly from here.
   */
  onSelect: (line: CartLine, quantity: number) => void;
}

/**
 * The keyboard/scanner way to void a line, as an alternative to finding
 * the row in the cart and tapping its own void icon — useful once a cart
 * has enough items that hunting for one by eye is slower than scanning
 * it again. Two steps: find the line, then say how much of it to
 * remove, which can be less than the full line.
 *
 * Finding the line works two ways, and the search step shows both at
 * once rather than making the cashier commit to one: type or scan a
 * SKU/barcode/name (a second scan of the item's own barcode is the fast
 * path), or just tap it from the plain list of every line still in the
 * sale — the dialog's own backdrop dims the real cart behind it, so
 * without this list a cashier who'd rather look than type had nothing
 * to look at.
 *
 * Deliberately searches only `lines`, client-side, rather than calling
 * the product API the way ProductSearch or ReprintReceiptDialog do —
 * there is nothing to find outside the current cart, and a line's own
 * quantity/price live only on the cart line, not on the catalogue
 * product behind it.
 */
export function VoidItemDialog({ open, lines, initialLine, onClose, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<CartLine | null>(null);
  const [quantityText, setQuantityText] = useState('');

  // Fresh every time this opens — a stale query or a line picked last
  // time (possibly since voided by some other path) shouldn't survive
  // to the next open. `initialLine`, when given, skips straight to the
  // quantity step for it instead of the blank search field.
  useEffect(() => {
    if (open) {
      setQuery('');
      if (initialLine) {
        pick(initialLine);
      } else {
        setSelected(null);
        setQuantityText('');
      }
    }
    // pick() is stable across renders (it only calls the two setters
    // above) but isn't itself memoised, so it's deliberately left out of
    // this list — including it would re-run this effect on every render
    // that redefines it, i.e. every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialLine]);

  const trimmed = query.trim().toLowerCase();
  // Every line in the sale when the field is empty, not nothing — the
  // dialog's own backdrop dims the real cart behind it, so without this
  // a cashier who opened Void Item to browse rather than type had no
  // list to look at at all until they started typing. Filtered down to
  // matches the instant they do.
  const matches = useMemo(() => {
    if (!trimmed) return lines;
    return lines.filter(
      (l) =>
        l.product.sku.toLowerCase().includes(trimmed) ||
        (l.product.barcode ?? '').toLowerCase().includes(trimmed) ||
        l.product.name.toLowerCase().includes(trimmed)
    );
  }, [lines, trimmed]);

  function pick(line: CartLine) {
    setSelected(line);
    // Defaults to the whole line — voiding everything scanned is the
    // common case, and the field stays editable for a partial void.
    setQuantityText(formatQuantity(line.quantity, null, line.unit?.decimal_places ?? 0));
  }

  /**
   * Enter on the search field acts like a scan: a SKU or barcode is
   * expected to match exactly one line, so an exact hit jumps straight
   * to the quantity step without making the cashier click a one-row
   * list. Falls through to the fuzzy list untouched for a typed name,
   * where "exact" rarely applies and clicking the right row is the
   * normal path anyway.
   */
  function handleSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return;
    const code = query.trim();
    if (!code) return;
    const exact = lines.find((l) => l.product.sku === code || l.product.barcode === code);
    if (exact) {
      e.preventDefault();
      pick(exact);
    }
  }

  const step = selected ? 1 / 10 ** (selected.unit?.decimal_places ?? 0) : 1;
  const parsedQuantity = parseFloat(quantityText);
  // Half a step of slack on the upper bound — the field is pre-filled
  // from the same formatQuantity() rounding the line itself uses, so an
  // exact float equality check would be fragile against that rounding.
  const quantityValid =
    selected !== null && !Number.isNaN(parsedQuantity) && parsedQuantity > 0 && parsedQuantity <= selected.quantity + step / 2;

  function submit() {
    if (!selected || !quantityValid) return;
    onSelect(selected, Math.min(parsedQuantity, selected.quantity));
  }

  function handleClose() {
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      slotProps={{ transition: { onEntered: () => document.getElementById('void-item-search-input')?.focus() } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Void Item
        <IconButton size="small" onClick={handleClose} aria-label="Close">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {!selected ? (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Scan, or type a SKU, barcode or name to find it — or tap an item straight from the list below.
            </Typography>
            <TextField
              id="void-item-search-input"
              label="SKU, barcode or name"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              fullWidth
              size="small"
            />

            {trimmed && matches.length === 0 ? (
              <Stack sx={{ alignItems: 'center', textAlign: 'center', py: 4, color: 'text.secondary' }}>
                <SearchOffOutlinedIcon sx={{ fontSize: 36, opacity: 0.4, mb: 1 }} />
                <Typography variant="body2">No item in this cart matches "{query.trim()}"</Typography>
              </Stack>
            ) : (
              <>
                {/* Only above the unfiltered list — once a query narrows
                    it, "matching X" is already stated by the field
                    itself sitting right above, and repeating it here
                    would just be noise. */}
                {!trimmed && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5, mb: 0.5, px: 0.5 }}>
                    {lines.length} {lines.length === 1 ? 'item' : 'items'} in this sale — tap one to void it
                  </Typography>
                )}
                <List
                  disablePadding
                  sx={{
                    mt: trimmed ? 1.5 : 0,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    overflow: 'hidden',
                    // The search step has no fixed height of its own —
                    // without a cap here, a long cart made this list (and
                    // the dialog around it) grow past the viewport with
                    // nothing to scroll it back into view.
                    maxHeight: 320,
                    overflowY: 'auto',
                  }}
                >
                  {matches.map((l, i) => (
                    <ListItemButton key={l.key} divider={i < matches.length - 1} onClick={() => pick(l)} sx={{ py: 1 }}>
                      <ListItemText
                        primary={l.product.name}
                        secondary={`${l.product.sku} · ${formatQuantity(l.quantity, l.unit?.abbreviation ?? null, l.unit?.decimal_places ?? 0)} in cart`}
                        slotProps={{ primary: { sx: { fontWeight: 600 } }, secondary: { variant: 'caption' } }}
                      />
                      <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                        {formatMoney(calculateLine(l).gross)}
                      </Typography>
                    </ListItemButton>
                  ))}
                </List>
              </>
            )}
          </>
        ) : (
          <Stack spacing={2}>
            {/* The line restated, same as VoidApprovalDialog does one
                step later — confirming this is the right row before
                asking for a quantity, since a name/SKU match can easily
                land on a near-duplicate item (two sizes of the same
                product, say). */}
            <Stack
              direction="row"
              spacing={1.5}
              sx={{ alignItems: 'center', justifyContent: 'space-between', p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap title={selected.product.name}>
                  {selected.product.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatQuantity(selected.quantity, selected.unit?.abbreviation ?? null, selected.unit?.decimal_places ?? 0)} in cart ·{' '}
                  {formatMoney(selected.unitPrice)} each
                </Typography>
              </Box>
              <Button size="small" onClick={() => setSelected(null)}>
                Change
              </Button>
            </Stack>

            <TextField
              label="Quantity to void"
              type="number"
              size="small"
              value={quantityText}
              onChange={(e) => setQuantityText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              fullWidth
              autoFocus
              error={quantityText !== '' && !quantityValid}
              slotProps={{ htmlInput: { min: step, max: selected.quantity, step } }}
              helperText={`Up to ${formatQuantity(selected.quantity, selected.unit?.abbreviation ?? null, selected.unit?.decimal_places ?? 0)} — anything less leaves the rest in the cart.`}
            />
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        {selected ? (
          <>
            <Button onClick={() => setSelected(null)}>Back</Button>
            <Button
              variant="contained"
              disabled={!quantityValid}
              onClick={submit}
              sx={(theme) => posRaisedButtonSx(theme.palette.error.main)}
            >
              Continue
            </Button>
          </>
        ) : (
          <Button onClick={handleClose}>Cancel</Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
