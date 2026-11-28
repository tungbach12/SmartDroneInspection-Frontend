import { useEffect, useMemo, useState } from 'react';
import { alpha, type Theme } from '@mui/material/styles';
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import CheckCircleOutlineRounded from '@mui/icons-material/CheckCircleOutlineRounded';
import ErrorOutlineRounded from '@mui/icons-material/ErrorOutlineRounded';
import ExpandLessRounded from '@mui/icons-material/ExpandLessRounded';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import RefreshRounded from '@mui/icons-material/RefreshRounded';
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded';
import {
  inspectionApi,
  type EvidenceItem,
  type Finding,
  type ReportAiSummary,
} from '@/features/inspections/api/inspectionApi';
import { useAuthStore } from '@/features/auth/store/authStore';
import { KnowledgeRecommendationPanel } from '@/features/inspections/components/KnowledgeRecommendationPanel';
import { useInspectionKnowledgeRecommendations } from '@/features/inspections/hooks/useInspections';
import { useLocale, type Locale } from '@/shared/i18n/LocaleProvider';

export interface ReportAiSummaryCardProps {
  inspectionId: string;
  versionId: string;
  versionStatus?: string | undefined;
  summary?: string | null | undefined;
  findings?: Finding[] | undefined;
  evidenceList?: EvidenceItem[] | undefined;
  assetName?: string | null | undefined;
  evidenceCount?: number | undefined;
  defaultExpanded?: boolean | undefined;
  canRegenerate?: boolean | undefined;
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
  source?: 'local' | 'remote';
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
    enObservation: 'Localized surface cover delamination or spalling confirmed on inspected surfaces',
    viObservation: 'Ghi nhận tình trạng bong tróc lớp phủ / sứt vỡ bề mặt bê tông cục bộ',
    enAction:
      'Remove loose deteriorated concrete, treat exposed substrate, and patch with structural repair mortar',
    viAction:
      'Đục bỏ phần bê tông bong rộp, xử lý bề mặt nền và trám vá lại bằng vữa sửa chữa chuyên dụng',
  },
  {
    key: 'spalling',
    enCategory: 'surface spalling / delamination',
    viCategory: 'bong tróc / vỡ bề mặt bê tông',
    enObservation: 'Concrete spalling and protective cover loss confirmed',
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
    enObservation: 'Active moisture seepage or water staining confirmed along structural joints',
    viObservation: 'Ghi nhận dấu hiệu thấm ẩm / rò rỉ nước dọc bề mặt hoặc khe nối kết cấu',
    enAction:
      'Trace upstream moisture ingress, clear drainage paths, and reseal joints with waterproof membrane',
    viAction:
      'Truy nguồn thấm nước, khơi thông rãnh thoát và xử lý chống thấm / bơm keo khe co giãn',
  },
  {
    key: 'crack',
    enCategory: 'surface cracking',
    viCategory: 'nứt bề mặt kết cấu',
    enObservation: 'Linear surface cracking confirmed requiring on-site width and progression check',
    viObservation: 'Phát hiện vết nứt bề mặt cần kiểm tra bề rộng và mức độ lan rộng ngoài hiện trường',
    enAction:
      'Measure crack width/length on-site and seal via low-pressure epoxy or polyurethane injection',
    viAction:
      'Đo bề rộng/chiều dài vết nứt ngoài hiện trường và bơm keo epoxy hoặc polyurethane xử lý kín vết nứt',
  },
  {
    key: 'corrosion',
    enCategory: 'corrosion / oxidation',
    viCategory: 'ăn mòn / gỉ sét',
    enObservation: 'Surface oxidation or metallic corrosion observed on structural components',
    viObservation: 'Ghi nhận dấu hiệu oxy hóa hoặc ăn mòn kim loại trên cấu kiện',
    enAction:
      'Clean oxidized scale, apply rust inhibitor primer, and recoat with anti-corrosion protective system',
    viAction:
      'Làm sạch lớp gỉ sét, sơn lót ức chế ăn mòn và phủ lớp bảo vệ chống oxy hóa',
  },
];

