import { lazy, Suspense, type ReactNode } from 'react';
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  RouterProvider,
} from 'react-router-dom';
import { BrandLoadingScreen } from '@/shared/components/BrandLoadingScreen';
import { AppShell } from '@/app/layouts/AppShell';
import {
  getLegacySectionRedirectPath,
  getPortalEntryPath,
  getPortalRoles,
  getSectionPath,
  getSectionPathSegment,
  getSectionRoles,
  LEGACY_ADMIN_REDIRECTS,
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
const OAuthCallbackPage = lazy(() => import('@/features/auth/pages/OAuthCallbackPage'));
const RegisterPage = lazy(() => import('@/features/auth/pages/RegisterPage'));
const InspectorRegisterPage = lazy(
  () => import('@/features/auth/pages/InspectorRegisterPage'),
);
const AccountSecurityPage = lazy(
  () => import('@/features/auth/pages/AccountSecurityPage'),
);
const DashboardPage = lazy(
  () => import('@/features/dashboard/pages/DashboardPage'),
);
const AssetsPage = lazy(() => import('@/features/assets/pages/AssetsPage'));
const AssetCatalogPage = lazy(() => import('@/features/assets/pages/AssetCatalogPage'));
const FlightDroneConfigPage = lazy(
  () => import('@/features/assets/pages/FlightDroneConfigPage'),
);
const InspectorDroneRegistrationPage = lazy(
  () => import('@/features/assets/pages/InspectorDroneRegistrationPage'),
);
const FinanceHistoryPage = lazy(
  () => import('@/features/contracts/pages/FinanceHistoryPage'),
);
const InspectorOnboardingPage = lazy(
  () => import('@/features/admin/pages/InspectorOnboardingPage'),
);
const InspectionsPage = lazy(
  () => import('@/features/inspections/pages/InspectionsPage'),
);
const ReportsPage = lazy(() => import('@/features/reports/pages/ReportsPage'));
const ReportDetailPage = lazy(
  () => import('@/features/reports/pages/ReportDetailPage'),
);
const ManagerReportReviewPage = lazy(
  () => import('@/features/reports/pages/ManagerReportReviewPage'),
);
const CustomerReportDeliverablePage = lazy(
  () => import('@/features/reports/pages/CustomerReportDeliverablePage'),
);
const InspectionDetailPage = lazy(
  () => import('@/features/inspections/pages/InspectionDetailPage'),
);
const InspectionProgressPage = lazy(
  () => import('@/features/inspections/pages/InspectionProgressPage'),
);
const OrganizationReportReviewPage = lazy(
  () => import('@/features/reports/pages/ReportDetailPage'),
);
const InspectionEvidencePage = lazy(
  () => import('@/features/inspections/pages/InspectionEvidencePage'),
);
const InspectionFindingsPage = lazy(
  () => import('@/features/inspections/pages/InspectionFindingsPage'),
);
const InspectionReportPage = lazy(
  () => import('@/features/inspections/pages/InspectionReportPage'),
);

const FieldSessionPage = lazy(
  () => import('@/features/inspections/pages/FieldSessionPage'),
);
const PlatformUsersPage = lazy(
  () => import('@/features/admin/pages/PlatformUsersPage'),
);
const ManagerPartnerInspectorsPage = lazy(
  () => import('@/features/admin/pages/ManagerPartnerInspectorsPage'),
);
const ContractsPage = lazy(
  () => import('@/features/contracts/pages/ContractsPage'),
);
const ContractInboxPage = lazy(
  () => import('@/features/contracts/pages/ContractInboxPage'),
);
const PlatformSettingsHubPage = lazy(
  () => import('@/features/admin/pages/PlatformSettingsHubPage'),
);
const Mf1ReviewPage = lazy(
  () => import('@/features/admin/pages/Mf1ReviewPage'),
);
const AdminAuditLogPage = lazy(
  () => import('@/features/admin/pages/AdminAuditLogPage'),
);
const NotificationsPage = lazy(
  () => import('@/features/notifications/pages/NotificationsPage'),
);

const SECTION_ELEMENTS: Record<SectionId, ReactNode> = {
  dashboard: <DashboardPage />,
  contracts: <ContractsPage />,
  messages: <ContractInboxPage />,
  assets: <AssetsPage />,
  'asset-catalog': <AssetCatalogPage />,
  'flight-drone-config': <FlightDroneConfigPage />,
  inspections: <InspectionsPage />,
  reports: <ReportsPage />,
  'platform-users': <PlatformUsersPage />,
  'platform-settings': <PlatformSettingsHubPage />,
  'onboarding-reviews': <Mf1ReviewPage fixedQueue="inspectors" />,
  'drone-registrations': <Mf1ReviewPage fixedQueue="drones" />,
  'customer-airspace': <Mf1ReviewPage fixedQueue="customers" />,
  'audit-logs': <AdminAuditLogPage />,
  'inspector-drones': <InspectorDroneRegistrationPage />,
  notifications: <NotificationsPage />,
  'finance-history': <FinanceHistoryPage />,
  'payout-settlements': <FinanceHistoryPage mode="payouts" />,
  settings: <AccountSecurityPage />,
};

function resolvePortalSectionElement(
  portal: PortalId,
  section: SectionId,
): ReactNode {
  if (portal === 'manager' && section === 'platform-users') {
    return <ManagerPartnerInspectorsPage />;
  }
  return SECTION_ELEMENTS[section];
}

function InspectionWorkspaceIndexRedirect() {
  const roles = useAuthStore((state) => state.roles);
  if (roles.includes('CUSTOMER')) {
    return <Navigate to="tracking" replace state={{ autoResumeStep: true }} />;
  }
  const isReviewer = roles.some((role) =>
    ['MANAGER', 'ADMIN'].includes(role),
  );
  return (
    <Navigate
      to={isReviewer ? 'review' : 'permit'}
      replace
      state={{ autoResumeStep: true }}
    />
  );
}

function InspectionReportStage() {
  const roles = useAuthStore((state) => state.roles);
  if (roles.includes('CUSTOMER')) {
    return <CustomerReportDeliverablePage stage="report" />;
  }
  const isReviewer = roles.some((role) =>
    ['MANAGER', 'ADMIN'].includes(role),
  );
  return isReviewer
    ? <Navigate to="../review" replace />
    : <InspectionReportPage />;
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
        path: getSectionPathSegment(section),
        element: (
          <RequireAuth roles={getSectionRoles(portal, section)}>
            {resolvePortalSectionElement(portal, section)}
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
          { path: 'tracking', element: <InspectionProgressPage /> },
          ...(portal === 'admin' || portal === 'manager'
            ? [
                {
                  path: 'audit',
                  element: (
                    <RequireAuth roles={['ADMIN', 'MANAGER']}>
                      <ManagerReportReviewPage stage="audit" />
                    </RequireAuth>
                  ),
                },
              ]
            : []),
          ...(portal === 'client' || portal === 'admin' || portal === 'manager'
            ? [
                {
                  path: 'review',
                  element: (
                    <RequireAuth roles={['CUSTOMER', 'ADMIN', 'MANAGER']}>
                      {portal === 'manager' || portal === 'admin' ? (
                        <ManagerReportReviewPage stage="review" />
                      ) : (
                        <OrganizationReportReviewPage />
                      )}
                    </RequireAuth>
                  ),
                },
              ]
            : []),
          ...(portal === 'manager'
            ? [
                {
                  path: 'payout',
                  element: (
                    <RequireAuth roles={['MANAGER']}>
                      <ManagerReportReviewPage stage="payout" />
                    </RequireAuth>
                  ),
                },
              ]
            : []),
          ...(portal === 'client' || portal === 'manager'
            ? [
                {
                  path: 'settlement',
                  element: (
                    <RequireAuth roles={['CUSTOMER', 'MANAGER']}>
                      {portal === 'manager' ? (
                        <ManagerReportReviewPage stage="settlement" />
                      ) : (
                        <CustomerReportDeliverablePage stage="settlement" />
                      )}
                    </RequireAuth>
                  ),
                },
              ]
            : []),
          { path: 'evidence', element: <InspectionEvidencePage /> },
          { path: 'findings', element: <InspectionFindingsPage /> },
          { path: 'report', element: <InspectionReportStage /> },
          ...(portal === 'admin' || portal === 'manager' || portal === 'operations'
            ? [
                {
                  path: 'permit',
                  element: (
                    <RequireAuth roles={['INSPECTOR', 'ADMIN', 'MANAGER']}>
                      <FieldSessionPage stage="permit" />
                    </RequireAuth>
                  ),
                },
              ]
            : []),
          ...(portal === 'manager' || portal === 'operations'
            ? [
                {
                  path: 'pre-flight',
                  element: (
                    <RequireAuth roles={['INSPECTOR', 'ADMIN', 'MANAGER']}>
                      <FieldSessionPage stage="pre-flight" />
                    </RequireAuth>
                  ),
                },
                {
                  path: 'field-session',
                  element: (
                    <RequireAuth roles={['INSPECTOR', 'ADMIN', 'MANAGER']}>
                      <FieldSessionPage stage="flight" />
                    </RequireAuth>
                  ),
                },
                {
                  path: 'post-flight',
                  element: (
                    <RequireAuth roles={['INSPECTOR', 'ADMIN', 'MANAGER']}>
                      <FieldSessionPage stage="post-flight" />
                    </RequireAuth>
                  ),
                },
              ]
            : []),
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
        path: 'partner-onboarding',
        element: (
          <RequireAuth roles={['INSPECTOR']}>
            <InspectorOnboardingPage />
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
      ...(portal === 'admin'
        ? [
            ...Object.entries(LEGACY_ADMIN_REDIRECTS).map(([path, target]) => ({
              path,
              element: <Navigate to={target} replace />,
            })),
          ]
        : []),
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
        path: 'auth/callback',
        element: <OAuthCallbackPage />,
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
        path: 'register-inspector',
        element: (
          <PublicOnly>
            <InspectorRegisterPage />
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
              path: getSectionPathSegment(section),
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
      <Suspense fallback={<BrandLoadingScreen label={t('Loading page')} />}>
        <AuthSessionBootstrapper />
        <RouterProvider router={router} />
      </Suspense>
      <ToastHost />
    </>
  );
}
