import { lazy, Suspense, type ReactNode } from 'react';
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  RouterProvider,
} from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { AppShell } from '@/app/layouts/AppShell';
import {
  getLegacySectionRedirectPath,
  getPortalEntryPath,
  getPortalRoles,
  getSectionPath,
  getSectionRoles,
  PORTAL_IDS,
  SECTION_IDS,
  type PortalId,
  type SectionId,
} from '@/app/permissions/accessPolicy';
import { RequireAuth } from '@/features/auth/components/RequireAuth';
import {
  AuthSessionBootstrapper,
  PublicOnly,
} from '@/features/auth/components/AuthSessionBootstrapper';
import AccessDeniedPage from '@/features/auth/pages/AccessDeniedPage';
import LandingPage from '@/features/landing/pages/LandingPage';
import PortalSelectionPage from '@/app/pages/PortalSelectionPage';
import { useAuthStore } from '@/features/auth/store/authStore';
import { ToastHost } from '@/shared/ui/Toast';

const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/features/auth/pages/RegisterPage'));
const AccountSecurityPage = lazy(
  () => import('@/features/auth/pages/AccountSecurityPage'),
);
const DashboardPage = lazy(
  () => import('@/features/dashboard/pages/DashboardPage'),
);
const AssetsPage = lazy(() => import('@/features/assets/pages/AssetsPage'));
const AssetCatalogPage = lazy(() => import('@/features/assets/pages/AssetCatalogPage'));
const AssetReviewPage = lazy(() => import('@/features/assets/pages/AssetReviewPage'));
const ScheduleProposalsPage = lazy(
  () => import('@/features/assets/pages/ScheduleProposalsPage'),
);
const InspectionSchedulesPage = lazy(
  () => import('@/features/assets/pages/InspectionSchedulesPage'),
);
const InspectionsPage = lazy(
  () => import('@/features/inspections/pages/InspectionsPage'),
);
const ReportsPage = lazy(() => import('@/features/reports/pages/ReportsPage'));
const MaintenancePage = lazy(
  () => import('@/features/maintenance/pages/MaintenancePage'),
);
const ProviderTeamPage = lazy(
  () => import('@/features/operations/pages/ProviderTeamPage'),
);
const ProviderRegistrationPage = lazy(
  () => import('@/features/auth/pages/ProviderRegistrationPage'),
);
const ActivateProviderPage = lazy(
  () => import('@/features/auth/pages/ActivateProviderPage'),
);

const SECTION_ELEMENTS: Record<SectionId, ReactNode> = {
  dashboard: <DashboardPage />,
  assets: <AssetsPage />,
  'asset-catalog': <AssetCatalogPage />,
  'asset-review': <AssetReviewPage />,
  inspections: <InspectionsPage />,
  reports: <ReportsPage />,
  maintenance: <MaintenancePage />,
  team: <ProviderTeamPage />,
};

function PortalEntryRedirect() {
  const roles = useAuthStore((state) => state.roles);
  return <Navigate to={getPortalEntryPath(roles)} replace />;
}

function LegacySectionRedirect({ section }: { section: SectionId }) {
  const roles = useAuthStore((state) => state.roles);
  return (
    <Navigate to={getLegacySectionRedirectPath(roles, section)} replace />
  );
}

const portalRoutes = PORTAL_IDS.map((portal: PortalId) => {
  return {
    path: portal,
    element: (
      <RequireAuth roles={getPortalRoles(portal)}>
        <AppShell portal={portal} />
      </RequireAuth>
    ),
    children: [
      {
        index: true,
        element: (
          <Navigate to={getSectionPath(portal, 'dashboard')} replace />
        ),
      },
      ...SECTION_IDS.map((section) => ({
        path: section,
        element: (
          <RequireAuth roles={getSectionRoles(portal, section)}>
            {SECTION_ELEMENTS[section]}
          </RequireAuth>
        ),
      })),
      ...(portal === 'client'
        ? [
            {
              path: 'schedule-proposals/:assetId',
              element: (
                <RequireAuth roles={['CLIENT']}>
                  <ScheduleProposalsPage />
                </RequireAuth>
              ),
            },
            {
              path: 'inspection-schedules/:assetId',
              element: (
                <RequireAuth roles={['CLIENT']}>
                  <InspectionSchedulesPage />
                </RequireAuth>
              ),
            },
          ]
        : []),
      {
        path: 'account/security',
        element: <AccountSecurityPage />,
      },
    ],
  };
});

const router = createBrowserRouter([
  {
    path: '/',
    element: <Outlet />,
    children: [
      {
        index: true,
        element: <LandingPage />,
        loader: () => {
          const host = window.location.hostname;
          if (host.startsWith('smartdroneinspection-admin') || host.startsWith('smartdroneinspection-provider')) {
            return new Response(null, { status: 302, headers: { Location: '/login' } });
          }
          return null;
        },
      },
      {
        path: 'login',
        element: (
          <PublicOnly>
            <LoginPage />
          </PublicOnly>
        ),
      },
      {
        path: 'register',
        element: (
          <PublicOnly>
            <RegisterPage />
          </PublicOnly>
        ),
      },
      {
        path: 'register-provider',
        element: (
          <PublicOnly>
            <ProviderRegistrationPage />
          </PublicOnly>
        ),
      },
      { path: 'activate-provider', element: <ActivateProviderPage /> },
      { path: 'forbidden', element: <AccessDeniedPage /> },
      {
        path: 'portals',
        element: (
          <RequireAuth>
            <PortalSelectionPage />
          </RequireAuth>
        ),
      },
      ...portalRoutes,
      {
        element: <RequireAuth />,
        children: [
          { path: 'dashboard', element: <PortalEntryRedirect /> },
          ...SECTION_IDS.filter((section) => section !== 'dashboard').map(
            (section) => ({
              path: section,
              element: <LegacySectionRedirect section={section} />,
            }),
          ),
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

export function RouterWithToast() {
  return (
    <>
      <Suspense
        fallback={(
          <Box
            sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}
          >
            <CircularProgress aria-label="Loading page" />
          </Box>
        )}
      >
        <AuthSessionBootstrapper />
        <RouterProvider router={router} />
      </Suspense>
      <ToastHost />
    </>
  );
}
