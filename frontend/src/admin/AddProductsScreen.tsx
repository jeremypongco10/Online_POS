import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { api, ApiError } from '../api/client';
import type { BulkProductResponse, Category, TaxRate, Unit } from '../api/types';
import { useSnackbar } from '../Snackbar';
import { useFormErrors } from './useFormErrors';
import { SearchableSelect } from './SearchableSelect';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Checkbox from '@mui/material/Checkbox';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import NoteAddOutlinedIcon from '@mui/icons-material/NoteAddOutlined';
import PlaylistAddOutlinedIcon from '@mui/icons-material/PlaylistAddOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';

type Method = 'single' | 'bulk' | 'import';

const METHODS: { key: Method; title: string; description: string; icon: typeof NoteAddOutlinedIcon }[] = [
  {
    key: 'single',
    title: 'Single Product',
    description: 'Add one product with a full form — same fields as editing a product.',
    icon: NoteAddOutlinedIcon,
  },
  {
    key: 'bulk',
    title: 'Bulk Add',
    description: 'Fill out a spreadsheet-style grid to add several products in one go.',
    icon: PlaylistAddOutlinedIcon,
  },
  {
    key: 'import',
    title: 'Import from File',
    description: 'Upload a CSV of products, review the preview, then import them all at once.',
    icon: UploadFileOutlinedIcon,
  },
];

/** Shared by every method here — loaded once, reused for the Single form, Bulk grid selects, and CSV name→id resolution. */
function useReferenceData() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [taxes, setTaxes] = useState<TaxRate[]>([]);

  useEffect(() => {
    api.get<Category[]>('/categories?per_page=200').then(setCategories);
    api.get<Unit[]>('/units?per_page=100').then(setUnits);
    api.get<TaxRate[]>('/taxes?per_page=100').then(setTaxes);
  }, []);

  return { categories, units, taxes };
}

