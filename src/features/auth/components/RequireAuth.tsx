import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { Role } from '../store/authStore';
import { useAuthStore } from '../store/authStore';

interface RequireAuthProps {
  roles?: Role[];
  children?: React.ReactNode;
}

export function RequireAuth({ roles, children }: RequireAuthProps) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const userRoles = useAuthStore((s) => s.roles);
  const location = useLocation();

  if (!accessToken) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && roles.length > 0 && !roles.some((r) => userRoles.includes(r))) {
    return <Navigate to="/forbidden" replace />;
  }

  return children ?? <Outlet />;
}
