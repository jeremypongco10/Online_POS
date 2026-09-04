import { useState, type FormEvent, type ReactNode } from 'react';
import { useTouchTypingMode } from './useTouchTypingMode';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import PersonOutlineIcon from '@mui/icons-material/PersonOutlineOutlined';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import LoyaltyOutlinedIcon from '@mui/icons-material/LoyaltyOutlined';
import PhoneIphoneOutlinedIcon from '@mui/icons-material/PhoneIphoneOutlined';
import MailOutlineIcon from '@mui/icons-material/MailOutlineOutlined';
import CreditCardOutlinedIcon from '@mui/icons-material/CreditCardOutlined';
import PersonSearchOutlinedIcon from '@mui/icons-material/PersonSearchOutlined';
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
  color: 'text.secondary',
  fontWeight: 700,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
  fontSize: '0.6875rem',
};

/** One icon + label + value line in the attached-customer detail block. Rendered only when the value exists, so a customer with no mobile doesn't get an empty row. */
function DetailRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0 }}>
      <Box sx={{ color: 'text.disabled', display: 'flex', flexShrink: 0 }}>{icon}</Box>
      <Typography variant="caption" sx={{ color: 'text.secondary', width: 78, flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 0 }} noWrap title={value}>
        {value}
      </Typography>
    </Stack>
  );
}

/**
 * Customer + Loyalty Card sections together. A customer can be attached
 * two ways: typing/scanning their customer number (exact match on the
 * unique, auto-generated customer_code), or a manual name/mobile/code
 * search below.
 *
 * GET /customers already decorates every row with `points`,
 * `card_number`, and `loyalty_card_id` (see CustomersController::
 * attachPoints — points is summed from the ledger, never a stored
 * counter), so the profile card below can show a scanned customer's live
 * balance without a second round trip. Those three are absent for a role
 * without loyalty.view, which is why the points block is conditional
 * rather than defaulting to 0 — "0 points" and "you can't see points"
 * are different answers.
 */
