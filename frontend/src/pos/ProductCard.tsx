import { useState } from 'react';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ProductWithStorePrice } from '../api/types';
import { assetUrl } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { formatMoney, POS_ACCENT } from './format';
import { initialsForName, tileTint } from './productColor';

interface Props {
  product: ProductWithStorePrice;
  onClick: () => void;
}

/** "20" for a whole count, "1.25" for a weighed one — trims the DB's fixed 4-decimal storage down to only the digits that matter for a compact card badge. No unit abbreviation here (ProductWithStorePrice only carries unit_id, not the unit record), unlike Cart's formatQuantity. */
function trimStock(quantity: number): string {
  return String(Math.round(quantity * 10000) / 10000);
}

export function ProductCard({ product, onClick }: Props) {
  const { hasPermission } = useAuth();
  const unpriced = product.selling_price === null;
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = product.image_path && !imageFailed;
  const tint = tileTint(product.name);

  // Same gate ProductLookupScreen (Search Product) uses for stock — a
  // role with products.view but not inventory.view (a rare custom role;
  // every built-in POS role has both) shouldn't see counts here either.
  const canViewStock = hasPermission('inventory.view');
  const stock = product.stock_quantity !== null ? parseFloat(product.stock_quantity) : null;

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        height: '100%',
        overflow: 'hidden',
        transition: 'background-color 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
        ...(unpriced
          ? { opacity: 0.55 }
          : {
              // Deliberately no translateY lift. The grid lives in a
              // scroll container, which clips at its own edge, so a card
              // moving up by 2px had its top shaved off — and padding
              // can't fix that, because once the list is scrolled the
              // clip edge sits over the middle of the content. Colour and
              // a shallow shadow stay entirely inside the card's box, so
              // the hover reads the same in every scroll position.
              '&:hover': {
                borderColor: POS_ACCENT,
                bgcolor: `${POS_ACCENT}0a`,
                boxShadow: '0 4px 12px -6px rgba(16, 24, 40, 0.22)',
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
          <Box sx={{ width: '100%', flex: 1, minHeight: 44, bgcolor: '#fff', p: 0.75 }}>
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
              minHeight: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: tint.bg,
              color: tint.fg,
              // Deliberately a step below the price now — these initials
              // are a placeholder for a missing photo, not information.
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: '0.02em',
            }}
          >
            {initialsForName(product.name)}
          </Box>
        )}

        <Box sx={{ px: 1, py: 0.65, width: '100%', flexShrink: 0 }}>
          {/* Single line now (was a 2-line clamp) to buy back a row of
              card height for the stock/price row below — the `title`
              attribute still surfaces the full name on hover for two
              products truncating to the same visible text. */}
          <Typography variant="caption" title={product.name} noWrap sx={{ display: 'block', fontWeight: 600, fontSize: 12.5, lineHeight: 1.3 }}>
            {product.name}
          </Typography>
          <Stack direction="row" sx={{ alignItems: 'baseline', justifyContent: 'space-between', mt: 0.35, gap: 0.5 }}>
            {/* A non-breaking-space placeholder rather than omitting this
                Typography entirely when there's nothing to show — that
                would let the price on the right jump left/right depending
                on whether a stock figure is present on any given card. */}
            <Typography variant="caption" noWrap sx={{ fontSize: 11, color: stock !== null && stock <= 0 ? 'error.main' : 'text.secondary' }}>
              {canViewStock && stock !== null ? `${trimStock(stock)} on hand` : ' '}
            </Typography>
            {/* The largest thing on the card, ahead of the tinted
                initials block above it. The colour tile is decoration —
                the price is what a cashier actually scans this grid
                for, so it gets the weight rather than the other way
                round. */}
            <Typography
              sx={{
                fontWeight: 800,
                // "No price" is a label, not a figure to scan at a
                // glance, so it doesn't get the same size as a real one
                // — and at 16px it crowded the narrow card besides.
                fontSize: unpriced ? 12 : 16,
                whiteSpace: 'nowrap',
                color: unpriced ? 'error.main' : POS_ACCENT,
              }}
            >
              {unpriced ? 'No price' : formatMoney(parseFloat(product.selling_price as string))}
            </Typography>
          </Stack>
        </Box>
      </CardActionArea>
    </Card>
  );
}
