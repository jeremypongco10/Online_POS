import { useEffect, useState, type ChangeEvent } from 'react';
import { api, ApiError, assetUrl } from '../api/client';
import type { Category, Product, TaxRate, Unit } from '../api/types';
import { useSnackbar } from '../Snackbar';
import { useFormErrors } from './useFormErrors';
import { Modal } from './Modal';
import { SearchableSelect } from './SearchableSelect';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import ImageNotSupportedOutlinedIcon from '@mui/icons-material/ImageNotSupportedOutlined';
import AddAPhotoOutlinedIcon from '@mui/icons-material/AddAPhotoOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';

interface FormState {
  sku: string;
  barcode: string;
  name: string;
  description: string;
  category_id: string;
  unit_id: string;
  tax_rate_id: string;
  minimum_stock: string;
  is_active: boolean;
  track_inventory: boolean;
}

const EMPTY_FORM: FormState = {
  sku: '',
  barcode: '',
  name: '',
  description: '',
  category_id: '',
  unit_id: '',
  tax_rate_id: '',
  minimum_stock: '0',
  is_active: true,
  track_inventory: true,
};

interface Props {
  /** The modal is open exactly when this is non-null. */
  product: Product | null;
  categories: Category[];
  units: Unit[];
  taxes: TaxRate[];
  onClose: () => void;
  /** Fired after any change that alters the record — a field save, a photo upload, or a photo removal — so the caller can refresh its own copy (a list row, a lookup's detail view, …). */
  onSaved: (updated: Product) => void;
}

/**
 * The "Edit Product" form + photo picker, shared by every screen that can
 * edit a product (the Products list and the Search Product lookup) so
 * there's exactly one place that knows how to save a product or its photo.
 */