export function CustomerLoyaltyPanel({ customer, card, onAttach }: Props) {
  const [customerNumber, setCustomerNumber] = useState('');
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  // Both fields stay scanner-ready but keep Android's keyboard shut until
  // it's actually asked for — see useTouchTypingMode. The number field is
  // the one that mattered most: this dialog focuses it on open so a
  // scanned loyalty card lands somewhere, which on a tablet meant the
  // keyboard covered the dialog the instant it appeared.
  const numberTyping = useTouchTypingMode();
  const searchTyping = useTouchTypingMode();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [searching, setSearching] = useState(false);

  async function scanCustomerNumber(e: FormEvent) {
    e.preventDefault();
    if (customerNumber.trim() === '') return;

    setScanning(true);
    setScanError(null);
    try {
      const results = await api.get<Customer[]>(`/customers?is_active=1&per_page=1&customer_code=${encodeURIComponent(customerNumber.trim())}`);
      if (results.length === 0) {
        setScanError('Customer number not recognized');
        return;
      }
      onAttach(results[0], null);
      setCustomerNumber('');
    } catch (err) {
      setScanError(err instanceof ApiError ? err.message : 'Failed to look up customer');
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
    setCustomerNumber('');
    setScanError(null);
    setSearchQuery('');
    setSearchResults([]);
  }

  // The scan path attaches with a null `card` (the lookup returns the
  // customer, not a card record), so the customer's own decorated fields
  // are the primary source here and `card` is only a fallback for the
  // paths that do carry one.
  const cardNumber = customer?.card_number ?? card?.card_number ?? null;
  const points = customer?.points ?? (card ? Number(card.points) : undefined);
  const canSeePoints = points !== undefined;

  return (
    <Stack spacing={2.5}>
      {customer ? (
        <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', borderColor: `${POS_ACCENT}55` }}>
          <Stack
            direction="row"
            spacing={1.5}
            sx={{
              alignItems: 'center',
              p: 2,
              // A soft accent wash rather than a solid accent bar: this
              // sits inside a dialog that's already competing for
              // attention, and the points block below is what should read
              // as the loud element.
              background: `linear-gradient(135deg, ${POS_ACCENT}1f 0%, ${POS_ACCENT}0a 100%)`,
            }}
          >
            <Avatar sx={{ width: 52, height: 52, fontWeight: 700, fontSize: 18, bgcolor: POS_ACCENT, color: '#fff' }}>
              {initialsForName(customer.name)}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                Attached customer
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.25 }} noWrap title={customer.name}>
                {customer.name}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
                No. {customer.customer_code}
              </Typography>
            </Box>
            <Button size="small" color="inherit" onClick={reset} sx={{ flexShrink: 0, fontWeight: 600 }}>
              Clear
            </Button>
          </Stack>

          {canSeePoints && (
            <>
              <Divider />
              <Stack
                direction="row"
                spacing={2}
                sx={{ alignItems: 'center', px: 2, py: 1.75, bgcolor: 'action.hover' }}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    bgcolor: `${POS_ACCENT}1f`,
                    color: POS_ACCENT,
                  }}
                >
                  <LoyaltyOutlinedIcon fontSize="small" />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={sectionLabelSx}>Loyalty points</Typography>
                  {points === null ? (
                    <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
                      No loyalty card yet
                    </Typography>
                  ) : (
                    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'baseline', mt: 0.25 }}>
                      <Typography sx={{ fontWeight: 800, fontSize: 26, lineHeight: 1, color: POS_ACCENT }}>
                        {points.toLocaleString('en-PH')}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {points === 1 ? 'point' : 'points'}
                      </Typography>
                    </Stack>
                  )}
                </Box>
                {card?.status && (
                  <Chip
                    size="small"
                    label={card.status}
                    color={card.status === 'active' ? 'success' : 'default'}
                    sx={{ textTransform: 'capitalize', fontWeight: 600, flexShrink: 0 }}
                  />
                )}
              </Stack>
            </>
          )}

          {(cardNumber || customer.mobile || customer.email) && (
            <>
              <Divider />
              <Stack spacing={1.25} sx={{ px: 2, py: 1.75 }}>
                {cardNumber && (
                  <DetailRow icon={<CreditCardOutlinedIcon fontSize="small" />} label="Card" value={cardNumber} />
                )}
                {customer.mobile && (
                  <DetailRow icon={<PhoneIphoneOutlinedIcon fontSize="small" />} label="Mobile" value={customer.mobile} />
                )}
                {customer.email && (
                  <DetailRow icon={<MailOutlineIcon fontSize="small" />} label="Email" value={customer.email} />
                )}
              </Stack>
            </>
          )}
        </Paper>
      ) : (
        // A dashed placeholder rather than the filled summary row that
        // used to sit here: "nothing attached yet" is a slot waiting to be
        // filled, and dashes say that without needing extra words.
        <Stack
          spacing={0.5}
          sx={{
            alignItems: 'center',
            textAlign: 'center',
            px: 2,
            py: 3,
            borderRadius: 3,
            border: '1px dashed',
            borderColor: 'divider',
          }}
        >
          <Avatar sx={{ width: 48, height: 48, bgcolor: 'action.selected', color: 'text.secondary', mb: 0.5 }}>
            <PersonOutlineIcon />
          </Avatar>
          <Typography variant="body1" sx={{ fontWeight: 700 }}>
            Walk-in sale
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Scan a customer number below to see their points, or search by name.
          </Typography>
        </Stack>
      )}

      <Stack spacing={1}>
        <Typography sx={sectionLabelSx}>Customer number</Typography>
        <Stack component="form" direction="row" spacing={1} onSubmit={scanCustomerNumber}>
          <TextField
            id="customer-number-input"
            type="text"
            placeholder="Scan or type the customer number"
            value={customerNumber}
            onChange={(e) => setCustomerNumber(e.target.value)}
            onPointerDown={numberTyping.onPointerDown}
            fullWidth
            autoComplete="off"
            slotProps={{
              htmlInput: { inputMode: numberTyping.inputMode },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <QrCodeScannerIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              },
            }}
          />
          <Button
            type="submit"
            variant="contained"
            disableElevation
            disabled={scanning || customerNumber.trim() === ''}
            sx={{ whiteSpace: 'nowrap', px: 2.5, bgcolor: POS_ACCENT, '&:hover': { bgcolor: '#1d4ed8' } }}
          >
            {scanning ? <CircularProgress size={20} color="inherit" /> : 'Look up'}
          </Button>
        </Stack>
        {scanError ? (
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            {scanError}
          </Alert>
        ) : (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            A hardware scanner works here too — it submits on its own.
          </Typography>
        )}
      </Stack>

      {!customer && (
        <Stack spacing={1}>
          <Typography sx={sectionLabelSx}>Find customer</Typography>
          <TextField
            type="text"
            placeholder="Search by name, mobile, or code"
            value={searchQuery}
            onChange={(e) => searchCustomers(e.target.value)}
            onPointerDown={searchTyping.onPointerDown}
            fullWidth
            autoComplete="off"
            slotProps={{
              htmlInput: { inputMode: searchTyping.inputMode },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonSearchOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                endAdornment: searching ? (
                  <InputAdornment position="end">
                    <CircularProgress size={16} />
                  </InputAdornment>
                ) : undefined,
              },
            }}
          />
          {searchResults.length > 0 && (
            <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: 'hidden' }}>
              <List disablePadding>
                {searchResults.map((c, i) => (
                  <ListItemButton
                    key={c.id}
                    divider={i < searchResults.length - 1}
                    onClick={() => {
                      onAttach(c, null);
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    sx={{ py: 1.25, px: 1.75, gap: 1.5 }}
                  >
                    <Avatar sx={{ width: 34, height: 34, fontSize: 13, fontWeight: 700, bgcolor: 'action.selected', color: 'text.secondary' }}>
                      {initialsForName(c.name)}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                        {c.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
                        {c.mobile ? `${c.mobile} · ${c.customer_code}` : c.customer_code}
                      </Typography>
                    </Box>
                    {/* Points on the row itself, so picking between two
                        similar names doesn't need a second lookup. */}
                    {c.points !== undefined && c.points !== null && (
                      <Chip
                        size="small"
                        label={`${c.points.toLocaleString('en-PH')} pts`}
                        sx={{ flexShrink: 0, fontWeight: 600, bgcolor: `${POS_ACCENT}14`, color: POS_ACCENT }}
                      />
                    )}
                  </ListItemButton>
                ))}
              </List>
            </Paper>
          )}
          {searchQuery.trim() !== '' && !searching && searchResults.length === 0 && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              No customers match “{searchQuery.trim()}”.
            </Typography>
          )}
        </Stack>
      )}
    </Stack>
  );
}
