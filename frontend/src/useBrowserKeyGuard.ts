import { useEffect } from 'react';

/**
 * Suppresses the browser's own F5 (reload) and F1 (help) for the whole app.
 *
 * This deliberately sits at the app root rather than in the POS screen.
 * useKeyboardShortcuts already suppressed both, but only while PosScreen was
 * mounted — so F5 still reloaded on the login screen and, more importantly,
 * anywhere in the Back Office. That is a reachable accident, not a corner
 * case: F8 (Return) is itself a POS shortcut that navigates to the Back
 * Office, so a cashier can be one keystroke away from a screen where the
 * next F5 is a real refresh.
 *
 * Reloading is destructive on a till: the in-progress cart lives in React
 * state, so a refresh silently empties it mid-sale. F5 also sits next to
 * Pay in muscle memory, which is exactly why it was chosen for Pay.
 *
 * Testing `e.key` alone (not the modifiers) also covers Ctrl+F5 / Shift+F5,
 * since those still report key === 'F5'. Ctrl+R is deliberately left alone
 * as a deliberate, two-handed way to actually reload when someone means to.
 *
 * Caveat worth keeping honest: preventDefault reliably suppresses F5 in a
 * normal focused tab in Chrome/Edge/Firefox, but a browser-level accelerator
 * isn't guaranteed to be cancellable in every embedded or kiosk shell.
 */
export function useBrowserKeyGuard() {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'F5' || e.key === 'F1') e.preventDefault();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
