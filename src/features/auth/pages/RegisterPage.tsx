import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  IconButton,
  InputAdornment,
  InputLabel,
  Link,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { Link as RouterLink, Navigate, useNavigate } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { api } from '@/shared/api/client';
import { AuthPageLayout } from '../components/AuthPageLayout';
import { AuthLoadingScreen } from '../components/AuthSessionBootstrapper';
import * as authApi from '../api/authApi';
import {
  evaluateAirspace,
  getAuthErrorMessage,
  registerOrganization,
  type AirspaceEvaluationResponse,
  type FirstAssetRegistrationInput,
} from '../api/authApi';
import {
  organizationRegistrationSchema,
  type OrganizationRegistrationFormValues,
} from '../schemas/authSchemas';
import { getAuthRedirectTarget } from '../utils/authRedirect';
import { useAuthStore } from '../store/authStore';
import { useLocale } from '@/shared/i18n/LocaleProvider';

const authInputSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: '#F8FBFA',
    borderRadius: '8px',
    color: '#173B36',
    fontSize: '14px',
    '& fieldset': {
      borderColor: '#D6E4E0',
      transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    },
    '&:hover fieldset': {
      borderColor: 'text.secondary',
    },
    '&.Mui-focused fieldset': {
      borderColor: 'primary.main',
      borderWidth: '1.5px',
      boxShadow: '0 0 0 3px rgba(55, 88, 249, 0.14)',
    },
  },
  '& .MuiInputLabel-root': {
    color: 'text.secondary',
    fontSize: '14px',
    '&.Mui-focused': {
      color: 'primary.main',
    },
  },
  '& .MuiInputBase-input': {
    py: '13.5px',
    fontSize: '14px',
    '&::placeholder': {
      color: '#607972',
      opacity: 1,
    },
  },
  '& .MuiFormHelperText-root': {
    color: '#B5473C',
    fontSize: '12px',
    mx: 0.5,
    mt: 0.5,
  },
};

function toFirstAssetPayload(
  asset?: {
    code?: string | undefined;
    name?: string | undefined;
    categoryId?: string | undefined;
    locationText?: string | undefined;
    latitude?: number | undefined;
    longitude?: number | undefined;
  } | undefined,
): FirstAssetRegistrationInput | undefined {
  if (
    !asset ||
    !asset.code?.trim() ||
    !asset.name?.trim() ||
    !asset.categoryId?.trim() ||
    !asset.locationText?.trim() ||
    typeof asset.latitude !== 'number' ||
    Number.isNaN(asset.latitude) ||
    typeof asset.longitude !== 'number' ||
    Number.isNaN(asset.longitude)
  ) {
    return undefined;
  }
  return {
    code: asset.code.trim(),
    name: asset.name.trim(),
    categoryId: asset.categoryId.trim(),
    locationText: asset.locationText.trim(),
    latitude: asset.latitude,
    longitude: asset.longitude,
  };
}

