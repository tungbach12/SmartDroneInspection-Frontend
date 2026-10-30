import { NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  ButtonBase,
  Chip,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useIsDarkMode } from '@/app/layouts/ColorModeContext';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getSectionPath } from '@/app/permissions/accessPolicy';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import CheckRounded from '@mui/icons-material/CheckRounded';
import FlightTakeoffRounded from '@mui/icons-material/FlightTakeoffRounded';
import CloudUploadOutlined from '@mui/icons-material/CloudUploadOutlined';
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import AssignmentTurnedInOutlined from '@mui/icons-material/AssignmentTurnedInOutlined';
import BuildOutlined from '@mui/icons-material/BuildOutlined';
import ArrowForwardIosRounded from '@mui/icons-material/ArrowForwardIosRounded';
import { PageHeader } from '@/shared/ui/PageHeader';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import {
  useInspection,
  useInspectionEvidence,
  useInspectionWorkflowState,
  useReportVersions,
} from '../hooks/useInspections';

interface WorkflowStep {
  step: number;
  value: string;
  label: string;
  title: string;
  sublabel: string;
  to: string;
  icon: typeof FlightTakeoffRounded;
}

const INSPECTOR_STEPS: readonly WorkflowStep[] = [
  {
    step: 1,
    value: 'field-session',
    label: 'Field session',
    title: 'Flight Operation',
    sublabel: 'Flight & Permits',
    to: 'field-session',
    icon: FlightTakeoffRounded,
  },
  {
    step: 2,
    value: 'evidence',
    label: 'Evidence',
    title: 'Field Evidence',
    sublabel: 'Upload & Review',
    to: 'evidence',
    icon: CloudUploadOutlined,
  },
  {
    step: 3,
    value: 'findings',
    label: 'Findings',
    title: 'Defect Findings',
    sublabel: 'AI Detection & Review',
    to: 'findings',
    icon: AutoAwesomeOutlined,
  },
  {
    step: 4,
    value: 'report',
    label: 'Report draft',
    title: 'Inspection Report',
    sublabel: 'Draft & Submit',
    to: 'report',
    icon: AssignmentTurnedInOutlined,
  },
] as const;

const REINSPECTION_STEPS: readonly WorkflowStep[] = [
  {
    step: 1,
    value: 'field-session',
    label: 'Field session',
    title: 'Re-flight Operation',
    sublabel: 'Flight & Target Site',
    to: 'field-session',
    icon: FlightTakeoffRounded,
  },
  {
    step: 2,
    value: 'findings',
    label: 'Findings',
    title: 'Defect Verification',
    sublabel: '3-Way Comparison',
    to: 'findings',
    icon: AutoAwesomeOutlined,
  },
  {
    step: 3,
    value: 'report',
    label: 'Report draft',
    title: 'Verification Report',
    sublabel: 'Sign-off & Submit',
    to: 'report',
    icon: AssignmentTurnedInOutlined,
  },
] as const;

/**
 * The reviewer's tabs are decision phases: report review (MF3-09/10/11) after submission,
 * and corrective disposition (MF3-12) after publication.
 */
const REVIEWER_STEPS: readonly WorkflowStep[] = [
  {
    step: 1,
    value: 'review',
    label: 'Report review',
    title: 'Report Review',
    sublabel: 'Decision & Approval',
    to: 'review',
    icon: AssignmentTurnedInOutlined,
  },
  {
    step: 2,
    value: 'corrective',
    label: 'Send to Maintenance',
    title: 'Maintenance Handoff',
    sublabel: 'Work Order Creation',
    to: 'corrective',
    icon: BuildOutlined,
  },
] as const;

