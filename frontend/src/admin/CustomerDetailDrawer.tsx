import { useEffect, useState, type ReactNode } from 'react';
import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import CloseIcon from '@mui/icons-material/Close';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import CreditCardOutlinedIcon from '@mui/icons-material/CreditCardOutlined';
import { api, ApiError } from '../api/client';
import type { CustomerDirectoryRow, CustomerPurchase, PointsHistoryEntry } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { formatMoney } from '../pos/format';
import { currencySymbol, formatDate, formatDateTime } from '../regional';
import { CustomerAvatar, CustomerActivityBadge } from './CustomerBadges';

interface Props {
  customer: CustomerDirectoryRow | null;
  pointsVisible: boolean;
  lapsedDays: number;
  onClose: () => void;
  onEdit: (c: CustomerDirectoryRow) => void;
  onToggleActive: (c: CustomerDirectoryRow) => void;
  /** Points changed — the list behind should refresh. */
  onChanged: () => void;
}

const n = (v: string | number | null | undefined) => {
  const x = typeof v === 'number' ? v : parseFloat(v ?? '');
  return Number.isFinite(x) ? x : 0;
};

function SectionLabel({ children }: { children: string }) {
  return (
    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', mb: 1 }}>
      {children}
    </Typography>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ p: 1.25, borderRadius: '12px', bgcolor: 'action.hover', minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 800, fontSize: 17, fontVariantNumeric: 'tabular-nums' }} noWrap>
        {value}
      </Typography>
    </Box>
  );
}

function ContactLine({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'flex-start' }}>
      <Box sx={{ color: 'text.secondary', display: 'flex', pt: '2px' }}>{icon}</Box>
      <Typography variant="body2" sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
        {children}
      </Typography>
    </Stack>
  );
}

