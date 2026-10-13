import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import { canPerform } from '@/app/permissions/capability';
import {
  getSectionPath,
  PORTAL_IDS,
  type PortalId,
} from '@/app/permissions/accessPolicy';
import { useAuthStore } from '@/features/auth/store/authStore';
import {
  usePublishReportVersion,
  useReviewReportVersion,
  useSubmitReportVersion,
  useVerifyReportVersion,
  useReportVersions,
  useInspectionFindings,
  useInspectionEvidence,
  useSaveReportSections,
} from '@/features/inspections/hooks/useInspections';
import { ReportAuthoringPanel } from '@/features/reports/components/ReportAuthoringPanel';
import type { ReportSectionValues } from '@/features/reports/components/ReportSectionForm';
import { EmptyState } from '@/shared/ui/EmptyState';
import { getErrorMessage } from '@/shared/api/errorMessage';
import { isConflict } from '@/shared/api/problem';
import { MutationProblemAlert, RefusalNotice } from '@/shared/ui/MutationProblemAlert';
import { QueryState } from '@/shared/ui/QueryState';

const NEXT_STEP: Record<string, string> = {
  DRAFT: 'Waiting for the author to verify this draft.',
  RETURNED: 'Returned to the author for revision.',
  AUTHOR_VERIFIED: 'Waiting for the author to submit for review.',
  SUBMITTED: 'Waiting for a qualified reviewer to approve or return.',
  APPROVED: 'Waiting for a qualified reviewer to publish.',
  PUBLISHED: 'Published. This version is immutable.',
  SUPERSEDED: 'Superseded by a later version.',
};

