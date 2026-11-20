import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  Stack,
  Typography,
} from '@mui/material';
import CheckCircleOutlineRounded from '@mui/icons-material/CheckCircleOutlineRounded';
import ErrorOutlineRounded from '@mui/icons-material/ErrorOutlineRounded';
import ExpandLessRounded from '@mui/icons-material/ExpandLessRounded';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import TaskAltRounded from '@mui/icons-material/TaskAltRounded';
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded';
import {
  inspectionApi,
  type EvidenceItem,
  type Finding,
  type ReportAiSummary,
} from '@/features/inspections/api/inspectionApi';
import { KnowledgeRecommendationPanel } from '@/features/inspections/components/KnowledgeRecommendationPanel';
import { useInspectionKnowledgeRecommendations } from '@/features/inspections/hooks/useInspections';
import { useLocale, type Locale } from '@/shared/i18n/LocaleProvider';

export interface ReportAiSummaryCardProps {
  inspectionId: string;
  versionId: string;
  summary?: string | null | undefined;
  findings?: Finding[] | undefined;
  evidenceList?: EvidenceItem[] | undefined;
  assetName?: string | null | undefined;
  evidenceCount?: number | undefined;
  defaultExpanded?: boolean | undefined;
}

export interface PersistedAiSummaryOptions {
  inspectionId: string;
  assetName?: string | null | undefined;
  findings?: Finding[] | undefined;
  evidenceList?: EvidenceItem[] | undefined;
  evidenceCount?: number | undefined;
  persistedSummary?: string | null | undefined;
  locale?: Locale | string | undefined;
  persist?: boolean | undefined;
}

export interface PersistedAiSummaryResult {
  summaryData: ReportAiSummary;
  wasCached: boolean;
}

interface StoredAiSummaryRecord {
  signature: string;
  summaryData: ReportAiSummary;
  generatedAt: string;
}

interface DefectDescriptor {
  key: string;
  enCategory: string;
  viCategory: string;
  enObservation: string;
  viObservation: string;
  enAction: string;
  viAction: string;
}

const DEFECT_DESCRIPTORS: DefectDescriptor[] = [
  {
    key: 'abscission',
    enCategory: 'surface spalling / delamination',
    viCategory: 'bong tróc / vỡ bề mặt bê tông',
    enObservation: 'Localized surface cover delamination / spalling observed',
    viObservation: 'Ghi nhận bong tróc lớp phủ / sứt vỡ bề mặt cục bộ',
    enAction:
      'Remove loose deteriorated concrete, treat exposed substrate, and patch with structural repair mortar',
    viAction:
      'Đục bỏ phần bê tông bong rộp, xử lý bề mặt nền và trám vá lại bằng vữa sửa chữa chuyên dụng',
  },
  {
    key: 'spalling',
    enCategory: 'surface spalling / delamination',
    viCategory: 'bong tróc / vỡ bề mặt bê tông',
    enObservation: 'Concrete spalling and surface loss detected',
    viObservation: 'Phát hiện sứt vỡ và mất lớp bảo vệ bề mặt',
    enAction:
      'Chip back unstable concrete, clean exposed areas, and restore protective cover with non-shrink repair mortar',
    viAction:
      'Làm sạch vùng bê tông yếu, xử lý cốt thép lộ thiên (nếu có) và phục hồi bằng vữa không co ngót',
  },
  {
    key: 'leakage',
    enCategory: 'moisture seepage / leakage',
    viCategory: 'thấm dột / rò rỉ nước',
    enObservation: 'Active moisture seepage or water staining along the surface',
    viObservation: 'Ghi nhận vết thấm ẩm / rò rỉ nước trên bề mặt kết cấu',
    enAction:
      'Trace upstream moisture ingress, clear drainage paths, and reseal joints with waterproof membrane',
    viAction:
      'Truy nguồn thấm nước, khơi thông rãnh thoát và xử lý chống thấm / bơm keo khe co giãn',
  },
  {
    key: 'crack',
    enCategory: 'surface cracking',
    viCategory: 'nứt bề mặt kết cấu',
    enObservation: 'Linear fracture detected requiring width and depth verification',
    viObservation: 'Phát hiện vết nứt cần kiểm tra bề rộng và chiều sâu phát triển',
    enAction:
      'Measure crack width/length on-site and seal via low-pressure epoxy or polyurethane injection',
    viAction:
      'Đo bề rộng/chiều dài vết nứt ngoài hiện trường và bơm keo epoxy hoặc polyurethane xử lý kín vết nứt',
  },
  {
    key: 'corrosion',
    enCategory: 'corrosion / oxidation',
    viCategory: 'ăn mòn / gỉ sét',
    enObservation: 'Surface oxidation or metallic corrosion observed',
    viObservation: 'Ghi nhận dấu hiệu oxy hóa hoặc ăn mòn kim loại',
    enAction:
      'Clean oxidized scale, apply rust inhibitor primer, and recoat with anti-corrosion protective system',
    viAction:
      'Làm sạch lớp gỉ sét, sơn lót ức chế ăn mòn và phủ lớp bảo vệ chống oxy hóa',
  },
];

