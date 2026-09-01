import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import { useAuth } from '../auth/AuthContext';
import { useConfirm } from '../ConfirmDialog';
import { useSnackbar } from '../Snackbar';
import { api, ApiError } from '../api/client';
import type {
  Bagger,
  CashSession,
  Customer,
  LoyaltyCard,
  PaymentMethodOption,
  ProductWithStorePrice,
  Receipt,
  Register,
  SaleResponse,
  Store,
  TaxRate,
  Unit,
} from '../api/types';
import { ProductBrowser } from './ProductBrowser';
import { ReceiptPanel } from './ReceiptPanel';
import { StatusBar } from './StatusBar';
import { PosHeader } from './PosHeader';
import { AccountMenu } from './AccountMenu';
import type { Payment } from './PaymentPanel';
import { OpenRegisterScreen } from './OpenRegisterScreen';
import { CloseRegisterModal } from './CloseRegisterModal';
import { ReceiptModal } from './ReceiptModal';
import { calculateCart, type CartLine } from './posTypes';
import { formatQuantity } from './format';
import { holdSale, listHeldSales, removeHeldSale, type HeldSale } from './holdSale';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { ADMIN_NAV_PERMISSIONS } from '../admin/AdminLayout';

interface Props {
  onOpenAdmin: (path?: string) => void;
}

