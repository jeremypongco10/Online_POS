import { useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import Toolbar from '@mui/material/Toolbar';
import AppBar from '@mui/material/AppBar';
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
import Breadcrumbs from '@mui/material/Breadcrumbs';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { useAuth } from '../auth/AuthContext';
import { canAccessPos } from '../auth/posAccess';
import { ThemeToggle } from '../ThemeToggle';
import { ChangePasswordButton } from '../ChangePasswordModal';
import { IconBox, IconChart, IconClipboard, IconLayers, IconSettings, IconShield, IconTruck, IconUsers } from './icons';

export type AdminSection = 'dashboard' | 'catalog' | 'inventory' | 'purchasing' | 'customers' | 'team' | 'reports' | 'settings';

interface NavItem {
  section: AdminSection;
  label: string;
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
  { section: 'dashboard', label: 'Dashboard', permissions: ['reports.view'], icon: IconChart },
  { section: 'catalog', label: 'Catalog', permissions: ['products.view', 'categories.view'], icon: IconBox },
  { section: 'inventory', label: 'Inventory', permissions: ['inventory.view'], icon: IconLayers },
  { section: 'purchasing', label: 'Purchasing', permissions: ['suppliers.view', 'purchases.view'], icon: IconTruck },
  { section: 'customers', label: 'Customers', permissions: ['customers.view', 'returns.view'], icon: IconUsers },
  { section: 'team', label: 'Team', permissions: ['users.view', 'roles.view'], icon: IconShield },
  { section: 'reports', label: 'Reports', permissions: ['reports.view'], icon: IconClipboard },
  { section: 'settings', label: 'Settings', permissions: ['stores.view'], icon: IconSettings },
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
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_STORAGE_KEY) === '1');
  const visibleSections = new Set(NAV_ITEMS.filter((item) => item.permissions.some((p) => hasPermission(p))).map((i) => i.section));
  const itemsBySection = new Map(NAV_ITEMS.map((item) => [item.section, item]));

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? '1' : '0');
      return next;
    });
  }

  const drawerWidth = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH;
  const currentLabel = itemsBySection.get(section)?.label ?? 'Back Office';

  return (
    <Box sx={{ display: 'flex', minHeight: '100svh' }}>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
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
        <Toolbar sx={{ justifyContent: 'space-between', px: collapsed ? 1.5 : 2 }}>
          {!collapsed && (
            <Typography sx={{ fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap' }}>Back Office</Typography>
          )}
          <IconButton size="small" onClick={toggleCollapsed} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {collapsed ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
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
                  !collapsed ? (
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
                      onClick={() => onSectionChange(item.section)}
                      sx={{
                        borderRadius: 1.5,
                        mb: 0.25,
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        px: collapsed ? 1.5 : 1.5,
                        '&.Mui-selected': {
                          bgcolor: 'color-mix(in srgb, var(--mui-palette-primary-main) 12%, transparent)',
                          '&:hover': { bgcolor: 'color-mix(in srgb, var(--mui-palette-primary-main) 16%, transparent)' },
                        },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: collapsed ? 0 : 34, color: selected ? 'primary.main' : 'inherit' }}>
                        <item.icon />
                      </ListItemIcon>
                      {!collapsed && (
                        <ListItemText
                          primary={item.label}
                          slotProps={{
                            primary: { sx: { fontSize: 13.5, fontWeight: selected ? 700 : 500, color: selected ? 'primary.main' : 'text.primary' } },
                          }}
                        />
                      )}
                    </ListItemButton>
                  );

                  return collapsed ? (
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
              {collapsed ? (
                <Tooltip title="Back to POS" placement="right" arrow>
                  <IconButton size="small" onClick={onBackToPos} sx={{ width: '100%', borderRadius: 1.5 }}>
                    <ChevronLeftIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              ) : (
                <Button size="small" onClick={onBackToPos}>
                  ← Back to POS
                </Button>
              )}
            </Box>
          </>
        )}
      </Drawer>

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <AppBar
          position="static"
          color="inherit"
          elevation={0}
          sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}
        >
          <Toolbar sx={{ justifyContent: 'space-between' }}>
            <Box>
              <Breadcrumbs separator={<NavigateNextIcon sx={{ fontSize: 14 }} />} sx={{ mb: 0.25, '& .MuiBreadcrumbs-li': { display: 'flex' } }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                  Back Office
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                  {currentLabel}
                </Typography>
              </Breadcrumbs>
              <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: '-0.015em', lineHeight: 1.2 }}>
                {currentLabel}
              </Typography>
            </Box>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <ThemeToggle />
              <ChangePasswordButton />
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Avatar sx={{ width: 28, height: 28, fontSize: 13, bgcolor: 'primary.main' }}>
                  {user?.name?.charAt(0).toUpperCase()}
                </Avatar>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {user?.name}
                </Typography>
                <Button size="small" onClick={logout}>
                  Log out
                </Button>
              </Stack>
            </Stack>
          </Toolbar>
        </AppBar>
        <Box sx={{ flex: 1, p: 3, overflowX: 'auto' }}>{children}</Box>
      </Box>
    </Box>
  );
}
