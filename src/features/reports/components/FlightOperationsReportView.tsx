import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useTheme,
} from '@mui/material';
import BatteryChargingFullRounded from '@mui/icons-material/BatteryChargingFullRounded';
import CameraAltRounded from '@mui/icons-material/CameraAltRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import FlightTakeoffRounded from '@mui/icons-material/FlightTakeoffRounded';
import LayersRounded from '@mui/icons-material/LayersRounded';
import OpenInFullRounded from '@mui/icons-material/OpenInFullRounded';
import PrintRounded from '@mui/icons-material/PrintRounded';
import RouteRounded from '@mui/icons-material/RouteRounded';
import SpeedRounded from '@mui/icons-material/SpeedRounded';
import TerrainRounded from '@mui/icons-material/TerrainRounded';
import ViewInArRounded from '@mui/icons-material/ViewInArRounded';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import { useQuery } from '@tanstack/react-query';
import {
  smartDroneHubApi,
  type SmartDroneHubFlightTracePoint,
} from '@/features/inspections/api/smartDroneHubApi';
import type {
  EvidenceItem,
  InspectionReport,
} from '@/features/inspections/api/inspectionApi';
import { FlightPermitPreviewDialog } from '@/features/inspections/components/FlightPermitPreviewDialog';
import { QueryState } from '@/shared/ui/QueryState';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { MapLibreFlightTrajectoryCanvas } from './MapLibreFlightTrajectoryCanvas';

export interface FlightOperationsReportViewProps {
  inspectionId: string;
  fieldSessionId: string | null | undefined;
  version?: InspectionReport | null | undefined;
  evidenceList?: EvidenceItem[] | undefined;
  assetName?: string | null | undefined;
  droneSummary?: string | null | undefined;
  flightPermitFileName?: string | null | undefined;
}

// Validated dataviz categorical & status palette (light & dark mode)
const VIZ_PALETTE = {
  light: {
    surface: '#fcfcfb',
    grid: '#eae9e4',
    axisText: '#686762',
    textPrimary: '#0b0b0b',
    textSecondary: '#52514e',
    series1: '#2a78d6', // Blue (Altitude / Primary trajectory)
    series2: '#eb6834', // Orange (Speed / Landing)
    series3: '#1baf7a', // Aqua (Takeoff / Hover)
    series4: '#eda100', // Yellow (Battery / RTL)
    series5: '#6250d6', // Violet (Loiter / Evidence)
    danger: '#c93b3b',
  },
  dark: {
    surface: '#1a1a19',
    grid: '#2e2e2b',
    axisText: '#9c9b92',
    textPrimary: '#f0efec',
    textSecondary: '#c3c2b7',
    series1: '#3987e5',
    series2: '#d95926',
    series3: '#199e70',
    series4: '#c98500',
    series5: '#9085e9',
    danger: '#e66767',
  },
};

function fmtNum(val: number | null | undefined, digits = 1): string {
  return val == null || !Number.isFinite(val) ? '—' : val.toFixed(digits);
}

function fmtDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return '—';
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${String(secs).padStart(2, '0')}s`;
}

function fmtOffsetSec(sec: number | null | undefined): string {
  if (sec == null || !Number.isFinite(sec)) return '—';
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

export function FlightOperationsReportView({
  inspectionId,
  fieldSessionId,
  version,
  evidenceList = [],
  assetName,
  droneSummary,
  flightPermitFileName,
}: FlightOperationsReportViewProps) {
  const { t, formatDateTime } = useLocale();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const pal = isDark ? VIZ_PALETTE.dark : VIZ_PALETTE.light;

  // Synchronized crosshair index across telemetry timeline charts
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [permitDialogOpen, setPermitDialogOpen] = useState(false);

  const flightReportQuery = useQuery({
    queryKey: ['smartdronehub', 'flight-report', inspectionId, fieldSessionId],
    queryFn: () => smartDroneHubApi.flightReport(inspectionId, fieldSessionId!),
    enabled: Boolean(inspectionId && fieldSessionId),
    retry: false,
  });

  const report = flightReportQuery.data;
  const trace: SmartDroneHubFlightTracePoint[] = useMemo(
    () => report?.flightTrace ?? [],
    [report?.flightTrace],
  );

  const enrichedSamples = useMemo(() => {
    const firstRecordedAt = trace
      .map((point) => point.recordedAt)
      .find((value) => value != null && Number.isFinite(Date.parse(value)));
    const firstRecordedAtMs = firstRecordedAt ? Date.parse(firstRecordedAt) : null;

    return trace.map((point, idx) => {
      const recordedAtMs = point.recordedAt ? Date.parse(point.recordedAt) : Number.NaN;
      const elapsedSec =
        firstRecordedAtMs != null && Number.isFinite(recordedAtMs) && recordedAtMs >= firstRecordedAtMs
          ? Math.round((recordedAtMs - firstRecordedAtMs) / 1000)
          : null;
      const battery = point.batteryPercent ?? null;
      return {
        ...point,
        idx,
        elapsedSec,
        altitude: point.altitudeMeters,
        speed: point.groundSpeedMps,
        battery,
        batteryAvailable: battery != null,
        mode: point.flightMode?.trim() ? point.flightMode.trim().toUpperCase() : '—',
      };
    });
  }, [trace]);

  const gpsSamples = useMemo(
    () =>
      enrichedSamples.filter(
        (point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude),
      ),
    [enrichedSamples],
  );
  const hasAltitudeSamples = useMemo(
    () => enrichedSamples.some((point) => point.altitude != null && Number.isFinite(point.altitude)),
    [enrichedSamples],
  );
  const hasSpeedSamples = useMemo(
    () => enrichedSamples.some((point) => point.speed != null && Number.isFinite(point.speed)),
    [enrichedSamples],
  );

  const metrics = useMemo(() => {
    const altitudes = enrichedSamples
      .map((point) => point.altitudeMeters)
      .filter((value): value is number => value != null && Number.isFinite(value));
    const speeds = enrichedSamples
      .map((point) => point.groundSpeedMps)
      .filter((value): value is number => value != null && Number.isFinite(value));
    const maxAlt =
      report?.maxAltitudeMeters ?? (altitudes.length > 0 ? Math.max(...altitudes) : null);
    const avgAlt =
      altitudes.length > 0
        ? altitudes.reduce((total, value) => total + value, 0) / altitudes.length
        : null;
    const maxSpeed = speeds.length > 0 ? Math.max(...speeds) : null;
    const avgSpeed =
      speeds.length > 0
        ? speeds.reduce((total, value) => total + value, 0) / speeds.length
        : null;

    const firstBattery = enrichedSamples.find((sample) => sample.batteryAvailable)?.battery ?? null;
    const lastBattery = [...enrichedSamples].reverse().find((sample) => sample.batteryAvailable)?.battery ?? null;
    const startBat = report?.startBatteryPercent ?? firstBattery;
    const endBat = report?.endBatteryPercent ?? lastBattery;
    const batUsed = startBat == null || endBat == null ? null : Math.max(0, startBat - endBat);
    const durationMin =
      report?.durationSeconds != null && report.durationSeconds > 0
        ? report.durationSeconds / 60
        : null;
    const drainRatePerMin =
      batUsed == null || durationMin == null ? null : batUsed / durationMin;

    const slotOrder = [pal.series1, pal.series2, pal.series3, pal.series4];
    const modeCounts: Record<string, number> = {};
    enrichedSamples.forEach((point) => {
      if (point.mode !== '—') {
        modeCounts[point.mode] = (modeCounts[point.mode] ?? 0) + 1;
      }
    });
    const totalModes = Object.values(modeCounts).reduce((total, count) => total + count, 0);
    const modeBreakdown = Object.entries(modeCounts).map(([mode, count], index) => ({
      mode,
      count,
      pct: Math.round((count / totalModes) * 100),
      color: slotOrder[index % slotOrder.length]!,
    }));

    return {
      maxAlt,
      avgAlt,
      maxSpeed,
      avgSpeed,
      startBat,
      endBat,
      batUsed,
      drainRatePerMin,
      modeBreakdown,
    };
  }, [report, enrichedSamples, pal]);

  const context = version?.reportContext;
  const sessionDrone = context?.fieldSessions?.at(-1);
  const resolvedAsset =
    assetName ??
    ([context?.assetName, context?.assetCode].filter(Boolean).join(' · ') || '—');
  const resolvedDrone =
    droneSummary ||
    [
      context?.assignedDrone?.manufacturer ?? sessionDrone?.droneManufacturer,
      context?.assignedDrone?.model ?? sessionDrone?.droneModel,
      context?.assignedDrone?.serialNumber ?? sessionDrone?.droneSerialNumber,
    ]
      .filter(Boolean)
      .join(' · ') ||
    '—';
  const resolvedPermit = flightPermitFileName ?? context?.flightPermitFileName ?? null;
  const telemetrySourceLabel =
    report?.telemetrySource === 'MISSION_PLANNER_MAVLINK'
      ? t('MAVLink telemetry')
      : report?.telemetrySource === 'SMARTDRONEHUB_SIMULATION'
        ? t('Simulation telemetry')
        : report?.telemetrySource === 'MANUAL_DECLARATION'
          ? t('Manual declaration')
          : report?.telemetrySource.startsWith('IMPORTED_LOG_')
            ? `${t('Imported flight log')} (${report.telemetrySource.replace('IMPORTED_LOG_', '')})`
            : t('Telemetry source unavailable');
  const isSimulationSource = report?.telemetrySource === 'SMARTDRONEHUB_SIMULATION';
  const isImportedSource = Boolean(report?.telemetrySource.startsWith('IMPORTED_LOG_'));
  const isLiveMavlink = report?.telemetrySource === 'MISSION_PLANNER_MAVLINK';
  const reportedFinalState =
    report?.finalState && report.finalState !== 'UNKNOWN' ? report.finalState : null;
  const hasFlightTrace = trace.length > 0;
  const isManualDeclaration = report?.telemetrySource === 'MANUAL_DECLARATION';
  const hasAnyReportData = Boolean(
    report &&
      (hasFlightTrace ||
        (report.durationSeconds != null && report.durationSeconds > 0) ||
        (report.distanceFlownMeters != null && report.distanceFlownMeters > 0) ||
        report.maxAltitudeMeters != null ||
        report.startBatteryPercent != null ||
        report.endBatteryPercent != null ||
        report.note),
  );

  if (!fieldSessionId) {
    return (
      <Alert severity="info" sx={{ borderRadius: '10px' }}>
        {t('No completed field session was found for this inspection.')}
      </Alert>
    );
  }

  return (
    <QueryState
      isLoading={flightReportQuery.isLoading}
      error={flightReportQuery.error}
      onRetry={() => void flightReportQuery.refetch()}
      loadingLabel={t('Loading recorded flight data…')}
    >
      {report && isManualDeclaration ? (
        <Stack spacing={1.5}>
          <Alert severity="warning" sx={{ borderRadius: '10px' }}>
            {t('This flight summary is an Inspector declaration; no telemetry trace was imported or recorded.')}
          </Alert>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: '10px' }}>
            <Stack spacing={1}>
              <Chip
                color="warning"
                variant="outlined"
                label={t('Manual declaration · no telemetry')}
                sx={{ alignSelf: 'flex-start' }}
              />
              {reportedFinalState && (
                <MetaItem label={t('Reported state')} value={reportedFinalState} />
              )}
              <MetaItem
                label={t('Estimated flight duration')}
                value={fmtDuration(report.durationSeconds)}
              />
              <MetaItem
                label={t('Estimated maximum altitude')}
                value={report.maxAltitudeMeters == null ? '—' : `${fmtNum(report.maxAltitudeMeters, 1)} m`}
              />
              <MetaItem label={t('Inspector field note')} value={report.note ?? '—'} />
            </Stack>
          </Paper>
        </Stack>
      ) : report?.telemetrySource === 'NONE' ? (
        <Alert severity="info" sx={{ borderRadius: '10px' }}>
          {t('No flight telemetry or imported flight log was recorded for this field session.')}
        </Alert>
      ) : report && hasAnyReportData ? (
        <Stack spacing={2.5}>
          {/* 1. Flight Sortie & Compliance Header */}
          <Paper
            variant="outlined"
            sx={{
              p: 2.5,
              borderRadius: '10px',
              bgcolor: 'background.paper',
              borderColor: 'divider',
            }}
          >
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              sx={{
                alignItems: { sm: 'center' },
                justifyContent: 'space-between',
                mb: 2,
                pb: 1.5,
                borderBottom: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Stack
                direction="row"
                spacing={1.25}
                sx={{ alignItems: 'center', flexWrap: 'wrap' }}
              >
                <FlightTakeoffRounded color="primary" />
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                    {isImportedSource
                      ? t('Imported flight log summary')
                      : isSimulationSource
                        ? t('Simulated flight telemetry')
                        : t('Flight report')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {`REF: SDI-FLT-${fieldSessionId.slice(0, 8).toUpperCase()} · ${telemetrySourceLabel}`}
                  </Typography>
                </Box>
              </Stack>
              <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: 'center', flexWrap: 'wrap' }}
              >
                <Chip
                  size="small"
                  color={
                    isLiveMavlink
                      ? 'success'
                      : isSimulationSource
                        ? 'warning'
                        : 'info'
                  }
                  variant={isSimulationSource ? 'outlined' : 'filled'}
                  label={
                    isLiveMavlink
                      ? `${t('Real telemetry')} · ${telemetrySourceLabel}`
                      : isSimulationSource
                        ? `${t('Simulation')} · ${telemetrySourceLabel}`
                        : `${t('Real log')} · ${telemetrySourceLabel}`
                  }
                  sx={{ fontWeight: 700 }}
                />
                {reportedFinalState && (
                  <Chip
                    size="small"
                    variant="outlined"
                    label={`${t('Reported state')}: ${reportedFinalState}`}
                    sx={{ fontWeight: 700 }}
                  />
                )}
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<PrintRounded fontSize="small" />}
                  onClick={() => window.print()}
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                  {t('Print / Export PDF')}
                </Button>
              </Stack>
            </Stack>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, 1fr)',
                  md: 'repeat(3, 1fr)',
                },
                gap: 1.75,
              }}
            >
              <MetaItem label={t('Target Asset')} value={resolvedAsset} />
              <MetaItem label={t('Assigned UAV / Drone')} value={resolvedDrone} />
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="caption"
                  sx={{ color: 'text.secondary', fontWeight: 600, display: 'block' }}
                >
                  {t('Permit document')}
                </Typography>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: 'center', flexWrap: 'wrap', mt: 0.25 }}
                >
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, color: 'text.primary', wordBreak: 'break-word' }}
                  >
                    {resolvedPermit ?? t('No permit document details available')}
                  </Typography>
                  {resolvedPermit && (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<VisibilityOutlined sx={{ fontSize: 14 }} />}
                      onClick={() => setPermitDialogOpen(true)}
                      sx={{
                        height: 22,
                        px: 1,
                        fontSize: '0.75rem',
                        fontWeight: 650,
                        textTransform: 'none',
                        borderRadius: '8px',
                      }}
                    >
                      {t('View document')}
                    </Button>
                  )}
                </Stack>
              </Box>
              <MetaItem
                label={t('Started at')}
                value={report.startedAt ? formatDateTime(report.startedAt) : '—'}
              />
              <MetaItem
                label={t('Ended at')}
                value={report.endedAt ? formatDateTime(report.endedAt) : '—'}
              />
              <MetaItem label={t('Flight data note')} value={report.note ?? '—'} />
            </Box>
          </Paper>

          <FlightPermitPreviewDialog
            open={permitDialogOpen}
            onClose={() => setPermitDialogOpen(false)}
            inspectionId={inspectionId}
            fileName={resolvedPermit ?? undefined}
            uploadedAt={context?.flightPermitUploadedAt}
            assetName={resolvedAsset !== '—' ? resolvedAsset : null}
            droneSummary={resolvedDrone !== '—' ? resolvedDrone : null}
          />

          <Alert severity="info" sx={{ borderRadius: '10px' }}>
            {report.telemetrySource === 'IMPORTED_LOG_SRT'
              ? t('SRT records a video segment; it does not establish the full flight duration or milestones.')
              : isSimulationSource
                ? t('This view shows simulated telemetry from SmartDroneHub rather than aircraft hardware sensors.')
                : t('This report summarizes the available recorded segment. Missing telemetry fields are shown as unavailable.')}
          </Alert>
          {/* 2. Automated 6 KPI Stat Tiles */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
                lg: 'repeat(6, 1fr)',
              },
              gap: 1.5,
            }}
          >
            <StatTile
              label={t('Recorded duration')}
              value={fmtDuration(report.durationSeconds)}
              sub={
                report.durationSeconds == null || report.durationSeconds <= 0
                  ? t('Duration unavailable in this source')
                  : report.telemetrySource === 'IMPORTED_LOG_SRT'
                    ? t('Recorded video segment only; not the full flight')
                    : t('Duration supplied by this source')
              }
            />
            <StatTile
              label={t('Recorded GPS distance')}
              value={report.distanceFlownMeters == null ? '—' : `${fmtNum(report.distanceFlownMeters, 1)} m`}
              sub={t('Calculated from recorded GPS points')}
            />
            <StatTile
              label={t('Maximum recorded altitude')}
              value={metrics.maxAlt == null ? '—' : `${fmtNum(metrics.maxAlt, 1)} m`}
              sub={metrics.avgAlt == null ? t('Altitude data unavailable') : `${t('Average recorded')}: ${fmtNum(metrics.avgAlt, 1)} m`}
            />
            <StatTile
              label={t('Peak ground speed')}
              value={trace.some((point) => point.groundSpeedMps != null) ? `${fmtNum(metrics.maxSpeed, 1)} m/s` : '—'}
              sub={trace.some((point) => point.groundSpeedMps != null) ? `${t('Avg')}: ${fmtNum(metrics.avgSpeed, 1)} m/s` : t('Speed data not included in this log')}
            />
            <StatTile
              label={t('Battery consumption')}
              value={metrics.startBat == null || metrics.endBat == null ? '—' : `${metrics.startBat}% → ${metrics.endBat}%`}
              sub={metrics.batUsed == null ? t('Battery data not included in this log') : `-${metrics.batUsed}% (${fmtNum(metrics.drainRatePerMin, 1)}%/min)`}
            />
            <StatTile
              label={t('Recorded samples')}
              value={`${enrichedSamples.length}`}
              sub={`${evidenceList.length} ${t('geotagged captures')}`}
            />
          </Box>

          {/* 3. Synchronized 4-Panel Telemetry Charts */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
              gap: 2,
            }}
          >
            {gpsSamples.length > 0 ? (
              <GpsTrajectoryMapCard
                samples={gpsSamples}
                evidenceList={evidenceList}
                pal={pal}
                hoverIdx={hoverIdx}
                onHoverIdx={setHoverIdx}
              />
            ) : (
              <Alert severity="info" sx={{ borderRadius: '10px', alignSelf: 'start' }}>
                {t('No GPS trajectory points were supplied in this source.')}
              </Alert>
            )}

            {hasAltitudeSamples && metrics.maxAlt != null && metrics.avgAlt != null ? (
              <SingleSeriesTimelineCard
                icon={<TerrainRounded fontSize="small" color="primary" />}
                title={t('Altitude Profile (m)')}
                summaryLabel={`Avg ${fmtNum(metrics.avgAlt, 1)} m · Peak ${fmtNum(metrics.maxAlt, 1)} m`}
                unit="m"
                color={pal.series1}
                samples={enrichedSamples}
                getValue={(s) => s.altitude}
                maxValue={Math.max(10, Math.ceil(metrics.maxAlt * 1.15))}
                pal={pal}
                hoverIdx={hoverIdx}
                onHoverIdx={setHoverIdx}
              />
            ) : (
              <Alert severity="info" sx={{ borderRadius: '10px', alignSelf: 'start' }}>
                {t('Altitude data not included in this log')}
              </Alert>
            )}

            {hasSpeedSamples && metrics.maxSpeed != null && metrics.avgSpeed != null ? (
              <SingleSeriesTimelineCard
                icon={<SpeedRounded fontSize="small" color="primary" />}
                title={t('Ground Speed (m/s)')}
                summaryLabel={`Avg ${fmtNum(metrics.avgSpeed, 1)} m/s · Peak ${fmtNum(metrics.maxSpeed, 1)} m/s`}
                unit="m/s"
                color={pal.series2}
                samples={enrichedSamples}
                getValue={(s) => s.speed}
                maxValue={Math.max(5, Math.ceil(metrics.maxSpeed * 1.2))}
                pal={pal}
                hoverIdx={hoverIdx}
                onHoverIdx={setHoverIdx}
              />
            ) : (
              <Alert severity="info" sx={{ borderRadius: '10px', alignSelf: 'start' }}>
                {t('Speed data not included in this log')}
              </Alert>
            )}

            {metrics.startBat == null || metrics.endBat == null ? (
              <Alert severity="info" sx={{ borderRadius: '10px', alignSelf: 'start' }}>
                {t('Battery data not included in this log')}
              </Alert>
            ) : (
              <BatteryAndModeSummaryCard
                samples={enrichedSamples}
                startBat={metrics.startBat}
                endBat={metrics.endBat}
                modeBreakdown={metrics.modeBreakdown}
                pal={pal}
                hoverIdx={hoverIdx}
                onHoverIdx={setHoverIdx}
              />
            )}
          </Box>

          {/* 4. Recorded Telemetry Milestones & Evidence Geotag Log Table */}
          {report.telemetrySource === 'MISSION_PLANNER_MAVLINK' && (
            <AutomatedEventLogTable
              samples={enrichedSamples}
              evidenceList={evidenceList}
              startedAt={report.startedAt}
              endedAt={report.endedAt}
              startBat={metrics.startBat}
              endBat={metrics.endBat}
            />
          )}
        </Stack>
        ) : (
          <Alert severity="info" sx={{ borderRadius: '10px' }}>
            {t('No flight telemetry or imported flight log was recorded for this field session.')}
          </Alert>
        )
      }
    </QueryState>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography
        variant="caption"
        sx={{ color: 'text.secondary', fontWeight: 600, display: 'block' }}
      >
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{ fontWeight: 600, color: 'text.primary', wordBreak: 'break-word' }}
      >
        {value || '—'}
      </Typography>
    </Box>
  );
}

function StatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.75,
        borderRadius: '10px',
        bgcolor: 'background.paper',
        borderColor: 'divider',
      }}
    >
      <Typography
        variant="caption"
        sx={{
          color: 'text.secondary',
          fontWeight: 600,
          display: 'block',
          mb: 0.5,
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: '1rem',
          fontWeight: 700,
          color: 'text.primary',
          lineHeight: 1.2,
        }}
      >
        {value}
      </Typography>
      <Typography
        variant="caption"
        sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}
      >
        {sub}
      </Typography>
    </Paper>
  );
}

interface EnrichedSample extends SmartDroneHubFlightTracePoint {
  idx: number;
  elapsedSec: number | null;
  altitude: number | null;
  speed: number | null;
  battery: number | null;
  batteryAvailable: boolean;
  mode: string;
}

function GpsTrajectoryMapCard({
  samples,
  evidenceList,
  pal,
  hoverIdx,
  onHoverIdx,
}: {
  samples: EnrichedSample[];
  evidenceList: EvidenceItem[];
  pal: typeof VIZ_PALETTE.light;
  hoverIdx: number | null;
  onHoverIdx: (idx: number | null) => void;
}) {
  const { t } = useLocale();
  const hasAltitudeFor3d = useMemo(
    () => samples.some((sample) => sample.altitude != null && Number.isFinite(sample.altitude)),
    [samples],
  );
  const [expanded, setExpanded] = useState(false);
  const [viewDimension, setViewDimension] = useState<'2d' | '3d'>(hasAltitudeFor3d ? '3d' : '2d');
  const [mapStyle, setMapStyle] = useState<'street' | 'satellite'>('street');
  const [lockedIdx, setLockedIdx] = useState<number | null>(null);
  const effectiveDimension = hasAltitudeFor3d ? viewDimension : '2d';

  const geoEvidence = useMemo(
    () =>
      evidenceList.filter(
        (e) => e.latitude != null && e.longitude != null && !e.isDeleted,
      ),
    [evidenceList],
  );

  const activeIdx = hoverIdx ?? lockedIdx;
  const activeSample =
    activeIdx != null && samples[activeIdx] ? samples[activeIdx] : null;

  return (
    <>
      <Paper variant="outlined" sx={{ p: 2, borderRadius: '10px' }}>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            rowGap: 0.75,
            mb: 1.25,
          }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <RouteRounded fontSize="small" color="primary" />
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {t('Flight Path Map')}
            </Typography>
            <LegendSwatch color={pal.series3} label={t('Start')} />
            <LegendSwatch color={pal.series2} label={t('End')} />
          </Stack>

          <Stack
            direction="row"
            spacing={0.75}
            sx={{ alignItems: 'center', flexShrink: 0 }}
          >
            {activeSample && (
              <Chip
                size="small"
                label={`${fmtOffsetSec(activeSample.elapsedSec)} · ${activeSample.altitude == null ? '—' : `${activeSample.altitude.toFixed(1)} m`}`}
                sx={{ height: 22, fontSize: '0.75rem', fontWeight: 600 }}
              />
            )}
            <Button
              size="small"
              variant={effectiveDimension === '3d' ? 'contained' : 'outlined'}
              disabled={!hasAltitudeFor3d}
              onClick={() =>
                setViewDimension((d) => (d === '2d' ? '3d' : '2d'))
              }
              sx={{
                minWidth: 38,
                height: 24,
                px: 1,
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'none',
              }}
            >
              {effectiveDimension === '3d' ? '3D' : '2D'}
            </Button>
            <Button
              size="small"
              variant={mapStyle === 'satellite' ? 'contained' : 'outlined'}
              onClick={() =>
                setMapStyle((s) => (s === 'street' ? 'satellite' : 'street'))
              }
              sx={{
                height: 24,
                px: 1,
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'none',
              }}
            >
              {mapStyle === 'satellite' ? t('Satellite') : t('Map')}
            </Button>
            <IconButton
              size="small"
              onClick={() => setExpanded(true)}
              title={t('Expand Map')}
              sx={{
                width: 24,
                height: 24,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '8px',
              }}
            >
              <OpenInFullRounded sx={{ fontSize: 14 }} />
            </IconButton>
          </Stack>
        </Stack>

        <MapLibreFlightTrajectoryCanvas
          samples={samples}
          geoEvidence={geoEvidence}
          height={235}
          viewDimension={effectiveDimension}
          mapStyle={mapStyle}
          activeIdx={activeIdx}
          onSelectIdx={setLockedIdx}
          onHoverIdx={onHoverIdx}
        />
      </Paper>

      <Dialog
        open={expanded}
        onClose={() => setExpanded(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            py: 1.5,
          }}
        >
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
            <RouteRounded color="primary" />
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              {t('Flight Path Map')}
            </Typography>
            <LegendSwatch color={pal.series3} label={t('Start')} />
            <LegendSwatch color={pal.series2} label={t('End')} />
          </Stack>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Button
              size="small"
              variant={effectiveDimension === '3d' ? 'contained' : 'outlined'}
              disabled={!hasAltitudeFor3d}
              startIcon={<ViewInArRounded fontSize="small" />}
              onClick={() =>
                setViewDimension((d) => (d === '2d' ? '3d' : '2d'))
              }
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              {effectiveDimension === '3d' ? '3D View' : '2D View'}
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<LayersRounded fontSize="small" />}
              onClick={() =>
                setMapStyle((s) => (s === 'street' ? 'satellite' : 'street'))
              }
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              {mapStyle === 'street' ? t('Satellite') : t('Street Map')}
            </Button>
            <IconButton size="small" onClick={() => setExpanded(false)}>
              <CloseRounded />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2 }}>
          <MapLibreFlightTrajectoryCanvas
            samples={samples}
            geoEvidence={geoEvidence}
            height={560}
            isDialog
            viewDimension={effectiveDimension}
            mapStyle={mapStyle}
            activeIdx={activeIdx}
            onSelectIdx={setLockedIdx}
            onHoverIdx={onHoverIdx}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function SingleSeriesTimelineCard({
  icon,
  title,
  summaryLabel,
  unit,
  color,
  samples,
  getValue,
  maxValue,
  pal,
  hoverIdx,
  onHoverIdx,
}: {
  icon: React.ReactNode;
  title: string;
  summaryLabel: string;
  unit: string;
  color: string;
  samples: EnrichedSample[];
  getValue: (s: EnrichedSample) => number | null;
  maxValue: number;
  pal: typeof VIZ_PALETTE.light;
  hoverIdx: number | null;
  onHoverIdx: (idx: number | null) => void;
}) {
  const w = 480;
  const h = 235;
  const padL = 44;
  const padR = 24;
  const padT = 22;
  const padB = 30;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  const coords = useMemo(() => {
    const validSamples = samples
      .map((sample) => {
        const raw = getValue(sample);
        if (raw == null || !Number.isFinite(raw)) return null;
        return { sample, val: Math.max(0, raw) };
      })
      .filter((entry): entry is { sample: EnrichedSample; val: number } => entry != null);

    if (validSamples.length === 0) return [];
    return validSamples.map(({ sample, val }, idx) => {
      const x =
        padL + (idx / Math.max(1, validSamples.length - 1)) * plotW;
      const y = padT + plotH - (Math.min(val, maxValue) / maxValue) * plotH;
      return {
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        val,
        sample,
      };
    });
  }, [samples, getValue, maxValue, plotW, plotH]);

  const linePath = coords
    .map((c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.x} ${c.y}`)
    .join(' ');

  const areaPath =
    coords.length > 1
      ? `${linePath} L ${coords.at(-1)!.x} ${padT + plotH} L ${coords[0]!.x} ${padT + plotH} Z`
      : '';

  const peakCoord = useMemo(() => {
    if (coords.length === 0) return null;
    return coords.reduce((best, cur) => (cur.val > best.val ? cur : best), coords[0]!);
  }, [coords]);

  const hoveredCoord =
    hoverIdx != null ? coords.find((coord) => coord.sample.idx === hoverIdx) ?? null : null;

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: '10px' }}>
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 1.25,
        }}
      >
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
          {icon}
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
        </Stack>

        <Chip
          size="small"
          variant="outlined"
          label={
            hoveredCoord
              ? `${fmtOffsetSec(hoveredCoord.sample.elapsedSec)} · ${hoveredCoord.val.toFixed(1)} ${unit}`
              : summaryLabel
          }
          sx={{ fontWeight: 600, height: 22, fontSize: '0.75rem' }}
        />
      </Stack>

      <Box
        sx={{
          borderRadius: '8px',
          bgcolor: pal.surface,
          border: '1px solid',
          borderColor: 'divider',
          p: 0.5,
        }}
      >
        <Box
          component="svg"
          viewBox={`0 0 ${w} ${h}`}
          sx={{ width: '100%', height: 220, display: 'block' }}
          onMouseLeave={() => onHoverIdx(null)}
        >
          {/* Single Y-axis with solid 1px hairline gridlines */}
          {[0, 0.5, 1].map((r) => {
            const y = padT + plotH - r * plotH;
            const tickVal = (r * maxValue).toFixed(maxValue >= 10 ? 0 : 1);
            return (
              <g key={r}>
                <line
                  x1={padL}
                  y1={y}
                  x2={w - padR}
                  y2={y}
                  stroke={pal.grid}
                  strokeWidth="1"
                />
                <text
                  x={padL - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  fill={pal.axisText}
                  fontSize="10"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {tickVal} {unit}
                </text>
              </g>
            );
          })}

          {/* X-axis time ticks (Start, Mid, End) */}
          {coords.length > 1 &&
            [0, Math.floor((coords.length - 1) / 2), coords.length - 1].map(
              (idx) => {
                const c = coords[idx]!;
                return (
                  <text
                    key={`xtick-${idx}`}
                    x={c.x}
                    y={h - 8}
                    textAnchor={
                      idx === 0
                        ? 'start'
                        : idx === coords.length - 1
                          ? 'end'
                          : 'middle'
                    }
                    fill={pal.axisText}
                    fontSize="10"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {fmtOffsetSec(c.sample.elapsedSec)}
                  </text>
                );
              },
            )}

          {/* 10% opacity area wash + 2px solid line */}
          {areaPath && (
            <path d={areaPath} fill={color} fillOpacity={0.1} />
          )}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke={color}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Synchronized vertical hover crosshair */}
          {hoveredCoord && (
            <line
              x1={hoveredCoord.x}
              y1={padT}
              x2={hoveredCoord.x}
              y2={padT + plotH}
              stroke={pal.axisText}
              strokeWidth="1"
            />
          )}

          {/* Selective direct labels: only Peak and End (never a number on every point) */}
          {peakCoord && (
            <text
              x={peakCoord.x}
              y={Math.max(14, peakCoord.y - 8)}
              textAnchor="middle"
              fill={pal.textPrimary}
              fontSize="10"
              fontWeight="700"
            >
              {`${peakCoord.val.toFixed(1)} ${unit}`}
            </text>
          )}

          {/* Data markers with 2px surface ring & wide hit targets */}
          {coords.map((c, idx) => {
            const isHovered = hoverIdx === c.sample.idx;
            const isEndpoint = idx === 0 || idx === coords.length - 1;
            const isPeak = peakCoord?.sample.idx === c.sample.idx;
            return (
              <g
                key={`pt-${c.sample.idx}`}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => onHoverIdx(c.sample.idx)}
              >
                {(isHovered || isEndpoint || isPeak) && (
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r={isHovered ? 5.5 : 4}
                    fill={color}
                    stroke={pal.surface}
                    strokeWidth="2"
                  />
                )}
                <rect
                  x={c.x - plotW / Math.max(2, coords.length * 2)}
                  y={padT}
                  width={plotW / Math.max(1, coords.length)}
                  height={plotH}
                  fill="transparent"
                />
              </g>
            );
          })}
        </Box>
      </Box>
    </Paper>
  );
}