export default function ReportDetailPage() {
  const { inspectionId = '' } = useParams<{ inspectionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const portal = (location.pathname.split('/').filter(Boolean)[0] ??
    PORTAL_IDS[0]) as PortalId;
  const user = useAuthStore((state) => state.user);
  const userId = useAuthStore((state) => state.userId);

  const [openVersionId, setOpenVersionId] = useState<string | null>(null);
  const [reviewReason, setReviewReason] = useState('');

  const versions = useReportVersions(inspectionId);
  const findings = useInspectionFindings(inspectionId);
  const evidence = useInspectionEvidence(inspectionId);
  const verify = useVerifyReportVersion(inspectionId);
  const submit = useSubmitReportVersion(inspectionId);
  const review = useReviewReportVersion(inspectionId);
  const publish = usePublishReportVersion(inspectionId);

  const canAuthor = canPerform('inspections.authorReport', user);
  const canReview = canPerform('reports.review', user);

  const openVersion =
    versions.data?.find((version) => version.id === openVersionId) ??
    versions.data?.[0] ??
    null;

  const isAuthor = Boolean(openVersion && userId === openVersion.authorUserId);

  const saveSections = useSaveReportSections(inspectionId);

  const handleSaveSections = async (versionId: string, sections: ReportSectionValues) => {
    await saveSections.mutateAsync({
      versionId,
      sections: {
        ...sections,
        overallCondition: sections.overallCondition || null,
      },
    });
    await versions.refetch();
  };

  return (
    <Box className="workspace-page workspace-page--reports" sx={{ width: '100%', maxWidth: '1440px', mx: 'auto' }}>
      {/* Top Navigation */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Button
          startIcon={<ArrowBackRounded />}
          onClick={() => navigate(`${getSectionPath(portal, 'inspections')}?view=reports`)}
          sx={{
            color: '#475467',
            fontWeight: 600,
            fontSize: '14px',
            textTransform: 'none',
            borderRadius: '8px',
            '&:hover': { bgcolor: '#f2f4f7' },
          }}
        >
          Back to reports list
        </Button>
      </Box>

      {/* Header card */}
      <Box sx={{ mb: 3 }}>
        <Typography
          component="h1"
          sx={{
            fontSize: { xs: '1.5rem', sm: '1.875rem' },
            fontWeight: 700,
            color: '#101828',
            letterSpacing: '-0.025em',
            mb: 0.5,
          }}
        >
          Inspection Report
        </Typography>
        <Typography variant="body2" sx={{ color: '#667085', fontSize: '0.875rem' }}>
          Inspection ID: {inspectionId} · Verified and versioned inspection findings
        </Typography>
      </Box>

      <QueryState
        isLoading={versions.isLoading}
        error={versions.error}
        isEmpty={!versions.data?.length}
        onRetry={() => void versions.refetch()}
        empty={
          <EmptyState
            title="No report versions found"
            description="The assigned Inspector creates a report draft once field evidence is accepted."
          />
        }
      >
        <Stack spacing={3}>
          {/* Version Selector if multiple versions exist */}
          {versions.data && versions.data.length > 1 && (
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: '16px',
                border: '1px solid #eaecf0',
                bgcolor: '#ffffff',
                boxShadow: '0 1px 3px rgba(16,24,40,0.05)',
              }}
            >
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant="body2" sx={{ color: '#475467', fontWeight: 600 }}>
                  Versions:
                </Typography>
                {versions.data.map((version) => {
                  const isSelected = openVersion?.id === version.id;
                  return (
                    <Chip
                      key={version.id}
                      label={`v${version.versionNo} · ${version.status}`}
                      variant={isSelected ? 'filled' : 'outlined'}
                      color={isSelected ? 'primary' : 'default'}
                      onClick={() => setOpenVersionId(version.id)}
                      sx={{
                        cursor: 'pointer',
                        fontWeight: 600,
                        borderRadius: '8px',
                      }}
                    />
                  );
                })}
              </Stack>
            </Paper>
          )}

          {openVersion && (
            <>
              {/* Next step banner */}
              <Alert
                severity={openVersion.status === 'PUBLISHED' ? 'success' : 'info'}
                sx={{
                  borderRadius: '12px',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                }}
              >
                {NEXT_STEP[openVersion.status] ?? openVersion.status}
              </Alert>

              {/* Reviewer / Author Action controls */}
              {openVersion.status !== 'PUBLISHED' && (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2.5,
                    borderRadius: '16px',
                    border: '1px solid #eaecf0',
                    bgcolor: '#ffffff',
                    boxShadow: '0 1px 3px rgba(16, 24, 40, 0.05)',
                  }}
                >
                  <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#101828', mb: 1.5 }}>
                    Actions for Version {openVersion.versionNo}
                  </Typography>

                  <Stack spacing={2}>
                    {/* Author verification step */}
                    {canAuthor && isAuthor && openVersion.status === 'DRAFT' && (
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                        <Button
                          variant="contained"
                          disabled={verify.isPending}
                          onClick={() => verify.mutate(openVersion.id)}
                          sx={{ borderRadius: '8px', px: 2.5 }}
                        >
                          {verify.isPending ? 'Verifying…' : 'Verify as author'}
                        </Button>
                        <Typography variant="caption" sx={{ color: '#667085' }}>
                          Attest that you surveyed the site and the narrative is complete.
                        </Typography>
                      </Stack>
                    )}

                    {/* Author submit step */}
                    {canAuthor && isAuthor && openVersion.status === 'AUTHOR_VERIFIED' && (
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                        <Button
                          variant="contained"
                          disabled={submit.isPending}
                          onClick={() => submit.mutate(openVersion.id)}
                          sx={{ borderRadius: '8px', px: 2.5 }}
                        >
                          {submit.isPending ? 'Submitting…' : 'Submit for review'}
                        </Button>
                        <Typography variant="caption" sx={{ color: '#667085' }}>
                          Submits this draft to an organization reviewer.
                        </Typography>
                      </Stack>
                    )}

                    {verify.isError && isConflict(verify.error) ? (
                      <RefusalNotice
                        testId="report-verify-refusal"
                        reason={getErrorMessage(verify.error, '')}
                        fallbackMessage="The server refused this verification. Refresh the report and create a new draft if its evidence has changed."
                      />
                    ) : null}
                    <MutationProblemAlert
                      error={verify.error}
                      isError={verify.isError && !isConflict(verify.error)}
                      fallbackMessage="Could not verify this report draft."
                    />
                    {submit.isError && isConflict(submit.error) ? (
                      <RefusalNotice
                        testId="report-submit-refusal"
                        reason={getErrorMessage(submit.error, '')}
                        fallbackMessage="The server refused this submission. Refresh the report and create a new draft if its evidence has changed."
                      />
                    ) : null}
                    <MutationProblemAlert
                      error={submit.error}
                      isError={submit.isError && !isConflict(submit.error)}
                      fallbackMessage="Could not submit this report draft."
                    />
                    {/* Reviewer approval or return step */}
                    {canReview && !isAuthor && openVersion.status === 'SUBMITTED' && (
                      <Stack spacing={2}>
                        <TextField
                          label="Reason for return"
                          placeholder="Required when returning for author revisions"
                          multiline
                          minRows={2}
                          value={reviewReason}
                          onChange={(e) => setReviewReason(e.target.value)}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                        />
                        <Stack direction="row" spacing={1.5}>
                          <Button
                            variant="contained"
                            color="success"
                            disabled={review.isPending}
                            onClick={() => review.mutate({ versionId: openVersion.id, approve: true })}
                            sx={{ borderRadius: '8px', px: 2.5 }}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="outlined"
                            color="error"
                            disabled={review.isPending || !reviewReason.trim()}
                            onClick={() =>
                              review.mutate({
                                versionId: openVersion.id,
                                approve: false,
                                reason: reviewReason.trim(),
                              })
                            }
                            sx={{ borderRadius: '8px', px: 2.5 }}
                          >
                            Return with reason
                          </Button>
                        </Stack>
                      </Stack>
                    )}

                    {/* Reviewer publish step */}
                    {canReview && openVersion.status === 'APPROVED' && (
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                        <Button
                          variant="contained"
                          disabled={publish.isPending}
                          onClick={() => publish.mutate(openVersion.id)}
                          sx={{ borderRadius: '8px', px: 2.5 }}
                        >
                          {publish.isPending ? 'Publishing…' : 'Publish immutable version'}
                        </Button>
                        <Typography variant="caption" sx={{ color: '#667085' }}>
                          Makes this version permanent and immutable.
                        </Typography>
                      </Stack>
                    )}

                    {publish.isSuccess && (
                      <Alert severity="success" sx={{ borderRadius: '10px' }}>
                        Published version {publish.data.versionNo}.{' '}
                        {publish.data.repairRequiredFindingIds.length
                          ? `${publish.data.repairRequiredFindingIds.length} confirmed finding(s) handed to maintenance.`
                          : 'No corrective work was required within the observed scope.'}
                      </Alert>
                    )}
                  </Stack>
                </Paper>
              )}

              {/* MF3-08/MF3-11: authored sections, derived sections, and the delivered PDF */}
              <ReportAuthoringPanel
                version={openVersion}
                findings={findings.data ?? []}
                evidenceList={evidence.data ?? []}
                inspectionId={inspectionId}
                canEdit={canAuthor && (openVersion.status === 'DRAFT' || openVersion.status === 'RETURNED')}
                onSaveSections={(sections) => handleSaveSections(openVersion.id, sections)}
              />
            </>
          )}
        </Stack>
      </QueryState>
    </Box>
  );
}