export function ProductEditModal({ product, categories, units, taxes, onClose, onSaved }: Props) {
  const notify = useSnackbar();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const { fieldErrors, formError, clearErrors, clearField, reportError } = useFormErrors();

  // Re-populate the form every time a (different, or freshly re-opened)
  // product comes in — product is also the thing that drives `open` below,
  // so this runs exactly when the modal opens.
  useEffect(() => {
    if (!product) return;
    setForm({
      sku: product.sku,
      barcode: product.barcode ?? '',
      name: product.name,
      description: product.description ?? '',
      category_id: product.category_id ? String(product.category_id) : '',
      unit_id: product.unit_id ? String(product.unit_id) : '',
      tax_rate_id: product.tax_rate_id ? String(product.tax_rate_id) : '',
      minimum_stock: product.minimum_stock,
      is_active: Number(product.is_active) === 1,
      track_inventory: Number(product.track_inventory) === 1,
    });
    clearErrors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  function pickImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // lets the same file be re-picked later (e.g. after Remove)
    if (!file || !product) return;
    uploadImage(product.id, file);
  }

  async function uploadImage(productId: number, file: File) {
    setImageUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const updated = await api.upload<Product>(`/products/${productId}/image`, formData);
      onSaved(updated);
      notify('Photo uploaded');
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to upload photo', 'error');
    } finally {
      setImageUploading(false);
    }
  }

  async function removeImage() {
    if (!product) return;
    setImageUploading(true);
    try {
      const updated = await api.del<Product>(`/products/${product.id}/image`);
      onSaved(updated);
      notify('Photo removed');
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Failed to remove photo', 'error');
    } finally {
      setImageUploading(false);
    }
  }

  async function submitForm() {
    if (!product) return;
    setSaving(true);
    clearErrors();

    const payload = {
      sku: form.sku,
      barcode: form.barcode || null,
      name: form.name,
      description: form.description || null,
      category_id: form.category_id || null,
      unit_id: form.unit_id || null,
      tax_rate_id: form.tax_rate_id || null,
      minimum_stock: form.minimum_stock,
      is_active: form.is_active ? 1 : 0,
      track_inventory: form.track_inventory ? 1 : 0,
    };

    try {
      const updated = await api.put<Product>(`/products/${product.id}`, payload);
      onSaved(updated);
      onClose();
      notify('Product updated');
    } catch (err) {
      reportError(err, 'Failed to save product');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={product !== null} title="Edit Product" onClose={onClose} wide>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submitForm();
        }}
      >
        <Grid container spacing={2} sx={{ pt: 1 }}>
          <Grid size={{ xs: 12 }}>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <Box sx={{ position: 'relative', width: 84, height: 84, flexShrink: 0 }}>
                <Avatar
                  variant="rounded"
                  src={product?.image_path ? assetUrl(product.image_path) : undefined}
                  sx={{ width: 84, height: 84, bgcolor: 'action.hover', color: 'text.disabled' }}
                >
                  <ImageNotSupportedOutlinedIcon />
                </Avatar>
                {imageUploading && (
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'rgba(0, 0, 0, 0.45)',
                      borderRadius: 1,
                    }}
                  >
                    <CircularProgress size={22} sx={{ color: '#fff' }} />
                  </Box>
                )}
              </Box>
              <Stack spacing={1} sx={{ alignItems: 'flex-start' }}>
                <Button
                  component="label"
                  variant="outlined"
                  size="small"
                  startIcon={<AddAPhotoOutlinedIcon fontSize="small" />}
                  disabled={imageUploading}
                >
                  {product?.image_path ? 'Change Photo' : 'Upload Photo'}
                  <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={pickImage} />
                </Button>
                {product?.image_path && (
                  <Button
                    type="button"
                    variant="text"
                    size="small"
                    color="error"
                    startIcon={<DeleteOutlineIcon fontSize="small" />}
                    onClick={removeImage}
                    disabled={imageUploading}
                  >
                    Remove
                  </Button>
                )}
                <Typography variant="caption" color="text.secondary">
                  JPEG, PNG, or WEBP — up to 2MB.
                </Typography>
              </Stack>
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="SKU"
              fullWidth
              value={form.sku}
              onChange={(e) => {
                setForm({ ...form, sku: e.target.value });
                clearField('sku');
              }}
              error={!!fieldErrors?.sku}
              helperText={fieldErrors?.sku}
              required
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Barcode"
              fullWidth
              value={form.barcode}
              onChange={(e) => {
                setForm({ ...form, barcode: e.target.value });
                clearField('barcode');
              }}
              error={!!fieldErrors?.barcode}
              helperText={fieldErrors?.barcode}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Name"
              fullWidth
              value={form.name}
              onChange={(e) => {
                setForm({ ...form, name: e.target.value });
                clearField('name');
              }}
              error={!!fieldErrors?.name}
              helperText={fieldErrors?.name}
              required
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <SearchableSelect
              label="Category"
              fullWidth
              value={form.category_id}
              onChange={(v) => setForm({ ...form, category_id: v })}
              options={[{ value: '', label: '— None —' }, ...categories.map((c) => ({ value: String(c.id), label: c.name }))]}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <SearchableSelect
              label="Unit"
              fullWidth
              value={form.unit_id}
              onChange={(v) => setForm({ ...form, unit_id: v })}
              options={[{ value: '', label: '— None —' }, ...units.map((u) => ({ value: String(u.id), label: `${u.name} (${u.abbreviation})` }))]}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <SearchableSelect
              label="Tax Rate"
              fullWidth
              value={form.tax_rate_id}
              onChange={(v) => setForm({ ...form, tax_rate_id: v })}
              options={[{ value: '', label: '— None —' }, ...taxes.map((t) => ({ value: String(t.id), label: `${t.name} (${t.rate}%)` }))]}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Minimum Stock"
              type="number"
              fullWidth
              slotProps={{ htmlInput: { step: '0.0001' } }}
              value={form.minimum_stock}
              onChange={(e) => {
                setForm({ ...form, minimum_stock: e.target.value });
                clearField('minimum_stock');
              }}
              error={!!fieldErrors?.minimum_stock}
              helperText={fieldErrors?.minimum_stock}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControlLabel
              control={<Checkbox checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />}
              label="Active"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControlLabel
              control={<Checkbox checked={form.track_inventory} onChange={(e) => setForm({ ...form, track_inventory: e.target.checked })} />}
              label="Track Inventory"
            />
          </Grid>

          {formError && (
            <Grid size={{ xs: 12 }}>
              <Alert severity="error">{formError}</Alert>
            </Grid>
          )}

          <Grid size={{ xs: 12 }}>
            <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'flex-end' }}>
              <Button type="button" variant="text" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="contained" disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </form>
    </Modal>
  );
}
