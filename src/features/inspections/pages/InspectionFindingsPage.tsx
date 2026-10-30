import { useMemo, useState, type FormEvent } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  FormControlLabel,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TablePagination,
  TextField,
  Typography,
} from '@mui/material';
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import SearchRounded from '@mui/icons-material/SearchRounded';
import ImageOutlined from '@mui/icons-material/ImageOutlined';
import RestartAltRounded from '@mui/icons-material/RestartAltRounded';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getErrorMessage } from '@/shared/api/errorMessage';
import type {
  EvidenceItem,
  Finding,
  FindingSeverity,
  ManualFindingInput,
} from '../api/inspectionApi';
import { AiMotionFigure } from '../components/AiMotionFigure';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import {
  useAnalyzeEvidence,
  useCreateManualFinding,
  useUpdateFinding,
  useDeleteFinding,
  useConfirmFindings,
  useInspectionEvidence,
  useInspectionFindings,
  useInspectionWorkflowState,
  useUpdateEvidenceLocation,
  useReportVersions,
  useConfirmFinding,
  useRemovedFindings,
  useRestoreFinding,
  useInspection,
  useReinspectionVerifications,
  useUpdateReinspectionVerification,
} from '../hooks/useInspections';
import { EvidenceCaptureGroup } from '../components/EvidenceCaptureGroup';
import { ReinspectionVerificationSection } from '../components/ReinspectionVerificationSection';

