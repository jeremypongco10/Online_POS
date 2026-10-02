import { useEffect, useState, type ReactNode } from 'react';
import { api, ApiError } from '../api/client';
import type { PurchaseOrderDetail } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { useConfirm } from '../ConfirmDialog';
import { useSnackbar } from '../Snackbar';
import { Modal } from './Modal';
import { formatMoney } from '../pos/format';
import { currencySymbol, formatDate, formatDateTime } from '../regional';
import { formatQty, isOverdue, num } from './purchaseOrderUtils';
import { PoStatusChip } from './PoStatusChip';
import { printPurchaseOrder } from './printPurchaseOrder';
import { PoBarcode } from './PoBarcode';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import CheckIcon from '@mui/icons-material/Check';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

interface Props {
  poId: number | null;
  onClose: () => void;
  /** Something about the order changed — the list behind this should refresh. */
  onChanged: () => void;
  onEdit: (po: PurchaseOrderDetail) => void;
  onDuplicate: (po: PurchaseOrderDetail) => void;
}

const tint = (pct: number, color = 'primary') => `color-mix(in srgb, var(--mui-palette-${color}-main) ${pct}%, transparent)`;

function InfoCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <Box sx={{ p: 1.75, borderRadius: '12px', border: '1px solid', borderColor: 'divider', minWidth: 0 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1, color: 'text.secondary' }}>
        {icon}
        <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {title}
        </Typography>
      </Stack>
      {children}
    </Box>
  );
}

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 1.5, py: 0.25 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>
        {value}
      </Typography>
    </Stack>
  );
}

