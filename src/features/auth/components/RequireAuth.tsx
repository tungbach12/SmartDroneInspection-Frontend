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
    return <Navigate to="/forbidden" replace />;
  }

  return children ?? <Outlet />;
}
