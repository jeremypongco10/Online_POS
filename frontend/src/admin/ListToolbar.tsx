import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import AddIcon from '@mui/icons-material/Add';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
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
}

export function ListToolbar({ search, onSearchChange, onAdd, addLabel, onRefresh, refreshing, extra }: Props) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2, flexWrap: 'wrap', rowGap: 1 }}>
      <SearchField value={search} onChange={onSearchChange} />
      {onRefresh && (
        <Tooltip title="Refresh">
          <span>
            <IconButton
              onClick={onRefresh}
              disabled={refreshing}
              aria-label="Refresh"
              sx={{ color: 'text.secondary' }}
            >
              <RefreshOutlinedIcon
                fontSize="small"
                sx={
                  refreshing
                    ? {
                        animation: 'list-toolbar-spin 0.7s linear infinite',
                        '@keyframes list-toolbar-spin': {
                          from: { transform: 'rotate(0deg)' },
                          to: { transform: 'rotate(360deg)' },
                        },
                      }
                    : undefined
                }
              />
            </IconButton>
          </span>
        </Tooltip>
      )}
      {extra}
      <Box sx={{ flex: 1 }} />
      {onAdd && (
        <Button variant="contained" startIcon={<AddIcon />} onClick={onAdd}>
          {addLabel ?? 'Add'}
        </Button>
      )}
    </Stack>
  );
}
