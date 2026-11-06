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
import { FlightOperationsReportView } from '@/features/reports/components/FlightOperationsReportView';
import { useChecklistTemplates } from '@/features/assets/hooks/useCatalog';
import type { FieldSession } from '../api/fieldSessionApi';
import { useLocale } from '@/shared/i18n/LocaleProvider';

const PRE_FLIGHT_CHECKLIST_ITEMS = [
  'Airframe, propellers & gimbal camera intact',
  'UAV & controller battery >= 85%, locked securely',
  'GPS 3D Fix / RTK & compass calibrated',
  'Return-to-Home (RTH) altitude set above structure',
  'Weather, wind speed & takeoff/landing zone clear',
] as const;

const POST_FLIGHT_CHECKLIST_ITEMS = [
  'UAV landed safely, motors disarmed & battery removed',
  'Airframe, motors & payload free of post-flight damage',
  'All target asset components scanned per plan',
  'Captured photos & flight telemetry verified on site',
] as const;

const ABORT_REASON_PRESETS = [
  'Sudden adverse weather / high wind',
  'GPS signal loss / magnetic interference',
  'UAV battery or hardware warning',
  'Site safety hazard / airspace intrusion',
] as const;

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
  const [startOpen, setStartOpen] = useState(false);
  const [preFlightChecked, setPreFlightChecked] = useState<string[]>([]);
  const [preFlightNote, setPreFlightNote] = useState('');
  const [outcomeTarget, setOutcomeTarget] = useState<{
    session: FieldSession;
    kind: 'abort' | 'complete';
  } | null>(null);
  const [postFlightChecked, setPostFlightChecked] = useState<string[]>([]);
  const [abortCategory, setAbortCategory] = useState<string | null>(null);
  const [outcomeReason, setOutcomeReason] = useState('');
  const abortReasonInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

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

  const allPreFlightChecked =
    preFlightItems.length > 0 && preFlightChecked.length === preFlightItems.length;
  const canSubmitPreFlight =
    allPreFlightChecked || Boolean(preFlightNote.trim());

  const allPostFlightChecked =
    postFlightItems.length > 0 && postFlightChecked.length === postFlightItems.length;
  const canSubmitOutcome =
    outcomeTarget?.kind === 'complete'
      ? allPostFlightChecked || Boolean(outcomeReason.trim())
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
    const checkedSummary = postFlightChecked.map((item) => `[✓] ${t(item)}`).join(' · ');
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
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
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
              sx={{ p: 1.5, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1.25 }}
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
              <Chip size="small" label={t('On file')} color="success" variant="outlined" />
            </Paper>
          ) : inspection && inspection.status !== 'SCHEDULED' && !hasPermit ? (
            <Alert severity="warning" sx={{ borderRadius: 2 }}>
              {t('No flight document is recorded. Contact the inspection manager before starting field work.')}
            </Alert>
          ) : null}
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
                          ? latestSession?.outcomeNotes ?? t('The latest field session is complete.')
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
                  <SmartDroneHubTelemetryPanel
                    inspectionId={inspectionId}
                    fieldSessionId={openSession.id}
                    sessionActive
                    canViewFlightReport={false}
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

                {(openSession ?? latestSession)?.preFlightChecklistNote && (
                  <Box sx={{ pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
                    <Typography variant="caption" color="text.secondary">
                      {t('Pre-flight note')}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      {(openSession ?? latestSession)?.preFlightChecklistNote}
                    </Typography>
                  </Box>
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
                required={outcomeTarget?.kind === 'abort'}
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
                    ? t('Optional summary or observations from the flight.')
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
