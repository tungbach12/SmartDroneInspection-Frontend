import { useMemo, useState, type FormEvent } from 'react';
import { AutoAwesomeOutlined, ReportProblemOutlined } from '@mui/icons-material';
import {
  Alert,
  Box,
  FormControlLabel,
  Switch,
  Button,
  Card,
  CardContent,
  Chip,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getErrorMessage } from '@/shared/api/errorMessage';
import { inspectionApi } from '../api/inspectionApi';
import type {
  EvidenceItem,
  Finding,
  FindingSeverity,
  ManualFindingInput,
} from '../api/inspectionApi';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { AiMotionFigure } from '../components/AiMotionFigure';
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
  useReopenFindings,
  useUpdateEvidenceLocation,
  useReportVersions,
  useConfirmFinding,
  useRemovedFindings,
  useRestoreFinding,
} from '../hooks/useInspections';

const SEVERITIES: FindingSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

interface BoundingBoxCoords {
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
}

function parseBoundingBox(raw?: string): BoundingBoxCoords | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (
      typeof parsed.xMin === 'number' &&
      typeof parsed.yMin === 'number' &&
      typeof parsed.xMax === 'number' &&
      typeof parsed.yMax === 'number' &&
      parsed.xMin >= 0 && parsed.yMin >= 0 &&
      parsed.xMax <= 1 && parsed.yMax <= 1 &&
      parsed.xMin < parsed.xMax && parsed.yMin < parsed.yMax
    ) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * MF3-05 advisory detection plus MF3-06 candidate review, one stage of the inspection workspace.
 *
 * The MF3-09 reviewer verdict is available to a non-author Organization Admin while the latest
 * report version is submitted; the Inspector only recommends by confirming, modifying, or rejecting
 * candidates.
 */
