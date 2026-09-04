/**
 * The one list of POS keyboard shortcuts. Both the handler that binds them
 * (useKeyboardShortcuts) and the Help dialog that documents them read from
 * here, so the two can't drift — the old bottom-of-screen legend was a
 * hand-maintained second copy, and it did drift: it still advertised "F7
 * Refund" after the Refund button had been removed.
 */
export type PosShortcutAction =
  | 'search'
  | 'customer'
  | 'bagger'
  | 'pay'
  | 'hold'
  | 'reprint'
  | 'return'
  | 'cancel'
  | 'cart'
  | 'help';

export interface PosShortcut {
  key: string;
  /** The control this drives, named as it appears on screen. */
  label: string;
  detail: string;
  /**
   * The handler this key runs, for the keys bound globally. Left off for
   * keys whose own control handles them: Enter, Esc and the arrows only
   * mean anything relative to what currently has focus, so binding them
   * globally would (for instance) swallow the Esc that closes a dialog.
   * They're still listed here because a cashier needs to know about them.
   */
  action?: PosShortcutAction;
}

export type BoundShortcut = PosShortcut & { action: PosShortcutAction };

export const POS_SHORTCUTS: PosShortcut[] = [
  { key: 'F1', action: 'help', label: 'Help', detail: 'Open this list of controls and shortcuts.' },
  { key: 'F2', action: 'search', label: 'Search products', detail: 'Jump to the search box to type a name, barcode or SKU.' },
  { key: 'F3', action: 'customer', label: 'Customer', detail: 'Attach a customer to the sale by customer number, or search for one.' },
  { key: 'F4', action: 'bagger', label: 'Bagger', detail: 'Assign the bagger credited for this sale.' },
  { key: 'F5', action: 'pay', label: 'Pay', detail: 'Open payment to take cash or another tender and close the sale.' },
  { key: 'F6', action: 'hold', label: 'Hold', detail: 'Park the current cart so the next customer can be served, and resume it later from the account menu.' },
  // Does double duty, and only one half runs through the global handler
  // below. With no receipt on screen, F7 opens the invoice lookup
  // (ReprintReceiptDialog) via the 'reprint' action here. But the moment
  // a receipt IS on screen — right after checkout, or after that lookup
  // finds one — the global handler is disabled entirely (blockingDialogOpen
  // in PosScreen), so F7 falls through to ReceiptModal's own local
  // listener instead, which just prints what's already showing. Same key,
  // whichever half currently applies; documented once, here, either way.
  { key: 'F7', action: 'reprint', label: 'Reprint receipt', detail: 'Look up a past sale by invoice number and print its receipt. While a receipt is already on screen, prints that one instead.' },
  { key: 'F8', action: 'return', label: 'Return', detail: 'Open the Returns screen in the Back Office to process a past sale.' },
  { key: 'F9', action: 'cancel', label: 'Cancel Sale', detail: 'Clear the whole cart. Asks for confirmation, and may need supervisor approval.' },
  { key: 'F10', action: 'cart', label: 'Select cart line', detail: 'Select the first item in the cart, then step through with the arrow keys. Esc clears the selection. The search box keeps focus throughout, so a scan still rings up normally.' },

  // Movement around the results. Bound by the search field and the results
  // container themselves rather than globally, since each only applies
  // while that part of the screen has focus.
  { key: '↓', label: 'Browse products', detail: 'From the search box, drop into the product list to pick with the arrow keys instead of the mouse.' },
  { key: '↑ ↓ ← →', label: 'Move between products', detail: 'Step around the product list. Home and End jump to the first and last product.' },
  { key: 'Enter', label: 'Add to cart', detail: 'Adds the highlighted product. In the search box, an exact barcode or SKU match is added straight away.' },
  { key: 'Esc', label: 'Back to search', detail: 'From the product list, returns to the search box. In the search box, clears what has been typed.' },
];

/** Everything the global handler binds — the focus-dependent keys above are left to their own controls. */
export const BOUND_SHORTCUTS: BoundShortcut[] = POS_SHORTCUTS.filter(
  (s): s is BoundShortcut => s.action !== undefined,
);
