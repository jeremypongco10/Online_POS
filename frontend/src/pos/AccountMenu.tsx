import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Popover from '@mui/material/Popover';
import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Badge from '@mui/material/Badge';
import Tooltip from '@mui/material/Tooltip';
import PersonIcon from '@mui/icons-material/Person';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import PowerSettingsNewOutlinedIcon from '@mui/icons-material/PowerSettingsNewOutlined';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import { SearchableSelect } from '../admin/SearchableSelect';
import { ThemeToggle } from '../ThemeToggle';
import { ChangePasswordButton } from '../ChangePasswordModal';
import type { AuthUser, CashSession, Register, Store } from '../api/types';
import { POS_ACCENT } from './format';
import { formatDateTime, formatTime } from '../regional';
import type { HeldSale } from './holdSale';
import type { PosZoomControl } from './usePosZoom';

interface Props {
  user: AuthUser;
  stores: Store[];
  registers: Register[];
  storeId: number | null;
  registerId: number | null;
  onStoreChange: (id: number) => void;
  onRegisterChange: (id: number) => void;
  heldSales: HeldSale[];
  onResumeHeld: (held: HeldSale) => void;
  onDiscardHeld: (id: string) => void;
  cashSession: CashSession | null;
  onCloseTerminal: () => void;
  canOpenAdmin: boolean;
  onOpenAdmin: () => void;
  onLogout: () => void;
  /** The zoom control usePosZoom returns — this menu only renders it, PosScreen owns the hook. */
  zoom: PosZoomControl;
}

/**
 * Replaces the old full-width AppBar — everything that used to live in that
 * header (store/register selection, held sales, close terminal, Back
 * Office, theme, password, logout) now lives behind this one avatar
 * button. Rendered inline in the product search bar's own row rather than
 * fixed-position, so it takes no reserved space of its own.
 */
