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
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import FactCheckOutlined from '@mui/icons-material/FactCheckOutlined';
import FlightTakeoffRounded from '@mui/icons-material/FlightTakeoffRounded';
import PlaylistAddCheckRounded from '@mui/icons-material/PlaylistAddCheckRounded';
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
  useInspectionFindings,
  useInspectionWorkflowState,
  useReportVersions,
} from '../hooks/useInspections';
import { InspectorPayoutSummaryBar } from '../components/InspectorPayoutSummaryBar';
import { resolveInspectionMetadata } from '../utils/inspectorFinance';

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
    value: 'permit',
    label: 'Flight Permit',
    title: 'Flight Permit',
    sublabel: 'Upload & Preview',
    to: 'permit',
    icon: DescriptionOutlined,
  },
  {
    step: 2,
    value: 'pre-flight',
    label: 'Pre-flight',
    title: 'Pre-flight Check',
    sublabel: 'Safety Checklist',
    to: 'pre-flight',
    icon: FactCheckOutlined,
  },
  {
    step: 3,
    value: 'field-session',
    label: 'Field session',
    title: 'Flight Operation',
    sublabel: 'MAVLink & Telemetry',
    to: 'field-session',
    icon: FlightTakeoffRounded,
  },
  {
    step: 4,
    value: 'post-flight',
    label: 'Post-flight',
    title: 'Post-flight & Items',
    sublabel: 'Items & Completion',
    to: 'post-flight',
    icon: PlaylistAddCheckRounded,
  },
  {
    step: 5,
    value: 'evidence',
    label: 'Evidence',
    title: 'Field Evidence',
    sublabel: 'Upload & Review',
    to: 'evidence',
    icon: CloudUploadOutlined,
  },
  {
    step: 6,
    value: 'findings',
    label: 'Findings',
    title: 'Defect Findings',
    sublabel: 'AI Detection & Review',
    to: 'findings',
    icon: AutoAwesomeOutlined,
  },
  {
    step: 7,
    value: 'report',
    label: 'Report',
    title: 'Inspection Report',
    sublabel: 'Compile & Submit',
    to: 'report',
    icon: AssignmentTurnedInOutlined,
  },
] as const;

const REINSPECTION_STEPS: readonly WorkflowStep[] = [
  {
    step: 1,
    value: 'permit',
    label: 'Flight Permit',
    title: 'Flight Permit',
    sublabel: 'Upload & Preview',
    to: 'permit',
    icon: DescriptionOutlined,
  },
  {
    step: 2,
    value: 'pre-flight',
    label: 'Pre-flight',
    title: 'Pre-flight Check',
    sublabel: 'Safety Checklist',
    to: 'pre-flight',
    icon: FactCheckOutlined,
  },
  {
    step: 3,
    value: 'field-session',
    label: 'Field session',
    title: 'Re-flight Operation',
    sublabel: 'Flight & Target Site',
    to: 'field-session',
    icon: FlightTakeoffRounded,
  },
  {
    step: 4,
    value: 'post-flight',
    label: 'Post-flight',
    title: 'Post-flight Check',
    sublabel: 'Checklist & Completion',
    to: 'post-flight',
    icon: PlaylistAddCheckRounded,
  },
  {
    step: 5,
    value: 'findings',
    label: 'Findings',
    title: 'Defect Verification',
    sublabel: '3-Way Comparison',
    to: 'findings',
    icon: AutoAwesomeOutlined,
  },
  {
    step: 6,
    value: 'report',
    label: 'Report',
    title: 'Verification Report',
    sublabel: 'Sign-off & Submit',
    to: 'report',
    icon: AssignmentTurnedInOutlined,
  },
] as const;

/**
 * Platform Manager workspace stages (3 steps):
 * 1. Field & Evidence Audit -> 2. Report Decision -> 3. Commission & Settlement
 */
const REVIEWER_STEPS: readonly WorkflowStep[] = [
  {
    step: 1,
    value: 'audit',
    label: 'Field Audit',
    title: 'Field & Evidence Audit',
    sublabel: 'Flight & Captures',
    to: 'audit',
    icon: FlightTakeoffRounded,
  },
  {
    step: 2,
    value: 'review',
    label: 'Report Decision',
    title: 'Report Decision',
    sublabel: 'Publish or Return',
    to: 'review',
    icon: AssignmentTurnedInOutlined,
  },
  {
    step: 3,
    value: 'settlement',
    label: 'Commission',
    title: 'Commission & Settlement',
    sublabel: 'Fee & Payout',
    to: 'settlement',
    icon: FactCheckOutlined,
  },
] as const;

