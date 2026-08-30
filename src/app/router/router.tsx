import { lazy } from 'react';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { AppShell } from '@/app/layouts/AppShell';
import { RequireAuth } from '@/features/auth/components/RequireAuth';
import { ToastHost } from '@/shared/ui/Toast';

const LoginPage = lazy(
  () => import('@/features/auth/pages/LoginPage'),
);
const DashboardPage = lazy(
  () => import('@/features/ai/pages/DashboardPage'),
);

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      // Module routes are added per-feature as they are built:
      // /assets (assets module), /inspections, /reports, /defects,
      // /tickets, /ai, /users — each with its own roles config.
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
]);

export function RouterWithToast() {
  return (
    <>
      <RouterProvider router={router} />
      <ToastHost />
    </>
  );
}
