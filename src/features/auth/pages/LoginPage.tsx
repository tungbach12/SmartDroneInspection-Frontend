import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Box,
  Button,
  IconButton,
  InputAdornment,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { Link as RouterLink, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { AuthPageLayout } from '../components/AuthPageLayout';
import { AuthLoadingScreen } from '../components/AuthSessionBootstrapper';
import {
  completeInitialPasswordSetup,
  getAuthErrorMessage,
  login,
} from '../api/authApi';
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
              bgcolor: '#087c92',
              '&:hover': { bgcolor: '#06687b' },
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

  return (
    <AuthPageLayout
      eyebrow="Secure workspace access"
      title="Welcome back"
      description="Sign in with your account to continue to your authorized workspace."
    >
      <Stack
        component="form"
        spacing={2.2}
        noValidate
        onSubmit={loginForm.handleSubmit(onLogin)}
      >
        {registrationComplete && (
          <Alert severity="success" sx={{ borderRadius: 2 }}>
            Your Client account is ready. Sign in to open your organization workspace.
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
          type="email"
          autoComplete="username"
          autoFocus
          fullWidth
          error={Boolean(loginForm.formState.errors.email)}
          helperText={loginForm.formState.errors.email?.message}
        />
        <TextField
          {...loginForm.register('password')}
          label="Password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          fullWidth
          error={Boolean(loginForm.formState.errors.password)}
          helperText={loginForm.formState.errors.password?.message}
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
            minHeight: 50,
            bgcolor: '#087c92',
            '&:hover': { bgcolor: '#06687b' },
          }}
        >
          {loginForm.formState.isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.2}
          sx={{
            pt: 0.5,
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="body2" sx={{ color: '#617887' }}>
            Need account help? Contact your administrator.
          </Typography>
          <Link
            component={RouterLink}
            to="/register"
            underline="hover"
            sx={{ color: '#087c92', fontWeight: 700, whiteSpace: 'nowrap' }}
          >
            Create a Client account
          </Link>
        </Stack>
      </Stack>
      <Box
        sx={{
          mt: 2.5,
          p: 1.7,
          borderRadius: 2,
          bgcolor: '#f1f8fa',
          border: '1px solid #e0eff2',
        }}
      >
        <Typography variant="body2" sx={{ color: '#466271', lineHeight: 1.6 }}>
          Your workspace is selected from the roles assigned to your account.
          Sign in once; you never need to choose a role on this page.
        </Typography>
      </Box>
    </AuthPageLayout>
  );
}
