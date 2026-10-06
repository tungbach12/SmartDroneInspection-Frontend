import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Stack } from '@mui/material';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { AuthPageLayout } from '../components/AuthPageLayout';
import { activateProvider, getAuthErrorMessage } from '../api/authApi';

export default function ActivateProviderPage() {
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<
    | { kind: 'loading' }
    | { kind: 'success' }
    | { kind: 'error'; message: string }
  >({ kind: 'loading' });
  const started = useRef(false);

  useEffect(() => {
    if (started.current) {
      return;
    }
    started.current = true;
    const token = searchParams.get('token');
    if (!token) {
      setState({ kind: 'error', message: 'Missing activation token.' });
      return;
    }
    activateProvider(token)
      .then(() => setState({ kind: 'success' }))
      .catch((error) =>
        setState({ kind: 'error', message: getAuthErrorMessage(error) }),
      );
  }, [searchParams]);

  return (
    <AuthPageLayout
      eyebrow="Provider onboarding"
      title="Activating your provider account"
      description="We are verifying your activation link."
      backLabel="Back to sign in"
      backTo="/login"
    >
      <Stack spacing={1.6}>
        {state.kind === 'loading' && (
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            Activating…
          </Alert>
        )}
        {state.kind === 'success' && (
          <>
            <Alert severity="success" sx={{ borderRadius: 2 }}>
              Your provider account is activated. You can sign in now.
            </Alert>
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
              Go to sign in
            </Button>
          </>
        )}
        {state.kind === 'error' && (
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            {state.message}
          </Alert>
        )}
      </Stack>
    </AuthPageLayout>
  );
}
