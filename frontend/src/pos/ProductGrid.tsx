import { memo } from 'react';
import Box from '@mui/material/Box';
import type { ProductWithStorePrice } from '../api/types';
import { ProductCard } from './ProductCard';
import { ProductCardSkeleton } from './ProductSkeletons';
import { PRODUCT_GRID_ID } from './productGridNav';

interface Props {
  products: ProductWithStorePrice[];
  onAdd: (product: ProductWithStorePrice) => void;
  onLongPress?: (product: ProductWithStorePrice) => void;
  /**
   * Placeholder tiles to trail the real ones with while a page is
   * loading — see ProductSearch's loadMore. They render *inside* this
   * same grid rather than as a second grid stacked underneath, so the
   * placeholders land in the existing columns and the real tiles simply
   * take their place with no seam and no re-flow.
   */
  skeletonCount?: number;
}

/**
 * Memoized alongside ProductCard. Without this, every cart change still
 * re-rendered this grid and made React walk all 40+ tiles just to have each
 * memoized card bail out one at a time — measured as the single biggest
 * chunk of the lag after confirming a quantity. Skipping the whole subtree
 * on one comparison is what actually keeps a cart update off the product
 * column. All four props hold their identity across an unrelated re-render
 * (orderedResults is a useMemo, both callbacks are useCallbacks, and the
 * skeleton count is a plain number), so the bail-out genuinely fires.
 */
export const ProductGrid = memo(function ProductGrid({ products, onAdd, onLongPress, skeletonCount = 0 }: Props) {
  return (
    <Box
      // The id is how arrow-key navigation reads back the column count
      // auto-fill actually resolved to at this width.
      id={PRODUCT_GRID_ID}
      sx={{
        display: 'grid',
        // 128 -> 150 -> 164. Was already a middle ground once (against an
        // original 144px, then a rejected 112px that packed in more
        // columns than it was worth) — widened twice since on direct
        // "make the product list bigger" / "bigger touch targets"
        // requests: fewer, larger tiles, easier to read and to hit on a
        // touch till at a glance across the store.
        // 164 is the till figure the notes above arrived at and stays the
        // figure everywhere there's room for it. On a phone it produced
        // exactly ONE column — the usable grid there is about 310px, and
        // two 164s plus the gap need 340 — so a single enormous tile
        // filled the screen and browsing meant scrolling one product at a
        // time. 140 clears two columns at 390px without shrinking the
        // tile anywhere it wasn't already the only one.
        gridTemplateColumns: { xs: 'repeat(auto-fill, minmax(140px, 1fr))', sm: 'repeat(auto-fill, minmax(164px, 1fr))' },
        // Deliberately a FIXED row height, not `minmax(…, 1fr)`: fr rows
        // share out whatever vertical space is left over, so the very
        // same card came out tall under a one-row category filter and
        // short under "All" (many rows, nothing left to share). A product
        // tile that changes size with the result count reads as a bug —
        // uniform tiles, with honest empty space under a short list, is
        // what every POS grid does and what stays scannable.
        // 174 -> 198 -> 214, in step with the column widening above and
        // with ProductCard's own larger type/padding — a wider card at
        // the old row height would have come out squat rather than simply
        // bigger.
        // Shorter on a phone in step with the narrower column above — at
        // 214 a two-column phone grid showed barely one row in the space
        // left over once the action row and cart had taken theirs.
        gridAutoRows: { xs: 186, sm: 214 },
        gap: 1.5,
        // Keeps a short list packed at the top rather than letting the
        // rows drift apart to fill the panel.
        alignContent: 'start',
      }}
    >
      {/*
        onAdd passed straight through, not wrapped in `() => onAdd(p)` —
        that per-card closure would be a "new" prop on every ProductGrid
        render regardless of ProductCard's own memo(), since a fresh
        function reference always fails a shallow-equal comparison. Only
        this — the same onAdd reference reaching every card unchanged, plus
        a stable `p` from the results array — lets memo actually skip
        re-rendering tiles that have nothing to do with whatever changed.
      */}
      {products.map((p) => (
        <ProductCard key={p.id} product={p} onAdd={onAdd} onLongPress={onLongPress} />
      ))}
      {Array.from({ length: skeletonCount }, (_, i) => (
        <ProductCardSkeleton key={`skeleton-${i}`} />
      ))}
    </Box>
  );
});
