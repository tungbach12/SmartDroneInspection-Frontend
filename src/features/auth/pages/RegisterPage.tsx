import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Button,
  IconButton,
  InputAdornment,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { Link as RouterLink, Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { AuthPageLayout } from '../components/AuthPageLayout';
import { AuthLoadingScreen } from '../components/AuthSessionBootstrapper';
import { getAuthErrorMessage, registerClient } from '../api/authApi';
import {
  clientRegistrationSchema,
  type ClientRegistrationFormValues,
} from '../schemas/authSchemas';
import { getAuthRedirectTarget } from '../utils/authRedirect';
import { useAuthStore } from '../store/authStore';

export default function RegisterPage() {
  const status = useAuthStore((state) => state.status);
  const roles = useAuthStore((state) => state.roles);
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<ClientRegistrationFormValues>({
    resolver: zodResolver(clientRegistrationSchema),
    defaultValues: {
      fullName: '',
      organizationName: '',
      organizationCode: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  if (status === 'checking') {
    return <AuthLoadingScreen />;
  }

  if (status === 'authenticated') {
    return <Navigate to={getAuthRedirectTarget(null, roles)} replace />;
  }

  const onSubmit = async (values: ClientRegistrationFormValues) => {
    setErrorMessage(null);
    try {
      await registerClient({
        email: values.email,
        fullName: values.fullName,
        organizationName: values.organizationName,
        organizationCode: values.organizationCode.toUpperCase(),
        password: values.password,
      });
      navigate('/login?registered=1', {
        replace: true,
        state: { email: values.email },
      });
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error));
    }
  };

  return (
    <AuthPageLayout
      eyebrow="Client organization onboarding"
      title="Create your workspace"
      description="Register your organization and its first Client account. You can invite or manage additional access after signing in."
      backLabel="Back to sign in"
      backTo="/login"
      footer={(
        <Typography variant="body2" sx={{ color: '#617887' }}>
          Already registered?{' '}
          <Link
            component={RouterLink}
            to="/login"
            underline="hover"
            sx={{ color: '#087c92', fontWeight: 700 }}
          >
            Sign in
          </Link>
        </Typography>
      )}
    >
      <Stack
        component="form"
        spacing={1.6}
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <TextField
          {...form.register('fullName')}
          label="Your full name"
          autoComplete="name"
          fullWidth
          error={Boolean(form.formState.errors.fullName)}
          helperText={form.formState.errors.fullName?.message}
        />
        <TextField
          {...form.register('organizationName')}
          label="Organization name"
          autoComplete="organization"
          fullWidth
          error={Boolean(form.formState.errors.organizationName)}
          helperText={form.formState.errors.organizationName?.message}
        />
        <TextField
          {...form.register('organizationCode')}
          label="Organization code"
          fullWidth
          error={Boolean(form.formState.errors.organizationCode)}
          helperText={
            form.formState.errors.organizationCode?.message ??
            'A unique code, 3–64 characters. Letters, numbers, - and _ are allowed.'
          }
        />
        <TextField
          {...form.register('email')}
          label="Work email"
          type="email"
          autoComplete="email"
          fullWidth
          error={Boolean(form.formState.errors.email)}
          helperText={form.formState.errors.email?.message}
        />
        <TextField
          {...form.register('password')}
          label="Password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          fullWidth
          error={Boolean(form.formState.errors.password)}
          helperText={
            form.formState.errors.password?.message ??
            'Use 15–128 characters. Avoid common passwords and account details.'
          }
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
          {...form.register('confirmPassword')}
          label="Confirm password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          fullWidth
          error={Boolean(form.formState.errors.confirmPassword)}
          helperText={form.formState.errors.confirmPassword?.message}
        />
        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          Self-registration creates a Client account only. Admin and workforce
          accounts are managed by an administrator.
        </Alert>
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={form.formState.isSubmitting}
          sx={{
            minHeight: 50,
            mt: 0.5,
            bgcolor: '#087c92',
            '&:hover': { bgcolor: '#06687b' },
          }}
        >
          {form.formState.isSubmitting
            ? 'Creating workspace…'
            : 'Create Client account'}
        </Button>
      </Stack>
    </AuthPageLayout>
  );
}
