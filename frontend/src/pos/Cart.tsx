import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Popover from '@mui/material/Popover';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import CloseIcon from '@mui/icons-material/Close';
import RemoveIcon from '@mui/icons-material/Remove';
import AddIcon from '@mui/icons-material/Add';
import SellOutlinedIcon from '@mui/icons-material/SellOutlined';
import type { CartLine } from './posTypes';
import { calculateLine } from './posTypes';
import { formatMoney, formatQuantity, POS_ACCENT } from './format';

interface Props {
  lines: CartLine[];
  onQuantityChange: (key: string, quantity: number) => void;
  onDiscountChange: (key: string, discount: number) => void;
  onRemove: (key: string) => void;
}

const GRID_COLUMNS = 'minmax(0, 1fr) auto auto auto';

export function Cart({ lines, onQuantityChange, onDiscountChange, onRemove }: Props) {
  if (lines.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          textAlign: 'center',
          color: 'text.secondary',
          pt: 3,
          pb: 5,
          gap: 0.75,
        }}
      >
        <ShoppingCartOutlinedIcon sx={{ fontSize: 40, opacity: 0.35, mb: 1 }} />
        <Typography variant="body1" color="text.primary" sx={{ fontWeight: 600 }}>
          Cart is empty
        </Typography>
        <Typography variant="body2">Add a product to get started</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: GRID_COLUMNS,
          gap: 1.5,
          alignItems: 'center',
          pb: 0.75,
          borderBottom: '2px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', letterSpacing: '0.06em' }}>
          ITEM
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', letterSpacing: '0.06em' }}>
          QTY
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', letterSpacing: '0.06em', textAlign: 'right' }}>
          AMOUNT
        </Typography>
        <Box sx={{ width: 26 }} />
      </Box>

      <Stack>
        {lines.map((line) => (
          <CartRow key={line.key} line={line} onQuantityChange={onQuantityChange} onDiscountChange={onDiscountChange} onRemove={onRemove} />
        ))}
      </Stack>
    </Box>
  );
}

function CartRow({
  line,
  onQuantityChange,
  onDiscountChange,
  onRemove,
}: {
  line: CartLine;
  onQuantityChange: (key: string, quantity: number) => void;
  onDiscountChange: (key: string, discount: number) => void;
  onRemove: (key: string) => void;
}) {
  const totals = calculateLine(line);
  const step = 1 / 10 ** (line.unit?.decimal_places ?? 0);
  const [discountAnchor, setDiscountAnchor] = useState<HTMLElement | null>(null);
  const [discountText, setDiscountText] = useState(String(line.discount || ''));

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: GRID_COLUMNS,
        gap: 1.5,
        alignItems: 'center',
        // Padded, separated rows (rather than free-floating ones) give a
        // long cart a scannable rhythm and a hover target that lines up
        // with the row's own remove button.
        py: 1,
        borderBottom: '1px solid',
        borderColor: 'divider',
        transition: 'background-color 0.12s ease',
        '&:hover': { bgcolor: 'action.hover' },
        '&:last-of-type': { borderBottom: 'none' },
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }} noWrap title={line.product.name}>
          {line.product.name}
        </Typography>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
            {formatMoney(line.unitPrice)}
          </Typography>
          <Tooltip title={line.discount > 0 ? `Discount: -${formatMoney(line.discount)}` : 'Add discount'}>
            <Box
              component="button"
              type="button"
              onClick={(e) => setDiscountAnchor(e.currentTarget)}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.25,
                border: 'none',
                background: 'none',
                p: 0,
                cursor: 'pointer',
                color: line.discount > 0 ? 'success.main' : 'text.secondary',
                '&:hover': { color: 'success.main' },
              }}
            >
              <SellOutlinedIcon sx={{ fontSize: 11 }} />
              {line.discount > 0 && (
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 11 }}>
                  -{formatMoney(line.discount)}
                </Typography>
              )}
            </Box>
          </Tooltip>
        </Stack>
      </Box>

      <Popover
        open={Boolean(discountAnchor)}
        anchorEl={discountAnchor}
        onClose={() => setDiscountAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Stack direction="row" spacing={1} sx={{ p: 1.5, alignItems: 'center' }}>
          <TextField
            label="Discount"
            type="number"
            size="small"
            autoFocus
            slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
            value={discountText}
            onChange={(e) => setDiscountText(e.target.value)}
            sx={{ width: 120 }}
          />
          <Button
            size="small"
            variant="contained"
            onClick={() => {
              onDiscountChange(line.key, parseFloat(discountText) || 0);
              setDiscountAnchor(null);
            }}
          >
            Apply
          </Button>
        </Stack>
      </Popover>

      <Stack direction="row" spacing={0.25} sx={{ alignItems: 'center', bgcolor: 'action.hover', borderRadius: 999, p: 0.25 }}>
        <IconButton
          onClick={() => onQuantityChange(line.key, Math.max(0, Math.round((line.quantity - step) * 1e6) / 1e6))}
          aria-label="Decrease quantity"
          sx={{ width: 26, height: 26, bgcolor: 'background.paper', '&:hover': { bgcolor: 'background.paper', color: POS_ACCENT } }}
        >
          <RemoveIcon sx={{ fontSize: 14 }} />
        </IconButton>
        <Typography variant="caption" sx={{ minWidth: 26, textAlign: 'center', fontWeight: 700 }}>
          {formatQuantity(line.quantity, line.unit?.abbreviation ?? null, line.unit?.decimal_places ?? 0)}
        </Typography>
        <IconButton
          onClick={() => onQuantityChange(line.key, Math.round((line.quantity + step) * 1e6) / 1e6)}
          aria-label="Increase quantity"
          sx={{ width: 26, height: 26, bgcolor: 'background.paper', '&:hover': { bgcolor: 'background.paper', color: POS_ACCENT } }}
        >
          <AddIcon sx={{ fontSize: 14 }} />
        </IconButton>
      </Stack>

      <Typography variant="caption" sx={{ fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
        {formatMoney(totals.gross)}
      </Typography>

      <Tooltip title="Remove">
        <IconButton
          onClick={() => onRemove(line.key)}
          aria-label="Remove"
          sx={{
            width: 26,
            height: 26,
            color: 'text.secondary',
            '&:hover': { color: 'error.main', backgroundColor: (t) => `color-mix(in srgb, ${t.palette.error.main} 12%, transparent)` },
          }}
        >
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
