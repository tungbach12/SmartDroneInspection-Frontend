import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { NavLink, Outlet, useBlocker, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getSectionPath } from '@/app/permissions/accessPolicy';
import CheckRounded from '@mui/icons-material/CheckRounded';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import FactCheckOutlined from '@mui/icons-material/FactCheckOutlined';
import FlightTakeoffRounded from '@mui/icons-material/FlightTakeoffRounded';
import PlaylistAddCheckRounded from '@mui/icons-material/PlaylistAddCheckRounded';
import CloudUploadOutlined from '@mui/icons-material/CloudUploadOutlined';
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import AssignmentTurnedInOutlined from '@mui/icons-material/AssignmentTurnedInOutlined';
import ExpandLessRounded from '@mui/icons-material/ExpandLessRounded';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import MoreVertRounded from '@mui/icons-material/MoreVertRounded';
import { PageBreadcrumbs } from '@/shared/ui/PageBreadcrumbs';
import { PageHeader } from '@/shared/ui/PageHeader';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import { MutationProblemAlert } from '@/shared/ui/MutationProblemAlert';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import {
  platformUserApi,
  type PlatformUser,
} from '@/features/admin/api/platformUserApi';
import '../styles/trace-ledger.css';
import {
  useAcceptInspection,
  useCancelInspection,
  useDeclineInspection,
  useFieldSessions,
  useForceAbortFieldSession,
  useInspection,
  useInspectionEvidence,
  useInspectionFindings,
  useInspectionWorkflowState,
  useReportPaymentStatus,
  useReportVersions,
  useRescheduleInspection,
} from '../hooks/useInspections';
import { InspectorPayoutSummaryBar } from '../components/InspectorPayoutSummaryBar';
import { InspectionOverviewDetails } from '../components/InspectionOverviewDetails';
import { OverviewStakeholdersSection } from '../components/OverviewStakeholdersSection';
import { ReassignInspectionDialog } from '../components/ReassignInspectionDialog';
import { resolveInspectionMetadata } from '../utils/inspectorFinance';
import {
  isFlightPermitVerified,
  resolveFlightPermitVerificationStatus,
} from '../utils/workflowStepResolver';

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
    title: 'Review & Submit',
    sublabel: 'Review & Submit',
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
    sublabel: 'Before ↔ After',
    to: 'findings',
    icon: AutoAwesomeOutlined,
  },
  {
    step: 6,
    value: 'report',
    label: 'Report',
    title: 'Verify & Submit',
    sublabel: 'Verify & Submit',
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
] as const;

