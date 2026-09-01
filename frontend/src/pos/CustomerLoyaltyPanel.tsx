import { useState, type FormEvent } from 'react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import Alert from '@mui/material/Alert';
import PersonOutlineIcon from '@mui/icons-material/PersonOutlineOutlined';
import { api, ApiError } from '../api/client';
import type { Customer, LoyaltyCard } from '../api/types';
import { POS_ACCENT } from './format';
import { initialsForName } from './productColor';

interface Props {
  customer: Customer | null;
  card: LoyaltyCard | null;
  onAttach: (customer: Customer | null, card: LoyaltyCard | null) => void;
}

const sectionLabelSx = {
  display: 'block',
  mb: 1,
  color: 'text.secondary',
  fontWeight: 700,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
  fontSize: '0.6875rem',
};

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
      setScanError(err instanceof ApiError ? err.message : 'Failed to validate card');
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
    <Stack spacing={2.5}>
      {/* The dialog's own title already says "Customer" — this reads as
          the answer to that question (who's attached right now), not a
          second label for the same thing. Mirrors BaggerPanel's summary
          card for the same reason. */}
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
        <Avatar
          sx={{
            width: 44,
            height: 44,
            fontWeight: 700,
            bgcolor: customer ? POS_ACCENT : 'action.selected',
            color: customer ? '#fff' : 'text.secondary',
          }}
        >
          {customer ? initialsForName(customer.name) : <PersonOutlineIcon fontSize="small" />}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary">
            {customer ? 'Attached customer' : 'No customer attached'}
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 700 }} noWrap>
            {customer ? customer.name : 'Walk-in'}
          </Typography>
          {card && (
            <Typography variant="caption" color="text.secondary" noWrap>
              Loyalty {card.card_number} · {card.status}
            </Typography>
          )}
        </Box>
        {customer && (
          <Button size="small" color="inherit" onClick={reset} sx={{ flexShrink: 0 }}>
            Clear
          </Button>
        )}
      </Stack>

      <Stack spacing={1}>
        <Typography sx={sectionLabelSx}>Loyalty Card</Typography>
        <Stack component="form" direction="row" spacing={1} onSubmit={scanCard}>
          <TextField type="text" label="Card Number" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} fullWidth />
          <Button type="submit" variant="outlined" disabled={scanning} sx={{ whiteSpace: 'nowrap' }}>
            {scanning ? 'Checking…' : 'Scan'}
          </Button>
        </Stack>
        {scanError && <Alert severity="error">{scanError}</Alert>}
      </Stack>

      {!card && (
        <Stack spacing={1}>
          <Typography sx={sectionLabelSx}>Find Customer</Typography>
          <TextField type="text" label="Search by name, mobile, or code" value={searchQuery} onChange={(e) => searchCustomers(e.target.value)} fullWidth />
          {searching && (
            <Typography variant="body2" color="text.secondary">
              Searching…
            </Typography>
          )}
          {searchResults.length > 0 && (
            <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: 'hidden' }}>
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
                    sx={{ py: 1.25, px: 2 }}
                  >
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 1.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                        {c.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                        {c.mobile ?? c.customer_code}
                      </Typography>
                    </Stack>
                  </ListItemButton>
                ))}
              </List>
            </Paper>
          )}
        </Stack>
      )}
    </Stack>
  );
}
