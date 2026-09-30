import { useEffect, useRef, useState } from 'react';
import { api, ApiError, assetUrl } from '../api/client';
import type { Company } from '../api/types';
import { PhotoDropzone } from './PhotoDropzone';
import { useAuth } from '../auth/AuthContext';
import { useSnackbar } from '../Snackbar';
import { useFormErrors } from './useFormErrors';
import { SearchableSelect } from './SearchableSelect';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';

/**
 * Settings → Business Information. The registered identity printed at
 * the top of every receipt this business issues — split out of the Sales
 * Invoicing tab it used to share a card with (that tab still keeps its
 * own "Branch" picker for the per-store fields below the header; this one
 * is company-wide, not tied to any single branch).
 *
 * Editable, where this used to be a read-only card pointed at "the
 * Company profile" for the name/TIN/VAT status — a screen that never
 * existed anywhere in this app, leaving the three fields that print at
 * the top of every BIR receipt with no way to set them at all.
 */
export function BusinessInformationTab() {
  const { user, hasPermission } = useAuth();
  const canManageCompany = hasPermission('companies.manage');
  const notify = useSnackbar();

  const [company, setCompany] = useState<Company | null>(null);

  useEffect(() => {
    if (!user) return;
    api.get<Company>(`/companies/${user.company_id}`).then(setCompany);
  }, [user]);

  const [profile, setProfile] = useState({ legal_name: '', tax_id: '', is_vat_registered: '0', vat_registration_number: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const {
    fieldErrors: profileErrors,
    formError: profileError,
    clearErrors: clearProfileErrors,
    clearField: clearProfileField,
    reportError: reportProfileError,
  } = useFormErrors();

  // Seeded from the fetched company exactly ONCE, not every time `company`
  // changes — a plain `[company]` dependency re-ran this on every fetch,
  // including StrictMode's dev-mode double-invoke and saveProfile()'s own
  // setCompany(updated) after a successful save. Any of those firing while
  // the admin was mid-edit silently overwrote whatever they'd already
  // typed with the server's last-known values, so Save then submitted the
  // OLD data back — a real, reproducible data-loss bug, not a hypothetical
  // one (caught live: type a new name, click Save, reload — the old name
  // was still there). Once seeded, `profile` is the form's own draft;
  // saveProfile()'s setCompany(updated) no longer needs to feed back into
  // it, since `updated` only ever echoes what was just submitted.
  const profileSeeded = useRef(false);
  useEffect(() => {
    if (!company || profileSeeded.current) return;
    profileSeeded.current = true;
    setProfile({
      legal_name: company.legal_name ?? '',
      tax_id: company.tax_id ?? '',
      is_vat_registered: Number(company.is_vat_registered) === 1 ? '1' : '0',
      vat_registration_number: company.vat_registration_number ?? '',
    });
  }, [company]);

  async function saveProfile() {
    if (!company) return;
    setProfileSaving(true);
    clearProfileErrors();
    try {
      const updated = await api.put<Company>(`/companies/${company.id}`, {
        legal_name: profile.legal_name || null,
        tax_id: profile.tax_id || null,
        is_vat_registered: profile.is_vat_registered === '1' ? 1 : 0,
        // Cleared alongside the flag: a VAT number left behind on a
        // business that has since deregistered would keep printing.
        vat_registration_number: profile.is_vat_registered === '1' ? profile.vat_registration_number || null : null,
      });
      setCompany(updated);
      notify('Business profile updated');
    } catch (err) {
      reportProfileError(err, 'Failed to save the business profile');
    } finally {
      setProfileSaving(false);
    }
  }

  // The logo — saved on drop/pick immediately, like a product photo,
  // rather than staged alongside the text fields above and held for Save
  // Business Profile. Its own request either way (POST/DELETE .../logo,
  // not the plain company PUT), so there's nothing to gain by waiting.
  const [logoUploading, setLogoUploading] = useState(false);

  async function uploadLogo(file: File) {
    if (!company) return;
    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);
      const updated = await api.upload<Company>(`/companies/${company.id}/logo`, formData);
      setCompany(updated);
      notify('Logo uploaded');
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to upload logo', 'error');
    } finally {
      setLogoUploading(false);
    }
  }

  async function removeLogo() {
    if (!company) return;
    setLogoUploading(true);
    try {
      const updated = await api.del<Company>(`/companies/${company.id}/logo`);
      setCompany(updated);
      notify('Logo removed');
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to remove logo', 'error');
    } finally {
      setLogoUploading(false);
    }
  }

  return (
    <Stack spacing={2.5}>
      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
          Business Information
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          The registered identity printed at the top of every receipt this business issues. Branch details (address, BIR accreditation) are set
          per branch in Settings → Stores.
        </Typography>

        {company &&
          (canManageCompany ? (
            <PhotoDropzone
              imageUrl={company.logo_path ? assetUrl(company.logo_path) : undefined}
              uploading={logoUploading}
              onFile={uploadLogo}
              onRemove={company.logo_path ? removeLogo : undefined}
              onError={(message) => notify(message, 'error')}
              hint="Printed at the top of every receipt, both on paper and via a Bluetooth thermal printer. JPEG, PNG, or WEBP — up to 2MB."
            />
          ) : (
            company.logo_path && (
              <Box component="img" src={assetUrl(company.logo_path)} alt="Business logo" sx={{ maxWidth: 160, maxHeight: 120, mb: 1 }} />
            )
          ))}

        <Grid container spacing={2} sx={{ mb: 1, mt: 0.5 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Registered Business Name"
              fullWidth
              value={profile.legal_name}
              onChange={(e) => {
                setProfile({ ...profile, legal_name: e.target.value });
                clearProfileField('legal_name');
              }}
              error={!!profileErrors?.legal_name}
              helperText={profileErrors?.legal_name ?? 'As registered with the BIR — falls back to the trade name if blank.'}
              disabled={!canManageCompany}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="TIN"
              fullWidth
              value={profile.tax_id}
              onChange={(e) => {
                setProfile({ ...profile, tax_id: e.target.value });
                clearProfileField('tax_id');
              }}
              error={!!profileErrors?.tax_id}
              helperText={profileErrors?.tax_id ?? 'Prints as "TIN:" on every receipt.'}
              disabled={!canManageCompany}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <SearchableSelect
              label="VAT Status"
              value={profile.is_vat_registered}
              onChange={(v) => setProfile({ ...profile, is_vat_registered: v })}
              options={[
                { value: '1', label: 'VAT Registered' },
                { value: '0', label: 'Non-VAT' },
              ]}
              fullWidth
              disabled={!canManageCompany}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="VAT Registration Number"
              fullWidth
              value={profile.vat_registration_number}
              onChange={(e) => {
                setProfile({ ...profile, vat_registration_number: e.target.value });
                clearProfileField('vat_registration_number');
              }}
              error={!!profileErrors?.vat_registration_number}
              helperText={profileErrors?.vat_registration_number ?? 'Leave blank if not VAT registered.'}
              disabled={!canManageCompany || profile.is_vat_registered !== '1'}
            />
          </Grid>

          {profileError && (
            <Grid size={{ xs: 12 }}>
              <Alert severity="error">{profileError}</Alert>
            </Grid>
          )}

          {canManageCompany && (
            <Grid size={{ xs: 12 }}>
              <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
                <Button variant="contained" onClick={saveProfile} disabled={profileSaving}>
                  {profileSaving ? 'Saving…' : 'Save Business Profile'}
                </Button>
              </Stack>
            </Grid>
          )}
        </Grid>
      </Paper>
    </Stack>
  );
}
