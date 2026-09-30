import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client';
import type { Product, Store, StoreProductPrice } from '../api/types';
import { useSnackbar } from '../Snackbar';
import { useRetained } from './useRetained';
import { Modal } from './Modal';
import { formatMoney } from '../pos/format';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Box from '@mui/material/Box';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';

interface Props {
  /** The modal is open exactly when this is non-null. */
  product: Product | null;
  canEdit: boolean;
  /**
   * Every store the caller is restricted to, or null while that's still
   * unresolved — narrows which rows a view-only (non-canEdit) viewer sees.
   * See ProductsScreen for the full rationale behind this.
   */
  myStores: Store[] | null;
  onClose: () => void;
}

/**
 * The per-product store pricing dialog — split out from ProductsScreen so
 * that typing in a Cost/Price field only re-renders this modal's own
 * subtree. Kept inline (with its editing state living in ProductsScreen),
 * every keystroke re-rendered the entire products table behind it too —
 * every row, image, and icon — which is what made typing here feel
 * laggy on a catalog with more than a handful of products.
 */
export function ProductPricesModal({ product, canEdit, myStores, onClose }: Props) {
  const notify = useSnackbar();
  const productR = useRetained(product);
  const [prices, setPrices] = useState<StoreProductPrice[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!product) return;
    setError(null);
    setLoading(true);
    api
      .get<StoreProductPrice[]>(`/products/${product.id}/prices`)
      .then(setPrices)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load prices'))
      .finally(() => setLoading(false));
  }, [product]);

  // Full price-edit access sees every company store's pricing; a
  // view-only user is narrowed to just their own store(s). While that
  // scope is still unresolved (myStores === null), fall back to showing
  // every store rather than hiding all of them. Number(...) on both
  // sides because GET /stores serializes `id` as a JSON string ("3")
  // while GET /products/{id}/prices serializes `store_id` as a number
  // (3) — a plain === would never match either way, silently hiding
  // every price for every view-only viewer.
  const visiblePrices = canEdit || myStores === null ? prices : prices.filter((r) => myStores.some((s) => Number(s.id) === Number(r.store_id)));

  function updateRow(storeId: number, field: 'cost_price' | 'selling_price', value: string) {
    setPrices((rows) => rows.map((r) => (r.store_id === storeId ? { ...r, [field]: value } : r)));
  }

  /**
   * Stars/un-stars this product for one store's POS Favorites shortcut.
   * Saved on the tap rather than waiting for Save Prices: a star has no
   * half-typed state to commit, and it's its own request (see
   * ProductsController::setFavorite). Optimistic, reverted if the server
   * says no, so the star doesn't sit lit for something that didn't save.
   */
  async function toggleFavorite(row: StoreProductPrice) {
    if (!product) return;
    const next = !row.is_favorite;
    const setStar = (value: boolean) =>
      setPrices((rows) => rows.map((r) => (r.store_id === row.store_id ? { ...r, is_favorite: value } : r)));

    setStar(next);
    try {
      await api.put(`/products/${product.id}/favorite`, { store_id: row.store_id, is_favorite: next ? 1 : 0 });
    } catch (err) {
      setStar(!next);
      notify(err instanceof ApiError ? err.message : 'Could not update favorites', 'error');
    }
  }

  /** The star for one store's row — a button when the caller can edit, a plain marker when they can only view. */
  function favoriteControl(row: StoreProductPrice) {
    const on = Boolean(row.is_favorite);
    const icon = on ? <StarIcon fontSize="small" sx={{ color: '#f59e0b' }} /> : <StarBorderIcon fontSize="small" />;
    if (!canEdit) {
      return (
        <Box role="img" aria-label={on ? 'Favorite' : 'Not a favorite'} sx={{ display: 'inline-flex', color: 'text.secondary' }}>
          {icon}
        </Box>
      );
    }
    const label = `${on ? 'Remove from' : 'Add to'} favorites at ${row.store_name}`;
    return (
      <Tooltip title={label}>
        <IconButton size="small" aria-label={label} aria-pressed={on} onClick={() => toggleFavorite(row)}>
          {icon}
        </IconButton>
      </Tooltip>
    );
  }

  async function save() {
    if (!product) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await api.put<StoreProductPrice[]>(`/products/${product.id}/prices`, {
        prices: prices.map((r) => ({
          store_id: r.store_id,
          cost_price: r.cost_price || '0',
          selling_price: r.selling_price || '0',
        })),
      });
      setPrices(updated);
      notify('Prices updated');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save prices');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={product !== null} title={productR ? `Prices: ${productR.name}` : ''} onClose={onClose} compact>
      {productR && (
        <>
          {loading ? (
            <Stack sx={{ alignItems: 'center', py: 4 }}>
              <CircularProgress size={22} />
            </Stack>
          ) : visiblePrices.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 2 }}>
              You aren't assigned to a store, so there's no price to show here.
            </Typography>
          ) : (
            <>
              <TableContainer sx={{ display: { xs: 'none', sm: 'block' } }}>
                <Table size="small" sx={{ minWidth: 460 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Store</TableCell>
                      <TableCell align="right">Cost</TableCell>
                      <TableCell align="right">Price</TableCell>
                      <TableCell align="right">Profit</TableCell>
                      <TableCell align="center">Favorite</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {visiblePrices.map((row) => (
                      <TableRow key={row.store_id}>
                        <TableCell>{row.store_name}</TableCell>
                        <TableCell align="right">
                          {canEdit ? (
                            <TextField
                              type="number"
                              size="small"
                              slotProps={{ htmlInput: { step: '0.01', style: { textAlign: 'right' } } }}
                              value={row.cost_price ?? ''}
                              onChange={(e) => updateRow(row.store_id, 'cost_price', e.target.value)}
                              sx={{ width: 110 }}
                            />
                          ) : (
                            <Typography variant="body2">{row.cost_price ? formatMoney(parseFloat(row.cost_price)) : '—'}</Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {canEdit ? (
                            <TextField
                              type="number"
                              size="small"
                              slotProps={{ htmlInput: { step: '0.01', style: { textAlign: 'right' } } }}
                              value={row.selling_price ?? ''}
                              onChange={(e) => updateRow(row.store_id, 'selling_price', e.target.value)}
                              sx={{ width: 110 }}
                            />
                          ) : (
                            <Typography variant="body2">{row.selling_price ? formatMoney(parseFloat(row.selling_price)) : '—'}</Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {(() => {
                            const cost = parseFloat(row.cost_price ?? '') || 0;
                            const price = parseFloat(row.selling_price ?? '') || 0;
                            const profit = price - cost;
                            // Margin is relative to the selling price (not cost) — the
                            // conventional definition, and undefined at price 0.
                            const margin = price > 0 ? (profit / price) * 100 : null;
                            const color = profit > 0 ? 'success.main' : profit < 0 ? 'error.main' : 'text.secondary';
                            return (
                              <Stack sx={{ alignItems: 'flex-end' }}>
                                <Typography variant="body2" sx={{ fontWeight: 600, color }}>
                                  {formatMoney(profit)}
                                </Typography>
                                {margin !== null && (
                                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                    {margin.toFixed(1)}%
                                  </Typography>
                                )}
                              </Stack>
                            );
                          })()}
                        </TableCell>
                        <TableCell align="center">{favoriteControl(row)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Stack spacing={1.25} sx={{ display: { xs: 'flex', sm: 'none' } }}>
                {visiblePrices.map((row) => {
                  const cost = parseFloat(row.cost_price ?? '') || 0;
                  const price = parseFloat(row.selling_price ?? '') || 0;
                  const profit = price - cost;
                  const margin = price > 0 ? (profit / price) * 100 : null;
                  const color = profit > 0 ? 'success.main' : profit < 0 ? 'error.main' : 'text.secondary';
                  return (
                    <Paper key={row.store_id} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mb: 1.25 }}>
                        <StorefrontOutlinedIcon sx={{ fontSize: 16, color: 'text.disabled', flexShrink: 0 }} />
                        <Typography variant="body2" sx={{ fontWeight: 700, flex: 1, minWidth: 0 }} noWrap>
                          {row.store_name}
                        </Typography>
                        {favoriteControl(row)}
                      </Stack>

                      <Stack spacing={0.75}>
                        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                          <Typography variant="caption" color="text.secondary">
                            Cost
                          </Typography>
                          {canEdit ? (
                            <TextField
                              type="number"
                              size="small"
                              variant="standard"
                              slotProps={{
                                htmlInput: { step: '0.01', style: { textAlign: 'right', fontSize: '0.8rem' } },
                              }}
                              value={row.cost_price ?? ''}
                              onChange={(e) => updateRow(row.store_id, 'cost_price', e.target.value)}
                              sx={{ width: 96 }}
                            />
                          ) : (
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>
                              {row.cost_price ? formatMoney(cost) : '—'}
                            </Typography>
                          )}
                        </Stack>
                        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                          <Typography variant="caption" color="text.secondary">
                            Price
                          </Typography>
                          {canEdit ? (
                            <TextField
                              type="number"
                              size="small"
                              variant="standard"
                              slotProps={{
                                htmlInput: { step: '0.01', style: { textAlign: 'right', fontSize: '0.8rem' } },
                              }}
                              value={row.selling_price ?? ''}
                              onChange={(e) => updateRow(row.store_id, 'selling_price', e.target.value)}
                              sx={{ width: 96 }}
                            />
                          ) : (
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>
                              {row.selling_price ? formatMoney(price) : '—'}
                            </Typography>
                          )}
                        </Stack>

                        <Divider sx={{ my: 0.5 }} />

                        <Stack direction="row" sx={{ alignItems: 'baseline', justifyContent: 'space-between' }}>
                          <Typography variant="caption" color="text.secondary">
                            Profit
                          </Typography>
                          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'baseline' }}>
                            {margin !== null && (
                              <Typography variant="caption" color="text.secondary">
                                ({margin.toFixed(1)}%)
                              </Typography>
                            )}
                            <Typography variant="caption" sx={{ fontWeight: 700, color }}>
                              {formatMoney(profit)}
                            </Typography>
                          </Stack>
                        </Stack>
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>
            </>
          )}

          {canEdit && visiblePrices.length > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
              Star a store to list this product under Favorites on that store&apos;s POS. Stars save as you tap them; prices save with Save Prices.
            </Typography>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 1.5 }}>
              {error}
            </Alert>
          )}

          <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'flex-end', mt: 2 }}>
            <Button type="button" variant="text" onClick={onClose}>
              Close
            </Button>
            {canEdit && (
              <Button type="button" variant="contained" onClick={save} disabled={saving || loading}>
                {saving ? 'Saving…' : 'Save Prices'}
              </Button>
            )}
          </Stack>
        </>
      )}
    </Modal>
  );
}
