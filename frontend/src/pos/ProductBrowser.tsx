import { useState } from 'react';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
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
  /** True once a transaction is under way — items rung up, OR a customer/bagger attached with none yet. Shows Cancel Sale, which applies to both. See PosScreen's saleStarted. */
  saleStarted: boolean;
  /** The Discount button — one discount chosen for the whole sale, which is the normal workflow (see DiscountDialog). */
  onOpenDiscount: () => void;
  onCancel: () => void;
  onReturn: () => void;
  onReprintReceipt: () => void;
  onVoidItemSearch: () => void;
  /** Forwarded straight through to ProductSearch, which portals its search field and category/view controls into PosHeader. See that component for why the state stays put while only the DOM moves. */
  searchPortalTarget?: HTMLElement | null;
  controlsPortalTarget?: HTMLElement | null;
}

/** Left panel: category/search-driven product browsing. Session-level chrome (store/register context, the account menu) lives in ReceiptPanel's letterhead instead, leaving this panel to do one job. Customer, Bagger, and the cart-state-dependent actions sit in the Actions row pinned below the product list — see CartActionsRow. */
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
  saleStarted,
  onOpenDiscount,
  onCancel,
  onReturn,
  onReprintReceipt,
  onVoidItemSearch,
  searchPortalTarget,
  controlsPortalTarget,
}: Props) {
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [baggerDialogOpen, setBaggerDialogOpen] = useState(false);

  return (
    <>
      {/* Actions pinned under the grid rather than in a rail beside it.
          A rail was tried and reverted: it cost the product grid two of
          its columns permanently — the grid being the panel a cashier
          actually works in — while a bottom strip only costs height on
          something that already scrolls. It also rotated the empty-space
          problem rather than solving it, leaving a tall gap down the
          middle of the column instead of a wide one across the row. */}
      <Stack sx={{ height: '100%', minHeight: 0 }}>
        <Box sx={{ flex: 1, minWidth: 0, minHeight: 0 }}>
          <ProductSearch
            companyId={companyId}
            storeId={storeId}
            onAdd={onAdd}
            searchPortalTarget={searchPortalTarget}
            controlsPortalTarget={controlsPortalTarget}
          />
        </Box>

        {/* A bare layout container — no border, no fill, no shadow. It
            used to be a white card wrapping the whole row, which made
            sense when the buttons inside were flat tinted washes that
            needed a surface to sit on. Now that each one is its own white
            card with an icon disc, the wrapper was a second card drawn
            around six cards — a visible box behind the buttons that
            framed them for no reason and took padding off the grid above.
            No caption either: self-describing buttons don't need a header. */}
        <Box sx={{ flexShrink: 0, mt: 1.25 }}>
          <CartActionsRow
            customer={customer}
            onOpenCustomer={() => setCustomerDialogOpen(true)}
            bagger={bagger}
            onOpenBagger={() => setBaggerDialogOpen(true)}
            cartHasItems={cartHasItems}
            saleStarted={saleStarted}
            onOpenDiscount={onOpenDiscount}
            onCancel={onCancel}
            onReturn={onReturn}
            onReprintReceipt={onReprintReceipt}
            onVoidItemSearch={onVoidItemSearch}
          />
        </Box>
      </Stack>

      <Dialog
        open={customerDialogOpen}
        onClose={() => setCustomerDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        // Same focus-trap race as the Bagger dialog below: Dialog reclaims
        // focus onto the Close button as the open transition finishes, so
        // the customer-number field has to be focused after that, not via
        // its own autoFocus. Worth the trick here because this field is
        // the hardware scanner's target — a cashier scans a loyalty card
        // the instant the dialog appears.
        slotProps={{ transition: { onEntered: () => document.getElementById('customer-number-input')?.focus() } }}
      >
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
        maxWidth="sm"
        fullWidth
        // Dialog's own focus-trap reclaims focus (onto the Close button)
        // right as the open transition finishes, which is exactly when
        // `onEntered` fires — focusing here, after that, is what actually
        // wins. Doing it any earlier (e.g. the field's own `autoFocus`)
        // just gets overridden a moment later.
        //
        // BaggerPanel only renders this filter above FILTER_THRESHOLD
        // baggers; below that there's nothing to type into and the
        // optional chaining makes this a no-op, which is the intended
        // behaviour rather than an oversight.
        slotProps={{ transition: { onEntered: () => document.getElementById('bagger-filter-input')?.focus() } }}
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
