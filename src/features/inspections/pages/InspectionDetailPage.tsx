import { NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Box, Button, Chip, Stack, Tab, Tabs, Typography } from '@mui/material';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getSectionPath } from '@/app/permissions/accessPolicy';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import { PageHeader } from '@/shared/ui/PageHeader';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import {
  useInspection,
  useReportVersions,
} from '../hooks/useInspections';

const INSPECTOR_TABS = [
  { value: 'evidence', label: 'Evidence', to: 'evidence' },
  { value: 'findings', label: 'Findings', to: 'findings' },
  { value: 'report', label: 'Report draft', to: 'report' },
  { value: 'field-session', label: 'Field session', to: 'field-session' },
] as const;

/**
 * The reviewer's tabs are decision phases: report review (MF3-09/10/11) after submission,
 * and corrective disposition (MF3-12) after publication.
 */
const REVIEWER_TABS = [
  { value: 'review', label: 'Report review', to: 'review' },
  { value: 'corrective', label: 'Send to Maintenance', to: 'corrective' },
] as const;

export default function InspectionDetailPage() {
  const { formatDate, t } = useLocale();
  const { inspectionId = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const roles = useAuthStore((state) => state.roles);
  const isOrganizationAdmin = roles.includes('ORG_MANAGER') && location.pathname.startsWith('/client/');
  const tabs = isOrganizationAdmin ? REVIEWER_TABS : INSPECTOR_TABS;
  const current = location.pathname.split('/').filter(Boolean).pop() ?? 'evidence';
  const inspectionQuery = useInspection(inspectionId);
  const inspection = inspectionQuery.data;

  const versions = useReportVersions(isOrganizationAdmin ? inspectionId : null);
  const hasPublishedVersion = Boolean(
    versions.data?.some((version) => version.status === 'PUBLISHED'),
  );

  const visibleTabs = isOrganizationAdmin
    ? REVIEWER_TABS.filter((tab) => {
        if (tab.value === 'corrective') return hasPublishedVersion;
        return true;
      })
    : tabs;

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
              ? `Inspection ID: ${inspectionId} · Report review and corrective disposition`
              : `Inspection ID: ${inspectionId} · Field evidence, verified findings and reports`
          }
        />

        {inspection && (
          <>
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
                  {t('Infrastructure Asset')}
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
                  {t('Assigned Inspector')}
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
                  {t('Assigned Drone')}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a', mt: 0.25 }}>
                  🛸 {inspection.droneSerialNumber ?? 'Unassigned'}{' '}
                  {inspection.droneModel ? `(${inspection.droneModel})` : ''}
                </Typography>
                {inspection.droneServiceability && (
                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                    {t('Status:')} {inspection.droneServiceability}
                  </Typography>
                )}
              </Box>

              <Box>
                <Typography
                  variant="caption"
                  sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}
                >
                  {t('Flight Permit (Pháp lý bay)')}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    color: inspection.flightPermitFileName ? '#0f172a' : '#d97706',
                    mt: 0.25,
                  }}
                >
                  📜{' '}
                  {inspection.flightPermitFileName
                    ? inspection.flightPermitFileName
                    : 'Awaiting Permit Upload'}
                </Typography>
                {inspection.flightPermitUploadedAt && (
                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                    Uploaded {formatDate(new Date(inspection.flightPermitUploadedAt))}
                  </Typography>
                )}
              </Box>
            </Box>

            <Box
              sx={{
                mt: 1.5,
                p: 2,
                bgcolor: '#f8fafc',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
              }}
            >
              <Typography
                variant="caption"
                sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase', display: 'block', mb: 0.75 }}
              >
                {t('Inspection Checkpoints')}
              </Typography>
              {inspection.inspectionItems && inspection.inspectionItems.length > 0 ? (
                <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.75 }}>
                  {inspection.inspectionItems.map((item, idx) => (
                    <Chip key={idx} label={item} size="small" variant="outlined" />
                  ))}
                </Stack>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  {t('No inspection checkpoints defined for this asset.')}
                </Typography>
              )}
            </Box>
          </>
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
