import { useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { useColorScheme } from '@mui/material/styles';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import HelpOutlineIcon from '@mui/icons-material/HelpOutlineOutlined';
import type { CashSession } from '../api/types';
import { OverflowMenu } from './OverflowMenu';
import { PosHelpDialog } from './PosHelpDialog';
import logoLight from '../assets/logo.png';
import logoDark from '../assets/logo-dark.png';

interface Props {
  cashSession: CashSession | null;
  /** The account avatar/menu — composed by PosScreen, which owns the ~13 props AccountMenu needs. */
  actions?: ReactNode;
}

/**
 * A single quiet strip over the product column: the brand plus the
 * account/cash-movement controls. Deliberately plain, so nothing here
 * competes with the product grid directly beneath it — the store and
 * terminal a sale lands on are ambient rather than actionable, so they
 * sit in StatusBar with the other at-a-glance state instead.
 */
export function PosHeader({ cashSession, actions }: Props) {
  const { mode, systemMode } = useColorScheme();
  const resolvedMode = mode === 'system' ? systemMode : mode;
  const logo = resolvedMode === 'dark' ? logoDark : logoLight;

  const [overflowAnchor, setOverflowAnchor] = useState<HTMLElement | null>(null);
  // Owned here rather than in PosScreen so the header stays self-contained;
  // F1 reaches it by DOM-clicking the button below, the same way the other
  // shortcuts reach controls whose state isn't lifted.
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <Stack
      direction="row"
      spacing={2}
      sx={{
        alignItems: 'center',
        flexShrink: 0,
        px: { xs: 2, md: 3 },
        py: 1,
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Box component="img" src={logo} alt="Execute IT POS System" sx={{ height: 24, width: 'auto', display: 'block', flexShrink: 0 }} />

      <Box sx={{ flex: 1 }} />

      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexShrink: 0 }}>
        <Tooltip title="Controls & shortcuts (F1)">
          <IconButton
            id="pos-help-button"
            size="small"
            onClick={() => setHelpOpen(true)}
            aria-label="Controls and shortcuts"
            sx={{ color: 'text.secondary' }}
          >
            <HelpOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Cash movements">
          <IconButton
            size="small"
            onClick={(e) => setOverflowAnchor(e.currentTarget)}
            aria-label="Cash movements"
            sx={{ color: 'text.secondary' }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        {actions}
      </Stack>

      <OverflowMenu anchorEl={overflowAnchor} onClose={() => setOverflowAnchor(null)} cashSession={cashSession} />
      <PosHelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
    </Stack>
  );
}