export function AddProductsScreen() {
  const [method, setMethod] = useState<Method | null>(null);
  const refData = useReferenceData();

  if (method === null) {
    return (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Choose how you'd like to add products.
        </Typography>
        <Grid container spacing={2}>
          {METHODS.map((m) => (
            <Grid key={m.key} size={{ xs: 12, sm: 4 }}>
              <Paper
                variant="outlined"
                onClick={() => setMethod(m.key)}
                sx={{
                  p: 3,
                  height: '100%',
                  borderRadius: 3,
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'border-color 0.15s ease, background-color 0.15s ease',
                  '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                }}
              >
                <Box
                  sx={{
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    mx: 'auto',
                    mb: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'color-mix(in srgb, var(--mui-palette-primary-main) 14%, transparent)',
                    color: 'primary.main',
                  }}
                >
                  <m.icon />
                </Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {m.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {m.description}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box>
      <Button startIcon={<ArrowBackOutlinedIcon fontSize="small" />} onClick={() => setMethod(null)} sx={{ mb: 2 }}>
        Back to options
      </Button>
      {method === 'single' && <SinglePanel {...refData} />}
      {method === 'bulk' && <BulkPanel {...refData} />}
      {method === 'import' && <ImportPanel {...refData} />}
    </Box>
  );
}

interface RefData {
  categories: Category[];
  units: Unit[];
  taxes: TaxRate[];
}

// ---------------------------------------------------------------------------
// Single Product
// ---------------------------------------------------------------------------

interface SingleForm {
  sku: string;
  barcode: string;
  name: string;
  description: string;
  category_id: string;
  unit_id: string;
  tax_rate_id: string;
  minimum_stock: string;
  is_active: boolean;
}

const EMPTY_SINGLE: SingleForm = {
  sku: '',
  barcode: '',
  name: '',
  description: '',
  category_id: '',
  unit_id: '',
  tax_rate_id: '',
  minimum_stock: '0',
  is_active: true,
};

function SinglePanel({ categories, units, taxes }: RefData) {
  const notify = useSnackbar();
  const [form, setForm] = useState<SingleForm>(EMPTY_SINGLE);
  const [saving, setSaving] = useState(false);
  const { fieldErrors, formError, clearErrors, clearField, reportError } = useFormErrors();

  async function submit() {
    setSaving(true);
    clearErrors();
    try {
      await api.post('/products', {
        sku: form.sku,
        barcode: form.barcode || null,
        name: form.name,
        description: form.description || null,
        category_id: form.category_id || null,
        unit_id: form.unit_id || null,
        tax_rate_id: form.tax_rate_id || null,
        minimum_stock: form.minimum_stock,
        is_active: form.is_active ? 1 : 0,
        track_inventory: 1,
      });
      notify('Product created — add its photo from the Products tab if it needs one.');
      // Deliberately not navigating away — a quick-add flow reads as
      // "one form, keep going" more than "one form, then close".
      setForm(EMPTY_SINGLE);
    } catch (err) {
      reportError(err, 'Failed to create product');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, maxWidth: 640 }}>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="SKU"
              fullWidth
              value={form.sku}
              onChange={(e) => {
                setForm({ ...form, sku: e.target.value });
                clearField('sku');
              }}
              error={!!fieldErrors?.sku}
              helperText={fieldErrors?.sku}
              required
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Barcode"
              fullWidth
              value={form.barcode}
              onChange={(e) => {
                setForm({ ...form, barcode: e.target.value });
                clearField('barcode');
              }}
              error={!!fieldErrors?.barcode}
              helperText={fieldErrors?.barcode}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Name"
              fullWidth
              value={form.name}
              onChange={(e) => {
                setForm({ ...form, name: e.target.value });
                clearField('name');
              }}
              error={!!fieldErrors?.name}
              helperText={fieldErrors?.name}
              required
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <SearchableSelect
              label="Category"
              fullWidth
              value={form.category_id}
              onChange={(v) => setForm({ ...form, category_id: v })}
              options={[{ value: '', label: '— None —' }, ...categories.map((c) => ({ value: String(c.id), label: c.name }))]}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <SearchableSelect
              label="Unit"
              fullWidth
              value={form.unit_id}
              onChange={(v) => setForm({ ...form, unit_id: v })}
              options={[{ value: '', label: '— None —' }, ...units.map((u) => ({ value: String(u.id), label: `${u.name} (${u.abbreviation})` }))]}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <SearchableSelect
              label="Tax Rate"
              fullWidth
              value={form.tax_rate_id}
              onChange={(v) => setForm({ ...form, tax_rate_id: v })}
              options={[{ value: '', label: '— None —' }, ...taxes.map((t) => ({ value: String(t.id), label: `${t.name} (${t.rate}%)` }))]}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Minimum Stock"
              type="number"
              fullWidth
              slotProps={{ htmlInput: { step: '0.0001' } }}
              value={form.minimum_stock}
              onChange={(e) => {
                setForm({ ...form, minimum_stock: e.target.value });
                clearField('minimum_stock');
              }}
              error={!!fieldErrors?.minimum_stock}
              helperText={fieldErrors?.minimum_stock}
            />
          </Grid>

          {formError && (
            <Grid size={{ xs: 12 }}>
              <Alert severity="error">{formError}</Alert>
            </Grid>
          )}

          <Grid size={{ xs: 12 }}>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? 'Saving…' : 'Save & Add Another'}
            </Button>
          </Grid>
        </Grid>
      </form>
    </Paper>
  );
}

// ---------------------------------------------------------------------------
// Bulk Add
// ---------------------------------------------------------------------------

interface BulkRow {
  key: number;
  sku: string;
  name: string;
  barcode: string;
  category_id: string;
  unit_id: string;
  tax_rate_id: string;
  minimum_stock: string;
  is_active: boolean;
  error?: string;
}

let bulkRowSeq = 0;
function newBulkRow(): BulkRow {
  bulkRowSeq += 1;
  return {
    key: bulkRowSeq,
    sku: '',
    name: '',
    barcode: '',
    category_id: '',
    unit_id: '',
    tax_rate_id: '',
    minimum_stock: '0',
    is_active: true,
  };
}

function BulkPanel({ categories, units, taxes }: RefData) {
  const notify = useSnackbar();
  const [rows, setRows] = useState<BulkRow[]>(() => [newBulkRow(), newBulkRow(), newBulkRow()]);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState<{ created: number; failed: number } | null>(null);

  function updateRow(key: number, patch: Partial<BulkRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch, error: undefined } : r)));
  }

  function removeRow(key: number) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  function addRow() {
    setRows((prev) => [...prev, newBulkRow()]);
  }

  const isBlank = (r: BulkRow) => !r.sku.trim() && !r.name.trim();

  async function saveAll() {
    const candidates = rows.filter((r) => !isBlank(r));
    if (candidates.length === 0) {
      notify('Add at least one row first', 'error');
      return;
    }

    // Client-side required-field check first — no point round-tripping to
    // the server for a mistake that's obvious without it.
    let hasClientError = false;
    setRows((prev) =>
      prev.map((r) => {
        if (isBlank(r)) return r;
        const missing = !r.sku.trim() ? 'SKU is required' : !r.name.trim() ? 'Name is required' : undefined;
        if (missing) hasClientError = true;
        return { ...r, error: missing };
      })
    );
    if (hasClientError) return;

    setSaving(true);
    setSummary(null);
    try {
      const response = await api.post<BulkProductResponse>('/products/bulk', {
        products: candidates.map((r) => ({
          sku: r.sku,
          name: r.name,
          barcode: r.barcode || null,
          category_id: r.category_id || null,
          unit_id: r.unit_id || null,
          tax_rate_id: r.tax_rate_id || null,
          minimum_stock: r.minimum_stock,
          is_active: r.is_active ? 1 : 0,
          track_inventory: 1,
        })),
      });

      // results[i] lines up with candidates[i] — successful rows are
      // cleared out of the grid entirely; failed ones stay put with their
      // server-side reason attached, ready to fix and resubmit. This is
      // one functional update (not updateRow(), whose unconditional
      // `error: undefined` exists to clear errors on edit — reusing it
      // here would immediately wipe the error it's supposed to set).
      const failedKeys = new Set<number>();
      response.results.forEach((result, i) => {
        if (!result.success) failedKeys.add(candidates[i].key);
      });

      setRows((prev) => {
        const kept = prev
          .filter((r) => isBlank(r) || failedKeys.has(r.key))
          .map((r) => {
            if (!failedKeys.has(r.key)) return r;
            const resultIndex = candidates.findIndex((c) => c.key === r.key);
            return { ...r, error: response.results[resultIndex]?.error ?? 'Failed to save' };
          });
        return kept.length > 0 ? kept : [newBulkRow(), newBulkRow(), newBulkRow()];
      });
      setSummary({ created: response.created, failed: response.failed });
      if (response.created > 0) notify(`${response.created} product${response.created === 1 ? '' : 's'} added`);
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Bulk import failed', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box>
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3, mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ minWidth: 140 }}>SKU *</TableCell>
              <TableCell sx={{ minWidth: 180 }}>Name *</TableCell>
              <TableCell sx={{ minWidth: 120 }}>Barcode</TableCell>
              <TableCell sx={{ minWidth: 160 }}>Category</TableCell>
              <TableCell sx={{ minWidth: 160 }}>Unit</TableCell>
              <TableCell sx={{ minWidth: 160 }}>Tax Rate</TableCell>
              <TableCell sx={{ minWidth: 110 }}>Min. Stock</TableCell>
              <TableCell align="center">Active</TableCell>
              <TableCell align="right" sx={{ width: 1 }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.key} sx={row.error ? { bgcolor: 'color-mix(in srgb, var(--mui-palette-error-main) 6%, transparent)' } : undefined}>
                <TableCell>
                  <TextField
                    size="small"
                    fullWidth
                    value={row.sku}
                    onChange={(e) => updateRow(row.key, { sku: e.target.value })}
                    error={!!row.error}
                  />
                </TableCell>
                <TableCell>
                  <TextField size="small" fullWidth value={row.name} onChange={(e) => updateRow(row.key, { name: e.target.value })} />
                </TableCell>
                <TableCell>
                  <TextField size="small" fullWidth value={row.barcode} onChange={(e) => updateRow(row.key, { barcode: e.target.value })} />
                </TableCell>
                <TableCell>
                  <SearchableSelect
                    value={row.category_id}
                    onChange={(v) => updateRow(row.key, { category_id: v })}
                    options={[{ value: '', label: '— None —' }, ...categories.map((c) => ({ value: String(c.id), label: c.name }))]}
                    fullWidth
                  />
                </TableCell>
                <TableCell>
                  <SearchableSelect
                    value={row.unit_id}
                    onChange={(v) => updateRow(row.key, { unit_id: v })}
                    options={[{ value: '', label: '— None —' }, ...units.map((u) => ({ value: String(u.id), label: u.abbreviation }))]}
                    fullWidth
                  />
                </TableCell>
                <TableCell>
                  <SearchableSelect
                    value={row.tax_rate_id}
                    onChange={(v) => updateRow(row.key, { tax_rate_id: v })}
                    options={[{ value: '', label: '— None —' }, ...taxes.map((t) => ({ value: String(t.id), label: `${t.name} (${t.rate}%)` }))]}
                    fullWidth
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    type="number"
                    fullWidth
                    slotProps={{ htmlInput: { step: '0.0001' } }}
                    value={row.minimum_stock}
                    onChange={(e) => updateRow(row.key, { minimum_stock: e.target.value })}
                  />
                </TableCell>
                <TableCell align="center">
                  <Checkbox
                    checked={row.is_active}
                    onChange={(e) => updateRow(row.key, { is_active: e.target.checked })}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Remove row">
                    <IconButton size="small" onClick={() => removeRow(row.key)} disabled={rows.length === 1}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {rows.some((r) => r.error) && (
        <Stack spacing={0.5} sx={{ mb: 2 }}>
          {rows
            .filter((r) => r.error)
            .map((r) => (
              <Alert key={r.key} severity="error" icon={<ErrorOutlineOutlinedIcon fontSize="small" />} sx={{ py: 0 }}>
                {r.sku || r.name || 'Row'}: {r.error}
              </Alert>
            ))}
        </Stack>
      )}

      {summary && (
        <Alert severity={summary.failed > 0 ? 'warning' : 'success'} sx={{ mb: 2 }}>
          {summary.created} product{summary.created === 1 ? '' : 's'} added
          {summary.failed > 0 ? `, ${summary.failed} failed — see rows above.` : '.'}
        </Alert>
      )}

      <Stack direction="row" spacing={1.5}>
        <Button startIcon={<AddIcon fontSize="small" />} onClick={addRow}>
          Add Row
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" onClick={saveAll} disabled={saving}>
          {saving ? <CircularProgress size={18} sx={{ color: 'inherit' }} /> : 'Save All'}
        </Button>
      </Stack>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Import from File (CSV)
// ---------------------------------------------------------------------------

const CSV_COLUMNS = ['sku', 'name', 'barcode', 'category', 'unit', 'tax_rate', 'minimum_stock', 'is_active'] as const;

interface ImportRow {
  line: number;
  sku: string;
  name: string;
  barcode: string;
  category_id: string | null;
  category_input: string;
  unit_id: string | null;
  unit_input: string;
  tax_rate_id: string | null;
  tax_rate_input: string;
  minimum_stock: string;
  is_active: boolean;
  error?: string;
  warning?: string;
  imported?: boolean;
  importError?: string;
}

/** Minimal CSV parser — handles quoted fields, embedded commas, escaped ("") quotes, and quoted newlines. Good enough for a flat products sheet with no library dependency. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\r') {
      // skip — \n (handled next) closes the row
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ''));
}

function downloadTemplate() {
  const csv = CSV_COLUMNS.join(',') + '\n' + 'ABC-001,Sample Product,1234567890123,Beverages,PCS,VAT 12%,5,yes\n';
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'product-import-template.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function ImportPanel({ categories, units, taxes }: RefData) {
  const notify = useSnackbar();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState<{ created: number; failed: number } | null>(null);

  function findByName<T extends { name: string }>(list: T[], name: string): T | undefined {
    const target = name.trim().toLowerCase();
    return list.find((item) => item.name.trim().toLowerCase() === target);
  }

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setFileName(file.name);
    setParseError(null);
    setSummary(null);

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      const parsed = parseCsv(text);
      if (parsed.length === 0) {
        setParseError('The file is empty.');
        setRows([]);
        return;
      }

      const header = parsed[0].map((h) => h.trim().toLowerCase());
      const colIndex = (name: string) => header.indexOf(name);
      if (colIndex('sku') === -1 || colIndex('name') === -1) {
        setParseError('The file must have at least "sku" and "name" columns. Use Download Template for the expected format.');
        setRows([]);
        return;
      }

      const dataLines = parsed.slice(1);
      const parsedRows: ImportRow[] = dataLines.map((cols, i) => {
        const get = (name: string) => (colIndex(name) === -1 ? '' : (cols[colIndex(name)] ?? '').trim());

        const sku = get('sku');
        const name = get('name');
        const categoryInput = get('category');
        const unitInput = get('unit');
        const taxInput = get('tax_rate');
        const activeRaw = get('is_active').toLowerCase();

        const category = categoryInput ? findByName(categories, categoryInput) : undefined;
        const unit = unitInput ? units.find((u) => u.abbreviation.toLowerCase() === unitInput.toLowerCase() || u.name.toLowerCase() === unitInput.toLowerCase()) : undefined;
        const tax = taxInput ? findByName(taxes, taxInput) : undefined;

        const unresolved: string[] = [];
        if (categoryInput && !category) unresolved.push(`category "${categoryInput}"`);
        if (unitInput && !unit) unresolved.push(`unit "${unitInput}"`);
        if (taxInput && !tax) unresolved.push(`tax rate "${taxInput}"`);

        return {
          line: i + 2, // +1 for 0-index, +1 for the header row
          sku,
          name,
          barcode: get('barcode'),
          category_id: category ? String(category.id) : null,
          category_input: categoryInput,
          unit_id: unit ? String(unit.id) : null,
          unit_input: unitInput,
          tax_rate_id: tax ? String(tax.id) : null,
          tax_rate_input: taxInput,
          minimum_stock: get('minimum_stock') || '0',
          is_active: activeRaw === '' || ['1', 'yes', 'true', 'y'].includes(activeRaw),
          error: !sku ? 'Missing SKU' : !name ? 'Missing name' : undefined,
          warning: unresolved.length > 0 ? `Not found, left blank: ${unresolved.join(', ')}` : undefined,
        };
      });

      setRows(parsedRows);
    };
    reader.onerror = () => setParseError('Could not read the file.');
    reader.readAsText(file);
  }

  const validRows = rows.filter((r) => !r.error && !r.imported);

  async function runImport() {
    if (validRows.length === 0) return;
    setImporting(true);
    setSummary(null);
    try {
      const response = await api.post<BulkProductResponse>('/products/bulk', {
        products: validRows.map((r) => ({
          sku: r.sku,
          name: r.name,
          barcode: r.barcode || null,
          category_id: r.category_id,
          unit_id: r.unit_id,
          tax_rate_id: r.tax_rate_id,
          minimum_stock: r.minimum_stock,
          is_active: r.is_active ? 1 : 0,
          track_inventory: 1,
        })),
      });

      setRows((prev) => {
        const next = [...prev];
        response.results.forEach((result, i) => {
          const targetLine = validRows[i].line;
          const idx = next.findIndex((r) => r.line === targetLine);
          if (idx === -1) return;
          next[idx] = { ...next[idx], imported: result.success, importError: result.success ? undefined : result.error };
        });
        return next;
      });
      setSummary({ created: response.created, failed: response.failed });
      if (response.created > 0) notify(`${response.created} product${response.created === 1 ? '' : 's'} imported`);
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Import failed', 'error');
    } finally {
      setImporting(false);
    }
  }

  return (
    <Box>
      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
        <Button
          component="label"
          variant="outlined"
          startIcon={<CloudUploadOutlinedIcon fontSize="small" />}
        >
          {fileName ? 'Choose a Different File' : 'Choose CSV File'}
          <input ref={fileInputRef} type="file" accept=".csv,text/csv" hidden onChange={handleFile} />
        </Button>
        <Button variant="text" startIcon={<DownloadOutlinedIcon fontSize="small" />} onClick={downloadTemplate}>
          Download Template
        </Button>
      </Stack>

      {fileName && (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
          <InsertDriveFileOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary">
            {fileName}
          </Typography>
        </Stack>
      )}

      {parseError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {parseError}
        </Alert>
      )}

      {rows.length > 0 && (
        <>
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3, mb: 2, maxHeight: 420 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Line</TableCell>
                  <TableCell>SKU</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Unit</TableCell>
                  <TableCell>Tax Rate</TableCell>
                  <TableCell align="right">Min. Stock</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.line}>
                    <TableCell>{r.line}</TableCell>
                    <TableCell>{r.sku || '—'}</TableCell>
                    <TableCell>{r.name || '—'}</TableCell>
                    <TableCell>{r.category_input || '—'}</TableCell>
                    <TableCell>{r.unit_input || '—'}</TableCell>
                    <TableCell>{r.tax_rate_input || '—'}</TableCell>
                    <TableCell align="right">{r.minimum_stock}</TableCell>
                    <TableCell>
                      {r.imported === true && (
                        <Chip size="small" color="success" icon={<CheckCircleOutlinedIcon />} label="Imported" />
                      )}
                      {r.imported === false && (
                        <Tooltip title={r.importError ?? 'Failed'}>
                          <Chip size="small" color="error" icon={<ErrorOutlineOutlinedIcon />} label="Failed" />
                        </Tooltip>
                      )}
                      {r.imported === undefined && r.error && (
                        <Tooltip title={r.error}>
                          <Chip size="small" color="error" icon={<ErrorOutlineOutlinedIcon />} label="Invalid" />
                        </Tooltip>
                      )}
                      {r.imported === undefined && !r.error && r.warning && (
                        <Tooltip title={r.warning}>
                          <Chip size="small" color="warning" icon={<WarningAmberOutlinedIcon />} label="Check" />
                        </Tooltip>
                      )}
                      {r.imported === undefined && !r.error && !r.warning && <Chip size="small" label="Ready" />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {summary && (
            <Alert severity={summary.failed > 0 ? 'warning' : 'success'} sx={{ mb: 2 }}>
              {summary.created} product{summary.created === 1 ? '' : 's'} imported
              {summary.failed > 0 ? `, ${summary.failed} failed — see the Status column above.` : '.'}
            </Alert>
          )}

          <Button variant="contained" onClick={runImport} disabled={importing || validRows.length === 0}>
            {importing ? <CircularProgress size={18} sx={{ color: 'inherit' }} /> : `Import ${validRows.length} Valid Row${validRows.length === 1 ? '' : 's'}`}
          </Button>
        </>
      )}
    </Box>
  );
}
