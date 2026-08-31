import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import PersonAddAlt1OutlinedIcon from '@mui/icons-material/PersonAddAlt1Outlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import UndoOutlinedIcon from '@mui/icons-material/UndoOutlined';
import AssignmentReturnOutlinedIcon from '@mui/icons-material/AssignmentReturnOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import type { Bagger, Customer } from '../api/types';

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
 * Cancellation only clears the in-progress cart — there's nothing to
 * cancel server-side until a sale is actually submitted. Refund and
 * Return both operate on an already-completed past sale, which this
 * screen has no record of once the receipt closes, so both hand off to
 * the existing Returns screen in the Back Office rather than reimplementing
 * that lookup here. Add Customer and Bagger just open their existing
 * dialogs — grouped here alongside Refund/Return/Cancellation as one
 * place for every secondary, non-checkout action on the sale.
 *
 * Each button carries a stable `id` — useKeyboardShortcuts triggers these
 * via a DOM click rather than lifted callbacks, the same pattern already
 * used for the Pay button, since Add Customer/Bagger's dialog state lives
 * in ProductBrowser rather than being threaded all the way up to PosScreen.
 */
export function CartActionsRow({ customer, onOpenCustomer, bagger, onOpenBagger, cartHasItems, onCancel, onRefund, onReturn }: Props) {
  const pillSx = (color: string) => ({
    minWidth: 0,
    px: 1,
    borderRadius: 999,
    bgcolor: `${color}1a`,
    color,
    fontWeight: 700,
    fontSize: 12.5,
    '& .MuiButton-startIcon': { mr: 0.5 },
    '&:hover': { bgcolor: `${color}29` },
    '&.Mui-disabled': { bgcolor: 'action.hover', color: 'text.disabled' },
  });

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 1 }}>
      <Tooltip title="Shortcut: F3">
        <Button
          id="pos-action-add-customer"
          size="small"
          startIcon={<PersonAddAlt1OutlinedIcon fontSize="small" />}
          onClick={onOpenCustomer}
          sx={pillSx('#7c3aed')}
        >
          {customer ? customer.name : 'Add Customer'}
        </Button>
      </Tooltip>
      <Tooltip title="Shortcut: F6">
        <Button
          id="pos-action-bagger"
          size="small"
          startIcon={<Inventory2OutlinedIcon fontSize="small" />}
          onClick={onOpenBagger}
          sx={pillSx('#d97706')}
        >
          {bagger ? bagger.name : 'Bagger'}
        </Button>
      </Tooltip>
      <Tooltip title="Shortcut: F7">
        <Button
          id="pos-action-refund"
          size="small"
          startIcon={<UndoOutlinedIcon fontSize="small" />}
          onClick={onRefund}
          sx={pillSx('#2563eb')}
        >
          Refund
        </Button>
      </Tooltip>
      <Tooltip title="Shortcut: F8">
        <Button
          id="pos-action-return"
          size="small"
          startIcon={<AssignmentReturnOutlinedIcon fontSize="small" />}
          onClick={onReturn}
          sx={pillSx('#059669')}
        >
          Return
        </Button>
      </Tooltip>
      <Tooltip title="Shortcut: F9">
        <Button
          id="pos-action-cancel"
          size="small"
          startIcon={<CancelOutlinedIcon fontSize="small" />}
          disabled={!cartHasItems}
          onClick={onCancel}
          sx={pillSx('#dc2626')}
        >
          Cancellation
        </Button>
      </Tooltip>
    </Box>
  );
}
