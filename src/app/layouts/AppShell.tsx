import {
  useState,
  useEffect,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
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
  Dialog,
  Divider,
  Drawer,
  IconButton,
  InputBase,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import SwapHorizOutlined from '@mui/icons-material/SwapHorizOutlined';
import AccountCircleOutlined from '@mui/icons-material/AccountCircleOutlined';
import LogoutRounded from '@mui/icons-material/LogoutRounded';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import {
  canAccessSection,
  getAvailablePortals,
  getPortalLabel,
  getSectionLabel,
  getSectionPath,
  PORTAL_CONFIG,
  type PortalId,
} from '@/app/permissions/accessPolicy';
import { layoutTokens } from '@/app/theme/tokens';
import { useColorMode, useIsDarkMode } from '@/app/layouts/ColorModeContext';
import { useAuthStore } from '@/features/auth/store/authStore';
import {
  getAuthErrorMessage,
  logoutCurrentSession,
} from '@/features/auth/api/authApi';
import { useToastStore } from '@/shared/ui/Toast';
import {
  NextAdminCalendarIcon,
  NextAdminChartsIcon,
  NextAdminChevronDownIcon,
  NextAdminFormsIcon,
  NextAdminHomeIcon,
  NextAdminInvoiceIcon,
  NextAdminLogoMark,
  NextAdminMoonIcon,
  NextAdminPagesIcon,
  NextAdminProfileIcon,
  NextAdminSearchIcon,
  NextAdminSidebarToggleIcon,
  NextAdminSunIcon,
  NextAdminTablesIcon,
  NextAdminTaskIcon,
} from '@/shared/ui/NextAdminIcons';
import '@/features/dashboard/styles/workspace-pages.css';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { useQueryClient } from '@tanstack/react-query';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import {
  clearNotificationCache,
  useNotificationSessionSync,
} from '@/features/notifications/hooks/useNotifications';

const DRAWER_WIDTH = layoutTokens.shellRailWidth;

const NAV_ITEMS = [
  { section: 'dashboard', icon: <NextAdminHomeIcon /> },
  { section: 'contracts', icon: <NextAdminInvoiceIcon /> },
  { section: 'messages', icon: <NextAdminFormsIcon /> },
  { section: 'schedule', icon: <NextAdminCalendarIcon />, path: '/operations/inspections?view=calendar' },
  { section: 'assets', icon: <NextAdminTablesIcon /> },
  { section: 'asset-catalog', icon: <NextAdminPagesIcon /> },
  { section: 'inspections', icon: <NextAdminTaskIcon /> },
  { section: 'inspector-drones', icon: <NextAdminChartsIcon /> },
  { section: 'partner-onboarding', icon: <NextAdminFormsIcon />, path: '/operations/partner-onboarding' },
  { section: 'onboarding-reviews', icon: <NextAdminFormsIcon /> },
  { section: 'platform-users', icon: <NextAdminProfileIcon /> },
  { section: 'finance-settings', icon: <NextAdminInvoiceIcon /> },
  { section: 'pilot-license-classes', icon: <NextAdminFormsIcon />, path: '/admin/pilot-license-classes' },
  { section: 'ai-settings', icon: <NextAdminChartsIcon />, path: '/admin/ai-settings' },
  { section: 'settings', icon: <NextAdminProfileIcon /> },
] as const;

const NAV_GROUPS: ReadonlyArray<{
  key: 'main' | 'operations' | 'governance' | 'account';
  labelEn: string;
  labelVi: string;
  sections: ReadonlyArray<(typeof NAV_ITEMS)[number]['section']>;
}> = [
  {
    key: 'main',
    labelEn: 'MAIN MENU',
    labelVi: 'MENU CHÍNH',
    sections: ['dashboard'],
  },
  {
    key: 'operations',
    labelEn: 'OPERATIONS',
    labelVi: 'VẬN HÀNH',
    sections: ['contracts', 'messages', 'assets', 'schedule', 'inspections', 'inspector-drones'],
  },
  {
    key: 'governance',
    labelEn: 'GOVERNANCE',
    labelVi: 'QUẢN TRỊ',
    sections: [
      'onboarding-reviews',
      'platform-users',
      'asset-catalog',
      'pilot-license-classes',
      'finance-settings',
      'ai-settings',
    ],
  },
  {
    key: 'account',
    labelEn: 'ACCOUNT',
    labelVi: 'TÀI KHOẢN',
    sections: ['settings'],
  },
];

interface AppShellProps {
  portal: PortalId;
}

export function AppShell({ portal }: AppShellProps) {
  const { locale, t } = useLocale();
  const theme = useTheme();
  const { toggle: toggleColorMode } = useColorMode();
  const isDark = useIsDarkMode();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  useNotificationSessionSync();
  const isDesktop = useMediaQuery(theme.breakpoints.up('sm'));

  // Synchronized sidebar state across windows and tabs
  const [navVisible, setNavVisibleState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('sdi_sidebar_visible');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleNav = () => {
    if (isDesktop) {
      setNavVisibleState((prev) => {
        const next = !prev;
        try {
          localStorage.setItem('sdi_sidebar_visible', String(next));
        } catch {
          // ignore
        }
        return next;
      });
    } else {
      setMobileOpen((prev) => !prev);
    }
  };

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'sdi_sidebar_visible' && e.newValue !== null) {
        setNavVisibleState(e.newValue === 'true');
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const hasMatchMedia = typeof window !== 'undefined' && typeof window.matchMedia === 'function';
  const isNavOpen = !hasMatchMedia || isDesktop ? navVisible : mobileOpen;
  const [navFilter, setNavFilter] = useState('');
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [activeSearchIdx, setActiveSearchIdx] = useState(0);
  const [accountMenuAnchor, setAccountMenuAnchor] = useState<HTMLElement | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const roles = useAuthStore((state) => state.roles);
  const user = useAuthStore((state) => state.user);
  const userName = useAuthStore((state) => state.userName);
  const email = useAuthStore((state) => state.email);
  const clearSession = useAuthStore((state) => state.clearSession);
  const showToast = useToastStore((state) => state.showToast);

  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setActiveSearchIdx(0);
        setSearchModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const roleFilteredNavigation = NAV_ITEMS.filter(({ section }) => {
    if (section === 'schedule') {
      return portal === 'operations' && roles.includes('INSPECTOR');
    }
    if (section === 'partner-onboarding') {
      return false;
    }
    if (section === 'ai-settings') {
      return portal === 'admin' && roles.includes('ADMIN');
    }
    return canAccessSection(portal, section, roles);
  }).map((item) => {
    const { section, icon } = item;
    const path =
      section === 'schedule'
        ? '/operations/inspections?view=calendar'
        : section === 'partner-onboarding'
          ? '/operations/partner-onboarding'
          : section === 'ai-settings'
            ? '/admin/ai-settings'
            : section === 'pilot-license-classes'
              ? '/admin/pilot-license-classes'
              : getSectionPath(
                portal,
                section as Exclude<typeof section, 'schedule' | 'partner-onboarding' | 'ai-settings' | 'pilot-license-classes'>,
              );
    const label =
      section === 'schedule'
        ? t('Inspection Schedule')
        : section === 'partner-onboarding'
          ? locale === 'vi'
            ? 'Hồ sơ & Hợp đồng'
            : 'Pilot Profile & Contract'
          : section === 'ai-settings'
            ? locale === 'vi'
              ? 'Cấu hình AI'
              : 'AI configuration'
            : section === 'pilot-license-classes'
              ? locale === 'vi'
                ? 'Hạng bằng lái UAV'
                : 'UAV license classes'
              : getSectionLabel(section, locale, portal);
    return {
      section,
      icon,
      path,
      label,
      parentLabel: section === 'dashboard' ? 'Dashboard' : undefined,
      title: section === 'dashboard' ? getPortalLabel(portal, locale) : label,
    };
  });

  const visibleNavigation = roleFilteredNavigation.filter((item) => {
    const query = navFilter.trim().toLowerCase();
    if (!query) return true;
    return (
      item.label.toLowerCase().includes(query) ||
      item.title.toLowerCase().includes(query) ||
      (item.parentLabel !== undefined && item.parentLabel.toLowerCase().includes(query)) ||
      item.path.toLowerCase().includes(query)
    );
  });

  const handleSearchKeyDown = (e: ReactKeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSearchIdx((prev) => (prev + 1) % Math.max(1, visibleNavigation.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSearchIdx(
        (prev) => (prev - 1 + Math.max(1, visibleNavigation.length)) % Math.max(1, visibleNavigation.length),
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selectedItem = visibleNavigation[activeSearchIdx] ?? visibleNavigation[0];
      if (selectedItem) {
        navigate(selectedItem.path);
        setSearchModalOpen(false);
        setMobileOpen(false);
      }
    }
  };

  const availablePortals = getAvailablePortals(roles);
  const primaryRole = roles[0] ?? '';
  const showSidebarToggleInDrawer = isDesktop ? navVisible : mobileOpen;
  const showSidebarToggleInHeader = !showSidebarToggleInDrawer;

  const signOut = async () => {
    setSigningOut(true);
    try {
      await logoutCurrentSession();
      clearSession();
      clearNotificationCache(queryClient);
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
    <Box
      sx={{
        display: 'flex',
        height: '100%',
        minHeight: 0,
        flexDirection: 'column',
        bgcolor: 'background.default',
      }}
    >
      <Box
        sx={{
          px: 2,
          pt: 3,
          pb: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <Box
          component={RouterLink}
          to={getSectionPath(portal, 'dashboard')}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            color: 'text.primary',
            textDecoration: 'none',
            minWidth: 0,
            flex: 1,
          }}
        >
          <NextAdminLogoMark width={34} height={34} style={{ flexShrink: 0 }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, lineHeight: 1.15 }}>
            <Typography
              component="span"
              variant="subtitle2"
              sx={{
                fontSize: '0.9375rem',
                fontWeight: 700,
                letterSpacing: '-0.025em',
                color: 'text.primary',
                lineHeight: 1.15,
                whiteSpace: 'nowrap',
              }}
            >
              SmartDrone
            </Typography>
            <Typography
              component="span"
              sx={{
                fontSize: '0.6875rem',
                fontWeight: 600,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: '#3758F9',
                lineHeight: 1.2,
                mt: 0.25,
                whiteSpace: 'nowrap',
              }}
            >
              INSPECTION
            </Typography>
          </Box>
        </Box>

        {showSidebarToggleInDrawer && (
          <IconButton
            aria-label={isNavOpen ? t('Hide sidebar') : t('Show sidebar')}
            onClick={toggleNav}
            sx={{
              width: 34,
              height: 34,
              borderRadius: '8px',
              color: 'text.secondary',
              '&:hover': {
                bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                color: 'text.primary',
              },
            }}
          >
            <NextAdminSidebarToggleIcon />
          </IconButton>
        )}
      </Box>

      <Box sx={{ minHeight: 0, flex: 1, overflowY: 'auto', px: 1.5, pt: 1, pb: 2 }}>
        <List
          component="nav"
          aria-label={`${getPortalLabel(portal, locale)} navigation`}
          sx={{ p: 0, display: 'flex', flexDirection: 'column', gap: 0.5 }}
        >
          {NAV_GROUPS.map((group) => {
            const groupItems = visibleNavigation.filter((item) =>
              group.sections.includes(item.section),
            );
            if (groupItems.length === 0) return null;
            return (
              <Box key={group.key} sx={{ mb: 1.5 }}>
                <Typography
                  component="div"
                  sx={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: '#71717A',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    px: 1.5,
                    mb: 0.75,
                  }}
                >
                  {locale === 'vi' ? group.labelVi : group.labelEn}
                </Typography>
                <Stack spacing={0.5}>
                  {groupItems.map((item) => {
                    const { section, icon } = item;
                    const path =
                      section === 'schedule'
                        ? '/operations/inspections?view=calendar'
                        : section === 'partner-onboarding'
                          ? '/operations/partner-onboarding'
                          : section === 'ai-settings'
                            ? '/admin/ai-settings'
                            : section === 'pilot-license-classes'
                              ? '/admin/pilot-license-classes'
                              : getSectionPath(
                                  portal,
                                  section as Exclude<
                                    typeof section,
                                    'schedule' | 'partner-onboarding' | 'ai-settings' | 'pilot-license-classes'
                                  >,
                                );
                    const isCalendarView =
                      location.pathname.startsWith('/operations/inspections') &&
                      new URLSearchParams(location.search).get('view') === 'calendar';
                    const selected =
                      section === 'schedule'
                        ? isCalendarView
                        : section === 'inspections'
                          ? location.pathname.startsWith(getSectionPath(portal, 'inspections')) &&
                            !isCalendarView
                          : location.pathname === path;
                    const navLabel =
                      section === 'schedule'
                        ? t('Inspection Schedule')
                        : section === 'partner-onboarding'
                          ? locale === 'vi'
                            ? 'Hồ sơ & Hợp đồng'
                            : 'Pilot Profile & Contract'
                          : section === 'ai-settings'
                            ? locale === 'vi'
                              ? 'Cấu hình AI'
                              : 'AI configuration'
                            : section === 'pilot-license-classes'
                              ? locale === 'vi'
                                ? 'Hạng bằng lái UAV'
                                : 'UAV license classes'
                              : getSectionLabel(section, locale, portal);
                    return (
                      <ListItemButton
                        key={section}
                        component={RouterLink}
                        to={path}
                        selected={selected}
                        onClick={() => setMobileOpen(false)}
                        sx={{
                          borderRadius: '8px',
                          py: '8px',
                          px: '12px',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          color: selected ? 'text.primary' : 'text.secondary',
                          bgcolor: selected
                            ? isDark
                              ? 'rgba(255,255,255,0.08)'
                              : '#E4E4E7'
                            : 'transparent',
                          '& .MuiListItemIcon-root': {
                            minWidth: 30,
                            color: 'inherit',
                          },
                          '&.Mui-selected': {
                            bgcolor: isDark ? 'rgba(255,255,255,0.08)' : '#E4E4E7',
                            color: 'text.primary',
                            '&:hover': {
                              bgcolor: isDark ? 'rgba(255,255,255,0.12)' : '#D4D4D8',
                            },
                          },
                          '&:hover': {
                            bgcolor: selected
                              ? isDark
                                ? 'rgba(255,255,255,0.12)'
                                : '#D4D4D8'
                              : isDark
                                ? 'rgba(255,255,255,0.04)'
                                : 'rgba(0,0,0,0.04)',
                            color: 'text.primary',
                          },
                          '&:focus-visible': {
                            outline: '2px solid',
                            outlineColor: 'primary.main',
                            outlineOffset: 1,
                          },
                        }}
                      >
                        <ListItemIcon>{icon}</ListItemIcon>
                        <ListItemText
                          primary={navLabel}
                          slotProps={{
                            primary: {
                              sx: {
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                color: 'inherit',
                              },
                            },
                          }}
                        />
                      </ListItemButton>
                    );
                  })}
                </Stack>
              </Box>
            );
          })}
          {visibleNavigation.length === 0 && (
            <Typography role="status" variant="body2" color="text.secondary" sx={{ px: 1.5, py: 2 }}>
              {t('No matching sections.')}
            </Typography>
          )}
        </List>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: 'background.default' }}>
      <Drawer
        variant={!hasMatchMedia || isDesktop ? 'persistent' : 'temporary'}
        open={!hasMatchMedia || isDesktop ? navVisible : mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          width: isDesktop ? (navVisible ? DRAWER_WIDTH : 0) : undefined,
          flexShrink: 0,
          transition: 'width 200ms ease',
          zIndex: (tTheme) => (isDesktop ? undefined : tTheme.zIndex.drawer + 2),
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            height: '100vh',
            boxSizing: 'border-box',
            bgcolor: 'background.default',
            borderRight: 'none',
            boxShadow: 'none',
            transform: isDesktop && !navVisible ? `translateX(-${DRAWER_WIDTH}px)` : 'none',
            transition: 'transform 200ms ease',
          },
        }}
      >
        {drawerContent}
      </Drawer>

      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          height: '100vh',
          overflow: 'hidden',
          p: { xs: 0, lg: '16px 16px 16px 0' },
        }}
      >
        <Box
          sx={{
            height: '100%',
            borderRadius: { xs: 0, lg: '16px' },
            border: {
              xs: 'none',
              lg: isDark ? '1px solid #27272A' : '1px solid #E5E5E5',
            },
            bgcolor: isDark ? '#111827' : '#FFFFFF',
            boxShadow: {
              xs: 'none',
              lg: '0 3px 6px -2px rgba(0,0,0,0.02), 0 1px 1px 0 rgba(0,0,0,0.04)',
            },
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <AppBar
            position="sticky"
            color="inherit"
            sx={{
              height: 72,
              flexShrink: 0,
              bgcolor: isDark ? '#111827' : '#FFFFFF',
              borderBottom: isDark ? '1px solid #27272A' : '1px solid #E8E8E8',
              boxShadow: 'none',
              px: { xs: 2, sm: 3, lg: 3.5 },
            }}
          >
            <Toolbar
              disableGutters
              sx={{
                minHeight: '72px !important',
                height: 72,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0, flex: 1 }}>
                {showSidebarToggleInHeader && (
                  <IconButton
                    edge="start"
                    aria-label={isNavOpen ? t('Hide sidebar') : t('Show sidebar')}
                    onClick={toggleNav}
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'background.paper',
                      color: 'text.primary',
                    }}
                  >
                    <NextAdminSidebarToggleIcon />
                  </IconButton>
                )}

                <Box
                  onClick={() => {
                    setActiveSearchIdx(0);
                    setSearchModalOpen(true);
                  }}
                  sx={{
                    display: { xs: 'none', sm: 'flex' },
                    alignItems: 'center',
                    width: { sm: 240, md: 300 },
                    height: 40,
                    borderRadius: '999px',
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: isDark ? 'rgba(255,255,255,0.04)' : '#F9FAFB',
                    px: 1.75,
                    gap: 1,
                    flexShrink: 0,
                    cursor: 'pointer',
                    '&:hover': {
                      borderColor: 'text.secondary',
                    },
                  }}
                >
                  <Box component="span" sx={{ display: 'inline-flex', color: '#71717A', flexShrink: 0 }}>
                    <NextAdminSearchIcon />
                  </Box>
                  <InputBase
                    value={navFilter}
                    onChange={(event) => {
                      setNavFilter(event.target.value);
                      setActiveSearchIdx(0);
                    }}
                    onClick={() => {
                      setActiveSearchIdx(0);
                      setSearchModalOpen(true);
                    }}
                    placeholder={t('Search pages...')}
                    inputProps={{ 'aria-label': t('Filter navigation') }}
                    sx={{
                      flex: 1,
                      fontSize: '0.875rem',
                      color: 'text.primary',
                      cursor: 'pointer',
                      '& input': { cursor: 'pointer' },
                    }}
                  />
                  <Box
                    sx={{
                      borderRadius: '6px',
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'background.paper',
                      px: 0.875,
                      py: 0.25,
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      color: 'text.secondary',
                      lineHeight: 1.2,
                      flexShrink: 0,
                    }}
                  >
                    ⌘ K
                  </Box>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexShrink: 0 }}>
                <Tooltip title={isDark ? t('Switch to light mode') : t('Switch to dark mode')}>
                  <IconButton
                    onClick={toggleColorMode}
                    aria-label={isDark ? t('Switch to light mode') : t('Switch to dark mode')}
                    data-testid="theme-mode-toggle"
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: isDark ? '#27272A' : '#F3F4F6',
                      color: 'text.secondary',
                      '&:hover': {
                        bgcolor: isDark ? '#3F3F46' : '#E5E7EB',
                        color: 'text.primary',
                      },
                    }}
                  >
                    {isDark ? <NextAdminSunIcon width={18} height={18} /> : <NextAdminMoonIcon width={18} height={18} />}
                  </IconButton>
                </Tooltip>

                <Box
                  sx={{
                    '& .MuiIconButton-root': {
                      width: 40,
                      height: 40,
                      mr: 0,
                      borderRadius: '50%',
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: isDark ? '#27272A' : '#F3F4F6',
                      color: 'text.secondary',
                      '&:hover': {
                        bgcolor: isDark ? '#3F3F46' : '#E5E7EB',
                        color: 'text.primary',
                      },
                    },
                  }}
                >
                  <NotificationBell portal={portal} />
                </Box>

                <Button
                  color="inherit"
                  aria-label={`${userName ?? 'Account'} ${email ?? ''}`.trim()}
                  aria-haspopup="menu"
                  aria-expanded={Boolean(accountMenuAnchor)}
                  onClick={(event) => setAccountMenuAnchor(event.currentTarget)}
                  sx={{
                    pl: 0.75,
                    pr: 1.25,
                    py: 0.5,
                    borderRadius: '999px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.25,
                    textTransform: 'none',
                    color: 'text.primary',
                    '&:hover': {
                      bgcolor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6',
                    },
                  }}
                >
                  <Avatar
                    src={user?.avatarUrl ?? undefined}
                    aria-hidden="true"
                    sx={{
                      width: 38,
                      height: 38,
                      bgcolor: '#EFF3FF',
                      color: '#3758F9',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    {userName?.trim().charAt(0).toUpperCase() ?? (
                      <AccountCircleOutlined fontSize="small" />
                    )}
                  </Avatar>
                  <Typography
                    component="span"
                    noWrap
                    sx={{
                      display: { xs: 'none', sm: 'block' },
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: 'text.primary',
                      maxWidth: 160,
                    }}
                  >
                    {userName ?? 'Signed-in user'}
                  </Typography>
                  <Box
                    component="span"
                    sx={{
                      display: { xs: 'none', sm: 'inline-flex' },
                      color: 'text.secondary',
                      flexShrink: 0,
                    }}
                  >
                    <NextAdminChevronDownIcon />
                  </Box>
                </Button>
              </Box>
            </Toolbar>
          </AppBar>

          <Box
            component="main"
            sx={{
              flex: 1,
              minHeight: 0,
              minWidth: 0,
              overflowY: 'auto',
              px: layoutTokens.pageGutter,
              py: { xs: 2.5, md: 3.5 },
            }}
          >
            <Box sx={{ width: '100%', maxWidth: layoutTokens.contentMaxWidth, mx: 'auto' }}>
              <Outlet />
            </Box>
          </Box>
        </Box>
      </Box>

      <Menu
        anchorEl={accountMenuAnchor}
        open={Boolean(accountMenuAnchor)}
        onClose={() => setAccountMenuAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              minWidth: 240,
              mt: 1,
              borderRadius: '12px',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
            },
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.25 }}>
          <Typography variant="subtitle2" noWrap sx={{ fontWeight: 600, color: 'text.primary' }}>
            {userName ?? 'Signed-in user'}
          </Typography>
          <Typography variant="caption" noWrap sx={{ color: 'text.secondary', display: 'block' }}>
            {email ?? primaryRole}
          </Typography>
        </Box>
        <Divider />
        <MenuItem
          component={RouterLink}
          to={`${PORTAL_CONFIG[portal].path}/settings`}
          onClick={() => {
            setAccountMenuAnchor(null);
            setMobileOpen(false);
          }}
          sx={{ mt: 0.5 }}
        >
          <ListItemIcon>
            <SettingsOutlined fontSize="small" />
          </ListItemIcon>
          {t('Settings')}
        </MenuItem>
        {availablePortals.length > 1 && (
          <MenuItem
            component={RouterLink}
            to="/portals"
            onClick={() => {
              setAccountMenuAnchor(null);
              setMobileOpen(false);
            }}
          >
            <ListItemIcon>
              <SwapHorizOutlined fontSize="small" />
            </ListItemIcon>
            {t('Switch workspace')}
          </MenuItem>
        )}
        <MenuItem onClick={signOut} disabled={signingOut}>
          <ListItemIcon>
            <LogoutRounded fontSize="small" />
          </ListItemIcon>
          {signingOut ? t('Signing out…') : t('Sign out')}
        </MenuItem>
      </Menu>

      <Dialog
        open={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '16px',
              maxWidth: 600,
              width: '100%',
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
              overflow: 'hidden',
              backgroundImage: 'none',
            },
          },
        }}
      >
        <Box sx={{ p: '14px 16px', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              height: 46,
              px: 1.75,
              borderRadius: '10px',
              border: '1.5px solid #3758F9',
              boxShadow: '0 0 0 4px rgba(55, 88, 249, 0.15)',
              bgcolor: 'background.paper',
            }}
          >
            <Box component="span" sx={{ display: 'inline-flex', color: '#71717A' }}>
              <NextAdminSearchIcon />
            </Box>
            <InputBase
              autoFocus
              fullWidth
              value={navFilter}
              onChange={(e) => {
                setNavFilter(e.target.value);
                setActiveSearchIdx(0);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder={t('Search pages...')}
              inputProps={{ 'aria-label': t('Search pages') }}
              sx={{ fontSize: '0.9375rem', color: 'text.primary' }}
            />
            <Box
              component="button"
              type="button"
              onClick={() => setSearchModalOpen(false)}
              sx={{
                borderRadius: '6px',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                px: 1.25,
                py: 0.4,
                fontSize: '0.75rem',
                fontWeight: 500,
                color: 'text.secondary',
                cursor: 'pointer',
                lineHeight: 1.2,
              }}
            >
              ESC
            </Box>
          </Box>
        </Box>

        <Box sx={{ maxHeight: 380, overflowY: 'auto', p: 2 }}>
          <Typography
            sx={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#71717A',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              px: 1.5,
              mb: 1,
            }}
          >
            MAIN MENU
          </Typography>

          <List sx={{ p: 0, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {visibleNavigation.map((item, idx) => (
              <ListItemButton
                key={item.section}
                selected={idx === activeSearchIdx}
                onMouseEnter={() => setActiveSearchIdx(idx)}
                onClick={() => {
                  navigate(item.path);
                  setSearchModalOpen(false);
                  setMobileOpen(false);
                }}
                sx={{
                  borderRadius: '10px',
                  px: 1.5,
                  py: 1.125,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                  bgcolor:
                    idx === activeSearchIdx
                      ? isDark
                        ? 'rgba(255,255,255,0.06)'
                        : '#F9FAFB'
                      : 'transparent',
                  '&.Mui-selected': {
                    bgcolor: isDark ? 'rgba(255,255,255,0.06)' : '#F9FAFB',
                    '&:hover': {
                      bgcolor: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6',
                    },
                  },
                  '&:hover': {
                    bgcolor: isDark ? 'rgba(255,255,255,0.06)' : '#F9FAFB',
                  },
                }}
              >
                {item.section === 'dashboard' ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                    <Typography component="span" sx={{ fontSize: '0.9375rem', color: '#71717A', mr: 0.5 }}>
                      Dashboard /
                    </Typography>
                    <Typography
                      component="span"
                      sx={{ fontSize: '0.9375rem', fontWeight: 500, color: 'text.primary' }}
                      noWrap
                    >
                      {getPortalLabel(portal, locale)}
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
                    <Box
                      component="span"
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 18,
                        height: 18,
                        color: 'text.primary',
                        flexShrink: 0,
                        '& svg': { width: 18, height: 18 },
                      }}
                    >
                      {item.icon}
                    </Box>
                    <Typography
                      component="span"
                      sx={{ fontSize: '0.9375rem', fontWeight: 500, color: 'text.primary' }}
                      noWrap
                    >
                      {item.label}
                    </Typography>
                  </Box>
                )}

                <Typography
                  component="span"
                  sx={{
                    fontSize: '0.875rem',
                    color: '#71717A',
                    flexShrink: 0,
                  }}
                >
                  {item.path}
                </Typography>
              </ListItemButton>
            ))}

            {visibleNavigation.length === 0 && (
              <Typography role="status" variant="body2" color="text.secondary" sx={{ px: 1.5, py: 2 }}>
                {t('No matching sections.')}
              </Typography>
            )}
          </List>
        </Box>

        <Box
          sx={{
            px: 2.5,
            py: 1.5,
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: isDark ? '#111827' : '#FCFCFD',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
              <Box
                component="span"
                sx={{
                  width: 22,
                  height: 22,
                  borderRadius: '5px',
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  display: 'inline-grid',
                  placeItems: 'center',
                  fontSize: '0.75rem',
                  color: 'text.secondary',
                }}
              >
                ↑
              </Box>
              <Box
                component="span"
                sx={{
                  width: 22,
                  height: 22,
                  borderRadius: '5px',
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  display: 'inline-grid',
                  placeItems: 'center',
                  fontSize: '0.75rem',
                  color: 'text.secondary',
                }}
              >
                ↓
              </Box>
              <Typography component="span" sx={{ fontSize: '0.8125rem', color: '#71717A', ml: 0.5 }}>
                {t('Navigate')}
              </Typography>
            </Box>

            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
              <Box
                component="span"
                sx={{
                  width: 22,
                  height: 22,
                  borderRadius: '5px',
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  display: 'inline-grid',
                  placeItems: 'center',
                  fontSize: '0.75rem',
                  color: 'text.secondary',
                }}
              >
                ↵
              </Box>
              <Typography component="span" sx={{ fontSize: '0.8125rem', color: '#71717A', ml: 0.5 }}>
                {t('Select')}
              </Typography>
            </Box>
          </Box>

          <Box
            component="button"
            type="button"
            onClick={() => setSearchModalOpen(false)}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.75,
              border: 0,
              bgcolor: 'transparent',
              p: 0,
              cursor: 'pointer',
              color: 'text.secondary',
            }}
          >
            <Box
              component="span"
              sx={{
                borderRadius: '5px',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                px: 0.875,
                py: 0.2,
                fontSize: '0.75rem',
                color: 'text.secondary',
              }}
            >
              ESC
            </Box>
            <Typography component="span" sx={{ fontSize: '0.8125rem', color: 'text.secondary', fontWeight: 500 }}>
              {t('Close')}
            </Typography>
          </Box>
        </Box>
      </Dialog>
    </Box>
  );
}
