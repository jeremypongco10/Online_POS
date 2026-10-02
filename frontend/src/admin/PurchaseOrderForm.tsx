import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { api } from '../api/client';
import type { ProductWithStorePrice, PurchaseOrder, Store } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { useFormErrors } from './useFormErrors';
import { Modal } from './Modal';
import { SearchableSelect } from './SearchableSelect';
import { SupplierPicker, type SupplierOption } from './SupplierPicker';
import { formatMoney } from '../pos/format';
import { currencySymbol } from '../regional';
import { formatQty, lineAmount, num, type PoFormValues, type PoLineDraft } from './purchaseOrderUtils';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import AddShoppingCartOutlinedIcon from '@mui/icons-material/AddShoppingCartOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';

interface Props {
  open: boolean;
  /** Set when editing an existing draft; absent when creating (including a duplicate). */
  poId?: number | null;
  poNumber?: string | null;
  initial: PoFormValues;
  stores: Store[];
  onClose: () => void;
  onSaved: (po: PurchaseOrder) => void;
}

function SectionTitle({ icon, title, hint }: { icon: ReactNode; title: string; hint?: string }) {
  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 1.75 }}>
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: '10px',
          display: 'grid',
          placeItems: 'center',
          bgcolor: 'color-mix(in srgb, var(--mui-palette-primary-main) 12%, transparent)',
          color: 'primary.main',
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography sx={{ fontWeight: 700, fontSize: 15, lineHeight: 1.3 }}>{title}</Typography>
        {hint && (
          <Typography variant="caption" color="text.secondary">
            {hint}
          </Typography>
        )}
      </Box>
    </Stack>
  );
}

