import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import GridViewIcon from '@mui/icons-material/GridView';
import ViewListIcon from '@mui/icons-material/ViewList';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import SearchOffOutlinedIcon from '@mui/icons-material/SearchOffOutlined';
import AppsIcon from '@mui/icons-material/Apps';
import { api } from '../api/client';
import type { Category, ProductWithStorePrice } from '../api/types';
import { POS_ACCENT, THIN_SCROLLBAR_SX } from './format';
import { useSnackbar } from '../Snackbar';
import { SearchField } from '../SearchField';
import { KeyHint } from './KeyHint';
import { CategoryDialog } from './CategoryDialog';
import { CategoryPills } from './CategoryPills';
import { ProductGrid } from './ProductGrid';
import { ProductListView } from './ProductListView';
import { AddQuantityDialog } from './AddQuantityDialog';
import { IS_TOUCH } from '../isTouch';
import {
  PRODUCT_TILE_SELECTOR,
  focusFirstProductTile,
  focusProductSearch,
  nextTileIndex,
  productTiles,
  tileColumnCount,
} from './productGridNav';

type CategoryNode = Category & { children: CategoryNode[] };
type ViewMode = 'grid' | 'list';

// Leading "5*", "5x", or "5×" before a scanned/typed code means "add this
// many" — the standard quantity-multiplier convention real POS/scanner
// setups use, so a case of 24 doesn't need 24 individual scans.
const QUANTITY_PREFIX = /^(\d+(?:\.\d+)?)\s*[x×*]\s*(.+)$/i;
// Looser version with no requirement for anything after the separator —
// matches the instant "5*" is typed, before the barcode part exists yet,
// so the live search below can bail out while a multiplier is still being
// entered rather than uselessly searching for the literal text "5*".
const QUANTITY_PREFIX_STARTED = /^\d+(?:\.\d+)?\s*[x×*]/i;

// A smaller batch than the backend's old 100-per-request cap: the grid now
// loads more pages as the cashier scrolls (see loadMore below) instead of
// fetching the entire matching catalog on every keystroke/category change.
const PAGE_SIZE = 40;

interface Props {
  companyId: number;
  storeId: number | null;
  onAdd: (product: ProductWithStorePrice, quantity?: number) => void;
  /**
   * PosHeader's slots for the search field and for the Category/view
   * controls. When set, those pieces render into the dark top bar via a
   * portal instead of at the top of this column.
   *
   * A portal rather than lifting the state: the query, its debounce,
   * scanner mode, the Enter-to-add handling, the arrow-key grid
   * navigation and the focus juggling that keeps a wedge scanner fed all
   * live here and are tightly coupled. Moving the DOM costs nothing;
   * moving the state would mean threading a dozen values through
   * PosScreen for a purely visual relocation. Both stay optional so this
   * component still renders standalone with its controls in place.
   */
  searchPortalTarget?: HTMLElement | null;
  controlsPortalTarget?: HTMLElement | null;
}

/**
 * Category browsing + name/SKU/barcode search feeding a product grid (or
 * list). A hardware barcode scanner just types into this same focused
 * field like a fast keyboard, then sends Enter — handleSearchKeyDown()
 * below catches that Enter and, on an exact barcode/SKU match, adds the
 * product straight to the cart and clears the field for the next scan,
 * rather than leaving the cashier to click a filtered-down grid. No
 * dedicated scan endpoint needed — the trailing icon is a visual
 * affordance for that, not a separate integration.
 */
