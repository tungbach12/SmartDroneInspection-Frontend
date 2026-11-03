import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import CameraAltRounded from '@mui/icons-material/CameraAltRounded';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import FlightTakeoffRounded from '@mui/icons-material/FlightTakeoffRounded';
import MovieCreationRounded from '@mui/icons-material/MovieCreationRounded';
import RouteRounded from '@mui/icons-material/RouteRounded';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth/store/authStore';
import { MutationProblemAlert } from '@/shared/ui/MutationProblemAlert';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import {
  smartDroneHubApi,
  type SmartDroneHubFlightTracePoint,
  type SmartDroneHubTelemetry,
} from '../api/smartDroneHubApi';
import { fieldSessionKeys } from '../api/fieldSessionApi';
import { inspectionKeys } from '../hooks/useInspections';

interface Props {
  inspectionId: string;
  fieldSessionId: string;
  sessionActive: boolean;
  canViewFlightReport: boolean;
}

function format(value: number | null, digits = 1): string {
  return value == null || !Number.isFinite(value) ? '—' : value.toFixed(digits);
}

function FlightTraceVisualization({ trace }: { trace: SmartDroneHubFlightTracePoint[] }) {
  const { t } = useLocale();
  if (!trace || trace.length < 2) return null;

  const lats = trace.map((p) => p.latitude);
  const lons = trace.map((p) => p.longitude);
  const alts = trace.map((p) => p.altitudeMeters ?? 0);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const maxAlt = Math.max(48, ...alts);
  const latSpan = Math.max(maxLat - minLat, 0.00018);
  const lonSpan = Math.max(maxLon - minLon, 0.00018);

  const mapW = 320;
  const mapH = 210;
  const pad = 28;

  const toMapXY = (lat: number, lon: number) => {
    const x = pad + ((lon - minLon) / lonSpan) * (mapW - pad * 2);
    const y = mapH - pad - ((lat - minLat) / latSpan) * (mapH - pad * 2);
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
  };

  const pathPoints = trace
    .map((pt) => {
      const { x, y } = toMapXY(pt.latitude, pt.longitude);
      return `${x},${y}`;
    })
    .join(' ');

  const chartW = 360;
  const chartH = 210;
  const cPadX = 34;
  const cPadY = 26;
  const altPoints = trace
    .map((pt, idx) => {
      const x =
        cPadX + (idx / Math.max(1, trace.length - 1)) * (chartW - cPadX - 18);
      const y =
        chartH -
        cPadY -
        ((pt.altitudeMeters ?? 0) / maxAlt) * (chartH - cPadY * 2);
      return `${Math.round(x * 10) / 10},${Math.round(y * 10) / 10}`;
    })
    .join(' ');

  return (
    <Paper variant="outlined" sx={{ p: 1.75, borderRadius: 2, bgcolor: 'background.default' }}>
      <Stack spacing={1.25}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            <RouteRounded fontSize="small" color="primary" />
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {t('Recorded Flight Path & Altitude Profile (Inspector / Manager Audit)')}
            </Typography>
          </Stack>
          <Chip
            size="small"
            variant="outlined"
            color="primary"
            label={`${trace.length} ${t('telemetry waypoints recorded')}`}
          />
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1.15fr' },
            gap: 1.5,
          }}
        >
          {/* 2D Top-Down Building Orbit Map */}
          <Box
            sx={{
              p: 1,
              borderRadius: 1.5,
              bgcolor: '#0f172a',
              color: '#e2e8f0',
              border: '1px solid rgba(148, 163, 184, 0.25)',
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 600, color: '#94a3b8', display: 'block', mb: 0.5 }}>
              {t('2D Top-Down GPS Orbit Trace (N/E/S/W Facades)')}
            </Typography>
            <Box component="svg" viewBox={`0 0 ${mapW} ${mapH}`} sx={{ width: '100%', height: 175, display: 'block' }}>
              <rect x={mapW / 2 - 36} y={mapH / 2 - 32} width={72} height={64} rx={4} fill="#334155" stroke="#94a3b8" strokeWidth={1.5} />
              <text x={mapW / 2} y={mapH / 2 + 4} textAnchor="middle" fill="#f8fafc" fontSize="10" fontWeight="700">
                ASSET 3D
              </text>
              <text x={mapW / 2} y={14} textAnchor="middle" fill="#64748b" fontSize="9" fontWeight="700">N</text>
              <text x={mapW - 10} y={mapH / 2 + 3} textAnchor="middle" fill="#64748b" fontSize="9" fontWeight="700">E</text>
              <text x={mapW / 2} y={mapH - 6} textAnchor="middle" fill="#64748b" fontSize="9" fontWeight="700">S</text>
              <text x={10} y={mapH / 2 + 3} textAnchor="middle" fill="#64748b" fontSize="9" fontWeight="700">W</text>

              <polyline
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2.25"
                strokeDasharray="4 2"
                points={pathPoints}
              />
              {trace.map((pt, idx) => {
                const { x, y } = toMapXY(pt.latitude, pt.longitude);
                const isFirst = idx === 0;
                const isLast = idx === trace.length - 1;
                return (
                  <g key={`${pt.latitude}-${pt.longitude}-${idx}`}>
                    <circle
                      cx={x}
                      cy={y}
                      r={isFirst || isLast ? 5 : 3.5}
                      fill={isFirst ? '#22c55e' : isLast ? '#f59e0b' : '#38bdf8'}
                      stroke="#0f172a"
                      strokeWidth="1.2"
                    />
                    {pt.waypoint != null && pt.waypoint > 0 && (
                      <text x={x + 6} y={y - 4} fill="#e2e8f0" fontSize="8.5" fontWeight="600">
                        WP{pt.waypoint}
                      </text>
                    )}
                  </g>
                );
              })}
            </Box>
          </Box>

          {/* Altitude Profile Chart */}
          <Box
            sx={{
              p: 1,
              borderRadius: 1.5,
              bgcolor: '#0f172a',
              color: '#e2e8f0',
              border: '1px solid rgba(148, 163, 184, 0.25)',
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 600, color: '#94a3b8', display: 'block', mb: 0.5 }}>
              {t('Vertical Altitude Profile (m AGL vs Waypoints)')}
            </Typography>
            <Box component="svg" viewBox={`0 0 ${chartW} ${chartH}`} sx={{ width: '100%', height: 175, display: 'block' }}>
              {[0, 0.5, 1].map((ratio) => {
                const y = chartH - cPadY - ratio * (chartH - cPadY * 2);
                const labelVal = Math.round(ratio * maxAlt);
                return (
                  <g key={ratio}>
                    <line x1={cPadX} y1={y} x2={chartW - 14} y2={y} stroke="#1e293b" strokeWidth="1" />
                    <text x={cPadX - 6} y={y + 3} textAnchor="end" fill="#64748b" fontSize="9">
                      {labelVal}m
                    </text>
                  </g>
                );
              })}
              <polyline fill="none" stroke="#34d399" strokeWidth="2.5" points={altPoints} />
              {trace.map((pt, idx) => {
                const x =
                  cPadX + (idx / Math.max(1, trace.length - 1)) * (chartW - cPadX - 18);
                const y =
                  chartH -
                  cPadY -
                  ((pt.altitudeMeters ?? 0) / maxAlt) * (chartH - cPadY * 2);
                return (
                  <g key={`alt-${idx}`}>
                    <circle cx={x} cy={y} r={3.5} fill="#34d399" />
                    {pt.altitudeMeters != null && (idx % 2 === 1 || idx === trace.length - 1) && (
                      <text x={x} y={y - 6} textAnchor="middle" fill="#a7f3d0" fontSize="8.5">
                        {pt.altitudeMeters.toFixed(0)}m
                      </text>
                    )}
                  </g>
                );
              })}
            </Box>
          </Box>
        </Box>
      </Stack>
    </Paper>
  );
}

