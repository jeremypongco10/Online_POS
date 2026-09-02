import { useState } from 'react';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ProductWithStorePrice } from '../api/types';
import { assetUrl } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { formatMoney, POS_ACCENT } from './format';
import { colorForName, initialsForName } from './productColor';
import { ProductRowSkeleton } from './ProductSkeletons';

interface Props {
  results: ProductWithStorePrice[];
  onAdd: (product: ProductWithStorePrice) => void;
  /** Trailing placeholder rows while the next page loads — see ProductSearch's loadMore. */
  skeletonCount?: number;
}

/** Column widths shared by the header and every row, so the two actually line up as columns rather than merely looking close. */
const STOCK_COL = 90;
const PRICE_COL = 104;

const HEADER_SX = {
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'text.disabled',
} as const;

/** "20" for a whole count, "1.25" for a weighed one — same trim ProductCard does, minus the unit (ProductWithStorePrice carries only unit_id). */
function trimStock(quantity: number): string {
  return String(Math.round(quantity * 10000) / 10000);
}

/**
 * The row's product image, or a coloured initials chip when there isn't
 * one — the same fallback ProductCard uses, so a product looks like the
 * same product whichever view the cashier is in. Its own component
 * because the broken-image fallback needs per-row state.
 */
function ProductThumb({ product }: { product: ProductWithStorePrice }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = product.image_path && !imageFailed;

  if (showImage) {
    return (
      <Box
        sx={{
          width: 38,
          height: 38,
          flexShrink: 0,
          borderRadius: 1.5,
          bgcolor: '#fff',
          border: '1px solid',
          borderColor: 'divider',
          p: 0.25,
        }}
      >
        <Box
          component="img"
          src={assetUrl(product.image_path as string)}
          alt=""
          onError={() => setImageFailed(true)}
          sx={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
        />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: 38,
        height: 38,
        flexShrink: 0,
        borderRadius: 1.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: colorForName(product.name),
        color: '#fff',
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: '0.02em',
      }}
    >
      {initialsForName(product.name)}
    </Box>
  );
}

/**
 * The list ("table") view of the same results the grid shows — denser,
 * and the one to use when a cashier is reading names rather than spotting
 * pictures.
 *
 * Built as real columns (product, on hand, price) under a caption header
 * rather than a name on the left and a price floating on the right: with
 * pages of products now streaming in as the panel scrolls, aligned
 * columns are what let the eye run straight down a single value instead
 * of re-finding it on every row.
 */
export function ProductListView({ results, onAdd, skeletonCount = 0 }: Props) {
  const { hasPermission } = useAuth();
  // Same gate as ProductCard: a role with products.view but not
  // inventory.view shouldn't see stock counts in either view.
  const canViewStock = hasPermission('inventory.view');

  return (
    <Paper
      variant="outlined"
      // Matches ProductCard's radius and hairline shadow so the two view
      // modes read as the same design, not two different screens.
      sx={{ borderRadius: 2.5, overflow: 'hidden', boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)' }}
    >
      {/* Column captions. Small, muted and uppercase — enough to label the
          columns without competing with the product names underneath. */}
      <Stack
        direction="row"
        sx={{
          alignItems: 'center',
          gap: 1.5,
          px: 1.5,
          py: 0.75,
          bgcolor: 'action.hover',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ width: 38, flexShrink: 0 }} />
        <Typography sx={{ flex: 1, minWidth: 0, ...HEADER_SX }}>Product</Typography>
        {canViewStock && (
          <Typography sx={{ width: STOCK_COL, textAlign: 'right', display: { xs: 'none', sm: 'block' }, ...HEADER_SX }}>
            On hand
          </Typography>
        )}
        <Typography sx={{ width: PRICE_COL, textAlign: 'right', ...HEADER_SX }}>Price</Typography>
      </Stack>

      <List disablePadding>
        {results.map((p, i) => {
          const unpriced = p.selling_price === null;
          const stock = p.stock_quantity !== null ? parseFloat(p.stock_quantity) : null;
          const outOfStock = stock !== null && stock <= 0;

          return (
            <ListItemButton
              key={p.id}
              data-pos-tile=""
              divider={i < results.length - 1 || skeletonCount > 0}
              disabled={unpriced}
              onClick={() => !unpriced && onAdd(p)}
              // Same accent focus ring as the grid tiles — arrow-key
              // browsing works in this view too, so it needs the same
              // unmistakable "you are here". The hover tint matches the
              // cards' as well, rather than MUI's default grey wash.
              sx={{
                py: 1,
                px: 1.5,
                gap: 1.5,
                transition: 'background-color 0.15s ease',
                '&:hover': { bgcolor: `${POS_ACCENT}0a` },
                '&.Mui-focusVisible': {
                  outline: `2px solid ${POS_ACCENT}`,
                  outlineOffset: '-2px',
                  bgcolor: `${POS_ACCENT}14`,
                },
              }}
            >
              <ProductThumb product={p} />

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                  {p.name}
                </Typography>
                {/* Monospaced so a column of codes lines up digit for
                    digit — SKUs are compared character by character, not
                    read as words. */}
                <Typography
                  variant="caption"
                  color="text.secondary"
                  noWrap
                  sx={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 11 }}
                >
                  {p.sku}
                </Typography>
              </Box>

              {canViewStock && (
                <Typography
                  noWrap
                  sx={{
                    width: STOCK_COL,
                    flexShrink: 0,
                    textAlign: 'right',
                    display: { xs: 'none', sm: 'block' },
                    fontSize: 12,
                    fontVariantNumeric: 'tabular-nums',
                    fontWeight: outOfStock ? 700 : 400,
                    color: outOfStock ? 'error.main' : 'text.secondary',
                  }}
                >
                  {stock === null ? '—' : outOfStock ? 'Out of stock' : trimStock(stock)}
                </Typography>
              )}

              {/* tabular-nums keeps the decimal points stacked down the
                  column; without it every row's price sits a pixel or two
                  off the one above. */}
              <Typography
                sx={{
                  width: PRICE_COL,
                  flexShrink: 0,
                  textAlign: 'right',
                  fontWeight: 800,
                  fontSize: unpriced ? 12 : 14,
                  whiteSpace: 'nowrap',
                  fontVariantNumeric: 'tabular-nums',
                  color: unpriced ? 'error.main' : POS_ACCENT,
                }}
              >
                {unpriced ? 'No price' : formatMoney(parseFloat(p.selling_price as string))}
              </Typography>
            </ListItemButton>
          );
        })}

        {Array.from({ length: skeletonCount }, (_, i) => (
          <ProductRowSkeleton key={`skeleton-${i}`} />
        ))}
      </List>
    </Paper>
  );
}
