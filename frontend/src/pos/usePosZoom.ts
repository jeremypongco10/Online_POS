import { useCallback, useEffect, useRef, useState } from 'react';

/** The screen this layout was designed against. Anything smaller gets scaled down toward it. */
const DESIGN_WIDTH = 1440;
const DESIGN_HEIGHT = 900;

/**
 * Shared floor for both the automatic fit and a cashier's manual zoom-out.
 * Below roughly three-quarter scale the receipt text and the Actions row
 * stop being comfortably readable across a counter, which costs more than
 * the extra products it buys back.
 */
const MIN_ZOOM = 0.75;

/**
 * Outer sanity bound for a manual zoom-in — in practice the live safety net
 * below (MIN_SEARCH_WIDTH) almost always caps things sooner than this. The
 * automatic fit never goes past 1 on its own; this just says a cashier is
 * never allowed to ask for more than 50% larger, however much room there is.
 */
const MAX_ZOOM = 1.5;

/**
 * Below this the layout stacks into its mobile form, which is a different
 * problem: there the screen is small because the *device* is small, so
 * scaling down shrinks touch targets and text on a display already held at
 * arm's length. Zooming — automatic or manual — is only for a desktop/
 * terminal screen running the two-column layout in less room than it
 * wants. Matches MUI's `md` breakpoint, which is where PosScreen itself
 * switches between the stacked and two-column layouts.
 */
const MIN_WIDTH_TO_ZOOM = 900;

const ZOOM_STEP = 0.05;

/** Per-terminal, not per-user: a monitor's comfortable size doesn't change with whoever is signed in, so this deliberately survives logout. */
const STORAGE_KEY = 'pos_zoom_override';

const SEARCH_FIELD_ID = 'pos-product-search';

/**
 * The floor the corrective effect below enforces on the product search
 * field's real rendered width. This isn't cosmetic: PosHeader's logo, help/
 * cash-movement icons, and this very zoom control are all fixed-width, so
 * zooming in shrinks the *logical* space available to lay everything out —
 * past a point, only the one flexible element left (the search field) pays
 * for it. Measured directly (not derived from a fixed max-zoom percentage)
 * because the actual safe ceiling depends on the window's width, which a
 * single constant can't account for: at a 1440px-wide window the field was
 * still 128px at 130% zoom, but at the 900px floor where zoom controls
 * start being offered at all, it was already down to 11px at just 100%.
 */
const MIN_SEARCH_WIDTH = 160;

function clamp(zoom: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
}

function computeAutoZoom(): number {
  if (window.innerWidth < MIN_WIDTH_TO_ZOOM) return 1;
  // Both axes matter and the tighter one wins: a 1366x768 laptop is
  // constrained by height, a narrow-but-tall window by width.
  const fit = Math.min(window.innerWidth / DESIGN_WIDTH, window.innerHeight / DESIGN_HEIGHT);
  // Only ever scale down — see MAX_ZOOM above for why zooming in past 1 is
  // left to a deliberate manual request instead of happening on its own.
  return Math.max(MIN_ZOOM, Math.min(1, fit));
}

function readOverride(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const n = raw === null ? NaN : Number(raw);
    return Number.isFinite(n) ? clamp(n) : null;
  } catch {
    // Private browsing / storage disabled — the control still works for
    // this page view, it just starts from the auto-fit size every time.
    return null;
  }
}

function writeOverride(zoom: number | null) {
  try {
    if (zoom === null) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, String(zoom));
  } catch {
    // Same as above — nothing to recover from, nothing to surface.
  }
}

export interface PosZoomControl {
  /** Whole-number percent of the zoom actually applied right now, for display. */
  percent: number;
  zoomIn: () => void;
  zoomOut: () => void;
  /** Drops the manual override and goes back to the screen-fit size. */
  reset: () => void;
  canZoomIn: boolean;
  canZoomOut: boolean;
  /** True once the cashier has stepped away from the auto-fit size — lets the header show "reset" only when there's something to reset. */
  isManual: boolean;
}

/**
 * Scales the whole page so a cashier sees more of the product grid than a
 * cramped window would otherwise show (at 1280x720 that recovered roughly
 * half the grid), while still leaving them a manual override for a screen
 * where the automatic choice isn't the one they want.
 *
 * Applied to <html> rather than to the POS container, deliberately. Every
 * MUI Dialog, Menu, Popover and Snackbar renders through a portal attached
 * to <body>, i.e. outside the POS subtree — scoping the zoom to that
 * subtree would leave dialogs rendering at full size over a scaled page,
 * and would leave popover positioning reading anchor coordinates from a
 * differently-scaled context. The root covers the portals too.
 *
 * Scoped to the POS screen's lifetime so the Back Office, which has its own
 * scrolling layout and no need for this, is untouched.
 */
