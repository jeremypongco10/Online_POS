import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import type { SxProps, Theme } from '@mui/material/styles';

export interface SearchableSelectOption {
  value: string;
  label: string;
}

interface Props {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  error?: boolean;
  helperText?: ReactNode;
  required?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  autoFocus?: boolean;
  sx?: SxProps<Theme>;
  /**
   * Lets a caller focus this input imperatively — needed inside a Dialog,
   * whose own focus-trap steals focus back after `autoFocus` fires (see
   * BaggerPanel/ProductBrowser). Applied to a wrapping element rather than
   * the input itself: Autocomplete generates and tracks its own id
   * internally (for the listbox's aria-owns/aria-controls), and
   * overriding that on the rendered TextField would desync it from what
   * Autocomplete's ARIA attributes actually point to.
   */
  wrapperId?: string;
}

/**
 * A type-to-filter dropdown for anywhere a plain `<TextField select>` would
 * otherwise force scrolling through a long option list — every entity
 * picker (store, category, supplier, role, product, …) and list filter in
 * the admin/POS UI uses this instead of MUI's native Select.
 */
export function SearchableSelect({
  label,
  placeholder,
  value,
  onChange,
  options,
  error,
  helperText,
  required,
  disabled,
  fullWidth,
  autoFocus,
  sx,
  wrapperId,
}: Props) {
  const selected = options.find((o) => o.value === value) ?? null;

  const autocomplete = (
    <Autocomplete
      size="small"
      options={options}
      value={selected}
      onChange={(_, newValue) => onChange(newValue?.value ?? '')}
      getOptionLabel={(o) => o.label}
      isOptionEqualToValue={(a, b) => a.value === b.value}
      disabled={disabled}
      fullWidth={fullWidth}
      sx={sx}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          required={required}
          error={error}
          helperText={helperText}
          autoFocus={autoFocus}
        />
      )}
    />
  );

  return wrapperId ? <Box id={wrapperId}>{autocomplete}</Box> : autocomplete;
}
