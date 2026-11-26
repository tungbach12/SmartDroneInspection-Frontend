import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddRounded from '@mui/icons-material/AddRounded';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import UploadFileRounded from '@mui/icons-material/UploadFileRounded';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import { MutationProblemAlert } from '@/shared/ui/MutationProblemAlert';
import { QueryState } from '@/shared/ui/QueryState';
import { StatusChip } from '@/shared/ui/StatusChip';
import { getSectionPath } from '@/app/permissions/accessPolicy';
import { useAuthStore } from '@/features/auth/store/authStore';
import {
  useDeclineInspection,
  useFieldSessionOutcome,
  useFieldSessions,
  useInspection,
  useInspectionEvidence,
  useInspectionFlights,
  useInspectionWorkflowState,
  useReinspectionVerifications,
  useStartFieldSession,
  useUploadFlightPermit,
} from '../hooks/useInspections';
import { TargetFlightShotList } from '../components/TargetFlightShotList';
import { SmartDroneHubTelemetryPanel } from '../components/SmartDroneHubTelemetryPanel';
import { FlightPermitPreviewDialog } from '../components/FlightPermitPreviewDialog';
import { FlightPermitVerificationPanel } from '../components/FlightPermitVerificationPanel';
import { StepActionBar } from '../components/StepActionBar';
import {
  isFlightPermitVerified,
  resolveFlightPermitVerificationStatus,
} from '../utils/workflowStepResolver';
import { RestrictedAirspaceAlert } from '@/shared/airspace/RestrictedAirspaceNotice';
import { getRestrictedAirspaceSummary } from '@/shared/airspace/airspaceZones';
import { FlightOperationsReportView } from '@/features/reports/components/FlightOperationsReportView';
import { useChecklistTemplates } from '@/features/assets/hooks/useCatalog';
import {
  fieldSessionApi,
  fieldSessionKeys,
  type ChecklistItemSnapshot,
  type FieldSession,
  type FieldSessionFlight,
  type PreFlightConditions,
} from '../api/fieldSessionApi';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  smartDroneHubApi,
  type SmartDroneHubTelemetry,
} from '../api/smartDroneHubApi';
import { useLocale } from '@/shared/i18n/LocaleProvider';

const FlightSimulationDemoDialog = lazy(() =>
  import('../components/FlightSimulationDemoDialog').then((m) => ({
    default: m.FlightSimulationDemoDialog,
  })),
);

interface ChecklistSpecItem {
  code: string;
  category: string;
  label: string;
  details: string | null;
  referenceThreshold: string | null;
  safetyCritical: boolean;
  required: boolean;
}

const PRE_FLIGHT_CHECKLIST_ITEMS: readonly {
  category: string;
  label: string;
  details: string | null;
  referenceThreshold: string | null;
  safetyCritical: boolean;
  required: boolean;
}[] = [
  {
    category: 'AIRFRAME_POWER',
    label: 'Airframe, propellers & gimbal mounting lock verified',
    details: null,
    referenceThreshold: null,
    safetyCritical: true,
    required: true,
  },
  {
    category: 'AIRFRAME_POWER',
    label: 'Flight & controller batteries healthy, balanced & sufficient for mission',
    details: null,
    referenceThreshold: null,
    safetyCritical: true,
    required: true,
  },
  {
    category: 'WEATHER_AIRSPACE',
    label: 'Surface wind, gusts & visibility within assigned drone operating limits',
    details: null,
    referenceThreshold: null,
    safetyCritical: true,
    required: true,
  },
  {
    category: 'SITE_EMERGENCY',
    label: 'Takeoff/landing pad & safety perimeter clear of obstacles and bystanders',
    details: null,
    referenceThreshold: null,
    safetyCritical: true,
    required: true,
  },
  {
    category: 'WEATHER_AIRSPACE',
    label: 'Flight permit ceiling & surrounding obstacle/EMF clearance checked',
    details: null,
    referenceThreshold: null,
    safetyCritical: true,
    required: true,
  },
  {
    category: 'NAVIGATION_FAILSAFE',
    label: 'GNSS lock, compass/IMU status & RTH failsafe set above obstacles',
    details: null,
    referenceThreshold: null,
    safetyCritical: true,
    required: true,
  },
  {
    category: 'PAYLOAD_COMMS',
    label: 'Payload optics clean, storage sufficient & C2 telemetry link verified',
    details: null,
    referenceThreshold: null,
    safetyCritical: false,
    required: false,
  },
  {
    category: 'SITE_EMERGENCY',
    label: 'Backup emergency landing zone & fire/first-aid kit ready on site',
    details: null,
    referenceThreshold: null,
    safetyCritical: false,
    required: false,
  },
];

const POST_FLIGHT_CHECKLIST_ITEMS: readonly {
  category: string;
  label: string;
  details: string | null;
  referenceThreshold: string | null;
  safetyCritical: boolean;
  required: boolean;
}[] = [
  {
    category: 'POST_FLIGHT_HARDWARE',
    label: 'Aircraft landed cleanly & propulsion/power completely disarmed',
    details: null,
    referenceThreshold: null,
    safetyCritical: true,
    required: true,
  },
  {
    category: 'POST_FLIGHT_HARDWARE',
    label: 'Motors, ESCs & batteries checked for abnormal heat or swelling',
    details: null,
    referenceThreshold: null,
    safetyCritical: true,
    required: true,
  },
  {
    category: 'POST_FLIGHT_MEDIA',
    label: 'All sortie photos, videos & flight logs verified & backed up',
    details: null,
    referenceThreshold: null,
    safetyCritical: true,
    required: true,
  },
  {
    category: 'POST_FLIGHT_MEDIA',
    label: 'Safety cones removed, equipment packed & site restored',
    details: null,
    referenceThreshold: null,
    safetyCritical: false,
    required: false,
  },
];

const ABORT_REASON_PRESETS = [
  'Sudden adverse weather / high wind',
  'GPS signal loss / magnetic interference',
  'UAV battery or hardware warning',
  'Site safety hazard / airspace intrusion',
] as const;

function parseChecklistNote(raw: string | null | undefined): {
  checkedItems: string[];
  skippedItems: string[];
  remark: string | null;
} {
  if (!raw || !raw.trim()) {
    return { checkedItems: [], skippedItems: [], remark: null };
  }
  const trimmed = raw.trim();
  if (!trimmed.includes('[✓]') && !trimmed.includes('[!]')) {
    return { checkedItems: [], skippedItems: [], remark: trimmed };
  }
  let checklistPart = trimmed;
  let remark: string | null = null;
  const separatorIdx = trimmed.lastIndexOf(' — ');
  if (separatorIdx !== -1) {
    checklistPart = trimmed.slice(0, separatorIdx).trim();
    remark = trimmed.slice(separatorIdx + 3).trim() || null;
  }
  const checkedItems: string[] = [];
  const skippedItems: string[] = [];
  for (const part of checklistPart.split(' · ')) {
    const clean = part.trim();
    if (clean.startsWith('[!]')) {
      skippedItems.push(clean.replace(/^\[!\]\s*/, '').trim());
    } else if (clean.startsWith('[✓]')) {
      checkedItems.push(clean.replace(/^\[✓\]\s*/, '').trim());
    }
  }
  return { checkedItems, skippedItems, remark };
}

function CircleSign({ state }: { state: 'checked' | 'unchecked' | 'skipped' }) {
  const isChecked = state === 'checked';
  const isSkipped = state === 'skipped';
  return (
    <Box
      aria-hidden="true"
      sx={{
        width: 20,
        height: 20,
        borderRadius: '50%',
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        border: '1.5px solid',
        borderColor: isChecked ? '#176B52' : isSkipped ? 'warning.main' : 'divider',
        bgcolor: isChecked ? '#176B52' : 'transparent',
        color: isChecked ? '#ffffff' : isSkipped ? 'warning.main' : 'transparent',
        fontSize: '0.75rem',
        fontWeight: 700,
        lineHeight: 1,
        transition: 'all 140ms ease',
      }}
    >
      {isChecked ? '✓' : isSkipped ? '!' : ''}
    </Box>
  );
}

