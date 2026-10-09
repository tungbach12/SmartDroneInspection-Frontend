import { useState } from 'react';
import {
  Link as RouterLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  OutlinedInput,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ApartmentIcon from '@mui/icons-material/Apartment';
import CategoryIcon from '@mui/icons-material/Category';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import AssignmentIcon from '@mui/icons-material/Assignment';
import BuildIcon from '@mui/icons-material/Build';
import MenuIcon from '@mui/icons-material/Menu';
import SearchRounded from '@mui/icons-material/SearchRounded';
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
  type SectionId,
} from '@/app/permissions/accessPolicy';
import { layoutTokens } from '@/app/theme/tokens';
import { useAuthStore } from '@/features/auth/store/authStore';
import {
  getAuthErrorMessage,
  logoutCurrentSession,
} from '@/features/auth/api/authApi';
import { useToastStore } from '@/shared/ui/Toast';
import { ColorModeToggle } from '@/shared/ui/ColorModeToggle';

const DRAWER_WIDTH = layoutTokens.shellRailWidth;

const NAV_ITEMS = [
  { section: 'dashboard', icon: <DashboardIcon /> },
  { section: 'assets', icon: <ApartmentIcon /> },
  { section: 'asset-catalog', icon: <CategoryIcon /> },
  { section: 'asset-review', icon: <FactCheckIcon /> },
  { section: 'inspections', icon: <FlightTakeoffIcon /> },
  { section: 'reports', icon: <AssignmentIcon /> },
  { section: 'maintenance', icon: <BuildIcon /> },
] as const;

interface AppShellProps {
  portal: PortalId;
}

function getPageTitle(pathname: string, portal: PortalId) {
  const section = pathname.split('/').filter(Boolean).at(-1);
  if (section === 'security') return 'Account security';
  if (section && section in SECTION_LABELS) {
    return section === 'dashboard' ? 'Overview' : SECTION_LABELS[section as SectionId];
  }
  return PORTAL_CONFIG[portal].label;
}

