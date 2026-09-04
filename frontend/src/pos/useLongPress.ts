import { useCallback, useRef } from 'react';
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';

/** How long a press has to hold before it counts as "long" rather than a tap/click. */
const LONG_PRESS_MS = 500;

/** Movement past this cancels the press — a scroll or drag isn't a long-press, and a shaky finger on a phone shouldn't accidentally trigger one either. */
const MOVE_CANCEL_PX = 10;

/**
 * A press-and-hold gesture, for products: short tap/click adds one unit as
 * it always has, and holding down opens the quantity dialog instead. Works
 * identically for touch, mouse, and pen — Pointer Events unify all three,
 * so a cashier holding the mouse button down on a desktop gets the same
 * quantity dialog a tablet's touch-and-hold does.
 *
 * Spread the returned handlers onto the pressable element; also check
 * `wasLongPress()` at the top of that element's own `onClick` and bail out
 * if it returns true — pointerup still fires a real `click` event right
 * after a long-press ends, and without that check the dialog would open
 * *and* the product would get added for one unit in the same gesture.
 */
export function useLongPress(onLongPress: () => void, enabled = true) {
  const timerRef = useRef<number | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const firedRef = useRef(false);

  const clear = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      if (!enabled) return;
      // Ignore a right-click/secondary button — only a real press-and-hold
      // (button 0, or a touch/pen contact, which report button -1) counts.
      if (e.button > 0) return;
      firedRef.current = false;
      startRef.current = { x: e.clientX, y: e.clientY };
      clear();
      timerRef.current = window.setTimeout(() => {
        firedRef.current = true;
        onLongPress();
      }, LONG_PRESS_MS);
    },
    [enabled, onLongPress, clear],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent) => {
      const start = startRef.current;
      if (!start) return;
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > MOVE_CANCEL_PX) clear();
    },
    [clear],
  );

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
    // Stops a touch-and-hold from also popping the browser's own
    // copy/save-image context menu on top of the quantity dialog.
    onContextMenu: (e: ReactMouseEvent) => {
      if (enabled) e.preventDefault();
    },
    /** True exactly once, immediately after a press fired as "long" — see the doc above for why the caller's onClick needs this. */
    wasLongPress: () => {
      const was = firedRef.current;
      firedRef.current = false;
      return was;
    },
  };
}
