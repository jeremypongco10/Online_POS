import { useState, type ChangeEvent } from 'react';
import { api, ApiError } from '../api/client';
import { useSnackbar } from '../Snackbar';
import { Modal } from './Modal';
import { parseCsv, downloadCsv } from './csv';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined';

interface ImportRow {
  line: number;
  sku: string;
  cost_price: string;
  selling_price: string;
  error?: string;
  imported?: boolean;
  importError?: string;
}

interface BulkPriceResult {
  index: number;
  success: boolean;
  error?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** Every store id the import will write to — one entry for a single store, or every company store's id for "apply to all stores". */
  storeIds: number[];
  /** Human-readable version of storeIds, shown in the scope banner (e.g. "Store 1" or "all 4 stores"). */
  scopeLabel: string;
  /** Fired after at least one row is successfully imported, so the caller can refresh its own grid. */
  onImported: () => void;
}

function downloadTemplate() {
  downloadCsv('price-import-template.csv', 'sku,cost_price,selling_price\nABC-001,25.00,35.00\n');
}

/**
 * CSV price import — the bulk counterpart to the manual pricing grid, for
 * repricing a large catalog from a spreadsheet instead of typing each row.
 * Deliberately identifies products by SKU only (not product_id, which a
 * spreadsheet wouldn't have); the backend resolves SKU -> product itself.
 * Scope (which store(s) get written) is inherited from the screen that
 * opened this modal, not re-selected here, so there's exactly one place
 * that decides scope for both the manual grid and this import.
 */
export function ImportPricesModal({ open, onClose, storeIds, scopeLabel, onImported }: Props) {
  const notify = useSnackbar();
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState<{ updated: number; failed: number } | null>(null);

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
      const skuCol = colIndex('sku');
      const costCol = colIndex('cost_price') !== -1 ? colIndex('cost_price') : colIndex('cost');
      const priceCol = colIndex('selling_price') !== -1 ? colIndex('selling_price') : colIndex('price');

      if (skuCol === -1 || (costCol === -1 && priceCol === -1)) {
        setParseError('The file must have a "sku" column and at least one of "cost_price" (or "cost") / "selling_price" (or "price"). Use Download Template for the expected format.');
        setRows([]);
        return;
      }

      const dataLines = parsed.slice(1);
      const parsedRows: ImportRow[] = dataLines.map((cols, i) => {
        const sku = (cols[skuCol] ?? '').trim();
        const cost = costCol !== -1 ? (cols[costCol] ?? '').trim() : '';
        const price = priceCol !== -1 ? (cols[priceCol] ?? '').trim() : '';

        return {
          line: i + 2, // +1 for 0-index, +1 for the header row
          sku,
          cost_price: cost,
          selling_price: price,
          error: !sku ? 'Missing SKU' : !cost ? 'Missing cost_price' : !price ? 'Missing selling_price' : undefined,
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
      const response = await api.put<{ results: BulkPriceResult[]; updated: number; failed: number }>('/products/prices/bulk', {
        store_ids: storeIds,
        prices: validRows.map((r) => ({ sku: r.sku, cost_price: r.cost_price, selling_price: r.selling_price })),
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
      setSummary({ updated: response.updated, failed: response.failed });
      if (response.updated > 0) {
        notify(`${response.updated} price${response.updated === 1 ? '' : 's'} updated`);
        onImported();
      }
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Import failed', 'error');
    } finally {
      setImporting(false);
    }
  }

  function handleClose() {
    setFileName(null);
    setRows([]);
    setParseError(null);
    setSummary(null);
    onClose();
  }

  return (
    <Modal open={open} title="Import Prices from CSV" onClose={handleClose} maxWidth="lg">
      <Alert severity="info" sx={{ mb: 2 }}>
        Imported prices will be applied to {scopeLabel}.
      </Alert>

      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
        <Button component="label" variant="outlined" startIcon={<CloudUploadOutlinedIcon fontSize="small" />}>
          {fileName ? 'Choose a Different File' : 'Choose CSV File'}
          <input type="file" accept=".csv,text/csv" hidden onChange={handleFile} />
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

      {rows.length === 0 && !parseError && (
        <Box sx={{ py: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Choose a CSV file with <code>sku</code>, <code>cost_price</code>, and <code>selling_price</code> columns to get started.
          </Typography>
        </Box>
      )}

      {rows.length > 0 && (
        <>
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3, mb: 2, maxHeight: 420 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Line</TableCell>
                  <TableCell>SKU</TableCell>
                  <TableCell align="right">Cost</TableCell>
                  <TableCell align="right">Price</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.line}>
                    <TableCell>{r.line}</TableCell>
                    <TableCell>{r.sku || '—'}</TableCell>
                    <TableCell align="right">{r.cost_price || '—'}</TableCell>
                    <TableCell align="right">{r.selling_price || '—'}</TableCell>
                    <TableCell>
                      {r.imported === true && <Chip size="small" color="success" icon={<CheckCircleOutlinedIcon />} label="Imported" />}
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
                      {r.imported === undefined && !r.error && <Chip size="small" label="Ready" />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {summary && (
            <Alert severity={summary.failed > 0 ? 'warning' : 'success'} sx={{ mb: 2 }}>
              {summary.updated} price{summary.updated === 1 ? '' : 's'} updated
              {summary.failed > 0 ? `, ${summary.failed} failed — see the Status column above.` : '.'}
            </Alert>
          )}

          <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'flex-end' }}>
            <Button type="button" variant="text" onClick={handleClose}>
              Close
            </Button>
            <Button type="button" variant="contained" onClick={runImport} disabled={importing || validRows.length === 0}>
              {importing ? <CircularProgress size={18} sx={{ color: 'inherit' }} /> : `Import ${validRows.length} Valid Row${validRows.length === 1 ? '' : 's'}`}
            </Button>
          </Stack>
        </>
      )}
    </Modal>
  );
}
