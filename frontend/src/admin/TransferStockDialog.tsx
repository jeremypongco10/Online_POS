import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { InventoryStockRow, Store } from '../api/types';
import { useFormErrors } from './useFormErrors';
import { Modal } from './Modal';
import { SearchableSelect } from './SearchableSelect';
import { StockProductPicker } from './StockProductPicker';
import { fmtQty, n } from './inventoryUtils';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';

interface Props {
  open: boolean;
  stores: Store[];
  initialFromStoreId: string;
  initialProduct?: InventoryStockRow | null;
  onClose: () => void;
  onDone: (message: string) => void;
}

async function stockAt(storeId: string, product: InventoryStockRow): Promise<InventoryStockRow | null> {
  const rows = await api.get<InventoryStockRow[]>(`/inventory/stock?store_id=${storeId}&per_page=20&q=${encodeURIComponent(product.sku)}`);
  return rows.find((r) => r.product_id === product.product_id) ?? null;
}

function BranchCard({ title, name, before, after }: { title: string; name: string; before: number | null; after: number | null }) {
  return (
    <Box sx={{ flex: 1, minWidth: 0, p: 1.5, borderRadius: '12px', bgcolor: 'action.hover' }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
        {name || '—'}
      </Typography>
      <Typography sx={{ mt: 0.5, fontVariantNumeric: 'tabular-nums' }}>
        <Box component="span" sx={{ color: 'text.secondary' }}>
          {before === null ? '—' : fmtQty(before)}
        </Box>
        {' → '}
        <Box component="span" sx={{ fontWeight: 800, fontSize: 18, color: after !== null && after < 0 ? 'error.main' : 'text.primary' }}>
          {after === null ? '—' : fmtQty(after)}
        </Box>
      </Typography>
    </Box>
  );
}

export function TransferStockDialog({ open, stores, initialFromStoreId, initialProduct, onClose, onDone }: Props) {
  const [fromId, setFromId] = useState(initialFromStoreId);
  const [toId, setToId] = useState('');
  const [product, setProduct] = useState<InventoryStockRow | null>(null);
  const [destination, setDestination] = useState<InventoryStockRow | null>(null);
  const [qty, setQty] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [tried, setTried] = useState(false);
  const { formError, clearErrors, reportError } = useFormErrors();

  useEffect(() => {
    if (!open) return;
    setFromId(initialFromStoreId);
    // Most chains move stock between two branches — suggest the other one.
    setToId(stores.length === 2 ? String(stores.find((s) => String(s.id) !== initialFromStoreId)?.id ?? '') : '');
    setProduct(initialProduct ?? null);
    setDestination(null);
    setQty('');
    setNotes('');
    setTried(false);
    clearErrors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!product || !toId || toId === fromId) {
      setDestination(null);
      return;
    }
    let live = true;
    stockAt(toId, product)
      .then((row) => live && setDestination(row))
      .catch(() => live && setDestination(null));
    return () => {
      live = false;
    };
  }, [product, toId, fromId]);

  async function changeFrom(next: string) {
    setFromId(next);
    if (product && next) setProduct(await stockAt(next, product).catch(() => null));
  }

  function swap() {
    const oldFrom = fromId;
    setToId(oldFrom);
    changeFrom(toId);
  }

  const storeName = (id: string) => stores.find((s) => String(s.id) === id)?.name ?? '';
  const available = product ? n(product.quantity) : 0;
  const amount = n(qty);
  const hasQty = qty.trim() !== '' && amount > 0;
  const destBefore = product && toId ? n(destination?.quantity) : null;

  const problem = !fromId
    ? 'Pick the branch sending the stock.'
    : !toId
      ? 'Pick the branch receiving it.'
      : fromId === toId
        ? 'The two branches must be different.'
        : !product
          ? 'Pick a product.'
          : !hasQty
            ? 'Enter a quantity above zero.'
            : amount > available
              ? `${storeName(fromId)} only has ${fmtQty(available)} on hand.`
              : null;

  async function submit() {
    setTried(true);
    if (problem || !product) return;
    setSaving(true);
    clearErrors();
    try {
      await api.post('/inventory/transfer', {
        product_id: product.product_id,
        from_store_id: Number(fromId),
        to_store_id: Number(toId),
        quantity: amount,
        notes: notes.trim() || null,
      });
      onDone(`Moved ${fmtQty(amount)} × ${product.name} from ${storeName(fromId)} to ${storeName(toId)}`);
    } catch (err) {
      reportError(err, 'Could not transfer stock');
    } finally {
      setSaving(false);
    }
  }

  const storeOptions = stores.map((s) => ({ value: String(s.id), label: s.name }));

  return (
    <Modal open={open} title="Transfer stock between branches" onClose={onClose} maxWidth="sm">
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Stack spacing={2.25} sx={{ pt: 0.5 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Box sx={{ flex: 1 }}>
              <SearchableSelect label="From" fullWidth required value={fromId} onChange={changeFrom} options={storeOptions} />
            </Box>
            <Tooltip title="Swap branches">
              <span>
                <IconButton onClick={swap} disabled={!fromId || !toId} aria-label="Swap branches">
                  <SwapHorizIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Box sx={{ flex: 1 }}>
              <SearchableSelect label="To" fullWidth required value={toId} onChange={setToId} options={storeOptions} />
            </Box>
          </Stack>

          <StockProductPicker
            storeId={fromId}
            value={product}
            onChange={setProduct}
            label={fromId ? `Product (stock at ${storeName(fromId)})` : 'Product'}
            autoFocus={!initialProduct}
            error={tried && !product}
          />

          <TextField
            id="transfer-qty"
            label="Quantity to move"
            type="number"
            fullWidth
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            error={tried && !!problem && !!product}
            helperText={product ? `${fmtQty(available)} available at ${storeName(fromId)}` : undefined}
            slotProps={{
              htmlInput: { min: 0, step: 'any' },
              input: { endAdornment: product?.unit ? <Typography color="text.secondary">{product.unit}</Typography> : undefined },
            }}
          />

          {product && (
            <Stack direction="row" spacing={1.5}>
              <BranchCard title="Sending" name={storeName(fromId)} before={available} after={hasQty ? available - amount : null} />
              <BranchCard title="Receiving" name={storeName(toId)} before={destBefore} after={hasQty && destBefore !== null ? destBefore + amount : null} />
            </Stack>
          )}

          <TextField
            id="transfer-notes"
            label="Notes (optional)"
            fullWidth
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, 200))}
            placeholder="e.g. Rebalancing for the weekend sale"
          />

          {tried && problem && <Alert severity="warning">{problem}</Alert>}
          {formError && <Alert severity="error">{formError}</Alert>}

          <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'flex-end' }}>
            <Button onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={saving} sx={{ minWidth: 140 }}>
              {saving ? 'Moving…' : 'Transfer stock'}
            </Button>
          </Stack>
        </Stack>
      </form>
    </Modal>
  );
}
