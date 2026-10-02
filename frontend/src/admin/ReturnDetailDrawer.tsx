import { useEffect, useState } from 'react';
import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import CloseIcon from '@mui/icons-material/Close';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutlineOutlined';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import { api, ApiError } from '../api/client';
import type { ReturnItem, SalesReturn } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { formatMoney } from '../pos/format';
import { currencySymbol, formatDateTime } from '../regional';
import { printReturnSlip } from './printReturns';
import { ReturnStatusBadge } from './ReturnBadges';

interface Props {
  ret: SalesReturn | null;
  companyName: string | null;
  methodName: (code: string | null) => string;
  onClose: () => void;
  /** An older pending return was approved or rejected here. */
  onChanged: () => void;
}

function SectionLabel({ children }: { children: string }) {
  return (
    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', mb: 1 }}>
      {children}
    </Typography>
  );
}

/** Everything about one return: the refund, who did it and who approved it, and the items. */
export function ReturnDetailDrawer({ ret, companyName, methodName, onClose, onChanged }: Props) {
  const { user, hasPermission } = useAuth();
  const currency = user?.currency;
  const symbol = currencySymbol(currency);
  const [items, setItems] = useState<ReturnItem[] | null>(null);
  const [current, setCurrent] = useState<SalesReturn | null>(ret);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCurrent(ret);
    setError(null);
    if (!ret) return;
    setItems(null);
    api
      .get<ReturnItem[]>(`/returns/${ret.id}/items`)
      .then(setItems)
      .catch(() => setItems([]));
  }, [ret]);

  async function decide(action: 'approve' | 'reject') {
    if (!current) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await api.post<SalesReturn>(`/returns/${current.id}/${action}`);
      setCurrent({ ...current, ...updated });
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Could not ${action} the return`);
    } finally {
      setBusy(false);
    }
  }

  const r = current;
  const people = r
    ? [
        { icon: <PersonOutlineIcon sx={{ fontSize: 18 }} />, label: 'Processed by', value: r.cashier_name ?? '—', when: formatDateTime(r.return_date, currency) },
        {
          icon: <VerifiedUserOutlinedIcon sx={{ fontSize: 18 }} />,
          label: 'Approved by',
          value: r.approved_by_name ?? (r.status === 'pending' ? 'Waiting for approval' : '—'),
          when: r.approved_at ? formatDateTime(r.approved_at, currency) : '',
        },
      ]
    : [];

  return (
    <Drawer anchor="right" open={ret !== null} onClose={onClose} slotProps={{ paper: { sx: { width: { xs: '100%', sm: 480 } } } }}>
      {r && (
        <Stack sx={{ height: '100%' }}>
          <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, p: 2.25, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ minWidth: 0 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Typography sx={{ fontWeight: 800, fontSize: 18 }}>{r.return_number}</Typography>
                <ReturnStatusBadge status={r.status} />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {[r.store_name, r.register_name].filter(Boolean).join(' · ') || '—'}
              </Typography>
            </Box>
            <IconButton size="small" onClick={onClose} aria-label="Close">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>

          <Box sx={{ flex: 1, overflowY: 'auto', p: 2.25 }}>
            <Stack spacing={3}>
              {/* ── The refund ──────────────────────────────────── */}
              <Box sx={{ p: 2, borderRadius: '14px', border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary">
                  {r.status === 'completed' ? 'Refunded' : 'Refund'} by {methodName(r.refund_method)}
                </Typography>
                <Typography sx={{ fontWeight: 800, fontSize: 32, lineHeight: 1.15, fontVariantNumeric: 'tabular-nums' }}>
                  {symbol}
                  {formatMoney(parseFloat(r.total_refund))}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1, alignItems: 'center', color: 'text.secondary' }}>
                  <ReceiptLongOutlinedIcon sx={{ fontSize: 17 }} />
                  <Typography variant="body2">
                    From invoice <b>{r.invoice_number ?? `#${r.sale_id}`}</b>
                  </Typography>
                </Stack>
                {r.reason && (
                  <Typography variant="body2" sx={{ mt: 0.75 }}>
                    Reason: <b>{r.reason}</b>
                  </Typography>
                )}
              </Box>

              {/* ── People ──────────────────────────────────────── */}
              <Box>
                <SectionLabel>Who</SectionLabel>
                <Stack spacing={1}>
                  {people.map((p) => (
                    <Stack key={p.label} direction="row" spacing={1.25} sx={{ alignItems: 'center', p: 1.25, borderRadius: '10px', bgcolor: 'action.hover' }}>
                      <Box sx={{ color: 'primary.main', display: 'flex' }}>{p.icon}</Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="caption" color="text.secondary">
                          {p.label}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {p.value}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'right' }}>
                        {p.when}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>

              {/* ── Items ───────────────────────────────────────── */}
              <Box>
                <SectionLabel>Items returned</SectionLabel>
                {items === null ? (
                  <CircularProgress size={20} />
                ) : (
                  <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px', overflow: 'hidden' }}>
                    {items.map((it, i) => (
                      <Stack
                        key={it.id}
                        direction="row"
                        spacing={1.5}
                        sx={{ px: 1.5, py: 1.1, alignItems: 'center', borderTop: i === 0 ? 0 : '1px solid', borderColor: 'divider' }}
                      >
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {it.product_name ?? `#${it.product_id}`}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {parseFloat(it.quantity)} × {symbol}
                            {formatMoney(parseFloat(it.unit_price))}
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                          {symbol}
                          {formatMoney(parseFloat(it.refund_amount))}
                        </Typography>
                      </Stack>
                    ))}
                    <Stack direction="row" sx={{ px: 1.5, py: 1.1, justifyContent: 'space-between', bgcolor: 'action.hover', borderTop: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        Total refund
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                        {symbol}
                        {formatMoney(parseFloat(r.total_refund))}
                      </Typography>
                    </Stack>
                  </Box>
                )}
              </Box>

              {error && <Alert severity="error">{error}</Alert>}
            </Stack>
          </Box>

          <Stack direction="row" spacing={1} sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', justifyContent: 'space-between', flexWrap: 'wrap' }} useFlexGap>
            <Button
              variant="outlined"
              startIcon={<PrintOutlinedIcon />}
              disabled={!items}
              onClick={() => items && printReturnSlip(r, items, { companyName, currency, methodName: methodName(r.refund_method) })}
            >
              Print / Save PDF
            </Button>
            {/* Only an older request still pending from before returns moved to the POS. */}
            {r.status === 'pending' && hasPermission('returns.approve') && (
              <Stack direction="row" spacing={1}>
                <Button color="inherit" disabled={busy} onClick={() => decide('reject')}>
                  Reject
                </Button>
                <Button variant="contained" disabled={busy} onClick={() => decide('approve')}>
                  Approve &amp; Refund
                </Button>
              </Stack>
            )}
          </Stack>
        </Stack>
      )}
    </Drawer>
  );
}
