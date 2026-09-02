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
import { formatMoney, TAX_INDICATOR_LABELS } from './format';
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
          {/* BIR-conventional order: VAT Reg TIN, then MIN, then the
              unit's own serial number — right after the business TIN
              above, ahead of any free-text branch note. */}
          {receipt.store.vat_reg_tin && <Typography variant="inherit">VAT REG TIN: {receipt.store.vat_reg_tin}</Typography>}
          {receipt.store.min_no && <Typography variant="inherit">MIN: {receipt.store.min_no}</Typography>}
          {receipt.store.pos_serial_no && <Typography variant="inherit">S/N: {receipt.store.pos_serial_no}</Typography>}
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
              {/* The BIR tax flag, last: on a printed receipt it sits
                  hard against the amount it classifies. Header left blank
                  — "V/E/Z/N" as a column title reads as noise, and the
                  legend under the table explains the letters properly. */}
              <TableCell sx={{ fontWeight: 600, width: 16 }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {receipt.items.map((item, i) => (
              <TableRow key={i}>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.quantity}</TableCell>
                <TableCell>{formatMoney(parseFloat(item.unit_price))}</TableCell>
                <TableCell>{formatMoney(parseFloat(item.line_total))}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{item.tax_indicator}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Only the classifications actually present on this sale — a
            fixed four-letter legend under a receipt whose every line is
            VATable is just wasted paper. */}
        <Box sx={{ fontSize: 10.5, color: 'text.secondary', textAlign: 'center', mb: 1 }}>
          {[...new Set(receipt.items.map((i) => i.tax_indicator))]
            .map((flag) => `${flag} = ${TAX_INDICATOR_LABELS[flag] ?? flag}`)
            .join('   ')}
        </Box>

        <Stack direction="row" sx={{ justifyContent: 'space-between', py: 0.25 }}>
          <span>Subtotal</span>
          <span>{formatMoney(parseFloat(receipt.subtotal))}</span>
        </Stack>
        <Stack direction="row" sx={{ justifyContent: 'space-between', py: 0.25 }}>
          <span>Discount</span>
          <span>-{formatMoney(parseFloat(receipt.discount_total))}</span>
        </Stack>
        {/* Same store-level switch that already hides VAT Reg TIN/MIN/
            Serial No above — frozen onto the sale at checkout, so
            reconfiguring the store afterwards can't change whether an
            already-issued receipt shows this breakdown. The figures
            themselves are always present in `receipt`; this only decides
            whether they're rendered. */}
        {receipt.show_bir_details && (
          <>
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
          </>
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

        {/* The receipt's one free-text slot, deliberately last — everything
            above it is the fixed structured content (header identifiers,
            line items, totals, payment); this is the closing message a
            real receipt ends on. white-space: pre-line so a line break
            entered in Settings renders as two lines here too. */}
        {receipt.footer_note && (
          <Box sx={{ textAlign: 'center', mt: 1.5, pt: 1.5, borderTop: '1px dashed', borderColor: 'divider' }}>
            <Typography variant="inherit" sx={{ whiteSpace: 'pre-line' }}>
              {receipt.footer_note}
            </Typography>
          </Box>
        )}
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
