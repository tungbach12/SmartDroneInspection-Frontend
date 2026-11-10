import { useEffect, useState, type ChangeEvent } from 'react';
import { Alert, Box, Button, Checkbox, Chip, FormControlLabel, Stack, TextField, Typography } from '@mui/material';
import FlightTakeoffRounded from '@mui/icons-material/FlightTakeoffRounded';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth/store/authStore';
import { MutationProblemAlert } from '@/shared/ui/MutationProblemAlert';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { fieldSessionKeys } from '../api/fieldSessionApi';
import {
  smartDroneHubApi,
  type SmartDroneHubFlightReport,
  type SmartDroneHubTelemetry,
} from '../api/smartDroneHubApi';

interface Props {
  inspectionId: string;
  fieldSessionId: string;
  sessionActive: boolean;
  hasFlightReport?: boolean | undefined;
  telemetrySource?: string | null | undefined;
  onTelemetryChange?: ((telemetry: SmartDroneHubTelemetry | null) => void) | undefined;
}

function format(value: number | null, digits = 1): string {
  return value == null || !Number.isFinite(value) ? '—' : value.toFixed(digits);
}

function isFallbackSource(source: string | null | undefined): boolean {
  return Boolean(source?.startsWith('IMPORTED_LOG_') || source === 'MANUAL_DECLARATION');
}