function BatteryAndModeSummaryCard({
  samples,
  startBat,
  endBat,
  modeBreakdown,
  pal,
  hoverIdx,
  onHoverIdx,
}: {
  samples: EnrichedSample[];
  startBat: number | null;
  endBat: number | null;
  modeBreakdown: Array<{ mode: string; count: number; pct: number; color: string }>;
  pal: typeof VIZ_PALETTE.light;
  hoverIdx: number | null;
  onHoverIdx: (idx: number | null) => void;
}) {
  const { t } = useLocale();
  const w = 480;
  const h = 145;
  const padL = 44;
  const padR = 24;
  const padT = 16;
  const padB = 22;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  const coords = useMemo(() => {
    const validSamples = samples.filter(
      (sample): sample is EnrichedSample & { battery: number } =>
        sample.batteryAvailable && sample.battery != null && Number.isFinite(sample.battery),
    );
    if (validSamples.length === 0) return [];
    return validSamples.map((s, idx) => {
      const clampedBattery = Math.max(0, Math.min(100, s.battery));
      const x = padL + (idx / Math.max(1, validSamples.length - 1)) * plotW;
      const y = padT + plotH - (clampedBattery / 100) * plotH;
      return {
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        bat: clampedBattery,
        sample: s,
      };
    });
  }, [samples, plotW, plotH]);

  const linePath = coords
    .map((c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.x} ${c.y}`)
    .join(' ');
  const areaPath =
    coords.length > 1
      ? `${linePath} L ${coords.at(-1)!.x} ${padT + plotH} L ${coords[0]!.x} ${padT + plotH} Z`
      : '';
  const rthY = padT + plotH - 0.2 * plotH;
  const hovered =
    hoverIdx != null ? coords.find((coord) => coord.sample.idx === hoverIdx) ?? null : null;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: '10px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <Box>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 1.25,
          }}
        >
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            <BatteryChargingFullRounded fontSize="small" color="primary" />
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {t('Battery & Flight Mode')}
            </Typography>
          </Stack>
          <Chip
            size="small"
            variant="outlined"
            label={
              hovered
                ? `${fmtOffsetSec(hovered.sample.elapsedSec)} · ${hovered.sample.batteryAvailable ? `${hovered.bat}%` : '—'} · ${hovered.sample.mode}`
                : startBat == null || endBat == null
                  ? t('Battery data not included in this log')
                  : `${startBat}% → ${endBat}% (-${Math.max(0, startBat - endBat)}%)`
            }
            sx={{ fontWeight: 600, height: 22, fontSize: '0.75rem' }}
          />
        </Stack>

        {/* Battery Discharge Mini-Plot */}
        <Box
          sx={{
            borderRadius: '8px',
            bgcolor: pal.surface,
            border: '1px solid',
            borderColor: 'divider',
            p: 0.5,
            mb: 1.5,
          }}
        >
          <Box
            component="svg"
            viewBox={`0 0 ${w} ${h}`}
            sx={{ width: '100%', height: 130, display: 'block' }}
            onMouseLeave={() => onHoverIdx(null)}
          >
            {[0, 0.5, 1].map((r) => {
              const y = padT + plotH - r * plotH;
              return (
                <g key={r}>
                  <line
                    x1={padL}
                    y1={y}
                    x2={w - padR}
                    y2={y}
                    stroke={pal.grid}
                    strokeWidth="1"
                  />
                  <text
                    x={padL - 8}
                    y={y + 3.5}
                    textAnchor="end"
                    fill={pal.axisText}
                    fontSize="9.5"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {Math.round(r * 100)}%
                  </text>
                </g>
              );
            })}

            {/* 20% RTH safety threshold */}
            <line
              x1={padL}
              y1={rthY}
              x2={w - padR}
              y2={rthY}
              stroke={pal.danger}
              strokeWidth="1"
            />
            <text
              x={w - padR - 4}
              y={rthY - 4}
              textAnchor="end"
              fill={pal.textSecondary}
              fontSize="8.5"
              fontWeight="600"
            >
              20% RTH
            </text>

            {areaPath && (
              <path d={areaPath} fill={pal.series3} fillOpacity={0.1} />
            )}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke={pal.series3}
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            )}

            {coords.map((c, idx) => {
              const isEndpoint = idx === 0 || idx === coords.length - 1;
              const isHovered = hoverIdx === c.sample.idx;
              return (
                <g
                  key={`bat-pt-${c.sample.idx}`}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => onHoverIdx(c.sample.idx)}
                >
                  {(isEndpoint || isHovered) && (
                    <circle
                      cx={c.x}
                      cy={c.y}
                      r={isHovered ? 5 : 4}
                      fill={pal.series3}
                      stroke={pal.surface}
                      strokeWidth="2"
                    />
                  )}
                </g>
              );
            })}
          </Box>
        </Box>

        {modeBreakdown.length > 0 && (
          <>
            <Box
              sx={{
                display: 'flex',
                width: '100%',
                height: 24,
                gap: '2px',
                bgcolor: pal.surface,
                mb: 1,
              }}
            >
              {modeBreakdown.map((item) => (
                <Box
                  key={item.mode}
                  sx={{
                    flexGrow: Math.max(item.pct, 4),
                    flexBasis: 0,
                    bgcolor: item.color,
                    borderRadius: '5px',
                    display: 'flex',
                    alignItems: 'center',
                    px: 1,
                    color: '#ffffff',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                  }}
                  title={`${item.mode}: ${item.pct}%`}
                >
                  {item.pct >= 22 ? `${item.pct}%` : ''}
                </Box>
              ))}
            </Box>

            <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
              {modeBreakdown.map((item) => (
                <LegendSwatch
                  key={item.mode}
                  color={item.color}
                  label={`${item.mode} (${item.pct}%)`}
                />
              ))}
            </Stack>
          </>
        )}
      </Box>
    </Paper>
  );
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
      <Box
        sx={{
          width: 10,
          height: 10,
          borderRadius: '2px',
          bgcolor: color,
          flexShrink: 0,
        }}
      />
      <Typography
        variant="caption"
        sx={{ color: 'text.secondary', fontWeight: 600, lineHeight: 1.2 }}
      >
        {label}
      </Typography>
    </Stack>
  );
}

function AutomatedEventLogTable({
  samples,
  evidenceList,
  startedAt,
  endedAt,
  startBat,
  endBat,
}: {
  samples: EnrichedSample[];
  evidenceList: EvidenceItem[];
  startedAt: string | null | undefined;
  endedAt: string | null | undefined;
  startBat: number | null;
  endBat: number | null;
}) {
  const { t, formatDateTime } = useLocale();

  const rows = useMemo(() => {
    const list: Array<{
      id: string;
      event: string;
      timestamp: string | null | undefined;
      gps: string;
      altitude: string;
      speed: string;
      battery: string;
      mode: string;
    }> = [];

    const fmtPointGps = (point: EnrichedSample | undefined) =>
      point && Number.isFinite(point.latitude) && Number.isFinite(point.longitude)
        ? `${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}`
        : '—';
    const fmtAlt = (value: number | null | undefined) =>
      value != null && Number.isFinite(value) ? `${value.toFixed(1)} m` : '—';
    const fmtSpd = (value: number | null | undefined) =>
      value != null && Number.isFinite(value) ? `${value.toFixed(1)} m/s` : '—';
    const fmtBat = (point: EnrichedSample | undefined, fallback: number | null) =>
      point?.battery != null
        ? `${point.battery}%`
        : fallback != null
          ? `${fallback}%`
          : '—';

    const first = samples[0];
    if (first || startedAt) {
      list.push({
        id: 'evt-takeoff',
        event: t('First recorded sample'),
        timestamp: first?.recordedAt ?? startedAt ?? null,
        gps: fmtPointGps(first),
        altitude: fmtAlt(first?.altitude),
        speed: fmtSpd(first?.speed),
        battery: fmtBat(first, startBat),
        mode: first?.mode ?? '—',
      });
    }

    const altitudeSamples = samples.filter(
      (sample): sample is EnrichedSample & { altitude: number } =>
        sample.altitude != null && Number.isFinite(sample.altitude),
    );
    if (samples.length > 2 && altitudeSamples.length > 0) {
      const peak = altitudeSamples.reduce(
        (best, cur) => (cur.altitude > best.altitude ? cur : best),
        altitudeSamples[0]!,
      );
      list.push({
        id: 'evt-peak',
        event: t('Maximum altitude recorded'),
        timestamp: peak.recordedAt ?? null,
        gps: fmtPointGps(peak),
        altitude: fmtAlt(peak.altitude),
        speed: fmtSpd(peak.speed),
        battery: fmtBat(peak, null),
        mode: peak.mode,
      });
    }

    evidenceList
      .filter((e) => !e.isDeleted)
      .slice(0, 8)
      .forEach((ev, idx) => {
        list.push({
          id: `evt-ev-${ev.id}`,
          event: `Evidence #${idx + 1}: ${ev.fileName}`,
          timestamp: ev.captureTime ?? startedAt ?? null,
          gps:
            ev.latitude != null && ev.longitude != null
              ? `${Number(ev.latitude).toFixed(6)}, ${Number(ev.longitude).toFixed(6)}`
              : '—',
          altitude: '—',
          speed: '—',
          battery: '—',
          mode: '—',
        });
      });

    const last = samples.at(-1);
    if (last || endedAt) {
      list.push({
        id: 'evt-land',
        event: t('Last recorded sample'),
        timestamp: endedAt ?? last?.recordedAt ?? null,
        gps: fmtPointGps(last),
        altitude: fmtAlt(last?.altitude),
        speed: fmtSpd(last?.speed),
        battery: fmtBat(last, endBat),
        mode: last?.mode ?? '—',
      });
    }

    return list;
  }, [samples, evidenceList, startedAt, endedAt, startBat, endBat, t]);

  return (
    <Paper variant="outlined" sx={{ p: 2.25, borderRadius: '10px' }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
        <CameraAltRounded fontSize="small" color="primary" />
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {t('Recorded telemetry samples & evidence geotags')}
        </Typography>
      </Stack>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>
                {t('Event / Milestone')}
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('Timestamp')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>GPS (Lat, Lon)</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('Altitude')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('Speed')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('Battery')}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t('Mode')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{r.event}</TableCell>
                <TableCell style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {r.timestamp ? formatDateTime(r.timestamp) : '—'}
                </TableCell>
                <TableCell
                  sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
                >
                  {r.gps}
                </TableCell>
                <TableCell style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {r.altitude}
                </TableCell>
                <TableCell style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {r.speed}
                </TableCell>
                <TableCell style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {r.battery}
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    variant="outlined"
                    label={r.mode}
                    sx={{ height: 20, fontSize: '0.75rem', fontWeight: 700 }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
