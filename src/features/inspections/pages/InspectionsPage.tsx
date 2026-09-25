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
import { useState, type FormEvent } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useCreateReportDraft } from '@/features/reports/hooks/useReports';
import { EmptyState } from '@/shared/ui/EmptyState';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryState } from '@/shared/ui/QueryState';
import { getErrorMessage } from '@/shared/api/errorMessage';
import {
  useAnalyzeEvidence,
  useCreateManualFinding,
  useFindingCandidates,
  useInspectionAssignments,
  useInspectionChecklist,
  useInspectionEvidence,
  useReviewFindingCandidate,
  useSaveChecklistResponse,
  useStartInspection,
  useUploadInspectionEvidence,
} from '../hooks/useInspections';
import type {
  InspectionChecklistItem,
  InspectionAssignment,
} from '../api/inspectionApi';

function checklistChoices(item: InspectionChecklistItem): string[] {
  if (!item.validationConfig) return [];
  try {
    const choices: unknown = JSON.parse(item.validationConfig).choices;
    return Array.isArray(choices)
      ? choices.filter((choice): choice is string => typeof choice === 'string')
      : [];
  } catch {
    return [];
  }
}

function checklistValue(item: InspectionChecklistItem, value: string): unknown {
  if (item.responseType === 'BOOLEAN') return value === 'true';
  if (item.responseType === 'NUMBER') return Number(value);
  return value;
}

