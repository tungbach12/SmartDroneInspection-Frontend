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
import { useParams } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getErrorMessage } from '@/shared/api/errorMessage';
import { inspectionApi } from '../api/inspectionApi';
import type { EvidenceItem, FindingDecision, FindingSeverity } from '../api/inspectionApi';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { FindingDecisionControls } from '../components/FindingDecisionControls';
import {
  useAnalyzeEvidence,
  useCreateManualFinding,
  useDecideFinding,
  useEvidenceQualityHistory,
  useFindingCandidates,
  useInspectionEvidence,
  useInspectionFindings,
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
 * The MF3-09 reviewer verdict is visible here on undecided findings; the Inspector only
 * recommends by confirming, modifying, or rejecting candidates.
 */
export default function InspectionFindingsPage() {
  const { inspectionId = '' } = useParams();
  const roles = useAuthStore((state) => state.roles);
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
  const reviseCandidate = useReviseReviewedCandidate(inspectionId);

  // Per-candidate review inputs, so Confirm/Modify send the values entered on that card.
  const [severities, setSeverities] = useState<Record<string, FindingSeverity>>({});
  const [locations, setLocations] = useState<Record<string, string>>({});
  const [editingCandidateId, setEditingCandidateId] = useState<string | null>(null);
  const [revisedDefectLabels, setRevisedDefectLabels] = useState<Record<string, string>>({});
  const [manualFindingEvidenceId, setManualFindingEvidenceId] = useState<string | null>(null);

  const evidenceAccepted = quality.data?.[0]?.decision === 'ACCEPTED';

  // MF3-05: advisory detection runs as soon as the evidence set is accepted. An image already
  // covered by a candidate is skipped, and one that failed is not retried automatically — the
  // manual Analyze action stays the retry path, so an inference outage cannot spin this effect.
  const analysedEvidenceIds = useMemo(
    () => new Set(candidates.data?.map((candidate) => candidate.evidenceId) ?? []),
    [candidates.data],
  );
  const autoAnalysed = useRef(new Set<string>());
  useEffect(() => {
    if (!isInspector || !evidenceAccepted || analyze.isPending) return;
    const next = (evidence.data ?? []).find(
      (item) =>
        item.contentType.startsWith('image/') &&
        !autoAnalysed.current.has(item.id) &&
        !analysedEvidenceIds.has(item.id),
    );
    if (!next) return;
    autoAnalysed.current.add(next.id);
    analyze.mutate(next.id);
  }, [isInspector, evidenceAccepted, evidence.data, analysedEvidenceIds, analyze]);

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
      locationDescription: String(formData.get('locationDescription') ?? '').trim(),
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
          Runs automatically once the evidence set is accepted. Every suggestion is a candidate
          only — nothing becomes a finding until you confirm or modify it, and the manual path
          below always stays open.
        </Typography>
        {!evidenceAccepted ? (
          <Alert severity="info">Detection starts after an accepted evidence quality decision.</Alert>
        ) : (
          <Stack spacing={1}>
            {!isInspector && (
              <Alert severity="info">Only the assigned Inspector can run advisory detection.</Alert>
            )}
            {analyze.isPending ? <Alert severity="info">Running advisory detection…</Alert> : null}
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
                const done = candidates.data?.some(
                  (candidate) => candidate.evidenceId === item.id,
                );
                return (
                  <Stack
                    key={item.id}
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {item.fileName}
                    </Typography>
                    {isInspector && (
                      <Button
                        size="small"
                        startIcon={<AutoAwesomeOutlined />}
                        disabled={analyze.isPending}
                        onClick={() => analyze.mutate(item.id)}
                      >
                        {done ? 'Re-run detection' : 'Analyze'}
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
                      color="primary"
                      variant="outlined"
                      label={`${group.candidates.length} ${group.candidates.length === 1 ? 'detected defect' : 'detected defects'}`}
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
                                        disabled={!locationFor(candidate.id).trim()}
                                        onClick={() =>
                                          reviewCandidate.mutate({
                                            candidateId: candidate.id,
                                            input: {
                                              decision: 'CONFIRMED',
                                              severity: severityFor(candidate.id),
                                              locationDescription: locationFor(candidate.id).trim(),
                                              technicalNotes: 'Confirmed by assigned Inspector',
                                            },
                                          })
                                        }
                                      >
                                        Confirm
                                      </Button>
                                      <Button
                                        size="small"
                                        disabled={!locationFor(candidate.id).trim()}
                                        onClick={() =>
                                          reviewCandidate.mutate({
                                            candidateId: candidate.id,
                                            input: {
                                              decision: 'MODIFIED',
                                              defectLabel: candidate.predictedLabel,
                                              severity: severityFor(candidate.id),
                                              locationDescription: locationFor(candidate.id).trim(),
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
                                  const isLocked = Boolean(linkedFinding?.decision);
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
                                                      locationDescription: locationFor(candidate.id).trim(),
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
                          <TextField name="locationDescription" label="Location" required size="small" slotProps={{ htmlInput: { maxLength: 1000 } }} />
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

      </Paper>

      <ReviewerVerdicts
        inspectionId={inspectionId}
        isReviewer={isReviewer}
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
  decidePending,
  decideError,
  onDecide,
}: {
  inspectionId: string;
  isReviewer: boolean;
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
              {isReviewer ? (
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