const MEMORY_CACHE = new Map<string, StoredAiSummaryRecord>();

function storageKey(inspectionId: string, locale: string): string {
  return `sdi:ai-summary:v2:${inspectionId}:${locale}`;
}

function readStoredSummary(key: string): StoredAiSummaryRecord | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredAiSummaryRecord;
      if (parsed && typeof parsed.signature === 'string' && parsed.summaryData?.summary) {
        MEMORY_CACHE.set(key, parsed);
        return parsed;
      }
    }
  } catch {
    // Ignore storage access errors and fall back to memory cache.
  }
  return MEMORY_CACHE.get(key) ?? null;
}

function writeStoredSummary(key: string, record: StoredAiSummaryRecord): void {
  MEMORY_CACHE.set(key, record);
  try {
    window.localStorage.setItem(key, JSON.stringify(record));
  } catch {
    // Ignore quota or storage unavailability errors.
  }
}

function computeConfirmedSignature(confirmed: Finding[]): string {
  return confirmed
    .map(
      (f) =>
        `${f.id}:${f.findingCode ?? ''}:${f.defectLabel}:${f.severity}:${f.confidence ?? ''}:${f.technicalNotes ?? ''}`,
    )
    .join('|');
}

function computeOverallRisk(confirmed: Finding[]): ReportAiSummary['overallRisk'] {
  if (confirmed.some((f) => f.severity === 'CRITICAL')) return 'CRITICAL';
  if (confirmed.some((f) => f.severity === 'HIGH')) return 'HIGH';
  if (confirmed.some((f) => f.severity === 'MEDIUM')) return 'MEDIUM';
  return 'LOW';
}

function normalizeConfidencePercent(raw: number | null | undefined): number | null {
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw <= 0) return null;
  return raw > 1 ? Math.round(raw) : Math.round(raw * 100);
}

function matchDescriptor(label: string): DefectDescriptor | undefined {
  const lower = label.trim().toLowerCase();
  return DEFECT_DESCRIPTORS.find((d) => lower.includes(d.key));
}

function isRedundantNote(note: string | null | undefined, defectLabel: string): boolean {
  const cleanNote = note?.trim().toLowerCase() ?? '';
  if (!cleanNote || cleanNote === 'none' || cleanNote === 'không có') return true;
  const cleanLabel = defectLabel.trim().toLowerCase();
  return cleanNote === cleanLabel;
}

function getFindingObservationText(
  finding: Finding,
  evidenceById: Map<string, EvidenceItem>,
  isVi: boolean,
): string {
  const descriptor = matchDescriptor(finding.defectLabel);
  const baseObservation = !isRedundantNote(finding.technicalNotes, finding.defectLabel)
    ? finding.technicalNotes!.trim()
    : descriptor
      ? isVi
        ? descriptor.viObservation
        : descriptor.enObservation
      : isVi
        ? `Khiếm khuyết ${finding.defectLabel} đã được xác nhận trên ảnh hiện trường`
        : `Confirmed ${finding.defectLabel} defect documented on field capture`;

  const metaParts: string[] = [];
  const conf = normalizeConfidencePercent(finding.confidence);
  if (conf != null) {
    metaParts.push(isVi ? `${conf}% độ tin cậy AI` : `${conf}% AI confidence`);
  }
  const ev = finding.evidenceId ? evidenceById.get(finding.evidenceId) : undefined;
  const location = ev?.locationDescription?.trim();
  if (location && !location.startsWith('Trích xuất') && !location.startsWith('Extracted from')) {
    metaParts.push(location);
  }
  return metaParts.length > 0 ? `${baseObservation} (${metaParts.join(' · ')})` : baseObservation;
}

