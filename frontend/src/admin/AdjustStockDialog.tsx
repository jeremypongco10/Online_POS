import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { InventoryStockRow, Store } from '../api/types';
import { useFormErrors } from './useFormErrors';
import { Modal } from './Modal';
import { SearchableSelect } from './SearchableSelect';
import { StockProductPicker } from './StockProductPicker';
import { ADJUST_REASONS, fmtDelta, fmtQty, n, stockStatus, STOCK_STATUS_META, tint } from './inventoryUtils';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

type Mode = 'add' | 'remove' | 'count';

const MODE_HELP: Record<Mode, string> = {
  add: 'Stock came in without a purchase order — a delivery, a return to shelf, a found item.',
  remove: 'Stock left without a sale — damaged, expired, lost, or sent back.',
  count: 'You counted the shelf. Enter what is physically there and the difference is worked out for you.',
};

interface Props {
  open: boolean;
  stores: Store[];
  initialStoreId: string;
  initialProduct?: InventoryStockRow | null;
  onClose: () => void;
  onDone: (message: string) => void;
}

export function AdjustStockDialog({ open, stores, initialStoreId, initialProduct, onClose, onDone }: Props) {
  const [storeId, setStoreId] = useState(initialStoreId);
  const [product, setProduct] = useState<InventoryStockRow | null>(null);
  const [mode, setMode] = useState<Mode>('add');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [tried, setTried] = useState(false);
  const { formError, clearErrors, reportError } = useFormErrors();

  useEffect(() => {
    if (!open) return;
    setStoreId(initialStoreId);
    setProduct(initialProduct ?? null);
    setMode('add');
    setAmount('');
    setReason('');
    setNotes('');
    setTried(false);
    clearErrors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Switching branch keeps the product but re-reads its stock at the new branch.
  async function changeStore(next: string) {
    setStoreId(next);
    if (!product || !next) return;
    try {
      const rows = await api.get<InventoryStockRow[]>(`/inventory/stock?store_id=${next}&per_page=20&q=${encodeURIComponent(product.sku)}`);
      setProduct(rows.find((r) => r.product_id === product.product_id) ?? null);
    } catch {
      setProduct(null);
    }
  }

  const current = product ? n(product.quantity) : 0;
  const value = n(amount);
  const hasAmount = amount.trim() !== '' && Number.isFinite(parseFloat(amount));
  const after = mode === 'add' ? current + value : mode === 'remove' ? current - value : value;
  const delta = after - current;

  const problem = !product
    ? 'Pick a product.'
    : !hasAmount
      ? mode === 'count'
        ? 'Enter the quantity you counted.'
        : 'Enter how many.'
      : mode !== 'count' && value <= 0
        ? 'Enter a quantity above zero.'
        : mode === 'count' && value < 0
          ? "A count can't be below zero."
          : after < 0
            ? `Only ${fmtQty(current)} on hand — you can't remove more than that.`
            : mode === 'count' && delta === 0
              ? 'That matches the system already — nothing to change.'
              : null;

  async function submit() {
    setTried(true);
    if (problem || !product) return;
    setSaving(true);
    clearErrors();
    const note = [reason, notes.trim()].filter(Boolean).join(' — ') || null;
    try {
      await api.post('/inventory/adjust', {
        product_id: product.product_id,
        store_id: Number(storeId),
        ...(mode === 'count' ? { counted_quantity: value } : { quantity_delta: mode === 'add' ? value : -value }),
        notes: note,
      });
      onDone(`${product.name}: ${fmtDelta(delta)} → ${fmtQty(after)} on hand`);
    } catch (err) {
      reportError(err, 'Could not adjust stock');
    } finally {
      setSaving(false);
    }
  }

  const afterStatus = STOCK_STATUS_META[stockStatus(after, product ? n(product.reorder_level) : 0)];

  return (
    <Modal open={open} title="Adjust stock" onClose={onClose} maxWidth="sm">
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Stack spacing={2.25} sx={{ pt: 0.5 }}>
          <SearchableSelect
            label="Branch"
            fullWidth
            required
            value={storeId}
            onChange={changeStore}
            options={stores.map((s) => ({ value: String(s.id), label: s.name }))}
            // One store: it is shown, but there is nothing to choose.
            disabled={stores.length === 1}
          />
          <StockProductPicker storeId={storeId} value={product} onChange={setProduct} autoFocus={!initialProduct} error={tried && !product} />

          <Box>
            <ToggleButtonGroup
              exclusive
              fullWidth
              size="small"
              value={mode}
              onChange={(_, m: Mode | null) => m && setMode(m)}
              sx={{ '& .MuiToggleButton-root': { textTransform: 'none', fontWeight: 600, gap: 0.75, py: 1 } }}
            >
              <ToggleButton value="add" color="success">
                <AddIcon fontSize="small" /> Add
              </ToggleButton>
              <ToggleButton value="remove" color="error">
                <RemoveIcon fontSize="small" /> Remove
              </ToggleButton>
              <ToggleButton value="count" color="primary">
                <FactCheckOutlinedIcon fontSize="small" /> Set counted
              </ToggleButton>
            </ToggleButtonGroup>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
              {MODE_HELP[mode]}
            </Typography>
          </Box>

          <TextField
            id="adjust-amount"
            label={mode === 'count' ? 'Counted quantity' : mode === 'add' ? 'Quantity to add' : 'Quantity to remove'}
            type="number"
            fullWidth
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            error={tried && !!problem && !!product}
            slotProps={{
              htmlInput: { min: 0, step: 'any' },
              input: { endAdornment: product?.unit ? <Typography color="text.secondary">{product.unit}</Typography> : undefined },
            }}
          />

          {product && (
            <Stack
              direction="row"
              spacing={2}
              sx={{ alignItems: 'center', justifyContent: 'space-between', p: 1.75, borderRadius: '12px', bgcolor: 'action.hover' }}
            >
              <Box>
                <Typography variant="caption" color="text.secondary">
                  On hand now
                </Typography>
                <Typography sx={{ fontWeight: 800, fontSize: 22, fontVariantNumeric: 'tabular-nums' }}>{fmtQty(current)}</Typography>
              </Box>
              <Stack sx={{ alignItems: 'center' }}>
                <ArrowForwardIcon sx={{ color: 'text.secondary' }} />
                {hasAmount && delta !== 0 && (
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 700, color: delta > 0 ? 'success.main' : 'error.main', fontVariantNumeric: 'tabular-nums' }}
                  >
                    {fmtDelta(delta)}
                  </Typography>
                )}
              </Stack>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="caption" color="text.secondary">
                  After this change
                </Typography>
                <Typography
                  sx={{
                    fontWeight: 800,
                    fontSize: 22,
                    fontVariantNumeric: 'tabular-nums',
                    color: hasAmount ? (after < 0 ? 'error.main' : afterStatus.sx) : 'text.disabled',
                  }}
                >
                  {hasAmount ? fmtQty(after) : '—'}
                </Typography>
              </Box>
            </Stack>
          )}

          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
              Reason
            </Typography>
            <Stack direction="row" useFlexGap spacing={0.75} sx={{ flexWrap: 'wrap' }}>
              {ADJUST_REASONS.map((r) => {
                const selected = reason === r;
                return (
                  <Chip
                    key={r}
                    label={r}
                    clickable
                    onClick={() => setReason(selected ? '' : r)}
                    variant={selected ? 'filled' : 'outlined'}
                    color={selected ? 'primary' : 'default'}
                    sx={{ fontWeight: 600, ...(selected ? {} : { bgcolor: 'transparent', '&:hover': { bgcolor: tint('var(--mui-palette-primary-main)', 8) } }) }}
                  />
                );
              })}
            </Stack>
          </Box>

          <TextField
            id="adjust-notes"
            label="Notes (optional)"
            fullWidth
            multiline
            maxRows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, 200))}
            placeholder="e.g. 2 cans dented in delivery"
          />

          {tried && problem && <Alert severity={problem.startsWith('That matches') ? 'info' : 'warning'}>{problem}</Alert>}
          {formError && <Alert severity="error">{formError}</Alert>}

          <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'flex-end' }}>
            <Button onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={saving} sx={{ minWidth: 140 }}>
              {saving ? 'Saving…' : 'Save adjustment'}
            </Button>
          </Stack>
        </Stack>
      </form>
    </Modal>
  );
}