const MEMORY_CACHE = new Map<string, StoredAiSummaryRecord>();

const SEVERITY_RANK: Record<string, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

function storageKey(inspectionId: string, locale: string): string {
  return `sdi:ai-summary:v3:${inspectionId}:${locale}`;
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

function displayDefectLabel(label: string | null | undefined, isVi: boolean): string {
  return label?.trim() || (isVi ? 'Khiếm khuyết chưa phân loại' : 'Unspecified defect');
}

/** Strips noisy legacy fallback strings stored in older finding technicalNotes records. */
function sanitizeTechnicalNote(rawNote: string | null | undefined): string {
  if (!rawNote) return '';
  let cleaned = rawNote.trim();
  cleaned = cleaned.replace(/Inspector's current note:\s*[^.]*\.?/gi, '');
  cleaned = cleaned.replace(/;?\s*a comparable case recorded published\.?/gi, '');
  cleaned = cleaned.replace(/Reference\s+[^.;]+?\s+advises[^.;]*[.;]?/gi, '');
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
  return cleaned;
}

function isRedundantNote(note: string | null | undefined, defectLabel: string): boolean {
  const cleanNote = sanitizeTechnicalNote(note).toLowerCase();
  if (!cleanNote || cleanNote === 'none' || cleanNote === 'không có') return true;
  const cleanLabel = defectLabel.trim().toLowerCase();
  return (
    cleanNote === cleanLabel ||
    /^the (low|medium|high|critical)-severity .+ is observed within the marked region\.?$/i.test(
      cleanNote,
    )
  );
}

function isLegacyTemplateSummary(text: string): boolean {
  const trimmed = text.trim();
  return (
    trimmed.startsWith('AI synthesis across ') ||
    trimmed.startsWith('Inspection report for ') ||
    trimmed.startsWith('Phân tích AI tổng hợp từ ') ||
    trimmed.startsWith('Báo cáo kiểm định cho ') ||
    trimmed.includes('Severity breakdown:') ||
    trimmed.includes('Phân bố mức độ:')
  );
}

function highestSeverity(list: Finding[]): string {
  let best = 'LOW';
  let bestRank = 0;
  for (const f of list) {
    const sev = (f.severity ?? 'LOW').toUpperCase();
    const rank = SEVERITY_RANK[sev] ?? 1;
    if (rank > bestRank) {
      bestRank = rank;
      best = sev;
    }
  }
  return best;
}

function groupDefectTypes(confirmed: Finding[], isVi: boolean) {
  const groups = new Map<
    string,
    {
      label: string;
      categoryText: string;
      count: number;
      codes: string[];
      findings: Finding[];
      topSeverity: string;
      confidences: number[];
    }
  >();

  for (const f of confirmed) {
    const label = displayDefectLabel(f.defectLabel, isVi);
    const rawKey = label.toLowerCase();
    const descriptor = matchDescriptor(label);
    const existing = groups.get(rawKey);
    const code = f.findingCode?.trim() || '';
    const conf = normalizeConfidencePercent(f.confidence);

    if (existing) {
      existing.count += 1;
      existing.findings.push(f);
      existing.topSeverity = highestSeverity(existing.findings);
      if (code) existing.codes.push(code);
      if (conf != null) existing.confidences.push(conf);
    } else {
      groups.set(rawKey, {
        label,
        categoryText: descriptor
          ? isVi
            ? descriptor.viCategory
            : descriptor.enCategory
          : label,
        count: 1,
        codes: code ? [code] : [],
        findings: [f],
        topSeverity: (f.severity ?? 'LOW').toUpperCase(),
        confidences: conf != null ? [conf] : [],
      });
    }
  }

  return Array.from(groups.values()).sort(
    (a, b) => (SEVERITY_RANK[b.topSeverity] ?? 0) - (SEVERITY_RANK[a.topSeverity] ?? 0),
  );
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
        ? `Khảo sát kiểm định trực quan bằng drone tại ${resolvedAsset}${totalEvidence != null ? ` (${totalEvidence} bằng chứng hiện trường)` : ''} đã hoàn tất. Không ghi nhận khiếm khuyết kết cấu cần xử lý trong phạm vi khảo sát.`
        : `Visual drone inspection of ${resolvedAsset}${totalEvidence != null ? ` across ${totalEvidence} captured evidence item(s)` : ''} is complete. No confirmed structural defects were identified within the surveyed scope.`,
      keyHighlights: [
        isVi
          ? 'Không ghi nhận khiếm khuyết kết cấu bất thường trong phạm vi khảo sát.'
          : 'No structural anomalies confirmed across inspected surfaces.',
      ],
      recommendedActions: isVi
        ? 'Bảo trì định kỳ: Tiếp tục duy trì chu kỳ kiểm định bằng drone theo kế hoạch vận hành.'
        : 'Routine monitoring: Maintain the scheduled periodic visual inspection cycle.',
      overallRisk: 'LOW',
    };
  }

  const groups = groupDefectTypes(confirmed, isVi);
  const categoryList = groups.map((g) => g.categoryText).join(', ');
  const riskImplication =
    overallRisk === 'CRITICAL'
      ? isVi
        ? 'Cần phong tỏa khu vực ảnh hưởng và can thiệp kỹ thuật khẩn cấp.'
        : 'Immediate structural engineering intervention and safety isolation are advised.'
      : overallRisk === 'HIGH'
        ? isVi
          ? 'Cần lập phương án sửa chữa ưu tiên cao để ngăn hư hỏng lan rộng.'
          : 'Priority corrective remediation is advised to arrest progressive deterioration.'
        : overallRisk === 'MEDIUM'
          ? isVi
            ? 'Tình trạng xuống cấp bề mặt ở mức trung bình; cần đưa vào kế hoạch bảo trì khắc phục.'
            : 'Moderate surface deterioration is indicated; scheduled corrective maintenance is recommended.'
          : isVi
            ? 'Khiếm khuyết cục bộ mức nhẹ; tiếp tục theo dõi theo chu kỳ bảo trì định kỳ.'
            : 'Minor localized conditions observed; monitor under routine maintenance cycles.';

  const countWordEn =
    confirmed.length === 1 ? '1 confirmed defect' : `${confirmed.length} confirmed defects`;
  const captureClauseEn =
    totalEvidence != null
      ? totalEvidence === 1
        ? ' across 1 captured evidence item'
        : ` across ${totalEvidence} captured evidence items`
      : '';

  const summary = isVi
    ? `Kiểm định trực quan tại ${resolvedAsset} ghi nhận ${confirmed.length} khiếm khuyết đã xác nhận${totalEvidence != null ? ` trên ${totalEvidence} bằng chứng hiện trường` : ''}, tập trung ở ${categoryList}. ${riskImplication}`
    : `Visual inspection of ${resolvedAsset} identified ${countWordEn}${captureClauseEn}, primarily involving ${categoryList}. ${riskImplication}`;

  const keyHighlights = groups.slice(0, 5).map((group) => {
    const countTag = `x${group.count}`;
    const codeTag = group.codes.length > 0 ? `${countTag} · ${group.codes.join(', ')}` : countTag;
    const descriptor = matchDescriptor(group.label);
    const cleanedUniqueNotes = Array.from(
      new Set(
        group.findings
          .map((f) => sanitizeTechnicalNote(f.technicalNotes))
          .filter((n) => n && !isRedundantNote(n, group.label)),
      ),
    );
    const singleNote = cleanedUniqueNotes.length === 1 ? cleanedUniqueNotes[0] : undefined;
    const observation =
      singleNote && singleNote.length <= 150
        ? singleNote
        : descriptor
          ? isVi
            ? descriptor.viObservation
            : descriptor.enObservation
          : isVi
            ? `Ghi nhận tại ${group.count} vị trí xác nhận trên hiện trường`
            : `Confirmed across ${group.count} field capture location(s)`;

    return `${group.label} (${codeTag}) [${group.topSeverity}]: ${observation}`;
  });

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
          ? `${group.label}${codeTag}: Kiểm tra chi tiết ngoài hiện trường và lập phương án khắc phục phù hợp.`
          : `${group.label}${codeTag}: Inspect defect extent on-site and execute targeted remediation.`,
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
      source: 'local',
      summaryData,
      generatedAt: new Date().toISOString(),
    });
  }

  return {
    summaryData,
    wasCached: false,
  };
}

