import {
  AddPhotoAlternateOutlined,
  AutoAwesomeOutlined,
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
import { useState, useMemo, type FormEvent } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { EmptyState } from '@/shared/ui/EmptyState';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryState } from '@/shared/ui/QueryState';
import { getErrorMessage } from '@/shared/api/errorMessage';
import { InspectionListTable } from '../components/InspectionListTable';
import {
  useAnalyzeEvidence,
  useAuthorManualDraft,
  useCreateManualFinding,
  useDecideEvidenceQuality,
  useEvidenceQualityHistory,
  useFindingCandidates,
  useGenerateReportDraft,
  useInspectionEvidence,
  useInspections,
  useReviewFindingCandidate,
  useUploadInspectionEvidence,
} from '../hooks/useInspections';

export default function InspectionsPage() {
  const roles = useAuthStore((state) => state.roles);
  const isInspector = roles.includes('INSPECTOR');
  // The list endpoint serves Inspectors, same-org ORG_ADMINs and platform ADMINs. The evidence
  // workspace below it stays Inspector-only, because uploading and deciding are assigned acts.
  const canBrowse = isInspector || roles.includes('ORG_ADMIN') || roles.includes('ADMIN');
  const [activeInspectionId, setActiveInspectionId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [limitationReason, setLimitationReason] = useState('');
  const [narrative, setNarrative] = useState('');
  const [omissionDisclosure, setOmissionDisclosure] = useState('');

  const listFilters = useMemo(() => ({ page, pageSize }), [page, pageSize]);
  const inspections = useInspections(listFilters);

  const evidence = useInspectionEvidence(activeInspectionId);
  const quality = useEvidenceQualityHistory(activeInspectionId);
  const candidates = useFindingCandidates(activeInspectionId);
  const upload = useUploadInspectionEvidence(activeInspectionId);
  const decideQuality = useDecideEvidenceQuality(activeInspectionId);
  const analyze = useAnalyzeEvidence(activeInspectionId);
  const reviewCandidate = useReviewFindingCandidate(activeInspectionId);
  const createManualFinding = useCreateManualFinding(activeInspectionId);
  const createDraft = useGenerateReportDraft(activeInspectionId);
  const authorManualDraft = useAuthorManualDraft(activeInspectionId);

  const evidenceAccepted =
    quality.data?.[0]?.decision === 'ACCEPTED' || quality.data?.[0]?.decision === 'LIMITED';

  const openInspection = (inspectionId: string) => {
    setActiveInspectionId(inspectionId);
    setSelectedFile(null);
  };

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

  return (
    <Box className="workspace-page workspace-page--inspections">
      <PageHeader
        title="Inspections"
        subtitle="Review field evidence, record findings, and prepare inspection reports"
      />

      {!canBrowse ? (
        <Alert severity="info">
          The inspection list is available to Inspectors, organization administrators, and platform
          administrators. Maintenance engineers track corrective work in Maintenance.
        </Alert>
      ) : (
        <Stack spacing={2.5}>
          <QueryState
            isLoading={inspections.isLoading}
            error={inspections.error}
            isEmpty={!inspections.data?.items.length}
            onRetry={() => void inspections.refetch()}
            loadingLabel="Loading inspections…"
            empty={
              <EmptyState
                title="No inspections available"
                description="Inspections you can see will appear here."
              />
            }
          >
            <InspectionListTable
              rows={inspections.data?.items ?? []}
              page={page}
              pageSize={pageSize}
              totalCount={inspections.data?.totalCount ?? 0}
              totalPages={inspections.data?.totalPages ?? 0}
              onPageChange={setPage}
              onPageSizeChange={(next) => {
                setPageSize(next);
                setPage(1);
              }}
              onSelect={openInspection}
              selectedInspectionId={activeInspectionId}
            />
          </QueryState>

          {!isInspector && activeInspectionId ? (
            <Alert severity="info">
              You are viewing this inspection as a reader. Evidence intake, the evidence-quality
              decision, and report authoring belong to the assigned Inspector.
            </Alert>
          ) : null}

          {!isInspector || !activeInspectionId ? (
            <EmptyState
              title="No inspection selected"
              description={
                isInspector
                  ? 'Choose an inspection above to open its MF3 evidence and reporting workspace.'
                  : 'Choose an inspection above to review its record.'
              }
            />
          ) : (
            <Stack spacing={2}>
              <Alert severity="info">
                This workspace starts at MF3 evidence review. Checklist execution and inspection
                start belong to MF1/MF2 and are not available in this backend.
              </Alert>

              <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
                  <AddPhotoAlternateOutlined color="primary" />
                  <Typography variant="h6">Evidence</Typography>
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <Button component="label" variant="outlined">
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
                    onClick={() => selectedFile && upload.mutate(selectedFile)}
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
                <QueryState
                  isLoading={evidence.isLoading}
                  error={evidence.error}
                  isEmpty={!evidence.data?.length}
                  onRetry={() => void evidence.refetch()}
                  empty={
                    <Typography color="text.secondary" sx={{ mt: 2 }}>
                      No evidence uploaded yet. A failed upload keeps the selected file for retry.
                    </Typography>
                  }
                >
                  <Stack spacing={1} sx={{ mt: 2 }}>
                    {evidence.data?.map((item) => (
                      <Stack
                        key={item.id}
                        direction="row"
                        spacing={1}
                        sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                      >
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {item.fileName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.contentType} · {item.sizeBytes.toLocaleString()} bytes ·{' '}
                            {item.checksumSha256.slice(0, 12)}…
                          </Typography>
                        </Box>
                        <Button
                          size="small"
                          startIcon={<AutoAwesomeOutlined />}
                          disabled={analyze.isPending || !evidenceAccepted}
                          onClick={() => analyze.mutate(item.id)}
                        >
                          Analyze
                        </Button>
                      </Stack>
                    ))}
                    {!evidenceAccepted && evidence.data?.length ? (
                      <Alert severity="info">
                        Accept the evidence set before running advisory detection.
                      </Alert>
                    ) : null}
                  </Stack>
                </QueryState>
                {analyze.isError && (
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    {getErrorMessage(
                      analyze.error,
                      'AI analysis is unavailable; existing evidence remains available.',
                    )}
                  </Alert>
                )}

                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Evidence quality decision
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Compare the uploaded evidence against the available inspection scope and record
                  whether its coverage is adequate. Only you make this call — neither the upload
                  validator nor the model does.
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
                      disabled={decideQuality.isPending || !evidence.data?.length}
                      onClick={() => decideQuality.mutate({ decision: 'ACCEPTED' })}
                    >
                      Accept evidence set
                    </Button>
                    <Button
                      variant="outlined"
                      disabled={decideQuality.isPending || !limitationReason.trim()}
                      onClick={() =>
                        decideQuality.mutate({
                          decision: 'REUPLOAD_REQUIRED',
                          limitationReason: limitationReason.trim(),
                        })
                      }
                    >
                      Re-upload required
                    </Button>
                    <Button
                      variant="outlined"
                      disabled={decideQuality.isPending || !limitationReason.trim()}
                      onClick={() =>
                        decideQuality.mutate({
                          decision: 'ADDITIONAL_SESSION_REQUIRED',
                          limitationReason: limitationReason.trim(),
                        })
                      }
                    >
                      Additional session needed
                    </Button>
                    <Button
                      variant="outlined"
                      disabled={decideQuality.isPending || !limitationReason.trim()}
                      onClick={() =>
                        decideQuality.mutate({
                          decision: 'LIMITED',
                          limitationReason: limitationReason.trim(),
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
                                          decision: 'CONFIRM',
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
                                          decision: 'MODIFY',
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
                                          decision: 'REJECT',
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
                    {evidence.data?.map((item) => (
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
                  Report draft
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Generate an advisory draft after accepting evidence, or write a structured draft
                  yourself when automated drafting is unavailable.
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
                    Author the draft yourself
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
                    disabled={authorManualDraft.isPending || !evidenceAccepted || !narrative.trim()}
                    onClick={() =>
                      authorManualDraft.mutate({
                        narrative: narrative.trim(),
                        ...(omissionDisclosure.trim()
                          ? { omissionDisclosure: omissionDisclosure.trim() }
                          : {}),
                      })
                    }
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    {authorManualDraft.isPending ? 'Saving draft…' : 'Save structured draft'}
                  </Button>
                  {authorManualDraft.isError && (
                    <Alert severity="warning">
                      {getErrorMessage(
                        authorManualDraft.error,
                        'Accept the evidence set before authoring a draft.',
                      )}
                    </Alert>
                  )}
                </Stack>
              </Paper>
            </Stack>
          )}
        </Stack>
      )}
    </Box>
  );
}
