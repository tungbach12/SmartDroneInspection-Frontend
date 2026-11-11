import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import CloudUploadOutlined from '@mui/icons-material/CloudUploadOutlined';
import LogoutRounded from '@mui/icons-material/LogoutRounded';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { pilotLicenseClassApi } from '../api/pilotLicenseClassApi';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import {
  getAuthErrorMessage,
  changePassword,
  logoutCurrentSession,
  logoutAllSessions,
  updateVisionFallbackPreference,
  updatePilotLicense,
  updateAvatar,
} from '../api/authApi';
import {
  passwordChangeSchema,
  type PasswordChangeFormValues,
} from '../schemas/authSchemas';
import { useAuthStore } from '../store/authStore';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { useColorMode, useIsDarkMode } from '@/app/layouts/ColorModeContext';
import { clearNotificationCache } from '@/features/notifications/hooks/useNotifications';
import { NextAdminMoonIcon, NextAdminSunIcon } from '@/shared/ui/NextAdminIcons';

export default function AccountSecurityPage() {
  const { locale, setLocale, t } = useLocale();
  const { toggle: toggleColorMode } = useColorMode();
  const isDark = useIsDarkMode();
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [signingOutSession, setSigningOutSession] = useState(false);
  const [preferenceError, setPreferenceError] = useState<string | null>(null);
  const [preferencePending, setPreferencePending] = useState(false);
  const visionFallbackEnabled = user?.visionFallbackEnabled ?? true;
  const licenseClassesQuery = useQuery({
    queryKey: ['pilot-license-classes', 'active'],
    queryFn: pilotLicenseClassApi.listActive,
    staleTime: 60_000,
  });

  const [licenseNumber, setLicenseNumber] = useState(user?.pilotLicenseNumber ?? '');
  const [licenseClass, setLicenseClass] = useState(user?.pilotLicenseClass ?? '');
  const [licenseExpiresAt, setLicenseExpiresAt] = useState(
    user?.pilotLicenseExpiresAt ? user.pilotLicenseExpiresAt.split('T')[0] : '',
  );
  const [licensePending, setLicensePending] = useState(false);
  const [licenseError, setLicenseError] = useState<string | null>(null);
  const [licenseSuccess, setLicenseSuccess] = useState<string | null>(null);
  const [avatarPending, setAvatarPending] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarSuccess, setAvatarSuccess] = useState<string | null>(null);

  const onAvatarSelected = async (file: File | undefined) => {
    if (!file) return;
    setAvatarError(null);
    setAvatarSuccess(null);
    if (!file.type.startsWith('image/')) {
      setAvatarError(t('Please select an image file.'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError(t('Image must be 5 MB or smaller.'));
      return;
    }

    setAvatarPending(true);
    try {
      const avatarUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read image.'));
        reader.onerror = () => reject(new Error('Could not read image.'));
        reader.readAsDataURL(file);
      });
      const updated = await updateAvatar(avatarUrl);
      useAuthStore.getState().setUser(updated);
      setAvatarSuccess(t('Profile photo updated successfully.'));
    } catch (error) {
      setAvatarError(getAuthErrorMessage(error));
    } finally {
      setAvatarPending(false);
    }
  };

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
      navigate('/login?passwordChanged=1', { replace: true });
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
      navigate('/login', { replace: true });
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
      navigate('/login', { replace: true });
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error));
    } finally {
      setLogoutDialogOpen(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 760, mx: 'auto', py: { xs: 2, md: 4 } }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="overline" color="primary" sx={{ fontWeight: 800 }}>
            {t('Account')}
          </Typography>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 800 }}>
            {t('Security and sign-in')}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            {t('Manage your password and active sessions. Changing your password signs out all existing sessions.')}
          </Typography>
        </Box>

        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

        {/* Signed-in Account Info */}
        <Box
          sx={{
            p: { xs: 2, sm: 3 },
            border: 1,
            borderColor: 'divider',
            borderRadius: '12px',
            bgcolor: 'background.paper',
          }}
        >
          <Stack spacing={2}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {t('Signed-in account')}
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} sx={{ alignItems: { sm: 'center' } }}>
              <Avatar
                src={user?.avatarUrl ?? undefined}
                alt={user?.fullName ?? 'User'}
                sx={{
                  width: 72,
                  height: 72,
                  bgcolor: 'primary.main',
                  fontSize: 24,
                  fontWeight: 700,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                }}
              >
                {user?.fullName?.trim().charAt(0).toUpperCase()}
              </Avatar>
              <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 600, fontSize: 16 }}>{user?.fullName}</Typography>
                <Typography color="text.secondary" variant="body2">{user?.email}</Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', pt: 0.5 }}>
                  {user?.roles.map((role) => (
                    <Chip key={role} label={role.replaceAll('_', ' ')} size="small" />
                  ))}
                </Stack>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  component="label"
                  disabled={avatarPending}
                  startIcon={<CloudUploadOutlined />}
                  size="small"
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                  {avatarPending ? t('Updating…') : t('Change photo')}
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      void onAvatarSelected(file);
                      e.target.value = '';
                    }}
                  />
                </Button>
                <Button
                  variant="contained"
                  disabled={signingOutSession}
                  onClick={handleSignOutCurrentSession}
                  startIcon={<LogoutRounded />}
                  size="small"
                  sx={{
                    bgcolor: '#3758F9',
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': { bgcolor: '#463FD8' },
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
            </Stack>
            {avatarError && <Alert severity="error">{avatarError}</Alert>}
            {avatarSuccess && <Alert severity="success">{avatarSuccess}</Alert>}
          </Stack>
        </Box>

        {/* Language and Regional Settings */}
        <Box
          sx={{
            p: { xs: 2, sm: 3 },
            border: 1,
            borderColor: 'divider',
            borderRadius: '12px',
            bgcolor: 'background.paper',
          }}
        >
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>
                {t('Language & display')}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {t('Choose your preferred language and color theme for the application interface.')}
              </Typography>
            </Box>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
            >
              <FormControl size="small" sx={{ minWidth: 240 }}>
                <InputLabel id="account-language-select-label">{t('Language')}</InputLabel>
                <Select
                  labelId="account-language-select-label"
                  id="account-language-select"
                  value={locale}
                  label={t('Language')}
                  onChange={(e) => setLocale(e.target.value === 'vi' ? 'vi' : 'en')}
                >
                  <MenuItem value="vi">🇻🇳 Tiếng Việt (Vietnamese)</MenuItem>
                  <MenuItem value="en">🇺🇸 English (Tiếng Anh)</MenuItem>
                </Select>
              </FormControl>
              <Chip
                color={locale === 'vi' ? 'primary' : 'default'}
                variant="outlined"
                label={locale === 'vi' ? 'Đang sử dụng: Tiếng Việt' : 'Active: English'}
                sx={{ fontWeight: 600, alignSelf: { xs: 'flex-start', sm: 'center' } }}
              />
            </Stack>

            <Divider />

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
            >
              <Box>
                <Typography sx={{ fontWeight: 600, fontSize: '0.9375rem', color: 'text.primary' }}>
                  {locale === 'vi' ? 'Chế độ giao diện (Sáng / Tối)' : 'Appearance (Light / Dark mode)'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {isDark
                    ? locale === 'vi'
                      ? 'Đang bật giao diện tối (Dark mode).'
                      : 'Dark mode is currently active.'
                    : locale === 'vi'
                      ? 'Đang bật giao diện sáng (Light mode).'
                      : 'Light mode is currently active.'}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Button
                  variant={!isDark ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => {
                    if (isDark) toggleColorMode();
                  }}
                  startIcon={<NextAdminSunIcon />}
                  aria-label="Use light mode"
                  sx={{
                    borderRadius: '8px',
                    textTransform: 'none',
                    fontWeight: 600,
                    px: 1.75,
                  }}
                >
                  {locale === 'vi' ? 'Sáng (Light)' : 'Light'}
                </Button>
                <Button
                  variant={isDark ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => {
                    if (!isDark) toggleColorMode();
                  }}
                  startIcon={<NextAdminMoonIcon />}
                  aria-label="Use dark mode"
                  sx={{
                    borderRadius: '8px',
                    textTransform: 'none',
                    fontWeight: 600,
                    px: 1.75,
                  }}
                >
                  {locale === 'vi' ? 'Tối (Dark)' : 'Dark'}
                </Button>
              </Stack>
            </Stack>
          </Stack>
        </Box>

        {user?.roles.includes('INSPECTOR') && (
          <Box
            sx={{
              p: { xs: 2, sm: 3 },
              border: 1,
              borderColor: 'divider',
              borderRadius: '12px',
              bgcolor: 'background.paper',
            }}
          >
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setLicenseError(null);
                setLicenseSuccess(null);
                setLicensePending(true);
                try {
                  const updated = await updatePilotLicense({
                    pilotLicenseNumber: licenseNumber.trim(),
                    pilotLicenseClass: licenseClass.trim() || undefined,
                    pilotLicenseExpiresAt: licenseExpiresAt ? new Date(licenseExpiresAt).toISOString() : undefined,
                  });
                  useAuthStore.getState().setUser(updated);
                  setLicenseSuccess(t('Pilot license updated successfully.'));
                } catch (error) {
                  setLicenseError(getAuthErrorMessage(error));
                } finally {
                  setLicensePending(false);
                }
              }}
            >
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {t('Pilot license self-declaration')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {t('Self-declare your remote pilot license details required to perform drone inspections.')}
                    </Typography>
                  </Box>
                  {user?.pilotLicenseExpiresAt && (() => {
                    const expiry = new Date(user.pilotLicenseExpiresAt);
                    const now = new Date();
                    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    if (diffDays <= 0) {
                      return <Chip label={`Bằng lái ĐÃ HẾT HẠN (${expiry.toLocaleDateString('vi-VN')})`} color="error" sx={{ fontWeight: 700 }} />;
                    }
                    if (diffDays <= 60) {
                      return <Chip label={`Bằng lái SẮP HẾT HẠN (còn ${diffDays} ngày)`} color="warning" sx={{ fontWeight: 700 }} />;
                    }
                    return <Chip label={`Bằng lái CÒN HIỆU LỰC (còn ${diffDays} ngày)`} color="success" sx={{ fontWeight: 700 }} />;
                  })()}
                </Box>
                {licenseError && <Alert severity="error">{licenseError}</Alert>}
                {licenseSuccess && <Alert severity="success">{licenseSuccess}</Alert>}
                {user?.pilotLicenseExpiresAt && (() => {
                  const expiry = new Date(user.pilotLicenseExpiresAt);
                  const now = new Date();
                  const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  if (diffDays <= 0) {
                    return (
                      <Alert severity="error" sx={{ borderRadius: 2 }}>
                        <strong>Cảnh báo an toàn bay:</strong> Bằng lái phi công của bạn đã hết hạn. Hệ thống sẽ tạm khóa điều kiện phân công bay thực địa cho đến khi bạn cập nhật chứng chỉ bay mới.
                      </Alert>
                    );
                  }
                  if (diffDays <= 60) {
                    return (
                      <Alert severity="warning" sx={{ borderRadius: 2 }}>
                        <strong>Thông báo gia hạn:</strong> Bằng lái phi công của bạn sẽ hết hạn sau {diffDays} ngày nữa ({expiry.toLocaleDateString('vi-VN')}). Vui lòng gia hạn chứng chỉ sớm.
                      </Alert>
                    );
                  }
                  return null;
                })()}
                <TextField
                  label={t('License number')}
                  required
                  size="small"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="e.g. RPL-VN-2026-0042"
                />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    select
                    label={t('License class')}
                    size="small"
                    fullWidth
                    value={licenseClass}
                    onChange={(e) => setLicenseClass(e.target.value)}
                    disabled={licenseClassesQuery.isLoading || licenseClassesQuery.isError}
                    helperText={licenseClassesQuery.isError ? t('Could not load license classes.') : undefined}
                  >
                    <MenuItem value=""><em>{t('No class selected')}</em></MenuItem>
                    {licenseClassesQuery.data?.map((item) => (
                      <MenuItem key={item.id} value={item.name}>{item.name}</MenuItem>
                    ))}
                    {licenseClass && !licenseClassesQuery.data?.some((item) => item.name === licenseClass) && (
                      <MenuItem value={licenseClass}>{licenseClass} ({t('Inactive')})</MenuItem>
                    )}
                  </TextField>
                  <TextField
                    type="date"
                    label={t('Expiry date')}
                    size="small"
                    fullWidth
                    value={licenseExpiresAt}
                    onChange={(e) => setLicenseExpiresAt(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Stack>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={licensePending || !licenseNumber.trim()}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  {licensePending ? t('Saving…') : t('Save pilot license')}
                </Button>
              </Stack>
            </form>
          </Box>
        )}

        {user?.roles.includes('INSPECTOR') && (
          <Box
            sx={{
              p: { xs: 2, sm: 3 },
              border: 1,
              borderColor: 'divider',
              borderRadius: '12px',
              bgcolor: 'background.paper',
            }}
          >
            <Stack spacing={2}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {t('Quản lý Drone & Hồ sơ kiểm định')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {t(
                    'Bổ sung drone, khai báo thông số kỹ thuật và tải lên hình ảnh giấy đăng ký, giấy tờ sở hữu và giấy kiểm định để Manager thẩm định.',
                  )}
                </Typography>
              </Box>
              <Button
                variant="contained"
                onClick={() => navigate('/operations/inspector-drones')}
                sx={{
                  alignSelf: 'flex-start',
                  bgcolor: '#3758F9',
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': { bgcolor: '#2b45cb' },
                }}
              >
                {t('Khai báo & Tải giấy tờ Drone')}
              </Button>
            </Stack>
          </Box>
        )}

        {user?.roles.includes('INSPECTOR') && (
          <Box
            sx={{
              p: { xs: 2, sm: 3 },
              border: 1,
              borderColor: 'divider',
              borderRadius: '12px',
              bgcolor: 'background.paper',
            }}
          >
            <Stack spacing={1.5}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>{t('AI analysis fallback')}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {t('When YOLO is unavailable, automatically try the configured vision model. A valid YOLO result with no detections never triggers fallback.')}
                </Typography>
              </Box>
              {preferenceError && <Alert severity="error">{preferenceError}</Alert>}
              <FormControlLabel
                control={
                  <Switch
                    checked={visionFallbackEnabled}
                    disabled={preferencePending}
                    onChange={async (_event, checked) => {
                      setPreferencePending(true);
                      setPreferenceError(null);
                      try {
                        const updated = await updateVisionFallbackPreference(checked);
                        useAuthStore.getState().setSession({
                          accessToken: useAuthStore.getState().accessToken!,
                          user: updated,
                        });
                      } catch (error) {
                        setPreferenceError(getAuthErrorMessage(error));
                      } finally {
                        setPreferencePending(false);
                      }
                    }}
                  />
                }
                label={visionFallbackEnabled ? t('Fallback enabled') : t('Fallback disabled')}
              />
            </Stack>
          </Box>
        )}

        <Box
          component="form"
          onSubmit={form.handleSubmit(onChangePassword)}
          noValidate
          sx={{
            p: { xs: 2, sm: 3 },
            border: 1,
            borderColor: 'divider',
            borderRadius: '12px',
            bgcolor: 'background.paper',
          }}
        >
          <Stack spacing={2}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {t('Change password')}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {t('Choose 15–128 characters. Common passwords and account details are rejected.')}
              </Typography>
            </Box>
            <TextField
              {...form.register('currentPassword')}
              label={t('Current password')}
              type="password"
              autoComplete="current-password"
              fullWidth
              error={Boolean(form.formState.errors.currentPassword)}
              helperText={form.formState.errors.currentPassword?.message}
            />
            <TextField
              {...form.register('newPassword')}
              label={t('New password')}
              type="password"
              autoComplete="new-password"
              fullWidth
              error={Boolean(form.formState.errors.newPassword)}
              helperText={form.formState.errors.newPassword?.message}
            />
            <TextField
              {...form.register('confirmPassword')}
              label={t('Confirm new password')}
              type="password"
              autoComplete="new-password"
              fullWidth
              error={Boolean(form.formState.errors.confirmPassword)}
              helperText={form.formState.errors.confirmPassword?.message}
            />
            <Button
              type="submit"
              variant="contained"
              disabled={form.formState.isSubmitting}
              sx={{ alignSelf: 'flex-start', minWidth: 170 }}
            >
              {form.formState.isSubmitting ? t('Updating…') : t('Update password')}
            </Button>
          </Stack>
        </Box>

        <Box
          sx={{
            p: { xs: 2, sm: 3 },
            border: 1,
            borderColor: 'divider',
            borderRadius: '12px',
            bgcolor: 'background.paper',
          }}
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{
              alignItems: { xs: 'stretch', sm: 'center' },
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {t('Sign out everywhere')}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {t('Revoke all active sessions for this account, including this one.')}
              </Typography>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ flexShrink: 0 }}>
              <Button
                variant="contained"
                disabled={signingOutSession}
                onClick={handleSignOutCurrentSession}
                startIcon={<LogoutRounded />}
                sx={{
                  bgcolor: '#3758F9',
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': { bgcolor: '#463FD8' },
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
              <Button
                color="error"
                variant="outlined"
                onClick={() => setLogoutDialogOpen(true)}
                sx={{ flexShrink: 0 }}
              >
                {t('Sign out everywhere')}
              </Button>
            </Stack>
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
          <Button color="error" variant="contained" onClick={onLogoutAll}>
            {t('Sign out everywhere')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
