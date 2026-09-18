import { memo, useState } from 'react';
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
import { useLongPress } from './useLongPress';

interface Props {
  product: ProductWithStorePrice;
  /**
   * Takes the product rather than being pre-bound to it (`() => void`) so
   * every card in a grid can share the exact same function reference from
   * the parent — see the memo() note below for why that's the point.
   */
  onAdd: (product: ProductWithStorePrice) => void;
  /** Holding the card down opens the quantity dialog instead of adding one unit — see useLongPress. Optional so ProductCard doesn't require a caller that has nothing to open. */
  onLongPress?: (product: ProductWithStorePrice) => void;
}

/** "20" for a whole count, "1.25" for a weighed one — trims the DB's fixed 4-decimal storage down to only the digits that matter for a compact card badge. No unit abbreviation here (ProductWithStorePrice only carries unit_id, not the unit record), unlike Cart's formatQuantity. */
function trimStock(quantity: number): string {
  return String(Math.round(quantity * 10000) / 10000);
}

/**
 * Memoized: a real grid runs 25-100+ of these, and every one lived under
 * the same PosScreen as the cart. Without memo, adding a single item
 * re-rendered every tile on screen along with it — invisible in a small
 * catalog, but measured at 150-260ms of pure re-render work on a normal
 * one, which is exactly the delay reported after clicking a product. memo
 * only pays off if `product` and `onAdd` are referentially stable across
 * an unrelated re-render (e.g. the cart changing) — see addProduct in
 * PosScreen and the `onAdd` prop shape above.
 */