function getRiskChipSx(risk: ReportAiSummary['overallRisk']) {
  const key =
    risk === 'CRITICAL' || risk === 'HIGH'
      ? 'error'
      : risk === 'MEDIUM'
        ? 'warning'
        : 'success';
  return (theme: Theme) => {
    const color =
      theme.palette.mode === 'dark' ? theme.palette[key].light : theme.palette[key].dark;
    return {
      height: 24,
      fontWeight: 600,
      fontSize: '0.75rem',
      border: 'none',
      bgcolor: alpha(theme.palette[key].main, theme.palette.mode === 'dark' ? 0.16 : 0.1),
      color,
      '& .MuiChip-icon': { color, ml: 0.75 },
    };
  };
}

function getSeverityTextColor(severity: string): string {
  const upper = severity.toUpperCase();
  if (upper === 'CRITICAL' || upper === 'HIGH') return 'error.dark';
  if (upper === 'MEDIUM') return 'warning.dark';
  return 'success.dark';
}

interface ParsedHighlight {
  title: string;
  meta: string | null;
  severity: string | null;
  body: string;
}

function parseHighlight(raw: string): ParsedHighlight {
  const trimmed = raw.trim();
  const match = trimmed.match(
    /^([^([]+?)(?:\s*\(([^)]+)\))?(?:\s*\[(CRITICAL|HIGH|MEDIUM|LOW|RESOLVED|UNRESOLVED|INCONCLUSIVE)\])?\s*[:—-]\s*(.+)$/i,
  );
  const rawTitle = match?.[1]?.trim() ?? '';
  const rawBody = match?.[4]?.trim() ?? '';
  if (!rawTitle || !rawBody) {
    return { title: '', meta: null, severity: null, body: trimmed };
  }
  return {
    title: rawTitle,
    meta: match?.[2]?.trim() || null,
    severity: match?.[3]?.toUpperCase() || null,
    body: rawBody,
  };
}

function splitActionLine(line: string): { lead: string | null; body: string } {
  const clean = line.replace(/^(?:[-*•]+|\d+[.)])\s+/, '').trim();
  const colonIdx = clean.indexOf(':');
  if (colonIdx > 0 && colonIdx <= 64) {
    return {
      lead: clean.slice(0, colonIdx).trim(),
      body: clean.slice(colonIdx + 1).trim(),
    };
  }
  return { lead: null, body: clean };
}

