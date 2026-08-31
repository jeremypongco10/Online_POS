/**
 * The POS screen's own accent — a saturated blue, deliberately not
 * theme.palette.primary.main (the app-wide indigo). Scoped to POS via
 * explicit hex rather than a second ThemeProvider: cheaper and lower-risk
 * than re-theming, and the rest of the app (Back Office included) is
 * intentionally left on the indigo theme.
 */
export const POS_ACCENT = '#2563eb';

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

export function formatMoney(amount: number): string {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** "2" for a PCS-like unit, "1.250 KG" for a weighed unit — matches the unit's own decimal precision. */
export function formatQuantity(quantity: number, unitAbbreviation: string | null, decimalPlaces: number): string {
  const qty = quantity.toFixed(decimalPlaces);
  if (!unitAbbreviation || unitAbbreviation.toUpperCase() === 'PCS') {
    return qty;
  }
  return `${qty} ${unitAbbreviation}`;
}
