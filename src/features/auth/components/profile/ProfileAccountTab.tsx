import { useState, type FormEvent } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
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
import { useNavigate } from 'react-router-dom';
import { useColorMode, useIsDarkMode } from '@/app/layouts/ColorModeContext';
import { ThemeCustomizationPanel } from '@/app/theme/ThemeCustomizationPanel';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { NextAdminMoonIcon, NextAdminSunIcon } from '@/shared/ui/NextAdminIcons';
import {
  getAuthErrorMessage,
  updateAvatar,
  updatePilotLicense,
  updateProfile,
  updateVisionFallbackPreference,
} from '../../api/authApi';
import { InspectorPayoutBankCard } from './InspectorPayoutBankCard';
import { profileUpdateSchema } from '../../schemas/authSchemas';
import { useAuthStore } from '../../store/authStore';

export function ProfileAccountTab() {
  const { locale, setLocale, t } = useLocale();
  const { toggle: toggleColorMode } = useColorMode();
  const isDark = useIsDarkMode();
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  const [avatarPending, setAvatarPending] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarSuccess, setAvatarSuccess] = useState<string | null>(null);

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber ?? '');
  const [profilePending, setProfilePending] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  const [preferenceError, setPreferenceError] = useState<string | null>(null);
  const [preferencePending, setPreferencePending] = useState(false);
  const visionFallbackEnabled = user?.visionFallbackEnabled ?? true;

  const [licenseNumber, setLicenseNumber] = useState(user?.pilotLicenseNumber ?? '');
  const [licenseClass, setLicenseClass] = useState(user?.pilotLicenseClass ?? '');
  const [licenseExpiresAt, setLicenseExpiresAt] = useState(
    user?.pilotLicenseExpiresAt ? user.pilotLicenseExpiresAt.split('T')[0] : '',
  );
  const [licensePending, setLicensePending] = useState(false);
  const [licenseError, setLicenseError] = useState<string | null>(null);
  const [licenseSuccess, setLicenseSuccess] = useState<string | null>(null);

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
        reader.onload = () =>
          typeof reader.result === 'string'
            ? resolve(reader.result)
            : reject(new Error('Could not read image.'));
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

  const onRemoveAvatar = async () => {
    setAvatarError(null);
    setAvatarSuccess(null);
    setAvatarPending(true);
    try {
      const updated = await updateAvatar('');
      useAuthStore.getState().setUser(updated);
      setAvatarSuccess(
        locale === 'vi' ? 'Đã xóa ảnh đại diện.' : 'Profile photo removed.',
      );
    } catch (error) {
      setAvatarError(getAuthErrorMessage(error));
    } finally {
      setAvatarPending(false);
    }
  };

  const onSaveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);
    const parsed = profileUpdateSchema.safeParse({ fullName, phoneNumber });
    if (!parsed.success) {
      setProfileError(parsed.error.issues[0]?.message ?? t('Please check your profile details.'));
      return;
    }

    setProfilePending(true);
    try {
      const updated = await updateProfile(parsed.data);
      useAuthStore.getState().setUser(updated);
      setFullName(updated.fullName);
      setPhoneNumber(updated.phoneNumber ?? '');
      setProfileSuccess(locale === 'vi' ? 'Đã lưu thông tin tài khoản.' : 'Profile changes saved.');
    } catch (error) {
      setProfileError(getAuthErrorMessage(error));
    } finally {
      setProfilePending(false);
    }
  };

  return (
    <Stack spacing={2.5}>
      {/* Account Details Panel (profile edits persist through the authenticated users API) */}
      <Box
        sx={{
          p: { xs: 2, sm: 3 },
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '10px',
          bgcolor: 'background.paper',
        }}
      >
        <form onSubmit={onSaveProfile}>
          <Stack spacing={2.5}>
          <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>
            {locale === 'vi' ? 'Thông tin tài khoản' : 'Account Details'}
          </Typography>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ alignItems: { sm: 'center' } }}
          >
            <Avatar
              src={user?.avatarUrl ?? undefined}
              alt={user?.fullName ?? 'User'}
              sx={{
                width: 64,
                height: 64,
                bgcolor: 'primary.main',
                fontSize: 22,
                fontWeight: 700,
              }}
            >
              {user?.fullName?.trim().charAt(0).toUpperCase() || 'U'}
            </Avatar>
            <Stack spacing={0.75}>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
                <Button
                  type="button"
                  variant="outlined"
                  component="label"
                  disabled={avatarPending}
                  startIcon={<CloudUploadOutlined />}
                  size="small"
                  sx={{
                    borderRadius: '8px',
                    textTransform: 'none',
                    fontWeight: 600,
                    borderColor: 'divider',
                    color: 'text.primary',
                  }}
                >
                  {avatarPending ? t('Updating…') : locale === 'vi' ? 'Đổi ảnh đại diện' : 'Change Avatar'}
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
                {user?.avatarUrl && (
                  <Button
                    type="button"
                    variant="outlined"
                    color="error"
                    size="small"
                    disabled={avatarPending}
                    onClick={() => void onRemoveAvatar()}
                    sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                  >
                    {locale === 'vi' ? 'Xóa ảnh' : 'Remove'}
                  </Button>
                )}
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {locale === 'vi'
                  ? 'Hỗ trợ PNG, JPEG, WEBP; dung lượng tối đa 5 MB.'
                  : 'Accepts PNG, JPEG, WEBP; max size 5MB.'}
              </Typography>
            </Stack>
          </Stack>

          {avatarError && <Alert severity="error" sx={{ borderRadius: '8px' }}>{avatarError}</Alert>}
          {avatarSuccess && <Alert severity="success" sx={{ borderRadius: '8px' }}>{avatarSuccess}</Alert>}
          {profileError && <Alert severity="error" sx={{ borderRadius: '8px' }}>{t(profileError)}</Alert>}
          {profileSuccess && <Alert severity="success" sx={{ borderRadius: '8px' }}>{profileSuccess}</Alert>}

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 2,
            }}
          >
            <TextField
              label={locale === 'vi' ? 'Họ và tên' : 'Full Name'}
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              size="small"
              required
              slotProps={{ htmlInput: { maxLength: 200 } }}
              fullWidth
            />
            <TextField
              label={locale === 'vi' ? 'Địa chỉ email' : 'Email address'}
              value={user?.email ?? ''}
              size="small"
              slotProps={{ input: { readOnly: true } }}
              fullWidth
            />
            <TextField
              label={locale === 'vi' ? 'Số điện thoại' : 'Phone Number'}
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              placeholder={locale === 'vi' ? 'Chưa cung cấp' : 'Not provided'}
              size="small"
              slotProps={{ htmlInput: { maxLength: 32 } }}
              fullWidth
            />
            <TextField
              label={locale === 'vi' ? 'Vai trò' : 'Role'}
              value={(user?.roles ?? []).map((r) => r.replaceAll('_', ' ')).join(', ')}
              size="small"
              slotProps={{ input: { readOnly: true } }}
              fullWidth
            />
          </Box>

          <Typography variant="caption" color="text.secondary">
            {locale === 'vi'
              ? 'Email và vai trò chỉ đọc; họ tên và số điện thoại được lưu vào hồ sơ tài khoản.'
              : 'Email and role are read-only; your name and phone number are saved to your account profile.'}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
            <Button
              type="button"
              variant="outlined"
              disabled={profilePending}
              onClick={() => {
                setFullName(user?.fullName ?? '');
                setPhoneNumber(user?.phoneNumber ?? '');
                setProfileError(null);
                setProfileSuccess(null);
              }}
              sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
            >
              {locale === 'vi' ? 'Hủy' : 'Cancel'}
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={profilePending}
              sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, boxShadow: 'none' }}
            >
              {profilePending ? t('Saving…') : locale === 'vi' ? 'Lưu thay đổi' : 'Save Changes'}
            </Button>
          </Stack>
          </Stack>
        </form>
      </Box>

      {/* Language & Display Preferences */}
      <Box
        sx={{
          p: { xs: 2, sm: 3 },
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '10px',
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
                <MenuItem value="vi">Tiếng Việt (Vietnamese)</MenuItem>
                <MenuItem value="en">English (Tiếng Anh)</MenuItem>
              </Select>
            </FormControl>
            <Chip
              color={locale === 'vi' ? 'primary' : 'default'}
              variant="outlined"
              label={locale === 'vi' ? 'Đang sử dụng: Tiếng Việt' : 'Active: English'}
              sx={{ fontWeight: 600, borderRadius: '6px', alignSelf: { xs: 'flex-start', sm: 'center' } }}
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
                  boxShadow: 'none',
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
                  boxShadow: 'none',
                }}
              >
                {locale === 'vi' ? 'Tối (Dark)' : 'Dark'}
              </Button>
            </Stack>
          </Stack>

          <Divider />

          <ThemeCustomizationPanel />
        </Stack>
      </Box>

      {/* Inspector-only controls preserved identically */}
      {user?.roles.includes('INSPECTOR') && (
        <>
          <InspectorPayoutBankCard />

          <Box
            sx={{
              p: { xs: 2, sm: 3 },
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: '10px',
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
                    pilotLicenseExpiresAt: licenseExpiresAt
                      ? new Date(licenseExpiresAt).toISOString()
                      : undefined,
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
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: 1,
                  }}
                >
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {t('Pilot license self-declaration')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {t('Self-declare your remote pilot license details required to perform drone inspections.')}
                    </Typography>
                  </Box>
                  {user?.pilotLicenseExpiresAt &&
                    (() => {
                      const expiry = new Date(user.pilotLicenseExpiresAt);
                      const now = new Date();
                      const diffDays = Math.ceil(
                        (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
                      );
                      if (diffDays <= 0) {
                        return (
                          <Chip
                            label={`Bằng lái ĐÃ HẾT HẠN (${expiry.toLocaleDateString('vi-VN')})`}
                            color="error"
                            sx={{ fontWeight: 700, borderRadius: '6px' }}
                          />
                        );
                      }
                      if (diffDays <= 60) {
                        return (
                          <Chip
                            label={`Bằng lái SẮP HẾT HẠN (còn ${diffDays} ngày)`}
                            color="warning"
                            sx={{ fontWeight: 700, borderRadius: '6px' }}
                          />
                        );
                      }
                      return (
                        <Chip
                          label={`Bằng lái CÒN HIỆU LỰC (còn ${diffDays} ngày)`}
                          color="success"
                          sx={{ fontWeight: 700, borderRadius: '6px' }}
                        />
                      );
                    })()}
                </Box>
                {licenseError && <Alert severity="error">{licenseError}</Alert>}
                {licenseSuccess && <Alert severity="success">{licenseSuccess}</Alert>}
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
                    label={t('License class')}
                    size="small"
                    fullWidth
                    value={licenseClass}
                    onChange={(e) => setLicenseClass(e.target.value)}
                    placeholder="e.g. CLASS_3 / Commercial"
                  />
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
                  sx={{ alignSelf: 'flex-start', borderRadius: '8px', boxShadow: 'none' }}
                >
                  {licensePending ? t('Saving…') : t('Save pilot license')}
                </Button>
              </Stack>
            </form>
          </Box>

          <Box
            sx={{
              p: { xs: 2, sm: 3 },
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: '10px',
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
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontWeight: 600,
                  boxShadow: 'none',
                }}
              >
                {t('Khai báo & Tải giấy tờ Drone')}
              </Button>
            </Stack>
          </Box>

          <Box
            sx={{
              p: { xs: 2, sm: 3 },
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: '10px',
              bgcolor: 'background.paper',
            }}
          >
            <Stack spacing={1.5}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {t('AI analysis fallback')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {t(
                    'When YOLO is unavailable, automatically try the configured vision model. A valid YOLO result with no detections never triggers fallback.',
                  )}
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
        </>
      )}
    </Stack>
  );
}
