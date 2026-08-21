import { useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import Toolbar from '@mui/material/Toolbar';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
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
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PersonIcon from '@mui/icons-material/Person';
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import { useAuth } from '../auth/AuthContext';
import { canAccessPos } from '../auth/posAccess';
import { ThemeToggle } from '../ThemeToggle';
import { ChangePasswordModal } from '../ChangePasswordModal';
import { IconBox, IconChart, IconClipboard, IconLayers, IconSettings, IconShield, IconShoppingBag, IconTruck, IconUsers } from './icons';

export type AdminSection = 'dashboard' | 'catalog' | 'inventory' | 'purchasing' | 'customers' | 'team' | 'reports' | 'settings';

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
  'reports.view',
  'products.view',
  'categories.view',
  'inventory.view',
  'customers.view',
  'suppliers.view',
  'purchases.view',
  'returns.view',
  'users.view',
  'roles.view',
  'stores.view',
];

const NAV_ITEMS: NavItem[] = [
  {
    section: 'dashboard',
    label: 'Dashboard',
    description: "Overview of today's sales, inventory alerts, and store performance.",
    permissions: ['reports.view'],
    icon: IconChart,
  },
  {
    section: 'catalog',
    label: 'Catalog',
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
    description: 'Configure stores, registers, tax rates, and units.',
    permissions: ['stores.view'],
    icon: IconSettings,
  },
];

// Purely a visual grouping for the sidebar — sections themselves are flat,
// this just clusters related ones under a small label the way most modern
// admin dashboards do instead of one long undifferentiated list.
const NAV_GROUPS: { label: string; sections: AdminSection[] }[] = [
  { label: 'Overview', sections: ['dashboard', 'reports'] },
  { label: 'Operations', sections: ['catalog', 'inventory', 'purchasing', 'customers'] },
  { label: 'Administration', sections: ['team', 'settings'] },
];

const SIDEBAR_WIDTH = 240;
const SIDEBAR_WIDTH_COLLAPSED = 72;
const COLLAPSE_STORAGE_KEY = 'admin-sidebar-collapsed';

interface Props {
  section: AdminSection;
  onSectionChange: (section: AdminSection) => void;
  onBackToPos: () => void;
  children: ReactNode;
}

