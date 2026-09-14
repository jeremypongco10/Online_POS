import { useRef, useState, type ReactNode, type SyntheticEvent, type UIEvent } from 'react';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import Paper from '@mui/material/Paper';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Fab from '@mui/material/Fab';
import Zoom from '@mui/material/Zoom';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import PersonIcon from '@mui/icons-material/Person';
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import { useAuth } from '../auth/AuthContext';
import { canAccessPos } from '../auth/posAccess';
import { ThemeToggle } from '../ThemeToggle';
import { ChangePasswordModal } from '../ChangePasswordModal';
import { IconBox, IconCash, IconChart, IconClipboard, IconLayers, IconSettings, IconShield, IconTruck, IconUsers } from './icons';
import logoDark from '../assets/logo-dark.png';

export type AdminSection = 'dashboard' | 'products' | 'inventory' | 'purchasing' | 'customers' | 'cash' | 'team' | 'reports' | 'settings';

interface NavItem {
  section: AdminSection;
  label: string;
  /** One-line summary shown under the page title in the content header. */
  description: string;
  /** Visible if the user holds any one of these — matches the OR across the group's sub-screens. */
  permissions: string[];
  icon: (props: { className?: string }) => ReactNode;
}

export const ADMIN_NAV_PERMISSIONS = [
  'dashboard.view',
  'reports.view',
  'products.view',
  'categories.view',
  'inventory.view',
  'customers.view',
  'suppliers.view',
  'purchases.view',
  'returns.view',
  'cash-sessions.view',
  'readings.view',
  'users.view',
  'roles.view',
  'stores.view',
  'registers.view',
  'taxes.view',
  'units.view',
];

const NAV_ITEMS: NavItem[] = [
  {
    section: 'dashboard',
    label: 'Dashboard',
    description: "Overview of today's sales, inventory alerts, and store performance.",
    permissions: ['dashboard.view'],
    icon: IconChart,
  },
  {
    section: 'products',
    label: 'Products',
    description: 'Manage products, categories, and pricing across your stores.',
    permissions: ['products.view', 'categories.view'],
    icon: IconBox,
  },
  {
    section: 'inventory',
    label: 'Inventory',
    description: 'Track stock levels, adjustments, and transfers between stores.',
    permissions: ['inventory.view'],
    icon: IconLayers,
  },
  {
    section: 'purchasing',
    label: 'Purchasing',
    description: 'Manage suppliers and purchase orders.',
    permissions: ['suppliers.view', 'purchases.view'],
    icon: IconTruck,
  },
  {
    section: 'customers',
    label: 'Customers',
    description: 'Manage customer records, loyalty, and returns.',
    permissions: ['customers.view', 'returns.view'],
    icon: IconUsers,
  },
  {
    section: 'cash',
    label: 'Cash Drawers',
    description: "Reconcile register sessions, and take the X and Z readings that close a terminal's day.",
    permissions: ['cash-sessions.view', 'readings.view'],
    icon: IconCash,
  },
  {
    section: 'team',
    label: 'Team',
    description: 'Manage users, roles, and permissions for your company.',
    permissions: ['users.view', 'roles.view'],
    icon: IconShield,
  },
  {
    section: 'reports',
    label: 'Reports',
    description: 'Sales and inventory reports across your business.',
    permissions: ['reports.view'],
    icon: IconClipboard,
  },
  {
    section: 'settings',
    label: 'Settings',
    description: 'Your branches and terminals, how sales are charged and numbered, and how the register behaves.',
    // Settings bundles several sub-tabs (Stores/Registers/Payment Methods/
    // Taxes/Units) — the nav entry itself needs to show up for any one of
    // them, not just stores.view, or a role granted only e.g.
    // registers.view has no way to reach the tab it was actually given
    // permission for.
    permissions: ['stores.view', 'registers.view', 'payment-methods.view', 'invoice-series.view', 'taxes.view', 'units.view'],
    icon: IconSettings,
  },
];

// Purely a visual grouping for the sidebar — sections themselves are flat,
// this just clusters related ones under a small label the way most modern
// admin dashboards do instead of one long undifferentiated list.
const NAV_GROUPS: { label: string; sections: AdminSection[] }[] = [
  { label: 'Overview', sections: ['dashboard'] },
  { label: 'Reports', sections: ['reports'] },
  { label: 'Operations', sections: ['products', 'inventory', 'purchasing', 'customers', 'cash'] },
  { label: 'Administration', sections: ['team', 'settings'] },
];

