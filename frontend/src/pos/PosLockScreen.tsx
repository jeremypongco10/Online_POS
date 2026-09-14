import { useState, type FormEvent } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PersonIcon from '@mui/icons-material/Person';
import Brightness4OutlinedIcon from '@mui/icons-material/Brightness4Outlined';
import Brightness7OutlinedIcon from '@mui/icons-material/Brightness7Outlined';
import { useColorScheme } from '@mui/material/styles';
import { api } from '../api/client';
import { useFormErrors } from '../admin/useFormErrors';
import { POS_ACCENT, posRaisedButtonSx } from './format';

interface Props {
  userName: string;
  onUnlocked: () => void;
  onLogout: () => void;
}

/**
 * Covers the POS screen completely rather than dimming or blurring it —
 * the whole point of locking is that whatever's on the receipt/cart
 * behind it (a customer's name, what they're buying) stops being
 * readable to anyone walking past, not just un-clickable. PosScreen
 * keeps rendering underneath this the entire time (see useIdleLock's own
 * note), so nothing here needs to reload or restore any state on
 * unlock — it only has to stop covering it.
 *
 * Password-only, not a full second login form: `userName` is already
 * known (this is the same session, not a new one), so there's nothing
 * to type but the one thing that proves it's still that cashier. See
 * AuthController::verifyPassword for why this posts somewhere other
 * than /auth/login.
 */
export function PosLockScreen({ userName, onUnlocked, onLogout }: Props) {
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { fieldErrors, formError, clearErrors, clearField, reportError } = useFormErrors();
  // The lock screen keeps its own light/dark control rather than relying
  // on one still visible from the covered screen — it covers everything,
  // AccountMenu's own toggle included, so without this a cashier who
  // locked up right as the room went dark would have no way to switch
  // back until they unlocked first.
  const { mode, setMode } = useColorScheme();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!password) return;
    setSubmitting(true);
    clearErrors();
    try {
      // suppressUnauthorizedHandler: a wrong password here means exactly
      // that — it does NOT mean the current session's own token is
      // invalid, which is the only thing a 401 means anywhere else in
      // this app. Without this, mistyping a password on this screen
      // would trip the app's global 401 handler and log the cashier
      // straight out from under the very lock screen meant to protect
      // their still-open sale — the same pitfall VoidApprovalDialog's
      // supervisor-credential calls already guard against, and found
      // here the same way: by actually hitting it.
      await api.post('/auth/verify-password', { password }, { suppressUnauthorizedHandler: true });
      onUnlocked();
    } catch (err) {
      reportError(err, 'Failed to unlock');
      setPassword('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        // Above everything PosScreen itself renders — dialogs included,
        // so a lock triggered mid-dialog (F5/F9/etc. mid-idle-timeout)
        // still fully covers whatever was open, not just the page behind it.
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        // Opaque, not the translucent/blurred treatment a modal backdrop
        // gets elsewhere in this app — see this component's own doc
        // comment on why a see-through cover would defeat the point.
        bgcolor: 'background.default',
        backgroundImage:
          'radial-gradient(circle at 15% 15%, color-mix(in srgb, var(--mui-palette-primary-main) 16%, transparent), transparent 45%), radial-gradient(circle at 85% 85%, color-mix(in srgb, var(--mui-palette-primary-main) 10%, transparent), transparent 50%)',
      }}
    >
      <Tooltip title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
        <IconButton
          onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle theme"
          sx={{ position: 'absolute', top: 16, right: 16 }}
        >
          {mode === 'dark' ? <Brightness7OutlinedIcon /> : <Brightness4OutlinedIcon />}
        </IconButton>
      </Tooltip>

      <Paper
        component="form"
        noValidate
        onSubmit={handleSubmit}
        elevation={0}
        sx={{
          width: 360,
          p: 4.5,
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 12px 32px rgba(16, 24, 40, 0.14), 0 2px 6px rgba(16, 24, 40, 0.06)',
        }}
      >
        <Stack spacing={0.75} sx={{ alignItems: 'center', mb: 3 }}>
          <Avatar sx={{ width: 56, height: 56, bgcolor: POS_ACCENT, mb: 1 }}>
            <PersonIcon sx={{ fontSize: 30 }} />
          </Avatar>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', color: 'text.secondary' }}>
            <LockOutlinedIcon sx={{ fontSize: 16 }} />
            <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Locked
            </Typography>
          </Stack>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {userName}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
            Enter your password to continue where you left off.
          </Typography>
        </Stack>

        <Stack spacing={2.5}>
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              clearField('password');
            }}
            error={!!fieldErrors?.password}
            helperText={fieldErrors?.password}
            required
            autoFocus
            fullWidth
          />
          {formError && <Alert severity="error">{formError}</Alert>}
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={submitting || !password}
            fullWidth
            sx={(theme) => posRaisedButtonSx(theme.palette.primary.main)}
          >
            {submitting ? 'Unlocking…' : 'Unlock'}
          </Button>
          {/* Doesn't need the password: this only revokes the current
              token (POST /auth/logout), the same as the account menu's
              own Log out — an escape hatch for the cashier's shift
              genuinely being over, or for the rare case verify-password
              itself has locked the account out (see that endpoint's own
              note) and waiting out the lockout isn't an option right now. */}
          <Button variant="text" color="inherit" onClick={onLogout} sx={{ color: 'text.secondary' }}>
            Log out instead
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
