import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client';
import { useSnackbar } from '../Snackbar';
import { DISCOUNT_TYPES, type DiscountTypeCode } from '../pos/discountTypes';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';

/**
 * Shared by CategoriesScreen (a category's own overrides — the primary,
 * maintainable lever) and ProductsScreen (one product's overrides, the
 * most specific rule TaxService::isProductEligibleForDiscount() checks).
 * Both endpoints have the exact same shape — GET returns the current
 * state per discount type, PUT `{ rules }` sets it — so this one form
 * drives either, told apart only by `apiPath`.
 *
 * Every discount type is opt-in: not eligible for anything until this
 * form (or a checkout that hits the same resolution) says otherwise.
 * For a category, GET returns only that category's own override rows
 * (missing = not eligible, the default). For a product, GET returns
 * the FULLY RESOLVED value instead (product row, else category row,
 * else default) — every switch here therefore starts at "what this
 * product/category can actually be discounted with right now", not at
 * a raw, possibly-confusing "is there a row" state. Saving always PUTs
 * every one of the nine types; the backend decides per type whether
 * that needs a stored row or collapses back to none (see
 * ProductsController::updateDiscountEligibility's docblock) — this form
 * never has to know which.
 */
export function DiscountEligibilityForm({
  apiPath,
  description,
  onClose,
}: {
  apiPath: string;
  description: string;
  onClose: () => void;
}) {
  const notify = useSnackbar();
  const [rules, setRules] = useState<Record<DiscountTypeCode, boolean>>(
    () => Object.fromEntries(DISCOUNT_TYPES.map((d) => [d.code, false])) as Record<DiscountTypeCode, boolean>
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get<Partial<Record<DiscountTypeCode, boolean>>>(apiPath)
      .then((overrides) => {
        if (cancelled) return;
        setRules((prev) => ({ ...prev, ...overrides }));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiPath]);

  async function submit() {
    setSaving(true);
    try {
      await api.put(apiPath, { rules });
      notify('Discount eligibility updated');
      onClose();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to save discount eligibility', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Stack sx={{ alignItems: 'center', py: 4 }}>
        <CircularProgress size={22} />
      </Stack>
    );
  }

  return (
    <Stack spacing={0.5}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {description}
      </Typography>

      {DISCOUNT_TYPES.map((d, i) => (
        <Stack key={d.code}>
          {i === 3 && <Divider sx={{ my: 1 }} />}
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={rules[d.code]}
                onChange={(e) => setRules((prev) => ({ ...prev, [d.code]: e.target.checked }))}
              />
            }
            label={d.label}
          />
        </Stack>
      ))}

      <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', mt: 2 }}>
        <Button onClick={onClose} disabled={saving} color="inherit">
          Cancel
        </Button>
        <Button variant="contained" onClick={submit} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </Stack>
    </Stack>
  );
}
