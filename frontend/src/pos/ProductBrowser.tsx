import { useState } from 'react';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import CloseIcon from '@mui/icons-material/Close';
import type { Bagger, Customer, LoyaltyCard, ProductWithStorePrice } from '../api/types';
import { ProductSearch } from './ProductSearch';
import { CustomerLoyaltyPanel } from './CustomerLoyaltyPanel';
import { BaggerPanel } from './BaggerPanel';
import { CartActionsRow } from './CartActionsRow';

interface Props {
  companyId: number;
  storeId: number | null;
  onAdd: (product: ProductWithStorePrice, quantity?: number) => void;
  customer: Customer | null;
  card: LoyaltyCard | null;
  onAttachCustomer: (customer: Customer | null, card: LoyaltyCard | null) => void;
  bagger: Bagger | null;
  onSelectBagger: (bagger: Bagger | null) => void;
  cartHasItems: boolean;
  onCancel: () => void;
  onRefund: () => void;
  onReturn: () => void;
}

/** Left panel: category/search-driven product browsing. Session-level chrome (store/register context, cash movements, the account menu) lives in PosHeader instead, leaving this panel to do one job. Add Customer, Bagger, and the More menu sit in the Actions row pinned below the product list. */
export function ProductBrowser({
  companyId,
  storeId,
  onAdd,
  customer,
  card,
  onAttachCustomer,
  bagger,
  onSelectBagger,
  cartHasItems,
  onCancel,
  onRefund,
  onReturn,
}: Props) {
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [baggerDialogOpen, setBaggerDialogOpen] = useState(false);

  return (
    <>
      <ProductSearch
        companyId={companyId}
        storeId={storeId}
        onAdd={onAdd}
        bottomExtra={
          // A rule instead of an "ACTIONS" caption — three self-describing
          // buttons don't need a header, and dropping it buys back a row
          // of vertical space for the product grid.
          <Stack spacing={1.5} sx={{ pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
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

      <Dialog
        open={baggerDialogOpen}
        onClose={() => setBaggerDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        // Dialog's own focus-trap reclaims focus (onto the Close button)
        // right as the open transition finishes, which is exactly when
        // `onEntered` fires — focusing here, after that, is what actually
        // wins. Doing it any earlier (e.g. the select's own `autoFocus`)
        // just gets overridden a moment later.
        slotProps={{ transition: { onEntered: () => document.getElementById('bagger-select-wrapper')?.querySelector('input')?.focus() } }}
      >
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
    </>
  );
}
