import { useState } from 'react';
import { Alert, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import CameraAltRounded from '@mui/icons-material/CameraAltRounded';
import FlightTakeoffRounded from '@mui/icons-material/FlightTakeoffRounded';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth/store/authStore';
import { MutationProblemAlert } from '@/shared/ui/MutationProblemAlert';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import {
  smartDroneHubApi,
  type SmartDroneHubTelemetry,
} from '../api/smartDroneHubApi';
import { inspectionKeys } from '../hooks/useInspections';

interface Props {
  inspectionId: string;
  fieldSessionId: string;
  sessionActive: boolean;
  canViewFlightReport?: boolean;
}

function format(value: number | null, digits = 1): string {
  return value == null || !Number.isFinite(value) ? '—' : value.toFixed(digits);
}

export function SmartDroneHubTelemetryPanel({
  inspectionId,
  fieldSessionId,
  sessionActive,
}: Props) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const isInspector = useAuthStore((state) => state.roles.includes('INSPECTOR'));
  const [started, setStarted] = useState(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  const startMission = useMutation({
    mutationFn: (source: 'AUTO' | 'MAVLINK' | 'SIMULATION' = 'AUTO') =>
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

  const telemetry = useQuery({
    queryKey: ['smartdronehub', 'telemetry', inspectionId, fieldSessionId],
    queryFn: () => smartDroneHubApi.telemetry(inspectionId, fieldSessionId),
    enabled: started && sessionActive && isInspector,
    refetchInterval: started && sessionActive ? 1500 : false,
    refetchIntervalInBackground: false,
    retry: false,
  });

  const data: SmartDroneHubTelemetry | undefined = telemetry.data ?? startMission.data;
  const isConnected = Boolean(data?.connected);

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <FlightTakeoffRounded color={isConnected ? 'primary' : 'disabled'} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{t('SmartDroneHub telemetry')}</Typography>
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

        {!sessionActive ? (
          <Alert severity="info">
            {t('Field session is closed. Live telemetry stream has ended. The automated Flight Operations Report is available in Step 4 (Report).')}
          </Alert>
        ) : null}

        {sessionActive && isInspector && !started ? (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button
              variant="contained"
              startIcon={<FlightTakeoffRounded />}
              onClick={() => startMission.mutate('AUTO')}
              disabled={startMission.isPending}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              {startMission.isPending ? t('Connecting…') : t('Connect Flight Operations')}
            </Button>
          </Stack>
        ) : started && sessionActive ? (
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
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, bgcolor: 'background.default' }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                    📹 {t('Live Gimbal Camera & Telemetry Feed')}
                  </Typography>
                  <Chip
                    size="small"
                    color={isConnected ? 'success' : 'default'}
                    variant="outlined"
                    label={isConnected ? t('Gimbal Active') : t('Disconnected')}
                    sx={{ height: 20, fontSize: '0.75rem' }}
                  />
                </Stack>
                {isInspector && (
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<CameraAltRounded fontSize="small" />}
                    disabled={!isConnected || captureMutation.isPending}
                    onClick={() => captureMutation.mutate()}
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  >
                    {captureMutation.isPending
                      ? t('Capturing…')
                      : t('Capture frame to Evidence')}
                  </Button>
                )}
              </Stack>
            </Paper>
          </>
        ) : null}

        {statusBanner && (
          <Alert severity="success" onClose={() => setStatusBanner(null)}>
            {statusBanner}
          </Alert>
        )}

        <MutationProblemAlert error={startMission.error} isError={startMission.isError} fallbackMessage={t('Could not connect to SmartDroneHub.')} />
        <MutationProblemAlert error={captureMutation.error} isError={captureMutation.error != null} fallbackMessage={t('Could not capture frame from SmartDroneHub.')} />
      </Stack>
    </Paper>
  );
}
