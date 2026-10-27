import { lazy, Suspense, type ReactNode } from 'react';
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  RouterProvider,
  useLocation,
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
import { MotionLabPage } from '@/features/landing/pages/MotionLabPage';
import PortalSelectionPage from '@/app/pages/PortalSelectionPage';
import { useAuthStore } from '@/features/auth/store/authStore';
import { ToastHost } from '@/shared/ui/Toast';
import { useLocale } from '@/shared/i18n/LocaleProvider';

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
const InspectionsPage = lazy(
  () => import('@/features/inspections/pages/InspectionsPage'),
);
const ReportsPage = lazy(() => import('@/features/reports/pages/ReportsPage'));
const ReportDetailPage = lazy(
  () => import('@/features/reports/pages/ReportDetailPage'),
);
const InspectionDetailPage = lazy(
  () => import('@/features/inspections/pages/InspectionDetailPage'),
);
const OrganizationReportReviewPage = lazy(
  () => import('@/features/reports/pages/ReportDetailPage'),
);
const CorrectiveDispositionPage = lazy(
  () => import('@/features/reports/pages/CorrectiveDispositionPage'),
);
const InspectionEvidencePage = lazy(
  () => import('@/features/inspections/pages/InspectionEvidencePage'),
);
const InspectionFindingsPage = lazy(
  () => import('@/features/inspections/pages/InspectionFindingsPage'),
);
const InspectionDraftPage = lazy(
  () => import('@/features/inspections/pages/InspectionDraftPage'),
);

const FieldSessionPage = lazy(
  () => import('@/features/inspections/pages/FieldSessionPage'),
);
const MaintenancePage = lazy(
  () => import('@/features/maintenance/pages/MaintenancePage'),
);
const WorkforcePage = lazy(
  () => import('@/features/workforce/pages/WorkforcePage'),
);
const PlatformSubscriptionsPage = lazy(
  () => import('@/features/subscription/pages/PlatformSubscriptionsPage'),
);
const ClientSubscriptionPage = lazy(
  () => import('@/features/subscription/pages/ClientSubscriptionPage'),
);
const PlatformDroneLeasingPage = lazy(
  () => import('@/features/assets/pages/PlatformDroneLeasingPage'),
);
const ClientDroneLeasingPage = lazy(
  () => import('@/features/assets/pages/ClientDroneLeasingPage'),
);
const PlatformUsersPage = lazy(
  () => import('@/features/admin/pages/PlatformUsersPage'),
);

function SubscriptionsSectionRoute() {
  const location = useLocation();
  return location.pathname.startsWith('/admin') ? (
    <PlatformSubscriptionsPage />
  ) : (
    <ClientSubscriptionPage />
  );
}

function DroneLeasingSectionRoute() {
  const location = useLocation();
  return location.pathname.startsWith('/admin') ? (
    <PlatformDroneLeasingPage />
  ) : (
    <ClientDroneLeasingPage />
  );
}

const SECTION_ELEMENTS: Record<SectionId, ReactNode> = {
  dashboard: <DashboardPage />,
  assets: <AssetsPage />,
  'asset-catalog': <AssetCatalogPage />,
  'asset-review': <AssetReviewPage />,
  inspections: <InspectionsPage />,
  reports: <ReportsPage />,
  maintenance: <MaintenancePage />,
  workforce: <WorkforcePage />,
  subscriptions: <SubscriptionsSectionRoute />,
  'drone-leasing': <DroneLeasingSectionRoute />,
  'platform-users': <PlatformUsersPage />,
  settings: <AccountSecurityPage />,
};

function InspectionWorkspaceIndexRedirect() {
  const roles = useAuthStore((state) => state.roles);
  return <Navigate to={roles.includes('ORG_MANAGER') ? 'review' : 'evidence'} replace />;
}

function InspectionReportStage() {
  const roles = useAuthStore((state) => state.roles);
  return roles.includes('ORG_MANAGER')
    ? <Navigate to="../review" replace />
    : <InspectionDraftPage />;
}

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
      // Only the sections a portal actually grants get a route. A section with an empty role list
      // (Workforce outside the client workspace) must not be reachable at /<portal>/<section> at
      // all — otherwise it would exist as a URL that always denies instead of not existing.
      ...SECTION_IDS.filter(
        (section) => getSectionRoles(portal, section).length > 0,
      ).map((section) => ({
        path: section,
        element: (
          <RequireAuth roles={getSectionRoles(portal, section)}>
            {SECTION_ELEMENTS[section]}
          </RequireAuth>
        ),
      })),
      {
        path: 'inspections/:inspectionId',
        element: (
          <RequireAuth roles={getSectionRoles(portal, 'inspections')}>
            <InspectionDetailPage />
          </RequireAuth>
        ),
        children: [
          { index: true, element: <InspectionWorkspaceIndexRedirect /> },
          ...(portal === 'client'
            ? [
                {
                  path: 'review',
                  element: (
                    <RequireAuth roles={['ORG_MANAGER']}>
                      <OrganizationReportReviewPage />
                    </RequireAuth>
                  ),
                },
                {
                  // MF3-12: the post-publication corrective disposition is its own phase, so it
                  // is not reachable from the report review screen where a reviewer might read it
                  // as "editing the report".
                  path: 'corrective',
                  element: (
                    <RequireAuth roles={['ORG_MANAGER']}>
                      <CorrectiveDispositionPage />
                    </RequireAuth>
                  ),
                },
              ]
            : []),
          { path: 'evidence', element: <InspectionEvidencePage /> },
          { path: 'findings', element: <InspectionFindingsPage /> },
          { path: 'report', element: <InspectionReportStage /> },
          { path: 'field-session', element: <FieldSessionPage /> },
        ],
      },
      {
        path: 'reports/:inspectionId',
        element: (
          <RequireAuth roles={getSectionRoles(portal, 'reports')}>
            <ReportDetailPage />
          </RequireAuth>
        ),
      },
      {
        path: 'account/security',
        element: <Navigate to="../settings" replace />,
      },
      {
        path: 'settings',
        element: (
          <RequireAuth roles={getSectionRoles(portal, 'settings')}>
            <AccountSecurityPage />
          </RequireAuth>
        ),
      },
    ],
  };
});

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Outlet />,
    children: [
      {
        index: true,
        element: <LandingPage />,
        loader: () => {
          const host = window.location.hostname;
          if (host.startsWith('smartdroneinspection-admin') || host.startsWith('smartdroneinspection-operations')) {
            return new Response(null, { status: 302, headers: { Location: '/login' } });
          }
          return null;
        },
      },
      {
        path: 'motion-lab',
        element: <MotionLabPage />,
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
  const { t } = useLocale();
  return (
    <>
      <Suspense
        fallback={(
          <Box
            sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}
          >
            <CircularProgress aria-label={t('Loading page')} />
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
