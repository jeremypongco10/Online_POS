import { useState, type MouseEvent, type ReactNode } from 'react';
import Fade from '@mui/material/Fade';
import Paper from '@mui/material/Paper';
import Popper from '@mui/material/Popper';

interface Props {
  /** A loadable image URL (already run through assetUrl) — pass undefined/null for a product with no image, and this renders just `children` with no hover behavior. */
  src: string | null | undefined;
  children: ReactNode;
}

/**
 * Wraps a small product-image thumbnail (a table row's or search result's
 * Avatar) so hovering it floats a larger preview next to the cursor — the
 * thumbnail itself is too small to make out label text or condition.
 * Renders via MUI's Popper, which portals to document.body by default, so
 * the preview escapes the table's scroll-clipping container instead of
 * getting cut off.
 */
export function ImageHoverPreview({ src, children }: Props) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  if (!src) return <>{children}</>;

  return (
    <>
      <span
        onMouseEnter={(e: MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget)}
        onMouseLeave={() => setAnchorEl(null)}
        style={{ display: 'inline-flex', cursor: 'zoom-in' }}
      >
        {children}
      </span>
      <Popper
        open={!!anchorEl}
        anchorEl={anchorEl}
        placement="right-start"
        transition
        sx={{ zIndex: 1500, pointerEvents: 'none' }}
        // 'fixed' (not Popper.js's default 'absolute') positions purely
        // relative to the viewport — AdminLayout scrolls internally (the
        // content pane, not <body>), and 'absolute' strategy measures
        // offsets assuming <body> itself is the scrolling element. That
        // mismatch was placing this portalled-to-body popper far down the
        // document, inflating <body>'s scrollHeight and popping a second,
        // page-level scrollbar into existence on hover.
        popperOptions={{ strategy: 'fixed' }}
        modifiers={[
          { name: 'offset', options: { offset: [0, 8] } },
          { name: 'flip', enabled: true },
          { name: 'preventOverflow', options: { boundary: 'clippingParents', padding: 8 } },
        ]}
      >
        {({ TransitionProps }) => (
          <Fade {...TransitionProps} timeout={150}>
            <Paper elevation={8} sx={{ p: 0.75, borderRadius: 2, bgcolor: 'background.paper' }}>
              <img
                src={src}
                alt=""
                style={{ display: 'block', width: 240, height: 240, objectFit: 'contain', borderRadius: 8 }}
              />
            </Paper>
          </Fade>
        )}
      </Popper>
    </>
  );
}
