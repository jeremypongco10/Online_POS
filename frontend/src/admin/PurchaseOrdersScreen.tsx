import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../api/client';
import type { PurchaseOrder, PurchaseOrderDetail, PurchaseOrderSummary, Store } from '../api/types';
import { SupplierPicker, type SupplierOption } from './SupplierPicker';
import { useAuth } from '../auth/AuthContext';
import { useSnackbar } from '../Snackbar';
import { useList } from './useList';
import { DataTable, type Column } from './DataTable';
import { ListToolbar } from './ListToolbar';
import { InlineSelectFilter } from './InlineSelectFilter';
import { formatMoney } from '../pos/format';
import { currencySymbol, formatDate } from '../regional';
import { PurchaseOrderForm } from './PurchaseOrderForm';
import { PurchaseOrderDetailModal } from './PurchaseOrderDetailModal';
import { printPurchaseOrder } from './printPurchaseOrder';
import { emptyPoForm, formatQty, isOverdue, num, PO_STATUS_META, PO_STATUSES, todayIso, type PoFormValues, type PoStatus } from './purchaseOrderUtils';
import { PoStatusChip } from './PoStatusChip';
import { useBarcodeScanner } from './useBarcodeScanner';
import QrCodeScannerOutlinedIcon from '@mui/icons-material/QrCodeScannerOutlined';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ButtonBase from '@mui/material/ButtonBase';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';

const tint = (pct: number, css: string) => `color-mix(in srgb, ${css} ${pct}%, transparent)`;

/** Accent per status: an sx color key, and the same color as a CSS variable for tints. Cancelled stays neutral grey. */
const PALETTE: Record<PoStatus, { sx: string; css: string }> = {
  draft: { sx: 'warning.main', css: 'var(--mui-palette-warning-main)' },
  approved: { sx: 'info.main', css: 'var(--mui-palette-info-main)' },
  received: { sx: 'success.main', css: 'var(--mui-palette-success-main)' },
  cancelled: { sx: 'text.secondary', css: 'var(--mui-palette-text-secondary)' },
};

function toFormValues(po: PurchaseOrderDetail, asCopy: boolean): PoFormValues {
  return {
    store_id: String(po.store_id),
    supplier_id: String(po.supplier_id),
    supplier_name: po.supplier?.name ?? po.supplier_name ?? '',
    // A duplicate is a new order placed today, not a backdated copy.
    order_date: asCopy ? todayIso() : (po.order_date?.slice(0, 10) ?? todayIso()),
    expected_date: asCopy ? '' : (po.expected_date?.slice(0, 10) ?? ''),
    notes: po.notes ?? '',
    lines: po.items.map((item) => ({
      product_id: item.product_id,
      name: item.product_name ?? `Product #${item.product_id}`,
      sku: item.product_sku ?? '',
      quantity: formatQty(item.quantity),
      unit_cost: formatQty(item.unit_cost),
    })),
  };
}

/** Arriving from a supplier's page: show their orders, or start one for them. */
export interface PoIntent {
  supplier: SupplierOption;
  action: 'view' | 'new';
}

