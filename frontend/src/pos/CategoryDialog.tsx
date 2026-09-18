import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import ButtonBase from '@mui/material/ButtonBase';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import AppsIcon from '@mui/icons-material/Apps';
import SearchOffOutlinedIcon from '@mui/icons-material/SearchOffOutlined';
import type { Category } from '../api/types';
import { SearchField } from '../SearchField';
import { POS_ACCENT, THIN_SCROLLBAR_SX } from './format';
import { colorForName, initialsForName } from './productColor';

interface Props {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  /** null = the "All Products" tile, i.e. no category filter at all. */
  selected: number | null;
  onSelect: (categoryId: number | null) => void;
}

/**
 * The POS's category picker, opened from the Category button beside the
 * product search. It is the only way into a category filter now — the
 * strip of pills that used to sit under the search field is gone, because
 * every product in a barcoded catalog is normally found by scanning and a
 * permanent row of chips charged the grid height on every screen for a
 * fallback.
 *
 * Tiles carry the same coloured-initials chip a photo-less ProductCard
 * uses (see productColor), which is what makes them scannable: an earlier
 * pass was plain bordered rectangles of text, and with a dozen of them
 * every tile read identically — the eye had to actually read each name
 * rather than aim at a remembered colour and position.
 */
export function CategoryDialog({ open, onClose, categories, selected, onSelect }: Props) {
  const [filter, setFilter] = useState('');

  // Cleared on each open rather than on close: wiping it during the close
  // transition visibly re-expands the list for the moment the dialog is
  // still fading out.
  useEffect(() => {
    if (open) setFilter('');
  }, [open]);

  const matches = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, filter]);

  function choose(categoryId: number | null) {
    onSelect(categoryId);
    onClose();
  }

  /**
   * One tile. `accent` drives the avatar chip — a per-category hue for a
   * real category, the POS accent for the "All Products" reset.
   *
   * The selected state is a tinted background and a 2px accent border
   * rather than a solid accent fill: a solid fill would have to sit
   * behind the coloured avatar chip, which is the one thing on the tile
   * doing the identifying, and the two colours fought. The tint keeps the
   * chip readable while still making the current filter obvious.
   */
  function tile(key: string, label: string, accent: string, badge: ReactNode, isSelected: boolean, onClick: () => void, fullWidth = false) {
    return (
      <ButtonBase
        key={key}
        onClick={onClick}
        sx={{
          width: '100%',
          gridColumn: fullWidth ? '1 / -1' : undefined,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: 1.5,
          minHeight: 68,
          borderRadius: 2.5,
          textAlign: 'left',
          border: isSelected ? '2px solid' : '1px solid',
          borderColor: isSelected ? POS_ACCENT : 'divider',
          // Padding absorbs the 1px the selected border adds, so picking a
          // tile doesn't nudge its own contents (or reflow the row) by a
          // pixel as the border thickens.
          padding: isSelected ? '9px 13px' : '10px 14px',
          bgcolor: isSelected ? `${POS_ACCENT}14` : 'background.paper',
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.05)',
          transition: 'border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease',
          '&:hover': {
            borderColor: POS_ACCENT,
            bgcolor: isSelected ? `${POS_ACCENT}14` : `${POS_ACCENT}08`,
            boxShadow: '0 4px 14px rgba(15, 23, 42, 0.10)',
          },
        }}
      >
        <Box
          sx={{
            flexShrink: 0,
            width: 42,
            height: 42,
            borderRadius: 2,
            bgcolor: accent,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: 15,
            letterSpacing: '0.02em',
          }}
        >
          {badge}
        </Box>
        {/* minWidth:0 so a long name ellipsises inside the tile instead of
            widening it past its grid column. */}
        <Typography
          sx={{
            flex: 1,
            minWidth: 0,
            fontWeight: 700,
            fontSize: 15,
            lineHeight: 1.3,
            color: 'text.primary',
            // Two lines, then ellipsis — "School & Office Supplies" needs
            // the second line, nothing in a category list needs a third.
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {label}
        </Typography>
        {isSelected && <CheckIcon fontSize="small" sx={{ flexShrink: 0, color: POS_ACCENT }} />}
      </ButtonBase>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: { sx: { borderRadius: 3 } },
        // Same trick the Customer/Bagger dialogs use: Dialog's focus trap
        // reclaims focus onto the close button as the open transition
        // ends, so the filter has to be focused after that rather than via
        // its own autoFocus.
        transition: { onEntered: () => document.getElementById('category-dialog-filter')?.focus() },
      }}
    >
      {/* Title carries ONLY the heading and the close button. The subtitle
          deliberately lives in the content below, next to the filter
          field: MUI forces `padding-top: 0` on any DialogContent that
          follows a DialogTitle (via its own
          `.MuiDialogTitle-root + .MuiDialogContent-root` rule, which
          outranks anything sx can set on the content), so the two used to
          sit 6-8px apart across that boundary — a gap the field's 2px
          focus ring and the POS's own auto-fit zoom closed entirely,
          printing the subtitle through the search box. In one flow they
          cannot collide however the page is scaled. */}
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1.5, fontWeight: 800 }}>
        Categories
        <IconButton size="small" onClick={onClose} aria-label="Close">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pb: 3 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2, fontWeight: 500 }}>
          {categories.length === 0
            ? 'No categories set up yet'
            : `${categories.length} ${categories.length === 1 ? 'category' : 'categories'} — pick one to filter the products`}
        </Typography>

        {/* Only worth a filter box once there are enough names that reading
            the grid beats typing — below that it is just another control
            in the way of the two taps this dialog exists for. */}
        {categories.length > 8 && (
          <SearchField
            id="category-dialog-filter"
            value={filter}
            onChange={setFilter}
            placeholder="Filter categories"
            fullWidth
            sx={{ mb: 2, '& .MuiOutlinedInput-root': { height: 46 } }}
          />
        )}

        <Box
          sx={{
            maxHeight: '56vh',
            overflowY: 'auto',
            // Room for the hover shadow and the 2px selected border to
            // land, instead of being sliced against the scroller's edge.
            p: 0.5,
            display: 'grid',
            // Wraps to whatever fits rather than a fixed column count, so
            // this works at phone width (one column) and on a wide till
            // (three) without a breakpoint for each.
            gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
            gap: 1.25,
            ...THIN_SCROLLBAR_SX,
          }}
        >
          {/* Spans the full row and stays put no matter what is typed in
              the filter: it clears the filter rather than applying one, so
              a cashier reaching for the reset should never have to find it
              among the names it resets. */}
          {tile(
            'all',
            'All Products',
            POS_ACCENT,
            <AppsIcon fontSize="small" />,
            selected === null,
            () => choose(null),
            true
          )}

          {matches.map((c) =>
            tile(String(c.id), c.name, colorForName(c.name), initialsForName(c.name), selected === c.id, () => choose(c.id))
          )}
        </Box>

        {matches.length === 0 && (
          <Stack sx={{ alignItems: 'center', textAlign: 'center', py: 4, color: 'text.secondary' }}>
            <SearchOffOutlinedIcon sx={{ fontSize: 40, opacity: 0.4, mb: 1.5 }} />
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
              {`No categories match "${filter.trim()}"`}
            </Typography>
            <Typography variant="caption">Check the spelling, or clear the filter.</Typography>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
