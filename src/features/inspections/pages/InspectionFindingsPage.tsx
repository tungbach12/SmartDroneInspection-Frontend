import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { AutoAwesomeOutlined, ReportProblemOutlined } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
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
} from '../hooks/useInspections';

const SEVERITIES: FindingSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

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

  // Per-candidate review inputs, so Confirm/Modify send the values entered on that card.
  const [severities, setSeverities] = useState<Record<string, FindingSeverity>>({});
  const [locations, setLocations] = useState<Record<string, string>>({});

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
    if (!evidenceAccepted || analyze.isPending) return;
    const next = (evidence.data ?? []).find(
      (item) =>
        item.contentType.startsWith('image/') &&
        !autoAnalysed.current.has(item.id) &&
        !analysedEvidenceIds.has(item.id),
    );
    if (!next) return;
    autoAnalysed.current.add(next.id);
    analyze.mutate(next.id);
  }, [evidenceAccepted, evidence.data, analysedEvidenceIds, analyze]);

  const severityFor = (candidateId: string): FindingSeverity =>
    severities[candidateId] ?? 'MEDIUM';
  const locationFor = (candidateId: string): string => locations[candidateId] ?? '';
  const evidenceFor = (evidenceId: string): EvidenceItem | undefined =>
    (evidence.data ?? []).find((item) => item.id === evidenceId);

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
            {analyze.isPending ? <Alert severity="info">Running advisory detection…</Alert> : null}
            {analyze.isError && (
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
                    <Button
                      size="small"
                      startIcon={<AutoAwesomeOutlined />}
                      disabled={analyze.isPending}
                      onClick={() => analyze.mutate(item.id)}
                    >
                      {done ? 'Re-run detection' : 'Analyze'}
                    </Button>
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
          <Stack spacing={1.5}>
            {candidates.data?.length ? (
              candidates.data.map((candidate) => (
                <Card key={candidate.id} variant="outlined">
                  <CardContent>
                    <Stack spacing={1}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
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
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {candidate.modelName} · {candidate.modelVersion}
                      </Typography>
                      <CandidatePhoto
                        inspectionId={inspectionId}
                        evidence={evidenceFor(candidate.evidenceId)}
                        defectLabel={candidate.predictedLabel}
                      />
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
                                    // AiFindingCandidateStatus is CONFIRMED/MODIFIED/REJECTED; the
                                    // server rejects a near-miss like "CONFIRM" with a 400.
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
                      {isReviewer && candidate.status !== 'PENDING' ? (
                        <Typography variant="caption" color="text.secondary">
                          Reviewed: {candidate.status}. The reviewer verdict on the finding is shown
                          on the findings register below.
                        </Typography>
                      ) : null}
                    </Stack>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Typography color="text.secondary">
                No AI candidates yet. Analyze an eligible image or add a manual finding.
              </Typography>
            )}
            {reviewCandidate.isError && (
              <Alert severity="error">
                {getErrorMessage(reviewCandidate.error, 'Candidate review was not saved.')}
              </Alert>
            )}
          </Stack>
        )}

        {isInspector && (
          <>
            <Divider sx={{ my: 2 }} />
            <Box
              component="form"
              onSubmit={submitManualFinding}
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 1.5,
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 700, gridColumn: '1 / -1' }}>
                Add manual finding
              </Typography>
              <TextField select name="evidenceId" label="Evidence" required defaultValue="">
                {(evidence.data ?? []).map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.fileName}
                  </MenuItem>
                ))}
              </TextField>
              <TextField name="defectLabel" label="Defect label" required slotProps={{ htmlInput: { maxLength: 160 } }} />
              <TextField select name="severity" label="Severity" defaultValue="MEDIUM">
                {SEVERITIES.map((level) => (
                  <MenuItem key={level} value={level}>
                    {level}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                name="locationDescription"
                label="Location"
                required
                slotProps={{ htmlInput: { maxLength: 1000 } }}
              />
              <TextField
                name="technicalNotes"
                label="Technical notes"
                required
                multiline
                minRows={2}
                sx={{ gridColumn: '1 / -1' }}
                slotProps={{ htmlInput: { maxLength: 4000 } }}
              />
              <TextField
                name="recommendedAction"
                label="Recommended action"
                multiline
                minRows={2}
                sx={{ gridColumn: '1 / -1' }}
                slotProps={{ htmlInput: { maxLength: 4000 } }}
              />
              <Button
                type="submit"
                variant="outlined"
                disabled={!evidence.data?.length || createManualFinding.isPending}
                sx={{ justifySelf: 'start' }}
              >
                {createManualFinding.isPending ? 'Saving finding…' : 'Save manual finding'}
              </Button>
            </Box>
            {createManualFinding.isError && (
              <Alert severity="error" sx={{ mt: 1 }}>
                {getErrorMessage(createManualFinding.error, 'Manual finding was not saved.')}
              </Alert>
            )}
          </>
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
    <Stack spacing={1.5}>
      {undecided.map((finding) => (
        <Paper key={finding.id} variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
          <Stack spacing={1.5}>
            <Box>
              <Typography variant="body1" sx={{ fontWeight: 700, color: '#101828' }}>
                {finding.defectLabel}
              </Typography>
              <Typography variant="body2" sx={{ color: '#475467' }}>
                {finding.locationDescription}
              </Typography>
            </Box>
            {finding.evidenceId && (
              <Box
                sx={{
                  borderRadius: '10px',
                  border: '1px solid #eaecf0',
                  overflow: 'hidden',
                  p: 1.25,
                  bgcolor: '#f8fafc',
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 600, color: '#64748b', display: 'block', mb: 0.75 }}>
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
        border: '1px solid #eaecf0',
        overflow: 'hidden',
        p: 1.25,
        bgcolor: '#f8fafc',
      }}
    >
      <Typography variant="caption" sx={{ fontWeight: 600, color: '#64748b', display: 'block', mb: 0.75 }}>
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
