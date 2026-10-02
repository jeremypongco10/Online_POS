import { useState, type ReactElement } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import GridOnOutlinedIcon from '@mui/icons-material/GridOnOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import type { Store } from '../../api/types';
import { InlineSelectFilter } from '../InlineSelectFilter';
import { RANGE_PRESETS, type DateRange } from './reportUtils';

/** The report's name and what it answers, with the branch picker beside it. */
export function ReportHeader({
  title,
  description,
  stores,
  storeId,
  onStoreChange,
  hideStore,
}: {
  title: string;
  description: string;
  stores: Store[];
  storeId: string;
  onStoreChange: (id: string) => void;
  /** Reports that already compare every branch. */
  hideStore?: boolean;
}) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: 1.5, mb: 2 }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontWeight: 800, fontSize: 18 }}>{title}</Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </Box>
      {!hideStore && stores.length > 1 && (
        <InlineSelectFilter
          label="Branch"
          value={storeId}
          onChange={onStoreChange}
          minWidth={220}
          options={[{ value: '', label: 'All branches' }, ...stores.map((s) => ({ value: String(s.id), label: s.name }))]}
        />
      )}
    </Stack>
  );
}

export interface ReportOption<K extends string> {
  value: K;
  label: string;
  icon: ReactElement;
}

/** Every report in a tab as one-click chips, grouped, instead of a dropdown that hides them. */
export function ReportPicker<K extends string>({
  groups,
  value,
  onChange,
}: {
  groups: { label: string; options: ReportOption<K>[] }[];
  value: K;
  onChange: (value: K) => void;
}) {
  return (
    <Stack spacing={1} sx={{ mb: 2.5, p: 1.5, borderRadius: '14px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
      {groups.map((g) => (
        <Stack key={g.label} direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 0.75, md: 1.5 }} sx={{ alignItems: { md: 'center' } }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', minWidth: 96, flexShrink: 0 }}>
            {g.label}
          </Typography>
          <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap' }} useFlexGap>
            {g.options.map((o) => {
              const on = o.value === value;
              return (
                <Chip
                  key={o.value}
                  icon={o.icon}
                  label={o.label}
                  clickable
                  onClick={() => onChange(o.value)}
                  color={on ? 'primary' : 'default'}
                  variant={on ? 'filled' : 'outlined'}
                  sx={{ fontWeight: 600, '& .MuiChip-icon': { fontSize: 17, color: 'inherit' } }}
                />
              );
            })}
          </Stack>
        </Stack>
      ))}
    </Stack>
  );
}

/** Quick date picks plus exact From/To. */
export function DateRangeBar({ range, onChange, note }: { range: DateRange; onChange: (r: DateRange) => void; note?: string }) {
  const active = RANGE_PRESETS.find((p) => {
    const v = p.range();
    return v.from === range.from && v.to === range.to;
  });
  return (
    <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.5} sx={{ mb: 2, alignItems: { lg: 'center' } }}>
      <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap' }} useFlexGap>
        {RANGE_PRESETS.map((p) => (
          <Chip
            key={p.key}
            label={p.label}
            clickable
            onClick={() => onChange(p.range())}
            color={active?.key === p.key ? 'primary' : 'default'}
            variant={active?.key === p.key ? 'filled' : 'outlined'}
            sx={{ fontWeight: 600 }}
          />
        ))}
      </Stack>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <TextField
          type="date"
          size="small"
          label="From"
          value={range.from}
          onChange={(e) => onChange({ ...range, from: e.target.value })}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: range.to || undefined } }}
        />
        <TextField
          type="date"
          size="small"
          label="To"
          value={range.to}
          onChange={(e) => onChange({ ...range, to: e.target.value })}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: range.from || undefined } }}
        />
      </Stack>
      {note && (
        <Typography variant="caption" color="text.secondary">
          {note}
        </Typography>
      )}
    </Stack>
  );
}

/** Export ▾ — Excel, CSV, or a printable PDF of the report on screen. */
export function ExportButton({ onExport, disabled }: { onExport: (format: 'xlsx' | 'csv' | 'pdf') => Promise<void> | void; disabled?: boolean }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(format: 'xlsx' | 'csv' | 'pdf') {
    setAnchor(null);
    setBusy(true);
    try {
      await onExport(format);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="outlined" startIcon={<FileDownloadOutlinedIcon />} endIcon={<ExpandMoreIcon />} disabled={disabled || busy} onClick={(e) => setAnchor(e.currentTarget)}>
        {busy ? 'Preparing…' : 'Export'}
      </Button>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <ListSubheader sx={{ lineHeight: '32px' }}>Spreadsheet</ListSubheader>
        <MenuItem onClick={() => run('xlsx')}>
          <ListItemIcon>
            <GridOnOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Excel (.xlsx)" secondary="Numbers stay numbers, ready to total" />
        </MenuItem>
        <MenuItem onClick={() => run('csv')}>
          <ListItemIcon>
            <DescriptionOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="CSV" secondary="For other systems and Google Sheets" />
        </MenuItem>
        <ListSubheader sx={{ lineHeight: '32px' }}>Print / PDF</ListSubheader>
        <MenuItem onClick={() => run('pdf')}>
          <ListItemIcon>
            <PrintOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Printable report" secondary="Choose Save as PDF in the print window" />
        </MenuItem>
      </Menu>
    </>
  );
}

/** A row's share of the whole, as a bar and a percentage. */
export function ShareBar({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 120 }}>
      <Box sx={{ flex: 1, height: 8, borderRadius: 999, bgcolor: 'action.hover', overflow: 'hidden' }}>
        <Box sx={{ width: `${Math.min(100, pct)}%`, height: '100%', borderRadius: 999, bgcolor: 'primary.main' }} />
      </Box>
      <Typography variant="caption" sx={{ fontWeight: 700, width: 42, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
        {pct >= 10 ? pct.toFixed(0) : pct.toFixed(1)}%
      </Typography>
    </Stack>
  );
}
