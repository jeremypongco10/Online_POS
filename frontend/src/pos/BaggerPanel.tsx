import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTouchTypingMode } from './useTouchTypingMode';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import InputAdornment from '@mui/material/InputAdornment';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import PhoneIphoneOutlinedIcon from '@mui/icons-material/PhoneIphoneOutlined';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import PersonOffOutlinedIcon from '@mui/icons-material/PersonOffOutlined';
import { api } from '../api/client';
import type { Bagger } from '../api/types';
import { POS_ACCENT, THIN_SCROLLBAR_SX } from './format';
import { initialsForName } from './productColor';

interface Props {
  storeId: number | null;
  bagger: Bagger | null;
  onSelect: (bagger: Bagger | null) => void;
}

/** Above this many baggers the list gets a filter box — below it, scanning the list directly is faster than typing, and an always-present search field on a two-person list is just clutter. */
const FILTER_THRESHOLD = 5;

const sectionLabelSx = {
  display: 'block',
  color: 'text.secondary',
  fontWeight: 700,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
  fontSize: '0.6875rem',
};

/** One icon + label + value line in the assigned-bagger detail block. Rendered only when the value exists, so a bagger with no phone on file doesn't get an empty row. */
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
 * Mirrors CustomerLoyaltyPanel's shape — a profile card for whoever is
 * assigned, then a picker below — so the two POS dialogs read as the same
 * kind of thing.
 *
 * The picker is a tappable list rather than the dropdown this replaced:
 * the POS is touch-first, and a list can show each bagger's username
 * alongside their name, which a <select> can't. There's deliberately no
 * headline stat here to match the customer card's points block —
 * GET /stores/{id}/baggers returns only identity fields, and the one
 * meaningful bagger metric (reports/bagger-performance) needs
 * reports.view, which the Cashier role doesn't have. Showing a fabricated
 * or always-blank stat would be worse than showing none.
 */
