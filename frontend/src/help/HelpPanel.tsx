import { useMemo, useState, type ReactNode } from 'react';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import HelpOutlineIcon from '@mui/icons-material/HelpOutlineOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CloseIcon from '@mui/icons-material/Close';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import SearchOffOutlinedIcon from '@mui/icons-material/SearchOffOutlined';
import AppsOutlinedIcon from '@mui/icons-material/AppsOutlined';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import PointOfSaleOutlinedIcon from '@mui/icons-material/PointOfSaleOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import ChatBubbleOutlineOutlinedIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import KeyboardOutlinedIcon from '@mui/icons-material/KeyboardOutlined';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import AssignmentReturnOutlinedIcon from '@mui/icons-material/AssignmentReturnOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import { useAuth } from '../auth/AuthContext';
import {
  FAQ_CATEGORIES,
  FAQ_CATEGORY_INFO,
  FAQ_ENTRIES,
  POPULAR_FAQ_IDS,
  canSeeFaq,
  type FaqCategory,
  type FaqEntry,
} from './faqData';

const CATEGORY_ICON: Record<FaqCategory, (size: number) => ReactNode> = {
  Checkout: (s) => <PointOfSaleOutlinedIcon sx={{ fontSize: s }} />,
  'Cash Drawer': (s) => <PaymentsOutlinedIcon sx={{ fontSize: s }} />,
  'Product Lifecycle': (s) => <Inventory2OutlinedIcon sx={{ fontSize: s }} />,
  Dashboard: (s) => <DashboardOutlinedIcon sx={{ fontSize: s }} />,
  Products: (s) => <LocalOfferOutlinedIcon sx={{ fontSize: s }} />,
  Inventory: (s) => <WarehouseOutlinedIcon sx={{ fontSize: s }} />,
  Purchasing: (s) => <LocalShippingOutlinedIcon sx={{ fontSize: s }} />,
  Returns: (s) => <AssignmentReturnOutlinedIcon sx={{ fontSize: s }} />,
  Customers: (s) => <PeopleAltOutlinedIcon sx={{ fontSize: s }} />,
  Reports: (s) => <AssessmentOutlinedIcon sx={{ fontSize: s }} />,
  Printing: (s) => <PrintOutlinedIcon sx={{ fontSize: s }} />,
  'Team & Access': (s) => <GroupOutlinedIcon sx={{ fontSize: s }} />,
  Settings: (s) => <SettingsOutlinedIcon sx={{ fontSize: s }} />,
  Messaging: (s) => <ChatBubbleOutlineOutlinedIcon sx={{ fontSize: s }} />,
};

const tint = (pct: number, color = 'primary') => `color-mix(in srgb, var(--mui-palette-${color}-main) ${pct}%, transparent)`;

/**
 * Position of each entry within a sequential category, taken from the full
 * list rather than whatever a search left visible — "step 6" should still
 * read as step 6 when it's the only lifecycle entry matching a search.
 */
const STEP_NUMBER = new Map<string, number>();
for (const category of FAQ_CATEGORIES) {
  if (!FAQ_CATEGORY_INFO[category].sequential) continue;
  FAQ_ENTRIES.filter((e) => e.category === category).forEach((e, i) => STEP_NUMBER.set(e.id, i + 1));
}

function matches(entry: FaqEntry, q: string): boolean {
  const haystack = [
    entry.question,
    entry.answer,
    entry.category,
    entry.path ?? '',
    entry.tip ?? '',
    entry.warning ?? '',
    ...(entry.steps ?? []),
    ...entry.keywords,
  ];
  return haystack.some((text) => text.toLowerCase().includes(q));
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query ? (
          <Box
            key={i}
            component="mark"
            sx={{ bgcolor: tint(30, 'warning'), color: 'inherit', borderRadius: '3px', px: '1px' }}
          >
            {part}
          </Box>
        ) : (
          part
        )
      )}
    </>
  );
}

