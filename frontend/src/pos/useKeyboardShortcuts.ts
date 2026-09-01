import { useEffect } from 'react';

interface Handlers {
  onSearch: () => void;
  onAddCustomer: () => void;
  onHold: () => void;
  onPay: () => void;
  onBagger: () => void;
  onRefund: () => void;
  onReturn: () => void;
  onCancel: () => void;
  /** Disabled while any blocking dialog/popover is open, so e.g. F5 behind an open dialog doesn't also try to submit the sale underneath it. */
  enabled: boolean;
}

/**
 * F2 search / F3 add customer / F4 hold / F5 pay / F6 bagger / F7 refund /
 * F8 return / F9 cancellation. Search/Add Customer/Pay/Bagger DOM-click
 * their Actions row pill (see CartActionsRow's `id`s) rather than taking
 * a lifted callback, since Add Customer/Bagger's dialog state lives in
 * ProductBrowser, not here; Hold/Refund/Return/Cancel take a plain
 * callback since PosScreen already owns those handlers directly.
 * preventDefault() reliably suppresses F5's native refresh under
 * normal focused-tab conditions in Chrome/Edge/Firefox, but this isn't
 * guaranteed in every embedded/kiosk browser configuration — confirmed
 * manually during verification, not just assumed.
 */
export function useKeyboardShortcuts({ onSearch, onAddCustomer, onHold, onPay, onBagger, onRefund, onReturn, onCancel, enabled }: Handlers) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
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
          onHold();
          break;
        case 'F5':
          e.preventDefault();
          onPay();
          break;
        case 'F6':
          e.preventDefault();
          onBagger();
          break;
        case 'F7':
          e.preventDefault();
          onRefund();
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
  }, [enabled, onSearch, onAddCustomer, onHold, onPay, onBagger, onRefund, onReturn, onCancel]);
}
