import { NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Box, Button, Tab, Tabs } from '@mui/material';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getSectionPath } from '@/app/permissions/accessPolicy';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import { PageHeader } from '@/shared/ui/PageHeader';

const INSPECTOR_TABS = [
  { value: 'evidence', label: 'Evidence', to: 'evidence' },
  { value: 'findings', label: 'Findings', to: 'findings' },
  { value: 'report', label: 'Report draft', to: 'report' },
  { value: 'preparation', label: 'Preparation', to: 'preparation' },
] as const;

const REVIEWER_TABS = [
  { value: 'review', label: 'Review report', to: 'review' },
  { value: 'evidence', label: 'Evidence review', to: 'evidence' },
  { value: 'findings', label: 'Findings overview', to: 'findings' },
  { value: 'preparation', label: 'Readiness', to: 'preparation' },
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
  const tabValue = tabs.some((tab) => tab.value === current)
    ? current
    : isOrganizationAdmin
      ? 'review'
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
              ? `Inspection ID: ${inspectionId} · Report decision, evidence and Inspector findings`
              : `Inspection ID: ${inspectionId} · Field evidence, verified findings and reports`
          }
        />

        <Tabs value={tabValue} sx={{ mt: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          {tabs.map((tab) => (
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
