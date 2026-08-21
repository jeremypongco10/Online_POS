import { useState } from 'react';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined';
import { api, setTokens, ApiError } from './api/client';
import { Modal } from './admin/Modal';
import { useFormErrors } from './admin/useFormErrors';

interface FormState {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

const EMPTY_FORM: FormState = { current_password: '', new_password: '', confirm_password: '' };

/** Icon button + its own modal, self-contained — drop into any header's action row. */
export function ChangePasswordButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Tooltip title="Change password">
        <IconButton size="small" onClick={() => setOpen(true)} aria-label="Change password" sx={{ color: 'text.secondary' }}>
          <KeyOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <ChangePasswordModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const { fieldErrors, formError, clearErrors, clearField, reportError } = useFormErrors();

  function handleClose() {
    setForm(EMPTY_FORM);
    clearErrors();
    setSuccess(false);
    onClose();
  }

  async function submit() {
    if (form.new_password !== form.confirm_password) {
      clearErrors();
      reportError(
        new ApiError('The given data was invalid.', 422, { confirm_password: 'Passwords do not match.' }),
        'Passwords do not match.'
      );
      return;
    }

    setSaving(true);
    clearErrors();
    try {
      const data = await api.post<{ access_token: string; refresh_token: string }>('/auth/change-password', {
        current_password: form.current_password,
        new_password: form.new_password,
      });
      setTokens(data.access_token, data.refresh_token);
      setSuccess(true);
      setTimeout(handleClose, 1400);
    } catch (err) {
      reportError(err, 'Failed to change password');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} title="Change Password" onClose={handleClose}>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Grid container spacing={2} sx={{ pt: 1 }}>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Current Password"
              type="password"
              fullWidth
              value={form.current_password}
              onChange={(e) => {
                setForm({ ...form, current_password: e.target.value });
                clearField('current_password');
              }}
              error={!!fieldErrors?.current_password}
              helperText={fieldErrors?.current_password}
              required
              autoFocus
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="New Password (min 8 characters)"
              type="password"
              fullWidth
              value={form.new_password}
              onChange={(e) => {
                setForm({ ...form, new_password: e.target.value });
                clearField('new_password');
              }}
              error={!!fieldErrors?.new_password}
              helperText={fieldErrors?.new_password}
              slotProps={{ htmlInput: { minLength: 8 } }}
              required
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Confirm New Password"
              type="password"
              fullWidth
              value={form.confirm_password}
              onChange={(e) => {
                setForm({ ...form, confirm_password: e.target.value });
                clearField('confirm_password');
              }}
              error={!!fieldErrors?.confirm_password}
              helperText={fieldErrors?.confirm_password}
              required
            />
          </Grid>

          {success && <Grid size={{ xs: 12 }}>
            <Alert severity="success">Password changed.</Alert>
          </Grid>}
          {formError && (
            <Grid size={{ xs: 12 }}>
              <Alert severity="error">{formError}</Alert>
            </Grid>
          )}

          <Grid size={{ xs: 12 }}>
            <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'flex-end' }}>
              <Button type="button" variant="text" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" variant="contained" disabled={saving || success}>
                {saving ? 'Changing…' : 'Change Password'}
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </form>
    </Modal>
  );
}
