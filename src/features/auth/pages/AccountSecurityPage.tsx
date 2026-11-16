import { Box, Stack, Typography } from '@mui/material';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import { useLocation, useSearchParams } from 'react-router-dom';
import { PORTAL_IDS, type PortalId } from '@/app/permissions/accessPolicy';
import InspectorOnboardingPage from '@/features/admin/pages/InspectorOnboardingPage';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { PageHeader } from '@/shared/ui/PageHeader';
import { useAuthStore } from '../store/authStore';
import { ProfileAccountTab } from '../components/profile/ProfileAccountTab';
import { ProfileNotificationTab } from '../components/profile/ProfileNotificationTab';
import { ProfileSecurityTab } from '../components/profile/ProfileSecurityTab';

type ProfileTab = 'account' | 'security' | 'notification' | 'pilot-profile';

function resolveTab(raw: string | null, isInspector: boolean): ProfileTab {
  if (raw === 'pilot-profile' && isInspector) return 'pilot-profile';
  if (raw === 'security' || raw === 'notification') return raw;
  return 'account';
}

export default function AccountSecurityPage() {
  const { locale, t } = useLocale();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isInspector = useAuthStore((state) =>
    Boolean(state.user?.roles.includes('INSPECTOR')),
  );
  const activeTab = resolveTab(searchParams.get('tab'), isInspector);

  const pathPortal = location.pathname.split('/').filter(Boolean)[0];
  const portal: PortalId =
    PORTAL_IDS.find((id) => id === pathPortal) ?? 'client';

  const selectTab = (tab: ProfileTab) => {
    const next = new URLSearchParams(searchParams);
    if (tab === 'account') {
      next.delete('tab');
    } else {
      next.set('tab', tab);
    }
    setSearchParams(next, { replace: false });
  };

  const navItems: Array<{
    key: ProfileTab;
    title: string;
    subtitle: string;
    icon: typeof PersonOutlineRoundedIcon;
  }> = [
    {
      key: 'account',
      title: locale === 'vi' ? 'Tài khoản' : 'Account',
      subtitle: locale === 'vi' ? 'Quản lý thông tin tài khoản' : 'Manage your personal data',
      icon: PersonOutlineRoundedIcon,
    },
    {
      key: 'security',
      title: locale === 'vi' ? 'Bảo mật' : 'Security',
      subtitle:
        locale === 'vi'
          ? 'Đổi mật khẩu và phiên đăng nhập'
          : 'Set your password, authentication & etc',
      icon: VerifiedUserOutlinedIcon,
    },
    {
      key: 'notification',
      title: locale === 'vi' ? 'Thông báo' : 'Notification',
      subtitle:
        locale === 'vi'
          ? 'Trạng thái thông báo quy trình'
          : 'Customize your notification preferences',
      icon: NotificationsNoneOutlinedIcon,
    },
  ];

  if (isInspector) {
    navItems.push({
      key: 'pilot-profile',
      title:
        locale === 'vi' ? 'Hồ sơ Phi công & Hợp đồng' : 'Pilot Profile & Contract',
      subtitle:
        locale === 'vi'
          ? 'Giấy phép bay và hợp đồng đối tác'
          : 'Pilot license and partner contract',
      icon: BadgeOutlinedIcon,
    });
  }

  return (
    <Box sx={{ maxWidth: 1440, mx: 'auto', p: { xs: 2, md: 3.5 } }}>
      <PageHeader
        title={locale === 'vi' ? 'Hồ sơ & Cài đặt' : 'Profile'}
        breadcrumbs={[
          { label: t('Home'), to: `/${portal}/dashboard` },
          { label: t('Settings') },
        ]}
      />

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '10px',
          bgcolor: 'background.paper',
          overflow: 'hidden',
        }}
      >
        {/* Left Profile Navigation Rail (NextAdmin style) */}
        <Box
          role="tablist"
          aria-label="Profile sections"
          sx={{
            width: { xs: '100%', md: 290 },
            flexShrink: 0,
            borderRight: { md: '1px solid' },
            borderBottom: { xs: '1px solid', md: 'none' },
            borderColor: 'divider',
            p: 2,
          }}
        >
          <Stack spacing={0.75}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isSelected = activeTab === item.key;

              return (
                <Box
                  key={item.key}
                  component="button"
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => selectTab(item.key)}
                  sx={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    p: 1.5,
                    border: 0,
                    borderRadius: '8px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    bgcolor: isSelected ? 'action.selected' : 'transparent',
                    color: 'text.primary',
                    '&:hover': {
                      bgcolor: isSelected ? 'action.selected' : 'action.hover',
                    },
                    '&:focus-visible': {
                      outline: '2px solid',
                      outlineColor: 'primary.main',
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 38,
                      height: 38,
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'background.paper',
                      display: 'grid',
                      placeItems: 'center',
                      color: isSelected ? 'primary.main' : 'text.secondary',
                      flexShrink: 0,
                    }}
                  >
                    <Icon fontSize="small" />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                      {item.title}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', lineHeight: 1.35 }}
                    >
                      {item.subtitle}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Stack>
        </Box>

        {/* Right Profile Content Area */}
        <Box sx={{ flex: 1, minWidth: 0, p: { xs: 2, sm: 3 } }}>
          {activeTab === 'account' && <ProfileAccountTab />}
          {activeTab === 'security' && <ProfileSecurityTab />}
          {activeTab === 'notification' && <ProfileNotificationTab />}
          {activeTab === 'pilot-profile' && isInspector && (
            <InspectorOnboardingPage embedded />
          )}
        </Box>
      </Box>
    </Box>
  );
}