export function SmartDroneHubTelemetryPanel({
  inspectionId,
  fieldSessionId,
  sessionActive,
  canViewFlightReport,
}: Props) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const isInspector = useAuthStore((state) => state.roles.includes('INSPECTOR'));
  const [started, setStarted] = useState(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  const startMission = useMutation({
    mutationFn: (source: 'MAVLINK' | 'SIMULATION') =>
      smartDroneHubApi.start(inspectionId, fieldSessionId, source),
    onSuccess: () => setStarted(true),
  });

  const captureMutation = useMutation({
    mutationFn: () => smartDroneHubApi.captureFrame(inspectionId, fieldSessionId),
    onSuccess: (item) => {
      setStatusBanner(
        `${t('Captured camera frame saved to Evidence')}: ${item.fileName}`,
      );
      void queryClient.invalidateQueries({ queryKey: inspectionKeys.evidence(inspectionId) });
    },
  });

  const syncVideoMutation = useMutation({
    mutationFn: () => smartDroneHubApi.syncVideo(inspectionId, fieldSessionId),
    onSuccess: (item) => {
      setStatusBanner(
        `${t('Flight mission video synced to Evidence')}: ${item.fileName}`,
      );
      void queryClient.invalidateQueries({ queryKey: inspectionKeys.evidence(inspectionId) });
      void queryClient.invalidateQueries({
        queryKey: ['smartdronehub', 'flight-report', inspectionId, fieldSessionId],
      });
      void queryClient.invalidateQueries({
        queryKey: fieldSessionKeys.forInspection(inspectionId),
      });
    },
  });

  const telemetry = useQuery({
    queryKey: ['smartdronehub', 'telemetry', inspectionId, fieldSessionId],
    queryFn: () => smartDroneHubApi.telemetry(inspectionId, fieldSessionId),
    enabled: started && sessionActive && isInspector,
    refetchInterval: started ? 1500 : false,
    refetchIntervalInBackground: false,
    retry: false,
  });

  const flightReport = useQuery({
    queryKey: ['smartdronehub', 'flight-report', inspectionId, fieldSessionId],
    queryFn: () => smartDroneHubApi.flightReport(inspectionId, fieldSessionId),
    enabled: canViewFlightReport,
    retry: false,
  });

  const data: SmartDroneHubTelemetry | undefined = telemetry.data ?? startMission.data;
  const reportData = flightReport.data;
  const videoSynced = Boolean(reportData?.flightVideoEvidenceId || syncVideoMutation.data?.id);

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <FlightTakeoffRounded color="primary" />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{t('SmartDroneHub telemetry')}</Typography>
          </Stack>
          {data && (
            <Chip
              size="small"
              color={data.telemetrySource === 'MISSION_PLANNER_MAVLINK' && data.connected ? 'success' : 'info'}
              label={data.telemetrySource === 'MISSION_PLANNER_MAVLINK'
                ? (data.connected ? t('Mission Planner MAVLink live') : t('MAVLink telemetry stale'))
                : t('Demo telemetry (not aircraft control)')}
            />
          )}
        </Stack>

        <Typography variant="body2" color="text.secondary">
          {t('Read-only telemetry bridge. It does not arm or control a drone. Checkpoints are not a route; camera evidence must come from a real camera stream or manual upload.')}
        </Typography>

        {!sessionActive && canViewFlightReport ? (
          <Alert severity="info">
            {t('Field session is closed. Live telemetry has stopped; the session flight report and recorded flight trace remain available.')}
          </Alert>
        ) : null}

        {sessionActive && isInspector && !started ? (
          <Stack spacing={1}>
            <Typography variant="caption" color="text.secondary">
              {t('Choose a read-only live Mission Planner MAVLink feed, or a separately labelled telemetry simulation. The Hub never controls the aircraft.')}
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button
                variant="contained"
                onClick={() => startMission.mutate('MAVLINK')}
                disabled={startMission.isPending}
              >
                {t('Connect live MAVLink')}
              </Button>
              <Button
                variant="outlined"
                onClick={() => startMission.mutate('SIMULATION')}
                disabled={startMission.isPending}
              >
                {t('Start telemetry simulation')}
              </Button>
            </Stack>
          </Stack>
        ) : started && sessionActive ? (
          <>
            <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
              <Chip size="small" label={`${t('State')}: ${data?.missionState ?? '—'}`} />
              <Chip size="small" label={`${t('Mode')}: ${data?.flightMode ?? '—'}`} />
              <Chip size="small" label={`${t('Armed')}: ${data?.armed == null ? '—' : data.armed ? t('Yes') : t('No')}`} />
            </Stack>
            {telemetry.isError && (
              <Alert severity="warning">{t('Telemetry unavailable. Check the Mission Planner UDP forward or Hub connection.')}</Alert>
            )}
            <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="body2">GPS: {data?.latitude == null || data.longitude == null ? '—' : `${format(data.latitude, 6)}, ${format(data.longitude, 6)}`}</Typography>
              <Typography variant="body2">{t('Altitude')}: {format(data?.altitudeMeters ?? null)} m</Typography>
              <Typography variant="body2">{t('Speed')}: {format(data?.groundSpeedMps ?? null)} m/s</Typography>
              <Typography variant="body2">{t('Heading')}: {format(data?.headingDeg ?? null, 0)}°</Typography>
              <Typography variant="body2">{t('Battery')}: {data?.batteryPercent == null ? '—' : `${data.batteryPercent}%`}</Typography>
              <Typography variant="body2">{t('Waypoint')}: {data?.currentWaypoint ?? '—'}</Typography>
            </Stack>
            <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 1.5, bgcolor: 'background.default' }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                  📹 {t('Live Gimbal Camera Stream (Simulator / On-board RTSP)')}
                </Typography>
                {isInspector && (
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<CameraAltRounded fontSize="small" />}
                      disabled={captureMutation.isPending}
                      onClick={() => captureMutation.mutate()}
                      sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                      {captureMutation.isPending
                        ? t('Capturing…')
                        : t('Capture frame to Evidence')}
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<MovieCreationRounded fontSize="small" />}
                      disabled={syncVideoMutation.isPending}
                      onClick={() => syncVideoMutation.mutate()}
                      sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                      {syncVideoMutation.isPending
                        ? t('Syncing video…')
                        : t('Sync Flight Video (MP4)')}
                    </Button>
                  </Stack>
                )}
              </Stack>
              <Box
                component="img"
                src="http://127.0.0.1:8095/stream"
                alt="Live Drone Camera Stream"
                sx={{
                  width: '100%',
                  maxHeight: 320,
                  objectFit: 'contain',
                  borderRadius: 1,
                  bgcolor: '#000',
                  display: 'block',
                }}
              />
            </Paper>
          </>
        ) : null}

        {reportData && (
          <Stack spacing={1.5}>
            <Alert severity="info">
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {t('Flight report')}: {reportData.durationSeconds}s · {format(reportData.distanceFlownMeters)}m
                    {reportData.maxAltitudeMeters != null ? ` · Max Alt ${format(reportData.maxAltitudeMeters)}m` : ''}
                    {reportData.startBatteryPercent != null && reportData.endBatteryPercent != null
                      ? ` · Battery ${reportData.startBatteryPercent}% → ${reportData.endBatteryPercent}%`
                      : ''}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {reportData.note}
                  </Typography>
                </Box>
                {isInspector && (
                  <Stack direction="row" spacing={1} sx={{ flexShrink: 0, alignItems: 'center' }}>
                    {videoSynced ? (
                      <>
                        <Chip
                          size="small"
                          color="success"
                          icon={<CheckCircleRounded />}
                          label={t('Flight video in Evidence')}
                        />
                        <Button
                          size="small"
                          component={RouterLink}
                          to="../evidence"
                          variant="outlined"
                          sx={{ textTransform: 'none', fontWeight: 600 }}
                        >
                          {t('Review video in Evidence')}
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<MovieCreationRounded fontSize="small" />}
                        disabled={syncVideoMutation.isPending}
                        onClick={() => syncVideoMutation.mutate()}
                        sx={{ textTransform: 'none', fontWeight: 600 }}
                      >
                        {syncVideoMutation.isPending
                          ? t('Syncing MP4 from Hub…')
                          : t('Sync Flight Video (MP4) to Evidence')}
                      </Button>
                    )}
                  </Stack>
                )}
              </Stack>
            </Alert>

            {reportData.flightTrace && reportData.flightTrace.length > 1 && (
              <FlightTraceVisualization trace={reportData.flightTrace} />
            )}
          </Stack>
        )}

        {statusBanner && (
          <Alert severity="success" onClose={() => setStatusBanner(null)}>
            {statusBanner}
          </Alert>
        )}

        <MutationProblemAlert error={startMission.error} isError={startMission.isError} fallbackMessage={t('Could not connect to SmartDroneHub.')} />
        <MutationProblemAlert error={captureMutation.error} isError={captureMutation.isError} fallbackMessage={t('Could not capture frame from SmartDroneHub.')} />
        <MutationProblemAlert error={syncVideoMutation.error} isError={syncVideoMutation.isError} fallbackMessage={t('Could not sync flight video from SmartDroneHub.')} />
      </Stack>
    </Paper>
  );
}