export const ProductCard = memo(function ProductCard({ product, onAdd, onLongPress }: Props) {
  const { hasPermission } = useAuth();
  const unpriced = product.selling_price === null;
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = product.image_path && !imageFailed;
  const chipColor = colorForName(product.name);

  // wasLongPress kept separate from the spread below — it isn't a DOM
  // event handler, and spreading it onto CardActionArea would land it as
  // an unrecognized attribute on the underlying <button>.
  const { wasLongPress, ...longPressHandlers } = useLongPress(() => onLongPress?.(product), !unpriced && Boolean(onLongPress));

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
        // Softer corners over a completely flat surface — no resting
        // shadow. Twenty of these sit side by side, and at that count even
        // a hairline shadow each adds up to a grid that looks dusty; the
        // outlined variant's own 1px border is the entire edge now.
        borderRadius: 2,
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.05)',
        height: '100%',
        overflow: 'hidden',
        transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
        ...(unpriced
          ? { opacity: 0.55 }
          : {
              // Deliberately no translateY lift and no blurred shadow. The
              // grid lives in a scroll container, which clips at its own
              // edge, so a card moving up by 2px had its top shaved off —
              // and padding can't fix that, because once the list is
              // scrolled the clip edge sits over the middle of the
              // content. An inset ring instead: it doubles the border's
              // apparent weight in the accent colour while staying
              // entirely inside the card's own box, so the hover reads
              // identically at every scroll position.
              //
              // No background tint either. The card's background sits
              // *behind* the photo plate, so tinting it only showed
              // through the tile's padding and left the plate itself
              // untouched — a mismatched two-tone hover.
              '&:hover': {
                borderColor: POS_ACCENT,
                boxShadow: `inset 0 0 0 1px ${POS_ACCENT}, 0 8px 20px rgba(37, 99, 235, 0.12)`,
              },
            }),
      }}
    >
      <CardActionArea
        // Marks this as an arrow-key stop — see productGridNav.ts.
        data-pos-tile=""
        disabled={unpriced}
        onClick={() => {
          // A long-press ends with a real pointerup, and the browser fires
          // a click right after it — without this check, holding the card
          // down would open the quantity dialog *and* still add one unit
          // from that trailing click.
          if (wasLongPress()) return;
          onAdd(product);
        }}
        {...longPressHandlers}
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
          // CardActionArea paints a black focusHighlight overlay on hover
          // as well as on focus. At 4% over a tinted photo plate that
          // isn't a highlight, it's a smear — it turned the red and amber
          // tiles a muddy grey-brown under the cursor. The Card above
          // already answers a hover with an accent border and shadow, so
          // this overlay is switched off in both states.
          '&:hover .MuiCardActionArea-focusHighlight': { opacity: 0 },
          '&.Mui-focusVisible .MuiCardActionArea-focusHighlight': { opacity: 0 },
          '&.Mui-focusVisible': {
            outline: `2px solid ${POS_ACCENT}`,
            outlineOffset: '-2px',
            bgcolor: `${POS_ACCENT}14`,
          },
        }}
      >
        {showImage ? (
          // A near-white plate rather than pure white. Product photography
          // is overwhelmingly shot on white, so this still keeps a
          // `contain`-fitted image out of an odd coloured letterbox — but
          // once the photo-less tiles below gained a soft tint, a
          // pure-white plate made the handful of tiles that DO have a photo
          // read as holes punched in the grid. Light enough not to tint the
          // photo, dark enough to sit in the same family as its neighbours.
          <Box sx={{ width: '100%', flex: 1, minHeight: 52, bgcolor: '#f7f9fc', p: 1.5 }}>
            <Box
              component="img"
              src={assetUrl(product.image_path as string)}
              alt={product.name}
              onError={() => setImageFailed(true)}
              sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </Box>
        ) : (
          // Same near-white plate as a real photo above, at the user's
          // request to drop the tinted gradient this used to carry (a
          // wash of the product's own hue, meant to help tell tiles
          // apart at a glance across a full grid). The initials stay in
          // that hue — still enough to tell products apart by colour —
          // but the plate itself is now plain, matching every photo tile
          // beside it instead of standing out as the "no photo" one.
          <Box
            sx={{
              width: '100%',
              flex: 1,
              minHeight: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: '#f7f9fc',
            }}
          >
            <Box
              component="span"
              sx={{
                // Scaled with the tile itself (see ProductGrid's row
                // height): at 22px the initials sat as a small mark
                // floating in a large empty plate, which read as a tile
                // that had failed to load rather than one standing in for
                // a missing photo.
                fontSize: 28,
                fontWeight: 800,
                letterSpacing: '0.04em',
                color: chipColor,
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
        <Box sx={{ px: 1.75, py: 1.5, width: '100%', flexShrink: 0 }}>
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
              minHeight: 38,
              // Was 12.5/400. The name is the thing a cashier is actually
              // reading once the colour has got their eye to the right
              // tile, and at regular weight in grey-black it was the
              // faintest text on a card whose loudest element was a
              // decorative dot. Medium weight and full-strength text
              // colour put the emphasis back on the words.
              fontWeight: 700,
              fontSize: 14.5,
              lineHeight: 1.3,
              color: 'text.primary',
            }}
          >
            {product.name}
          </Typography>
          {/* The price gets its own line directly under the name, rather
              than sharing a row with the stock badge as it used to. It is
              the figure a cashier scans this grid for, and on a row shared
              with a badge it was competing for width with it — at 7+
              columns that meant one or the other truncating. */}
          <Typography
            sx={{
              mt: 0.35,
              fontWeight: 800,
              // "No price" is a label, not a figure to scan at a glance,
              // so it doesn't get the same size as a real one.
              fontSize: unpriced ? 13 : 17.5,
              letterSpacing: '-0.01em',
              whiteSpace: 'nowrap',
              color: unpriced ? 'error.main' : POS_ACCENT,
            }}
          >
            {unpriced ? 'No price' : formatMoney(parseFloat(product.selling_price as string))}
          </Typography>

          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mt: 1, gap: 0.5 }}>
            {/* Says "In Stock" rather than the bare count it used to. The
                number is still one hover away (title), but a lone "135"
                sitting under a price read as an ID or a second figure,
                where the words answer the only question being asked of
                this badge at a glance: can I sell it right now. */}
            {canViewStock && stock !== null ? (
              <Box
                component="span"
                title={outOfStock ? 'Out of stock' : `${trimStock(stock)} on hand`}
                sx={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  lineHeight: 1.7,
                  px: 1,
                  borderRadius: 999,
                  minWidth: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  color: outOfStock ? '#b91c1c' : '#15803d',
                  bgcolor: outOfStock ? 'rgba(220, 38, 38, 0.1)' : 'rgba(22, 163, 74, 0.12)',
                }}
              >
                {outOfStock ? 'Out of stock' : 'In Stock'}
              </Box>
            ) : (
              // An empty flex child, not nothing: this row is
              // space-between, so without it the add affordance would sit
              // hard left on exactly the cards with no stock to show.
              <Box />
            )}

            {/* Deliberately a Box, NOT a button. The whole card is already
                one big CardActionArea — the correct touch target on a till
                — and a <button> nested inside another button is invalid
                HTML that React warns about and screen readers mis-announce.
                This is the affordance for the tap the card already
                handles, not a second control: it shows a cashier where to
                aim without splitting one action across two hit areas.
                aria-hidden for the same reason — the card's own accessible
                name already describes what activating it does. */}
            {!unpriced && (
              <Box
                aria-hidden
                sx={{
                  flexShrink: 0,
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: POS_ACCENT,
                  color: '#fff',
                  fontSize: 19,
                  fontWeight: 700,
                  lineHeight: 1,
                }}
              >
                +
              </Box>
            )}
          </Stack>
        </Box>
      </CardActionArea>
    </Card>
  );
});
