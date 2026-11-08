import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthLoadingScreen } from './AuthSessionBootstrapper';
import type { Role } from '../store/authStore';
import { useAuthStore } from '../store/authStore';

interface RequireAuthProps {
  roles?: readonly Role[];
  children?: React.ReactNode;
}

export function RequireAuth({ roles, children }: RequireAuthProps) {
  const status = useAuthStore((s) => s.status);
  const accessToken = useAuthStore((s) => s.accessToken);
  const userRoles = useAuthStore((s) => s.roles);
  const location = useLocation();

  if (status === 'checking') {
    return <AuthLoadingScreen />;
  }

  if (status !== 'authenticated' || !accessToken) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.some((r) => userRoles.includes(r))) {
    if (
      userRoles.includes('MANAGER') &&
      !userRoles.includes('ADMIN') &&
      location.pathname.startsWith('/admin')
    ) {
      const redirectedPath =
        location.pathname.replace(/^\/admin(?=\/|$)/, '/manager') +
        location.search +
        location.hash;
      return <Navigate to={redirectedPath} replace />;
    }
    if (
      userRoles.includes('ADMIN') &&
      !userRoles.includes('MANAGER') &&
      location.pathname.startsWith('/manager')
    ) {
      const redirectedPath =
        location.pathname.replace(/^\/manager(?=\/|$)/, '/admin') +
        location.search +
        location.hash;
      return <Navigate to={redirectedPath} replace />;
    }
    return <Navigate to="/forbidden" replace />;
  }

  return children ?? <Outlet />;
}
