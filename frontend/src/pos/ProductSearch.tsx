import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import GridViewIcon from '@mui/icons-material/GridView';
import ViewListIcon from '@mui/icons-material/ViewList';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import SearchOffOutlinedIcon from '@mui/icons-material/SearchOffOutlined';
import { api } from '../api/client';
import type { Category, ProductWithStorePrice } from '../api/types';
import { POS_ACCENT, THIN_SCROLLBAR_SX } from './format';
import { useSnackbar } from '../Snackbar';
import { SearchField } from '../SearchField';
import { KeyHint } from './KeyHint';
import { CategoryPills } from './CategoryPills';
import { ProductGrid } from './ProductGrid';
import { ProductListView } from './ProductListView';
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
  /** The Actions row — pinned below the results, outside the scrollable area. */
  bottomExtra?: ReactNode;
  /**
   * PosHeader's search-slot DOM node — when set, the search field portals
   * there instead of rendering inline here. All of this component's own
   * state and handlers (query, scanner mode, the debounced lookup, Esc/
   * Enter/arrow-key behaviour) are completely unaffected: a portal only
   * moves *where* a subtree paints, never which component owns its state
   * or which fiber it's part of, so the DOM id (`pos-product-search`)
   * every focus/shortcut lookup targets still resolves the same way.
   * Falls back to rendering inline when null/undefined — before the
   * header's ref attaches on first paint, and for any caller that never
   * passes one at all.
   */
  searchPortalTarget?: HTMLElement | null;
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
/**
 * A touch screen (phone/tablet) rather than a mouse. Read once at module
 * load: a device doesn't grow a mouse mid-shift, and re-evaluating per
 * render would only add churn.
 *
 * This is what separates the two very different scanning setups this
 * screen serves. With a mouse, holding focus on the search field costs
 * nothing and is what makes a keyboard-wedge scanner work hands-free.
 * On a touch device that same focus summons the on-screen keyboard over
 * half the screen and keeps re-summoning it after every add — see the
 * scanner/typing modes below.
 */
const IS_TOUCH = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches === true;

export function ProductSearch({ companyId, storeId, onAdd, bottomExtra, searchPortalTarget }: Props) {
  const notify = useSnackbar();
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
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
  function focusSearch() {
    requestAnimationFrame(() => {
      document.getElementById('pos-product-search')?.focus();
    });
  }

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
  }, [typingMode]);

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

  function handleAdd(product: ProductWithStorePrice) {
    onAdd(product);
    // Back to scanner mode after an add — staying in typing mode would pop
    // the keyboard open again on the refocus, the exact behaviour that made
    // the phone unusable. The effect above restores focus.
    if (IS_TOUCH && typingMode) setTypingMode(false);
    // Adding from the keyboard leaves focus on the tile, so the arrows can
    // carry straight on to the next product. Pulling focus back to the
    // search field here — right for a click — would end the run after one
    // item and make arrow browsing useless for a multi-item sale.
    else if (!keyboardBrowsingRef.current) focusSearch();
  }

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

  const toggleButtonSx = {
    gap: 0.5,
    px: 1.5,
    textTransform: 'none',
    fontWeight: 600,
    '&.Mui-selected': { bgcolor: `${POS_ACCENT}1a`, color: POS_ACCENT, '&:hover': { bgcolor: `${POS_ACCENT}26` } },
  } as const;

  // The search field + its loading spinner, as one unit — this is the part
  // that portals into PosHeader's dark bar (see searchPortalTarget on
  // Props). Kept as a local JSX variable rather than inline in the return
  // below so the exact same element tree can render in either of the two
  // spots without duplicating it.
  const searchFieldNode = (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
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
          // This field now lives on PosHeader's fixed-dark bar (or falls
          // back to sitting on a plain page background) — either way it
          // needs to read as a solid white pill regardless of the app's
          // own light/dark theme toggle, the same reasoning PosHeader
          // itself is a fixed colour rather than a themed one.
          '& .MuiOutlinedInput-root': {
            bgcolor: '#fff',
            // Squarer than SearchField's own pill default. That full
            // round is right for the short search boxes on the admin
            // toolbars, but this field is far wider, and at this length a
            // 999px radius turns the ends into big empty caps that push
            // the icon and the F2 badge inwards. Overridden here rather
            // than on SearchField itself so the admin toolbars keep the
            // shape they were designed with.
            borderRadius: 2,
            '&:hover': { bgcolor: '#fff' },
            '&.Mui-focused': { bgcolor: '#fff', boxShadow: `0 0 0 2px ${POS_ACCENT}` },
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

  return (
    <Box sx={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {searchPortalTarget ? createPortal(searchFieldNode, searchPortalTarget) : searchFieldNode}

      {/* Category pills + the grid/list toggle share a row now that the
          toggle no longer sits with the search field above — that field
          moved up onto PosHeader's bar, and the toggle belongs with what
          it's actually switching the view of. */}
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mt: 1.25, flexShrink: 0 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <CategoryPills categories={categories} selected={categoryId} onSelect={setCategoryId} />
        </Box>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          size="small"
          onChange={(_, v: ViewMode | null) => v && setViewMode(v)}
          sx={{ flexShrink: 0 }}
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
      </Stack>

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
        sx={{ flex: 1, minHeight: 0, overflowY: 'auto', mt: 1.25, pt: 0.5, px: 0.5, ...THIN_SCROLLBAR_SX }}
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
              <ProductGrid products={orderedResults} onAdd={handleAdd} skeletonCount={gridSkeletons} />
            ) : (
              <ProductListView results={orderedResults} onAdd={handleAdd} skeletonCount={listSkeletons} />
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

      {bottomExtra && <Box sx={{ mt: 1.25, flexShrink: 0 }}>{bottomExtra}</Box>}
    </Box>
  );
}
