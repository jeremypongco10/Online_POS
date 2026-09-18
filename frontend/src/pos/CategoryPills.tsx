import { useEffect, useRef, useState, type ReactElement } from 'react';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AppsIcon from '@mui/icons-material/Apps';
import GrassOutlinedIcon from '@mui/icons-material/GrassOutlined';
import SetMealOutlinedIcon from '@mui/icons-material/SetMealOutlined';
import LocalCafeOutlinedIcon from '@mui/icons-material/LocalCafeOutlined';
import CookieOutlinedIcon from '@mui/icons-material/CookieOutlined';
import FaceRetouchingNaturalOutlinedIcon from '@mui/icons-material/FaceRetouchingNaturalOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import BakeryDiningOutlinedIcon from '@mui/icons-material/BakeryDiningOutlined';
import AcUnitOutlinedIcon from '@mui/icons-material/AcUnitOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import LiquorOutlinedIcon from '@mui/icons-material/LiquorOutlined';
import CleaningServicesOutlinedIcon from '@mui/icons-material/CleaningServicesOutlined';
import LabelOutlinedIcon from '@mui/icons-material/LabelOutlined';
import type { Category } from '../api/types';
import { HIDDEN_SCROLLBAR_SX, POS_ACCENT } from './format';

interface Props {
  categories: Category[];
  selected: number | null;
  onSelect: (categoryId: number | null) => void;
}

/**
 * Keyword → icon, matched against the category's own name.
 *
 * A category has no icon column, and adding one would mean a migration
 * plus an icon picker in Back Office for something a cashier reads as
 * decoration — so the name earns the glyph instead. Ordered most specific
 * first: "Grocery & Canned Goods" has to match before a bare "can", and
 * "Personal Care" before "care". Anything unmatched keeps a neutral tag
 * rather than a wrong-but-confident picture.
 */
// Component types rather than rendered elements: a table of live JSX also
// trips the jsx-key lint rule, which can't tell a lookup table from a
// rendered list, and storing the type lets each call site size its own
// instance.
const ICON_RULES: Array<[RegExp, typeof LabelOutlinedIcon]> = [
  [/bakery|bread|pastr/i, BakeryDiningOutlinedIcon],
  [/frozen|chilled|ice/i, AcUnitOutlinedIcon],
  [/meat|seafood|fish|poultry/i, SetMealOutlinedIcon],
  [/beverage|drink|juice|coffee|water/i, LocalCafeOutlinedIcon],
  [/snack|chip|candy|biscuit/i, CookieOutlinedIcon],
  [/personal care|hygiene|beauty|cosmetic/i, FaceRetouchingNaturalOutlinedIcon],
  [/household|cleaning|laundry/i, CleaningServicesOutlinedIcon],
  [/grocery|canned|grain|staple|rice|noodle/i, GrassOutlinedIcon],
  [/school|office|paper|supplies/i, EditOutlinedIcon],
  [/tobacco|alcohol|liquor|beer|wine/i, LiquorOutlinedIcon],
  [/home|furnish/i, HomeOutlinedIcon],
];

function iconForCategory(name: string): ReactElement {
  for (const [pattern, Icon] of ICON_RULES) {
    if (pattern.test(name)) return <Icon fontSize="small" />;
  }
  return <LabelOutlinedIcon fontSize="small" />;
}

/**
 * The category strip under the top bar — "All" plus one pill per
 * top-level category, each with an icon so the row can be aimed at rather
 * than read.
 *
 * Horizontal with its own chevron scrollers rather than a wrapping row:
 * wrapping would make this band grow a line taller every time a category
 * is added, silently taking that height from the product grid. Scrolling
 * keeps the cost fixed at exactly one row however long the catalog's
 * category list gets.
 */
export function CategoryPills({ categories, selected, onSelect }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

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
    // Content width changes with the category list and with this row's own
    // width (viewport resize, the cart column growing) — either can flip
    // whether there's anything left to scroll to.
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

  function pill(key: string, label: string, icon: ReactElement, isSelected: boolean, onClick: () => void) {
    return (
      <ButtonBase
        key={key}
        onClick={onClick}
        sx={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 0.875,
          height: 44,
          px: 2,
          borderRadius: 999,
          fontWeight: 700,
          fontSize: 14,
          whiteSpace: 'nowrap',
          border: '1px solid',
          borderColor: isSelected ? POS_ACCENT : 'divider',
          bgcolor: isSelected ? POS_ACCENT : 'background.paper',
          color: isSelected ? '#fff' : 'text.primary',
          // Colour only — no lift, no shadow growth. This row sits
          // directly above a grid of cards that already carry their own
          // elevation, and a second moving surface above them read as
          // restless on a screen a cashier stares at all shift.
          transition: 'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease',
          '&:hover': isSelected
            ? { bgcolor: POS_ACCENT }
            : { borderColor: POS_ACCENT, color: POS_ACCENT, bgcolor: `${POS_ACCENT}0a` },
        }}
      >
        <Box sx={{ display: 'flex', color: isSelected ? '#fff' : POS_ACCENT }}>{icon}</Box>
        {label}
      </ButtonBase>
    );
  }

  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
      {canScrollLeft && (
        <IconButton
          onClick={() => scrollBy(-260)}
          aria-label="Show previous categories"
          sx={{ flexShrink: 0, width: 38, height: 38, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}
        >
          <ChevronLeftIcon fontSize="small" />
        </IconButton>
      )}
      <Stack
        ref={scrollerRef}
        direction="row"
        spacing={1.25}
        sx={{ overflowX: 'auto', minWidth: 0, py: 0.25, scrollBehavior: 'smooth', ...HIDDEN_SCROLLBAR_SX }}
      >
        {pill('all', 'All', <AppsIcon fontSize="small" />, selected === null, () => onSelect(null))}
        {categories.map((c) => pill(String(c.id), c.name, iconForCategory(c.name), selected === c.id, () => onSelect(c.id)))}
      </Stack>
      {canScrollRight && (
        <IconButton
          onClick={() => scrollBy(260)}
          aria-label="Show more categories"
          sx={{ flexShrink: 0, width: 38, height: 38, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}
        >
          <ChevronRightIcon fontSize="small" />
        </IconButton>
      )}
    </Stack>
  );
}
