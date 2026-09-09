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
import { PosHeader } from './PosHeader';
import { AccountMenu } from './AccountMenu';
import type { Payment } from './PaymentPanel';
import { OpenRegisterScreen } from './OpenRegisterScreen';
import { CloseRegisterModal } from './CloseRegisterModal';
import { ReceiptModal } from './ReceiptModal';
import { ReprintReceiptDialog } from './ReprintReceiptDialog';
import { VoidApprovalDialog, type VoidSubject } from './VoidApprovalDialog';
import { DiscountDialog, type DiscountResult } from './DiscountDialog';
import { discountRequiresHolderId, discountTypeLabel, type DiscountDefaults, type DiscountTypeCode } from './discountTypes';
import { computeDiscountAmounts, type ActiveDiscount } from './discountCalc';
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
import { keepFullscreen } from '../fullscreen';
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
  // Same fail-closed reasoning as the two switches above — see
  // SalesController::discountPolicy.
  const [requireManualDiscountApproval, setRequireManualDiscountApproval] = useState(true);
  // Per-company starting points for the five configurable discount types
  // (Regular/Promo/Employee/Member/Wholesale) — see Settings' Discount
  // defaults section. Empty until the fetch below resolves; DiscountDialog
  // treats a missing entry the same as an explicit null (no pre-fill).
  const [discountDefaults, setDiscountDefaults] = useState<DiscountDefaults>({});

  // Whether DiscountDialog is open — the whole sale is always the scope
  // (the Discount button in the actions row; the POS decides which lines
  // qualify). Held here rather than in Cart, same reasoning as voidSubject:
  // the dialog must survive the cart re-rendering underneath it.
  const [discountOpen, setDiscountOpen] = useState(false);
  // BIR RR 7-2010 documentation for a Senior Citizen/PWD/5% BNPC line —
  // one holder per cart (see AddDiscountHolderToSales), prefilled into
  // DiscountDialog so a second qualifying line doesn't re-ask for the
  // same name/ID, and sent once at checkout.
  const [discountHolderName, setDiscountHolderName] = useState('');
  const [discountIdNumber, setDiscountIdNumber] = useState('');
  // The discount currently governing the sale, or null once nothing's
  // applied. Set whenever a non-Manual discount is applied (see
  // applyDiscount) and replayed by the recompute effect below onto
  // whatever gets added to the cart afterward, so a cashier who applies
  // Senior Citizen and then keeps scanning doesn't have to remember to
  // reopen Discount for every later item. See ActiveDiscount's own
  // docblock for why Manual is deliberately excluded.
  const [activeDiscount, setActiveDiscount] = useState<ActiveDiscount | null>(null);
  // Per-product eligibility for activeDiscount.discountType, fetched
  // whenever the set of products in the cart changes — the same bulk
  // endpoint DiscountDialog itself calls while open. `key` records which
  // product-id set the data answers for, so the recompute effect can tell
  // "no active discount" apart from "haven't heard back yet" and avoid
  // briefly discounting a line that turns out not to qualify.
  const [discountEligibility, setDiscountEligibility] = useState<{
    key: string;
    data: Record<string, Partial<Record<DiscountTypeCode, boolean>>> | null;
  } | null>(null);

  // Scales the page down on a screen smaller than this layout was drawn
  // for, so more of the product grid stays visible instead of scrolling.
  // Also returns the manual override PosHeader's zoom control drives.
  const posZoom = usePosZoom();

  // Kiosk fullscreen, for as long as the register is on screen. Login
  // already requests it, but a reloaded session never goes through the
  // login form and Esc drops out of it — this re-enters on the cashier's
  // next gesture in either case. Scoped here rather than app-wide on
  // purpose: this component only mounts for a POS role (see App's Gate),
  // so the Back Office keeps its browser chrome. See keepFullscreen.
  useEffect(() => keepFullscreen(), []);

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

  /**
   * Clicking/tapping a cart line opens its controls; clicking the same one
   * again closes them. The functional update is what keeps this
   * dependency-free, so its identity never changes and CartRow's memo()
   * still bails — reading selectedCartKey directly here would hand every
   * row a new callback on every selection change, re-rendering the whole
   * cart to move one highlight.
   */
  const toggleCartSelection = useCallback((key: string) => {
    setSelectedCartKey((prev) => (prev === key ? null : key));
  }, []);

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
    api
      .get<{ require_manual_discount_approval: boolean; discount_defaults: DiscountDefaults }>('/sales/discount-policy')
      .then((res) => {
        setRequireManualDiscountApproval(res.require_manual_discount_approval);
        setDiscountDefaults(res.discount_defaults ?? {});
      })
      .catch(() => setRequireManualDiscountApproval(true));
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
    setDiscountHolderName(draft.discountHolderName ?? '');
    setDiscountIdNumber(draft.discountIdNumber ?? '');
    setActiveDiscount(draft.activeDiscount ?? null);
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
    saveDraftSale(registerId, { lines, customer, card, bagger, discountHolderName, discountIdNumber, activeDiscount });
  }, [registerId, lines, customer, card, bagger, discountHolderName, discountIdNumber, activeDiscount]);

  /** Stable across renders that don't change WHICH products are in the cart, so the eligibility fetch below doesn't re-run on every quantity tweak. */
  const cartProductIdsKey = useMemo(
    () =>
      Array.from(new Set(lines.filter((l) => !l.isCustom).map((l) => l.product.id)))
        .sort((a, b) => a - b)
        .join(','),
    [lines]
  );

  /**
   * Eligibility for activeDiscount's type, refetched whenever the set of
   * products in the cart changes — the same bulk endpoint DiscountDialog
   * itself calls while open. Only runs while a discount is actually
   * active; there's nothing to check otherwise.
   */
  useEffect(() => {
    if (!activeDiscount || cartProductIdsKey === '') {
      setDiscountEligibility({ key: cartProductIdsKey, data: null });
      return;
    }
    let cancelled = false;
    api
      .get<Record<string, Partial<Record<DiscountTypeCode, boolean>>>>(`/products/discount-eligibility?product_ids=${cartProductIdsKey}`)
      .then((res) => {
        if (!cancelled) setDiscountEligibility({ key: cartProductIdsKey, data: res });
      })
      .catch(() => {
        if (!cancelled) setDiscountEligibility({ key: cartProductIdsKey, data: null });
      });
    return () => {
      cancelled = true;
    };
    // Deliberately keyed on activeDiscount?.discountType rather than the
    // whole object: eligibility only ever depends on WHICH type is active
    // and what's in the cart, never on the cashier's chosen mode/value —
    // keying on the object would refetch on every keystroke in the amount
    // field for no reason.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDiscount?.discountType, cartProductIdsKey]);

  /**
   * Folds activeDiscount onto whatever the cart currently looks like —
   * this is what makes a new item added after Senior Citizen (or any
   * non-Manual type) was applied come in already discounted instead of
   * sitting there plain until the cashier reopens F5, and what keeps a
   * fixed peso amount split correctly as lines are added, resized, or
   * removed. applyDiscount below already stamps the cart the instant the
   * cashier confirms (using DiscountDialog's own already-fetched
   * eligibility, for zero-delay feedback); this effect is what keeps that
   * stamp current afterward.
   *
   * Waits for discountEligibility to actually answer for the CURRENT
   * product set (`.key === cartProductIdsKey`) before touching `lines` —
   * every real product defaults to NOT eligible until its own data says
   * otherwise (opt-in, not opt-out — see TaxService::
   * isProductEligibleForDiscount), so this isn't needed to avoid
   * wrongly granting a discount; it's to avoid a double recompute (and,
   * under a fixed peso split, a visible two-step reshuffle of every
   * other line's amount) the moment a new product's id briefly has no
   * entry yet.
   */
  useEffect(() => {
    if (!activeDiscount) return;
    if (cartProductIdsKey !== '' && discountEligibility?.key !== cartProductIdsKey) return;

    const eligibility = discountEligibility?.data ?? null;
    const isEligible = (l: CartLine) => l.isCustom || eligibility?.[String(l.product.id)]?.[activeDiscount.discountType] === true;

    setLines((prev) => {
      const eligibleLines = prev.filter(isEligible);
      const amounts = computeDiscountAmounts(activeDiscount.discountType, activeDiscount.mode, activeDiscount.value, eligibleLines);

      let changed = false;
      const next = prev.map((l) => {
        if (!isEligible(l)) {
          // Not eligible for the active type — leave an untouched line
          // alone, but drop a stamp this same active discount put there
          // before the line's eligibility was known (or before it fell
          // out of scope, e.g. eligibility rules changed mid-sale).
          if (l.discountType === activeDiscount.discountType && l.discount > 0) {
            changed = true;
            return { ...l, discount: 0, discountType: null };
          }
          return l;
        }
        const amount = Math.max(0, amounts[l.key] ?? 0);
        if (l.discount === amount && l.discountType === activeDiscount.discountType) return l;
        changed = true;
        return { ...l, discount: amount, discountType: activeDiscount.discountType };
      });
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDiscount, discountEligibility, cartProductIdsKey, lines.map((l) => `${l.key}:${l.quantity}:${l.unitPrice}`).join('|')]);

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

  /** The Discount button in the actions row — the normal workflow: pick one discount for the sale and let the POS decide which lines qualify. */
  function openCartDiscount() {
    if (lines.length === 0) return;
    setDiscountOpen(true);
  }

  /**
   * Cart's ± steppers. useCallback'd so CartRow's memo() can actually bail
   * — a fresh function identity each render would fail its shallow prop
   * check and re-render every line in the cart on every cart change. Reads
   * state only through setLines' updater, so there are no dependencies to
   * track and the identity is genuinely permanent.
   *
   * Rounded to the line's own unit precision so repeated float steps can't
   * drift a whole-piece item to 2.9999999, and floored at one step —
   * reaching zero would be a removal, and removals go through the
   * supervisor-approved void path instead.
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

  /**
   * DiscountDialog's confirm. `result.amounts` is keyed by cart line —
   * one entry per line that qualified, which for the normal cart-wide
   * flow is usually several. Lines absent from it are left exactly as
   * they were: a line that doesn't qualify for the chosen type keeps
   * whatever it already had rather than being quietly cleared.
   *
   * Also sets activeDiscount for every type except Manual, so the
   * recompute effect above folds in whatever gets added to the cart
   * next — see that effect and ActiveDiscount's docblock for why Manual
   * is excluded. This stamp still happens immediately either way, using
   * DiscountDialog's own already-fetched eligibility, so applying a
   * discount never waits on PosScreen's separate eligibility fetch to
   * show something on screen.
   *
   * Not useCallback'd — only ever passed to that one dialog, never per
   * cart row, so CartRow's memo isn't in play here the way it is for
   * updateQuantity above.
   */
  function applyDiscount(result: DiscountResult) {
    const applied = Object.keys(result.amounts).length;

    setLines((prev) =>
      prev.map((l) => {
        const amount = result.amounts[l.key];
        if (amount === undefined) return l;

        return { ...l, discount: Math.max(0, amount), discountType: result.discountType };
      })
    );

    setActiveDiscount(result.discountType === 'manual' ? null : { discountType: result.discountType, mode: result.mode, value: result.value });

    // Only the three government types ever send holder info (see
    // DiscountDialog's requiresId branch) — a Regular/Promo/etc.
    // discount leaves whatever documentation is already on file alone.
    if (result.holderName !== undefined) setDiscountHolderName(result.holderName);
    if (result.holderIdNumber !== undefined) setDiscountIdNumber(result.holderIdNumber);

    setDiscountOpen(false);
    const label = discountTypeLabel(result.discountType) ?? 'Discount';
    notify(applied === 1 ? `${label} applied to 1 item` : `${label} applied to ${applied} items`);
  }

  /** DiscountDialog's "Remove discounts" — clears every line, the sale's active discount (so nothing added afterward gets swept back in), and the SC/PWD documentation, since it only ever belonged to a discount that's now gone. */
  function removeAllDiscounts() {
    setLines((prev) => prev.map((l) => (l.discount > 0 || l.discountType ? { ...l, discount: 0, discountType: null } : l)));
    setActiveDiscount(null);
    setDiscountHolderName('');
    setDiscountIdNumber('');
    setDiscountOpen(false);
    notify('Discounts removed');
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
    setActiveDiscount(null);
    setDiscountHolderName('');
    setDiscountIdNumber('');
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
    holdSale(registerId, { lines, customer, card, bagger, discountHolderName, discountIdNumber, activeDiscount });
    setHeldSales(listHeldSales(registerId));
    resetSale();
    notify('Sale held');
  }

  function handleResume(held: HeldSale) {
    setLines(held.lines);
    setCustomer(held.customer);
    setCard(held.card);
    setBagger(held.bagger);
    setDiscountHolderName(held.discountHolderName ?? '');
    setDiscountIdNumber(held.discountIdNumber ?? '');
    setActiveDiscount(held.activeDiscount ?? null);
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
                discount_type: l.discountType || undefined,
                tax_rate_id: l.taxRate?.id,
              }
            : {
                product_id: l.product.id,
                quantity: l.quantity,
                unit_price: l.unitPrice,
                discount: l.discount,
                discount_type: l.discountType || undefined,
                tax_rate_id: l.taxRate?.id,
              }
        ),
        payments,
        bagger_id: bagger?.id,
        loyalty_card_id: card?.id,
        // Only sent when at least one line actually needs it — the server
        // requires both whenever any line's discount_type is a
        // government type (senior_citizen/pwd/sc_pwd_5_bnpc), and
        // ignores them otherwise. See AddDiscountHolderToSales.
        discount_holder_name: lines.some((l) => discountRequiresHolderId(l.discountType)) ? discountHolderName : undefined,
        discount_id_number: lines.some((l) => discountRequiresHolderId(l.discountType)) ? discountIdNumber : undefined,
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

  // voidSubject/discountOpen included so F9/F5 can't fire behind an
  // approval dialog — both can have a password field in them, and a
  // stray function key clearing the cart underneath would be especially
  // confusing there.
  const blockingDialogOpen =
    paymentDialogOpen || showCloseRegister || Boolean(receipt) || Boolean(voidSubject) || discountOpen || reprintOpen;
  useKeyboardShortcuts({
    enabled: !blockingDialogOpen,
    search: () => document.getElementById('pos-product-search')?.focus(),
    customer: () => document.getElementById('pos-action-add-customer')?.click(),
    // Called directly rather than DOM-clicking CartActionsRow's Hold
    // button (unlike reprint/return/discount below): handleHold already
    // no-ops on its own when the cart is empty, so there's no missing-
    // element guard to lean on here the way those rely on.
    hold: handleHold,
    pay: () => document.getElementById('pos-pay-button')?.click(),
    bagger: () => document.getElementById('pos-action-bagger')?.click(),
    help: () => document.getElementById('pos-help-button')?.click(),
    // Reprint and Return are DOM-clicked rather than called directly —
    // like customer/bagger above, not just for consistency. CartActionsRow
    // only renders these two buttons while the cart is empty (Cancel Sale
    // takes their place otherwise; see that component), so a missing
    // element is exactly the "cart has items" case, and the optional
    // chain silently no-ops. That's one guard (the row's own render
    // condition) instead of matching cartHasItems checks in two places.
    //
    // F7 specifically is also only reachable while `receipt` is null —
    // blockingDialogOpen above disables the whole global handler the
    // moment one is on screen, at which point F7 instead reaches
    // ReceiptModal's own local listener (which prints). See that action's
    // entry in posShortcuts.ts.
    reprint: () => document.getElementById('pos-action-reprint')?.click(),
    return: () => document.getElementById('pos-action-return')?.click(),
    // Same reasoning as reprint/return above: CartActionsRow only renders
    // this button once the cart has items, so a DOM-click silently no-ops
    // on an empty cart instead of needing a matching cartHasItems check
    // here too.
    discount: () => document.getElementById('pos-action-discount')?.click(),
    // Starts the cart selection on the first line, without moving focus
    // off the search box. A no-op on an empty cart, which is the right
    // outcome — there's nothing to step through.
    cart: () => setSelectedCartKey(lines[0]?.key ?? null),
    // Cancel keeps calling its handler directly rather than DOM-clicking:
    // handleCancel already guards on an empty cart itself (there's nothing
    // to cancel), so there's no gating to gain by indirecting through a
    // button that render-guards on the exact same condition.
    cancel: handleCancel,
  });

  if (!user) return null;

  // Number() on both sides, not `===`: the API encodes bigint ids as JSON
  // strings ("3"), so storeId/registerId hold a string right after load
  // but a real number once AccountMenu's picker sets them (it does
  // Number(v)). A strict compare therefore silently stops matching the
  // moment someone switches store or terminal — which blanked the
  // receipt letterhead's store/terminal line and, worse, skipped the
  // open-register gate below.
  const selectedStore = stores.find((s) => Number(s.id) === Number(storeId));
  const selectedRegister = registers.find((r) => Number(r.id) === Number(registerId));

  // The receipt letterhead names the store this user is *assigned* to
  // rather than whichever the picker happens to be on. GET /stores is already scoped
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
                zoom={posZoom}
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
              onOpenDiscount={openCartDiscount}
              onHold={handleHold}
              onCancel={handleCancel}
              onReturn={() => onOpenAdmin('/admin/customers/returns')}
              onReprintReceipt={() => setReprintOpen(true)}
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
            store={assignedStore ?? selectedStore ?? null}
            cashierName={user.name}
            registerName={selectedRegister?.name ?? null}
            customer={customer}
            bagger={bagger}
            lines={lines}
            lastAddedKey={lastAddedKey}
            selectedCartKey={selectedCartKey}
            onSelectCartLine={toggleCartSelection}
            onQuantityChange={updateQuantity}
            onRequestVoid={requestVoidLine}
            totals={totals}
            checkoutError={checkoutError}
            paymentMethods={paymentMethods}
            submitting={submitting}
            paymentDisabled={lines.length === 0 || !registerId || !cashSession}
            onCheckout={checkout}
            saleCounter={saleCounter}
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

      <DiscountDialog
        open={discountOpen}
        lines={lines}
        requireManualApproval={requireManualDiscountApproval}
        discountDefaults={discountDefaults}
        storeId={storeId}
        holderName={discountHolderName}
        holderIdNumber={discountIdNumber}
        onClose={() => setDiscountOpen(false)}
        onApply={applyDiscount}
        onRemoveAll={removeAllDiscounts}
      />
    </Box>
  );
}
