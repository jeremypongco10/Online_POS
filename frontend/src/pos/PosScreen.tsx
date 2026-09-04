import { useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import { useAuth } from '../auth/AuthContext';
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
import { ReprintReceiptDialog } from './ReprintReceiptDialog';
import { VoidApprovalDialog, type VoidSubject } from './VoidApprovalDialog';
import { calculateCart, type CartLine } from './posTypes';
import { formatQuantity } from './format';
import {
  clearDraftSale,
  holdSale,
  listHeldSales,
  loadDraftSale,
  removeHeldSale,
  saveDraftSale,
  type HeldSale,
} from './holdSale';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { usePosZoom } from './usePosZoom';
import { ADMIN_NAV_PERMISSIONS } from '../admin/AdminLayout';

interface Props {
  onOpenAdmin: (path?: string) => void;
}

export function PosScreen({ onOpenAdmin }: Props) {
  const { user, logout, hasPermission } = useAuth();
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
  // Which cart line to scroll into view / highlight — set on every add (see
  // addProduct), so the cashier can always see what just landed in the
  // cart without hunting through a long list.
  const [lastAddedKey, setLastAddedKey] = useState<string | null>(null);
  /**
   * The cart line F10 has stepped the selection onto, or null when the
   * cashier isn't stepping through the cart at all.
   *
   * Deliberately a selection rather than real DOM focus. The search box
   * has to hold focus at all times so a keyboard-wedge scanner always
   * has somewhere to type — that's what handleSearchBlur enforces, and
   * an earlier focus-based version of this fought it directly (every
   * arrow press was a tug of war over focus). Tracking the current line
   * in state instead means the arrows can drive the cart while focus
   * never leaves the field: a scan mid-review still rings up normally.
   */
  const [selectedCartKey, setSelectedCartKey] = useState<string | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [card, setCard] = useState<LoyaltyCard | null>(null);
  const [bagger, setBagger] = useState<Bagger | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  // The invoice-lookup dialog F7 opens when no receipt is already on
  // screen — see posShortcuts.ts's 'reprint' entry for the full split
  // with ReceiptModal's own local F7 (print) listener.
  const [reprintOpen, setReprintOpen] = useState(false);
  // Bumped after every completed sale to remount PaymentPanel, clearing its
  // internal amount-tendered/method state — those aren't lifted to this
  // component, so a plain re-render wouldn't reset them on its own.
  const [saleCounter, setSaleCounter] = useState(0);

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [heldSales, setHeldSales] = useState<HeldSale[]>([]);
  // The item or whole-cart action awaiting supervisor sign-off. Held here
  // rather than in Cart so the dialog survives the cart re-rendering
  // underneath it.
  const [voidSubject, setVoidSubject] = useState<VoidSubject | null>(null);
  // The company's two void-approval switches (see SalesController::
  // voidPolicy). Both default to true rather than false while they load,
  // so a void/cancel can never slip through unapproved just because this
  // hasn't come back from the server yet — they only ever loosen once the
  // real values land.
  const [requireItemVoidApproval, setRequireItemVoidApproval] = useState(true);
  const [requireCancelApproval, setRequireCancelApproval] = useState(true);

  // Scales the page down on a screen smaller than this layout was drawn
  // for, so more of the product grid stays visible instead of scrolling.
  // Also returns the manual override PosHeader's zoom control drives.
  const posZoom = usePosZoom();

  // The DOM node ProductSearch's search field portals into — see
  // PosHeader's searchSlotRef and ProductSearch's searchPortalTarget.
  // State, not a plain ref object: PosHeader's callback ref fires during
  // commit, and this component needs a re-render once that happens so the
  // node actually reaches ProductBrowser/ProductSearch as a prop.
  const [searchSlot, setSearchSlot] = useState<HTMLDivElement | null>(null);

  const totals = useMemo(() => calculateCart(lines), [lines]);

  /**
   * Drives the cart selection with the arrow keys while it's active,
   * and drops it on Esc. Listens on the window in the capture phase
   * for one specific reason: focus is still in the search box (that's
   * the whole point), and that field's own onKeyDown already claims
   * ArrowDown to jump into the product grid. Capturing here first, and
   * stopping propagation, keeps the arrows on the cart for as long as
   * a line is selected without changing what they do the rest of the
   * time. Every other key falls through untouched, so a scan (or any
   * typing) still lands in the search box mid-review.
   */
  useEffect(() => {
    if (selectedCartKey === null) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedCartKey(null);
        return;
      }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return;

      const current = lines.findIndex((l) => l.key === selectedCartKey);
      if (current === -1) return;
      e.preventDefault();
      e.stopPropagation();

      // Clamps rather than wrapping, matching the product grid: Esc is
      // the deliberate way out, not something to fall into by holding
      // an arrow down.
      const last = lines.length - 1;
      const target =
        e.key === 'ArrowDown' ? Math.min(last, current + 1)
        : e.key === 'ArrowUp' ? Math.max(0, current - 1)
        : e.key === 'Home' ? 0
        : last;
      setSelectedCartKey(lines[target].key);
    }

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [selectedCartKey, lines]);

  // A selected line that's since been voided (or a cart that's been
  // cleared/checked out) leaves the selection pointing at nothing —
  // drop it rather than leaving an invisible selection armed, which
  // would keep the arrows captured away from the product grid.
  useEffect(() => {
    if (selectedCartKey !== null && !lines.some((l) => l.key === selectedCartKey)) {
      setSelectedCartKey(null);
    }
  }, [lines, selectedCartKey]);

  useEffect(() => {
    if (!user) return;
    api.get<Store[]>(`/stores?company_id=${user.company_id}&is_active=1&per_page=50`).then((data) => {
      setStores(data);
      if (data.length > 0) setStoreId(data[0].id);
    });
    api.get<Unit[]>('/units?per_page=50').then(setUnits);
    api.get<TaxRate[]>(`/taxes?company_id=${user.company_id}&is_active=1&per_page=50`).then(setTaxRates);
    api.get<PaymentMethodOption[]>('/payment-methods?is_active=1&per_page=50').then(setPaymentMethods);
    api
      .get<{ require_item_void_approval: boolean; require_cancel_approval: boolean }>('/sales/void-policy')
      .then((res) => {
        setRequireItemVoidApproval(res.require_item_void_approval);
        setRequireCancelApproval(res.require_cancel_approval);
      })
      .catch(() => {
        setRequireItemVoidApproval(true);
        setRequireCancelApproval(true);
      });
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
   * Recover the in-progress cart a refresh (or an accidental tab close)
   * would otherwise have thrown away — `lines` is React state, so nothing
   * survives a remount on its own. Keyed per terminal and dropped after
   * 12h by loadDraftSale, so yesterday's abandoned cart can't reappear
   * mid-shift.
   *
   * Runs on registerId rather than mount: registerId is null on the first
   * render and only resolves after /registers comes back, so there is no
   * key to read a draft under until then.
   */
  useEffect(() => {
    if (!registerId) return;
    const draft = loadDraftSale(registerId);
    if (!draft) return;

    setLines(draft.lines);
    setCustomer(draft.customer);
    setCard(draft.card);
    setBagger(draft.bagger);
    notify(`Recovered your in-progress sale (${draft.lines.length} item${draft.lines.length === 1 ? '' : 's'})`);
    // notify is intentionally omitted — including it would re-run this on
    // every snackbar render and re-restore the draft over the cashier's
    // live edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerId]);

  /**
   * Autosave on every cart change. Deliberately writes the whole draft
   * rather than diffing: these are a handful of small objects, and the
   * cost of a stale/partial draft on recovery is far worse than the cost
   * of the extra serialisation.
   */
  useEffect(() => {
    if (!registerId) return;
    saveDraftSale(registerId, { lines, customer, card, bagger });
  }, [registerId, lines, customer, card, bagger]);

  /**
   * `quantity` comes from ProductSearch's barcode "5*"/"5x" prefix (see
   * QUANTITY_PREFIX there) — a plain click or bare scan omits it and adds
   * exactly one step, same as before. Every add — click or scan — sets
   * `lastAddedKey`, which Cart uses to scroll that line into view and
   * briefly highlight it, so a cashier can always see what just landed in
   * the cart regardless of how it got there.
   *
   * Wrapped in useCallback with a stable identity (no `lines` dependency)
   * so it can be handed down to ProductCard/ProductListView as a prop
   * without defeating their own memoization — otherwise every add would
   * hand the whole product grid a "new" callback and force every tile to
   * re-render along with the cart, which is exactly what made clicking a
   * product feel laggy (measured ~150-260ms per click before this, purely
   * from re-rendering dozens of unrelated cards). Reading and updating
   * `lines` only inside the setLines updater — never as a captured
   * variable — is what makes that possible: `resultKey` is assigned
   * synchronously inside the updater (React runs it immediately when
   * setLines is called, even though the re-render it schedules is
   * deferred) and read right after, so `existing`/the new line's key are
   * always computed against the true latest cart, never a stale closure.
   */
  const addProduct = useCallback(
    (product: ProductWithStorePrice, quantity?: number) => {
      const unit = units.find((u) => u.id === product.unit_id) ?? null;
      const step = 1 / 10 ** (unit?.decimal_places ?? 0);
      // A typed quantity is rounded to the unit's own precision — a
      // whole-piece item can't take "5.567" — and floored at one step so a
      // stray "0*" or rounding-to-zero doesn't silently add nothing.
      const delta = quantity !== undefined ? Math.max(step, Math.round(quantity / step) * step) : step;

      let resultKey = '';
      setLines((prev) => {
        const existing = prev.find((l) => !l.isCustom && l.product.id === product.id);
        if (existing) {
          resultKey = existing.key;
          return prev.map((l) =>
            l.key === existing.key ? { ...l, quantity: Math.round((l.quantity + delta) * 1e6) / 1e6 } : l
          );
        }

        resultKey = `${product.id}-${Date.now()}`;
        const taxRate = taxRates.find((t) => t.id === product.tax_rate_id) ?? null;
        const newLine: CartLine = {
          key: resultKey,
          product,
          unit,
          taxRate,
          quantity: delta,
          unitPrice: parseFloat(product.selling_price ?? '0') || 0,
          discount: 0,
        };
        return [...prev, newLine];
      });
      setLastAddedKey(resultKey);
      notify(delta !== step ? `Added ${formatQuantity(delta, unit?.abbreviation ?? null, unit?.decimal_places ?? 0)} × ${product.name}` : `Added ${product.name}`);
    },
    [units, taxRates, notify],
  );

  // These three are useCallback'd purely so CartRow's memo() can actually
  // bail — a fresh function identity each render would fail its shallow
  // prop check and re-render every line in the cart on every cart change.
  // All three already read state only through setLines' updater, so there
  // are no dependencies to track and the identity is genuinely permanent.
  const updateDiscount = useCallback((key: string, discount: number) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, discount: Math.max(0, discount) } : l)));
  }, []);

  /**
   * Cart's ± steppers. Rounded to the line's own unit precision so
   * repeated float steps can't drift a whole-piece item to 2.9999999,
   * and floored at one step — reaching zero would be a removal, and
   * removals go through the supervisor-approved void path instead.
   */
  const updateQuantity = useCallback((key: string, quantity: number) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l;
        const step = 1 / 10 ** (l.unit?.decimal_places ?? 0);
        const stepped = Math.max(step, Math.round(quantity / step) * step);
        return { ...l, quantity: Math.round(stepped * 1e6) / 1e6 };
      })
    );
  }, []);

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
    // The autosave effect would clear this anyway once `lines` empties,
    // but saying so here means a completed sale stops depending on that
    // side effect staying true — this is the one place it really must
    // not survive.
    if (registerId) clearDraftSale(registerId);
  }

  async function handleCancel() {
    if (lines.length === 0) return;

    // Always through the dialog, whether or not a supervisor is needed:
    // it also collects the reason, and a cancellation with no recorded
    // reason is close to worthless when someone reviews the trail. The
    // company setting decides only whether credentials come with it.
    setVoidSubject({ kind: 'cart', itemCount: lines.length, amount: totals.total });
  }

  /** Cart's void (⊘) control on a line. Same dialog either way — requireItemVoidApproval decides whether it asks for a supervisor's credentials on top of the reason. */
  const requestVoidLine = useCallback((line: CartLine) => {
    setVoidSubject({ kind: 'item', line });
  }, []);

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
        // Catalogue prices are VAT-inclusive (Philippine shelf pricing),
        // so the server must back the 12% out of each line rather than
        // add it on top. Without this the request defaulted to exclusive
        // (SalesController::create) and the recorded sale disagreed with
        // the total the cashier and customer had just seen — and
        // overcharged by the VAT.
        prices_include_tax: true,
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

  // voidSubject included so F9/F5 can't fire behind the approval dialog —
  // it has a password field in it, and a stray function key clearing the
  // cart underneath would be especially confusing there.
  const blockingDialogOpen = paymentDialogOpen || showCloseRegister || Boolean(receipt) || Boolean(voidSubject) || reprintOpen;
  useKeyboardShortcuts({
    enabled: !blockingDialogOpen,
    search: () => document.getElementById('pos-product-search')?.focus(),
    customer: () => document.getElementById('pos-action-add-customer')?.click(),
    hold: handleHold,
    pay: () => document.getElementById('pos-pay-button')?.click(),
    bagger: () => document.getElementById('pos-action-bagger')?.click(),
    help: () => document.getElementById('pos-help-button')?.click(),
    // Only reachable while `receipt` is null — blockingDialogOpen above
    // disables the whole global handler the moment one is on screen, at
    // which point F7 instead reaches ReceiptModal's own local listener
    // (which prints). See that action's entry in posShortcuts.ts.
    reprint: () => setReprintOpen(true),
    // Starts the cart selection on the first line, without moving focus
    // off the search box. A no-op on an empty cart, which is the right
    // outcome — there's nothing to step through.
    cart: () => setSelectedCartKey(lines[0]?.key ?? null),
    // Return/Cancellation could DOM-click their own Actions row buttons
    // too, but their handlers are trivial one-liners already available
    // right here, so there's nothing to gain by indirecting through the
    // DOM for these two.
    return: () => onOpenAdmin('/admin/customers/returns'),
    cancel: handleCancel,
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
    <Box
      sx={{
        // Divided by the zoom factor usePosZoom publishes (1 when it isn't
        // zooming): viewport units resolve before zoom scales them, so a
        // bare 100dvh would leave the page short of the bottom of the
        // screen by exactly that factor.
        height: 'calc(100dvh / var(--pos-zoom, 1))',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
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
            zoom={posZoom}
            searchSlotRef={setSearchSlot}
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
              py: { xs: 1, md: 1.5 },
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
              searchPortalTarget={searchSlot}
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
              onReturn={() => onOpenAdmin('/admin/customers/returns')}
              onReprintReceipt={() => setReprintOpen(true)}
            />
          </Box>

          {/* Scoped to this column, same as PosHeader above — moved here
              from a full-width sibling below the whole two-column row, so
              it no longer cuts across the cart column too. The cart now
              runs the full height of the screen; this bar bookends only
              the product side, which is the side it actually describes
              (store/terminal/cashier context for what's being rung up). */}
          <StatusBar
            cashierName={user.name}
            storeName={(assignedStore ?? selectedStore)?.name ?? null}
            registerName={selectedRegister?.name ?? null}
          />
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
            storeName={(assignedStore ?? selectedStore)?.name ?? null}
            customer={customer}
            bagger={bagger}
            lines={lines}
            lastAddedKey={lastAddedKey}
            selectedCartKey={selectedCartKey}
            onDiscountChange={updateDiscount}
            onQuantityChange={updateQuantity}
            onRequestVoid={requestVoidLine}
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
      <ReprintReceiptDialog
        open={reprintOpen}
        onClose={() => setReprintOpen(false)}
        // Reuses this screen's own `receipt` state/ReceiptModal rather than
        // rendering a second receipt view — a past sale's receipt is shown
        // exactly the same way the one just rung up is, printed the same
        // way (F7), closed the same way. resetSale() is deliberately NOT
        // called here (unlike the checkout path above): reprinting a past
        // sale must never touch whatever cart the cashier currently has in
        // progress.
        onFound={(r) => {
          setReceipt(r);
          setReprintOpen(false);
        }}
      />

      <VoidApprovalDialog
        subject={voidSubject}
        requireApproval={voidSubject?.kind === 'cart' ? requireCancelApproval : requireItemVoidApproval}
        storeId={storeId}
        onClose={() => setVoidSubject(null)}
        onApproved={(approvedBy) => {
          // approvedBy is empty on the un-gated path (log-void), so the
          // "approved by" clause only appears when someone actually did.
          const by = approvedBy ? ` — approved by ${approvedBy}` : '';
          if (voidSubject?.kind === 'item') {
            removeLine(voidSubject.line.key);
            notify(`Voided ${voidSubject.line.product.name}${by}`);
          } else if (voidSubject?.kind === 'cart') {
            resetSale();
            notify(`Sale cancelled${by}`);
          }
          setVoidSubject(null);
        }}
      />
    </Box>
  );
}
