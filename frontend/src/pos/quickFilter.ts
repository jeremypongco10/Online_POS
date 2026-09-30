/**
 * The product grid's two shortcut views. Neither is a category — one is this
 * store's most-purchased products, the other is the list a manager starred in
 * Back Office — so they have their own selection state rather than fake
 * category ids. The value doubles as the query-string flag the products
 * endpoint takes (`?popular=1`, `?favorites=1`).
 */
export type QuickFilter = 'popular' | 'favorites';

/** What each shortcut is called, everywhere it's named (pill, header button, empty state). */
export const QUICK_FILTER_LABELS: Record<QuickFilter, string> = {
  popular: 'Top Sellers',
  favorites: 'Favorites',
};
