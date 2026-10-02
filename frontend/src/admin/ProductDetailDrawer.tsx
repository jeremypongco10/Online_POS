import { useEffect, useState, type ReactNode } from 'react';
import { api, ApiError, assetUrl } from '../api/client';
import type { CatalogProduct, ProductStockByStore, StoreProductPrice } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { useConfirm } from '../ConfirmDialog';
import { useSnackbar } from '../Snackbar';
import { formatMoney } from '../pos/format';
import { currencySymbol, formatDate } from '../regional';
import { marginPercent } from './printProducts';
import { DotBadge } from './InventoryBadges';
import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import CloseIcon from '@mui/icons-material/Close';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PriceChangeOutlinedIcon from '@mui/icons-material/PriceChangeOutlined';
import SellOutlinedIcon from '@mui/icons-material/SellOutlined';
import ImageNotSupportedOutlinedIcon from '@mui/icons-material/ImageNotSupportedOutlined';
import ToggleOnOutlinedIcon from '@mui/icons-material/ToggleOnOutlined';
import ToggleOffOutlinedIcon from '@mui/icons-material/ToggleOffOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';

interface Props {
  product: CatalogProduct | null;
  storeId: string;
  onClose: () => void;
  onEdit: (p: CatalogProduct) => void;
  onPrices: (p: CatalogProduct) => void;
  onEligibility: (p: CatalogProduct) => void;
  /** Activated, deactivated or deleted — the list behind should refresh. */
  onChanged: () => void;
}

const n = (v: string | null | undefined) => {
  const x = parseFloat(v ?? '');
  return Number.isFinite(x) ? x : null;
};
const fmtQty = (v: string | number | null | undefined) => String(parseFloat((typeof v === 'number' ? v : (n(v ?? null) ?? 0)).toFixed(4)));

function Label({ children }: { children: ReactNode }) {
  return (
    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', mb: 1 }}>
      {children}
    </Typography>
  );
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-word' }}>
        {value}
      </Typography>
    </Box>
  );
}