function isLegacyTemplateSummary(text: string): boolean {
  const trimmed = text.trim();
  return (
    trimmed.startsWith('AI synthesis across ') ||
    trimmed.startsWith('Inspection report for ') ||
    trimmed.startsWith('Phân tích AI tổng hợp từ ') ||
    trimmed.startsWith('Báo cáo kiểm định cho ')
  );
}

function groupDefectTypes(confirmed: Finding[], isVi: boolean) {
  const groups = new Map<
    string,
    { label: string; categoryText: string; count: number; codes: string[] }
  >();

  for (const f of confirmed) {
    const rawKey = f.defectLabel.trim().toLowerCase();
    const descriptor = matchDescriptor(f.defectLabel);
    const existing = groups.get(rawKey);
    const code = f.findingCode?.trim() || '';

    if (existing) {
      existing.count += 1;
      if (code) existing.codes.push(code);
    } else {
      groups.set(rawKey, {
        label: f.defectLabel.trim(),
        categoryText: descriptor
          ? isVi
            ? `${descriptor.viCategory}`
            : `${descriptor.enCategory}`
          : f.defectLabel.trim(),
        count: 1,
        codes: code ? [code] : [],
      });
    }
  }
  return Array.from(groups.values());
}

function buildSynthesizedAiSummary({
  assetName,
  confirmed,
  evidenceList = [],
  evidenceCount,
  locale,
}: {
  assetName?: string | null | undefined;
  confirmed: Finding[];
  evidenceList?: EvidenceItem[] | undefined;
  evidenceCount?: number | undefined;
  locale: string;
}): ReportAiSummary {
  const isVi = locale.toLowerCase().startsWith('vi');
  const overallRisk = computeOverallRisk(confirmed);
  const resolvedAsset =
    assetName?.trim() || (isVi ? 'công trình được kiểm định' : 'the inspected structure');
  const totalEvidence =
    typeof evidenceCount === 'number'
      ? evidenceCount
      : evidenceList.length > 0
        ? evidenceList.length
        : undefined;

  if (confirmed.length === 0) {
    return {
      summary: isVi
        ? `Khảo sát kiểm định trực quan bằng drone tại ${resolvedAsset}${totalEvidence != null ? ` (${totalEvidence} bằng chứng hiện trường)` : ''} đã hoàn tất. Không phát hiện khiếm khuyết kết cấu nào cần xử lý trong phạm vi khảo sát.`
        : `Visual drone inspection of ${resolvedAsset}${totalEvidence != null ? ` across ${totalEvidence} captured evidence items` : ''} is complete. No confirmed structural defects were identified within the surveyed scope.`,
      keyHighlights: [
        isVi
          ? 'Toàn bộ phạm vi khảo sát không ghi nhận khiếm khuyết kết cấu bất thường'
          : 'No structural anomalies confirmed across inspected surfaces',
      ],
      recommendedActions: isVi
        ? 'Tiếp tục duy trì chu kỳ kiểm định định kỳ bằng drone theo kế hoạch vận hành tài sản.'
        : 'Maintain the scheduled periodic visual inspection cycle under routine asset monitoring.',
      overallRisk: 'LOW',
    };
  }

  const evidenceById = new Map<string, EvidenceItem>();
  for (const item of evidenceList) {
    evidenceById.set(item.id, item);
  }

  const countsBySeverity = {
    CRITICAL: confirmed.filter((f) => f.severity === 'CRITICAL').length,
    HIGH: confirmed.filter((f) => f.severity === 'HIGH').length,
    MEDIUM: confirmed.filter((f) => f.severity === 'MEDIUM').length,
    LOW: confirmed.filter((f) => f.severity === 'LOW').length,
  };

  const severitySummaryParts: string[] = [];
  if (countsBySeverity.CRITICAL > 0) {
    severitySummaryParts.push(`${countsBySeverity.CRITICAL} CRITICAL`);
  }
  if (countsBySeverity.HIGH > 0) {
    severitySummaryParts.push(`${countsBySeverity.HIGH} HIGH`);
  }
  if (countsBySeverity.MEDIUM > 0) {
    severitySummaryParts.push(`${countsBySeverity.MEDIUM} MEDIUM`);
  }
  if (countsBySeverity.LOW > 0) {
    severitySummaryParts.push(`${countsBySeverity.LOW} LOW`);
  }

  const groups = groupDefectTypes(confirmed, isVi);
  const groupedPhrase = groups
    .map((g) => `${g.categoryText} (${g.count})`)
    .join(isVi ? ', ' : '; ');

  const confidences = confirmed
    .map((f) => normalizeConfidencePercent(f.confidence))
    .filter((v): v is number => v !== null);
  const confidencePhrase =
    confidences.length > 0
      ? (() => {
          const minC = Math.min(...confidences);
          const maxC = Math.max(...confidences);
          const rangeText = minC === maxC ? `${minC}%` : `${minC}%–${maxC}%`;
          return isVi ? ` với độ tin cậy AI ${rangeText}` : ` (AI detection confidence ${rangeText})`;
        })()
      : '';

  const riskImplication =
    overallRisk === 'CRITICAL'
      ? isVi
        ? 'Cần phong tỏa khu vực ảnh hưởng và xử lý kỹ thuật khẩn cấp.'
        : 'Immediate structural engineering intervention and safety isolation are advised.'
      : overallRisk === 'HIGH'
        ? isVi
          ? 'Cần lập kế hoạch sửa chữa ưu tiên cao để ngăn lan rộng hư hỏng.'
          : 'Priority corrective remediation is advised to arrest progressive deterioration.'
        : overallRisk === 'MEDIUM'
          ? isVi
            ? 'Tình trạng xuống cấp bề mặt ở mức trung bình, cần đưa vào kế hoạch bảo trì khắc phục có kiểm soát.'
            : 'Moderate surface deterioration is indicated; scheduled corrective maintenance is recommended.'
          : isVi
            ? 'Khiếm khuyết mức nhẹ, tiếp tục theo dõi trong chu kỳ bảo trì định kỳ.'
            : 'Minor localized observations; continue monitoring within routine maintenance.';

  const countWordEn = confirmed.length === 1 ? '1 confirmed defect' : `${confirmed.length} confirmed defects`;
  const captureClauseEn =
    totalEvidence != null
      ? totalEvidence === 1
        ? ' across 1 captured evidence item'
        : ` across ${totalEvidence} captured evidence items`
      : '';

  const summary = isVi
    ? `Kiểm định trực quan tại ${resolvedAsset} ghi nhận ${confirmed.length} khiếm khuyết đã xác nhận${totalEvidence != null ? ` trên ${totalEvidence} bằng chứng hiện trường` : ''}${confidencePhrase}, gồm: ${groupedPhrase}. Phân bố mức độ: ${severitySummaryParts.join(', ')}. ${riskImplication}`
    : `Visual inspection of ${resolvedAsset} identified ${countWordEn}${captureClauseEn}${confidencePhrase}, spanning ${groupedPhrase}. Severity breakdown: ${severitySummaryParts.join(', ')}. ${riskImplication}`;

  const keyHighlights = confirmed.slice(0, 6).map((f) => {
    const codePrefix = f.findingCode ? `${f.findingCode} · ` : '';
    const detail = getFindingObservationText(f, evidenceById, isVi);
    return `${codePrefix}${f.defectLabel} [${f.severity}] — ${detail}`;
  });
  if (confirmed.length > 6) {
    keyHighlights.push(
      isVi
        ? `Và ${confirmed.length - 6} phát hiện đã xác nhận khác trong danh sách chi tiết bên dưới.`
        : `Plus ${confirmed.length - 6} additional confirmed finding(s) documented in the evidence register below.`,
    );
  }

  // Build defect-specific actionable remediation bullets.
  const actionLines: string[] = [];
  for (const group of groups) {
    const codeTag = group.codes.length > 0 ? ` (${group.codes.join(', ')})` : '';
    const descriptor = matchDescriptor(group.label);
    if (descriptor) {
      actionLines.push(
        `${group.label}${codeTag}: ${isVi ? descriptor.viAction : descriptor.enAction}.`,
      );
    } else {
      actionLines.push(
        isVi
          ? `${group.label}${codeTag}: Kiểm tra chi tiết ngoài hiện trường và lập phiếu công việc sửa chữa phù hợp.`
          : `${group.label}${codeTag}: Inspect defect extent on-site and execute targeted surface repair work order.`,
      );
    }
  }

  return {
    summary,
    keyHighlights,
    recommendedActions: actionLines.join('\n'),
    overallRisk,
  };
}