function toLocalDateTimeInputValue(iso?: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function InspectionDetailPage() {
  const { formatDate, formatDateTime, t } = useLocale();
  const [reportDirty, setReportDirty] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [reassignOpen, setReassignOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [forceAbortOpen, setForceAbortOpen] = useState(false);
  const [forceAbortReason, setForceAbortReason] = useState('');
  const [actionsAnchor, setActionsAnchor] = useState<HTMLElement | null>(null);
  const stageContentRef = useRef<HTMLDivElement>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const timerId = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(timerId);
  }, []);
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
  const canDispatch = roles.includes('MANAGER') && location.pathname.startsWith('/manager/');
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
  const versions = useReportVersions(inspectionId);
  const [platformUsers, setPlatformUsers] = useState<PlatformUser[]>([]);
  const [contextOverviewOpen, setContextOverviewOpen] = useState(false);

  useEffect(() => {
    if (!isReviewerAdmin || !inspection?.id) return;
    let active = true;
    platformUserApi
      .list()
      .then((users) => {
        if (active && Array.isArray(users)) setPlatformUsers(users);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [isReviewerAdmin, inspection?.id]);

  const matchedCustomer = platformUsers.find((u) => u.id === inspection?.ownerCustomerId);
  const matchedInspector = platformUsers.find((u) => u.id === inspection?.inspectorId);
  const customerLabel =
    inspection?.ownerCustomerName ||
    matchedCustomer?.fullName ||
    versions.data?.[0]?.reportContext?.organizationName ||
    (inspection?.ownerCustomerId ? `#${inspection.ownerCustomerId.slice(0, 8)}` : null);
  const inspectorLabel =
    inspection?.inspectorName ||
    matchedInspector?.fullName ||
    (inspection?.inspectorId ? `#${inspection.inspectorId.slice(0, 8)}` : null);
  const managerLabel =
    inspection?.managerName ||
    inspection?.flightPermitVerifiedByName ||
    null;
  const droneShortName =
    inspection?.droneModel || inspection?.droneSerialNumber || t('Unassigned');
  const shortScheduleLabel = inspection?.plannedStartAt
    ? formatDate(new Date(inspection.plannedStartAt))
    : null;
  const hasPublishedVersion = Boolean(
    versions.data?.some((version) => version.status === 'PUBLISHED'),
  );
  const paymentStatusQuery = useReportPaymentStatus?.(
    hasPublishedVersion && (isReviewerAdmin || isCustomer) ? inspectionId : null,
  );
  const isCustomerAccepted = Boolean(paymentStatusQuery?.data?.reportAccepted);
  const isPaymentSettled =
    Boolean(paymentStatusQuery?.data?.paid) ||
    paymentStatusQuery?.data?.paymentStatus === 'PAID';

  const sessionsQuery = useFieldSessions(inspectionId);
  const acceptMutation = useAcceptInspection(inspectionId);
  const declineMutation = useDeclineInspection(inspectionId);
  const rescheduleMutation = useRescheduleInspection(inspectionId);
  const cancelMutation = useCancelInspection(inspectionId);
  const forceAbortMutation = useForceAbortFieldSession(inspectionId);
  const openSession = sessionsQuery.data?.find(
    (s) => s.status === 'IN_PROGRESS' || s.status === 'PLANNED',
  );
  const latestSession = sessionsQuery.data?.at(-1);
  const wasAborted = latestSession?.status === 'ABORTED' && inspection?.status === 'SCHEDULED';
  const isOverdue =
    inspection?.status === 'SCHEDULED' &&
    Boolean(inspection?.overdueNotifiedAt) &&
    !wasAborted;
  const openRescheduleDialog = () => {
    setNewStart(toLocalDateTimeInputValue(inspection?.plannedStartAt));
    setNewEnd(toLocalDateTimeInputValue(inspection?.plannedEndAt));
    setRescheduleOpen(true);
  };
  const dispatchAction = (location.state as { dispatchAction?: string } | null)?.dispatchAction;
  useEffect(() => {
    if (!dispatchAction || !inspection || !canDispatch) return;
    if (dispatchAction === 'forceAbort' && sessionsQuery.isLoading) return;
    if (dispatchAction === 'reschedule' && inspection.status === 'SCHEDULED') {
      setNewStart(toLocalDateTimeInputValue(inspection.plannedStartAt));
      setNewEnd(toLocalDateTimeInputValue(inspection.plannedEndAt));
      setRescheduleOpen(true);
    }
    if (dispatchAction === 'reassign' && inspection.status === 'SCHEDULED') setReassignOpen(true);
    if (dispatchAction === 'cancel' && inspection.status === 'SCHEDULED') {
      setCancelReason('');
      setCancelOpen(true);
    }
    if (dispatchAction === 'forceAbort' && inspection.status === 'IN_PROGRESS' && openSession?.status === 'IN_PROGRESS') {
      setForceAbortReason('');
      setForceAbortOpen(true);
    }
    navigate(location.pathname, { replace: true, state: {} });
  }, [dispatchAction, inspection, canDispatch, openSession, sessionsQuery.isLoading, location.pathname, navigate]);
  const openDispatchAction = (action: 'reschedule' | 'reassign' | 'cancel' | 'forceAbort') => {
    setActionsAnchor(null);
    if (action === 'reschedule') openRescheduleDialog();
    else if (action === 'reassign') setReassignOpen(true);
    else if (action === 'cancel') {
      setCancelReason('');
      setCancelOpen(true);
    } else if (openSession?.status === 'IN_PROGRESS') {
      setForceAbortReason('');
      setForceAbortOpen(true);
    }
  };
  const hasScheduledDispatchActions = canDispatch && inspection?.status === 'SCHEDULED';
  const hasForceAbortAction = canDispatch && inspection?.status === 'IN_PROGRESS' && openSession?.status === 'IN_PROGRESS';
  const recoveryActionButtonSx = {
    textTransform: 'none',
    fontWeight: 600,
    borderRadius: '8px',
    boxShadow: 'none',
  } as const;
  const renderDispatchRecoveryActions = (primaryAction: 'reschedule' | 'reassign') =>
    hasScheduledDispatchActions ? (
      <Stack direction="row" spacing={1} sx={{ flexShrink: 0, flexWrap: 'wrap', rowGap: 1 }}>
        <Button
          size="small"
          variant={primaryAction === 'reschedule' ? 'contained' : 'outlined'}
          color={primaryAction === 'reschedule' ? 'warning' : 'primary'}
          onClick={() => openDispatchAction('reschedule')}
          sx={recoveryActionButtonSx}
        >
          {t('Reschedule')}
        </Button>
        <Button
          size="small"
          variant={primaryAction === 'reassign' ? 'contained' : 'outlined'}
          color={primaryAction === 'reassign' ? 'error' : 'primary'}
          onClick={() => openDispatchAction('reassign')}
          sx={recoveryActionButtonSx}
        >
          {t('Reassign Inspector & Drone')}
        </Button>
        <Button
          size="small"
          variant="outlined"
          color="error"
          onClick={() => openDispatchAction('cancel')}
          sx={recoveryActionButtonSx}
        >
          {t('Cancel inspection')}
        </Button>
      </Stack>
    ) : null;
  const showDispatchMenu = Boolean(hasScheduledDispatchActions || hasForceAbortAction);
  const workspaceActions = showDispatchMenu ? (
    <>
      <IconButton
        aria-label={t('Inspection actions')}
        aria-haspopup="menu"
        aria-expanded={Boolean(actionsAnchor)}
        onClick={(event: MouseEvent<HTMLElement>) => setActionsAnchor(event.currentTarget)}
        sx={{
          width: { xs: 44, sm: 36 },
          height: { xs: 44, sm: 36 },
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '8px',
        }}
      >
        <MoreVertRounded />
      </IconButton>
      <Menu
        anchorEl={actionsAnchor}
        open={Boolean(actionsAnchor)}
        onClose={() => setActionsAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { minWidth: 200, borderRadius: '12px' } } }}
      >
        {hasScheduledDispatchActions && (
          <MenuItem onClick={() => openDispatchAction('reschedule')}>
            {t('Reschedule')}
          </MenuItem>
        )}
        {hasScheduledDispatchActions && (
          <MenuItem onClick={() => openDispatchAction('reassign')}>
            {t('Reassign Inspector & Drone')}
          </MenuItem>
        )}
        {hasScheduledDispatchActions && <Divider />}
        {hasScheduledDispatchActions && (
          <MenuItem onClick={() => openDispatchAction('cancel')} sx={{ color: 'error.main' }}>
            {t('Cancel inspection')}
          </MenuItem>
        )}
        {hasForceAbortAction && (
          <MenuItem onClick={() => openDispatchAction('forceAbort')} sx={{ color: 'error.main' }}>
            {t('Force-abort session')}
          </MenuItem>
        )}
      </Menu>
    </>
  ) : null;
  const isInspectorRole = !isCustomer && !isReviewerAdmin && roles.includes('INSPECTOR');
  const isPendingAcceptance =
    isInspectorRole &&
    inspection?.status === 'SCHEDULED' &&
    !inspection?.reassignmentRequired &&
    inspection?.assignmentStatus === 'PENDING_ACCEPTANCE';
  const isDeclinedAwaitingReassign =
    inspection?.status === 'SCHEDULED' &&
    (Boolean(inspection?.reassignmentRequired) || inspection?.assignmentStatus === 'DECLINED');
  const isExecutionLockedByAssignment =
    isInspectorRole && (isPendingAcceptance || isDeclinedAwaitingReassign);

  const [flightStatusTick, setFlightStatusTick] = useState(0);
  useEffect(() => {
    const onFlightUpdated = () => setFlightStatusTick((n) => n + 1);
    window.addEventListener('sdi-flight-session-updated', onFlightUpdated);
    return () => window.removeEventListener('sdi-flight-session-updated', onFlightUpdated);
  }, []);

  void flightStatusTick;
  const hasLiveFlightInActiveSession = Boolean(
    openSession?.id &&
      typeof sessionStorage !== 'undefined' &&
      sessionStorage.getItem(`sdi_has_flown_${openSession.id}`) === 'true',
  );
  const hasFlightRecordInActiveSession = Boolean(
    openSession?.hasFlightReport || openSession?.telemetrySource,
  );

  const visibleSteps = isCustomer
    ? CUSTOMER_STEPS
    : isReviewerAdmin
      ? REVIEWER_STEPS
      : steps;

  const reviewerSourceRoutes = ['evidence', 'findings'];
  const tabValue = visibleSteps.some((step) => step.value === current)
    ? current
    : isCustomer
      ? hasPublishedVersion && (current === 'report' || current === 'settlement')
        ? current
        : 'tracking'
      : isReviewerAdmin
        ? reviewerSourceRoutes.includes(current)
          ? 'review'
          : visibleSteps[0]?.value ?? 'review'
        : isReinspection && current === 'evidence'
          ? 'findings'
          : 'field-session';

  // Guard against Customer directly visiting forbidden operational or reviewer URLs.
  useEffect(() => {
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
        (current === 'report' || current === 'settlement')
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
          isPaymentSettled
        );
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
        return hasPublishedVersion && isPaymentSettled;
      }
      return false;
    }

    const hasCurrentFindingsConfirmation =
      Boolean(workflowQuery.data?.findingsConfirmedAt) &&
      ['FIELD_COMPLETED', 'UNDER_REVIEW', 'COMPLETED'].includes(status);
    switch (stepValue) {
      case 'permit':
        return isFlightPermitVerified(inspection, workflowQuery.data);
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
        return (
          ['FIELD_COMPLETED', 'UNDER_REVIEW', 'COMPLETED'].includes(status) ||
          hasLiveFlightInActiveSession ||
          hasFlightRecordInActiveSession
        );
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
  const permitVerificationStatus = resolveFlightPermitVerificationStatus(
    inspection,
    workflowQuery.data,
  );
  const hasPermitReady = isFlightPermitVerified(inspection, workflowQuery.data);
  const hasSessionStarted =
    isFieldWorkComplete || hasLiveFlightInActiveSession || hasFlightRecordInActiveSession;
  const hasEvidence =
    activeEvidenceCount > 0 ||
    ['FIELD_COMPLETED', 'UNDER_REVIEW', 'COMPLETED'].includes(workflowStatus);
  const findingsComplete = isStepCompleted('findings');
  const readinessFor = (step: WorkflowStep): WorkflowStepState => {
    if (isCustomer) {
      if (isStepCompleted(step.value)) return 'complete';
      if (
        (step.value === 'report' || step.value === 'settlement') &&
        !hasPublishedVersion
      ) {
        return 'blocked';
      }
      if (tabValue === step.value) return 'active';
      if (
        step.value === 'tracking' ||
        step.value === 'report' ||
        step.value === 'settlement'
      ) {
        return 'ready';
      }
      return 'pending';
    }
    if (isExecutionLockedByAssignment) {
      return 'blocked';
    }
    if (isStepCompleted(step.value)) return 'complete';
    if ((step.value === 'pre-flight' || step.value === 'field-session') && !hasPermitReady) {
      return 'blocked';
    }
    if (step.value === 'post-flight' && !hasSessionStarted) return 'blocked';
    if (step.value === 'evidence' && !isFieldWorkComplete) return 'blocked';
    if (step.value === 'findings' && !hasEvidence) return 'blocked';
    if (step.value === 'report' && !findingsComplete) return 'blocked';
    if (tabValue === step.value) return 'active';
    if (step.value === 'permit' || step.value === 'audit') return 'ready';
    if (step.value === 'field-session') return hasPermitReady ? 'ready' : 'blocked';
    if (step.value === 'review') return versions.data?.length ? 'ready' : 'blocked';
    if (step.value === 'settlement') return hasPublishedVersion ? 'ready' : 'blocked';
    if (step.value === 'pre-flight') return hasPermitReady ? 'ready' : 'blocked';
    if (step.value === 'post-flight') return hasSessionStarted ? 'ready' : 'blocked';
    if (step.value === 'evidence') return isFieldWorkComplete ? 'ready' : 'blocked';
    if (step.value === 'findings') return (isReinspection ? isFieldWorkComplete : hasEvidence) ? 'ready' : 'blocked';
    if (step.value === 'report') return findingsComplete ? 'ready' : 'blocked';
    return 'pending';
  };

  const blockedReason = (step: WorkflowStep): string | null => {
    if (isPendingAcceptance) {
      return t('Accept this mission assignment before starting flight preparation.');
    }
    if (isInspectorRole && isDeclinedAwaitingReassign) {
      return t('This mission was declined and is awaiting manager reassignment.');
    }
    if (isCustomer) {
      if ((step.value === 'report' || step.value === 'settlement') && !hasPublishedVersion) {
        return t('The official report is being reviewed and has not been published yet. Please track progress.');
      }
      return null;
    }
    if ((step.value === 'pre-flight' || step.value === 'field-session') && !hasPermitReady) {
      if (permitVerificationStatus === 'PENDING_REVIEW') {
        return t('Flight permit is pending Platform Manager verification before starting the pre-flight checklist.');
      }
      if (permitVerificationStatus === 'REJECTED') {
        return t('Flight permit was rejected by the Platform Manager. Upload a replacement permit before starting the pre-flight checklist.');
      }
      return t('Upload the flight permit and await Manager approval before starting the pre-flight checklist.');
    }
    if (step.value === 'post-flight' && !hasSessionStarted) return t('Record flight activity using live telemetry, an imported log, or a manual declaration before completing post-flight checks.');
    if (step.value === 'evidence' && !isFieldWorkComplete) return t('Complete the field session first.');
    if (step.value === 'findings' && isReinspection && !isFieldWorkComplete) {
      return t('Complete the re-inspection flight session before verifying target defects.');
    }
    if (step.value === 'findings' && !isReinspection && !hasEvidence) return t('Upload evidence to review findings.');
    if (step.value === 'report' && !findingsComplete) return t('Confirm findings before compiling the report.');
    if (step.value === 'review' && !versions.data?.length) {
      return t('Awaiting Inspector report submission before manager review.');
    }
    if (step.value === 'settlement' && !hasPublishedVersion) {
      return t('Publish the official inspection report before reviewing settlement.');
    }
    return null;
  };

  const currentStep = visibleSteps.find((step) => step.value === tabValue);
  const currentStepIndex = visibleSteps.findIndex((step) => step.value === tabValue);
  const currentStepState = currentStep ? readinessFor(currentStep) : 'pending';

  const windowEndMs = inspection?.plannedEndAt ? new Date(inspection.plannedEndAt).getTime() : Number.NaN;
  const isWindowExpired = Number.isFinite(windowEndMs) && windowEndMs < nowMs;
  const abortedGuidance: {
    description: string;
    continueAction: { label: string; to?: string; scrollToContent?: boolean } | null;
  } = (() => {
    if (canDispatch) {
      return {
        description: t('The flight session was stopped before completion. Please reschedule the flight window or dispatch as needed.'),
        continueAction: null,
      };
    }
    if (isInspectorRole) {
      if (isPendingAcceptance || isDeclinedAwaitingReassign) {
        return {
          description: t('The flight session was stopped before completion. Execution resumes once the mission assignment is confirmed.'),
          continueAction: null,
        };
      }
      if (isWindowExpired) {
        return {
          description: t('The scheduled flight window has elapsed. Contact the Platform Manager to reschedule before starting a new session.'),
          continueAction: null,
        };
      }
      if (!hasPermitReady) {
        return {
          description:
            tabValue === 'permit'
              ? t('Upload a valid flight permit below before starting a new session, or contact the Platform Manager to reschedule.')
              : t('The flight session was stopped before completion. Upload a valid flight permit to prepare a new session, or contact the Platform Manager to reschedule.'),
          continueAction:
            tabValue === 'permit'
              ? { scrollToContent: true, label: t('Upload Flight Permit') }
              : { to: 'permit', label: t('Upload Flight Permit') },
        };
      }
      return {
        description:
          tabValue === 'pre-flight'
            ? t('Complete the pre-flight checklist below to start a new session when conditions are safe, or contact the Platform Manager to reschedule.')
            : t('The flight session was stopped before completion. You can prepare a new session when conditions are safe, or contact the Platform Manager to reschedule.'),
        continueAction:
          tabValue === 'pre-flight'
            ? { scrollToContent: true, label: t('Complete Pre-flight Checklist') }
            : { to: 'pre-flight', label: t('Go to Pre-flight Check') },
      };
    }
    return {
      description: t('The flight session was stopped before completion. The Platform Manager will reschedule or reassign this inspection as needed.'),
      continueAction: null,
    };
  })();
  const abortContinueAction = abortedGuidance.continueAction;

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
      className="workspace-page workspace-page--inspections trace-ledger-workspace inspection-detail-page"
      sx={{ width: '100%', maxWidth: '100%', mx: 'auto' }}
    >
      <Box className="trace-ledger-header" sx={{ mb: { xs: 2, md: 2.5 } }}>
        <PageBreadcrumbs
          items={[
            {
              label: t('Dashboard'),
              to: getSectionPath(
                isCustomer ? 'client' : isReviewerAdmin ? reviewerPortal : 'operations',
                'dashboard',
              ),
            },
            {
              label: t('Inspections'),
              to: isCustomer
                ? getSectionPath('client', 'inspections')
                : isReviewerAdmin
                  ? getSectionPath(reviewerPortal, 'inspections')
                  : getSectionPath('operations', 'inspections'),
            },
            {
              label:
                inspection?.assetName ||
                (isCustomer
                  ? t('Inspection workspace')
                  : isReviewerAdmin
                    ? t('Inspection review')
                    : t('Inspection workspace')),
            },
          ]}
        />

        <PageHeader
          title={isCustomer ? t('Inspection workspace') : isReviewerAdmin ? t('Inspection review') : t('Inspection workspace')}
          actions={workspaceActions}
        />

        {inspection && (() => {
          const contextSummaryColumns: Array<{ label: string; value: string; tabular?: boolean }> = [];
          if (!isCustomer && customerLabel) {
            contextSummaryColumns.push({ label: t('Customer'), value: customerLabel });
          }
          if ((isReviewerAdmin || isCustomer) && inspectorLabel) {
            contextSummaryColumns.push({ label: t('Inspector'), value: inspectorLabel });
          }
          if (!isReviewerAdmin && managerLabel) {
            contextSummaryColumns.push({ label: t('Manager'), value: managerLabel });
          }
          if (!isCustomer) {
            contextSummaryColumns.push({ label: t('Drone'), value: droneShortName });
          }
          if (!isReviewerAdmin && shortScheduleLabel) {
            contextSummaryColumns.push({ label: t('Schedule'), value: shortScheduleLabel, tabular: true });
          }
          return (
            <Paper
              elevation={0}
              className="inspection-trace-context"
              sx={{
                mt: 1,
                px: { xs: 1.75, sm: 2.25 },
                py: { xs: 1.25, sm: 1.5 },
                borderRadius: '10px',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                boxShadow: 'none',
              }}
            >
              <Stack spacing={1.25}>
                <Stack
                  direction="row"
                  spacing={1.5}
                  sx={{
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1.5,
                  }}
                >
                  <Stack
                    direction="row"
                    spacing={1.25}
                    onClick={() => setContextOverviewOpen((prev) => !prev)}
                    sx={{
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      rowGap: 0.5,
                      cursor: 'pointer',
                      minWidth: 0,
                      flex: 1,
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.95rem', lineHeight: 1.35 }}
                    >
                      {inspection.assetName || resolveInspectionMetadata(inspection).displayName}
                    </Typography>

                    {inspection.inspectionType === 'RE_INSPECTION' && (
                      <Chip
                        size="small"
                        variant="outlined"
                        color="secondary"
                        label={
                          inspection.sourceInspectionId
                            ? `${t('Re-inspection')} · #${inspection.sourceInspectionId.slice(0, 8)}`
                            : t('Re-inspection')
                        }
                        sx={{
                          height: 22,
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}
                      />
                    )}
                  </Stack>

                  <Button
                    size="small"
                    variant="text"
                    aria-expanded={contextOverviewOpen}
                    endIcon={contextOverviewOpen ? <ExpandLessRounded fontSize="small" /> : <ExpandMoreRounded fontSize="small" />}
                    onClick={() => setContextOverviewOpen((prev) => !prev)}
                    sx={{ textTransform: 'none', fontWeight: 600, minWidth: 'auto', px: 1, flexShrink: 0 }}
                  >
                    {t('Overview')}
                  </Button>
                </Stack>

                {contextSummaryColumns.length > 0 && (
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: {
                        xs: 'repeat(2, minmax(0, 1fr))',
                        sm: `repeat(${Math.min(2, contextSummaryColumns.length)}, minmax(0, 1fr))`,
                        md: `repeat(${Math.min(4, contextSummaryColumns.length)}, minmax(0, 1fr))`,
                      },
                      gap: { xs: 1.25, md: 2 },
                      pt: 1.15,
                      borderTop: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    {contextSummaryColumns.map((col) => (
                      <Box key={col.label} sx={{ minWidth: 0 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            display: 'block',
                            color: 'text.secondary',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            lineHeight: 1.2,
                            mb: 0.25,
                          }}
                        >
                          {col.label}
                        </Typography>
                        <Typography
                          variant="body2"
                          noWrap
                          title={col.value}
                          sx={{
                            color: 'text.primary',
                            fontWeight: 600,
                            fontSize: '0.84rem',
                            fontVariantNumeric: col.tabular ? 'tabular-nums' : undefined,
                          }}
                        >
                          {col.value}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}
              </Stack>

              <Collapse in={contextOverviewOpen} unmountOnExit>
                <Stack
                  spacing={2}
                  sx={{
                    mt: 1.5,
                    pt: 1.5,
                    borderTop: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <InspectionOverviewDetails
                    inspection={inspection}
                    isCustomer={isCustomer}
                    isReviewerAdmin={isReviewerAdmin}
                    droneShortName={droneShortName}
                  />

                  {!isCustomer ? (
                    <Box
                      role="region"
                      className="inspection-evidence-trace"
                      aria-label={t('Inspection evidence trace')}
                      sx={{ p: 0, border: 'none !important', bgcolor: 'transparent' }}
                    >
                      <Stack direction="row" spacing={{ xs: 1.5, sm: 2 }} sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
                        <Typography variant="body2"><strong>{t('Captures')}</strong> · {activeEvidenceCount}</Typography>
                        <Typography variant="body2"><strong>{t('Confirmed findings')}</strong> · {isStepCompleted('findings') ? t('Confirmed') : t('Not confirmed')}</Typography>
                        <Typography variant="body2"><strong>{t('Report')}</strong> · {versions.data?.[0] ? `v${versions.data[0].versionNo} ${t(versions.data[0].status)}` : t('No version')}</Typography>
                      </Stack>
                    </Box>
                  ) : (
                    <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>{t('Report')}</strong> ·{' '}
                        {hasPublishedVersion ? t('Published') : t('Pending')}
                      </Typography>
                    </Stack>
                  )}

                  {!isOrganizationAdmin && !isCustomer && (
                    <InspectorPayoutSummaryBar inspectionId={inspection.id} roleView="inspector" />
                  )}

                  {isReviewerAdmin && (
                    <OverviewStakeholdersSection
                      inspection={inspection}
                      portal={reviewerPortal}
                      onNavigateAway={() => setContextOverviewOpen(false)}
                    />
                  )}
                </Stack>
              </Collapse>
            </Paper>
          );
        })()}

        {isPendingAcceptance && (
          <Alert severity="info" sx={{ mt: 1.5, borderRadius: '10px', '& .MuiAlert-message': { width: '100%' } }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.25}
              sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
            >
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {t('Assignment pending confirmation')}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.25, fontVariantNumeric: 'tabular-nums' }}>
                  {inspection?.plannedStartAt
                    ? `${t('Planned Start')}: ${formatDateTime(new Date(inspection.plannedStartAt))}`
                    : t('Not scheduled')}
                  {inspection?.plannedEndAt ? ` – ${formatDateTime(new Date(inspection.plannedEndAt))}` : ''}
                </Typography>
              </Box>
            </Stack>
          </Alert>
        )}

        {isDeclinedAwaitingReassign && (
          <Alert severity="error" sx={{ mt: 1.5, borderRadius: '10px', '& .MuiAlert-message': { width: '100%' } }}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={1.25}
              sx={{ alignItems: { md: 'center' }, justifyContent: 'space-between' }}
            >
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {t('Reassignment required — assigned inspector declined')}
                </Typography>
                {inspection?.declineReason && (
                  <Typography variant="body2" sx={{ mt: 0.25 }}>
                    {t('Reason')}: &ldquo;{inspection.declineReason}&rdquo;
                  </Typography>
                )}
              </Box>
              {renderDispatchRecoveryActions('reassign')}
            </Stack>
          </Alert>
        )}

        {wasAborted && (
          <Alert severity="warning" sx={{ mt: 1.5, borderRadius: '10px', '& .MuiAlert-message': { width: '100%' } }}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={1.5}
              sx={{ alignItems: { md: 'center' }, justifyContent: 'space-between' }}
            >
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {t('Previous flight session was aborted')}
                </Typography>
                {(latestSession?.endedAt || latestSession?.abortReason) && (
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {latestSession?.endedAt ? `${t('Ended')} ${formatDate(new Date(latestSession.endedAt))}` : ''}
                    {latestSession?.endedAt && latestSession?.abortReason ? ' · ' : ''}
                    {latestSession?.abortReason ? (
                      <>
                        {t('Reason')}: &ldquo;{latestSession.abortReason}&rdquo;
                      </>
                    ) : null}
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  {abortedGuidance.description}
                </Typography>
              </Box>
              {canDispatch
                ? renderDispatchRecoveryActions('reschedule')
                : abortContinueAction && (
                    <Button
                      size="small"
                      variant="contained"
                      color="warning"
                      onClick={() => {
                        if (abortContinueAction.scrollToContent) {
                          stageContentRef.current?.scrollIntoView?.({
                            behavior: 'smooth',
                            block: 'start',
                          });
                          return;
                        }
                        if (abortContinueAction.to) {
                          navigate(
                            `${getSectionPath('operations', 'inspections')}/${inspectionId}/${abortContinueAction.to}`,
                          );
                        }
                      }}
                      sx={{ ...recoveryActionButtonSx, flexShrink: 0 }}
                    >
                      {abortContinueAction.label}
                    </Button>
                  )}
            </Stack>
          </Alert>
        )}

        {isReviewerAdmin && isOverdue && (
          <Alert severity="warning" sx={{ mt: 1.5, borderRadius: '10px', '& .MuiAlert-message': { width: '100%' } }}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={1.5}
              sx={{ alignItems: { md: 'center' }, justifyContent: 'space-between' }}
            >
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {t('Scheduled window passed without starting')}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.25 }}>
                  {canDispatch
                    ? t('The scheduled flight window elapsed with no active field session recorded. Follow up, reschedule, or reassign as needed.')
                    : t('The scheduled flight window elapsed with no active field session recorded. Pending Platform Manager follow-up, rescheduling, or reassignment.')}
                </Typography>
              </Box>
              {renderDispatchRecoveryActions('reschedule')}
            </Stack>
          </Alert>
        )}

        {isReviewerAdmin && inspection?.status === 'IN_PROGRESS' && openSession && (
          <Alert severity="info" sx={{ mt: 1.5, borderRadius: '10px' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {t('Field session in progress')}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.25 }}>
              {openSession.startedAt
                ? `${t('Started at')}: ${formatDateTime(new Date(openSession.startedAt))}`
                : t('Session active on site')}
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
            mt: 1.5,
            px: { xs: 1.5, sm: 2.5 },
            py: { xs: 1.5, sm: 2 },
            bgcolor: 'background.paper',
            borderRadius: '10px',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: 'none',
          }}
        >
          <Stack
            direction="row"
            sx={{ alignItems: 'flex-start', display: { xs: 'none', md: 'flex' } }}
          >
            {visibleSteps.map((step, idx) => {
              const state = readinessFor(step);
              const reason = blockedReason(step);
              const isCurrent = tabValue === step.value;
              const prevStep = idx > 0 ? visibleSteps[idx - 1] : undefined;
              const prevCompleted = prevStep ? readinessFor(prevStep) === 'complete' : false;
              const isCompleted = state === 'complete';
              const completeGreen = '#176B52';
              const activePrimary = '#2B84EB';

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
                    transition: 'color 160ms ease',
                    bgcolor: 'transparent',
                    '&:hover .trace-stage-title': {
                      color: 'text.primary',
                    },
                    '&:focus-visible': {
                      outline: '2px solid',
                      outlineColor: 'primary.main',
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
                              ? completeGreen
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
                          ? completeGreen
                          : isCurrent
                            ? activePrimary
                            : state === 'ready'
                              ? 'text.secondary'
                              : 'divider',
                        bgcolor: isCompleted
                          ? completeGreen
                          : isCurrent
                            ? activePrimary
                            : 'background.paper',
                        color:
                          isCompleted || isCurrent
                            ? '#ffffff'
                            : state === 'ready'
                              ? 'text.primary'
                              : 'text.secondary',
                        boxShadow: 'none',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        transition: 'all 180ms ease',
                      }}
                    >
                      {isCompleted ? (
                        <CheckRounded sx={{ fontSize: 18 }} />
                      ) : (
                        idx + 1
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
                              ? completeGreen
                              : 'divider',
                        transition: 'background-color 220ms ease',
                      }}
                    />
                  </Box>

                  {/* Step Title */}
                  <Box sx={{ mt: 1.1, px: 0.75, minWidth: 0, width: '100%' }}>
                    <Typography
                      component="span"
                      className="trace-stage-title"
                      sx={{
                        display: 'block',
                        color: isCurrent
                          ? isCompleted
                            ? completeGreen
                            : activePrimary
                          : isCompleted
                            ? 'text.primary'
                            : 'text.secondary',
                        fontSize: '0.875rem',
                        fontWeight: isCurrent ? 700 : isCompleted ? 600 : 500,
                        lineHeight: 1.25,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {t(step.title)}
                    </Typography>
                    {isReviewerAdmin &&
                      step.value === 'settlement' &&
                      hasPublishedVersion &&
                      !isPaymentSettled && (
                        <Typography
                          component="span"
                          sx={{
                            display: 'block',
                            mt: 0.25,
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            color: '#2B84EB',
                            lineHeight: 1.2,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {isCustomerAccepted ? t('Awaiting payment') : t('Awaiting customer')}
                        </Typography>
                      )}
                  </Box>
                </ButtonBase>
              );
            })}
          </Stack>

          {currentStep && (
            <Box sx={{ display: { xs: 'block', md: 'none' } }}>
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
                  const completeGreen = '#176B52';
                  const activePrimary = '#2B84EB';
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
                          width: 44,
                          height: 44,
                          minWidth: 44,
                          minHeight: 44,
                          borderRadius: '50%',
                          border: '2px solid',
                          borderColor: isCompleted
                            ? completeGreen
                            : isCurrent
                              ? activePrimary
                              : 'divider',
                          bgcolor: isCompleted ? completeGreen : 'background.paper',
                          color: isCompleted
                            ? '#ffffff'
                            : isCurrent
                              ? activePrimary
                              : 'text.secondary',
                          boxShadow: isCurrent ? '0 0 0 3px rgba(43, 132, 235, 0.2)' : 'none',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                        }}
                      >
                        {isCompleted ? <CheckRounded sx={{ fontSize: 16 }} /> : idx + 1}
                      </ButtonBase>
                      {idx < visibleSteps.length - 1 && (
                        <Box
                          aria-hidden="true"
                          sx={{
                            flex: 1,
                            height: 2,
                            bgcolor: isCompleted ? completeGreen : 'divider',
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

      {inspection?.inspectionType === 'RE_INSPECTION' && !isCustomer && !isReviewerAdmin && (
        <Box sx={{ mt: { xs: 2, md: 2.5 } }}>
          <Alert severity="info">
            {t('This mission verifies the original repair outcome. Complete the normal permit, field session, evidence and report steps; a new permit is required for every re-inspection.')}
            {inspection.sourceInspectionId && (
              <>
                {' '}
                {t('Source inspection')}: {inspection.sourceInspectionId.slice(0, 8)}
              </>
            )}
          </Alert>
        </Box>
      )}
      <Box ref={stageContentRef} className="trace-stage-content" sx={{ mt: { xs: 2, md: 2.5 } }}>
        {isExecutionLockedByAssignment ? (
          <Paper
            variant="outlined"
            sx={{ p: { xs: 2.5, sm: 3.5 }, borderRadius: '12px', textAlign: 'center' }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {isPendingAcceptance
                ? t('Accept assignment to begin')
                : t('Mission declined')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
              {isPendingAcceptance
                ? t('Confirm or decline this assignment to proceed.')
                : t('Awaiting manager reassignment.')}
            </Typography>
            {isPendingAcceptance && (
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                sx={{ justifyContent: 'center', mt: 2.5 }}
              >
                <Button
                  variant="outlined"
                  color="warning"
                  onClick={() => {
                    setDeclineReason('');
                    setDeclineOpen(true);
                  }}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px', minHeight: { xs: 44, sm: 38 } }}
                >
                  {t('Decline mission')}
                </Button>
                <LoadingButton
                  variant="contained"
                  color="primary"
                  loading={acceptMutation.isPending}
                  onClick={() => acceptMutation.mutate(undefined)}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px', boxShadow: 'none', minHeight: { xs: 44, sm: 38 } }}
                >
                  {t('Accept mission')}
                </LoadingButton>
              </Stack>
            )}
          </Paper>
        ) : (
          <Outlet context={{ onReportDirtyChange: setReportDirty }} />
        )}
      </Box>

      <Dialog open={declineOpen} onClose={() => setDeclineOpen(false)} maxWidth="xs" fullWidth>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!declineReason.trim()) return;
            declineMutation.mutate(declineReason.trim(), {
              onSuccess: () => {
                setDeclineOpen(false);
              },
            });
          }}
        >
          <DialogTitle sx={{ fontWeight: 700 }}>{t('Decline assigned mission?')}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label={t('Decline reason')}
                multiline
                minRows={3}
                required
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                helperText={t('Explain why you cannot perform this inspection so the Platform Manager can reassign it.')}
              />
              <MutationProblemAlert
                error={declineMutation.error}
                isError={declineMutation.isError}
                fallbackMessage={t('Could not decline inspection.')}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDeclineOpen(false)}>{t('Back')}</Button>
            <LoadingButton
              type="submit"
              variant="contained"
              color="warning"
              loading={declineMutation.isPending}
              disabled={!declineReason.trim()}
            >
              {t('Confirm decline')}
            </LoadingButton>
          </DialogActions>
        </form>
      </Dialog>

      {canDispatch && (
        <>
          <ReassignInspectionDialog
            open={reassignOpen}
            inspection={inspection}
            onClose={() => setReassignOpen(false)}
          />

          <Dialog open={rescheduleOpen} onClose={() => setRescheduleOpen(false)} maxWidth="xs" fullWidth>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newStart || !newEnd) return;
                rescheduleMutation.mutate(
                  {
                    plannedStartAt: new Date(newStart).toISOString(),
                    plannedEndAt: new Date(newEnd).toISOString(),
                  },
                  { onSuccess: () => setRescheduleOpen(false) },
                );
              }}
            >
              <DialogTitle sx={{ fontWeight: 700 }}>{t('Reschedule flight window')}</DialogTitle>
              <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                  <TextField
                    label={t('Planned start')}
                    type="datetime-local"
                    value={newStart}
                    onChange={(e) => setNewStart(e.target.value)}
                    required
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  <TextField
                    label={t('Planned end')}
                    type="datetime-local"
                    value={newEnd}
                    onChange={(e) => setNewEnd(e.target.value)}
                    required
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  <MutationProblemAlert
                    error={rescheduleMutation.error}
                    isError={rescheduleMutation.isError}
                    fallbackMessage={t('Could not reschedule inspection.')}
                  />
                </Stack>
              </DialogContent>
              <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={() => setRescheduleOpen(false)}>{t('Back')}</Button>
                <LoadingButton
                  type="submit"
                  variant="contained"
                  loading={rescheduleMutation.isPending}
                  disabled={!newStart || !newEnd}
                >
                  {t('Save schedule')}
                </LoadingButton>
              </DialogActions>
            </form>
          </Dialog>

          <Dialog open={cancelOpen} onClose={() => setCancelOpen(false)} maxWidth="xs" fullWidth>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                cancelMutation.mutate(
                  { reason: cancelReason.trim() },
                  { onSuccess: () => setCancelOpen(false) },
                );
              }}
            >
              <DialogTitle sx={{ fontWeight: 700 }}>{t('Cancel this inspection?')}</DialogTitle>
              <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                  <TextField
                    label={t('Cancellation reason')}
                    multiline
                    minRows={3}
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    helperText={t('Enter the reason for cancelling this scheduled mission.')}
                  />
                  <MutationProblemAlert
                    error={cancelMutation.error}
                    isError={cancelMutation.isError}
                    fallbackMessage={t('Could not cancel inspection.')}
                  />
                </Stack>
              </DialogContent>
              <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={() => setCancelOpen(false)}>{t('Back')}</Button>
                <LoadingButton
                  type="submit"
                  variant="contained"
                  color="error"
                  loading={cancelMutation.isPending}
                >
                  {t('Confirm cancellation')}
                </LoadingButton>
              </DialogActions>
            </form>
          </Dialog>

          <Dialog open={forceAbortOpen} onClose={() => setForceAbortOpen(false)} maxWidth="xs" fullWidth>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!openSession?.id || !forceAbortReason.trim()) return;
                forceAbortMutation.mutate(
                  { sessionId: openSession.id, reason: forceAbortReason.trim() },
                  { onSuccess: () => setForceAbortOpen(false) },
                );
              }}
            >
              <DialogTitle sx={{ fontWeight: 700 }}>{t('Force-abort active session?')}</DialogTitle>
              <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                  <TextField
                    label={t('Force-abort reason')}
                    multiline
                    minRows={3}
                    required
                    value={forceAbortReason}
                    onChange={(e) => setForceAbortReason(e.target.value)}
                    helperText={t('This closes the hung IN_PROGRESS session and returns the inspection to SCHEDULED for recovery dispatch.')}
                  />
                  <MutationProblemAlert
                    error={forceAbortMutation.error}
                    isError={forceAbortMutation.isError}
                    fallbackMessage={t('Could not force-abort field session.')}
                  />
                </Stack>
              </DialogContent>
              <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={() => setForceAbortOpen(false)}>{t('Back')}</Button>
                <LoadingButton
                  type="submit"
                  variant="contained"
                  color="error"
                  loading={forceAbortMutation.isPending}
                  disabled={!forceAbortReason.trim()}
                >
                  {t('Confirm force-abort')}
                </LoadingButton>
              </DialogActions>
            </form>
          </Dialog>
        </>
      )}

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
            {t('You have unsaved report changes. Review or discard them before leaving.')}
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

