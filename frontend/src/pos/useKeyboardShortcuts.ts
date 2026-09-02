import { useEffect } from 'react';
import { BOUND_SHORTCUTS, type PosShortcutAction } from './posShortcuts';

type Handlers = Record<PosShortcutAction, () => void> & {
  /** Disabled while any blocking dialog/popover is open, so e.g. F5 behind an open dialog doesn't also try to submit the sale underneath it. */
  enabled: boolean;
};

/**
 * Binds the shortcuts declared in posShortcuts.ts — that list is what the
 * Help dialog documents, so keys, labels and behaviour can't drift apart.
 * (F7 is intentionally unbound: it was Refund, removed as a duplicate of
 * Return, and renumbering the rest would have retrained everyone for
 * nothing. Bagger and Hold swapped to F4/F6 per a direct request.)
 *
 * Search/Customer/Bagger/Pay/Help DOM-click their own control rather than
 * taking a lifted callback, since those controls' open state lives in
 * ProductBrowser or PosHeader rather than in PosScreen; Hold/Return/Cancel
 * take a plain callback because PosScreen already owns those handlers.
 *
 * Suppressing the browser's own F5/F1 is not this hook's job — that lives
 * in useBrowserKeyGuard at the app root, so it holds on every screen rather
 * than only while the register is on screen.
 */
export function useKeyboardShortcuts(handlers: Handlers) {
  const { enabled } = handlers;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const shortcut = BOUND_SHORTCUTS.find((s) => s.key === e.key);
      if (!shortcut) return;

      // No special case for F5/F1 here any more: useBrowserKeyGuard at the
      // app root suppresses the browser's reload and help unconditionally,
      // on every screen, so returning early while a dialog is open can no
      // longer hand F5 to the browser and lose the in-progress sale.
      if (!enabled) return;

      e.preventDefault();
      handlers[shortcut.action]();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handlers]);
}