const SEVERITIES: FindingSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export default function InspectionFindingsPage() {
  const { t } = useLocale();
  const { inspectionId = '' } = useParams();
  const navigate = useNavigate();
  const roles = useAuthStore((state) => state.roles);
  const isInspector = roles.includes('INSPECTOR');
  const isReviewer = roles.includes('ORG_MANAGER');

  const inspectionQuery = useInspection(inspectionId);
  const isReinspection = inspectionQuery.data?.inspectionType === 'RE_INSPECTION';
  const reinspectionVerifications = useReinspectionVerifications(
    isReinspection ? inspectionId : null,
  );
  const updateVerificationMutation = useUpdateReinspectionVerification(inspectionId);

  const evidence = useInspectionEvidence(inspectionId);
  const findings = useInspectionFindings(inspectionId);
  const removedFindings = useRemovedFindings(inspectionId);
  const {
    analyzeMany,
    analysingIds,
    completedIds,
    noDetectionIds,
    isPending: isAnalysisPending,
    isError: isAnalysisError,
    error: analysisError,
  } = useAnalyzeEvidence(inspectionId);
  const confirmFinding = useConfirmFinding(inspectionId);
  const restoreFinding = useRestoreFinding(inspectionId);
  const createManualFinding = useCreateManualFinding(inspectionId);
  const updateFinding = useUpdateFinding(inspectionId);
  const deleteFinding = useDeleteFinding(inspectionId);
  const workflow = useInspectionWorkflowState(inspectionId);
  const confirmFindings = useConfirmFindings(inspectionId);
  const reportVersions = useReportVersions(inspectionId);
  const updateEvidenceLocation = useUpdateEvidenceLocation(inspectionId);
  const reportVersionsList = reportVersions.data ?? [];
  const latestReportVersion = reportVersionsList[0] ?? null;

  const activeEvidenceItems = useMemo(
    () => (evidence.data ?? []).filter((item) => !item.isDeleted),
    [evidence.data],
  );
  const activeEvidenceIds = useMemo(
    () => new Set(activeEvidenceItems.map((item) => item.id)),
    [activeEvidenceItems],
  );
  const isReportLocked = Boolean(
    latestReportVersion &&
      ['SUBMITTED', 'APPROVED', 'PUBLISHED', 'SUPERSEDED'].includes(latestReportVersion.status),
  );
  const isFindingsLocked =
    isReportLocked ||
    ['UNDER_REVIEW', 'REPORT_PUBLISHED', 'REPAIR_PENDING', 'COMPLETED'].includes(workflow.data?.status ?? '');

  // Filter & Search states
  const [evidenceQuery, setEvidenceQuery] = useState('');
  const [defectQuery, setDefectQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'PENDING' | 'CONFIRMED' | 'REMOVED' | 'ALL'>('ACTIVE');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'AI' | 'MANUAL'>('ALL');
  const [onlyWithDefects, setOnlyWithDefects] = useState(false);

  // Pagination states (capture-level)
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(5);

  const [severities, setSeverities] = useState<Record<string, FindingSeverity>>({});
  const [locationDrafts, setLocationDrafts] = useState<Record<string, string>>({});
  const [locationErrors, setLocationErrors] = useState<Record<string, string>>({});
  const [editingCandidateId, setEditingCandidateId] = useState<string | null>(null);
  const [revisedDefectLabels, setRevisedDefectLabels] = useState<Record<string, string>>({});
  const [revisedTechnicalNotes, setRevisedTechnicalNotes] = useState<Record<string, string>>({});
  const [revisedRecommendedActions, setRevisedRecommendedActions] = useState<Record<string, string>>({});
  const [manualFindingEvidenceId, setManualFindingEvidenceId] = useState<string | null>(null);
  const [findingToDeleteId, setFindingToDeleteId] = useState<string | null>(null);
  const [noFindingsAcknowledged, setNoFindingsAcknowledged] = useState(false);

  // Combine active findings + soft-deleted findings when filter warrants it
  const allFindingsRaw = useMemo(() => {
    const active = findings.data ?? [];
    const removed = (removedFindings.data ?? []).filter((f) => f.isDeleted);
    const set = new Map<string, Finding>();
    for (const f of active) set.set(f.id, f);
    for (const f of removed) set.set(f.id, f);
    return Array.from(set.values());
  }, [findings.data, removedFindings.data]);

  const activeFindings = useMemo(
    () =>
      allFindingsRaw.filter(
        (finding) =>
          !finding.isDeleted && finding.evidenceId && activeEvidenceIds.has(finding.evidenceId),
      ),
    [activeEvidenceIds, allFindingsRaw],
  );

  const pendingFindings = activeFindings.filter((finding) => finding.status === 'PENDING').length;
  const reviewedItemCount = activeFindings.length;
  const noFindings = activeFindings.length === 0;
  const hasActiveEvidence = activeEvidenceItems.length > 0;
  const isReturnedRevision = latestReportVersion?.status === 'RETURNED';
  const analysisUnlocked =
    ['FIELD_COMPLETED', 'REPORT_DRAFT'].includes(workflow.data?.status ?? '') && !isFindingsLocked;

  const canConfirm =
    isInspector &&
    hasActiveEvidence &&
    ['FIELD_COMPLETED', 'REPORT_DRAFT'].includes(workflow.data?.status ?? '') &&
    !findings.isLoading &&
    !workflow.isLoading &&
    !findings.isError &&
    pendingFindings === 0 &&
    (!noFindings || noFindingsAcknowledged) &&
    !isAnalysisPending &&
    !confirmFinding.isPending &&
    !createManualFinding.isPending &&
    !confirmFindings.isPending &&
    !isFindingsLocked;

  const analysedEvidenceIds = useMemo(
    () => new Set([...activeFindings.map((finding) => finding.evidenceId), ...completedIds]),
    [activeFindings, completedIds],
  );
  const noDetectionEvidenceIds = useMemo(() => new Set(noDetectionIds), [noDetectionIds]);
  const analysableImageIds = useMemo(
    () =>
      activeEvidenceItems
        .filter((item) => item.contentType.startsWith('image/'))
        .map((item) => item.id),
    [activeEvidenceItems],
  );
  const analysingEvidenceIds = useMemo(() => new Set(analysingIds), [analysingIds]);

  const severityFor = (finding: Finding): FindingSeverity =>
    severities[finding.id] ?? finding.severity;

  // Multi-tier Hierarchical Filter
  const filteredCaptureGroups = useMemo(() => {
    const cleanDefect = defectQuery.trim().toLowerCase();
    const cleanEvidence = evidenceQuery.trim().toLowerCase();

    // 1. Filter findings according to finding-level criteria
    const matchingFindingsByEvidence = new Map<string, Finding[]>();
    for (const item of activeEvidenceItems) {
      matchingFindingsByEvidence.set(item.id, []);
    }

    for (const f of allFindingsRaw) {
      if (!f.evidenceId || !activeEvidenceIds.has(f.evidenceId)) continue;

      // Status Filter
      if (statusFilter === 'ACTIVE' && f.isDeleted) continue;
      if (statusFilter === 'PENDING' && (f.isDeleted || f.status !== 'PENDING')) continue;
      if (statusFilter === 'CONFIRMED' && (f.isDeleted || f.status !== 'CONFIRMED')) continue;
      if (statusFilter === 'REMOVED' && !f.isDeleted) continue;

      // Severity Filter
      if (severityFilter !== 'ALL' && f.severity !== severityFilter) continue;

      // Source Filter
      if (sourceFilter === 'AI' && f.modelName == null) continue;
      if (sourceFilter === 'MANUAL' && f.modelName != null) continue;

      // Defect Text Search
      if (cleanDefect) {
        const match =
          f.defectLabel.toLowerCase().includes(cleanDefect) ||
          f.findingCode.toLowerCase().includes(cleanDefect) ||
          (f.technicalNotes && f.technicalNotes.toLowerCase().includes(cleanDefect)) ||
          (f.recommendedAction && f.recommendedAction.toLowerCase().includes(cleanDefect)) ||
          (f.modelName && f.modelName.toLowerCase().includes(cleanDefect));
        if (!match) continue;
      }

      const list = matchingFindingsByEvidence.get(f.evidenceId);
      if (list) list.push(f);
    }

    // 2. Filter evidence items according to evidence criteria and defect existence
    const result: Array<{ evidenceId: string; evidence: EvidenceItem; findings: Finding[] }> = [];

    for (const item of activeEvidenceItems) {
      const groupFindings = matchingFindingsByEvidence.get(item.id) ?? [];

      // Evidence Query match
      if (cleanEvidence) {
        const matchesFile = item.fileName.toLowerCase().includes(cleanEvidence);
        const matchesLocation =
          item.locationDescription && item.locationDescription.toLowerCase().includes(cleanEvidence);
        if (!matchesFile && !matchesLocation) continue;
      }

      // If user typed defect query or filtered strictly for defects, only show captures containing matching defects
      if (cleanDefect && groupFindings.length === 0) continue;
      if (statusFilter === 'REMOVED' && groupFindings.length === 0) continue;
      if (onlyWithDefects && groupFindings.length === 0) continue;

      result.push({
        evidenceId: item.id,
        evidence: item,
        findings: groupFindings,
      });
    }

    return result;
  }, [
    activeEvidenceItems,
    allFindingsRaw,
    activeEvidenceIds,
    defectQuery,
    evidenceQuery,
    statusFilter,
    severityFilter,
    sourceFilter,
    onlyWithDefects,
  ]);

  const totalMatchingCaptures = filteredCaptureGroups.length;
  const totalMatchingFindings = useMemo(
    () => filteredCaptureGroups.reduce((acc, g) => acc + g.findings.length, 0),
    [filteredCaptureGroups],
  );

  const paginatedCaptureGroups = useMemo(() => {
    const from = page * pageSize;
    return filteredCaptureGroups.slice(from, from + pageSize);
  }, [filteredCaptureGroups, page, pageSize]);

  const hasActiveFilters =
    Boolean(evidenceQuery) ||
    Boolean(defectQuery) ||
    statusFilter !== 'ACTIVE' ||
    severityFilter !== 'ALL' ||
    sourceFilter !== 'ALL' ||
    onlyWithDefects;

  const resetFilters = () => {
    setEvidenceQuery('');
    setDefectQuery('');
    setStatusFilter('ACTIVE');
    setSeverityFilter('ALL');
    setSourceFilter('ALL');
    setOnlyWithDefects(false);
    setPage(0);
  };

  const startEditingCandidate = (finding: Finding) => {
    setEditingCandidateId(finding.id);
    setRevisedDefectLabels((prev) => ({ ...prev, [finding.id]: finding.defectLabel }));
    setSeverities((prev) => ({ ...prev, [finding.id]: finding.severity }));
    setRevisedTechnicalNotes((prev) => ({
      ...prev,
      [finding.id]: finding.technicalNotes ?? '',
    }));
    setRevisedRecommendedActions((prev) => ({
      ...prev,
      [finding.id]: finding.recommendedAction ?? '',
    }));
  };

  const saveCandidateCorrection = (finding: Finding) => {
    const defectLabel = (revisedDefectLabels[finding.id] ?? finding.defectLabel).trim();
    const technicalNotes = (revisedTechnicalNotes[finding.id] ?? finding.technicalNotes ?? '').trim();
    const recommendedAction = (
      revisedRecommendedActions[finding.id] ?? finding.recommendedAction ?? ''
    ).trim();

    updateFinding.mutate(
      {
        findingId: finding.id,
        input: {
          evidenceId: finding.evidenceId ?? '',
          defectLabel,
          severity: severityFor(finding),
          technicalNotes: technicalNotes || 'Corrected by assigned Inspector',
          recommendedAction: recommendedAction || undefined,
        },
      },
      { onSuccess: () => setEditingCandidateId(null) },
    );
  };

  const submitManualFinding = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const evidenceId = String(formData.get('evidenceId') ?? '');
    if (!evidenceId) return;
    createManualFinding.mutate({
      evidenceId,
      defectLabel: String(formData.get('defectLabel') ?? '').trim(),
      severity: String(formData.get('severity') ?? 'MEDIUM') as FindingSeverity,
      technicalNotes: String(formData.get('technicalNotes') ?? '').trim(),
      recommendedAction: String(formData.get('recommendedAction') ?? '').trim(),
    });
    event.currentTarget.reset();
  };

  if (!isInspector && !isReviewer) {
    return (
      <Alert severity="info" sx={{ borderRadius: '12px' }}>
        You are viewing this inspection as a reader. Detection review and finding decisions belong
        to the assigned Inspector and a qualified reviewer.
      </Alert>
    );
  }

  if (isReviewer && !isInspector) {
    return (
      <OrganizationFindingsOverview
        findings={(findings.data ?? []).filter((finding) => !finding.isDeleted)}
        inspectionId={inspectionId}
      />
    );
  }

  const defectDiscoveryWorkspace = (
    <Stack spacing={2.5}>
      {/* 1. Page Header with Clean Single-Row Actions */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 2.5 },
          borderRadius: '16px',
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: '12px',
                bgcolor: 'action.selected',
                color: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <AutoAwesomeOutlined sx={{ fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>
                {t('Defect Analysis & Findings')}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
                {t('Run AI detection per image or across all captures. Review, adjust, and confirm defects.')}
              </Typography>
            </Box>
          </Stack>

          {isInspector && analysisUnlocked && (
            <Button
              variant="contained"
              startIcon={isAnalysisPending ? <AiMotionFigure name="advisoryLens" size={18} /> : <AutoAwesomeOutlined />}
              disabled={isAnalysisPending || analysableImageIds.length === 0}
              onClick={() => void analyzeMany(analysableImageIds)}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: '10px',
                boxShadow: 'none',
                px: 2.25,
                py: 1,
                whiteSpace: 'nowrap',
                flexShrink: 0,
                alignSelf: { xs: 'stretch', sm: 'auto' },
                '&:hover': { boxShadow: '0 4px 12px rgba(13, 148, 136, 0.2)' },
              }}
            >
              {isAnalysisPending
                ? t('Analyzing…')
                : `${t('Analyze all images')} (${analysableImageIds.length})`}
            </Button>
          )}
        </Stack>

        {isInspector && isFindingsLocked && (
          <Alert severity="info" sx={{ mt: 2, borderRadius: '12px' }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {latestReportVersion?.status === 'SUBMITTED'
                ? t(
                    'Findings are locked while the report is submitted for review. Withdraw the submission in Step 4 if you need to make changes.',
                  )
                : t(
                    'This inspection report has been approved or published. Findings are read-only.',
                  )}
            </Typography>
          </Alert>
        )}

        {isInspector && isReturnedRevision && (
          <Alert severity="info" sx={{ mt: 2, borderRadius: '12px' }}>
            {t('This report was returned for revision. Evidence and findings are editable; update the requested content, then verify and resubmit the report.')}
          </Alert>
        )}
        {isInspector && workflow.data?.status === 'REPORT_DRAFT' && latestReportVersion && !isReturnedRevision && (
          <Alert severity="info" sx={{ mt: 2, borderRadius: '12px' }}>
            {t('Findings remain editable while authoring the report. Confirm the current set again after changes before submitting a fresh report version.')}
          </Alert>
        )}

        {isInspector && isAnalysisPending && (
          <Alert severity="info" sx={{ mt: 2, borderRadius: '10px' }}>
            {t('Advisory detection is running. Each image card shows real-time analysis status.')}
          </Alert>
        )}
        {isInspector && isAnalysisError && (
          <Alert severity="warning" sx={{ mt: 2, borderRadius: '10px' }}>
            {getErrorMessage(
              analysisError,
              'AI analysis is unavailable; existing evidence remains available.',
            )}
          </Alert>
        )}
        {isInspector && analysableImageIds.length === 0 && (
          <Alert severity="info" sx={{ mt: 2, borderRadius: '10px' }}>
            {t('Upload current image captures before running advisory detection.')}
          </Alert>
        )}
      </Paper>

      {/* 2. Advanced Search & Filter Toolbar */}
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2, sm: 2.25 },
          borderRadius: '16px',
          bgcolor: 'background.paper',
          borderColor: 'divider',
        }}
      >
        <Stack spacing={2}>
          {/* Row 1: Dual Search Bars */}
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
            <TextField
              size="small"
              fullWidth
              placeholder={t('Search photos or asset location (e.g. shot-01, Pier T1)...')}
              value={evidenceQuery}
              onChange={(e) => {
                setEvidenceQuery(e.target.value);
                setPage(0);
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <ImageOutlined sx={{ fontSize: 20, color: '#64748b' }} />
                    </InputAdornment>
                  ),
                  sx: { borderRadius: '10px', bgcolor: '#fbfcfd' },
                },
              }}
            />
            <TextField
              size="small"
              fullWidth
              placeholder={t('Search defects, codes, or notes (e.g. F-1, crack, spall)...')}
              value={defectQuery}
              onChange={(e) => {
                setDefectQuery(e.target.value);
                setPage(0);
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRounded sx={{ fontSize: 20, color: '#64748b' }} />
                    </InputAdornment>
                  ),
                  sx: { borderRadius: '10px', bgcolor: '#fbfcfd' },
                },
              }}
            />
          </Stack>

          {/* Row 2: Filter Selectors & Toggles */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.25}
            sx={{ alignItems: { sm: 'center' }, flexWrap: 'wrap', gap: 1 }}
          >
            <TextField
              select
              size="small"
              label={t('Finding status')}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as typeof statusFilter);
                setPage(0);
              }}
              sx={{ minWidth: 165 }}
              slotProps={{ input: { sx: { borderRadius: '8px' } } }}
            >
              <MenuItem value="ACTIVE">{t('Active only (default)')}</MenuItem>
              <MenuItem value="PENDING">{t('Awaiting review')}</MenuItem>
              <MenuItem value="CONFIRMED">{t('Confirmed only')}</MenuItem>
              <MenuItem value="REMOVED">{t('Removed')}</MenuItem>
              <MenuItem value="ALL">{t('All findings')}</MenuItem>
            </TextField>

            <TextField
              select
              size="small"
              label={t('Severity')}
              value={severityFilter}
              onChange={(e) => {
                setSeverityFilter(e.target.value);
                setPage(0);
              }}
              sx={{ minWidth: 140 }}
              slotProps={{ input: { sx: { borderRadius: '8px' } } }}
            >
              <MenuItem value="ALL">{t('All Severities')}</MenuItem>
              {SEVERITIES.map((sev) => (
                <MenuItem key={sev} value={sev}>{sev}</MenuItem>
              ))}
            </TextField>

            <TextField
              select
              size="small"
              label={t('Detection source')}
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value as typeof sourceFilter);
                setPage(0);
              }}
              sx={{ minWidth: 150 }}
              slotProps={{ input: { sx: { borderRadius: '8px' } } }}
            >
              <MenuItem value="ALL">{t('All Sources')}</MenuItem>
              <MenuItem value="AI">{t('AI Detection')}</MenuItem>
              <MenuItem value="MANUAL">{t('Manual Entry')}</MenuItem>
            </TextField>

            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={onlyWithDefects}
                  onChange={(e) => {
                    setOnlyWithDefects(e.target.checked);
                    setPage(0);
                  }}
                />
              }
              label={
                <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: '#475569' }}>
                  {t('Only photos with defects')}
                </Typography>
              }
            />

            {hasActiveFilters && (
              <Button
                size="small"
                startIcon={<RestartAltRounded />}
                onClick={resetFilters}
                sx={{ textTransform: 'none', color: '#64748b', ml: 'auto' }}
              >
                {t('Reset filters')}
              </Button>
            )}
          </Stack>
        </Stack>
      </Paper>

      {/* 3. Result Metric Bar */}
      <Stack
        direction="row"
        sx={{ alignItems: 'center', justifyContent: 'space-between', px: 0.5 }}
      >
        <Typography variant="body2" sx={{ fontWeight: 600, color: '#475569' }}>
          {t('Showing')} {totalMatchingCaptures} {t('capture(s)')} · {totalMatchingFindings}{' '}
          {t('defect finding(s)')}
        </Typography>
        {statusFilter === 'REMOVED' && (
          <Chip
            size="small"
            color="error"
            variant="outlined"
            label={t('Viewing Removed Findings')}
            sx={{ fontWeight: 600 }}
          />
        )}
      </Stack>

      {/* 4. Hierarchical Capture List */}
      {findings.isLoading ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: '16px' }}>
          <Typography color="text.secondary">{t('Loading findings…')}</Typography>
        </Paper>
      ) : findings.isError ? (
        <Alert
          severity="error"
          sx={{ borderRadius: '12px' }}
          action={
            <Button color="inherit" onClick={() => void findings.refetch()}>
              {t('Retry')}
            </Button>
          }
        >
          {t('Could not load findings.')}
        </Alert>
      ) : paginatedCaptureGroups.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{
            p: 5,
            textAlign: 'center',
            borderRadius: '16px',
            bgcolor: 'background.paper',
            borderColor: 'divider',
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
            {hasActiveFilters
              ? t('No photos or defects match your current search and filters.')
              : t('No evidence captures available for defect analysis.')}
          </Typography>
          {hasActiveFilters && (
            <Button
              variant="outlined"
              size="small"
              onClick={resetFilters}
              sx={{ mt: 1.5, borderRadius: '8px', textTransform: 'none' }}
            >
              {t('Clear all filters')}
            </Button>
          )}
        </Paper>
      ) : (
        <Stack spacing={3}>
          {paginatedCaptureGroups.map((group) => {
            const isAnalysing = analysingEvidenceIds.has(group.evidenceId);
            const isAnalysed = analysedEvidenceIds.has(group.evidenceId);
            const isNoDetection = noDetectionEvidenceIds.has(group.evidenceId);

            return (
              <EvidenceCaptureGroup
                key={group.evidenceId}
                inspectionId={inspectionId}
                evidenceId={group.evidenceId}
                evidence={group.evidence}
                findings={group.findings}
                isInspector={isInspector}
                analysisUnlocked={analysisUnlocked}
                isAnalysing={isAnalysing}
                isAnalysed={isAnalysed}
                isNoDetection={isNoDetection}
                onAnalyze={(id, replace) => void analyzeMany([id], { replace })}
                locationDraft={locationDrafts[group.evidenceId] ?? group.evidence?.locationDescription ?? ''}
                onLocationChange={(val) =>
                  setLocationDrafts((prev) => ({ ...prev, [group.evidenceId]: val }))
                }
                onLocationBlur={() => {
                  if (group.evidence) {
                    const value =
                      locationDrafts[group.evidenceId] ?? group.evidence.locationDescription ?? '';
                    if (value !== (group.evidence.locationDescription ?? '')) {
                      updateEvidenceLocation.mutate(
                        { evidenceId: group.evidenceId, locationDescription: value },
                        {
                          onError: (err) =>
                            setLocationErrors((prev) => ({
                              ...prev,
                              [group.evidenceId]: getErrorMessage(
                                err,
                                'Evidence location was not saved.',
                              ),
                            })),
                        },
                      );
                    }
                  }
                }}
                locationError={locationErrors[group.evidenceId]}
                severityFor={severityFor}
                onSeverityChange={(fid, sev) =>
                  setSeverities((prev) => ({ ...prev, [fid]: sev }))
                }
                editingCandidateId={editingCandidateId}
                onStartEdit={startEditingCandidate}
                onCancelEdit={() => setEditingCandidateId(null)}
                onSaveCorrection={saveCandidateCorrection}
                revisedDefectLabels={revisedDefectLabels}
                onDefectLabelChange={(fid, val) =>
                  setRevisedDefectLabels((prev) => ({ ...prev, [fid]: val }))
                }
                revisedTechnicalNotes={revisedTechnicalNotes}
                onTechnicalNotesChange={(fid, val) =>
                  setRevisedTechnicalNotes((prev) => ({ ...prev, [fid]: val }))
                }
                revisedRecommendedActions={revisedRecommendedActions}
                onRecommendedActionsChange={(fid, val) =>
                  setRevisedRecommendedActions((prev) => ({ ...prev, [fid]: val }))
                }
                onConfirmFinding={(finding) =>
                  confirmFinding.mutate({
                    findingId: finding.id,
                    input: {
                      severity: severityFor(finding),
                      technicalNotes: finding.technicalNotes ?? 'Confirmed by assigned Inspector',
                    },
                  })
                }
                onDeleteFinding={(fid) => setFindingToDeleteId(fid)}
                onRestoreFinding={(fid) => restoreFinding.mutate(fid)}
                isRestorePending={restoreFinding.isPending}
                isConfirmPending={confirmFinding.isPending}
                isDeletePending={deleteFinding.isPending}
                isUpdatePending={updateFinding.isPending}
                updateError={updateFinding.error}
                isReportLocked={isFindingsLocked}
                manualFindingOpen={manualFindingEvidenceId === group.evidenceId}
                onOpenManualFinding={() => setManualFindingEvidenceId(group.evidenceId)}
                onCloseManualFinding={() => setManualFindingEvidenceId(null)}
                onSubmitManualFinding={(e) => {
                  submitManualFinding(e);
                  setManualFindingEvidenceId(null);
                }}
                isCreateManualPending={createManualFinding.isPending}
                createManualError={createManualFinding.error}
              />
            );
          })}

          {confirmFinding.isError && (
            <Alert severity="error" sx={{ borderRadius: '12px' }}>
              {getErrorMessage(confirmFinding.error, 'The finding was not confirmed.')}
            </Alert>
          )}

          {/* 5. Capture-Level Pagination Controls */}
          {totalMatchingCaptures > 0 && (
            <Paper
              variant="outlined"
              sx={{
                p: 0.5,
                borderRadius: '12px',
                bgcolor: 'background.paper',
                borderColor: 'divider',
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <TablePagination
                component="div"
                count={totalMatchingCaptures}
                page={page}
                onPageChange={(_e, newPage) => setPage(newPage)}
                rowsPerPage={pageSize}
                onRowsPerPageChange={(e) => {
                  setPageSize(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                rowsPerPageOptions={[5, 10, 25]}
                labelRowsPerPage={t('Photos per page:')}
              />
            </Paper>
          )}
        </Stack>
      )}

      {/* 6. Findings Confirmation Gate */}
      {isInspector && (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: '16px' }}>
          <Stack spacing={1.5}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {t('Findings Confirmation Gate')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {pendingFindings > 0
                ? `${pendingFindings} finding${pendingFindings === 1 ? '' : 's'} still need a decision.`
                : reviewedItemCount > 0
                  ? `${reviewedItemCount} finding${reviewedItemCount === 1 ? '' : 's'} ready for the report stage.`
                  : 'No findings found yet. Confirm the inspected scope was reviewed and no finding was observed.'}
            </Typography>
            {noFindings && (
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={noFindingsAcknowledged}
                  onChange={(event) => setNoFindingsAcknowledged(event.target.checked)}
                />
                <Typography variant="body2">
                  {t('No finding was observed within the scope covered by these images.')}
                </Typography>
              </label>
            )}
            <Button
              variant="contained"
              disabled={!canConfirm}
              onClick={() =>
                confirmFindings.mutate(noFindings, {
                  onSuccess: () => navigate('../report'),
                })
              }
              sx={{ alignSelf: 'flex-start', borderRadius: '10px', textTransform: 'none', px: 2.5 }}
            >
              {confirmFindings.isPending ? 'Confirming findings…' : 'Confirm findings and continue'}
            </Button>
            {confirmFindings.isError && (
              <Alert severity="error" sx={{ borderRadius: '10px' }}>
                {getErrorMessage(
                  confirmFindings.error,
                  'Findings were not confirmed. Resolve any pending candidates and try again.',
                )}
              </Alert>
            )}
          </Stack>
        </Paper>
      )}

      {/* 7. Manual Inspector Findings Register */}
      <InspectorFindingRegister
        findings={(findings.data ?? []).filter((finding) => finding.modelName == null && !finding.isDeleted)}
        evidence={evidence.data ?? []}
        isEditable={isInspector && !isFindingsLocked}
        isPending={updateFinding.isPending || deleteFinding.isPending}
        error={updateFinding.error ?? deleteFinding.error}
        onUpdate={(findingId, input) => updateFinding.mutate({ findingId, input })}
        onDelete={(findingId) => setFindingToDeleteId(findingId)}
      />
    </Stack>
  );

  return (
    <Stack spacing={2.5}>
      {/* Re-inspection Target Defect Verifications */}
      {isReinspection && (
        <ReinspectionVerificationSection
          inspectionId={inspectionId}
          sourceInspectionId={inspectionQuery.data?.sourceInspectionId}
          items={reinspectionVerifications.data ?? []}
          evidenceList={activeEvidenceItems}
          onUpdate={(verificationId, payload) =>
            updateVerificationMutation.mutateAsync({ verificationId, payload })
          }
          readOnly={!isInspector || isFindingsLocked}
        />
      )}

      {/* When Re-inspection: wrap general defect discovery in an optional collapsed Accordion */}
      {isReinspection ? (
        <Accordion
          variant="outlined"
          sx={{
            borderRadius: '16px !important',
            borderColor: 'divider',
            '&:before': { display: 'none' },
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            overflow: 'hidden',
          }}
        >
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <AutoAwesomeOutlined color="action" />
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 750 }}>
                  {t('Additional New Defect Scanning (Optional)')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('Only needed if fresh captures revealed unexpected defects outside the repair scope')}
                </Typography>
              </Box>
            </Stack>
          </AccordionSummary>
          <AccordionDetails sx={{ p: { xs: 1.5, sm: 2 }, pt: 0 }}>
            {defectDiscoveryWorkspace}
          </AccordionDetails>
        </Accordion>
      ) : (
        defectDiscoveryWorkspace
      )}

      <ConfirmDialog
        open={Boolean(findingToDeleteId)}
        title={t('Confirm Remove Finding')}
        message={t(
          'Are you sure you want to remove this defect finding? It will be excluded from the report set, but an audit record will be preserved.',
        )}
        severity="danger"
        confirmLabel={t('Remove finding')}
        cancelLabel={t('Cancel')}
        loading={deleteFinding.isPending}
        onCancel={() => setFindingToDeleteId(null)}
        onConfirm={() => {
          if (findingToDeleteId) {
            deleteFinding.mutate(findingToDeleteId, {
              onSettled: () => setFindingToDeleteId(null),
            });
          }
        }}
      />
    </Stack>
  );
}

