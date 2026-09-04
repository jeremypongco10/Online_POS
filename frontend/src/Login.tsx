import { useState, type FormEvent } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { useColorScheme } from '@mui/material/styles';
import { keyframes } from '@emotion/react';
import { useAuth } from './auth/AuthContext';
import { canAccessPos } from './auth/posAccess';
import { ApiError } from './api/client';
import { enterFullscreen } from './fullscreen';
import { ThemeToggle } from './ThemeToggle';
import logoLight from './assets/logo.png';
import logoDark from './assets/logo-dark.png';

/** The branding panel's ambient background glow, drifting slowly rather than sitting static — subtle enough to not distract from the form beside it. */
const glowDrift = keyframes`
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(-3%, 3%) scale(1.08); }
`;

/** Staggered per-element via animationDelay below, so the logo, headline, and copy settle in one after another instead of all snapping in at once. */
const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
`;

/** Grounded in what the app actually does (this session added barcode scanning, loyalty points, and the audit trail) rather than generic marketing copy. */
const HIGHLIGHTS = [
  'Multi-store, multi-terminal — one account, every branch',
  'Barcode scanning built right into checkout',
  'Customer loyalty points on every sale',
  'A full audit trail of who did what, and when',
];

export function Login() {
  const { login, sessionExpired } = useAuth();
  const { mode, systemMode } = useColorScheme();
  const resolvedMode = mode === 'system' ? systemMode : mode;
  // The form side follows the app's own light/dark setting, but the
  // branding panel's background is a fixed dark gradient regardless of
  // theme (see below) — it always needs the light-colored wordmark.
  const formLogo = resolvedMode === 'dark' ? logoDark : logoLight;
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string> | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setFieldErrors(null);
    try {
      const user = await login(identifier, password);
      // Cashier/Cashier Supervisor land on the register, not the Back
      // Office — that's the "POS" this is meant for. A manager signing in
      // on a shared office PC shouldn't have their browser chrome taken
      // away without asking.
      if (canAccessPos(user)) enterFullscreen();
    } catch (err) {
      if (err instanceof ApiError && err.status === 422 && err.errors) {
        // Field-specific validation (missing/malformed input) — shown
        // under the offending field(s) instead of one generic banner.
        setFieldErrors(err.errors);
      } else {
        // Wrong password / unknown email are deliberately reported as
        // one generic message by the API — pinpointing which one is
        // wrong would let someone enumerate valid accounts.
        setError(err instanceof ApiError ? err.message : 'Login failed');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box sx={{ minHeight: '100svh', display: 'flex' }}>
      {/* Branding panel — hidden on phones/tablets, where the form alone fills the screen. */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flex: '0 0 44%',
          position: 'relative',
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
          p: 6,
          background: 'linear-gradient(155deg, #312e81 0%, #4338ca 45%, #4f46e5 100%)',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            // Oversized (-10% on every side) and re-centered via translate
            // in the keyframes above so the drift never scrolls a hard
            // edge into view at the panel's own boundary.
            inset: '-10%',
            backgroundImage:
              'radial-gradient(circle at 12% 18%, rgba(255,255,255,0.14), transparent 40%), radial-gradient(circle at 88% 82%, rgba(255,255,255,0.12), transparent 45%), radial-gradient(circle at 85% 15%, rgba(255,255,255,0.08), transparent 35%)',
            animation: `${glowDrift} 20s ease-in-out infinite`,
          }}
        />
        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            maxWidth: 420,
            color: '#fff',
          }}
        >
          <Box
            component="img"
            src={logoDark}
            alt="Execute IT POS System"
            sx={{ height: 44, width: 'auto', display: 'block', mb: 5, animation: `${fadeUp} 0.7s ease-out both` }}
          />
          <Typography
            variant="h4"
            sx={{ fontWeight: 700, letterSpacing: '-0.01em', mb: 2, lineHeight: 1.25, animation: `${fadeUp} 0.7s ease-out 0.12s both` }}
          >
            Run your whole store from one screen.
          </Typography>
          <Typography
            variant="body1"
            sx={{ color: 'rgba(255,255,255,0.75)', animation: `${fadeUp} 0.7s ease-out 0.24s both` }}
          >
            Sales, inventory, purchasing, and your team — everything a Philippine retail business needs, in one POS.
          </Typography>

          <Stack spacing={1.5} sx={{ mt: 4 }}>
            {HIGHLIGHTS.map((text, i) => (
              <Stack
                key={text}
                direction="row"
                spacing={1.25}
                sx={{ alignItems: 'center', animation: `${fadeUp} 0.7s ease-out ${0.36 + i * 0.08}s both` }}
              >
                <CheckCircleRoundedIcon sx={{ fontSize: 18, color: 'rgba(255,255,255,0.55)', flexShrink: 0 }} />
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)' }}>
                  {text}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Box>
      </Box>

      {/* Form panel — a faint brand-color glow behind the card keeps this
          side visually tied to the branding panel instead of reading as a
          flat, disconnected void next to it. */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          p: 2,
          bgcolor: 'background.default',
          backgroundImage:
            'radial-gradient(circle at 85% 15%, color-mix(in srgb, var(--mui-palette-primary-main) 14%, transparent), transparent 45%), radial-gradient(circle at 15% 85%, color-mix(in srgb, var(--mui-palette-primary-main) 8%, transparent), transparent 50%)',
        }}
      >
        <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
          <ThemeToggle />
        </Box>
        <Paper
          component="form"
          noValidate
          onSubmit={handleSubmit}
          elevation={0}
          sx={{
            width: 380,
            maxWidth: '100%',
            p: { xs: 3, sm: 4.5 },
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 20px 48px rgba(16, 24, 40, 0.16), 0 4px 12px rgba(16, 24, 40, 0.08)',
          }}
        >
          <Box component="img" src={formLogo} alt="Execute IT POS System" sx={{ height: 32, width: 'auto', display: { xs: 'block', md: 'none' }, mb: 3 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '-0.01em' }} gutterBottom>
            Welcome back
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3.5 }}>
            Sign in to your POS account
          </Typography>
          <Stack spacing={2.5}>
            {sessionExpired && <Alert severity="warning">Your session expired. Please sign in again.</Alert>}
            <TextField
              label="Email or Username"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                if (fieldErrors?.identifier) setFieldErrors({ ...fieldErrors, identifier: '' });
              }}
              error={!!fieldErrors?.identifier}
              helperText={fieldErrors?.identifier}
              required
              autoFocus
              fullWidth
              // "off" alone is ignored by Chrome/Edge on login forms, but
              // combined with the password field's autoComplete below it
              // stops the saved-passwords suggestion dropdown from popping
              // up over the Sign In button (see Login.tsx's password field).
              autoComplete="off"
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors?.password) setFieldErrors({ ...fieldErrors, password: '' });
              }}
              error={!!fieldErrors?.password}
              helperText={fieldErrors?.password}
              required
              fullWidth
              // "new-password" is the standard trick browsers still honor to
              // suppress the saved-credentials autofill dropdown, even
              // though they ignore a plain autoComplete="off" here.
              autoComplete="new-password"
            />
            {error && <Alert severity="error">{error}</Alert>}
            <Button type="submit" variant="contained" size="large" disabled={submitting} fullWidth>
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}
