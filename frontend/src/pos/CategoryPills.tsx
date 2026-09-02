import { useEffect, useRef, useState } from 'react';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import type { Category } from '../api/types';
import { HIDDEN_SCROLLBAR_SX, POS_ACCENT } from './format';

interface Props {
  categories: Category[];
  selected: number | null;
  onSelect: (categoryId: number | null) => void;
}

/**
 * Root-level category tabs above the product grid — "All" plus one chip per
 * top-level category. The selected pill is forced to a solid fill via sx
 * (not the `color` prop) because the app's global MuiChip override turns
 * any colored chip into a soft 16%-tint badge — right for status badges
 * elsewhere, but not the solid pill this mockup wants.
 */
export function CategoryPills({ categories, selected, onSelect }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const selectedSx = { bgcolor: POS_ACCENT, color: '#fff', '&:hover': { bgcolor: POS_ACCENT } };
  // A crisp white-with-border rest state, not a soft grey fill — this
  // reads as a row of distinct pills sitting on the page rather than a
  // row of tinted chips blending into it. The one solid-blue "All"/
  // selected pill is then the only filled shape in the row, which is what
  // makes it read as "the current filter" at a glance.
  const unselectedSx = {
    bgcolor: '#fff',
    border: '1px solid',
    borderColor: 'divider',
    color: 'text.secondary',
    '&:hover': { borderColor: POS_ACCENT, color: POS_ACCENT, bgcolor: `${POS_ACCENT}0a` },
  };

  function updateScrollButtons() {
    const el = scrollerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }

  useEffect(() => {
    updateScrollButtons();
    const el = scrollerRef.current;
    if (!el) return;

    // Content width changes with the category list (loaded once) and with
    // the column's own width (viewport resize, right panel collapsing) —
    // both can flip whether there's anything left/right to scroll to.
    const resizeObserver = new ResizeObserver(updateScrollButtons);
    resizeObserver.observe(el);
    el.addEventListener('scroll', updateScrollButtons);
    return () => {
      resizeObserver.disconnect();
      el.removeEventListener('scroll', updateScrollButtons);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories.length]);

  function scrollBy(delta: number) {
    scrollerRef.current?.scrollBy({ left: delta, behavior: 'smooth' });
  }

  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      {canScrollLeft && (
        <IconButton
          size="small"
          onClick={() => scrollBy(-220)}
          aria-label="Show previous categories"
          sx={{ flexShrink: 0, border: '1px solid', borderColor: 'divider' }}
        >
          <ChevronLeftIcon fontSize="small" />
        </IconButton>
      )}
      <Stack
        ref={scrollerRef}
        direction="row"
        spacing={1}
        sx={{ overflowX: 'auto', pb: 0.5, scrollBehavior: 'smooth', ...HIDDEN_SCROLLBAR_SX }}
      >
        <Chip
          label="All"
          clickable
          variant={selected === null ? 'filled' : 'outlined'}
          onClick={() => onSelect(null)}
          sx={{ flexShrink: 0, fontWeight: 700, ...(selected === null ? selectedSx : unselectedSx) }}
        />
        {categories.map((c) => (
          <Chip
            key={c.id}
            label={c.name}
            clickable
            variant={selected === c.id ? 'filled' : 'outlined'}
            onClick={() => onSelect(c.id)}
            sx={{ flexShrink: 0, fontWeight: 700, ...(selected === c.id ? selectedSx : unselectedSx) }}
          />
        ))}
      </Stack>
      {canScrollRight && (
        <IconButton
          size="small"
          onClick={() => scrollBy(220)}
          aria-label="Show more categories"
          sx={{ flexShrink: 0, border: '1px solid', borderColor: 'divider' }}
        >
          <ChevronRightIcon fontSize="small" />
        </IconButton>
      )}
    </Stack>
  );
}