const CUSTOMER_STEPS: readonly WorkflowStep[] = [
  {
    step: 1,
    value: 'tracking',
    label: 'Progress',
    title: 'Inspection Progress',
    sublabel: 'Field & Review Status',
    to: 'tracking',
    icon: FlightTakeoffRounded,
  },
  {
    step: 2,
    value: 'report',
    label: 'Official Report',
    title: 'Inspection Report',
    sublabel: 'Published Deliverable',
    to: 'report',
    icon: AssignmentTurnedInOutlined,
  },
  {
    step: 3,
    value: 'settlement',
    label: 'Settlement',
    title: 'Acceptance & Payment',
    sublabel: 'Accept & PayOS',
    to: 'settlement',
    icon: FactCheckOutlined,
  },
  {
    step: 4,
    value: 'corrective',
    label: 'Maintenance',
    title: 'Corrective Action',
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
  const isCustomer = roles.includes('CUSTOMER') && location.pathname.startsWith('/client/');
  const reviewerPortal = location.pathname.startsWith('/manager/') ? 'manager' : 'admin';
  const isReviewerAdmin =
    (roles.includes('ADMIN') || roles.includes('MANAGER')) &&
    (location.pathname.startsWith('/admin/') || location.pathname.startsWith('/manager/'));
  const isOrganizationAdmin = isReviewerAdmin;
  const inspectionQuery = useInspection(inspectionId);
  const inspection = inspectionQuery.data;
  const isReinspection = inspection?.inspectionType === 'RE_INSPECTION';
  const steps = isCustomer
    ? CUSTOMER_STEPS
    : isReviewerAdmin
      ? REVIEWER_STEPS
      : isReinspection
        ? REINSPECTION_STEPS
        : INSPECTOR_STEPS;
  const current = location.pathname.split('/').filter(Boolean).pop() ?? 'field-session';
  const workflowQuery = useInspectionWorkflowState(inspectionId);
  const evidenceQuery = useInspectionEvidence(inspectionId);
  const findingsQuery = useInspectionFindings(inspectionId);

  const activeEvidenceCount = (evidenceQuery.data ?? []).filter((item) => !item.isDeleted).length;
  const confirmedFindings = (findingsQuery.data ?? []).filter(
    (item) => item.status === 'CONFIRMED' && !item.isDeleted,
  );
  const hasForwardedFindings = confirmedFindings.some(
    (item) => item.forwardedToMaintenanceAt != null,
  );
  const versions = useReportVersions(inspectionId);
  const hasPublishedVersion = Boolean(
    versions.data?.some((version) => version.status === 'PUBLISHED'),
  );

  const sessionsQuery = useFieldSessions(inspectionId);
  const latestSession = sessionsQuery.data?.at(-1);
  const wasAborted = latestSession?.status === 'ABORTED' && inspection?.status === 'SCHEDULED';

  const visibleSteps = isCustomer
    ? CUSTOMER_STEPS.filter((step) => {
        if (step.value === 'corrective') return !isReinspection && hasPublishedVersion;
        return true;
      })
    : isReviewerAdmin
      ? REVIEWER_STEPS
      : steps;

  const reviewerSourceRoutes = ['evidence', 'findings'];
  const tabValue = visibleSteps.some((step) => step.value === current)
    ? current
    : isCustomer
      ? hasPublishedVersion && (current === 'report' || current === 'settlement' || current === 'corrective')
        ? current
        : 'tracking'
      : isReviewerAdmin
        ? reviewerSourceRoutes.includes(current)
          ? 'review'
          : visibleSteps[0]?.value ?? 'review'
        : isReinspection && current === 'evidence'
          ? 'findings'
          : 'field-session';

  // Guard against Customer directly visiting forbidden operational or reviewer URLs,
  // and guard against Platform Manager landing on Customer-only corrective routes.
  useEffect(() => {
    if (isReviewerAdmin && current === 'corrective') {
      navigate(`${getSectionPath(reviewerPortal, 'inspections')}/${inspectionId}/review`, { replace: true });
      return;
    }
    if (isCustomer && !versions.isLoading) {
      const forbiddenForCustomer = [
        'permit',
        'pre-flight',
        'field-session',
        'post-flight',
        'evidence',
        'findings',
        'audit',
        'review',
      ];
      if (forbiddenForCustomer.includes(current)) {
        const dest = hasPublishedVersion ? 'report' : 'tracking';
        navigate(`${getSectionPath('client', 'inspections')}/${inspectionId}/${dest}`, { replace: true });
      } else if (
        !hasPublishedVersion &&
        (current === 'report' || current === 'settlement' || current === 'corrective')
      ) {
        navigate(`${getSectionPath('client', 'inspections')}/${inspectionId}/tracking`, { replace: true });
      }
    }
  }, [isCustomer, isReviewerAdmin, reviewerPortal, versions.isLoading, hasPublishedVersion, current, inspectionId, navigate]);

  const isStepCompleted = (stepValue: string): boolean => {
    const status = workflowQuery.data?.status ?? inspection?.status ?? '';
    if (isCustomer) {
      if (stepValue === 'tracking') {
        return ['FIELD_COMPLETED', 'UNDER_REVIEW', 'COMPLETED'].includes(status) || hasPublishedVersion;
      }
      if (stepValue === 'report') {
        return hasPublishedVersion;
      }
      if (stepValue === 'settlement') {
        return (
          hasPublishedVersion &&
          (status === 'COMPLETED' || inspection?.status === 'COMPLETED')
        );
      }
      if (stepValue === 'corrective') {
        return hasPublishedVersion && hasForwardedFindings;
      }
      return false;
    }
    if (isReviewerAdmin) {
      if (stepValue === 'audit') {
        return ['FIELD_COMPLETED', 'UNDER_REVIEW', 'COMPLETED'].includes(status) || hasPublishedVersion;
      }
      if (stepValue === 'review') {
        return hasPublishedVersion;
      }
      if (stepValue === 'settlement') {
        return hasPublishedVersion;
      }
      return false;
    }

    const hasCurrentFindingsConfirmation =
      Boolean(workflowQuery.data?.findingsConfirmedAt) &&
      ['FIELD_COMPLETED', 'UNDER_REVIEW', 'COMPLETED'].includes(status);
    switch (stepValue) {
      case 'permit':
        return (
          Boolean(inspection?.flightPermitFileName) ||
          ['IN_PROGRESS', 'FIELD_COMPLETED', 'UNDER_REVIEW', 'COMPLETED'].includes(status)
        );
      case 'pre-flight':
        return (
          Boolean(
            sessionsQuery.data?.some(
              (session) =>
                session.status === 'IN_PROGRESS' || session.status === 'FIELD_COMPLETED',
            ),
          ) ||
          ['IN_PROGRESS', 'FIELD_COMPLETED', 'UNDER_REVIEW', 'COMPLETED'].includes(status)
        );
      case 'field-session':
        return ['FIELD_COMPLETED', 'UNDER_REVIEW', 'COMPLETED'].includes(status);
      case 'post-flight':
        return ['FIELD_COMPLETED', 'UNDER_REVIEW', 'COMPLETED'].includes(status);
      case 'evidence':
        return (
          activeEvidenceCount > 0 ||
          Boolean(workflowQuery.data?.findingsConfirmedAt) ||
          ['UNDER_REVIEW', 'COMPLETED'].includes(status) ||
          hasPublishedVersion
        );
      case 'findings':
        return (
          hasCurrentFindingsConfirmation ||
          ['UNDER_REVIEW', 'COMPLETED'].includes(status) ||
          hasPublishedVersion
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
  const hasPermitReady =
    Boolean(inspection?.flightPermitFileName) ||
    ['IN_PROGRESS', 'FIELD_COMPLETED', 'UNDER_REVIEW', 'COMPLETED'].includes(workflowStatus);
  const hasSessionStarted =
    Boolean(sessionsQuery.data?.length) ||
    ['IN_PROGRESS', 'FIELD_COMPLETED', 'UNDER_REVIEW', 'COMPLETED'].includes(workflowStatus);
  const hasEvidence =
    activeEvidenceCount > 0 ||
    ['FIELD_COMPLETED', 'UNDER_REVIEW', 'COMPLETED'].includes(workflowStatus);
  const findingsComplete = isStepCompleted('findings');
  const readinessFor = (step: WorkflowStep): WorkflowStepState => {
    if (isCustomer) {
      if (isStepCompleted(step.value)) return 'complete';
      if (tabValue === step.value) return 'active';
      if (step.value === 'tracking') return 'ready';
      if (step.value === 'report') return hasPublishedVersion ? 'ready' : 'blocked';
      if (step.value === 'settlement') return hasPublishedVersion ? 'ready' : 'blocked';
      if (step.value === 'corrective') return hasPublishedVersion ? 'ready' : 'blocked';
      return 'pending';
    }
    if (isStepCompleted(step.value)) return 'complete';
    if (tabValue === step.value) return 'active';
    if (step.value === 'permit' || step.value === 'field-session' || step.value === 'audit' || step.value === 'review' || step.value === 'settlement') return 'ready';
    if (step.value === 'pre-flight') return hasPermitReady ? 'ready' : 'blocked';
    if (step.value === 'post-flight') return hasSessionStarted ? 'ready' : 'blocked';
    if (step.value === 'evidence') return isFieldWorkComplete ? 'ready' : 'blocked';
    if (step.value === 'findings') return hasEvidence ? 'ready' : 'blocked';
    if (step.value === 'report') return findingsComplete ? 'ready' : 'blocked';
    if (step.value === 'corrective') return hasPublishedVersion ? 'ready' : 'blocked';
    return 'pending';
  };

  const blockedReason = (step: WorkflowStep): string | null => {
    if (isCustomer) {
      if ((step.value === 'report' || step.value === 'settlement') && !hasPublishedVersion) {
        return t('The official report is being reviewed and has not been published yet. Please track progress.');
      }
      if (step.value === 'corrective' && !hasPublishedVersion) {
        return t('Publish the report before sending findings to Maintenance.');
      }
      return null;
    }
    if (step.value === 'pre-flight' && !hasPermitReady) return t('Upload the flight permit before starting the pre-flight checklist.');
    if (step.value === 'post-flight' && !hasSessionStarted) return t('Start a field session before completing the post-flight checklist.');
    if (step.value === 'evidence' && !isFieldWorkComplete) return t('Complete a field session before adding evidence.');
    if (step.value === 'findings' && !hasEvidence) return t('Upload at least one capture to review findings.');
    if (step.value === 'report' && !findingsComplete) return t('Confirm findings before compiling the report.');
    if (step.value === 'corrective' && !hasPublishedVersion) return t('Publish the report before sending findings to Maintenance.');
    return null;
  };

  const currentStep = visibleSteps.find((step) => step.value === tabValue);
  const currentStepIndex = visibleSteps.findIndex((step) => step.value === tabValue);
  const currentStepState = currentStep ? readinessFor(currentStep) : 'pending';
  const currentBlocker = currentStep ? blockedReason(currentStep) : null;

  const autoResumeStep = Boolean(
    (location.state as { autoResumeStep?: boolean } | null)?.autoResumeStep,
  );
  const queriesReadyForResume =
    !inspectionQuery.isLoading &&
    !workflowQuery.isLoading &&
    !evidenceQuery.isLoading &&
    !findingsQuery.isLoading &&
    !versions.isLoading &&
    !sessionsQuery.isLoading;

  useEffect(() => {
    if (!autoResumeStep || !queriesReadyForResume || visibleSteps.length === 0) {
      return;
    }
    const firstIncomplete = visibleSteps.find((step) => !isStepCompleted(step.value));
    const targetStep = firstIncomplete ?? visibleSteps[visibleSteps.length - 1];
    if (!targetStep) return;

    const portalPrefix = isCustomer
      ? 'client'
      : isReviewerAdmin
        ? reviewerPortal
        : 'operations';
    if (targetStep.value !== current) {
      navigate(`${getSectionPath(portalPrefix, 'inspections')}/${inspectionId}/${targetStep.to}`, {
        replace: true,
        state: {},
      });
    }
  });
  return (
    <Box
      className="workspace-page workspace-page--inspections trace-ledger-workspace"
      sx={{ width: '100%', maxWidth: '100%', mx: 'auto' }}
    >
      <Box className="trace-ledger-header" sx={{ mb: { xs: 2.5, md: 3.5 } }}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Button
            startIcon={<ArrowBackRounded />}
            onClick={() => {
              if (isCustomer) {
                navigate(getSectionPath('client', 'inspections'));
                return;
              }
              if (isReviewerAdmin) {
                navigate(`${getSectionPath(reviewerPortal, 'inspections')}?view=reports`);
                return;
              }
              navigate(-1);
            }}
            sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'none', px: 0 }}
          >
            {isCustomer ? t('Back to inspections') : isReviewerAdmin ? t('Back to review queue') : t('Back to inspections')}
          </Button>
        </Stack>

        <PageHeader title={isCustomer ? t('Inspection detail') : isReviewerAdmin ? t('Inspection review') : t('Inspection detail')} />

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
                  {inspection.assetName || resolveInspectionMetadata(inspection).displayName}
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
            </Stack>
          </Paper>
        )}

        {!isOrganizationAdmin && !isCustomer && inspection && (
          <Box className="inspection-evidence-trace" aria-label={t('Inspection evidence trace')}>
            <Stack direction="row" spacing={{ xs: 1.5, sm: 2.5 }} sx={{ flexWrap: 'wrap', rowGap: 0.75, mt: 1.25 }}>
              <Typography variant="body2"><strong>{t('Captures')}</strong> · {activeEvidenceCount}</Typography>
              <Typography variant="body2"><strong>{t('Confirmed findings')}</strong> · {isStepCompleted('findings') ? t('Confirmed') : t('Not confirmed')}</Typography>
              <Typography variant="body2"><strong>{t('Report')}</strong> · {versions.data?.[0] ? `v${versions.data[0].versionNo} ${t(versions.data[0].status)}` : t('No version')}</Typography>
            </Stack>
          </Box>
        )}

        {!isOrganizationAdmin && !isCustomer && inspection && (
          <Box sx={{ mt: 1.5 }}>
            <InspectorPayoutSummaryBar inspectionId={inspection.id} roleView="inspector" />
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

        {visibleSteps.length > 1 && (
        <Paper
          component="nav"
          aria-label={t('Inspection workflow stages')}
          className="inspection-stage-rail"
          elevation={0}
          sx={{
            mt: 2,
            px: { xs: 1.5, sm: 2.5 },
            py: { xs: 1.75, sm: 2.25 },
            bgcolor: 'background.paper',
            borderRadius: '12px',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: 'none',
          }}
        >
          <Stack
            direction="row"
            sx={{ alignItems: 'flex-start', display: { xs: 'none', sm: 'flex' } }}
          >
            {visibleSteps.map((step, idx) => {
              const state = readinessFor(step);
              const reason = blockedReason(step);
              const isCurrent = tabValue === step.value;
              const prevStep = idx > 0 ? visibleSteps[idx - 1] : undefined;
              const prevCompleted = prevStep ? readinessFor(prevStep) === 'complete' : false;
              const isCompleted = state === 'complete';
              const accentGreen = '#228b6e';

              return (
                <ButtonBase
                  key={step.value}
                  component={NavLink}
                  to={step.to}
                  aria-current={isCurrent ? 'step' : undefined}
                  aria-disabled={state === 'blocked' ? true : undefined}
                  aria-label={`${t(step.title)}: ${t(STEP_STATE_COPY[state])}${reason ? `. ${reason}` : ''}`}
                  title={reason ?? `${t(step.title)} · ${t(step.sublabel)}`}
                  className={`trace-stage-link${isCurrent ? ' is-active' : ''}${isCompleted ? ' is-complete' : ''}${state === 'blocked' ? ' is-blocked' : ''}`}
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    py: 1,
                    px: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    textAlign: 'center',
                    borderRadius: '10px',
                    transition: 'background-color 160ms ease',
                    bgcolor: isCurrent ? 'action.hover' : 'transparent',
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                    '&:focus-visible': {
                      outline: '2px solid',
                      outlineColor: 'divider',
                      outlineOffset: -2,
                    },
                  }}
                >
                  {/* Top horizontal connector track + N26 circle indicator */}
                  <Box
                    sx={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <Box
                      aria-hidden="true"
                      sx={{
                        flex: 1,
                        height: 2.5,
                        bgcolor:
                          idx === 0
                            ? 'transparent'
                            : prevCompleted
                              ? accentGreen
                              : 'divider',
                        transition: 'background-color 220ms ease',
                      }}
                    />
                    <Box
                      aria-hidden="true"
                      sx={{
                        width: 32,
                        height: 32,
                        flex: '0 0 auto',
                        display: 'grid',
                        placeItems: 'center',
                        borderRadius: '50%',
                        border: '2px solid',
                        borderColor: isCompleted
                          ? accentGreen
                          : isCurrent
                            ? accentGreen
                            : state === 'ready'
                              ? 'text.secondary'
                              : 'divider',
                        bgcolor: isCompleted
                          ? accentGreen
                          : 'background.paper',
                        color: isCompleted
                          ? '#ffffff'
                          : isCurrent
                            ? accentGreen
                            : state === 'ready'
                              ? 'text.primary'
                              : 'text.secondary',
                        boxShadow: isCurrent
                          ? '0 0 0 4px rgba(34, 139, 110, 0.20)'
                          : 'none',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        transition: 'all 180ms ease',
                      }}
                    >
                      {isCompleted ? (
                        <CheckRounded sx={{ fontSize: 18 }} />
                      ) : (
                        step.step
                      )}
                    </Box>
                    <Box
                      aria-hidden="true"
                      sx={{
                        flex: 1,
                        height: 2.5,
                        bgcolor:
                          idx === visibleSteps.length - 1
                            ? 'transparent'
                            : isCompleted
                              ? accentGreen
                              : 'divider',
                        transition: 'background-color 220ms ease',
                      }}
                    />
                  </Box>

                  {/* Step Title & Status Subtitle */}
                  <Box sx={{ mt: 1.1, px: 0.75, minWidth: 0, width: '100%' }}>
                    <Typography
                      component="span"
                      sx={{
                        display: 'block',
                        color: isCurrent
                          ? 'text.primary'
                          : isCompleted
                            ? 'text.primary'
                            : 'text.secondary',
                        fontSize: '0.8125rem',
                        fontWeight: isCurrent ? 700 : isCompleted ? 600 : 500,
                        lineHeight: 1.25,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {t(step.title)}
                    </Typography>
                    <Typography
                      component="span"
                      sx={{
                        display: 'block',
                        mt: 0.3,
                        color: isCurrent
                          ? accentGreen
                          : isCompleted
                            ? accentGreen
                            : 'text.secondary',
                        fontSize: '0.72rem',
                        fontWeight: isCurrent ? 700 : 500,
                        lineHeight: 1.2,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {t(STEP_STATE_COPY[state])}
                    </Typography>
                  </Box>
                </ButtonBase>
              );
            })}
          </Stack>

          {currentStep && (
            <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
              <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.25 }}>
                <Typography sx={{ fontWeight: 700, color: 'text.primary' }}>{t(currentStep.title)}</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {t('Step')} {currentStepIndex + 1} / {visibleSteps.length} · {t(STEP_STATE_COPY[currentStepState])}
                </Typography>
              </Stack>
              <Stack direction="row" sx={{ alignItems: 'center' }}>
                {visibleSteps.map((step, idx) => {
                  const state = readinessFor(step);
                  const isCurrent = tabValue === step.value;
                  const isCompleted = state === 'complete';
                  const accentGreen = '#228b6e';
                  return (
                    <Box
                      key={step.value}
                      sx={{ display: 'flex', alignItems: 'center', flex: idx < visibleSteps.length - 1 ? 1 : '0 0 auto' }}
                    >
                      <ButtonBase
                        component={NavLink}
                        to={step.to}
                        aria-current={isCurrent ? 'step' : undefined}
                        aria-label={`${t(step.label)}: ${t(STEP_STATE_COPY[state])}`}
                        title={`${t(step.title)} · ${t(STEP_STATE_COPY[state])}`}
                        sx={{
                          width: 30,
                          height: 30,
                          borderRadius: '50%',
                          border: '2px solid',
                          borderColor: isCompleted || isCurrent ? accentGreen : 'divider',
                          bgcolor: isCompleted ? accentGreen : 'background.paper',
                          color: isCompleted ? '#ffffff' : isCurrent ? accentGreen : 'text.secondary',
                          boxShadow: isCurrent ? '0 0 0 3px rgba(34, 139, 110, 0.2)' : 'none',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                        }}
                      >
                        {isCompleted ? <CheckRounded sx={{ fontSize: 16 }} /> : step.step}
                      </ButtonBase>
                      {idx < visibleSteps.length - 1 && (
                        <Box
                          aria-hidden="true"
                          sx={{
                            flex: 1,
                            height: 2,
                            bgcolor: isCompleted ? accentGreen : 'divider',
                          }}
                        />
                      )}
                    </Box>
                  );
                })}
              </Stack>
            </Box>
          )}

        </Paper>
        )}
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