export default function RegisterPage() {
  const { t } = useLocale();
  const status = useAuthStore((state) => state.status);
  const roles = useAuthStore((state) => state.roles);
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(true);
  const [registrationMessage, setRegistrationMessage] = useState<string | null>(null);

  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpDialogOpen, setOtpDialogOpen] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [otpChannel, setOtpChannel] = useState<'EMAIL' | 'SMS'>('EMAIL');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [pendingFormValues, setPendingFormValues] = useState<OrganizationRegistrationFormValues | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [airspaceAdvisory, setAirspaceAdvisory] = useState<AirspaceEvaluationResponse | null>(null);

  useEffect(() => {
    let active = true;
    api
      .get<Array<{ id: string; name: string; active?: boolean }>>('/catalog/asset-categories')
      .then((res) => {
        if (!active) return;
        const list = Array.isArray(res.data)
          ? res.data.filter((item) => item.active !== false)
          : [];
        setCategories(list);
      })
      .catch(() => {
        if (!active) return;
        setCategories([]);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const form = useForm<OrganizationRegistrationFormValues>({
    resolver: zodResolver(organizationRegistrationSchema),
    defaultValues: {
      fullName: '',
      organizationName: '',
      organizationCode: '',
      email: '',
      password: '',
      confirmPassword: '',
      firstAsset: {
        code: '',
        name: '',
        categoryId: '',
        locationText: '',
        latitude: undefined,
        longitude: undefined,
      },
    },
  });

  const watchedLat = form.watch('firstAsset.latitude');
  const watchedLng = form.watch('firstAsset.longitude');

  useEffect(() => {
    if (
      typeof watchedLat !== 'number' ||
      typeof watchedLng !== 'number' ||
      Number.isNaN(watchedLat) ||
      Number.isNaN(watchedLng) ||
      watchedLat < -90 ||
      watchedLat > 90 ||
      watchedLng < -180 ||
      watchedLng > 180
    ) {
      return;
    }
    if (typeof evaluateAirspace !== 'function') return;
    let active = true;
    evaluateAirspace(watchedLat, watchedLng)
      .then((res) => {
        if (active) setAirspaceAdvisory(res);
      })
      .catch(() => {
        if (active) setAirspaceAdvisory(null);
      });
    return () => {
      active = false;
    };
  }, [watchedLat, watchedLng]);

  if (status === 'checking') {
    return <AuthLoadingScreen />;
  }

  if (status === 'authenticated') {
    const destination = getAuthRedirectTarget(null, roles);
    return <Navigate to={destination} replace />;
  }

  const onSubmit = async (values: OrganizationRegistrationFormValues) => {
    setErrorMessage(null);
    setRegistrationMessage(null);

    if (airspaceAdvisory?.classification === 'NO_FLY_ZONE') {
      setErrorMessage(
        airspaceAdvisory.advisoryMessage || 'Registration is blocked in this no-fly zone.',
      );
      return;
    }

    let sendOtpFn: typeof authApi.sendRegistrationOtp | undefined;
    try {
      sendOtpFn = authApi.sendRegistrationOtp;
    } catch {
      sendOtpFn = undefined;
    }

    if (typeof sendOtpFn !== 'function') {
      try {
        const result = await registerOrganization({
          ...values,
          firstAsset: toFirstAssetPayload(values.firstAsset),
          phoneNumber: phoneNumber.trim() || undefined,
        });
        if (result.registrationStatus === 'PENDING_AIRSPACE_REVIEW') {
          setRegistrationMessage(
            result.reviewMessage ||
              'Your location needs manual review. We will contact you after it has been assessed.',
          );
          return;
        }
        navigate('/login?registered=1', {
          replace: true,
          state: { email: values.email },
        });
      } catch (error) {
        setErrorMessage(getAuthErrorMessage(error));
      }
      return;
    }

    setSendingOtp(true);
    setPendingFormValues(values);
    try {
      const channel = phoneNumber.trim() ? otpChannel : 'EMAIL';
      const otpRes = await sendOtpFn({
        email: values.email,
        phoneNumber: phoneNumber.trim() || undefined,
        channel,
      });
      setChallengeToken(otpRes.challengeToken);
      setOtpCode('');
      setOtpError(null);
      setCountdown(60);
      setOtpDialogOpen(true);
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error));
    } finally {
      setSendingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (!pendingFormValues || countdown > 0) return;
    setSendingOtp(true);
    setOtpError(null);
    try {
      const otpRes = await authApi.sendRegistrationOtp({
        email: pendingFormValues.email,
        phoneNumber: phoneNumber.trim() || undefined,
        channel: otpChannel,
      });
      setChallengeToken(otpRes.challengeToken);
      setCountdown(60);
    } catch (err) {
      setOtpError(getAuthErrorMessage(err));
    } finally {
      setSendingOtp(false);
    }
  };

  const handleSwitchChannel = async (newChannel: 'EMAIL' | 'SMS') => {
    if (newChannel === otpChannel || !pendingFormValues) return;
    setOtpChannel(newChannel);
    setSendingOtp(true);
    setOtpError(null);
    try {
      const otpRes = await authApi.sendRegistrationOtp({
        email: pendingFormValues.email,
        phoneNumber: phoneNumber.trim() || undefined,
        channel: newChannel,
      });
      setChallengeToken(otpRes.challengeToken);
      setCountdown(60);
    } catch (err) {
      setOtpError(getAuthErrorMessage(err));
    } finally {
      setSendingOtp(false);
    }
  };

  const handleConfirmOtp = async () => {
    if (!pendingFormValues || !challengeToken || otpCode.length !== 6) return;
    setVerifyingOtp(true);
    setOtpError(null);
    try {
      const result = await registerOrganization({
        ...pendingFormValues,
        firstAsset: toFirstAssetPayload(pendingFormValues.firstAsset),
        phoneNumber: phoneNumber.trim() || undefined,
        otpChallengeToken: challengeToken,
        otpCode: otpCode.trim(),
      });
      setOtpDialogOpen(false);
      if (result.registrationStatus === 'PENDING_AIRSPACE_REVIEW') {
        setRegistrationMessage(
          result.reviewMessage ||
            'Your location needs manual review. We will contact you after it has been assessed.',
        );
        return;
      }
      navigate('/login?registered=1', {
        replace: true,
        state: { email: pendingFormValues.email },
      });
    } catch (err) {
      setOtpError(getAuthErrorMessage(err));
    } finally {
      setVerifyingOtp(false);
    }
  };

  return (
    <AuthPageLayout
      title={t('Create an account')}
      subtitleText={t('Already have an account?')}
      subtitleLinkText={t('Log in')}
      subtitleLinkTo="/login"
      backLabel={t('Back to website')}
      backTo="/"
      socialPrompt={t('Or register with')}
      heroTagline={{
        line1: 'Capturing Perspectives,',
        line2: 'Creating Confidence',
      }}
    >
      <Stack
        component="form"
        spacing={2}
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
          <TextField
            {...form.register('fullName')}
            label={t('Your full name')}
            placeholder="Jane Doe"
            autoComplete="name"
            fullWidth
            error={Boolean(form.formState.errors.fullName)}
            helperText={form.formState.errors.fullName?.message}
            sx={authInputSx}
          />
          <TextField
            {...form.register('email')}
            label={t('Work email')}
            placeholder="jane@company.com"
            type="email"
            autoComplete="email"
            fullWidth
            error={Boolean(form.formState.errors.email)}
            helperText={form.formState.errors.email?.message}
            sx={authInputSx}
          />
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
          <TextField
            {...form.register('organizationName')}
            label={t('Organization name')}
            placeholder={t('Acme Infrastructure')}
            autoComplete="organization"
            fullWidth
            error={Boolean(form.formState.errors.organizationName)}
            helperText={form.formState.errors.organizationName?.message}
            sx={authInputSx}
          />
          <TextField
            {...form.register('organizationCode')}
            label={t('Organization code')}
            placeholder="ACME"
            fullWidth
            error={Boolean(form.formState.errors.organizationCode)}
            helperText={form.formState.errors.organizationCode?.message}
            sx={authInputSx}
          />
        </Box>

        <TextField
          label={t('Phone number (Optional for SMS OTP)')}
          placeholder="0912345678"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          fullWidth
          sx={authInputSx}
        />

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
          <TextField
            {...form.register('firstAsset.code')}
            label={t('Asset code')}
            placeholder="AST-001"
            fullWidth
            error={Boolean(form.formState.errors.firstAsset?.code)}
            helperText={form.formState.errors.firstAsset?.code?.message}
            sx={authInputSx}
          />
          <TextField
            {...form.register('firstAsset.name')}
            label={t('Asset name')}
            placeholder="Main bridge"
            fullWidth
            error={Boolean(form.formState.errors.firstAsset?.name)}
            helperText={form.formState.errors.firstAsset?.name?.message}
            sx={authInputSx}
          />
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
          <Controller
            control={form.control}
            name="firstAsset.categoryId"
            render={({ field }) => (
              <FormControl
                fullWidth
                error={Boolean(form.formState.errors.firstAsset?.categoryId)}
                sx={authInputSx}
              >
                <InputLabel id="register-asset-category-label">{t('Asset category')}</InputLabel>
                <Select
                  {...field}
                  labelId="register-asset-category-label"
                  label={t('Asset category')}
                >
                  {categories.map((cat) => (
                    <MenuItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </MenuItem>
                  ))}
                </Select>
                {form.formState.errors.firstAsset?.categoryId && (
                  <FormHelperText>
                    {form.formState.errors.firstAsset.categoryId.message}
                  </FormHelperText>
                )}
              </FormControl>
            )}
          />
          <TextField
            {...form.register('firstAsset.locationText')}
            label={t('Location description')}
            placeholder="District 1, HCMC"
            fullWidth
            error={Boolean(form.formState.errors.firstAsset?.locationText)}
            helperText={form.formState.errors.firstAsset?.locationText?.message}
            sx={authInputSx}
          />
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
          <TextField
            {...form.register('firstAsset.latitude', { valueAsNumber: true })}
            label={t('Latitude')}
            placeholder="10.7769"
            type="number"
            fullWidth
            error={Boolean(form.formState.errors.firstAsset?.latitude)}
            helperText={form.formState.errors.firstAsset?.latitude?.message}
            sx={authInputSx}
          />
          <TextField
            {...form.register('firstAsset.longitude', { valueAsNumber: true })}
            label={t('Longitude')}
            placeholder="106.7009"
            type="number"
            fullWidth
            error={Boolean(form.formState.errors.firstAsset?.longitude)}
            helperText={form.formState.errors.firstAsset?.longitude?.message}
            sx={authInputSx}
          />
        </Box>

        {airspaceAdvisory && (
          <Alert
            severity={
              airspaceAdvisory.classification === 'NO_FLY_ZONE'
                ? 'error'
                : airspaceAdvisory.classification === 'CLEAR_ZONE'
                  ? 'success'
                  : 'warning'
            }
            sx={{ borderRadius: 2 }}
          >
            {airspaceAdvisory.advisoryMessage}
          </Alert>
        )}

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
          <TextField
            {...form.register('password')}
            label={t('Password')}
            placeholder="••••••••••••"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            fullWidth
            error={Boolean(form.formState.errors.password)}
            helperText={form.formState.errors.password?.message}
            sx={authInputSx}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      type="button"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword((visible) => !visible)}
                      edge="end"
                      sx={{ color: '#758984' }}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
          <TextField
            {...form.register('confirmPassword')}
            label={t('Confirm password')}
            placeholder="••••••••••••"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            fullWidth
            error={Boolean(form.formState.errors.confirmPassword)}
            helperText={form.formState.errors.confirmPassword?.message}
            sx={authInputSx}
          />
        </Box>

        {/* Agreement checkbox matching the reference design */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 0.5 }}>
          <Checkbox
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            sx={{
              color: '#758984',
              '&.Mui-checked': { color: '#087E8B' },
              p: 0.5,
            }}
          />
          <Typography sx={{ fontSize: '13px', color: '#526C66' }}>
            {t('I agree to the')}{' '}
            <Link
              component={RouterLink}
              to="#"
              underline="hover"
              sx={{ color: '#087E8B', fontWeight: 600 }}
            >
              Terms & Conditions
            </Link>
          </Typography>
        </Box>

        {registrationMessage && (
          <Alert severity="success" role="status" sx={{ borderRadius: 2 }}>
            {registrationMessage}
          </Alert>
        )}
        {errorMessage && (
          <Alert severity="error" role="alert" sx={{ borderRadius: 2 }}>
            {errorMessage}
          </Alert>
        )}

        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={form.formState.isSubmitting || sendingOtp}
          sx={{
            minHeight: 46,
            borderRadius: '8px',
            bgcolor: 'primary.main',
            fontSize: '15px',
            fontWeight: 600,
            textTransform: 'none',
            color: '#FFFFFF',
            boxShadow: 'none',
            transition: 'all 0.2s ease',
            '&:hover': {
              bgcolor: 'primary.dark',
              boxShadow: 'none',
            },
          }}
        >
          {sendingOtp ? 'Đang gửi mã OTP…' : form.formState.isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>
      </Stack>

      {/* OTP VERIFICATION DIALOG FOR CUSTOMER REGISTRATION */}
      <Dialog
        open={otpDialogOpen}
        onClose={() => setOtpDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '16px', p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          Xác thực OTP tạo tài khoản
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Mã xác thực 6 chữ số đã được gửi tới{' '}
              <strong>
                {otpChannel === 'SMS' && pendingFormValues?.phoneNumber
                  ? pendingFormValues.phoneNumber
                  : pendingFormValues?.email}
              </strong>
              . Vui lòng nhập mã để hoàn tất đăng ký tài khoản.
            </Typography>

            {pendingFormValues?.phoneNumber && (
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <Chip
                  label="Gửi qua Email"
                  clickable
                  color={otpChannel === 'EMAIL' ? 'primary' : 'default'}
                  onClick={() => void handleSwitchChannel('EMAIL')}
                />
                <Chip
                  label="Gửi qua SMS"
                  clickable
                  color={otpChannel === 'SMS' ? 'primary' : 'default'}
                  onClick={() => void handleSwitchChannel('SMS')}
                />
              </Stack>
            )}

            <TextField
              autoFocus
              label="Mã OTP (6 chữ số)"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              slotProps={{
                htmlInput: {
                  maxLength: 6,
                  style: {
                    textAlign: 'center',
                    letterSpacing: '8px',
                    fontSize: '22px',
                    fontWeight: 'bold',
                  },
                },
              }}
              fullWidth
              required
            />

            {otpError && <Alert severity="error">{otpError}</Alert>}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                {countdown > 0 ? `Gửi lại sau ${countdown}s` : ''}
              </Typography>
              <Button
                size="small"
                disabled={countdown > 0 || sendingOtp}
                onClick={() => void handleResendOtp()}
              >
                Gửi lại mã OTP
              </Button>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOtpDialogOpen(false)} disabled={verifyingOtp}>
            Hủy
          </Button>
          <Button
            variant="contained"
            disabled={otpCode.length !== 6 || verifyingOtp}
            onClick={() => void handleConfirmOtp()}
            sx={{ bgcolor: '#087E8B', '&:hover': { bgcolor: '#066B70' } }}
          >
            {verifyingOtp ? 'Đang xác thực…' : 'Xác nhận & Tạo tài khoản'}
          </Button>
        </DialogActions>
      </Dialog>
    </AuthPageLayout>
  );
}