export default function InspectionFindingsPage() {
  const { t } = useLocale();
  const { inspectionId = '' } = useParams();
  const navigate = useNavigate();
  const roles = useAuthStore((state) => state.roles);
  const isInspector = roles.includes('INSPECTOR');
  const isReviewer = roles.includes('ORG_ADMIN');

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
  const reopenFindings = useReopenFindings(inspectionId);
  const reportVersions = useReportVersions(inspectionId);
  const updateEvidenceLocation = useUpdateEvidenceLocation(inspectionId);
  const reportVersionsList = reportVersions.data ?? [];
  const activeEvidenceItems = useMemo(
    () => (evidence.data ?? []).filter((item) => item.retiredAt == null),
    [evidence.data],
  );
  const activeEvidenceIds = useMemo(
    () => new Set(activeEvidenceItems.map((item) => item.id)),
    [activeEvidenceItems],
  );
  const isReportLocked = reportVersionsList.some((version) =>
    ['SUBMITTED', 'APPROVED', 'PUBLISHED', 'SUPERSEDED'].includes(version.status),
  );
  // Per-candidate review inputs, so Confirm/Modify send the values entered on that card.
  const [severities, setSeverities] = useState<Record<string, FindingSeverity>>({});
  const [locationDrafts, setLocationDrafts] = useState<Record<string, string>>({});
  const [locationErrors, setLocationErrors] = useState<Record<string, string>>({});
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const [hoveredCandidateId, setHoveredCandidateId] = useState<string | null>(null);
  const [editingCandidateId, setEditingCandidateId] = useState<string | null>(null);
  const [revisedDefectLabels, setRevisedDefectLabels] = useState<Record<string, string>>({});
  const [manualFindingEvidenceId, setManualFindingEvidenceId] = useState<string | null>(null);
  const [noFindingsAcknowledged, setNoFindingsAcknowledged] = useState(false);
  const [showRemovedFindings, setShowRemovedFindings] = useState(false);

  const hasActiveEvidence = activeEvidenceItems.length > 0;
  // A finding belongs to the working set while it is linked to a current capture. One linked to
  // retired evidence stays in the record but is not part of what the Inspector works from.
  const activeFindings = useMemo(
    () => (findings.data ?? []).filter((finding) => finding.evidenceId && activeEvidenceIds.has(finding.evidenceId)),
    [activeEvidenceIds, findings.data],
  );
  const pendingFindings = activeFindings.filter((finding) => finding.status === 'PENDING').length;
  const reviewedItemCount = (findings.data ?? []).length;
  // A finding on retired evidence is not part of the working set, so it does not count when the
  // Inspector says the scope was reviewed and nothing was found.
  const noFindings = activeFindings.length === 0;
  const analysisUnlocked = workflow.data?.status === 'FIELD_COMPLETED';
  const canConfirm =
    isInspector &&
    hasActiveEvidence &&
    !findings.isLoading &&
    !workflow.isLoading &&
    !findings.isError &&
    pendingFindings === 0 &&
    (!noFindings || noFindingsAcknowledged) &&
    !isAnalysisPending &&
    !confirmFinding.isPending &&
    !createManualFinding.isPending &&
    !confirmFindings.isPending &&
    !isReportLocked &&
    !['REPORT_PUBLISHED', 'REPAIR_PENDING', 'COMPLETED'].includes(workflow.data?.status ?? '');
  // MF3-05 detection is an explicit action: the Inspector chooses which images to analyse. The
  // automatic one-time pass that used to run when the evidence set was accepted is gone, so
  // reopening Findings never starts the model by itself.
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
  const analysingFileNames = activeEvidenceItems
    .filter((item) => analysingEvidenceIds.has(item.id))
    .map((item) => item.fileName);

  const severityFor = (findingId: string): FindingSeverity =>
    severities[findingId] ?? 'MEDIUM';
  const locationFor = (findingId: string): string => {
    const finding = (findings.data ?? []).find((item) => item.id === findingId);
    return finding
      ? locationDrafts[finding.evidenceId ?? ''] ??
        evidence.data?.find((item) => item.id === finding.evidenceId)?.locationDescription ??
        ''
      : '';
  };
  const groupedFindings = useMemo(() => {
    const groups = new Map<
      string,
      {
        evidenceId: string;
        evidence?: EvidenceItem | undefined;
        findings: Finding[];
      }
    >();
    for (const item of activeEvidenceItems) {
      groups.set(item.id, { evidenceId: item.id, evidence: item, findings: [] });
    }
    for (const finding of activeFindings) {
      if (!finding.evidenceId) continue;
      const group = groups.get(finding.evidenceId);
      if (group) group.findings.push(finding);
    }
    return [...groups.values()];
  }, [activeFindings, activeEvidenceItems]);

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
        findings={findings.data ?? []}
        inspectionId={inspectionId}
      />
    );
  }

  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
          <AutoAwesomeOutlined color="primary" />
          <Typography variant="h6">{t('Advisory detection')}</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Detection runs only when you ask for it. Analyse the images you want, or all of them at
          once, and re-analyse an image after a detector change — that replaces its unreviewed
          suggestions and keeps the ones you already decided. Every suggestion remains a candidate
          until the Inspector confirms, modifies or rejects it; the manual path stays open.
        </Typography>
        {!hasActiveEvidence ? (
          <Alert severity="info">{t('Upload current captures before running advisory detection.')}</Alert>
        ) : (
          <Stack spacing={1}>
            {!isInspector && (
              <Alert severity="info">{t('Only the assigned Inspector can run advisory detection.')}</Alert>
            )}
            {isAnalysisPending ? (
              <Alert
                severity="info"
                icon={<AiMotionFigure name="advisoryScan" size={28} alt={t('Advisory detection in progress')} />}
                sx={{ alignItems: 'center' }}
              >
                {analysingFileNames.length > 1
                  ? `Analysing ${analysingFileNames.length} images in parallel…`
                  : `Analysing ${analysingFileNames[0] ?? 'the evidence set'}…`}
              </Alert>
            ) : null}
            {isInspector && isAnalysisError && (
              <Alert severity="warning">
                {getErrorMessage(
                  analysisError,
                  'AI analysis is unavailable; existing evidence remains available.',
                )}
              </Alert>
            )}
            {isInspector && analysisUnlocked && (
              <Box>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AutoAwesomeOutlined />}
                  disabled={isAnalysisPending || analysableImageIds.length === 0}
                  onClick={() => void analyzeMany(analysableImageIds)}
                >
                  {isAnalysisPending
                    ? 'Analysing…'
                    : `Analyse ${analysableImageIds.length} image(s)`}
                </Button>
              </Box>
            )}
            {activeEvidenceItems
              .filter((item) => item.contentType.startsWith('image/'))
              .map((item) => {
                const done = analysedEvidenceIds.has(item.id);
                const isAnalysing = analysingEvidenceIds.has(item.id);
                return (
                  <Stack
                    key={item.id}
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
                      {isAnalysing && (
                        <AiMotionFigure name="advisoryLens" size={22} alt={`Analysing ${item.fileName}`} />
                      )}
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {item.fileName}
                      </Typography>
                      {done && !isAnalysing && (
                        <Chip
                          size="small"
                          variant="outlined"
                          color="success"
                          icon={<AiMotionFigure name="advisoryPulse" size={14} />}
                          label={
                            noDetectionEvidenceIds.has(item.id)
                              ? 'No defects detected'
                              : 'Detection complete'
                          }
                        />
                      )}
                    </Stack>
                    {isInspector && analysisUnlocked && (
                      <Button
                        size="small"
                        startIcon={isAnalysing ? <AiMotionFigure name="advisoryLens" size={18} /> : <AutoAwesomeOutlined />}
                        disabled={isAnalysing}
                        onClick={() => void analyzeMany([item.id], { replace: done })}
                      >
                        {isAnalysing ? 'Analysing…' : done ? 'Analyze again' : 'Analyze'}
                      </Button>
                    )}
                  </Stack>
                );
              })}
          </Stack>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
          <ReportProblemOutlined color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            {t('Findings')}
          </Typography>
        </Stack>
        {findings.isLoading ? (
          <Typography color="text.secondary">{t('Loading findings…')}</Typography>
        ) : findings.isError ? (
          <Alert
            severity="error"
            action={
              <Button color="inherit" onClick={() => void findings.refetch()}>
                {t('Retry')}
              </Button>
            }
          >
            {t('Could not load findings.')}
          </Alert>
        ) : (
          <Stack spacing={2.5}>
            {groupedFindings.map((group) => (
                <Paper
                  key={group.evidenceId}
                  variant="outlined"
                  sx={{
                    p: { xs: 1.75, sm: 2.25 },
                    borderRadius: '12px',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                  }}
                >
                  <Stack
                    direction="row"
                    spacing={1.25}
                    sx={{
                      alignItems: 'center',
                       mb: 2,
                      pb: 1.25,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary' }}>
                      {group.evidence?.fileName ?? `Evidence ${group.evidenceId.slice(0, 8)}…`}
                    </Typography>
                    <Chip
                      size="small"
                      color={group.findings.length === 0 ? 'default' : 'primary'}
                      variant="outlined"
                      label={
                        group.findings.length === 0
                          ? 'No detected defects'
                          : `${group.findings.length} ${group.findings.length === 1 ? 'finding' : 'findings'}`
                      }
                    />
                    {group.evidence && isInspector && (
                      <TextField
                        size="small"
                        label={t('Location for this evidence')}
                        value={locationDrafts[group.evidenceId] ?? group.evidence.locationDescription ?? ''}
                        onChange={(event) =>
                          setLocationDrafts((previous) => ({
                            ...previous,
                            [group.evidenceId]: event.target.value,
                          }))
                        }
                        onBlur={() => {
                          if (group.evidence) {
                            const value = locationDrafts[group.evidenceId] ?? group.evidence.locationDescription ?? '';
                            if (value !== (group.evidence.locationDescription ?? '')) {
                              updateEvidenceLocation.mutate(
                                { evidenceId: group.evidenceId, locationDescription: value },
                                { onError: (error) => setLocationErrors((previous) => ({ ...previous, [group.evidenceId]: getErrorMessage(error, 'Evidence location was not saved.') })) },
                              );
                            }
                          }
                        }}
                        helperText={locationErrors[group.evidenceId] ?? 'Shared by all findings linked to this image. This describes the asset area, not the pixel box.'}
                        error={Boolean(locationErrors[group.evidenceId])}
                        slotProps={{ htmlInput: { maxLength: 1000 } }}
                        sx={{ minWidth: 260, flexGrow: 1 }}
                      />
                    )}
                  </Stack>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
                    <FormControlLabel
                      control={
                        <Switch checked={showBoundingBoxes} onChange={(_event, checked) => setShowBoundingBoxes(checked)} />
                      }
                      label={t('Show detected regions')}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {t('Boxes are model-localized image regions, not asset locations.')}
                    </Typography>
                  </Stack>

                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', md: '360px 1fr' },
                      gap: 2.5,
                      alignItems: 'start',
                    }}
                  >
                    <Box sx={{ position: { md: 'sticky' }, top: 16 }}>
                      <CandidatePhoto
                        inspectionId={inspectionId}
                        evidence={group.evidence}
                        findings={group.findings}
                        showBoundingBoxes={showBoundingBoxes}
                        highlightedCandidateId={hoveredCandidateId}
                      />
                    </Box>

                    <Stack spacing={1.5}>
                            {group.findings.map((finding) => {
                        const box = parseBoundingBox(finding.boundingBox ?? undefined);
                        const confirmed = finding.status === 'CONFIRMED';
                        return (
                          <Box
                            key={finding.id}
                            onMouseEnter={() => setHoveredCandidateId(finding.id)}
                            onMouseLeave={() => setHoveredCandidateId(null)}
                            onFocus={() => setHoveredCandidateId(finding.id)}
                            onBlur={() => setHoveredCandidateId(null)}
                          >
                          <Card variant="outlined" sx={{ borderRadius: '8px', borderColor: hoveredCandidateId === finding.id ? 'primary.main' : 'divider' }}>
                            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                              <Stack spacing={1}>
                                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
                                  <Chip size="small" label={finding.findingCode} />
                                  <Typography sx={{ fontWeight: 700 }}>{finding.defectLabel}</Typography>
                                  {finding.confidence !== null && (
                                    <Chip
                                      size="small"
                                      label={`${Math.round(finding.confidence * 100)}% confidence`}
                                    />
                                  )}
                                  <Chip
                                    size="small"
                                    color={confirmed ? 'success' : 'warning'}
                                    label={confirmed ? 'Confirmed' : 'Awaiting review'}
                                  />
                                  {box && (
                                    <Chip
                                      size="small"
                                      variant="outlined"
                                      label={`Region: [${Math.round(box.xMin * 100)}%, ${Math.round(box.yMin * 100)}%] → [${Math.round(box.xMax * 100)}%, ${Math.round(box.yMax * 100)}%]`}
                                      sx={{ fontFamily: 'monospace', fontSize: '11px' }}
                                    />
                                  )}
                                </Stack>
                                <Typography variant="body2">{finding.technicalNotes}</Typography>
                                {finding.recommendedAction && (
                                  <Typography variant="body2">
                                    <strong>Recommended action:</strong> {finding.recommendedAction}
                                  </Typography>
                                )}
                                {finding.modelName && (
                                  <Typography variant="caption" color="text.secondary">
                                    {finding.modelProvider ? `${finding.modelProvider} · ` : ''}{finding.modelName} · {finding.modelVersion}
                                  </Typography>
                                )}
                                {!confirmed && isInspector && (
                                  <Stack spacing={1}>
                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                                      <TextField
                                        select
                                        size="small"
                                        label={`Severity for ${finding.defectLabel}`}
                                        value={severityFor(finding.id)}
                                        onChange={(event) =>
                                          setSeverities((prev) => ({
                                            ...prev,
                                            [finding.id]: event.target.value as FindingSeverity,
                                          }))
                                        }
                                        sx={{ minWidth: 140 }}
                                      >
                                        {SEVERITIES.map((level) => (
                                          <MenuItem key={level} value={level}>
                                            {level}
                                          </MenuItem>
                                        ))}
                                      </TextField>
                                      <TextField
                                        size="small"
                                        label={t('Evidence location')}
                                        value={locationFor(finding.id)}
                                        disabled
                                        helperText={t('Set once on the evidence group above.')}
                                        sx={{ flexGrow: 1 }}
                                      />
                                    </Stack>
                                    <Stack direction="row" spacing={1}>
                                      <Button
                                        size="small"
                                        variant="contained"
                                        disabled={confirmFinding.isPending}
                                        onClick={() =>
                                          confirmFinding.mutate({
                                            findingId: finding.id,
                                            input: {
                                              severity: severityFor(finding.id),
                                              technicalNotes: finding.technicalNotes ?? 'Confirmed by assigned Inspector',
                                            },
                                          })
                                        }
                                      >
                                        {t('Confirm')}
                                      </Button>
                                      <Button
                                        size="small"
                                        color="error"
                                        disabled={deleteFinding.isPending}
                                        onClick={() =>
                                          deleteFinding.mutate(finding.id)
                                        }
                                      >
                                        {t('Remove')}
                                      </Button>
                                    </Stack>
                                  </Stack>
                                )}
                                {confirmed && (() => {
                                  const isLocked = isReportLocked;
                                  const isEditing = editingCandidateId === finding.id;
                                  return (
                                    <Stack spacing={1}>
                                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
                                        <Chip size="small" color="success" label={t('Inspector confirmed')} />
                                        {isLocked ? (
                                          <Chip size="small" color="success" label={t('Included in report')} />
                                        ) : isReportLocked ? (
                                          <Chip size="small" color="default" label={t('Locked by submitted report')} />
                                        ) : null}
                                        {isInspector && !isLocked && (
                                          <Button
                                            size="small"
                                            variant="text"
                                            onClick={() => {
                                              if (isEditing) {
                                                setEditingCandidateId(null);
                                              } else {
                                                setEditingCandidateId(finding.id);
                                                setRevisedDefectLabels((prev) => ({
                                                  ...prev,
                                                  [finding.id]: finding.defectLabel,
                                                }));
                                                setSeverities((prev) => ({
                                                  ...prev,
                                                  [finding.id]: finding.severity,
                                                }));
                                                setLocationDrafts((prev) => ({
                                                  ...prev,
                                                  [finding.evidenceId ?? '']: evidence.data?.find((item) => item.id === finding.evidenceId)?.locationDescription ?? '',
                                                }));
                                              }
                                            }}
                                          >
                                            {isEditing ? 'Cancel edit' : 'Edit / Change defect'}
                                          </Button>
                                        )}
                                      </Stack>

                                      {isEditing && isInspector && !isLocked && (
                                        <Paper variant="outlined" sx={{ p: 1.5, mt: 1, bgcolor: 'action.hover' }}>
                                          <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 1 }}>
                                            {t('Correct Inspector finding details:')}
                                          </Typography>
                                          <Stack spacing={1}>
                                            <TextField
                                              size="small"
                                              label={t('Defect label')}
                                              value={revisedDefectLabels[finding.id] ?? finding.defectLabel}
                                              onChange={(event) =>
                                                setRevisedDefectLabels((prev) => ({
                                                  ...prev,
                                                  [finding.id]: event.target.value,
                                                }))
                                              }
                                              slotProps={{ htmlInput: { maxLength: 160 } }}
                                            />
                                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                                              <TextField
                                                select
                                                size="small"
                                                label={t('Severity')}
                                                value={severityFor(finding.id)}
                                                onChange={(event) =>
                                                  setSeverities((prev) => ({
                                                    ...prev,
                                                    [finding.id]: event.target.value as FindingSeverity,
                                                  }))
                                                }
                                                sx={{ minWidth: 140 }}
                                              >
                                                {SEVERITIES.map((level) => (
                                                  <MenuItem key={level} value={level}>
                                                    {level}
                                                  </MenuItem>
                                                ))}
                                              </TextField>
                                              <TextField
                                                size="small"
                                                label={t('Evidence location')}
                                                value={locationFor(finding.id)}
                                                disabled
                                                helperText={t('Edit the shared location on the evidence group.')}
                                                sx={{ flexGrow: 1 }}
                                              />
                                            </Stack>
                                            <Stack direction="row" spacing={1}>
                                              <Button
                                                size="small"
                                                variant="contained"
                                                disabled={updateFinding.isPending}
                                                onClick={() => {
                                                  updateFinding.mutate({
                                                    findingId: finding.id,
                                                    input: {
                                                      evidenceId: finding.evidenceId ?? '',
                                                      defectLabel: (revisedDefectLabels[finding.id] ?? finding.defectLabel).trim(),
                                                      severity: severityFor(finding.id),
                                                      technicalNotes: finding.technicalNotes ?? 'Corrected by assigned Inspector',
                                                    },
                                                  });
                                                  setEditingCandidateId(null);
                                                }}
                                              >
                                                {t('Save correction')}
                                              </Button>
                                              <Button
                                                size="small"
                                                onClick={() => setEditingCandidateId(null)}
                                              >
                                                {t('Cancel')}
                                              </Button>
                                            </Stack>
                                            {updateFinding.isError && (
                                              <Alert severity="error">
                                                {getErrorMessage(updateFinding.error, 'The correction was not saved.')}
                                              </Alert>
                                            )}
                                          </Stack>
                                        </Paper>
                                      )}

                                      {isInspector && !isLocked && (
                                        <Button
                                          size="small"
                                          color="error"
                                          disabled={deleteFinding.isPending}
                                          onClick={() =>
                                            deleteFinding.mutate(finding.id)
                                          }
                                        >
                                          {t('Remove finding')}
                                        </Button>
                                      )}

                                      {isInspector && (
                                        <Typography variant="caption" color="text.secondary">
                                          {t('Inspector-confirmed. Organization Admin reviews the complete submitted report.')}
                                        </Typography>
                                      )}
                                    </Stack>
                                  );
                                })()}
                              </Stack>
                            </CardContent>
                          </Card>
                          </Box>
                        );
                      })}
                    </Stack>
                  </Box>
                  {isInspector && group.evidence ? (
                    <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                      {manualFindingEvidenceId === group.evidenceId ? (
                        <Box
                          component="form"
                          onSubmit={(event) => {
                            submitManualFinding(event);
                            setManualFindingEvidenceId(null);
                          }}
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                            gap: 1.5,
                            p: 2,
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: '8px',
                            bgcolor: 'action.hover',
                          }}
                        >
                          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gridColumn: '1 / -1' }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                              {t('Add manual finding for')} {group.evidence.fileName}
                            </Typography>
                            <Button size="small" onClick={() => setManualFindingEvidenceId(null)}>
                              {t('Cancel')}
                            </Button>
                          </Stack>
                          <input type="hidden" name="evidenceId" value={group.evidenceId} />
                          <TextField name="defectLabel" label={t('Defect label')} required size="small" slotProps={{ htmlInput: { maxLength: 160 } }} />
                          <TextField select name="severity" label={t('Severity')} defaultValue="MEDIUM" size="small">
                            {SEVERITIES.map((level) => (
                              <MenuItem key={level} value={level}>{level}</MenuItem>
                            ))}
                          </TextField>

                          <TextField
                            name="technicalNotes"
                            label={t('Technical notes')}
                            required
                            multiline
                            minRows={2}
                            size="small"
                            sx={{ gridColumn: '1 / -1' }}
                            slotProps={{ htmlInput: { maxLength: 4000 } }}
                          />
                          <TextField
                            name="recommendedAction"
                            label={t('Recommended action')}
                            multiline
                            minRows={2}
                            size="small"
                            sx={{ gridColumn: '1 / -1' }}
                            slotProps={{ htmlInput: { maxLength: 4000 } }}
                          />
                          <Button
                            type="submit"
                            variant="contained"
                            size="small"
                            disabled={createManualFinding.isPending}
                            sx={{ justifySelf: 'start' }}
                          >
                            {createManualFinding.isPending ? 'Saving finding…' : 'Save manual finding'}
                          </Button>
                          {createManualFinding.isError && (
                            <Alert severity="error" sx={{ mt: 1, gridColumn: '1 / -1' }}>
                              {getErrorMessage(createManualFinding.error, 'Manual finding was not saved.')}
                            </Alert>
                          )}
                        </Box>
                      ) : (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => setManualFindingEvidenceId(group.evidenceId)}
                          sx={{ alignSelf: 'flex-start' }}
                        >
                          {t('+ Add manual finding for')} {group.evidence.fileName}
                        </Button>
                      )}
                    </Box>
                  ) : null}
                </Paper>
              ))}
            {confirmFinding.isError && (
              <Alert severity="error">
                {getErrorMessage(confirmFinding.error, 'The finding was not confirmed.')}
              </Alert>
            )}
          </Stack>
        )}

        {isInspector && (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={1.25}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, flexGrow: 1 }}>
                  {t('Removed findings')}
                </Typography>
                <Button
                  size="small"
                  variant="text"
                  onClick={() => setShowRemovedFindings((current) => !current)}
                >
                  {showRemovedFindings ? 'Hide removed' : 'Show removed'}
                </Button>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                A removed finding is hidden from the working set but stays in the record, so it can
                be brought back if it was removed by mistake.
              </Typography>
              {showRemovedFindings ? (
                removedFindings.data?.length ? (
                  <Stack spacing={1}>
                    {removedFindings.data.map((finding) => (
                      <Paper key={finding.id} variant="outlined" sx={{ p: 1.5 }}>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                          <Typography sx={{ fontWeight: 600 }}>{finding.defectLabel}</Typography>
                          <Chip size="small" label={finding.severity} />
                          <Chip
                            size="small"
                            color={finding.status === 'CONFIRMED' ? 'success' : 'default'}
                            label={finding.status === 'CONFIRMED' ? 'Was confirmed' : 'Was never confirmed'}
                          />
                          <Typography variant="caption" color="text.secondary">
                            Removed · {finding.deletedAt ? new Date(finding.deletedAt).toLocaleString() : 'time unavailable'}
                          </Typography>
                          <Box sx={{ flexGrow: 1 }} />
                          <Button
                            size="small"
                            variant="outlined"
                            disabled={restoreFinding.isPending}
                            onClick={() => restoreFinding.mutate(finding.id)}
                          >
                            {t('Restore')}
                          </Button>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                ) : (
                  <Alert severity="info">{t('No finding has been removed.')}</Alert>
                )
              ) : null}
              {restoreFinding.isError && (
                <Alert severity="error">
                  {getErrorMessage(restoreFinding.error, 'The finding was not restored.')}
                </Alert>
              )}
            </Stack>
          </Paper>
        )}

        {isInspector && (
          <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
            <Stack spacing={1.25}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {t('Findings review')}
              </Typography>
              {workflow.data?.status === 'REPORT_DRAFT' && workflow.data.findingsSnapshotHash && (
                <Alert severity="info">
                  {t('Findings are confirmed. Reopen this stage only if you need to change the reviewed set.')}
                  <Button
                    size="small"
                    sx={{ ml: 1, textTransform: 'none' }}
                    disabled={reopenFindings.isPending}
                    onClick={() => reopenFindings.mutate()}
                  >
                    {t('Reopen Findings')}
                  </Button>
                </Alert>
              )}
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
                sx={{ alignSelf: 'flex-start' }}
              >
                {confirmFindings.isPending ? 'Confirming findings…' : 'Confirm findings and continue'}
              </Button>
              {confirmFindings.isError && (
                <Alert severity="error">
                  {getErrorMessage(
                    confirmFindings.error,
                    'Findings were not confirmed. Resolve any pending candidates and try again.',
                  )}
                </Alert>
              )}
            </Stack>
          </Paper>
        )}
      </Paper>

      <InspectorFindingRegister
        findings={(findings.data ?? []).filter((finding) => finding.modelName == null)}
        evidence={evidence.data ?? []}
        isEditable={isInspector && !isReportLocked}
        isPending={updateFinding.isPending || deleteFinding.isPending}
        error={updateFinding.error ?? deleteFinding.error}
        onUpdate={(findingId, input) => updateFinding.mutate({ findingId, input })}
        onDelete={(findingId) => deleteFinding.mutate(findingId)}
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
  const activeEvidence = evidence.filter((item) => item.retiredAt == null);

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
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
      <Stack spacing={1.5}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>{t('Inspector findings')}</Typography>
        <Typography variant="body2" color="text.secondary">
          {t('While the report is not submitted, correct or remove a finding. Removing it keeps an audit record; retired evidence remains preserved.')}
        </Typography>
        {findings.map((finding) => (
          <Paper key={finding.id} variant="outlined" sx={{ p: 1.75 }}>
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
                  {finding.inspectorConfirmedAt && <Chip size="small" color="success" label={t('Included in report')} />}
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

/**
 * The defect photo behind one candidate, resolved from the evidence list by
 * `evidenceId`. Non-image captures have no inline preview; a missing entry
 * renders nothing rather than a broken image.
 */
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
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
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
              <Paper key={finding.id} variant="outlined" sx={{ p: 1.75 }}>
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
        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>{t('Awaiting Inspector review')}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {t('These are not official findings. The assigned Inspector confirms or removes them.')}
          </Typography>
          <Stack spacing={1}>
            {pendingFindings.map((finding) => (
              <Paper key={finding.id} variant="outlined" sx={{ p: 1.5 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                  <Typography sx={{ fontWeight: 600 }}>{finding.defectLabel}</Typography>
                  {finding.confidence !== null && (
                    <Chip size="small" label={`${Math.round(finding.confidence * 100)}% confidence`} />
                  )}
                  <Chip size="small" color="warning" label={t('Pending Inspector review')} />
                  {finding.modelName && (
                    <Typography variant="caption" color="text.secondary">
                      {finding.modelProvider ? `${finding.modelProvider} · ` : ''}{finding.modelName} · {finding.modelVersion}
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

function CandidatePhoto({
  inspectionId,
  evidence,
  findings,
  showBoundingBoxes,
  highlightedCandidateId,
}: {
  inspectionId: string;
  evidence: EvidenceItem | undefined;
  findings: Finding[];
  showBoundingBoxes: boolean;
  highlightedCandidateId: string | null;
}) {
  const { t } = useLocale();
  if (!evidence || !evidence.contentType.startsWith('image/')) return null;
  return (
    <Box
      sx={{
        borderRadius: '10px',
        border: '1px solid',
                      borderColor: 'divider',
        overflow: 'hidden',
        p: 1.25,
        bgcolor: 'background.default',
      }}
    >
      <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 0.75 }}>
        {t('Defect photo capture ·')} {evidence.fileName}
      </Typography>
      <Box sx={{ position: 'relative', width: '100%', lineHeight: 0 }}>
        <AuthenticatedImage
          src={inspectionApi.evidenceContentUrl(inspectionId, evidence.id)}
          alt={`Inspection evidence ${evidence.fileName}`}
          maxHeight={420}
          sx={{ borderRadius: '6px', width: '100%' }}
        />
        {showBoundingBoxes && findings.map((finding, index) => {
          const box = parseBoundingBox(finding.boundingBox ?? undefined);
          if (!box) return null;
          const active = highlightedCandidateId === finding.id;
          const color = ['#d32f2f', '#1976d2', '#2e7d32', '#ed6c02'][index % 4];
          return (
            <Box
              key={finding.id}
              aria-label={`${finding.defectLabel}, ${Math.round((finding.confidence ?? 0) * 100)} percent confidence`}
              sx={{
                position: 'absolute',
                left: `${box.xMin * 100}%`,
                top: `${box.yMin * 100}%`,
                width: `${(box.xMax - box.xMin) * 100}%`,
                height: `${(box.yMax - box.yMin) * 100}%`,
                border: `2px solid ${color}`,
                boxShadow: active ? `0 0 0 3px ${color}66` : 'none',
                pointerEvents: 'none',
                zIndex: 2,
                '&::before': {
                  content: `"${finding.defectLabel} · ${Math.round((finding.confidence ?? 0) * 100)}%"`,
                  position: 'absolute',
                  top: -22,
                  left: -2,
                  px: 0.5,
                  py: 0.25,
                  color: '#fff',
                  bgcolor: color,
                  fontSize: 10,
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  lineHeight: 1.2,
                },
              }}
            />
          );
        })}
      </Box>
    </Box>
  );
}
