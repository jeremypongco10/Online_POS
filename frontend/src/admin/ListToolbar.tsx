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
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2, flexWrap: 'wrap', rowGap: 1 }}>
      {extra}
      {onRefresh && (
        <Tooltip title="Refresh">
          <span>
            <IconButton
              size="small"
              onClick={onRefresh}
              disabled={refreshing}
              aria-label="Refresh"
              sx={{
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
      <Box sx={{ flex: 1, display: { xs: 'none', sm: 'block' } }} />
      {/* Full-bleed on phones — the 260px default would otherwise overflow a narrow viewport. */}
      <SearchField value={search} onChange={onSearchChange} sx={{ minWidth: { xs: 0, sm: 260 }, width: { xs: '100%', sm: 'auto' } }} />
      {actions}
      {onAdd && (
        <Button variant="contained" startIcon={<AddIcon />} onClick={onAdd}>
          {addLabel ?? 'Add'}
        </Button>
      )}
    </Stack>
  );
}
