import { useRef, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
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
import FlightTakeoffRounded from '@mui/icons-material/FlightTakeoffRounded';
import UploadFileRounded from '@mui/icons-material/UploadFileRounded';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded';
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
import { useLocale } from '@/shared/i18n/LocaleProvider';

const PRE_FLIGHT_CHECKLIST_ITEMS = [
  'Drone airframe, propellers & camera gimbal inspected and intact',
  'Battery level sufficient, GPS lock acquired & Return-to-Home (RTH) altitude set',
  'Weather, wind speed & visual line-of-sight within safe operating limits',
  'Takeoff/landing zone secured and clear of bystanders',
  'Flight permit verified & surrounding airspace clear for takeoff',
] as const;

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

function ChecklistNoteDisplay({
  title,
  rawNote,
}: {
  title: string;
  rawNote: string;
}) {
  const { t } = useLocale();
  const { checkedItems, skippedItems, remark } = parseChecklistNote(rawNote);

  if (checkedItems.length === 0 && skippedItems.length === 0) {
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
        p: 1.75,
        borderRadius: 2,
        bgcolor: 'action.hover',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.25, flexWrap: 'wrap' }}
      >
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
          <CheckCircleRounded color="success" sx={{ fontSize: 18 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={0.75}>
          {checkedItems.length > 0 && (
            <Chip
              size="small"
              color="success"
              variant="outlined"
              label={`${checkedItems.length} ${t('verified')}`}
              sx={{ height: 22, fontSize: '0.72rem', fontWeight: 600 }}
            />
          )}
          {skippedItems.length > 0 && (
            <Chip
              size="small"
              color="warning"
              variant="outlined"
              label={`${skippedItems.length} ${t('skipped')}`}
              sx={{ height: 22, fontSize: '0.72rem', fontWeight: 600 }}
            />
          )}
        </Stack>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          gap: 1,
        }}
      >
        {checkedItems.map((item, idx) => (
          <Paper
            key={`ok-${idx}`}
            variant="outlined"
            sx={{
              px: 1.25,
              py: 0.85,
              borderRadius: 1.5,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              bgcolor: 'background.paper',
            }}
          >
            <CheckCircleRounded color="success" sx={{ fontSize: 16, flexShrink: 0 }} />
            <Typography variant="body2" sx={{ fontSize: '0.82rem', fontWeight: 500, lineHeight: 1.3 }}>
              {item}
            </Typography>
          </Paper>
        ))}
        {skippedItems.map((item, idx) => (
          <Paper
            key={`skip-${idx}`}
            variant="outlined"
            sx={{
              px: 1.25,
              py: 0.85,
              borderRadius: 1.5,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              bgcolor: 'background.paper',
              borderColor: 'warning.main',
            }}
          >
            <WarningAmberRounded color="warning" sx={{ fontSize: 16, flexShrink: 0 }} />
            <Typography variant="body2" sx={{ fontSize: '0.82rem', fontWeight: 500, lineHeight: 1.3 }}>
              {item}
            </Typography>
          </Paper>
        ))}
      </Box>

      {remark && (
        <Box
          sx={{
            mt: 1.25,
            pt: 1,
            borderTop: '1px dashed',
            borderColor: 'divider',
            display: 'flex',
            gap: 0.75,
            alignItems: 'baseline',
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, flexShrink: 0 }}>
            {t('Inspector note')}:
          </Typography>
          <Typography variant="body2" color="text.primary">
            {remark}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

/** Record a mission permit file and the Inspector's on-site session. */
export default function FieldSessionPage() {
  const { formatDateTime, t } = useLocale();
  const { inspectionId = '' } = useParams();
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
  const [inspectedAssetItems, setInspectedAssetItems] = useState<string[]>([]);
  const [abortCategory, setAbortCategory] = useState<string | null>(null);
  const [outcomeReason, setOutcomeReason] = useState('');
  const abortReasonInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  const assetInspectionItems = inspection?.inspectionItems ?? [];

  const preFlightTemplatesQuery = useChecklistTemplates({ type: 'PRE_FLIGHT' }, startOpen);
  const postFlightTemplatesQuery = useChecklistTemplates(
    { type: 'POST_FLIGHT' },
    outcomeTarget?.kind === 'complete',
  );

  const preFlightItems: readonly string[] =
    preFlightTemplatesQuery.data && preFlightTemplatesQuery.data.length > 0
      ? preFlightTemplatesQuery.data.filter((item) => item.active).map((item) => item.label)
      : PRE_FLIGHT_CHECKLIST_ITEMS;

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
    setInspectedAssetItems((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item],
    );
  };

  const allPreFlightChecked =
    preFlightItems.length > 0 && preFlightChecked.length === preFlightItems.length;
  const canSubmitPreFlight =
    allPreFlightChecked || Boolean(preFlightNote.trim());

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

  return (
    <Box className="workspace-page workspace-page--inspections trace-ledger-workspace" sx={{ maxWidth: 1040, mx: 'auto' }}>
      <Stack spacing={2}>
        {isReinspection && (
          <TargetFlightShotList
            mode="flight-guidance"
            inspectionId={inspectionId}
            sourceInspectionId={inspection?.sourceInspectionId}
            items={verifications.data ?? []}
          />
        )}

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.25}
          sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}
        >
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
            <FlightTakeoffRounded color="primary" />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {t('On-site session')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {inspection?.assetName ?? t('Field session')}
              </Typography>
            </Box>
          </Stack>
        </Stack>

        <QueryState
          isLoading={inspectionQuery.isLoading}
          error={inspectionQuery.error}
          onRetry={() => void inspectionQuery.refetch()}
          loadingLabel={t('Loading inspection…')}
        >
          {inspection && !hasPermit && inspection.status === 'SCHEDULED' ? (
            <Paper className="trace-stage-panel" variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: '8px' }}>
              <Stack spacing={1.5}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {t('Flight permit')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t(
                      'Upload the mission flight document. This records the file only; it does not verify validity or grant permission to fly.',
                    )}
                  </Typography>
                </Box>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ alignItems: { sm: 'center' } }}>
                  <Button
                    component="label"
                    variant="outlined"
                    startIcon={<UploadFileRounded />}
                    sx={{ alignSelf: { sm: 'flex-start' }, maxWidth: '100%' }}
                  >
                    <Box
                      component="span"
                      sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {permitFile?.name ?? t('Choose permit file')}
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
                      startIcon={<VisibilityOutlined />}
                      onClick={() => setPermitPreviewOpen(true)}
                      sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                      {t('Preview file')}
                    </Button>
                  )}
                  <LoadingButton
                    variant="contained"
                    disabled={!permitFile}
                    loading={uploadPermit.isPending}
                    onClick={() => {
                      if (!permitFile) return;
                      uploadPermit.mutate(permitFile, {
                        onSuccess: () => setPermitFile(null),
                      });
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
              </Stack>
            </Paper>
          ) : inspection && hasPermit ? (
            <Paper
              variant="outlined"
              sx={{
                p: 1.5,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                flexWrap: 'wrap',
              }}
            >
              <CheckCircleRounded color="success" />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 650 }}>
                  {t('Flight document recorded')}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {inspection.flightPermitFileName}
                  {inspection.flightPermitUploadedAt
                    ? ` · ${formatDateTime(new Date(inspection.flightPermitUploadedAt))}`
                    : ''}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<VisibilityOutlined fontSize="small" />}
                  onClick={() => setPermitPreviewOpen(true)}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '6px' }}
                >
                  {t('View permit')}
                </Button>
                <Chip size="small" label={t('On file')} color="success" variant="outlined" />
              </Stack>
            </Paper>
          ) : inspection && inspection.status !== 'SCHEDULED' && !hasPermit ? (
            <Alert severity="warning" sx={{ borderRadius: 2 }}>
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

        <QueryState
          isLoading={sessions.isLoading}
          error={sessions.error}
          onRetry={() => void sessions.refetch()}
          loadingLabel={t('Loading field sessions…')}
        >
          {inspection && (
            <Paper className="trace-stage-panel" variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: '8px' }}>
              <Stack spacing={2}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1.5}
                  sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
                >
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {openSession
                        ? t('Session in progress')
                        : canContinueToEvidence
                          ? t('Field session complete')
                          : t('No active session')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
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

                  {openSession ? (
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                      <Button
                        variant="contained"
                        color="success"
                        onClick={() => openOutcomeDialog(openSession, 'complete')}
                      >
                        {t('Complete session')}
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={() => openOutcomeDialog(openSession, 'abort')}
                      >
                        {t('Abort session')}
                      </Button>
                    </Stack>
                  ) : canContinueToEvidence ? (
                    <Stack direction="row" spacing={1}>
                      <Button
                        component={RouterLink}
                        to={isReinspection ? '../findings' : '../evidence'}
                        variant="contained"
                      >
                        {isReinspection ? t('Continue to Defect Verification') : t('Continue to evidence')}
                      </Button>
                    </Stack>
                  ) : (
                    <LoadingButton
                      variant="contained"
                      loading={startSession.isPending}
                      disabled={!canStart}
                      onClick={handleOpenStart}
                    >
                      {t('Start session')}
                    </LoadingButton>
                  )}
                </Stack>

                {openSession?.status === 'IN_PROGRESS' && (
                  <>
                    <SmartDroneHubTelemetryPanel
                      inspectionId={inspectionId}
                      fieldSessionId={openSession.id}
                      sessionActive
                      canViewFlightReport={false}
                    />
                    {assetInspectionItems.length > 0 && (
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 1.75,
                          borderRadius: 2,
                          bgcolor: 'background.default',
                        }}
                      >
                        <Stack
                          direction="row"
                          spacing={1}
                          sx={{
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            mb: 1,
                            flexWrap: 'wrap',
                          }}
                        >
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                              {t('Target Building Inspection Items')} ({inspectedAssetItems.length}/{assetInspectionItems.length})
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {t('Check off each structural item as you fly and capture evidence.')}
                            </Typography>
                          </Box>
                          <Button
                            size="small"
                            variant="text"
                            onClick={() =>
                              setInspectedAssetItems(
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
                        <Box
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                            gap: 1,
                          }}
                        >
                          {assetInspectionItems.map((item, idx) => {
                            const checked = inspectedAssetItems.includes(item);
                            return (
                              <Paper
                                key={idx}
                                variant="outlined"
                                onClick={() => toggleInspectedAssetItem(item)}
                                sx={{
                                  px: 1.25,
                                  py: 0.75,
                                  borderRadius: 1.5,
                                  display: 'flex',
                                  alignItems: 'center',
                                  cursor: 'pointer',
                                  borderColor: checked ? 'success.main' : 'divider',
                                  bgcolor: checked ? 'action.selected' : 'background.paper',
                                }}
                              >
                                <CheckCircleRounded
                                  color={checked ? 'success' : 'disabled'}
                                  sx={{ fontSize: 18, mr: 1, flexShrink: 0, opacity: checked ? 1 : 0.35 }}
                                />
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontSize: '0.82rem',
                                    fontWeight: checked ? 600 : 400,
                                    lineHeight: 1.3,
                                  }}
                                >
                                  {item}
                                </Typography>
                              </Paper>
                            );
                          })}
                        </Box>
                      </Paper>
                    )}
                  </>
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

                {(openSession ?? latestSession)?.preFlightChecklistNote && (
                  <ChecklistNoteDisplay
                    title={t('Pre-flight safety checklist')}
                    rawNote={(openSession ?? latestSession)?.preFlightChecklistNote ?? ''}
                  />
                )}

                {!openSession &&
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
                  <Alert severity="warning" sx={{ borderRadius: 2 }}>
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

        {items.length > 1 && (
          <Box component="details" sx={{ '& > summary': { cursor: 'pointer', color: 'text.secondary' } }}>
            <Typography component="summary" variant="body2">
              {t('Session history')} · {items.length}
            </Typography>
            <Stack spacing={1} sx={{ pt: 1.5 }}>
              {items.slice(0, -1).reverse().map((session) => (
                <Paper key={session.id} variant="outlined" sx={{ p: 1.5, borderRadius: 1.5 }}>
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
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
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
                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
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
                            setInspectedAssetItems(
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

                  <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
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
                    <Alert severity="warning" sx={{ borderRadius: 2 }}>
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
