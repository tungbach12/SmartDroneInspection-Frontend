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

function getMeaningfulTechnicalNotes(finding: Finding): string | null {
  const trimmed = finding.technicalNotes?.trim();
  if (!trimmed) return null;
  if (trimmed.toLowerCase() === finding.defectLabel.trim().toLowerCase()) {
    return null;
  }
  return trimmed;
}

function CaptureLocationField({
  locationDescription,
  stacked = false,
}: {
  locationDescription: string | null | undefined;
  stacked?: boolean;
}) {
  const { t } = useLocale();
  const formatted = formatEvidenceLocationDescription(locationDescription, t)?.trim();
  if (!formatted) return null;
  return <Field label={t('Capture location')} value={formatted} stacked={stacked} />;
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
): { label: string } | null {
  if (!telemetrySource) return null;
  if (telemetrySource === 'MISSION_PLANNER_MAVLINK') {
    return { label: `${t('Telemetry source')}: ${t('Live stream during flight')} (MAVLink)` };
  }
  if (telemetrySource.startsWith('IMPORTED_LOG_')) {
    const fmt = telemetrySource.replace('IMPORTED_LOG_', '');
    return { label: `${t('Telemetry source')}: ${t('Uploaded flight log file')} (${fmt})` };
  }
  if (telemetrySource === 'SMARTDRONEHUB_SIMULATION') {
    return { label: `${t('Telemetry source')}: ${t('Simulated telemetry')}` };
  }
  if (telemetrySource === 'MANUAL_DECLARATION') {
    return { label: `${t('Telemetry source')}: ${t('Manual declaration (no file or stream)')}` };
  }
  if (telemetrySource === 'NONE') {
    return { label: `${t('Telemetry source')}: ${t('Not recorded')}` };
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

function formatChecklistSnapshot(
  snapshot: readonly {
    code: string;
    category?: string | null;
    label: string;
    referenceThreshold?: string | null;
    checked: boolean;
  }[] | null | undefined,
): ParsedChecklist | null {
  if (!snapshot || snapshot.length === 0) return null;
  const checkedItems: string[] = [];
  const skippedItems: string[] = [];
  for (const item of snapshot) {
    const tag = item.referenceThreshold ? `${item.label} (${item.referenceThreshold})` : item.label;
    if (item.checked) {
      checkedItems.push(tag);
    } else {
      skippedItems.push(tag);
    }
  }
  return { checkedItems, skippedItems, remark: null };
}

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
  const noteText = (remark ?? rawNote)?.trim() || null;
  const hasChecklistItems = checkedItems.length > 0 || skippedItems.length > 0;

  if (!hasChecklistItems && !noteText) {
    return null;
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
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexShrink: 0 }}>
          {checkedItems.length > 0 && (
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.75rem' }}>
              {checkedItems.length} {t('verified')}
            </Typography>
          )}
          {skippedItems.length > 0 && (
            <Typography variant="caption" sx={{ color: 'warning.dark', fontWeight: 600, fontSize: '0.75rem' }}>
              {skippedItems.length} {t('skipped')}
            </Typography>
          )}
          {expanded ? (
            <ExpandLessRounded fontSize="small" sx={{ color: 'text.secondary' }} />
          ) : (
            <ExpandMoreRounded fontSize="small" sx={{ color: 'text.secondary' }} />
          )}
        </Stack>
      </Stack>

      <Collapse in={expanded} timeout="auto">
        {hasChecklistItems ? (
          <>
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
          </>
        ) : (
          <Typography variant="caption" sx={{ display: 'block', color: 'text.primary', lineHeight: 1.5, pt: 0.25 }}>
            {noteText}
          </Typography>
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
  headerAction,
  children,
}: {
  title: string;
  count?: number;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Box component="section" sx={{ mb: 3 }}>
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 1.25 }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography component="h2" sx={{ fontSize: '1rem', fontWeight: 700, color: 'text.primary' }}>
            {title}
          </Typography>
          {typeof count === 'number' && (
            <Chip size="small" label={count} sx={{ height: 20, fontSize: '0.75rem', fontWeight: 700 }} />
          )}
        </Stack>
        {headerAction}
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
  const droneManufacturer = (context?.assignedDrone?.manufacturer ?? sessionDrone?.droneManufacturer ?? '').trim();
  const droneModel = (context?.assignedDrone?.model ?? sessionDrone?.droneModel ?? '').trim();
  const droneModelDisplay =
    droneManufacturer && droneModel
      ? droneModel.toLowerCase().startsWith(droneManufacturer.toLowerCase())
        ? droneModel
        : `${droneManufacturer} ${droneModel}`
      : droneModel || droneManufacturer;
  const droneSummary =
    [droneModelDisplay, context?.assignedDrone?.serialNumber ?? sessionDrone?.droneSerialNumber]
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
  const isDraftPreview = version.id.startsWith('preview-');
  const latestContextSession = context?.fieldSessions?.at(-1);
  const latestLiveSession = latestContextSession
    ? fieldSessions?.find((s) => s.id === latestContextSession.id)
    : fieldSessions?.at(-1);
  const telemetryOrigin = getTelemetryOriginBadge(
    latestContextSession?.telemetrySource ?? latestLiveSession?.telemetrySource,
    t,
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

      <ReadOnlySection
        title={t('Identification')}
        headerAction={
          telemetryOrigin ? (
            <Chip
              size="small"
              variant="outlined"
              label={telemetryOrigin.label}
              sx={{
                height: 22,
                fontSize: '0.75rem',
                fontWeight: 500,
                bgcolor: 'background.paper',
                borderColor: 'divider',
                color: 'text.secondary',
              }}
            />
          ) : null
        }
      >
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
              value={
                isDraftPreview
                  ? t('Pending submission')
                  : `SDI-RPT-${version.id.slice(0, 8).toUpperCase()}-V${version.versionNo}`
              }
            />
            {!isDraftPreview && (
              <SummaryItem
                label={t('Version / status')}
                value={`v${version.versionNo} · ${version.status}`}
              />
            )}
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
                <Typography
                  variant="caption"
                  sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mb: 0.25 }}
                >
                  {t('Flight permit')}
                </Typography>
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
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
                  <Button
                    size="small"
                    variant="text"
                    startIcon={<VisibilityOutlined sx={{ fontSize: 14 }} />}
                    onClick={() => setPermitDialogOpen(true)}
                    sx={{
                      minHeight: 20,
                      py: 0,
                      px: 0.5,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      textTransform: 'none',
                    }}
                  >
                    {t('View permit')}
                  </Button>
                </Stack>
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
              {context.fieldSessions.map((session, idx) => {
                const { postFlightChecklist, inspectionChecklist, isUnstructuredRemarkOnly } =
                  splitOutcomeAndInspectionChecklists(
                    session.outcomeNotes,
                    context?.inspectionItems,
                    session.status,
                  );
                const snapshotPreChecklist = formatChecklistSnapshot(session.preFlightChecklistSnapshot);
                const snapshotPostChecklist = formatChecklistSnapshot(session.postFlightChecklistSnapshot);
                const hasPreChecklist = Boolean(
                  snapshotPreChecklist || session.preFlightChecklistNote?.trim(),
                );
                const hasPostChecklist =
                  Boolean(snapshotPostChecklist) ||
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
                  sx={
                    idx > 0
                      ? {
                          pt: 1.5,
                          borderTop: '1px solid',
                          borderColor: 'divider',
                        }
                      : undefined
                  }
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
                          {session.sessionDate ? ` · ${session.sessionDate}` : ''}
                        </Typography>
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

                    {session.preFlightConditions && (
                      <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', rowGap: 0.75, mb: 1.25 }}>
                        {session.preFlightConditions.windSpeedMs != null && (
                          <Chip size="small" variant="outlined" label={`${t('Wind')}: ${session.preFlightConditions.windSpeedMs} m/s`} />
                        )}
                        {session.preFlightConditions.minBatteryPercent != null && (
                          <Chip size="small" variant="outlined" label={`${t('Battery')}: ${session.preFlightConditions.minBatteryPercent}%`} />
                        )}
                        {session.preFlightConditions.gpsSatellites != null && (
                          <Chip size="small" variant="outlined" label={`GNSS: ${session.preFlightConditions.gpsSatellites} sats`} />
                        )}
                        {session.preFlightConditions.rthAltitudeMeters != null && (
                          <Chip size="small" variant="outlined" label={`RTH: ${session.preFlightConditions.rthAltitudeMeters} m`} />
                        )}
                        {session.preFlightConditions.weatherSummary && (
                          <Chip size="small" variant="outlined" label={session.preFlightConditions.weatherSummary} />
                        )}
                      </Stack>
                    )}

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
                      {hasPreChecklist && (
                        <SessionChecklistBlock
                          label={t('Pre-flight safety checklist')}
                          {...(session.preFlightChecklistNote ? { rawNote: session.preFlightChecklistNote } : {})}
                          {...(snapshotPreChecklist ? { parsedChecklist: snapshotPreChecklist } : {})}
                        />
                      )}

                      {hasPostChecklist && (
                        <SessionChecklistBlock
                          label={t('Post-flight checklist')}
                          rawNote={session.outcomeNotes ?? undefined}
                          parsedChecklist={snapshotPostChecklist ?? postFlightChecklist}
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

      <ReadOnlySection title={t('Evidence register')}>
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
                {[
                  { key: 'all' as const, label: `${t('All')} (${evidenceList.length})`, show: true },
                  { key: 'defects' as const, label: `${defectEvidence.length} ${t('defect evidence')}`, show: defectEvidence.length > 0 },
                  { key: 'videos' as const, label: `${flightVideos.length} ${t('flight videos')}`, show: flightVideos.length > 0, icon: <MovieOutlined sx={{ fontSize: 15 }} /> },
                  { key: 'clear' as const, label: `${clearCaptures.length} ${t('clear captures')}`, show: clearCaptures.length > 0 },
                ]
                  .filter((opt) => opt.show)
                  .map((opt) => {
                    const active = evidenceFilter === opt.key;
                    return (
                      <Chip
                        key={opt.key}
                        size="small"
                        clickable
                        variant="outlined"
                        {...(opt.icon ? { icon: opt.icon } : {})}
                        label={opt.label}
                        onClick={() =>
                          setEvidenceFilter((prev) =>
                            opt.key === 'all' ? 'all' : prev === opt.key ? 'all' : opt.key,
                          )
                        }
                        sx={{
                          fontWeight: active ? 700 : 500,
                          bgcolor: active ? 'action.selected' : 'transparent',
                          borderColor: active ? 'text.primary' : 'divider',
                          color: active ? 'text.primary' : 'text.secondary',
                        }}
                      />
                    );
                  })}
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
                    const formattedCaptureLocation = formatEvidenceLocationDescription(
                      item.locationDescription,
                      t,
                    )?.trim();

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
                            md: 'minmax(220px, 270px) minmax(0, 1fr)',
                          },
                          gap: 2.25,
                          alignItems: 'stretch',
                        }}
                      >
                        {/* Left Column: Evidence Photo Thumbnail */}
                        {item.contentType.startsWith('image/') && (
                          <Box
                            sx={{
                              position: 'relative',
                              width: '100%',
                              alignSelf: 'start',
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

                        {/* Right Column: Confirmed Findings + Compact Capture Metadata */}
                        <Stack
                          spacing={1.5}
                          sx={{
                            minWidth: 0,
                            gridColumn: item.contentType.startsWith('image/') ? undefined : '1 / -1',
                            justifyContent: 'space-between',
                          }}
                        >
                          <Stack spacing={1.5}>
                            {linkedFindings.map((finding, idx) => {
                              const note = getMeaningfulTechnicalNotes(finding);
                              const titleLabel = [finding.findingCode, finding.defectLabel]
                                .filter(Boolean)
                                .join(' · ');
                              return (
                                <Box
                                  key={finding.id}
                                  sx={{
                                    pt: idx > 0 ? 1.5 : 0,
                                    borderTop: idx > 0 ? '1px solid' : 'none',
                                    borderColor: 'divider',
                                  }}
                                >
                                  <Stack
                                    direction="row"
                                    spacing={0.75}
                                    sx={{
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      flexWrap: 'wrap',
                                      gap: 0.75,
                                      mb: note ? 0.75 : 0,
                                    }}
                                  >
                                    <Stack
                                      direction="row"
                                      spacing={0.75}
                                      sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.5, minWidth: 0 }}
                                    >
                                      <Typography
                                        variant="subtitle2"
                                        sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.875rem' }}
                                      >
                                        {titleLabel}
                                      </Typography>
                                      <Chip
                                        size="small"
                                        variant="outlined"
                                        label={finding.severity}
                                        sx={getSoftSeverityChipSx(finding.severity)}
                                      />
                                      {finding.confidence !== null && (
                                        <Typography
                                          variant="caption"
                                          sx={{ color: 'text.secondary', fontWeight: 500 }}
                                        >
                                          {`${Math.round(finding.confidence * 100)}% ${t('confidence')}`}
                                        </Typography>
                                      )}
                                    </Stack>
                                    {idx === 0 && (hasSourceVideo || hasGps) && (
                                      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexShrink: 0 }}>
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
                                        {hasGps && (
                                          <Button
                                            size="small"
                                            variant="text"
                                            startIcon={<PlaceOutlined sx={{ fontSize: 15 }} />}
                                            onClick={() => focusEvidenceOnReportMap(item)}
                                            sx={{
                                              fontWeight: 600,
                                              fontSize: '0.78rem',
                                              textTransform: 'none',
                                              py: 0.25,
                                              px: 0.75,
                                              minHeight: 'auto',
                                              flexShrink: 0,
                                            }}
                                          >
                                            {t('View on map')}
                                          </Button>
                                        )}
                                      </Stack>
                                    )}
                                  </Stack>

                                  {note && (
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        color: 'text.primary',
                                        fontSize: '0.84rem',
                                        lineHeight: 1.55,
                                      }}
                                    >
                                      <b>{t('Note')}:</b> {note}
                                    </Typography>
                                  )}
                                </Box>
                              );
                            })}
                          </Stack>

                          {/* Compact Capture Metadata Strip */}
                          <Box
                            sx={{
                              pt: 1.25,
                              borderTop: '1px solid',
                              borderColor: 'divider',
                              display: 'grid',
                              gridTemplateColumns: {
                                xs: '1fr',
                                sm: 'repeat(3, minmax(0, 1fr))',
                              },
                              gap: 1.5,
                            }}
                          >
                            <Box sx={{ minWidth: 0 }}>
                              <Typography
                                variant="body2"
                                sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.75rem' }}
                              >
                                {t('File')}
                              </Typography>
                              <Typography
                                variant="body2"
                                title={item.fileName}
                                sx={{
                                  color: 'text.primary',
                                  fontWeight: 600,
                                  fontSize: '0.8125rem',
                                  wordBreak: 'break-word',
                                }}
                              >
                                {item.fileName}
                              </Typography>
                            </Box>
                            {formattedCaptureLocation && (
                              <Box sx={{ minWidth: 0 }}>
                                <Typography
                                  variant="body2"
                                  sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.75rem' }}
                                >
                                  {t('Capture location')}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  title={formattedCaptureLocation}
                                  sx={{
                                    color: 'text.primary',
                                    fontWeight: 500,
                                    fontSize: '0.8125rem',
                                    wordBreak: 'break-word',
                                  }}
                                >
                                  {formattedCaptureLocation}
                                </Typography>
                              </Box>
                            )}
                            {item.captureTime && (
                              <Box sx={{ minWidth: 0 }}>
                                <Typography
                                  variant="body2"
                                  sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.75rem' }}
                                >
                                  {t('Capture time')}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    color: 'text.primary',
                                    fontWeight: 500,
                                    fontSize: '0.8125rem',
                                  }}
                                >
                                  {formatDateTime(item.captureTime, formatDateTimeValue, '')}
                                </Typography>
                              </Box>
                            )}
                          </Box>
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
                            <CaptureLocationField locationDescription={video.locationDescription} />
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
                        <CaptureLocationField locationDescription={item.locationDescription} stacked />
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
                  {unlinkedFindings.map((finding) => {
                    const note = getMeaningfulTechnicalNotes(finding);
                    return (
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
                        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mb: note ? 0.5 : 0, flexWrap: 'wrap', gap: 0.5 }}>
                          <Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }}>{finding.defectLabel}</Typography>
                          <Chip
                            size="small"
                            variant="outlined"
                            label={finding.severity}
                            sx={getSoftSeverityChipSx(finding.severity)}
                          />
                        </Stack>
                        {note && (
                          <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                            <b>{t('Note')}:</b> {note}
                          </Typography>
                        )}
                      </Box>
                    );
                  })}
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
