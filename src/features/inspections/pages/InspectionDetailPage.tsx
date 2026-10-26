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
  const { inspectionId = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const roles = useAuthStore((state) => state.roles);
  const isOrganizationAdmin = roles.includes('ORG_MANAGER') && location.pathname.startsWith('/client/');
  const steps = isOrganizationAdmin ? REVIEWER_STEPS : INSPECTOR_STEPS;
  const current = location.pathname.split('/').filter(Boolean).pop() ?? 'evidence';
  const inspectionQuery = useInspection(inspectionId);
  const inspection = inspectionQuery.data;

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
      : 'evidence';

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

    const status = inspection?.status ?? '';
    switch (stepValue) {
      case 'evidence':
        return ['REPORT_DRAFT', 'REPORT_PUBLISHED', 'REPAIR_PENDING', 'COMPLETED'].includes(
          status,
        );
      case 'findings':
        return ['REPORT_DRAFT', 'REPORT_PUBLISHED', 'REPAIR_PENDING', 'COMPLETED'].includes(
          status,
        );
      case 'report':
        return ['REPORT_PUBLISHED', 'REPAIR_PENDING', 'COMPLETED'].includes(status);
      case 'field-session':
        return ['FIELD_COMPLETED', 'REPORT_DRAFT', 'REPORT_PUBLISHED', 'REPAIR_PENDING', 'COMPLETED'].includes(
          status,
        );
      default:
        return false;
    }
  };

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
          <Paper
            elevation={0}
            sx={{
              mt: 2,
              p: 2.5,
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              bgcolor: '#ffffff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' },
                gap: 2.5,
              }}
            >
              <Box>
                <Typography
                  variant="caption"
                  sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}
                >
                  {t('Infrastructure Asset')}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a', mt: 0.5 }}>
                  📍 {inspection.assetName ?? 'Asset'}
                </Typography>
              </Box>

              <Box>
                <Typography
                  variant="caption"
                  sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}
                >
                  {t('Assigned Inspector')}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a', mt: 0.5 }}>
                  👤 {inspection.inspectorName ?? inspection.inspectorId}
                </Typography>
              </Box>

              <Box>
                <Typography
                  variant="caption"
                  sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}
                >
                  {t('Assigned Drone')}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a', mt: 0.5 }}>
                  🛸 {inspection.droneSerialNumber ?? 'Unassigned'}{' '}
                  {inspection.droneModel ? `(${inspection.droneModel})` : ''}
                </Typography>
                {inspection.droneServiceability && (
                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.25 }}>
                    {t('Status:')} {inspection.droneServiceability}
                  </Typography>
                )}
              </Box>

              <Box>
                <Typography
                  variant="caption"
                  sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}
                >
                  {t('Flight Permit')}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 700,
                    color: inspection.flightPermitFileName ? '#0f172a' : '#d97706',
                    mt: 0.5,
                  }}
                >
                  📜{' '}
                  {inspection.flightPermitFileName
                    ? inspection.flightPermitFileName
                    : 'Awaiting Permit Upload'}
                </Typography>
                {inspection.flightPermitUploadedAt && (
                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.25 }}>
                    Uploaded {formatDate(new Date(inspection.flightPermitUploadedAt))}
                  </Typography>
                )}
              </Box>
            </Box>

            {inspection.inspectionItems && inspection.inspectionItems.length > 0 && (
              <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #f1f5f9' }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: '#64748b',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    display: 'block',
                    mb: 1,
                  }}
                >
                  {t('Asset Checkpoints')}
                </Typography>
                <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.75 }}>
                  {inspection.inspectionItems.map((item, idx) => (
                    <Chip
                      key={idx}
                      label={item}
                      size="small"
                      sx={{ bgcolor: '#f8fafc', border: '1px solid #e2e8f0', color: '#334155', fontWeight: 500 }}
                    />
                  ))}
                </Stack>
              </Box>
            )}
          </Paper>
        )}

        {/* Centered Modern Animated 1-4 Step Navigator */}
        <Paper
          elevation={0}
          sx={{
            mt: 3,
            p: { xs: 1.5, sm: 2 },
            bgcolor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 20px -4px rgba(15, 23, 42, 0.06)',
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
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.8125rem',
                            fontWeight: 800,
                            flexShrink: 0,
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            ...(isCompleted
                              ? {
                                  bgcolor: '#ecfdf5',
                                  color: '#059669',
                                  border: '1.5px solid #10b981',
                                }
                              : isActive
                                ? {
                                    bgcolor: 'primary.main',
                                    color: '#ffffff',
                                    boxShadow: '0 0 0 3px rgba(13, 148, 136, 0.25)',
                                    transform: 'scale(1.06)',
                                  }
                                : {
                                    bgcolor: '#f1f5f9',
                                    color: '#64748b',
                                    border: '1.5px solid #cbd5e1',
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
                              fontSize: '10px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.06em',
                              color: isActive ? 'primary.main' : isCompleted ? '#059669' : '#94a3b8',
                              lineHeight: 1.2,
                              transition: 'color 0.25s ease',
                            }}
                          >
                            {t(`Step ${step.step}`)}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: isActive ? 700 : 600,
                              color: isActive ? '#0f172a' : '#475569',
                              fontSize: '0.875rem',
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
                              color: '#94a3b8',
                              fontSize: '11px',
                              lineHeight: 1.1,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {t(step.sublabel)}
                          </Typography>
                        </Box>
                      </Stack>
                    }
                    sx={{
                      minHeight: 52,
                      borderRadius: '12px',
                      px: { xs: 1.25, sm: 1.75 },
                      py: 0.75,
                      textTransform: 'none',
                      border: '1.5px solid',
                      borderColor: isActive ? 'primary.main' : 'transparent',
                      bgcolor: isActive ? 'rgba(13, 148, 136, 0.08)' : 'transparent',
                      overflow: 'visible',
                      '&:hover': {
                        bgcolor: isActive ? 'rgba(13, 148, 136, 0.12)' : '#f8fafc',
                        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)',
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