export function usePosZoom(): PosZoomControl {
  const [override, setOverrideState] = useState<number | null>(() => readOverride());
  const [autoZoom, setAutoZoom] = useState<number>(() => computeAutoZoom());
  // True once a step has been measured, against the real DOM, to squeeze
  // the search field below MIN_SEARCH_WIDTH — see the corrective effect
  // below. Blocks further zoom-in until the window is resized or the
  // cashier zooms back out, rather than let another click repeat the same
  // failure.
  const [ceilingReached, setCeilingReached] = useState(false);

  useEffect(() => {
    const onResize = () => {
      setAutoZoom(computeAutoZoom());
      // A wider window may now have room the old one didn't.
      setCeilingReached(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const zoom = override ?? autoZoom;
  // Same width gate computeAutoZoom applies internally — repeated here so
  // a manual preference set on a wide window doesn't get carried into the
  // mobile stacked layout if the window is later narrowed into it.
  const applied = window.innerWidth < MIN_WIDTH_TO_ZOOM ? 1 : zoom;

  useEffect(() => {
    if (applied === 1) {
      // Leave the property alone entirely at 1, rather than writing "1" —
      // an untouched root is the cleanest possible no-op for the browsers
      // (and any future one) that treat zoom differently.
      document.documentElement.style.removeProperty('zoom');
      document.documentElement.style.removeProperty('--pos-zoom');
      return;
    }
    document.documentElement.style.setProperty('zoom', String(applied));
    // Published so the POS root can size itself against the *zoomed*
    // viewport. Viewport units are resolved before zoom scales them down,
    // so a plain 100dvh root ends up only `zoom` of the screen tall and
    // leaves a dead strip along the bottom — at 1366x768 that was 113px of
    // empty background. Dividing by this cancels it.
    document.documentElement.style.setProperty('--pos-zoom', String(applied));
  }, [applied]);

  // Separate from the effect above on purpose: that one re-runs on every
  // zoom change and must only ever *set* the current value, not remove it
  // first — a remove-then-set on each change would flash the page back to
  // 1 for a frame on every click of the controls below.
  useEffect(
    () => () => {
      document.documentElement.style.removeProperty('zoom');
      document.documentElement.style.removeProperty('--pos-zoom');
    },
    [],
  );

  // Read inside the corrective effect via a ref, not as a dependency: the
  // effect must run every time `applied` changes (a zoom-in click), but
  // NOT re-run merely because correcting itself changes `override` — that
  // self-triggered re-run is exactly how the correction cascades down
  // (each pass reacts to the new, lower `applied`), and adding override as
  // a dependency would only make the intent harder to follow, not change
  // when it actually needs to run.
  const overrideRef = useRef(override);
  overrideRef.current = override;
  const autoZoomRef = useRef(autoZoom);
  autoZoomRef.current = autoZoom;

  const setOverride = useCallback((next: number | null) => {
    setOverrideState(next);
    writeOverride(next);
  }, []);

  // The live safety net: confirms, against the real DOM, that whatever was
  // just applied hasn't squeezed the product search field — the one field
  // a barcode scanner and every typed search depends on — below a usable
  // width. If it's too narrow, back off one step; since backing off
  // changes `applied` again, this re-fires and keeps stepping down until
  // it's safe (or hits MIN_ZOOM, at which point stepping down no longer
  // changes anything and React drops the redundant state update, ending
  // the cascade).
  //
  // Polls across a few frames rather than checking once: the field isn't
  // in the DOM this hook's very first commit (it reaches its slot in
  // PosHeader via a portal, which needs an extra render after the slot's
  // ref attaches), so a single rAF on mount — with a persisted override
  // from a previous, wider window — would find nothing yet, skip the
  // check, and never get another chance since `applied` doesn't change
  // again on its own. Once the field exists this resolves on the very
  // first frame, same as before, for every later click of the controls.
  useEffect(() => {
    let frame = 0;
    let attempts = 0;
    const MAX_ATTEMPTS = 90; // ~1.5s at 60fps — generous for the portal to connect, bounded so this can't poll forever if the field is never on screen.

    const check = () => {
      const field = document.getElementById(SEARCH_FIELD_ID);
      const rect = field?.getBoundingClientRect();
      // Height, not width, is the "has this actually been laid out yet"
      // signal: a zero WIDTH is exactly the real failure this is looking
      // for (that's the whole bug — the field can collapse to a true 0),
      // so excluding it here would skip the one case that matters most.
      if (!field || rect!.height === 0) {
        if (++attempts < MAX_ATTEMPTS) frame = requestAnimationFrame(check);
        return;
      }
      if (rect!.width < MIN_SEARCH_WIDTH) {
        setCeilingReached(true);
        setOverride(clamp((overrideRef.current ?? autoZoomRef.current) - ZOOM_STEP));
      }
    };

    frame = requestAnimationFrame(check);
    return () => cancelAnimationFrame(frame);
  }, [applied, setOverride]);

  const step = useCallback(
    (delta: number) => {
      setCeilingReached(false);
      // Steps from wherever the page is actually sitting right now — the
      // auto-fit size, if the cashier hasn't touched the controls yet —
      // so the first click moves visibly from what's on screen instead of
      // jumping from some other baseline.
      setOverride(clamp((override ?? autoZoom) + delta));
    },
    [override, autoZoom, setOverride],
  );

  return {
    percent: Math.round(applied * 100),
    zoomIn: () => step(ZOOM_STEP),
    zoomOut: () => step(-ZOOM_STEP),
    reset: () => {
      setCeilingReached(false);
      setOverride(null);
    },
    canZoomIn: zoom < MAX_ZOOM - 1e-9 && !ceilingReached,
    canZoomOut: zoom > MIN_ZOOM + 1e-9,
    isManual: override !== null,
  };
}
