import { useState, type ChangeEvent, type DragEvent } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import CloseIcon from '@mui/icons-material/Close';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface Props {
  imageUrl?: string | null;
  uploading?: boolean;
  disabled?: boolean;
  size?: number;
  onFile: (file: File) => void;
  onRemove?: () => void;
  onError?: (message: string) => void;
  hint?: string;
}

/**
 * A single control that's both a click-to-browse and a drag-and-drop photo
 * picker — shared by every screen that can attach a product photo (the
 * Products list's edit modal, the Search Product lookup's edit modal, and
 * the Add New Product form) so there's exactly one drop target to keep
 * consistent. Purely presentational: the caller owns what "uploading"
 * means (upload immediately vs. stage until form submit) and supplies the
 * current image, if any, as a ready-to-use URL (a data: URL for a
 * locally-picked file, or a server asset URL for an already-saved photo).
 */
export function PhotoDropzone({ imageUrl, uploading = false, disabled = false, size = 120, onFile, onRemove, onError, hint = 'JPEG, PNG, or WEBP — up to 2MB.' }: Props) {
  const [dragActive, setDragActive] = useState(false);
  const interactive = !disabled && !uploading;

  function acceptFile(file: File | undefined | null) {
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      onError?.('Please choose a JPEG, PNG, or WEBP image.');
      return;
    }
    onFile(file);
  }

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // lets the same file be re-picked later (e.g. after Remove)
    acceptFile(file);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragActive(false);
    if (!interactive) return;
    acceptFile(e.dataTransfer.files?.[0]);
  }

  return (
    <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
      <Box
        component="label"
        onDragOver={(e: DragEvent) => {
          if (!interactive) return;
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        sx={{
          position: 'relative',
          width: size,
          height: size,
          flexShrink: 0,
          borderRadius: 3,
          border: '2px dashed',
          borderColor: dragActive ? 'primary.main' : 'divider',
          bgcolor: dragActive ? 'action.hover' : imageUrl ? 'transparent' : 'action.hover',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          cursor: interactive ? 'pointer' : 'default',
          transition: 'border-color 0.15s ease, background-color 0.15s ease',
          '&:hover': interactive ? { borderColor: 'primary.main', bgcolor: imageUrl ? undefined : 'action.hover' } : undefined,
          '&:hover .photo-dropzone-replace': interactive && imageUrl ? { opacity: 1 } : undefined,
        }}
      >
        {imageUrl ? (
          <Box component="img" src={imageUrl} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <Stack spacing={0.5} sx={{ alignItems: 'center', px: 1, textAlign: 'center' }}>
            <CloudUploadOutlinedIcon sx={{ color: 'text.disabled' }} />
            <Typography variant="caption" color="text.secondary">
              Drag &amp; drop or click
            </Typography>
          </Stack>
        )}

        {imageUrl && interactive && (
          <Box
            className="photo-dropzone-replace"
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'rgba(0, 0, 0, 0.45)',
              opacity: 0,
              transition: 'opacity 0.15s ease',
              pointerEvents: 'none',
            }}
          >
            <Typography variant="caption" sx={{ color: '#fff', fontWeight: 600 }}>
              Drop or click to replace
            </Typography>
          </Box>
        )}

        {interactive && <input type="file" accept={ACCEPTED_TYPES.join(',')} hidden onChange={handleInputChange} />}

        {uploading && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'rgba(0, 0, 0, 0.45)',
            }}
          >
            <CircularProgress size={22} sx={{ color: '#fff' }} />
          </Box>
        )}

        {imageUrl && onRemove && !uploading && (
          <Tooltip title="Remove photo">
            <IconButton
              size="small"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemove();
              }}
              sx={{
                position: 'absolute',
                top: 4,
                right: 4,
                bgcolor: 'rgba(0, 0, 0, 0.55)',
                color: '#fff',
                '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.75)' },
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ pt: 0.5 }}>
        {hint}
      </Typography>
    </Stack>
  );
}