export function AdminLayout({ section, onSectionChange, onBackToPos, children }: Props) {
  const { user, logout, hasPermission } = useAuth();
  const theme = useTheme();
  // Below `md` the sidebar can't stay permanent — a fixed 240px rail on a
  // phone leaves almost nothing for the content, so it becomes an overlay
  // opened from the header's hamburger instead.
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_STORAGE_KEY) === '1');
  const [profileMenuAnchor, setProfileMenuAnchor] = useState<HTMLElement | null>(null);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const visibleSections = new Set(NAV_ITEMS.filter((item) => item.permissions.some((p) => hasPermission(p))).map((i) => i.section));
  const itemsBySection = new Map(NAV_ITEMS.map((item) => [item.section, item]));

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? '1' : '0');
      return next;
    });
  }

  // Collapsing is a desktop-only affordance — in the mobile overlay the
  // sidebar always shows full labels, since it's dismissed after each pick.
  const isCollapsed = collapsed && !isMobile;
  const drawerWidth = isCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH;

  function selectSection(next: AdminSection) {
    onSectionChange(next);
    setMobileNavOpen(false);
  }

  const currentLabel = itemsBySection.get(section)?.label ?? 'Back Office';
  const currentDescription = itemsBySection.get(section)?.description;
  const CurrentIcon = itemsBySection.get(section)?.icon;

  return (
    <Box sx={{ display: 'flex', minHeight: '100svh' }}>
      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={isMobile ? mobileNavOpen : true}
        onClose={() => setMobileNavOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          // A temporary drawer floats above the content, so it must not
          // reserve any track width in the flex row.
          width: isMobile ? 0 : drawerWidth,
          flexShrink: 0,
          transition: (t) => t.transitions.create('width', { duration: t.transitions.duration.shorter }),
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: 'border-box',
            border: 0,
            borderRight: '1px solid',
            borderColor: 'divider',
            overflowX: 'hidden',
            transition: (t) => t.transitions.create('width', { duration: t.transitions.duration.shorter }),
          },
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', px: isCollapsed ? 1.5 : 2 }}>
          {!isCollapsed && (
            <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                }}
              >
                <IconShoppingBag />
              </Box>
              <Typography sx={{ fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap' }} noWrap>
                Back Office
              </Typography>
            </Stack>
          )}
          <IconButton
            size="small"
            onClick={isMobile ? () => setMobileNavOpen(false) : toggleCollapsed}
            aria-label={isMobile ? 'Close navigation' : isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
          </IconButton>
        </Toolbar>
        <Divider />
        <Box sx={{ flex: 1, py: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {NAV_GROUPS.map((group) => {
            const groupItems = group.sections.map((s) => itemsBySection.get(s)!).filter((item) => visibleSections.has(item.section));
            if (groupItems.length === 0) return null;

            return (
              <List
                key={group.label}
                sx={{ px: 1 }}
                subheader={
                  !isCollapsed ? (
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
                  ) : undefined
                }
              >
                {groupItems.map((item) => {
                  const selected = item.section === section;
                  const button = (
                    <ListItemButton
                      key={item.section}
                      selected={selected}
                      onClick={() => selectSection(item.section)}
                      sx={{
                        borderRadius: 1.5,
                        mb: 0.25,
                        justifyContent: isCollapsed ? 'center' : 'flex-start',
                        px: isCollapsed ? 1.5 : 1.5,
                        '&.Mui-selected': {
                          bgcolor: 'color-mix(in srgb, var(--mui-palette-primary-main) 12%, transparent)',
                          '&:hover': { bgcolor: 'color-mix(in srgb, var(--mui-palette-primary-main) 16%, transparent)' },
                        },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: isCollapsed ? 0 : 34, color: selected ? 'primary.main' : 'inherit' }}>
                        <item.icon />
                      </ListItemIcon>
                      {!isCollapsed && (
                        <ListItemText
                          primary={item.label}
                          slotProps={{
                            primary: { sx: { fontSize: 13.5, fontWeight: selected ? 700 : 500, color: selected ? 'primary.main' : 'text.primary' } },
                          }}
                        />
                      )}
                    </ListItemButton>
                  );

                  return isCollapsed ? (
                    <Tooltip key={item.section} title={item.label} placement="right" arrow>
                      {button}
                    </Tooltip>
                  ) : (
                    button
                  );
                })}
              </List>
            );
          })}
        </Box>
        {canAccessPos(user) && (
          <>
            <Divider />
            <Box sx={{ p: 1.5 }}>
              {isCollapsed ? (
                <Tooltip title="Back to POS" placement="right" arrow>
                  <IconButton
                    size="small"
                    onClick={onBackToPos}
                    sx={{
                      width: '100%',
                      borderRadius: 1.5,
                      color: 'primary.main',
                      bgcolor: 'color-mix(in srgb, var(--mui-palette-primary-main) 10%, transparent)',
                      '&:hover': { bgcolor: 'color-mix(in srgb, var(--mui-palette-primary-main) 18%, transparent)' },
                    }}
                  >
                    <ChevronLeftIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              ) : (
                <Button
                  size="small"
                  fullWidth
                  onClick={onBackToPos}
                  startIcon={<ChevronLeftIcon fontSize="small" />}
                  sx={{
                    justifyContent: 'flex-start',
                    color: 'primary.main',
                    bgcolor: 'color-mix(in srgb, var(--mui-palette-primary-main) 10%, transparent)',
                    '&:hover': { bgcolor: 'color-mix(in srgb, var(--mui-palette-primary-main) 18%, transparent)' },
                  }}
                >
                  Back to POS
                </Button>
              )}
            </Box>
          </>
        )}
      </Drawer>

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <ChangePasswordModal open={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} />
        <Box sx={{ flex: 1, p: { xs: 2.5, sm: 3, md: 4 }, overflowX: 'auto' }}>
          <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Stack direction="row" spacing={{ xs: 1.5, sm: 2 }} sx={{ alignItems: 'center', minWidth: 0 }}>
              {isMobile && (
                <IconButton size="small" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation" edge="start">
                  <MenuIcon fontSize="small" />
                </IconButton>
              )}
              {CurrentIcon && (
                <Box
                  sx={{
                    width: { xs: 42, sm: 52 },
                    height: { xs: 42, sm: 52 },
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                  }}
                >
                  <CurrentIcon />
                </Box>
              )}
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 700, letterSpacing: '-0.015em', lineHeight: 1.2, fontSize: { xs: '1.5rem', sm: '2.125rem' } }}
                  noWrap
                >
                  {currentLabel}
                </Typography>
                {currentDescription && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, display: { xs: 'none', sm: 'block' } }}>
                    {currentDescription}
                  </Typography>
                )}
              </Box>
            </Stack>

            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexShrink: 0 }}>
              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', bgcolor: 'action.hover', borderRadius: 999, p: 0.5 }}>
                <ThemeToggle />
              </Stack>

              <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />

              <Stack
                direction="row"
                spacing={0.5}
                onClick={(e) => setProfileMenuAnchor(e.currentTarget)}
                sx={{
                  alignItems: 'center',
                  bgcolor: 'action.hover',
                  borderRadius: 999,
                  pl: 0.5,
                  pr: 1,
                  py: 0.5,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.selected' },
                }}
              >
                {/* No profile images in the system yet — a generic person icon stands in. */}
                <Avatar sx={{ width: 26, height: 26, bgcolor: 'primary.main' }}>
                  <PersonIcon sx={{ fontSize: 16 }} />
                </Avatar>
                <Typography variant="body2" sx={{ fontWeight: 600, display: { xs: 'none', sm: 'block' } }} noWrap>
                  {user?.name}
                </Typography>
                <ExpandMoreIcon fontSize="small" sx={{ color: 'text.secondary' }} />
              </Stack>

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
            </Stack>
          </Stack>

          {children}
        </Box>
      </Box>
    </Box>
  );
}
