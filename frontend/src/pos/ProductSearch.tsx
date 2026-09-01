import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
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
import { formatMoney, POS_ACCENT, THIN_SCROLLBAR_SX } from './format';
import { useSnackbar } from '../Snackbar';
import { SearchField } from '../SearchField';
import { CategoryPills } from './CategoryPills';
import { ProductGrid } from './ProductGrid';

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

interface Props {
  companyId: number;
  storeId: number | null;
  onAdd: (product: ProductWithStorePrice, quantity?: number) => void;
  /** The Actions row — pinned below the results, outside the scrollable area. */
  bottomExtra?: ReactNode;
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

export function ProductSearch({ companyId, storeId, onAdd, bottomExtra }: Props) {
  const notify = useSnackbar();
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [results, setResults] = useState<ProductWithStorePrice[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      setLoading(true);
      const params = new URLSearchParams({
        company_id: String(companyId),
        store_id: String(storeId),
        is_active: '1',
        // 100 is the backend's own hard cap (ProductsController) — high
        // enough that a real catalog isn't silently truncated the way a
        // smaller page size was (a 25th product never showed under "All"
        // with no way to reach it, since this grid has no pagination UI).
        per_page: '100',
      });
      if (query.trim() !== '') params.set('q', query.trim());
      if (categoryId !== null) params.set('category_id', String(categoryId));

      api
        .get<ProductWithStorePrice[]>(`/products?${params.toString()}`)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, categoryId, companyId, storeId]);

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
    else focusSearch();
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

  const toggleButtonSx = {
    gap: 0.5,
    px: 1.5,
    textTransform: 'none',
    fontWeight: 600,
    '&.Mui-selected': { bgcolor: `${POS_ACCENT}1a`, color: POS_ACCENT, '&:hover': { bgcolor: `${POS_ACCENT}26` } },
  } as const;

  return (
    <Box sx={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexShrink: 0 }}>
        <SearchField
          id="pos-product-search"
          value={query}
          onChange={setQuery}
          onKeyDown={handleSearchKeyDown}
          onBlur={handleSearchBlur}
          onPointerDown={handleSearchPointerDown}
          placeholder="Search by product name, barcode or SKU"
          // autoFocus opens the on-screen keyboard on a phone the instant the
          // screen loads. Touch gets focus from the mount effect above
          // instead, in scanner mode, so scanning works with no keyboard.
          autoFocus={!IS_TOUCH}
          // Left undefined on a mouse device so nothing about the desktop
          // behaviour changes.
          inputMode={IS_TOUCH ? (typingMode ? 'text' : 'none') : undefined}
          fullWidth
          // Overrides SearchField's own 260px floor — on a narrow phone the
          // toolbar has less than 260px to spare once the view toggle, the
          // overflow menu, and the account avatar are accounted for, and
          // without this the avatar gets pushed past the edge of the
          // viewport and becomes completely unreachable.
          sx={{ minWidth: 0 }}
          trailingAdornment={
            <Tooltip title="Scan a barcode, or type qty*barcode (e.g. 5*4800000000011) to add several at once">
              <IconButton size="small" aria-label="Scan barcode" tabIndex={-1} sx={{ color: 'text.secondary' }}>
                <QrCodeScannerIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          }
        />
        {/* Fixed-footprint slot, always present — toggling the spinner's opacity instead of
            mounting/unmounting it means the toolbar's height never changes, so category pills
            and the results grid below never jump when a search starts or finishes. */}
        <Box sx={{ width: 14, height: 14, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress size={14} thickness={5} sx={{ color: POS_ACCENT, opacity: loading ? 1 : 0 }} />
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

      <Box sx={{ mt: 1.25, flexShrink: 0 }}>
        <CategoryPills categories={categories} selected={categoryId} onSelect={setCategoryId} />
      </Box>

      {/* Only this results area scrolls — everything else in this panel, above and below it, stays put. */}
      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', mt: 1.25, pr: 0.5, ...THIN_SCROLLBAR_SX }}>
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
        ) : viewMode === 'grid' ? (
          <ProductGrid products={results} onAdd={handleAdd} />
        ) : (
          <ProductListView results={results} onAdd={handleAdd} />
        )}
      </Box>

      {bottomExtra && <Box sx={{ mt: 1.25, flexShrink: 0 }}>{bottomExtra}</Box>}
    </Box>
  );
}

function ProductListView({
  results,
  onAdd,
}: {
  results: ProductWithStorePrice[];
  onAdd: (product: ProductWithStorePrice) => void;
}) {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: 'hidden' }}>
      <List disablePadding>
        {results.map((p, i) => {
          const unpriced = p.selling_price === null;
          return (
            <ListItemButton
              key={p.id}
              divider={i < results.length - 1}
              disabled={unpriced}
              onClick={() => !unpriced && onAdd(p)}
              sx={{ py: 1.25, px: 2 }}
            >
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 1.5 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                    {p.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {p.sku}
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 700, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', color: unpriced ? 'error.main' : POS_ACCENT }}
                >
                  {unpriced ? 'No price' : formatMoney(parseFloat(p.selling_price as string))}
                </Typography>
              </Stack>
            </ListItemButton>
          );
        })}
      </List>
    </Paper>
  );
}