export function PurchaseOrdersScreen({ intent = null, onIntentHandled }: { intent?: PoIntent | null; onIntentHandled?: () => void }) {
  const { user, hasPermission } = useAuth();
  const notify = useSnackbar();
  const currency = user?.currency;
  const symbol = currencySymbol(currency);

  const [statusFilter, setStatusFilter] = useState<PoStatus | ''>('');
  const [storeFilter, setStoreFilter] = useState('');
  const [supplierFilterOption, setSupplierFilterOption] = useState<SupplierOption | null>(intent?.action === 'view' ? intent.supplier : null);
  const supplierFilter = supplierFilterOption ? String(supplierFilterOption.id) : '';
  const { data, meta, loading, error, page, setPage, perPage, setPerPage, sort, setSort, q, setQ, reload } = useList<PurchaseOrder>('/purchases', {
    status: statusFilter,
    store_id: storeFilter,
    supplier_id: supplierFilter,
  });

  const [summary, setSummary] = useState<PurchaseOrderSummary | null>(null);
  const [stores, setStores] = useState<Store[]>([]);

  const [detailId, setDetailId] = useState<number | null>(null);
  const [form, setForm] = useState<{ open: boolean; poId: number | null; poNumber: string | null; initial: PoFormValues }>({
    open: false,
    poId: null,
    poNumber: null,
    initial: emptyPoForm(),
  });

  const loadSummary = useCallback(() => {
    api
      .get<PurchaseOrderSummary>('/purchases/summary')
      .then(setSummary)
      .catch(() => setSummary(null));
  }, []);

  useEffect(() => {
    loadSummary();
    api.get<Store[]>('/stores?per_page=100').then(setStores).catch(() => setStores([]));
  }, [loadSummary]);

  function refreshAll() {
    reload();
    loadSummary();
  }

  /**
   * Exact PO-number lookup, for a scanned barcode or a full number typed
   * and confirmed with Enter. A hit opens the order straight away. A miss
   * falls back to the ordinary search, so a partial number still filters.
   */
  async function openByNumber(code: string) {
    const term = code.trim();
    if (!term) return;
    try {
      const matches = await api.get<PurchaseOrder[]>(`/purchases?po_number=${encodeURIComponent(term)}&per_page=1`);
      if (matches.length > 0) {
        setQ('');
        setDetailId(matches[0].id);
      } else {
        setQ(term);
        notify(`No purchase order numbered ${term}`, 'warning');
      }
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Could not look up that purchase order', 'error');
    }
  }

  // Off while a dialog is open: a scan inside the PO form is a product barcode, not a PO to open.
  useBarcodeScanner(openByNumber, detailId === null && !form.open);

  // A New purchase order started from a supplier opens the form with them picked.
  useEffect(() => {
    if (!intent) return;
    if (intent.action === 'new') {
      const initial = emptyPoForm();
      initial.supplier_id = String(intent.supplier.id);
      initial.supplier_name = intent.supplier.name;
      setForm({ open: true, poId: null, poNumber: null, initial });
    }
    onIntentHandled?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    // A company with a single branch shouldn't have to pick it every time.
    const initial = emptyPoForm();
    if (stores.length === 1) initial.store_id = String(stores[0].id);
    setForm({ open: true, poId: null, poNumber: null, initial });
  }

  async function withDetail(id: number, then: (po: PurchaseOrderDetail) => void) {
    try {
      then(await api.get<PurchaseOrderDetail>(`/purchases/${id}`));
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Could not load that purchase order', 'error');
    }
  }

  function openEdit(po: PurchaseOrderDetail) {
    setDetailId(null);
    setForm({ open: true, poId: po.id, poNumber: po.po_number, initial: toFormValues(po, false) });
  }

  function openDuplicate(po: PurchaseOrderDetail) {
    setDetailId(null);
    setForm({ open: true, poId: null, poNumber: null, initial: toFormValues(po, true) });
  }

  const columns: Column<PurchaseOrder>[] = [
    {
      key: 'po_number',
      label: 'PO number',
      sortKey: 'po_number',
      render: (po) => (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {po.po_number}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Ordered {formatDate(po.order_date ?? po.created_at, currency)}
          </Typography>
        </Box>
      ),
    },
    {
      key: 'supplier',
      label: 'Supplier',
      render: (po) => (
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
            {po.supplier_name ?? `#${po.supplier_id}`}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {po.item_count ?? 0} item{po.item_count === 1 ? '' : 's'}
          </Typography>
        </Box>
      ),
    },
    { key: 'store', label: 'Deliver to', render: (po) => po.store_name ?? `#${po.store_id}` },
    {
      key: 'total_quantity',
      label: 'Total qty',
      align: 'right',
      width: 110,
      render: (po) => (
        <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
          {formatQty(po.total_quantity ?? 0)}
        </Typography>
      ),
    },
    {
      key: 'expected_date',
      label: 'Expected',
      sortKey: 'expected_date',
      render: (po) =>
        po.expected_date ? (
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            <span>{formatDate(po.expected_date, currency)}</span>
            {isOverdue(po) && <Chip size="small" color="error" label="Late" sx={{ height: 20, fontSize: 11, fontWeight: 700 }} />}
          </Stack>
        ) : (
          <Typography variant="body2" color="text.disabled">
            —
          </Typography>
        ),
    },
    {
      key: 'total',
      label: 'Total',
      align: 'right',
      sortKey: 'total',
      render: (po) => (
        <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
          {symbol}
          {formatMoney(num(po.total))}
        </Typography>
      ),
    },
    { key: 'status', label: 'Status', render: (po) => <PoStatusChip status={po.status} /> },
  ];

  const filtersActive = !!(statusFilter || storeFilter || supplierFilter || q);

  return (
    <div>
      {/* ── Heading ─────────────────────────────────────────────── */}
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: 1.5, mb: 2 }}>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: 18 }}>Purchase orders</Typography>
          <Typography variant="body2" color="text.secondary">
            Order stock from suppliers, approve it, and receive it into inventory when it arrives.
          </Typography>
        </Box>
        {hasPermission('purchases.create') && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            New purchase order
          </Button>
        )}
      </Stack>

      {/* ── Status cards (also the status filter) ─────────────── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 1.5, mb: 2.5 }}>
        {PO_STATUSES.map((status) => {
          const meta = PO_STATUS_META[status];
          const palette = PALETTE[status];
          const selected = statusFilter === status;
          const count = summary?.[status].count ?? 0;
          return (
            <ButtonBase
              key={status}
              onClick={() => setStatusFilter(selected ? '' : status)}
              aria-pressed={selected}
              sx={{
                display: 'block',
                textAlign: 'left',
                p: 1.75,
                borderRadius: '14px',
                border: '1.5px solid',
                borderColor: selected ? palette.sx : 'divider',
                bgcolor: selected ? tint(8, palette.css) : 'background.paper',
                transition: 'border-color .15s ease, background-color .15s ease, transform .15s ease',
                '&:hover': { borderColor: tint(55, palette.css), transform: 'translateY(-1px)' },
                '&.Mui-focusVisible': { borderColor: palette.sx },
              }}
            >
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {meta.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {meta.hint}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 34,
                    height: 34,
                    borderRadius: '10px',
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: tint(14, palette.css),
                    color: palette.sx,
                  }}
                >
                  {meta.icon(19)}
                </Box>
              </Stack>
              <Typography sx={{ mt: 1, fontWeight: 800, fontSize: 26, lineHeight: 1.1 }}>{summary ? count : '–'}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {summary ? `${symbol}${formatMoney(num(summary[status].value))} total` : ' '}
              </Typography>
            </ButtonBase>
          );
        })}
      </Box>

      {/* Enter in the search box looks up an exact PO number, the same as a scan. */}
      <Box
        onKeyDownCapture={(e) => {
          const target = e.target as HTMLElement;
          // Skips the Supplier/Branch filters (Autocomplete inputs), where Enter picks an option.
          if (e.key === 'Enter' && target instanceof HTMLInputElement && !target.closest('.MuiAutocomplete-root') && target.value.trim()) {
            e.preventDefault();
            openByNumber(target.value);
          }
        }}
      >
      <ListToolbar
        search={q}
        onSearchChange={setQ}
        onRefresh={refreshAll}
        refreshing={loading}
        extra={
          <Stack direction="row" spacing={1.5} sx={{ width: { xs: '100%', sm: 'auto' }, flexWrap: 'wrap' }} useFlexGap>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flex: { xs: 1, sm: 'initial' }, minWidth: 0 }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, display: { xs: 'none', sm: 'block' } }}>
                Supplier
              </Typography>
              <Box sx={{ width: { xs: '100%', sm: 240 }, '& .MuiInputBase-root': { height: 44, fontSize: 14 } }}>
                <SupplierPicker label="" placeholder="All suppliers" value={supplierFilterOption} onChange={setSupplierFilterOption} />
              </Box>
            </Stack>
            {stores.length > 1 && (
              <InlineSelectFilter
                label="Branch"
                compactOnMobile
                value={storeFilter}
                onChange={setStoreFilter}
                options={[{ value: '', label: 'All branches' }, ...stores.map((s) => ({ value: String(s.id), label: s.name }))]}
              />
            )}
          </Stack>
        }
      />
      </Box>

      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mb: 1.5, color: 'text.secondary' }}>
        <QrCodeScannerOutlinedIcon sx={{ fontSize: 17 }} />
        <Typography variant="caption">
          Scan a PO barcode at any time to open that order, or type a full PO number and press Enter.
        </Typography>
      </Stack>

      {filtersActive && (
        <Stack direction="row" spacing={1} sx={{ mb: 1.5, alignItems: 'center', flexWrap: 'wrap' }} useFlexGap>
          <Typography variant="caption" color="text.secondary">
            Filtered:
          </Typography>
          {statusFilter && <Chip size="small" label={PO_STATUS_META[statusFilter].label} onDelete={() => setStatusFilter('')} />}
          {supplierFilter && (
            <Chip size="small" label={supplierFilterOption?.name ?? 'Supplier'} onDelete={() => setSupplierFilterOption(null)} />
          )}
          {storeFilter && <Chip size="small" label={stores.find((s) => String(s.id) === storeFilter)?.name ?? 'Branch'} onDelete={() => setStoreFilter('')} />}
          {q && <Chip size="small" label={`"${q}"`} onDelete={() => setQ('')} />}
        </Stack>
      )}

      <DataTable
        columns={columns}
        rows={data}
        rowKey={(po) => po.id}
        loading={loading}
        error={error}
        meta={meta}
        page={page}
        onPageChange={setPage}
        perPage={perPage}
        onPerPageChange={setPerPage}
        sort={sort}
        onSortChange={setSort}
        emptyLabel={
          filtersActive
            ? 'No purchase orders match these filters.'
            : 'No purchase orders yet. Click "New purchase order" to order stock from a supplier.'
        }
        rowActions={(po) => (
          <>
            <Tooltip title="Open">
              <IconButton size="small" aria-label={`Open ${po.po_number}`} onClick={() => setDetailId(po.id)}>
                <VisibilityOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {po.status === 'draft' && hasPermission('purchases.manage') && (
              <Tooltip title="Edit draft">
                <IconButton size="small" aria-label={`Edit ${po.po_number}`} onClick={() => withDetail(po.id, openEdit)}>
                  <EditOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Print / Save PDF">
              <IconButton size="small" aria-label={`Print ${po.po_number}`} onClick={() => withDetail(po.id, (d) => printPurchaseOrder(d, currency))}>
                <PrintOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        )}
      />

      <PurchaseOrderDetailModal
        poId={detailId}
        onClose={() => setDetailId(null)}
        onChanged={refreshAll}
        onEdit={openEdit}
        onDuplicate={openDuplicate}
      />

      <PurchaseOrderForm
        open={form.open}
        poId={form.poId}
        poNumber={form.poNumber}
        initial={form.initial}
        stores={stores}
        onClose={() => setForm((f) => ({ ...f, open: false }))}
        onSaved={(saved) => {
          setForm((f) => ({ ...f, open: false }));
          refreshAll();
          notify(form.poId ? `${saved.po_number} updated` : `${saved.po_number} saved as a draft`);
          setDetailId(saved.id);
        }}
      />
    </div>
  );
}
