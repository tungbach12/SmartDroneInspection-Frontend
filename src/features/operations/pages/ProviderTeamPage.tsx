import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { PageHeader } from '@/shared/ui/PageHeader';
import { createProviderUser, getAuthErrorMessage } from '@/features/auth/api/authApi';
import {
  providerUserSchema,
  type ProviderUserFormValues,
} from '@/features/auth/schemas/authSchemas';

export default function ProviderTeamPage() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const form = useForm<ProviderUserFormValues>({
    resolver: zodResolver(providerUserSchema),
    defaultValues: { email: '', fullName: '', role: 'INSPECTOR' },
  });

  const onSubmit = async (values: ProviderUserFormValues) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const result = await createProviderUser({
        email: values.email,
        fullName: values.fullName,
        role: values.role,
      });
      setSuccessMessage(
        `Account created for ${values.email}. Temporary password (shown once): ${result.temporaryPassword}`,
      );
      form.reset({ email: '', fullName: '', role: 'INSPECTOR' });
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error));
    }
  };

  return (
    <Box>
      <PageHeader
        title="Team"
        subtitle="Create Inspector and Maintenance Engineer accounts for your provider organization."
      />
      <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 3 }, maxWidth: 560 }}>
        <Stack
          component="form"
          spacing={1.6}
          noValidate
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <TextField
            {...form.register('fullName')}
            label="Full name"
            autoComplete="name"
            fullWidth
            error={Boolean(form.formState.errors.fullName)}
            helperText={form.formState.errors.fullName?.message}
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
          <FormControl fullWidth error={Boolean(form.formState.errors.role)}>
            <InputLabel id="provider-user-role-label">Role</InputLabel>
            <Controller
              name="role"
              control={form.control}
              render={({ field }) => (
                <Select
                  labelId="provider-user-role-label"
                  label="Role"
                  {...field}
                >
                  <MenuItem value="INSPECTOR">Inspector</MenuItem>
                  <MenuItem value="MAINTENANCE_ENGINEER">
                    Maintenance engineer
                  </MenuItem>
                </Select>
              )}
            />
            {form.formState.errors.role && (
              <Typography variant="caption" color="error">
                {form.formState.errors.role.message}
              </Typography>
            )}
          </FormControl>
          {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
          {successMessage && (
            <Alert severity="success">{successMessage}</Alert>
          )}
          <Button
            type="submit"
            variant="contained"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? 'Creating…' : 'Create account'}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
