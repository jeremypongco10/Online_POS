import { useState, type ReactNode } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import CloseIcon from '@mui/icons-material/Close';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import type { Bagger, CashSession, Customer, LoyaltyCard, ProductWithStorePrice } from '../api/types';
import { ProductSearch } from './ProductSearch';
import { CustomerLoyaltyPanel } from './CustomerLoyaltyPanel';
import { BaggerPanel } from './BaggerPanel';
import { OverflowMenu } from './OverflowMenu';
import { CartActionsRow } from './CartActionsRow';

interface Props {
  companyId: number;
  storeId: number | null;
  onAdd: (product: ProductWithStorePrice) => void;
  customer: Customer | null;
  card: LoyaltyCard | null;
  onAttachCustomer: (customer: Customer | null, card: LoyaltyCard | null) => void;
  bagger: Bagger | null;
  onSelectBagger: (bagger: Bagger | null) => void;
  cashSession: CashSession | null;
  headerExtra?: ReactNode;
  cartHasItems: boolean;
  onCancel: () => void;
  onRefund: () => void;
  onReturn: () => void;
}

/** Left panel: category/search-driven product browsing. The overflow menu (Cash Movements) and the account menu ride along in the search bar's own row; Add Customer, Bagger, Refund, Return, and Cancellation all sit together in the Actions row pinned below the product list. */
export function ProductBrowser({
  companyId,
  storeId,
  onAdd,
  customer,
  card,
  onAttachCustomer,
  bagger,
  onSelectBagger,
  cashSession,
  headerExtra,
  cartHasItems,
  onCancel,
  onRefund,
  onReturn,
}: Props) {
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [baggerDialogOpen, setBaggerDialogOpen] = useState(false);
  const [overflowAnchor, setOverflowAnchor] = useState<HTMLElement | null>(null);

  return (
    <>
      <ProductSearch
        companyId={companyId}
        storeId={storeId}
        onAdd={onAdd}
        toolbarExtra={
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexShrink: 0 }}>
            <Tooltip title="More">
              <IconButton
                size="small"
                onClick={(e) => setOverflowAnchor(e.currentTarget)}
                aria-label="More"
                sx={{ border: '1px solid', borderColor: 'divider' }}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {headerExtra}
          </Stack>
        }
        bottomExtra={
          <Stack spacing={1}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', letterSpacing: '0.06em' }}>
              ACTIONS
            </Typography>
            <CartActionsRow
              customer={customer}
              onOpenCustomer={() => setCustomerDialogOpen(true)}
              bagger={bagger}
              onOpenBagger={() => setBaggerDialogOpen(true)}
              cartHasItems={cartHasItems}
              onCancel={onCancel}
              onRefund={onRefund}
              onReturn={onReturn}
            />
          </Stack>
        }
      />

      <Dialog open={customerDialogOpen} onClose={() => setCustomerDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Customer
          <IconButton size="small" onClick={() => setCustomerDialogOpen(false)} aria-label="Close">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <CustomerLoyaltyPanel customer={customer} card={card} onAttach={onAttachCustomer} />
        </DialogContent>
      </Dialog>

      <Dialog open={baggerDialogOpen} onClose={() => setBaggerDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Bagger
          <IconButton size="small" onClick={() => setBaggerDialogOpen(false)} aria-label="Close">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <BaggerPanel storeId={storeId} bagger={bagger} onSelect={onSelectBagger} />
        </DialogContent>
      </Dialog>

      <OverflowMenu anchorEl={overflowAnchor} onClose={() => setOverflowAnchor(null)} cashSession={cashSession} />
    </>
  );
}
