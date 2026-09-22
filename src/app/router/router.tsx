import { lazy } from 'react';
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router-dom';
import { AppShell } from '@/app/layouts/AppShell';
import { RequireAuth } from '@/features/auth/components/RequireAuth';
import LandingPage from '@/features/landing/pages/LandingPage';
import { ToastHost } from '@/shared/ui/Toast';

const LoginPage = lazy(
  () => import('@/features/auth/pages/LoginPage'),
);
const DashboardPage = lazy(
  () => import('@/features/dashboard/pages/DashboardPage'),
);
const AssetsPage = lazy(
  () => import('@/features/assets/pages/AssetsPage'),
);
const InspectionsPage = lazy(
  () => import('@/features/inspections/pages/InspectionsPage'),
);
const ReportsPage = lazy(
  () => import('@/features/reports/pages/ReportsPage'),
);
const MaintenancePage = lazy(
  () => import('@/features/maintenance/pages/MaintenancePage'),
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Outlet />,
    children: [
      {
        index: true,
        element: <LandingPage />,
      },
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        element: (
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        ),
        children: [
          { path: 'dashboard', element: <DashboardPage /> },
          { path: 'assets', element: <AssetsPage /> },
          { path: 'inspections', element: <InspectionsPage /> },
          { path: 'reports', element: <ReportsPage /> },
          { path: 'maintenance', element: <MaintenancePage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);

export function RouterWithToast() {
  return (
    <>
      <RouterProvider router={router} />
      <ToastHost />
    </>
  );
}