/**
 * Generates an AI Executive Summary once per inspection/findings state and persists it locally
 * so revisiting Step 7 reuses the stored digest instead of regenerating on every render.
 */
export function getOrGeneratePersistedAiSummary({
  inspectionId,
  assetName,
  findings = [],
  evidenceList = [],
  evidenceCount,
  persistedSummary,
  locale = 'en',
  persist = true,
}: PersistedAiSummaryOptions): PersistedAiSummaryResult {
  const confirmed = findings.filter((f) => f.status === 'CONFIRMED' && !f.isDeleted);
  const signature = computeConfirmedSignature(confirmed);
  const key = storageKey(inspectionId || 'default', locale);
  const cleanPersisted = persistedSummary?.trim() || '';
  const effectivePersisted =
    cleanPersisted && !isLegacyTemplateSummary(cleanPersisted) ? cleanPersisted : '';

  const stored = inspectionId ? readStoredSummary(key) : null;
  if (stored && stored.signature === signature) {
    return {
      summaryData: effectivePersisted
        ? { ...stored.summaryData, summary: effectivePersisted }
        : stored.summaryData,
      wasCached: true,
    };
  }

  const synthesized = buildSynthesizedAiSummary({
    assetName,
    confirmed,
    evidenceList,
    evidenceCount,
    locale,
  });

  const summaryData: ReportAiSummary = effectivePersisted
    ? { ...synthesized, summary: effectivePersisted }
    : synthesized;

  if (persist && inspectionId) {
    writeStoredSummary(key, {
      signature,
      summaryData,
      generatedAt: new Date().toISOString(),
    });
  }

  return {
    summaryData,
    wasCached: false,
  };
}

