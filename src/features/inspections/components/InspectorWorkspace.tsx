import {
  AddPhotoAlternateOutlined,
  AutoAwesomeOutlined,
  FactCheckOutlined,
  ReportProblemOutlined,
} from '@mui/icons-material';
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
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { getErrorMessage } from '@/shared/api/errorMessage';
import {
  useAnalyzeEvidence,
  useAuthorManualDraft,
  useCreateManualFinding,
  useDecideEvidenceQuality,
  useEvidenceQualityHistory,
  useFindingCandidates,
  useGenerateReportDraft,
  useInspectionEvidence,
  useInspectionPreparations,
  useReviewFindingCandidate,
  useUploadInspectionEvidence,
} from '../hooks/useInspections';
import InspectionPreparationPanel from '../pages/InspectionPreparationPanel';
import ReadinessReviewPanel from '../pages/ReadinessReviewPanel';

interface InspectorWorkspaceProps {
  inspectionId: string;
  isInspector: boolean;
}

/**
 * The MF3 decision flow for one inspection: MF3-01/02 evidence upload, MF3-03 evidence-quality
 * decision, MF3-05 advisory detection, MF3-06 findings and MF3-07 report draft, in that order.
 *
 * This is the only place those decisions exist. The inspection-detail route renders it, so a
 * deep link to an inspection offers the same workflow the list does.
 */
