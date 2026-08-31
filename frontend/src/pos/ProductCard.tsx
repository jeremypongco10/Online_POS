import { useState } from 'react';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { ProductWithStorePrice } from '../api/types';
import { assetUrl } from '../api/client';
import { formatMoney, POS_ACCENT } from './format';
import { colorForName, initialsForName } from './productColor';

interface Props {
  product: ProductWithStorePrice;
  onClick: () => void;
}

export function ProductCard({ product, onClick }: Props) {
  const unpriced = product.selling_price === null;
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = product.image_path && !imageFailed;

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        height: '100%',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
        ...(!unpriced && {
          '&:hover': {
            transform: 'translateY(-3px)',
            boxShadow: '0 8px 20px -6px rgba(16, 24, 40, 0.18)',
            borderColor: POS_ACCENT,
          },
        }),
      }}
    >
      <CardActionArea
        disabled={unpriced}
        onClick={onClick}
        sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
      >
        {showImage ? (
          <Box sx={{ width: '100%', height: 56, bgcolor: '#fff', p: 0.75 }}>
            <Box
              component="img"
              src={assetUrl(product.image_path as string)}
              alt={product.name}
              onError={() => setImageFailed(true)}
              sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </Box>
        ) : (
          <Box
            sx={{
              width: '100%',
              height: 56,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: colorForName(product.name),
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            {initialsForName(product.name)}
          </Box>
        )}
        <Box sx={{ p: 1, width: '100%' }}>
          <Typography variant="caption" sx={{ fontWeight: 600, lineHeight: 1.3, display: 'block' }} noWrap title={product.name}>
            {product.name}
          </Typography>
          <Typography
            variant="caption"
            sx={{ display: 'block', mt: 0.25, fontWeight: 700, color: unpriced ? 'error.main' : POS_ACCENT }}
          >
            {unpriced ? 'No price set' : formatMoney(parseFloat(product.selling_price as string))}
          </Typography>
        </Box>
      </CardActionArea>
    </Card>
  );
}