export function AccountMenu({
  user,
  stores,
  registers,
  storeId,
  registerId,
  onStoreChange,
  onRegisterChange,
  heldSales,
  onResumeHeld,
  onDiscardHeld,
  cashSession,
  onCloseTerminal,
  canOpenAdmin,
  onOpenAdmin,
  onLogout,
  zoom,
}: Props) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = () => setAnchor(null);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <Tooltip title={user.name}>
        <IconButton
          size="small"
          onClick={(e) => setAnchor(e.currentTarget)}
          // p:0 with no border: this button is the tallest item in
          // PosHeader, so its padding set the whole strip's floor —
          // the avatar is already a clear enough target on its own.
          sx={{ p: 0 }}
          aria-label="Account menu"
        >
          <Badge badgeContent={heldSales.length} color="primary" overlap="circular">
            <Avatar sx={{ width: 28, height: 28, bgcolor: POS_ACCENT }}>
              <PersonIcon sx={{ fontSize: 16 }} />
            </Avatar>
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Box sx={{ width: 300, p: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {user.name}
          </Typography>
          {user.role_name && (
            <Typography variant="caption" color="text.secondary">
              {user.role_name}
            </Typography>
          )}

          <Stack direction="row" sx={{ justifyContent: 'space-between', mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Receipt #: <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>New Sale</Box>
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatDateTime(now, user.currency)}
            </Typography>
          </Stack>

          <Divider sx={{ my: 1.5 }} />

          <Stack spacing={1.25}>
            <SearchableSelect
              label="Store"
              value={storeId ? String(storeId) : ''}
              onChange={(v) => onStoreChange(Number(v))}
              fullWidth
              options={stores.map((s) => ({ value: String(s.id), label: s.name }))}
            />
            <SearchableSelect
              label="POS Terminal"
              value={registerId ? String(registerId) : ''}
              onChange={(v) => onRegisterChange(Number(v))}
              fullWidth
              options={registers.map((r) => ({ value: String(r.id), label: r.name }))}
            />
          </Stack>

          {heldSales.length > 0 && (
            <>
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', letterSpacing: '0.06em' }}>
                HELD SALES
              </Typography>
              <List disablePadding dense>
                {heldSales.map((h) => (
                  <ListItem
                    key={h.id}
                    disableGutters
                    divider
                    secondaryAction={
                      <Tooltip title="Discard">
                        <IconButton size="small" color="error" onClick={() => onDiscardHeld(h.id)} aria-label="Discard">
                          <DeleteOutlineOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    }
                  >
                    <ListItemButton
                      disableGutters
                      onClick={() => {
                        onResumeHeld(h);
                        close();
                      }}
                      sx={{ pr: 4 }}
                    >
                      <ListItemText
                        primary={h.label}
                        secondary={formatTime(new Date(h.heldAt), user.currency)}
                        slotProps={{ primary: { variant: 'body2' }, secondary: { variant: 'caption' } }}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </>
          )}

          <Divider sx={{ my: 1.5 }} />

          <Stack spacing={0.5}>
            {cashSession && (
              <Button
                startIcon={<PowerSettingsNewOutlinedIcon fontSize="small" />}
                onClick={() => {
                  onCloseTerminal();
                  close();
                }}
                sx={{ justifyContent: 'flex-start', color: 'text.secondary' }}
              >
                Close POS Terminal
              </Button>
            )}
            {canOpenAdmin && (
              <Button
                startIcon={<ArrowBackOutlinedIcon fontSize="small" />}
                onClick={() => {
                  onOpenAdmin();
                  close();
                }}
                sx={{ justifyContent: 'flex-start', color: 'text.secondary' }}
              >
                Back Office
              </Button>
            )}
          </Stack>

          <Divider sx={{ my: 1.5 }} />

          <Stack spacing={1.25}>
            {/* Moved here from PosHeader's bar. Zoom is set once when a
                terminal is installed and then essentially never touched —
                usePosZoom fits the screen by itself, and this is only the
                manual override — so it belongs with the other set-once
                preferences rather than in the header a cashier reads all
                shift. Hidden below md for the same reason usePosZoom
                itself gives up there (MIN_WIDTH_TO_ZOOM): under that
                width the layout is the stacked mobile form, where scaling
                a two-column desktop layout means nothing. */}
            <Stack
              direction="row"
              sx={{ display: { xs: 'none', md: 'flex' }, justifyContent: 'space-between', alignItems: 'center' }}
            >
              <Typography variant="body2" color="text.secondary">
                Display size
              </Typography>
              <Stack
                direction="row"
                spacing={0.25}
                sx={{ alignItems: 'center', border: '1px solid', borderColor: 'divider', borderRadius: 5, px: 0.5 }}
              >
                {/* Plain −/+ rather than the pair of magnifiers this had
                    in the header: two near-identical lens glyphs took a
                    second look to tell apart, and a stepper is the
                    universal shape for "same thing, less/more of it". */}
                <Tooltip title="Smaller">
                  {/* span, because a disabled MUI button fires none of the
                      events Tooltip listens for and would show nothing at
                      exactly the moment the hint explains the most. */}
                  <span>
                    <IconButton size="small" onClick={zoom.zoomOut} disabled={!zoom.canZoomOut} aria-label="Smaller">
                      <RemoveIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title={zoom.isManual ? 'Reset to fit screen' : 'Fits the screen automatically'}>
                  <Box
                    component="button"
                    type="button"
                    onClick={zoom.reset}
                    disabled={!zoom.isManual}
                    sx={{
                      all: 'unset',
                      cursor: zoom.isManual ? 'pointer' : 'default',
                      minWidth: 38,
                      textAlign: 'center',
                      fontSize: 12,
                      fontWeight: 700,
                      // Keeps the stepper from shifting sideways as the
                      // digits change under a press-and-hold.
                      fontVariantNumeric: 'tabular-nums',
                      color: zoom.isManual ? 'text.primary' : 'text.secondary',
                    }}
                  >
                    {zoom.percent}%
                  </Box>
                </Tooltip>
                <Tooltip title="Larger">
                  <span>
                    <IconButton size="small" onClick={zoom.zoomIn} disabled={!zoom.canZoomIn} aria-label="Larger">
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
            </Stack>

            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Preferences
              </Typography>
              <Stack direction="row" spacing={0.5}>
                <ThemeToggle />
                <ChangePasswordButton />
              </Stack>
            </Stack>
          </Stack>

          <Divider sx={{ my: 1.5 }} />

          <Button fullWidth color="error" variant="outlined" startIcon={<LogoutOutlinedIcon fontSize="small" />} onClick={onLogout}>
            Log out
          </Button>
        </Box>
      </Popover>
    </>
  );
}
