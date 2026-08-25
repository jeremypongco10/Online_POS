import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Alert from '@mui/material/Alert';
import PersonIcon from '@mui/icons-material/Person';
import { useAuth } from '../auth/AuthContext';
import { ThemeToggle } from '../ThemeToggle';
import { ChangePasswordButton } from '../ChangePasswordModal';
import { SearchableSelect } from '../admin/SearchableSelect';
import { api, ApiError } from '../api/client';
import type {
  Bagger,
  CashSession,
  Customer,
  LoyaltyCard,
  ProductWithStorePrice,
  Receipt,
  Register,
  SaleResponse,
  Store,
  TaxRate,
  Unit,
} from '../api/types';
import { ProductSearch } from './ProductSearch';
import { Cart } from './Cart';
import { TotalsPanel } from './TotalsPanel';
import { CustomerLoyaltyPanel } from './CustomerLoyaltyPanel';
import { BaggerPanel } from './BaggerPanel';
import { PaymentPanel, type Payment } from './PaymentPanel';
import { OpenRegisterScreen } from './OpenRegisterScreen';
import { CloseRegisterModal } from './CloseRegisterModal';
import { CashMovementPanel } from './CashMovementPanel';
import { ReceiptModal } from './ReceiptModal';
import { calculateCart, type CartLine } from './posTypes';
import { ADMIN_NAV_PERMISSIONS } from '../admin/AdminLayout';

interface Props {
  onOpenAdmin: () => void;
}

