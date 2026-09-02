/**
 * Arrow-key navigation for the product results.
 *
 * The cashier's hands are on the keyboard almost all the time here — the
 * search box holds focus so a scanner can type into it — so reaching a
 * product should not require the mouse. Down Arrow out of the search box
 * drops into the results, the arrows move around them, Enter adds (that
 * part is free: every tile is a MUI ButtonBase already), and Esc or Up
 * Arrow off the top row hands focus back to the search box.
 *
 * Shared by the grid and the list view rather than implemented twice: both
 * mark their focusable element with `data-pos-tile`, and the only thing
 * that differs is how many columns a row has.
 */

/** Set on the ProductCard's CardActionArea and the list view's ListItemButton. */
export const PRODUCT_TILE_SELECTOR = '[data-pos-tile]:not([disabled])';

export const PRODUCT_SEARCH_ID = 'pos-product-search';
export const PRODUCT_GRID_ID = 'pos-product-grid';

/** Unpriced products render disabled — they can't be added, so they're skipped rather than being a dead stop on the way past. */
export function productTiles(container: ParentNode = document): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(PRODUCT_TILE_SELECTOR));
}

export function focusProductSearch(): void {
  document.getElementById(PRODUCT_SEARCH_ID)?.focus();
}

/** Returns false when there's nothing to focus (an empty or still-loading result set), so the caller can leave the keypress alone. */
export function focusFirstProductTile(container: ParentNode = document): boolean {
  const first = productTiles(container)[0];
  if (!first) return false;
  first.focus();
  return true;
}

/**
 * Read back the column count the browser actually settled on. The grid is
 * `repeat(auto-fill, minmax(128px, 1fr))`, so the number of columns depends
 * on the panel width at this moment (and on the POS zoom) — it can't be
 * derived from the product count. getComputedStyle resolves auto-fill to
 * the real track list, e.g. "128.5px 128.5px 128.5px".
 *
 * The list view has no grid element and is one product per row, so it
 * correctly falls through to a single column.
 */
export function tileColumnCount(container: ParentNode = document): number {
  const grid = (container as Document | Element).querySelector?.(`#${PRODUCT_GRID_ID}`);
  if (!grid) return 1;
  const tracks = getComputedStyle(grid).gridTemplateColumns;
  if (!tracks || tracks === 'none') return 1;
  return Math.max(1, tracks.split(' ').filter(Boolean).length);
}

/**
 * Where a key should move focus: an index into the tiles, 'search' to leave
 * the results entirely, or null for a key this doesn't handle.
 *
 * Movement clamps rather than wrapping. Wrapping from the end of one row to
 * the start of the next reads as the cursor jumping backwards, and the last
 * row is usually partial — Down from the second-to-last row would fall off
 * the end instead of landing on the nearest real product. Clamping means
 * Down always reaches the last product.
 */
export function nextTileIndex(key: string, current: number, count: number, columns: number): number | 'search' | null {
  if (count === 0) return null;
  const last = count - 1;

  switch (key) {
    case 'ArrowRight':
      return Math.min(last, current + 1);
    case 'ArrowLeft':
      return Math.max(0, current - 1);
    case 'ArrowDown':
      return Math.min(last, current + columns);
    case 'ArrowUp':
      // Off the top row, back to where the typing happens.
      return current - columns < 0 ? 'search' : current - columns;
    case 'Home':
      return 0;
    case 'End':
      return last;
    case 'Escape':
      return 'search';
    default:
      return null;
  }
}
