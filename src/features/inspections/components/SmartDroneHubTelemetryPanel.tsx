import { useEffect, useState, type ChangeEvent } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import FlightTakeoffRounded from '@mui/icons-material/FlightTakeoffRounded';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth/store/authStore';
import { MutationProblemAlert } from '@/shared/ui/MutationProblemAlert';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import {
  fieldSessionKeys,
  type FieldSessionFlight,
} from '../api/fieldSessionApi';
import {
  smartDroneHubApi,
  type SmartDroneHubFlightReport,
  type SmartDroneHubTelemetry,
} from '../api/smartDroneHubApi';

interface Props {
  inspectionId: string;
  fieldSessionId: string;
  flightId?: string | null | undefined;
  flightMeta?: FieldSessionFlight | null | undefined;
  sessionActive: boolean;
  allowFlightLogImport?: boolean | undefined;
  hasFlightReport?: boolean | undefined;
  telemetrySource?: string | null | undefined;
  onTelemetryChange?: ((telemetry: SmartDroneHubTelemetry | null) => void) | undefined;
  onFlightCompleted?: ((report: SmartDroneHubFlightReport) => void) | undefined;
}

function format(value: number | null, digits = 1): string {
  return value == null || !Number.isFinite(value) ? '—' : value.toFixed(digits);
}

function isFallbackSource(source: string | null | undefined): boolean {
  return Boolean(source?.startsWith('IMPORTED_LOG_') || source === 'MANUAL_DECLARATION');
}

function flightLogSourceLabel(source: string | null | undefined, t: (value: string) => string): string {
  if (source === 'MANUAL_DECLARATION') return t('Manual declaration');
  const formatName = source?.startsWith('IMPORTED_LOG_') ? source.slice('IMPORTED_LOG_'.length) : null;
  if (!formatName) return '—';
  return formatName === 'SRT'
    ? t('SRT subtitle log')
    : `${t('Imported log')} · ${formatName}`;
}

function FlightReportSummary({
  sourceLabel,
  isManual,
  selectedFile,
}: {
  sourceLabel: string;
  isManual: boolean;
  selectedFile?: File | null;
}) {
  const { t } = useLocale();
  const detail = isManual ? t('Inspector estimates') : selectedFile?.name ?? sourceLabel;

  return (
    <Alert
      severity="success"
      variant="outlined"
      role="status"
      sx={{ borderColor: 'divider', color: 'text.primary', py: 0.25, alignItems: 'center' }}
    >
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {isManual ? t('Manual declaration saved') : t('Flight log saved')}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
        {detail}
      </Typography>
    </Alert>
  );
}

