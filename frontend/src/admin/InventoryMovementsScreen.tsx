import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client';
import type { InventoryMovement, Store } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { useSnackbar } from '../Snackbar';
import { useList } from './useList';
import { DataTable, type Column } from './DataTable';
import { ListToolbar } from './ListToolbar';
import { InlineSelectFilter } from './InlineSelectFilter';
import { MovementTypeBadge } from './InventoryBadges';
import { printMovementsReport } from './printInventory';
import { fmtDelta, fmtQty, MOVEMENT_META, MOVEMENT_TYPES, n, type MovementType } from './inventoryUtils';
import { formatDateTime } from '../regional';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import SouthWestIcon from '@mui/icons-material/SouthWest';
import NorthEastIcon from '@mui/icons-material/NorthEast';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';

type MovementMeta = { units_in?: string; units_out?: string; company_name?: string | null };

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const RANGES: { label: string; days: number | null }[] = [
  { label: 'Today', days: 0 },
  { label: 'Last 7 days', days: 6 },
  { label: 'Last 30 days', days: 29 },
  { label: 'All time', days: null },
];

/** Read-only audit trail behind every stock change — pairs with InventoryScreen's Stock levels tab. */
export function InventoryMovementsScreen() {
  const { user } = useAuth();
  const notify = useSnackbar();
  const currency = user?.currency;

  const [stores, setStores] = useState<Store[]>([]);
  const [storeFilter, setStoreFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<MovementType | ''>('');
  const [dateFrom, setDateFrom] = useState(iso(new Date(Date.now() - 29 * 86_400_000)));
  const [dateTo, setDateTo] = useState(iso(new Date()));
  const [printing, setPrinting] = useState(false);

  const { data, meta, loading, error, page, setPage, perPage, setPerPage, sort, setSort, q, setQ, reload } = useList<InventoryMovement>('/inventory/movements', {
    store_id: storeFilter,
    type: typeFilter,
    date_from: dateFrom,
    date_to: dateTo,
  });
  const extra = (meta ?? {}) as MovementMeta;

  useEffect(() => {
    api.get<Store[]>('/stores?per_page=100').then(setStores).catch(() => setStores([]));
  }, []);

  function applyRange(days: number | null) {
    if (days === null) {
      setDateFrom('');
      setDateTo('');
      return;
    }
    setDateFrom(iso(new Date(Date.now() - days * 86_400_000)));
    setDateTo(iso(new Date()));
  }

  const activeRange = RANGES.find(
    (r) => (r.days === null && !dateFrom && !dateTo) || (r.days !== null && dateTo === iso(new Date()) && dateFrom === iso(new Date(Date.now() - r.days * 86_400_000)))
  );

  async function print() {
    setPrinting(true);
    try {
      const params = new URLSearchParams({ all: '1' });
      if (storeFilter) params.set('store_id', storeFilter);
      if (typeFilter) params.set('type', typeFilter);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      if (q.trim()) params.set('q', q.trim());
      const rows = await api.get<InventoryMovement[]>(`/inventory/movements?${params.toString()}`);
      const unitsIn = rows.reduce((s, m) => s + Math.max(n(m.quantity), 0), 0);
      const unitsOut = rows.reduce((s, m) => s + Math.max(-n(m.quantity), 0), 0);
      const branch = stores.find((s) => String(s.id) === storeFilter)?.name ?? 'All branches';
      const filters = [
        dateFrom || dateTo ? `Dates: ${dateFrom || 'start'} to ${dateTo || 'today'}` : 'All dates',
        typeFilter ? `Type: ${MOVEMENT_META[typeFilter].label}` : '',
        q.trim() ? `Search: "${q.trim()}"` : '',
      ].filter(Boolean);
      printMovementsReport(rows, { companyName: extra.company_name ?? null, branch, filters, printedBy: user?.name ?? null, currency }, { unitsIn, unitsOut });
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Could not prepare the printout', 'error');
    } finally {
      setPrinting(false);
    }
  }

  const columns: Column<InventoryMovement>[] = [
    {
      key: 'created_at',
      label: 'When',
      sortKey: 'created_at',
      width: 170,
      render: (m) => (
        <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
          {formatDateTime(m.created_at, currency)}
        </Typography>
      ),
    },
    {
      key: 'product',
      label: 'Product',
      render: (m) => (
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {m.product_name ?? `#${m.product_id}`}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {m.product_sku}
            {m.store_name ? ` · ${m.store_name}` : ''}
          </Typography>
        </Box>
      ),
    },
    { key: 'type', label: 'Type', render: (m) => <MovementTypeBadge type={m.type} /> },
    {
      key: 'quantity',
      label: 'Change',
      align: 'right',
      sortKey: 'quantity',
      width: 100,
      render: (m) => (
        <Typography sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: n(m.quantity) >= 0 ? 'success.main' : 'error.main', whiteSpace: 'nowrap' }}>
          {fmtDelta(m.quantity)}
        </Typography>
      ),
    },
    {
      key: 'balance_after',
      label: 'Balance',
      align: 'right',
      width: 90,
      render: (m) => (
        <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {fmtQty(m.balance_after)}
        </Typography>
      ),
    },
    {
      key: 'reference',
      label: 'Reference',
      render: (m) =>
        m.reference_label || m.notes ? (
          <Box sx={{ minWidth: 0 }}>
            {m.reference_label && (
              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                <ReceiptLongOutlinedIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {m.type === 'transfer_in' ? `From ${m.reference_label}` : m.type === 'transfer_out' ? `To ${m.reference_label}` : m.reference_label}
                </Typography>
              </Stack>
            )}
            {m.notes && (
              <Typography variant="caption" color="text.secondary">
                {m.notes}
              </Typography>
            )}
          </Box>
        ) : (
          <Typography variant="body2" color="text.disabled">
            —
          </Typography>
        ),
    },
    { key: 'user', label: 'By', width: 140, render: (m) => m.user_name ?? <Typography variant="body2" color="text.disabled">System</Typography> },
  ];

  return (
    <div>
      {/* ── Totals for whatever is filtered ───────────────────── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 1.5, mb: 2 }}>
        {[
          { label: 'Movements', value: meta ? String(meta.total) : '–', color: 'text.primary', icon: <ReceiptLongOutlinedIcon sx={{ fontSize: 18 }} /> },
          { label: 'Units in', value: meta ? `+${fmtQty(extra.units_in ?? 0)}` : '–', color: 'success.main', icon: <SouthWestIcon sx={{ fontSize: 18 }} /> },
          { label: 'Units out', value: meta ? `−${fmtQty(extra.units_out ?? 0)}` : '–', color: 'error.main', icon: <NorthEastIcon sx={{ fontSize: 18 }} /> },
        ].map((card) => (
          <Box key={card.label} sx={{ p: 1.75, borderRadius: '14px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', color: 'text.secondary' }}>
              {card.icon}
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {card.label}
              </Typography>
            </Stack>
            <Typography sx={{ mt: 0.5, fontWeight: 800, fontSize: 24, color: card.color, fontVariantNumeric: 'tabular-nums' }}>{card.value}</Typography>
          </Box>
        ))}
      </Box>

      <ListToolbar
        search={q}
        onSearchChange={setQ}
        onRefresh={reload}
        refreshing={loading}
        extra={
          <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }} useFlexGap>
            {stores.length > 1 && (
              <InlineSelectFilter
                label="Branch"
                compactOnMobile
                value={storeFilter}
                onChange={setStoreFilter}
                options={[{ value: '', label: 'All branches' }, ...stores.map((s) => ({ value: String(s.id), label: s.name }))]}
              />
            )}
            <InlineSelectFilter
              label="Type"
              compactOnMobile
              value={typeFilter}
              onChange={(v) => setTypeFilter(v as MovementType | '')}
              minWidth={160}
              options={[{ value: '', label: 'All types' }, ...MOVEMENT_TYPES.map((t) => ({ value: t, label: MOVEMENT_META[t].label }))]}
            />
          </Stack>
        }
        actions={
          <Button variant="outlined" startIcon={<PrintOutlinedIcon />} onClick={print} disabled={printing}>
            {printing ? 'Preparing…' : 'Print / PDF'}
          </Button>
        }
      />

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 2, alignItems: { md: 'center' } }}>
        <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap' }} useFlexGap>
          {RANGES.map((r) => (
            <Chip
              key={r.label}
              label={r.label}
              clickable
              onClick={() => applyRange(r.days)}
              color={activeRange?.label === r.label ? 'primary' : 'default'}
              variant={activeRange?.label === r.label ? 'filled' : 'outlined'}
              sx={{ fontWeight: 600 }}
            />
          ))}
        </Stack>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <TextField
            id="movements-from"
            type="date"
            size="small"
            label="From"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: dateTo || undefined } }}
          />
          <TextField
            id="movements-to"
            type="date"
            size="small"
            label="To"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: dateFrom || undefined } }}
          />
        </Stack>
      </Stack>

      <DataTable
        columns={columns}
        rows={data}
        rowKey={(m) => m.id}
        loading={loading}
        error={error}
        meta={meta}
        page={page}
        onPageChange={setPage}
        perPage={perPage}
        onPerPageChange={setPerPage}
        sort={sort}
        onSortChange={setSort}
        emptyLabel="No stock movements in this period. Try a wider date range."
      />
    </div>
  );
}