export function PosScreen({ onOpenAdmin }: Props) {
  const { user, logout, hasPermission } = useAuth();
  const confirm = useConfirm();
  const notify = useSnackbar();

  const [stores, setStores] = useState<Store[]>([]);
  const [registers, setRegisters] = useState<Register[]>([]);
  const [storeId, setStoreId] = useState<number | null>(null);
  const [registerId, setRegisterId] = useState<number | null>(null);

  const [units, setUnits] = useState<Unit[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodOption[]>([]);

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

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [heldSales, setHeldSales] = useState<HeldSale[]>([]);

  const totals = useMemo(() => calculateCart(lines), [lines]);

  useEffect(() => {
    if (!user) return;
    api.get<Store[]>(`/stores?company_id=${user.company_id}&is_active=1&per_page=50`).then((data) => {
      setStores(data);
      if (data.length > 0) setStoreId(data[0].id);
    });
    api.get<Unit[]>('/units?per_page=50').then(setUnits);
    api.get<TaxRate[]>(`/taxes?company_id=${user.company_id}&is_active=1&per_page=50`).then(setTaxRates);
    api.get<PaymentMethodOption[]>('/payment-methods?is_active=1&per_page=50').then(setPaymentMethods);
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

  // Held sales are scoped per register, held only in this browser's
  // localStorage (see holdSale.ts) — refresh the visible list whenever the
  // register changes.
  useEffect(() => {
    setHeldSales(registerId ? listHeldSales(registerId) : []);
  }, [registerId]);

  /**
   * `quantity` comes from ProductSearch's barcode "5*"/"5x" prefix (see
   * QUANTITY_PREFIX there) — a plain click or bare scan omits it and adds
   * exactly one step, same as before.
   */
  function addProduct(product: ProductWithStorePrice, quantity?: number) {
    const unit = units.find((u) => u.id === product.unit_id) ?? null;
    const step = 1 / 10 ** (unit?.decimal_places ?? 0);
    // A typed quantity is rounded to the unit's own precision — a
    // whole-piece item can't take "5.567" — and floored at one step so a
    // stray "0*" or rounding-to-zero doesn't silently add nothing.
    const delta = quantity !== undefined ? Math.max(step, Math.round(quantity / step) * step) : step;

    setLines((prev) => {
      const existing = prev.find((l) => !l.isCustom && l.product.id === product.id);

      if (existing) {
        return prev.map((l) =>
          l.key === existing.key ? { ...l, quantity: Math.round((l.quantity + delta) * 1e6) / 1e6 } : l
        );
      }

      const taxRate = taxRates.find((t) => t.id === product.tax_rate_id) ?? null;
      const newLine: CartLine = {
        key: `${product.id}-${Date.now()}`,
        product,
        unit,
        taxRate,
        quantity: delta,
        unitPrice: parseFloat(product.selling_price ?? '0') || 0,
        discount: 0,
      };
      return [...prev, newLine];
    });
    notify(delta !== step ? `Added ${formatQuantity(delta, unit?.abbreviation ?? null, unit?.decimal_places ?? 0)} × ${product.name}` : `Added ${product.name}`);
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

  async function handleCancel() {
    if (lines.length === 0) return;
    const ok = await confirm('Clear the current cart? This cannot be undone.', {
      title: 'Cancel Sale',
      confirmLabel: 'Clear Cart',
    });
    if (ok) resetSale();
  }

  function handleHold() {
    if (!registerId || lines.length === 0) return;
    holdSale(registerId, { lines, customer, card, bagger });
    setHeldSales(listHeldSales(registerId));
    resetSale();
    notify('Sale held');
  }

  function handleResume(held: HeldSale) {
    setLines(held.lines);
    setCustomer(held.customer);
    setCard(held.card);
    setBagger(held.bagger);
    setCheckoutError(null);
    setSaleCounter((n) => n + 1);
    if (registerId) {
      removeHeldSale(registerId, held.id);
      setHeldSales(listHeldSales(registerId));
    }
  }

  function handleDiscardHeld(id: string) {
    if (!registerId) return;
    removeHeldSale(registerId, id);
    setHeldSales(listHeldSales(registerId));
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
        items: lines.map((l) =>
          l.isCustom
            ? {
                name: l.product.name,
                quantity: l.quantity,
                unit_price: l.unitPrice,
                discount: l.discount,
                tax_rate_id: l.taxRate?.id,
              }
            : {
                product_id: l.product.id,
                quantity: l.quantity,
                unit_price: l.unitPrice,
                discount: l.discount,
                tax_rate_id: l.taxRate?.id,
              }
        ),
        payments,
        bagger_id: bagger?.id,
        loyalty_card_id: card?.id,
      });
      const fullReceipt = await api.get<Receipt>(`/sales/${sale.id}/receipt`);
      setReceipt(fullReceipt);
      resetSale();
    } catch (err) {
      setCheckoutError(err instanceof ApiError ? err.message : 'Failed to complete checkout');
    } finally {
      setSubmitting(false);
    }
  }

  const blockingDialogOpen = paymentDialogOpen || showCloseRegister || Boolean(receipt);
  useKeyboardShortcuts({
    enabled: !blockingDialogOpen,
    onSearch: () => document.getElementById('pos-product-search')?.focus(),
    onAddCustomer: () => document.getElementById('pos-action-add-customer')?.click(),
    onHold: handleHold,
    onPay: () => document.getElementById('pos-pay-button')?.click(),
    onBagger: () => document.getElementById('pos-action-bagger')?.click(),
    // Refund/Return/Cancellation live behind the Actions row's "More"
    // menu now, so their buttons only exist in the DOM while that menu is
    // open — the DOM-click trick the rows above use would silently do
    // nothing. These three have real callbacks right here, so call them.
    onRefund: () => onOpenAdmin('/admin/customers/returns'),
    onReturn: () => onOpenAdmin('/admin/customers/returns'),
    onCancel: handleCancel,
  });

  if (!user) return null;

  // Number() on both sides, not `===`: the API encodes bigint ids as JSON
  // strings ("3"), so storeId/registerId hold a string right after load
  // but a real number once AccountMenu's picker sets them (it does
  // Number(v)). A strict compare therefore silently stops matching the
  // moment someone switches store or terminal — which blanked the
  // StatusBar labels and, worse, skipped the open-register gate below.
  const selectedStore = stores.find((s) => Number(s.id) === Number(storeId));
  const selectedRegister = registers.find((r) => Number(r.id) === Number(registerId));

  // StatusBar shows the store this user is *assigned* to rather than
  // whichever the picker happens to be on. GET /stores is already scoped
  // server-side to the caller's own user_stores rows, so for a
  // store-restricted user that list IS their assignment — and since
  // Cashier/Bagger/Store Admin/Cashier Supervisor are all enforced to
  // exactly one store (UsersController::SINGLE_STORE_ROLES), that's a
  // single unambiguous entry for essentially every POS user.
  //
  // More than one entry means either several assignments or an
  // unrestricted admin (who has no assignment at all) — "the assigned
  // store" has no single answer there, so fall back to the selected one.
  const assignedStore = stores.length === 1 ? stores[0] : null;

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
    <Box sx={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          // Only on xs, where the columns are stacked and the gap is
          // vertical breathing room between them. Side by side on md+
          // they butt straight together — the receipt panel's own left
          // border is the divider, so a gutter there just reads as a
          // stripe of dead background between two panels.
          gap: { xs: 1.5, md: 0 },
          // Deliberately no maxWidth here — the receipt column already
          // caps its own width via clamp() below, so letting this row run
          // edge-to-edge just gives the product grid more columns on a
          // wide monitor instead of stranding it in a centered strip with
          // gray margins on either side.
          width: '100%',
          // No padding on this row at all: the product column supplies its
          // own left padding internally (so its header sits flush at the
          // top), and the receipt panel is meant to dock hard against the
          // right edge rather than float with a gutter beside it.
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            // Stacked on mobile (xs), this and the receipt column below
            // split the viewport 60/40 rather than evenly — an even split
            // left almost no visible room for the product grid once the
            // search bar, category pills, and Actions row all took their
            // fixed share of just half the screen.
            flex: { xs: '3 1 0', md: '1 1 0' },
            minWidth: 0,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Scoped to this column rather than spanning the whole app:
              everything it shows (store, terminal, cashier, account) is
              context for browsing/ringing up, and keeping it out of the
              receipt column lets the cart start at the very top of the
              screen instead of being pushed down by a full-width bar. */}
          <PosHeader
            cashSession={cashSession}
            actions={
              <AccountMenu
                user={user}
                stores={stores}
                registers={registers}
                storeId={storeId}
                registerId={registerId}
                onStoreChange={setStoreId}
                onRegisterChange={setRegisterId}
                heldSales={heldSales}
                onResumeHeld={handleResume}
                onDiscardHeld={handleDiscardHeld}
                cashSession={cashSession}
                onCloseTerminal={() => setShowCloseRegister(true)}
                canOpenAdmin={ADMIN_NAV_PERMISSIONS.some((p) => hasPermission(p))}
                onOpenAdmin={() => onOpenAdmin()}
                onLogout={logout}
              />
            }
          />

          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              pl: { xs: 1.5, md: 3 },
              // Now that the row has no gap on md+, this is what keeps the
              // product grid off the receipt panel's edge.
              pr: { xs: 1.5, md: 2.5 },
              py: { xs: 1.5, md: 2.5 },
              // No overflow here — ProductBrowser is hard-bounded to exactly
              // this box's height; its own internal results-grid scroll is
              // the only thing that ever scrolls, so the search bar, category
              // pills, and view toggle are always fully visible.
            }}
          >
            <ProductBrowser
              companyId={user.company_id}
              storeId={storeId}
              onAdd={addProduct}
              customer={customer}
              card={card}
              onAttachCustomer={(c, k) => {
                setCustomer(c);
                setCard(k);
              }}
              bagger={bagger}
              onSelectBagger={setBagger}
              cartHasItems={lines.length > 0}
              onCancel={handleCancel}
              onRefund={() => onOpenAdmin('/admin/customers/returns')}
              onReturn={() => onOpenAdmin('/admin/customers/returns')}
            />
          </Box>
        </Box>

        <Box
          sx={{
            flex: { xs: '2 1 0', md: '0 1 clamp(340px, 32vw, 480px)' },
            minWidth: { xs: 0, md: 320 },
            minHeight: 0,
            // No overflow here — ReceiptPanel is hard-bounded to exactly
            // this box's height, and its own internal Cart scroll is the
            // only thing that ever scrolls, so header/footer are always
            // fully visible regardless of viewport height.
          }}
        >
          <ReceiptPanel
            cashierName={user.name}
            lines={lines}
            onQuantityChange={updateQuantity}
            onDiscountChange={updateDiscount}
            onRemove={removeLine}
            totals={totals}
            checkoutError={checkoutError}
            paymentMethods={paymentMethods}
            submitting={submitting}
            paymentDisabled={lines.length === 0 || !registerId || !cashSession}
            onCheckout={checkout}
            saleCounter={saleCounter}
            onHold={handleHold}
            onPaymentDialogOpenChange={setPaymentDialogOpen}
          />
        </Box>
      </Box>

      <StatusBar storeName={(assignedStore ?? selectedStore)?.name ?? null} registerName={selectedRegister?.name ?? null} />

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

      {receipt && <ReceiptModal receipt={receipt} methods={paymentMethods} onClose={() => setReceipt(null)} />}
    </Box>
  );
}
