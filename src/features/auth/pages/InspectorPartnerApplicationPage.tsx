import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { submitPartnerApplication, uploadPartnerLicense, getAuthErrorMessage } from '../api/authApi';
import { partnerApplicationSchema, type PartnerApplicationFormValues } from '../schemas/authSchemas';
import { AuthPageLayout } from '../components/AuthPageLayout';
import { useLocale } from '@/shared/i18n/LocaleProvider';

export default function InspectorPartnerApplicationPage() {
  const { t } = useLocale();
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const form = useForm<PartnerApplicationFormValues>({
    resolver: zodResolver(partnerApplicationSchema),
    defaultValues: {
      email: '', fullName: '', phone: '', pilotLicenseNumber: '',
      pilotLicenseClass: '', pilotLicenseExpiresAt: '', pilotLicenseFile: undefined,
    },
  });

  const onSubmit = async (values: PartnerApplicationFormValues) => {
    setError(null);
    try {
      const file = form.getValues('pilotLicenseFile');
      if (!file) {
        setError(t('Upload a pilot license document.'));
        return;
      }
      const { pilotLicenseFile: _file, ...applicationValues } = values;
      const pilotLicenseFileKey = await uploadPartnerLicense(file);
      await submitPartnerApplication({ ...applicationValues, pilotLicenseFileKey });
      setSubmitted(true);
    } catch (cause) {
      setError(getAuthErrorMessage(cause));
    }
  };

  if (submitted) {
    return (
      <AuthPageLayout title={t('Application received')} description={t('Your pilot license and inspector partner application will be reviewed. No drone is needed at this stage.')}>
        <Stack spacing={2}>
          <Alert severity="success">{t('Your application is pending administrator review. We will contact you after the partner contract is verified.')}</Alert>
          <Button component={Link} to="/" variant="outlined">{t('Back to website')}</Button>
        </Stack>
      </AuthPageLayout>
    );
  }

  return (
    <AuthPageLayout title={t('Apply as an inspector partner')} description={t('Submit your pilot license details for administrator review. You can register a drone after partner approval.')} showSocial={false}>
      <Stack component="form" spacing={2} noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
          <TextField {...form.register('fullName')} label={t('Full name')} error={Boolean(form.formState.errors.fullName)} helperText={form.formState.errors.fullName?.message} />
          <TextField {...form.register('email')} label={t('Email')} type="email" error={Boolean(form.formState.errors.email)} helperText={form.formState.errors.email?.message} />
          <TextField {...form.register('phone')} label={t('Phone')} error={Boolean(form.formState.errors.phone)} helperText={form.formState.errors.phone?.message} />
          <TextField {...form.register('pilotLicenseNumber')} label={t('Pilot license number')} error={Boolean(form.formState.errors.pilotLicenseNumber)} helperText={form.formState.errors.pilotLicenseNumber?.message} />
          <TextField {...form.register('pilotLicenseClass')} label={t('Pilot license class')} error={Boolean(form.formState.errors.pilotLicenseClass)} helperText={form.formState.errors.pilotLicenseClass?.message} />
          <TextField {...form.register('pilotLicenseExpiresAt')} label={t('License expiry date')} type="date" slotProps={{ inputLabel: { shrink: true } }} error={Boolean(form.formState.errors.pilotLicenseExpiresAt)} helperText={form.formState.errors.pilotLicenseExpiresAt?.message} />
        </Box>
        <Button component="label" variant="outlined">
          {form.watch('pilotLicenseFile')?.name ?? t('Upload pilot license document')}
          <input
            hidden
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/webp"
            onChange={(event) => {
              const file = event.target.files?.[0];
              form.setValue('pilotLicenseFile', file, { shouldValidate: true });
            }}
          />
        </Button>
        <Typography variant="body2" color="text.secondary">{t('PDF, PNG, JPEG or WebP · maximum 10 MB')}</Typography>
        {form.formState.errors.pilotLicenseFile && <Typography color="error" variant="body2">{form.formState.errors.pilotLicenseFile.message}</Typography>}
        {error && <Alert severity="error">{error}</Alert>}
        <Button type="submit" variant="contained" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? t('Submitting…') : t('Submit application')}</Button>
        <Typography variant="body2" color="text.secondary">{t('You do not need to own or register a drone to apply.')}</Typography>
      </Stack>
    </AuthPageLayout>
  );
}
