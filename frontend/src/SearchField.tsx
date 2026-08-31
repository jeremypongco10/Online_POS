import type { ReactNode } from 'react';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import type { SxProps, Theme } from '@mui/material/styles';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  fullWidth?: boolean;
  sx?: SxProps<Theme>;
  id?: string;
  /** Extra icon(s) shown at the end, after the Clear button — the POS product search uses this for a decorative barcode-scan icon. */
  trailingAdornment?: ReactNode;
}

/** A pill-shaped, borderless search field — used for both the admin list toolbars and the POS product search. */
export function SearchField({ value, onChange, placeholder, autoFocus, fullWidth, sx, id, trailingAdornment }: Props) {
  return (
    <TextField
      id={id}
      placeholder={placeholder ?? 'Search…'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoFocus={autoFocus}
      fullWidth={fullWidth}
      sx={[
        {
          minWidth: 260,
          '& .MuiOutlinedInput-root': {
            borderRadius: 999,
            bgcolor: 'action.hover',
            transition: 'background-color 0.15s ease, box-shadow 0.15s ease',
            '& fieldset': { border: 'none' },
            '&:hover': { bgcolor: 'action.selected' },
            '&.Mui-focused': {
              bgcolor: 'background.paper',
              boxShadow: (t: Theme) => `0 0 0 2px ${t.palette.primary.main}`,
            },
          },
        },
        sx as object,
      ]}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
            </InputAdornment>
          ),
          endAdornment:
            value || trailingAdornment ? (
              <InputAdornment position="end">
                {value && (
                  <Tooltip title="Clear search">
                    <IconButton size="small" onClick={() => onChange('')} aria-label="Clear search" edge="end">
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                {trailingAdornment}
              </InputAdornment>
            ) : undefined,
        },
      }}
    />
  );
}
