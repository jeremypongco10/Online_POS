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

const GRID_COLUMNS = 'minmax(0, 1fr) auto auto auto auto';

export function Cart({ lines, onQuantityChange, onDiscountChange, onRemove }: Props) {
  if (lines.length === 0) {
    return (
      <Box
        sx={{
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
          pb: 1,
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
          ITEM
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
          QTY
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textAlign: 'right' }}>
          PRICE
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textAlign: 'right' }}>
          AMOUNT
        </Typography>
        <Box sx={{ width: 26 }} />
      </Box>

      <Stack spacing={1.5}>
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
    <Box sx={{ display: 'grid', gridTemplateColumns: GRID_COLUMNS, gap: 1.5, alignItems: 'center' }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }} noWrap title={line.product.name}>
          {line.product.name}
        </Typography>
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
          {/* Unit price already has its own PRICE column — showing it again here duplicated it right next to the discount tag. */}
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

      <Typography variant="caption" sx={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
        {formatMoney(line.unitPrice)}
      </Typography>

      <Typography variant="caption" sx={{ fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap' }}>
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
