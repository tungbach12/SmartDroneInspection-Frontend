import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Button,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { AuthPageLayout } from '../components/AuthPageLayout';
import { AuthLoadingScreen } from '../components/AuthSessionBootstrapper';
import {
  completeInitialPasswordSetup,
  getAuthErrorMessage,
  login,
} from '../api/authApi';
import {
  PORTAL_ROLE_ACCESS,
  hasAnyRole,
  type PortalId,
} from '@/app/permissions/accessPolicy';
import { getPortalForHost } from '../utils/domainPortal';
import {
  loginSchema,
  passwordSetupSchema,
  type LoginFormValues,
  type PasswordSetupFormValues,
} from '../schemas/authSchemas';
import { getAuthRedirectTarget, getLoginReturnTo } from '../utils/authRedirect';
import { useAuthStore } from '../store/authStore';

export default function LoginPage() {
  const status = useAuthStore((state) => state.status);
  const roles = useAuthStore((state) => state.roles);
  const setSession = useAuthStore((state) => state.setSession);
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingSetupEmail, setPendingSetupEmail] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: (location.state as { email?: string } | null)?.email ?? '',
      password: '',
    },
  });
  const setupForm = useForm<PasswordSetupFormValues>({
    resolver: zodResolver(passwordSetupSchema),
    defaultValues: { currentPassword: '', password: '', confirmPassword: '' },
  });

  if (status === 'checking') {
    return <AuthLoadingScreen />;
  }

  const from = (location.state as { from?: unknown } | null)?.from;
  const returnTo = getLoginReturnTo(from, searchParams.get('returnTo'));
  const destination = getAuthRedirectTarget(returnTo, roles);

  if (status === 'authenticated') {
    return <Navigate to={destination} replace />;
  }

  const onLogin = async (values: LoginFormValues) => {
    setErrorMessage(null);
    try {
      const result = await login(values.email, values.password);
      if (result.step === 'PASSWORD_CHANGE_REQUIRED') {
        setPendingSetupEmail(values.email);
        setupForm.reset({
          currentPassword: '',
          password: '',
          confirmPassword: '',
        });
        return;
      }

      if (!result.accessToken) {
        throw new Error('The sign-in response did not include an access token.');
      }
      const portal: PortalId | null = getPortalForHost(
        window.location.hostname,
      );
      if (portal && !hasAnyRole(result.user.roles, PORTAL_ROLE_ACCESS[portal])) {
        setErrorMessage('This account does not belong to this workspace.');
        return;
      }
      setSession({ accessToken: result.accessToken, user: result.user });
      navigate(getAuthRedirectTarget(returnTo, result.user.roles), {
        replace: true,
      });
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error));
    }
  };

  const onPasswordSetup = async (values: PasswordSetupFormValues) => {
    if (!pendingSetupEmail) {
      return;
    }

    setErrorMessage(null);
    try {
      const result = await completeInitialPasswordSetup(
        pendingSetupEmail,
        values.currentPassword,
        values.password,
      );
      if (result.step !== 'AUTHENTICATED' || !result.accessToken) {
        throw new Error('Password setup did not complete sign-in.');
      }

      const portal: PortalId | null = getPortalForHost(
        window.location.hostname,
      );
      if (portal && !hasAnyRole(result.user.roles, PORTAL_ROLE_ACCESS[portal])) {
        setErrorMessage('This account does not belong to this workspace.');
        return;
      }

      setSession({ accessToken: result.accessToken, user: result.user });
      navigate(getAuthRedirectTarget(returnTo, result.user.roles), {
        replace: true,
      });
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error));
    }
  };

  const registrationComplete =
    searchParams.get('registered') === '1' ||
    Boolean(
      (location.state as { registrationComplete?: boolean } | null)
        ?.registrationComplete,
    );
  const passwordChanged = searchParams.get('passwordChanged') === '1';

  if (pendingSetupEmail) {
    return (
      <AuthPageLayout
        eyebrow="One-time security step"
        title="Set your password"
        description="Your administrator issued a temporary password. Replace it before entering your workspace."
      >
        <Stack
          component="form"
          spacing={2.2}
          noValidate
          onSubmit={setupForm.handleSubmit(onPasswordSetup)}
        >
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            This is a one-time setup. Your temporary password will stop working
            after the change.
          </Alert>
          <TextField
            label="Work email"
            value={pendingSetupEmail}
            fullWidth
            disabled
          />
          <TextField
            {...setupForm.register('currentPassword')}
            label="Temporary password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            fullWidth
            error={Boolean(setupForm.formState.errors.currentPassword)}
            helperText={setupForm.formState.errors.currentPassword?.message}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      type="button"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword((visible) => !visible)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
          <TextField
            {...setupForm.register('password')}
            label="New password"
            type={showNewPassword ? 'text' : 'password'}
            autoComplete="new-password"
            fullWidth
            error={Boolean(setupForm.formState.errors.password)}
            helperText={
              setupForm.formState.errors.password?.message ??
              'Use 15–128 characters. Avoid common passwords and account details.'
            }
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      type="button"
                      aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                      onClick={() => setShowNewPassword((visible) => !visible)}
                      edge="end"
                    >
                      {showNewPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
          <TextField
            {...setupForm.register('confirmPassword')}
            label="Confirm new password"
            type={showNewPassword ? 'text' : 'password'}
            autoComplete="new-password"
            fullWidth
            error={Boolean(setupForm.formState.errors.confirmPassword)}
            helperText={setupForm.formState.errors.confirmPassword?.message}
          />
          {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={setupForm.formState.isSubmitting}
            sx={{
              minHeight: 50,
              borderRadius: '8px',
              bgcolor: '#087E8B',
              color: '#FFFFFF',
              boxShadow: '0 5px 16px rgba(8, 126, 139, 0.2)',
              '&:hover': {
                bgcolor: '#066B70',
                boxShadow: '0 7px 20px rgba(8, 126, 139, 0.24)',
              },
            }}
          >
            {setupForm.formState.isSubmitting
              ? 'Saving password…'
              : 'Save password and continue'}
          </Button>
          <Button
            color="inherit"
            onClick={() => {
              setPendingSetupEmail(null);
              setErrorMessage(null);
            }}
          >
            Back to sign in
          </Button>
        </Stack>
      </AuthPageLayout>
    );
  }

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
        borderColor: '#96BDB5',
      },
      '&.Mui-focused fieldset': {
        borderColor: '#087E8B',
        borderWidth: '1.5px',
        boxShadow: '0 0 0 3px rgba(8, 126, 139, 0.13)',
      },
    },
    '& .MuiInputLabel-root': {
      color: '#5F7872',
      fontSize: '14px',
      '&.Mui-focused': {
        color: '#087E8B',
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

  return (
    <AuthPageLayout
      title="Welcome back"
      subtitleText="Don't have an account?"
      subtitleLinkText="Sign up"
      subtitleLinkTo="/register"
      backLabel="Back to website"
      backTo="/"
      socialPrompt="Or sign in with"
      heroTagline={{
        line1: 'Precision View,',
        line2: 'Intelligent Insights',
      }}
    >
      <Stack
        component="form"
        spacing={2.2}
        noValidate
        onSubmit={loginForm.handleSubmit(onLogin)}
      >
        {registrationComplete && (
          <Alert severity="success" sx={{ borderRadius: 2 }}>
            Your organization and Organization Admin account are ready. Sign in to open your workspace.
          </Alert>
        )}
        {passwordChanged && (
          <Alert severity="success" sx={{ borderRadius: 2 }}>
            Your password was changed. Sign in again with the new password.
          </Alert>
        )}
        <TextField
          {...loginForm.register('email')}
          label="Email address"
          placeholder="name@company.com"
          type="email"
          autoComplete="username"
          autoFocus
          fullWidth
          error={Boolean(loginForm.formState.errors.email)}
          helperText={loginForm.formState.errors.email?.message}
          sx={authInputSx}
        />
        <TextField
          {...loginForm.register('password')}
          label="Password"
          placeholder="••••••••••••"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          fullWidth
          error={Boolean(loginForm.formState.errors.password)}
          helperText={loginForm.formState.errors.password?.message}
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
        {errorMessage && (
          <Alert severity="error" role="alert" sx={{ borderRadius: 2 }}>
            {errorMessage}
          </Alert>
        )}
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={loginForm.formState.isSubmitting}
          sx={{
            minHeight: 46,
            borderRadius: '8px',
            bgcolor: '#087E8B',
            fontSize: '15px',
            fontWeight: 600,
            textTransform: 'none',
            color: '#FFFFFF',
            boxShadow: '0 5px 16px rgba(8, 126, 139, 0.2)',
            transition: 'all 0.2s ease',
            '&:hover': {
              bgcolor: '#066B70',
              boxShadow: '0 7px 20px rgba(8, 126, 139, 0.24)',
            },
          }}
        >
          {loginForm.formState.isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </Stack>
    </AuthPageLayout>
  );
}