export function AppShell({ portal }: AppShellProps) {
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [accountMenuAnchor, setAccountMenuAnchor] = useState<HTMLElement | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const roles = useAuthStore((state) => state.roles);
  const userName = useAuthStore((state) => state.userName);
  const email = useAuthStore((state) => state.email);
  const clearSession = useAuthStore((state) => state.clearSession);
  const showToast = useToastStore((state) => state.showToast);
  const visibleNavigation = NAV_ITEMS.filter(({ section }) =>
    canAccessSection(portal, section, roles) &&
    SECTION_LABELS[section].toLowerCase().includes(search.trim().toLowerCase()),
  );
  const availablePortals = getAvailablePortals(roles);

  const signOut = async () => {
    setSigningOut(true);
    try {
      await logoutCurrentSession();
      clearSession();
      showToast('You have been signed out.', 'success');
      setAccountMenuAnchor(null);
      navigate('/login', { replace: true });
    } catch (error) {
      showToast(`Could not sign out. ${getAuthErrorMessage(error)}`, 'error');
    } finally {
      setSigningOut(false);
    }
  };

  const drawerContent = (
    <Box sx={{ display: 'flex', height: '100%', minHeight: 0, flexDirection: 'column' }}>
      <Box sx={{ height: 64, px: 2.5, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <Box
          component={RouterLink}
          to={getSectionPath(portal, 'dashboard')}
          sx={{ display: 'flex', alignItems: 'center', gap: 1.25, color: 'text.primary', textDecoration: 'none', minWidth: 0 }}
        >
          <Box aria-hidden="true" sx={{ width: 34, height: 34, display: 'grid', flexShrink: 0, placeItems: 'center', bgcolor: 'primary.main', color: 'primary.contrastText', borderRadius: 1 }}>
            <FlightTakeoffIcon fontSize="small" />
          </Box>
          <Typography variant="subtitle2" noWrap sx={{ fontWeight: 650, letterSpacing: '-.025em' }}>
            SmartDroneInspection
          </Typography>
        </Box>
      </Box>

      <Box sx={{ px: 2, pt: 1.5, pb: 2 }}>
        <OutlinedInput
          fullWidth
          size="small"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search"
          inputProps={{ 'aria-label': 'Search workspace navigation' }}
          startAdornment={<InputAdornment position="start"><SearchRounded fontSize="small" /></InputAdornment>}
          sx={{
            height: 40,
            bgcolor: 'action.hover',
            fontSize: 13,
            '& .MuiOutlinedInput-notchedOutline': { borderColor: 'transparent' },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
          }}
        />
      </Box>

      <Box sx={{ minHeight: 0, flex: 1, overflowY: 'auto' }}>
        <Typography variant="caption" sx={{ px: 2.5, pb: 1, display: 'block', color: 'text.secondary' }}>
          {PORTAL_CONFIG[portal].label}
        </Typography>
        <List component="nav" aria-label={`${PORTAL_CONFIG[portal].label} navigation`} sx={{ px: 1.25, py: 0 }}>
          {visibleNavigation.map(({ section, icon }) => {
            const path = getSectionPath(portal, section);
            const selected = location.pathname === path;
            return (
              <ListItemButton
                key={section}
                component={RouterLink}
                to={path}
                selected={selected}
                onClick={() => setMobileOpen(false)}
                sx={{
                  minHeight: 40,
                  mb: 0.25,
                  px: 1.25,
                  borderRadius: 1,
                  color: selected ? 'primary.dark' : 'text.secondary',
                  '& .MuiListItemIcon-root': { minWidth: 34, color: 'inherit' },
                  '&.Mui-selected': {
                    bgcolor: 'action.selected',
                    color: 'primary.dark',
                    '&:hover': { bgcolor: 'action.selected' },
                  },
                  '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 1 },
                }}
              >
                <ListItemIcon>{icon}</ListItemIcon>
                <ListItemText
                  primary={SECTION_LABELS[section]}
                  slotProps={{ primary: { variant: 'body2', sx: { fontWeight: selected ? 650 : 500 } } }}
                />
              </ListItemButton>
            );
          })}
          {visibleNavigation.length === 0 && (
            <Typography role="status" variant="body2" color="text.secondary" sx={{ px: 1.5, py: 2 }}>
              No matching sections.
            </Typography>
          )}
        </List>
      </Box>

      <Box sx={{ px: 1.5, pb: 1.25, flexShrink: 0 }}>
        <Divider sx={{ mb: 1 }} />
        {availablePortals.length > 1 && (
          <Button component={RouterLink} to="/portals" fullWidth color="inherit" size="small" sx={{ justifyContent: 'flex-start', px: 1, mb: 0.5 }}>
            Switch workspace
          </Button>
        )}
        <Button
          fullWidth
          color="inherit"
          aria-label={`${userName ?? 'Account'} ${email ?? ''}`.trim()}
          aria-haspopup="menu"
          aria-expanded={Boolean(accountMenuAnchor)}
          onClick={(event) => setAccountMenuAnchor(event.currentTarget)}
          sx={{ minHeight: 52, justifyContent: 'flex-start', gap: 1.25, px: 1, textAlign: 'left' }}
        >
          <Avatar aria-hidden="true" sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: 13, fontWeight: 650 }}>
            {userName?.trim().charAt(0).toUpperCase() ?? <AccountCircleOutlined fontSize="small" />}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography component="span" variant="body2" noWrap sx={{ display: 'block', fontWeight: 650, color: 'text.primary' }}>
              {userName ?? 'Signed-in user'}
            </Typography>
            <Typography component="span" variant="caption" noWrap sx={{ display: 'block', color: 'text.secondary' }}>
              {email}
            </Typography>
          </Box>
          <AccountCircleOutlined fontSize="small" sx={{ color: 'text.secondary' }} />
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="fixed"
        color="inherit"
        sx={{
          zIndex: (t) => t.zIndex.drawer + 1,
          left: { xs: 0, md: `${DRAWER_WIDTH}px` },
          width: { xs: '100%', md: `calc(100% - ${DRAWER_WIDTH}px)` },
          height: layoutTokens.shellHeaderHeight,
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
          boxShadow: 'none',
        }}
      >
        <Toolbar sx={{ minHeight: `${layoutTokens.shellHeaderHeight}px !important`, px: { xs: 1.5, md: 3 } }}>
          {!isDesktop && (
            <IconButton edge="start" aria-label="Open navigation menu" onClick={() => setMobileOpen(true)} sx={{ mr: 1, color: 'text.primary' }}>
              <MenuIcon />
            </IconButton>
          )}
          <Typography component="h1" variant="h6" noWrap sx={{ flexGrow: 1, ml: { xs: 0.5, md: 0 }, fontSize: 16, fontWeight: 600 }}>
            {getPageTitle(location.pathname, portal)}
          </Typography>
          <ColorModeToggle />
        </Toolbar>
      </AppBar>

      <Drawer
        variant={isDesktop ? 'permanent' : 'temporary'}
        open={isDesktop || mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          width: isDesktop ? DRAWER_WIDTH : undefined,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            bgcolor: 'background.paper',
            borderRightColor: 'divider',
          },
        }}
      >
        {drawerContent}
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          minHeight: '100vh',
          pt: `${layoutTokens.shellHeaderHeight + 24}px`,
          px: layoutTokens.pageGutter,
          pb: { xs: 4, md: 6 },
        }}
      >
        <Box sx={{ width: '100%', maxWidth: layoutTokens.contentMaxWidth, mx: 'auto' }}>
          <Outlet />
        </Box>
      </Box>

      <Menu
        anchorEl={accountMenuAnchor}
        open={Boolean(accountMenuAnchor)}
        onClose={() => setAccountMenuAnchor(null)}
        slotProps={{ paper: { sx: { minWidth: 250, mt: 1, borderRadius: 1.5 } } }}
      >
        <MenuItem component={RouterLink} to={`${PORTAL_CONFIG[portal].path}/account/security`} onClick={() => { setAccountMenuAnchor(null); setMobileOpen(false); }}>
          <ListItemIcon><SecurityRounded fontSize="small" /></ListItemIcon>
          Account security
        </MenuItem>
        <MenuItem onClick={signOut} disabled={signingOut}>
          <ListItemIcon><LogoutRounded fontSize="small" /></ListItemIcon>
          {signingOut ? 'Signing out…' : 'Sign out'}
        </MenuItem>
      </Menu>
    </Box>
  );
}
