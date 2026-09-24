import { useState } from 'react';
import {
  Link as RouterLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import {
  AppBar,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ApartmentIcon from '@mui/icons-material/Apartment';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import AssignmentIcon from '@mui/icons-material/Assignment';
import BuildIcon from '@mui/icons-material/Build';
import MenuIcon from '@mui/icons-material/Menu';
import AccountCircleOutlined from '@mui/icons-material/AccountCircleOutlined';
import LogoutRounded from '@mui/icons-material/LogoutRounded';
import SecurityRounded from '@mui/icons-material/SecurityRounded';
import {
  canAccessSection,
  getAvailablePortals,
  getSectionPath,
  PORTAL_CONFIG,
  SECTION_LABELS,
  type PortalId,
} from '@/app/permissions/accessPolicy';
import { layoutTokens } from '@/app/theme/tokens';
import { useAuthStore } from '@/features/auth/store/authStore';
import {
  getAuthErrorMessage,
  logoutCurrentSession,
} from '@/features/auth/api/authApi';
import { useToastStore } from '@/shared/ui/Toast';
import { ColorModeToggle } from '@/shared/ui/ColorModeToggle';

const DRAWER_WIDTH = 240;

const NAV_ITEMS = [
  { section: 'dashboard', icon: <DashboardIcon /> },
  { section: 'assets', icon: <ApartmentIcon /> },
  { section: 'inspections', icon: <FlightTakeoffIcon /> },
  { section: 'reports', icon: <AssignmentIcon /> },
  { section: 'maintenance', icon: <BuildIcon /> },
] as const;

interface AppShellProps {
  portal: PortalId;
}

export function AppShell({ portal }: AppShellProps) {
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const roles = useAuthStore((state) => state.roles);
  const userName = useAuthStore((state) => state.userName);
  const email = useAuthStore((state) => state.email);
  const clearSession = useAuthStore((state) => state.clearSession);
  const showToast = useToastStore((state) => state.showToast);
  const visibleNavigation = NAV_ITEMS.filter(({ section }) =>
    canAccessSection(portal, section, roles),
  );
  const availablePortals = getAvailablePortals(roles);
  const [accountMenuAnchor, setAccountMenuAnchor] = useState<HTMLElement | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const signOut = async () => {
    setSigningOut(true);
    try {
      await logoutCurrentSession();
      clearSession();
      showToast('You have been signed out.', 'success');
      setAccountMenuAnchor(null);
      navigate('/login', { replace: true });
    } catch (error) {
      showToast(
        `Could not sign out. ${getAuthErrorMessage(error)}`,
        'error',
      );
    } finally {
      setSigningOut(false);
    }
  };

  const drawerContent = (
    <List component="nav" aria-label={`${PORTAL_CONFIG[portal].label} navigation`}>
      {visibleNavigation.map(({ section, icon }) => {
        const path = getSectionPath(portal, section);

        return (
          <ListItemButton
            key={section}
            component={RouterLink}
            to={path}
            selected={location.pathname === path}
            onClick={() => setMobileOpen(false)}
          >
            <ListItemIcon>{icon}</ListItemIcon>
            <ListItemText primary={SECTION_LABELS[section]} />
          </ListItemButton>
        );
      })}
    </List>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          zIndex: (t) => t.zIndex.drawer + 1,
          bgcolor: 'background.paper',
          color: 'text.primary',
          borderBottom: 1,
          borderColor: 'divider',
          boxShadow: 'none',
        }}
      >
        <Toolbar sx={{ px: layoutTokens.pageGutter }}>
          {!isDesktop && (
            <IconButton
              edge="start"
              aria-label="Open navigation menu"
              onClick={() => setMobileOpen(true)}
              sx={{ mr: 1, color: 'inherit' }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
            SmartDroneInspection - {PORTAL_CONFIG[portal].label}
          </Typography>
          {availablePortals.length > 1 && (
            <Button
              component={RouterLink}
              to="/portals"
              color="inherit"
              size="small"
              sx={{ mr: 1 }}
            >
              Switch workspace
            </Button>
          )}
          <IconButton
            aria-label="Open account menu"
            aria-haspopup="menu"
            aria-expanded={Boolean(accountMenuAnchor)}
            onClick={(event) => setAccountMenuAnchor(event.currentTarget)}
            sx={{ color: 'inherit', mr: 0.5 }}
          >
            <AccountCircleOutlined />
          </IconButton>
          <Menu
            anchorEl={accountMenuAnchor}
            open={Boolean(accountMenuAnchor)}
            onClose={() => setAccountMenuAnchor(null)}
            slotProps={{ paper: { sx: { minWidth: 230, borderRadius: 2 } } }}
          >
            <Box sx={{ px: 2, py: 1.25 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {userName ?? 'Signed-in user'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {email}
              </Typography>
            </Box>
            <Divider />
            <MenuItem
              component={RouterLink}
              to={`${PORTAL_CONFIG[portal].path}/account/security`}
              onClick={() => setAccountMenuAnchor(null)}
            >
              <ListItemIcon><SecurityRounded fontSize="small" /></ListItemIcon>
              Account security
            </MenuItem>
            <MenuItem onClick={signOut} disabled={signingOut}>
              <ListItemIcon><LogoutRounded fontSize="small" /></ListItemIcon>
              {signingOut ? 'Signing out…' : 'Sign out'}
            </MenuItem>
          </Menu>
          <ColorModeToggle />
        </Toolbar>
      </AppBar>

      <Drawer
        variant={isDesktop ? 'permanent' : 'temporary'}
        open={isDesktop ? true : mobileOpen}
        onClose={() => setMobileOpen(false)}
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            bgcolor: 'background.paper',
            borderRightColor: 'divider',
          },
        }}
      >
        <Toolbar />
        {drawerContent}
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: layoutTokens.pageGutter }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