function IconTile({ children, size = 34 }: { children: ReactNode; size?: number }) {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: '10px',
        display: 'grid',
        placeItems: 'center',
        bgcolor: tint(12),
        color: 'primary.main',
      }}
    >
      {children}
    </Box>
  );
}

function Callout({ kind, children }: { kind: 'tip' | 'warning'; children: ReactNode }) {
  const color = kind === 'tip' ? 'primary' : 'warning';
  return (
    <Stack
      direction="row"
      spacing={1.25}
      sx={{ p: 1.25, borderRadius: '10px', bgcolor: tint(9, color), alignItems: 'flex-start' }}
    >
      <Box sx={{ color: `${color}.main`, display: 'flex', pt: '1px' }}>
        {kind === 'tip' ? <LightbulbOutlinedIcon sx={{ fontSize: 18 }} /> : <WarningAmberOutlinedIcon sx={{ fontSize: 18 }} />}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, color: `${color}.main`, display: 'block', lineHeight: 1.4 }}>
          {kind === 'tip' ? 'Good to know' : 'Watch out'}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.primary', lineHeight: 1.55 }}>
          {children}
        </Typography>
      </Box>
    </Stack>
  );
}

function FaqItem({
  entry,
  expanded,
  onToggle,
  query,
}: {
  entry: FaqEntry;
  expanded: boolean;
  onToggle: (open: boolean) => void;
  query: string;
}) {
  const step = STEP_NUMBER.get(entry.id);
  return (
    <Accordion
      id={`faq-${entry.id}`}
      disableGutters
      elevation={0}
      expanded={expanded}
      onChange={(_, isOpen) => onToggle(isOpen)}
      sx={{
        '&:before': { display: 'none' },
        border: '1px solid',
        borderColor: expanded ? tint(45) : 'divider',
        borderRadius: '12px !important',
        overflow: 'hidden',
        bgcolor: 'background.paper',
        transition: 'border-color .15s ease',
        '&:hover': { borderColor: tint(35) },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon fontSize="small" />}
        sx={{ px: 1.5, '& .MuiAccordionSummary-content': { minWidth: 0, my: 1.25 } }}
      >
        <Stack direction="row" spacing={1.25} sx={{ minWidth: 0, flex: 1, alignItems: 'flex-start' }}>
          {step !== undefined && (
            <Box
              sx={{
                width: 24,
                height: 24,
                flexShrink: 0,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                fontSize: 12,
                fontWeight: 700,
                bgcolor: expanded ? 'primary.main' : tint(14),
                color: expanded ? 'primary.contrastText' : 'primary.main',
                mt: '1px',
              }}
            >
              {step}
            </Box>
          )}
          {/* minWidth: 0 lets the text wrap inside the narrow drawer instead of overflowing it. */}
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 650, lineHeight: 1.4, wordBreak: 'break-word' }}>
              <Highlight text={entry.question} query={query} />
            </Typography>
            <Typography
              variant="body2"
              sx={{
                mt: 0.25,
                color: 'text.secondary',
                fontSize: 13,
                lineHeight: 1.5,
                ...(expanded
                  ? {}
                  : { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }),
              }}
            >
              <Highlight text={entry.answer} query={query} />
            </Typography>
          </Box>
        </Stack>
      </AccordionSummary>

      <AccordionDetails sx={{ px: 1.5, pt: 0, pb: 1.75 }}>
        <Stack spacing={1.5} sx={{ pl: step !== undefined ? 4.5 : 0 }}>
          {entry.path && (
            <Stack
              direction="row"
              spacing={0.75}
              sx={{
                alignItems: 'flex-start',
                alignSelf: 'flex-start',
                px: 1,
                py: 0.5,
                borderRadius: '8px',
                bgcolor: 'action.hover',
                color: 'text.secondary',
              }}
            >
              <PlaceOutlinedIcon sx={{ fontSize: 16, mt: '2px' }} />
              <Typography variant="caption" sx={{ fontWeight: 600, lineHeight: 1.6 }}>
                {entry.path}
              </Typography>
            </Stack>
          )}

          {entry.steps && entry.steps.length > 0 && (
            <Stack component="ol" spacing={1} sx={{ m: 0, p: 0, listStyle: 'none' }}>
              {entry.steps.map((text, i) => (
                <Stack component="li" key={i} direction="row" spacing={1.25} sx={{ alignItems: 'flex-start' }}>
                  <Box
                    sx={{
                      width: 20,
                      height: 20,
                      flexShrink: 0,
                      borderRadius: '50%',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: 11,
                      fontWeight: 700,
                      border: '1.5px solid',
                      borderColor: tint(50),
                      color: 'primary.main',
                      mt: '1px',
                    }}
                  >
                    {i + 1}
                  </Box>
                  <Typography variant="body2" sx={{ lineHeight: 1.55, minWidth: 0 }}>
                    <Highlight text={text} query={query} />
                  </Typography>
                </Stack>
              ))}
            </Stack>
          )}

          {entry.tip && <Callout kind="tip">{entry.tip}</Callout>}
          {entry.warning && <Callout kind="warning">{entry.warning}</Callout>}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}

