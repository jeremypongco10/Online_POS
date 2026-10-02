import { useEffect, useState, type ReactNode } from 'react';
import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import CloseIcon from '@mui/icons-material/Close';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutlineOutlined';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import AddShoppingCartOutlinedIcon from '@mui/icons-material/AddShoppingCartOutlined';
import ListAltOutlinedIcon from '@mui/icons-material/ListAltOutlined';
import { api } from '../api/client';
import type { SupplierDirectoryRow, SupplierOrder } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { formatMoney } from '../pos/format';
import { currencySymbol, formatDate } from '../regional';
import { PoStatusChip } from './PoStatusChip';
import { SupplierStatusBadge } from './SupplierBadges';

interface Props {
  supplier: SupplierDirectoryRow | null;
  onClose: () => void;
  onEdit: (s: SupplierDirectoryRow) => void;
  onToggleActive: (s: SupplierDirectoryRow) => void;
  onDelete: (s: SupplierDirectoryRow) => void;
  /** Jump to Purchase Orders filtered to this supplier. */
  onViewOrders?: (s: SupplierDirectoryRow) => void;
  /** Start a new purchase order with this supplier already picked. */
  onNewOrder?: (s: SupplierDirectoryRow) => void;
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

const missing = (text: string) => (
  <Box component="span" sx={{ color: 'text.disabled' }}>
    {text}
  </Box>
);

/** One supplier at a glance: who to call, what you've ordered from them, and what's still on its way. */
export function SupplierDetailDrawer({ supplier, onClose, onEdit, onToggleActive, onDelete, onViewOrders, onNewOrder }: Props) {
  const { user, hasPermission } = useAuth();
  const currency = user?.currency;
  const symbol = currencySymbol(currency);
  const [orders, setOrders] = useState<SupplierOrder[] | null>(null);
  const canSeeOrders = hasPermission('purchases.view');

  useEffect(() => {
    if (!supplier || !canSeeOrders) return;
    setOrders(null);
    api
      .get<SupplierOrder[]>(`/suppliers/${supplier.id}/orders`)
      .then(setOrders)
      .catch(() => setOrders([]));
  }, [supplier, canSeeOrders]);

  const s = supplier;
  const active = s ? Number(s.is_active) === 1 : false;
  const orderCount = s ? n(s.orders) : 0;
  const canManage = hasPermission('suppliers.manage');

  return (
    <Drawer anchor="right" open={supplier !== null} onClose={onClose} slotProps={{ paper: { sx: { width: { xs: '100%', sm: 480 } } } }}>
      {s && (
        <Stack sx={{ height: '100%' }}>
          <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, p: 2.25, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 800, fontSize: 18, lineHeight: 1.3 }}>{s.name}</Typography>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 0.5 }}>
                <SupplierStatusBadge active={active} />
                <Typography variant="caption" color="text.secondary">
                  Supplier since {formatDate(s.created_at, currency)}
                </Typography>
              </Stack>
            </Box>
            <IconButton size="small" onClick={onClose} aria-label="Close">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>

          <Box sx={{ flex: 1, overflowY: 'auto', p: 2.25 }}>
            <Stack spacing={3}>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
                <Stat label="Orders" value={String(orderCount)} />
                <Stat label="Received" value={`${symbol}${formatMoney(n(s.received_total))}`} />
                <Stat label={`Open (${n(s.open_orders)})`} value={`${symbol}${formatMoney(n(s.open_value))}`} />
              </Box>

              {(onNewOrder || onViewOrders) && active && (
                <Stack direction="row" spacing={1}>
                  {onNewOrder && (
                    <Button fullWidth variant="contained" startIcon={<AddShoppingCartOutlinedIcon />} onClick={() => onNewOrder(s)}>
                      New purchase order
                    </Button>
                  )}
                  {onViewOrders && orderCount > 0 && (
                    <Button fullWidth variant="outlined" startIcon={<ListAltOutlinedIcon />} onClick={() => onViewOrders(s)}>
                      View all orders
                    </Button>
                  )}
                </Stack>
              )}

              <Box>
                <SectionLabel>Contact</SectionLabel>
                <Stack spacing={1}>
                  <ContactLine icon={<PersonOutlineIcon sx={{ fontSize: 17 }} />}>{s.contact_name || missing('No contact person')}</ContactLine>
                  <ContactLine icon={<PhoneOutlinedIcon sx={{ fontSize: 17 }} />}>{s.phone || missing('No phone')}</ContactLine>
                  <ContactLine icon={<EmailOutlinedIcon sx={{ fontSize: 17 }} />}>{s.email || missing('No email')}</ContactLine>
                  <ContactLine icon={<PlaceOutlinedIcon sx={{ fontSize: 17 }} />}>{s.address || missing('No address')}</ContactLine>
                  <ContactLine icon={<BadgeOutlinedIcon sx={{ fontSize: 17 }} />}>{s.tax_id ? `TIN ${s.tax_id}` : missing('No TIN')}</ContactLine>
                </Stack>
              </Box>

              {canSeeOrders && (
                <Box>
                  <SectionLabel>Recent orders</SectionLabel>
                  {orders === null ? (
                    <CircularProgress size={20} />
                  ) : orders.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      Nothing ordered from {s.name} yet.
                    </Typography>
                  ) : (
                    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px', overflow: 'hidden' }}>
                      {orders.map((o, i) => (
                        <Stack key={o.id} direction="row" spacing={1.5} sx={{ px: 1.5, py: 1, alignItems: 'center', borderTop: i === 0 ? 0 : '1px solid', borderColor: 'divider' }}>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {o.po_number}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatDate(o.order_date, currency)}
                              {o.store_name ? ` · ${o.store_name}` : ''}
                              {o.status === 'received' && o.received_date ? ` · received ${formatDate(o.received_date, currency)}` : ''}
                            </Typography>
                          </Box>
                          <Stack sx={{ alignItems: 'flex-end' }} spacing={0.5}>
                            <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                              {symbol}
                              {formatMoney(n(o.total))}
                            </Typography>
                            <PoStatusChip status={o.status} />
                          </Stack>
                        </Stack>
                      ))}
                    </Box>
                  )}
                </Box>
              )}
            </Stack>
          </Box>

          {canManage && (
            <Stack direction="row" spacing={1} sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', justifyContent: 'space-between' }}>
              {/* A supplier with orders can only be deactivated — deleting would erase that purchasing history. */}
              {orderCount === 0 ? (
                <Button color="error" startIcon={<DeleteOutlineOutlinedIcon />} onClick={() => onDelete(s)}>
                  Delete
                </Button>
              ) : (
                <Button color={active ? 'error' : 'success'} startIcon={active ? <BlockOutlinedIcon /> : <CheckCircleOutlinedIcon />} onClick={() => onToggleActive(s)}>
                  {active ? 'Deactivate' : 'Activate'}
                </Button>
              )}
              <Button variant="contained" startIcon={<EditOutlinedIcon />} onClick={() => onEdit(s)}>
                Edit details
              </Button>
            </Stack>
          )}
        </Stack>
      )}
    </Drawer>
  );
}
