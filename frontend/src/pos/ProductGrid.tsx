import Box from '@mui/material/Box';
import type { ProductWithStorePrice } from '../api/types';
import { ProductCard } from './ProductCard';
import { PRODUCT_GRID_ID } from './productGridNav';

interface Props {
  products: ProductWithStorePrice[];
  onAdd: (product: ProductWithStorePrice) => void;
}

export function ProductGrid({ products, onAdd }: Props) {
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
        gridAutoRows: 150,
        gap: 1.25,
        // Keeps a short list packed at the top rather than letting the
        // rows drift apart to fill the panel.
        alignContent: 'start',
      }}
    >
      {products.map((p) => (
        <ProductCard key={p.id} product={p} onClick={() => onAdd(p)} />
      ))}
    </Box>
  );
}
