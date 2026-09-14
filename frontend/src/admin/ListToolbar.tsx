import type { ReactNode } from 'react';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import { SearchField } from '../SearchField';

interface Props {
  /** Omit both of these on a list whose endpoint has no searchable fields — Cash Drawers, say — so the row doesn't carry a box that silently does nothing. */
  search?: string;
  onSearchChange?: (value: string) => void;
  onAdd?: () => void;
  addLabel?: string;
  /** Re-fetches the current page from the server — lets the table be refreshed without reloading the whole app. */
  onRefresh?: () => void;
  /** Spins the refresh icon and disables the button while a fetch triggered by onRefresh (or anything else) is in flight. */
  refreshing?: boolean;
  extra?: ReactNode;
  /** Extra buttons rendered on the right, before (or instead of) the Add button — e.g. Inventory's Adjust/Transfer Stock. */
  actions?: ReactNode;
}

export function ListToolbar({ search, onSearchChange, onAdd, addLabel, onRefresh, refreshing, extra, actions }: Props) {
  return (
    // `gap`, not the Stack `spacing` prop. MUI implements spacing as a
    // margin on every child after the first, which a wrapping row adds
    // on top of the line's own width — so once the filters, search and
    // Add button no longer fit, the row overflowed its card and the
    // button landed on top of the search field instead of wrapping. gap
    // is applied by the grid/flex algorithm itself and is accounted for
    // before anything wraps.
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      sx={{ alignItems: { xs: 'stretch', sm: 'center' }, mb: 2.5, flexWrap: { sm: 'wrap' }, gap: 1.5 }}
    >
      {/* `extra` (e.g. a store filter) gets its own row on a phone — grouping it
          with refresh+search in one row, as before, left next to nothing for the
          search field once `extra` was wide enough (a filter dropdown, not just
          an icon). */}
      {extra}
      {/* Refresh sits inline with the search field (not stranded alone above it) on
          every width. The field itself grows to fill whatever room this group ends
          up with — the row's full width on a phone, or (replacing what used to be a
          separate, purely decorative spacer) whatever's left over next to `extra`
          once `extra` is wide enough to force a wrap, so that row doesn't end in a
          dead gap either. Capped so it doesn't balloon on a wide screen with
          nothing else in the row. */}
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5, flex: { sm: '1 1 240px' }, minWidth: 0 }}>
        {onRefresh && (
          <Tooltip title="Refresh">
            <span>
              <IconButton
                onClick={onRefresh}
                disabled={refreshing}
                aria-label="Refresh"
                sx={{
                  flexShrink: 0,
                  // Matches the search field's own height below (44px) —
                  // both were separately sized "small" before, which put
                  // the icon button a few pixels shorter than the field
                  // sitting right next to it.
                  width: 44,
                  height: 44,
                  border: '1px solid',
                  borderColor: 'divider',
                  '@keyframes spin': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } },
                  animation: refreshing ? 'spin 0.8s linear infinite' : 'none',
                }}
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        )}
        {/* Full-bleed on phones — the 260px default would otherwise overflow a narrow viewport.
            Height/font bumped here rather than in SearchField itself, which the POS product
            search also renders with its own careful, deliberately tighter sizing — this override
            only reaches the admin toolbar's own instance. */}
        {onSearchChange && (
          <SearchField
            value={search ?? ''}
            onChange={onSearchChange}
            sx={{
              // minWidth 0, not 260: a hard floor here is what stopped the
              // field giving ground when the row got crowded, which is how
              // the row came to be wider than the card in the first place.
              // 260 survives as the flex BASIS below — the width it gets
              // when there's room, rather than a width it insists on.
              minWidth: 0,
              maxWidth: { sm: 420 },
              width: '100%',
              flex: { xs: 1, sm: '1 1 260px' },
              '& .MuiOutlinedInput-root': { height: 44, fontSize: 14.5 },
            }}
          />
        )}
      </Stack>
      {/* flexShrink 0 so the primary action keeps its full width and
          label instead of being squeezed by the filters to its left, and
          ml:auto so it stays pinned to the right edge when the row has
          spare room. */}
      <Stack direction="row" sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1.5, flexShrink: 0, ml: { sm: 'auto' } }}>
        {actions}
        {onAdd && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onAdd}
            sx={{
              width: { xs: '100%', sm: 'auto' },
              height: 44,
              px: 2.5,
              borderRadius: 2,
              fontWeight: 600,
              fontSize: 14.5,
              textTransform: 'none',
              boxShadow: 'none',
              '&:hover': { boxShadow: 'none' },
            }}
          >
            {addLabel ?? 'Add'}
          </Button>
        )}
      </Stack>
    </Stack>
  );
}
