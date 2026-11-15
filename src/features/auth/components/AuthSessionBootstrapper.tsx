import { useEffect, type PropsWithChildren } from 'react';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { BrandLoadingScreen } from '@/shared/components/BrandLoadingScreen';
import { getAuthRedirectTarget, getLoginReturnTo } from '../utils/authRedirect';
import { initializeBrowserSession } from '../api/sessionBootstrap';
import { useAuthStore } from '../store/authStore';
import { useLocale } from '@/shared/i18n/LocaleProvider';

export function AuthSessionBootstrapper() {
  useEffect(() => {
    void initializeBrowserSession();
  }, []);

  return null;
}

export function AuthLoadingScreen() {
  const { t } = useLocale();
  return <BrandLoadingScreen label={t('Checking your session')} />;
}

export function PublicOnly({ children }: PropsWithChildren) {
  const status = useAuthStore((state) => state.status);
  const roles = useAuthStore((state) => state.roles);
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Public pages must remain reachable while session restoration is pending. A stale
  // refresh cookie must not block a visitor from signing up.
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