export function PurchaseOrderDetailModal({ poId, onClose, onChanged, onEdit, onDuplicate }: Props) {
  const { user, hasPermission } = useAuth();
  const confirm = useConfirm();
  const notify = useSnackbar();
  const currency = user?.currency;
  const symbol = currencySymbol(currency);
  const canManage = hasPermission('purchases.manage');
  const canCreate = hasPermission('purchases.create');

  const [po, setPo] = useState<PurchaseOrderDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load(id: number) {
    setLoading(true);
    setError(null);
    try {
      setPo(await api.get<PurchaseOrderDetail>(`/purchases/${id}`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load this purchase order');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (poId !== null) {
      setPo(null);
      load(poId);
    }
  }, [poId]);

  async function run(action: 'approve' | 'receive' | 'cancel' | 'delete') {
    if (!po) return;
    const units = po.items.reduce((s, i) => s + num(i.quantity), 0);
    const store = po.store?.name ?? po.store_name ?? 'the branch';
    const prompts = {
      approve: {
        title: `Approve ${po.po_number}?`,
        message: `Approving locks the items and prices on this order. You can still cancel it later, but you can no longer edit it.`,
        label: 'Approve',
      },
      receive: {
        title: `Receive ${po.po_number}?`,
        message: `This adds ${formatQty(units)} units across ${po.items.length} item${po.items.length === 1 ? '' : 's'} to ${store}'s stock, and can't be undone. If part of the delivery is missing, receive it and then correct the difference with Adjust Stock.`,
        label: 'Receive into inventory',
      },
      cancel: {
        title: `Cancel ${po.po_number}?`,
        message: 'A cancelled order stays on record but can no longer be approved or received.',
        label: 'Cancel order',
      },
      delete: {
        title: `Delete draft ${po.po_number}?`,
        message: 'The draft and its items are removed for good.',
        label: 'Delete draft',
      },
    }[action];

    if (!(await confirm(prompts.message, { title: prompts.title, confirmLabel: prompts.label, cancelLabel: 'Go back' }))) return;

    setBusy(action);
    setError(null);
    try {
      if (action === 'delete') {
        await api.del(`/purchases/${po.id}`);
        notify(`${po.po_number} deleted`);
        onChanged();
        onClose();
        return;
      }
      await api.post(`/purchases/${po.id}/${action}`);
      notify(
        action === 'approve'
          ? `${po.po_number} approved`
          : action === 'receive'
            ? `${po.po_number} received. Stock updated at ${store}.`
            : `${po.po_number} cancelled`
      );
      onChanged();
      await load(po.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Could not ${action} this order`);
    } finally {
      setBusy(null);
    }
  }

  const steps = po
    ? [
        {
          label: 'Created',
          done: true,
          detail: `${formatDate(po.order_date ?? po.created_at, currency)}${po.created_by_name ? ` · ${po.created_by_name}` : ''}`,
        },
        {
          label: 'Approved',
          done: po.status === 'approved' || po.status === 'received',
          detail: po.approved_at ? `${formatDateTime(po.approved_at, currency)}${po.approved_by_name ? ` · ${po.approved_by_name}` : ''}` : 'Waiting for approval',
        },
        {
          label: 'Received',
          done: po.status === 'received',
          detail: po.received_date
            ? formatDate(po.received_date, currency)
            : po.expected_date
              ? `Expected ${formatDate(po.expected_date, currency)}`
              : 'Waiting for delivery',
        },
      ]
    : [];
  const currentStep = steps.findIndex((s) => !s.done);
  const overdue = po ? isOverdue(po) : false;
  const showReceived = po?.status === 'received';
  const totalQty = po ? po.items.reduce((s, i) => s + num(i.quantity), 0) : 0;
  const totalReceived = po ? po.items.reduce((s, i) => s + num(i.received_quantity), 0) : 0;

  return (
    <Modal open={poId !== null} title={po ? `Purchase order ${po.po_number}` : 'Purchase order'} onClose={onClose} maxWidth="lg">
      {!po ? (
        <Stack sx={{ alignItems: 'center', py: 8 }} spacing={2}>
          {loading ? <CircularProgress size={28} /> : <Alert severity="error">{error ?? 'Not found'}</Alert>}
        </Stack>
      ) : (
        <Stack spacing={2.5}>
          {/* ── Summary header ─────────────────────────────────── */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            sx={{
              justifyContent: 'space-between',
              alignItems: { sm: 'center' },
              gap: 2,
              p: 2.25,
              borderRadius: '14px',
              background: `linear-gradient(135deg, ${tint(12)} 0%, ${tint(3)} 100%)`,
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }} useFlexGap>
                <Typography sx={{ fontWeight: 800, fontSize: 22, letterSpacing: '-0.01em' }}>{po.po_number}</Typography>
                <PoStatusChip status={po.status} />
                {overdue && <Chip size="small" color="error" label="Overdue" sx={{ fontWeight: 700 }} />}
              </Stack>
              <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mt: 0.5, color: 'text.secondary', flexWrap: 'wrap' }} useFlexGap>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  {po.supplier?.name ?? po.supplier_name}
                </Typography>
                <ArrowForwardIcon sx={{ fontSize: 15 }} />
                <Typography variant="body2">{po.store?.name ?? po.store_name}</Typography>
              </Stack>
            </Box>
            <Stack direction="row" spacing={2.5} sx={{ alignItems: 'center', justifyContent: { xs: 'space-between', sm: 'flex-end' } }}>
              <PoBarcode value={po.po_number} height={34} />
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="caption" color="text.secondary">
                  Order total
                </Typography>
                <Typography sx={{ fontWeight: 800, fontSize: 26, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
                  {symbol}
                  {formatMoney(num(po.total))}
                </Typography>
              </Box>
            </Stack>
          </Stack>

          {/* ── Progress ───────────────────────────────────────── */}
          {po.status === 'cancelled' ? (
            <Alert severity="error" variant="outlined">
              This order was cancelled. It stays on record, but it can no longer be approved or received.
            </Alert>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
              {steps.map((step, i) => {
                const active = i === currentStep;
                return (
                  <Box key={step.label} sx={{ minWidth: 0 }}>
                    <Box sx={{ height: 4, borderRadius: 2, bgcolor: step.done ? 'success.main' : active ? tint(45) : 'divider', mb: 1 }} />
                    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                      <Box
                        sx={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          display: 'grid',
                          placeItems: 'center',
                          flexShrink: 0,
                          bgcolor: step.done ? 'success.main' : active ? 'primary.main' : 'action.disabledBackground',
                          color: '#fff',
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {step.done ? <CheckIcon sx={{ fontSize: 14 }} /> : i + 1}
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: step.done || active ? 'text.primary' : 'text.secondary' }}>
                        {step.label}
                      </Typography>
                    </Stack>
                    <Typography variant="caption" color={overdue && i === 2 ? 'error.main' : 'text.secondary'} sx={{ display: 'block', mt: 0.25, pl: 3.5 }}>
                      {step.detail}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          )}

          {/* ── Parties & dates ────────────────────────────────── */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 1.5 }}>
            <InfoCard icon={<LocalShippingOutlinedIcon sx={{ fontSize: 17 }} />} title="Supplier">
              <Typography sx={{ fontWeight: 700 }}>{po.supplier?.name ?? po.supplier_name}</Typography>
              {po.supplier?.contact_name && <Typography variant="body2">Attn: {po.supplier.contact_name}</Typography>}
              {po.supplier?.phone && (
                <Typography variant="body2" color="text.secondary">
                  {po.supplier.phone}
                </Typography>
              )}
              {po.supplier?.email && (
                <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                  {po.supplier.email}
                </Typography>
              )}
              {po.supplier?.address && (
                <Typography variant="body2" color="text.secondary">
                  {po.supplier.address}
                </Typography>
              )}
            </InfoCard>
            <InfoCard icon={<StorefrontOutlinedIcon sx={{ fontSize: 17 }} />} title="Deliver to">
              <Typography sx={{ fontWeight: 700 }}>
                {po.store?.name ?? po.store_name}
                {po.store?.code ? (
                  <Typography component="span" variant="body2" color="text.secondary">
                    {' '}
                    ({po.store.code})
                  </Typography>
                ) : null}
              </Typography>
              {po.store?.address && (
                <Typography variant="body2" color="text.secondary">
                  {po.store.address}
                </Typography>
              )}
              {po.store?.phone && (
                <Typography variant="body2" color="text.secondary">
                  {po.store.phone}
                </Typography>
              )}
            </InfoCard>
            <InfoCard icon={<EventOutlinedIcon sx={{ fontSize: 17 }} />} title="Dates">
              <Detail label="Ordered" value={formatDate(po.order_date, currency)} />
              <Detail
                label="Expected"
                value={
                  po.expected_date ? (
                    <Box component="span" sx={{ color: overdue ? 'error.main' : 'inherit' }}>
                      {formatDate(po.expected_date, currency)}
                    </Box>
                  ) : (
                    'Not set'
                  )
                }
              />
              <Detail label="Received" value={po.received_date ? formatDate(po.received_date, currency) : '—'} />
            </InfoCard>
          </Box>

          {/* ── Items ──────────────────────────────────────────── */}
          <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px' }}>
            <Table size="small" sx={{ minWidth: 640 }}>
              <TableHead>
                <TableRow sx={{ '& th': { bgcolor: 'action.hover', fontWeight: 700 } }}>
                  <TableCell sx={{ width: 36 }}>#</TableCell>
                  <TableCell>Product</TableCell>
                  <TableCell align="right">Qty</TableCell>
                  {showReceived && <TableCell align="right">Received</TableCell>}
                  <TableCell align="right">Unit cost</TableCell>
                  <TableCell align="right">Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {po.items.map((item, i) => (
                  <TableRow key={item.id} hover>
                    <TableCell sx={{ color: 'text.secondary' }}>{i + 1}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {item.product_name ?? `Product #${item.product_id}`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.product_sku}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      {formatQty(item.quantity)} {item.unit_abbreviation ?? ''}
                    </TableCell>
                    {showReceived && (
                      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', color: 'success.main', fontWeight: 600 }}>
                        {formatQty(item.received_quantity)}
                      </TableCell>
                    )}
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      {symbol}
                      {formatMoney(num(item.unit_cost))}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      {symbol}
                      {formatMoney(num(item.line_total))}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow sx={{ '& td': { bgcolor: 'action.hover', fontWeight: 700, borderBottom: 0 } }}>
                  <TableCell />
                  <TableCell>Total quantity</TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatQty(totalQty)}
                  </TableCell>
                  {showReceived && (
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', color: 'success.main' }}>
                      {formatQty(totalReceived)}
                    </TableCell>
                  )}
                  <TableCell />
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', gap: 2 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              {po.notes && (
                <>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    Notes
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}>
                    {po.notes}
                  </Typography>
                </>
              )}
            </Box>
            <Box sx={{ minWidth: 260, p: 1.75, borderRadius: '12px', bgcolor: 'action.hover' }}>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Typography sx={{ fontWeight: 800 }}>Total</Typography>
                <Typography sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                  {symbol}
                  {formatMoney(num(po.total))}
                </Typography>
              </Stack>
            </Box>
          </Stack>

          {/* ── What happens next ──────────────────────────────── */}
          {po.status === 'draft' && (
            <Alert severity="info" variant="outlined">
              Next step: check the items and prices, then approve the order. It can still be edited until then.
            </Alert>
          )}
          {po.status === 'approved' && (
            <Alert severity={overdue ? 'warning' : 'info'} variant="outlined">
              {overdue ? 'This delivery is late. ' : 'Next step: '}
              When the goods arrive, check them against this list and click Receive into inventory.
            </Alert>
          )}
          {po.status === 'received' && (
            <Alert severity="success" variant="outlined">
              Received {formatDate(po.received_date, currency)}. The stock was added to {po.store?.name ?? po.store_name}.
            </Alert>
          )}

          {error && <Alert severity="error">{error}</Alert>}

          {/* ── Actions ────────────────────────────────────────── */}
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            sx={{ justifyContent: 'space-between', gap: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}
          >
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
              <Button variant="outlined" startIcon={<PrintOutlinedIcon />} onClick={() => printPurchaseOrder(po, currency)}>
                Print / Save PDF
              </Button>
              {canCreate && (
                <Button startIcon={<ContentCopyOutlinedIcon />} onClick={() => onDuplicate(po)}>
                  Duplicate
                </Button>
              )}
              {canManage && po.status === 'draft' && (
                <Button color="error" startIcon={<DeleteOutlineOutlinedIcon />} disabled={!!busy} onClick={() => run('delete')}>
                  Delete draft
                </Button>
              )}
            </Stack>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', justifyContent: { md: 'flex-end' } }} useFlexGap>
              {canManage && (po.status === 'draft' || po.status === 'approved') && (
                <Button color="inherit" disabled={!!busy} onClick={() => run('cancel')}>
                  {busy === 'cancel' ? 'Cancelling…' : 'Cancel order'}
                </Button>
              )}
              {canManage && po.status === 'draft' && (
                <>
                  <Button variant="outlined" startIcon={<EditOutlinedIcon />} disabled={!!busy} onClick={() => onEdit(po)}>
                    Edit
                  </Button>
                  <Button variant="contained" startIcon={<VerifiedOutlinedIcon />} disabled={!!busy} onClick={() => run('approve')}>
                    {busy === 'approve' ? 'Approving…' : 'Approve'}
                  </Button>
                </>
              )}
              {canManage && po.status === 'approved' && (
                <Button variant="contained" color="success" startIcon={<Inventory2OutlinedIcon />} disabled={!!busy} onClick={() => run('receive')}>
                  {busy === 'receive' ? 'Receiving…' : 'Receive into inventory'}
                </Button>
              )}
              {!canManage && (po.status === 'draft' || po.status === 'approved') && (
                <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
                  Approving and receiving need the Manage Purchases permission.
                </Typography>
              )}
            </Stack>
          </Stack>
        </Stack>
      )}
    </Modal>
  );
}
