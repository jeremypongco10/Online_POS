import { useMemo, useState } from 'react';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import HelpOutlineIcon from '@mui/icons-material/HelpOutlineOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CloseIcon from '@mui/icons-material/Close';
import { FAQ_ENTRIES } from './faqData';

/**
 * A static "how do I...?" reference — a searchable list of hand-written
 * answers, no AI call and no backend (FAQ_ENTRIES is a plain array baked
 * into the bundle). Shown to everyone, cashiers included, unlike
 * ChatPanel which is Back Office only — see AdminLayout.tsx and
 * PosScreen.tsx for the two places this is mounted.
 *
 * Deliberately a different icon/label from pos/CartActionsRow.tsx's own
 * "Help" (F1) button, which opens PosHelpDialog — a keyboard-shortcuts and
 * barcode-scanning cheatsheet, not a "how do I..." reference. The two
 * answer different questions, so they stay as separate entry points
 * rather than one icon trying to cover both.
 */
export function HelpPanel({ iconColor = '#fff' }: { iconColor?: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FAQ_ENTRIES;
    return FAQ_ENTRIES.filter(
      (e) =>
        e.question.toLowerCase().includes(q) ||
        e.answer.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.keywords.some((k) => k.toLowerCase().includes(q))
    );
  }, [query]);

  function closePanel() {
    setOpen(false);
    setQuery('');
    setExpandedId(null);
  }

  return (
    <>
      <Tooltip title="Help Center">
        <IconButton size="small" onClick={() => setOpen(true)} sx={{ color: iconColor }} aria-label="Help Center">
          <HelpOutlineIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Drawer anchor="right" open={open} onClose={closePanel} slotProps={{ paper: { sx: { width: { xs: '100%', sm: 380 } } } }}>
        <Stack sx={{ height: '100%' }}>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Help Center
            </Typography>
            <IconButton size="small" onClick={closePanel} aria-label="Close">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>

          <Box sx={{ px: 2, pt: 1.5, pb: 1 }}>
            <TextField
              fullWidth
              size="small"
              autoFocus
              placeholder='Search, e.g. "void", "discount", "password"'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </Box>

          <Stack sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 2, pb: 2 }} spacing={1}>
            {filtered.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No topics match &quot;{query.trim()}&quot;.
              </Typography>
            ) : (
              filtered.map((entry) => (
                <Accordion
                  key={entry.id}
                  disableGutters
                  expanded={expandedId === entry.id}
                  onChange={(_, isExpanded) => setExpandedId(isExpanded ? entry.id : null)}
                  sx={{ '&:before': { display: 'none' }, border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon fontSize="small" />} sx={{ '& .MuiAccordionSummary-content': { minWidth: 0 } }}>
                    {/* minWidth: 0 overrides a flex child's default auto
                        min-width — without it, once the drawer is narrow
                        enough to actually need to shrink this column, the
                        question text refuses to wrap and instead overflows
                        past the Accordion's own overflow:hidden, reading
                        as silently truncated. */}
                    <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
                      <Chip label={entry.category} size="small" sx={{ alignSelf: 'flex-start', height: 20, fontSize: 11 }} />
                      <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-word' }}>
                        {entry.question}
                      </Typography>
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                      {entry.answer}
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              ))
            )}
          </Stack>
        </Stack>
      </Drawer>
    </>
  );
}
