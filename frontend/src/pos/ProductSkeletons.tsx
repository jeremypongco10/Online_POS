import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';

/**
 * Loading placeholders for the product grid and list.
 *
 * These exist because the results panel now pages in as the cashier
 * scrolls (see ProductSearch's loadMore): a bare spinner in the middle of
 * an otherwise blank panel gives no sense of what's arriving or how much,
 * and on the *first* load it left the panel completely empty for a beat,
 * which reads as a broken screen. A placeholder shaped like the real tile
 * or row keeps the layout stable — nothing shifts when the real data
 * lands, because the space was already the right size and shape.
 *
 * Deliberately not focusable and without `data-pos-tile`, so arrow-key
 * browsing steps straight over them to real products (see productGridNav).
 *
 * animation="wave" rather than the default pulse: a directional shimmer
 * reads as "content on its way" instead of a block quietly blinking.
 */
export function ProductCardSkeleton() {
  return (
    <Card
      variant="outlined"
      // Same radius/hairline shadow/height as ProductCard, so the swap to
      // real content is invisible rather than a re-layout.
      sx={{
        borderRadius: 2.5,
        boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)',
        height: '100%',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#fff',
      }}
    >
      <Box sx={{ flex: 1, minHeight: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Skeleton animation="wave" variant="circular" width={34} height={34} />
      </Box>
      <Box sx={{ px: 1.5, py: 1.25, flexShrink: 0 }}>
        {/* Two name lines then the stock/price row — the exact block
            ProductCard renders, so the placeholder occupies the same
            174px row the grid reserves for a real tile. */}
        <Skeleton animation="wave" variant="text" width="92%" sx={{ fontSize: 12.5 }} />
        <Skeleton animation="wave" variant="text" width="60%" sx={{ fontSize: 12.5 }} />
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mt: 0.35, gap: 0.5 }}>
          <Skeleton animation="wave" variant="text" width={40} sx={{ fontSize: 11 }} />
          <Skeleton animation="wave" variant="rounded" width={50} height={11} />
        </Stack>
      </Box>
    </Card>
  );
}

/** The list/table counterpart — mirrors one ProductListView row, thumbnail included. */
export function ProductRowSkeleton() {
  return (
    <Stack
      direction="row"
      sx={{
        alignItems: 'center',
        gap: 1.5,
        px: 1.5,
        py: 1,
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Skeleton animation="wave" variant="rounded" width={38} height={38} sx={{ borderRadius: 1.5, flexShrink: 0 }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Skeleton animation="wave" variant="text" width="45%" sx={{ fontSize: 14 }} />
        <Skeleton animation="wave" variant="text" width="22%" sx={{ fontSize: 11 }} />
      </Box>
      <Skeleton animation="wave" variant="text" width={56} sx={{ fontSize: 12, display: { xs: 'none', sm: 'block' } }} />
      <Skeleton animation="wave" variant="rounded" width={64} height={13} />
    </Stack>
  );
}
