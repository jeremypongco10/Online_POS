/**
 * The POS screen's own accent — a saturated blue, deliberately not
 * theme.palette.primary.main (the app-wide indigo). Scoped to POS via
 * explicit hex rather than a second ThemeProvider: cheaper and lower-risk
 * than re-theming, and the rest of the app (Back Office included) is
 * intentionally left on the indigo theme.
 */
export const POS_ACCENT = '#2563eb';

/**
 * PosHeader's own bar colour — a fixed dark navy, deliberately independent
 * of the app's light/dark theme toggle rather than switching with it (the
 * design this mirrors keeps its top bar dark regardless of light/dark
 * mode). Everything painted on this bar — the logo swap, icon colours, the
 * search pill's own background — is forced to match this rather than to
 * theme.palette, the same reasoning ReceiptPanel forces its own light
 * scheme regardless of the app-wide setting.
 */
export const POS_HEADER_BG = '#12163a';

/**
 * One tint per POS action, carried by that action's icon chip wherever it
 * appears — the buttons in CartActionsRow and the same actions listed in
 * PosHelpDialog.
 *
 * Not decoration for its own sake: a row of identically grey controls
 * gives a cashier nothing to aim at but the words, which is the slow way
 * to find a button pressed hundreds of times a shift. A colour per action
 * is what actually becomes muscle memory — and it only works if the same
 * action is the same colour everywhere, which is why this lives here
 * rather than in either component.
 *
 * Customer/Bagger/Discount deliberately reuse the exact hues their own
 * icons already wear in DiscountDialog's TYPE_FACE (rose for the
 * SellOutlined tag, cyan for the Inventory2 box), so the same glyph never
 * means two different colours in two places. Cancel keeps red on its own,
 * since that one is about consequence rather than identity; `keys` is the
 * neutral slate for the focus-dependent keys (arrows, Enter, Esc) that
 * aren't an action at all.
 */
export const POS_ACTION_TINTS = {
  customer: POS_ACCENT,
  bagger: '#0891b2',
  discount: '#e11d48',
  // Distinct from Cancel Sale's stronger, saturated red — this removes
  // one item, not the whole sale, so it reads as "requires care" rather
  // than "about to destroy everything", the way Cancel's colour needs to.
  voidItem: '#ea580c',
  return: '#7c3aed',
  reprint: '#0d9488',
  cancel: '#dc2626',
  shortcuts: '#64748b',
  search: POS_ACCENT,
  pay: '#16a34a',
  hold: '#f59e0b',
  cart: '#0891b2',
  keys: '#64748b',
} as const;

/**
 * The raised treatment the Pay button wears, as a spreadable sx fragment
 * so every primary button in the POS gets it from one place instead of
 * each dialog growing its own near-miss version. Started life inline on
 * Pay; pulled out here the moment a second button wanted it.
 *
 * Deliberately only the *effect* — surface, shadow, and the hover/press/
 * disabled states. Shape is left to the caller, because the callers
 * genuinely differ and those differences are intentional: PaymentPanel's
 * confirm is a pill, DiscountDialog's has its own minimum height, Pay
 * runs the full width of the receipt column.
 *
 * The lighter top edge is a translucent white overlay laid over the flat
 * colour rather than a gradient between two hand-picked shades. That's
 * what lets this work for any tint it's handed — POS blue, the theme's
 * indigo, the red on a void — without needing a lightened and darkened
 * variant of each one defined somewhere. Hover swaps to a black overlay
 * for the same reason.
 *
 * `&.Mui-disabled` has to spell out the reset. MUI's own disabled rule
 * only clears background-*color*, and the overlay above is a
 * background-*image*, so without this a disabled button would keep its
 * live surface and only lose the colour underneath it.
 */
export function posRaisedButtonSx(tint: string = POS_ACCENT) {
  return {
    background: `linear-gradient(180deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0) 100%), ${tint}`,
    boxShadow: `0 8px 20px -10px ${tint}, 0 1px 2px rgba(16, 24, 40, 0.16)`,
    transition: 'background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease',
    '&:hover': {
      background: `linear-gradient(180deg, rgba(0, 0, 0, 0.06) 0%, rgba(0, 0, 0, 0.16) 100%), ${tint}`,
      boxShadow: `0 12px 24px -10px ${tint}, 0 1px 2px rgba(16, 24, 40, 0.2)`,
      transform: 'translateY(-1px)',
    },
    '&:active': { transform: 'translateY(0)', boxShadow: `0 4px 10px -6px ${tint}` },
    '&.Mui-disabled': {
      background: 'none',
      backgroundImage: 'none',
      bgcolor: 'action.disabledBackground',
      boxShadow: 'none',
      transform: 'none',
    },
  };
}

/**
 * The POS screen fits the viewport exactly (no page-level scrollbar) — each
 * column scrolls internally instead when its content overflows. A slim,
 * visible scrollbar is the affordance that tells someone more content sits
 * below the fold; without it, a column that just ends mid-row reads as
 * broken/cut-off rather than scrollable.
 */
export const THIN_SCROLLBAR_SX = {
  scrollbarWidth: 'thin',
  scrollbarColor: 'var(--mui-palette-action-disabled) transparent',
  '&::-webkit-scrollbar': { width: 8 },
  '&::-webkit-scrollbar-track': { background: 'transparent' },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: 'var(--mui-palette-action-disabled)',
    borderRadius: 999,
  },
  '&::-webkit-scrollbar-thumb:hover': {
    backgroundColor: 'var(--mui-palette-action-active)',
  },
} as const;

/** Used only where a horizontal scroller already has its own visible affordance (e.g. CategoryPills' "more" chevron) — a second scrollbar under it would be redundant. */
export const HIDDEN_SCROLLBAR_SX = {
  scrollbarWidth: 'none',
  msOverflowStyle: 'none',
  '&::-webkit-scrollbar': { display: 'none' },
} as const;

/**
 * The BIR receipt flag for a cart line — V(atable), E(xempt),
 * Z(ero-rated), N(on-VAT).
 *
 * A line with no tax rate at all falls back to 'N', matching the
 * server's own rule (TaxService::calculateLine treats a null rate as
 * TYPE_NON_VAT), so an unassigned product is flagged the same way in the
 * cart as it will be on the printed receipt.
 */
export function taxIndicatorFor(taxRate: { indicator?: string } | null): string {
  return taxRate?.indicator ?? 'N';
}

/** Spelled out wherever the letters appear — a receipt convention, not something every cashier knows cold. Shared so the cart's tooltip and the receipt's legend can never drift apart. */
export const TAX_INDICATOR_LABELS: Record<string, string> = {
  V: 'VATable',
  E: 'VAT-Exempt',
  Z: 'Zero-Rated',
  N: 'Non-VAT',
};

export function formatMoney(amount: number): string {
  return amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** "2" for a PCS-like unit, "1.250 KG" for a weighed unit — matches the unit's own decimal precision. */
export function formatQuantity(quantity: number, unitAbbreviation: string | null, decimalPlaces: number): string {
  const qty = quantity.toFixed(decimalPlaces);
  if (!unitAbbreviation || unitAbbreviation.toUpperCase() === 'PCS') {
    return qty;
  }
  return `${qty} ${unitAbbreviation}`;
}
