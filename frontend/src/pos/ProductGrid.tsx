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
        gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
        gap: 1,
      }}
    >
      {products.map((p) => (
        <ProductCard key={p.id} product={p} onClick={() => onAdd(p)} />
      ))}
    </Box>
  );
}