export default function InspectionDetailPage() {
  const { formatDate, t } = useLocale();
  const isDark = useIsDarkMode();
  const { inspectionId = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const roles = useAuthStore((state) => state.roles);
  const isOrganizationAdmin =
    (roles.includes('CUSTOMER') && location.pathname.startsWith('/client/')) ||
    ((roles.includes('ADMIN') || roles.includes('MANAGER')) &&
      location.pathname.startsWith('/admin/'));
  const inspectionQuery = useInspection(inspectionId);
  const inspection = inspectionQuery.data;
  const isReinspection = inspection?.inspectionType === 'RE_INSPECTION';
  const steps = isOrganizationAdmin
    ? REVIEWER_STEPS
    : isReinspection
      ? REINSPECTION_STEPS
      : INSPECTOR_STEPS;
  const current = location.pathname.split('/').filter(Boolean).pop() ?? 'field-session';
  const workflowQuery = useInspectionWorkflowState(inspectionId);
  const evidenceQuery = useInspectionEvidence(inspectionId);

  const activeEvidenceCount = (evidenceQuery.data ?? []).filter((item) => !item.isDeleted).length;
  const versions = useReportVersions(isOrganizationAdmin ? inspectionId : null);
  const hasPublishedVersion = Boolean(
    versions.data?.some((version) => version.status === 'PUBLISHED'),
  );

  const visibleSteps = isOrganizationAdmin
    ? REVIEWER_STEPS.filter((step) => {
        if (step.value === 'corrective') return hasPublishedVersion;
        return true;
      })
    : steps;

  const reviewerSourceRoutes = ['evidence', 'findings'];
  const tabValue = visibleSteps.some((step) => step.value === current)
    ? current
    : isOrganizationAdmin
      ? reviewerSourceRoutes.includes(current)
        ? 'review'
        : visibleSteps[0]?.value ?? 'review'
      : isReinspection && current === 'evidence'
        ? 'findings'
        : 'field-session';

  const isStepCompleted = (stepValue: string): boolean => {
    if (isOrganizationAdmin) {
      if (stepValue === 'review') {
        return (
          hasPublishedVersion ||
          ['REPORT_PUBLISHED', 'REPAIR_PENDING', 'COMPLETED'].includes(inspection?.status ?? '')
        );
      }
      if (stepValue === 'corrective') {
        return ['REPAIR_PENDING', 'COMPLETED'].includes(inspection?.status ?? '');
      }
      return false;
    }

    const status = workflowQuery.data?.status ?? inspection?.status ?? '';
    const hasCurrentFindingsConfirmation =
      Boolean(workflowQuery.data?.findingsConfirmedAt) &&
      ['REPORT_DRAFT', 'UNDER_REVIEW', 'REPORT_PUBLISHED', 'REPAIR_PENDING', 'COMPLETED'].includes(status);
    switch (stepValue) {
      case 'field-session':
        return ['FIELD_COMPLETED', 'REPORT_DRAFT', 'UNDER_REVIEW', 'REPORT_PUBLISHED', 'REPAIR_PENDING', 'COMPLETED'].includes(status);
      case 'evidence':
        return (
          activeEvidenceCount > 0 ||
          ['REPORT_DRAFT', 'UNDER_REVIEW', 'REPORT_PUBLISHED', 'REPAIR_PENDING', 'COMPLETED'].includes(status)
        );
      case 'findings':
        return (
          hasCurrentFindingsConfirmation ||
          ['UNDER_REVIEW', 'REPORT_PUBLISHED', 'REPAIR_PENDING', 'COMPLETED'].includes(status)
        );
      case 'report':
        return (
          hasPublishedVersion ||
          ['REPORT_PUBLISHED', 'REPAIR_PENDING', 'COMPLETED'].includes(status)
        );
      default:
        return false;
    }
  };

  return (
    <Box className="workspace-page workspace-page--inspections" sx={{ width: '100%', maxWidth: '100%', mx: 'auto' }}>
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBackRounded />}
          onClick={() => {
            if (isOrganizationAdmin) {
              const portal = location.pathname.startsWith('/admin') ? 'admin' : 'client';
              navigate(`${getSectionPath(portal, 'inspections')}?view=reports`);
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
          {isOrganizationAdmin ? t('Back to review queue') : t('Back to list')}
        </Button>

        <PageHeader
          title={isOrganizationAdmin ? t('Inspection review') : t('Inspection Detail')}
        />

        {inspection && (
          <Paper
            elevation={0}
            sx={{
              mt: 1.5,
              px: 2,
              py: 1.25,
              borderRadius: '12px',
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              boxShadow: isDark ? 'none' : '0 1px 2px rgba(0,0,0,0.03)',
            }}
          >
            <Stack
              direction="row"
              spacing={2}
              sx={{
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                rowGap: 0.75,
              }}
            >
              <Stack
                direction="row"
                spacing={2}
                sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.75 }}
              >
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  {inspection.assetName ?? inspection.id}
                </Typography>

                {inspection.inspectionType === 'RE_INSPECTION' && (
                  <Chip
                    size="small"
                    variant="outlined"
                    label={
                      inspection.workOrderId
                        ? `${t('Re-inspection')} · WO #${inspection.workOrderId.slice(0, 8)}`
                        : t('Re-inspection')
                    }
                    onClick={
                      inspection.workOrderId
                        ? () => navigate('/operations/maintenance')
                        : undefined
                    }
                    title={
                      inspection.workOrderId
                        ? t('Linked to Maintenance Work Order. Click to view.')
                        : undefined
                    }
                    sx={{
                      height: 22,
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      borderColor: 'divider',
                      color: 'text.secondary',
                      cursor: inspection.workOrderId ? 'pointer' : 'default',
                    }}
                  />
                )}

                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {t('Drone')}:{' '}
                  <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>
                    {inspection.droneSerialNumber ?? t('Unassigned')}
                    {inspection.droneModel ? ` (${inspection.droneModel})` : ''}
                  </Box>
                </Typography>
              </Stack>

              <Chip
                size="small"
                variant="outlined"
                title={
                  inspection.flightPermitFileName
                    ? `${inspection.flightPermitFileName}${
                        inspection.flightPermitUploadedAt
                          ? ` · ${formatDate(new Date(inspection.flightPermitUploadedAt))}`
                          : ''
                      }`
                    : undefined
                }
                label={
                  inspection.flightPermitFileName
                    ? t('Permit on file')
                    : t('Awaiting Permit Upload')
                }
                sx={{ height: 22, fontSize: '0.72rem', fontWeight: 600, borderColor: 'divider', color: 'text.secondary' }}
              />
            </Stack>
          </Paper>
        )}

        {/* Centered Modern Animated 1-4 Step Navigator */}
        <Paper
          elevation={0}
          role="tablist"
          aria-label={t('Inspection workflow steps')}
          sx={{
            mt: 3,
            p: { xs: 1.5, sm: 2 },
            bgcolor: 'background.paper',
            borderRadius: '16px',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: isDark ? 'none' : '0 4px 20px -4px rgba(15, 23, 42, 0.06)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'visible',
          }}
        >
          <Stack
            direction="row"
            sx={{
              justifyContent: 'center',
              alignItems: 'center',
              flexWrap: { xs: 'wrap', sm: 'nowrap' },
              gap: { xs: 0.5, sm: 1, md: 1.5 },
              width: '100%',
            }}
          >
            {visibleSteps.map((step, idx) => {
              const isActive = tabValue === step.value;
              const isCompleted = isStepCompleted(step.value);
              const isLast = idx === visibleSteps.length - 1;

              return (
                <Box
                  key={step.value}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    flex: { xs: '1 1 45%', sm: 'none' },
                  }}
                >
                  <ButtonBase
                    component={NavLink}
                    to={step.to}
                    role="tab"
                    aria-selected={isActive}
                    aria-label={step.label}
                    sx={{
                      minHeight: 50,
                      borderRadius: '10px',
                      px: { xs: 1.5, sm: 2 },
                      py: 0.75,
                      textTransform: 'none',
                      border: '1px solid',
                      borderColor: isActive
                        ? 'text.primary'
                        : 'divider',
                      bgcolor: isActive
                        ? 'action.selected'
                        : 'transparent',
                      textAlign: 'left',
                      justifyContent: 'flex-start',
                      transition: 'all 0.15s ease',
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={1.25}
                      sx={{ alignItems: 'center', textAlign: 'left', minWidth: 0 }}
                    >
                      <Box
                        sx={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          flexShrink: 0,
                          bgcolor: isActive
                            ? 'text.primary'
                            : 'action.hover',
                          color: isActive
                            ? 'background.paper'
                            : isCompleted
                              ? 'text.primary'
                              : 'text.disabled',
                          border: '1px solid',
                          borderColor: isActive
                            ? 'text.primary'
                            : 'divider',
                        }}
                      >
                        {isCompleted && !isActive ? (
                          <CheckRounded sx={{ fontSize: 16, color: 'text.secondary' }} />
                        ) : (
                          step.step
                        )}
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            display: 'block',
                            fontSize: '10px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            color: isActive
                              ? 'text.primary'
                              : 'text.secondary',
                            lineHeight: 1.2,
                          }}
                        >
                          {t(`Step ${step.step}`)}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: isActive ? 700 : 550,
                            fontSize: '0.84rem',
                            color: isActive
                              ? 'text.primary'
                              : 'text.secondary',
                            whiteSpace: 'nowrap',
                            lineHeight: 1.25,
                          }}
                        >
                          {t(step.title)}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            display: { xs: 'none', md: 'block' },
                            fontSize: '10.5px',
                            color: 'text.secondary',
                            whiteSpace: 'nowrap',
                            lineHeight: 1.2,
                            opacity: 0.8,
                          }}
                        >
                          {t(step.sublabel)}
                        </Typography>
                      </Box>
                    </Stack>
                  </ButtonBase>

                  {!isLast && (
                    <Box
                      sx={{
                        display: { xs: 'none', sm: 'flex' },
                        alignItems: 'center',
                        px: { sm: 0.5, md: 1 },
                        color: 'text.disabled',
                      }}
                    >
                      <ArrowForwardIosRounded sx={{ fontSize: 11 }} />
                    </Box>
                  )}
                </Box>
              );
            })}
          </Stack>
        </Paper>
      </Box>

      <Outlet />
    </Box>
  );
}

