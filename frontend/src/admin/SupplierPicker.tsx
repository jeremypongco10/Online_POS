import { useEffect, useRef, useState } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import AddIcon from '@mui/icons-material/Add';
import HistoryIcon from '@mui/icons-material/History';
import { api } from '../api/client';
import type { Supplier } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { useFormErrors } from './useFormErrors';
import { Modal } from './Modal';

/** The bits of a supplier the picker shows. */
export interface SupplierOption {
  id: number;
  name: string;
  contact_name?: string | null;
  phone?: string | null;
  email?: string | null;
  recent?: boolean;
}

type Row = SupplierOption | { addNew: true; name: string };

const isAdd = (row: Row): row is { addNew: true; name: string } => 'addNew' in row;

interface Props {
  value: SupplierOption | null;
  onChange: (supplier: SupplierOption | null) => void;
  label?: string;
  required?: boolean;
  error?: boolean;
  helperText?: string;
  /** Show the "+ Add new supplier" option. Hidden on filters, and for anyone without suppliers.manage. */
  allowCreate?: boolean;
  size?: 'small' | 'medium';
  placeholder?: string;
}

/**
 * Type-to-search supplier picker. Nothing is loaded up front: an empty box
 * shows the suppliers ordered from most recently, and typing asks the
 * server for the top matches on name, contact person, phone or email —
 * so it stays quick with 20 suppliers or 20,000.
 */
export function SupplierPicker({ value, onChange, label = 'Supplier', required, error, helperText, allowCreate, size, placeholder }: Props) {
  const { hasPermission } = useAuth();
  const canCreate = allowCreate && hasPermission('suppliers.manage');
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [options, setOptions] = useState<SupplierOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // What's typed, minus the selected value's own label — so reopening a
  // filled field shows the recent list instead of "searching" for itself.
  const query = value && input === value.name ? '' : input.trim();

  useEffect(() => {
    if (!open) return;
    if (timer.current) clearTimeout(timer.current);
    setLoading(true);
    timer.current = setTimeout(
      () => {
        api
          .get<SupplierOption[]>(`/purchases/suppliers${query ? `?q=${encodeURIComponent(query)}` : ''}`)
          .then(setOptions)
          .catch(() => setOptions([]))
          .finally(() => setLoading(false));
      },
      query ? 220 : 0
    );
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query, open]);

  const rows: Row[] = [...options];
  if (canCreate && !loading) rows.push({ addNew: true, name: query });

  return (
    <>
      <Autocomplete<Row, false, false, false>
        open={open}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        options={rows}
        value={value}
        onChange={(_, row) => {
          if (row && isAdd(row)) {
            setCreating(row.name);
            return;
          }
          onChange((row as SupplierOption | null) ?? null);
        }}
        inputValue={input}
        onInputChange={(_, text) => setInput(text)}
        filterOptions={(x) => x}
        getOptionLabel={(row) => row.name}
        isOptionEqualToValue={(a, b) => !isAdd(a) && !isAdd(b) && a.id === b.id}
        // Always a function, never toggled to undefined while searching: MUI
        // crashes rendering a list whose grouping changed between renders.
        groupBy={(row) => (isAdd(row) ? ' ' : query ? 'Matches' : row.recent ? 'Ordered recently' : 'Other suppliers')}
        loading={loading}
        size={size}
        noOptionsText={query ? `No supplier matches "${query}"` : 'No suppliers yet'}
        renderOption={(props, row) => {
          const { key, ...rest } = props as typeof props & { key: string };
          if (isAdd(row)) {
            return (
              <Box component="li" key={key} {...rest} sx={{ color: 'primary.main', fontWeight: 600, gap: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                <AddIcon fontSize="small" />
                {row.name ? `Add "${row.name}" as a new supplier` : 'Add a new supplier'}
              </Box>
            );
          }
          const details = [row.contact_name, row.phone, row.email].filter(Boolean).join(' · ');
          return (
            <Box component="li" key={key} {...rest} sx={{ display: 'flex', gap: 1.25, alignItems: 'center' }}>
              {row.recent && !query && <HistoryIcon sx={{ fontSize: 16, color: 'text.secondary' }} />}
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {row.name}
                </Typography>
                {details && (
                  <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                    {details}
                  </Typography>
                )}
              </Box>
            </Box>
          );
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            required={required}
            error={error}
            helperText={helperText}
            placeholder={placeholder ?? 'Type a name, contact person or phone'}
            slotProps={{
              ...params.slotProps,
              input: {
                ...params.slotProps.input,
                endAdornment: (
                  <>
                    {loading && open ? <CircularProgress size={16} /> : null}
                    {params.slotProps.input.endAdornment}
                  </>
                ),
              },
            }}
          />
        )}
      />
      <QuickSupplierDialog
        open={creating !== null}
        initialName={creating ?? ''}
        onClose={() => setCreating(null)}
        onCreated={(s) => {
          setCreating(null);
          onChange({ id: s.id, name: s.name, contact_name: s.contact_name, phone: s.phone, email: s.email });
        }}
      />
    </>
  );
}

/** Just enough to start ordering — the full supplier record can be filled in later under Purchasing → Suppliers. */
function QuickSupplierDialog({ open, initialName, onClose, onCreated }: { open: boolean; initialName: string; onClose: () => void; onCreated: (s: Supplier) => void }) {
  const [form, setForm] = useState({ name: '', contact_name: '', phone: '', email: '' });
  const [saving, setSaving] = useState(false);
  const { fieldErrors, formError, clearErrors, clearField, reportError } = useFormErrors();

  useEffect(() => {
    if (open) {
      setForm({ name: initialName, contact_name: '', phone: '', email: '' });
      clearErrors();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function submit() {
    setSaving(true);
    clearErrors();
    try {
      const created = await api.post<Supplier>('/suppliers', {
        name: form.name.trim(),
        contact_name: form.contact_name.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        is_active: 1,
      });
      onCreated(created);
    } catch (err) {
      reportError(err, 'Could not add the supplier');
    } finally {
      setSaving(false);
    }
  }

  const field = (key: keyof typeof form, label: string, extra?: { required?: boolean; autoFocus?: boolean; type?: string }) => (
    <TextField
      id={`quick-supplier-${key}`}
      label={label}
      fullWidth
      required={extra?.required}
      autoFocus={extra?.autoFocus}
      type={extra?.type}
      value={form[key]}
      onChange={(e) => {
        setForm({ ...form, [key]: e.target.value });
        clearField(key);
      }}
      error={!!fieldErrors?.[key]}
      helperText={fieldErrors?.[key]}
    />
  );

  return (
    <Modal open={open} title="Add a supplier" onClose={onClose} compact>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          submit();
        }}
      >
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          {field('name', 'Supplier name', { required: true, autoFocus: true })}
          {field('contact_name', 'Contact person')}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            {field('phone', 'Phone')}
            {field('email', 'Email', { type: 'email' })}
          </Stack>
          <Typography variant="caption" color="text.secondary">
            You can add the address and TIN later under Purchasing → Suppliers.
          </Typography>
          {formError && <Alert severity="error">{formError}</Alert>}
          <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'flex-end' }}>
            <Button onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={saving || !form.name.trim()}>
              {saving ? 'Adding…' : 'Add supplier'}
            </Button>
          </Stack>
        </Stack>
      </form>
    </Modal>
  );
}
