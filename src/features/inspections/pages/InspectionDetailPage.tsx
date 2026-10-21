import { NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Box, Button, Tab, Tabs, Typography } from '@mui/material';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getSectionPath } from '@/app/permissions/accessPolicy';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import { PageHeader } from '@/shared/ui/PageHeader';
import {
  useInspection,
  useInspectionPreparations,
  useReportVersions,
} from '../hooks/useInspections';

const INSPECTOR_TABS = [
  { value: 'evidence', label: 'Evidence', to: 'evidence' },
  { value: 'findings', label: 'Findings', to: 'findings' },
  { value: 'report', label: 'Report draft', to: 'report' },
  { value: 'preparation', label: 'Preparation', to: 'preparation' },
  { value: 'field-session', label: 'Field session', to: 'field-session' },
] as const;

/**
/**
 * The reviewer's tabs are decision phases, not data types.
 *
 * <p>Report 3 MF3-09/10 keeps the administrator's decision at report level: the reviewer does not
 * separately accept each evidence item or each finding. A tab bar that listed "Evidence review" and
 * "Findings overview" beside the decisions would read as a per-item queue, which is not what the
 * administrator is asked to do.
 *
 * <p>So there is one tab per phase in which the administrator actually decides: the readiness
 * review (MF2-07) before flight, the report review (MF3-09/10/11) after submission, and the
 * corrective disposition (MF3-12) after publication. The evidence register and the confirmed
 * findings are read inside the report document, where they are the material the decision is made
 * on.
 */
const REVIEWER_TABS = [
  { value: 'preparation', label: 'Readiness review', to: 'preparation' },
  { value: 'review', label: 'Report review', to: 'review' },
  { value: 'corrective', label: 'Send to Maintenance', to: 'corrective' },
] as const;

/**
 * One inspection context presents role-specific stages: field-work stages to the assigned Inspector
 * and review stages to the organization administrator. The reviewer report document remains on
 * `reports/:inspectionId` and is entered through the reviewer-first route.
 */
export default function InspectionDetailPage() {
  const { inspectionId = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const roles = useAuthStore((state) => state.roles);
  const isOrganizationAdmin = roles.includes('ORG_ADMIN') && location.pathname.startsWith('/client/');
  const tabs = isOrganizationAdmin ? REVIEWER_TABS : INSPECTOR_TABS;
  const current = location.pathname.split('/').filter(Boolean).pop() ?? 'evidence';
  const inspectionQuery = useInspection(inspectionId);
  const inspection = inspectionQuery.data;

  // A phase that has nothing in it is not a tab. The reviewer sees the phases that exist for
  // this inspection, so a missing corrective step reads as "not yet" rather than as an empty form.
  const preparations = useInspectionPreparations(isOrganizationAdmin ? inspectionId : null);
  const versions = useReportVersions(isOrganizationAdmin ? inspectionId : null);
  const hasPreparation = Boolean(preparations.data?.length);
  const hasPublishedVersion = Boolean(
    versions.data?.some((version) => version.status === 'PUBLISHED'),
  );

  const visibleTabs = isOrganizationAdmin
    ? REVIEWER_TABS.filter((tab) => {
        if (tab.value === 'preparation') return hasPreparation;
        if (tab.value === 'corrective') return hasPublishedVersion;
        return true;
      })
    : tabs;

  // The evidence and findings routes are not tabs for the reviewer: they are the material the
  // report decision is made on, so the report tab stays lit while they are open.
  const reviewerSourceRoutes = ['evidence', 'findings'];
  const tabValue = visibleTabs.some((tab) => tab.value === current)
    ? current
    : isOrganizationAdmin
      ? reviewerSourceRoutes.includes(current)
        ? 'review'
        : visibleTabs[0]?.value ?? 'review'
      : 'evidence';

  return (
    <Box className="workspace-page workspace-page--inspections" sx={{ maxWidth: 1040, mx: 'auto' }}>
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBackRounded />}
          onClick={() => {
            if (isOrganizationAdmin) {
              navigate(`${getSectionPath('client', 'inspections')}?view=reports`);
              return;
            }
            navigate(-1);
          }}
          sx={{
            color: 'text.secondary',
            fontWeight: 500,
            fontSize: '0.875rem',
            textTransform: 'none',
            borderRadius: '8px',
            mb: 2,
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          {isOrganizationAdmin ? 'Back to review queue' : 'Back to list'}
        </Button>

        <PageHeader
          title={isOrganizationAdmin ? 'Inspection review' : 'Inspection Detail'}
          subtitle={
            isOrganizationAdmin
              ? `Inspection ID: ${inspectionId} · One decision per phase: readiness, then the report, then the corrective outcome`
              : `Inspection ID: ${inspectionId} · Field evidence, verified findings and reports`
          }
        />

        {inspection && (
          <Box
            sx={{
              mt: 2,
              p: 2,
              bgcolor: '#f8fafc',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' },
              gap: 2,
            }}
          >
            <Box>
              <Typography
                variant="caption"
                sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}
              >
                Infrastructure Asset
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a', mt: 0.25 }}>
                📍 {inspection.assetName ?? 'Asset'}
              </Typography>
            </Box>

            <Box>
              <Typography
                variant="caption"
                sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}
              >
                Assigned Inspector
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a', mt: 0.25 }}>
                👤 {inspection.inspectorName ?? inspection.inspectorId}
              </Typography>
            </Box>

            <Box>
              <Typography
                variant="caption"
                sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}
              >
                Assigned Drone
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a', mt: 0.25 }}>
                🛸 {inspection.droneSerialNumber ?? 'Unassigned'}{' '}
                {inspection.droneModel ? `(${inspection.droneModel})` : ''}
              </Typography>
              {inspection.droneServiceability && (
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                  Status: {inspection.droneServiceability}
                </Typography>
              )}
            </Box>

            <Box>
              <Typography
                variant="caption"
                sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}
              >
                Flight Permit (Pháp lý bay)
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  color: inspection.flightPermitReference ? '#0f172a' : '#d97706',
                  mt: 0.25,
                }}
              >
                📜{' '}
                {inspection.flightPermitReference
                  ? `${inspection.flightPermitReference}`
                  : 'Awaiting Permit Link'}
              </Typography>
              {inspection.flightPermitAuthority && (
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                  {inspection.flightPermitAuthority}
                </Typography>
              )}
            </Box>
          </Box>
        )}

        <Tabs value={tabValue} sx={{ mt: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          {visibleTabs.map((tab) => (
            <Tab
              key={tab.value}
              label={tab.label}
              value={tab.value}
              component={NavLink}
              to={tab.to}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            />
          ))}
        </Tabs>
      </Box>

      <Outlet />
    </Box>
  );
}
