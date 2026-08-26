import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import { SearchField } from '../SearchField';

interface Props {
  search: string;
  onSearchChange: (value: string) => void;
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
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { xs: 'stretch', sm: 'center' }, mb: 2, flexWrap: { sm: 'wrap' } }}>
      {/* `extra` (e.g. a store filter) gets its own row on a phone — grouping it
          with refresh+search in one row, as before, left next to nothing for the
          search field once `extra` was wide enough (a filter dropdown, not just
          an icon). */}
      {extra}
      {/* Refresh sits inline with the search field (not stranded alone above it) on
          every width — only the field itself grows to fill the row on a phone. */}
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        {onRefresh && (
          <Tooltip title="Refresh">
            <span>
              <IconButton
                size="small"
                onClick={onRefresh}
                disabled={refreshing}
                aria-label="Refresh"
                sx={{
                  flexShrink: 0,
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
        {/* Full-bleed on phones — the 260px default would otherwise overflow a narrow viewport. */}
        <SearchField
          value={search}
          onChange={onSearchChange}
          sx={{ minWidth: { xs: 0, sm: 260 }, width: { xs: '100%', sm: 'auto' }, flex: { xs: 1, sm: 'initial' } }}
        />
      </Stack>
      <Box sx={{ flex: 1, display: { xs: 'none', sm: 'block' } }} />
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
        {actions}
        {onAdd && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={onAdd} sx={{ width: { xs: '100%', sm: 'auto' } }}>
            {addLabel ?? 'Add'}
          </Button>
        )}
      </Stack>
    </Stack>
  );
}
