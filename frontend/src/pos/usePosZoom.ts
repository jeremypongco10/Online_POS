import { useEffect } from 'react';

/** The screen this layout was designed against. Anything smaller gets scaled down toward it. */
const DESIGN_WIDTH = 1440;
const DESIGN_HEIGHT = 900;

/**
 * Never shrink past this. Below roughly three-quarter scale the receipt
 * text and the Actions row stop being comfortably readable across a
 * counter, which costs more than the extra products it buys back.
 */
const MIN_ZOOM = 0.75;

/**
 * Below this the layout stacks into its mobile form, which is a different
 * problem: there the screen is small because the *device* is small, so
 * scaling down shrinks touch targets and text on a display already held at
 * arm's length. Zooming is only for a desktop/terminal screen that is
 * running the two-column layout in less room than it wants.
 */
const MIN_WIDTH_TO_ZOOM = 900;

function computeZoom(): number {
  if (window.innerWidth < MIN_WIDTH_TO_ZOOM) return 1;
  // Both axes matter and the tighter one wins: a 1366x768 laptop is
  // constrained by height, a narrow-but-tall window by width.
  const fit = Math.min(window.innerWidth / DESIGN_WIDTH, window.innerHeight / DESIGN_HEIGHT);
  // Only ever scale down — on a larger-than-design monitor the layout
  // already spreads out on its own, and magnifying it would just waste
  // the extra pixels it earned.
  return Math.max(MIN_ZOOM, Math.min(1, fit));
}

/**
 * Scales the whole page down on a screen smaller than the layout was drawn
 * for, so a cashier sees more of the product grid instead of scrolling for
 * it (at 1280x720 that was 12 of 25 products visible; scaling recovers a
 * large chunk of the rest).
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
export function usePosZoom() {
  useEffect(() => {
    const apply = () => {
      const zoom = computeZoom();
      // Leave the property alone entirely at 1, rather than writing "1" —
      // an untouched root is the cleanest possible no-op for the browsers
      // (and any future one) that treat zoom differently.
      if (zoom === 1) {
        document.documentElement.style.removeProperty('zoom');
        document.documentElement.style.removeProperty('--pos-zoom');
        return;
      }

      document.documentElement.style.setProperty('zoom', String(zoom));
      // Published so the POS root can size itself against the *zoomed*
      // viewport. Viewport units are resolved before zoom scales them
      // down, so a plain 100dvh root ends up only `zoom` of the screen
      // tall and leaves a dead strip along the bottom — at 1366x768 that
      // was 113px of empty background. Dividing by this cancels it.
      document.documentElement.style.setProperty('--pos-zoom', String(zoom));
    };

    apply();
    window.addEventListener('resize', apply);
    return () => {
      window.removeEventListener('resize', apply);
      document.documentElement.style.removeProperty('zoom');
      document.documentElement.style.removeProperty('--pos-zoom');
    };
  }, []);
}
