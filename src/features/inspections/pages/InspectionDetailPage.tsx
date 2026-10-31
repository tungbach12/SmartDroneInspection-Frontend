import { useEffect, useState } from 'react';
import { NavLink, Outlet, useBlocker, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
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
import { PageHeader } from '@/shared/ui/PageHeader';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import '../styles/trace-ledger.css';
import {
  useFieldSessions,
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

type WorkflowStepState = 'active' | 'complete' | 'ready' | 'blocked' | 'pending';

const STEP_STATE_COPY: Record<WorkflowStepState, string> = {
  active: 'In progress',
  complete: 'Complete',
  ready: 'Ready',
  blocked: 'Waiting',
  pending: 'Not started',
};

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
  const [reportDirty, setReportDirty] = useState(false);
  const blocker = useBlocker(reportDirty);
  useEffect(() => {
    if (!reportDirty) return undefined;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [reportDirty]);
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
  const versions = useReportVersions(inspectionId);
  const hasPublishedVersion = Boolean(
    versions.data?.some((version) => version.status === 'PUBLISHED'),
  );

  const sessionsQuery = useFieldSessions(inspectionId);
  const latestSession = sessionsQuery.data?.at(-1);
  const wasAborted = latestSession?.status === 'ABORTED' && inspection?.status === 'SCHEDULED';

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
        return hasPublishedVersion || (inspection?.status === 'COMPLETED');
      }
      if (stepValue === 'corrective') {
        return inspection?.status === 'COMPLETED';
      }
      return false;
    }

    const status = workflowQuery.data?.status ?? inspection?.status ?? '';
    const hasCurrentFindingsConfirmation =
      Boolean(workflowQuery.data?.findingsConfirmedAt) &&
      ['FIELD_COMPLETED', 'UNDER_REVIEW', 'COMPLETED'].includes(status);
    switch (stepValue) {
      case 'field-session':
        return ['FIELD_COMPLETED', 'UNDER_REVIEW', 'COMPLETED'].includes(status);
      case 'evidence':
        return (
          activeEvidenceCount > 0 ||
          ['FIELD_COMPLETED', 'UNDER_REVIEW', 'COMPLETED'].includes(status)
        );
      case 'findings':
        return (
          hasCurrentFindingsConfirmation ||
          ['UNDER_REVIEW', 'COMPLETED'].includes(status)
        );
      case 'report':
        return (
          hasPublishedVersion ||
          status === 'COMPLETED'
        );
      default:
        return false;
    }
  };

  const workflowStatus = workflowQuery.data?.status ?? inspection?.status ?? '';
  const isFieldWorkComplete = [
    'FIELD_COMPLETED',
    'UNDER_REVIEW',
    'COMPLETED',
  ].includes(workflowStatus);
  const hasEvidence =
    activeEvidenceCount > 0 ||
    ['FIELD_COMPLETED', 'UNDER_REVIEW', 'COMPLETED'].includes(workflowStatus);
  const findingsComplete = isStepCompleted('findings');
  const readinessFor = (step: WorkflowStep): WorkflowStepState => {
    if (isStepCompleted(step.value)) return 'complete';
    if (tabValue === step.value) return 'active';
    if (step.value === 'field-session' || step.value === 'review') return 'ready';
    if (step.value === 'evidence') return isFieldWorkComplete ? 'ready' : 'blocked';
    if (step.value === 'findings') return hasEvidence ? 'ready' : 'blocked';
    if (step.value === 'report') return findingsComplete ? 'ready' : 'blocked';
    if (step.value === 'corrective') return hasPublishedVersion ? 'ready' : 'blocked';
    return 'pending';
  };

  const blockedReason = (step: WorkflowStep): string | null => {
    if (step.value === 'evidence' && !isFieldWorkComplete) return t('Complete a field session before adding evidence.');
    if (step.value === 'findings' && !hasEvidence) return t('Upload at least one capture to review findings.');
    if (step.value === 'report' && !findingsComplete) return t('Confirm findings before drafting the report.');
    if (step.value === 'corrective' && !hasPublishedVersion) return t('Publish the report before sending findings to Maintenance.');
    return null;
  };

  const currentStep = visibleSteps.find((step) => step.value === tabValue);
  const currentStepIndex = visibleSteps.findIndex((step) => step.value === tabValue);
  const currentStepState = currentStep ? readinessFor(currentStep) : 'pending';
  const currentBlocker = currentStep ? blockedReason(currentStep) : null;
  return (
    <Box
      className="workspace-page workspace-page--inspections trace-ledger-workspace"
      sx={{ width: '100%', maxWidth: '100%', mx: 'auto' }}
    >
      <Box className="trace-ledger-header" sx={{ mb: { xs: 2.5, md: 3.5 } }}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
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
            sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'none', px: 0 }}
          >
            {isOrganizationAdmin ? t('Back to review queue') : t('Back to inspections')}
          </Button>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 650, letterSpacing: '0.04em' }}>
            {isOrganizationAdmin ? t('REPORT DECISIONS') : t('FIELD WORKSPACE')}
          </Typography>
        </Stack>

        <PageHeader title={isOrganizationAdmin ? t('Inspection review') : t('Inspection detail')} />

        {inspection && (
          <Paper
            elevation={0}
            className="inspection-trace-context"
            sx={{
              mt: 1,
              px: { xs: 1.75, sm: 2.25 },
              py: { xs: 1.5, sm: 1.75 },
              borderRadius: '10px',
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              boxShadow: 'none',
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
                aria-label={inspection.flightPermitFileName ? t('Flight document recorded; this does not authorize flight') : t('Flight document not recorded')}
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

        {!isOrganizationAdmin && inspection && (
          <Box className="inspection-evidence-trace" aria-label={t('Inspection evidence trace')}>
            <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ alignItems: { sm: 'center' }, gap: 1.25, mt: 1.25 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', flex: '0 0 auto' }}>
                {t('RECORD TRACE')}
              </Typography>
              <Box className="inspection-trace-line" aria-hidden="true" />
              <Stack direction="row" spacing={{ xs: 1.5, sm: 2.5 }} sx={{ flexWrap: 'wrap', rowGap: 0.75 }}>
                <Typography variant="body2">
                  <strong>{t('Session')}</strong> ·{' '}
                  {wasAborted
                    ? t('Aborted (reschedule required)')
                    : isFieldWorkComplete
                      ? t('Recorded')
                      : t('Not complete')}
                </Typography>
                <Typography variant="body2"><strong>{t('Captures')}</strong> · {activeEvidenceCount}</Typography>
                <Typography variant="body2"><strong>{t('Confirmed findings')}</strong> · {isStepCompleted('findings') ? t('Confirmed') : t('Not confirmed')}</Typography>
                <Typography variant="body2"><strong>{t('Report')}</strong> · {versions.data?.[0] ? `v${versions.data[0].versionNo} ${t(versions.data[0].status)}` : t('No version')}</Typography>
              </Stack>
            </Stack>
          </Box>
        )}

        {wasAborted && (
          <Alert severity="warning" sx={{ mt: 1.5, borderRadius: '10px' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {t('Previous flight session was aborted')}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {latestSession?.endedAt ? `${t('Ended')} ${formatDate(new Date(latestSession.endedAt))} · ` : ''}
              {t('Reason')}: "{latestSession?.abortReason}"
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              {t('The flight session was stopped before completion. Please reschedule the flight window or dispatch as needed.')}
            </Typography>
          </Alert>
        )}

        <Paper
          component="nav"
          aria-label={t('Inspection workflow stages')}
          className="inspection-stage-rail"
          elevation={0}
          sx={{
            mt: 2,
            p: { xs: 1.5, sm: 1.75 },
            bgcolor: 'background.paper',
            borderRadius: '10px',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: 'none',
          }}
        >
          <Stack
            direction="row"
            sx={{ alignItems: 'stretch', display: { xs: 'none', sm: 'flex' } }}
          >
            {visibleSteps.map((step) => {
              const state = readinessFor(step);
              const reason = blockedReason(step);
              return (
                <ButtonBase
                  key={step.value}
                  component={NavLink}
                  to={step.to}
                  aria-current={tabValue === step.value ? 'step' : undefined}
                  aria-label={`${t(step.title)}: ${t(STEP_STATE_COPY[state])}${reason ? `. ${reason}` : ''}`}
                  title={reason ?? undefined}
                  className={`trace-stage-link${state === 'active' ? ' is-active' : ''}${state === 'complete' ? ' is-complete' : ''}`}
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    minHeight: 56,
                    px: { sm: 1.25, md: 2 },
                    py: 1,
                    textAlign: 'left',
                    justifyContent: 'flex-start',
                    borderRight: '1px solid',
                    borderColor: 'divider',
                    borderBottom: state === 'active' ? '2px solid' : '2px solid transparent',
                    borderBottomColor: state === 'active' ? 'primary.main' : 'transparent',
                    bgcolor: state === 'active' ? 'action.selected' : 'transparent',
                    '&:last-of-type': { borderRight: 0 },
                    '&:hover': { bgcolor: state === 'active' ? 'action.selected' : 'action.hover' },
                    '&:focus-visible': { outline: '2px solid', outlineColor: 'divider', outlineOffset: -2 },
                  }}
                >
                  <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0 }}>
                    <Box
                      aria-hidden="true"
                      sx={{
                        width: 28,
                        height: 28,
                        flex: '0 0 auto',
                        display: 'grid',
                        placeItems: 'center',
                        borderRadius: '50%',
                        border: '1px solid',
                        borderColor: state === 'active' ? 'divider' : 'divider',
                        bgcolor: state === 'active' ? 'primary.main' : 'background.paper',
                        color: state === 'active' ? 'primary.contrastText' : 'text.secondary',
                        fontSize: '0.8125rem',
                        fontWeight: 700,
                      }}
                    >
                      {state === 'complete' ? <CheckRounded sx={{ fontSize: 17 }} /> : step.step}
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography component="span" sx={{ display: 'block', color: 'text.secondary', fontSize: '0.75rem', lineHeight: 1.3 }}>
                        {t(STEP_STATE_COPY[state])}
                      </Typography>
                      <Typography component="span" sx={{ display: 'block', color: state === 'active' ? 'text.primary' : 'text.secondary', fontSize: { sm: '0.8125rem', md: '0.875rem' }, fontWeight: state === 'active' ? 700 : 600, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t(step.title)}
                      </Typography>
                    </Box>
                  </Stack>
                </ButtonBase>
              );
            })}
          </Stack>

          {currentStep && (
            <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
              <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography sx={{ fontWeight: 700, color: 'text.primary' }}>{t(currentStep.title)}</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {t('Step')} {currentStepIndex + 1} / {visibleSteps.length} · {t(STEP_STATE_COPY[currentStepState])}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1}>
                {visibleSteps.map((step) => {
                  const state = readinessFor(step);
                  return (
                    <ButtonBase
                      key={step.value}
                      component={NavLink}
                      to={step.to}
                      aria-current={tabValue === step.value ? 'step' : undefined}
                      aria-label={`${t(step.label)}: ${t(STEP_STATE_COPY[state])}`}
                      title={`${t(step.title)} · ${t(STEP_STATE_COPY[state])}`}
                      sx={{
                        flex: 1,
                        minWidth: 40,
                        minHeight: 42,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderBottomWidth: state === 'active' ? 2 : 1,
                        borderRadius: '5px',
                        bgcolor: state === 'active' ? 'action.selected' : 'background.paper',
                        color: state === 'active' ? 'primary.main' : 'text.secondary',
                        fontWeight: 700,
                        '&:focus-visible': { outline: '2px solid', outlineColor: 'divider', outlineOffset: 1 },
                      }}
                    >
                      {state === 'complete' ? <CheckRounded sx={{ fontSize: 18 }} /> : step.step}
                    </ButtonBase>
                  );
                })}
              </Stack>
            </Box>
          )}

        </Paper>
      </Box>

      <Box className="trace-stage-content" sx={{ mt: { xs: 2, md: 2.5 } }}>
        {currentBlocker && (
          <Alert severity="info" icon={false} sx={{ mb: 1.5, borderRadius: '5px' }}>
            <Typography variant="body2"><strong>{t('This stage is open for review')}:</strong> {currentBlocker}</Typography>
            <Typography variant="caption">{t('Navigation stays available; the required action becomes available when the prerequisite is met.')}</Typography>
          </Alert>
        )}
        <Outlet context={{ onReportDirtyChange: setReportDirty }} />
      </Box>

      <Dialog
        open={blocker.state === 'blocked'}
        onClose={() => {
          if (blocker.state === 'blocked') blocker.reset();
        }}
        aria-labelledby="unsaved-report-title"
        aria-describedby="unsaved-report-description"
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle id="unsaved-report-title">{t('Unsaved report changes')}</DialogTitle>
        <DialogContent id="unsaved-report-description">
          <Typography variant="body2" color="text.secondary">
            {t('Your report sections have not been saved. Save them before leaving, or discard your edits.')}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => {
            if (blocker.state === 'blocked') blocker.reset();
          }}>{t('Stay here')}</Button>
          <Button color="error" onClick={() => {
            setReportDirty(false);
            if (blocker.state === 'blocked') blocker.proceed();
          }}>{t('Discard edits')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