/**
 * Flattened in the order the groups themselves are declared, so the top
 * bar reads Dashboard → Reports → Operations → Administration, matching
 * the order these sections sat in when this was a sidebar. The groups
 * are still used as headings in the mobile drawer, where a vertical list
 * has room for them; a horizontal bar does not, so up here the grouping
 * survives only as the ordering.
 */
const NAV_ORDER: AdminSection[] = NAV_GROUPS.flatMap((group) => group.sections);

interface Props {
  section: AdminSection;
  onSectionChange: (section: AdminSection) => void;
  onBackToPos: () => void;
  children: ReactNode;
}

export function AdminLayout({ section, onSectionChange, onBackToPos, children }: Props) {
  const { user, logout, hasPermission } = useAuth();
  const theme = useTheme();
  // Always the light-on-dark mark. This bar is a fixed navy regardless of
  // the app's own light/dark setting (same reasoning as ReceiptPanel
  // forcing its own light scheme in the POS), so there's no second variant
  // to swap to — the theme-aware pick Login.tsx makes would only ever
  // resolve to this file here.
  const logo = logoDark;
  // Nine sections don't fit across a phone, so below `md` the bar keeps
  // only the brand and the account controls, and the sections move into a
  // drawer behind a hamburger — the same overlay the sidebar used to
  // become at this width.
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [profileMenuAnchor, setProfileMenuAnchor] = useState<HTMLElement | null>(null);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const visibleSections = new Set(NAV_ITEMS.filter((item) => item.permissions.some((p) => hasPermission(p))).map((i) => i.section));
  const itemsBySection = new Map(NAV_ITEMS.map((item) => [item.section, item]));
  const visibleNav = NAV_ORDER.map((s) => itemsBySection.get(s)!).filter((item) => visibleSections.has(item.section));

  // The page itself doesn't scroll — this pane does (see the height:100svh
  // + overflow:hidden shell below) — so "scrolled down" has to be read off
  // this element's own scrollTop, not window.scrollY.
  const contentRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  function handleContentScroll(e: UIEvent<HTMLDivElement>) {
    setShowScrollTop(e.currentTarget.scrollTop > 400);
  }

  function scrollContentToTop() {
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function selectSection(next: AdminSection) {
    onSectionChange(next);
    setMobileNavOpen(false);
    // A section change replaces the whole pane's contents, so arriving
    // mid-scroll because the previous screen was scrolled down reads as a
    // rendering fault. The sidebar never needed this; the bar does, since
    // it now sits above the pane and a carried-over scroll position hides
    // the very tab that was just clicked.
    contentRef.current?.scrollTo({ top: 0 });
  }

  const currentLabel = itemsBySection.get(section)?.label ?? 'Back Office';
  const currentDescription = itemsBySection.get(section)?.description;
  const CurrentIcon = itemsBySection.get(section)?.icon;

  {/* The mark on its own, with no "Back Office" label beside it. The
      logo already carries the wordmark, and on a bar this full the label
      was one more thing competing for the width the sections need — the
      page title underneath names the screen anyway. Fixed height with
      width auto keeps the logo's own aspect ratio; object-fit alone
      wouldn't, since the element sizing has to preserve it first. */}
  const brand = (
    <Box
      component="img"
      src={logo}
      alt="Execute IT"
      sx={{ height: { xs: 22, md: 26 }, width: 'auto', display: 'block', flexShrink: 0 }}
    />
  );

  return (
    // A column now rather than a row: the nav is a band across the top and
    // the content sits under it, where before the nav was a rail beside it.
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100svh', overflow: 'hidden' }}>
      <Box
        component="header"
        sx={{
          flexShrink: 0,
          height: { xs: 56, md: 68 },
          borderBottom: '1px solid rgba(255,255,255,.08)',
          bgcolor: '#172744',
          color: '#fff',
          zIndex: 1,
        }}
      >
        {/* One flex row: brand, then the sections taking whatever is left,
            then the account cluster.
            The sections used to be positioned absolutely at `left: 245,
            right: 310` — two magic numbers standing in for the measured
            width of the two things either side of them. Any change to the
            logo, the POS button or the signed-in name's length put the
            nav out of true, which is most of why this bar looked wrong.
            Letting flex do it means the gap is whatever is actually
            there, at any width and any name length. */}
        <Stack
          direction="row"
          spacing={{ xs: 1.5, md: 2.5 }}
          sx={{ alignItems: 'center', px: { xs: 2, md: 3 }, height: '100%', minWidth: 0 }}
        >
          {isMobile && (
            <Tooltip title="Open navigation">
              <IconButton size="small" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation" edge="start">
                <MenuIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          {brand}

          {/* Still MUI Tabs underneath, purely for the scroll handling —
              arrows at the ends when the sections genuinely don't fit,
              which a plain flex row of buttons would not give. Everything
              that makes a Tab look like a tab is then styled off: the
              underline indicator is hidden and each one becomes a pill that
              fills in when selected. An underline plus an icon per section
              read as a dense toolbar; a row of quiet pills with one filled
              reads as a place you are. */}
          {!isMobile && (
            <Tabs
              // `false` when the current section isn't one this role can
              // see: MUI warns on a value matching no tab, and a role can
              // be on a section its permissions exclude from the bar.
              value={visibleNav.some((i) => i.section === section) ? section : false}
              onChange={(_event: SyntheticEvent, next: AdminSection) => selectSection(next)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                // Takes the run between brand and account cluster, whatever
                // that turns out to be — no measured offsets to go stale.
                flex: 1,
                minWidth: 0,
                height: '100%',
                minHeight: 0,
                '& .MuiTabs-indicator': { display: 'none' },
                // The flex container is `.MuiTabs-list` in v7+ and
                // `.MuiTabs-flexContainer` before it — both named so the
                // gap survives whichever this project resolves to.
                '& .MuiTabs-list, & .MuiTabs-flexContainer': { gap: 0.5, alignItems: 'center', height: '100%' },
                '& .MuiTabs-scrollButtons': { color: 'rgba(255,255,255,.7)' },
                '& .MuiTabs-scrollButtons.Mui-disabled': { opacity: 0.3 },
                '& .MuiTab-root': {
                  // Everything here was a step too small to read comfortably
                  // at arm's length on a till-side monitor: 11.5px labels in
                  // 36px pills with barely any horizontal padding. Sized up
                  // to a normal UI text size with room around it, which is
                  // most of what separates this bar from the reference.
                  minHeight: 40,
                  minWidth: 0,
                  py: 0.75,
                  px: 1.75,
                  borderRadius: 2,
                  fontSize: 13.5,
                  fontWeight: 500,
                  textTransform: 'none',
                  color: 'rgba(255,255,255,.72)',
                  transition: 'background-color 0.15s ease, color 0.15s ease',
                  '&:hover': { bgcolor: 'rgba(255,255,255,.08)', color: '#fff' },
                  '&.Mui-selected': {
                    color: '#fff',
                    fontWeight: 600,
                    bgcolor: '#3978f6',
                  },
                },
              }}
            >
              {visibleNav.map((item) => (
                <Tab
                  key={item.section}
                  value={item.section}
                  icon={<item.icon />}
                  iconPosition="start"
                  label={item.label}
                  sx={{ '& .MuiTab-iconWrapper': { mr: 0.85, mb: '0!important' } }}
                />
              ))}
            </Tabs>
          )}

          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexShrink: 0 }}>
            {canAccessPos(user) && (
              <Button
                size="small"
                onClick={onBackToPos}
                startIcon={<ChevronLeftIcon fontSize="small" />}
                // Outlined rather than tinted: this leaves the register,
                // so it reads better as a quiet exit than as the loudest
                // thing on the bar, which a filled accent button next to
                // muted nav pills inevitably becomes.
                variant="outlined"
                sx={{
                  flexShrink: 0,
                  borderRadius: 999,
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: 13,
                  px: 1.75,
                  color: 'rgba(255,255,255,.8)',
                  borderColor: 'rgba(255,255,255,.18)',
                  '&:hover': { borderColor: '#fff', color: '#fff', bgcolor: 'rgba(255,255,255,.06)' },
                  '& .MuiButton-startIcon': { mr: 0.5 },
                }}
              >
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                  POS
                </Box>
              </Button>
            )}

            <ThemeToggle />

            <Stack
              direction="row"
              spacing={0.75}
              onClick={(e) => setProfileMenuAnchor(e.currentTarget)}
              sx={{
                alignItems: 'center',
                borderRadius: 999,
                border: '1px solid',
                borderColor: 'rgba(255,255,255,.16)',
                pl: 0.5,
                pr: 1,
                py: 0.375,
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'border-color 0.15s ease, background-color 0.15s ease',
                '&:hover': { borderColor: 'rgba(255,255,255,.4)', bgcolor: 'rgba(255,255,255,.06)' },
              }}
            >
              {/* No profile images in the system yet — a generic person icon stands in. */}
              <Avatar sx={{ width: 26, height: 26, bgcolor: 'primary.main' }}>
                <PersonIcon sx={{ fontSize: 15 }} />
              </Avatar>
              <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600, fontSize: 12, display: { xs: 'none', sm: 'block' } }} noWrap>
                {user?.name}
              </Typography>
              <ExpandMoreIcon sx={{ fontSize: 18, color: 'rgba(255,255,255,.55)' }} />
            </Stack>
          </Stack>
        </Stack>

      </Box>

      {/* Phone only, and it keeps the group headings the top bar had to
          drop: a vertical list has the room for them, and nine flat
          entries on a small screen is exactly where that grouping earns
          its keep. */}
      <Drawer
        variant="temporary"
        open={isMobile && mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{ [`& .MuiDrawer-paper`]: { width: 260, boxSizing: 'border-box' } }}
      >
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5, bgcolor: '#172744', color: '#fff' }}>
          {brand}
          <IconButton size="small" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation">
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
        </Stack>
        <Divider />
        <Box sx={{ flex: 1, py: 1, overflowY: 'auto' }}>
          {NAV_GROUPS.map((group) => {
            const groupItems = group.sections.map((s) => itemsBySection.get(s)!).filter((item) => visibleSections.has(item.section));
            if (groupItems.length === 0) return null;

            return (
              <List
                key={group.label}
                sx={{ px: 1 }}
                subheader={
                  <ListSubheader
                    component="div"
                    sx={{
                      lineHeight: '28px',
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: 'text.disabled',
                      bgcolor: 'transparent',
                    }}
                  >
                    {group.label}
                  </ListSubheader>
                }
              >
                {groupItems.map((item) => {
                  const selected = item.section === section;
                  return (
                    <ListItemButton
                      key={item.section}
                      selected={selected}
                      onClick={() => selectSection(item.section)}
                      sx={{
                        borderRadius: 1.5,
                        mb: 0.25,
                        px: 1.5,
                        '&.Mui-selected': {
                          bgcolor: 'color-mix(in srgb, var(--mui-palette-primary-main) 12%, transparent)',
                          '&:hover': { bgcolor: 'color-mix(in srgb, var(--mui-palette-primary-main) 16%, transparent)' },
                        },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 34, color: selected ? 'primary.main' : 'inherit' }}>
                        <item.icon />
                      </ListItemIcon>
                      <ListItemText
                        primary={item.label}
                        slotProps={{
                          primary: { sx: { fontSize: 13.5, fontWeight: selected ? 700 : 500, color: selected ? 'primary.main' : 'text.primary' } },
                        }}
                      />
                    </ListItemButton>
                  );
                })}
              </List>
            );
          })}
        </Box>
      </Drawer>

      <ChangePasswordModal open={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} />

      <Box
        ref={contentRef}
        onScroll={handleContentScroll}
        sx={{
          flex: 1,
          minHeight: 0,
          position: 'relative',
          p: section === 'dashboard' ? { xs: 2, sm: 2.5, md: 2.5 } : { xs: 2.5, sm: 3, md: 4 },
          overflow: 'auto',
          scrollbarGutter: 'stable',
          // A barely-there wash down from the top rather than a flat grey.
          // color-mix against the primary keeps it correct in both colour
          // schemes without branching on mode — the same technique the
          // Chip override and Login's panel already use here. The
          // percentages are deliberately tiny: this should register as
          // depth behind the white cards, never as a visible colour.
          backgroundImage:
            'linear-gradient(180deg, color-mix(in srgb, var(--mui-palette-primary-main) 5%, transparent) 0%, transparent 420px)',
        }}
      >
        {/* One surface for the whole screen: title, sub-tabs, toolbar,
            table and pagination all sit on this single card, rather than a
            title floating on the page background above a separate table
            card. That "two stacked cards" reading was the main thing
            separating this layout from the reference design.

            The dashboard opts out — it's a grid of its own cards, and
            wrapping a card grid in another card is exactly the nesting
            this change exists to remove. */}
        <Paper
          variant={section === 'dashboard' ? undefined : 'outlined'}
          elevation={0}
          sx={
            section === 'dashboard'
              ? { bgcolor: 'transparent', border: 0 }
              : {
                  borderRadius: { xs: 0, sm: 3 },
                  borderColor: 'divider',
                  boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)',
                  p: { xs: 2, sm: 2.5, md: 3 },
                  // Cancels the page padding on a phone so the card runs
                  // edge to edge there — the same trick DataTable used to
                  // do for itself before it moved inside this one.
                  mx: { xs: -2.5, sm: 0 },
                }
          }
        >
        <Stack
          direction="row"
          spacing={2}
          sx={{ alignItems: 'center', minWidth: 0, mb: 3, display: section === 'dashboard' ? 'none' : 'flex' }}
        >
          {CurrentIcon && (
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2.5,
                display: { xs: 'none', sm: 'flex' },
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                bgcolor: 'color-mix(in srgb, var(--mui-palette-primary-main) 12%, transparent)',
                color: 'primary.main',
              }}
            >
              <CurrentIcon />
            </Box>
          )}
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="h5"
              sx={{ fontWeight: 700, letterSpacing: '-0.015em', lineHeight: 1.25, fontSize: { xs: '1.4rem', sm: '1.75rem' } }}
              noWrap
            >
              {currentLabel}
            </Typography>
            {currentDescription && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, display: { xs: 'none', sm: 'block' } }}>
                {currentDescription}
              </Typography>
            )}
          </Box>
        </Stack>

        {children}
        </Paper>
      </Box>

      <Menu anchorEl={profileMenuAnchor} open={profileMenuAnchor !== null} onClose={() => setProfileMenuAnchor(null)}>
        <MenuItem
          onClick={() => {
            setProfileMenuAnchor(null);
            setChangePasswordOpen(true);
          }}
        >
          <ListItemIcon>
            <KeyOutlinedIcon fontSize="small" />
          </ListItemIcon>
          Change Password
        </MenuItem>
        <MenuItem
          onClick={() => {
            setProfileMenuAnchor(null);
            logout();
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <LogoutOutlinedIcon fontSize="small" color="error" />
          </ListItemIcon>
          Log out
        </MenuItem>
      </Menu>

      {/* Deliberately `fixed` to the viewport, not `sticky` within the
          scrolling pane above — this button is the last thing rendered
          after all of `children`, so a sticky position would only ever
          engage once scrolled past everything, instead of floating over
          the content the moment scrollTop passes the threshold.
          Bottom-left on mobile — DataTable's pagination controls (on
          nearly every list) are right-aligned, so a bottom-right FAB
          sits directly on top of the next-page arrow there and blocks
          clicking it. Kept bottom-right on desktop: there the table's own
          controls sit far enough right of the FAB to clear it. (The old
          reason given here was the permanent left sidebar, which this
          layout no longer has.) */}
      <Zoom in={showScrollTop}>
        <Fab
          size="small"
          onClick={scrollContentToTop}
          aria-label="Scroll to top"
          sx={{
            position: 'fixed',
            bottom: 24,
            left: { xs: 24, sm: 'auto' },
            right: { xs: 'auto', sm: 24 },
            bgcolor: 'background.paper',
            color: 'primary.main',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 8px 20px -6px rgba(16, 24, 40, 0.2)',
            // Dimmed until hovered — a floating button sitting over page
            // content otherwise competes with it for attention the whole
            // time it's visible, not just while actually in use. 0.7 (not
            // lower) so it stays clearly legible at rest instead of
            // nearly disappearing against light content.
            opacity: 0.7,
            transition: 'opacity 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease',
            '&:hover': {
              opacity: 1,
              bgcolor: 'background.paper',
              boxShadow: '0 10px 24px -6px rgba(16, 24, 40, 0.3)',
              transform: 'translateY(-2px)',
            },
          }}
        >
          <ArrowUpwardRoundedIcon />
        </Fab>
      </Zoom>
    </Box>
  );
}
