import { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import CloseIcon from '@mui/icons-material/Close';
import SearchOffOutlinedIcon from '@mui/icons-material/SearchOffOutlined';
import { api, ApiError } from '../api/client';
import type { Receipt, SaleResponse } from '../api/types';
import { formatMoney } from './format';
import { useSnackbar } from '../Snackbar';

interface FoundSale extends SaleResponse {
  sale_date: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** Handed a full receipt once a past sale is picked — the caller (PosScreen) reuses its own `receipt` state and ReceiptModal for it, exactly as it would for the sale that was just rung up. */
  onFound: (receipt: Receipt) => void;
}

/**
 * F7's other job: while no receipt is already on screen, it opens this
 * search instead of printing one (see posShortcuts.ts and ReceiptModal's
 * own local F7 handler for the split). Looks up a completed sale by
 * invoice number — the same `/sales?q=` search ReturnsScreen already
 * uses to find a sale to refund — then fetches that sale's receipt and
 * hands it to the caller. No new backend endpoint: `/sales/{id}/receipt`
 * already builds the printable receipt from the sale's own frozen
 * snapshot fields, whether that sale happened a minute ago or last month.
 *
 * Deliberately company/store-scoped by the backend alone (applyScope on
 * SalesController), not by a client-supplied store_id here — a cashier
 * assigned to more than one store can look up a receipt from either
 * without switching the active store first, same as ReturnsScreen's own
 * search does today.
 */
export function ReprintReceiptDialog({ open, onClose, onFound }: Props) {
  const notify = useSnackbar();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoundSale[]>([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  function reset() {
    setQuery('');
    setResults([]);
    setSearched(false);
  }

  async function search() {
    const trimmed = query.trim();
    if (!trimmed || searching) return;
    setSearching(true);
    try {
      const found = await api.get<FoundSale[]>(
        `/sales?q=${encodeURIComponent(trimmed)}&status=completed&per_page=15`
      );
      setResults(found);
      setSearched(true);
    } catch {
      notify('Sale lookup failed', 'error');
    } finally {
      setSearching(false);
    }
  }

  async function pick(sale: FoundSale) {
    if (loadingId !== null) return;
    setLoadingId(sale.id);
    try {
      const receipt = await api.get<Receipt>(`/sales/${sale.id}/receipt`);
      onFound(receipt);
      reset();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to load that receipt', 'error');
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      maxWidth="xs"
      fullWidth
      slotProps={{ transition: { onEntered: () => document.getElementById('reprint-invoice-input')?.focus() } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Reprint Receipt
        <IconButton size="small" onClick={() => { reset(); onClose(); }} aria-label="Close">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Look up a past sale by invoice number to print another copy of its receipt.
        </Typography>
        <Stack direction="row" spacing={1}>
          <TextField
            id="reprint-invoice-input"
            label="Invoice number"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            fullWidth
            size="small"
          />
          <Button type="button" variant="contained" onClick={search} disabled={searching || !query.trim()}>
            {searching ? <CircularProgress size={18} thickness={5} sx={{ color: 'inherit' }} /> : 'Search'}
          </Button>
        </Stack>

        {searched && (
          results.length === 0 ? (
            <Stack sx={{ alignItems: 'center', textAlign: 'center', py: 4, color: 'text.secondary' }}>
              <SearchOffOutlinedIcon sx={{ fontSize: 36, opacity: 0.4, mb: 1 }} />
              <Typography variant="body2">No completed sale matches "{query.trim()}"</Typography>
            </Stack>
          ) : (
            <List disablePadding sx={{ mt: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
              {results.map((sale, i) => (
                <ListItemButton
                  key={sale.id}
                  divider={i < results.length - 1}
                  disabled={loadingId !== null}
                  onClick={() => pick(sale)}
                  sx={{ py: 1 }}
                >
                  <ListItemText
                    primary={sale.invoice_number}
                    secondary={new Date(sale.sale_date).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
                    slotProps={{ primary: { sx: { fontWeight: 600 } }, secondary: { variant: 'caption' } }}
                  />
                  {loadingId === sale.id ? (
                    <CircularProgress size={16} thickness={5} />
                  ) : (
                    <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      {formatMoney(parseFloat(sale.total))}
                    </Typography>
                  )}
                </ListItemButton>
              ))}
            </List>
          )
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={() => { reset(); onClose(); }}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}
