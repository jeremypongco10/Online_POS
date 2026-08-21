import { useState, type FormEvent } from 'react';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import Alert from '@mui/material/Alert';
import { api, ApiError } from '../api/client';
import type { Customer, LoyaltyCard } from '../api/types';

interface Props {
  customer: Customer | null;
  card: LoyaltyCard | null;
  onAttach: (customer: Customer | null, card: LoyaltyCard | null) => void;
}

/**
 * Customer + Loyalty Card sections together, since scanning a card is
 * what attaches a customer (Phase 10 Step 24: Scan -> Validate -> Find
 * Customer -> Attach Customer). A customer can also be attached
 * manually by search, with no card.
 */
export function CustomerLoyaltyPanel({ customer, card, onAttach }: Props) {
  const [cardNumber, setCardNumber] = useState('');
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [searching, setSearching] = useState(false);

  async function scanCard(e: FormEvent) {
    e.preventDefault();
    if (cardNumber.trim() === '') return;

    setScanning(true);
    setScanError(null);
    try {
      const result = await api.get<{ card: LoyaltyCard; customer: Customer }>(
        `/loyalty/scan?card_number=${encodeURIComponent(cardNumber.trim())}`
      );
      onAttach(result.customer, result.card);
      setCardNumber('');
    } catch (err) {
      setScanError(err instanceof ApiError ? err.message : 'Could not validate card');
    } finally {
      setScanning(false);
    }
  }

  async function searchCustomers(value: string) {
    setSearchQuery(value);
    if (value.trim() === '') {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const results = await api.get<Customer[]>(`/customers?is_active=1&per_page=6&q=${encodeURIComponent(value)}`);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  function reset() {
    onAttach(null, null);
    setCardNumber('');
    setScanError(null);
    setSearchQuery('');
    setSearchResults([]);
  }

  return (
    <Paper variant="outlined" sx={{ p: 2.25, borderRadius: 1.5 }}>
      <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: '0.06em' }}>
        Customer
      </Typography>

      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'baseline', mt: 1.25, fontSize: 14 }}>
        <Typography variant="body2" color="text.secondary" sx={{ width: 70, flexShrink: 0 }}>
          Customer:
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {customer ? customer.name : 'Walk-in'}
        </Typography>
        {customer && (
          <Button size="small" onClick={reset} sx={{ minWidth: 0, py: 0 }}>
            Clear
          </Button>
        )}
      </Stack>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'baseline', mb: 0.5 }}>
        <Typography variant="body2" color="text.secondary" sx={{ width: 70, flexShrink: 0 }}>
          Loyalty:
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {card ? `${card.card_number} (${card.status})` : '—'}
        </Typography>
      </Stack>

      <Typography
        variant="caption"
        sx={{ display: 'block', mt: 2, mb: 1, color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}
      >
        Loyalty Card
      </Typography>
      <Stack component="form" direction="row" spacing={1} onSubmit={scanCard}>
        <TextField
          type="text"
          label="Card Number"
          value={cardNumber}
          onChange={(e) => setCardNumber(e.target.value)}
          fullWidth
        />
        <Button type="submit" variant="outlined" disabled={scanning} sx={{ whiteSpace: 'nowrap' }}>
          {scanning ? 'Checking…' : 'Scan'}
        </Button>
      </Stack>
      {scanError && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {scanError}
        </Alert>
      )}

      {!card && (
        <>
          <Typography
            variant="caption"
            sx={{ display: 'block', mt: 2, mb: 1, color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}
          >
            Find Customer
          </Typography>
          <TextField
            type="text"
            label="Search"
            value={searchQuery}
            onChange={(e) => searchCustomers(e.target.value)}
            fullWidth
          />
          {searching && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Searching…
            </Typography>
          )}
          {searchResults.length > 0 && (
            <Paper variant="outlined" sx={{ mt: 1.25, borderRadius: 1, overflow: 'hidden' }}>
              <List disablePadding>
                {searchResults.map((c) => (
                  <ListItemButton
                    key={c.id}
                    divider
                    onClick={() => {
                      onAttach(c, null);
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                  >
                    <Stack direction="row" sx={{ justifyContent: 'space-between', width: '100%' }}>
                      <Typography variant="body2">{c.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {c.mobile ?? c.customer_code}
                      </Typography>
                    </Stack>
                  </ListItemButton>
                ))}
              </List>
            </Paper>
          )}
        </>
      )}
    </Paper>
  );
}
