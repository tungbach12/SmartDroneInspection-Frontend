import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { getAuthErrorMessage, changePassword, logoutAllSessions } from '../api/authApi';
import {
  passwordChangeSchema,
  type PasswordChangeFormValues,
} from '../schemas/authSchemas';
import { useAuthStore } from '../store/authStore';

export default function AccountSecurityPage() {
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  const form = useForm<PasswordChangeFormValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onChangePassword = async (values: PasswordChangeFormValues) => {
    setErrorMessage(null);
    try {
      await changePassword(values.currentPassword, values.newPassword);
      clearSession();
      navigate('/login?passwordChanged=1', { replace: true });
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error));
    }
  };

  const onLogoutAll = async () => {
    setErrorMessage(null);
    try {
      await logoutAllSessions();
      clearSession();
      navigate('/login', { replace: true });
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error));
    } finally {
      setLogoutDialogOpen(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 760, mx: 'auto', py: { xs: 2, md: 4 } }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="overline" color="primary" sx={{ fontWeight: 800 }}>
            Account
          </Typography>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 800 }}>
            Security and sign-in
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Manage your password and active sessions. Changing your password
            signs out all existing sessions.
          </Typography>
        </Box>

        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

        <Box
          sx={{
            p: { xs: 2, sm: 3 },
            border: 1,
            borderColor: 'divider',
            borderRadius: 3,
            bgcolor: 'background.paper',
          }}
        >
          <Stack spacing={1.5}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Signed-in account
            </Typography>
            <Typography sx={{ fontWeight: 600 }}>{user?.fullName}</Typography>
            <Typography color="text.secondary">{user?.email}</Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              {user?.roles.map((role) => (
                <Chip key={role} label={role.replaceAll('_', ' ')} size="small" />
              ))}
            </Stack>
          </Stack>
        </Box>

        <Box
          component="form"
          onSubmit={form.handleSubmit(onChangePassword)}
          noValidate
          sx={{
            p: { xs: 2, sm: 3 },
            border: 1,
            borderColor: 'divider',
            borderRadius: 3,
            bgcolor: 'background.paper',
          }}
        >
          <Stack spacing={2}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Change password
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Choose 15–128 characters. Common passwords and account details
                are rejected.
              </Typography>
            </Box>
            <TextField
              {...form.register('currentPassword')}
              label="Current password"
              type="password"
              autoComplete="current-password"
              fullWidth
              error={Boolean(form.formState.errors.currentPassword)}
              helperText={form.formState.errors.currentPassword?.message}
            />
            <TextField
              {...form.register('newPassword')}
              label="New password"
              type="password"
              autoComplete="new-password"
              fullWidth
              error={Boolean(form.formState.errors.newPassword)}
              helperText={form.formState.errors.newPassword?.message}
            />
            <TextField
              {...form.register('confirmPassword')}
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              fullWidth
              error={Boolean(form.formState.errors.confirmPassword)}
              helperText={form.formState.errors.confirmPassword?.message}
            />
            <Button
              type="submit"
              variant="contained"
              disabled={form.formState.isSubmitting}
              sx={{ alignSelf: 'flex-start', minWidth: 170 }}
            >
              {form.formState.isSubmitting ? 'Updating…' : 'Update password'}
            </Button>
          </Stack>
        </Box>

        <Box
          sx={{
            p: { xs: 2, sm: 3 },
            border: 1,
            borderColor: 'divider',
            borderRadius: 3,
            bgcolor: 'background.paper',
          }}
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{
              alignItems: { xs: 'stretch', sm: 'center' },
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Sign out everywhere
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Revoke all active sessions for this account, including this one.
              </Typography>
            </Box>
            <Button
              color="error"
              variant="outlined"
              onClick={() => setLogoutDialogOpen(true)}
              sx={{ flexShrink: 0 }}
            >
              Sign out everywhere
            </Button>
          </Stack>
        </Box>
      </Stack>

      <Dialog
        open={logoutDialogOpen}
        onClose={() => setLogoutDialogOpen(false)}
        aria-labelledby="logout-all-title"
      >
        <DialogTitle id="logout-all-title">Sign out on every device?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            This revokes all active sessions. You will need to sign in again.
          </Typography>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setLogoutDialogOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={onLogoutAll}>
            Sign out everywhere
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
