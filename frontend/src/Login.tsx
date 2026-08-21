import { useState, type FormEvent } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { useAuth } from './auth/AuthContext';
import { ApiError } from './api/client';
import { ThemeToggle } from './ThemeToggle';

export function Login() {
  const { login, sessionExpired } = useAuth();
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
    <Box
      sx={{
        minHeight: '100svh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        backgroundImage:
          'radial-gradient(circle at 15% 15%, color-mix(in srgb, var(--mui-palette-primary-main) 16%, transparent), transparent 45%), radial-gradient(circle at 85% 85%, color-mix(in srgb, var(--mui-palette-primary-main) 10%, transparent), transparent 50%)',
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
          width: 360,
          p: 4.5,
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 12px 32px rgba(16, 24, 40, 0.14), 0 2px 6px rgba(16, 24, 40, 0.06)',
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '-0.01em' }} gutterBottom>
          Welcome back
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
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
          />
          {error && <Alert severity="error">{error}</Alert>}
          <Button type="submit" variant="contained" size="large" disabled={submitting} fullWidth>
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
