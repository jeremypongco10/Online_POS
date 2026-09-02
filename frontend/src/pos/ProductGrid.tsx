import Box from '@mui/material/Box';
import type { ProductWithStorePrice } from '../api/types';
import { ProductCard } from './ProductCard';
import { ProductCardSkeleton } from './ProductSkeletons';
import { PRODUCT_GRID_ID } from './productGridNav';

interface Props {
  products: ProductWithStorePrice[];
  onAdd: (product: ProductWithStorePrice) => void;
  /**
   * Placeholder tiles to trail the real ones with while a page is
   * loading — see ProductSearch's loadMore. They render *inside* this
   * same grid rather than as a second grid stacked underneath, so the
   * placeholders land in the existing columns and the real tiles simply
   * take their place with no seam and no re-flow.
   */
  skeletonCount?: number;
}

export function ProductGrid({ products, onAdd, skeletonCount = 0 }: Props) {
  return (
    <Box
      // The id is how arrow-key navigation reads back the column count
      // auto-fill actually resolved to at this width.
      id={PRODUCT_GRID_ID}
      sx={{
        display: 'grid',
        // A middle ground between the original 144px and the 112px this
        // replaced — 112 packed in more columns than it was worth once the
        // cards started reading as cramped rather than dense.
        gridTemplateColumns: 'repeat(auto-fill, minmax(128px, 1fr))',
        // Deliberately a FIXED row height, not `minmax(…, 1fr)`: fr rows
        // share out whatever vertical space is left over, so the very
        // same card came out tall under a one-row category filter and
        // short under "All" (many rows, nothing left to share). A product
        // tile that changes size with the result count reads as a bug —
        // uniform tiles, with honest empty space under a short list, is
        // what every POS grid does and what stays scannable.
        // 150 -> 162 -> 174: first for the name's second line, then again
        // for the text block's own internal padding (see ProductCard) —
        // otherwise the extra padding ate into the fixed-height chip/photo
        // plate above it instead of adding real breathing room.
        gridAutoRows: 174,
        gap: 1.25,
        // Keeps a short list packed at the top rather than letting the
        // rows drift apart to fill the panel.
        alignContent: 'start',
      }}
    >
      {products.map((p) => (
        <ProductCard key={p.id} product={p} onClick={() => onAdd(p)} />
      ))}
      {Array.from({ length: skeletonCount }, (_, i) => (
        <ProductCardSkeleton key={`skeleton-${i}`} />
      ))}
    </Box>
  );
}
