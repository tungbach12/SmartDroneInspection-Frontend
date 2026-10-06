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
import { Link as RouterLink } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { AuthPageLayout } from '../components/AuthPageLayout';
import { getAuthErrorMessage, registerProvider } from '../api/authApi';
import {
  providerRegistrationSchema,
  type ProviderRegistrationFormValues,
} from '../schemas/authSchemas';

export default function ProviderRegistrationPage() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmation, setConfirmation] = useState<{
    activationLink: string | null;
  } | null>(null);

  const form = useForm<ProviderRegistrationFormValues>({
    resolver: zodResolver(providerRegistrationSchema),
    defaultValues: {
      email: '',
      fullName: '',
      providerName: '',
      legalName: '',
      taxCode: '',
      businessLicenseNo: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: ProviderRegistrationFormValues) => {
    setErrorMessage(null);
    try {
      const result = await registerProvider({
        email: values.email,
        fullName: values.fullName,
        providerName: values.providerName,
        legalName: values.legalName,
        taxCode: values.taxCode,
        businessLicenseNo: values.businessLicenseNo,
        password: values.password,
      });
      setConfirmation({ activationLink: result.activationLink });
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error));
    }
  };

  if (confirmation) {
    return (
      <AuthPageLayout
        eyebrow="Provider onboarding"
        title="Registration received"
        description="Your provider organization was registered."
        backLabel="Back to sign in"
        backTo="/login"
      >
        <Stack spacing={1.6}>
          <Alert severity="success" sx={{ borderRadius: 2 }}>
            Check your email for the activation link.
          </Alert>
          {confirmation.activationLink && (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              Activation link (dev):{' '}
              <Link href={confirmation.activationLink} underline="hover">
                {confirmation.activationLink}
              </Link>
            </Alert>
          )}
          <Button
            component={RouterLink}
            to="/login"
            variant="contained"
            size="large"
            sx={{
              minHeight: 50,
              bgcolor: '#087c92',
              '&:hover': { bgcolor: '#06687b' },
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
      eyebrow="Provider organization onboarding"
      title="Register your provider organization"
      description="Create the first Provider Manager account for your service organization. We will email you an activation link before you can sign in."
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
          {...form.register('providerName')}
          label="Provider name"
          autoComplete="organization"
          fullWidth
          error={Boolean(form.formState.errors.providerName)}
          helperText={form.formState.errors.providerName?.message}
        />
        <TextField
          {...form.register('legalName')}
          label="Legal name"
          fullWidth
          error={Boolean(form.formState.errors.legalName)}
          helperText={form.formState.errors.legalName?.message}
        />
        <TextField
          {...form.register('taxCode')}
          label="Tax code"
          fullWidth
          error={Boolean(form.formState.errors.taxCode)}
          helperText={form.formState.errors.taxCode?.message}
        />
        <TextField
          {...form.register('businessLicenseNo')}
          label="Business license number"
          fullWidth
          error={Boolean(form.formState.errors.businessLicenseNo)}
          helperText={form.formState.errors.businessLicenseNo?.message}
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
          After registering, check your email for the activation link before
          signing in.
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
            ? 'Registering…'
            : 'Register provider organization'}
        </Button>
      </Stack>
    </AuthPageLayout>
  );
}
