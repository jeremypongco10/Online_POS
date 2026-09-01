import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import PersonAddAlt1OutlinedIcon from '@mui/icons-material/PersonAddAlt1Outlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import UndoOutlinedIcon from '@mui/icons-material/UndoOutlined';
import AssignmentReturnOutlinedIcon from '@mui/icons-material/AssignmentReturnOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import type { Bagger, Customer } from '../api/types';
import { POS_ACCENT } from './format';

interface Props {
  customer: Customer | null;
  onOpenCustomer: () => void;
  bagger: Bagger | null;
  onOpenBagger: () => void;
  cartHasItems: boolean;
  onCancel: () => void;
  onRefund: () => void;
  onReturn: () => void;
}

/**
 * Add Customer and Bagger are part of ringing up a normal sale, so they
 * stay on the surface. Refund, Return, and Cancellation are exceptions —
 * and the first two only navigate away to the Back Office Returns screen
 * anyway — so they sit behind "More" rather than presenting five equally
 * loud buttons where only two are routine.
 *
 * Add Customer and Bagger keep their stable `id`s: useKeyboardShortcuts
 * triggers those two via a DOM click (their dialog state lives up in
 * ProductBrowser). The three menu items deliberately do NOT rely on that
 * — they'd be unclickable while the menu is closed — so PosScreen wires
 * F7/F8/F9 straight to the same callbacks this menu calls.
 */
export function CartActionsRow({ customer, onOpenCustomer, bagger, onOpenBagger, cartHasItems, onCancel, onRefund, onReturn }: Props) {
  const [moreAnchor, setMoreAnchor] = useState<HTMLElement | null>(null);

  const actionSx = {
    justifyContent: 'flex-start',
    minWidth: 0,
    px: 1.5,
    py: 0.85,
    borderRadius: 2,
    borderColor: 'divider',
    color: 'text.primary',
    fontWeight: 600,
    fontSize: 13,
    textTransform: 'none' as const,
    '&:hover': { borderColor: POS_ACCENT, color: POS_ACCENT, bgcolor: `${POS_ACCENT}0a` },
  };

  function runAndClose(action: () => void) {
    setMoreAnchor(null);
    action();
  }

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 1 }}>
      <Tooltip title="Shortcut: F3">
        <Button
          id="pos-action-add-customer"
          variant="outlined"
          startIcon={<PersonAddAlt1OutlinedIcon fontSize="small" />}
          onClick={onOpenCustomer}
          sx={{
            ...actionSx,
            // An attached customer/bagger is state worth seeing at a
            // glance mid-sale, so a filled selection reads differently
            // from the empty prompt without adding a separate badge.
            ...(customer && { borderColor: POS_ACCENT, color: POS_ACCENT, bgcolor: `${POS_ACCENT}0f` }),
          }}
        >
          <Typography component="span" noWrap sx={{ fontWeight: 600, fontSize: 13, minWidth: 0 }}>
            {customer ? customer.name : 'Add Customer'}
          </Typography>
        </Button>
      </Tooltip>

      <Tooltip title="Shortcut: F6">
        <Button
          id="pos-action-bagger"
          variant="outlined"
          startIcon={<Inventory2OutlinedIcon fontSize="small" />}
          onClick={onOpenBagger}
          sx={{
            ...actionSx,
            ...(bagger && { borderColor: POS_ACCENT, color: POS_ACCENT, bgcolor: `${POS_ACCENT}0f` }),
          }}
        >
          <Typography component="span" noWrap sx={{ fontWeight: 600, fontSize: 13, minWidth: 0 }}>
            {bagger ? bagger.name : 'Bagger'}
          </Typography>
        </Button>
      </Tooltip>

      <Tooltip title="Refund, Return, Cancellation">
        <Button
          variant="outlined"
          aria-label="More actions"
          onClick={(e) => setMoreAnchor(e.currentTarget)}
          sx={{ ...actionSx, px: 1.25, justifyContent: 'center' }}
        >
          <MoreHorizIcon fontSize="small" />
        </Button>
      </Tooltip>

      <Menu anchorEl={moreAnchor} open={Boolean(moreAnchor)} onClose={() => setMoreAnchor(null)}>
        <MenuItem onClick={() => runAndClose(onRefund)}>
          <ListItemIcon>
            <UndoOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Refund" />
          <Typography variant="caption" color="text.secondary" sx={{ ml: 3 }}>
            F7
          </Typography>
        </MenuItem>
        <MenuItem onClick={() => runAndClose(onReturn)}>
          <ListItemIcon>
            <AssignmentReturnOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Return" />
          <Typography variant="caption" color="text.secondary" sx={{ ml: 3 }}>
            F8
          </Typography>
        </MenuItem>
        <MenuItem disabled={!cartHasItems} onClick={() => runAndClose(onCancel)} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <CancelOutlinedIcon fontSize="small" color={cartHasItems ? 'error' : 'disabled'} />
          </ListItemIcon>
          <ListItemText primary="Cancel Sale" />
          <Typography variant="caption" color="text.secondary" sx={{ ml: 3 }}>
            F9
          </Typography>
        </MenuItem>
      </Menu>
    </Box>
  );
}
