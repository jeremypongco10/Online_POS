import Box from '@mui/material/Box';
import type { ProductWithStorePrice } from '../api/types';
import { ProductCard } from './ProductCard';

interface Props {
  products: ProductWithStorePrice[];
  onAdd: (product: ProductWithStorePrice) => void;
}

export function ProductGrid({ products, onAdd }: Props) {
  return (
    <Box
      sx={{
        display: 'grid',
        // Wider than the old 110px floor: at that size a two-line product
        // name plus a price left almost nothing for the image, and the
        // grid read as a dense wall of chips rather than browsable cards.
        gridTemplateColumns: 'repeat(auto-fill, minmax(144px, 1fr))',
        // Deliberately a FIXED row height, not `minmax(…, 1fr)`: fr rows
        // share out whatever vertical space is left over, so the very
        // same card came out tall under a one-row category filter and
        // short under "All" (many rows, nothing left to share). A product
        // tile that changes size with the result count reads as a bug —
        // uniform tiles, with honest empty space under a short list, is
        // what every POS grid does and what stays scannable.
        gridAutoRows: 184,
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
