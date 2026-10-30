import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  IconButton,
  InputAdornment,
  Link,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { Link as RouterLink, Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { AuthPageLayout } from '../components/AuthPageLayout';
import { AuthLoadingScreen } from '../components/AuthSessionBootstrapper';
import {
  evaluateAirspace,
  getAuthErrorMessage,
  registerOrganization,
  type AirspaceEvaluationResponse,
} from '../api/authApi';
import {
  organizationRegistrationSchema,
  type OrganizationRegistrationFormValues,
} from '../schemas/authSchemas';
import { getAuthRedirectTarget } from '../utils/authRedirect';
import { useAuthStore } from '../store/authStore';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { api } from '@/shared/api/client';

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
  const { t } = useLocale();
  const status = useAuthStore((state) => state.status);
  const roles = useAuthStore((state) => state.roles);
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(true);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [airspace, setAirspace] = useState<AirspaceEvaluationResponse | null>(null);
  const [evaluatingAirspace, setEvaluatingAirspace] = useState(false);
  const [registrationMessage, setRegistrationMessage] = useState<string | null>(null);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; active: boolean }>>([]);
  const [categoryError, setCategoryError] = useState<string | null>(null);

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
        latitude: 0,
        longitude: 0,
      },
    },
  });

  useEffect(() => {
    let active = true;
    void api.get<Array<{ id: string; name: string; active: boolean }>>('/asset-categories')
      .then(({ data }) => { if (active) setCategories(data); })
      .catch(() => { if (active) setCategoryError('Asset categories could not be loaded. Please try again later.'); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (
      latitude === null || longitude === null ||
      latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180
    ) {
      setAirspace(null);
      return;
    }

    const timer = window.setTimeout(() => {
      setEvaluatingAirspace(true);
      void evaluateAirspace(latitude, longitude)
        .then(setAirspace)
        .catch(() => setAirspace(null))
        .finally(() => setEvaluatingAirspace(false));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [latitude, longitude]);

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
    try {
      if (evaluatingAirspace) {
        setErrorMessage('Wait for the airspace advisory check to finish before submitting.');
        return;
      }
      if (airspace?.classification === 'NO_FLY_ZONE') {
        setErrorMessage(airspace.advisoryMessage);
        return;
      }
      const result = await registerOrganization(values);
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
        sx={{ opacity: categoryError ? 0.75 : 1 }}
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

        <Typography variant="subtitle2">{t('First asset')}</Typography>
        {categoryError && <Alert severity="error">{t(categoryError)}</Alert>}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
          <TextField
            {...form.register('firstAsset.code')}
            label={t('Asset code')}
            fullWidth
            error={Boolean(form.formState.errors.firstAsset?.code)}
            helperText={form.formState.errors.firstAsset?.code?.message}
            sx={authInputSx}
          />
          <TextField
            {...form.register('firstAsset.name')}
            label={t('Asset name')}
            fullWidth
            error={Boolean(form.formState.errors.firstAsset?.name)}
            helperText={form.formState.errors.firstAsset?.name?.message}
            sx={authInputSx}
          />
          <TextField
            select
            {...form.register('firstAsset.categoryId')}
            value={form.watch('firstAsset.categoryId') ?? ''}
            label={t('Asset category')}
            fullWidth
            error={Boolean(form.formState.errors.firstAsset?.categoryId)}
            helperText={form.formState.errors.firstAsset?.categoryId?.message}
            sx={authInputSx}
          >
            {categories
              .filter((category) => category.active)
              .map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {category.name}
                </MenuItem>
              ))}
          </TextField>
          <TextField
            {...form.register('firstAsset.locationText')}
            label={t('Location description')}
            fullWidth
            error={Boolean(form.formState.errors.firstAsset?.locationText)}
            helperText={form.formState.errors.firstAsset?.locationText?.message}
            sx={authInputSx}
          />
          <TextField
            {...form.register('firstAsset.latitude', {
              valueAsNumber: true,
              onChange: (event) => setLatitude(event.target.value === '' ? null : Number(event.target.value)),
            })}
            label={t('Latitude')}
            type="number"
            slotProps={{ htmlInput: { step: 'any' } }}
            fullWidth
            error={Boolean(form.formState.errors.firstAsset?.latitude)}
            helperText={form.formState.errors.firstAsset?.latitude?.message}
            sx={authInputSx}
          />
          <TextField
            {...form.register('firstAsset.longitude', {
              valueAsNumber: true,
              onChange: (event) => setLongitude(event.target.value === '' ? null : Number(event.target.value)),
            })}
            label={t('Longitude')}
            type="number"
            slotProps={{ htmlInput: { step: 'any' } }}
            fullWidth
            error={Boolean(form.formState.errors.firstAsset?.longitude)}
            helperText={form.formState.errors.firstAsset?.longitude?.message}
            sx={authInputSx}
          />
        </Box>
        {(evaluatingAirspace || airspace) && (
          <Alert
            severity={
              airspace?.classification === 'NO_FLY_ZONE'
                ? 'error'
                : airspace?.classification === 'RESTRICTED_ZONE' ||
                    airspace?.classification === 'UNKNOWN'
                  ? 'warning'
                  : 'info'
            }
          >
            {evaluatingAirspace
              ? t('Checking airspace advisory…')
              : airspace?.advisoryMessage}
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