function getSoftRiskChipSx(risk: ReportAiSummary['overallRisk']) {
  if (risk === 'CRITICAL' || risk === 'HIGH') {
    return {
      fontWeight: 600,
      fontSize: '0.75rem',
      bgcolor: '#fef2f2',
      color: '#991b1b',
      borderColor: '#fecaca',
      '& .MuiChip-icon': { color: '#b91c1c' },
    };
  }
  if (risk === 'MEDIUM') {
    return {
      fontWeight: 600,
      fontSize: '0.75rem',
      bgcolor: '#fef9c3',
      color: '#713f12',
      borderColor: '#fde047',
      '& .MuiChip-icon': { color: '#a16207' },
    };
  }
  return {
    fontWeight: 600,
    fontSize: '0.75rem',
    bgcolor: '#f0fdf4',
    color: '#166534',
    borderColor: '#bbf7d0',
    '& .MuiChip-icon': { color: '#15803d' },
  };
}

function getSoftSeverityBadgeSx(severity: string) {
  const upper = severity.toUpperCase();
  if (upper === 'CRITICAL' || upper === 'HIGH') {
    return {
      bgcolor: '#fef2f2',
      color: '#991b1b',
      border: '1px solid #fecaca',
    };
  }
  if (upper === 'MEDIUM') {
    return {
      bgcolor: '#fef9c3',
      color: '#713f12',
      border: '1px solid #fde047',
    };
  }
  return {
    bgcolor: '#f0fdf4',
    color: '#166534',
    border: '1px solid #bbf7d0',
  };
}