function InspectorFindingRegister({
  findings,
  evidence,
  isEditable,
  isPending,
  error,
  onUpdate,
  onDelete,
}: {
  findings: Finding[];
  evidence: EvidenceItem[];
  isEditable: boolean;
  isPending: boolean;
  error: unknown;
  onUpdate: (findingId: string, input: ManualFindingInput) => void;
  onDelete: (findingId: string) => void;
}) {
  const { t } = useLocale();
  const [editingId, setEditingId] = useState<string | null>(null);

  if (!isEditable || findings.length === 0) return null;
  const activeEvidence = evidence.filter((item) => !item.isDeleted);

  const submitEdit = (event: FormEvent<HTMLFormElement>, finding: Finding) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onUpdate(finding.id, {
      evidenceId: String(data.get('evidenceId') ?? finding.evidenceId ?? ''),
      defectLabel: String(data.get('defectLabel') ?? '').trim(),
      severity: String(data.get('severity') ?? finding.severity) as FindingSeverity,
      technicalNotes: String(data.get('technicalNotes') ?? '').trim(),
      recommendedAction: String(data.get('recommendedAction') ?? '').trim() || undefined,
    });
    setEditingId(null);
  };

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: '16px' }}>
      <Stack spacing={1.5}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>{t('Inspector findings')}</Typography>
        <Typography variant="body2" color="text.secondary">
          {t('While the report is not submitted, correct or remove a finding. Removing it keeps an audit record; retired evidence remains preserved.')}
        </Typography>
        {findings.map((finding) => (
          <Paper key={finding.id} variant="outlined" sx={{ p: 1.75, borderRadius: '12px' }}>
            {editingId === finding.id ? (
              <Box component="form" onSubmit={(event) => submitEdit(event, finding)} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.25 }}>
                <TextField select name="evidenceId" label={t('Evidence')} size="small" defaultValue={finding.evidenceId ?? ''} required>
                  {activeEvidence.map((item) => <MenuItem key={item.id} value={item.id}>{item.fileName}</MenuItem>)}
                </TextField>
                <TextField name="defectLabel" label={t('Defect label')} size="small" defaultValue={finding.defectLabel} required />
                <TextField select name="severity" label={t('Severity')} size="small" defaultValue={finding.severity}>
                  {SEVERITIES.map((level) => <MenuItem key={level} value={level}>{level}</MenuItem>)}
                </TextField>
                <TextField name="technicalNotes" label={t('Technical notes')} size="small" multiline minRows={2} defaultValue={finding.technicalNotes} required sx={{ gridColumn: '1 / -1' }} />
                <TextField name="recommendedAction" label={t('Recommended action')} size="small" multiline minRows={2} defaultValue={finding.recommendedAction ?? ''} sx={{ gridColumn: '1 / -1' }} />
                <Stack direction="row" spacing={1} sx={{ gridColumn: '1 / -1' }}>
                  <Button type="submit" variant="contained" size="small" disabled={isPending || activeEvidence.length === 0}>{t('Save finding')}</Button>
                  <Button size="small" onClick={() => setEditingId(null)}>{t('Cancel')}</Button>
                </Stack>
              </Box>
            ) : (
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                  <Typography sx={{ fontWeight: 700 }}>{finding.defectLabel}</Typography>
                  <Chip size="small" label={finding.severity} />
                  {finding.status === 'CONFIRMED' && <Chip size="small" color="success" label={t('Included in report')} />}
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {evidence.find((item) => item.id === finding.evidenceId)?.locationDescription || 'Location not supplied'}
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button size="small" onClick={() => setEditingId(finding.id)}>{t('Edit')}</Button>
                  <Button size="small" color="error" disabled={isPending} onClick={() => onDelete(finding.id)}>
                    {t('Remove')}
                  </Button>
                </Stack>
              </Stack>
            )}
          </Paper>
        ))}
        {error != null && <Alert severity="error">{getErrorMessage(error, 'The finding change was not saved.')}</Alert>}
      </Stack>
    </Paper>
  );
}

