import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import type { RoleId } from '../data/report3DashboardData';
import { AdminDashboardPage } from './AdminDashboardPage';
import { CustomerDashboardPage } from './CustomerDashboardPage';
import { InspectorDashboardPage } from './InspectorDashboardPage';
import { ManagerDashboardPage } from './ManagerDashboardPage';

export default function DashboardPage() {
  const roles = useAuthStore((state) => state.roles);
  const location = useLocation();
  const portal = location.pathname.split('/').filter(Boolean)[0] ?? '';
  const [adminViewRole, setAdminViewRole] = useState<RoleId>('ADMIN');

  if (portal === 'client' && roles.includes('CUSTOMER')) {
    return <CustomerDashboardPage />;
  }

  if (portal === 'operations' && roles.includes('INSPECTOR')) {
    return <InspectorDashboardPage />;
  }

  if (portal === 'manager' && roles.includes('MANAGER')) {
    return <ManagerDashboardPage availableRoles={['MANAGER']} />;
  }

  if (portal === 'admin' && roles.includes('ADMIN')) {
    const switchableRoles: RoleId[] = roles.includes('MANAGER') ? ['ADMIN', 'MANAGER'] : ['ADMIN'];
    if (adminViewRole === 'MANAGER' && roles.includes('MANAGER')) {
      return (
        <ManagerDashboardPage
          availableRoles={switchableRoles}
          onRoleChange={setAdminViewRole}
        />
      );
    }
    return (
      <AdminDashboardPage
        availableRoles={switchableRoles}
        onRoleChange={setAdminViewRole}
      />
    );
  }

  if (roles.includes('MANAGER')) {
    return <ManagerDashboardPage availableRoles={['MANAGER']} />;
  }
  if (roles.includes('ADMIN')) {
    return <AdminDashboardPage availableRoles={['ADMIN']} />;
  }
  if (roles.includes('INSPECTOR')) {
    return <InspectorDashboardPage />;
  }
  return <CustomerDashboardPage />;
}
