import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client';
import type { Category, ProductWithStorePrice, Store } from '../api/types';
import { useSnackbar } from '../Snackbar';
import { useConfirm } from '../ConfirmDialog';
import { useList } from './useList';
import { DataTable, type Column } from './DataTable';
import { ListToolbar } from './ListToolbar';
import { InlineSelectFilter } from './InlineSelectFilter';
import { Modal } from './Modal';
import { ImportPricesModal } from './ImportPricesModal';
import { formatMoney } from '../pos/format';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';

interface PriceEdit {
  cost_price: string;
  selling_price: string;
}

/** Snapshotted the moment a product is first touched — its identity plus the values it had before editing, so the review step can show an accurate before→after even after paging away from where the row was originally shown. */
interface PriceOriginal {
  sku: string;
  name: string;
  cost_price: string;
  selling_price: string;
}

interface BulkPriceResult {
  index: number;
  success: boolean;
  error?: string;
}

/**
 * A spreadsheet-style grid for repricing many products at once, for one
 * store at a time (prices are always per-store — see StoreProductPrice).
 * Edits are staged locally, keyed by product id rather than tied to
 * whatever page of the list happens to be showing, so paging through a
 * large catalog to edit a handful of rows on each page still lets one
 * "Save" apply everything together.
 */
export function BulkUpdatePricesScreen() {
  const notify = useSnackbar();
  const confirm = useConfirm();
  const [stores, setStores] = useState<Store[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [storeId, setStoreId] = useState('');
  const [applyToAllStores, setApplyToAllStores] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { data, meta, loading, error, page, setPage, perPage, setPerPage, sort, setSort, q, setQ, reload } = useList<ProductWithStorePrice>(
    '/products',
    { store_id: storeId, category_id: categoryFilter, is_active: statusFilter }
  );

  const [edits, setEdits] = useState<Record<number, PriceEdit>>({});
  const [originals, setOriginals] = useState<Record<number, PriceOriginal>>({});
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState<{ updated: number; failed: number } | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    api.get<Store[]>('/stores?per_page=50&is_active=1').then(setStores);
    api.get<Category[]>('/categories?per_page=200').then(setCategories);
  }, []);

  const dirtyCount = Object.keys(edits).length;
  // Shared by the manual grid's save and the CSV import — one place
  // decides which store(s) a price change actually writes to.
  const scopeStoreIds = applyToAllStores ? stores.map((s) => s.id) : storeId ? [Number(storeId)] : [];
  const scopeLabel = applyToAllStores ? `all ${stores.length} stores` : stores.find((s) => String(s.id) === storeId)?.name ?? 'the selected store';

  async function handleStoreChange(newStoreId: string) {
    if (dirtyCount > 0) {
      if (!(await confirm('Switching stores will discard unsaved price changes. Continue?', { title: 'Discard changes?', confirmLabel: 'Switch Store' }))) {
        return;
      }
    }
    setStoreId(newStoreId);
    setEdits({});
    setOriginals({});
    setRowErrors({});
    setSummary(null);
  }

  function currentValue(p: ProductWithStorePrice, field: 'cost_price' | 'selling_price'): string {
    return edits[p.id]?.[field] ?? p[field] ?? '';
  }

  function updateField(p: ProductWithStorePrice, field: 'cost_price' | 'selling_price', value: string) {
    setOriginals((prev) =>
      p.id in prev
        ? prev
        : { ...prev, [p.id]: { sku: p.sku, name: p.name, cost_price: p.cost_price ?? '', selling_price: p.selling_price ?? '' } }
    );
    setEdits((prev) => ({
      ...prev,
      [p.id]: {
        cost_price: field === 'cost_price' ? value : prev[p.id]?.cost_price ?? p.cost_price ?? '',
        selling_price: field === 'selling_price' ? value : prev[p.id]?.selling_price ?? p.selling_price ?? '',
      },
    }));
    setRowErrors((prev) => {
      if (!(p.id in prev)) return prev;
      const next = { ...prev };
      delete next[p.id];
      return next;
    });
  }

  async function confirmSave() {
    if (!storeId || dirtyCount === 0) return;

    setSaving(true);
    setSummary(null);
    try {
      const productIds = Object.keys(edits).map(Number);
      const response = await api.put<{ results: BulkPriceResult[]; updated: number; failed: number }>('/products/prices/bulk', {
        store_ids: scopeStoreIds,
        prices: productIds.map((productId) => ({
          product_id: productId,
          cost_price: edits[productId].cost_price || '0',
          selling_price: edits[productId].selling_price || '0',
        })),
      });

      const newRowErrors: Record<number, string> = {};
      const succeededIds: number[] = [];
      response.results.forEach((r, i) => {
        const productId = productIds[i];
        if (r.success) {
          succeededIds.push(productId);
        } else {
          newRowErrors[productId] = r.error ?? 'Failed to save';
        }
      });

      setEdits((prev) => {
        const next = { ...prev };
        succeededIds.forEach((id) => delete next[id]);
        return next;
      });
      setOriginals((prev) => {
        const next = { ...prev };
        succeededIds.forEach((id) => delete next[id]);
        return next;
      });
      setRowErrors(newRowErrors);
      setSummary({ updated: response.updated, failed: response.failed });
      setReviewOpen(false);
      if (response.updated > 0) {
        notify(`${response.updated} price${response.updated === 1 ? '' : 's'} updated${applyToAllStores ? ` across ${scopeStoreIds.length} stores` : ''}`);
        reload();
      }
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to update prices', 'error');
    } finally {
      setSaving(false);
    }
  }

  const columns: Column<ProductWithStorePrice>[] = [
    { key: 'sku', label: 'SKU', sortKey: 'sku', width: 130 },
    { key: 'name', label: 'Name', sortKey: 'name' },
    {
      key: 'cost',
      label: 'Cost',
      width: 130,
      align: 'right',
      render: (p) => (
        <TextField
          type="number"
          size="small"
          slotProps={{ htmlInput: { step: '0.01', style: { textAlign: 'right' } } }}
          value={currentValue(p, 'cost_price')}
          onChange={(e) => updateField(p, 'cost_price', e.target.value)}
          error={!!rowErrors[p.id]}
          sx={{ width: 110 }}
        />
      ),
    },
    {
      key: 'price',
      label: 'Price',
      width: 130,
      align: 'right',
      render: (p) => (
        <TextField
          type="number"
          size="small"
          slotProps={{ htmlInput: { step: '0.01', style: { textAlign: 'right' } } }}
          value={currentValue(p, 'selling_price')}
          onChange={(e) => updateField(p, 'selling_price', e.target.value)}
          error={!!rowErrors[p.id]}
          sx={{ width: 110 }}
        />
      ),
    },
    {
      key: 'profit',
      label: 'Profit',
      width: 110,
      align: 'right',
      render: (p) => {
        const cost = parseFloat(currentValue(p, 'cost_price')) || 0;
        const price = parseFloat(currentValue(p, 'selling_price')) || 0;
        const profit = price - cost;
        const color = profit > 0 ? 'success.main' : profit < 0 ? 'error.main' : 'text.secondary';
        return (
          <Typography variant="body2" sx={{ fontWeight: 600, color }}>
            {formatMoney(profit)}
          </Typography>
        );
      },
    },
  ];

  return (
    <Box>
      <Stack direction="row" spacing={2.5} sx={{ alignItems: 'center', mb: 2, flexWrap: 'wrap', rowGap: 1 }}>
        <InlineSelectFilter label="Store" value={storeId} onChange={handleStoreChange} options={stores.map((s) => ({ value: String(s.id), label: s.name }))} minWidth={220} />
        {storeId && (
          <FormControlLabel
            control={<Checkbox checked={applyToAllStores} onChange={(e) => setApplyToAllStores(e.target.checked)} size="small" />}
            label="Apply new prices to all stores"
            sx={{ ml: 0 }}
          />
        )}
      </Stack>

      {applyToAllStores && storeId && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Saving will set these prices at all {stores.length} stores, not just {stores.find((s) => String(s.id) === storeId)?.name ?? 'the one shown'} — the Cost/Price
          columns below still show and edit that store's current values, only the save scope is wider.
        </Alert>
      )}

      {!storeId ? (
        <Paper variant="outlined" sx={{ p: 6, borderRadius: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">Pick a store above to bulk-update its product prices.</Typography>
        </Paper>
      ) : (
        <>
          <ListToolbar
            search={q}
            onSearchChange={setQ}
            onRefresh={reload}
            refreshing={loading}
            extra={
              <Stack direction="row" spacing={1.5} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                <InlineSelectFilter
                  label="Category"
                  compactOnMobile
                  value={categoryFilter}
                  onChange={setCategoryFilter}
                  options={[{ value: '', label: 'All Categories' }, ...categories.map((c) => ({ value: String(c.id), label: c.name }))]}
                />
                <InlineSelectFilter
                  label="Status"
                  compactOnMobile
                  value={statusFilter}
                  onChange={setStatusFilter}
                  minWidth={140}
                  options={[
                    { value: '', label: 'All' },
                    { value: '1', label: 'Active' },
                    { value: '0', label: 'Inactive' },
                  ]}
                />
              </Stack>
            }
            actions={
              <Button variant="outlined" startIcon={<UploadFileOutlinedIcon fontSize="small" />} onClick={() => setImportOpen(true)}>
                Import CSV
              </Button>
            }
          />

          {summary && (
            <Alert severity={summary.failed > 0 ? 'warning' : 'success'} sx={{ mb: 2 }}>
              {summary.updated} price{summary.updated === 1 ? '' : 's'} updated
              {summary.failed > 0 ? `, ${summary.failed} failed — see the highlighted rows.` : '.'}
            </Alert>
          )}

          <DataTable
            columns={columns}
            rows={data}
            rowKey={(p) => p.id}
            loading={loading}
            error={error}
            meta={meta}
            page={page}
            onPageChange={setPage}
            perPage={perPage}
            onPerPageChange={setPerPage}
            sort={sort}
            onSortChange={setSort}
          />

          <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'flex-end', alignItems: 'center', mt: 2 }}>
            {dirtyCount > 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mr: 'auto' }}>
                {dirtyCount} price{dirtyCount === 1 ? '' : 's'} changed
              </Typography>
            )}
            <Button variant="contained" onClick={() => setReviewOpen(true)} disabled={dirtyCount === 0}>
              {dirtyCount > 0 ? `Review & Save (${dirtyCount})` : 'Save'}
            </Button>
          </Stack>
        </>
      )}

      <Modal open={reviewOpen} title={`Review ${dirtyCount} Price Change${dirtyCount === 1 ? '' : 's'}`} onClose={() => setReviewOpen(false)} maxWidth="lg">
        <Alert severity={applyToAllStores ? 'warning' : 'info'} sx={{ mb: 2 }}>
          {applyToAllStores
            ? `These prices will be applied to all ${stores.length} stores.`
            : `These prices will be applied to ${stores.find((s) => String(s.id) === storeId)?.name ?? 'the selected store'} only.`}
        </Alert>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>SKU</TableCell>
              <TableCell>Name</TableCell>
              <TableCell align="right">Cost</TableCell>
              <TableCell align="right">Price</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.keys(edits).map((idStr) => {
              const id = Number(idStr);
              const original = originals[id];
              const edit = edits[id];
              const oldCost = original?.cost_price ?? '';
              const oldPrice = original?.selling_price ?? '';
              const newCost = edit.cost_price || '0';
              const newPrice = edit.selling_price || '0';

              return (
                <TableRow key={id}>
                  <TableCell>{original?.sku ?? id}</TableCell>
                  <TableCell>{original?.name ?? '—'}</TableCell>
                  <TableCell align="right">
                    <PriceDiff oldValue={oldCost} newValue={newCost} />
                  </TableCell>
                  <TableCell align="right">
                    <PriceDiff oldValue={oldPrice} newValue={newPrice} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'flex-end', mt: 3 }}>
          <Button type="button" variant="text" onClick={() => setReviewOpen(false)} disabled={saving}>
            Back to Editing
          </Button>
          <Button type="button" variant="contained" onClick={confirmSave} disabled={saving}>
            {saving ? <CircularProgress size={18} sx={{ color: 'inherit' }} /> : `Confirm & Save${applyToAllStores ? ' to All Stores' : ''} (${dirtyCount})`}
          </Button>
        </Stack>
      </Modal>

      <ImportPricesModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        storeIds={scopeStoreIds}
        scopeLabel={scopeLabel}
        onImported={reload}
      />
    </Box>
  );
}

function PriceDiff({ oldValue, newValue }: { oldValue: string; newValue: string }) {
  const changed = oldValue !== newValue;
  const oldNum = parseFloat(oldValue);
  const newNum = parseFloat(newValue) || 0;

  if (!changed) {
    return <Typography variant="body2">{formatMoney(newNum)}</Typography>;
  }

  return (
    <Stack direction="row" spacing={0.75} sx={{ justifyContent: 'flex-end', alignItems: 'baseline' }}>
      <Typography variant="body2" sx={{ color: 'text.disabled', textDecoration: 'line-through' }}>
        {oldValue && !Number.isNaN(oldNum) ? formatMoney(oldNum) : '—'}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
        {formatMoney(newNum)}
      </Typography>
    </Stack>
  );
}