function OrganizationFindingsOverview({
  findings,
  inspectionId,
}: {
  findings: Finding[];
  inspectionId: string;
}) {
  const { t } = useLocale();
  const evidence = useInspectionEvidence(inspectionId);
  const officialFindings = findings.filter((finding) => finding.status === 'CONFIRMED');
  const pendingFindings = findings.filter((finding) => finding.status === 'PENDING');
  const severityOrder: FindingSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  const severitySummary = severityOrder
    .map((severity) => ({ severity, count: officialFindings.filter((finding) => finding.severity === severity).length }))
    .filter((item) => item.count > 0);

  return (
    <Stack spacing={2}>
      <Alert severity="info">
        This is the Inspector’s findings overview, not a reviewer decision screen. A finding the
        Inspector has not confirmed is not official; the submitted report is reviewed as a whole on
        the Review report tab.
      </Alert>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <Chip label={`${officialFindings.length} Inspector-confirmed finding(s)`} color="primary" variant="outlined" />
        <Chip label={`${pendingFindings.length} awaiting Inspector review`} color={pendingFindings.length ? 'warning' : 'default'} variant="outlined" />
        {severitySummary.map(({ severity, count }) => <Chip key={severity} label={`${severity}: ${count}`} size="small" />)}
      </Stack>
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: '16px' }}>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>{t('Inspector findings')}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Only findings the Inspector confirmed are presented as official report findings. The rest
          are shown separately and cannot be accepted or edited here.
        </Typography>
        {officialFindings.length === 0 ? (
          <Alert severity="info">{t('The Inspector has not confirmed any report findings for this inspection.')}</Alert>
        ) : (
          <Stack spacing={1.5}>
            {officialFindings.map((finding) => (
              <Paper key={finding.id} variant="outlined" sx={{ p: 1.75, borderRadius: '12px' }}>
                <Stack spacing={1}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                    <Typography sx={{ fontWeight: 700 }}>{finding.defectLabel}</Typography>
                    <Chip size="small" label={finding.severity} />
                    <Chip size="small" color="success" label={t('Inspector-confirmed')} />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {(evidence.data ?? []).find((item) => item.id === finding.evidenceId)?.locationDescription ?? 'Location not recorded'}
                  </Typography>
                  {finding.technicalNotes && <Typography variant="body2" color="text.secondary">{finding.technicalNotes}</Typography>}
                  {finding.recommendedAction && <Typography variant="body2"><strong>{t('Recommended action:')}</strong> {finding.recommendedAction}</Typography>}
                  {finding.evidenceId && <Typography variant="caption" color="text.secondary">{t('Linked evidence ·')} {finding.evidenceId.slice(0, 8)}…</Typography>}
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </Paper>
      {pendingFindings.length > 0 && (
        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: '16px' }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>{t('Awaiting Inspector review')}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {t('These are not official findings. The assigned Inspector confirms or removes them.')}
          </Typography>
          <Stack spacing={1}>
            {pendingFindings.map((finding) => (
              <Paper key={finding.id} variant="outlined" sx={{ p: 1.5, borderRadius: '12px' }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                  <Typography sx={{ fontWeight: 600 }}>{finding.defectLabel}</Typography>
                  {finding.confidence !== null && (
                    <Chip size="small" label={`${Math.round(finding.confidence * 100)}% confidence`} />
                  )}
                  <Chip size="small" color="warning" label={t('Pending Inspector review')} />
                  {finding.modelName && (
                    <Typography variant="caption" color="text.secondary">
                      {finding.modelName}
                    </Typography>
                  )}
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}
