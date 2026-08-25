import type { ReactNode } from 'react';
import Dialog from '@mui/material/Dialog';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import CloseIcon from '@mui/icons-material/Close';
import { PopTransition } from '../PopTransition';

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  /** Wider still than `wide` — for content-heavy modals like a permission matrix. Overrides `wide` when set. */
  maxWidth?: 'sm' | 'md' | 'lg';
  /**
   * Defaults to true — most callers only ever mount <Modal> while it
   * should be visible. Pass false (keeping the component mounted rather
   * than removed from the tree) to let the close transition play instead
   * of the dialog just vanishing.
   */
  open?: boolean;
}

export function Modal({ title, onClose, children, wide, maxWidth, open = true }: Props) {
  const theme = useTheme();
  // A centred dialog leaves too little room for these forms on a phone —
  // going full-screen gives the fields the whole viewport instead.
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth ?? (wide ? 'md' : 'sm')}
      fullWidth
      fullScreen={fullScreen}
      slots={{ transition: PopTransition }}
    >
      <Stack
        direction="row"
        sx={{
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 3,
          py: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <DialogTitle sx={{ p: 0, fontSize: 17, fontWeight: 700 }}>{title}</DialogTitle>
        <Tooltip title="Close">
          <IconButton
            onClick={onClose}
            aria-label="Close"
            size="small"
            sx={{ color: 'text.secondary', bgcolor: 'action.hover', '&:hover': { bgcolor: 'action.selected' } }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
      <DialogContent sx={{ px: 3, py: 2.5 }}>{children}</DialogContent>
    </Dialog>
  );
}
