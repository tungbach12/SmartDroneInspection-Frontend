import { useRef, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
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
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import UploadFileRounded from '@mui/icons-material/UploadFileRounded';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import { MutationProblemAlert } from '@/shared/ui/MutationProblemAlert';
import { QueryState } from '@/shared/ui/QueryState';
import { StatusChip } from '@/shared/ui/StatusChip';
import {
  useFieldSessionOutcome,
  useFieldSessions,
  useInspection,
  useInspectionEvidence,
  useStartFieldSession,
  useUploadFlightPermit,
  useReinspectionVerifications,
} from '../hooks/useInspections';
import { TargetFlightShotList } from '../components/TargetFlightShotList';
import { SmartDroneHubTelemetryPanel } from '../components/SmartDroneHubTelemetryPanel';
import { FlightPermitPreviewDialog } from '../components/FlightPermitPreviewDialog';
import { FlightOperationsReportView } from '@/features/reports/components/FlightOperationsReportView';
import { useChecklistTemplates } from '@/features/assets/hooks/useCatalog';
import type { FieldSession } from '../api/fieldSessionApi';
import { useQuery } from '@tanstack/react-query';
import {
  smartDroneHubApi,
  type SmartDroneHubTelemetry,
} from '../api/smartDroneHubApi';
import { useLocale } from '@/shared/i18n/LocaleProvider';

interface PreFlightChecklistSpecItem {
  code: string;
  label: string;
  required: boolean;
}

const PRE_FLIGHT_CHECKLIST_SPEC: readonly PreFlightChecklistSpecItem[] = [
  {
    code: 'PF-01',
    label: 'Drone airframe, propellers & camera gimbal inspected and intact',
    required: true,
  },
  {
    code: 'PF-02',
    label: 'Battery level sufficient, GPS lock acquired & Return-to-Home (RTH) altitude set',
    required: true,
  },
  {
    code: 'PF-03',
    label: 'Flight permit verified & surrounding airspace clear for takeoff',
    required: true,
  },
  {
    code: 'PF-04',
    label: 'Takeoff/landing zone secured and clear of bystanders',
    required: true,
  },
  {
    code: 'PF-05',
    label: 'Weather, wind speed & visual line-of-sight within safe operating limits',
    required: false,
  },
  {
    code: 'PF-06',
    label: 'High-speed storage media verified, RTK base link & camera exposure calibrated',
    required: false,
  },
  {
    code: 'PF-07',
    label: 'Visual observer (VO) briefed & emergency abort communication channel tested',
    required: false,
  },
] as const;

const PRE_FLIGHT_CHECKLIST_ITEMS = PRE_FLIGHT_CHECKLIST_SPEC.map((item) => item.label);

const POST_FLIGHT_CHECKLIST_ITEMS = [
  'Drone landed safely, motors disarmed & hardware free of post-flight damage',
  'All planned structural inspection checkpoints captured',
  'Captured photos, videos & flight telemetry logs saved intact',
  'Equipment packed, safety barriers removed & site restored',
] as const;

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

export interface FieldSessionPageProps {
  stage?: 'permit' | 'pre-flight' | 'flight' | 'post-flight';
}

/** Record a mission permit file and the Inspector's on-site session. */
export default function FieldSessionPage({ stage }: FieldSessionPageProps = {}) {
  const { formatDateTime, t } = useLocale();
  const { inspectionId = '' } = useParams();
  const navigate = useNavigate();
  const inspectionQuery = useInspection(inspectionId);
  const inspection = inspectionQuery.data;
  const sessions = useFieldSessions(inspectionId);
  const startSession = useStartFieldSession(inspectionId);
  const outcome = useFieldSessionOutcome(inspectionId);
  const uploadPermit = useUploadFlightPermit(inspectionId);
  const isReinspection = inspection?.inspectionType === 'RE_INSPECTION';
  const verifications = useReinspectionVerifications(isReinspection ? inspectionId : '');
  const evidenceQuery = useInspectionEvidence?.(inspectionId);

  const [permitFile, setPermitFile] = useState<File | null>(null);
  const [permitPreviewOpen, setPermitPreviewOpen] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  const [preFlightChecked, setPreFlightChecked] = useState<string[]>([]);
  const [preFlightNote, setPreFlightNote] = useState('');
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
  const [abortCategory, setAbortCategory] = useState<string | null>(null);
  const [outcomeReason, setOutcomeReason] = useState('');
  const abortReasonInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  const assetInspectionItems = inspection?.inspectionItems ?? [];

  const preFlightTemplatesQuery = useChecklistTemplates(
    { type: 'PRE_FLIGHT' },
    startOpen || stage === 'pre-flight',
  );
  const postFlightTemplatesQuery = useChecklistTemplates(
    { type: 'POST_FLIGHT' },
    outcomeTarget?.kind === 'complete' || stage === 'post-flight',
  );

  const preFlightItems: readonly string[] =
    preFlightTemplatesQuery.data && preFlightTemplatesQuery.data.length > 0
      ? preFlightTemplatesQuery.data.filter((item) => item.active).map((item) => item.label)
      : PRE_FLIGHT_CHECKLIST_ITEMS;

  const preFlightSpecItems: readonly PreFlightChecklistSpecItem[] =
    preFlightTemplatesQuery.data && preFlightTemplatesQuery.data.length > 0
      ? preFlightTemplatesQuery.data
          .filter((item) => item.active)
          .map((item, idx) => {
            const matched = PRE_FLIGHT_CHECKLIST_SPEC.find((s) => s.label === item.label);
            return (
              matched ?? {
                code: `PF-0${idx + 1}`,
                label: item.label,
                required: idx < 4,
              }
            );
          })
      : PRE_FLIGHT_CHECKLIST_SPEC;

  const requiredPreFlightItems = preFlightSpecItems.filter((item) => item.required);
  const optionalPreFlightItems = preFlightSpecItems.filter((item) => !item.required);

  const postFlightItems: readonly string[] =
    postFlightTemplatesQuery.data && postFlightTemplatesQuery.data.length > 0
      ? postFlightTemplatesQuery.data.filter((item) => item.active).map((item) => item.label)
      : POST_FLIGHT_CHECKLIST_ITEMS;

  const items = sessions.data ?? [];
  const openSession = items.find(
    (session) => session.status === 'IN_PROGRESS' || session.status === 'PLANNED',
  );
  const latestSession = items.at(-1);
  const hasPermit = Boolean(inspection?.flightPermitFileName);
  const canStart =
    !openSession &&
    hasPermit &&
    inspection?.status === 'SCHEDULED';
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
  const hasFlown =
    liveHasFlown ||
    Boolean(
      openSession?.id &&
        typeof sessionStorage !== 'undefined' &&
        sessionStorage.getItem(`sdi_has_flown_${openSession.id}`) === 'true',
    );
  const canProceedToPostFlight = hasFlown;

  const allRequiredPreFlightChecked =
    requiredPreFlightItems.length > 0 &&
    requiredPreFlightItems.every((item) => preFlightChecked.includes(item.label));
  const allOptionalPreFlightChecked =
    optionalPreFlightItems.length > 0 &&
    optionalPreFlightItems.every((item) => preFlightChecked.includes(item.label));
  const allPreFlightChecked =
    preFlightItems.length > 0 && preFlightChecked.length === preFlightItems.length;
  const canSubmitPreFlight =
    allRequiredPreFlightChecked || Boolean(preFlightNote.trim());

  const allPostFlightChecked =
    postFlightItems.length > 0 && postFlightChecked.length === postFlightItems.length;
  const allAssetItemsChecked =
    assetInspectionItems.length === 0 ||
    inspectedAssetItems.length === assetInspectionItems.length;
  const uninspectedAssetItems = assetInspectionItems.filter(
    (item) => !inspectedAssetItems.includes(item),
  );
  const requiresCompletionExplanation =
    outcomeTarget?.kind === 'complete' &&
    (!allPostFlightChecked || !allAssetItemsChecked);
  const canSubmitOutcome =
    outcomeTarget?.kind === 'complete'
      ? (allPostFlightChecked && allAssetItemsChecked) || Boolean(outcomeReason.trim())
      : Boolean(outcomeReason.trim());

  const buildPreFlightPayload = () => {
    const checkedSummary = preFlightChecked.map((item) => `[✓] ${t(item)}`).join(' · ');
    const note = preFlightNote.trim();
    if (checkedSummary && note) return `${checkedSummary} — ${note}`;
    return note || checkedSummary;
  };

  const buildOutcomePayload = () => {
    if (outcomeTarget?.kind !== 'complete') {
      return outcomeReason.trim();
    }
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
    return note || checkedSummary;
  };

  const showPermitSection = !stage || stage === 'permit';
  const showPreFlightStage = stage === 'pre-flight';
  const showFlightStage = !stage || stage === 'flight';
  const showPostFlightStage = stage === 'post-flight';

  return (
    <Box className="workspace-page workspace-page--inspections trace-ledger-workspace">
      <Stack spacing={2}>
        {isReinspection && showFlightStage && (
          <TargetFlightShotList
            mode="flight-guidance"
            inspectionId={inspectionId}
            sourceInspectionId={inspection?.sourceInspectionId}
            items={verifications.data ?? []}
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
              <Stack spacing={stage === 'permit' ? 3 : 2}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1.5}
                  sx={{ alignItems: { sm: 'flex-start' }, justifyContent: 'space-between' }}
                >
                  <Box>
                    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 0.5 }}>
                      <Typography variant="subtitle1" sx={{ fontSize: '1.0625rem', fontWeight: 600, color: 'text.primary' }}>
                        {t('Flight permit')}
                      </Typography>
                      <Chip
                        size="small"
                        label={hasPermit ? t('On file') : t('Required')}
                        color={hasPermit ? 'success' : 'warning'}
                        variant="outlined"
                      />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {t(
                        'Upload the mission flight document. This records the file only; it does not verify validity or grant permission to fly.',
                      )}
                    </Typography>
                    {!stage && inspection.assetName && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        {inspection.assetName}
                      </Typography>
                    )}
                  </Box>

                  {hasPermit && stage === 'permit' && (
                    <Button
                      component={RouterLink}
                      to="../pre-flight"
                      variant="contained"
                      size="medium"
                      sx={{
                        textTransform: 'none',
                        fontWeight: 600,
                        borderRadius: '8px',
                        px: 2.5,
                        py: 1,
                        flexShrink: 0,
                      }}
                    >
                      {t('Continue to Pre-flight Check')}
                    </Button>
                  )}
                </Stack>

                {hasPermit && (
                  <Box
                    sx={{
                      p: { xs: 2, sm: 2.5 },
                      borderRadius: '12px',
                      bgcolor: 'background.default',
                      border: '1px solid',
                      borderColor: 'divider',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 2,
                    }}
                  >
                    <Stack direction="row" spacing={1.75} sx={{ alignItems: 'center', minWidth: 0, flex: 1 }}>
                      <Box
                        sx={{
                          width: 46,
                          height: 46,
                          borderRadius: '10px',
                          bgcolor: 'rgba(22, 163, 74, 0.12)',
                          color: 'success.main',
                          display: 'grid',
                          placeItems: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <CheckCircleRounded sx={{ fontSize: 24 }} />
                      </Box>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.9375rem', fontWeight: 600, color: 'text.primary' }}>
                          {t('Flight document recorded')}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" noWrap sx={{ mt: 0.25 }}>
                          {inspection.flightPermitFileName}
                          {inspection.flightPermitUploadedAt
                            ? ` · ${formatDateTime(new Date(inspection.flightPermitUploadedAt))}`
                            : ''}
                        </Typography>
                      </Box>
                    </Stack>

                    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                      <Button
                        size="medium"
                        variant="outlined"
                        startIcon={<VisibilityOutlined fontSize="small" />}
                        onClick={() => setPermitPreviewOpen(true)}
                        sx={{
                          textTransform: 'none',
                          fontWeight: 600,
                          borderRadius: '8px',
                          bgcolor: 'background.paper',
                          px: 2,
                          py: 0.875,
                        }}
                      >
                        {t('View permit')}
                      </Button>
                    </Stack>
                  </Box>
                )}

                {(!hasPermit || stage === 'permit') && (
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
                        setPermitFile(droppedFile);
                      }
                    }}
                    sx={{
                      minHeight: stage === 'permit' ? 240 : 180,
                      p: { xs: 3, sm: 4.5 },
                      borderRadius: '12px',
                      border: '2px dashed',
                      borderColor: permitFile ? 'primary.main' : 'divider',
                      bgcolor: permitFile ? 'rgba(55, 88, 249, 0.04)' : 'background.default',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      gap: 1.5,
                      transition: 'border-color 160ms ease, background-color 160ms ease',
                      '&:hover': {
                        borderColor: 'primary.main',
                        bgcolor: 'rgba(55, 88, 249, 0.025)',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: '12px',
                        bgcolor: '#EFF3FF',
                        color: '#3758F9',
                        display: 'grid',
                        placeItems: 'center',
                        mb: 0.5,
                      }}
                    >
                      <UploadFileRounded sx={{ fontSize: 28 }} />
                    </Box>

                    <Box sx={{ maxWidth: 520 }}>
                      <Typography sx={{ fontSize: '1rem', fontWeight: 600, color: 'text.primary' }}>
                        {permitFile
                          ? permitFile.name
                          : hasPermit
                            ? t('Upload or replace flight permit document')
                            : t('Drag and drop flight permit file here, or click to browse')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {t(
                          'Supported formats: PDF, PNG, JPG, WEBP (Max 25 MB) · Official CAAV / Military Operations Flight Clearance',
                        )}
                      </Typography>
                    </Box>

                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1.5}
                      sx={{ alignItems: 'center', justifyContent: 'center', mt: 1 }}
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
                          {permitFile?.name ??
                            (hasPermit ? t('Choose replacement permit file') : t('Choose permit file'))}
                        </Box>
                        <input
                          aria-label={t('Choose permit file')}
                          type="file"
                          hidden
                          accept=".pdf,image/png,image/jpeg,image/webp"
                          onChange={(event) => setPermitFile(event.target.files?.[0] ?? null)}
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

                      <LoadingButton
                        variant="contained"
                        size="medium"
                        disabled={!permitFile}
                        loading={uploadPermit.isPending}
                        onClick={() => {
                          if (!permitFile) return;
                          uploadPermit.mutate(permitFile, {
                            onSuccess: () => {
                              setPermitFile(null);
                              if (stage === 'permit') {
                                navigate('../pre-flight');
                              }
                            },
                          });
                        }}
                        sx={{
                          borderRadius: '8px',
                          px: 2.5,
                          py: 1,
                          fontWeight: 600,
                        }}
                      >
                        {t('Upload flight permit')}
                      </LoadingButton>
                    </Stack>

                    <MutationProblemAlert
                      error={uploadPermit.error}
                      isError={uploadPermit.isError}
                      fallbackMessage={t('Could not upload flight permit.')}
                    />
                  </Box>
                )}
              </Stack>
            </Paper>
          ) : inspection && inspection.status !== 'SCHEDULED' && !hasPermit ? (
            <Alert severity="warning" sx={{ borderRadius: '10px' }}>
              {t('No flight document is recorded. Contact the inspection manager before starting field work.')}
            </Alert>
          ) : null}
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
            />
          )}
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
              const isCompletedPreFlight = Boolean(openSession || canContinueToEvidence);
              const requiredCheckedCount = isCompletedPreFlight
                ? requiredPreFlightItems.length
                : requiredPreFlightItems.filter((item) => preFlightChecked.includes(item.label)).length;
              const optionalCheckedCount = isCompletedPreFlight
                ? optionalPreFlightItems.length
                : optionalPreFlightItems.filter((item) => preFlightChecked.includes(item.label)).length;

              return (
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
                            color: isCompletedPreFlight ? '#16A34A' : '#3758F9',
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
                              label={`${requiredCheckedCount + optionalCheckedCount}/${requiredPreFlightItems.length + optionalPreFlightItems.length} ${t('verified')}`}
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

                      {isCompletedPreFlight ? (
                        <Button
                          component={RouterLink}
                          to="../field-session"
                          variant="contained"
                          size="medium"
                          sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            borderRadius: '8px',
                            px: 2.5,
                            py: 1,
                            flexShrink: 0,
                          }}
                        >
                          {t('Continue to Flight Operation')}
                        </Button>
                      ) : (
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
                    </Stack>

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

                    {/* Group 1: Required */}
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
                            {t('Required')}
                          </Typography>
                          <Chip
                            size="small"
                            label={`${requiredCheckedCount}/${requiredPreFlightItems.length}`}
                            color={requiredCheckedCount === requiredPreFlightItems.length ? 'success' : 'default'}
                            variant="outlined"
                          />
                        </Stack>
                        {!isCompletedPreFlight && (
                          <Button
                            size="small"
                            variant="text"
                            onClick={() => {
                              const reqLabels = requiredPreFlightItems.map((i) => i.label);
                              if (allRequiredPreFlightChecked) {
                                setPreFlightChecked((prev) => prev.filter((x) => !reqLabels.includes(x)));
                              } else {
                                setPreFlightChecked((prev) => Array.from(new Set([...prev, ...reqLabels])));
                              }
                            }}
                            sx={{ textTransform: 'none', fontWeight: 600, py: 0.25, minWidth: 0, fontSize: '0.8125rem' }}
                          >
                            {allRequiredPreFlightChecked ? t('Clear all') : t('Check all')}
                          </Button>
                        )}
                      </Stack>

                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
                          gap: 1.5,
                        }}
                      >
                        {requiredPreFlightItems.map((spec) => {
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
                                  {spec.code}
                                </Typography>
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

                    {/* Group 2: Optional */}
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
                          <Typography variant="subtitle2" sx={{ fontSize: '0.9375rem', fontWeight: 600, color: 'text.primary' }}>
                            {t('Optional')}
                          </Typography>
                          <Chip
                            size="small"
                            label={`${optionalCheckedCount}/${optionalPreFlightItems.length}`}
                            color={optionalCheckedCount === optionalPreFlightItems.length ? 'success' : 'default'}
                            variant="outlined"
                          />
                        </Stack>
                        {!isCompletedPreFlight && (
                          <Button
                            size="small"
                            variant="text"
                            onClick={() => {
                              const optLabels = optionalPreFlightItems.map((i) => i.label);
                              if (allOptionalPreFlightChecked) {
                                setPreFlightChecked((prev) => prev.filter((x) => !optLabels.includes(x)));
                              } else {
                                setPreFlightChecked((prev) => Array.from(new Set([...prev, ...optLabels])));
                              }
                            }}
                            sx={{ textTransform: 'none', fontWeight: 600, py: 0.25, minWidth: 0, fontSize: '0.8125rem' }}
                          >
                            {allOptionalPreFlightChecked ? t('Clear all') : t('Check all')}
                          </Button>
                        )}
                      </Stack>

                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
                          gap: 1.5,
                        }}
                      >
                        {optionalPreFlightItems.map((spec) => {
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
                                  : { borderColor: 'text.secondary', bgcolor: 'action.hover' },
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
                                  {spec.code}
                                </Typography>
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
                        onSubmit={(event) => {
                          event.preventDefault();
                          const payload = buildPreFlightPayload();
                          if (!payload) return;
                          startSession.mutate(payload, {
                            onSuccess: () => {
                              setPreFlightChecked([]);
                              setPreFlightNote('');
                              navigate('../field-session');
                            },
                          });
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

                          <MutationProblemAlert
                            error={startSession.error}
                            isError={startSession.isError}
                            fallbackMessage={t('Could not start the field session.')}
                          />

                          <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
                            <LoadingButton
                              type="submit"
                              variant="contained"
                              loading={startSession.isPending}
                              disabled={!canStart || !canSubmitPreFlight}
                            >
                              {t('Start session & Continue to Flight')}
                            </LoadingButton>
                          </Stack>
                        </Stack>
                      </form>
                    )}
                  </Stack>
                </Paper>
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
              <Paper
                className="trace-stage-panel"
                variant="outlined"
                sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: '10px', bgcolor: 'background.paper' }}
              >
                {openSession && hasFlown ? (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
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
                      const payload =
                        checkedSummary && note
                          ? `${checkedSummary} — ${note}`
                          : note || checkedSummary;
                      if (!payload) return;
                      outcome.mutate(
                        {
                          sessionId: openSession.id,
                          outcome: 'complete',
                          reason: payload,
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
                            {t('Post-flight & Inspection Items')}
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
                          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                            <Typography variant="subtitle2" sx={{ fontSize: '0.9375rem', fontWeight: 600 }}>
                              {t('Post-flight completion checklist')}
                            </Typography>
                            <Chip
                              size="small"
                              label={`${postFlightChecked.length}/${postFlightItems.length}`}
                              color={postFlightChecked.length === postFlightItems.length ? 'success' : 'default'}
                              variant="outlined"
                            />
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
                          {postFlightItems.map((item, idx) => {
                            const checked = postFlightChecked.includes(item);
                            return (
                              <Box
                                key={item}
                                role="checkbox"
                                aria-checked={checked}
                                tabIndex={0}
                                onClick={() => togglePostFlightItem(item)}
                                onKeyDown={(e) => {
                                  if (e.key === ' ' || e.key === 'Enter') {
                                    e.preventDefault();
                                    togglePostFlightItem(item);
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
                                    {`PO-${String(idx + 1).padStart(2, '0')}`}
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    sx={{ fontSize: '0.9375rem', fontWeight: 500, lineHeight: 1.4, color: 'text.primary' }}
                                  >
                                    {t(item)}
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
                        required={!allPostFlightChecked || !allAssetItemsChecked}
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

                      <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
                        <LoadingButton
                          type="submit"
                          variant="contained"
                          color="success"
                          loading={outcome.isPending}
                          disabled={
                            !((allPostFlightChecked && allAssetItemsChecked) || Boolean(outcomeReason.trim()))
                          }
                        >
                          {t('Complete session & Continue to Evidence')}
                        </LoadingButton>
                      </Stack>
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
                      <Button
                        component={RouterLink}
                        to={isReinspection ? '../findings' : '../evidence'}
                        variant="contained"
                        sx={{ textTransform: 'none', fontWeight: 650, flexShrink: 0 }}
                      >
                        {isReinspection ? t('Continue to Defect Verification') : t('Continue to evidence')}
                      </Button>
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
                ) : openSession && !hasFlown ? (
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
                        'Connect to SmartDroneHub (Connect Flight Operations) and perform the flight survey in Step 3 before completing the post-flight checklist.',
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
                          ? '#3758F9'
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

                  {openSession ? (
                    <Stack direction="row" spacing={1.25} sx={{ flexWrap: 'wrap' }}>
                      {stage === 'flight' ? (
                        <Button
                          variant="contained"
                          size="medium"
                          color="primary"
                          disabled={!canProceedToPostFlight}
                          onClick={() => navigate('../post-flight')}
                          sx={{
                            borderRadius: '8px',
                            px: 2.5,
                            py: 1,
                            fontWeight: 600,
                            textTransform: 'none',
                          }}
                        >
                          {t('Continue to Post-flight & Items')}
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
                      )}
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
                        }}
                      >
                        {t('Abort session')}
                      </Button>
                    </Stack>
                  ) : canContinueToEvidence ? (
                    <Stack direction="row" spacing={1.25} sx={{ flexWrap: 'wrap' }}>
                      {stage === 'flight' && (
                        <Button
                          component={RouterLink}
                          to="../post-flight"
                          variant="outlined"
                          size="medium"
                          sx={{ borderRadius: '8px', px: 2, py: 1, fontWeight: 600, textTransform: 'none' }}
                        >
                          {t('View Post-flight & Items')}
                        </Button>
                      )}
                      <Button
                        component={RouterLink}
                        to={isReinspection ? '../findings' : '../evidence'}
                        variant="contained"
                        size="medium"
                        sx={{ borderRadius: '8px', px: 2.5, py: 1, fontWeight: 600, textTransform: 'none' }}
                      >
                        {isReinspection ? t('Continue to Defect Verification') : t('Continue to evidence')}
                      </Button>
                    </Stack>
                  ) : (
                    <Stack direction="row" spacing={1.25} sx={{ flexWrap: 'wrap' }}>
                      {stage === 'flight' && (
                        <Button
                          component={RouterLink}
                          to={hasPermit ? '../pre-flight' : '../permit'}
                          variant="outlined"
                          size="medium"
                          sx={{ borderRadius: '8px', px: 2, py: 1, fontWeight: 600, textTransform: 'none' }}
                        >
                          {hasPermit ? t('Go to Pre-flight Check') : t('Upload Flight Permit')}
                        </Button>
                      )}
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
                    </Stack>
                  )}
                </Stack>

                {openSession?.status === 'IN_PROGRESS' && (
                  <>
                    {stage === 'flight' && !canProceedToPostFlight && (
                      <Alert severity="info" sx={{ borderRadius: '10px', py: 1 }}>
                        {t(
                          'Connect to SmartDroneHub (Connect Flight Operations) and perform the flight survey before continuing to Post-flight & Items.',
                        )}
                      </Alert>
                    )}
                    <SmartDroneHubTelemetryPanel
                      inspectionId={inspectionId}
                      fieldSessionId={openSession.id}
                      sessionActive
                      canViewFlightReport={false}
                      onTelemetryChange={setLiveTelemetry}
                    />
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
                              {t('Reference list of structural checkpoints to capture during flight.')}
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
                                  color: '#3758F9',
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
                {!openSession && stage === 'flight' && assetInspectionItems.length > 0 && (
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
                      evidenceList={evidenceQuery?.data ?? []}
                      assetName={inspection.assetName}
                      droneSummary={
                        [inspection.droneModel, inspection.droneSerialNumber]
                          .filter(Boolean)
                          .join(' · ') || null
                      }
                      flightPermitFileName={inspection.flightPermitFileName}
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

                {!openSession && latestSession?.status === 'ABORTED' && inspection?.status === 'SCHEDULED' && (
                  <Alert severity="warning" sx={{ borderRadius: '10px' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {t('Previous flight session was aborted')}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      {latestSession.endedAt ? `${t('Ended')} ${formatDateTime(new Date(latestSession.endedAt))} · ` : ''}
                      {t('Reason')}: "{latestSession.abortReason}"
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      {t('The inspection status was returned to SCHEDULED. Contact manager for rescheduling, or start a new session when conditions are safe.')}
                    </Typography>
                  </Alert>
                )}
              </Stack>
            </Paper>
          )}
        </QueryState>
        )}

        {items.length > 1 && (
          <Box component="details" sx={{ '& > summary': { cursor: 'pointer', color: 'text.secondary' } }}>
            <Typography component="summary" variant="body2">
              {t('Session history')} · {items.length}
            </Typography>
            <Stack spacing={1} sx={{ pt: 1.5 }}>
              {items.slice(0, -1).reverse().map((session) => (
                <Paper key={session.id} variant="outlined" sx={{ p: 1.5, borderRadius: '10px' }}>
                  <Stack spacing={0.5}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {session.startedAt
                          ? formatDateTime(new Date(session.startedAt))
                          : t('Session record')}
                      </Typography>
                      <StatusChip status={session.status} />
                    </Stack>
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
                    {t('Pre-flight safety checklist')} ({preFlightChecked.length}/{preFlightItems.length})
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
                  {preFlightItems.map((item) => {
                    const checked = preFlightChecked.includes(item);
                    return (
                      <FormControlLabel
                        key={item}
                        sx={{ m: 0, alignItems: 'center' }}
                        control={
                          <Checkbox
                            size="small"
                            checked={checked}
                            onChange={() => togglePreFlightItem(item)}
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
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {t('Post-flight completion checklist')} ({postFlightChecked.length}/{postFlightItems.length})
                      </Typography>
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
                          : t('Not all post-flight checks are ticked. Please record the reason in Session notes below.')}
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
                      ? t('Required when any building item or post-flight check is unchecked.')
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
    </Box>
  );
}
