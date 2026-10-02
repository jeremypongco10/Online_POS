import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client';
import type { InventoryMovement, InventoryStockRow, ProductStockByStore, Store } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { useSnackbar } from '../Snackbar';
import { formatDateTime } from '../regional';
import { fmtDelta, fmtQty, n, stockStatus, STOCK_STATUS_META } from './inventoryUtils';
import { MovementTypeBadge, StockStatusBadge } from './InventoryBadges';
import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import CloseIcon from '@mui/icons-material/Close';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';

interface Props {
  row: InventoryStockRow | null;
  storeId: string;
  stores: Store[];
  onClose: () => void;
  onAdjust: (row: InventoryStockRow) => void;
  onTransfer: (row: InventoryStockRow) => void;
  /** Reorder level changed — the list behind should refresh. */
  onChanged: () => void;
}

function SectionLabel({ children }: { children: string }) {
  return (
    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', mb: 1 }}>
      {children}
    </Typography>
  );
}

export function ProductStockDrawer({ row, storeId, stores, onClose, onAdjust, onTransfer, onChanged }: Props) {
  const { user, hasPermission } = useAuth();
  const notify = useSnackbar();
  const [byStore, setByStore] = useState<ProductStockByStore[] | null>(null);
  const [history, setHistory] = useState<InventoryMovement[] | null>(null);
  const [reorder, setReorder] = useState('');
  const [savingReorder, setSavingReorder] = useState(false);

  useEffect(() => {
    if (!row) return;
    setByStore(null);
    setHistory(null);
    setReorder(fmtQty(row.reorder_level));
    api.get<ProductStockByStore[]>(`/inventory/by-product/${row.product_id}`).then(setByStore).catch(() => setByStore([]));
    api
      .get<InventoryMovement[]>(`/inventory/movements?product_id=${row.product_id}&per_page=12`)
      .then(setHistory)
      .catch(() => setHistory([]));
  }, [row]);

  async function saveReorder() {
    if (!row) return;
    setSavingReorder(true);
    try {
      await api.put('/inventory/reorder-level', { product_id: row.product_id, store_id: Number(storeId), reorder_level: n(reorder) });
      notify(`Reorder level for ${row.name} set to ${fmtQty(reorder)}`);
      onChanged();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Could not save the reorder level', 'error');
    } finally {
      setSavingReorder(false);
    }
  }

  const branchName = stores.find((s) => String(s.id) === storeId)?.name ?? 'this branch';
  // Every branch, including ones that have never stocked it — a zero is information too.
  const branches = stores.map((s) => {
    const hit = byStore?.find((b) => b.store_id === s.id);
    return { id: s.id, name: s.name, quantity: n(hit?.quantity), reorder: n(hit?.reorder_level ?? row?.reorder_level) };
  });
  const totalAll = branches.reduce((sum, b) => sum + b.quantity, 0);
  const reorderChanged = row ? n(reorder) !== n(row.reorder_level) && reorder.trim() !== '' : false;

  return (
    <Drawer anchor="right" open={row !== null} onClose={onClose} slotProps={{ paper: { sx: { width: { xs: '100%', sm: 460 } } } }}>
      {row && (
        <Stack sx={{ height: '100%' }}>
          <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, p: 2.25, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 800, fontSize: 18, lineHeight: 1.3 }}>{row.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {row.sku}
                {row.barcode ? ` · ${row.barcode}` : ''}
                {row.category_name ? ` · ${row.category_name}` : ''}
              </Typography>
            </Box>
            <IconButton size="small" onClick={onClose} aria-label="Close">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>

          <Box sx={{ flex: 1, overflowY: 'auto', p: 2.25 }}>
            <Stack spacing={3}>
              {/* ── This branch ─────────────────────────────────── */}
              <Box sx={{ p: 2, borderRadius: '14px', border: '1px solid', borderColor: 'divider' }}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      On hand at {branchName}
                    </Typography>
                    <Typography
                      sx={{
                        fontWeight: 800,
                        fontSize: 34,
                        lineHeight: 1.1,
                        fontVariantNumeric: 'tabular-nums',
                        color: STOCK_STATUS_META[stockStatus(n(row.quantity), n(row.reorder_level))].sx,
                      }}
                    >
                      {fmtQty(row.quantity)}
                      <Typography component="span" sx={{ fontSize: 15, fontWeight: 600, color: 'text.secondary', ml: 0.75 }}>
                        {row.unit ?? ''}
                      </Typography>
                    </Typography>
                  </Box>
                  <StockStatusBadge status={stockStatus(n(row.quantity), n(row.reorder_level))} />
                </Stack>

                {hasPermission('inventory.adjust') && (
                  // Label and hint sit outside the row, so the input and Save
                  // button share one line and line up edge to edge.
                  <Box sx={{ mt: 2 }}>
                    <Typography component="label" htmlFor="drawer-reorder-level" variant="body2" sx={{ display: 'block', fontWeight: 600, mb: 0.75 }}>
                      Reorder level
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'stretch' }}>
                      <TextField
                        id="drawer-reorder-level"
                        size="small"
                        type="number"
                        value={reorder}
                        onChange={(e) => setReorder(e.target.value)}
                        slotProps={{ htmlInput: { min: 0, step: 'any', 'aria-describedby': 'drawer-reorder-hint' } }}
                        sx={{ flex: 1 }}
                      />
                      <Button variant="outlined" onClick={saveReorder} disabled={!reorderChanged || savingReorder} sx={{ minWidth: 88 }}>
                        {savingReorder ? 'Saving…' : 'Save'}
                      </Button>
                    </Stack>
                    <Typography id="drawer-reorder-hint" variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                      Shows as low stock at or below this number.
                    </Typography>
                  </Box>
                )}

                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                  {hasPermission('inventory.adjust') && (
                    <Button fullWidth variant="contained" startIcon={<TuneOutlinedIcon />} onClick={() => onAdjust(row)}>
                      Adjust
                    </Button>
                  )}
                  {hasPermission('inventory.transfer') && stores.length > 1 && (
                    <Button fullWidth variant="outlined" startIcon={<SwapHorizIcon />} onClick={() => onTransfer(row)}>
                      Transfer
                    </Button>
                  )}
                </Stack>
              </Box>

              {/* ── Every branch ────────────────────────────────── */}
              {stores.length > 1 && (
                <Box>
                  <SectionLabel>Stock at every branch</SectionLabel>
                  {byStore === null ? (
                    <CircularProgress size={20} />
                  ) : (
                    <Stack divider={<Divider flexItem />} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px', overflow: 'hidden' }}>
                      {branches.map((b) => {
                        const status = stockStatus(b.quantity, b.reorder);
                        return (
                          <Stack
                            key={b.id}
                            direction="row"
                            sx={{
                              px: 1.5,
                              py: 1,
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              bgcolor: String(b.id) === storeId ? 'action.selected' : 'transparent',
                            }}
                          >
                            <Typography variant="body2" sx={{ fontWeight: String(b.id) === storeId ? 700 : 500 }}>
                              {b.name}
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: STOCK_STATUS_META[status].sx }}>
                              {fmtQty(b.quantity)}
                            </Typography>
                          </Stack>
                        );
                      })}
                      <Stack direction="row" sx={{ px: 1.5, py: 1, justifyContent: 'space-between', bgcolor: 'action.hover' }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          All branches
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                          {fmtQty(totalAll)}
                        </Typography>
                      </Stack>
                    </Stack>
                  )}
                </Box>
              )}

              {/* ── History ─────────────────────────────────────── */}
              <Box>
                <SectionLabel>Recent movements</SectionLabel>
                {history === null ? (
                  <CircularProgress size={20} />
                ) : history.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No stock has moved for this product yet.
                  </Typography>
                ) : (
                  <Stack spacing={1}>
                    {history.map((m) => (
                      <Stack key={m.id} direction="row" spacing={1.5} sx={{ alignItems: 'flex-start', p: 1.25, borderRadius: '10px', bgcolor: 'action.hover' }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <MovementTypeBadge type={m.type} />
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                            {formatDateTime(m.created_at, user?.currency)} · {m.store_name}
                            {m.user_name ? ` · ${m.user_name}` : ''}
                          </Typography>
                          {(m.reference_label || m.notes) && (
                            <Typography variant="caption" sx={{ display: 'block' }}>
                              {[m.reference_label, m.notes].filter(Boolean).join(' · ')}
                            </Typography>
                          )}
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: n(m.quantity) >= 0 ? 'success.main' : 'error.main' }}>
                            {fmtDelta(m.quantity)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            → {fmtQty(m.balance_after)}
                          </Typography>
                        </Box>
                      </Stack>
                    ))}
                  </Stack>
                )}
              </Box>
            </Stack>
          </Box>
        </Stack>
      )}
    </Drawer>
  );
}
