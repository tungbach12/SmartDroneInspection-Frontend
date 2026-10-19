import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
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
  CandidateStatus,
  EvidenceItem,
  FindingSeverity,
  ManualFindingInput,
  VerifiedFinding,
} from '../api/inspectionApi';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { AiMotionFigure } from '../components/AiMotionFigure';
import { hasAutoDetectionRun, markAutoDetectionRun } from '../autoDetectionRun';
import {
  useAnalyzeEvidence,
  useCreateManualFinding,
  useUpdateFinding,
  useDeleteFinding,
  useConfirmFindings,
  useEvidenceQualityHistory,
  useEvidenceAnalysisStatuses,
  useFindingCandidates,
  useInspectionEvidence,
  useInspectionFindings,
  useInspectionWorkflowState,
  useReopenFindings,
  useUpdateEvidenceLocation,
  useReportVersions,
  useReviewFindingCandidate,
  useReviseReviewedCandidate,
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
  const { inspectionId = '' } = useParams();
  const navigate = useNavigate();
  const roles = useAuthStore((state) => state.roles);
  const userId = useAuthStore((state) => state.userId);
  const isInspector = roles.includes('INSPECTOR');
  const isReviewer = roles.includes('ORG_ADMIN');

  const evidence = useInspectionEvidence(inspectionId);
  const quality = useEvidenceQualityHistory(inspectionId);
  const candidates = useFindingCandidates(inspectionId);
  const analysisStatuses = useEvidenceAnalysisStatuses(inspectionId);
  const {
    analyzeMany,
    analysingIds,
    isPending: isAnalysisPending,
    isError: isAnalysisError,
    error: analysisError,
  } = useAnalyzeEvidence(inspectionId);
  const reviewCandidate = useReviewFindingCandidate(inspectionId);
  const createManualFinding = useCreateManualFinding(inspectionId);
  const updateFinding = useUpdateFinding(inspectionId);
  const deleteFinding = useDeleteFinding(inspectionId);
  const findings = useInspectionFindings(inspectionId);
  const workflow = useInspectionWorkflowState(inspectionId);
  const confirmFindings = useConfirmFindings(inspectionId);
  const reopenFindings = useReopenFindings(inspectionId);
  const reportVersions = useReportVersions(inspectionId);
  const reviseCandidate = useReviseReviewedCandidate(inspectionId);
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

  const evidenceAccepted = quality.data?.[0]?.decision === 'ACCEPTED';
  const activeCandidates = useMemo(
    () => (candidates.data ?? []).filter((candidate) => activeEvidenceIds.has(candidate.evidenceId)),
    [activeEvidenceIds, candidates.data],
  );
  const pendingCandidates = activeCandidates.filter((candidate) => candidate.status === 'PENDING').length;
  const reviewedItemCount = (findings.data ?? []).length + activeCandidates.filter((candidate) => candidate.status === 'REJECTED').length;
  const noFindings = (findings.data ?? []).length === 0;
  const analysisUnlocked = workflow.data?.status === 'FIELD_COMPLETED';
  const canConfirm =
    isInspector &&
    evidenceAccepted &&
    !candidates.isLoading &&
    !findings.isLoading &&
    !workflow.isLoading &&
    !candidates.isError &&
    pendingCandidates === 0 &&
    (!noFindings || noFindingsAcknowledged) &&
    !isAnalysisPending &&
    !reviewCandidate.isPending &&
    !reviseCandidate.isPending &&
    !createManualFinding.isPending &&
    !confirmFindings.isPending &&
    !isReportLocked &&
    !['REPORT_PUBLISHED', 'REPAIR_PENDING', 'COMPLETED'].includes(workflow.data?.status ?? '');
  const autoAnalysed = useRef(new Set<string>());
  const autoPassOffered = useRef(false);

  // MF3-05 runs one automatic pass for the accepted set. Reopening Findings returns the workflow
  // to FIELD_COMPLETED but must not silently restart detection; the Inspector can still explicitly
  // analyse an image that has no candidates.
  const analysisStatusByEvidenceId = useMemo(
    () => new Map((analysisStatuses.data ?? []).map((status) => [status.evidenceId, status])),
    [analysisStatuses.data],
  );
  const analysedEvidenceIds = useMemo(
    () => new Set([
      ...activeCandidates.map((candidate) => candidate.evidenceId),
      ...analysisStatusByEvidenceId.keys(),
    ]),
    [activeCandidates, analysisStatusByEvidenceId],
  );
  const analysingEvidenceIds = useMemo(() => new Set(analysingIds), [analysingIds]);
  const analysingFileNames = activeEvidenceItems
    .filter((item) => analysingEvidenceIds.has(item.id))
    .map((item) => item.fileName);
  useEffect(() => {
    if (
      !isInspector ||
      !userId ||
      !evidenceAccepted ||
      !analysisUnlocked ||
      isAnalysisPending ||
      candidates.isLoading ||
      !candidates.data ||
      analysisStatuses.isLoading ||
      analysisStatuses.data === undefined ||
      evidence.isLoading ||
      evidence.data === undefined
    ) {
      return;
    }
    if (!autoPassOffered.current) {
      autoPassOffered.current = true;
      if (hasAutoDetectionRun(userId, inspectionId)) return;
      markAutoDetectionRun(userId, inspectionId);
    }
    const pending = activeEvidenceItems.filter(
      (item) =>
        item.contentType.startsWith('image/') &&
        !autoAnalysed.current.has(item.id) &&
        !analysedEvidenceIds.has(item.id),
    );
    if (pending.length === 0) return;
    pending.forEach((item) => autoAnalysed.current.add(item.id));
    void analyzeMany(pending.map((item) => item.id));
  }, [
    isInspector,
    userId,
    inspectionId,
    evidenceAccepted,
    analysisUnlocked,
    candidates.isLoading,
    candidates.data,
    analysisStatuses.isLoading,
    analysisStatuses.data,
    analysisStatusByEvidenceId,
    evidence.isLoading,
    evidence.data,
    analysedEvidenceIds,
    activeEvidenceItems,
    analyzeMany,
    isAnalysisPending,
  ]);

  const severityFor = (candidateId: string): FindingSeverity =>
    severities[candidateId] ?? 'MEDIUM';
  const locationFor = (candidateId: string): string => {
    const candidate = (candidates.data ?? []).find((item) => item.id === candidateId);
    return candidate ? locationDrafts[candidate.evidenceId] ?? evidence.data?.find((item) => item.id === candidate.evidenceId)?.locationDescription ?? '' : '';
  };
  const groupedCandidates = useMemo(() => {
    type CandidateItem = NonNullable<typeof candidates.data>[number];
    const groups = new Map<
      string,
      {
        evidenceId: string;
        evidence?: EvidenceItem | undefined;
        candidates: CandidateItem[];
      }
    >();
    for (const item of activeEvidenceItems) {
      groups.set(item.id, { evidenceId: item.id, evidence: item, candidates: [] });
    }
    for (const candidate of activeCandidates) {
      const group = groups.get(candidate.evidenceId);
      if (group) group.candidates.push(candidate);
    }
    return [...groups.values()];
  }, [activeCandidates, activeEvidenceItems]);

  const submitManualFinding = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const evidenceId = String(formData.get('evidenceId') ?? '');
    if (!evidenceId) return;
    createManualFinding.mutate({
      evidenceId,
      defectLabel: String(formData.get('defectLabel') ?? '').trim(),
      severity: String(formData.get('severity') ?? 'MEDIUM') as FindingSeverity,
      locationDescription: evidence.data?.find((item) => item.id === evidenceId)?.locationDescription ?? undefined,
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
        candidates={activeCandidates}
      />
    );
  }

  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
          <AutoAwesomeOutlined color="primary" />
          <Typography variant="h6">Advisory detection</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Runs automatically once, the first time the evidence set is accepted. Reopening Findings
          does not start it again — analyse any image yourself from here, including again after a
          detector change. Re-analysing an image replaces its unreviewed suggestions and keeps the
          ones you already decided. Every suggestion remains a
          candidate until the Inspector confirms, modifies or rejects it; the manual path stays open.
        </Typography>
        {!evidenceAccepted ? (
          <Alert severity="info">Detection starts after an accepted evidence quality decision.</Alert>
        ) : (
          <Stack spacing={1}>
            {!isInspector && (
              <Alert severity="info">Only the assigned Inspector can run advisory detection.</Alert>
            )}
            {isAnalysisPending ? (
              <Alert
                severity="info"
                icon={<AiMotionFigure name="advisoryScan" size={28} alt="Advisory detection in progress" />}
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
                            activeCandidates.some((candidate) => candidate.evidenceId === item.id)
                              ? 'Detection complete'
                              : analysisStatusByEvidenceId.get(item.id)?.detectionCount === 0
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
            Findings
          </Typography>
        </Stack>
        {candidates.isLoading ? (
          <Typography color="text.secondary">Loading candidate reviews…</Typography>
        ) : candidates.isError ? (
          <Alert
            severity="error"
            action={
              <Button color="inherit" onClick={() => void candidates.refetch()}>
                Retry
              </Button>
            }
          >
            Could not load findings.
          </Alert>
        ) : (
          <Stack spacing={2.5}>
            {groupedCandidates.map((group) => (
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
                      color={group.candidates.length === 0 ? 'default' : 'primary'}
                      variant="outlined"
                      label={
                        group.candidates.length === 0
                          ? 'No detected defects'
                          : `${group.candidates.length} ${group.candidates.length === 1 ? 'detected defect' : 'detected defects'}`
                      }
                    />
                    {group.evidence && isInspector && (
                      <TextField
                        size="small"
                        label="Location for this evidence"
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
                      label="Show detected regions"
                    />
                    <Typography variant="caption" color="text.secondary">
                      Boxes are model-localized image regions, not asset locations.
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
                        candidates={group.candidates}
                        showBoundingBoxes={showBoundingBoxes}
                        highlightedCandidateId={hoveredCandidateId}
                      />
                    </Box>

                    <Stack spacing={1.5}>
                            {group.candidates.map((candidate) => {
                        const box = parseBoundingBox(candidate.boundingBox);
                        return (
                          <Box
                            key={candidate.id}
                            onMouseEnter={() => setHoveredCandidateId(candidate.id)}
                            onMouseLeave={() => setHoveredCandidateId(null)}
                            onFocus={() => setHoveredCandidateId(candidate.id)}
                            onBlur={() => setHoveredCandidateId(null)}
                          >
                          <Card variant="outlined" sx={{ borderRadius: '8px', borderColor: hoveredCandidateId === candidate.id ? 'primary.main' : 'divider' }}>
                            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                              <Stack spacing={1}>
                                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
                                  <Typography sx={{ fontWeight: 700 }}>{candidate.predictedLabel}</Typography>
                                  <Chip
                                    size="small"
                                    label={`${Math.round(candidate.confidence * 100)}% confidence`}
                                  />
                                  <Chip
                                    size="small"
                                    color={candidate.status === 'PENDING' ? 'warning' : 'default'}
                                    label={candidate.status}
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
                                <Typography variant="caption" color="text.secondary">
                                  {candidate.modelProvider ? `${candidate.modelProvider} · ` : ''}{candidate.modelName} · {candidate.modelVersion}
                                </Typography>
                                {candidate.status === 'PENDING' && isInspector && (
                                  <Stack spacing={1}>
                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                                      <TextField
                                        select
                                        size="small"
                                        label={`Severity for ${candidate.predictedLabel}`}
                                        value={severityFor(candidate.id)}
                                        onChange={(event) =>
                                          setSeverities((prev) => ({
                                            ...prev,
                                            [candidate.id]: event.target.value as FindingSeverity,
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
                                        label="Evidence location"
                                        value={locationFor(candidate.id)}
                                        disabled
                                        helperText="Set once on the evidence group above."
                                        sx={{ flexGrow: 1 }}
                                      />
                                    </Stack>
                                    <Stack direction="row" spacing={1}>
                                      <Button
                                        size="small"
                                        disabled={reviewCandidate.isPending}
                                        onClick={() =>
                                          reviewCandidate.mutate({
                                            candidateId: candidate.id,
                                            input: {
                                              decision: 'CONFIRMED',
                                              severity: severityFor(candidate.id),
                                              locationDescription: locationFor(candidate.id).trim() || undefined,
                                              technicalNotes: 'Confirmed by assigned Inspector',
                                            },
                                          })
                                        }
                                      >
                                        Confirm
                                      </Button>
                                      <Button
                                        size="small"
                                        disabled={reviewCandidate.isPending}
                                        onClick={() =>
                                          reviewCandidate.mutate({
                                            candidateId: candidate.id,
                                            input: {
                                              decision: 'MODIFIED',
                                              defectLabel: candidate.predictedLabel,
                                              severity: severityFor(candidate.id),
                                              locationDescription: locationFor(candidate.id).trim() || undefined,
                                              technicalNotes: 'Modified by assigned Inspector',
                                            },
                                          })
                                        }
                                      >
                                        Modify
                                      </Button>
                                      <Button
                                        size="small"
                                        color="error"
                                        onClick={() =>
                                          reviewCandidate.mutate({
                                            candidateId: candidate.id,
                                            input: {
                                              decision: 'REJECTED',
                                              reason: 'Inspector marked as false positive',
                                            },
                                          })
                                        }
                                      >
                                        Reject
                                      </Button>
                                    </Stack>
                                  </Stack>
                                )}
                                {candidate.status !== 'PENDING' && (() => {
                                  const linkedFinding = (findings.data ?? []).find(
                                    (f) => f.aiCandidateId === candidate.id,
                                  );
                                  const isLocked = isReportLocked;
                                  const isEditing = editingCandidateId === candidate.id;
                                  return (
                                    <Stack spacing={1}>
                                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
                                        <Chip
                                          size="small"
                                          color={candidate.status === 'REJECTED' ? 'error' : 'default'}
                                          label={`Inspector: ${candidate.status}`}
                                        />
                                        {isLocked ? (
                                          <Chip size="small" color="success" label="Included in report" />
                                        ) : isReportLocked ? (
                                          <Chip size="small" color="default" label="Locked by submitted report" />
                                        ) : (
                                          <Chip size="small" color="success" variant="outlined" label="Inspector reviewed" />
                                        )}
                                        {isInspector && !isLocked && (
                                          <Button
                                            size="small"
                                            variant="text"
                                            onClick={() => {
                                              if (isEditing) {
                                                setEditingCandidateId(null);
                                              } else {
                                                setEditingCandidateId(candidate.id);
                                                setRevisedDefectLabels((prev) => ({
                                                  ...prev,
                                                  [candidate.id]: linkedFinding?.defectLabel ?? candidate.predictedLabel,
                                                }));
                                                setSeverities((prev) => ({
                                                  ...prev,
                                                  [candidate.id]: linkedFinding?.severity ?? 'MEDIUM',
                                                }));
                                                setLocationDrafts((prev) => ({
                                                  ...prev,
                                                  [candidate.evidenceId]: evidence.data?.find((item) => item.id === candidate.evidenceId)?.locationDescription ?? '',
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
                                            Correct Inspector finding details:
                                          </Typography>
                                          <Stack spacing={1}>
                                            <TextField
                                              size="small"
                                              label="Defect label"
                                              value={revisedDefectLabels[candidate.id] ?? candidate.predictedLabel}
                                              onChange={(event) =>
                                                setRevisedDefectLabels((prev) => ({
                                                  ...prev,
                                                  [candidate.id]: event.target.value,
                                                }))
                                              }
                                              slotProps={{ htmlInput: { maxLength: 160 } }}
                                            />
                                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                                              <TextField
                                                select
                                                size="small"
                                                label="Severity"
                                                value={severityFor(candidate.id)}
                                                onChange={(event) =>
                                                  setSeverities((prev) => ({
                                                    ...prev,
                                                    [candidate.id]: event.target.value as FindingSeverity,
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
                                                label="Evidence location"
                                                value={locationFor(candidate.id)}
                                                disabled
                                                helperText="Edit the shared location on the evidence group."
                                                sx={{ flexGrow: 1 }}
                                              />
                                            </Stack>
                                            <Stack direction="row" spacing={1}>
                                              <Button
                                                size="small"
                                                variant="contained"
                                                disabled={reviseCandidate.isPending}
                                                onClick={() => {
                                                  const label = (revisedDefectLabels[candidate.id] ?? candidate.predictedLabel).trim();
                                                  const isModified = label !== candidate.predictedLabel;
                                                  reviseCandidate.mutate({
                                                    candidateId: candidate.id,
                                                    input: {
                                                      decision: isModified ? 'MODIFIED' : 'CONFIRMED',
                                                      defectLabel: label,
                                                      severity: severityFor(candidate.id),
                                                      locationDescription: locationFor(candidate.id).trim() || undefined,
                                                      technicalNotes: isModified
                                                        ? 'Modified by assigned Inspector'
                                                        : 'Confirmed by assigned Inspector',
                                                    },
                                                  });
                                                  setEditingCandidateId(null);
                                                }}
                                              >
                                                Save correction
                                              </Button>
                                              <Button
                                                size="small"
                                                color="error"
                                                disabled={reviseCandidate.isPending}
                                                onClick={() => {
                                                  reviseCandidate.mutate({
                                                    candidateId: candidate.id,
                                                    input: {
                                                      decision: 'REJECTED',
                                                      reason: 'Inspector marked as false positive upon revision',
                                                    },
                                                  });
                                                  setEditingCandidateId(null);
                                                }}
                                              >
                                                Reject defect
                                              </Button>
                                              <Button
                                                size="small"
                                                onClick={() => setEditingCandidateId(null)}
                                              >
                                                Cancel
                                              </Button>
                                            </Stack>
                                            {reviseCandidate.isError && (
                                              <Alert severity="error">
                                                {getErrorMessage(reviseCandidate.error, 'Candidate revision was not saved.')}
                                              </Alert>
                                            )}
                                          </Stack>
                                        </Paper>
                                      )}

                                      {isInspector && linkedFinding?.inspectorConfirmedAt && (
                                        <Typography variant="caption" color="text.secondary">
                                          Inspector-confirmed. Organization Admin reviews the complete submitted report.
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
                              Add manual finding for {group.evidence.fileName}
                            </Typography>
                            <Button size="small" onClick={() => setManualFindingEvidenceId(null)}>
                              Cancel
                            </Button>
                          </Stack>
                          <input type="hidden" name="evidenceId" value={group.evidenceId} />
                          <TextField name="defectLabel" label="Defect label" required size="small" slotProps={{ htmlInput: { maxLength: 160 } }} />
                          <TextField select name="severity" label="Severity" defaultValue="MEDIUM" size="small">
                            {SEVERITIES.map((level) => (
                              <MenuItem key={level} value={level}>{level}</MenuItem>
                            ))}
                          </TextField>

                          <TextField
                            name="technicalNotes"
                            label="Technical notes"
                            required
                            multiline
                            minRows={2}
                            size="small"
                            sx={{ gridColumn: '1 / -1' }}
                            slotProps={{ htmlInput: { maxLength: 4000 } }}
                          />
                          <TextField
                            name="recommendedAction"
                            label="Recommended action"
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
                          + Add manual finding for {group.evidence.fileName}
                        </Button>
                      )}
                    </Box>
                  ) : null}
                </Paper>
              ))}
            {reviewCandidate.isError && (
              <Alert severity="error">
                {getErrorMessage(reviewCandidate.error, 'Candidate review was not saved.')}
              </Alert>
            )}
          </Stack>
        )}

        {isInspector && (
          <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
            <Stack spacing={1.25}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Findings review
              </Typography>
              {workflow.data?.status === 'REPORT_DRAFT' && workflow.data.findingsSnapshotHash && (
                <Alert severity="info">
                  Findings are confirmed. Reopen this stage only if you need to change the reviewed set.
                  <Button
                    size="small"
                    sx={{ ml: 1, textTransform: 'none' }}
                    disabled={reopenFindings.isPending}
                    onClick={() => reopenFindings.mutate()}
                  >
                    Reopen Findings
                  </Button>
                </Alert>
              )}
              <Typography variant="body2" color="text.secondary">
                {pendingCandidates > 0
                  ? `${pendingCandidates} AI candidate${pendingCandidates === 1 ? '' : 's'} still need a decision.`
                  : reviewedItemCount > 0
                    ? `${reviewedItemCount} reviewed finding item${reviewedItemCount === 1 ? '' : 's'} ready for the report stage.`
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
                    No finding was observed within the scope covered by these images.
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
        findings={(findings.data ?? []).filter((finding) => finding.source === 'MANUAL')}
        evidence={evidence.data ?? []}
        isEditable={isInspector && !isReportLocked}
        isPending={updateFinding.isPending || deleteFinding.isPending}
        error={updateFinding.error ?? deleteFinding.error}
        onUpdate={(findingId, input) => updateFinding.mutate({ findingId, input })}
        onDelete={(findingId, reason) => deleteFinding.mutate({ findingId, reason })}
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
  findings: VerifiedFinding[];
  evidence: EvidenceItem[];
  isEditable: boolean;
  isPending: boolean;
  error: unknown;
  onUpdate: (findingId: string, input: ManualFindingInput) => void;
  onDelete: (findingId: string, reason: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletionReason, setDeletionReason] = useState('');

  if (!isEditable || findings.length === 0) return null;
  const activeEvidence = evidence.filter((item) => item.retiredAt == null);

  const submitEdit = (event: FormEvent<HTMLFormElement>, finding: VerifiedFinding) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onUpdate(finding.id, {
      evidenceId: String(data.get('evidenceId') ?? finding.evidenceId ?? ''),
      defectLabel: String(data.get('defectLabel') ?? '').trim(),
      severity: String(data.get('severity') ?? finding.severity) as FindingSeverity,
      locationDescription: String(data.get('locationDescription') ?? '').trim() || undefined,
      technicalNotes: String(data.get('technicalNotes') ?? '').trim(),
      recommendedAction: String(data.get('recommendedAction') ?? '').trim() || undefined,
      component: String(data.get('component') ?? '').trim() || undefined,
      observedCondition: String(data.get('observedCondition') ?? '').trim() || undefined,
      priority: String(data.get('priority') ?? '').trim() || undefined,
      measurement: String(data.get('measurement') ?? '').trim() || undefined,
      repairRequired: finding.repairRequired,
    });
    setEditingId(null);
  };

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
      <Stack spacing={1.5}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>Inspector findings</Typography>
        <Typography variant="body2" color="text.secondary">
          While the report is not submitted, correct or remove a finding. Removing it keeps an audit record; retired evidence remains preserved.
        </Typography>
        {findings.map((finding) => (
          <Paper key={finding.id} variant="outlined" sx={{ p: 1.75 }}>
            {editingId === finding.id ? (
              <Box component="form" onSubmit={(event) => submitEdit(event, finding)} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.25 }}>
                <TextField select name="evidenceId" label="Evidence" size="small" defaultValue={finding.evidenceId ?? ''} required>
                  {activeEvidence.map((item) => <MenuItem key={item.id} value={item.id}>{item.fileName}</MenuItem>)}
                </TextField>
                <TextField name="defectLabel" label="Defect label" size="small" defaultValue={finding.defectLabel} required />
                <TextField select name="severity" label="Severity" size="small" defaultValue={finding.severity}>
                  {SEVERITIES.map((level) => <MenuItem key={level} value={level}>{level}</MenuItem>)}
                </TextField>
                <TextField name="technicalNotes" label="Technical notes" size="small" multiline minRows={2} defaultValue={finding.technicalNotes} required sx={{ gridColumn: '1 / -1' }} />
                <TextField name="recommendedAction" label="Recommended action" size="small" multiline minRows={2} defaultValue={finding.recommendedAction ?? ''} sx={{ gridColumn: '1 / -1' }} />
                <TextField name="component" label="Component" size="small" defaultValue={finding.component ?? ''} />
                <TextField name="observedCondition" label="Observed condition" size="small" defaultValue={finding.observedCondition ?? ''} />
                <Stack direction="row" spacing={1} sx={{ gridColumn: '1 / -1' }}>
                  <Button type="submit" variant="contained" size="small" disabled={isPending || activeEvidence.length === 0}>Save finding</Button>
                  <Button size="small" onClick={() => setEditingId(null)}>Cancel</Button>
                </Stack>
              </Box>
            ) : (
              <Stack spacing={1}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                  <Typography sx={{ fontWeight: 700 }}>{finding.defectLabel}</Typography>
                  <Chip size="small" label={finding.severity} />
                  <Chip size="small" variant="outlined" label={finding.source.replaceAll('_', ' ')} />
                  {finding.inspectorConfirmedAt && <Chip size="small" color="success" label="Included in report" />}
                </Stack>
                <Typography variant="body2" color="text.secondary">{finding.locationDescription || finding.component || 'Location not supplied'}</Typography>
                <Stack direction="row" spacing={1}>
                  <Button size="small" onClick={() => setEditingId(finding.id)}>Edit</Button>
                  {deletingId === finding.id ? (
                    <>
                      <TextField size="small" label="Removal reason" value={deletionReason} onChange={(event) => setDeletionReason(event.target.value)} required />
                      <Button size="small" color="error" disabled={!deletionReason.trim() || isPending} onClick={() => { onDelete(finding.id, deletionReason.trim()); setDeletingId(null); setDeletionReason(''); }}>Confirm remove</Button>
                      <Button size="small" onClick={() => setDeletingId(null)}>Cancel</Button>
                    </>
                  ) : <Button size="small" color="error" onClick={() => { setDeletingId(finding.id); setDeletionReason(''); }}>Remove</Button>}
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
  candidates,
}: {
  findings: VerifiedFinding[];
  candidates: CandidateStatus[];
}) {
  const officialFindings = findings.filter(
    (finding) => finding.inspectorConfirmedAt != null || finding.decidedByUserId != null,
  );
  const pendingCount = candidates.filter((candidate) => candidate.status === 'PENDING').length;
  const rejectedCount = candidates.filter((candidate) => candidate.status === 'REJECTED').length;
  const severityOrder: FindingSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  const severitySummary = severityOrder
    .map((severity) => ({ severity, count: officialFindings.filter((finding) => finding.severity === severity).length }))
    .filter((item) => item.count > 0);

  return (
    <Stack spacing={2}>
      <Alert severity="info">
        This is the Inspector’s findings overview, not a reviewer decision screen. AI candidates
        remain advisory; the submitted report is reviewed as a whole on the Review report tab.
      </Alert>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <Chip label={`${officialFindings.length} Inspector-confirmed finding(s)`} color="primary" variant="outlined" />
        <Chip label={`${pendingCount} pending AI candidate(s)`} color={pendingCount ? 'warning' : 'default'} variant="outlined" />
        {rejectedCount > 0 && <Chip label={`${rejectedCount} rejected AI candidate(s)`} variant="outlined" />}
        {severitySummary.map(({ severity, count }) => <Chip key={severity} label={`${severity}: ${count}`} size="small" />)}
      </Stack>
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>Inspector findings</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Only findings included by the Inspector’s confirmation are presented as official report findings.
          Pending AI suggestions are shown separately and cannot be accepted or edited here.
        </Typography>
        {officialFindings.length === 0 ? (
          <Alert severity="info">The Inspector has not confirmed any report findings for this inspection.</Alert>
        ) : (
          <Stack spacing={1.5}>
            {officialFindings.map((finding) => (
              <Paper key={finding.id} variant="outlined" sx={{ p: 1.75 }}>
                <Stack spacing={1}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                    <Typography sx={{ fontWeight: 700 }}>{finding.defectLabel}</Typography>
                    <Chip size="small" label={finding.severity} />
                    <Chip size="small" label={finding.source.replaceAll('_', ' ')} variant="outlined" />
                    <Chip size="small" color="success" label="Inspector-confirmed" />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {finding.component ?? finding.locationDescription ?? 'Location not recorded'}
                  </Typography>
                  {finding.observedCondition && <Typography variant="body2">{finding.observedCondition}</Typography>}
                  {finding.technicalNotes && <Typography variant="body2" color="text.secondary">{finding.technicalNotes}</Typography>}
                  {finding.recommendedAction && <Typography variant="body2"><strong>Recommended action:</strong> {finding.recommendedAction}</Typography>}
                  {finding.evidenceId && <Typography variant="caption" color="text.secondary">Linked evidence · {finding.evidenceId.slice(0, 8)}…</Typography>}
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </Paper>
      {pendingCount > 0 && (
        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>Advisory AI candidates</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            These are not official findings. The assigned Inspector owns confirmation, modification or rejection.
          </Typography>
          <Stack spacing={1}>
            {candidates.filter((candidate) => candidate.status === 'PENDING').map((candidate) => (
              <Paper key={candidate.id} variant="outlined" sx={{ p: 1.5 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                  <Typography sx={{ fontWeight: 600 }}>{candidate.predictedLabel}</Typography>
                  <Chip size="small" label={`${Math.round(candidate.confidence * 100)}% confidence`} />
                  <Chip size="small" color="warning" label="Pending Inspector review" />
                  <Typography variant="caption" color="text.secondary">
                    {candidate.modelProvider ? `${candidate.modelProvider} · ` : ''}{candidate.modelName} · {candidate.modelVersion}
                  </Typography>
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
  candidates,
  showBoundingBoxes,
  highlightedCandidateId,
}: {
  inspectionId: string;
  evidence: EvidenceItem | undefined;
  candidates: NonNullable<ReturnType<typeof useFindingCandidates>['data']>;
  showBoundingBoxes: boolean;
  highlightedCandidateId: string | null;
}) {
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
        Defect photo capture · {evidence.fileName}
      </Typography>
      <Box sx={{ position: 'relative', width: '100%', lineHeight: 0 }}>
        <AuthenticatedImage
          src={inspectionApi.evidenceContentUrl(inspectionId, evidence.id)}
          alt={`Inspection evidence ${evidence.fileName}`}
          maxHeight={420}
          sx={{ borderRadius: '6px', width: '100%' }}
        />
        {showBoundingBoxes && candidates.map((candidate, index) => {
          const box = parseBoundingBox(candidate.boundingBox);
          if (!box) return null;
          const active = highlightedCandidateId === candidate.id;
          const color = ['#d32f2f', '#1976d2', '#2e7d32', '#ed6c02'][index % 4];
          return (
            <Box
              key={candidate.id}
              aria-label={`${candidate.predictedLabel}, ${Math.round(candidate.confidence * 100)} percent confidence`}
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
                  content: `"${candidate.predictedLabel} · ${Math.round(candidate.confidence * 100)}%"`,
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
