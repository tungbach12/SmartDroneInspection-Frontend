import { NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Tab,
  Tabs,
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
    title: 'Field Session',
    sublabel: 'Flight & Permits',
    to: 'field-session',
    icon: FlightTakeoffRounded,
  },
  {
    step: 2,
    value: 'evidence',
    label: 'Evidence',
    title: 'Evidence Intake',
    sublabel: 'Upload & Register',
    to: 'evidence',
    icon: CloudUploadOutlined,
  },
  {
    step: 3,
    value: 'findings',
    label: 'Findings',
    title: 'Defect Analysis',
    sublabel: 'AI Review & Verify',
    to: 'findings',
    icon: AutoAwesomeOutlined,
  },
  {
    step: 4,
    value: 'report',
    label: 'Report draft',
    title: 'Report Synthesis',
    sublabel: 'Draft & Publish',
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
  const isOrganizationAdmin = roles.includes('ORG_MANAGER') && location.pathname.startsWith('/client/');
  const steps = isOrganizationAdmin ? REVIEWER_STEPS : INSPECTOR_STEPS;
  const current = location.pathname.split('/').filter(Boolean).pop() ?? 'field-session';
  const inspectionQuery = useInspection(inspectionId);
  const inspection = inspectionQuery.data;
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
      ['REPORT_DRAFT', 'REPORT_PUBLISHED', 'REPAIR_PENDING', 'COMPLETED'].includes(status);
    switch (stepValue) {
      case 'field-session':
        return ['FIELD_COMPLETED', 'REPORT_DRAFT', 'REPORT_PUBLISHED', 'REPAIR_PENDING', 'COMPLETED'].includes(status);
      case 'evidence':
        return (
          activeEvidenceCount > 0 ||
          ['REPORT_DRAFT', 'REPORT_PUBLISHED', 'REPAIR_PENDING', 'COMPLETED'].includes(status)
        );
      case 'findings':
        return (
          hasCurrentFindingsConfirmation ||
          ['REPORT_PUBLISHED', 'REPAIR_PENDING', 'COMPLETED'].includes(status)
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
                    color="secondary"
                    variant="filled"
                    label={t('Re-inspection')}
                    sx={{
                      height: 20,
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      bgcolor: 'secondary.main',
                      color: 'common.white',
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
                color={inspection.flightPermitFileName ? 'success' : 'warning'}
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
                sx={{ height: 22, fontSize: '0.75rem', fontWeight: 600 }}
              />
            </Stack>
          </Paper>
        )}

        {/* Centered Modern Animated 1-4 Step Navigator */}
        <Paper
          elevation={0}
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
          <Tabs
            value={tabValue}
            centered
            aria-label={t('Inspection workflow steps')}
            sx={{
              width: '100%',
              minHeight: 'auto',
              overflow: 'visible',
              '& .MuiTabs-scroller': {
                overflow: 'visible !important',
              },
              '& .MuiTabs-flexContainer': {
                justifyContent: 'center',
                alignItems: 'center',
                flexWrap: { xs: 'wrap', sm: 'nowrap' },
                gap: { xs: 0.5, sm: 1, md: 1.5 },
                overflow: 'visible',
              },
              '& .MuiTabs-indicator': {
                display: 'none',
              },
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
                  <Tab
                    value={step.value}
                    component={NavLink}
                    to={step.to}
                    aria-label={step.label}
                    label={
                      <Stack
                        direction="row"
                        spacing={1.25}
                        sx={{ alignItems: 'center', textAlign: 'left', minWidth: 0 }}
                      >
                        <Box
                          sx={{
                            width: 34,
                            height: 34,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.84rem',
                            fontWeight: 800,
                            flexShrink: 0,
                            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                            ...(isActive
                              ? {
                                  bgcolor: 'primary.main',
                                  color: '#ffffff',
                                  boxShadow: isDark
                                    ? '0 0 0 3px rgba(129, 140, 248, 0.35)'
                                    : '0 0 0 3px rgba(87, 80, 241, 0.22)',
                                  transform: 'scale(1.06)',
                                }
                              : isCompleted
                                ? {
                                    bgcolor: isDark ? '#059669' : '#10b981',
                                    color: '#ffffff',
                                    border: '1.5px solid',
                                    borderColor: isDark ? '#34d399' : '#059669',
                                  }
                                : {
                                    bgcolor: isDark ? '#1e293b' : '#e2e8f0',
                                    color: isDark ? '#e2e8f0' : '#1e293b',
                                    border: '1.5px solid',
                                    borderColor: isDark ? '#475569' : '#94a3b8',
                                  }),
                          }}
                        >
                          {isCompleted ? <CheckRounded sx={{ fontSize: 18 }} /> : step.step}
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            variant="caption"
                            sx={{
                              display: 'block',
                              fontSize: '10.5px',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              letterSpacing: '0.06em',
                              color: isActive
                                ? isDark
                                  ? '#a5b4fc'
                                  : '#4338ca'
                                : isCompleted
                                  ? isDark
                                    ? '#34d399'
                                    : '#047857'
                                  : isDark
                                    ? '#cbd5e1'
                                    : '#475569',
                              lineHeight: 1.2,
                              transition: 'color 0.25s ease',
                            }}
                          >
                            {t(`Step ${step.step}`)}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 700,
                              color: isActive
                                ? isDark
                                  ? '#ffffff'
                                  : '#0f172a'
                                : isDark
                                  ? '#f1f5f9'
                                  : '#1e293b',
                              fontSize: '0.9rem',
                              lineHeight: 1.3,
                              whiteSpace: 'nowrap',
                              transition: 'color 0.25s ease',
                            }}
                          >
                            {t(step.title)}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              display: { xs: 'none', md: 'block' },
                              color: isActive
                                ? isDark
                                  ? '#cbd5e1'
                                  : '#334155'
                                : isDark
                                  ? '#94a3b8'
                                  : '#475569',
                              fontWeight: 500,
                              fontSize: '11.5px',
                              lineHeight: 1.15,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {t(step.sublabel)}
                          </Typography>
                        </Box>
                      </Stack>
                    }
                    sx={{
                      opacity: '1 !important',
                      minHeight: 56,
                      borderRadius: '12px',
                      px: { xs: 1.5, sm: 2 },
                      py: 0.85,
                      textTransform: 'none',
                      border: isActive ? '2px solid' : '1.5px solid',
                      borderColor: isActive
                        ? 'primary.main'
                        : isCompleted
                          ? isDark
                            ? 'rgba(16, 185, 129, 0.35)'
                            : 'rgba(16, 185, 129, 0.32)'
                          : 'transparent',
                      bgcolor: isActive
                        ? isDark
                          ? 'rgba(99, 102, 241, 0.18)'
                          : 'rgba(87, 80, 241, 0.08)'
                        : isCompleted
                          ? isDark
                            ? 'rgba(16, 185, 129, 0.08)'
                            : 'rgba(16, 185, 129, 0.05)'
                          : 'transparent',
                      overflow: 'visible',
                      '&:hover': {
                        bgcolor: isActive
                          ? isDark
                            ? 'rgba(99, 102, 241, 0.24)'
                            : 'rgba(87, 80, 241, 0.12)'
                          : 'action.hover',
                      },
                    }}
                  />

                  {!isLast && (
                    <Box
                      sx={{
                        display: { xs: 'none', sm: 'flex' },
                        alignItems: 'center',
                        px: { sm: 0.5, md: 1 },
                        color: isCompleted ? '#10b981' : '#cbd5e1',
                        transition: 'color 0.3s ease',
                      }}
                    >
                      <ArrowForwardIosRounded sx={{ fontSize: 12 }} />
                    </Box>
                  )}
                </Box>
              );
            })}
          </Tabs>
        </Paper>
      </Box>

      <Outlet />
    </Box>
  );
}

