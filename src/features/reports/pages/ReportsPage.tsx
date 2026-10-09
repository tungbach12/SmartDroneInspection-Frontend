import { HistoryOutlined, VerifiedOutlined } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useState, useMemo } from 'react';
import { canPerform } from '@/app/permissions/capability';
import { useAuthStore } from '@/features/auth/store/authStore';
import {
  usePublishReportVersion,
  useReviewReportVersion,
  useSubmitReportVersion,
  useVerifyReportVersion,
} from '@/features/inspections/hooks/useInspections';
import {
  useInspectionsWithReports,
  useReportVersions,
} from '@/features/inspections/hooks/useInspections';
import { InspectionListTable } from '@/features/inspections/components/InspectionListTable';
import { getErrorMessage } from '@/shared/api/errorMessage';
import { EmptyState } from '@/shared/ui/EmptyState';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryState } from '@/shared/ui/QueryState';

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleString() : '—';
}

/**
 * MF3 report review. A version is scoped to its inspection, and each gate shows only to the role
 * that owns it: the Inspector author verifies, a qualified ORG_ADMIN reviewer approves. A published
 * version is immutable, so a correction is a new linked version rather than an edit.
 */
export default function ReportsPage() {
  const user = useAuthStore((state) => state.user);
  const userId = useAuthStore((state) => state.userId);
  const [appliedInspectionId, setAppliedInspectionId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [reviewReason, setReviewReason] = useState('');

  // A report belongs to an inspection, so the review queue is the inspection collection filtered
  // to the rows that carry one.
  const listFilters = useMemo(() => ({ page, pageSize }), [page, pageSize]);
  const inspections = useInspectionsWithReports(listFilters);

  const versions = useReportVersions(appliedInspectionId);
  const verify = useVerifyReportVersion(appliedInspectionId);
  const submit = useSubmitReportVersion(appliedInspectionId);
  const review = useReviewReportVersion(appliedInspectionId);
  const publish = usePublishReportVersion(appliedInspectionId);

  const canAuthor = canPerform('inspections.authorReport', user);
  const canReview = canPerform('reports.review', user);

  const selected = versions.data?.[0] ?? null;
  const isAuthor = Boolean(selected && userId === selected.authorUserId);

  return (
    <Box className="workspace-page workspace-page--reports">
      <PageHeader
        title="Inspection reports"
        subtitle="Review, approve, and publish the versioned inspection record"
      />

      <QueryState
        isLoading={inspections.isLoading}
        error={inspections.error}
        isEmpty={!inspections.data?.items.length}
        onRetry={() => void inspections.refetch()}
        loadingLabel="Loading reports…"
        empty={
          <EmptyState
            title="No reports to review"
            description="A report appears here once the assigned Inspector authors a draft."
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
          onSelect={setAppliedInspectionId}
          selectedInspectionId={appliedInspectionId}
          showReportColumn
        />
      </QueryState>

      {!appliedInspectionId ? (
        <EmptyState
          title="No inspection selected"
          description="Choose an inspection above to review its report versions."
        />
      ) : (
        <QueryState
          isLoading={versions.isLoading}
          error={versions.error}
          isEmpty={!versions.data?.length}
          onRetry={() => void versions.refetch()}
          empty={
            <EmptyState
              title="No report versions yet"
              description="The assigned Inspector generates a draft once the evidence set is accepted."
            />
          }
        >
          <Stack spacing={2}>
            {versions.data?.map((version) => (
              <Paper key={version.id} variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
                <Stack spacing={1.5}>
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: 'center', flexWrap: 'wrap' }}
                  >
                    <VerifiedOutlined color="primary" />
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      Version {version.versionNo}
                    </Typography>
                    <Chip
                      size="small"
                      color={version.status === 'PUBLISHED' ? 'success' : 'default'}
                      label={version.status.replaceAll('_', ' ')}
                    />
                    {version.status === 'PUBLISHED' && (
                      <Chip size="small" variant="outlined" label="Immutable" />
                    )}
                  </Stack>

                  <Typography variant="body2" color="text.secondary">
                    Inspection {appliedInspectionId}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Author verified {formatDate(version.authorVerifiedAt)} · Reviewed{' '}
                    {formatDate(version.reviewedAt)}
                    {version.reviewReason ? ` · ${version.reviewReason}` : ''}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Generated {formatDate(version.generatedAt)}
                    {version.llmModel ? ` by ${version.llmModel}` : ''}
                    {version.promptVersion ? ` (prompt ${version.promptVersion})` : ''} ·
                    Evidence snapshot {version.evidenceSnapshotHash?.slice(0, 12) ?? '—'}
                  </Typography>

                  <Divider />

                  {isAuthor && canAuthor && (version.status === 'DRAFT' || version.status === 'RETURNED') && (
                    <Stack spacing={1}>
                      <Typography variant="body2" color="text.secondary">
                        Verify this draft against its sources, then submit it for qualified review.
                      </Typography>
                      <Button
                        variant="outlined"
                        disabled={verify.isPending}
                        onClick={() => verify.mutate(version.id)}
                        sx={{ alignSelf: 'flex-start' }}
                      >
                        {verify.isPending ? 'Verifying…' : 'Verify as author'}
                      </Button>
                    </Stack>
                  )}

                  {isAuthor && canAuthor && version.status === 'AUTHOR_VERIFIED' && (
                    <Button
                      variant="contained"
                      disabled={submit.isPending}
                      onClick={() => submit.mutate(version.id)}
                      sx={{ alignSelf: 'flex-start' }}
                    >
                      {submit.isPending ? 'Submitting…' : 'Submit for review'}
                    </Button>
                  )}

                  {canReview && !isAuthor && version.status === 'SUBMITTED' && (
                    <Stack spacing={1.5}>
                      <TextField
                        label="Reason for return"
                        multiline
                        minRows={2}
                        value={reviewReason}
                        onChange={(event) => setReviewReason(event.target.value)}
                        slotProps={{ htmlInput: { maxLength: 2000 } }}
                      />
                      <Stack direction="row" spacing={1}>
                        <Button
                          variant="contained"
                          disabled={review.isPending}
                          onClick={() =>
                            review.mutate({
                              versionId: version.id,
                              approve: true,
                            })
                          }
                        >
                          Approve
                        </Button>
                        <Button
                          color="warning"
                          disabled={review.isPending || !reviewReason.trim()}
                          onClick={() =>
                            review.mutate({
                              versionId: version.id,
                              approve: false,
                              reason: reviewReason.trim(),
                            })
                          }
                        >
                          Return with reason
                        </Button>
                      </Stack>
                    </Stack>
                  )}

                  {canReview && !isAuthor && version.status === 'APPROVED' && (
                    <Button
                      variant="contained"
                      disabled={publish.isPending}
                      onClick={() => publish.mutate(version.id)}
                      sx={{ alignSelf: 'flex-start' }}
                    >
                      {publish.isPending ? 'Publishing…' : 'Publish immutable version'}
                    </Button>
                  )}

                  {publish.isSuccess && (
                    <Alert severity="success">
                      Published version {publish.data.versionNo}.{' '}
                      {publish.data.repairRequiredFindingIds.length
                        ? `${publish.data.repairRequiredFindingIds.length} confirmed finding(s) handed to maintenance.`
                        : 'No corrective work was required within the observed scope.'}
                    </Alert>
                  )}
                </Stack>
              </Paper>
            ))}

            {verify.isError && (
              <Alert severity="error">
                {getErrorMessage(verify.error, 'The author verification was not recorded.')}
              </Alert>
            )}
            {submit.isError && (
              <Alert severity="error">
                {getErrorMessage(submit.error, 'The report was not submitted for review.')}
              </Alert>
            )}
            {review.isError && (
              <Alert severity="error">
                {getErrorMessage(review.error, 'The review decision was not recorded.')}
              </Alert>
            )}
            {publish.isError && (
              <Alert severity="error">
                {getErrorMessage(publish.error, 'The report could not be published.')}
              </Alert>
            )}

            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <HistoryOutlined color="primary" />
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Version history
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {versions.data?.length ?? 0} version(s). A published version is never edited;
                  corrections create a linked new version.
                </Typography>
              </CardContent>
            </Card>
          </Stack>
        </QueryState>
      )}
    </Box>
  );
}