type Filter = 'all' | FaqCategory;

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
export function HelpPanel({ iconColor = '#fff', context }: { iconColor?: string; context?: FaqCategory }) {
  const { user, hasPermission } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  // True while the topic is the one the panel opened on for this page, not
  // one the user picked — a search then looks everywhere, since someone
  // typing a question rarely means "only on this page".
  const [contextual, setContextual] = useState(false);
  // null = nothing chosen yet (a lone search result may auto-open);
  // '' = the user closed something on purpose, so nothing auto-opens.
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const q = query.trim().toLowerCase();
  const firstName = user?.name?.trim().split(/\s+/)[0];

  // Only answers about screens this user can actually open.
  const entries = useMemo(() => FAQ_ENTRIES.filter((e) => canSeeFaq(e, hasPermission)), [hasPermission]);
  const categories = useMemo(() => FAQ_CATEGORIES.filter((c) => entries.some((e) => e.category === c)), [entries]);

  const filtered = useMemo(
    () => entries.filter((e) => (filter === 'all' || e.category === filter) && (!q || matches(e, q))),
    [entries, filter, q]
  );

  const counts = useMemo(() => {
    const result = {} as Record<FaqCategory, number>;
    for (const c of categories) result[c] = entries.filter((e) => e.category === c && (!q || matches(e, q))).length;
    return result;
  }, [entries, categories, q]);
  const totalMatches = categories.reduce((sum, c) => sum + counts[c], 0);

  const groups = categories.map((c) => ({ category: c, items: filtered.filter((e) => e.category === c) })).filter(
    (g) => g.items.length > 0
  );

  const showPopular = !q && filter === 'all';
  const popular = POPULAR_FAQ_IDS.map((id) => entries.find((e) => e.id === id)).filter((e): e is FaqEntry => !!e);
  const autoOpenId = q && filtered.length === 1 ? filtered[0].id : null;

  function isExpanded(id: string) {
    return expandedId === id || (expandedId === null && autoOpenId === id);
  }

  function updateQuery(value: string) {
    setQuery(value);
    setExpandedId(null);
    if (contextual && value.trim()) {
      setFilter('all');
      setContextual(false);
    }
  }

  function pickFilter(next: Filter) {
    setFilter(next);
    setContextual(false);
  }

  function openPanel() {
    const start = context && categories.includes(context) ? context : null;
    setFilter(start ?? 'all');
    setContextual(!!start);
    setOpen(true);
  }

  function openTopic(entry: FaqEntry) {
    setExpandedId(entry.id);
    requestAnimationFrame(() =>
      document.getElementById(`faq-${entry.id}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    );
  }

  function closePanel() {
    setOpen(false);
    setQuery('');
    setFilter('all');
    setExpandedId(null);
  }

  return (
    <>
      <Tooltip title="Help Center">
        <IconButton size="small" onClick={openPanel} sx={{ color: iconColor }} aria-label="Help Center">
          <HelpOutlineIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Drawer
        anchor="right"
        open={open}
        onClose={closePanel}
        slotProps={{ paper: { sx: { width: { xs: '100%', sm: 560, lg: 640 }, maxWidth: '100%', bgcolor: 'background.default' } } }}
      >
        <Stack sx={{ height: '100%' }}>
          {/* ── Header ───────────────────────────────────────────────── */}
          <Box
            sx={{
              px: 2.25,
              pt: 2,
              pb: 1.75,
              flexShrink: 0,
              background: `linear-gradient(160deg, ${tint(16)} 0%, ${tint(4)} 70%, transparent 100%)`,
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
                <HeaderBadge />
                <Box>
                  <Typography sx={{ fontWeight: 800, fontSize: 18, lineHeight: 1.2, letterSpacing: '-0.01em' }}>
                    Help Center
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {entries.length} answers, step by step
                  </Typography>
                </Box>
              </Stack>
              <IconButton size="small" onClick={closePanel} aria-label="Close">
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>

            <Typography sx={{ mt: 2, mb: 1.25, fontWeight: 600, fontSize: 15 }}>
              {firstName ? `Hi ${firstName}, what can we help you with?` : 'What can we help you with?'}
            </Typography>

            <TextField
              id="help-center-search"
              fullWidth
              size="small"
              autoFocus
              placeholder='Try "void", "discount" or "stock"'
              value={query}
              onChange={(e) => updateQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape' && query) {
                  e.stopPropagation();
                  updateQuery('');
                }
              }}
              sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'background.paper', borderRadius: '12px', height: 44 } }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                  endAdornment: query ? (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => updateQuery('')} aria-label="Clear search" edge="end">
                        <CloseIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </InputAdornment>
                  ) : undefined,
                },
              }}
            />
          </Box>

          {/* ── Topic chips ─────────────────────────────────────────── */}
          {/* Wraps onto a second line rather than scrolling sideways, so every
              topic stays visible without the user having to discover a hidden scroll. */}
          <Stack
            direction="row"
            useFlexGap
            spacing={0.75}
            sx={{
              px: 2.25,
              py: 1.25,
              flexShrink: 0,
              flexWrap: 'wrap',
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Chip
              icon={<AppsOutlinedIcon sx={{ fontSize: 16 }} />}
              label={q ? `All · ${totalMatches}` : 'All topics'}
              onClick={() => pickFilter('all')}
              color={filter === 'all' ? 'primary' : 'default'}
              variant={filter === 'all' ? 'filled' : 'outlined'}
              sx={{ fontWeight: 600, flexShrink: 0 }}
            />
            {categories.map((c) => {
              const selected = filter === c;
              return (
                <Chip
                  key={c}
                  icon={<Box sx={{ display: 'flex', pl: 0.5 }}>{CATEGORY_ICON[c](16)}</Box>}
                  label={`${c} · ${counts[c]}`}
                  onClick={() => pickFilter(selected ? 'all' : c)}
                  color={selected ? 'primary' : 'default'}
                  variant={selected ? 'filled' : 'outlined'}
                  sx={{
                    fontWeight: 600,
                    flexShrink: 0,
                    opacity: counts[c] === 0 && !selected ? 0.45 : 1,
                    '& .MuiChip-icon': { color: 'inherit' },
                  }}
                />
              );
            })}
          </Stack>

          {/* ── Body ────────────────────────────────────────────────── */}
          <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 2.25, py: 2 }}>
            {filtered.length === 0 ? (
              <Stack sx={{ alignItems: 'center', textAlign: 'center', py: 5, px: 2 }} spacing={1.25}>
                <IconTile size={52}>
                  <SearchOffOutlinedIcon sx={{ fontSize: 26 }} />
                </IconTile>
                <Typography sx={{ fontWeight: 700 }}>No answers for "{query.trim()}"</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 280 }}>
                  {filter !== 'all' && totalMatches > 0
                    ? `There are ${totalMatches} matches in other topics.`
                    : 'Try a shorter word, like "price" instead of "pricing a product".'}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ pt: 0.5 }}>
                  {filter !== 'all' && totalMatches > 0 && (
                    <Button size="small" variant="contained" onClick={() => pickFilter('all')}>
                      Show all topics
                    </Button>
                  )}
                  <Button size="small" onClick={() => updateQuery('')}>
                    Clear search
                  </Button>
                </Stack>
              </Stack>
            ) : (
              <Stack spacing={3}>
                {contextual && filter !== 'all' && (
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: 'center', justifyContent: 'space-between', p: 1.25, pl: 1.5, borderRadius: '12px', bgcolor: tint(8) }}
                  >
                    <Typography variant="body2" sx={{ minWidth: 0 }}>
                      Showing help for <b>{filter}</b>, the page you are on.
                    </Typography>
                    <Button size="small" onClick={() => pickFilter('all')} sx={{ flexShrink: 0 }}>
                      See all topics
                    </Button>
                  </Stack>
                )}
                {showPopular && (
                  <Box>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.25 }}>
                      <AutoAwesomeOutlinedIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                      <Typography sx={{ fontWeight: 700, fontSize: 14 }}>Most asked</Typography>
                    </Stack>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
                      {popular.map((entry) => (
                        <ButtonBase
                          key={entry.id}
                          onClick={() => openTopic(entry)}
                          sx={{
                            justifyContent: 'flex-start',
                            textAlign: 'left',
                            gap: 1,
                            p: 1.25,
                            borderRadius: '12px',
                            border: '1px solid',
                            borderColor: 'divider',
                            bgcolor: 'background.paper',
                            transition: 'border-color .15s ease, transform .15s ease',
                            '&:hover': { borderColor: tint(45), transform: 'translateY(-1px)' },
                            '&.Mui-focusVisible': { borderColor: 'primary.main' },
                          }}
                        >
                          <IconTile size={30}>{CATEGORY_ICON[entry.category](17)}</IconTile>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13, lineHeight: 1.35, minWidth: 0 }}>
                            {entry.question}
                          </Typography>
                        </ButtonBase>
                      ))}
                    </Box>
                  </Box>
                )}

                {groups.map(({ category, items }) => {
                  const info = FAQ_CATEGORY_INFO[category];
                  return (
                    <Box key={category}>
                      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 1.25 }}>
                        <IconTile>{CATEGORY_ICON[category](19)}</IconTile>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>{category}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3, display: 'block' }}>
                            {info.sequential ? `${info.blurb} · follow the steps in order` : info.blurb}
                          </Typography>
                        </Box>
                      </Stack>
                      <Stack spacing={1}>
                        {items.map((entry) => (
                          <FaqItem
                            key={entry.id}
                            entry={entry}
                            query={q}
                            expanded={isExpanded(entry.id)}
                            onToggle={(isOpen) => setExpandedId(isOpen ? entry.id : '')}
                          />
                        ))}
                      </Stack>
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Box>

          {/* ── Footer ──────────────────────────────────────────────── */}
          <Stack
            direction="row"
            spacing={1}
            sx={{
              px: 2.25,
              py: 1.25,
              flexShrink: 0,
              alignItems: 'center',
              borderTop: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              color: 'text.secondary',
            }}
          >
            <KeyboardOutlinedIcon sx={{ fontSize: 18 }} />
            <Typography variant="caption" sx={{ lineHeight: 1.4 }}>
              At the register, press <b>F1</b> for every keyboard shortcut.
            </Typography>
          </Stack>
        </Stack>
      </Drawer>
    </>
  );
}

function HeaderBadge() {
  return (
    <Box
      sx={{
        width: 40,
        height: 40,
        borderRadius: '12px',
        display: 'grid',
        placeItems: 'center',
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
        boxShadow: `0 6px 16px ${tint(35)}`,
      }}
    >
      <HelpOutlineIcon sx={{ fontSize: 22 }} />
    </Box>
  );
}
