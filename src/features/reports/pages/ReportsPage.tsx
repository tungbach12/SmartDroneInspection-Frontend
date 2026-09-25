import {
  DownloadOutlined,
  HistoryOutlined,
  RateReviewOutlined,
  VerifiedOutlined,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMemo, useState } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getErrorMessage } from '@/shared/api/errorMessage';
import { EmptyState } from '@/shared/ui/EmptyState';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryState } from '@/shared/ui/QueryState';
import { reportApi } from '../api/reportApi';
import {
  useAssignReportReviewer,
  useClientReportDecision,
  useCreateReportRevision,
  useReleaseReport,
  useReports,
  useReviewReport,
  useSubmitReportForReview,
} from '../hooks/useReports';

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleString() : '—';
}

export default function ReportsPage() {
  const roles = useAuthStore((state) => state.roles);
  const userId = useAuthStore((state) => state.userId);
  const isClient = roles.includes('CLIENT');
  const isManager = roles.includes('SERVICE_MANAGER');
  const isInspector = roles.includes('INSPECTOR');
  const query = useReports();
  const assignReviewer = useAssignReportReviewer();
  const submit = useSubmitReportForReview();
  const review = useReviewReport();
  const release = useReleaseReport();
  const decision = useClientReportDecision();
  const revision = useCreateReportRevision();
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [reviewerId, setReviewerId] = useState('');
  const [reviewComments, setReviewComments] = useState('');
  const [clientReason, setClientReason] = useState('');
  const [evidenceError, setEvidenceError] = useState<string | null>(null);

  const selected = useMemo(
    () =>
      query.data?.find((report) => report.reportId === selectedReportId) ??
      query.data?.[0] ??
      null,
    [query.data, selectedReportId],
  );
  const isAuthor = Boolean(selected && userId === selected.authorUserId);
  const isAssignedReviewer = Boolean(
    selected && userId === selected.review?.reviewerUserId,
  );

  const downloadEvidence = async (evidenceId: string, fileName: string) => {
    if (!selected) return;
    setEvidenceError(null);
    try {
      const blob = await reportApi.evidenceContent(
        selected.reportId,
        selected.versionId,
        evidenceId,
      );
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setEvidenceError(getErrorMessage(error, 'Evidence could not be downloaded.'));
    }
  };

  const mutationError = [
    assignReviewer.error,
    submit.error,
    review.error,
    release.error,
    decision.error,
    revision.error,
  ].find(Boolean);

  return (
    <Box>
      <PageHeader
        title="Reports"
        subtitle="Review, release, and accept versioned inspection results"
      />
      <QueryState
        isLoading={query.isLoading}
        error={query.error}
        isEmpty={!query.data?.length}
        onRetry={() => void query.refetch()}
        empty={
          <EmptyState
            title="No reports available"
            description="Drafts appear to their Inspector and reviewer; Clients see only released reports for their organization."
          />
        }
      >
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(280px, 0.8fr) minmax(0, 1.5fr)' }, gap: 2 }}>
          <Stack spacing={1.5}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Report queue</Typography>
            {query.data?.map((report) => (
              <Card
                key={report.reportId}
                variant="outlined"
                sx={{ borderColor: selected?.reportId === report.reportId ? 'primary.main' : undefined }}
              >
                <CardActionArea onClick={() => setSelectedReportId(report.reportId)}>
                  <CardContent>
                    <Stack spacing={1}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 750 }}>
                        Asset {report.contentSnapshot.assetId.slice(0, 8)} · v{report.versionNumber}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {report.contentSnapshot.checklistName} · {report.contentSnapshot.findings.length} verified findings
                      </Typography>
                      <Chip size="small" label={report.versionStatus.replaceAll('_', ' ')} sx={{ alignSelf: 'flex-start' }} />
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            ))}
          </Stack>

          {selected && (
            <Stack spacing={2}>
              <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                    <VerifiedOutlined color="primary" />
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      {selected.contentSnapshot.checklistName}
                    </Typography>
                    <Chip size="small" label={`Version ${selected.versionNumber}`} />
                    <Chip size="small" color={selected.versionStatus === 'RELEASED' || selected.versionStatus === 'ACCEPTED' ? 'success' : 'default'} label={selected.versionStatus.replaceAll('_', ' ')} />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    Asset {selected.contentSnapshot.assetId} · Inspection {selected.inspectionId}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Snapshot generated {formatDate(selected.contentSnapshot.generatedAt)} · Created {formatDate(selected.createdAt)}
                  </Typography>
                  {selected.sourceVersionId && <Typography variant="caption" color="text.secondary">Revises version {selected.sourceVersionId}</Typography>}
                  {selected.clientDecisionReason && <Alert severity="info">Client requested revision: {selected.clientDecisionReason}</Alert>}
                </Stack>
              </Paper>

              {isManager && selected.versionStatus === 'DRAFT' && (
                <Paper variant="outlined" sx={{ p: 2.5 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 750, mb: 1 }}>Assign independent Inspector review</Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                    <TextField
                      label="Reviewer user ID"
                      value={reviewerId}
                      onChange={(event) => setReviewerId(event.target.value)}
                      size="small"
                      fullWidth
                    />
                    <Button
                      variant="contained"
                      disabled={!reviewerId.trim() || assignReviewer.isPending}
                      onClick={() => assignReviewer.mutate({ reportId: selected.reportId, versionId: selected.versionId, reviewerId: reviewerId.trim() })}
                    >
                      Assign reviewer
                    </Button>
                  </Stack>
                </Paper>
              )}

              {isAuthor && selected.versionStatus === 'DRAFT' && selected.review?.decision === 'PENDING' && (
                <Button
                  variant="contained"
                  disabled={submit.isPending}
                  onClick={() => submit.mutate({ reportId: selected.reportId, versionId: selected.versionId })}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  Submit for peer review
                </Button>
              )}

              {isAssignedReviewer && isInspector && selected.versionStatus === 'AWAITING_PEER_REVIEW' && (
                <Paper variant="outlined" sx={{ p: 2.5 }}>
                  <Stack spacing={1.5}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <RateReviewOutlined color="primary" />
                      <Typography variant="subtitle1" sx={{ fontWeight: 750 }}>Independent technical review</Typography>
                    </Stack>
                    <TextField
                      label="Review comments (required when requesting changes)"
                      multiline
                      minRows={2}
                      value={reviewComments}
                      onChange={(event) => setReviewComments(event.target.value)}
                      slotProps={{ htmlInput: { maxLength: 4000 } }}
                    />
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="contained"
                        disabled={review.isPending}
                        onClick={() => review.mutate({ reportId: selected.reportId, versionId: selected.versionId, decision: 'APPROVED', ...(reviewComments ? { comments: reviewComments } : {}) })}
                      >Approve version</Button>
                      <Button
                        color="warning"
                        disabled={review.isPending || !reviewComments.trim()}
                        onClick={() => review.mutate({ reportId: selected.reportId, versionId: selected.versionId, decision: 'CHANGES_REQUESTED', comments: reviewComments.trim() })}
                      >Request changes</Button>
                    </Stack>
                  </Stack>
                </Paper>
              )}

              {isAuthor && (selected.reportStatus === 'CHANGES_REQUESTED' || selected.reportStatus === 'REVISION_REQUESTED') && (
                <Button
                  variant="outlined"
                  disabled={revision.isPending}
                  onClick={() => revision.mutate(selected.reportId)}
                  sx={{ alignSelf: 'flex-start' }}
                >Create linked revision</Button>
              )}

              {isManager && selected.versionStatus === 'TECHNICALLY_APPROVED' && (
                <Button
                  variant="contained"
                  disabled={release.isPending}
                  onClick={() => release.mutate({ reportId: selected.reportId, versionId: selected.versionId })}
                  sx={{ alignSelf: 'flex-start' }}
                >Release approved version</Button>
              )}

              {isClient && selected.versionStatus === 'RELEASED' && (
                <Paper variant="outlined" sx={{ p: 2.5 }}>
                  <Stack spacing={1.5}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 750 }}>Client decision</Typography>
                    <TextField
                      label="Clarification or revision request"
                      multiline
                      minRows={2}
                      value={clientReason}
                      onChange={(event) => setClientReason(event.target.value)}
                      slotProps={{ htmlInput: { maxLength: 2000 } }}
                    />
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="contained"
                        disabled={decision.isPending}
                        onClick={() => decision.mutate({ reportId: selected.reportId, versionId: selected.versionId, decision: 'ACCEPT' })}
                      >Accept report</Button>
                      <Button
                        color="warning"
                        disabled={decision.isPending || !clientReason.trim()}
                        onClick={() => decision.mutate({ reportId: selected.reportId, versionId: selected.versionId, decision: 'REQUEST_REVISION', reason: clientReason.trim() })}
                      >Request revision</Button>
                    </Stack>
                  </Stack>
                </Paper>
              )}

              {mutationError && <Alert severity="error">{getErrorMessage(mutationError, 'The report action could not be completed.')}</Alert>}
              {evidenceError && <Alert severity="error">{evidenceError}</Alert>}

              <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
                  <HistoryOutlined color="primary" />
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>Checklist snapshot</Typography>
                </Stack>
                <Stack divider={<Divider flexItem />} spacing={1.25}>
                  {selected.contentSnapshot.checklist.map((item) => (
                    <Box key={item.itemId} sx={{ py: 0.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{item.itemCode} · {item.prompt}</Typography>
                      <Typography variant="body2" color="text.secondary">Response: {item.responseValue ?? 'Not answered'}{item.notes ? ` — ${item.notes}` : ''}</Typography>
                    </Box>
                  ))}
                </Stack>
              </Paper>

              <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5 }}>Verified findings</Typography>
                {selected.contentSnapshot.findings.length ? (
                  <Stack spacing={1.5}>
                    {selected.contentSnapshot.findings.map((finding) => (
                      <Card key={finding.id} variant="outlined">
                        <CardContent>
                          <Stack spacing={0.5}>
                            <Stack direction="row" spacing={1}>
                              <Typography sx={{ fontWeight: 750 }}>{finding.defectLabel}</Typography>
                              <Chip size="small" label={finding.severity} />
                              <Chip size="small" label={finding.source.replaceAll('_', ' ')} />
                            </Stack>
                            <Typography variant="body2">{finding.locationDescription}</Typography>
                            <Typography variant="body2" color="text.secondary">{finding.technicalNotes}</Typography>
                            {finding.recommendedAction && <Typography variant="body2">Recommended: {finding.recommendedAction}</Typography>}
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                ) : <Typography color="text.secondary">No verified findings in this snapshot.</Typography>}
              </Paper>

              <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5 }}>Released evidence</Typography>
                <Stack spacing={1}>
                  {selected.contentSnapshot.evidence.map((item) => (
                    <Stack key={item.id} direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{item.fileName}</Typography>
                        <Typography variant="caption" color="text.secondary">{item.contentType} · {item.sizeBytes.toLocaleString()} bytes</Typography>
                      </Box>
                      {(selected.versionStatus === 'RELEASED' || selected.versionStatus === 'ACCEPTED') && (
                        <Button
                          size="small"
                          startIcon={<DownloadOutlined />}
                          onClick={() => void downloadEvidence(item.id, item.fileName)}
                        >Download</Button>
                      )}
                    </Stack>
                  ))}
                </Stack>
              </Paper>
            </Stack>
          )}
        </Box>
      </QueryState>
    </Box>
  );
}
