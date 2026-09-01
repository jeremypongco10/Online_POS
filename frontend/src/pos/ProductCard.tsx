import { useState } from 'react';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { ProductWithStorePrice } from '../api/types';
import { assetUrl } from '../api/client';
import { formatMoney, POS_ACCENT } from './format';
import { initialsForName, tileTint } from './productColor';

interface Props {
  product: ProductWithStorePrice;
  onClick: () => void;
}

export function ProductCard({ product, onClick }: Props) {
  const unpriced = product.selling_price === null;
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = product.image_path && !imageFailed;
  const tint = tileTint(product.name);

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2.5,
        height: '100%',
        overflow: 'hidden',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
        ...(unpriced
          ? { opacity: 0.55 }
          : {
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 10px 24px -10px rgba(16, 24, 40, 0.28)',
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
          // Product photography is overwhelmingly shot on white, so a white
          // plate is what keeps a `contain`-fitted image from sitting in an
          // odd colored letterbox — the calm-down here comes from removing
          // the saturated blocks below, not from tinting real photos.
          <Box sx={{ width: '100%', flex: 1, minHeight: 64, bgcolor: '#fff', p: 1 }}>
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
              flex: 1,
              minHeight: 64,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: tint.bg,
              color: tint.fg,
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: '0.02em',
            }}
          >
            {initialsForName(product.name)}
          </Box>
        )}

        <Box sx={{ px: 1.25, py: 1, width: '100%', flexShrink: 0 }}>
          <Typography
            variant="caption"
            title={product.name}
            sx={{
              fontWeight: 600,
              lineHeight: 1.35,
              // Two lines instead of one hard truncation — "Palmolive
              // Shampoo Sachet" and "Palmolive Shower Gel" both collapsed
              // to the same "Palmolive Sha…" before, which is exactly the
              // moment a cashier needs the difference.
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              minHeight: '2.7em',
            }}
          >
            {product.name}
          </Typography>
          <Typography
            variant="body2"
            sx={{ mt: 0.5, fontWeight: 700, color: unpriced ? 'error.main' : POS_ACCENT }}
          >
            {unpriced ? 'No price' : formatMoney(parseFloat(product.selling_price as string))}
          </Typography>
        </Box>
      </CardActionArea>
    </Card>
  );
}
