import { Alert, Box, Chip, Divider, Stack, Switch, Typography } from '@mui/material';
import { useLocale } from '@/shared/i18n/LocaleProvider';

export function ProfileNotificationTab() {
  const { locale } = useLocale();

  const items = [
    {
      key: 'workflow',
      title: locale === 'vi' ? 'Thông báo quy trình kiểm định' : 'Workflow & Lifecycle Notifications',
      description:
        locale === 'vi'
          ? 'Thông báo trong ứng dụng về yêu cầu dịch vụ, báo giá, hợp đồng và báo cáo kiểm định.'
          : 'In-app notifications for service requests, quotations, signed agreements, and inspection reports.',
      active: true,
    },
    {
      key: 'security',
      title: locale === 'vi' ? 'Cảnh báo bảo mật' : 'Security Alert',
      description:
        locale === 'vi'
          ? 'Thông báo liên quan đến thay đổi mật khẩu và thu hồi phiên đăng nhập.'
          : 'Important alerts for password changes and session revocations.',
      active: true,
    },
    {
      key: 'channels',
      title: locale === 'vi' ? 'Thông báo Email & Push' : 'Email & Push Notification Preferences',
      description:
        locale === 'vi'
          ? 'Tùy chọn bật/tắt theo từng kênh (Email, Push) chưa hỗ trợ cấu hình riêng trong phiên bản này.'
          : 'Per-channel email and push notification toggles are not configurable in this release.',
      active: false,
    },
  ];

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 3 },
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '10px',
        bgcolor: 'background.paper',
      }}
    >
      <Typography variant="h6" component="h2" sx={{ fontWeight: 700, mb: 1.5 }}>
        {locale === 'vi' ? 'Thông báo' : 'Notification'}
      </Typography>

      <Alert severity="info" sx={{ mb: 2, borderRadius: '8px' }}>
        {locale === 'vi'
          ? 'Thông báo hệ thống được gửi tự động theo quy trình nghiệp vụ và vai trò tài khoản (chỉ đọc).'
          : 'System notifications are delivered automatically according to workflow events and your role (read-only).'}
      </Alert>

      <Stack divider={<Divider />}>
        {items.map((item) => (
          <Stack
            key={item.key}
            direction="row"
            spacing={2}
            sx={{
              py: 2,
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {item.title}
                </Typography>
                <Chip
                  size="small"
                  variant="outlined"
                  color={item.active ? 'success' : 'default'}
                  label={
                    item.active
                      ? locale === 'vi'
                        ? 'Luôn bật'
                        : 'Always on'
                      : locale === 'vi'
                        ? 'Chưa khả dụng'
                        : 'Unavailable'
                  }
                  sx={{ height: 20, fontSize: '0.6875rem', fontWeight: 600, borderRadius: '6px' }}
                />
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {item.description}
              </Typography>
            </Box>

            <Switch
              checked={item.active}
              disabled
              slotProps={{ input: { 'aria-label': item.title } }}
              sx={{ flexShrink: 0 }}
            />
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
