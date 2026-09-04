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
import { colorForName, initialsForName } from './productColor';

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
  const chipColor = colorForName(product.name);

  // Same gate ProductLookupScreen (Search Product) uses for stock — a
  // role with products.view but not inventory.view (a rare custom role;
  // every built-in POS role has both) shouldn't see counts here either.
  const canViewStock = hasPermission('inventory.view');
  const stock = product.stock_quantity !== null ? parseFloat(product.stock_quantity) : null;
  const outOfStock = stock !== null && stock <= 0;

  return (
    <Card
      variant="outlined"
      sx={{
        // Softer corners and a hairline resting shadow, rather than a
        // flat hard-bordered rectangle — twenty of these sit side by side,
        // so the difference between "outlined boxes" and "cards" is most
        // of what makes the grid read as modern rather than tabular.
        borderRadius: 2.5,
        boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)',
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
        // Marks this as an arrow-key stop — see productGridNav.ts.
        data-pos-tile=""
        disabled={unpriced}
        onClick={onClick}
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          // With arrow-key browsing, this ring is the entire interface —
          // it's the only thing telling the cashier what Enter will add.
          // MUI's stock focusVisible is a pale grey wash, which against
          // these pastel tiles reads as "disabled" rather than "here", so
          // that overlay is switched off for an accent outline instead.
          // outlineOffset is negative so the ring is drawn inside the
          // card's own box: the grid sits in a scroll container, which
          // would otherwise shave the ring off at the top and bottom edges.
          // Scoped through &.Mui-focusVisible on purpose: MUI's own rule is
          // `.MuiCardActionArea-root.Mui-focusVisible .focusHighlight`, and
          // a plain descendant selector loses to it on specificity.
          '&.Mui-focusVisible .MuiCardActionArea-focusHighlight': { opacity: 0 },
          '&.Mui-focusVisible': {
            outline: `2px solid ${POS_ACCENT}`,
            outlineOffset: '-2px',
            bgcolor: `${POS_ACCENT}14`,
          },
        }}
      >
        {showImage ? (
          // Product photography is overwhelmingly shot on white, so a white
          // plate is what keeps a `contain`-fitted image from sitting in an
          // odd colored letterbox — the calm-down here comes from removing
          // the saturated blocks below, not from tinting real photos.
          <Box sx={{ width: '100%', flex: 1, minHeight: 44, bgcolor: '#fff', p: 1.25 }}>
            <Box
              component="img"
              src={assetUrl(product.image_path as string)}
              alt={product.name}
              onError={() => setImageFailed(true)}
              sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </Box>
        ) : (
          // White plate, same as a real photo above — but plain white with
          // only coloured *text* on it turned out too flat to scan: every
          // card read the same at a glance, with nothing to catch the eye
          // and tell products apart. A small solid chip is the middle
          // ground — same avatar-badge pattern BaggerPanel/
          // CustomerLoyaltyPanel already use — so the tile stays clean and
          // white while each product still gets a distinct, spottable
          // colour.
          <Box sx={{ width: '100%', flex: 1, minHeight: 40, bgcolor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Box
              sx={{
                // A step smaller than it was: this is a placeholder for a
                // missing photo, and the space it gave back went to the
                // product name below, which was truncating on most cards.
                width: 34,
                height: 34,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: chipColor,
                color: '#fff',
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.02em',
              }}
            >
              {initialsForName(product.name)}
            </Box>
          </Box>
        )}

        {/* px/py bumped up from 1/0.65 — the text sat almost flush against
            the card's own border on the left/right, with barely a gap
            below the chip plate above it. This is the padding *inside*
            each tile, not the gap between tiles or around the grid. */}
        <Box sx={{ px: 1.5, py: 1.25, width: '100%', flexShrink: 0 }}>
          {/* Two lines, not one: at a single line most of this grid read
              "Colgate Toothpa…", "Nescafe 3-in-1 C…", "Purefoods Tende…"
              — enough to hide which variant of a product a tile actually
              is, which is the one thing a cashier is scanning for. The
              space came from the oversized placeholder chip above.

              minHeight reserves both lines even for a one-line name, so
              the chips and prices stay on a consistent baseline across
              the row instead of every card sizing to its own text. */}
          <Typography
            variant="caption"
            title={product.name}
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              minHeight: 33,
              fontWeight: 400,
              fontSize: 12.5,
              lineHeight: 1.3,
            }}
          >
            {product.name}
          </Typography>
          <Stack direction="row" sx={{ alignItems: 'baseline', justifyContent: 'space-between', mt: 0.35, gap: 0.5 }}>
            {/* A non-breaking-space placeholder rather than omitting this
                Typography entirely when there's nothing to show — that
                would let the price on the right jump left/right depending
                on whether a stock figure is present on any given card.

                "on hand" used to be spelled out inline here, but a
                three-digit count plus that suffix didn't fit next to a
                real price once the grid got dense enough (7+ columns) —
                "135 on hand" truncated to "135 on h…", reading like a
                cut-off word rather than a number. Bare, the same as
                ProductListView's own stock column, so it stays legible at
                any column count; the full phrase moves to a hover
                tooltip (title) instead of disappearing outright. */}
            <Typography
              variant="caption"
              noWrap
              title={canViewStock && stock !== null ? (outOfStock ? 'Out of stock' : `${trimStock(stock)} on hand`) : undefined}
              sx={{ fontSize: 11, fontWeight: outOfStock ? 700 : 400, color: outOfStock ? 'error.main' : 'text.secondary' }}
            >
              {canViewStock && stock !== null ? (outOfStock ? 'Out of stock' : trimStock(stock)) : ' '}
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
                fontSize: unpriced ? 12 : 13.5,
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
