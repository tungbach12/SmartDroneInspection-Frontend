import { useEffect, type PropsWithChildren } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { getAuthRedirectTarget, getLoginReturnTo } from '../utils/authRedirect';
import { initializeBrowserSession } from '../api/sessionBootstrap';
import { useAuthStore } from '../store/authStore';

export function AuthSessionBootstrapper() {
  useEffect(() => {
    void initializeBrowserSession();
  }, []);

  return null;
}

export function AuthLoadingScreen() {
  return (
    <Box
      sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}
    >
      <CircularProgress aria-label="Checking your session" />
    </Box>
  );
}

export function PublicOnly({ children }: PropsWithChildren) {
  const status = useAuthStore((state) => state.status);
  const roles = useAuthStore((state) => state.roles);
  const location = useLocation();
  const [searchParams] = useSearchParams();

  if (status === 'checking') {
    return <AuthLoadingScreen />;
  }

  if (status === 'authenticated') {
    const from = (location.state as { from?: unknown } | null)?.from;
    const returnTo = getLoginReturnTo(
      from,
      searchParams.get('returnTo'),
    );
    return (
      <Navigate
        to={getAuthRedirectTarget(returnTo, roles)}
        replace
      />
    );
  }

  return children;
}
