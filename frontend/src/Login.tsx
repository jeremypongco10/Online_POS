import { useState, type FormEvent } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { useColorScheme } from '@mui/material/styles';
import { useAuth } from './auth/AuthContext';
import { ApiError } from './api/client';
import { ThemeToggle } from './ThemeToggle';
import logoLight from './assets/logo.png';
import logoDark from './assets/logo-dark.png';

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
      await login(identifier, password);
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
            inset: 0,
            backgroundImage:
              'radial-gradient(circle at 12% 18%, rgba(255,255,255,0.14), transparent 40%), radial-gradient(circle at 88% 82%, rgba(255,255,255,0.12), transparent 45%), radial-gradient(circle at 85% 15%, rgba(255,255,255,0.08), transparent 35%)',
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
          <Box component="img" src={logoDark} alt="Execute IT POS System" sx={{ height: 44, width: 'auto', display: 'block', mb: 5 }} />
          <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: '-0.01em', mb: 2, lineHeight: 1.25 }}>
            Run your whole store from one screen.
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.75)' }}>
            Sales, inventory, purchasing, and your team — everything a Philippine retail business needs, in one POS.
          </Typography>
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