export function ProductDetailDrawer({ product, storeId, onClose, onEdit, onPrices, onEligibility, onChanged }: Props) {
  const { user, hasPermission } = useAuth();
  const confirm = useConfirm();
  const notify = useSnackbar();
  const symbol = currencySymbol(user?.currency);
  const [prices, setPrices] = useState<StoreProductPrice[] | null>(null);
  const [stock, setStock] = useState<ProductStockByStore[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!product) return;
    setPrices(null);
    setStock(null);
    api.get<StoreProductPrice[]>(`/products/${product.id}/prices`).then(setPrices).catch(() => setPrices([]));
    if (hasPermission('inventory.view') && Number(product.track_inventory) === 1) {
      api.get<ProductStockByStore[]>(`/inventory/by-product/${product.id}`).then(setStock).catch(() => setStock([]));
    } else {
      setStock([]);
    }
  }, [product, hasPermission]);

  async function toggleActive() {
    if (!product) return;
    const activating = Number(product.is_active) !== 1;
    const message = activating
      ? `${product.name} will show up at the POS again.`
      : `${product.name} will be hidden from the POS. Its history and stock are kept, and you can turn it back on any time.`;
    if (!(await confirm(message, { title: activating ? 'Activate product?' : 'Deactivate product?', confirmLabel: activating ? 'Activate' : 'Deactivate' }))) return;
    setBusy(true);
    try {
      await api.put(`/products/${product.id}`, { is_active: activating ? 1 : 0 });
      notify(`${product.name} ${activating ? 'activated' : 'deactivated'}`);
      onChanged();
      onClose();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Could not update the product', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!product) return;
    if (!(await confirm(`Delete "${product.name}" for good? If it has ever been sold or stocked, deactivate it instead.`, { title: 'Delete product?', confirmLabel: 'Delete' }))) return;
    setBusy(true);
    try {
      await api.del(`/products/${product.id}`);
      notify(`${product.name} deleted`);
      onChanged();
      onClose();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Could not delete the product', 'error');
    } finally {
      setBusy(false);
    }
  }

  const active = product ? Number(product.is_active) === 1 : false;
  const tracked = product ? Number(product.track_inventory) === 1 : false;
  const totalStock = (stock ?? []).reduce((s, r) => s + (n(r.quantity) ?? 0), 0);

  return (
    <Drawer anchor="right" open={product !== null} onClose={onClose} slotProps={{ paper: { sx: { width: { xs: '100%', sm: 480 } } } }}>
      {product && (
        <Stack sx={{ height: '100%' }}>
          <Stack direction="row" sx={{ justifyContent: 'flex-end', p: 1 }}>
            <IconButton size="small" onClick={onClose} aria-label="Close">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>

          <Box sx={{ flex: 1, overflowY: 'auto', px: 2.5, pb: 2.5 }}>
            <Stack spacing={3}>
              {/* ── Header ──────────────────────────────────────── */}
              <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
                <Box
                  sx={{
                    width: 112,
                    height: 112,
                    flexShrink: 0,
                    borderRadius: '14px',
                    overflow: 'hidden',
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: 'action.hover',
                    color: 'text.disabled',
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  {product.image_path ? (
                    <Box component="img" src={assetUrl(product.image_path)} alt={product.name} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <ImageNotSupportedOutlinedIcon />
                  )}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: 19, lineHeight: 1.3 }}>{product.name}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                    {product.sku}
                    {product.barcode ? ` · ${product.barcode}` : ''}
                  </Typography>
                  <Stack direction="row" spacing={0.75} sx={{ mt: 1, flexWrap: 'wrap' }} useFlexGap>
                    <DotBadge css={active ? 'var(--mui-palette-success-main)' : 'var(--mui-palette-text-secondary)'} label={active ? 'Active' : 'Inactive'} />
                    {!tracked && <DotBadge css="var(--mui-palette-info-main)" label="Not stock-tracked" minWidth={0} />}
                  </Stack>
                </Box>
              </Stack>

              {product.description && (
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                  {product.description}
                </Typography>
              )}

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, p: 1.75, borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
                <Fact label="Category" value={product.category_name ?? 'Uncategorized'} />
                <Fact label="Unit" value={product.unit ?? '—'} />
                <Fact label="Tax" value={product.tax_name ? `${product.tax_name} (${fmtQty(product.tax_rate)}%)` : 'None'} />
                <Fact label="Minimum stock" value={fmtQty(product.minimum_stock)} />
                <Fact label="Added" value={formatDate(product.created_at, user?.currency)} />
                <Fact label="Last changed" value={formatDate(product.updated_at, user?.currency)} />
              </Box>

              {/* ── Prices ──────────────────────────────────────── */}
              <Box>
                <Label>Price at each branch</Label>
                {prices === null ? (
                  <CircularProgress size={20} />
                ) : prices.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No branches to show.
                  </Typography>
                ) : (
                  <Stack divider={<Divider flexItem />} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px', overflow: 'hidden' }}>
                    {prices.map((p) => {
                      const margin = marginPercent(p);
                      const here = String(p.store_id) === storeId;
                      return (
                        <Stack
                          key={p.store_id}
                          direction="row"
                          sx={{ px: 1.5, py: 1, alignItems: 'center', gap: 1.5, bgcolor: here ? 'action.selected' : 'transparent' }}
                        >
                          <Typography variant="body2" sx={{ flex: 1, minWidth: 0, fontWeight: here ? 700 : 500 }} noWrap>
                            {p.store_name}
                          </Typography>
                          {n(p.selling_price) === null ? (
                            <Typography variant="body2" color="warning.main" sx={{ fontWeight: 600 }}>
                              No price
                            </Typography>
                          ) : (
                            <Box sx={{ textAlign: 'right' }}>
                              <Typography variant="body2" sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                                {symbol}
                                {formatMoney(n(p.selling_price) as number)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                                {n(p.cost_price) === null ? 'No cost' : `Cost ${symbol}${formatMoney(n(p.cost_price) as number)}`}
                                {margin !== null ? ` · ${margin.toFixed(1)}% margin` : ''}
                              </Typography>
                            </Box>
                          )}
                        </Stack>
                      );
                    })}
                  </Stack>
                )}
              </Box>

              {/* ── Stock ───────────────────────────────────────── */}
              {tracked && hasPermission('inventory.view') && (
                <Box>
                  <Label>Stock at each branch</Label>
                  {stock === null ? (
                    <CircularProgress size={20} />
                  ) : stock.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      No stock recorded at any branch yet.
                    </Typography>
                  ) : (
                    <Stack divider={<Divider flexItem />} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px', overflow: 'hidden' }}>
                      {stock.map((s) => (
                        <Stack key={s.store_id} direction="row" sx={{ px: 1.5, py: 1, justifyContent: 'space-between', bgcolor: String(s.store_id) === storeId ? 'action.selected' : 'transparent' }}>
                          <Typography variant="body2">{s.store_name}</Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 700,
                              fontVariantNumeric: 'tabular-nums',
                              color: (n(s.quantity) ?? 0) <= 0 ? 'error.main' : (n(s.quantity) ?? 0) <= (n(s.reorder_level) ?? 0) ? 'warning.main' : 'success.main',
                            }}
                          >
                            {fmtQty(s.quantity)} {product.unit ?? ''}
                          </Typography>
                        </Stack>
                      ))}
                      {stock.length > 1 && (
                        <Stack direction="row" sx={{ px: 1.5, py: 1, justifyContent: 'space-between', bgcolor: 'action.hover' }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            All branches
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 800 }}>
                            {fmtQty(totalStock)}
                          </Typography>
                        </Stack>
                      )}
                    </Stack>
                  )}
                </Box>
              )}
            </Stack>
          </Box>

          {/* ── Actions ─────────────────────────────────────────── */}
          <Stack spacing={1} sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Stack direction="row" spacing={1}>
              {hasPermission('products.update') && (
                <Button fullWidth variant="contained" startIcon={<EditOutlinedIcon />} onClick={() => onEdit(product)}>
                  Edit
                </Button>
              )}
              <Button fullWidth variant="outlined" startIcon={<PriceChangeOutlinedIcon />} onClick={() => onPrices(product)}>
                Prices
              </Button>
              <Button fullWidth variant="outlined" startIcon={<SellOutlinedIcon />} onClick={() => onEligibility(product)}>
                Discounts
              </Button>
            </Stack>
            {(hasPermission('products.update') || hasPermission('products.delete')) && (
              <Stack direction="row" spacing={1}>
                {hasPermission('products.update') && (
                  <Button fullWidth color="inherit" disabled={busy} startIcon={active ? <ToggleOffOutlinedIcon /> : <ToggleOnOutlinedIcon />} onClick={toggleActive}>
                    {active ? 'Deactivate' : 'Activate'}
                  </Button>
                )}
                {hasPermission('products.delete') && (
                  <Button fullWidth color="error" disabled={busy} startIcon={<DeleteOutlineOutlinedIcon />} onClick={remove}>
                    Delete
                  </Button>
                )}
              </Stack>
            )}
          </Stack>
        </Stack>
      )}
    </Drawer>
  );
}
