import { useState, type FormEvent } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { api } from '../api/client';
import type { CashSession } from '../api/types';
import { useFormErrors } from '../admin/useFormErrors';

interface Props {
  registerId: number;
  registerName: string;
  onOpened: (session: CashSession) => void;
}

/** Phase 17, step 1-2: Open Register -> Opening Cash. Gates the POS until a session exists. */
export function OpenRegisterScreen({ registerId, registerName, onOpened }: Props) {
  const [openingBalance, setOpeningBalance] = useState('');
  const { fieldErrors, formError, clearErrors, clearField, reportError } = useFormErrors();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    clearErrors();
    try {
      const session = await api.post<CashSession>('/cash-sessions/open', {
        register_id: registerId,
        opening_balance: parseFloat(openingBalance) || 0,
      });
      onOpened(session);
    } catch (err) {
      reportError(err, 'Could not open register');
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
          Open Register
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {registerName} has no open cash session. Count the drawer and enter the opening cash to start selling.
        </Typography>
        <Stack spacing={2.5}>
          <TextField
            label="Opening Cash"
            type="number"
            slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
            value={openingBalance}
            onChange={(e) => {
              setOpeningBalance(e.target.value);
              clearField('opening_balance');
            }}
            error={!!fieldErrors?.opening_balance}
            helperText={fieldErrors?.opening_balance}
            required
            autoFocus
            fullWidth
          />
          {formError && <Alert severity="error">{formError}</Alert>}
          <Button type="submit" variant="contained" size="large" disabled={submitting} fullWidth>
            {submitting ? 'Opening…' : 'Open Register'}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
