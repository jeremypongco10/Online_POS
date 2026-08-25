import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { SearchableSelect, type SearchableSelectOption } from './SearchableSelect';

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  minWidth?: number;
  options: SearchableSelectOption[];
}

/** A searchable `select` filter for a ListToolbar's `extra` slot, with its label inline instead of stacked above (which would make it taller than the rest of the toolbar row). */
export function InlineSelectFilter({ label, value, onChange, minWidth = 200, options }: Props) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
        {label}
      </Typography>
      <SearchableSelect value={value} onChange={onChange} options={options} sx={{ minWidth }} />
    </Stack>
  );
}
