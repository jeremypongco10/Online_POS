import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Button from '@mui/material/Button';
import PrintIcon from '@mui/icons-material/Print';
import type { PaymentMethodOption, Receipt } from '../api/types';
import { formatMoney } from './format';
import { PopTransition } from '../PopTransition';
import { METHOD_LABELS } from './PaymentPanel';

/** Phase 18: the printable receipt — every field sourced from the sale's own frozen snapshot. */
export function ReceiptModal({ receipt, methods, onClose }: { receipt: Receipt; methods: PaymentMethodOption[]; onClose: () => void }) {
  const methodLabel = (code: string) => methods.find((m) => m.code === code)?.name ?? METHOD_LABELS[code] ?? code;
  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth slots={{ transition: PopTransition }}>
      {/* `receipt-card` retained only as the hook for pos.css's @media print rules */}
      <DialogContent className="receipt-card" sx={{ fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 12.5 }}>
        <Box sx={{ textAlign: 'center', mb: 1.5, pb: 1.5, borderBottom: '1px dashed', borderColor: 'divider' }}>
          <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{receipt.company.name}</Typography>
          {receipt.company.tin && <Typography variant="inherit">TIN: {receipt.company.tin}</Typography>}
          <Typography variant="inherit">{receipt.store.name}</Typography>
          {receipt.store.address && <Typography variant="inherit">{receipt.store.address}</Typography>}
        </Box>

        <Stack spacing={0.25} sx={{ mb: 1.5, pb: 1.5, borderBottom: '1px dashed', borderColor: 'divider' }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
            <span>Invoice #</span>
            <span>{receipt.invoice_number}</span>
          </Stack>
          <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
            <span>Date</span>
            <span>{receipt.date}</span>
          </Stack>
          <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
            <span>Cashier</span>
            <span>{receipt.cashier ?? '—'}</span>
          </Stack>
          {receipt.bagger && (
            <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
              <span>Bagger</span>
              <span>{receipt.bagger}</span>
            </Stack>
          )}
          {receipt.customer && (
            <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
              <span>Customer</span>
              <span>{receipt.customer}</span>
            </Stack>
          )}
          {receipt.loyalty_card_number && (
            <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
              <span>Loyalty Card</span>
              <span>{receipt.loyalty_card_number}</span>
            </Stack>
          )}
        </Stack>

        <Table
          size="small"
          sx={{
            mb: 1.5,
            '& th, & td': { fontSize: 12.5, fontFamily: 'inherit', padding: '3px 0', border: 'none' },
            '& th:not(:first-of-type), & td:not(:first-of-type)': { textAlign: 'right' },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Item</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Qty</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Price</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Total</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {receipt.items.map((item, i) => (
              <TableRow key={i}>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.quantity}</TableCell>
                <TableCell>{formatMoney(parseFloat(item.unit_price))}</TableCell>
                <TableCell>{formatMoney(parseFloat(item.line_total))}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Stack direction="row" sx={{ justifyContent: 'space-between', py: 0.25 }}>
          <span>Subtotal</span>
          <span>{formatMoney(parseFloat(receipt.subtotal))}</span>
        </Stack>
        <Stack direction="row" sx={{ justifyContent: 'space-between', py: 0.25 }}>
          <span>Discount</span>
          <span>-{formatMoney(parseFloat(receipt.discount_total))}</span>
        </Stack>
        {receipt.vat_amount > 0 && (
          <Stack direction="row" sx={{ justifyContent: 'space-between', py: 0.25 }}>
            <span>VAT</span>
            <span>{formatMoney(receipt.vat_amount)}</span>
          </Stack>
        )}
        {receipt.vat_exempt_amount > 0 && (
          <Stack direction="row" sx={{ justifyContent: 'space-between', py: 0.25 }}>
            <span>VAT Exempt</span>
            <span>{formatMoney(receipt.vat_exempt_amount)}</span>
          </Stack>
        )}
        {receipt.zero_rated_amount > 0 && (
          <Stack direction="row" sx={{ justifyContent: 'space-between', py: 0.25 }}>
            <span>Zero Rated</span>
            <span>{formatMoney(receipt.zero_rated_amount)}</span>
          </Stack>
        )}
        <Divider sx={{ my: 1 }} />
        <Stack direction="row" sx={{ justifyContent: 'space-between', fontWeight: 700, fontSize: 14 }}>
          <span>TOTAL</span>
          <span>{formatMoney(parseFloat(receipt.total))}</span>
        </Stack>

        <Stack spacing={0.25} sx={{ mt: 1, pt: 1, borderTop: '1px dashed', borderColor: 'divider' }}>
          {receipt.payments.map((p, i) => (
            <Stack direction="row" sx={{ justifyContent: 'space-between' }} key={i}>
              <span>{methodLabel(p.method)}</span>
              <span>{formatMoney(parseFloat(p.amount))}</span>
            </Stack>
          ))}
        </Stack>
        <Stack direction="row" sx={{ justifyContent: 'space-between', py: 0.25 }}>
          <span>Change</span>
          <span>{formatMoney(parseFloat(receipt.change_due))}</span>
        </Stack>
      </DialogContent>

      <DialogActions className="modal-actions" sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" startIcon={<PrintIcon />} onClick={() => window.print()}>
          Print
        </Button>
      </DialogActions>
    </Dialog>
  );
}
