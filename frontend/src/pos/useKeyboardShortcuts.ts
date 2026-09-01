import { useEffect } from 'react';

interface Handlers {
  onSearch: () => void;
  onAddCustomer: () => void;
  onHold: () => void;
  onPay: () => void;
  onBagger: () => void;
  onReturn: () => void;
  onCancel: () => void;
  /** Disabled while any blocking dialog/popover is open, so e.g. F5 behind an open dialog doesn't also try to submit the sale underneath it. */
  enabled: boolean;
}

/**
 * F2 search / F3 customer / F4 bagger / F5 pay / F6 hold / F8 return /
 * F9 cancellation. (F7 was Refund, removed as a duplicate of Return — both
 * pointed at the same /admin/customers/returns screen — so F7 is
 * intentionally unbound rather than renumbering the rest. Bagger and Hold
 * later swapped keys — F4/F6 — per a direct request, so the case order
 * below no longer matches the numeric order and that's intentional.)
 * Search/Customer/Pay/Bagger DOM-click their Actions row pill (see
 * CartActionsRow's `id`s) rather than taking a lifted callback, since
 * Customer/Bagger's dialog state lives in ProductBrowser, not here;
 * Hold/Return/Cancel take a plain callback since PosScreen already owns
 * those handlers directly.
 * preventDefault() reliably suppresses F5's native refresh under
 * normal focused-tab conditions in Chrome/Edge/Firefox, but this isn't
 * guaranteed in every embedded/kiosk browser configuration — confirmed
 * manually during verification, not just assumed.
 */
export function useKeyboardShortcuts({ onSearch, onAddCustomer, onHold, onPay, onBagger, onReturn, onCancel, enabled }: Handlers) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // F5 is suppressed even while shortcuts are disabled — everything
      // else may fall through to the browser, but F5's native behaviour
      // is "reload", and the in-progress cart lives in React state that a
      // reload destroys. `enabled` goes false exactly when a dialog is
      // open (payment, close-register, receipt, void approval), which is
      // precisely when a cashier is reaching for the Pay shortcut, so
      // returning early here used to hand F5 straight to the browser and
      // wipe the sale. Suppress the reload always; still only ring up Pay
      // when the shortcuts are actually live.
      if (e.key === 'F5') {
        e.preventDefault();
        if (enabled) onPay();
        return;
      }

      if (!enabled) return;

      switch (e.key) {
        case 'F2':
          e.preventDefault();
          onSearch();
          break;
        case 'F3':
          e.preventDefault();
          onAddCustomer();
          break;
        case 'F4':
          e.preventDefault();
          onBagger();
          break;
        case 'F6':
          e.preventDefault();
          onHold();
          break;
        case 'F8':
          e.preventDefault();
          onReturn();
          break;
        case 'F9':
          e.preventDefault();
          onCancel();
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onSearch, onAddCustomer, onHold, onPay, onBagger, onReturn, onCancel]);
}
