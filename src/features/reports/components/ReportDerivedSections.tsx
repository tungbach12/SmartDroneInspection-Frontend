import { useState } from 'react';
import {
  Box,
  Button,
  Chip,
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
import FlightTakeoffRounded from '@mui/icons-material/FlightTakeoffRounded';
import MovieOutlined from '@mui/icons-material/MovieOutlined';
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded';
import PlayCircleOutlineRounded from '@mui/icons-material/PlayCircleOutlineRounded';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded';
import type {
  EvidenceItem,
  FieldSession,
  InspectionReport,
  Finding,
} from '@/features/inspections/api/inspectionApi';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { AuthenticatedMedia, type MediaSeekRequest } from '@/shared/ui/AuthenticatedMedia';
import { inspectionApi } from '@/features/inspections/api/inspectionApi';
import { FlightPermitPreviewDialog } from '@/features/inspections/components/FlightPermitPreviewDialog';
import { formatLocation } from '@/shared/airspace/airspaceZones';
import { useLocale } from '@/shared/i18n/LocaleProvider';

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

function parseSessionChecklist(raw: string | null | undefined): {
  checkedItems: string[];
  skippedItems: string[];
  remark: string | null;
} {
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

function SessionChecklistBlock({
  label,
  rawNote,
}: {
  label: string;
  rawNote: string;
}) {
  const { t } = useLocale();
  const { checkedItems, skippedItems, remark } = parseSessionChecklist(rawNote);

  if (checkedItems.length === 0 && skippedItems.length === 0) {
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
          {rawNote}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: 1.5,
        height: '100%',
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
        sx={{
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1,
          mb: 0.75,
          borderBottom: '1px solid',
          borderColor: 'divider',
          flexWrap: 'wrap',
        }}
      >
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
          <CheckCircleRounded color="success" sx={{ fontSize: 16 }} />
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.8rem' }}>
            {label}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={0.5}>
          {checkedItems.length > 0 && (
            <Chip
              size="small"
              color="success"
              variant="outlined"
              label={`${checkedItems.length} ${t('verified')}`}
              sx={{ height: 20, fontSize: '0.75rem', fontWeight: 700 }}
            />
          )}
          {skippedItems.length > 0 && (
            <Chip
              size="small"
              color="warning"
              variant="outlined"
              label={`${skippedItems.length} ${t('skipped')}`}
              sx={{ height: 20, fontSize: '0.75rem', fontWeight: 700 }}
            />
          )}
        </Stack>
      </Stack>

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
            mt: 'auto',
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

export function ReportDerivedSections({
  version,
  findings,
  evidenceList,
  fieldSessions,
  inspectionId,
  droneSummary: externalDroneSummary,
  flightPermitFileName: externalPermitFileName,
}: ReportDerivedSectionsProps) {
  const { t, formatDateTime: formatDateTimeValue } = useLocale();
  const [selectedModalEvidence, setSelectedModalEvidence] = useState<EvidenceItem | null>(null);
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

  const modalFindings = selectedModalEvidence
    ? reportableFindings.filter((finding) => finding.evidenceId === selectedModalEvidence.id)
    : [];

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
      {reportSummaryText && (
        <Box sx={{ mb: 2.5 }}>
          <Typography
            sx={{ fontSize: '1rem', fontWeight: 700, color: 'text.primary', mb: 1 }}
          >
            {t('Summary')}
          </Typography>
          <Box
            sx={{
              p: 1.75,
              borderRadius: '10px',
              bgcolor: (theme) =>
                theme.palette.mode === 'dark'
                  ? 'rgba(14, 165, 233, 0.08)'
                  : 'rgba(240, 249, 255, 0.85)',
              border: '1px solid',
              borderColor: 'primary.light',
            }}
          >
            <Typography
              variant="body2"
              sx={{ color: 'text.primary', lineHeight: 1.6, fontWeight: 500 }}
            >
              {reportSummaryText}
            </Typography>
          </Box>
        </Box>
      )}

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
          <Typography variant="caption" color="text.secondary">
            {reportableFindings.length > 0 ? t('Confirmed on inspection captures') : t('No confirmed defects')}
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
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {`${defectEvidence.length} ${t('defect evidence')} · ${flightVideos.length} ${t('flight videos')} · ${clearCaptures.length} ${t('clear captures')}`}
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
          <Typography variant="caption" color="text.secondary">
            {totalChecklistStats.total > 0 ? t('Checklist items verified') : t('Field session status')}
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
                <Typography
                  variant="caption"
                  sx={{ color: 'text.secondary', fontWeight: 600, display: 'block' }}
                >
                  {t('Flight permit')}
                </Typography>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: 'center', flexWrap: 'wrap', mt: 0.25 }}
                >
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
              {context.fieldSessions.map((session) => {
                const liveSession = fieldSessions?.find((s) => s.id === session.id);
                const originBadge = getTelemetryOriginBadge(
                  session.telemetrySource ?? liveSession?.telemetrySource,
                  t,
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
                        <Chip
                          size="small"
                          color={
                            session.status === 'FIELD_COMPLETED'
                              ? 'success'
                              : session.status === 'ABORTED'
                                ? 'error'
                                : 'primary'
                          }
                          variant="outlined"
                          label={session.status}
                          sx={{ height: 20, fontSize: '0.75rem', fontWeight: 700 }}
                        />
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
                            session.preFlightChecklistNote && session.outcomeNotes
                              ? 'repeat(2, minmax(0, 1fr))'
                              : '1fr',
                        },
                        gap: 1.5,
                        alignItems: 'stretch',
                      }}
                    >
                      {session.preFlightChecklistNote && (
                        <SessionChecklistBlock
                          label={t('Pre-flight safety checklist')}
                          rawNote={session.preFlightChecklistNote}
                        />
                      )}

                      {session.outcomeNotes && (
                        <SessionChecklistBlock
                          label={t('Post-flight outcome & completion checklist')}
                          rawNote={session.outcomeNotes}
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
                    color="warning"
                    variant={evidenceFilter === 'defects' ? 'filled' : 'outlined'}
                    label={`${defectEvidence.length} ${t('defect evidence')}`}
                    onClick={() =>
                      setEvidenceFilter((prev) => (prev === 'defects' ? 'all' : 'defects'))
                    }
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

            {/* Tier 1: Defect Evidence & Confirmed Findings */}
            {defectEvidence.length > 0 && (evidenceFilter === 'all' || evidenceFilter === 'defects') && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.25 }}>
                  {t('Defect evidence & confirmed findings')} ({defectEvidence.length})
                </Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: evidenceGridColumns(defectEvidence.length),
                    gap: 1.75,
                    alignItems: 'stretch',
                  }}
                >
                  {defectEvidence.map((item) => {
                    const linkedFindings = reportableFindings.filter(
                      (finding) => finding.evidenceId === item.id,
                    );
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
                        {item.latitude != null && item.longitude != null && (
                          <Field label="GPS" value={`${item.latitude}, ${item.longitude}`} />
                        )}

                        <Box
                          sx={{
                            mt: 'auto',
                            pt: 1.25,
                            borderTop: '1px solid',
                            borderColor: 'divider',
                          }}
                        >
                          <Stack
                            direction="row"
                            spacing={0.75}
                            sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}
                          >
                            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                              {t('Findings preview')}
                            </Typography>
                            <Chip
                              size="small"
                              color="success"
                              variant="outlined"
                              label={`${linkedFindings.length} ${t('confirmed')}`}
                              sx={{ height: 18, fontSize: '0.75rem', fontWeight: 700 }}
                            />
                          </Stack>

                          <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5, mb: 0.75 }}>
                            {linkedFindings.map((finding) => (
                              <Chip
                                key={finding.id}
                                size="small"
                                label={`${finding.defectLabel} · ${finding.severity}`}
                                color={
                                  finding.severity === 'CRITICAL' || finding.severity === 'HIGH'
                                    ? 'error'
                                    : finding.severity === 'MEDIUM'
                                      ? 'warning'
                                      : 'default'
                                }
                                sx={{ height: 20, fontSize: '0.75rem', fontWeight: 600 }}
                              />
                            ))}
                          </Stack>

                          <Stack
                            direction="row"
                            spacing={1.25}
                            sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}
                          >
                            <Button
                              size="small"
                              variant="text"
                              onClick={() => setSelectedModalEvidence(item)}
                              endIcon={<OpenInNewRounded sx={{ fontSize: '0.85rem !important' }} />}
                              sx={{
                                p: 0,
                                minWidth: 0,
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: 'primary.main',
                                textTransform: 'none',
                                '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' },
                              }}
                            >
                              {t('View finding details')}
                            </Button>
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
                          </Stack>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
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
                        {item.latitude != null && item.longitude != null && (
                          <Field label="GPS" value={`${item.latitude}, ${item.longitude}`} />
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
                        <Chip size="small" label={finding.severity} sx={{ height: 18, fontSize: '0.75rem', fontWeight: 700 }} />
                        <Chip size="small" color="success" label={t('Inspector-confirmed')} sx={{ height: 18, fontSize: '0.75rem' }} />
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

      {/* Modal Dialog for Focused Finding Details */}
      <Dialog
        open={Boolean(selectedModalEvidence)}
        onClose={() => setSelectedModalEvidence(null)}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '10px' } } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, wordBreak: 'break-word' }}>
              {selectedModalEvidence?.fileName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {modalFindings.length} {t('confirmed findings on this capture')}
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setSelectedModalEvidence(null)} aria-label={t('Close')}>
            <CloseRounded fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2.5 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '280px 1fr' }, gap: 2.5, alignItems: 'start' }}>
            {selectedModalEvidence && selectedModalEvidence.contentType.startsWith('image/') && (
              <Box sx={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                <AuthenticatedImage
                  src={inspectionApi.evidenceContentUrl(inspectionId, selectedModalEvidence.id)}
                  alt={selectedModalEvidence.fileName}
                  maxHeight={260}
                />
              </Box>
            )}
            <Stack spacing={1.5}>
              <Box sx={{ p: 1.5, borderRadius: '8px', bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>
                  {t('Asset location')}: {formatEvidenceLocationDescription(selectedModalEvidence?.locationDescription, t) || t('Not supplied')}
                </Typography>
                {selectedModalEvidence?.captureTime && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                    {t('Capture time')}: {formatDateTime(selectedModalEvidence.captureTime, formatDateTimeValue, '')}
                  </Typography>
                )}
                {selectedModalEvidence?.sourceVideoEvidenceId &&
                  evidenceList.some((ev) => ev.id === selectedModalEvidence.sourceVideoEvidenceId) && (
                    <Button
                      size="small"
                      variant="outlined"
                      color="secondary"
                      startIcon={<PlayCircleOutlineRounded fontSize="small" />}
                      onClick={() =>
                        openSourceVideoAtFrame(
                          selectedModalEvidence.sourceVideoEvidenceId!,
                          selectedModalEvidence.sourceTimestampSeconds ?? 0,
                        )
                      }
                      sx={{ mt: 1, textTransform: 'none', fontWeight: 600 }}
                    >
                      {`${t('Watch in video')} @ ${formatVideoMmSs(selectedModalEvidence.sourceTimestampSeconds)}`}
                    </Button>
                  )}
              </Box>

              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {t('Findings details')}:
              </Typography>

              <Stack spacing={1.25}>
                {modalFindings.map((finding) => (
                  <Box
                    key={finding.id}
                    sx={{
                      p: 1.5,
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'background.paper',
                    }}
                  >
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.75, flexWrap: 'wrap', gap: 0.5 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }}>
                        {finding.defectLabel}
                      </Typography>
                      <Chip size="small" label={finding.severity} sx={{ height: 20, fontSize: '0.75rem', fontWeight: 700 }} />
                      {finding.status === 'CONFIRMED' && (
                        <Chip
                          size="small"
                          color="success"
                          label={t('Inspector-confirmed')}
                          sx={{ height: 20, fontSize: '0.75rem', fontWeight: 600 }}
                        />
                      )}
                    </Stack>
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        color: 'text.secondary',
                        fontStyle: finding.technicalNotes?.trim() ? 'normal' : 'italic',
                        mt: 0.5,
                        fontSize: '0.75rem',
                      }}
                    >
                      <b>{t('Technical notes')}:</b>{' '}
                      {finding.technicalNotes?.trim() ? finding.technicalNotes : t('None')}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        color: 'text.secondary',
                        fontStyle: finding.recommendedAction?.trim() ? 'normal' : 'italic',
                        mt: 0.25,
                        fontSize: '0.75rem',
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
        </DialogContent>
        <DialogActions sx={{ px: 2.5, py: 1.5 }}>
          <Button onClick={() => setSelectedModalEvidence(null)} sx={{ textTransform: 'none', fontWeight: 600 }}>
            {t('Close')}
          </Button>
        </DialogActions>
      </Dialog>

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
    </Box>
  );
}