export default function InspectionsPage() {
  const roles = useAuthStore((state) => state.roles);
  const isInspector = roles.includes('INSPECTOR');
  const assignments = useInspectionAssignments(isInspector);
  const startInspection = useStartInspection();
  const createDraft = useCreateReportDraft();
  const [activeInspectionId, setActiveInspectionId] = useState<string | null>(null);
  const [checklistDrafts, setChecklistDrafts] = useState<Record<string, string>>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const checklist = useInspectionChecklist(activeInspectionId);
  const evidence = useInspectionEvidence(activeInspectionId);
  const candidates = useFindingCandidates(activeInspectionId);
  const saveResponse = useSaveChecklistResponse(activeInspectionId);
  const upload = useUploadInspectionEvidence(activeInspectionId);
  const analyze = useAnalyzeEvidence(activeInspectionId);
  const reviewCandidate = useReviewFindingCandidate(activeInspectionId);
  const createManualFinding = useCreateManualFinding(activeInspectionId);

  const handleOpenAssignment = async (assignment: InspectionAssignment) => {
    try {
      const started = await startInspection.mutateAsync(assignment.assignmentId);
      setActiveInspectionId(started.inspectionId);
      setChecklistDrafts({});
      setSelectedFile(null);
    } catch {
      // Mutation state below renders the backend's problem detail and allows retry.
    }
  };

  const saveChecklistItem = (item: InspectionChecklistItem) => {
    const current =
      checklistDrafts[item.itemId] ??
      (item.responseValue?.value === undefined || item.responseValue?.value === null
        ? ''
        : String(item.responseValue.value));
    if (item.required && current.trim().length === 0) return;
    if (item.responseType === 'NUMBER' && !Number.isFinite(Number(current))) return;
    saveResponse.mutate({
      itemId: item.itemId,
      value: { value: checklistValue(item, current) },
    });
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
    <Box>
      <PageHeader
        title="Inspections"
        subtitle="Complete assigned checklists, capture evidence, and verify findings"
      />

      {!isInspector ? (
        <Alert severity="info">
          Inspection execution is available to assigned Inspectors. Released results are in Reports.
        </Alert>
      ) : (
        <Stack spacing={2.5}>
          {startInspection.isError && (
            <Alert severity="error">
              {getErrorMessage(startInspection.error, 'Could not open this inspection.')}
            </Alert>
          )}
          <QueryState
            isLoading={assignments.isLoading}
            error={assignments.error}
            isEmpty={!assignments.data?.length}
            onRetry={() => void assignments.refetch()}
            empty={
              <EmptyState
                title="No accepted assignments"
                description="Accepted inspection assignments from your Service Manager will appear here."
              />
            }
          >
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(280px, 0.8fr) minmax(0, 1.5fr)' }, gap: 2 }}>
              <Stack spacing={1.5}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>Assigned work</Typography>
                {assignments.data?.map((assignment) => (
                  <Card key={assignment.assignmentId} variant="outlined">
                    <CardContent>
                      <Stack spacing={1.25}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                          Asset {assignment.assetId.slice(0, 8)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Order {assignment.serviceOrderId.slice(0, 8)}
                          {assignment.deadline ? ` · Due ${new Date(assignment.deadline).toLocaleDateString()}` : ''}
                        </Typography>
                        <Button
                          variant="contained"
                          disabled={startInspection.isPending}
                          onClick={() => void handleOpenAssignment(assignment)}
                        >
                          {assignment.inspectionId ? 'Resume inspection' : 'Start inspection'}
                        </Button>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>

              {!activeInspectionId ? (
                <Paper variant="outlined" sx={{ p: 3, alignSelf: 'start' }}>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>Field record</Typography>
                  <Typography color="text.secondary" sx={{ mt: 1 }}>
                    Open an accepted assignment to load its versioned checklist and evidence workspace.
                  </Typography>
                </Paper>
              ) : (
                <Stack spacing={2}>
                  <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
                      <FactCheckOutlined color="primary" />
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>Checklist</Typography>
                      <Chip size="small" label={activeInspectionId.slice(0, 8)} />
                    </Stack>
                    <QueryState
                      isLoading={checklist.isLoading}
                      error={checklist.error}
                      isEmpty={!checklist.data?.length}
                      onRetry={() => void checklist.refetch()}
                      empty={<Typography color="text.secondary">No checklist items were returned for this inspection.</Typography>}
                    >
                      <Stack spacing={2}>
                        {checklist.data?.map((item) => {
                          const rawValue = item.responseValue?.value;
                          const value = checklistDrafts[item.itemId] ??
                            (rawValue === undefined || rawValue === null ? '' : String(rawValue));
                          const choices = checklistChoices(item);
                          const isSelect = item.responseType === 'PASS_FAIL' ||
                            item.responseType === 'BOOLEAN' ||
                            (item.responseType === 'CHOICE' && choices.length > 0);
                          const options = item.responseType === 'PASS_FAIL'
                            ? ['PASS', 'FAIL']
                            : item.responseType === 'BOOLEAN'
                              ? ['true', 'false']
                              : choices;
                          return (
                            <Box key={item.itemId}>
                              <Stack spacing={1}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                  {item.sectionName ? `${item.sectionName} · ` : ''}{item.itemCode}{item.required ? ' *' : ''}
                                </Typography>
                                <Typography variant="body2">{item.prompt}</Typography>
                                {isSelect ? (
                                  <TextField
                                    select
                                    size="small"
                                    label="Response"
                                    value={value}
                                    onChange={(event) => setChecklistDrafts((drafts) => ({ ...drafts, [item.itemId]: event.target.value }))}
                                  >
                                    {options.map((option) => (
                                      <MenuItem key={option} value={option}>{option === 'true' ? 'Yes' : option === 'false' ? 'No' : option}</MenuItem>
                                    ))}
                                  </TextField>
                                ) : (
                                  <TextField
                                    size="small"
                                    label={item.responseType === 'NUMBER' ? 'Numeric response' : 'Response'}
                                    type={item.responseType === 'NUMBER' ? 'number' : 'text'}
                                    value={value}
                                    onChange={(event) => setChecklistDrafts((drafts) => ({ ...drafts, [item.itemId]: event.target.value }))}
                                  />
                                )}
                                {item.guidance && <Typography variant="caption" color="text.secondary">{item.guidance}</Typography>}
                                <Button
                                  size="small"
                                  variant="outlined"
                                  disabled={saveResponse.isPending || (item.required && !value.trim())}
                                  onClick={() => saveChecklistItem(item)}
                                  sx={{ alignSelf: 'flex-start' }}
                                >
                                  {saveResponse.isPending ? 'Saving…' : 'Save response'}
                                </Button>
                              </Stack>
                              <Divider sx={{ mt: 2 }} />
                            </Box>
                          );
                        })}
                      </Stack>
                    </QueryState>
                    {saveResponse.isError && <Alert severity="error" sx={{ mt: 1 }}>{getErrorMessage(saveResponse.error, 'Could not save the checklist response.')}</Alert>}
                  </Paper>

                  <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
                      <AddPhotoAlternateOutlined color="primary" />
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>Evidence</Typography>
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
                        {upload.isError ? 'Retry upload' : upload.isPending ? 'Uploading…' : 'Upload evidence'}
                      </Button>
                    </Stack>
                    {upload.isError && <Alert severity="error" sx={{ mt: 1 }}>{getErrorMessage(upload.error, 'Upload failed. Choose Retry upload to safely try again.')}</Alert>}
                    <QueryState
                      isLoading={evidence.isLoading}
                      error={evidence.error}
                      isEmpty={!evidence.data?.length}
                      onRetry={() => void evidence.refetch()}
                      empty={<Typography color="text.secondary" sx={{ mt: 2 }}>No evidence uploaded yet. A failed upload keeps the selected file for retry.</Typography>}
                    >
                      <Stack spacing={1} sx={{ mt: 2 }}>
                        {evidence.data?.map((item) => (
                          <Stack key={item.evidenceId} direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>{item.fileName}</Typography>
                              <Typography variant="caption" color="text.secondary">{item.contentType} · {item.sizeBytes.toLocaleString()} bytes · {item.checksumSha256.slice(0, 12)}…</Typography>
                            </Box>
                            <Button size="small" startIcon={<AutoAwesomeOutlined />} disabled={analyze.isPending} onClick={() => analyze.mutate(item.evidenceId)}>
                              Analyze
                            </Button>
                          </Stack>
                        ))}
                      </Stack>
                    </QueryState>
                    {analyze.isError && <Alert severity="warning" sx={{ mt: 1 }}>{getErrorMessage(analyze.error, 'AI analysis is unavailable; existing evidence remains available.')}</Alert>}
                  </Paper>

                  <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
                      <ReportProblemOutlined color="primary" />
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>Findings</Typography>
                    </Stack>
                    {candidates.isLoading ? (
                      <Typography color="text.secondary">Loading candidate reviews…</Typography>
                    ) : candidates.isError ? (
                      <Alert severity="error" action={<Button color="inherit" onClick={() => void candidates.refetch()}>Retry</Button>}>Could not load findings.</Alert>
                    ) : (
                      <Stack spacing={1.5}>
                        {candidates.data?.length ? candidates.data.map((candidate) => (
                          <Card key={candidate.id} variant="outlined">
                            <CardContent>
                              <Stack spacing={1}>
                                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                  <Typography sx={{ fontWeight: 700 }}>{candidate.predictedLabel}</Typography>
                                  <Chip size="small" label={`${Math.round(candidate.confidence * 100)}% confidence`} />
                                  <Chip size="small" color={candidate.status === 'PENDING' ? 'warning' : 'default'} label={candidate.status} />
                                </Stack>
                                <Typography variant="caption" color="text.secondary">{candidate.modelName} · {candidate.modelVersion}</Typography>
                                {candidate.status === 'PENDING' && (
                                  <Stack direction="row" spacing={1}>
                                    <Button size="small" onClick={() => reviewCandidate.mutate({ candidateId: candidate.id, input: { decision: 'CONFIRM', severity: 'MEDIUM', locationDescription: 'Inspector verified location', technicalNotes: 'Confirmed by assigned Inspector' } })}>Confirm</Button>
                                    <Button size="small" onClick={() => reviewCandidate.mutate({ candidateId: candidate.id, input: { decision: 'MODIFY', defectLabel: candidate.predictedLabel, severity: 'MEDIUM', locationDescription: 'Inspector verified location', technicalNotes: 'Modified by assigned Inspector' } })}>Modify</Button>
                                    <Button size="small" color="error" onClick={() => reviewCandidate.mutate({ candidateId: candidate.id, input: { decision: 'REJECT', rejectionReason: 'Inspector marked as false positive' } })}>Reject</Button>
                                  </Stack>
                                )}
                              </Stack>
                            </CardContent>
                          </Card>
                        )) : <Typography color="text.secondary">No AI candidates yet. Analyze an eligible image or add a manual finding.</Typography>}
                        {reviewCandidate.isError && <Alert severity="error">{getErrorMessage(reviewCandidate.error, 'Candidate review was not saved.')}</Alert>}
                      </Stack>
                    )}
                    <Divider sx={{ my: 2 }} />
                    <Box component="form" onSubmit={submitManualFinding} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, gridColumn: '1 / -1' }}>Add manual finding</Typography>
                      <TextField select name="evidenceId" label="Evidence" required defaultValue="">
                        {evidence.data?.map((item) => <MenuItem key={item.evidenceId} value={item.evidenceId}>{item.fileName}</MenuItem>)}
                      </TextField>
                      <TextField name="defectLabel" label="Defect label" required slotProps={{ htmlInput: { maxLength: 160 } }} />
                      <TextField select name="severity" label="Severity" defaultValue="MEDIUM">
                        {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((level) => <MenuItem key={level} value={level}>{level}</MenuItem>)}
                      </TextField>
                      <TextField name="locationDescription" label="Location" required slotProps={{ htmlInput: { maxLength: 1000 } }} />
                      <TextField name="technicalNotes" label="Technical notes" required multiline minRows={2} sx={{ gridColumn: '1 / -1' }} slotProps={{ htmlInput: { maxLength: 4000 } }} />
                      <TextField name="recommendedAction" label="Recommended action" multiline minRows={2} sx={{ gridColumn: '1 / -1' }} slotProps={{ htmlInput: { maxLength: 4000 } }} />
                      <Button type="submit" variant="outlined" disabled={!evidence.data?.length || createManualFinding.isPending} sx={{ justifySelf: 'start' }}>
                        {createManualFinding.isPending ? 'Saving finding…' : 'Save manual finding'}
                      </Button>
                    </Box>
                    {createManualFinding.isError && <Alert severity="error" sx={{ mt: 1 }}>{getErrorMessage(createManualFinding.error, 'Manual finding was not saved.')}</Alert>}
                  </Paper>

                  <Button
                    variant="contained"
                    disabled={createDraft.isPending}
                    onClick={() => createDraft.mutate(activeInspectionId)}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    {createDraft.isPending ? 'Compiling report…' : 'Create report draft'}
                  </Button>
                  {createDraft.isError && <Alert severity="warning">{getErrorMessage(createDraft.error, 'Complete required checklist items and upload evidence before compiling the draft.')}</Alert>}
                </Stack>
              )}
            </Box>
          </QueryState>
        </Stack>
      )}
    </Box>
  );
}