export function BaggerPanel({ storeId, bagger, onSelect }: Props) {
  const [baggers, setBaggers] = useState<Bagger[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');
  // Same reason as the Customer dialog's fields: this one is auto-focused
  // when its dialog opens, which on a tablet raised the keyboard over the
  // dialog unasked. See useTouchTypingMode.
  const filterTyping = useTouchTypingMode();

  useEffect(() => {
    if (!storeId) {
      setBaggers([]);
      return;
    }
    setLoading(true);
    api
      .get<Bagger[]>(`/stores/${storeId}/baggers`)
      .then(setBaggers)
      .catch(() => setBaggers([]))
      .finally(() => setLoading(false));
  }, [storeId]);

  const showFilter = baggers.length > FILTER_THRESHOLD;

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (q === '') return baggers;
    return baggers.filter((b) => b.name.toLowerCase().includes(q) || b.username.toLowerCase().includes(q));
  }, [baggers, filter]);

  return (
    <Stack spacing={2.5}>
      {bagger ? (
        <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', borderColor: `${POS_ACCENT}55` }}>
          <Stack
            direction="row"
            spacing={1.5}
            sx={{
              alignItems: 'center',
              p: 2,
              background: `linear-gradient(135deg, ${POS_ACCENT}1f 0%, ${POS_ACCENT}0a 100%)`,
            }}
          >
            <Avatar sx={{ width: 52, height: 52, fontWeight: 700, fontSize: 18, bgcolor: POS_ACCENT, color: '#fff' }}>
              {initialsForName(bagger.name)}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                Assigned bagger
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.25 }} noWrap title={bagger.name}>
                {bagger.name}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
                @{bagger.username}
              </Typography>
            </Box>
            <Button size="small" color="inherit" onClick={() => onSelect(null)} sx={{ flexShrink: 0, fontWeight: 600 }}>
              Clear
            </Button>
          </Stack>

          <Divider />
          <Stack spacing={1.25} sx={{ px: 2, py: 1.75 }}>
            <DetailRow icon={<BadgeOutlinedIcon fontSize="small" />} label="Employee" value={bagger.username} />
            {bagger.phone && (
              <DetailRow icon={<PhoneIphoneOutlinedIcon fontSize="small" />} label="Phone" value={bagger.phone} />
            )}
            <Typography variant="caption" sx={{ color: 'text.secondary', pt: 0.5 }}>
              Credited on this sale's receipt and in bagger performance reports.
            </Typography>
          </Stack>
        </Paper>
      ) : (
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
            <Inventory2OutlinedIcon />
          </Avatar>
          <Typography variant="body1" sx={{ fontWeight: 700 }}>
            No bagger assigned
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Optional — pick someone below to credit them for this sale.
          </Typography>
        </Stack>
      )}

      <Stack spacing={1}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography sx={sectionLabelSx}>Available baggers</Typography>
          {baggers.length > 0 && (
            <Chip
              size="small"
              label={baggers.length}
              sx={{ height: 20, fontWeight: 700, fontSize: 11, bgcolor: 'action.hover', color: 'text.secondary' }}
            />
          )}
        </Stack>

        {showFilter && (
          <TextField
            id="bagger-filter-input"
            placeholder="Filter by name or username"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            onPointerDown={filterTyping.onPointerDown}
            fullWidth
            size="small"
            autoComplete="off"
            slotProps={{
              htmlInput: { inputMode: filterTyping.inputMode },
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              },
            }}
          />
        )}

        {loading ? (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Loading baggers…
          </Typography>
        ) : baggers.length === 0 ? (
          <Stack
            spacing={0.5}
            sx={{ alignItems: 'center', textAlign: 'center', px: 2, py: 2.5, borderRadius: 2, bgcolor: 'action.hover' }}
          >
            <PersonOffOutlinedIcon fontSize="small" sx={{ color: 'text.disabled' }} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {storeId ? 'No baggers at this store' : 'No store selected'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {storeId
                ? 'Someone with the Bagger role has to be assigned to this store first.'
                : 'Pick a store before assigning a bagger.'}
            </Typography>
          </Stack>
        ) : (
          <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: 'hidden' }}>
            <List disablePadding sx={{ maxHeight: 260, overflowY: 'auto', ...THIN_SCROLLBAR_SX }}>
              {/* Only worth a row when there's something to undo — with
                  nobody assigned, the card above already says so. */}
              {bagger && (
                <ListItemButton divider onClick={() => onSelect(null)} sx={{ py: 1.25, px: 1.75, gap: 1.5 }}>
                  <Avatar sx={{ width: 34, height: 34, bgcolor: 'action.selected', color: 'text.secondary' }}>
                    <PersonOffOutlinedIcon sx={{ fontSize: 18 }} />
                  </Avatar>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                    No bagger
                  </Typography>
                </ListItemButton>
              )}

              {visible.map((b, i) => {
                // Number() on both sides: the API encodes bigint ids as
                // JSON strings, so a strict === against a number id in
                // state silently never matches.
                const selected = bagger !== null && Number(b.id) === Number(bagger.id);
                return (
                  <ListItemButton
                    key={b.id}
                    divider={i < visible.length - 1}
                    selected={selected}
                    onClick={() => onSelect(b)}
                    sx={{
                      py: 1.25,
                      px: 1.75,
                      gap: 1.5,
                      '&.Mui-selected': { bgcolor: `${POS_ACCENT}14` },
                      '&.Mui-selected:hover': { bgcolor: `${POS_ACCENT}1f` },
                    }}
                  >
                    <Avatar
                      sx={{
                        width: 34,
                        height: 34,
                        fontSize: 13,
                        fontWeight: 700,
                        bgcolor: selected ? POS_ACCENT : 'action.selected',
                        color: selected ? '#fff' : 'text.secondary',
                      }}
                    >
                      {initialsForName(b.name)}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                        {b.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
                        {b.phone ? `@${b.username} · ${b.phone}` : `@${b.username}`}
                      </Typography>
                    </Box>
                    {selected && <CheckCircleRoundedIcon fontSize="small" sx={{ color: POS_ACCENT, flexShrink: 0 }} />}
                  </ListItemButton>
                );
              })}

              {visible.length === 0 && (
                <Box sx={{ px: 2, py: 2 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    No baggers match “{filter.trim()}”.
                  </Typography>
                </Box>
              )}
            </List>
          </Paper>
        )}
      </Stack>
    </Stack>
  );
}
