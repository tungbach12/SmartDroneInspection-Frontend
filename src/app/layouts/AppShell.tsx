import { Outlet } from 'react-router-dom';
import { useMemo, useState } from 'react';
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ApartmentIcon from '@mui/icons-material/Apartment';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import AssignmentIcon from '@mui/icons-material/Assignment';
import BuildIcon from '@mui/icons-material/Build';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { ColorModeContext } from './ColorModeContext';

const DRAWER_WIDTH = 240;

const NAV_ITEMS = [
  { label: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
  { label: 'Assets', icon: <ApartmentIcon />, path: '/assets' },
  { label: 'Inspections', icon: <FlightTakeoffIcon />, path: '/inspections' },
  { label: 'Reports', icon: <AssignmentIcon />, path: '/reports' },
  { label: 'Tickets', icon: <BuildIcon />, path: '/tickets' },
  { label: 'AI Services', icon: <SmartToyIcon />, path: '/ai' },
];

export function AppShell() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const colorMode = useMemo(() => ({ toggle: () => {} }), []); // wired to theme toggle in providers

  const drawerContent = (
    <List>
      {NAV_ITEMS.map((item) => (
        <ListItemButton key={item.path} component="a" href={item.path}>
          <ListItemIcon>{item.icon}</ListItemIcon>
          <ListItemText primary={item.label} />
        </ListItemButton>
      ))}
    </List>
  );

  return (
    <ColorModeContext.Provider value={colorMode}>
      <Box sx={{ display: 'flex' }}>
        <AppBar
          position="fixed"
          sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}
        >
          <Toolbar>
            <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
              SmartDroneInspection
            </Typography>
            <Tooltip title="Toggle theme">
              <IconButton
                color="inherit"
                onClick={() => colorMode.toggle()}
                aria-label="toggle theme"
              >
                {theme.palette.mode === 'dark' ? (
                  <Brightness7Icon />
                ) : (
                  <Brightness4Icon />
                )}
              </IconButton>
            </Tooltip>
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
            },
          }}
        >
          <Toolbar />
          {drawerContent}
        </Drawer>

        <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
          <Toolbar />
          <Outlet />
        </Box>
      </Box>
    </ColorModeContext.Provider>
  );
}
