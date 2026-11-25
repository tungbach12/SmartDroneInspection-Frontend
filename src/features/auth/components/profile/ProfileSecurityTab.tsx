import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Box,
  Button,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DevicesOutlinedIcon from '@mui/icons-material/DevicesOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { clearNotificationCache } from '@/features/notifications/hooks/useNotifications';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import {
  changePassword,
  getAuthErrorMessage,
  logoutAllSessions,
  logoutCurrentSession,
} from '../../api/authApi';
import {
  passwordChangeSchema,
  type PasswordChangeFormValues,
} from '../../schemas/authSchemas';
import { useAuthStore } from '../../store/authStore';

export function ProfileSecurityTab() {
  const { locale, t } = useLocale();
  const clearSession = useAuthStore((state) => state.clearSession);
  const roles = useAuthStore((state) => state.roles);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const loginPath =
    roles.includes('INSPECTOR') &&
    !roles.some((r) => ['CUSTOMER', 'ADMIN', 'MANAGER'].includes(r))
      ? '/inspector/login'
      : '/login';

  const [passwordFormOpen, setPasswordFormOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [signingOutSession, setSigningOutSession] = useState(false);

  const form = useForm<PasswordChangeFormValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onChangePassword = async (values: PasswordChangeFormValues) => {
    setErrorMessage(null);
    try {
      await changePassword(values.currentPassword, values.newPassword);
      clearSession();
      navigate(`${loginPath}?passwordChanged=1`, { replace: true });
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error));
    }
  };

  const handleSignOutCurrentSession = async () => {
    setErrorMessage(null);
    setSigningOutSession(true);
    try {
      await logoutCurrentSession();
      clearNotificationCache(queryClient);
      clearSession();
      navigate(loginPath, { replace: true });
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error));
    } finally {
      setSigningOutSession(false);
    }
  };

  const onLogoutAll = async () => {
    setErrorMessage(null);
    try {
      await logoutAllSessions();
      clearNotificationCache(queryClient);
      clearSession();
      navigate(loginPath, { replace: true });
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error));
    } finally {
      setLogoutDialogOpen(false);
    }
  };

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
      <Typography variant="h6" component="h2" sx={{ fontWeight: 700, mb: 2 }}>
        {locale === 'vi' ? 'Bảo mật' : 'Security'}
      </Typography>

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: '8px' }}>
          {errorMessage}
        </Alert>
      )}

      <Stack divider={<Divider />}>
        {/* Row 1: Change Password */}
        <Box sx={{ py: 2 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
          >
            <Stack direction="row" spacing={1.75} sx={{ alignItems: 'center', minWidth: 0 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.default',
                  display: 'grid',
                  placeItems: 'center',
                  color: 'text.secondary',
                  flexShrink: 0,
                }}
              >
                <LockOutlinedIcon fontSize="small" />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {locale === 'vi' ? 'Mật khẩu hiện tại' : 'Current Password'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('Change your account password to keep your profile secure')}
                </Typography>
              </Box>
            </Stack>

            <Button
              size="small"
              variant="text"
              onClick={() => setPasswordFormOpen((prev) => !prev)}
              sx={{
                alignSelf: { xs: 'flex-start', sm: 'center' },
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: '8px',
                flexShrink: 0,
              }}
            >
              {passwordFormOpen
                ? t('Cancel')
                : locale === 'vi'
                  ? 'Thay đổi'
                  : 'Change'}
            </Button>
          </Stack>

          <Collapse in={passwordFormOpen}>
            <Box
              component="form"
              onSubmit={form.handleSubmit(onChangePassword)}
              noValidate
              sx={{
                mt: 2,
                p: 2,
                borderRadius: '8px',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.default',
              }}
            >
              <Stack spacing={1.75}>
                <Typography variant="caption" color="text.secondary">
                  {t('Choose 15–128 characters. Common passwords and account details are rejected.')}
                </Typography>
                <TextField
                  {...form.register('currentPassword')}
                  label={t('Current password')}
                  type="password"
                  autoComplete="current-password"
                  size="small"
                  fullWidth
                  error={Boolean(form.formState.errors.currentPassword)}
                  helperText={form.formState.errors.currentPassword?.message}
                />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <TextField
                    {...form.register('newPassword')}
                    label={t('New password')}
                    type="password"
                    autoComplete="new-password"
                    size="small"
                    fullWidth
                    error={Boolean(form.formState.errors.newPassword)}
                    helperText={form.formState.errors.newPassword?.message}
                  />
                  <TextField
                    {...form.register('confirmPassword')}
                    label={t('Confirm new password')}
                    type="password"
                    autoComplete="new-password"
                    size="small"
                    fullWidth
                    error={Boolean(form.formState.errors.confirmPassword)}
                    helperText={form.formState.errors.confirmPassword?.message}
                  />
                </Stack>
                <Box>
                  <Button
                    type="submit"
                    variant="contained"
                    size="small"
                    disabled={form.formState.isSubmitting}
                    sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 700, boxShadow: 'none' }}
                  >
                    {form.formState.isSubmitting ? t('Updating…') : t('Update password')}
                  </Button>
                </Box>
              </Stack>
            </Box>
          </Collapse>
        </Box>

        {/* Row 2: Active Session */}
        <Box sx={{ py: 2 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
          >
            <Stack direction="row" spacing={1.75} sx={{ alignItems: 'center', minWidth: 0 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.default',
                  display: 'grid',
                  placeItems: 'center',
                  color: 'text.secondary',
                  flexShrink: 0,
                }}
              >
                <DevicesOutlinedIcon fontSize="small" />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {locale === 'vi' ? 'Phiên đăng nhập hiện tại' : 'Active Session'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {locale === 'vi'
                    ? 'Đăng xuất khỏi trình duyệt đang sử dụng.'
                    : 'Sign out from this browser session.'}
                </Typography>
              </Box>
            </Stack>

            <Button
              size="small"
              variant="text"
              disabled={signingOutSession}
              onClick={handleSignOutCurrentSession}
              sx={{
                alignSelf: { xs: 'flex-start', sm: 'center' },
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: '8px',
                flexShrink: 0,
              }}
            >
              {signingOutSession
                ? locale === 'vi'
                  ? 'Đang đăng xuất…'
                  : 'Signing out…'
                : locale === 'vi'
                  ? 'Đăng xuất'
                  : t('Sign out')}
            </Button>
          </Stack>
        </Box>

        {/* Row 3: Sign out everywhere */}
        <Box sx={{ py: 2 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
          >
            <Stack direction="row" spacing={1.75} sx={{ alignItems: 'center', minWidth: 0 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.default',
                  display: 'grid',
                  placeItems: 'center',
                  color: 'error.main',
                  flexShrink: 0,
                }}
              >
                <LogoutRoundedIcon fontSize="small" />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {t('Sign out everywhere')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('Revoke all active sessions for this account, including this one.')}
                </Typography>
              </Box>
            </Stack>

            <Button
              size="small"
              color="error"
              variant="text"
              onClick={() => setLogoutDialogOpen(true)}
              sx={{
                alignSelf: { xs: 'flex-start', sm: 'center' },
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: '8px',
                flexShrink: 0,
              }}
            >
              {t('Sign out everywhere')}
            </Button>
          </Stack>
        </Box>
      </Stack>

      <Dialog
        open={logoutDialogOpen}
        onClose={() => setLogoutDialogOpen(false)}
        aria-labelledby="logout-all-title"
      >
        <DialogTitle id="logout-all-title">{t('Sign out on every device?')}</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            {t('This revokes all active sessions. You will need to sign in again.')}
          </Typography>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setLogoutDialogOpen(false)}>{t('Cancel')}</Button>
          <Button color="error" variant="contained" onClick={onLogoutAll} sx={{ boxShadow: 'none' }}>
            {t('Sign out everywhere')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
