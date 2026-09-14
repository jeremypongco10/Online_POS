import { useEffect, useRef, useState } from 'react';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import type { Category } from '../api/types';
import { HIDDEN_SCROLLBAR_SX, THIN_SCROLLBAR_SX, POS_ACCENT } from './format';

interface Props {
  categories: Category[];
  selected: number | null;
  onSelect: (categoryId: number | null) => void;
  /**
   * 'row' (default) is the original horizontal strip, with its own
   * chevron scroll buttons since horizontal space is tight. 'column'
   * is the left-sidebar layout — a plain vertical list that scrolls on
   * its own; a sidebar has no equivalent space pressure, so it skips the
   * chevron/ResizeObserver machinery entirely rather than reimplementing
   * it sideways.
   */
  orientation?: 'row' | 'column';
}

/**
 * Root-level category picker — "All" plus one chip per top-level category.
 * The selected pill is forced to a solid fill via sx (not the `color`
 * prop) because the app's global MuiChip override turns any colored chip
 * into a soft 16%-tint badge — right for status badges elsewhere, but not
 * the solid pill this mockup wants.
 */
export function CategoryPills({ categories, selected, onSelect, orientation = 'row' }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // MUI's default "medium" Chip (32px tall, 13px label) reads small next
  // to everything else on this screen sized for a touch till — bumped up
  // via sx rather than a bigger size prop (MUI Chip only has small/medium
  // to choose from, and medium is already the larger of the two).
  // Column mode goes full-width with a left-aligned label — a nav-list
  // shape rather than a centered pill, since a pill only reads right
  // sitting loose in a horizontal row, not stacked in a narrow rail. 48
  // tall rather than the row's 38: a rail entry is a primary touch target
  // on a till, where a chip in a horizontal strip is a filter tapped once
  // in a while.
  const sizeSx =
    orientation === 'column'
      ? { height: 48, fontSize: 15, width: '100%', justifyContent: 'flex-start', px: 1 }
      : { height: 38, fontSize: 14.5, px: 0.5 };
  const selectedSx = { ...sizeSx, bgcolor: POS_ACCENT, color: '#fff', '&:hover': { bgcolor: POS_ACCENT } };
  // A crisp white-with-border rest state, not a soft grey fill — this
  // reads as a row of distinct pills sitting on the page rather than a
  // row of tinted chips blending into it. The one solid-blue "All"/
  // selected pill is then the only filled shape in the row, which is what
  // makes it read as "the current filter" at a glance.
  const unselectedSx = {
    ...sizeSx,
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

  if (orientation === 'column') {
    return (
      <Stack spacing={0.75} sx={{ overflowY: 'auto', height: '100%', pr: 0.5, ...THIN_SCROLLBAR_SX }}>
        <Chip
          label="All"
          clickable
          variant={selected === null ? 'filled' : 'outlined'}
          onClick={() => onSelect(null)}
          // flexShrink:0 is load-bearing here, not decorative: this Stack
          // is a column flex container, so without it a long category list
          // that doesn't fit the rail's height gets its chips squeezed
          // shorter to cram everything in instead of overflowing — the
          // exact "looks small" a scrollbar is supposed to prevent.
          sx={{ flexShrink: 0, fontWeight: 700, borderRadius: 2, '& .MuiChip-label': { pl: 0.5 }, ...(selected === null ? selectedSx : unselectedSx) }}
        />
        {categories.map((c) => (
          // A long name is what the fixed rail width truncates with an
          // ellipsis in the first place — the tooltip is how the full
          // name stays reachable without widening the rail for the rare
          // long one at the cost of the grid next to it.
          <Tooltip key={c.id} title={c.name} placement="right">
            <Chip
              label={c.name}
              clickable
              variant={selected === c.id ? 'filled' : 'outlined'}
              onClick={() => onSelect(c.id)}
              sx={{ flexShrink: 0, fontWeight: 700, borderRadius: 2, '& .MuiChip-label': { pl: 0.5 }, ...(selected === c.id ? selectedSx : unselectedSx) }}
            />
          </Tooltip>
        ))}
      </Stack>
    );
  }

  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      {canScrollLeft && (
        <IconButton
          onClick={() => scrollBy(-220)}
          aria-label="Show previous categories"
          sx={{ flexShrink: 0, width: 38, height: 38, border: '1px solid', borderColor: 'divider' }}
        >
          <ChevronLeftIcon />
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
          onClick={() => scrollBy(220)}
          aria-label="Show more categories"
          sx={{ flexShrink: 0, width: 38, height: 38, border: '1px solid', borderColor: 'divider' }}
        >
          <ChevronRightIcon />
        </IconButton>
      )}
    </Stack>
  );
}
