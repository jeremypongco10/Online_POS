import { useEffect, useRef, useState } from 'react';
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
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
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
  /** Covers the screen immediately — see useIdleLock/PosLockScreen. Always available regardless of the idle-lock setting, since a cashier stepping away is worth covering whether or not auto-lock is configured at all. */
  onLock: () => void;
  /** The zoom control usePosZoom returns — this menu only renders it, PosScreen owns the hook. */
  zoom: PosZoomControl;
}

/**
 * Replaces the old full-width AppBar — everything that used to live in that
 * header (store/register selection, held sales, close terminal, Back
 * Office, theme, password, logout) now lives behind this one avatar
 * button. Rendered in the top-right corner of ReceiptPanel's letterhead
 * rather than fixed-position, so it takes no reserved space of its own.
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
  onLock,
  zoom,
}: Props) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = () => setAnchor(null);

  /**
   * Where this panel sits, in the same pixel space `getBoundingClientRect`
   * and `window.innerWidth`/`innerHeight` already report in — no zoom
   * conversion. An earlier version of this divided by the page's CSS
   * `zoom` (see usePosZoom) to convert a "visual pixel" measurement into
   * "layout pixels" before writing it into `top`/`right`, on the theory
   * that those are two different spaces here the way they are for
   * Popover's own anchor math. They aren't, for a plain sibling element
   * positioned within the same zoomed root: at 89% zoom that conversion
   * pushed the panel roughly 200px further left than the avatar it's
   * meant to sit under. Every number below is read from and written into
   * that one shared space, unconverted.
   *
   * Popover does its own version of this sum, and gets it wrong under
   * zoom in a different way: it takes the anchor's position from
   * getBoundingClientRect and hands it to `marginThreshold`'s
   * keep-it-on-screen clamp, whose own right-overflow branch can't be
   * switched off. `anchorReference="none"` stops Popover from writing any
   * position at all, leaving the panel to the two effects below —
   * one placing it from the avatar, the other correcting it against
   * what actually rendered.
   */
  const [panel, setPanel] = useState({ top: 0, right: 0, maxHeight: 0 });

  // Re-measured on open, on resize, and on every zoom change — that last
  // one matters because the Display size control that changes the zoom
  // lives inside this panel, so it moves the ground under itself while
  // open.
  useEffect(() => {
    if (!anchor) return;

    const measure = () => {
      const rect = anchor.getBoundingClientRect();
      // 6px below the avatar rather than flush against it, matching the
      // gap Popover's own anchorOrigin used to leave.
      const top = rect.bottom + 6;
      setPanel({
        top,
        right: window.innerWidth - rect.right,
        // Held sales make this panel arbitrarily tall, and nothing else
        // stops it now that Popover isn't clamping — so it scrolls at
        // whatever room is left below the avatar instead of running off
        // the bottom of a short screen.
        maxHeight: window.innerHeight - top - 8,
      });
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
    // zoom.percent: the Display size control that changes it lives inside
    // this panel, so a click there has to re-measure the ground it just
    // moved out from under itself, not just wait for a resize.
  }, [anchor, zoom.percent]);

  const panelRef = useRef<HTMLDivElement>(null);

  /**
   * A second pass, against the panel's own actually-painted position
   * rather than a formula. `measure()` above places the panel from the
   * avatar alone, which is right almost always — this only earns its
   * keep on the rare layout where that guess still lands the panel
   * partly off the right edge (a very narrow window, say). Checks the
   * real, rendered result and nudges it back on screen by exactly the
   * overflow found, in the same unconverted pixel space as `measure()`.
   *
   * Runs after every reposition (open, resize, zoom change) and
   * converges in one correction — the 1px epsilon exists only to stop a
   * fresh measurement from re-triggering itself over floating-point noise
   * once it has.
   */
  useEffect(() => {
    if (!anchor) return;
    const el = panelRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const overflow = rect.right - (window.innerWidth - 8);
    if (overflow > 1) {
      setPanel((p) => ({ ...p, right: p.right + overflow }));
    }
  }, [anchor, panel.top, panel.right]);

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
          // p:0 with no border — the avatar is already a clear enough
          // target on its own, and this sits in a corner with little room
          // to spare beside the letterhead text next to it.
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
        // Positioned by this component instead of by Popover — see the
        // `panel` measurement above for why. anchorEl is still passed:
        // Popover uses it for its owner window and scroll listener, it
        // just no longer derives coordinates from it.
        anchorReference="none"
        // Still drives the open/close animation's origin, which is all
        // transformOrigin does once positioning is taken over.
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              position: 'fixed',
              top: `${panel.top}px`,
              right: `${panel.right}px`,
              left: 'auto',
              maxHeight: `${panel.maxHeight}px`,
            },
          },
        }}
      >
        <Box ref={panelRef} sx={{ width: 300, p: 2 }}>
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
            {/* Leads the group rather than sitting after Close Terminal/
                Back Office — this is the one a cashier reaches for many
                times a shift (stepping away for a minute), where those
                two are once-a-shift actions. Always shown, cash session
                or not: idle auto-lock only applies once one's open (see
                PosScreen), but stepping away is worth covering either way. */}
            <Button
              startIcon={<LockOutlinedIcon fontSize="small" />}
              onClick={() => {
                onLock();
                close();
              }}
              sx={{ justifyContent: 'flex-start', color: 'text.secondary' }}
            >
              Lock Screen
            </Button>
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

          {/* Closes the popover itself before calling onLogout, same as
              every other button up above — didn't matter while onLogout
              pointed straight at useAuth's logout(), since that tears
              down this whole component along with it, but onLogout is
              now PosScreen's requestLogout, which for a non-empty cart
              only opens LogoutWithSaleDialog and leaves everything else
              mounted. Without this, that left the popover technically
              still open behind the confirm dialog, and its own backdrop
              went on intercepting clicks once the dialog closed. */}
          <Button
            fullWidth
            color="error"
            variant="outlined"
            startIcon={<LogoutOutlinedIcon fontSize="small" />}
            onClick={() => {
              onLogout();
              close();
            }}
          >
            Log out
          </Button>
        </Box>
      </Popover>
    </>
  );
}