function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return '—';
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
    : `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
  report,
  sourceLabel,
  isManual,
  selectedFile,
}: {
  report: SmartDroneHubFlightReport | null;
  sourceLabel: string;
  isManual: boolean;
  selectedFile?: File | null;
}) {
  const { formatDateTime, t } = useLocale();
  const duration = report?.durationSeconds;
  const distance = report?.distanceFlownMeters;
  const startedAt = report?.startedAt;
  const endedAt = report?.endedAt;
  const finalState = report?.finalState;
  const traceCount = report?.flightTrace?.length;

  return (
    <Alert severity="success" icon={false}>
      <Stack spacing={1}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {isManual ? t('Manual flight declaration recorded') : t('Flight log report recorded')}
        </Typography>
        {selectedFile && (
          <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
            {selectedFile.name} · {selectedFile.name.split('.').at(-1)?.toUpperCase() ?? t('Unknown format')} · {formatFileSize(selectedFile.size)}
          </Typography>
        )}
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1.5 }}>
          <Typography variant="body2">{t('Source')}: {sourceLabel}</Typography>
          <Typography variant="body2">{t('Trace points')}: {traceCount ?? '—'}</Typography>
          <Typography variant="body2">{t('Duration')}: {formatDuration(duration)}</Typography>
          <Typography variant="body2">{t('Distance')}: {distance == null ? '—' : `${format(distance)} m`}</Typography>
          <Typography variant="body2">{t('Started')}: {startedAt ? formatDateTime(startedAt) : '—'}</Typography>
          <Typography variant="body2">{t('Ended')}: {endedAt ? formatDateTime(endedAt) : '—'}</Typography>
          <Typography variant="body2">
            {t('Recorded flight state')}: {finalState == null || (finalState === 'LANDED' && (sourceLabel === t('Manual declaration') || sourceLabel.includes(t('Imported log')))) ? '—' : finalState}
          </Typography>
        </Stack>
        {isManual ? (
          <Typography variant="caption" color="text.secondary">
            {t('Inspector declaration only; values are estimates, not telemetry or independent verification.')}
          </Typography>
        ) : sourceLabel === t('SRT subtitle log') ? (
          <Typography variant="caption" color="text.secondary">
            {t('SRT subtitles can contain a partial trace. This record does not establish a complete flight or confirm landing.')}
          </Typography>
        ) : (
          <Typography variant="caption" color="text.secondary">
            {t('This is a recorded file, not a live telemetry connection or independent verification of legal clearance or landing.')}
          </Typography>
        )}
      </Stack>
    </Alert>
  );
}

export function SmartDroneHubTelemetryPanel({
  inspectionId,
  fieldSessionId,
  sessionActive,
  hasFlightReport = false,
  telemetrySource,
  onTelemetryChange,
}: Props) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const isInspector = useAuthStore((state) => state.roles.includes('INSPECTOR'));
  const [started, setStarted] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [reasonCode, setReasonCode] = useState('NO_MAVLINK_SUPPORT');
  const [estimatedDurationMinutes, setEstimatedDurationMinutes] = useState('');
  const [maxAltitudeMeters, setMaxAltitudeMeters] = useState('');
  const [notes, setNotes] = useState('');
  const [confirmedDeclaration, setConfirmedDeclaration] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [savedReport, setSavedReport] = useState<SmartDroneHubFlightReport | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const duration = Number(estimatedDurationMinutes);
  const altitude = Number(maxAltitudeMeters);
  const validDuration = estimatedDurationMinutes.trim() !== '' && Number.isInteger(duration) && duration >= 1 && duration <= 720;
  const validAltitude = maxAltitudeMeters.trim() === '' || (Number.isFinite(altitude) && altitude >= 0 && altitude <= 10000);
  const canDeclare = validDuration && validAltitude && notes.trim().length > 0 && notes.length <= 900 && confirmedDeclaration;

  const saveReport = (report: SmartDroneHubFlightReport) => {
    setSavedReport(report);
    setUploadError(null);
    queryClient.setQueryData(['smartdronehub', 'flight-report', inspectionId, fieldSessionId], report);
    void queryClient.invalidateQueries({ queryKey: fieldSessionKeys.forInspection(inspectionId) });
  };

  const startMission = useMutation({
    mutationFn: (source: 'AUTO' | 'MAVLINK' | 'SIMULATION' = 'AUTO') =>
      smartDroneHubApi.start(inspectionId, fieldSessionId, source),
    onSuccess: (res) => {
      setStarted(true);
      queryClient.setQueryData(
        ['smartdronehub', 'telemetry', inspectionId, fieldSessionId],
        res,
      );
    },
  });

  const importFlightLog = useMutation({
    mutationFn: (file: File) => smartDroneHubApi.importFlightLog(inspectionId, fieldSessionId, file),
    onSuccess: (report, file) => {
      saveReport(report);
      setSelectedFile(file);
    },
  });
  const declareManualFlight = useMutation({
    mutationFn: () => smartDroneHubApi.declareManualFlight(inspectionId, fieldSessionId, {
      reasonCode,
      estimatedDurationMinutes: duration,
      maxAltitudeMeters: maxAltitudeMeters.trim() ? altitude : null,
      notes: notes.trim(),
    }),
    onSuccess: (report) => {
      saveReport(report);
      setSelectedFile(null);
      setManualOpen(false);
      setConfirmedDeclaration(false);
    },
  });

  const telemetry = useQuery({
    queryKey: ['smartdronehub', 'telemetry', inspectionId, fieldSessionId],
    queryFn: () => smartDroneHubApi.telemetry(inspectionId, fieldSessionId),
    enabled: sessionActive && isInspector,
    refetchInterval: (query) =>
      (started || Boolean(query.state.data)) && sessionActive ? 1500 : false,
    refetchIntervalInBackground: false,
    retry: false,
  });

  const data: SmartDroneHubTelemetry | undefined = telemetry.data ?? startMission.data;
  const isMissionStarted = started || Boolean(data);
  const isConnected = Boolean(data?.connected);
  const reportSource = savedReport?.telemetrySource ?? (hasFlightReport ? telemetrySource : null);
  const hasFallbackReport = isFallbackSource(reportSource);
  const isManualReport = reportSource === 'MANUAL_DECLARATION';
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
                color: isConnected ? '#16A34A' : '#3758F9',
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
          {data && (
            <Chip
              size="small"
              color={isConnected ? 'success' : 'warning'}
              variant={isConnected ? 'filled' : 'outlined'}
              label={
                isConnected
                  ? t('Flight telemetry online (MAVLink live)')
                  : t('Not connected · Mission Planner offline')
              }
            />
          )}
        </Stack>

        {!sessionActive && hasFallbackReport ? (
          <FlightReportSummary report={savedReport} sourceLabel={sourceLabel} isManual={isManualReport} />
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
              {t('Connect a live telemetry source to record the session in real time.')}
            </Typography>
            <Button
              variant="contained"
              size="medium"
              startIcon={<FlightTakeoffRounded />}
              onClick={() => startMission.mutate('AUTO')}
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
              {startMission.isPending ? t('Connecting…') : t('Connect Flight Operations')}
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

        {sessionActive && isInspector && (
          <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: '10px', bgcolor: 'background.paper' }}>
            <Stack spacing={1.5}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{t('No MAVLink? Import a flight log')}</Typography>
              <Typography variant="body2" color="text.secondary">{t('Import a GPS track from SRT, CSV, KML or GPX.')}</Typography>
              {hasFallbackReport && <FlightReportSummary report={savedReport} sourceLabel={sourceLabel} isManual={isManualReport} selectedFile={selectedFile} />}
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
      </Stack>
    </Box>
  );
}
