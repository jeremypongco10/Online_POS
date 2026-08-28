import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { SearchableSelect, type SearchableSelectOption } from './SearchableSelect';

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  minWidth?: number;
  options: SearchableSelectOption[];
  /**
   * Collapses the flanking label at `xs` and lets the field grow to share
   * its row instead of claiming the full width — for a toolbar with two
   * or more of these on a phone, the label text is what forces each one
   * onto its own row; the select's own placeholder ("All Categories",
   * "All") already names the filter, so nothing is lost by hiding it.
   * Off by default so a lone filter elsewhere keeps its labeled look.
   */
  compactOnMobile?: boolean;
}

/** A searchable `select` filter for a ListToolbar's `extra` slot, with its label inline instead of stacked above (which would make it taller than the rest of the toolbar row). */
export function InlineSelectFilter({ label, value, onChange, minWidth = 200, options, compactOnMobile }: Props) {
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{ alignItems: 'center', flex: compactOnMobile ? { xs: 1, sm: 'initial' } : undefined, minWidth: 0 }}
    >
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ fontWeight: 600, whiteSpace: 'nowrap', display: compactOnMobile ? { xs: 'none', sm: 'block' } : 'block' }}
      >
        {label}
      </Typography>
      <SearchableSelect
        value={value}
        onChange={onChange}
        options={options}
        sx={compactOnMobile ? { minWidth: { xs: 0, sm: minWidth }, width: { xs: '100%', sm: 'auto' }, flex: { xs: 1, sm: 'initial' } } : { minWidth }}
      />
    </Stack>
  );
}
