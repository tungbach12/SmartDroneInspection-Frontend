import { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import ExpandLessRounded from '@mui/icons-material/ExpandLessRounded';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import FlightTakeoffRounded from '@mui/icons-material/FlightTakeoffRounded';
import MovieOutlined from '@mui/icons-material/MovieOutlined';
import PlaceOutlined from '@mui/icons-material/PlaceOutlined';
import PlayCircleOutlineRounded from '@mui/icons-material/PlayCircleOutlineRounded';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded';
import type {
  EvidenceItem,
  FieldSession,
  InspectionReport,
  Finding,
  ReinspectionVerificationItem,
} from '@/features/inspections/api/inspectionApi';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { AuthenticatedMedia, type MediaSeekRequest } from '@/shared/ui/AuthenticatedMedia';
import { inspectionApi } from '@/features/inspections/api/inspectionApi';
import { EvidenceGpsMapDialog } from '@/features/inspections/components/EvidenceGpsMapDialog';
import { FlightPermitPreviewDialog } from '@/features/inspections/components/FlightPermitPreviewDialog';
import { parseBoundingBox } from '@/features/inspections/utils/boundingBox';
import { formatLocation } from '@/shared/airspace/airspaceZones';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { ReportAiSummaryCard } from './ReportAiSummaryCard';
import { ReportFindingsMapPanel } from './ReportFindingsMapPanel';

function getTelemetryShortLabel(
  telemetrySource: string | null | undefined,
  t: (key: string) => string,
): string {
  if (!telemetrySource) return t('Not recorded');
  if (telemetrySource === 'MISSION_PLANNER_MAVLINK') {
    return `${t('Live stream during flight')} (MAVLink)`;
  }
  if (telemetrySource.startsWith('IMPORTED_LOG_')) {
    const fmt = telemetrySource.replace('IMPORTED_LOG_', '');
    return `${t('Uploaded flight log file')} (${fmt})`;
  }
  if (telemetrySource === 'SMARTDRONEHUB_SIMULATION') {
    return t('Simulated telemetry');
  }
  if (telemetrySource === 'MANUAL_DECLARATION') {
    return t('Manual declaration');
  }
  return t('Not recorded');
}

function evidenceGridColumns(count: number) {
  if (count <= 1) {
    return { xs: '1fr', md: 'minmax(0, 560px)' };
  }
  if (count === 2) {
    return { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' };
  }
  return {
    xs: '1fr',
    sm: 'repeat(2, minmax(0, 1fr))',
    lg: 'repeat(3, minmax(0, 1fr))',
  };
}

function EvidenceThumbBox({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  return (
    <Box
      sx={{
        height: 176,
        width: '100%',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'action.hover',
        mb: 1.25,
        flexShrink: 0,
      }}
    >
      <AuthenticatedImage
        src={src}
        alt={alt}
        maxHeight="100%"
        sx={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          borderRadius: 0,
        }}
      />
    </Box>
  );
}

export interface ReportDerivedSectionsProps {
  version: InspectionReport;
  findings: Finding[];
  evidenceList: EvidenceItem[];
  fieldSessions?: FieldSession[] | undefined;
  reinspectionVerifications?: ReinspectionVerificationItem[] | undefined;
  inspectionId: string;
  droneSummary?: string | null | undefined;
  flightPermitFileName?: string | null | undefined;
}

function formatEvidenceLocationDescription(
  raw: string | null | undefined,
  t: (key: string) => string,
): string | null | undefined {
  if (!raw || !raw.trim()) return raw;
  const trimmed = raw.trim();
  const cropMatch =
    trimmed.match(/^Trích xuất & cắt từ video (.+?) tại (.+)$/i) ??
    trimmed.match(/^Extracted(?: frame crop)? from video (.+?) at (.+)$/i);
  if (cropMatch) {
    return `${t('Extracted from video')} ${cropMatch[1]} @ ${cropMatch[2]}`;
  }
  const yoloMatch = trimmed.match(
    /^AI YOLO11 extracted from (.+?) @ ([^\s(]+)(?:\s*\((.+)\))?$/i,
  );
  if (yoloMatch) {
    const labelPart = yoloMatch[3] ? ` (${t(yoloMatch[3])})` : '';
    return `${t('AI YOLO11 extracted from')} ${yoloMatch[1]} @ ${yoloMatch[2]}${labelPart}`;
  }
  return trimmed;
}

function formatChecklistLabel(rawItem: string, t: (key: string) => string): string {
  const trimmed = rawItem.trim();
  if (trimmed.startsWith('Inspected:')) {
    return `${t('Inspected')}: ${trimmed.slice('Inspected:'.length).trim()}`;
  }
  return t(trimmed);
}

function getTelemetryOriginBadge(
  telemetrySource: string | null | undefined,
  t: (key: string) => string,
): { label: string; color: 'success' | 'info' | 'warning' | 'default' } | null {
  if (!telemetrySource) return null;
  if (telemetrySource === 'MISSION_PLANNER_MAVLINK') {
    return { label: `${t('Telemetry source')}: ${t('Live stream during flight')} (MAVLink)`, color: 'success' };
  }
  if (telemetrySource.startsWith('IMPORTED_LOG_')) {
    const fmt = telemetrySource.replace('IMPORTED_LOG_', '');
    return { label: `${t('Telemetry source')}: ${t('Uploaded flight log file')} (${fmt})`, color: 'info' };
  }
  if (telemetrySource === 'SMARTDRONEHUB_SIMULATION') {
    return { label: `${t('Telemetry source')}: ${t('Simulated telemetry')}`, color: 'warning' };
  }
  if (telemetrySource === 'MANUAL_DECLARATION') {
    return { label: `${t('Telemetry source')}: ${t('Manual declaration (no file or stream)')}`, color: 'warning' };
  }
  if (telemetrySource === 'NONE') {
    return { label: `${t('Telemetry source')}: ${t('Not recorded')}`, color: 'default' };
  }
  return null;
}

type ParsedChecklist = {
  checkedItems: string[];
  skippedItems: string[];
  remark: string | null;
};

function parseSessionChecklist(raw: string | null | undefined): ParsedChecklist {
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

const INSPECTED_ITEM_PREFIX = /^(?:Inspected|Đã kiểm tra)\s*:\s*/i;

function splitOutcomeAndInspectionChecklists(
  rawOutcomeNotes: string | null | undefined,
  fallbackInspectionItems?: string[] | null,
  sessionStatus?: string | null,
): {
  postFlightChecklist: ParsedChecklist;
  inspectionChecklist: ParsedChecklist;
  isUnstructuredRemarkOnly: boolean;
} {
  const parsed = parseSessionChecklist(rawOutcomeNotes);
  const isUnstructured =
    Boolean(rawOutcomeNotes?.trim()) &&
    parsed.checkedItems.length === 0 &&
    parsed.skippedItems.length === 0;

  if (isUnstructured) {
    const fallbackChecked =
      sessionStatus === 'FIELD_COMPLETED' && fallbackInspectionItems?.length
        ? fallbackInspectionItems.filter((item) => Boolean(item?.trim()))
        : [];
    return {
      postFlightChecklist: parsed,
      inspectionChecklist: { checkedItems: fallbackChecked, skippedItems: [], remark: null },
      isUnstructuredRemarkOnly: true,
    };
  }

  const postChecked: string[] = [];
  const inspChecked: string[] = [];
  for (const item of parsed.checkedItems) {
    if (INSPECTED_ITEM_PREFIX.test(item)) {
      inspChecked.push(item.replace(INSPECTED_ITEM_PREFIX, '').trim());
    } else {
      postChecked.push(item);
    }
  }

  const postSkipped: string[] = [];
  const inspSkipped: string[] = [];
  for (const item of parsed.skippedItems) {
    if (INSPECTED_ITEM_PREFIX.test(item)) {
      inspSkipped.push(item.replace(INSPECTED_ITEM_PREFIX, '').trim());
    } else {
      postSkipped.push(item);
    }
  }

  if (
    inspChecked.length === 0 &&
    inspSkipped.length === 0 &&
    sessionStatus === 'FIELD_COMPLETED' &&
    fallbackInspectionItems?.length
  ) {
    for (const item of fallbackInspectionItems) {
      if (item?.trim()) inspChecked.push(item.trim());
    }
  }

  return {
    postFlightChecklist: {
      checkedItems: postChecked,
      skippedItems: postSkipped,
      remark: parsed.remark,
    },
    inspectionChecklist: {
      checkedItems: inspChecked,
      skippedItems: inspSkipped,
      remark: null,
    },
    isUnstructuredRemarkOnly: false,
  };
}

function SessionChecklistBlock({
  label,
  rawNote,
  parsedChecklist,
  defaultExpanded = false,
}: {
  label: string;
  rawNote?: string | undefined;
  parsedChecklist?: ParsedChecklist | undefined;
  defaultExpanded?: boolean | undefined;
}) {
  const { t } = useLocale();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const { checkedItems, skippedItems, remark } =
    parsedChecklist ?? parseSessionChecklist(rawNote);

  if (checkedItems.length === 0 && skippedItems.length === 0) {
    if (!rawNote?.trim() && !remark) return null;
    return (
      <Box
        sx={{
          p: 1.25,
          borderRadius: '8px',
          bgcolor: 'action.hover',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', mb: 0.25 }}>
          {label}
        </Typography>
        <Typography variant="body2" sx={{ fontSize: '0.875rem', color: 'text.primary' }}>
          {remark ?? rawNote}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: 1.5,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '10px',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={() => setExpanded((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpanded((prev) => !prev);
          }
        }}
        sx={{
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: expanded ? 1 : 0,
          mb: expanded ? 0.75 : 0,
          borderBottom: expanded ? '1px solid' : 'none',
          borderColor: 'divider',
          flexWrap: 'nowrap',
          gap: 0.75,
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0, flex: 1 }}>
          <CheckCircleRounded color="success" sx={{ fontSize: 16, flexShrink: 0 }} />
          <Typography
            variant="caption"
            title={label}
            sx={{
              fontWeight: 700,
              color: 'text.primary',
              fontSize: '0.8rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexShrink: 0 }}>
          {checkedItems.length > 0 && (
            <Chip
              size="small"
              variant="outlined"
              label={`${checkedItems.length} ${t('verified')}`}
              sx={{
                height: 20,
                fontSize: '0.75rem',
                fontWeight: 650,
                bgcolor: '#f0fdf4',
                color: '#166534',
                borderColor: '#bbf7d0',
              }}
            />
          )}
          {skippedItems.length > 0 && (
            <Chip
              size="small"
              variant="outlined"
              label={`${skippedItems.length} ${t('skipped')}`}
              sx={{
                height: 20,
                fontSize: '0.75rem',
                fontWeight: 650,
                bgcolor: '#fef9c3',
                color: '#713f12',
                borderColor: '#fde047',
              }}
            />
          )}
          {expanded ? (
            <ExpandLessRounded fontSize="small" sx={{ color: 'text.secondary' }} />
          ) : (
            <ExpandMoreRounded fontSize="small" sx={{ color: 'text.secondary' }} />
          )}
        </Stack>
      </Stack>

      <Collapse in={expanded} timeout="auto">
        <Stack spacing={0}>
          {checkedItems.map((item, idx) => (
            <Box
              key={`chk-${idx}`}
              sx={{
                py: 0.65,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 0.85,
                borderTop: idx === 0 ? 'none' : '1px solid',
                borderColor: 'divider',
              }}
            >
              <CheckCircleRounded color="success" sx={{ fontSize: 15, mt: '2px', flexShrink: 0 }} />
              <Typography variant="caption" sx={{ fontWeight: 500, color: 'text.primary', lineHeight: 1.4 }}>
                {formatChecklistLabel(item, t)}
              </Typography>
            </Box>
          ))}
          {skippedItems.map((item, idx) => (
            <Box
              key={`skp-${idx}`}
              sx={{
                py: 0.65,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 0.85,
                borderTop: '1px solid',
                borderColor: 'divider',
              }}
            >
              <WarningAmberRounded color="warning" sx={{ fontSize: 15, mt: '2px', flexShrink: 0 }} />
              <Typography variant="caption" sx={{ fontWeight: 500, color: 'text.primary', lineHeight: 1.4 }}>
                {formatChecklistLabel(item, t)}
              </Typography>
            </Box>
          ))}
        </Stack>

        {remark && (
          <Stack
            direction="row"
            spacing={0.75}
            sx={{
              mt: 0.75,
              pt: 1,
              borderTop: '1px dashed',
              borderColor: 'divider',
              alignItems: 'baseline',
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', flexShrink: 0 }}>
              {t('Inspector note')}:
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 500 }}>
              {remark}
            </Typography>
          </Stack>
        )}
      </Collapse>
    </Box>
  );
}

function formatDateTime(
  value: string | null | undefined,
  format: (input: Date | string | number, options?: Intl.DateTimeFormatOptions) => string,
  fallback: string,
): string {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return format(parsed);
}

function ReadOnlySection({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <Box component="section" sx={{ mb: 3 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.25 }}>
        <Typography component="h2" sx={{ fontSize: '1rem', fontWeight: 700, color: 'text.primary' }}>
          {title}
        </Typography>
        {typeof count === 'number' && (
          <Chip size="small" label={count} sx={{ height: 20, fontSize: '0.75rem', fontWeight: 700 }} />
        )}
      </Stack>
      {children}
    </Box>
  );
}

function SummaryItem({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value?.trim()) return null;
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500, fontSize: '0.875rem', wordBreak: 'break-word' }}>
        {value}
      </Typography>
    </Box>
  );
}

function Field({
  label,
  value,
  stacked = false,
}: {
  label: string;
  value: string | null | undefined;
  stacked?: boolean;
}) {
  const { t } = useLocale();
  const displayValue = value?.trim();
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: stacked ? 'column' : 'row',
        justifyContent: stacked ? 'flex-start' : 'space-between',
        alignItems: stacked ? 'flex-start' : 'baseline',
        gap: stacked ? 0.25 : 1.5,
        py: 0.5,
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.75rem', flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography
        variant="body2"
        title={displayValue || undefined}
        sx={{
          color: 'text.primary',
          fontSize: '0.75rem',
          textAlign: stacked ? 'left' : 'right',
          wordBreak: 'break-word',
          ...(stacked
            ? {
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                width: '100%',
              }
            : {}),
        }}
      >
        {displayValue ? displayValue : <Box component="span" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>{t('Not supplied')}</Box>}
      </Typography>
    </Box>
  );
}

function formatVideoMmSs(seconds: number | null | undefined): string {
  const safe = Math.max(0, Math.floor(seconds ?? 0));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function getSoftSeverityChipSx(severity: Finding['severity']) {
  if (severity === 'CRITICAL' || severity === 'HIGH') {
    return (theme: { palette: { mode: string } }) => ({
      height: 22,
      fontSize: '0.75rem',
      fontWeight: 600,
      bgcolor: theme.palette.mode === 'dark' ? 'rgba(239, 68, 68, 0.14)' : '#fef2f2',
      borderColor: theme.palette.mode === 'dark' ? 'rgba(239, 68, 68, 0.35)' : '#fecaca',
      color: theme.palette.mode === 'dark' ? '#fca5a5' : '#b91c1c',
    });
  }
  if (severity === 'MEDIUM') {
    return (theme: { palette: { mode: string } }) => ({
      height: 22,
      fontSize: '0.75rem',
      fontWeight: 600,
      bgcolor: theme.palette.mode === 'dark' ? 'rgba(245, 158, 11, 0.14)' : '#fffbeb',
      borderColor: theme.palette.mode === 'dark' ? 'rgba(245, 158, 11, 0.38)' : '#fde68a',
      color: theme.palette.mode === 'dark' ? '#fcd34d' : '#b45309',
    });
  }
  return {
    height: 22,
    fontSize: '0.75rem',
    fontWeight: 600,
    bgcolor: 'action.hover',
    borderColor: 'divider',
    color: 'text.secondary',
  };
}

export function ReportDerivedSections({
  version,
  findings,
  evidenceList,
  fieldSessions,
  reinspectionVerifications,
  inspectionId,
  droneSummary: externalDroneSummary,
  flightPermitFileName: externalPermitFileName,
}: ReportDerivedSectionsProps) {
  const { t, formatDateTime: formatDateTimeValue } = useLocale();
  const [selectedMapEvidenceId, setSelectedMapEvidenceId] = useState<string | null>(null);
  const [mapFocusNonce, setMapFocusNonce] = useState(0);
  const [standaloneMapEvidence, setStandaloneMapEvidence] = useState<EvidenceItem | null>(null);
  const [permitDialogOpen, setPermitDialogOpen] = useState(false);
  const [evidenceFilter, setEvidenceFilter] = useState<'all' | 'defects' | 'videos' | 'clear'>('all');
  const [videoSeekById, setVideoSeekById] = useState<Record<string, MediaSeekRequest>>({});
  const [videoModal, setVideoModal] = useState<{
    video: EvidenceItem;
    seekRequest: MediaSeekRequest;
  } | null>(null);

  const reportableFindings = findings.filter((finding) => finding.status === 'CONFIRMED');
  const context = version.reportContext;
  const sessionDrone = context?.fieldSessions?.at(-1);
  const droneSummary =
    [
      context?.assignedDrone?.manufacturer ?? sessionDrone?.droneManufacturer,
      context?.assignedDrone?.model ?? sessionDrone?.droneModel,
      context?.assignedDrone?.serialNumber ?? sessionDrone?.droneSerialNumber,
    ]
      .filter(Boolean)
      .join(' · ') ||
    externalDroneSummary ||
    '';
  const resolvedPermitFileName =
    context?.flightPermitFileName ?? externalPermitFileName ?? null;

  const unlinkedFindings = reportableFindings.filter(
    (finding) => !evidenceList.some((item) => item.id === finding.evidenceId),
  );
  const flightVideos = evidenceList.filter((item) => item.contentType.startsWith('video/'));
  const nonVideoEvidence = evidenceList.filter((item) => !item.contentType.startsWith('video/'));
  const defectEvidence = nonVideoEvidence.filter((item) =>
    reportableFindings.some((finding) => finding.evidenceId === item.id),
  );
  const clearCaptures = nonVideoEvidence.filter(
    (item) => !reportableFindings.some((finding) => finding.evidenceId === item.id),
  );

  const openSourceVideoAtFrame = (sourceVideoId: string, timestampSeconds: number) => {
    const videoItem = evidenceList.find((ev) => ev.id === sourceVideoId);
    if (!videoItem) return;
    setVideoModal({
      video: videoItem,
      seekRequest: { timestampSeconds, nonce: Date.now() },
    });
  };
  const focusEvidenceOnReportMap = (item: EvidenceItem) => {
    const isInDefectMap = defectEvidence.some(
      (ev) =>
        ev.id === item.id &&
        ev.latitude != null &&
        ev.longitude != null &&
        Number.isFinite(Number(ev.latitude)) &&
        Number.isFinite(Number(ev.longitude)),
    );
    if (isInDefectMap) {
      setSelectedMapEvidenceId(item.id);
      setMapFocusNonce((n) => n + 1);
      if (evidenceFilter !== 'all' && evidenceFilter !== 'defects') {
        setEvidenceFilter('all');
      }
      document.getElementById('report-findings-map')?.scrollIntoView?.({
        behavior: 'smooth',
        block: 'nearest',
      });
      return;
    }
    setStandaloneMapEvidence(item);
  };
  const jumpToEvidenceRow = (evidenceId: string) => {
    setSelectedMapEvidenceId(evidenceId);
    document.getElementById(`report-evidence-${evidenceId}`)?.scrollIntoView?.({
      behavior: 'smooth',
      block: 'center',
    });
  };
  const reportSummaryText = version.summary?.trim() || null;
  const latestContextSession = context?.fieldSessions?.at(-1);
  const latestLiveSession = latestContextSession
    ? fieldSessions?.find((s) => s.id === latestContextSession.id)
    : fieldSessions?.at(-1);
  const primaryTelemetrySource =
    latestContextSession?.telemetrySource ?? latestLiveSession?.telemetrySource ?? null;

  const totalChecklistStats = (context?.fieldSessions ?? []).reduce(
    (acc, sess) => {
      const pre = parseSessionChecklist(sess.preFlightChecklistNote);
      const post = parseSessionChecklist(sess.outcomeNotes);
      return {
        verified: acc.verified + pre.checkedItems.length + post.checkedItems.length,
        total:
          acc.total +
          pre.checkedItems.length +
          pre.skippedItems.length +
          post.checkedItems.length +
          post.skippedItems.length,
      };
    },
    { verified: 0, total: 0 },
  );

  return (
    <Box>
      <Box sx={{ mb: 2.5 }}>
        <ReportAiSummaryCard
          inspectionId={inspectionId}
          versionId={version.id}
          summary={reportSummaryText}
          findings={findings}
          evidenceList={evidenceList}
          assetName={context?.assetName}
          evidenceCount={evidenceList.length}
        />
      </Box>

      {/* Executive at-a-glance strip so reviewer immediately knows key counts & flight origin */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' },
          gap: 1.5,
          mb: 3,
        }}
      >
        <Box
          sx={{
            p: 1.5,
            borderRadius: '10px',
            border: '1px solid',
            borderColor: reportableFindings.length > 0 ? 'warning.light' : 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block' }}>
            {t('Confirmed findings')}
          </Typography>
          <Typography
            sx={{
              fontSize: '1.25rem',
              fontWeight: 800,
              color: reportableFindings.length > 0 ? 'warning.dark' : 'success.main',
              lineHeight: 1.3,
              mt: 0.25,
            }}
          >
            {reportableFindings.length}
          </Typography>
        </Box>

        <Box
          sx={{
            p: 1.5,
            borderRadius: '10px',
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block' }}>
            {t('Evidence register')}
          </Typography>
          <Typography sx={{ fontSize: '1.25rem', fontWeight: 800, color: 'text.primary', lineHeight: 1.3, mt: 0.25 }}>
            {evidenceList.length}
          </Typography>
        </Box>

        <Box
          sx={{
            p: 1.5,
            borderRadius: '10px',
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block' }}>
            {t('Field safety & completion')}
          </Typography>
          <Typography sx={{ fontSize: '1.25rem', fontWeight: 800, color: 'success.main', lineHeight: 1.3, mt: 0.25 }}>
            {totalChecklistStats.total > 0
              ? `${totalChecklistStats.verified}/${totalChecklistStats.total}`
              : (context?.fieldSessions?.at(-1)?.status ?? '—')}
          </Typography>
        </Box>

        <Box
          sx={{
            p: 1.5,
            borderRadius: '10px',
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block' }}>
            {t('Telemetry source')}
          </Typography>
          <Typography
            sx={{
              fontSize: '0.925rem',
              fontWeight: 700,
              color: 'text.primary',
              lineHeight: 1.35,
              mt: 0.5,
            }}
          >
            {getTelemetryShortLabel(primaryTelemetrySource, t)}
          </Typography>
        </Box>
      </Box>

      <ReadOnlySection title={t('Identification')}>
        <Box
          sx={{
            p: 1.75,
            borderRadius: '10px',
            bgcolor: 'action.hover',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, minmax(0, 1fr))' },
              gap: 1.5,
            }}
          >
            <SummaryItem
              label={t('Report reference')}
              value={`SDI-RPT-${version.id.slice(0, 8).toUpperCase()}-V${version.versionNo}`}
            />
            <SummaryItem
              label={t('Version / status')}
              value={`v${version.versionNo} · ${version.status}`}
            />
            <SummaryItem label={t('Organization')} value={context?.organizationName} />
            <SummaryItem
              label={t('Asset')}
              value={[context?.assetName, context?.assetCode].filter(Boolean).join(' · ')}
            />
            <SummaryItem
              label={t('Asset location')}
              value={context?.assetLocation ? formatLocation(context.assetLocation) : null}
            />
            <SummaryItem label={t('Asset category')} value={context?.assetCategory} />
            <SummaryItem label={t('Assigned Drone')} value={droneSummary} />
            {resolvedPermitFileName && (
              <Box sx={{ minWidth: 0 }}>
                <Stack
                  direction="row"
                  sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.75, mb: 0.25 }}
                >
                  <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary', fontWeight: 600 }}
                  >
                    {t('Flight permit')}
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<VisibilityOutlined sx={{ fontSize: 13 }} />}
                    onClick={() => setPermitDialogOpen(true)}
                    sx={{
                      height: 20,
                      minHeight: 20,
                      py: 0,
                      px: 0.85,
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      textTransform: 'none',
                      borderRadius: '6px',
                      lineHeight: 1,
                    }}
                  >
                    {t('View permit')}
                  </Button>
                </Stack>
                <Typography
                  variant="body2"
                  sx={{
                    color: 'text.primary',
                    fontWeight: 500,
                    fontSize: '0.875rem',
                    wordBreak: 'break-word',
                  }}
                >
                  {resolvedPermitFileName}
                </Typography>
              </Box>
            )}
            {context?.findingsConfirmedAt && (
              <SummaryItem
                label={t('Findings confirmation')}
                value={formatDateTime(context.findingsConfirmedAt, formatDateTimeValue, '')}
              />
            )}
            {version.submittedAt && (
              <SummaryItem
                label={t('Submitted')}
                value={formatDateTime(version.submittedAt, formatDateTimeValue, '')}
              />
            )}
            {version.reviewedAt && (
              <SummaryItem
                label={t('Review decision')}
                value={formatDateTime(version.reviewedAt, formatDateTimeValue, '')}
              />
            )}
            {version.publishedAt && (
              <SummaryItem
                label={t('Published')}
                value={formatDateTime(version.publishedAt, formatDateTimeValue, '')}
              />
            )}
            {version.returnReason && (
              <SummaryItem label={t('Return rationale')} value={version.returnReason} />
            )}
          </Box>

          {context?.fieldSessions && context.fieldSessions.length > 0 && (
            <Stack
              spacing={1.25}
              sx={{ mt: 2, pt: 1.75, borderTop: '1px solid', borderColor: 'divider' }}
            >
              {context.fieldSessions.map((session) => {
                const liveSession = fieldSessions?.find((s) => s.id === session.id);
                const originBadge = getTelemetryOriginBadge(
                  session.telemetrySource ?? liveSession?.telemetrySource,
                  t,
                );
                const { postFlightChecklist, inspectionChecklist, isUnstructuredRemarkOnly } =
                  splitOutcomeAndInspectionChecklists(
                    session.outcomeNotes,
                    context?.inspectionItems,
                    session.status,
                  );
                const hasPreChecklist = Boolean(session.preFlightChecklistNote?.trim());
                const hasPostChecklist =
                  postFlightChecklist.checkedItems.length > 0 ||
                  postFlightChecklist.skippedItems.length > 0 ||
                  (isUnstructuredRemarkOnly && Boolean(session.outcomeNotes?.trim()));
                const hasInspectionChecklist =
                  inspectionChecklist.checkedItems.length > 0 ||
                  inspectionChecklist.skippedItems.length > 0;
                const checklistColumnCount = Math.max(
                  1,
                  (hasPreChecklist ? 1 : 0) +
                    (hasPostChecklist ? 1 : 0) +
                    (hasInspectionChecklist ? 1 : 0),
                );
                return (
                <Box
                  key={session.id}
                  sx={{
                    pt: 1.5,
                    borderTop: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Stack spacing={1.25}>
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1}
                      sx={{
                        alignItems: { sm: 'center' },
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                      }}
                    >
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                        <FlightTakeoffRounded sx={{ fontSize: 18, color: 'primary.main' }} />
                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                          {t('Field session')}
                        </Typography>
                        {originBadge && (
                          <Chip
                            size="small"
                            color={originBadge.color}
                            variant="outlined"
                            label={originBadge.label}
                            sx={{ height: 20, fontSize: '0.75rem', fontWeight: 650 }}
                          />
                        )}
                      </Stack>

                      <Stack
                        direction="row"
                        spacing={2}
                        sx={{ color: 'text.secondary', flexWrap: 'wrap', rowGap: 0.5 }}
                      >
                        {session.startedAt && (
                          <Typography variant="caption" sx={{ fontWeight: 500 }}>
                            <strong>{t('Started')}:</strong>{' '}
                            {formatDateTime(session.startedAt, formatDateTimeValue, '')}
                          </Typography>
                        )}
                        {session.endedAt && (
                          <Typography variant="caption" sx={{ fontWeight: 500 }}>
                            <strong>{t('Ended')}:</strong>{' '}
                            {formatDateTime(session.endedAt, formatDateTimeValue, '')}
                          </Typography>
                        )}
                      </Stack>
                    </Stack>

                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                          xs: '1fr',
                          lg:
                            checklistColumnCount >= 3
                              ? 'repeat(3, minmax(0, 1fr))'
                              : checklistColumnCount === 2
                                ? 'repeat(2, minmax(0, 1fr))'
                                : '1fr',
                        },
                        gap: 1.5,
                        alignItems: 'start',
                      }}
                    >
                      {hasPreChecklist && session.preFlightChecklistNote && (
                        <SessionChecklistBlock
                          label={t('Pre-flight safety checklist')}
                          rawNote={session.preFlightChecklistNote}
                        />
                      )}

                      {hasPostChecklist && (
                        <SessionChecklistBlock
                          label={t('Post-flight outcome & completion checklist')}
                          rawNote={session.outcomeNotes ?? undefined}
                          parsedChecklist={postFlightChecklist}
                        />
                      )}

                      {hasInspectionChecklist && (
                        <SessionChecklistBlock
                          label={t('Inspection items')}
                          parsedChecklist={inspectionChecklist}
                        />
                      )}
                    </Box>

                    {session.postponementReason && (
                      <Typography variant="caption" color="warning.main" sx={{ fontWeight: 600 }}>
                        {t('Postponement reason')}: {session.postponementReason}
                      </Typography>
                    )}
                    {session.abortReason && (
                      <Typography variant="caption" color="error.main" sx={{ fontWeight: 600 }}>
                        {t('Abort reason')}: {session.abortReason}
                      </Typography>
                    )}
                  </Stack>
                </Box>
                );
              })}
            </Stack>
          )}
        </Box>
      </ReadOnlySection>

      {resolvedPermitFileName && (
        <FlightPermitPreviewDialog
          open={permitDialogOpen}
          onClose={() => setPermitDialogOpen(false)}
          inspectionId={inspectionId}
          fileName={resolvedPermitFileName}
          uploadedAt={context?.flightPermitUploadedAt}
          assetName={context?.assetName}
          droneSummary={droneSummary || null}
        />
      )}

      {reinspectionVerifications && reinspectionVerifications.length > 0 && (
        <ReadOnlySection
          title={t('Target defect verifications')}
          count={reinspectionVerifications.length}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
              gap: 1.5,
              mb: 1,
            }}
          >
            {reinspectionVerifications.map((item) => (
              <Box
                key={item.id}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: '10px',
                  p: 1.5,
                  bgcolor: 'background.paper',
                }}
              >
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {item.sourceFindingCode ? `${item.sourceFindingCode} · ` : ''}
                    {item.sourceDefectLabel}
                  </Typography>
                  <Chip
                    size="small"
                    label={t(item.resolutionStatus)}
                    color={
                      item.resolutionStatus === 'RESOLVED'
                        ? 'success'
                        : item.resolutionStatus === 'UNRESOLVED'
                          ? 'error'
                          : 'warning'
                    }
                    sx={{ height: 20, fontSize: '0.75rem', fontWeight: 700 }}
                  />
                </Stack>
                {item.sourceSeverity && (
                  <SummaryItem label={t('Original Severity')} value={item.sourceSeverity} />
                )}
                {item.inspectorNotes && (
                  <SummaryItem label={t('Inspector Notes')} value={item.inspectorNotes} />
                )}
                {item.newEvidenceId && (
                  <Box sx={{ mt: 1 }}>
                    <AuthenticatedImage
                      src={inspectionApi.evidenceContentUrl(inspectionId, item.newEvidenceId)}
                      alt="Verified Evidence"
                      maxHeight={140}
                      sx={{ borderRadius: '8px', border: '1px solid', borderColor: 'divider' }}
                    />
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        </ReadOnlySection>
      )}

      <ReadOnlySection title={t('Evidence register')} count={evidenceList.length}>
        {evidenceList.length === 0 && unlinkedFindings.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic', fontSize: '0.875rem' }}>
            {t('No evidence was linked to this version.')}
          </Typography>
        ) : (
          <Stack spacing={2.5}>
            {evidenceList.length > 0 && (
              <Stack
                direction="row"
                spacing={1}
                sx={{ flexWrap: 'wrap', gap: 1, alignItems: 'center' }}
              >
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem', mr: 0.5 }}>
                  {reportableFindings.length} {t('confirmed findings across')} {evidenceList.length} {t('captures')}
                </Typography>
                <Chip
                  size="small"
                  clickable
                  color={evidenceFilter === 'all' ? 'primary' : 'default'}
                  variant={evidenceFilter === 'all' ? 'filled' : 'outlined'}
                  label={`${t('All')} (${evidenceList.length})`}
                  onClick={() => setEvidenceFilter('all')}
                />
                {defectEvidence.length > 0 && (
                  <Chip
                    size="small"
                    clickable
                    variant="outlined"
                    label={`${defectEvidence.length} ${t('defect evidence')}`}
                    onClick={() =>
                      setEvidenceFilter((prev) => (prev === 'defects' ? 'all' : 'defects'))
                    }
                    sx={(theme) => ({
                      fontWeight: 600,
                      bgcolor:
                        evidenceFilter === 'defects'
                          ? theme.palette.mode === 'dark'
                            ? 'rgba(245, 158, 11, 0.22)'
                            : '#fef3c7'
                          : 'transparent',
                      borderColor:
                        theme.palette.mode === 'dark'
                          ? 'rgba(245, 158, 11, 0.45)'
                          : '#f59e0b',
                      color: theme.palette.mode === 'dark' ? '#fcd34d' : '#b45309',
                    })}
                  />
                )}
                {flightVideos.length > 0 && (
                  <Chip
                    size="small"
                    clickable
                    color="primary"
                    variant={evidenceFilter === 'videos' ? 'filled' : 'outlined'}
                    icon={<MovieOutlined sx={{ fontSize: 15 }} />}
                    label={`${flightVideos.length} ${t('flight videos')}`}
                    onClick={() =>
                      setEvidenceFilter((prev) => (prev === 'videos' ? 'all' : 'videos'))
                    }
                  />
                )}
                {clearCaptures.length > 0 && (
                  <Chip
                    size="small"
                    clickable
                    color={evidenceFilter === 'clear' ? 'success' : 'default'}
                    variant={evidenceFilter === 'clear' ? 'filled' : 'outlined'}
                    label={`${clearCaptures.length} ${t('clear captures')}`}
                    onClick={() =>
                      setEvidenceFilter((prev) => (prev === 'clear' ? 'all' : 'clear'))
                    }
                  />
                )}
              </Stack>
            )}

            {/* Interactive Map of Geotagged Findings */}
            {(evidenceFilter === 'all' || evidenceFilter === 'defects') && (
              <Box id="report-findings-map">
                <ReportFindingsMapPanel
                  inspectionId={inspectionId}
                  defectEvidence={defectEvidence}
                  findings={reportableFindings}
                  selectedEvidenceId={selectedMapEvidenceId}
                  focusNonce={mapFocusNonce}
                  onSelectEvidence={(id) => setSelectedMapEvidenceId(id)}
                  onJumpToEvidence={jumpToEvidenceRow}
                />
              </Box>
            )}

            {/* Tier 1: Defect Evidence & Confirmed Findings (1 row per evidence: image left, findings right) */}
            {defectEvidence.length > 0 && (evidenceFilter === 'all' || evidenceFilter === 'defects') && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.25 }}>
                  {t('Defect evidence & confirmed findings')} ({defectEvidence.length})
                </Typography>
                <Stack spacing={2}>
                  {defectEvidence.map((item) => {
                    const linkedFindings = reportableFindings.filter(
                      (finding) => finding.evidenceId === item.id,
                    );
                    const hasSourceVideo =
                      Boolean(item.sourceVideoEvidenceId) &&
                      evidenceList.some((ev) => ev.id === item.sourceVideoEvidenceId);
                    const hasGps =
                      item.latitude != null &&
                      item.longitude != null &&
                      Number.isFinite(Number(item.latitude)) &&
                      Number.isFinite(Number(item.longitude));
                    const isMapHighlighted = selectedMapEvidenceId === item.id;

                    return (
                      <Box
                        key={item.id}
                        id={`report-evidence-${item.id}`}
                        sx={{
                          border: '1px solid',
                          borderColor: isMapHighlighted ? 'primary.main' : 'divider',
                          borderRadius: '10px',
                          p: { xs: 1.5, sm: 2 },
                          bgcolor: 'background.paper',
                          display: 'grid',
                          gridTemplateColumns: {
                            xs: '1fr',
                            md: 'minmax(280px, 360px) minmax(0, 1fr)',
                          },
                          gap: 2.5,
                          alignItems: 'start',
                        }}
                      >
                        {/* Left Column: Evidence Image, File Info & Map / Video Actions */}
                        <Stack spacing={1}>
                          {item.contentType.startsWith('image/') && (
                            <Box
                              sx={{
                                position: 'relative',
                                width: '100%',
                                lineHeight: 0,
                                borderRadius: '8px',
                                overflow: 'hidden',
                                border: '1px solid',
                                borderColor: 'divider',
                                bgcolor: 'action.hover',
                              }}
                            >
                              <AuthenticatedImage
                                src={inspectionApi.evidenceContentUrl(inspectionId, item.id, 'thumb')}
                                alt={item.fileName}
                                maxHeight="none"
                                sx={{ width: '100%', height: 'auto', borderRadius: 0 }}
                              />
                              {linkedFindings.map((finding, index) => {
                                const box = parseBoundingBox(finding.boundingBox);
                                if (!box) return null;
                                const boxColor = ['#d32f2f', '#1976d2', '#2e7d32', '#ed6c02'][index % 4];
                                return (
                                  <Box
                                    key={finding.id}
                                    sx={{
                                      position: 'absolute',
                                      left: `${box.xMin * 100}%`,
                                      top: `${box.yMin * 100}%`,
                                      width: `${(box.xMax - box.xMin) * 100}%`,
                                      height: `${(box.yMax - box.yMin) * 100}%`,
                                      border: `2px solid ${boxColor}`,
                                      pointerEvents: 'none',
                                    }}
                                  />
                                );
                              })}
                            </Box>
                          )}

                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 700,
                              fontSize: '0.875rem',
                              wordBreak: 'break-word',
                            }}
                            title={item.fileName}
                          >
                            {item.fileName}
                          </Typography>

                          <Field
                            label={t('Asset location')}
                            value={formatEvidenceLocationDescription(item.locationDescription, t)}
                            stacked
                          />
                          {item.captureTime && (
                            <Field
                              label={t('Capture time')}
                              value={formatDateTime(item.captureTime, formatDateTimeValue, '')}
                            />
                          )}

                          {hasSourceVideo && (
                            <Stack
                              direction="row"
                              spacing={1}
                              sx={{ pt: 0.5, flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}
                            >
                              <Button
                                size="small"
                                variant="outlined"
                                color="secondary"
                                startIcon={<PlayCircleOutlineRounded sx={{ fontSize: '0.95rem !important' }} />}
                                onClick={() =>
                                  openSourceVideoAtFrame(
                                    item.sourceVideoEvidenceId!,
                                    item.sourceTimestampSeconds ?? 0,
                                  )
                                }
                                sx={{
                                  py: 0.25,
                                  px: 1,
                                  fontSize: '0.72rem',
                                  fontWeight: 600,
                                  textTransform: 'none',
                                }}
                              >
                                {`${t('Watch in video')} @ ${formatVideoMmSs(item.sourceTimestampSeconds)}`}
                              </Button>
                            </Stack>
                          )}
                        </Stack>

                        {/* Right Column: Confirmed Findings on this Evidence */}
                        <Stack spacing={1.25} sx={{ minWidth: 0 }}>
                          <Box
                            sx={{
                              pb: 0.75,
                              borderBottom: '1px solid',
                              borderColor: 'divider',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 1,
                              flexWrap: 'wrap',
                            }}
                          >
                            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                              {t('Findings preview')}
                            </Typography>
                            {hasGps && (
                              <Chip
                                size="small"
                                variant="outlined"
                                color="primary"
                                icon={<PlaceOutlined sx={{ fontSize: 15 }} />}
                                label={t('View on map')}
                                onClick={() => focusEvidenceOnReportMap(item)}
                                sx={{ height: 22, fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}
                              />
                            )}
                          </Box>

                          <Stack spacing={1.25}>
                            {linkedFindings.map((finding) => (
                              <Box
                                key={finding.id}
                                sx={{
                                  p: 1.5,
                                  borderRadius: '8px',
                                  border: '1px solid',
                                  borderColor: 'divider',
                                  bgcolor: 'background.default',
                                }}
                              >
                                <Stack
                                  direction="row"
                                  spacing={0.75}
                                  sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.5, mb: 0.75 }}
                                >
                                  {finding.findingCode && (
                                    <Chip
                                      size="small"
                                      label={finding.findingCode}
                                      sx={{ height: 20, fontWeight: 700, fontSize: '0.75rem' }}
                                    />
                                  )}
                                  <Chip
                                    size="small"
                                    variant="outlined"
                                    label={`${finding.defectLabel} · ${finding.severity}`}
                                    sx={getSoftSeverityChipSx(finding.severity)}
                                  />
                                  {finding.confidence !== null && (
                                    <Chip
                                      size="small"
                                      variant="outlined"
                                      label={`${Math.round(finding.confidence * 100)}% confidence`}
                                      sx={{ height: 20, fontSize: '0.72rem', fontWeight: 600 }}
                                    />
                                  )}
                                </Stack>

                                <Typography
                                  variant="body2"
                                  sx={{
                                    color: finding.technicalNotes?.trim() ? 'text.primary' : 'text.secondary',
                                    fontStyle: finding.technicalNotes?.trim() ? 'normal' : 'italic',
                                    fontSize: '0.84rem',
                                    mb: 0.35,
                                  }}
                                >
                                  <b>{t('Technical notes')}:</b>{' '}
                                  {finding.technicalNotes?.trim() ? finding.technicalNotes : t('None')}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    color: 'text.secondary',
                                    fontStyle: finding.recommendedAction?.trim() ? 'normal' : 'italic',
                                    fontSize: '0.84rem',
                                  }}
                                >
                                  <b>{t('Recommended action')}:</b>{' '}
                                  {finding.recommendedAction?.trim() ? finding.recommendedAction : t('None')}
                                </Typography>
                              </Box>
                            ))}
                          </Stack>
                        </Stack>
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            )}

            {/* Tier 2: Flight Video Captures */}
            {flightVideos.length > 0 && (evidenceFilter === 'all' || evidenceFilter === 'videos') && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.25 }}>
                  {t('Flight video captures')} ({flightVideos.length})
                </Typography>
                <Stack spacing={1.5}>
                  {flightVideos.map((video) => {
                    const derivedFrames = nonVideoEvidence
                      .filter((ev) => ev.sourceVideoEvidenceId === video.id)
                      .sort(
                        (a, b) =>
                          (a.sourceTimestampSeconds ?? 0) - (b.sourceTimestampSeconds ?? 0),
                      );
                    return (
                      <Box
                        key={video.id}
                        sx={{
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: '10px',
                          p: 1.5,
                          bgcolor: 'background.paper',
                        }}
                      >
                        <Box
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', md: '340px 1fr' },
                            gap: 2,
                            alignItems: 'start',
                          }}
                        >
                          <AuthenticatedMedia
                            src={inspectionApi.evidenceContentUrl(inspectionId, video.id)}
                            posterSrc={
                              video.hasThumbnail
                                ? inspectionApi.evidenceContentUrl(inspectionId, video.id, 'thumb')
                                : undefined
                            }
                            alt={video.fileName}
                            contentType={video.contentType}
                            seekRequest={videoSeekById[video.id]}
                            maxHeight={220}
                            sx={{ borderRadius: '8px' }}
                          />
                          <Stack spacing={1}>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {video.fileName}
                            </Typography>
                            <Field
                              label={t('Duration')}
                              value={
                                video.durationSeconds != null
                                  ? formatVideoMmSs(video.durationSeconds)
                                  : null
                              }
                            />
                            <Field label={t('Asset location')} value={formatEvidenceLocationDescription(video.locationDescription, t)} />
                            {video.captureTime && (
                              <Field
                                label={t('Capture time')}
                                value={formatDateTime(video.captureTime, formatDateTimeValue, '')}
                              />
                            )}
                            {derivedFrames.length > 0 && (
                              <Box>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ display: 'block', fontWeight: 700, mb: 0.5 }}
                                >
                                  {t('Linked keyframes in this video')}:
                                </Typography>
                                <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.75 }}>
                                  {derivedFrames.map((frame) => (
                                    <Chip
                                      key={frame.id}
                                      size="small"
                                      color="secondary"
                                      variant="outlined"
                                      icon={<PlayCircleOutlineRounded sx={{ fontSize: 15 }} />}
                                      title={`${formatVideoMmSs(frame.sourceTimestampSeconds)} · ${frame.fileName}`}
                                      label={`${formatVideoMmSs(frame.sourceTimestampSeconds)} · ${frame.fileName}`}
                                      onClick={() =>
                                        setVideoSeekById((prev) => ({
                                          ...prev,
                                          [video.id]: {
                                            timestampSeconds: frame.sourceTimestampSeconds ?? 0,
                                            nonce: Date.now(),
                                          },
                                        }))
                                      }
                                      sx={{
                                        cursor: 'pointer',
                                        maxWidth: 260,
                                        '& .MuiChip-label': {
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                        },
                                      }}
                                    />
                                  ))}
                                </Stack>
                              </Box>
                            )}
                          </Stack>
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            )}

            {/* Tier 3: Clear / Reference Captures */}
            {clearCaptures.length > 0 && (evidenceFilter === 'all' || evidenceFilter === 'clear') && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.25 }}>
                  {t('Clear / reference captures (no findings)')} ({clearCaptures.length})
                </Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: evidenceGridColumns(clearCaptures.length),
                    gap: 1.75,
                    alignItems: 'stretch',
                  }}
                >
                  {clearCaptures.map((item) => {
                    const hasSourceVideo =
                      Boolean(item.sourceVideoEvidenceId) &&
                      evidenceList.some((ev) => ev.id === item.sourceVideoEvidenceId);

                    return (
                      <Box
                        key={item.id}
                        sx={{
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: '10px',
                          p: 1.5,
                          bgcolor: 'background.paper',
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                      >
                        {item.contentType.startsWith('image/') && (
                          <EvidenceThumbBox
                            src={inspectionApi.evidenceContentUrl(inspectionId, item.id, 'thumb')}
                            alt={item.fileName}
                          />
                        )}
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 650,
                            fontSize: '0.875rem',
                            mb: 0.5,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={item.fileName}
                        >
                          {item.fileName}
                        </Typography>
                        <Field
                          label={t('Asset location')}
                          value={formatEvidenceLocationDescription(item.locationDescription, t)}
                          stacked
                        />
                        {item.captureTime && (
                          <Field
                            label={t('Capture time')}
                            value={formatDateTime(item.captureTime, formatDateTimeValue, '')}
                          />
                        )}

                        <Box
                          sx={{
                            mt: 'auto',
                            pt: 1,
                            borderTop: '1px solid',
                            borderColor: 'divider',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 1,
                            flexWrap: 'wrap',
                          }}
                        >
                          <Chip
                            size="small"
                            variant="outlined"
                            label={t('No confirmed findings')}
                            sx={{ height: 20, fontSize: '0.75rem', color: 'text.secondary' }}
                          />
                          {item.latitude != null &&
                            item.longitude != null &&
                            Number.isFinite(Number(item.latitude)) &&
                            Number.isFinite(Number(item.longitude)) && (
                              <Chip
                                size="small"
                                variant="outlined"
                                color="primary"
                                icon={<PlaceOutlined sx={{ fontSize: 14 }} />}
                                label={t('View on map')}
                                onClick={() => setStandaloneMapEvidence(item)}
                                sx={{ height: 22, fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}
                              />
                            )}
                          {hasSourceVideo && (
                            <Button
                              size="small"
                              variant="outlined"
                              color="secondary"
                              startIcon={<PlayCircleOutlineRounded sx={{ fontSize: '0.95rem !important' }} />}
                              onClick={() =>
                                openSourceVideoAtFrame(
                                  item.sourceVideoEvidenceId!,
                                  item.sourceTimestampSeconds ?? 0,
                                )
                              }
                              sx={{
                                py: 0.25,
                                px: 1,
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                textTransform: 'none',
                              }}
                            >
                              {`${t('Watch in video')} @ ${formatVideoMmSs(item.sourceTimestampSeconds)}`}
                            </Button>
                          )}
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            )}

            {/* Unlinked Confirmed Findings (if evidenceList is empty or findings not assigned to evidence) */}
            {unlinkedFindings.length > 0 && (
              <Box sx={{ mt: 2, p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: '10px' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  {t('Additional confirmed findings')} ({unlinkedFindings.length})
                </Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
                    gap: 1.5,
                  }}
                >
                  {unlinkedFindings.map((finding) => (
                    <Box
                      key={finding.id}
                      sx={{
                        p: 1.25,
                        borderRadius: '8px',
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                      }}
                    >
                      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mb: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }}>{finding.defectLabel}</Typography>
                        <Chip
                          size="small"
                          variant="outlined"
                          label={finding.severity}
                          sx={getSoftSeverityChipSx(finding.severity)}
                        />
                      </Stack>
                      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontStyle: finding.technicalNotes?.trim() ? 'normal' : 'italic' }}>
                        <b>{t('Technical notes')}:</b> {finding.technicalNotes?.trim() ? finding.technicalNotes : t('None')}
                      </Typography>
                      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontStyle: finding.recommendedAction?.trim() ? 'normal' : 'italic' }}>
                        <b>{t('Recommended action')}:</b> {finding.recommendedAction?.trim() ? finding.recommendedAction : t('None')}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </Stack>
        )}
      </ReadOnlySection>

      {/* Video Context Playback Dialog (jumps to exact timestamp of cropped/extracted frame) */}
      <Dialog
        open={Boolean(videoModal)}
        onClose={() => setVideoModal(null)}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '10px' } } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, wordBreak: 'break-word' }}>
              {videoModal?.video.fileName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {`${t('Focused at timestamp')} @ ${formatVideoMmSs(videoModal?.seekRequest.timestampSeconds)}`}
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setVideoModal(null)} aria-label={t('Close')}>
            <CloseRounded fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2 }}>
          {videoModal && (
            <AuthenticatedMedia
              src={inspectionApi.evidenceContentUrl(inspectionId, videoModal.video.id)}
              posterSrc={
                videoModal.video.hasThumbnail
                  ? inspectionApi.evidenceContentUrl(inspectionId, videoModal.video.id, 'thumb')
                  : undefined
              }
              alt={videoModal.video.fileName}
              contentType={videoModal.video.contentType}
              seekRequest={videoModal.seekRequest}
              maxHeight={460}
              sx={{ borderRadius: '8px' }}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2.5, py: 1.5 }}>
          <Button onClick={() => setVideoModal(null)} sx={{ textTransform: 'none', fontWeight: 600 }}>
            {t('Close')}
          </Button>
        </DialogActions>
      </Dialog>
      {standaloneMapEvidence &&
        standaloneMapEvidence.latitude != null &&
        standaloneMapEvidence.longitude != null && (
          <EvidenceGpsMapDialog
            open
            onClose={() => setStandaloneMapEvidence(null)}
            fileName={standaloneMapEvidence.fileName}
            latitude={Number(standaloneMapEvidence.latitude)}
            longitude={Number(standaloneMapEvidence.longitude)}
            captureTime={standaloneMapEvidence.captureTime}
            locationDescription={standaloneMapEvidence.locationDescription}
          />
        )}
    </Box>
  );
}
