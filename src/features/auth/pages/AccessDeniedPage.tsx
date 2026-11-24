import { useState } from 'react';
import { Alert, Box, Button, Container, Divider, Stack, Typography } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getPortalEntryPath } from '@/app/permissions/accessPolicy';
import { logoutCurrentSession } from '@/features/auth/api/authApi';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import LogoutIcon from '@mui/icons-material/Logout';

export default function AccessDeniedPage() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  const status = useAuthStore((s) => s.status);
  const roles = useAuthStore((s) => s.roles);
  const email = useAuthStore((s) => s.email);
  const userName = useAuthStore((s) => s.userName);
  const clearSession = useAuthStore((s) => s.clearSession);

  const isAuthenticated = status === 'authenticated' && roles.length > 0;
  const userPortalPath = isAuthenticated ? getPortalEntryPath(roles) : '/';
  const roleName = roles.includes('MANAGER')
    ? 'Manager'
    : roles.includes('ADMIN')
      ? 'Administrator'
      : roles.includes('CUSTOMER')
        ? 'Customer'
        : roles.includes('INSPECTOR')
          ? 'Inspector'
          : roles.join(', ') || 'Chưa xác định';

  const handleSignOut = async () => {
    setLoggingOut(true);
    try {
      await logoutCurrentSession();
    } catch {
      // Continue cleanup on failure
    } finally {
      clearSession();
      setLoggingOut(false);
      navigate('/login', { replace: true });
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 6, sm: 10 } }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="overline" color="warning.main" sx={{ fontWeight: 700, letterSpacing: 1.2 }}>
            403 · KHÔNG CÓ QUYỀN TRUY CẬP
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5 }}>
            {t('Workspace unavailable')}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            {t('Your account does not have a workspace or screen for this address.')}
          </Typography>
        </Box>

        {isAuthenticated && (
          <Box
            sx={{
              p: 2,
              borderRadius: 1,
              border: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 650 }}>
              Tài khoản đang đăng nhập trong phiên:
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 0.5 }}>
              {userName ? `${userName} (${email})` : email}
            </Typography>
            <Typography variant="body2" color="primary.main" sx={{ fontWeight: 600 }}>
              Vai trò: {roleName}
            </Typography>
          </Box>
        )}

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          {isAuthenticated && (
            <Button
              component={RouterLink}
              to={userPortalPath}
              variant="contained"
              endIcon={<ArrowForwardIcon />}
              sx={{ borderRadius: 1 }}
            >
              Vào không gian {roleName}
            </Button>
          )}

          {isAuthenticated ? (
            <Button
              variant="outlined"
              color="inherit"
              disabled={loggingOut}
              onClick={() => void handleSignOut()}
              startIcon={<LogoutIcon />}
              sx={{ borderRadius: 1 }}
            >
              {loggingOut ? 'Đang đăng xuất...' : 'Đăng xuất tài khoản'}
            </Button>
          ) : (
            <Button
              component={RouterLink}
              to="/login"
              variant="contained"
              sx={{ borderRadius: 1 }}
            >
              Đăng nhập lại
            </Button>
          )}
        </Stack>

        <Divider />

        <Alert severity="info" variant="outlined" sx={{ borderRadius: 1, fontSize: '0.8125rem' }}>
          <strong>Lưu ý khi kiểm thử nhiều vai trò:</strong> Các tab ẩn danh (Incognito) trong cùng một trình duyệt dùng chung một bộ lưu trữ Cookie. Khi đăng nhập vai trò mới ở tab 2, phiên của tab 1 sẽ bị ghi đè khi tải lại (F5).
          <br />
          👉 <em>Giải pháp:</em> Hãy mở <strong>1 tab thường + 1 tab ẩn danh</strong>, hoặc dùng <strong>2 trình duyệt khác nhau</strong> (ví dụ: Google Chrome cho Customer, Microsoft Edge cho Manager) để kiểm thử song song mượt mà nhất.
        </Alert>
      </Stack>
    </Container>
  );
}
