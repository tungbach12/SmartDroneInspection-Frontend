import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { AutoAwesomeOutlined, ReportProblemOutlined } from '@mui/icons-material';
import {
  Alert,
  Box,
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
import type { EvidenceItem, FindingDecision, FindingSeverity } from '../api/inspectionApi';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { AiMotionFigure } from '../components/AiMotionFigure';
import { hasAutoDetectionRun, markAutoDetectionRun } from '../autoDetectionRun';
import { FindingDecisionControls } from '../components/FindingDecisionControls';
import {
  useAnalyzeEvidence,
  useCreateManualFinding,
  useConfirmFindings,
  useDecideFinding,
  useEvidenceQualityHistory,
  useFindingCandidates,
  useInspectionEvidence,
  useInspectionFindings,
  useInspectionWorkflowState,
  useReopenFindings,
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
      typeof parsed.yMax === 'number'
    ) {
      return parsed;
    }
  } catch {}
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
  const analyze = useAnalyzeEvidence(inspectionId);
  const reviewCandidate = useReviewFindingCandidate(inspectionId);
  const createManualFinding = useCreateManualFinding(inspectionId);
  const decideFinding = useDecideFinding(inspectionId);
  const findings = useInspectionFindings(inspectionId);
  const workflow = useInspectionWorkflowState(inspectionId);
  const confirmFindings = useConfirmFindings(inspectionId);
  const reopenFindings = useReopenFindings(inspectionId);
  const reportVersions = useReportVersions(inspectionId);
  const reviseCandidate = useReviseReviewedCandidate(inspectionId);
  const reportVersionsList = reportVersions.data ?? [];
  const isReportLocked = reportVersionsList.some((version) =>
    ['SUBMITTED', 'APPROVED', 'PUBLISHED', 'SUPERSEDED'].includes(version.status),
  );
  const selectedReport = reportVersionsList.reduce<(typeof reportVersionsList)[number] | null>(
    (latest, version) => (!latest || version.versionNo > latest.versionNo ? version : latest),
    null,
  );
  const canDecideFindings = Boolean(
    isReviewer &&
      selectedReport?.status === 'SUBMITTED' &&
      userId &&
      selectedReport.authorUserId !== userId,
  );

  // Per-candidate review inputs, so Confirm/Modify send the values entered on that card.
  const [severities, setSeverities] = useState<Record<string, FindingSeverity>>({});
  const [locations, setLocations] = useState<Record<string, string>>({});
  const [editingCandidateId, setEditingCandidateId] = useState<string | null>(null);
  const [revisedDefectLabels, setRevisedDefectLabels] = useState<Record<string, string>>({});
  const [manualFindingEvidenceId, setManualFindingEvidenceId] = useState<string | null>(null);
  const [noFindingsAcknowledged, setNoFindingsAcknowledged] = useState(false);

  const evidenceAccepted = quality.data?.[0]?.decision === 'ACCEPTED';
  const pendingCandidates = (candidates.data ?? []).filter((candidate) => candidate.status === 'PENDING').length;
  const reviewedItemCount = (findings.data ?? []).length + (candidates.data ?? []).filter((candidate) => candidate.status === 'REJECTED').length;
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
    !analyze.isPending &&
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
  const analysedEvidenceIds = useMemo(
    () => new Set(candidates.data?.map((candidate) => candidate.evidenceId) ?? []),
    [candidates.data],
  );
  const analysingIds = useMemo(() => new Set(analyze.analysingIds), [analyze.analysingIds]);
  const analysingFileNames = (evidence.data ?? [])
    .filter((item) => analysingIds.has(item.id))
    .map((item) => item.fileName);
  useEffect(() => {
    if (
      !isInspector ||
      !userId ||
      !evidenceAccepted ||
      !analysisUnlocked ||
      analyze.isPending ||
      candidates.isLoading ||
      !candidates.data ||
      evidence.isLoading ||
      !evidence.data
    ) {
      return;
    }
    if (!autoPassOffered.current) {
      autoPassOffered.current = true;
      if (hasAutoDetectionRun(userId, inspectionId)) return;
      markAutoDetectionRun(userId, inspectionId);
    }
    const pending = (evidence.data ?? []).filter(
      (item) =>
        item.contentType.startsWith('image/') &&
        !autoAnalysed.current.has(item.id) &&
        !analysedEvidenceIds.has(item.id),
    );
    if (pending.length === 0) return;
    pending.forEach((item) => autoAnalysed.current.add(item.id));
    void analyze.analyzeMany(pending.map((item) => item.id));
  }, [
    isInspector,
    userId,
    inspectionId,
    evidenceAccepted,
    analysisUnlocked,
    candidates.isLoading,
    candidates.data,
    evidence.isLoading,
    evidence.data,
    analysedEvidenceIds,
    analyze.analyzeMany,
    analyze.isPending,
  ]);

  const severityFor = (candidateId: string): FindingSeverity =>
    severities[candidateId] ?? 'MEDIUM';
  const locationFor = (candidateId: string): string => locations[candidateId] ?? '';
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
    for (const item of evidence.data ?? []) {
      groups.set(item.id, { evidenceId: item.id, evidence: item, candidates: [] });
    }
    for (const candidate of candidates.data ?? []) {
      const group = groups.get(candidate.evidenceId) ?? {
        evidenceId: candidate.evidenceId,
        evidence: undefined,
        candidates: [],
      };
      group.candidates.push(candidate);
      groups.set(candidate.evidenceId, group);
    }
    return [...groups.values()];
  }, [candidates.data, evidence.data]);

  const submitManualFinding = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const evidenceId = String(formData.get('evidenceId') ?? '');
    if (!evidenceId) return;
    createManualFinding.mutate({
      evidenceId,
      defectLabel: String(formData.get('defectLabel') ?? '').trim(),
      severity: String(formData.get('severity') ?? 'MEDIUM') as FindingSeverity,
      locationDescription: String(formData.get('locationDescription') ?? '').trim() || undefined,
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
            {analyze.isPending ? (
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
            {isInspector && analyze.isError && (
              <Alert severity="warning">
                {getErrorMessage(
                  analyze.error,
                  'AI analysis is unavailable; existing evidence remains available.',
                )}
              </Alert>
            )}
            {evidence.data
              ?.filter((item) => item.contentType.startsWith('image/'))
              .map((item) => {
                const done = analysedEvidenceIds.has(item.id);
                const isAnalysing = analysingIds.has(item.id);
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
                          label="Detection complete"
                        />
                      )}
                    </Stack>
                    {isInspector && analysisUnlocked && (
                      <Button
                        size="small"
                        startIcon={isAnalysing ? <AiMotionFigure name="advisoryLens" size={18} /> : <AutoAwesomeOutlined />}
                        disabled={isAnalysing}
                        onClick={() => void analyze.analyzeMany([item.id], { replace: done })}
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
                        defectLabel={group.candidates[0]?.predictedLabel ?? 'Defect photo'}
                      />
                    </Box>

                    <Stack spacing={1.5}>
                      {group.candidates.map((candidate) => {
                        const box = parseBoundingBox(candidate.boundingBox);
                        return (
                          <Card key={candidate.id} variant="outlined" sx={{ borderRadius: '8px' }}>
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
                                  {candidate.modelName} · {candidate.modelVersion}
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
                                        label={`Location for ${candidate.predictedLabel}`}
                                        value={locationFor(candidate.id)}
                                        onChange={(event) =>
                                          setLocations((prev) => ({
                                            ...prev,
                                            [candidate.id]: event.target.value,
                                          }))
                                        }
                                        slotProps={{ htmlInput: { maxLength: 1000 } }}
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
                                  const isLocked = Boolean(linkedFinding?.decision) || isReportLocked;
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
                                          <Chip
                                            size="small"
                                            color={linkedFinding?.decision === 'REJECTED' ? 'error' : 'success'}
                                            label={`Reviewer: ${linkedFinding?.decision}`}
                                          />
                                        ) : isReportLocked ? (
                                          <Chip size="small" color="default" label="Locked by submitted report" />
                                        ) : (
                                          <Chip
                                            size="small"
                                            color="warning"
                                            variant="outlined"
                                            label="Awaiting ORG_ADMIN verdict"
                                          />
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
                                                setLocations((prev) => ({
                                                  ...prev,
                                                  [candidate.id]: linkedFinding?.locationDescription ?? '',
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
                                            Correct candidate recommendation (before Organization Admin decision):
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
                                                label="Location"
                                                value={locationFor(candidate.id)}
                                                onChange={(event) =>
                                                  setLocations((prev) => ({
                                                    ...prev,
                                                    [candidate.id]: event.target.value,
                                                  }))
                                                }
                                                slotProps={{ htmlInput: { maxLength: 1000 } }}
                                                sx={{ flexGrow: 1 }}
                                              />
                                            </Stack>
                                            <Stack direction="row" spacing={1}>
                                              <Button
                                                size="small"
                                                variant="contained"
                                                disabled={reviseCandidate.isPending || !locationFor(candidate.id).trim()}
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

                                      {isReviewer && !isLocked && (
                                        <Typography variant="caption" color="text.secondary">
                                          Reviewed: {candidate.status}. The reviewer verdict on the finding is shown
                                          on the Reviewer Verdicts register below.
                                        </Typography>
                                      )}
                                    </Stack>
                                  );
                                })()}
                              </Stack>
                            </CardContent>
                          </Card>
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
                          <TextField name="locationDescription" label="Location (optional)" size="small" slotProps={{ htmlInput: { maxLength: 1000 } }} />
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

      <ReviewerVerdicts
        inspectionId={inspectionId}
        isReviewer={isReviewer}
        canDecideFindings={canDecideFindings}
        decidePending={decideFinding.isPending}
        decideError={decideFinding.isError ? decideFinding.error : null}
        onDecide={(findingId, decision, rationale) =>
          decideFinding.mutate({ findingId, decision, rationale })
        }
      />
    </Stack>
  );
}

function ReviewerVerdicts({
  inspectionId,
  isReviewer,
  canDecideFindings,
  decidePending,
  decideError,
  onDecide,
}: {
  inspectionId: string;
  isReviewer: boolean;
  canDecideFindings: boolean;
  decidePending: boolean;
  decideError: unknown;
  onDecide: (findingId: string, decision: FindingDecision, rationale: string) => void;
}) {
  const findings = useInspectionFindings(inspectionId);
  const undecided = (findings.data ?? []).filter((finding) => !finding.decision);
  if (undecided.length === 0) return null;
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          Reviewer Verdicts (Organization Admin)
        </Typography>
        <Chip size="small" color="warning" label={`${undecided.length} awaiting decision`} />
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {isReviewer
          ? 'As Organization Admin, review and confirm or reject these candidate findings. Only confirmed or modified findings enter official report statistics and corrective maintenance.'
          : 'These findings were recommended by the assigned Inspector and are awaiting final review decision by an Organization Admin before entering the official report.'}
      </Typography>
      <Stack spacing={1.5}>
        {undecided.map((finding) => (
          <Paper key={finding.id} variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
            <Stack spacing={1.5}>
              <Box>
                <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  {finding.defectLabel}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {finding.locationDescription}
                </Typography>
              </Box>
              {finding.evidenceId && (
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
                    Defect photo capture
                  </Typography>
                  <AuthenticatedImage
                    src={inspectionApi.evidenceContentUrl(inspectionId, finding.evidenceId)}
                    alt={finding.defectLabel}
                    maxHeight={160}
                    sx={{ borderRadius: '6px', width: '100%' }}
                  />
                </Box>
              )}
              {canDecideFindings ? (
                <FindingDecisionControls
                  findingId={finding.id}
                  defectLabel={finding.defectLabel}
                  isPending={decidePending}
                  error={decideError}
                  onDecide={onDecide}
                />
              ) : (
                <Alert severity="info">
                  Finding “{finding.defectLabel}” awaits the reviewer verdict.
                </Alert>
              )}
            </Stack>
          </Paper>
        ))}
      </Stack>
    </Paper>
  );
}

/**
 * The defect photo behind one candidate, resolved from the evidence list by
 * `evidenceId`. Non-image captures have no inline preview; a missing entry
 * renders nothing rather than a broken image.
 */
function CandidatePhoto({
  inspectionId,
  evidence,
  defectLabel,
}: {
  inspectionId: string;
  evidence: EvidenceItem | undefined;
  defectLabel: string;
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
      <AuthenticatedImage
        src={inspectionApi.evidenceContentUrl(inspectionId, evidence.id)}
        alt={defectLabel}
        maxHeight={220}
        sx={{ borderRadius: '6px', width: '100%' }}
      />
    </Box>
  );
}
