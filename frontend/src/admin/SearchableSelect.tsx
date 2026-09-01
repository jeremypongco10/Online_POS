import type { ReactNode } from 'react';
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
}: Props) {
  const selected = options.find((o) => o.value === value) ?? null;

  return (
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
}
