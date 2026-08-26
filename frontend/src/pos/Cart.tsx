import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import CloseIcon from '@mui/icons-material/Close';
import type { CartLine } from './posTypes';
import { calculateLine } from './posTypes';
import { formatMoney, formatQuantity } from './format';

interface Props {
  lines: CartLine[];
  onQuantityChange: (key: string, quantity: number) => void;
  onDiscountChange: (key: string, discount: number) => void;
  onRemove: (key: string) => void;
}

export function Cart({ lines, onQuantityChange, onDiscountChange, onRemove }: Props) {
  return (
    <Paper
      variant="outlined"
      sx={{ p: 2.25, borderRadius: 1.5, minHeight: 420, display: 'flex', flexDirection: 'column' }}
    >
      <Typography
        variant="overline"
        sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: '0.06em', mb: lines.length === 0 ? 0 : 1.75 }}
      >
        Cart
      </Typography>
      {lines.length === 0 ? (
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            color: 'text.secondary',
            py: 5,
            gap: 0.75,
          }}
        >
          <ShoppingCartOutlinedIcon sx={{ fontSize: 40, opacity: 0.35, mb: 1 }} />
          <Typography variant="body1" color="text.primary" sx={{ fontWeight: 600 }}>
            Cart is empty
          </Typography>
          <Typography variant="body2">Search for a product above to get started</Typography>
        </Box>
      ) : (
        <TableContainer>
          <Table size="small" sx={{ minWidth: 620 }}>
          <TableHead>
            <TableRow>
              <TableCell>Item</TableCell>
              <TableCell>Qty</TableCell>
              <TableCell>Unit Price</TableCell>
              <TableCell>Discount</TableCell>
              <TableCell>Tax</TableCell>
              <TableCell align="right">Line Total</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {lines.map((line) => {
              const totals = calculateLine(line);
              const step = 1 / 10 ** (line.unit?.decimal_places ?? 0);

              return (
                <TableRow key={line.key} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {line.product.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {line.product.sku}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ minWidth: 90 }}>
                    <TextField
                      type="number"
                      slotProps={{ htmlInput: { min: step, step } }}
                      value={line.quantity}
                      onChange={(e) => onQuantityChange(line.key, parseFloat(e.target.value) || 0)}
                      sx={{ width: 80 }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                      {formatQuantity(line.quantity, line.unit?.abbreviation ?? null, line.unit?.decimal_places ?? 0)}
                    </Typography>
                  </TableCell>
                  <TableCell>{formatMoney(line.unitPrice)}</TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                      value={line.discount}
                      onChange={(e) => onDiscountChange(line.key, parseFloat(e.target.value) || 0)}
                      sx={{ width: 90 }}
                    />
                  </TableCell>
                  <TableCell>{formatMoney(totals.tax)}</TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {formatMoney(totals.gross)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Remove">
                      <IconButton size="small" color="error" onClick={() => onRemove(line.key)} aria-label="Remove">
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
}