export function SmartDroneHubTelemetryPanel({
  inspectionId,
  fieldSessionId,
  flightId,
  flightMeta,
  sessionActive,
  allowFlightLogImport = false,
  hasFlightReport = false,
  telemetrySource,
  onTelemetryChange,
  onFlightCompleted,
}: Props) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const isInspector = useAuthStore((state) => state.roles.includes('INSPECTOR'));
  const activeFlightKey = flightId ?? 'session';
  const flightReportQueryKey = flightId
    ? ['smartdronehub', 'flight-report', inspectionId, fieldSessionId, flightId]
    : ['smartdronehub', 'flight-report', inspectionId, fieldSessionId];
  const [startedByKey, setStartedByKey] = useState<Record<string, boolean>>({});
  const [completedByKey, setCompletedByKey] = useState<Record<string, boolean>>({});
  const started = Boolean(startedByKey[activeFlightKey]);
  const flightCompleted = Boolean(completedByKey[activeFlightKey]);
  const setStarted = (value: boolean) =>
    setStartedByKey((prev) => ({ ...prev, [activeFlightKey]: value }));
  const setFlightCompleted = (value: boolean) =>
    setCompletedByKey((prev) => ({ ...prev, [activeFlightKey]: value }));
  const [confirmCompleteOpen, setConfirmCompleteOpen] = useState(false);
  const [confirmRestartOpen, setConfirmRestartOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [reasonCode, setReasonCode] = useState('NO_MAVLINK_SUPPORT');
  const [estimatedDurationMinutes, setEstimatedDurationMinutes] = useState('');
  const [maxAltitudeMeters, setMaxAltitudeMeters] = useState('');
  const [notes, setNotes] = useState('');
  const [confirmedDeclaration, setConfirmedDeclaration] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [savedReportsByKey, setSavedReportsByKey] = useState<Record<string, SmartDroneHubFlightReport | null>>({});
  const [selectedFilesByKey, setSelectedFilesByKey] = useState<Record<string, File | null>>({});
  const savedReport = savedReportsByKey[activeFlightKey] ?? null;
  const selectedFile = selectedFilesByKey[activeFlightKey] ?? null;
  const setSelectedFile = (file: File | null) =>
    setSelectedFilesByKey((prev) => ({ ...prev, [activeFlightKey]: file }));
  const duration = Number(estimatedDurationMinutes);
  const altitude = Number(maxAltitudeMeters);
  const validDuration = estimatedDurationMinutes.trim() !== '' && Number.isInteger(duration) && duration >= 1 && duration <= 720;
  const validAltitude = maxAltitudeMeters.trim() === '' || (Number.isFinite(altitude) && altitude >= 0 && altitude <= 10000);
  const canDeclare = validDuration && validAltitude && notes.trim().length > 0 && notes.length <= 900 && confirmedDeclaration;

  const saveReport = (report: SmartDroneHubFlightReport) => {
    setSavedReportsByKey((prev) => ({ ...prev, [activeFlightKey]: report }));
    setUploadError(null);
    queryClient.setQueryData(flightReportQueryKey, report);
    void queryClient.invalidateQueries({ queryKey: fieldSessionKeys.forInspection(inspectionId) });
    void queryClient.invalidateQueries({ queryKey: fieldSessionKeys.flightsForInspection(inspectionId) });
  };

  const startMission = useMutation({
    mutationFn: (source: 'AUTO' | 'MAVLINK' | 'SIMULATION' = 'AUTO') =>
      flightId
        ? smartDroneHubApi.start(inspectionId, fieldSessionId, source, flightId)
        : smartDroneHubApi.start(inspectionId, fieldSessionId, source),
    onSuccess: (res) => {
      setFlightCompleted(false);
      setStarted(true);
      queryClient.setQueryData(
        ['smartdronehub', 'telemetry', inspectionId, fieldSessionId, activeFlightKey],
        res,
      );
    },
    onSettled: () => setConfirmRestartOpen(false),
  });

  const completeFlight = useMutation({
    mutationFn: () =>
      flightId
        ? smartDroneHubApi.complete(inspectionId, fieldSessionId, flightId)
        : smartDroneHubApi.complete(inspectionId, fieldSessionId),
    onSuccess: (report) => {
      saveReport(report);
      setStarted(false);
      setFlightCompleted(true);
      onFlightCompleted?.(report);
      window.dispatchEvent(new Event('sdi-flight-session-updated'));
    },
    onSettled: () => setConfirmCompleteOpen(false),
  });

  const importFlightLog = useMutation({
    mutationFn: (file: File) =>
      smartDroneHubApi.importFlightLog(inspectionId, fieldSessionId, file, {
        ...(flightId ? { flightId } : {}),
        ...(flightMeta?.flightDate ? { flightDate: flightMeta.flightDate } : {}),
        ...(flightMeta?.flightLabel ? { flightLabel: flightMeta.flightLabel } : {}),
      }),
    onSuccess: (report, file) => {
      saveReport(report);
      setSelectedFile(file);
    },
  });
  const declareManualFlight = useMutation({
    mutationFn: () => {
      const payload = {
        reasonCode,
        estimatedDurationMinutes: duration,
        maxAltitudeMeters: maxAltitudeMeters.trim() ? altitude : null,
        notes: notes.trim(),
        ...(flightMeta?.flightDate ? { flightDate: flightMeta.flightDate } : {}),
        ...(flightMeta?.flightLabel ? { flightLabel: flightMeta.flightLabel } : {}),
      };
      return flightId
        ? smartDroneHubApi.declareManualFlight(inspectionId, fieldSessionId, payload, flightId)
        : smartDroneHubApi.declareManualFlight(inspectionId, fieldSessionId, payload);
    },
    onSuccess: (report) => {
      saveReport(report);
      setSelectedFile(null);
      setManualOpen(false);
      setConfirmedDeclaration(false);
    },
  });

  const effectiveHasReport = Boolean(flightMeta ? flightMeta.hasFlightReport : hasFlightReport);
  const effectiveSource = flightMeta ? flightMeta.telemetrySource : telemetrySource;

  const canImportFallbackLog = (sessionActive || allowFlightLogImport) && isInspector;
  const persistedReport = useQuery({
    queryKey: flightReportQueryKey,
    queryFn: () =>
      flightId
        ? smartDroneHubApi.flightReport(inspectionId, fieldSessionId, flightId)
        : smartDroneHubApi.flightReport(inspectionId, fieldSessionId),
    enabled:
      (!sessionActive || Boolean(flightMeta?.hasFlightReport)) &&
      effectiveHasReport &&
      !savedReport &&
      typeof smartDroneHubApi.flightReport === 'function',
    retry: false,
  });

  const effectiveReport = savedReport ?? persistedReport.data ?? null;
  const reportSource = effectiveReport?.telemetrySource ?? (effectiveHasReport ? effectiveSource : null);
  const hasFallbackReport = isFallbackSource(reportSource);
  const isManualReport = reportSource === 'MANUAL_DECLARATION';
  const isLiveTelemetryCompleted =
    (flightCompleted || (effectiveHasReport && !hasFallbackReport)) && !started;

  const telemetry = useQuery({
    queryKey: ['smartdronehub', 'telemetry', inspectionId, fieldSessionId, activeFlightKey],
    queryFn: () => smartDroneHubApi.telemetry(inspectionId, fieldSessionId, flightId ?? undefined),
    enabled: sessionActive && isInspector && !isLiveTelemetryCompleted,
    refetchInterval: (query) =>
      !isLiveTelemetryCompleted && (started || Boolean(query.state.data)) && sessionActive ? 1500 : false,
    refetchIntervalInBackground: false,
    retry: false,
  });

  const data: SmartDroneHubTelemetry | undefined = telemetry.data ?? startMission.data;
  const isMissionStarted = !isLiveTelemetryCompleted && (started || Boolean(data));
  const isConnected = Boolean(data?.connected);
  const sourceLabel = flightLogSourceLabel(reportSource, t);
  const isSaving = importFlightLog.isPending || declareManualFlight.isPending;

  useEffect(() => {
    onTelemetryChange?.(data ?? null);
  }, [data, onTelemetryChange]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    setUploadError(null);
    importFlightLog.reset();
    if (file.size === 0 || file.size > 15 * 1024 * 1024) {
      setUploadError(t('Select a non-empty flight log no larger than 15 MB.'));
      return;
    }
    importFlightLog.mutate(file);
  };

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
      <Stack spacing={2}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '10px',
                bgcolor: isConnected ? 'rgba(22, 163, 74, 0.12)' : '#EFF3FF',
                color: isConnected ? '#16A34A' : '#2B84EB',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              <FlightTakeoffRounded sx={{ fontSize: 20 }} />
            </Box>
            <Box>
              <Typography variant="subtitle1" sx={{ fontSize: '0.9375rem', fontWeight: 600, color: 'text.primary' }}>
                {t('SmartDroneHub telemetry')}
              </Typography>
            </Box>
          </Stack>
          {sessionActive && isInspector && isMissionStarted && (
            <Button
              variant="contained"
              color="primary"
              size="small"
              onClick={() => setConfirmCompleteOpen(true)}
              disabled={completeFlight.isPending}
              sx={{
                borderRadius: '8px',
                textTransform: 'none',
                fontWeight: 600,
                px: 1.75,
              }}
            >
              {completeFlight.isPending ? t('Completing flight…') : t('Complete flight')}
            </Button>
          )}
        </Stack>

        {!sessionActive && !canImportFallbackLog && hasFallbackReport ? (
          <FlightReportSummary sourceLabel={sourceLabel} isManual={isManualReport} />
        ) : null}

        {!sessionActive ? (
          <Alert severity="info">
            {t('Field session is closed. Live telemetry stream has ended. The automated Flight Operations Report is available in Step 7 (Report).')}
          </Alert>
        ) : null}

        {sessionActive && isInspector && !isMissionStarted ? (
          <Box
            sx={{
              p: 2,
              borderRadius: '10px',
              bgcolor: 'background.paper',
              border: '1px dashed',
              borderColor: 'divider',
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'flex-start', sm: 'center' },
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              {isLiveTelemetryCompleted
                ? t('Flight telemetry completed. If Post-flight is not finished yet, you can reconnect to restart live telemetry or upload a flight log below.')
                : t('Connect a live telemetry source to record the session in real time.')}
            </Typography>
            <Button
              variant={isLiveTelemetryCompleted ? 'outlined' : 'contained'}
              size="medium"
              startIcon={<FlightTakeoffRounded />}
              onClick={() =>
                isLiveTelemetryCompleted
                  ? setConfirmRestartOpen(true)
                  : startMission.mutate('AUTO')
              }
              disabled={startMission.isPending}
              sx={{
                borderRadius: '8px',
                px: 2.5,
                py: 1,
                textTransform: 'none',
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {startMission.isPending
                ? t('Connecting…')
                : isLiveTelemetryCompleted
                  ? t('Reconnect flight telemetry')
                  : t('Connect Flight Operations')}
            </Button>
          </Box>
        ) : isMissionStarted && sessionActive ? (
          <>
            {!isConnected && (
              <Alert severity="warning">
                {t('No MAVLink connection detected. Open Mission Planner (or connect your drone telemetry) to stream live flight data.')}
              </Alert>
            )}
            <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
              <Chip
                size="small"
                color={isConnected ? 'default' : 'warning'}
                variant={isConnected ? 'filled' : 'outlined'}
                label={`${t('State')}: ${isConnected ? (data?.missionState ?? '—') : t('NOT CONNECTED')}`}
              />
              <Chip
                size="small"
                label={`${t('Mode')}: ${isConnected ? (data?.flightMode ?? '—') : '—'}`}
              />
              <Chip
                size="small"
                label={`${t('Armed')}: ${!isConnected || data?.armed == null ? '—' : data.armed ? t('Yes') : t('No')}`}
              />
              {isConnected && data?.distanceFlownMeters != null && (
                <Chip
                  size="small"
                  color={data.distanceFlownMeters > 0 ? 'success' : 'default'}
                  variant="outlined"
                  label={`${t('Distance')}: ${format(data.distanceFlownMeters, 1)} m`}
                />
              )}
            </Stack>
            {telemetry.isError && (
              <Alert severity="warning">{t('Telemetry unavailable. Check the Mission Planner UDP forward or Hub connection.')}</Alert>
            )}
            <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="body2">
                GPS: {!isConnected || data?.latitude == null || data.longitude == null ? '—' : `${format(data.latitude, 6)}, ${format(data.longitude, 6)}`}
              </Typography>
              <Typography variant="body2">
                {t('Altitude')}: {isConnected ? format(data?.altitudeMeters ?? null) : '—'} m
              </Typography>
              <Typography variant="body2">
                {t('Speed')}: {isConnected ? format(data?.groundSpeedMps ?? null) : '—'} m/s
              </Typography>
              <Typography variant="body2">
                {t('Heading')}: {isConnected ? format(data?.headingDeg ?? null, 0) : '—'}°
              </Typography>
              <Typography variant="body2">
                {t('Battery')}: {!isConnected || data?.batteryPercent == null ? '—' : `${data.batteryPercent}%`}
              </Typography>
              <Typography variant="body2">
                {t('Waypoint')}: {isConnected ? (data?.currentWaypoint ?? '—') : '—'}
              </Typography>
            </Stack>
            <Box sx={{ p: 2, borderRadius: '10px', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  {t('Live Gimbal Camera & Telemetry Feed')}
                </Typography>
                <Chip
                  size="small"
                  color={isConnected ? 'success' : 'default'}
                  variant="outlined"
                  label={isConnected ? t('Gimbal Active') : t('Disconnected')}
                  sx={{ height: 22, fontSize: '0.75rem' }}
                />
              </Stack>
            </Box>
          </>
        ) : null}

        {canImportFallbackLog && (
          <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: '10px', bgcolor: 'background.paper' }}>
            <Stack spacing={1.5}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{t('No MAVLink? Import a flight log')}</Typography>
              <Typography variant="body2" color="text.secondary">{t('Import a GPS track from SRT, CSV, KML or GPX.')}</Typography>
              {hasFallbackReport && <FlightReportSummary sourceLabel={sourceLabel} isManual={isManualReport} selectedFile={selectedFile} />}
              <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 1.5, alignItems: { sm: 'center' } }}>
                <Button component="label" variant="outlined" disabled={isSaving} sx={{ alignSelf: 'flex-start', borderRadius: '8px', textTransform: 'none' }}>
                  {importFlightLog.isPending ? t('Parsing flight log…') : hasFallbackReport ? t('Upload another log') : t('Choose log')}
                  <input hidden type="file" aria-label={t('Choose log')} accept=".srt,.csv,.kml,.gpx" onChange={handleFileChange} />
                </Button>
                <Typography variant="caption" color="text.secondary">{t('Max 15 MB')}</Typography>
              </Stack>
              {uploadError && <Alert severity="error" role="alert">{uploadError}</Alert>}
              <MutationProblemAlert error={importFlightLog.error} isError={importFlightLog.isError} fallbackMessage={t('The flight log could not be parsed. Check the format and GPS data, then try again.')} />
              <Button variant="text" onClick={() => setManualOpen((value) => !value)} sx={{ alignSelf: 'flex-start', textTransform: 'none' }}>
                {manualOpen ? t('Hide manual declaration') : t('No supported log? Declare flight manually')}
              </Button>
              {manualOpen && (
                <Stack spacing={1.5}>
                  <Alert severity="info">{t('This records your declaration only. It does not create telemetry, validate flight conditions, or verify landing.')}</Alert>
                  <TextField select label={t('Reason for no telemetry')} value={reasonCode} onChange={(event) => setReasonCode(event.target.value)} slotProps={{ select: { native: true } }}>
                    <option value="NO_MAVLINK_SUPPORT">{t('Drone does not support MAVLink')}</option>
                    <option value="PROPRIETARY_APP">{t('Manufacturer app does not export a supported log')}</option>
                    <option value="TELEMETRY_FAILURE">{t('Telemetry failed at the site')}</option>
                  </TextField>
                  <TextField type="number" label={t('Estimated flight duration (minutes)')} slotProps={{ htmlInput: { min: 1, max: 720 } }} value={estimatedDurationMinutes} onChange={(event) => setEstimatedDurationMinutes(event.target.value)} />
                  <TextField type="number" label={t('Estimated maximum altitude (meters, optional)')} slotProps={{ htmlInput: { min: 0, max: 10000 } }} value={maxAltitudeMeters} onChange={(event) => setMaxAltitudeMeters(event.target.value)} />
                  <TextField multiline minRows={2} label={t('Field note')} slotProps={{ htmlInput: { maxLength: 900 } }} value={notes} onChange={(event) => setNotes(event.target.value)} helperText={`${notes.length}/900`} />
                  <FormControlLabel
                    control={<Checkbox checked={confirmedDeclaration} onChange={(event) => setConfirmedDeclaration(event.target.checked)} />}
                    label={t('I confirm this is my field declaration, and any measurements above are estimates.')}
                  />
                  <Button variant="contained" onClick={() => declareManualFlight.mutate()} disabled={isSaving || !canDeclare} sx={{ alignSelf: 'flex-start', borderRadius: '8px', textTransform: 'none' }}>
                    {declareManualFlight.isPending ? t('Saving declaration…') : t('Save manual declaration')}
                  </Button>
                  <MutationProblemAlert error={declareManualFlight.error} isError={declareManualFlight.isError} fallbackMessage={t('Could not save the manual flight declaration.')} />
                </Stack>
              )}
            </Stack>
          </Box>
        )}

        <MutationProblemAlert error={startMission.error} isError={startMission.isError} fallbackMessage={t('Could not connect to SmartDroneHub.')} />
        <MutationProblemAlert error={completeFlight.error} isError={completeFlight.isError} fallbackMessage={t('Could not complete flight telemetry.')} />
      </Stack>

      <Dialog open={confirmCompleteOpen} onClose={() => !completeFlight.isPending && setConfirmCompleteOpen(false)}>
        <DialogTitle>{t('Complete flight telemetry?')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('This saves the current flight report for this session. If Post-flight is not completed yet, you can still reconnect telemetry or upload a flight log later.')}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmCompleteOpen(false)} disabled={completeFlight.isPending} sx={{ textTransform: 'none' }}>
            {t('Cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={() => completeFlight.mutate()}
            disabled={completeFlight.isPending}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            {completeFlight.isPending ? t('Completing flight…') : t('Confirm complete flight')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmRestartOpen} onClose={() => !startMission.isPending && setConfirmRestartOpen(false)}>
        <DialogTitle>{t('Reconnect flight telemetry?')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('Starting a new live telemetry stream will replace the saved flight report once you complete the flight again. Alternatively, upload a flight log below.')}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmRestartOpen(false)} disabled={startMission.isPending} sx={{ textTransform: 'none' }}>
            {t('Cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={() => startMission.mutate('AUTO')}
            disabled={startMission.isPending}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            {startMission.isPending ? t('Connecting…') : t('Start telemetry again')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
