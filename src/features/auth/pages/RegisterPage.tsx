import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  FlightTakeoffRounded,
  ArrowForwardRounded,
} from '@mui/icons-material';
import { Link as RouterLink, Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { AuthPageLayout } from '../components/AuthPageLayout';
import { AuthLoadingScreen } from '../components/AuthSessionBootstrapper';
import * as authApi from '../api/authApi';
import {
  getAuthErrorMessage,
  registerOrganization,
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
    bgcolor: '#F3F5F8',
    borderRadius: '10px',
    color: '#0F172A',
    fontSize: '14px',
    '& fieldset': {
      borderColor: '#E2E8F0',
      transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    },
    '&:hover fieldset': {
      borderColor: '#CBD5E1',
    },
    '&.Mui-focused': {
      bgcolor: '#FFFFFF',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#3758F9',
      borderWidth: '1.5px',
      boxShadow: '0 0 0 3px rgba(55, 88, 249, 0.12)',
    },
  },
  '& .MuiInputLabel-root': {
    color: '#52525B',
    fontSize: '14px',
    '&.Mui-focused': {
      color: '#3758F9',
    },
  },
  '& .MuiInputBase-input': {
    py: '13.5px',
    fontSize: '14px',
    '&::placeholder': {
      color: '#94A3B8',
      opacity: 1,
    },
  },
  '& .MuiFormHelperText-root': {
    color: '#DC2626',
    fontSize: '12px',
    mx: 0.5,
    mt: 0.5,
  },
};

function deriveOrganizationFields(values: OrganizationRegistrationFormValues): {
  organizationName: string;
  organizationCode: string;
} {
  const organizationName = values.fullName.trim();
  const localPart = (values.email.split('@')[0] ?? 'org')
    .replace(/[^A-Za-z0-9_-]/g, '')
    .replace(/^[^A-Za-z0-9]+/, '');
  const prefix = (localPart || 'ORG').slice(0, 24).toUpperCase();
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return {
    organizationName,
    organizationCode: `${prefix}_${suffix}`,
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

  const [otpDialogOpen, setOtpDialogOpen] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [pendingFormValues, setPendingFormValues] = useState<OrganizationRegistrationFormValues | null>(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const form = useForm<OrganizationRegistrationFormValues>({
    resolver: zodResolver(organizationRegistrationSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

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
          ...deriveOrganizationFields(values),
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
      const otpRes = await sendOtpFn({
        email: values.email,
        channel: 'EMAIL',
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
        channel: 'EMAIL',
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
        ...deriveOrganizationFields(pendingFormValues),
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
        line1: 'Protect Your Critical Infrastructure',
        line2: 'Schedule drone inspections, review high-resolution evidence, and manage maintenance workflows effortlessly.',
      }}
    >
      <Stack
        component="form"
        spacing={2}
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
      >
        {/* DEDICATED LINK BANNER TO MULTI-STEP PARTNER INSPECTOR REGISTRATION PAGE */}
        <Box
          sx={{
            p: 1.5,
            borderRadius: '10px',
            bgcolor: '#EEF5F3',
            border: '1px solid #D6E4E0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FlightTakeoffRounded sx={{ color: '#087E8B', fontSize: 20 }} />
            <Typography sx={{ fontSize: '13px', color: '#173B36', fontWeight: 600 }}>
              Bạn là Phi công Drone đối tác?
            </Typography>
          </Box>
          <Button
            component={RouterLink}
            to="/register-inspector"
            size="small"
            endIcon={<ArrowForwardRounded sx={{ fontSize: 15 }} />}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '12.5px',
              color: '#087E8B',
              bgcolor: '#FFFFFF',
              border: '1px solid #B8D5CE',
              borderRadius: '6px',
              px: 1.5,
              whiteSpace: 'nowrap',
              '&:hover': { bgcolor: '#E4F1EE' },
            }}
          >
            Đăng ký Inspector (4 bước)
          </Button>
        </Box>

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
              Terms &amp; Conditions
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
            minHeight: 48,
            borderRadius: '10px',
            bgcolor: '#3758F9',
            fontSize: '15px',
            fontWeight: 600,
            textTransform: 'none',
            color: '#FFFFFF',
            boxShadow: '0 4px 14px rgba(55, 88, 249, 0.24)',
            transition: 'all 0.2s ease',
            '&:hover': {
              bgcolor: '#2237EE',
              boxShadow: '0 6px 20px rgba(55, 88, 249, 0.32)',
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
              <strong>{pendingFormValues?.email}</strong>
              . Vui lòng nhập mã để hoàn tất đăng ký tài khoản.
            </Typography>

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
