import { useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, Stack, Typography } from '@mui/material';
import FlightTakeoffRounded from '@mui/icons-material/FlightTakeoffRounded';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth/store/authStore';
import { MutationProblemAlert } from '@/shared/ui/MutationProblemAlert';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import {
  smartDroneHubApi,
  type SmartDroneHubTelemetry,
} from '../api/smartDroneHubApi';

interface Props {
  inspectionId: string;
  fieldSessionId: string;
  sessionActive: boolean;
  canViewFlightReport?: boolean;
  onTelemetryChange?: (telemetry: SmartDroneHubTelemetry | null) => void;
}

function format(value: number | null, digits = 1): string {
  return value == null || !Number.isFinite(value) ? '—' : value.toFixed(digits);
}

export function SmartDroneHubTelemetryPanel({
  inspectionId,
  fieldSessionId,
  sessionActive,
  onTelemetryChange,
}: Props) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const isInspector = useAuthStore((state) => state.roles.includes('INSPECTOR'));
  const [started, setStarted] = useState(false);

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

  useEffect(() => {
    onTelemetryChange?.(data ?? null);
  }, [data, onTelemetryChange]);

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
              {!isMissionStarted && sessionActive && (
                <Typography variant="body2" color="text.secondary">
                  {t('Connect to SmartDroneHub / Mission Planner before taking off.')}
                </Typography>
              )}
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
              {t('Establish MAVLink / Hub telemetry link to arm mission tracking and live gimbal frame capture.')}
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

        <MutationProblemAlert error={startMission.error} isError={startMission.isError} fallbackMessage={t('Could not connect to SmartDroneHub.')} />
      </Stack>
    </Box>
  );
}