/** One customer at a glance: how to reach them, how they buy, their points. */
export function CustomerDetailDrawer({ customer, pointsVisible, lapsedDays, onClose, onEdit, onToggleActive, onChanged }: Props) {
  const { user, hasPermission } = useAuth();
  const currency = user?.currency;
  const symbol = currencySymbol(currency);
  const [purchases, setPurchases] = useState<CustomerPurchase[] | null>(null);
  const [history, setHistory] = useState<PointsHistoryEntry[] | null>(null);
  const [points, setPoints] = useState<number>(0);
  const [delta, setDelta] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSeePoints = pointsVisible && hasPermission('loyalty.view');
  const canAdjust = pointsVisible && hasPermission('loyalty.manage');

  useEffect(() => {
    if (!customer) return;
    setPurchases(null);
    setHistory(null);
    setDelta('');
    setNote('');
    setError(null);
    setPoints(n(customer.points));
    api
      .get<CustomerPurchase[]>(`/customers/${customer.id}/purchases`)
      .then(setPurchases)
      .catch(() => setPurchases([]));
    if (canSeePoints) {
      api
        .get<PointsHistoryEntry[]>(`/customers/${customer.id}/points-history`)
        .then(setHistory)
        .catch(() => setHistory([]));
    }
  }, [customer, canSeePoints]);

  async function adjustPoints() {
    if (!customer) return;
    const value = Number(delta);
    if (!delta.trim() || !Number.isInteger(value) || value === 0) {
      setError('Enter a whole number of points. Use a minus sign to deduct, e.g. -20.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await api.post<{ points: number | null }>(`/customers/${customer.id}/points`, { points_delta: value, note: note.trim() || undefined });
      setPoints(n(updated.points));
      setDelta('');
      setNote('');
      setHistory(await api.get<PointsHistoryEntry[]>(`/customers/${customer.id}/points-history`));
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update points');
    } finally {
      setSaving(false);
    }
  }

  const c = customer;
  const active = c ? Number(c.is_active) === 1 : false;
  const visits = c ? n(c.visits) : 0;

  return (
    <Drawer anchor="right" open={customer !== null} onClose={onClose} slotProps={{ paper: { sx: { width: { xs: '100%', sm: 480 } } } }}>
      {c && (
        <Stack sx={{ height: '100%' }}>
          <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, p: 2.25, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0 }}>
              <CustomerAvatar name={c.name} size={46} />
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 800, fontSize: 18, lineHeight: 1.25 }}>{c.name}</Typography>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 0.25 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                    {c.customer_code}
                  </Typography>
                  <CustomerActivityBadge customer={c} lapsedDays={lapsedDays} />
                </Stack>
              </Box>
            </Stack>
            <IconButton size="small" onClick={onClose} aria-label="Close">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>

          <Box sx={{ flex: 1, overflowY: 'auto', p: 2.25 }}>
            <Stack spacing={3}>
              <Box sx={{ display: 'grid', gridTemplateColumns: canSeePoints ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)', gap: 1 }}>
                <Stat label="Visits" value={String(visits)} />
                <Stat label="Spent" value={`${symbol}${formatMoney(n(c.spent))}`} />
                <Stat label="Avg sale" value={visits > 0 ? `${symbol}${formatMoney(n(c.spent) / visits)}` : '—'} />
                {canSeePoints && <Stat label="Points" value={points.toLocaleString()} />}
              </Box>
              {n(c.refunded) > 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: -2 }}>
                  Spent is after refunds: {symbol}
                  {formatMoney(n(c.bought))} bought · {symbol}
                  {formatMoney(n(c.refunded))} refunded
                </Typography>
              )}

              <Box>
                <SectionLabel>Contact</SectionLabel>
                <Stack spacing={1}>
                  <ContactLine icon={<PhoneOutlinedIcon sx={{ fontSize: 17 }} />}>{c.mobile || <Box component="span" sx={{ color: 'text.disabled' }}>No mobile number</Box>}</ContactLine>
                  <ContactLine icon={<EmailOutlinedIcon sx={{ fontSize: 17 }} />}>{c.email || <Box component="span" sx={{ color: 'text.disabled' }}>No email</Box>}</ContactLine>
                  <ContactLine icon={<PlaceOutlinedIcon sx={{ fontSize: 17 }} />}>{c.address || <Box component="span" sx={{ color: 'text.disabled' }}>No address</Box>}</ContactLine>
                  {canSeePoints && c.card_number && <ContactLine icon={<CreditCardOutlinedIcon sx={{ fontSize: 17 }} />}>Loyalty card {c.card_number}</ContactLine>}
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  Customer since {formatDate(c.created_at, currency)}
                  {c.last_visit ? ` · last visit ${formatDate(c.last_visit, currency)}` : ' · no purchases yet'}
                </Typography>
              </Box>

              <Box>
                <SectionLabel>Recent purchases</SectionLabel>
                {purchases === null ? (
                  <CircularProgress size={20} />
                ) : purchases.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No purchases with this customer attached yet.
                  </Typography>
                ) : (
                  <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px', overflow: 'hidden' }}>
                    {purchases.map((p, i) => (
                      <Stack key={p.id} direction="row" spacing={1.5} sx={{ px: 1.5, py: 1, alignItems: 'center', borderTop: i === 0 ? 0 : '1px solid', borderColor: 'divider' }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {p.invoice_number}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDateTime(p.sale_date, currency)}
                            {p.store_name ? ` · ${p.store_name}` : ''} · {n(p.units)} item{n(p.units) === 1 ? '' : 's'}
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                            {symbol}
                            {formatMoney(n(p.total))}
                          </Typography>
                          {n(p.refunded) > 0 && (
                            <Typography variant="caption" sx={{ color: 'warning.main', fontWeight: 700, whiteSpace: 'nowrap' }}>
                              Refunded {symbol}
                              {formatMoney(n(p.refunded))}
                            </Typography>
                          )}
                        </Box>
                      </Stack>
                    ))}
                  </Box>
                )}
              </Box>

              {canSeePoints && (
                <Box>
                  <SectionLabel>Loyalty points</SectionLabel>
                  {canAdjust && (
                    <Box sx={{ p: 1.5, borderRadius: '12px', border: '1px solid', borderColor: 'divider', mb: 1.5 }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                        <TextField
                          size="small"
                          label="Add or remove"
                          placeholder="e.g. 50 or -20"
                          value={delta}
                          onChange={(e) => setDelta(e.target.value)}
                          sx={{ width: 140 }}
                        />
                        <TextField size="small" label="Note" value={note} onChange={(e) => setNote(e.target.value)} sx={{ flex: 1 }} slotProps={{ htmlInput: { maxLength: 255 } }} />
                      </Stack>
                      <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: 1 }}>
                        <Button variant="contained" size="small" disabled={saving || !delta.trim()} onClick={adjustPoints}>
                          {saving ? 'Saving…' : 'Update points'}
                        </Button>
                      </Stack>
                      {error && (
                        <Alert severity="error" sx={{ mt: 1 }}>
                          {error}
                        </Alert>
                      )}
                    </Box>
                  )}
                  {history === null ? (
                    <CircularProgress size={20} />
                  ) : history.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      No point activity yet.
                    </Typography>
                  ) : (
                    <Stack spacing={0.75}>
                      {history.slice(0, 15).map((h) => (
                        <Stack key={h.id} direction="row" spacing={1.5} sx={{ alignItems: 'flex-start', p: 1.1, borderRadius: '10px', bgcolor: 'action.hover' }}>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2">{h.note ?? (h.points_delta >= 0 ? 'Points earned' : 'Points used')}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatDateTime(h.created_at, currency)}
                              {h.created_by_name ? ` · ${h.created_by_name}` : ''}
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography sx={{ fontWeight: 800, color: h.points_delta >= 0 ? 'success.main' : 'error.main', fontVariantNumeric: 'tabular-nums' }}>
                              {h.points_delta >= 0 ? '+' : ''}
                              {h.points_delta.toLocaleString()}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              → {h.balance_after.toLocaleString()}
                            </Typography>
                          </Box>
                        </Stack>
                      ))}
                    </Stack>
                  )}
                </Box>
              )}
            </Stack>
          </Box>

          {hasPermission('customers.update') && (
            <Stack direction="row" spacing={1} sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', justifyContent: 'space-between' }}>
              <Button
                color={active ? 'error' : 'success'}
                startIcon={active ? <BlockOutlinedIcon /> : <CheckCircleOutlinedIcon />}
                onClick={() => onToggleActive(c)}
              >
                {active ? 'Deactivate' : 'Activate'}
              </Button>
              <Button variant="contained" startIcon={<EditOutlinedIcon />} onClick={() => onEdit(c)}>
                Edit details
              </Button>
            </Stack>
          )}
        </Stack>
      )}
    </Drawer>
  );
}