/** Mounted only on user expand, so a missing QueryClient in incidental tests is never touched. */
function MatchedKnowledgeBody({ inspectionId }: { inspectionId: string }) {
  const query = useInspectionKnowledgeRecommendations(inspectionId, true);
  return <KnowledgeRecommendationPanel data={query.data} isLoading={query.isLoading} />;
}

export function ReportAiSummaryCard({
  inspectionId,
  versionId,
  summary: persistedSummary,
  findings = [],
  evidenceList = [],
  assetName,
  evidenceCount,
  defaultExpanded = false,
}: ReportAiSummaryCardProps) {
  const { t, locale } = useLocale();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [knowledgeOpen, setKnowledgeOpen] = useState(false);
  const [remoteState, setRemoteState] = useState<{
    targetKey: string;
    data: ReportAiSummary | null;
  } | null>(null);

  const hasPersistedSummary = Boolean(persistedSummary && persistedSummary.trim().length > 0);
  const isPreviewVersion = !versionId || versionId.startsWith('preview-');
  const canQueryKnowledge =
    Boolean(inspectionId) &&
    !isPreviewVersion &&
    typeof inspectionApi?.getInspectionKnowledgeRecommendations === 'function';

  const localResult = useMemo(
    () =>
      getOrGeneratePersistedAiSummary({
        inspectionId,
        assetName,
        findings,
        evidenceList,
        evidenceCount,
        persistedSummary,
        locale,
        persist: Boolean(inspectionId) && (findings.length > 0 || isPreviewVersion),
      }),
    [inspectionId, assetName, findings, evidenceList, evidenceCount, persistedSummary, locale, isPreviewVersion],
  );

  const shouldFetchRemote =
    !hasPersistedSummary &&
    !isPreviewVersion &&
    findings.length === 0 &&
    Boolean(inspectionId && versionId);
  const remoteTargetKey = `${inspectionId}:${versionId}`;

  useEffect(() => {
    if (!shouldFetchRemote || typeof inspectionApi?.getAiSummary !== 'function') {
      return;
    }
    let cancelled = false;
    inspectionApi
      .getAiSummary(inspectionId, versionId)
      .then((res) => {
        if (!cancelled) {
          setRemoteState({ targetKey: remoteTargetKey, data: res ?? null });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRemoteState({ targetKey: remoteTargetKey, data: null });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [shouldFetchRemote, inspectionId, versionId, remoteTargetKey]);

  const remoteLoading = shouldFetchRemote && remoteState?.targetKey !== remoteTargetKey;
  const remoteSummary =
    shouldFetchRemote && remoteState?.targetKey === remoteTargetKey ? remoteState.data : null;

  const aiSummary: ReportAiSummary = remoteSummary ?? localResult.summaryData;
  const knowledgeRefs = aiSummary.knowledgeReferences ?? [];

  const confirmedFindings = useMemo(
    () => findings.filter((f) => f.status === 'CONFIRMED' && !f.isDeleted),
    [findings],
  );
  const evidenceById = useMemo(() => {
    const map = new Map<string, EvidenceItem>();
    for (const item of evidenceList) map.set(item.id, item);
    return map;
  }, [evidenceList]);

  const categoryBadges = useMemo(() => {
    const counts = new Map<string, number>();
    for (const f of confirmedFindings) {
      const label = f.defectLabel.trim();
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return Array.from(counts.entries());
  }, [confirmedFindings]);

  const actionItems = useMemo(
    () =>
      (aiSummary.recommendedActions ?? '')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
    [aiSummary.recommendedActions],
  );

  if (remoteLoading && !aiSummary.summary) {
    return (
      <Card
        variant="outlined"
        sx={{
          borderRadius: '12px',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          p: 2,
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <CircularProgress size={20} color="primary" />
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
            {t('Generating AI executive summary…')}
          </Typography>
        </Stack>
      </Card>
    );
  }

  const riskIcon =
    aiSummary.overallRisk === 'CRITICAL' || aiSummary.overallRisk === 'HIGH' ? (
      <ErrorOutlineRounded fontSize="small" />
    ) : aiSummary.overallRisk === 'MEDIUM' ? (
      <WarningAmberRounded fontSize="small" />
    ) : (
      <CheckCircleOutlineRounded fontSize="small" />
    );

  const isVi = locale.toLowerCase().startsWith('vi');

  return (
    <Card
      variant="outlined"
      data-testid="ai-executive-summary-card"
      sx={{
        borderRadius: '12px',
        borderColor: '#bae6fd',
        bgcolor: (theme) =>
          theme.palette.mode === 'dark' ? 'rgba(14, 165, 233, 0.08)' : 'rgba(240, 249, 255, 0.85)',
        boxShadow: 'none',
        overflow: 'hidden',
      }}
    >
      <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
        {/* Always-visible compact summary header; click to show/hide full AI digest */}
        <Box
          onClick={() => setExpanded((prev) => !prev)}
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.25,
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
              {t('AI Executive Summary')}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}>
            <Button
              size="small"
              variant="text"
              aria-expanded={expanded}
              endIcon={expanded ? <ExpandLessRounded /> : <ExpandMoreRounded />}
              onClick={(event) => {
                event.stopPropagation();
                setExpanded((prev) => !prev);
              }}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.8rem',
                minHeight: 28,
                px: 1,
                borderRadius: '8px',
              }}
            >
              {expanded ? t('Hide details') : t('Show details')}
            </Button>
          </Stack>
        </Box>

        {/* Detailed narrative, structured highlights, and actionable recommendations — hidden until clicked */}
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Stack
            spacing={1.75}
            sx={{
              mt: 1.5,
              pt: 1.5,
              borderTop: '1px solid',
              borderColor: 'rgba(14, 165, 233, 0.22)',
            }}
          >
            {/* Narrative + Risk & Defect Breakdown Chips */}
            <Box>
              <Typography
                variant="body2"
                sx={{ color: 'text.primary', lineHeight: 1.65, fontWeight: 500 }}
              >
                {aiSummary.summary}
              </Typography>

              <Stack direction="row" spacing={0.75} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.75 }}>
                <Chip
                  size="small"
                  variant="outlined"
                  icon={riskIcon}
                  label={`${t('Overall Risk')}: ${t(aiSummary.overallRisk)}`}
                  sx={getSoftRiskChipSx(aiSummary.overallRisk)}
                />
                {categoryBadges.map(([label, count]) => (
                  <Chip
                    key={label}
                    size="small"
                    variant="outlined"
                    label={`${label} ×${count}`}
                    sx={{
                      height: 22,
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      bgcolor: 'background.paper',
                      borderColor: 'divider',
                      color: 'text.primary',
                    }}
                  />
                ))}
              </Stack>
            </Box>

            {/* Two-column structured digest: Highlights & Recommended Actions */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1.15fr 0.85fr' },
                gap: 1.5,
                alignItems: 'stretch',
              }}
            >
              {/* Key Highlights */}
              {(confirmedFindings.length > 0 || (aiSummary.keyHighlights?.length ?? 0) > 0) && (
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: '10px',
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'text.secondary',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      display: 'block',
                      mb: 1,
                    }}
                  >
                    {t('Key Highlights')}
                  </Typography>

                  {confirmedFindings.length > 0 ? (
                    <Stack spacing={1}>
                      {confirmedFindings.slice(0, 6).map((f) => (
                        <Box
                          key={f.id}
                          sx={{
                            p: 1,
                            borderRadius: '8px',
                            bgcolor: (theme) =>
                              theme.palette.mode === 'dark'
                                ? 'rgba(255,255,255,0.03)'
                                : '#f8fafc',
                            border: '1px solid',
                            borderColor: 'divider',
                          }}
                        >
                          <Stack
                            direction="row"
                            spacing={0.75}
                            sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.5, mb: 0.25 }}
                          >
                            {f.findingCode && (
                              <Box
                                component="span"
                                sx={{
                                  px: 0.75,
                                  py: 0.1,
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  bgcolor: 'action.selected',
                                  color: 'text.primary',
                                }}
                              >
                                {f.findingCode}
                              </Box>
                            )}
                            <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.8125rem' }}>
                              {f.defectLabel}
                            </Typography>
                            <Box
                              component="span"
                              sx={{
                                px: 0.75,
                                py: 0.1,
                                borderRadius: '999px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                ...getSoftSeverityBadgeSx(f.severity),
                              }}
                            >
                              {f.severity}
                            </Box>
                          </Stack>
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', lineHeight: 1.45 }}>
                            {getFindingObservationText(f, evidenceById, isVi)}
                          </Typography>
                        </Box>
                      ))}
                      {confirmedFindings.length > 6 && (
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                          {isVi
                            ? `+ ${confirmedFindings.length - 6} phát hiện khác trong phần bằng chứng bên dưới.`
                            : `+ ${confirmedFindings.length - 6} additional finding(s) listed in the evidence register below.`}
                        </Typography>
                      )}
                    </Stack>
                  ) : (
                    <Stack spacing={0.75}>
                      {(aiSummary.keyHighlights ?? []).map((highlight, index) => (
                        <Stack key={index} direction="row" spacing={0.75} sx={{ alignItems: 'flex-start' }}>
                          <Box
                            sx={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              bgcolor: 'primary.main',
                              mt: 0.85,
                              flexShrink: 0,
                            }}
                          />
                          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}>
                            {highlight}
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>
                  )}
                </Box>
              )}

              {/* Recommended Actions */}
              {actionItems.length > 0 && (
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: '10px',
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 700,
                      color: 'text.secondary',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      display: 'block',
                      mb: 1,
                    }}
                  >
                    {t('Recommended Actions')}
                  </Typography>
                  <Stack spacing={1}>
                    {actionItems.map((action, index) => (
                      <Stack
                        key={index}
                        direction="row"
                        spacing={1}
                        sx={{ alignItems: 'flex-start' }}
                      >
                        <TaskAltRounded
                          sx={{ fontSize: 16, color: 'primary.main', mt: '2px', flexShrink: 0 }}
                        />
                        <Typography
                          variant="body2"
                          sx={{ color: 'text.primary', fontSize: '0.8125rem', lineHeight: 1.5 }}
                        >
                          {action}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Box>
              )}
            </Box>

            {canQueryKnowledge && (
              <Box sx={{ pt: 0.75, borderTop: '1px solid', borderColor: 'divider' }}>
                <Box
                  data-testid="matched-knowledge-bar"
                  onClick={() => setKnowledgeOpen((value) => !value)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 700,
                        fontSize: '0.7rem',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        color: 'text.secondary',
                      }}
                    >
                      {t('Matched Cases & Standards')}
                    </Typography>
                    {knowledgeRefs.slice(0, 4).map((ref, index) => (
                      <Chip
                        key={`${ref.codeOrLabel}-${index}`}
                        size="small"
                        variant="outlined"
                        label={ref.codeOrLabel}
                        sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600, '& .MuiChip-label': { px: 0.75 } }}
                      />
                    ))}
                    {knowledgeRefs.length > 0 && (
                      <Chip
                        size="small"
                        label={`${knowledgeRefs.length} ${knowledgeRefs.length === 1 ? t('similar case') : t('similar cases')}`}
                        sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700, '& .MuiChip-label': { px: 0.75 } }}
                      />
                    )}
                  </Stack>
                  {knowledgeOpen ? (
                    <ExpandLessRounded sx={{ fontSize: 18, color: 'text.secondary' }} />
                  ) : (
                    <ExpandMoreRounded sx={{ fontSize: 18, color: 'text.secondary' }} />
                  )}
                </Box>
                <Collapse in={knowledgeOpen} unmountOnExit>
                  <MatchedKnowledgeBody inspectionId={inspectionId} />
                </Collapse>
              </Box>
            )}
          </Stack>
        </Collapse>
      </CardContent>
    </Card>
  );
}
