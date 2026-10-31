import { useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchCurrentUser, getAuthErrorMessage } from '../api/authApi';
import { useAuthStore } from '../store/authStore';
import { getAuthRedirectTarget } from '../utils/authRedirect';
import { getPortalForHost } from '../utils/domainPortal';
import { hasAnyRole, PORTAL_ROLE_ACCESS, type PortalId } from '@/app/permissions/accessPolicy';
import { useLocale } from '@/shared/i18n/LocaleProvider';

export default function OAuthCallbackPage() {
  const { t } = useLocale();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      if (error === 'google_oauth_not_configured') {
        setErrorMessage(t('Google Sign-In is not configured on this server.'));
      } else if (error === 'access_denied') {
        setErrorMessage(t('Google Sign-In was cancelled or access was denied.'));
      } else {
        setErrorMessage(t('Authentication failed: ') + error);
      }
      return;
    }

    const accessToken = searchParams.get('accessToken');
    if (!accessToken) {
      setErrorMessage(t('Missing access token in callback.'));
      return;
    }

    let isMounted = true;
    fetchCurrentUser(accessToken)
      .then((user) => {
        if (!isMounted) return;
        const portal: PortalId | null = getPortalForHost(window.location.hostname);
        if (portal && !hasAnyRole(user.roles, PORTAL_ROLE_ACCESS[portal])) {
          setErrorMessage(t('This account does not belong to this workspace.'));
          return;
        }

        setSession({ accessToken, user });
        const target = getAuthRedirectTarget('/', user.roles);
        navigate(target, { replace: true });
      })
      .catch((err) => {
        if (!isMounted) return;
        setErrorMessage(getAuthErrorMessage(err));
      });

    return () => {
      isMounted = false;
    };
  }, [searchParams, navigate, setSession, t]);

  if (errorMessage) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          bgcolor: '#F8FBFA',
          p: 3,
        }}
      >
        <Stack spacing={3} sx={{ maxWidth: 420, width: '100%', alignItems: 'center' }}>
          <Alert severity="error" sx={{ width: '100%', borderRadius: 2 }}>
            {errorMessage}
          </Alert>
          <Button
            variant="contained"
            onClick={() => navigate('/login', { replace: true })}
            sx={{
              borderRadius: '8px',
              bgcolor: '#087E8B',
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': { bgcolor: '#066B70' },
            }}
          >
            {t('Back to sign in')}
          </Button>
        </Stack>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        bgcolor: '#F8FBFA',
      }}
    >
      <CircularProgress sx={{ color: '#087E8B' }} />
      <Typography variant="body2" sx={{ color: '#5F7872' }}>
        {t('Completing Google Sign-In…')}
      </Typography>
    </Box>
  );
}