function ChecklistNoteDisplay({
  title,
  rawNote,
  fallbackItems,
  itemCodePrefix,
  pendingUnchecked,
}: {
  title: string;
  rawNote: string;
  fallbackItems?: readonly string[];
  itemCodePrefix?: string;
  pendingUnchecked?: boolean;
}) {
  const { t } = useLocale();
  const parsed = parseChecklistNote(rawNote);
  const hasRecorded = parsed.checkedItems.length > 0 || parsed.skippedItems.length > 0;
  const fallbackList = fallbackItems ? fallbackItems.map((item) => t(item)) : [];
  const checkedItems = hasRecorded
    ? parsed.checkedItems
    : pendingUnchecked
      ? []
      : fallbackList;
  const uncheckedItems = !hasRecorded && pendingUnchecked ? fallbackList : [];
  const skippedItems = parsed.skippedItems;
  const remark = parsed.remark;
  const totalCount = checkedItems.length + uncheckedItems.length + skippedItems.length;

  if (totalCount === 0) {
    return (
      <Box sx={{ pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          {rawNote}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 2.5 },
        borderRadius: '12px',
        bgcolor: 'background.default',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.75 }}
      >
        <Typography variant="subtitle2" sx={{ fontSize: '0.9375rem', fontWeight: 600, color: 'text.primary' }}>
          {title}
        </Typography>
        <Chip
          size="small"
          label={`${checkedItems.length}/${totalCount}`}
          color={checkedItems.length === totalCount ? 'success' : 'default'}
          variant="outlined"
        />
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
          gap: 1.5,
        }}
      >
        {checkedItems.map((item, idx) => (
          <Box
            key={`ok-${idx}`}
            sx={{
              minHeight: 68,
              px: 2,
              py: 1.5,
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              border: '1px solid',
              borderColor: 'rgba(22, 163, 74, 0.35)',
              bgcolor: 'background.paper',
            }}
          >
            <CircleSign state="checked" />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              {itemCodePrefix && (
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#16A34A',
                    mb: 0.25,
                  }}
                >
                  {`${itemCodePrefix}-${String(idx + 1).padStart(2, '0')}`}
                </Typography>
              )}
              <Typography variant="body2" sx={{ fontSize: '0.9375rem', fontWeight: 500, lineHeight: 1.4, color: 'text.primary' }}>
                {item}
              </Typography>
            </Box>
          </Box>
        ))}
        {uncheckedItems.map((item, idx) => (
          <Box
            key={`pending-${idx}`}
            sx={{
              minHeight: 68,
              px: 2,
              py: 1.5,
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}
          >
            <CircleSign state="unchecked" />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              {itemCodePrefix && (
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'text.secondary',
                    mb: 0.25,
                  }}
                >
                  {`${itemCodePrefix}-${String(idx + 1).padStart(2, '0')}`}
                </Typography>
              )}
              <Typography variant="body2" sx={{ fontSize: '0.9375rem', fontWeight: 500, lineHeight: 1.4, color: 'text.primary' }}>
                {item}
              </Typography>
            </Box>
          </Box>
        ))}
        {skippedItems.map((item, idx) => (
          <Box
            key={`skip-${idx}`}
            sx={{
              minHeight: 68,
              px: 2,
              py: 1.5,
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'warning.main',
            }}
          >
            <CircleSign state="skipped" />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              {itemCodePrefix && (
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'warning.main',
                    mb: 0.25,
                  }}
                >
                  {`${itemCodePrefix}-${String(checkedItems.length + idx + 1).padStart(2, '0')}`}
                </Typography>
              )}
              <Typography variant="body2" sx={{ fontSize: '0.9375rem', fontWeight: 500, lineHeight: 1.4, color: 'text.primary' }}>
                {item}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>

      {remark && (
        <Box
          sx={{
            mt: 2,
            pt: 1.5,
            borderTop: '1px dashed',
            borderColor: 'divider',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {remark}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

const MAX_PERMIT_FILE_BYTES = 25 * 1024 * 1024;
const ALLOWED_PERMIT_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
]);
const ALLOWED_PERMIT_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'] as const;

function toDateTimeLocalValue(iso?: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function validatePermitFileSelection(file: File, t: (text: string) => string): string | null {
  if (file.size <= 0) {
    return t('Selected flight permit file is empty.');
  }
  if (file.size > MAX_PERMIT_FILE_BYTES) {
    return t('Flight permit file exceeds the 25 MB limit.');
  }
  const lower = file.name.toLowerCase();
  const extOk = ALLOWED_PERMIT_EXTENSIONS.some((ext) => lower.endsWith(ext));
  const mimeOk = !file.type || ALLOWED_PERMIT_MIME_TYPES.has(file.type.toLowerCase());
  if (!extOk || !mimeOk) {
    return t('Unsupported permit format. Upload a PDF, PNG, JPG, or WEBP file.');
  }
  return null;
}

export interface FieldSessionPageProps {
  stage?: 'permit' | 'pre-flight' | 'flight' | 'post-flight';
}

/** Record a mission permit file and the Inspector's on-site session. */
export default function FieldSessionPage({ stage }: FieldSessionPageProps = {}) {
  const { locale, formatDateTime, t } = useLocale();
  const tr = (vi: string, en: string) => (locale === 'vi' ? vi : en);
  const { inspectionId = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const roles = useAuthStore((state) => state.roles);
  const isManagerOrAdmin = roles.includes('MANAGER') || roles.includes('ADMIN');
  const inspectionQuery = useInspection(inspectionId);
  const inspection = inspectionQuery.data;
  const sessions = useFieldSessions(inspectionId);
  const showPermitSection = !stage || stage === 'permit';
  const isInspector = roles.includes('INSPECTOR');
  const workflowQuery = useInspectionWorkflowState(
    showPermitSection && isInspector ? inspectionId : null,
  );
  const flightsQuery = useInspectionFlights(inspectionId);
  const startSession = useStartFieldSession(inspectionId);
  const outcome = useFieldSessionOutcome(inspectionId);
  const uploadPermit = useUploadFlightPermit(inspectionId);
  const withdrawAssignment = useDeclineInspection(
    inspectionId,
    t('You withdrew from the assignment. The Manager has been notified.'),
  );
  const isReinspection = inspection?.inspectionType === 'RE_INSPECTION';
  const verifications = useReinspectionVerifications?.(isReinspection ? inspectionId : '');
  const evidenceQuery = useInspectionEvidence?.(inspectionId);

  const [permitFile, setPermitFile] = useState<File | null>(null);
  const [permitNumberDraft, setPermitNumber] = useState<string | null>(null);
  const [issuingAuthorityDraft, setIssuingAuthority] = useState<string | null>(null);
  const [permitValidFromDraft, setPermitValidFrom] = useState<string | null>(null);
  const [permitValidToDraft, setPermitValidTo] = useState<string | null>(null);
  const [maxAltitudeDraft, setMaxAltitudeDraft] = useState<string | null>(null);
  const [permitFormError, setPermitFormError] = useState<string | null>(null);
  const [withdrawAssignmentOpen, setWithdrawAssignmentOpen] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState('');
  const [permitPreviewOpen, setPermitPreviewOpen] = useState(false);
  const [replacePermitOpen, setReplacePermitOpen] = useState(false);
  const [pendingPermitReplacePayload, setPendingPermitReplacePayload] = useState<{
    file: File;
    permitNumber: string;
    issuingAuthority: string;
    validFrom: string;
    validTo: string;
    maxAltitudeM?: number | null | undefined;
  } | null>(null);
  const [startOpen, setStartOpen] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const timerId = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(timerId);
  }, []);
  const [preFlightChecked, setPreFlightChecked] = useState<string[]>([]);
  const [preFlightNote, setPreFlightNote] = useState('');
  const [sessionDateInput, setSessionDateInput] = useState(() => new Date().toISOString().slice(0, 10));
  const [windSpeedInput, setWindSpeedInput] = useState('');
  const [minBatteryInput, setMinBatteryInput] = useState('');
  const [gpsSatsInput, setGpsSatsInput] = useState('');
  const [rthAltInput, setRthAltInput] = useState('');
  const [weatherSummaryInput, setWeatherSummaryInput] = useState('');
  const [additionalSessionMode, setAdditionalSessionMode] = useState(
    () => searchParams.get('newSession') === '1',
  );
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null);
  const [addFlightOpen, setAddFlightOpen] = useState(false);
  const [newFlightLabel, setNewFlightLabel] = useState('');
  const [newFlightDate, setNewFlightDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [outcomeTarget, setOutcomeTarget] = useState<{
    session: FieldSession;
    kind: 'abort' | 'complete';
  } | null>(null);
  const [postFlightChecked, setPostFlightChecked] = useState<string[]>([]);
  const [inspectedAssetItems, setInspectedAssetItems] = useState<string[]>(() => {
    if (!inspectionId) return [];
    try {
      const raw = sessionStorage.getItem(`sdi_inspected_items_${inspectionId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.filter((x): x is string => typeof x === 'string');
      }
    } catch {
      // ignore
    }
    return [];
  });
  const [liveTelemetry, setLiveTelemetry] = useState<SmartDroneHubTelemetry | null>(null);
  const [flightCompletedOnStep, setFlightCompletedOnStep] = useState(false);
  const [abortCategory, setAbortCategory] = useState<string | null>(null);
  const [outcomeReason, setOutcomeReason] = useState('');
  const [simDemoOpen, setSimDemoOpen] = useState(false);
  const abortReasonInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  const assetInspectionItems = isReinspection ? [] : (inspection?.inspectionItems ?? []);

  const preFlightTemplatesQuery = useChecklistTemplates(
    { type: 'PRE_FLIGHT' },
    startOpen || stage === 'pre-flight',
  );
  const postFlightTemplatesQuery = useChecklistTemplates(
    { type: 'POST_FLIGHT' },
    outcomeTarget?.kind === 'complete' || stage === 'post-flight',
  );

  const rawPreFlightTemplates: readonly {
    category: string;
    label: string;
    details: string | null;
    referenceThreshold: string | null;
    safetyCritical: boolean;
    required: boolean;
  }[] =
    preFlightTemplatesQuery.data && preFlightTemplatesQuery.data.length > 0
      ? preFlightTemplatesQuery.data
          .filter((item) => item.active)
          .map((item) => ({
            category: item.category || 'GENERAL',
            label: locale === 'vi' && item.labelVi ? item.labelVi : item.label,
            details:
              locale === 'vi' && item.detailsVi
                ? item.detailsVi
                : item.details ?? null,
            referenceThreshold: item.referenceThreshold ?? null,
            safetyCritical: Boolean(item.safetyCritical),
            required: item.required ?? true,
          }))
      : PRE_FLIGHT_CHECKLIST_ITEMS;

  const preFlightSpecItems: readonly ChecklistSpecItem[] = rawPreFlightTemplates.map(
    (item, idx) => ({
      code: `PF-${String(idx + 1).padStart(2, '0')}`,
      category: item.category,
      label: item.label,
      details: item.details,
      referenceThreshold: item.referenceThreshold,
      safetyCritical: item.safetyCritical,
      required: item.required,
    }),
  );
  const preFlightItems: readonly string[] = preFlightSpecItems.map((item) => item.label);
  const requiredPreFlightItems = preFlightSpecItems.filter((item) => item.required);
  const optionalPreFlightItems = preFlightSpecItems.filter((item) => !item.required);

  const rawPostFlightTemplates: readonly {
    category: string;
    label: string;
    details: string | null;
    referenceThreshold: string | null;
    safetyCritical: boolean;
    required: boolean;
  }[] =
    postFlightTemplatesQuery.data && postFlightTemplatesQuery.data.length > 0
      ? postFlightTemplatesQuery.data
          .filter((item) => item.active)
          .map((item) => ({
            category: item.category || 'GENERAL',
            label: locale === 'vi' && item.labelVi ? item.labelVi : item.label,
            details:
              locale === 'vi' && item.detailsVi
                ? item.detailsVi
                : item.details ?? null,
            referenceThreshold: item.referenceThreshold ?? null,
            safetyCritical: Boolean(item.safetyCritical),
            required: item.required ?? false,
          }))
      : POST_FLIGHT_CHECKLIST_ITEMS;

  const postFlightSpecItems: readonly ChecklistSpecItem[] = rawPostFlightTemplates.map(
    (item, idx) => ({
      code: `PO-${String(idx + 1).padStart(2, '0')}`,
      category: item.category,
      label: item.label,
      details: item.details,
      referenceThreshold: item.referenceThreshold,
      safetyCritical: item.safetyCritical,
      required: item.required,
    }),
  );
  const postFlightItems: readonly string[] = postFlightSpecItems.map((item) => item.label);
  const requiredPostFlightItems = postFlightSpecItems.filter((item) => item.required);

  const items = sessions.data ?? [];
  const allInspectionFlights =
    flightsQuery.data && flightsQuery.data.length > 0
      ? flightsQuery.data
      : items.flatMap((s) => s.flights ?? []);
  const openSession = items.find(
    (session) => session.status === 'IN_PROGRESS' || session.status === 'PLANNED',
  );
  const openSessionFlights: FieldSessionFlight[] =
    openSession?.flights && openSession.flights.length > 0
      ? openSession.flights
      : openSession
        ? allInspectionFlights.filter((f) => f.fieldSessionId === openSession.id)
        : [];
  const activeSessionFlight =
    openSessionFlights.find((f) => f.id === selectedFlightId) ??
    openSessionFlights.at(-1) ??
    null;

  const createFlight = useMutation({
    mutationFn: (payload: { flightLabel?: string | null; flightDate?: string | null }) =>
      fieldSessionApi.createFlight(inspectionId, openSession!.id, payload),
    onSuccess: (created) => {
      setSelectedFlightId(created.id);
      setAddFlightOpen(false);
      setNewFlightLabel('');
      void queryClient.invalidateQueries({ queryKey: fieldSessionKeys.forInspection(inspectionId) });
      void queryClient.invalidateQueries({ queryKey: fieldSessionKeys.flightsForInspection(inspectionId) });
    },
  });
  const latestSession = items.at(-1);
  const hasPermit = Boolean(inspection?.flightPermitFileName);
  const permitVerificationStatus = resolveFlightPermitVerificationStatus(inspection);
  const isPermitApproved = isFlightPermitVerified(inspection);
  const showPermitForm =
    inspection?.status === 'SCHEDULED' &&
    !isManagerOrAdmin &&
    (!hasPermit ||
      permitVerificationStatus === 'REJECTED' ||
      permitVerificationStatus === 'PENDING_REVIEW' ||
      replacePermitOpen);
  const canWithdrawAssignment =
    isInspector && workflowQuery.data?.canWithdrawAssignment === true;
  const windowEndMs = inspection?.plannedEndAt ? new Date(inspection.plannedEndAt).getTime() : Number.NaN;
  const isWindowExpired = Number.isFinite(windowEndMs) && windowEndMs < nowMs;
  const canStart =
    !openSession &&
    isPermitApproved &&
    (inspection?.status === 'SCHEDULED' || inspection?.status === 'FIELD_COMPLETED') &&
    !inspection?.reassignmentRequired &&
    !isWindowExpired &&
    !inspection?.findingsConfirmedAt;

  const permitNumber = permitNumberDraft ?? inspection?.flightPermitNumber ?? '';
  const issuingAuthority = issuingAuthorityDraft ?? inspection?.flightPermitAuthority ?? '';
  const permitValidFrom =
    permitValidFromDraft ??
    toDateTimeLocalValue(inspection?.flightPermitValidFrom ?? inspection?.plannedStartAt);
  const permitValidTo =
    permitValidToDraft ??
    toDateTimeLocalValue(inspection?.flightPermitValidTo ?? inspection?.plannedEndAt);
  const restrictedAirspace = getRestrictedAirspaceSummary(
    inspection?.assetLatitude,
    inspection?.assetLongitude,
  );
  const maxAltitudeValue =
    maxAltitudeDraft ??
    (inspection?.flightPermitMaxAltitudeM != null
      ? String(inspection.flightPermitMaxAltitudeM)
      : restrictedAirspace?.maxAltitudeMetersAgl != null
        ? String(restrictedAirspace.maxAltitudeMetersAgl)
        : '');
  const submitPermitUpload = (payload: {
    file: File;
    permitNumber: string;
    issuingAuthority: string;
    validFrom: string;
    validTo: string;
    maxAltitudeM?: number | null | undefined;
  }) => {
    uploadPermit.mutate(payload, {
      onSuccess: () => {
        setPermitFile(null);
        setReplacePermitOpen(false);
        setPendingPermitReplacePayload(null);
      },
    });
  };

  const canContinueToEvidence =
    !openSession &&
    (inspection?.status === 'FIELD_COMPLETED' ||
      latestSession?.status === 'FIELD_COMPLETED');

  const handleOpenStart = () => {
    setPreFlightChecked([]);
    setPreFlightNote('');
    setStartOpen(true);
  };

  const openOutcomeDialog = (
    session: FieldSession,
    kind: 'abort' | 'complete',
  ) => {
    setPostFlightChecked([]);
    setAbortCategory(null);
    setOutcomeReason('');
    setOutcomeTarget({ session, kind });
  };

  const togglePreFlightItem = (item: string) => {
    setPreFlightChecked((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item],
    );
  };

  const togglePostFlightItem = (item: string) => {
    setPostFlightChecked((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item],
    );
  };

  const toggleInspectedAssetItem = (item: string) => {
    setInspectedAssetItems((prev) => {
      const next = prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item];
      try {
        if (inspectionId) {
          sessionStorage.setItem(`sdi_inspected_items_${inspectionId}`, JSON.stringify(next));
        }
      } catch {
        // ignore
      }
      return next;
    });
  };

  const updateInspectedAssetItems = (next: string[]) => {
    setInspectedAssetItems(next);
    try {
      if (inspectionId) {
        sessionStorage.setItem(`sdi_inspected_items_${inspectionId}`, JSON.stringify(next));
      }
    } catch {
      // ignore
    }
  };

  const sessionTelemetryQuery = useQuery({
    queryKey: ['smartdronehub', 'telemetry', inspectionId, openSession?.id],
    queryFn: () => smartDroneHubApi.telemetry(inspectionId, openSession!.id),
    enabled: Boolean(inspectionId && openSession?.id && stage === 'post-flight'),
    retry: false,
  });

  const resolvedTelemetry = liveTelemetry ?? sessionTelemetryQuery.data ?? null;

  const liveHasFlown = Boolean(
    resolvedTelemetry &&
      resolvedTelemetry.connected &&
      ((resolvedTelemetry.distanceFlownMeters ?? 0) > 0 ||
        (resolvedTelemetry.altitudeMeters ?? 0) > 0.5 ||
        resolvedTelemetry.missionState === 'IN_FLIGHT' ||
        resolvedTelemetry.missionState === 'RETURNING' ||
        resolvedTelemetry.missionState === 'LANDED'),
  );
  if (liveHasFlown && openSession?.id && typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.setItem(`sdi_has_flown_${openSession.id}`, 'true');
    } catch {
      // ignore
    }
  }
  useEffect(() => {
    if (liveHasFlown && openSession?.id) {
      window.dispatchEvent(new Event('sdi-flight-session-updated'));
    }
  }, [liveHasFlown, openSession?.id]);
  const hasFlightReport = Boolean(
    openSession?.hasFlightReport || openSessionFlights.some((f) => f.hasFlightReport),
  );
  const hasFlown = liveHasFlown || Boolean(
    openSession?.id &&
      typeof sessionStorage !== 'undefined' &&
      sessionStorage.getItem(`sdi_has_flown_${openSession.id}`) === 'true',
  );
  const hasFlightRecord = hasFlown || hasFlightReport || flightCompletedOnStep;
  const canProceedToPostFlight = hasFlightRecord;

  const parseOptionalNum = (val: string): number | null => {
    const num = Number(val.trim());
    return val.trim() !== '' && Number.isFinite(num) ? num : null;
  };

  const buildPreFlightConditions = (): PreFlightConditions | null => {
    const cond: PreFlightConditions = {
      windSpeedMs: parseOptionalNum(windSpeedInput),
      minBatteryPercent: parseOptionalNum(minBatteryInput),
      gpsSatellites: parseOptionalNum(gpsSatsInput),
      rthAltitudeMeters: parseOptionalNum(rthAltInput),
      weatherSummary: weatherSummaryInput.trim() || null,
    };
    const hasAny =
      cond.windSpeedMs != null ||
      cond.minBatteryPercent != null ||
      cond.gpsSatellites != null ||
      cond.rthAltitudeMeters != null ||
      Boolean(cond.weatherSummary);
    return hasAny ? cond : null;
  };

  const buildChecklistSnapshot = (
    specs: readonly ChecklistSpecItem[],
    checkedLabels: readonly string[],
  ): ChecklistItemSnapshot[] =>
    specs.map((spec) => ({
      code: spec.code,
      category: spec.category,
      label: t(spec.label),
      details: spec.details,
      referenceThreshold: spec.referenceThreshold,
      safetyCritical: spec.safetyCritical,
      required: spec.required,
      checked: checkedLabels.includes(spec.label),
    }));

  const allPreFlightChecked =
    preFlightItems.length > 0 && preFlightChecked.length === preFlightItems.length;
  const allRequiredPreFlightChecked =
    requiredPreFlightItems.length > 0
      ? requiredPreFlightItems.every((item) => preFlightChecked.includes(item.label))
      : allPreFlightChecked;
  const canSubmitPreFlight =
    allRequiredPreFlightChecked || Boolean(preFlightNote.trim());

  const allPostFlightChecked =
    postFlightItems.length > 0 && postFlightChecked.length === postFlightItems.length;
  const allRequiredPostFlightChecked =
    requiredPostFlightItems.every((item) => postFlightChecked.includes(item.label));
  const allAssetItemsChecked =
    assetInspectionItems.length === 0 ||
    inspectedAssetItems.length === assetInspectionItems.length;
  const uninspectedAssetItems = assetInspectionItems.filter(
    (item) => !inspectedAssetItems.includes(item),
  );
  const hasIncompleteRequiredChecks = !allRequiredPostFlightChecked || !allAssetItemsChecked;
  const requiresCompletionExplanation =
    outcomeTarget?.kind === 'complete' && hasIncompleteRequiredChecks;
  const canSubmitOutcome =
    outcomeTarget?.kind === 'complete'
      ? !hasIncompleteRequiredChecks || Boolean(outcomeReason.trim())
      : Boolean(outcomeReason.trim());

  const buildPreFlightPayload = () => {
    const checkedSummary = preFlightChecked.map((item) => `[✓] ${t(item)}`).join(' · ');
    const note = preFlightNote.trim();
    if (checkedSummary && note) return `${checkedSummary} — ${note}`;
    return note || checkedSummary;
  };

  const handleStartNow = (mode: 'inline' | 'modal') => {
    const payload =
      buildPreFlightPayload() ||
      preFlightSpecItems
        .filter((item) => item.required)
        .map((item) => `[✓] ${t(item.label)}`)
        .join(' · ') ||
      'Immediate start verified';
    const checkedForStartNow =
      preFlightChecked.length > 0
        ? preFlightChecked
        : preFlightSpecItems.filter((item) => item.required).map((item) => item.label);
    const snapshot = buildChecklistSnapshot(preFlightSpecItems, checkedForStartNow);
    const conditions = buildPreFlightConditions();
    startSession.mutate(
      {
        preFlightChecklistNote: payload,
        startNow: true,
        sessionDate: sessionDateInput || null,
        preFlightChecklistSnapshot: snapshot,
        preFlightConditions: conditions,
      },
      {
        onSuccess: () => {
          setAdditionalSessionMode(false);
          if (searchParams.get('newSession') === '1') {
            const next = new URLSearchParams(searchParams);
            next.delete('newSession');
            setSearchParams(next, { replace: true });
          }
          if (mode === 'modal') {
            setStartOpen(false);
          } else {
            navigate('../field-session');
          }
          setPreFlightChecked([]);
          setPreFlightNote('');
        },
      },
    );
  };

  const renderHiddenStartNowTrigger = (
    mode: 'inline' | 'modal',
    testId: string,
  ) => (
    <Tooltip title={t('Start now')} enterDelay={300}>
      <span>
        <IconButton
          size="small"
          aria-label={t('Start now')}
          data-testid={testId}
          tabIndex={-1}
          disabled={!canStart || startSession.isPending}
          onClick={() => handleStartNow(mode)}
          sx={{
            width: 22,
            height: 22,
            p: 0,
            opacity: 0.14,
            transition: 'opacity 160ms ease, transform 160ms ease',
            '&:hover, &:focus-visible': {
              opacity: 0.95,
              transform: 'scale(1.15)',
              bgcolor: 'rgba(16, 185, 129, 0.14)',
            },
          }}
        >
          <Box
            sx={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              bgcolor: '#10B981',
            }}
          />
        </IconButton>
      </span>
    </Tooltip>
  );

  const buildCompleteOutcomePayload = () => {
    const postChecks = postFlightChecked.map((item) => `[✓] ${t(item)}`);
    const assetChecks = inspectedAssetItems.map(
      (item) => `[✓] ${t('Inspected')}: ${item}`,
    );
    const assetSkipped =
      postFlightChecked.length > 0 || inspectedAssetItems.length > 0
        ? uninspectedAssetItems.map((item) => `[!] ${t('Skipped')}: ${item}`)
        : [];
    const checkedSummary = [...postChecks, ...assetChecks, ...assetSkipped].join(' · ');
    const note = outcomeReason.trim();
    if (checkedSummary && note) return `${checkedSummary} — ${note}`;
    return note || checkedSummary || t('Field session completed');
  };

  const buildOutcomePayload = () => {
    if (outcomeTarget?.kind !== 'complete') {
      return outcomeReason.trim();
    }
    return buildCompleteOutcomePayload();
  };

  const showPreFlightStage = stage === 'pre-flight';
  const showFlightStage = !stage || stage === 'flight';
  const showPostFlightStage = stage === 'post-flight';
  const withdrawAction = canWithdrawAssignment ? (
    <Button
      color="inherit"
      disabled={uploadPermit.isPending}
      onClick={() => {
        withdrawAssignment.reset();
        setWithdrawReason('');
        setWithdrawAssignmentOpen(true);
      }}
      sx={{ alignSelf: 'flex-start', mr: { sm: 'auto' }, minHeight: 44, textTransform: 'none' }}
    >
      {t('Withdraw from assignment')}
    </Button>
  ) : null;

  return (
    <Box className="workspace-page workspace-page--inspections trace-ledger-workspace">
      <Stack spacing={2}>
        {isReinspection && showFlightStage && (
          <TargetFlightShotList
            mode="flight-guidance"
            inspectionId={inspectionId}
            sourceInspectionId={inspection?.sourceInspectionId}
            items={verifications?.data ?? []}
          />
        )}

        {showPermitSection && (
        <QueryState
          isLoading={inspectionQuery.isLoading}
          error={inspectionQuery.error}
          onRetry={() => void inspectionQuery.refetch()}
          loadingLabel={t('Loading inspection…')}
        >
          {inspection && (hasPermit || inspection.status === 'SCHEDULED' || stage === 'permit') ? (
            <Paper
              className="trace-stage-panel"
              variant="outlined"
              sx={{
                p: stage === 'permit' ? { xs: 2.5, sm: 3.5 } : { xs: 2, sm: 2.5 },
                borderRadius: '12px',
                bgcolor: 'background.paper',
              }}
            >
              <Stack spacing={stage === 'permit' ? 2.5 : 2}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1.5}
                  sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
                >
                  <Box>
                    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                      <Typography variant="subtitle1" sx={{ fontSize: '1.0625rem', fontWeight: 600, color: 'text.primary' }}>
                        {t('Flight permit')}
                      </Typography>
                    </Stack>
                    {!stage && inspection.assetName && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        {inspection.assetName}
                      </Typography>
                    )}
                  </Box>

                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
                    {hasPermit && (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<VisibilityOutlined fontSize="small" />}
                        onClick={() => setPermitPreviewOpen(true)}
                        sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
                      >
                        {t('View permit document')}
                      </Button>
                    )}

                    {inspection.status === 'SCHEDULED' &&
                      !isManagerOrAdmin &&
                      hasPermit &&
                      permitVerificationStatus !== 'REJECTED' && (
                        <Button
                          size="small"
                          variant={replacePermitOpen ? 'text' : 'outlined'}
                          color={replacePermitOpen ? 'inherit' : isPermitApproved ? 'warning' : 'primary'}
                          onClick={() => {
                            setReplacePermitOpen((prev) => !prev);
                            setPermitFile(null);
                            setPermitFormError(null);
                            setPendingPermitReplacePayload(null);
                          }}
                          sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
                        >
                          {replacePermitOpen ? t('Cancel replace') : t('Replace permit')}
                        </Button>
                      )}
                  </Stack>
                </Stack>

                <RestrictedAirspaceAlert
                  role={isManagerOrAdmin ? 'MANAGER' : 'INSPECTOR'}
                  latitude={inspection.assetLatitude}
                  longitude={inspection.assetLongitude}
                  sx={{ borderRadius: '10px' }}
                />

                <FlightPermitVerificationPanel
                  inspection={inspection}
                  onPreviewPermit={() => setPermitPreviewOpen(true)}
                  compact
                  showAirspace
                  hideHeader
                  hideEmptyNotice
                />

                {inspection.status !== 'SCHEDULED' && stage === 'permit' && (
                  <Alert severity="info" sx={{ borderRadius: '10px' }}>
                    {t('Permit uploads are locked because this inspection is no longer SCHEDULED.')}
                  </Alert>
                )}

                {showPermitForm ? (
                  <Stack spacing={2}>
                    {replacePermitOpen && isPermitApproved && (
                      <Alert severity="warning" sx={{ borderRadius: '10px' }}>
                        {t(
                          'Replacing the permit records the new document immediately; you remain responsible for its validity.',
                        )}
                      </Alert>
                    )}
                    <Box
                      onDragOver={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        const droppedFile = event.dataTransfer.files?.[0];
                        if (droppedFile) {
                          const err = validatePermitFileSelection(droppedFile, t);
                          setPermitFormError(err);
                          setPermitFile(err ? null : droppedFile);
                        }
                      }}
                      sx={{
                        minHeight: stage === 'permit' ? 190 : 150,
                        p: { xs: 2.5, sm: 3.5 },
                        borderRadius: '12px',
                        border: '2px dashed',
                        borderColor: permitFile ? 'primary.main' : 'divider',
                        bgcolor: permitFile ? 'rgba(43, 132, 235, 0.04)' : 'background.default',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        gap: 1.5,
                        transition: 'border-color 160ms ease, background-color 160ms ease',
                        '&:hover': {
                          borderColor: 'primary.main',
                          bgcolor: 'rgba(43, 132, 235, 0.025)',
                        },
                      }}
                    >
                      <Box
                        sx={{
                          width: 50,
                          height: 50,
                          borderRadius: '12px',
                          bgcolor: '#EFF3FF',
                          color: '#2B84EB',
                          display: 'grid',
                          placeItems: 'center',
                        }}
                      >
                        <UploadFileRounded sx={{ fontSize: 26 }} />
                      </Box>

                      <Box sx={{ maxWidth: 520 }}>
                        <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600, color: 'text.primary' }}>
                          {permitFile
                            ? permitFile.name
                            : hasPermit
                              ? t('Replace flight permit document')
                              : t('Drag and drop flight permit file here, or click to browse')}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          {t('PDF, PNG, JPG, WEBP · Max 25 MB')}
                        </Typography>
                      </Box>

                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1.25}
                        sx={{ alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Button
                          component="label"
                          variant="outlined"
                          size="medium"
                          startIcon={<UploadFileRounded />}
                          sx={{
                            borderRadius: '8px',
                            px: 2.5,
                            py: 1,
                            fontWeight: 600,
                            bgcolor: 'background.paper',
                            maxWidth: '100%',
                          }}
                        >
                          <Box
                            component="span"
                            sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          >
                            {permitFile
                              ? t('Choose another file')
                              : hasPermit
                                ? t('Choose replacement permit file')
                                : t('Choose permit file')}
                          </Box>
                          <input
                            aria-label={t('Choose permit file')}
                            type="file"
                            hidden
                            accept=".pdf,image/png,image/jpeg,image/webp"
                            onChange={(event) => {
                              const selected = event.target.files?.[0] ?? null;
                              if (!selected) {
                                setPermitFile(null);
                                return;
                              }
                              const err = validatePermitFileSelection(selected, t);
                              setPermitFormError(err);
                              setPermitFile(err ? null : selected);
                            }}
                          />
                        </Button>

                        {permitFile && (
                          <Button
                            variant="outlined"
                            size="medium"
                            startIcon={<VisibilityOutlined />}
                            onClick={() => setPermitPreviewOpen(true)}
                            sx={{
                              borderRadius: '8px',
                              px: 2,
                              py: 1,
                              textTransform: 'none',
                              fontWeight: 600,
                              bgcolor: 'background.paper',
                            }}
                          >
                            {t('Preview file')}
                          </Button>
                        )}
                      </Stack>
                    </Box>

                    <Grid container spacing={1.5}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          required
                          fullWidth
                          size="small"
                          label={t('Permit number')}
                          placeholder="e.g. 184/GP-TC"
                          value={permitNumber}
                          onChange={(e) => {
                            setPermitNumber(e.target.value);
                            setPermitFormError(null);
                          }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          required
                          fullWidth
                          size="small"
                          label={t('Issuing authority')}
                          placeholder="e.g. Cục Tác chiến - Bộ Tổng Tham mưu"
                          value={issuingAuthority}
                          onChange={(e) => {
                            setIssuingAuthority(e.target.value);
                            setPermitFormError(null);
                          }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          required
                          fullWidth
                          size="small"
                          type="datetime-local"
                          label={t('Valid from')}
                          slotProps={{ inputLabel: { shrink: true } }}
                          value={permitValidFrom}
                          onChange={(e) => {
                            setPermitValidFrom(e.target.value);
                            setPermitFormError(null);
                          }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          required
                          fullWidth
                          size="small"
                          type="datetime-local"
                          label={t('Valid to')}
                          slotProps={{ inputLabel: { shrink: true } }}
                          value={permitValidTo}
                          onChange={(e) => {
                            setPermitValidTo(e.target.value);
                            setPermitFormError(null);
                          }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          required={Boolean(restrictedAirspace)}
                          fullWidth
                          size="small"
                          type="number"
                          label={t('Max altitude (m)')}
                          slotProps={{ htmlInput: { min: 1, max: 2000, step: 1 } }}
                          placeholder={
                            restrictedAirspace
                              ? String(restrictedAirspace.maxAltitudeMetersAgl)
                              : '120'
                          }
                          helperText={
                            restrictedAirspace
                              ? tr(
                                  `Trần vùng hạn chế ${restrictedAirspace.zoneCode}: tối đa ${restrictedAirspace.maxAltitudeMetersAgl} m AGL`,
                                  `${restrictedAirspace.zoneCode} restricted ceiling: max ${restrictedAirspace.maxAltitudeMetersAgl} m AGL`,
                                )
                              : tr(
                                  'Độ cao tối đa được cấp phép (tùy chọn, 1–2000 m)',
                                  'Approved max altitude in meters AGL (optional, 1–2000 m)',
                                )
                          }
                          value={maxAltitudeValue}
                          onChange={(e) => {
                            setMaxAltitudeDraft(e.target.value);
                            setPermitFormError(null);
                          }}
                        />
                      </Grid>
                    </Grid>

                    {permitFormError && (
                      <Alert severity="error" sx={{ borderRadius: '10px' }}>
                        {permitFormError}
                      </Alert>
                    )}

                    <MutationProblemAlert
                      error={uploadPermit.error}
                      isError={uploadPermit.isError}
                      fallbackMessage={t('Could not upload flight permit.')}
                    />

                    <Stack
                      direction={{ xs: 'column', sm: 'row-reverse' }}
                      spacing={1.5}
                      useFlexGap
                    >
                      <LoadingButton
                        variant="contained"
                        size="medium"
                        disabled={!permitFile}
                        loading={uploadPermit.isPending}
                        onClick={() => {
                          if (!permitFile) return;
                          const fileError = validatePermitFileSelection(permitFile, t);
                          if (fileError) {
                            setPermitFormError(fileError);
                            return;
                          }
                          const trimmedNum = permitNumber.trim();
                          const trimmedAuth = issuingAuthority.trim();
                          if (!trimmedNum || !trimmedAuth || !permitValidFrom || !permitValidTo) {
                            setPermitFormError(
                              t('Fill in permit number, issuing authority, valid from, and valid to before submitting.'),
                            );
                            return;
                          }
                          const fromDate = new Date(permitValidFrom);
                          const toDate = new Date(permitValidTo);
                          if (
                            Number.isNaN(fromDate.getTime()) ||
                            Number.isNaN(toDate.getTime()) ||
                            toDate.getTime() <= fromDate.getTime()
                          ) {
                            setPermitFormError(t('Permit valid-to timestamp must be after valid-from.'));
                            return;
                          }
                          if (toDate.getTime() <= Date.now()) {
                            setPermitFormError(t('Permit valid-to timestamp has already expired.'));
                            return;
                          }
                          if (inspection.plannedStartAt) {
                            const plannedStart = new Date(inspection.plannedStartAt).getTime();
                            if (fromDate.getTime() > plannedStart) {
                              setPermitFormError(
                                t('Permit valid-from must start on or before the planned inspection start time.'),
                              );
                              return;
                            }
                          }
                          if (inspection.plannedEndAt) {
                            const plannedEnd = new Date(inspection.plannedEndAt).getTime();
                            if (toDate.getTime() < plannedEnd) {
                              setPermitFormError(
                                t('Permit valid-to must cover the entire planned inspection end time.'),
                              );
                              return;
                            }
                          }
                          let parsedMaxAltitude: number | null = null;
                          const trimmedMaxAlt = maxAltitudeValue.trim();
                          if (restrictedAirspace && !trimmedMaxAlt) {
                            setPermitFormError(
                              tr(
                                `Vui lòng nhập độ cao tối đa được cấp phép (tối đa ${restrictedAirspace.maxAltitudeMetersAgl} m AGL) cho vùng hạn chế.`,
                                `Enter the approved max altitude (up to ${restrictedAirspace.maxAltitudeMetersAgl} m AGL) for this restricted airspace zone.`,
                              ),
                            );
                            return;
                          }
                          if (trimmedMaxAlt) {
                            const altNum = Number(trimmedMaxAlt);
                            if (!Number.isInteger(altNum) || altNum < 1 || altNum > 2000) {
                              setPermitFormError(
                                t('Max altitude must be a whole number between 1 and 2000 meters.'),
                              );
                              return;
                            }
                            if (
                              restrictedAirspace &&
                              altNum > restrictedAirspace.maxAltitudeMetersAgl
                            ) {
                              setPermitFormError(
                                tr(
                                  `Độ cao giấy phép (${altNum} m) vượt trần vùng hạn chế (${restrictedAirspace.maxAltitudeMetersAgl} m AGL).`,
                                  `Permit max altitude (${altNum} m) exceeds the restricted airspace ceiling (${restrictedAirspace.maxAltitudeMetersAgl} m AGL).`,
                                ),
                              );
                              return;
                            }
                            parsedMaxAltitude = altNum;
                          }

                          setPermitFormError(null);
                          const payload = {
                            file: permitFile,
                            permitNumber: trimmedNum,
                            issuingAuthority: trimmedAuth,
                            validFrom: fromDate.toISOString(),
                            validTo: toDate.toISOString(),
                            maxAltitudeM: parsedMaxAltitude,
                          };
                          if (isPermitApproved) {
                            setPendingPermitReplacePayload(payload);
                            return;
                          }
                          submitPermitUpload(payload);
                        }}
                        sx={{
                          borderRadius: '8px',
                          px: 2.75,
                          py: 1,
                          fontWeight: 600,
                        }}
                      >
                        {t('Save flight permit')}
                      </LoadingButton>
                      {withdrawAction}
                    </Stack>
                  </Stack>
                ) : withdrawAction}
              </Stack>
            </Paper>
          ) : inspection && inspection.status !== 'SCHEDULED' && !hasPermit ? (
            <Alert severity="warning" sx={{ borderRadius: '10px' }}>
              {t('No flight document is recorded. Contact the inspection manager before starting field work.')}
            </Alert>
          ) : null}
          {withdrawAssignmentOpen && (
            <Dialog
              open
              onClose={() => !withdrawAssignment.isPending && setWithdrawAssignmentOpen(false)}
              aria-labelledby="withdraw-assignment-title"
              aria-describedby="withdraw-assignment-description"
              maxWidth="xs"
              fullWidth
            >
              <DialogTitle id="withdraw-assignment-title" sx={{ fontWeight: 700 }}>
                {t('Withdraw from assignment?')}
              </DialogTitle>
              <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                  <Typography id="withdraw-assignment-description" variant="body2" color="text.secondary">
                    {t('The Manager will receive your reason and can reschedule or reassign this inspection.')}
                  </Typography>
                  <TextField
                    label={t('Reason for withdrawing')}
                    multiline
                    minRows={3}
                    required
                    disabled={withdrawAssignment.isPending}
                    value={withdrawReason}
                    onChange={(event) => setWithdrawReason(event.target.value)}
                    slotProps={{ htmlInput: { maxLength: 2000 } }}
                  />
                  <MutationProblemAlert
                    error={withdrawAssignment.error}
                    isError={withdrawAssignment.isError}
                    fallbackMessage={t('Could not withdraw from the assignment.')}
                  />
                </Stack>
              </DialogContent>
              <DialogActions sx={{ px: 3, pb: 2.5 }}>
                <Button
                  onClick={() => setWithdrawAssignmentOpen(false)}
                  disabled={withdrawAssignment.isPending}
                >
                  {t('Go back')}
                </Button>
                <LoadingButton
                  variant="contained"
                  color="error"
                  loading={withdrawAssignment.isPending}
                  disabled={!canWithdrawAssignment || !withdrawReason.trim()}
                  onClick={() => {
                    withdrawAssignment.mutate(withdrawReason.trim(), {
                      onSuccess: () => {
                        navigate(getSectionPath('operations', 'inspections'), { replace: true });
                      },
                    });
                  }}
                >
                  {t('Confirm withdrawal')}
                </LoadingButton>
              </DialogActions>
            </Dialog>
          )}
          {inspection && stage === 'permit' && isPermitApproved && (
            <Box sx={{ mt: 2 }}>
              <StepActionBar
                primaryAction={
                  <Button
                    component={RouterLink}
                    to="../pre-flight"
                    variant="contained"
                    size="medium"
                    endIcon={<ArrowForwardRounded fontSize="small" />}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 600,
                      borderRadius: '8px',
                      px: 2.5,
                      py: 1,
                    }}
                  >
                    {t('Continue to Pre-flight Check')}
                  </Button>
                }
              />
            </Box>
          )}
          {inspection && (hasPermit || permitFile) && (
            <FlightPermitPreviewDialog
              open={permitPreviewOpen}
              onClose={() => setPermitPreviewOpen(false)}
              inspectionId={inspectionId}
              fileName={permitFile?.name ?? inspection.flightPermitFileName}
              uploadedAt={inspection.flightPermitUploadedAt}
              assetName={inspection.assetName}
              droneSummary={
                [inspection.droneModel, inspection.droneSerialNumber].filter(Boolean).join(' · ') ||
                null
              }
              localFile={permitFile}
              permitNumber={inspection.flightPermitNumber}
              issuingAuthority={inspection.flightPermitAuthority}
              validFrom={inspection.flightPermitValidFrom}
              validTo={inspection.flightPermitValidTo}
              verificationStatus={permitVerificationStatus}
              fileSha256={inspection.flightPermitFileSha256}
            />
          )}
          <ConfirmDialog
            open={Boolean(pendingPermitReplacePayload)}
            severity="warning"
            title={t('Replace approved flight permit?')}
            message={t(
              'Replacing this approved permit will revoke the current Manager approval and lock pre-flight checks until the new permit is verified again.',
            )}
            confirmLabel={t('Replace & resubmit')}
            cancelLabel={t('Cancel')}
            loading={uploadPermit.isPending}
            onCancel={() => setPendingPermitReplacePayload(null)}
            onConfirm={() => {
              if (pendingPermitReplacePayload) {
                submitPermitUpload(pendingPermitReplacePayload);
              }
            }}
          />
        </QueryState>
        )}

        {showPreFlightStage && (
          <QueryState
            isLoading={inspectionQuery.isLoading || sessions.isLoading}
            error={inspectionQuery.error ?? sessions.error}
            onRetry={() => {
              void inspectionQuery.refetch();
              void sessions.refetch();
            }}
            loadingLabel={t('Loading pre-flight checklist…')}
          >
            {inspection && (() => {
              const recordedNote = (openSession ?? latestSession)?.preFlightChecklistNote ?? '';
              const parsedPreFlight = parseChecklistNote(recordedNote);
              const isCompletedPreFlight =
                !additionalSessionMode && Boolean(openSession || canContinueToEvidence);
              const checkedCount = isCompletedPreFlight
                ? preFlightSpecItems.length
                : preFlightSpecItems.filter((item) => preFlightChecked.includes(item.label)).length;

              return (
                <>
                <Paper
                  className="trace-stage-panel"
                  variant="outlined"
                  sx={{
                    p: { xs: 2.5, sm: 3.5 },
                    borderRadius: '12px',
                    bgcolor: 'background.paper',
                  }}
                >
                  <Stack spacing={3}>
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={2}
                      sx={{
                        alignItems: { sm: 'center' },
                        justifyContent: 'space-between',
                        pb: 2,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Stack direction="row" spacing={1.75} sx={{ alignItems: 'center' }}>
                        <Box
                          sx={{
                            width: 44,
                            height: 44,
                            borderRadius: '10px',
                            bgcolor: isCompletedPreFlight ? 'rgba(22, 163, 74, 0.12)' : '#EFF3FF',
                            color: isCompletedPreFlight ? '#16A34A' : '#2B84EB',
                            display: 'grid',
                            placeItems: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <CheckCircleRounded sx={{ fontSize: 22 }} />
                        </Box>
                        <Box>
                          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                            <Typography variant="subtitle1" sx={{ fontSize: '1.0625rem', fontWeight: 600, lineHeight: 1.25 }}>
                              {isCompletedPreFlight
                                ? t('Pre-flight checklist completed')
                                : t('Pre-flight safety checklist')}
                            </Typography>
                            <Chip
                              size="small"
                              label={`${checkedCount}/${preFlightSpecItems.length} ${t('verified')}`}
                              color={isCompletedPreFlight ? 'success' : 'default'}
                              variant="outlined"
                            />
                          </Stack>
                          {(openSession ?? latestSession)?.startedAt && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                              {formatDateTime(new Date((openSession ?? latestSession)!.startedAt!))}
                            </Typography>
                          )}
                        </Box>
                      </Stack>

                      {!isCompletedPreFlight && (
                        <Button
                          size="medium"
                          variant="outlined"
                          onClick={() =>
                            setPreFlightChecked(
                              allPreFlightChecked ? [] : [...preFlightItems],
                            )
                          }
                          sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            borderRadius: '8px',
                            px: 2,
                            py: 0.875,
                            flexShrink: 0,
                          }}
                        >
                          {allPreFlightChecked ? t('Clear all') : t('Check all')}
                        </Button>
                      )}
                      {isCompletedPreFlight && canContinueToEvidence && canStart && (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<AddRounded />}
                          onClick={() => {
                            setPreFlightChecked([]);
                            setPreFlightNote('');
                            setAdditionalSessionMode(true);
                          }}
                          sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px', flexShrink: 0 }}
                        >
                          {tr('Mở ngày bay mới', 'Start new day / session')}
                        </Button>
                      )}
                    </Stack>

                    {!isCompletedPreFlight && inspection.reassignmentRequired && (
                      <Alert severity="error">
                        {t('This inspection was declined and requires Manager reassignment before starting a field session.')}
                        {inspection.declineReason ? ` (${t('Reason')}: ${inspection.declineReason})` : ''}
                      </Alert>
                    )}

                    {!isCompletedPreFlight && !hasPermit && (
                      <Alert
                        severity="warning"
                        action={
                          <Button
                            component={RouterLink}
                            to="../permit"
                            color="inherit"
                            size="small"
                          >
                            {t('Upload permit')}
                          </Button>
                        }
                      >
                        {t('Record the mission flight document in Step 1 before starting the session.')}
                      </Alert>
                    )}

                    {!isCompletedPreFlight && hasPermit && !isPermitApproved && (
                      <Alert
                        severity={permitVerificationStatus === 'REJECTED' ? 'error' : 'warning'}
                        action={
                          <Button
                            component={RouterLink}
                            to="../permit"
                            color="inherit"
                            size="small"
                            sx={{ whiteSpace: 'nowrap' }}
                          >
                            {t('View permit')}
                          </Button>
                        }
                      >
                        {permitVerificationStatus === 'REJECTED'
                          ? t('Flight permit was rejected by the Manager. Upload a replacement permit in Step 1 before starting the session.')
                          : t('Flight permit is pending Manager verification. You can prepare the checklist below, and session start will unlock once the permit is approved.')}
                      </Alert>
                    )}

                    {(() => {
                      const renderSpecGrid = (items: readonly ChecklistSpecItem[]) => (
                        <Box
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
                            gap: 1.5,
                          }}
                        >
                          {items.map((spec) => {
                            const checked = isCompletedPreFlight || preFlightChecked.includes(spec.label);
                            return (
                              <Box
                                key={spec.code}
                                role={isCompletedPreFlight ? undefined : 'checkbox'}
                                aria-checked={isCompletedPreFlight ? undefined : checked}
                                tabIndex={isCompletedPreFlight ? undefined : 0}
                                onClick={
                                  isCompletedPreFlight
                                    ? undefined
                                    : () => togglePreFlightItem(spec.label)
                                }
                                onKeyDown={
                                  isCompletedPreFlight
                                    ? undefined
                                    : (e) => {
                                        if (e.key === ' ' || e.key === 'Enter') {
                                          e.preventDefault();
                                          togglePreFlightItem(spec.label);
                                        }
                                      }
                                }
                                sx={{
                                  minHeight: 68,
                                  px: 2,
                                  py: 1.5,
                                  borderRadius: '10px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 1.5,
                                  border: '1px solid',
                                  borderColor: checked ? 'rgba(22, 163, 74, 0.35)' : 'divider',
                                  bgcolor: 'background.paper',
                                  cursor: isCompletedPreFlight ? 'default' : 'pointer',
                                  transition: 'all 140ms ease',
                                  '&:hover': isCompletedPreFlight
                                    ? undefined
                                    : { borderColor: '#16A34A', bgcolor: 'action.hover' },
                                  '&:focus-visible': {
                                    outline: '2px solid',
                                    outlineColor: 'primary.main',
                                    outlineOffset: 2,
                                  },
                                }}
                              >
                                <CircleSign state={checked ? 'checked' : 'unchecked'} />
                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.25 }}>
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        color: checked ? '#16A34A' : 'text.secondary',
                                      }}
                                    >
                                      {spec.code}
                                    </Typography>
                                    {spec.referenceThreshold && (
                                      <Typography
                                        variant="caption"
                                        sx={{
                                          fontSize: '0.75rem',
                                          fontWeight: 500,
                                          color: 'text.secondary',
                                        }}
                                      >
                                        · {spec.referenceThreshold}
                                      </Typography>
                                    )}
                                    {!spec.required && (
                                      <Typography
                                        variant="caption"
                                        sx={{
                                          fontSize: '0.6875rem',
                                          fontWeight: 500,
                                          color: 'text.secondary',
                                        }}
                                      >
                                        • {t('Optional')}
                                      </Typography>
                                    )}
                                  </Stack>
                                  <Typography
                                    variant="body2"
                                    sx={{ fontSize: '0.9375rem', fontWeight: 500, lineHeight: 1.4, color: 'text.primary' }}
                                  >
                                    {t(spec.label)}
                                  </Typography>
                                </Box>
                              </Box>
                            );
                          })}
                        </Box>
                      );

                      if (requiredPreFlightItems.length > 0 && optionalPreFlightItems.length > 0) {
                        const checkedRequiredCount = isCompletedPreFlight
                          ? requiredPreFlightItems.length
                          : requiredPreFlightItems.filter((item) =>
                              preFlightChecked.includes(item.label),
                            ).length;
                        const checkedOptionalCount = isCompletedPreFlight
                          ? optionalPreFlightItems.length
                          : optionalPreFlightItems.filter((item) =>
                              preFlightChecked.includes(item.label),
                            ).length;

                        return (
                          <Stack spacing={2.5}>
                            <Box>
                              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.25 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                  {t('Required checks')}
                                </Typography>
                                <Chip
                                  size="small"
                                  label={`${checkedRequiredCount}/${requiredPreFlightItems.length}`}
                                  color={checkedRequiredCount === requiredPreFlightItems.length ? 'success' : 'default'}
                                  variant="outlined"
                                />
                              </Stack>
                              {renderSpecGrid(requiredPreFlightItems)}
                            </Box>
                            <Box>
                              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.25 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                                  {t('Optional checks')}
                                </Typography>
                                <Chip
                                  size="small"
                                  label={`${checkedOptionalCount}/${optionalPreFlightItems.length}`}
                                  variant="outlined"
                                />
                              </Stack>
                              {renderSpecGrid(optionalPreFlightItems)}
                            </Box>
                          </Stack>
                        );
                      }

                      return renderSpecGrid(preFlightSpecItems);
                    })()}

                    {isCompletedPreFlight ? (
                      parsedPreFlight.remark && (
                        <Box
                          sx={{
                            pt: 1.5,
                            borderTop: '1px dashed',
                            borderColor: 'divider',
                          }}
                        >
                          <Typography variant="body2" color="text.secondary">
                            {parsedPreFlight.remark}
                          </Typography>
                        </Box>
                      )
                    ) : (
                      <form
                        id="pre-flight-form"
                        onSubmit={(event) => {
                          event.preventDefault();
                          const payload = buildPreFlightPayload();
                          if (!payload) return;
                          startSession.mutate(
                            {
                              preFlightChecklistNote: payload,
                              sessionDate: sessionDateInput || null,
                              preFlightChecklistSnapshot: buildChecklistSnapshot(
                                preFlightSpecItems,
                                preFlightChecked,
                              ),
                              preFlightConditions: buildPreFlightConditions(),
                            },
                            {
                              onSuccess: () => {
                                setAdditionalSessionMode(false);
                                if (searchParams.get('newSession') === '1') {
                                  const next = new URLSearchParams(searchParams);
                                  next.delete('newSession');
                                  setSearchParams(next, { replace: true });
                                }
                                setPreFlightChecked([]);
                                setPreFlightNote('');
                                navigate('../field-session');
                              },
                            },
                          );
                        }}
                      >
                        <Stack spacing={1.5}>
                          <TextField
                            label={t('Pre-flight note')}
                            size="small"
                            multiline
                            minRows={2}
                            value={preFlightNote}
                            onChange={(event) => setPreFlightNote(event.target.value)}
                          />

                          <Box component="details" sx={{ '& > summary': { cursor: 'pointer', color: 'text.secondary' } }}>
                            <Typography component="summary" variant="caption" sx={{ fontWeight: 600 }}>
                              {tr('Ngày bay & thông số hiện trường (tùy chọn)', 'Flight date & site readings (optional)')}
                            </Typography>
                            <Grid container spacing={1.25} sx={{ pt: 1.25 }}>
                              <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                                <TextField
                                  type="date"
                                  size="small"
                                  fullWidth
                                  label={tr('Ngày bay', 'Flight date')}
                                  value={sessionDateInput}
                                  onChange={(e) => setSessionDateInput(e.target.value)}
                                  slotProps={{ inputLabel: { shrink: true } }}
                                />
                              </Grid>
                              <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                                <TextField
                                  type="number"
                                  size="small"
                                  fullWidth
                                  label={tr('Gió (m/s)', 'Wind (m/s)')}
                                  value={windSpeedInput}
                                  onChange={(e) => setWindSpeedInput(e.target.value)}
                                  slotProps={{ htmlInput: { min: 0, max: 40, step: 0.5 } }}
                                />
                              </Grid>
                              <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                                <TextField
                                  type="number"
                                  size="small"
                                  fullWidth
                                  label={tr('Pin (%)', 'Battery (%)')}
                                  value={minBatteryInput}
                                  onChange={(e) => setMinBatteryInput(e.target.value)}
                                  slotProps={{ htmlInput: { min: 0, max: 100 } }}
                                />
                              </Grid>
                              <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                                <TextField
                                  type="number"
                                  size="small"
                                  fullWidth
                                  label={tr('Vệ tinh GPS', 'GPS Sats')}
                                  value={gpsSatsInput}
                                  onChange={(e) => setGpsSatsInput(e.target.value)}
                                  slotProps={{ htmlInput: { min: 0, max: 40 } }}
                                />
                              </Grid>
                              <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                                <TextField
                                  type="number"
                                  size="small"
                                  fullWidth
                                  label="RTH (m)"
                                  value={rthAltInput}
                                  onChange={(e) => setRthAltInput(e.target.value)}
                                  slotProps={{ htmlInput: { min: 10, max: 500 } }}
                                />
                              </Grid>
                              <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                                <TextField
                                  size="small"
                                  fullWidth
                                  label={tr('Thời tiết', 'Weather')}
                                  placeholder={tr('Quang đãng', 'Clear')}
                                  value={weatherSummaryInput}
                                  onChange={(e) => setWeatherSummaryInput(e.target.value)}
                                />
                              </Grid>
                            </Grid>
                          </Box>

                          {!openSession && inspection.status === 'SCHEDULED' && isWindowExpired && (
                            <Alert severity="warning" sx={{ borderRadius: '10px' }}>
                              {t('The scheduled flight window has elapsed. Contact the Manager to reschedule before starting a new session.')}
                            </Alert>
                          )}

                          <MutationProblemAlert
                            error={startSession.error}
                            isError={startSession.isError}
                            fallbackMessage={t('Could not start the field session.')}
                          />
                        </Stack>
                      </form>
                    )}
                  </Stack>
                </Paper>
                <Box sx={{ mt: 2 }}>
                  <StepActionBar
                    backTo="../permit"
                    backLabel={t('Flight Permit')}
                    secondaryActions={
                      !isCompletedPreFlight
                        ? renderHiddenStartNowTrigger(
                            'inline',
                            'preflight-hidden-start-now-trigger',
                          )
                        : undefined
                    }
                    primaryAction={
                      isCompletedPreFlight ? (
                        <Button
                          component={RouterLink}
                          to="../field-session"
                          variant="contained"
                          size="medium"
                          endIcon={<ArrowForwardRounded fontSize="small" />}
                          sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            borderRadius: '8px',
                            px: 2.5,
                            py: 1,
                          }}
                        >
                          {t('Continue to Flight Operation')}
                        </Button>
                      ) : (
                        <LoadingButton
                          type="button"
                          variant="contained"
                          loading={startSession.isPending}
                          disabled={!canStart || !canSubmitPreFlight}
                          onClick={() => {
                            const payload = buildPreFlightPayload();
                            if (!payload) return;
                            startSession.mutate(
                              {
                                preFlightChecklistNote: payload,
                                sessionDate: sessionDateInput || null,
                                preFlightChecklistSnapshot: buildChecklistSnapshot(
                                  preFlightSpecItems,
                                  preFlightChecked,
                                ),
                                preFlightConditions: buildPreFlightConditions(),
                              },
                              {
                                onSuccess: () => {
                                  setAdditionalSessionMode(false);
                                  if (searchParams.get('newSession') === '1') {
                                    const next = new URLSearchParams(searchParams);
                                    next.delete('newSession');
                                    setSearchParams(next, { replace: true });
                                  }
                                  setPreFlightChecked([]);
                                  setPreFlightNote('');
                                  navigate('../field-session');
                                },
                              },
                            );
                          }}
                          endIcon={<ArrowForwardRounded fontSize="small" />}
                          sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                        >
                          {t('Start session & Continue to Flight')}
                        </LoadingButton>
                      )
                    }
                  />
                </Box>
                </>
              );
            })()}
          </QueryState>
        )}

        {showPostFlightStage && (
          <QueryState
            isLoading={inspectionQuery.isLoading || sessions.isLoading}
            error={inspectionQuery.error ?? sessions.error}
            onRetry={() => {
              void inspectionQuery.refetch();
              void sessions.refetch();
            }}
            loadingLabel={t('Loading post-flight & inspection items…')}
          >
            {inspection && (
              <>
              <Paper
                className="trace-stage-panel"
                variant="outlined"
                sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: '10px', bgcolor: 'background.paper' }}
              >
                {openSession && hasFlightRecord ? (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      const payload = buildCompleteOutcomePayload();
                      if (!payload) return;
                      outcome.mutate(
                        {
                          sessionId: openSession.id,
                          outcome: 'complete',
                          reason: payload,
                          postFlightChecklistSnapshot: buildChecklistSnapshot(
                            postFlightSpecItems,
                            postFlightChecked,
                          ),
                        },
                        {
                          onSuccess: () => {
                            navigate(isReinspection ? '../findings' : '../evidence');
                          },
                        },
                      );
                    }}
                  >
                    <Stack spacing={2.5}>
                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1.5}
                        sx={{
                          alignItems: { sm: 'center' },
                          justifyContent: 'space-between',
                          pb: 1.75,
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.25 }}>
                            {isReinspection
                              ? t('Post-flight Completion Checklist')
                              : t('Post-flight & Inspection Items')}
                          </Typography>
                        </Box>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={() => openOutcomeDialog(openSession, 'abort')}
                          sx={{ textTransform: 'none', fontWeight: 600 }}
                        >
                          {t('Abort session')}
                        </Button>
                      </Stack>

                      {assetInspectionItems.length > 0 && (
                      <Box
                        sx={{
                          p: { xs: 2, sm: 2.5 },
                          borderRadius: '12px',
                          bgcolor: 'background.default',
                          border: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <Stack
                          direction="row"
                          sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.75 }}
                        >
                          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                            <Typography variant="subtitle2" sx={{ fontSize: '0.9375rem', fontWeight: 600 }}>
                              {t('Target Building Inspection Items')}
                            </Typography>
                            <Chip
                              size="small"
                              label={`${inspectedAssetItems.length}/${assetInspectionItems.length}`}
                              color={inspectedAssetItems.length === assetInspectionItems.length ? 'success' : 'default'}
                              variant="outlined"
                            />
                          </Stack>
                          <Button
                            size="small"
                            variant="text"
                            onClick={() =>
                              updateInspectedAssetItems(
                                inspectedAssetItems.length === assetInspectionItems.length
                                  ? []
                                  : [...assetInspectionItems],
                              )
                            }
                            sx={{ textTransform: 'none', fontWeight: 600, py: 0.25, minWidth: 0, fontSize: '0.8125rem' }}
                          >
                            {inspectedAssetItems.length === assetInspectionItems.length
                              ? t('Clear all')
                              : t('Check all')}
                          </Button>
                        </Stack>
                        <Box
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
                            gap: 1.5,
                          }}
                        >
                          {assetInspectionItems.map((item, idx) => {
                            const checked = inspectedAssetItems.includes(item);
                            return (
                              <Box
                                key={idx}
                                role="checkbox"
                                aria-checked={checked}
                                tabIndex={0}
                                onClick={() => toggleInspectedAssetItem(item)}
                                onKeyDown={(e) => {
                                  if (e.key === ' ' || e.key === 'Enter') {
                                    e.preventDefault();
                                    toggleInspectedAssetItem(item);
                                  }
                                }}
                                sx={{
                                  minHeight: 68,
                                  px: 2,
                                  py: 1.5,
                                  borderRadius: '10px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 1.5,
                                  cursor: 'pointer',
                                  border: '1px solid',
                                  borderColor: checked ? 'rgba(22, 163, 74, 0.35)' : 'divider',
                                  bgcolor: 'background.paper',
                                  transition: 'all 140ms ease',
                                  '&:hover': { borderColor: '#16A34A', bgcolor: 'action.hover' },
                                  '&:focus-visible': {
                                    outline: '2px solid',
                                    outlineColor: 'primary.main',
                                    outlineOffset: 2,
                                  },
                                }}
                              >
                                <CircleSign state={checked ? 'checked' : 'unchecked'} />
                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      display: 'block',
                                      fontSize: '0.75rem',
                                      fontWeight: 600,
                                      color: checked ? '#16A34A' : 'text.secondary',
                                      mb: 0.25,
                                    }}
                                  >
                                    {`ITEM-${String(idx + 1).padStart(2, '0')}`}
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    sx={{ fontSize: '0.9375rem', fontWeight: 500, lineHeight: 1.4, color: 'text.primary' }}
                                  >
                                    {item}
                                  </Typography>
                                </Box>
                              </Box>
                            );
                          })}
                        </Box>
                      </Box>
                      )}

                      <Box
                        sx={{
                          p: { xs: 2, sm: 2.5 },
                          borderRadius: '12px',
                          bgcolor: 'background.default',
                          border: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <Stack
                          direction="row"
                          sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.75 }}
                        >
                          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                            <Typography variant="subtitle2" sx={{ fontSize: '0.9375rem', fontWeight: 600 }}>
                              {t('Post-flight completion checklist')}
                            </Typography>
                            <Chip
                              size="small"
                              label={`${postFlightChecked.length}/${postFlightSpecItems.length}`}
                              color={postFlightChecked.length === postFlightSpecItems.length ? 'success' : 'default'}
                              variant="outlined"
                            />
                            {requiredPostFlightItems.length === 0 && (
                              <Chip size="small" label={t('Optional')} variant="outlined" />
                            )}
                          </Stack>
                          <Button
                            size="small"
                            variant="text"
                            onClick={() =>
                              setPostFlightChecked(
                                allPostFlightChecked ? [] : [...postFlightItems],
                              )
                            }
                            sx={{ textTransform: 'none', fontWeight: 600, py: 0.25, minWidth: 0, fontSize: '0.8125rem' }}
                          >
                            {allPostFlightChecked ? t('Clear all') : t('Check all')}
                          </Button>
                        </Stack>
                        <Box
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
                            gap: 1.5,
                          }}
                        >
                          {postFlightSpecItems.map((spec) => {
                            const checked = postFlightChecked.includes(spec.label);
                            return (
                              <Box
                                key={spec.code}
                                role="checkbox"
                                aria-checked={checked}
                                tabIndex={0}
                                onClick={() => togglePostFlightItem(spec.label)}
                                onKeyDown={(e) => {
                                  if (e.key === ' ' || e.key === 'Enter') {
                                    e.preventDefault();
                                    togglePostFlightItem(spec.label);
                                  }
                                }}
                                sx={{
                                  minHeight: 68,
                                  px: 2,
                                  py: 1.5,
                                  borderRadius: '10px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 1.5,
                                  cursor: 'pointer',
                                  border: '1px solid',
                                  borderColor: checked ? 'rgba(22, 163, 74, 0.35)' : 'divider',
                                  bgcolor: 'background.paper',
                                  transition: 'all 140ms ease',
                                  '&:hover': { borderColor: '#16A34A', bgcolor: 'action.hover' },
                                  '&:focus-visible': {
                                    outline: '2px solid',
                                    outlineColor: 'primary.main',
                                    outlineOffset: 2,
                                  },
                                }}
                              >
                                <CircleSign state={checked ? 'checked' : 'unchecked'} />
                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.25 }}>
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        color: checked ? '#16A34A' : 'text.secondary',
                                      }}
                                    >
                                      {spec.code}
                                    </Typography>
                                    {spec.referenceThreshold && (
                                      <Typography
                                        variant="caption"
                                        sx={{
                                          fontSize: '0.75rem',
                                          fontWeight: 500,
                                          color: 'text.secondary',
                                        }}
                                      >
                                        · {spec.referenceThreshold}
                                      </Typography>
                                    )}
                                    {!spec.required && (
                                      <Typography
                                        variant="caption"
                                        sx={{
                                          fontSize: '0.6875rem',
                                          fontWeight: 500,
                                          color: 'text.secondary',
                                        }}
                                      >
                                        • {t('Optional')}
                                      </Typography>
                                    )}
                                  </Stack>
                                  <Typography
                                    variant="body2"
                                    sx={{ fontSize: '0.9375rem', fontWeight: 500, lineHeight: 1.4, color: 'text.primary' }}
                                  >
                                    {t(spec.label)}
                                  </Typography>
                                </Box>
                              </Box>
                            );
                          })}
                        </Box>
                      </Box>

                      <TextField
                        label={t('Session notes')}
                        size="small"
                        required={hasIncompleteRequiredChecks}
                        multiline
                        minRows={2}
                        value={outcomeReason}
                        onChange={(event) => setOutcomeReason(event.target.value)}
                      />

                      <MutationProblemAlert
                        error={outcome.error}
                        isError={outcome.isError}
                        fallbackMessage={t('Could not record the session outcome.')}
                      />
                    </Stack>
                  </form>
                ) : canContinueToEvidence ? (
                  <Stack spacing={2.5}>
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1.5}
                      sx={{
                        alignItems: { sm: 'center' },
                        justifyContent: 'space-between',
                        pb: 1.75,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.25 }}>
                          {t('Post-flight & Inspection Items verified')}
                        </Typography>
                        {latestSession?.endedAt && (
                          <Typography variant="caption" color="text.secondary">
                            {formatDateTime(new Date(latestSession.endedAt))}
                          </Typography>
                        )}
                      </Box>
                    </Stack>

                    {assetInspectionItems.length > 0 && (
                      <ChecklistNoteDisplay
                        title={t('Target Building Inspection Items')}
                        rawNote=""
                        fallbackItems={assetInspectionItems}
                        itemCodePrefix="ITEM"
                      />
                    )}

                    <ChecklistNoteDisplay
                      title={t('Post-flight completion checklist')}
                      rawNote={latestSession?.outcomeNotes ?? ''}
                      fallbackItems={postFlightItems}
                      itemCodePrefix="PO"
                    />
                  </Stack>
                ) : openSession && !hasFlightRecord ? (
                  <Stack spacing={2}>
                    <Alert
                      severity="info"
                      action={
                        <Button
                          component={RouterLink}
                          to="../field-session"
                          color="inherit"
                          size="small"
                        >
                          {t('Go to Flight Operation')}
                        </Button>
                      }
                    >
                      {t(
                        'Record the flight using live telemetry, an imported flight log, or a manual declaration before completing the post-flight checklist.',
                      )}
                    </Alert>
                    {assetInspectionItems.length > 0 && (
                      <ChecklistNoteDisplay
                        title={t('Target Building Inspection Items')}
                        rawNote=""
                        fallbackItems={assetInspectionItems}
                        itemCodePrefix="ITEM"
                        pendingUnchecked
                      />
                    )}
                    <ChecklistNoteDisplay
                      title={t('Post-flight completion checklist')}
                      rawNote=""
                      fallbackItems={postFlightItems}
                      itemCodePrefix="PO"
                      pendingUnchecked
                    />
                  </Stack>
                ) : (
                  <Stack spacing={2}>
                    <Alert
                      severity="info"
                      action={
                        <Button
                          component={RouterLink}
                          to="../pre-flight"
                          color="inherit"
                          size="small"
                        >
                          {t('Go to Pre-flight')}
                        </Button>
                      }
                    >
                      {t('Start the field session in Step 2 & Step 3 before completing the post-flight checklist.')}
                    </Alert>
                    {assetInspectionItems.length > 0 && (
                      <ChecklistNoteDisplay
                        title={t('Target Building Inspection Items')}
                        rawNote=""
                        fallbackItems={assetInspectionItems}
                        itemCodePrefix="ITEM"
                        pendingUnchecked
                      />
                    )}
                    <ChecklistNoteDisplay
                      title={t('Post-flight completion checklist')}
                      rawNote=""
                      fallbackItems={postFlightItems}
                      itemCodePrefix="PO"
                      pendingUnchecked
                    />
                  </Stack>
                )}
              </Paper>
              <Box sx={{ mt: 2 }}>
                <StepActionBar
                  backTo="../field-session"
                  backLabel={t('Flight Operation')}
                  primaryAction={
                    openSession && hasFlightRecord ? (
                      <LoadingButton
                        type="button"
                        variant="contained"
                        color="success"
                        loading={outcome.isPending}
                        disabled={hasIncompleteRequiredChecks && !outcomeReason.trim()}
                        onClick={() => {
                          const payload = buildCompleteOutcomePayload();
                          if (!payload) return;
                          outcome.mutate(
                            {
                              sessionId: openSession.id,
                              outcome: 'complete',
                              reason: payload,
                              postFlightChecklistSnapshot: buildChecklistSnapshot(
                                postFlightSpecItems,
                                postFlightChecked,
                              ),
                            },
                            {
                              onSuccess: () => {
                                navigate(isReinspection ? '../findings' : '../evidence');
                              },
                            },
                          );
                        }}
                        endIcon={<ArrowForwardRounded fontSize="small" />}
                        sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                      >
                        {isReinspection
                          ? t('Complete session & Continue to Defect Verification')
                          : t('Complete session & Continue to Evidence')}
                      </LoadingButton>
                    ) : canContinueToEvidence ? (
                      <Button
                        component={RouterLink}
                        to={isReinspection ? '../findings' : '../evidence'}
                        variant="contained"
                        endIcon={<ArrowForwardRounded fontSize="small" />}
                        sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 650 }}
                      >
                        {isReinspection ? t('Continue to Defect Verification') : t('Continue to evidence')}
                      </Button>
                    ) : undefined
                  }
                />
              </Box>
              </>
            )}
          </QueryState>
        )}

        {showFlightStage && (
        <QueryState
          isLoading={sessions.isLoading}
          error={sessions.error}
          onRetry={() => void sessions.refetch()}
          loadingLabel={t('Loading field sessions…')}
        >
          {inspection && (
            <>
            <Paper
              className="trace-stage-panel"
              variant="outlined"
              sx={{
                p: { xs: 2.5, sm: 3.5 },
                borderRadius: '12px',
                bgcolor: 'background.paper',
              }}
            >
              <Stack spacing={3}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={2}
                  sx={{
                    alignItems: { sm: 'center' },
                    justifyContent: 'space-between',
                    pb: 2,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Stack direction="row" spacing={1.75} sx={{ alignItems: 'center' }}>
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: '10px',
                        bgcolor: openSession
                          ? '#EFF3FF'
                          : canContinueToEvidence
                            ? 'rgba(22, 163, 74, 0.12)'
                            : 'background.default',
                        color: openSession
                          ? '#2B84EB'
                          : canContinueToEvidence
                            ? '#16A34A'
                            : 'text.secondary',
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <CheckCircleRounded sx={{ fontSize: 22 }} />
                    </Box>
                    <Box>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                        <Typography variant="subtitle1" sx={{ fontSize: '1.0625rem', fontWeight: 600, color: 'text.primary' }}>
                          {openSession
                            ? t('Session in progress')
                            : canContinueToEvidence
                              ? t('Field session complete')
                              : t('No active session')}
                        </Typography>
                        {openSession && (
                          <Chip
                            size="small"
                            label={t('Active')}
                            color="primary"
                            variant="outlined"
                          />
                        )}
                        <Tooltip title="3D Simulation Demo" enterDelay={300}>
                          <IconButton
                            size="small"
                            aria-label="Open 3D flight simulation demo"
                            data-testid="step3-hidden-3d-demo-trigger"
                            tabIndex={-1}
                            onClick={() => setSimDemoOpen(true)}
                            sx={{
                              width: 22,
                              height: 22,
                              p: 0,
                              opacity: 0.14,
                              transition: 'opacity 160ms ease, transform 160ms ease',
                              '&:hover, &:focus-visible': {
                                opacity: 0.95,
                                transform: 'scale(1.15)',
                                bgcolor: 'rgba(14, 165, 233, 0.14)',
                              },
                            }}
                          >
                            <Box
                              sx={{
                                width: 7,
                                height: 7,
                                borderRadius: '50%',
                                bgcolor: '#0EA5E9',
                              }}
                            />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                        {openSession?.startedAt
                          ? `${t('Started')} ${formatDateTime(new Date(openSession.startedAt))}`
                          : canContinueToEvidence
                            ? latestSession?.outcomeNotes && !latestSession.outcomeNotes.includes('[✓]')
                              ? latestSession.outcomeNotes
                              : t('The latest field session is complete.')
                            : !hasPermit
                              ? t('Record the mission flight document before starting the session.')
                              : t('Enter the required on-site pre-flight note to start this session.')}
                      </Typography>
                    </Box>
                  </Stack>

                  {openSession && (
                    <Button
                      variant="outlined"
                      size="medium"
                      color="error"
                      onClick={() => openOutcomeDialog(openSession, 'abort')}
                      sx={{
                        borderRadius: '8px',
                        px: 2,
                        py: 1,
                        fontWeight: 600,
                        textTransform: 'none',
                        flexShrink: 0,
                      }}
                    >
                      {t('Abort session')}
                    </Button>
                  )}
                </Stack>

                {!openSession && !canContinueToEvidence && inspection.reassignmentRequired && (
                  <Alert severity="error">
                    {t('This inspection was declined and requires Manager reassignment before starting a field session.')}
                    {inspection.declineReason ? ` (${t('Reason')}: ${inspection.declineReason})` : ''}
                  </Alert>
                )}

                {!openSession &&
                  !canContinueToEvidence &&
                  inspection.status === 'SCHEDULED' &&
                  !inspection.reassignmentRequired &&
                  isWindowExpired && (
                    <Alert severity="warning" sx={{ borderRadius: '10px' }}>
                      {t('The scheduled flight window has elapsed. Contact the Manager to reschedule before starting a new session.')}
                    </Alert>
                  )}

                {openSession?.status === 'IN_PROGRESS' && (
                  <>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 1.75,
                        borderRadius: '10px',
                        bgcolor: 'background.default',
                        borderColor: 'divider',
                      }}
                    >
                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1}
                        sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', mb: 1 }}
                      >
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {tr('Chuyến bay trong phiên này', 'Flight sorties in this session')}
                            {openSessionFlights.length > 0 ? ` (${openSessionFlights.length})` : ''}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {tr(
                              'Ghi nhiều chuyến bay (đổi pin, khu vực khác hoặc ngày mới) mà không ghi đè dữ liệu trước đó.',
                              'Record multiple flights (battery swaps, zones, or days) without overwriting earlier telemetry.',
                            )}
                          </Typography>
                        </Box>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<AddRounded />}
                          onClick={() => {
                            setNewFlightDate(
                              openSession.sessionDate ?? new Date().toISOString().slice(0, 10),
                            );
                            setNewFlightLabel(
                              `Flight #${openSessionFlights.length + 1}`,
                            );
                            setAddFlightOpen(true);
                          }}
                          sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px', flexShrink: 0 }}
                        >
                          {tr('Thêm chuyến bay', 'Record new flight')}
                        </Button>
                      </Stack>

                      {openSessionFlights.length > 0 && (
                        <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', rowGap: 0.75 }}>
                          {openSessionFlights.map((flight) => {
                            const selected = flight.id === activeSessionFlight?.id;
                            return (
                              <Chip
                                key={flight.id}
                                size="small"
                                clickable
                                color={selected ? 'primary' : flight.hasFlightReport ? 'success' : 'default'}
                                variant={selected ? 'filled' : 'outlined'}
                                onClick={() => setSelectedFlightId(flight.id)}
                                label={`#${flight.flightNumber} · ${flight.flightDate}${flight.flightLabel ? ` · ${flight.flightLabel}` : ''}${flight.hasFlightReport ? ' ✓' : ''}`}
                                sx={{ fontWeight: selected ? 700 : 500 }}
                              />
                            );
                          })}
                        </Stack>
                      )}
                    </Paper>

                    <SmartDroneHubTelemetryPanel
                      inspectionId={inspectionId}
                      fieldSessionId={openSession.id}
                      flightId={activeSessionFlight?.id ?? null}
                      flightMeta={activeSessionFlight ?? null}
                      sessionActive
                      hasFlightReport={hasFlightReport || flightCompletedOnStep}
                      telemetrySource={openSession.telemetrySource}
                      onTelemetryChange={setLiveTelemetry}
                      onFlightCompleted={() => setFlightCompletedOnStep(true)}
                    />
                    {(hasFlightReport || flightCompletedOnStep) && (
                      <FlightOperationsReportView
                        inspectionId={inspectionId}
                        fieldSessionId={openSession.id}
                        flightId={activeSessionFlight?.id ?? null}
                        flights={allInspectionFlights}
                        sessions={items}
                        evidenceList={evidenceQuery?.data ?? []}
                        assetName={inspection.assetName}
                        droneSummary={
                          [inspection.droneModel, inspection.droneSerialNumber]
                            .filter(Boolean)
                            .join(' · ') || null
                        }
                        flightPermitFileName={inspection.flightPermitFileName}
                        collapsible
                        defaultExpanded
                      />
                    )}
                    {assetInspectionItems.length > 0 && (
                      <Box
                        sx={{
                          p: { xs: 2, sm: 2.5 },
                          borderRadius: '12px',
                          bgcolor: 'background.default',
                          border: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <Stack
                          direction="row"
                          spacing={1.5}
                          sx={{
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            mb: 2,
                            flexWrap: 'wrap',
                          }}
                        >
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontSize: '0.9375rem', fontWeight: 600, color: 'text.primary' }}>
                              {t('Target Building Inspection Items')}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                              {t('Checkpoints to capture during flight.')}
                            </Typography>
                          </Box>
                          <Chip
                            size="small"
                            variant="outlined"
                            label={`${assetInspectionItems.length} ${t('items')}`}
                            sx={{ fontWeight: 600 }}
                          />
                        </Stack>
                        <Box
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
                            gap: 1.5,
                          }}
                        >
                          {assetInspectionItems.map((item, idx) => (
                            <Box
                              key={idx}
                              sx={{
                                minHeight: 68,
                                px: 2,
                                py: 1.5,
                                borderRadius: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.5,
                                border: '1px solid',
                                borderColor: 'divider',
                                bgcolor: 'background.paper',
                              }}
                            >
                              <Box
                                component="span"
                                sx={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: '8px',
                                  bgcolor: '#EFF3FF',
                                  color: '#2B84EB',
                                  display: 'grid',
                                  placeItems: 'center',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  fontFamily: 'monospace',
                                  flexShrink: 0,
                                }}
                              >
                                {String(idx + 1).padStart(2, '0')}
                              </Box>
                              <Typography
                                variant="body2"
                                sx={{
                                  flex: 1,
                                  fontSize: '0.9375rem',
                                  fontWeight: 500,
                                  lineHeight: 1.4,
                                  color: 'text.primary',
                                }}
                              >
                                {item}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    )}
                  </>
                )}
                {!openSession &&
                  inspection.status === 'FIELD_COMPLETED' &&
                  latestSession?.status === 'FIELD_COMPLETED' && (
                    <SmartDroneHubTelemetryPanel
                      inspectionId={inspectionId}
                      fieldSessionId={latestSession.id}
                      sessionActive={false}
                      allowFlightLogImport
                      hasFlightReport={Boolean(
                        latestSession.hasFlightReport || latestSession.telemetrySource,
                      )}
                      telemetrySource={latestSession.telemetrySource}
                    />
                  )}
                {!openSession && !canContinueToEvidence && stage === 'flight' && assetInspectionItems.length > 0 && (
                  <ChecklistNoteDisplay
                    title={t('Target Building Inspection Items')}
                    rawNote=""
                    fallbackItems={assetInspectionItems}
                    itemCodePrefix="ITEM"
                    pendingUnchecked={!canContinueToEvidence}
                  />
                )}
                {!openSession &&
                  latestSession?.startedAt &&
                  (latestSession.status === 'FIELD_COMPLETED' ||
                    latestSession.status === 'ABORTED') && (
                    <FlightOperationsReportView
                      inspectionId={inspectionId}
                      fieldSessionId={latestSession.id}
                      flights={allInspectionFlights}
                      sessions={items}
                      evidenceList={evidenceQuery?.data ?? []}
                      assetName={inspection.assetName}
                      droneSummary={
                        [inspection.droneModel, inspection.droneSerialNumber]
                          .filter(Boolean)
                          .join(' · ') || null
                      }
                      flightPermitFileName={inspection.flightPermitFileName}
                      collapsible
                    />
                  )}

                {!stage && (openSession ?? latestSession)?.preFlightChecklistNote && (
                  <ChecklistNoteDisplay
                    title={t('Pre-flight safety checklist')}
                    rawNote={(openSession ?? latestSession)?.preFlightChecklistNote ?? ''}
                  />
                )}

                {!stage &&
                  !openSession &&
                  latestSession?.outcomeNotes &&
                  (latestSession.outcomeNotes.includes('[✓]') ||
                    latestSession.outcomeNotes.includes('[!]')) && (
                    <ChecklistNoteDisplay
                      title={t('Post-flight completion checklist')}
                      rawNote={latestSession.outcomeNotes}
                    />
                  )}

                <MutationProblemAlert
                  error={startSession.error}
                  isError={startSession.isError}
                  fallbackMessage={t('Could not start the field session.')}
                />
                <MutationProblemAlert
                  error={outcome.error}
                  isError={outcome.isError}
                  fallbackMessage={t('Could not record the session outcome.')}
                />
              </Stack>
            </Paper>
            <Box sx={{ mt: 2 }}>
              <StepActionBar
                backTo={
                  stage === 'flight'
                    ? openSession || canContinueToEvidence || hasPermit
                      ? '../pre-flight'
                      : '../permit'
                    : undefined
                }
                backLabel={
                  stage === 'flight'
                    ? openSession || canContinueToEvidence || hasPermit
                      ? t('Pre-flight Check')
                      : t('Upload Flight Permit')
                    : undefined
                }
                secondaryActions={
                  !openSession && canContinueToEvidence && stage === 'flight' ? (
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                      {canStart && (
                        <Button
                          variant="outlined"
                          size="medium"
                          startIcon={<AddRounded />}
                          onClick={() => navigate('../pre-flight?newSession=1')}
                          sx={{ borderRadius: '8px', px: 2, py: 1, fontWeight: 600, textTransform: 'none' }}
                        >
                          {tr('Thêm ngày / phiên bay mới', 'New day / session')}
                        </Button>
                      )}
                      <Button
                        component={RouterLink}
                        to="../post-flight"
                        variant="outlined"
                        size="medium"
                        sx={{ borderRadius: '8px', px: 2, py: 1, fontWeight: 600, textTransform: 'none' }}
                      >
                        {t('View Post-flight & Items')}
                      </Button>
                    </Stack>
                  ) : undefined
                }
                primaryAction={
                  openSession ? (
                    stage === 'flight' ? (
                      <Button
                        variant="contained"
                        size="medium"
                        color="primary"
                        disabled={!canProceedToPostFlight}
                        onClick={() => navigate('../post-flight')}
                        endIcon={<ArrowForwardRounded fontSize="small" />}
                        sx={{
                          borderRadius: '8px',
                          px: 2.5,
                          py: 1,
                          fontWeight: 600,
                          textTransform: 'none',
                        }}
                      >
                        {isReinspection
                          ? t('Continue to Post-flight Check')
                          : t('Continue to Post-flight & Items')}
                      </Button>
                    ) : (
                      <Button
                        variant="contained"
                        size="medium"
                        color="success"
                        onClick={() => openOutcomeDialog(openSession, 'complete')}
                        sx={{
                          borderRadius: '8px',
                          px: 2.5,
                          py: 1,
                          fontWeight: 600,
                          textTransform: 'none',
                        }}
                      >
                        {t('Complete session')}
                      </Button>
                    )
                  ) : canContinueToEvidence ? (
                    <Button
                      component={RouterLink}
                      to="../evidence"
                      variant="contained"
                      size="medium"
                      endIcon={<ArrowForwardRounded fontSize="small" />}
                      sx={{ borderRadius: '8px', px: 2.5, py: 1, fontWeight: 600, textTransform: 'none' }}
                    >
                      {t('Continue to evidence')}
                    </Button>
                  ) : (
                    <LoadingButton
                      variant="contained"
                      size="medium"
                      loading={startSession.isPending}
                      disabled={!canStart}
                      onClick={handleOpenStart}
                      sx={{ borderRadius: '8px', px: 2.5, py: 1, fontWeight: 600, textTransform: 'none' }}
                    >
                      {t('Start session')}
                    </LoadingButton>
                  )
                }
              />
            </Box>
            </>
          )}
        </QueryState>
        )}

        {(items.length > 1 || (items.length === 1 && !openSession && allInspectionFlights.length > 1)) && (
          <Box component="details" sx={{ '& > summary': { cursor: 'pointer', color: 'text.secondary' } }}>
            <Typography component="summary" variant="body2">
              {t('Session history')} · {items.length}{' '}
              {allInspectionFlights.length > 0 ? `(${allInspectionFlights.length} ${tr('chuyến bay', 'flights')})` : ''}
            </Typography>
            <Stack spacing={1} sx={{ pt: 1.5 }}>
              {[...items].reverse().map((session, sIdx) => (
                <Paper key={session.id} variant="outlined" sx={{ p: 1.5, borderRadius: '10px' }}>
                  <Stack spacing={0.75}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {tr('Phiên', 'Session')} #{items.length - sIdx}
                        {session.sessionDate ? ` · ${session.sessionDate}` : ''}
                        {session.startedAt ? ` · ${formatDateTime(new Date(session.startedAt))}` : ''}
                      </Typography>
                      <StatusChip status={session.status} />
                    </Stack>
                    {session.preFlightConditions && (
                      <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
                        {session.preFlightConditions.windSpeedMs != null && (
                          <Chip size="small" variant="outlined" label={`${t('Wind')}: ${session.preFlightConditions.windSpeedMs} m/s`} />
                        )}
                        {session.preFlightConditions.minBatteryPercent != null && (
                          <Chip size="small" variant="outlined" label={`${t('Battery')}: ${session.preFlightConditions.minBatteryPercent}%`} />
                        )}
                        {session.preFlightConditions.gpsSatellites != null && (
                          <Chip size="small" variant="outlined" label={`GNSS: ${session.preFlightConditions.gpsSatellites} sats`} />
                        )}
                      </Stack>
                    )}
                    {session.flights && session.flights.length > 0 && (
                      <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
                        {session.flights.map((f) => (
                          <Chip
                            key={f.id}
                            size="small"
                            variant="outlined"
                            color={f.hasFlightReport ? 'success' : 'default'}
                            label={`#${f.flightNumber} ${f.flightDate} · ${f.flightLabel || 'Flight'}${f.flightDurationSeconds ? ` (${Math.round(f.flightDurationSeconds / 60)}m)` : ''}`}
                          />
                        ))}
                      </Stack>
                    )}
                    {session.postponementReason && (
                      <Typography variant="body2" color="warning.main">
                        {t('Postponed:')} {session.postponementReason}
                      </Typography>
                    )}
                    {session.abortReason && (
                      <Typography variant="body2" color="error.main">
                        {t('Aborted:')} {session.abortReason}
                      </Typography>
                    )}
                    {session.outcomeNotes && (
                      <Typography variant="body2" color="text.secondary">
                        {session.outcomeNotes}
                      </Typography>
                    )}
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Box>
        )}

        <Dialog open={addFlightOpen} onClose={() => setAddFlightOpen(false)} fullWidth maxWidth="xs">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!openSession) return;
              createFlight.mutate({
                flightLabel: newFlightLabel.trim() || null,
                flightDate: newFlightDate || null,
              });
            }}
          >
            <DialogTitle sx={{ fontWeight: 700 }}>
              {tr('Ghi nhận chuyến bay mới', 'Add flight sortie')}
            </DialogTitle>
            <DialogContent>
              <Stack spacing={2} sx={{ pt: 1 }}>
                <TextField
                  type="date"
                  size="small"
                  fullWidth
                  label={tr('Ngày bay', 'Flight date')}
                  value={newFlightDate}
                  onChange={(e) => setNewFlightDate(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField
                  size="small"
                  fullWidth
                  autoFocus
                  label={tr('Tên / khu vực chuyến bay', 'Flight label / zone')}
                  placeholder="North Facade · Battery #2"
                  value={newFlightLabel}
                  onChange={(e) => setNewFlightLabel(e.target.value)}
                />
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={() => setAddFlightOpen(false)}>{t('Cancel')}</Button>
              <LoadingButton type="submit" variant="contained" loading={createFlight.isPending}>
                {tr('Tạo chuyến bay', 'Add flight')}
              </LoadingButton>
            </DialogActions>
          </form>
        </Dialog>
      </Stack>

      <Dialog open={startOpen} onClose={() => setStartOpen(false)} fullWidth maxWidth="sm">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const payload = buildPreFlightPayload();
            if (!payload) return;
            startSession.mutate(payload, {
              onSuccess: () => {
                setStartOpen(false);
                setPreFlightChecked([]);
                setPreFlightNote('');
              },
            });
          }}
        >
          <DialogTitle sx={{ fontWeight: 700 }}>{t('Start a field session')}</DialogTitle>
          <DialogContent>
            <Stack spacing={1.75} sx={{ mt: 0.5 }}>
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: '10px' }}>
                <Stack
                  direction="row"
                  sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {t('Pre-flight safety checklist')} (
                    {requiredPreFlightItems.length > 0
                      ? `${requiredPreFlightItems.filter((item) => preFlightChecked.includes(item.label)).length}/${requiredPreFlightItems.length} ${t('required')}`
                      : `${preFlightChecked.length}/${preFlightItems.length}`}
                    )
                  </Typography>
                  <Button
                    size="small"
                    variant="text"
                    onClick={() =>
                      setPreFlightChecked(
                        allPreFlightChecked ? [] : [...preFlightItems],
                      )
                    }
                    sx={{ textTransform: 'none', fontWeight: 600, py: 0 }}
                  >
                    {allPreFlightChecked ? t('Clear all') : t('Check all')}
                  </Button>
                </Stack>
                <Stack spacing={0.25}>
                  {preFlightSpecItems.map((spec) => {
                    const checked = preFlightChecked.includes(spec.label);
                    return (
                      <FormControlLabel
                        key={spec.code}
                        sx={{ m: 0, alignItems: 'center' }}
                        control={
                          <Checkbox
                            size="small"
                            checked={checked}
                            onChange={() => togglePreFlightItem(spec.label)}
                          />
                        }
                        label={
                          <Typography variant="body2">
                            {t(spec.label)}
                            {!spec.required ? ` (${t('Optional')})` : ''}
                          </Typography>
                        }
                      />
                    );
                  })}
                </Stack>
              </Paper>

              <TextField
                label={t('Pre-flight note')}
                multiline
                minRows={2}
                value={preFlightNote}
                onChange={(event) => setPreFlightNote(event.target.value)}
                helperText={t('Optional remarks (site conditions, wind, obstacle notes). Stored with the session.')}
              />
              <Alert severity="info">
                {t('Starting records the Inspector’s session in software. It does not arm the aircraft or grant flight authorization.')}
              </Alert>
              <MutationProblemAlert
                error={startSession.error}
                isError={startSession.isError}
                fallbackMessage={t('Could not start the field session.')}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setStartOpen(false)}>{t('Cancel')}</Button>
            {renderHiddenStartNowTrigger('modal', 'modal-hidden-start-now-trigger')}
            <LoadingButton
              type="submit"
              variant="contained"
              loading={startSession.isPending}
              disabled={!canSubmitPreFlight}
            >
              {t('Start session')}
            </LoadingButton>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={Boolean(outcomeTarget)}
        onClose={() => setOutcomeTarget(null)}
        fullWidth
        maxWidth="sm"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!outcomeTarget) return;
            const payload = buildOutcomePayload();
            if (!payload) return;
            outcome.mutate(
              {
                sessionId: outcomeTarget.session.id,
                outcome: outcomeTarget.kind,
                reason: payload,
              },
              { onSuccess: () => setOutcomeTarget(null) },
            );
          }}
        >
          <DialogTitle sx={{ fontWeight: 700 }}>
            {outcomeTarget?.kind === 'abort'
              ? t('Abort the flight session')
              : t('Complete the session')}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={1.75} sx={{ mt: 0.5 }}>
              {outcomeTarget?.kind === 'complete' ? (
                <Stack spacing={1.5}>
                  {assetInspectionItems.length > 0 && (
                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: '10px' }}>
                      <Stack
                        direction="row"
                        sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}
                      >
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          {t('Inspected Building Items')} ({inspectedAssetItems.length}/{assetInspectionItems.length})
                        </Typography>
                        <Button
                          size="small"
                          variant="text"
                          onClick={() =>
                            updateInspectedAssetItems(
                              inspectedAssetItems.length === assetInspectionItems.length
                                ? []
                                : [...assetInspectionItems],
                            )
                          }
                          sx={{ textTransform: 'none', fontWeight: 600, py: 0 }}
                        >
                          {inspectedAssetItems.length === assetInspectionItems.length
                            ? t('Clear all')
                            : t('Check all')}
                        </Button>
                      </Stack>
                      <Stack spacing={0.25}>
                        {assetInspectionItems.map((item) => {
                          const checked = inspectedAssetItems.includes(item);
                          return (
                            <FormControlLabel
                              key={item}
                              sx={{ m: 0, alignItems: 'center' }}
                              control={
                                <Checkbox
                                  size="small"
                                  color="primary"
                                  checked={checked}
                                  onChange={() => toggleInspectedAssetItem(item)}
                                />
                              }
                              label={<Typography variant="body2">{item}</Typography>}
                            />
                          );
                        })}
                      </Stack>
                    </Paper>
                  )}

                  <Paper variant="outlined" sx={{ p: 1.5, borderRadius: '10px' }}>
                    <Stack
                      direction="row"
                      sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}
                    >
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          {t('Post-flight completion checklist')} ({postFlightChecked.length}/{postFlightItems.length})
                        </Typography>
                        {requiredPostFlightItems.length === 0 && (
                          <Chip size="small" label={t('Optional')} variant="outlined" />
                        )}
                      </Stack>
                      <Button
                        size="small"
                        variant="text"
                        onClick={() =>
                          setPostFlightChecked(
                            allPostFlightChecked ? [] : [...postFlightItems],
                          )
                        }
                        sx={{ textTransform: 'none', fontWeight: 600, py: 0 }}
                      >
                        {allPostFlightChecked ? t('Clear all') : t('Check all')}
                      </Button>
                    </Stack>
                    <Stack spacing={0.25}>
                      {postFlightItems.map((item) => {
                        const checked = postFlightChecked.includes(item);
                        return (
                          <FormControlLabel
                            key={item}
                            sx={{ m: 0, alignItems: 'center' }}
                            control={
                              <Checkbox
                                size="small"
                                color="success"
                                checked={checked}
                                onChange={() => togglePostFlightItem(item)}
                              />
                            }
                            label={
                              <Typography variant="body2">
                                {t(item)}
                              </Typography>
                            }
                          />
                        );
                      })}
                    </Stack>
                  </Paper>

                  {requiresCompletionExplanation && (
                    <Alert severity="warning" sx={{ borderRadius: '10px' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {t('Incomplete checklist — explanation required in Session notes')}
                      </Typography>
                      <Typography variant="caption" sx={{ display: 'block', mt: 0.25 }}>
                        {uninspectedAssetItems.length > 0
                          ? `${uninspectedAssetItems.length} ${t('building item(s) not checked')}: ${uninspectedAssetItems.join(', ')}. ${t('Please explain the reason in Session notes below (e.g., crane obstruction, restricted access, high wind).')}`
                          : t('Not all required post-flight checks are ticked. Please record the reason in Session notes below.')}
                      </Typography>
                    </Alert>
                  )}
                </Stack>
              ) : (
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: 600, display: 'block', mb: 0.75 }}
                  >
                    {t('Select abort category or describe below')}
                  </Typography>
                  <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', rowGap: 0.75 }}>
                    {ABORT_REASON_PRESETS.map((preset) => {
                      const label = t(preset);
                      const active = abortCategory === preset || outcomeReason === label;
                      return (
                        <Chip
                          key={preset}
                          size="small"
                          color={active ? 'error' : 'default'}
                          variant={active ? 'filled' : 'outlined'}
                          label={label}
                          onClick={() => {
                            setAbortCategory(preset);
                            setOutcomeReason(label);
                          }}
                        />
                      );
                    })}
                    <Chip
                      size="small"
                      color={abortCategory === 'other' ? 'error' : 'default'}
                      variant={abortCategory === 'other' ? 'filled' : 'outlined'}
                      label={t('Other (specify below)')}
                      onClick={() => {
                        const presetLabels = ABORT_REASON_PRESETS.map((p) => t(p));
                        setAbortCategory('other');
                        if (presetLabels.includes(outcomeReason)) {
                          setOutcomeReason('');
                        }
                        setTimeout(() => abortReasonInputRef.current?.focus(), 0);
                      }}
                    />
                  </Stack>
                </Box>
              )}

              <TextField
                inputRef={abortReasonInputRef}
                label={outcomeTarget?.kind === 'complete' ? t('Session notes') : t('Abort reason')}
                required={outcomeTarget?.kind === 'abort' || requiresCompletionExplanation}
                multiline
                minRows={2}
                value={outcomeReason}
                onChange={(event) => {
                  const val = event.target.value;
                  setOutcomeReason(val);
                  if (outcomeTarget?.kind === 'abort') {
                    const matched = ABORT_REASON_PRESETS.find((p) => t(p) === val);
                    setAbortCategory(matched ?? (val.trim() ? 'other' : abortCategory));
                  }
                }}
                helperText={
                  outcomeTarget?.kind === 'complete'
                    ? requiresCompletionExplanation
                      ? t('Required when any building item or required check is unchecked.')
                      : t('Optional summary or observations from the flight.')
                    : t('Explain why this session was aborted (weather, technical defect, etc.). A notification will be sent to the manager.')
                }
              />
              <MutationProblemAlert
                error={outcome.error}
                isError={outcome.isError}
                fallbackMessage={t('Could not record the session outcome.')}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOutcomeTarget(null)}>{t('Cancel')}</Button>
            <LoadingButton
              type="submit"
              variant="contained"
              color={outcomeTarget?.kind === 'abort' ? 'error' : 'success'}
              loading={outcome.isPending}
              disabled={!canSubmitOutcome}
            >
              {outcomeTarget?.kind === 'abort'
                ? t('Abort session')
                : t('Complete session')}
            </LoadingButton>
          </DialogActions>
        </form>
      </Dialog>

      {simDemoOpen && (
        <Suspense fallback={null}>
          <FlightSimulationDemoDialog
            open={simDemoOpen}
            onClose={() => setSimDemoOpen(false)}
            assetName={inspection?.assetName}
          />
        </Suspense>
      )}
    </Box>
  );
}