export function PosScreen({ onOpenAdmin }: Props) {
  const { user, logout, hasPermission } = useAuth();

  const [stores, setStores] = useState<Store[]>([]);
  const [registers, setRegisters] = useState<Register[]>([]);
  const [storeId, setStoreId] = useState<number | null>(null);
  const [registerId, setRegisterId] = useState<number | null>(null);

  const [units, setUnits] = useState<Unit[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);

  const [cashSession, setCashSession] = useState<CashSession | null>(null);
  const [cashSessionLoading, setCashSessionLoading] = useState(true);
  const [showCloseRegister, setShowCloseRegister] = useState(false);

  const [lines, setLines] = useState<CartLine[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [card, setCard] = useState<LoyaltyCard | null>(null);
  const [bagger, setBagger] = useState<Bagger | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  // Bumped after every completed sale to remount PaymentPanel, clearing its
  // internal amount-tendered/method state — those aren't lifted to this
  // component, so a plain re-render wouldn't reset them on its own.
  const [saleCounter, setSaleCounter] = useState(0);

  const totals = useMemo(() => calculateCart(lines), [lines]);

  useEffect(() => {
    if (!user) return;
    api.get<Store[]>(`/stores?company_id=${user.company_id}&is_active=1&per_page=50`).then((data) => {
      setStores(data);
      if (data.length > 0) setStoreId(data[0].id);
    });
    api.get<Unit[]>('/units?per_page=50').then(setUnits);
    api.get<TaxRate[]>(`/taxes?company_id=${user.company_id}&is_active=1&per_page=50`).then(setTaxRates);
  }, [user]);

  useEffect(() => {
    if (!storeId) return;
    setRegisterId(null);
    api.get<Register[]>(`/registers?store_id=${storeId}&is_active=1&per_page=50`).then((data) => {
      setRegisters(data);
      if (data.length > 0) setRegisterId(data[0].id);
    });
  }, [storeId]);

  // Phase 17 step 1: a register must have an open cash session before it
  // can ring up sales — refetched whenever the selected register changes.
  useEffect(() => {
    if (!registerId) {
      setCashSession(null);
      return;
    }

    setCashSessionLoading(true);
    api
      .get<CashSession[]>(`/cash-sessions?register_id=${registerId}&status=open&per_page=1`)
      .then((sessions) => setCashSession(sessions[0] ?? null))
      .finally(() => setCashSessionLoading(false));
  }, [registerId]);

  function addProduct(product: ProductWithStorePrice) {
    setLines((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      const unit = units.find((u) => u.id === product.unit_id) ?? null;
      const step = 1 / 10 ** (unit?.decimal_places ?? 0);

      if (existing) {
        return prev.map((l) =>
          l.key === existing.key ? { ...l, quantity: Math.round((l.quantity + step) * 1e6) / 1e6 } : l
        );
      }

      const taxRate = taxRates.find((t) => t.id === product.tax_rate_id) ?? null;
      const newLine: CartLine = {
        key: `${product.id}-${Date.now()}`,
        product,
        unit,
        taxRate,
        quantity: step,
        unitPrice: parseFloat(product.selling_price ?? '0') || 0,
        discount: 0,
      };
      return [...prev, newLine];
    });
  }

  function updateQuantity(key: string, quantity: number) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, quantity: Math.max(0, quantity) } : l)));
  }

  function updateDiscount(key: string, discount: number) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, discount: Math.max(0, discount) } : l)));
  }

  function removeLine(key: string) {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }

  function resetSale() {
    setLines([]);
    setCustomer(null);
    setCard(null);
    setBagger(null);
    setCheckoutError(null);
    setSaleCounter((n) => n + 1);
  }

  async function checkout(payments: Payment[]) {
    if (!user || !storeId || !registerId || !cashSession || lines.length === 0) return;

    setSubmitting(true);
    setCheckoutError(null);

    try {
      const sale = await api.post<SaleResponse>('/sales', {
        company_id: user.company_id,
        store_id: storeId,
        register_id: registerId,
        cash_session_id: cashSession.id,
        customer_id: customer?.id,
        items: lines.map((l) => ({
          product_id: l.product.id,
          quantity: l.quantity,
          unit_price: l.unitPrice,
          discount: l.discount,
          tax_rate_id: l.taxRate?.id,
        })),
        payments,
        bagger_id: bagger?.id,
        loyalty_card_id: card?.id,
      });
      const fullReceipt = await api.get<Receipt>(`/sales/${sale.id}/receipt`);
      setReceipt(fullReceipt);
      resetSale();
    } catch (err) {
      setCheckoutError(err instanceof ApiError ? err.message : 'Checkout failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) return null;

  const selectedRegister = registers.find((r) => r.id === registerId);

  if (registerId && !cashSessionLoading && !cashSession && selectedRegister) {
    return (
      <OpenRegisterScreen
        registerId={registerId}
        registerName={`${selectedRegister.name} (${selectedRegister.code})`}
        onOpened={setCashSession}
      />
    );
  }

  return (
    <Box sx={{ minHeight: '100svh', display: 'flex', flexDirection: 'column' }}>
      <AppBar
        position="static"
        color="inherit"
        elevation={0}
        sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', py: 1 }}>
          <Stack direction="row" spacing={2.25} sx={{ alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
              POS
            </Typography>
            <Stack
              direction="row"
              spacing={0.75}
              sx={{ alignItems: 'center', bgcolor: 'action.hover', borderRadius: 1, p: 0.5 }}
            >
              <SearchableSelect
                value={storeId ? String(storeId) : ''}
                onChange={(v) => setStoreId(Number(v))}
                sx={{ minWidth: 180, bgcolor: 'background.paper', boxShadow: 1, borderRadius: 1 }}
                options={stores.map((s) => ({ value: String(s.id), label: s.name }))}
              />
              <SearchableSelect
                value={registerId ? String(registerId) : ''}
                onChange={(v) => setRegisterId(Number(v))}
                sx={{ minWidth: 180, bgcolor: 'background.paper', boxShadow: 1, borderRadius: 1 }}
                options={registers.map((r) => ({ value: String(r.id), label: r.name }))}
              />
            </Stack>
          </Stack>

          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', bgcolor: 'action.hover', borderRadius: 1, p: 0.5 }}>
              {cashSession && (
                <Button size="small" onClick={() => setShowCloseRegister(true)} sx={{ color: 'text.secondary' }}>
                  Close Register
                </Button>
              )}
              {ADMIN_NAV_PERMISSIONS.some((p) => hasPermission(p)) && (
                <Button size="small" onClick={onOpenAdmin} sx={{ color: 'text.secondary' }}>
                  Back Office
                </Button>
              )}
            </Stack>
            <Stack
              direction="row"
              spacing={1.25}
              sx={{ alignItems: 'center', pl: 2, borderLeft: '1px solid', borderColor: 'divider' }}
            >
              <ThemeToggle />
              <ChangePasswordButton />
              {/* No profile images in the system yet — a generic person icon stands in. */}
              <Avatar sx={{ width: 28, height: 28, bgcolor: 'primary.main' }}>
                <PersonIcon sx={{ fontSize: 17 }} />
              </Avatar>
              <Typography variant="body2" sx={{ fontWeight: 600, display: { xs: 'none', sm: 'block' } }}>
                {user.name}
              </Typography>
              <Button size="small" onClick={logout}>
                Log out
              </Button>
            </Stack>
          </Stack>
        </Toolbar>
      </AppBar>

      <Box
        sx={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 360px' },
          gap: 2.25,
          alignItems: 'start',
          maxWidth: 1400,
          mx: 'auto',
          width: '100%',
          p: { xs: 2, md: 3 },
        }}
      >
        <Stack spacing={2.25}>
          <ProductSearch companyId={user.company_id} storeId={storeId} onAdd={addProduct} />
          <Cart lines={lines} onQuantityChange={updateQuantity} onDiscountChange={updateDiscount} onRemove={removeLine} />
        </Stack>

        <Stack spacing={2.25}>
          <CustomerLoyaltyPanel
            customer={customer}
            card={card}
            onAttach={(c, k) => {
              setCustomer(c);
              setCard(k);
            }}
          />
          <BaggerPanel storeId={storeId} bagger={bagger} onSelect={setBagger} />
          {cashSession && <CashMovementPanel session={cashSession} />}
          <TotalsPanel totals={totals} />
          {checkoutError && <Alert severity="error">{checkoutError}</Alert>}
          <PaymentPanel
            key={saleCounter}
            total={totals.total}
            disabled={lines.length === 0 || !registerId || !cashSession}
            submitting={submitting}
            onCheckout={checkout}
          />
        </Stack>
      </Box>

      {showCloseRegister && cashSession && (
        <CloseRegisterModal
          session={cashSession}
          onCancel={() => setShowCloseRegister(false)}
          onClosed={() => {
            setShowCloseRegister(false);
            setCashSession(null);
          }}
        />
      )}

      {receipt && <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />}
    </Box>
  );
}
