import { useEffect, type PropsWithChildren } from 'react';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { BrandLoadingScreen } from '@/shared/components/BrandLoadingScreen';
import { setApiRequestTimeoutMs } from '@/shared/api/client';
import { operationsSettingsApi } from '@/features/admin/api/operationsSettingsApi';
import { getAuthRedirectTarget, getLoginReturnTo } from '../utils/authRedirect';
import { initializeBrowserSession } from '../api/sessionBootstrap';
import { useAuthStore } from '../store/authStore';
import { useLocale } from '@/shared/i18n/LocaleProvider';

export function AuthSessionBootstrapper() {
  const status = useAuthStore((state) => state.status);

  useEffect(() => {
    void initializeBrowserSession();
  }, []);

  useEffect(() => {
    if (status !== 'authenticated') return;
    let active = true;
    void operationsSettingsApi
      .getClientTimeout()
      .then((res) => {
        if (active && typeof res?.apiRequestTimeoutSeconds === 'number') {
          setApiRequestTimeoutMs(res.apiRequestTimeoutSeconds * 1000);
        }
      })
      .catch(() => {
        // Keep default client timeout when the policy endpoint is unavailable.
      });
    return () => {
      active = false;
    };
  }, [status]);

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
