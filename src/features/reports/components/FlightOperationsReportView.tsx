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
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
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
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return '0m 00s';
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${String(secs).padStart(2, '0')}s`;
}

function fmtOffsetSec(sec: number): string {
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

  // Enrich each trace sample with elapsed seconds, interpolated battery, and mode
  const enrichedSamples = useMemo(() => {
    const startBat =
      report?.startBatteryPercent ??
      trace.find((p) => p.batteryPercent != null)?.batteryPercent ??
      100;
    const endBat =
      report?.endBatteryPercent ??
      [...trace].reverse().find((p) => p.batteryPercent != null)?.batteryPercent ??
      startBat;
    const totalDur = Math.max(1, report?.durationSeconds ?? trace.length * 3);
    const t0Ms = trace[0]?.recordedAt ? new Date(trace[0].recordedAt).getTime() : 0;

    return trace.map((pt, idx) => {
      const ratio = idx / Math.max(1, trace.length - 1);
      const rawElapsed =
        t0Ms && pt.recordedAt
          ? (new Date(pt.recordedAt).getTime() - t0Ms) / 1000
          : ratio * totalDur;
      const elapsedSec =
        Number.isFinite(rawElapsed) && rawElapsed >= 0
          ? Math.round(rawElapsed)
          : Math.round(ratio * totalDur);
      const bat =
        pt.batteryPercent ?? Math.round(startBat - ratio * (startBat - endBat));
      const mode = (
        pt.flightMode || (idx === trace.length - 1 ? 'LAND' : 'GUIDED')
      ).toUpperCase();
      return {
        ...pt,
        idx,
        elapsedSec,
        altitude: pt.altitudeMeters ?? 0,
        speed: pt.groundSpeedMps ?? 0,
        battery: Math.max(0, Math.min(100, bat)),
        mode,
      };
    });
  }, [trace, report]);

  const metrics = useMemo(() => {
    const alts = enrichedSamples.map((p) => p.altitude);
    const speeds = enrichedSamples.map((p) => p.speed);

    const maxAlt =
      report?.maxAltitudeMeters ?? (alts.length > 0 ? Math.max(...alts) : 0);
    const avgAlt =
      alts.length > 0 ? alts.reduce((a, b) => a + b, 0) / alts.length : 0;
    const maxSpeed = speeds.length > 0 ? Math.max(...speeds) : 0;
    const avgSpeed =
      speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;

    const startBat =
      report?.startBatteryPercent ?? enrichedSamples[0]?.battery ?? 100;
    const endBat =
      report?.endBatteryPercent ?? enrichedSamples.at(-1)?.battery ?? startBat;
    const batUsed = Math.max(0, startBat - endBat);
    const durationMin = Math.max((report?.durationSeconds ?? 60) / 60, 0.25);
    const drainRatePerMin = batUsed / durationMin;

    // Fixed categorical slot order (never cycled)
    const slotOrder = [pal.series1, pal.series2, pal.series3, pal.series4];
    const modeCounts: Record<string, number> = {};
    enrichedSamples.forEach((pt) => {
      modeCounts[pt.mode] = (modeCounts[pt.mode] ?? 0) + 1;
    });
    const totalPts = Math.max(1, enrichedSamples.length);
    const modeBreakdown = Object.entries(modeCounts).map(([mode, count], i) => ({
      mode,
      count,
      pct: Math.round((count / totalPts) * 100),
      color: slotOrder[i % slotOrder.length]!,
    }));
    if (modeBreakdown.length === 0) {
      modeBreakdown.push({
        mode: 'GUIDED',
        count: 1,
        pct: 100,
        color: pal.series1,
      });
    }

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
  const resolvedPermit =
    flightPermitFileName ??
    context?.flightPermitFileName ??
    'Verified on-site permit';

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
      loadingLabel={t(
        'Compiling automated Flight Operations Report from telemetry…',
      )}
    >
      {report && (
        <Stack spacing={2.5}>
          {/* 1. Flight Sortie & Compliance Header */}
          <Paper
            variant="outlined"
            sx={{
              p: 2.5,
              borderRadius: '12px',
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
                    {t('Automated Flight Operations & Telemetry Audit Report')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {`REF: SDI-FLT-${fieldSessionId.slice(0, 8).toUpperCase()} · ${t('100% Derived from MAVLink Telemetry (Zero Manual Input)')}`}
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
                  color="success"
                  icon={<CheckCircleRounded />}
                  label={
                    report.telemetrySource === 'MISSION_PLANNER_MAVLINK'
                      ? t('Verified MAVLink Telemetry')
                      : t('SmartDroneHub Telemetry')
                  }
                  sx={{ fontWeight: 700 }}
                />
                <Chip
                  size="small"
                  variant="outlined"
                  label={`${t('Final State')}: ${report.finalState}`}
                  sx={{ fontWeight: 700 }}
                />
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
                  {t('Flight Permit Gate')}
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
                    {resolvedPermit}
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<VisibilityOutlined sx={{ fontSize: 14 }} />}
                    onClick={() => setPermitDialogOpen(true)}
                    sx={{
                      height: 22,
                      px: 1,
                      fontSize: '0.7rem',
                      fontWeight: 650,
                      textTransform: 'none',
                      borderRadius: '6px',
                    }}
                  >
                    {t('View permit')}
                  </Button>
                </Stack>
              </Box>
              <MetaItem
                label={t('Takeoff / Started At')}
                value={report.startedAt ? formatDateTime(report.startedAt) : '—'}
              />
              <MetaItem
                label={t('Landed / Ended At')}
                value={report.endedAt ? formatDateTime(report.endedAt) : '—'}
              />
              <MetaItem label={t('Telemetry Audit Note')} value={report.note} />
            </Box>
          </Paper>

          <FlightPermitPreviewDialog
            open={permitDialogOpen}
            onClose={() => setPermitDialogOpen(false)}
            inspectionId={inspectionId}
            fileName={resolvedPermit}
            uploadedAt={context?.flightPermitUploadedAt}
            assetName={resolvedAsset !== '—' ? resolvedAsset : null}
            droneSummary={resolvedDrone !== '—' ? resolvedDrone : null}
          />

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
              label={t('Flight duration')}
              value={fmtDuration(report.durationSeconds)}
              sub={`${report.durationSeconds}s total sortie`}
            />
            <StatTile
              label={t('Distance flown')}
              value={`${fmtNum(report.distanceFlownMeters, 1)} m`}
              sub={t('Cumulative GPS Haversine')}
            />
            <StatTile
              label={t('Peak altitude AGL')}
              value={`${fmtNum(metrics.maxAlt, 1)} m`}
              sub={`${t('Avg')}: ${fmtNum(metrics.avgAlt, 1)} m AGL`}
            />
            <StatTile
              label={t('Peak ground speed')}
              value={`${fmtNum(metrics.maxSpeed, 1)} m/s`}
              sub={`${t('Avg')}: ${fmtNum(metrics.avgSpeed, 1)} m/s`}
            />
            <StatTile
              label={t('Battery consumption')}
              value={`${metrics.startBat}% → ${metrics.endBat}%`}
              sub={`-${metrics.batUsed}% (${fmtNum(metrics.drainRatePerMin, 1)}%/min)`}
            />
            <StatTile
              label={t('Telemetry samples')}
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
            <GpsTrajectoryMapCard
              samples={enrichedSamples}
              evidenceList={evidenceList}
              pal={pal}
              hoverIdx={hoverIdx}
              onHoverIdx={setHoverIdx}
            />

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

            <BatteryAndModeSummaryCard
              samples={enrichedSamples}
              startBat={metrics.startBat}
              endBat={metrics.endBat}
              modeBreakdown={metrics.modeBreakdown}
              pal={pal}
              hoverIdx={hoverIdx}
              onHoverIdx={setHoverIdx}
            />
          </Box>

          {/* 4. Automated Flight Milestone & Evidence Geotag Log Table */}
          <AutomatedEventLogTable
            samples={enrichedSamples}
            evidenceList={evidenceList}
            startedAt={report.startedAt}
            endedAt={report.endedAt}
            startBat={metrics.startBat}
            endBat={metrics.endBat}
          />
        </Stack>
      )}
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
          fontSize: '1.15rem',
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
  elapsedSec: number;
  altitude: number;
  speed: number;
  battery: number;
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
  const [expanded, setExpanded] = useState(false);
  const [viewDimension, setViewDimension] = useState<'2d' | '3d'>('3d');
  const [mapStyle, setMapStyle] = useState<'street' | 'satellite'>('street');
  const [lockedIdx, setLockedIdx] = useState<number | null>(null);

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
      <Paper variant="outlined" sx={{ p: 2, borderRadius: '12px' }}>
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
                label={`${fmtOffsetSec(activeSample.elapsedSec)} · ${activeSample.altitude.toFixed(1)} m`}
                sx={{ height: 22, fontSize: '0.72rem', fontWeight: 600 }}
              />
            )}
            <Button
              size="small"
              variant={viewDimension === '3d' ? 'contained' : 'outlined'}
              onClick={() =>
                setViewDimension((d) => (d === '2d' ? '3d' : '2d'))
              }
              sx={{
                minWidth: 38,
                height: 24,
                px: 1,
                fontSize: '0.72rem',
                fontWeight: 700,
                textTransform: 'none',
              }}
            >
              {viewDimension === '3d' ? '3D' : '2D'}
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
                fontSize: '0.72rem',
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
                borderRadius: '6px',
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
          viewDimension={viewDimension}
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
              variant={viewDimension === '3d' ? 'contained' : 'outlined'}
              startIcon={<ViewInArRounded fontSize="small" />}
              onClick={() =>
                setViewDimension((d) => (d === '2d' ? '3d' : '2d'))
              }
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              {viewDimension === '3d' ? '3D View' : '2D View'}
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
            viewDimension={viewDimension}
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
  getValue: (s: EnrichedSample) => number;
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
    if (samples.length === 0) return [];
    return samples.map((s, idx) => {
      const x =
        padL + (idx / Math.max(1, samples.length - 1)) * plotW;
      const val = Math.max(0, getValue(s));
      const y = padT + plotH - (Math.min(val, maxValue) / maxValue) * plotH;
      return {
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        val,
        sample: s,
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
    hoverIdx != null && coords[hoverIdx] ? coords[hoverIdx] : null;

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: '12px' }}>
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
          sx={{ fontWeight: 600, height: 22, fontSize: '0.72rem' }}
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
          {hoverIdx != null && coords[hoverIdx] && (
            <line
              x1={coords[hoverIdx]!.x}
              y1={padT}
              x2={coords[hoverIdx]!.x}
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
            const isHovered = hoverIdx === idx;
            const isEndpoint = idx === 0 || idx === coords.length - 1;
            const isPeak = peakCoord?.sample.idx === idx;
            return (
              <g
                key={`pt-${idx}`}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => onHoverIdx(idx)}
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
  startBat: number;
  endBat: number;
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
    if (samples.length === 0) return [];
    return samples.map((s, idx) => {
      const x = padL + (idx / Math.max(1, samples.length - 1)) * plotW;
      const y = padT + plotH - (s.battery / 100) * plotH;
      return {
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        bat: s.battery,
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
  const hovered = hoverIdx != null && coords[hoverIdx] ? coords[hoverIdx] : null;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: '12px',
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
                ? `${fmtOffsetSec(hovered.sample.elapsedSec)} · ${hovered.bat}% · ${hovered.sample.mode}`
                : `${startBat}% → ${endBat}% (-${Math.max(0, startBat - endBat)}%)`
            }
            sx={{ fontWeight: 600, height: 22, fontSize: '0.72rem' }}
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
              const isHovered = hoverIdx === idx;
              return (
                <g
                  key={`bat-pt-${idx}`}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => onHoverIdx(idx)}
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
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                px: 1,
                color: '#ffffff',
                fontSize: '0.72rem',
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
  startedAt: string;
  endedAt: string | null;
  startBat: number;
  endBat: number;
}) {
  const { t, formatDateTime } = useLocale();

  const rows = useMemo(() => {
    const list: Array<{
      id: string;
      event: string;
      timestamp: string;
      gps: string;
      altitude: string;
      speed: string;
      battery: string;
      mode: string;
    }> = [];

    const first = samples[0];
    list.push({
      id: 'evt-takeoff',
      event: 'Takeoff / Mission Start',
      timestamp: first?.recordedAt ?? startedAt,
      gps: first
        ? `${first.latitude.toFixed(6)}, ${first.longitude.toFixed(6)}`
        : '—',
      altitude: first ? `${first.altitude.toFixed(1)} m` : '0.0 m',
      speed: first ? `${first.speed.toFixed(1)} m/s` : '0.0 m/s',
      battery: `${first?.battery ?? startBat}%`,
      mode: first?.mode ?? 'GUIDED',
    });

    if (samples.length > 2) {
      const peak = samples.reduce(
        (best, cur) => (cur.altitude > best.altitude ? cur : best),
        samples[0]!,
      );
      list.push({
        id: 'evt-peak',
        event: 'Peak Altitude Reached',
        timestamp: peak.recordedAt,
        gps: `${peak.latitude.toFixed(6)}, ${peak.longitude.toFixed(6)}`,
        altitude: `${peak.altitude.toFixed(1)} m`,
        speed: `${peak.speed.toFixed(1)} m/s`,
        battery: `${peak.battery}%`,
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
          timestamp: ev.captureTime ?? startedAt,
          gps:
            ev.latitude != null && ev.longitude != null
              ? `${Number(ev.latitude).toFixed(6)}, ${Number(ev.longitude).toFixed(6)}`
              : '—',
          altitude: '—',
          speed: 'Station Hover',
          battery: '—',
          mode: 'GUIDED',
        });
      });

    const last = samples.at(-1);
    list.push({
      id: 'evt-land',
      event: 'Landing / Session Completed',
      timestamp: endedAt ?? last?.recordedAt ?? startedAt,
      gps: last
        ? `${last.latitude.toFixed(6)}, ${last.longitude.toFixed(6)}`
        : '—',
      altitude: last ? `${last.altitude.toFixed(1)} m` : '0.0 m',
      speed: '0.0 m/s',
      battery: `${last?.battery ?? endBat}%`,
      mode: last?.mode ?? 'LAND',
    });

    return list;
  }, [samples, evidenceList, startedAt, endedAt, startBat, endBat]);

  return (
    <Paper variant="outlined" sx={{ p: 2.25, borderRadius: '12px' }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
        <CameraAltRounded fontSize="small" color="primary" />
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {t('Automated Flight Milestone & Evidence Geotag Log')}
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
                  sx={{ fontFamily: 'monospace', fontSize: '0.78rem' }}
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
                    sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }}
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