export function PurchaseOrderForm({ open, poId, poNumber, initial, stores, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const symbol = currencySymbol(user?.currency);
  const [values, setValues] = useState<PoFormValues>(initial);
  const [supplier, setSupplier] = useState<SupplierOption | null>(null);
  const [saving, setSaving] = useState(false);
  const [triedSubmit, setTriedSubmit] = useState(false);
  const { fieldErrors, formError, clearErrors, clearField, reportError } = useFormErrors();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductWithStorePrice[]>([]);
  const [searching, setSearching] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setValues(initial);
      setSupplier(initial.supplier_id ? { id: Number(initial.supplier_id), name: initial.supplier_name || 'Selected supplier' } : null);
      setQuery('');
      setResults([]);
      setTriedSubmit(false);
      clearErrors();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  // A company with one branch always delivers there — filled in even when
  // the form opened before the branch list had loaded.
  useEffect(() => {
    if (open && stores.length === 1 && !values.store_id) {
      setValues((v) => ({ ...v, store_id: String(stores[0].id) }));
    }
  }, [open, stores, values.store_id]);

  // Searched with the delivery store when one is picked, so each result
  // shows that branch's current stock and last cost — the two numbers a
  // buyer actually decides a reorder quantity from.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(() => {
      const storePart = values.store_id ? `&store_id=${values.store_id}` : '';
      api
        .get<ProductWithStorePrice[]>(`/products?is_active=1&per_page=8${storePart}&q=${encodeURIComponent(q)}`)
        .then((rows) => {
          setResults(rows);
          setHighlight(0);
        })
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, values.store_id]);


  const amounts = values.lines.map((l) => lineAmount(num(l.quantity), num(l.unit_cost)));
  const total = amounts.reduce((s, a) => s + a, 0);
  const units = values.lines.reduce((s, l) => s + num(l.quantity), 0);

  const lineInvalid = (l: PoLineDraft) => !(num(l.quantity) > 0) || num(l.unit_cost) < 0 || l.unit_cost.trim() === '';
  const missingSupplier = !values.supplier_id;
  const missingStore = !values.store_id;
  const hasInvalidLine = values.lines.some(lineInvalid);
  const canSave = !missingSupplier && !missingStore && values.lines.length > 0 && !hasInvalidLine;

  function set<K extends keyof PoFormValues>(key: K, value: PoFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function updateLine(index: number, patch: Partial<PoLineDraft>) {
    setValues((prev) => ({ ...prev, lines: prev.lines.map((l, i) => (i === index ? { ...l, ...patch } : l)) }));
  }

  function addProduct(p: ProductWithStorePrice) {
    setValues((prev) => {
      const existing = prev.lines.findIndex((l) => l.product_id === p.id);
      if (existing >= 0) {
        // Picking a product that's already on the order adds one more
        // rather than creating a duplicate line the server would reject.
        return {
          ...prev,
          lines: prev.lines.map((l, i) => (i === existing ? { ...l, quantity: formatQty(num(l.quantity) + 1) } : l)),
        };
      }
      return {
        ...prev,
        lines: [
          ...prev.lines,
          {
            product_id: p.id,
            name: p.name,
            sku: p.sku,
            quantity: '1',
            unit_cost: p.cost_price !== null && p.cost_price !== undefined ? formatQty(p.cost_price) : '',
          },
        ],
      };
    });
    setQuery('');
    setResults([]);
    searchInputRef.current?.focus();
  }

  function onSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      addProduct(results[highlight] ?? results[0]);
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      setQuery('');
    }
  }

  async function submit() {
    setTriedSubmit(true);
    if (!canSave) return;
    setSaving(true);
    clearErrors();
    const body = {
      store_id: Number(values.store_id),
      supplier_id: Number(values.supplier_id),
      order_date: values.order_date || null,
      expected_date: values.expected_date || null,
      notes: values.notes.trim() || null,
      items: values.lines.map((l) => ({
        product_id: l.product_id,
        quantity: num(l.quantity),
        unit_cost: num(l.unit_cost),
      })),
    };
    try {
      const saved = poId ? await api.put<PurchaseOrder>(`/purchases/${poId}`, body) : await api.post<PurchaseOrder>('/purchases', body);
      onSaved(saved);
    } catch (err) {
      reportError(err, poId ? 'Could not save your changes' : 'Could not create the purchase order');
    } finally {
      setSaving(false);
    }
  }

  const stockLabel = (p: ProductWithStorePrice) => {
    if (!values.store_id) return null;
    if (p.stock_quantity === null) return { label: 'Not stocked here', color: 'default' as const };
    const qty = num(p.stock_quantity);
    if (qty <= 0) return { label: 'Out of stock', color: 'error' as const };
    return { label: `${formatQty(qty)} in stock`, color: 'success' as const };
  };

  return (
    <Modal
      open={open}
      title={poId ? `Edit ${poNumber ?? 'purchase order'}` : 'New purchase order'}
      onClose={onClose}
      maxWidth="lg"
    >
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Stack spacing={3}>
          {/* ── Supplier & delivery ─────────────────────────────── */}
          <Paper variant="outlined" sx={{ p: 2.25, borderRadius: '14px' }}>
            <SectionTitle
              icon={<LocalShippingOutlinedIcon sx={{ fontSize: 18 }} />}
              title="Supplier & delivery"
              hint="Who you're ordering from, and which branch receives the goods"
            />
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <SupplierPicker
                  required
                  allowCreate
                  value={supplier}
                  onChange={(s) => {
                    setSupplier(s);
                    setValues((prev) => ({ ...prev, supplier_id: s ? String(s.id) : '', supplier_name: s?.name ?? '' }));
                    clearField('supplier_id');
                  }}
                  error={!!fieldErrors?.supplier_id || (triedSubmit && missingSupplier)}
                  helperText={
                    fieldErrors?.supplier_id ??
                    (triedSubmit && missingSupplier
                      ? 'Pick a supplier'
                      : supplier
                        ? [supplier.contact_name, supplier.phone, supplier.email].filter(Boolean).join(' · ') || undefined
                        : 'Recent suppliers show first. Type to search all of them.')
                  }
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <SearchableSelect
                  label="Deliver to"
                  fullWidth
                  required
                  disabled={stores.length === 1 && values.store_id === String(stores[0].id)}
                  value={values.store_id}
                  onChange={(v) => {
                    set('store_id', v);
                    clearField('store_id');
                  }}
                  error={!!fieldErrors?.store_id || (triedSubmit && missingStore)}
                  helperText={
                    fieldErrors?.store_id ??
                    (triedSubmit && missingStore ? 'Pick the branch receiving this order' : 'Stock is added to this branch when the order is received')
                  }
                  options={stores.map((s) => ({ value: String(s.id), label: s.name }))}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField
                  id="po-order-date"
                  label="Order date"
                  type="date"
                  fullWidth
                  value={values.order_date}
                  onChange={(e) => set('order_date', e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField
                  id="po-expected-date"
                  label="Expected delivery"
                  type="date"
                  fullWidth
                  value={values.expected_date}
                  onChange={(e) => set('expected_date', e.target.value)}
                  slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: values.order_date || undefined } }}
                  helperText="Optional. Late orders get flagged."
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  id="po-notes"
                  label="Notes for the supplier"
                  fullWidth
                  multiline
                  minRows={1}
                  maxRows={4}
                  value={values.notes}
                  onChange={(e) => set('notes', e.target.value.slice(0, 255))}
                  helperText={`${values.notes.length}/255 · printed on the PO`}
                />
              </Grid>
            </Grid>
          </Paper>

          {/* ── Items ───────────────────────────────────────────── */}
          <Paper variant="outlined" sx={{ p: 2.25, borderRadius: '14px' }}>
            <SectionTitle
              icon={<AddShoppingCartOutlinedIcon sx={{ fontSize: 18 }} />}
              title={values.lines.length > 0 ? `Items (${values.lines.length})` : 'Items'}
              hint="Search by name, SKU or barcode. Enter adds the highlighted product."
            />

            <Box sx={{ position: 'relative' }}>
              <TextField
                id="po-product-search"
                fullWidth
                inputRef={searchInputRef}
                placeholder={values.store_id ? 'Search products to add…' : 'Search products to add… (pick a branch to see its stock and cost)'}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onSearchKeyDown}
                autoComplete="off"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                    endAdornment: searching ? (
                      <InputAdornment position="end">
                        <CircularProgress size={16} />
                      </InputAdornment>
                    ) : undefined,
                  },
                }}
              />
              {query.trim() && !searching && (
                <Paper
                  elevation={8}
                  sx={{ position: 'absolute', zIndex: 10, left: 0, right: 0, mt: 0.75, borderRadius: '12px', overflow: 'hidden', maxHeight: 340, overflowY: 'auto' }}
                >
                  {results.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                      No active products match "{query.trim()}".
                    </Typography>
                  ) : (
                    results.map((p, i) => {
                      const stock = stockLabel(p);
                      const onOrder = values.lines.find((l) => l.product_id === p.id);
                      return (
                        <Box
                          key={p.id}
                          role="option"
                          aria-selected={i === highlight}
                          onMouseEnter={() => setHighlight(i)}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            addProduct(p);
                          }}
                          sx={{
                            px: 2,
                            py: 1.25,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            bgcolor: i === highlight ? 'action.hover' : 'transparent',
                            borderBottom: i < results.length - 1 ? '1px solid' : 'none',
                            borderColor: 'divider',
                          }}
                        >
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                              {p.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {p.sku}
                              {p.cost_price !== null && p.cost_price !== undefined && values.store_id
                                ? ` · last cost ${symbol}${formatMoney(num(p.cost_price))}`
                                : ''}
                            </Typography>
                          </Box>
                          {onOrder && <Chip size="small" label={`On order: ${formatQty(onOrder.quantity)}`} variant="outlined" />}
                          {stock && <Chip size="small" label={stock.label} color={stock.color} variant="outlined" />}
                        </Box>
                      );
                    })
                  )}
                </Paper>
              )}
            </Box>

            {values.lines.length === 0 ? (
              <Stack
                spacing={1}
                sx={{
                  mt: 2,
                  py: 4,
                  alignItems: 'center',
                  textAlign: 'center',
                  border: '1.5px dashed',
                  borderColor: triedSubmit ? 'error.main' : 'divider',
                  borderRadius: '12px',
                  color: 'text.secondary',
                }}
              >
                <AddShoppingCartOutlinedIcon sx={{ fontSize: 34, opacity: 0.5 }} />
                <Typography variant="body2" sx={{ fontWeight: 600, color: triedSubmit ? 'error.main' : 'text.primary' }}>
                  No items on this order yet
                </Typography>
                <Typography variant="caption">Search above and pick a product to add it.</Typography>
              </Stack>
            ) : (
              <TableContainer sx={{ mt: 2 }}>
                <Table size="small" sx={{ minWidth: 600 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: 36 }}>#</TableCell>
                      <TableCell>Product</TableCell>
                      <TableCell sx={{ width: 120 }}>Qty</TableCell>
                      <TableCell sx={{ width: 170 }}>Unit cost</TableCell>
                      <TableCell align="right" sx={{ width: 140 }}>
                        Amount
                      </TableCell>
                      <TableCell sx={{ width: 44 }} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {values.lines.map((line, i) => {
                      const qtyBad = triedSubmit && !(num(line.quantity) > 0);
                      const costBad = triedSubmit && (line.unit_cost.trim() === '' || num(line.unit_cost) < 0);
                      return (
                        <TableRow key={line.product_id} hover>
                          <TableCell sx={{ color: 'text.secondary' }}>{i + 1}</TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {line.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {line.sku}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              type="number"
                              value={line.quantity}
                              error={qtyBad}
                              onChange={(e) => updateLine(i, { quantity: e.target.value })}
                              slotProps={{ htmlInput: { min: 0, step: 'any', 'aria-label': `Quantity for ${line.name}` } }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              type="number"
                              value={line.unit_cost}
                              error={costBad}
                              placeholder="0.00"
                              onChange={(e) => updateLine(i, { unit_cost: e.target.value })}
                              slotProps={{
                                htmlInput: { min: 0, step: 'any', 'aria-label': `Unit cost for ${line.name}` },
                                input: { startAdornment: <InputAdornment position="start">{symbol}</InputAdornment> },
                              }}
                            />
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                            {symbol}
                            {formatMoney(amounts[i])}
                          </TableCell>
                          <TableCell>
                            <Tooltip title="Remove">
                              <IconButton
                                size="small"
                                aria-label={`Remove ${line.name}`}
                                onClick={() => setValues((prev) => ({ ...prev, lines: prev.lines.filter((_, idx) => idx !== i) }))}
                              >
                                <DeleteOutlineOutlinedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {values.lines.length > 0 && (
              <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ mt: 2, justifyContent: 'space-between', alignItems: { sm: 'flex-end' }, gap: 2 }}>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
                  <Chip size="small" icon={<PersonOutlineOutlinedIcon />} label={supplier?.name ?? 'No supplier yet'} variant="outlined" />
                  <Chip size="small" label={`${values.lines.length} line${values.lines.length === 1 ? '' : 's'}`} variant="outlined" />
                </Stack>
                <Box sx={{ minWidth: 260, p: 1.75, borderRadius: '12px', bgcolor: 'action.hover' }}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', pb: 1, mb: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2" color="text.secondary">
                      Total quantity
                    </Typography>
                    <Typography sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{formatQty(units)}</Typography>
                  </Stack>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <Typography sx={{ fontWeight: 800 }}>Total</Typography>
                    <Typography sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                      {symbol}
                      {formatMoney(total)}
                    </Typography>
                  </Stack>
                </Box>
              </Stack>
            )}
          </Paper>

          {triedSubmit && hasInvalidLine && <Alert severity="warning">Every item needs a quantity above zero and a unit cost (0 is allowed for free goods).</Alert>}
          {formError && <Alert severity="error">{formError}</Alert>}

          <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'flex-end' }}>
            <Button type="button" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={saving} sx={{ minWidth: 150 }}>
              {saving ? 'Saving…' : poId ? 'Save changes' : 'Save as draft'}
            </Button>
          </Stack>
        </Stack>
      </form>
    </Modal>
  );
}