export function readStoredRemoteAiSummary(
  inspectionId: string,
  findings: Finding[] = [],
  locale: Locale | string = 'en',
): ReportAiSummary | null {
  if (!inspectionId) return null;
  const confirmed = findings.filter((f) => f.status === 'CONFIRMED' && !f.isDeleted);
  const signature = computeConfirmedSignature(confirmed);
  const stored = readStoredSummary(storageKey(inspectionId, locale));
  if (stored && stored.source === 'remote' && stored.signature === signature) {
    return stored.summaryData;
  }
  return null;
}

/** Mounted only on user expand, so a missing QueryClient in incidental tests is never touched. */
function MatchedKnowledgeBody({ inspectionId }: { inspectionId: string }) {
  const query = useInspectionKnowledgeRecommendations(inspectionId, true);
  return <KnowledgeRecommendationPanel data={query.data} isLoading={query.isLoading} />;
}

export function ReportAiSummaryCard({
  inspectionId,
  versionId,
  versionStatus,
  summary: persistedSummary,
  findings = [],
  evidenceList = [],
  assetName,
  evidenceCount,
  defaultExpanded = false,
  canRegenerate,
}: ReportAiSummaryCardProps) {
  const { t, locale } = useLocale();
  const roles = useAuthStore((state) => state.roles);
  const isVi = locale.toLowerCase().startsWith('vi');
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [knowledgeOpen, setKnowledgeOpen] = useState(false);
  const [regenerateNonce, setRegenerateNonce] = useState(0);
  const [regenerateError, setRegenerateError] = useState(false);
  const [remoteState, setRemoteState] = useState<{
    targetKey: string;
    nonce: number;
    data: ReportAiSummary | null;
  } | null>(null);

  const isPreviewVersion = !versionId || versionId.startsWith('preview-');
  const normalizedStatus = (versionStatus ?? '').toUpperCase();
  const isPublished = normalizedStatus === 'PUBLISHED';
  const isInspectorRole = roles.includes('INSPECTOR');
  const effectiveCanRegenerate =
    (canRegenerate ?? isInspectorRole) &&
    !isPublished &&
    normalizedStatus !== 'SUBMITTED' &&
    normalizedStatus !== 'APPROVED';
  const canFetchRemoteAi =
    Boolean(inspectionId) && typeof inspectionApi?.getAiSummary === 'function';
  const canQueryKnowledge =
    Boolean(inspectionId) &&
    !isPreviewVersion &&
    typeof inspectionApi?.getInspectionKnowledgeRecommendations === 'function';

  const confirmedFindings = useMemo(
    () => findings.filter((f) => f.status === 'CONFIRMED' && !f.isDeleted),
    [findings],
  );
  const findingsSignature = useMemo(
    () => computeConfirmedSignature(confirmedFindings),
    [confirmedFindings],
  );

  const cleanPersistedSummary = useMemo(() => {
    const trimmed = persistedSummary?.trim() || '';
    return trimmed && !isLegacyTemplateSummary(trimmed) ? trimmed : '';
  }, [persistedSummary]);

  const localResult = useMemo(() => {
    if (!cleanPersistedSummary) {
      return null;
    }
    return getOrGeneratePersistedAiSummary({
      inspectionId,
      assetName,
      findings,
      evidenceList,
      evidenceCount,
      persistedSummary: cleanPersistedSummary,
      locale,
      persist: false,
    });
  }, [
    cleanPersistedSummary,
    inspectionId,
    assetName,
    findings,
    evidenceList,
    evidenceCount,
    locale,
  ]);

  const remoteTargetKey = `${inspectionId}:${versionId}:${locale}:${findingsSignature}`;
  const storedRemote = useMemo(
    () => readStoredRemoteAiSummary(inspectionId, findings, locale),
    [inspectionId, findings, locale],
  );

  const shouldAutoGenerate = effectiveCanRegenerate;
  const shouldReadPersistedRemote = !isPreviewVersion && Boolean(cleanPersistedSummary);
  const shouldFetchRemote =
    canFetchRemoteAi &&
    ((regenerateNonce > 0 && effectiveCanRegenerate) ||
      (shouldAutoGenerate && !storedRemote && remoteState?.targetKey !== remoteTargetKey) ||
      (expanded && shouldReadPersistedRemote && !storedRemote && remoteState?.targetKey !== remoteTargetKey));

  useEffect(() => {
    if (!shouldFetchRemote || typeof inspectionApi?.getAiSummary !== 'function') {
      return;
    }
    let cancelled = false;
    const isRegen = regenerateNonce > 0;
    inspectionApi
      .getAiSummary(
        inspectionId,
        versionId,
        isRegen ? { regenerate: true } : undefined,
      )
      .then((res) => {
        if (cancelled) return;
        setRegenerateError(false);
        setRemoteState({
          targetKey: remoteTargetKey,
          nonce: regenerateNonce,
          data: res ?? null,
        });
        if (res && inspectionId) {
          writeStoredSummary(storageKey(inspectionId, locale), {
            signature: findingsSignature,
            source: 'remote',
            summaryData: res,
            generatedAt: new Date().toISOString(),
          });
        }
      })
      .catch(() => {
        if (cancelled) return;
        if (isRegen) {
          setRegenerateError(true);
        }
        setRemoteState((prev) => ({
          targetKey: remoteTargetKey,
          nonce: regenerateNonce,
          data: prev?.targetKey === remoteTargetKey ? prev.data : null,
        }));
      });
    return () => {
      cancelled = true;
    };
  }, [
    shouldFetchRemote,
    inspectionId,
    versionId,
    locale,
    findingsSignature,
    remoteTargetKey,
    regenerateNonce,
  ]);

  const isFetching =
    shouldFetchRemote &&
    (remoteState?.targetKey !== remoteTargetKey ||
      remoteState?.nonce !== regenerateNonce);
  const isRegenerating = isFetching && regenerateNonce > 0;

  const activeRemote =
    remoteState?.targetKey === remoteTargetKey && remoteState.data
      ? remoteState.data
      : storedRemote;

  const aiSummary: ReportAiSummary | null = useMemo(() => {
    if (activeRemote) {
      return {
        ...activeRemote,
        keyHighlights:
          activeRemote.keyHighlights && activeRemote.keyHighlights.length > 0
            ? activeRemote.keyHighlights
            : localResult?.summaryData.keyHighlights ?? [],
        recommendedActions:
          activeRemote.recommendedActions?.trim() ||
          localResult?.summaryData.recommendedActions ||
          '',
        overallRisk:
          activeRemote.overallRisk || localResult?.summaryData.overallRisk || 'LOW',
      };
    }
    return localResult?.summaryData ?? null;
  }, [activeRemote, localResult]);

  const knowledgeRefs = aiSummary?.knowledgeReferences ?? [];

  const categoryBadges = useMemo(() => {
    const counts = new Map<string, number>();
    for (const f of confirmedFindings) {
      const label = displayDefectLabel(f.defectLabel, isVi);
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return Array.from(counts.entries());
  }, [confirmedFindings, isVi]);

  const highlightItems = useMemo(
    () =>
      (aiSummary?.keyHighlights ?? [])
        .map((item) => item.trim())
        .filter(Boolean)
        .map(parseHighlight),
    [aiSummary],
  );

  const actionItems = useMemo(
    () =>
      (aiSummary?.recommendedActions ?? '')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map(splitActionLine),
    [aiSummary],
  );

  const handleRegenerate = () => {
    if (!effectiveCanRegenerate) return;
    setRegenerateError(false);
    if (!expanded) {
      setExpanded(true);
    }
    setRegenerateNonce((prev) => prev + 1);
  };

  if (isFetching && !isRegenerating && !aiSummary?.summary) {
    return (
      <Card
        variant="outlined"
        sx={{
          borderRadius: '10px',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          boxShadow: 'none',
          p: 2,
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <CircularProgress size={18} color="primary" />
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
            {effectiveCanRegenerate
              ? t('Generating AI executive summary…')
              : t('Loading AI executive summary…')}
          </Typography>
        </Stack>
      </Card>
    );
  }

  if (!aiSummary || !aiSummary.summary?.trim()) {
    return (
      <Card
        variant="outlined"
        data-testid="ai-executive-summary-card"
        sx={{
          borderRadius: '10px',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          boxShadow: 'none',
          p: 2,
        }}
      >
        <Stack spacing={0.75}>
          <Typography component="h2" variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
            {t('AI Executive Summary')}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('No AI executive summary generated yet.')}
          </Typography>
        </Stack>
      </Card>
    );
  }

  const riskIcon =
    aiSummary.overallRisk === 'CRITICAL' || aiSummary.overallRisk === 'HIGH' ? (
      <ErrorOutlineRounded sx={{ fontSize: 15 }} />
    ) : aiSummary.overallRisk === 'MEDIUM' ? (
      <WarningAmberRounded sx={{ fontSize: 15 }} />
    ) : (
      <CheckCircleOutlineRounded sx={{ fontSize: 15 }} />
    );

  return (
    <Card
      variant="outlined"
      data-testid="ai-executive-summary-card"
      sx={{
        borderRadius: '10px',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        boxShadow: 'none',
        overflow: 'hidden',
      }}
    >
      {isFetching && (
        <LinearProgress
          sx={{
            height: 2,
            bgcolor: 'transparent',
          }}
        />
      )}

      <CardContent sx={{ p: { xs: 1.75, sm: 2.25 }, '&:last-child': { pb: { xs: 1.75, sm: 2.25 } } }}>
        {/* Header: Title + single semantic Risk pill + clean Regenerate & Collapse actions */}
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.25,
          }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}>
            <Typography component="h2" variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
              {t('AI Executive Summary')}
            </Typography>
            <Chip
              size="small"
              icon={riskIcon}
              label={`${t('Overall Risk')}: ${t(aiSummary.overallRisk)}`}
              sx={getRiskChipSx(aiSummary.overallRisk)}
            />
          </Stack>

          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            {canFetchRemoteAi && effectiveCanRegenerate && (
              <Button
                size="small"
                variant="text"
                disabled={isFetching}
                startIcon={
                  isRegenerating ? (
                    <CircularProgress size={14} color="inherit" />
                  ) : (
                    <RefreshRounded sx={{ fontSize: 16 }} />
                  )
                }
                onClick={handleRegenerate}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  color: 'text.secondary',
                  minHeight: 30,
                  px: 1,
                  borderRadius: '8px',
                  '&:hover': {
                    color: 'text.primary',
                    bgcolor: 'action.hover',
                  },
                }}
              >
                {isRegenerating ? t('Regenerating…') : t('Regenerate')}
              </Button>
            )}

            <Button
              size="small"
              variant="text"
              aria-expanded={expanded}
              endIcon={expanded ? <ExpandLessRounded /> : <ExpandMoreRounded />}
              onClick={() => setExpanded((prev) => !prev)}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.8rem',
                minHeight: 30,
                px: 1,
                borderRadius: '8px',
              }}
            >
              {expanded ? t('Hide details') : t('Show details')}
            </Button>
          </Stack>
        </Box>

        {/* Detailed narrative, grouped highlights & prioritized actions */}
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Stack
            spacing={2}
            sx={{
              mt: 1.5,
              pt: 1.75,
              borderTop: '1px solid',
              borderColor: 'divider',
              opacity: isRegenerating ? 0.65 : 1,
              transition: 'opacity 150ms ease',
            }}
          >
            {regenerateError && (
              <Alert severity="warning" sx={{ py: 0.25, borderRadius: '8px' }}>
                {t('Could not refresh AI summary. Showing current version.')}
              </Alert>
            )}

            {/* Overview prose + subtle neutral defect counts */}
            <Box>
              <Typography
                variant="body2"
                sx={{
                  color: 'text.primary',
                  lineHeight: 1.65,
                  maxWidth: '78ch',
                }}
              >
                {aiSummary.summary}
              </Typography>

              {categoryBadges.length > 0 && (
                <Stack
                  direction="row"
                  spacing={0.75}
                  sx={{ mt: 1.25, alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}
                >
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    {t('Defect breakdown')}:
                  </Typography>
                  {categoryBadges.map(([label, count]) => (
                    <Box
                      key={label}
                      component="span"
                      sx={{
                        px: 1,
                        py: 0.25,
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        bgcolor: 'action.hover',
                        color: 'text.primary',
                      }}
                    >
                      {label} ×{count}
                    </Box>
                  ))}
                </Stack>
              )}
            </Box>

            <Divider />

            {/* Two-column flat digest: no nested boxes or sub-cards */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1.15fr 0.85fr' },
                gap: { xs: 2, md: 3 },
                alignItems: 'start',
              }}
            >
              {/* Key Highlights */}
              {highlightItems.length > 0 && (
                <Box>
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

                  <Stack divider={<Divider flexItem />} spacing={1.1}>
                    {highlightItems.map((item, index) => (
                      <Box key={index} sx={{ pt: index === 0 ? 0 : 0.1 }}>
                        {item.title ? (
                          <>
                            <Stack
                              direction="row"
                              spacing={0.75}
                              sx={{ alignItems: 'baseline', flexWrap: 'wrap', gap: 0.5, mb: 0.25 }}
                            >
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: 700, fontSize: '0.8125rem', color: 'text.primary' }}
                              >
                                {item.title}
                              </Typography>
                              {item.meta && (
                                <Typography
                                  component="span"
                                  variant="caption"
                                  sx={{ color: 'text.secondary', fontWeight: 500 }}
                                >
                                  ({item.meta})
                                </Typography>
                              )}
                              {item.severity && (
                                <Typography
                                  component="span"
                                  variant="caption"
                                  sx={{
                                    fontWeight: 700,
                                    letterSpacing: 0.25,
                                    color: getSeverityTextColor(item.severity),
                                  }}
                                >
                                  · {item.severity}
                                </Typography>
                              )}
                            </Stack>
                            <Typography
                              variant="body2"
                              sx={{ color: 'text.secondary', fontSize: '0.8125rem', lineHeight: 1.5 }}
                            >
                              {item.body}
                            </Typography>
                          </>
                        ) : (
                          <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                            <Box
                              sx={{
                                width: 5,
                                height: 5,
                                borderRadius: '50%',
                                bgcolor: 'text.secondary',
                                mt: '8px',
                                flexShrink: 0,
                              }}
                            />
                            <Typography
                              variant="body2"
                              sx={{ color: 'text.secondary', fontSize: '0.8125rem', lineHeight: 1.55 }}
                            >
                              {item.body}
                            </Typography>
                          </Stack>
                        )}
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}

              {/* Recommended Actions */}
              {actionItems.length > 0 && (
                <Box
                  sx={{
                    pl: { md: 3 },
                    borderLeft: { md: '1px solid' },
                    borderTop: { xs: '1px solid', md: 'none' },
                    pt: { xs: 2, md: 0 },
                    borderColor: { xs: 'divider', md: 'divider' },
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

                  <Stack spacing={1.1}>
                    {actionItems.map((action, index) => (
                      <Stack
                        key={index}
                        direction="row"
                        spacing={1}
                        sx={{ alignItems: 'flex-start' }}
                      >
                        <Typography
                          component="span"
                          variant="caption"
                          sx={{
                            minWidth: 20,
                            height: 20,
                            borderRadius: '50%',
                            bgcolor: 'action.hover',
                            color: 'text.secondary',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontVariantNumeric: 'tabular-nums',
                            mt: '1px',
                            flexShrink: 0,
                          }}
                        >
                          {index + 1}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ color: 'text.secondary', fontSize: '0.8125rem', lineHeight: 1.5 }}
                        >
                          {action.lead ? (
                            <>
                              <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
                                {action.lead}:
                              </Box>{' '}
                              {action.body}
                            </>
                          ) : (
                            action.body
                          )}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Box>
              )}
            </Box>

            {canQueryKnowledge && (
              <Box sx={{ pt: 0.75, borderTop: '1px solid', borderColor: 'divider' }}>
                <ButtonBase
                  data-testid="matched-knowledge-bar"
                  onClick={() => setKnowledgeOpen((value) => !value)}
                  aria-expanded={knowledgeOpen}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                    width: '100%',
                    minHeight: 44,
                    textAlign: 'left',
                  }}
                >
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 700,
                        fontSize: '0.75rem',
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
                        sx={{ height: 20, fontSize: '0.75rem', fontWeight: 600, '& .MuiChip-label': { px: 0.75 } }}
                      />
                    ))}
                    {knowledgeRefs.length > 0 && (
                      <Chip
                        size="small"
                        label={`${knowledgeRefs.length} ${knowledgeRefs.length === 1 ? t('similar case') : t('similar cases')}`}
                        sx={{ height: 20, fontSize: '0.75rem', fontWeight: 700, '& .MuiChip-label': { px: 0.75 } }}
                      />
                    )}
                  </Stack>
                  {knowledgeOpen ? (
                    <ExpandLessRounded sx={{ fontSize: 18, color: 'text.secondary' }} />
                  ) : (
                    <ExpandMoreRounded sx={{ fontSize: 18, color: 'text.secondary' }} />
                  )}
                </ButtonBase>
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