export function InspectorWorkspace({ inspectionId, isInspector }: InspectorWorkspaceProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [limitationReason, setLimitationReason] = useState('');
  const [shotListComparison, setShotListComparison] = useState('');
  const [narrative, setNarrative] = useState('');
  const [omissionDisclosure, setOmissionDisclosure] = useState('');

  const evidence = useInspectionEvidence(inspectionId);
  const quality = useEvidenceQualityHistory(inspectionId);
  const candidates = useFindingCandidates(inspectionId);
  const preparations = useInspectionPreparations(inspectionId);
  const activePreparation = preparations.data?.[0];
  const activePreparationId = activePreparation?.id ?? null;
  const upload = useUploadInspectionEvidence(inspectionId);
  const decideQuality = useDecideEvidenceQuality(inspectionId);
  const analyze = useAnalyzeEvidence(inspectionId);
  const reviewCandidate = useReviewFindingCandidate(inspectionId);
  const createManualFinding = useCreateManualFinding(inspectionId);
  const createDraft = useGenerateReportDraft(inspectionId);
  const authorManualDraft = useAuthorManualDraft(inspectionId);

  // The backend gates advisory detection and draft generation on ACCEPTED alone
  // (EvidenceQualityDecision.isAccepted); LIMITED is an accepted-with-limitation decision and is
  // not eligible for either.
  const evidenceAccepted = quality.data?.[0]?.decision === 'ACCEPTED';
  // MF3-03 makes the comparison itself the input, so it is collected once and sent with whichever
  // decision the Inspector reaches.
  const comparison = shotListComparison.trim();
  const reason = limitationReason.trim();
  const isReviewer = isInspector === false;

  // MF3-05: advisory detection runs as soon as the evidence set is accepted, so the Inspector does
  // not have to remember a second click. An image already covered by a candidate is skipped, and one
  // that failed is not retried automatically — the manual Analyze action stays the retry path, so an
  // inference outage cannot spin this effect.
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

  const submitManualFinding = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const evidenceId = String(formData.get('evidenceId') ?? '');
    if (!evidenceId) return;
    createManualFinding.mutate({
      evidenceId,
      defectLabel: String(formData.get('defectLabel') ?? '').trim(),
      severity: String(formData.get('severity') ?? 'MEDIUM') as
        | 'LOW'
        | 'MEDIUM'
        | 'HIGH'
        | 'CRITICAL',
      locationDescription: String(formData.get('locationDescription') ?? '').trim(),
      technicalNotes: String(formData.get('technicalNotes') ?? '').trim(),
      recommendedAction: String(formData.get('recommendedAction') ?? '').trim(),
    });
    event.currentTarget.reset();
  };

  if (!isInspector) {
    return (
      <Alert severity="info" sx={{ borderRadius: '12px' }}>
        You are viewing this inspection as a reader. Evidence intake, the evidence-quality decision,
        and report authoring belong to the assigned Inspector.
      </Alert>
    );
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 2, sm: 3 },
        borderRadius: '16px',
        border: '1px solid #eaecf0',
        bgcolor: '#ffffff',
        boxShadow: '0 1px 3px rgba(16, 24, 40, 0.05)',
      }}
    >
      <Stack spacing={2}>
        <Alert severity="info">
          MF2 preparation comes first: record the shot-list and hazards, submit it, and an
          organization reviewer decides whether this mission may fly. Evidence review below starts
          once field work has happened.
        </Alert>

        <InspectionPreparationPanel inspectionId={inspectionId} isInspector={isInspector} />

        {isReviewer && activePreparationId ? (
          <ReadinessReviewPanel inspectionId={inspectionId} preparationId={activePreparationId} />
        ) : null}

        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
            <AddPhotoAlternateOutlined color="primary" />
            <Typography variant="h6">Step 1 · Evidence upload</Typography>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button component="label" variant="outlined" aria-label="Choose image or PDF">
              Choose image or PDF
              <input
                hidden
                type="file"
                accept="image/png,image/jpeg,application/pdf"
                onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
              />
            </Button>
            <Typography variant="body2" sx={{ alignSelf: 'center' }}>
              {selectedFile?.name ?? 'No file selected'}
            </Typography>
            <Button
              variant="contained"
              disabled={!selectedFile || upload.isPending}
              onClick={() =>
                selectedFile &&
                upload.mutate(selectedFile, { onSuccess: () => setSelectedFile(null) })
              }
            >
              {upload.isError
                ? 'Retry upload'
                : upload.isPending
                  ? 'Uploading…'
                  : 'Upload evidence'}
            </Button>
          </Stack>
          {upload.isError && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {getErrorMessage(
                upload.error,
                'Upload failed. Choose Retry upload to safely try again.',
              )}
            </Alert>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
            Stored captures appear with their previews and provenance in the Evidence register just
            below. MF3-03 asks you to compare that set against the shot-list in the preparation
            panel above before deciding.
          </Typography>
        </Paper>

        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
            <FactCheckOutlined color="primary" />
            <Typography variant="h6">Step 2 · Evidence quality decision</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            MF3-03: compare the captured set against the shot-list above — component coverage,
            focus and exposure, and the modality the scope asked for. Only you make this call;
            neither the upload validator nor the model decides whether the evidence is adequate.
          </Typography>
          {quality.data?.[0] && (
            <Chip
              size="small"
              sx={{ mb: 1 }}
              color={evidenceAccepted ? 'success' : 'warning'}
              label={quality.data[0].decision.replaceAll('_', ' ')}
            />
          )}
          <Stack spacing={1.5}>
            <TextField
              label="Shot-list comparison"
              helperText="Required. What the set covers and what it does not — the report discloses this, and a disclosed gap is not evidence of no defect."
              multiline
              minRows={2}
              value={shotListComparison}
              onChange={(event) => setShotListComparison(event.target.value)}
              slotProps={{ htmlInput: { maxLength: 8000 } }}
            />
            <TextField
              label="Limitation or reason (required for limited, re-upload or additional session)"
              multiline
              minRows={2}
              value={limitationReason}
              onChange={(event) => setLimitationReason(event.target.value)}
              slotProps={{ htmlInput: { maxLength: 2000 } }}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button
                variant="contained"
                disabled={decideQuality.isPending || !evidence.data?.length || !comparison}
                onClick={() =>
                  decideQuality.mutate({
                    decision: 'ACCEPTED',
                    shotListComparison: comparison,
                  })
                }
              >
                Accept evidence set
              </Button>
              <Button
                variant="outlined"
                disabled={decideQuality.isPending || !reason || !comparison}
                onClick={() =>
                  decideQuality.mutate({
                    decision: 'REUPLOAD_REQUIRED',
                    shotListComparison: comparison,
                    limitationReason: reason,
                  })
                }
              >
                Re-upload required
              </Button>
              <Button
                variant="outlined"
                disabled={decideQuality.isPending || !reason || !comparison}
                onClick={() =>
                  decideQuality.mutate({
                    decision: 'ADDITIONAL_SESSION_REQUIRED',
                    shotListComparison: comparison,
                    limitationReason: reason,
                  })
                }
              >
                Additional session needed
              </Button>
              <Button
                variant="outlined"
                disabled={decideQuality.isPending || !reason || !comparison}
                onClick={() =>
                  decideQuality.mutate({
                    decision: 'LIMITED',
                    shotListComparison: comparison,
                    limitationReason: reason,
                  })
                }
              >
                Accept with limitation
              </Button>
            </Stack>
          </Stack>
          {decideQuality.isError && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {getErrorMessage(decideQuality.error, 'The evidence decision was not recorded.')}
            </Alert>
          )}
        </Paper>

        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
            <AutoAwesomeOutlined color="primary" />
            <Typography variant="h6">Step 3 · Advisory detection</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Runs automatically once the evidence set is accepted. Every suggestion is a candidate
            only — nothing becomes a finding until you confirm or modify it, and the manual path
            below always stays open.
          </Typography>
          {!evidenceAccepted ? (
            <Alert severity="info">
              Detection starts after an accepted evidence quality decision.
            </Alert>
          ) : (
            <Stack spacing={1}>
              {analyze.isPending ? (
                <Alert severity="info">Running advisory detection…</Alert>
              ) : null}
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
              Step 4 · Findings
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
                          <Typography sx={{ fontWeight: 700 }}>
                            {candidate.predictedLabel}
                          </Typography>
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
                        {candidate.status === 'PENDING' && (
                          <Stack direction="row" spacing={1}>
                            <Button
                              size="small"
                              onClick={() =>
                                reviewCandidate.mutate({
                                  candidateId: candidate.id,
                                  input: {
                                    // AiFindingCandidateStatus is CONFIRMED/MODIFIED/REJECTED; the
                                    // server rejects a near-miss like "CONFIRM" with a 400.
                                    decision: 'CONFIRMED',
                                    severity: 'MEDIUM',
                                    locationDescription: 'Inspector verified location',
                                    technicalNotes: 'Confirmed by assigned Inspector',
                                  },
                                })
                              }
                            >
                              Confirm
                            </Button>
                            <Button
                              size="small"
                              onClick={() =>
                                reviewCandidate.mutate({
                                  candidateId: candidate.id,
                                  input: {
                                    decision: 'MODIFIED',
                                    defectLabel: candidate.predictedLabel,
                                    severity: 'MEDIUM',
                                    locationDescription: 'Inspector verified location',
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
                        )}
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
              {/* MUI requires children on a select, so an unloaded list still renders as an
                  empty option set rather than as a missing-children warning. */}
              {(evidence.data ?? []).map((item) => (
                <MenuItem key={item.id} value={item.id}>
                  {item.fileName}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              name="defectLabel"
              label="Defect label"
              required
              slotProps={{ htmlInput: { maxLength: 160 } }}
            />
            <TextField select name="severity" label="Severity" defaultValue="MEDIUM">
              {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((level) => (
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
        </Paper>

        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Step 5 · Report draft
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            MF3-07 proposes a value for each authored report section from the authorized sources.
            This step only creates the version; you verify and edit the sections on the report
            document, which is MF3-08. Once a version exists it is listed in the Report summary
            above, which carries the single button that opens it.
          </Typography>
          <Stack spacing={1.5} sx={{ mt: 1.5 }}>
            <Button
              variant="contained"
              disabled={createDraft.isPending || !evidenceAccepted}
              onClick={() => createDraft.mutate()}
              sx={{ alignSelf: 'flex-start' }}
            >
              {createDraft.isPending ? 'Compiling report…' : 'Generate report draft'}
            </Button>
            {createDraft.isError && (
              <Alert severity="warning">
                {getErrorMessage(
                  createDraft.error,
                  'Accept the evidence set before generating a report draft.',
                )}
              </Alert>
            )}
            <Divider />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Start a draft without the model
            </Typography>
            <Typography variant="caption" color="text.secondary">
              MF3-07 can fail or be unavailable. This seeds the version with your own narrative and
              the omitted-analysis disclosure so the same author and reviewer gates still apply; you
              then author each §3.7.2 section on the report document.
            </Typography>
            <TextField
              label="Narrative"
              multiline
              minRows={4}
              value={narrative}
              onChange={(event) => setNarrative(event.target.value)}
              slotProps={{ htmlInput: { maxLength: 10000 } }}
            />
            <TextField
              label="Omitted analysis disclosure"
              multiline
              minRows={2}
              value={omissionDisclosure}
              onChange={(event) => setOmissionDisclosure(event.target.value)}
              slotProps={{ htmlInput: { maxLength: 2000 } }}
            />
            <Button
              variant="outlined"
              disabled={!narrative.trim() || authorManualDraft.isPending}
              onClick={() => {
                const trimmedDisclosure = omissionDisclosure.trim();
                authorManualDraft.mutate(
                  trimmedDisclosure
                    ? { narrative: narrative.trim(), omissionDisclosure: trimmedDisclosure }
                    : { narrative: narrative.trim() },
                );
              }}
              sx={{ alignSelf: 'flex-start' }}
            >
              {authorManualDraft.isPending ? 'Saving draft…' : 'Save structured draft'}
            </Button>
            {authorManualDraft.isError && (
              <Alert severity="error">
                {getErrorMessage(authorManualDraft.error, 'The structured draft was not saved.')}
              </Alert>
            )}
          </Stack>
        </Paper>
      </Stack>
    </Paper>
  );
}