export function ProductSearch({ companyId, storeId, onAdd, searchPortalTarget, controlsPortalTarget }: Props) {
  const notify = useSnackbar();
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [results, setResults] = useState<ProductWithStorePrice[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Infinite-scroll state for the grid/list below. `page` tracks the last
  // page successfully appended; `hasMore` comes straight from the API's own
  // meta.page < meta.last_page rather than being inferred from result count,
  // since a short final page (e.g. 3 items) would otherwise look like "no
  // more" when it's really just the tail of the catalog.
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  // Bumped on every *new* search (query/category/store change) so a
  // loadMore() response that resolves after the cashier has already typed
  // something else gets silently dropped instead of appending stale rows
  // onto a now-unrelated result set.
  const requestIdRef = useRef(0);
  const resultsContainerRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  /**
   * True while the cashier is walking the results with the arrow keys.
   *
   * Without this, keyboard browsing is impossible: handleSearchBlur exists
   * to drag focus back to the search field the moment it lands on anything
   * else in the app (so a scanner always has somewhere to type), and a
   * product tile is exactly such a thing — focus bounced straight back on
   * every arrow press. A ref rather than state because it's read inside a
   * requestAnimationFrame callback and must never be a render behind.
   *
   * Cleared by a pointer press on the results, so clicking a card keeps its
   * original behaviour: focus returns to the search field, ready to scan.
   */
  const keyboardBrowsingRef = useRef(false);

  /**
   * Touch only. False = "scanner mode": the field is focused so a wedge
   * scanner's keystrokes land in it, but inputMode="none" stops the
   * on-screen keyboard from opening. True = the cashier tapped the field
   * to type, so the keyboard is wanted. Always false on a mouse device,
   * where inputMode is left alone entirely.
   */
  const [typingMode, setTypingMode] = useState(false);

  useEffect(() => {
    api.get<CategoryNode[]>('/categories/tree').then(setCategories).catch(() => setCategories([]));
  }, [companyId]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!storeId) {
      setResults([]);
      setHasMore(false);
      return;
    }

    // A 1-2 character query is too broad to be useful and just churns
    // requests while the cashier is still typing — wait for a real query
    // (3+ chars) or an empty field (browse everything) before searching.
    // Deliberately leaves `results` untouched rather than clearing it:
    // clearing would flash the grid blank on every keystroke below the
    // threshold, which reads as "no matches" rather than "still typing".
    const trimmed = query.trim();
    if (trimmed.length > 0 && trimmed.length < 3) {
      return;
    }

    // A "5*..." quantity prefix is headed for handleSearchKeyDown on
    // Enter, not a name/SKU/barcode search — searching the literal text
    // "5*4800000000011" against the catalog would never match anything.
    if (QUANTITY_PREFIX_STARTED.test(trimmed)) {
      return;
    }

    debounceRef.current = setTimeout(() => {
      // Any in-flight loadMore() for the previous filters is now stale —
      // this id bump is what makes its eventual response a no-op.
      const requestId = ++requestIdRef.current;
      setLoading(true);
      const params = new URLSearchParams({
        company_id: String(companyId),
        store_id: String(storeId),
        is_active: '1',
        page: '1',
        per_page: String(PAGE_SIZE),
      });
      if (trimmed !== '') params.set('q', trimmed);
      if (categoryId !== null) params.set('category_id', String(categoryId));

      api
        .getPaged<ProductWithStorePrice>(`/products?${params.toString()}`)
        .then(({ data, meta }) => {
          if (requestId !== requestIdRef.current) return;
          setResults(data);
          setPage(1);
          setHasMore(meta !== null && meta.page < meta.last_page);
        })
        .catch(() => {
          if (requestId !== requestIdRef.current) return;
          setResults([]);
          setHasMore(false);
        })
        .finally(() => {
          if (requestId === requestIdRef.current) setLoading(false);
        });
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, categoryId, companyId, storeId]);

  /**
   * Fetches the next page and appends it — the counterpart to the effect
   * above, which always replaces from page 1. Guarded against firing while
   * a request (initial or another loadMore) is already in flight, and
   * against firing once the backend says there's nothing left.
   */
  const loadMore = useCallback(() => {
    if (!storeId || loading || loadingMore || !hasMore) return;
    const trimmed = query.trim();
    if (trimmed.length > 0 && trimmed.length < 3) return;
    if (QUANTITY_PREFIX_STARTED.test(trimmed)) return;

    const requestId = requestIdRef.current;
    const nextPage = page + 1;
    setLoadingMore(true);
    const params = new URLSearchParams({
      company_id: String(companyId),
      store_id: String(storeId),
      is_active: '1',
      page: String(nextPage),
      per_page: String(PAGE_SIZE),
    });
    if (trimmed !== '') params.set('q', trimmed);
    if (categoryId !== null) params.set('category_id', String(categoryId));

    api
      .getPaged<ProductWithStorePrice>(`/products?${params.toString()}`)
      .then(({ data, meta }) => {
        if (requestId !== requestIdRef.current) return;
        setResults((prev) => [...prev, ...data]);
        setPage(nextPage);
        setHasMore(meta !== null && meta.page < meta.last_page);
      })
      .catch(() => {
        if (requestId !== requestIdRef.current) return;
        // Stop retrying on a transient failure rather than hammering the
        // API every time the sentinel re-enters view — scrolling away and
        // back, or a filter change, is what gives the cashier another shot.
        setHasMore(false);
      })
      .finally(() => {
        if (requestId === requestIdRef.current) setLoadingMore(false);
      });
  }, [storeId, loading, loadingMore, hasMore, page, query, categoryId, companyId]);

  // The sentinel sits just past the last row; once it scrolls into the
  // results panel's own viewport (not the page's — `root` is that panel),
  // the next page loads automatically. Re-subscribes whenever loadMore's
  // own closure changes (new filters, new page, hasMore flips) so it always
  // observes with fresh state rather than a stale first-render closure.
  useEffect(() => {
    const root = resultsContainerRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) loadMore();
    }, { root, rootMargin: '200px' });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  /**
   * Unpriced products sink to the bottom rather than being hidden: an
   * item with no price for this store is a real data problem someone
   * needs to fix, so silently filtering it out would just hide the bug.
   * But it also can't be sold, so it has no claim on the prime slots at
   * the top of the grid. Array.sort is stable in every engine this runs
   * on, so the backend's own name ordering survives inside each group.
   */
  const orderedResults = useMemo(
    () => [...results].sort((a, b) => Number(a.selling_price === null) - Number(b.selling_price === null)),
    [results]
  );

  // A first load has nothing on screen yet, so it fills the panel with
  // placeholders; a scroll-in page only needs a few, since there are
  // already real rows above them doing the explaining.
  // Falls back to "Category" rather than an id if the selected category
  // somehow isn't in the list (deleted in Back Office while the till is
  // open, say) — a stale name is a cosmetic problem, a raw "#25" on the
  // button is a confusing one.
  const selectedCategoryName = categories.find((c) => c.id === categoryId)?.name ?? 'Category';

  const initialLoading = loading && results.length === 0;
  const gridSkeletons = initialLoading ? 12 : loadingMore ? 4 : 0;
  const listSkeletons = initialLoading ? 8 : loadingMore ? 3 : 0;

  /**
   * Clicking a product card moves focus to that card's button — deferred
   * to the next frame so it wins over the browser's own post-click focus
   * assignment, which would otherwise put it back on the card a moment
   * later. Keeping the search field focused is what lets a cashier keep
   * scanning items back-to-back without ever touching the mouse/keyboard
   * again after the first click.
   */
  const focusSearch = useCallback(() => {
    requestAnimationFrame(() => {
      document.getElementById('pos-product-search')?.focus();
    });
  }, []);

  /**
   * Hands focus back to this field the instant every dialog, popover and
   * menu on screen has closed — Customer, Bagger, Help, Discount, Void,
   * Payment, the account menu and its Store/Terminal dropdowns, all of
   * it, with no per-dialog wiring needed.
   *
   * Necessary because MUI's own default on a Dialog/Popover close is to
   * restore focus to whatever *opened* it — usually a button — not to
   * this field, and unlike a plain blur (which handleSearchBlur already
   * reclaims below) there's no blur event on the search field itself to
   * react to there: it was already unfocused the moment the dialog first
   * opened, so nothing fires when focus lands back on that button later.
   *
   * A MutationObserver on document.body rather than a handler on each
   * dialog: every MUI Dialog, Popover and Menu (Autocomplete's own
   * dropdown is a lighter Popper, not this) renders as a `.MuiModal-root`
   * portaled directly under body — the same fact handleSearchBlur's own
   * comment already relies on — so counting those is one general trigger
   * that needs no changes wherever a new dialog gets added later. Fires
   * only on the transition from "at least one open" to "none open":
   * dialogs that can stack (an approval dialog over a void dialog, say)
   * would otherwise get this field stolen back while one is still open
   * behind another.
   */
  useEffect(() => {
    let openCount = document.querySelectorAll('.MuiModal-root').length;
    const observer = new MutationObserver(() => {
      const count = document.querySelectorAll('.MuiModal-root').length;
      if (count === 0 && openCount > 0) focusSearch();
      openCount = count;
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [focusSearch]);

  /**
   * Touch only, and the piece that makes scanner mode actually work: every
   * time we're in (or fall back to) scanner mode, make sure the field holds
   * focus, so a wedge scanner's keystrokes have somewhere to land without
   * anyone tapping anything.
   *
   * Refocusing here is safe precisely because it runs *after* the commit
   * that rendered inputMode="none" — Android re-reads inputMode when an
   * element takes focus, so by this point there's no keyboard to raise.
   * Doing it in the blur handler instead would refocus while the DOM still
   * said inputMode="text", and the keyboard would spring straight back up.
   *
   * Also covers first load (typingMode starts false), which is why the
   * field no longer needs autoFocus on touch.
   */
  useEffect(() => {
    if (IS_TOUCH && !typingMode) focusSearch();
  }, [typingMode, focusSearch]);

  /**
   * A tap on the field is the one unambiguous "I want to type" signal on
   * a touch device — everything else (load, adding an item, tapping a
   * category) leaves it in scanner mode with no keyboard.
   *
   * Blur-then-refocus because Android only decides about the keyboard when
   * an element takes focus: flipping inputMode on an already-focused field
   * would leave the keyboard shut.
   */
  function handleSearchPointerDown() {
    if (!IS_TOUCH || typingMode) return;
    setTypingMode(true);
    document.getElementById('pos-product-search')?.blur();
    focusSearch();
  }

  // useCallback, stable across renders that don't touch onAdd/typingMode,
  // so it can pass through ProductGrid/ProductListView to ProductCard
  // without defeating that component's own memo() — see ProductCard.tsx.
  // `quantity` is only ever passed by the long-press quantity dialog below
  // — a plain click still omits it and adds exactly one unit.
  const handleAdd = useCallback(
    (product: ProductWithStorePrice, quantity?: number) => {
      onAdd(product, quantity);
      // Back to scanner mode after an add — staying in typing mode would pop
      // the keyboard open again on the refocus, the exact behaviour that made
      // the phone unusable. The effect above restores focus.
      if (IS_TOUCH && typingMode) setTypingMode(false);
      // Adding from the keyboard leaves focus on the tile, so the arrows can
      // carry straight on to the next product. Pulling focus back to the
      // search field here — right for a click — would end the run after one
      // item and make arrow browsing useless for a multi-item sale.
      else if (!keyboardBrowsingRef.current) focusSearch();
    },
    [onAdd, typingMode, focusSearch],
  );

  // The long-press quantity dialog — holds which product it's open for
  // (null = closed). Lives here rather than being lifted to PosScreen: it
  // only ever needs `handleAdd`, which is already local to this component.
  const [quantifyProduct, setQuantifyProduct] = useState<ProductWithStorePrice | null>(null);

  /**
   * What a confirmed quantity dialog is waiting to add, held between the
   * Add tap and the dialog finishing its exit.
   *
   * Adding straight from the Add handler batches the cart update into the
   * same work as the dismissal, and the dialog then can't leave the screen
   * until all of it lands: measured on a throttled tablet at ~780ms, versus
   * ~280ms for a Cancel that closes the identical dialog but does no cart
   * work. Waiting for onExited hands those 500ms back to the cashier — the
   * dialog goes as soon as it's asked to, and the cart fills in right
   * behind it. A ref, not state, because nothing renders from it.
   */
  const pendingAddRef = useRef<{ product: ProductWithStorePrice; quantity: number } | null>(null);

  // Stable identity for the same memo() reason as handleAdd — spread down
  // through ProductGrid/ProductListView to every card/row.
  const handleLongPress = useCallback((product: ProductWithStorePrice) => {
    // Unpriced products are already unclickable (see ProductCard's
    // `disabled`) — mirrored here since a long-press reaches the same
    // card through its own pointer handlers, not through that click gate.
    if (product.selling_price === null) return;
    setQuantifyProduct(product);
  }, []);

  /**
   * Reclaims focus after clicking anything else on the main screen — a
   * category pill, a card, the view toggle, a cart quantity button, or
   * even just empty space — since a barcode scanner needs this field
   * focused to work at all, and a cashier shouldn't have to click back
   * into it before every scan. Deliberately does NOT reclaim focus in
   * two cases, checked against document.activeElement one frame after
   * the blur (once the browser has settled where focus actually went):
   *   - The new target is itself a text box (INPUT/TEXTAREA/contentEditable)
   *     — e.g. a cart quantity/discount field, or a field inside a dialog
   *     — where the cashier is clearly typing something else.
   *   - The new target is outside the app's #root AND isn't just
   *     <body>/<html> (which is where focus lands on a plain click into
   *     empty space, not a real overlay) — every MUI Dialog/Menu/Popover/
   *     Autocomplete dropdown/Snackbar renders as a portal directly under
   *     <body>, so this one check covers all of them without needing to
   *     enumerate each component's role.
   */
  function handleSearchBlur() {
    // On touch, tapping away while typing is how the cashier dismisses the
    // keyboard — reclaiming focus *here* would drag it straight back up,
    // since the field still says inputMode="text" at this point. Dropping
    // to scanner mode instead lets the effect above refocus once the DOM
    // says inputMode="none": keyboard dismissed, field still live to scan.
    if (IS_TOUCH && typingMode) {
      setTypingMode(false);
      return;
    }

    requestAnimationFrame(() => {
      const active = document.activeElement;
      if (!(active instanceof HTMLElement) || active.id === 'pos-product-search') return;

      // Arrow-key browsing is a deliberate move onto a product tile, not
      // focus wandering off — leave it alone.
      if (keyboardBrowsingRef.current && active.closest(PRODUCT_TILE_SELECTOR)) return;


      const isTextEntry = active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable;
      const isBareBody = active === document.body || active === document.documentElement;
      const isInsideApp = isBareBody || (document.getElementById('root')?.contains(active) ?? true);

      if (!isTextEntry && isInsideApp) {
        document.getElementById('pos-product-search')?.focus();
      }
    });
  }

  /**
   * A hardware barcode scanner acts like a keyboard: it types the code
   * into whatever's focused, then sends Enter — this is what turns that
   * into "scan and add to cart" instead of just filtering the grid down
   * to one result the cashier still has to click. Exact match only
   * (barcode or SKU): a fuzzy name match that happens to contain the
   * scanned text shouldn't get silently added. Bypasses the debounced
   * search entirely with its own immediate lookup, since a scan's Enter
   * can easily fire before that 250ms debounce has resolved.
   *
   * A leading "5*"/"5x" (QUANTITY_PREFIX) is stripped off before the
   * lookup and passed through to onAdd as an explicit quantity — see
   * PosScreen's addProduct(), which adds that many instead of its usual
   * one-unit step when given one.
   */
  async function handleSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    // Esc wipes a mistyped code / half-finished search and drops straight
    // back to browsing, without the cashier reaching for the mouse or
    // holding backspace. Handled on the field rather than as a global
    // listener on purpose: Esc is also how MUI closes the Customer and
    // Bagger dialogs, the More menu, and the discount popover, and those
    // don't sit behind useKeyboardShortcuts' `enabled` gate — a global
    // handler would wipe the search every time one of those was
    // dismissed. Focus is inside the overlay in those cases, so this
    // never fires there.
    if (e.key === 'Escape') {
      if (query === '') return;
      e.preventDefault();
      setQuery('');
      return;
    }

    // Down Arrow leaves the search box and picks up the first product, so
    // the whole browse-and-add loop is reachable without the mouse. Only
    // when there's something to land on — otherwise the key is left alone
    // rather than swallowed into a no-op.
    if (e.key === 'ArrowDown') {
      if (focusFirstProductTile()) {
        keyboardBrowsingRef.current = true;
        e.preventDefault();
      }
      return;
    }

    if (e.key !== 'Enter') return;
    e.preventDefault();

    const raw = query.trim();
    if (!raw || !storeId || scanning) return;

    const prefixMatch = raw.match(QUANTITY_PREFIX);
    const quantity = prefixMatch ? parseFloat(prefixMatch[1]) : undefined;
    const code = prefixMatch ? prefixMatch[2].trim() : raw;
    if (!code || (quantity !== undefined && !(quantity > 0))) {
      notify('Enter a quantity greater than zero before the ×', 'error');
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    setScanning(true);
    setLoading(true);
    try {
      const params = new URLSearchParams({
        company_id: String(companyId),
        store_id: String(storeId),
        is_active: '1',
        q: code,
        per_page: '10',
      });
      const matches = await api.get<ProductWithStorePrice[]>(`/products?${params.toString()}`);
      const exact = matches.find((p) => p.barcode === code || p.sku === code);

      if (exact && exact.selling_price !== null) {
        onAdd(exact, quantity);
        setQuery('');
        focusSearch();
      } else if (exact) {
        notify(`${exact.name} has no price set at this store`, 'error');
      } else {
        notify(`No product found for "${code}"`, 'error');
      }
    } catch {
      notify('Barcode lookup failed', 'error');
    } finally {
      setLoading(false);
      setScanning(false);
    }
  }

  /**
   * Arrow/Home/End/Esc movement between product tiles. Enter and Space are
   * deliberately absent: every tile is a ButtonBase, which already activates
   * on both, and re-implementing that here would only risk adding twice.
   */
  function handleResultsKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const container = e.currentTarget;
    const tiles = productTiles(container);
    const current = tiles.indexOf(document.activeElement as HTMLElement);
    // Focus is somewhere else in the results (or nowhere) — not ours to move.
    if (current === -1) return;

    const target = nextTileIndex(e.key, current, tiles.length, tileColumnCount(container));
    if (target === null) return;

    e.preventDefault();
    if (target === 'search') {
      keyboardBrowsingRef.current = false;
      focusProductSearch();
      return;
    }
    keyboardBrowsingRef.current = true;
    tiles[target].focus();
    // 'nearest' on purpose: the minimum scroll that reveals the tile, so a
    // step sideways within a visible row doesn't jerk the whole list.
    tiles[target].scrollIntoView({ block: 'nearest' });
  }

  // Sized to match the search field it sits beside (48) rather than
  // MUI's `small` default (~32) — the two read as one control strip that
  // way, and a view switch on a till is a finger target like any other.
  // Coloured for PosHeader's fixed navy rather than for the page: the
  // unselected segment is a muted white so it reads as available without
  // competing, and the selected one takes a solid accent fill, which is
  // the only state that needs to carry at a glance across a counter.
  const toggleButtonSx = {
    gap: 0.5,
    px: 1.75,
    minWidth: 46,
    minHeight: 46,
    textTransform: 'none',
    fontWeight: 600,
    color: 'rgba(255,255,255,0.65)',
    borderColor: 'rgba(255,255,255,0.22)',
    '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', color: '#fff' },
    '&.Mui-selected': {
      bgcolor: POS_ACCENT,
      color: '#fff',
      borderColor: POS_ACCENT,
      '&:hover': { bgcolor: POS_ACCENT, color: '#fff' },
    },
  } as const;

  // The search field + its loading spinner, as one unit — sits beside the
  // grid/list toggle below, so it grows into whatever room that row has
  // left rather than claiming a full row of its own above it.
  const searchFieldNode = (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flex: 1, minWidth: 0 }}>
      <SearchField
        id="pos-product-search"
        value={query}
        onChange={setQuery}
        onKeyDown={handleSearchKeyDown}
        onBlur={handleSearchBlur}
        onPointerDown={handleSearchPointerDown}
        // F2/Esc are carried here rather than in a legend along the bottom
        // of the screen, alongside every other shortcut now shown on the
        // control it drives.
        placeholder="Search by product name, barcode or SKU"
        // autoFocus opens the on-screen keyboard on a phone the instant the
        // screen loads. Touch gets focus from the mount effect above
        // instead, in scanner mode, so scanning works with no keyboard.
        autoFocus={!IS_TOUCH}
        // Left undefined on a mouse device so nothing about the desktop
        // behaviour changes.
        inputMode={IS_TOUCH ? (typingMode ? 'text' : 'none') : undefined}
        fullWidth
        sx={{
          minWidth: 0,
          // A solid paper surface against the page's own background, the
          // same as the cards it sits beside (category rail, product
          // tiles). Deliberately `background.paper` and not a hard-coded
          // white: white was right while this field was portaled onto the
          // old dark header bar, but on the page it left the input's
          // theme-coloured text sitting on a forced-white box — i.e.
          // near-white on white, unreadable, once the app was switched to
          // dark mode.
          '& .MuiOutlinedInput-root': {
            // Taller than MUI's `small` default (~40): this is the field a
            // cashier taps to type a name and the one a scanner types
            // into all shift, so it gets a full touch target rather than
            // the compact height the admin toolbars use.
            minHeight: 46,
            // Forced white rather than `background.paper`: this field now
            // sits on PosHeader's fixed navy, which does not follow the
            // app's light/dark setting, so a theme-driven surface would
            // turn near-black on a dark-mode terminal and swallow both the
            // placeholder and anything typed into it.
            bgcolor: '#fff',
            // A full pill here, unlike the squarer radius this carried
            // while it sat on the page: against a flat dark bar the
            // rounded ends are what separate the field from the band
            // behind it, and there is no neighbouring card for it to
            // match corners with any more.
            borderRadius: 999,
            '& input': { color: '#0f172a' },
            '& fieldset': { border: 'none' },
            '&:hover': { bgcolor: '#fff' },
            // A white ring, not the accent blue: on navy, blue-on-navy is
            // nearly invisible, so focus is shown by lifting the field off
            // the bar instead of tinting its edge.
            '&.Mui-focused': { bgcolor: '#fff', boxShadow: '0 0 0 3px rgba(255,255,255,0.25)' },
          },
        }}
        // F2 used to be spelled out in the placeholder; now shown as its
        // own small badge like every other shortcut (see KeyHint), so it
        // doesn't get lost in a long placeholder string on a narrower bar.
        trailingAdornment={
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            <KeyHint label="F2" />
            <Tooltip title="Scan a barcode, or type qty*barcode (e.g. 5*4800000000011) to add several at once">
              <IconButton size="small" aria-label="Scan barcode" tabIndex={-1} sx={{ color: 'text.secondary' }}>
                <QrCodeScannerIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        }
      />
      {/* Fixed-footprint slot, always present — toggling the spinner's opacity instead of
          mounting/unmounting it means the search field's own width never changes underneath it
          when a search starts or finishes. */}
      <Box sx={{ width: 14, height: 14, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={14} thickness={5} sx={{ color: POS_ACCENT, opacity: loading ? 1 : 0 }} />
      </Box>
    </Stack>
  );

  // The Category button and the grid/list toggle, as one unit — portaled
  // into PosHeader's dark bar when it supplies a slot (see the props), or
  // rendered inline above the grid when nothing does. Extracted into a
  // variable for exactly that reason: the same markup has to be able to
  // land in either place without being written twice.
  const controlsNode = (
    <>
        {/* The whole category picker, in one button. There is no strip of
            pills under this row any more: every product in this catalog
            carries a barcode, so a category is a fallback a cashier
            reaches for when a barcode won't read or a customer asks what
            is stocked — not the way items are normally found. A permanent
            row of chips charged the grid ~50px of height on every screen
            for that, where a button on a row that already exists charges
            nothing.

            The pill strip below the bar is now the primary way in, so
            this is the "see them all at once" escape hatch rather than
            the only door — but it keeps showing the active category's
            NAME, because on a narrow screen where the strip has scrolled
            the current filter off the side, this is the one place still
            saying which slice of the catalog the grid is showing. */}
        {categories.length > 0 && (
          <Tooltip title={categoryId === null ? 'Filter by category' : `Category: ${selectedCategoryName}. Click to change.`}>
            <Button
              onClick={() => setCategoryDialogOpen(true)}
              startIcon={<AppsIcon />}
              aria-label={categoryId === null ? 'Filter by category' : `Category: ${selectedCategoryName}`}
              sx={{
                flexShrink: 0,
                height: 46,
                px: { xs: 1.25, sm: 2 },
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 700,
                fontSize: 14.5,
                whiteSpace: 'nowrap',
                border: '1px solid',
                // White-on-navy rather than the page's own divider/text
                // tokens: this button sits on PosHeader's fixed dark band,
                // which ignores the app's light/dark setting, so theme
                // colours here would be styled against the wrong surface.
                borderColor: categoryId === null ? 'rgba(255,255,255,0.22)' : POS_ACCENT,
                // Transparent at rest, not paper — a solid white pill sat
                // in the same row as the equally white search field and
                // grid/list toggle, and the three together read as
                // separate cards rather than one toolbar. The border
                // already does the job of reading as a button rather than
                // dead space; only the ACTIVE state (a category picked)
                // still gets a solid fill, since that's the one moment
                // this button needs to stand out as "a filter is on".
                bgcolor: categoryId === null ? 'rgba(255,255,255,0.07)' : POS_ACCENT,
                color: '#fff',
                '&:hover': {
                  bgcolor: categoryId === null ? 'rgba(255,255,255,0.14)' : POS_ACCENT,
                  borderColor: categoryId === null ? 'rgba(255,255,255,0.35)' : POS_ACCENT,
                  color: '#fff',
                },
                // The icon alone on a phone. At 390px the search field is
                // the control that has to stay readable for a typed SKU,
                // and a category name as long as "Grocery & Canned Goods"
                // would take most of the row off it.
                '& .MuiButton-startIcon': { mr: { xs: 0, sm: 1 } },
              }}
            >
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                {categoryId === null ? 'Category' : selectedCategoryName}
              </Box>
            </Button>
          </Tooltip>
        )}
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          size="small"
          onChange={(_, v: ViewMode | null) => v && setViewMode(v)}
          // Transparent, not paper: a solid white pill next to the equally
          // white search field and the equally white Category button made
          // this row read as three separate cards glued together rather
          // than one toolbar. The 1px border every segment already carries
          // is what keeps this legible as a control rather than empty
          // space — matches the bordered-not-filled treatment the Category
          // button uses for its own resting state.
          // Hidden on a phone. Grid-versus-list is a preference; the
          // search field is the control a cashier actually works
          // through, and sharing the row with this left it 84px wide
          // showing "Search by p…" — unusable for reading back a typed
          // SKU or a scan. The grid is the sensible phone default and
          // the toggle returns as soon as there's room for both.
          sx={{ flexShrink: 0, display: { xs: 'none', sm: 'inline-flex' } }}
        >
          <ToggleButton value="grid" sx={toggleButtonSx} aria-label="Grid view">
            <Tooltip title="Grid view">
              <GridViewIcon fontSize="small" />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="list" sx={toggleButtonSx} aria-label="List view">
            <Tooltip title="List view">
              <ViewListIcon fontSize="small" />
            </Tooltip>
          </ToggleButton>
        </ToggleButtonGroup>
    </>
  );

  return (
    <Box sx={{ height: '100%', minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {/* Search field and controls render into PosHeader's dark bar when
          it offers a slot, and fall back to a row of their own here when
          it doesn't. createPortal moves only the DOM — every piece of
          state and every handler stays in this component, so the scanner,
          the debounce and the arrow-key navigation behave identically
          whichever side of the portal the markup is painted on. */}
      {searchPortalTarget ? createPortal(searchFieldNode, searchPortalTarget) : null}
      {controlsPortalTarget ? createPortal(controlsNode, controlsPortalTarget) : null}
      {(!searchPortalTarget || !controlsPortalTarget) && (
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexShrink: 0, mb: 1.25 }}>
          {!searchPortalTarget && searchFieldNode}
          {!controlsPortalTarget && controlsNode}
        </Stack>
      )}

      {/* The category strip. Back as a full row of labelled pills rather
          than the single Category button it was compressed into: with the
          search field and the view toggle both moved up to the top bar,
          this row's height is no longer competing with them for the same
          band, so the catalog's own sections can be on screen and one tap
          away instead of two taps behind a dialog. */}
      {categories.length > 0 && (
        <Box sx={{ flexShrink: 0, mb: 1.25, minWidth: 0 }}>
          <CategoryPills categories={categories} selected={categoryId} onSelect={setCategoryId} />
        </Box>
      )}

      {/* Only this results area scrolls — everything else in this panel, above and below it, stays put. */}
      {/* px/pt give a hovered card's shadow somewhere to land instead of
          being sliced off against the scroller's edge — the card itself no
          longer moves (see ProductCard), so this only has to accommodate
          the shadow. */}
      {/* One handler for both view modes: the keydown bubbles here from
          whichever tile has focus, and productGridNav works out the row
          width from the DOM rather than from which component rendered. */}
      <Box
        ref={resultsContainerRef}
        onKeyDown={handleResultsKeyDown}
        // A pointer press ends keyboard browsing, so clicking a card still
        // hands focus back to the search field for the next scan.
        onPointerDown={() => {
          keyboardBrowsingRef.current = false;
        }}
        sx={{ flex: 1, minHeight: 0, overflowY: 'auto', mt: 1.25, pt: 0.5, px: 0.5, pb: 0.5, ...THIN_SCROLLBAR_SX }}
      >
        {results.length === 0 && !loading ? (
          // Without this, a search that matches nothing just leaves a
          // blank panel, which reads as a broken screen rather than an
          // answer to what was typed.
          <Stack sx={{ alignItems: 'center', textAlign: 'center', py: 6, px: 2, color: 'text.secondary' }}>
            <SearchOffOutlinedIcon sx={{ fontSize: 44, opacity: 0.4, mb: 1.5 }} />
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
              {query.trim() ? `No products match "${query.trim()}"` : 'No products to show'}
            </Typography>
            <Typography variant="caption">
              {query.trim() ? 'Check the spelling, or try a different category.' : 'Pick another category, or clear the filters.'}
            </Typography>
          </Stack>
        ) : (
          <>
            {/* Placeholders rather than a spinner, and rendered inside the
                grid/table itself: on a first load they show the shape of
                what's coming instead of a blank panel, and on a scroll-in
                page they extend the existing columns so nothing jumps when
                the real rows arrive. */}
            {viewMode === 'grid' ? (
              <ProductGrid products={orderedResults} onAdd={handleAdd} onLongPress={handleLongPress} skeletonCount={gridSkeletons} />
            ) : (
              <ProductListView results={orderedResults} onAdd={handleAdd} onLongPress={handleLongPress} skeletonCount={listSkeletons} />
            )}
            {/* Invisible trigger for the next page — only mounted while
                there's actually more to fetch, so the observer has nothing
                to watch (and loadMore never fires) once the catalog ends. */}
            {hasMore && <Box ref={sentinelRef} sx={{ height: 1 }} />}
            {/* Closes the loop on a paged list: without it, a cashier who
                scrolls to the bottom can't tell whether that's the whole
                catalog or just the next batch failing to arrive. Only
                worth saying once more than one page has actually loaded. */}
            {!hasMore && !loading && !loadingMore && results.length > PAGE_SIZE && (
              <Typography
                variant="caption"
                sx={{ display: 'block', textAlign: 'center', py: 2.5, color: 'text.disabled' }}
              >
                {`All ${results.length} products loaded`}
              </Typography>
            )}
          </>
        )}
      </Box>

      <CategoryDialog
        open={categoryDialogOpen}
        onClose={() => setCategoryDialogOpen(false)}
        categories={categories}
        selected={categoryId}
        onSelect={setCategoryId}
      />

      <AddQuantityDialog
        product={quantifyProduct}
        onClose={() => setQuantifyProduct(null)}
        onConfirm={(quantity) => {
          // Only remember what to add — the add itself runs in onExited
          // below, once the dialog is actually off the screen.
          if (quantifyProduct) pendingAddRef.current = { product: quantifyProduct, quantity };
          setQuantifyProduct(null);
        }}
        onExited={() => {
          const pending = pendingAddRef.current;
          pendingAddRef.current = null;
          if (!pending) return;
          // onExited still runs *before* MUI actually pulls the dialog out
          // of the DOM, so doing the cart work here directly would block
          // with the dialog still on screen — exactly what this is trying
          // to avoid. rAF-then-timeout is the "after the browser has
          // painted" idiom: the dismissal is on screen first, then the
          // heavier cart update runs.
          requestAnimationFrame(() => {
            window.setTimeout(() => handleAdd(pending.product, pending.quantity), 0);
          });
        }}
      />
    </Box>
  );
}
