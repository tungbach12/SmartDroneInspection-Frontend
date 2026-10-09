import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Box,
  Button,
  Checkbox,
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
import { getAuthErrorMessage, registerOrganization } from '../api/authApi';
import {
  organizationRegistrationSchema,
  type OrganizationRegistrationFormValues,
} from '../schemas/authSchemas';
import { getAuthRedirectTarget } from '../utils/authRedirect';
import { useAuthStore } from '../store/authStore';

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

export default function RegisterPage() {
  const status = useAuthStore((state) => state.status);
  const roles = useAuthStore((state) => state.roles);
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(true);

  const form = useForm<OrganizationRegistrationFormValues>({
    resolver: zodResolver(organizationRegistrationSchema),
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
    const destination = getAuthRedirectTarget(null, roles);
    return <Navigate to={destination} replace />;
  }

  const onSubmit = async (values: OrganizationRegistrationFormValues) => {
    setErrorMessage(null);
    try {
      await registerOrganization(values);
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
      title="Create an account"
      subtitleText="Already have an account?"
      subtitleLinkText="Log in"
      subtitleLinkTo="/login"
      backLabel="Back to website"
      backTo="/"
      socialPrompt="Or register with"
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
            label="Your full name"
            placeholder="Jane Doe"
            autoComplete="name"
            fullWidth
            error={Boolean(form.formState.errors.fullName)}
            helperText={form.formState.errors.fullName?.message}
            sx={authInputSx}
          />
          <TextField
            {...form.register('email')}
            label="Work email"
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
            label="Organization name"
            placeholder="Acme Infrastructure"
            autoComplete="organization"
            fullWidth
            error={Boolean(form.formState.errors.organizationName)}
            helperText={form.formState.errors.organizationName?.message}
            sx={authInputSx}
          />
          <TextField
            {...form.register('organizationCode')}
            label="Organization code"
            placeholder="ACME"
            fullWidth
            error={Boolean(form.formState.errors.organizationCode)}
            helperText={form.formState.errors.organizationCode?.message}
            sx={authInputSx}
          />
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
          <TextField
            {...form.register('password')}
            label="Password"
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
            label="Confirm password"
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
            I agree to the{' '}
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

        {errorMessage && (
          <Alert severity="error" role="alert" sx={{ borderRadius: 2 }}>
            {errorMessage}
          </Alert>
        )}

        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={form.formState.isSubmitting}
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
          {form.formState.isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>
      </Stack>
    </AuthPageLayout>
  );
}
