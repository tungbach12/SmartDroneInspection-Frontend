import { useState } from 'react';
import { Link as RouterLink, useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
  useAcceptReportVersion,
  useCreateInspectionPayOSLink,
  useReviewReportVersion,
  useSubmitReportVersion,
  useWithdrawReportVersion,
  useReportVersions,
  useInspectionFindings,
  useInspectionEvidence,
  useSaveReportSections,
  useInspectionWorkflowState,
  useReinspectionVerifications,
  useInspection,
  useReportPaymentStatus,
} from '@/features/inspections/hooks/useInspections';
import { ReportAuthoringPanel } from '@/features/reports/components/ReportAuthoringPanel';
import { ReportAiSummaryCard } from '@/features/reports/components/ReportAiSummaryCard';
import { CustomerReportSettlementCard } from '@/features/reports/components/CustomerReportSettlementCard';
import { InspectorPayoutSummaryBar } from '@/features/inspections/components/InspectorPayoutSummaryBar';
import type { ReportSectionValues } from '@/features/reports/components/ReportSectionForm';
import { EmptyState } from '@/shared/ui/EmptyState';
import { getErrorMessage } from '@/shared/api/errorMessage';
import { isConflict } from '@/shared/api/problem';
import { MutationProblemAlert, RefusalNotice } from '@/shared/ui/MutationProblemAlert';
import { QueryState } from '@/shared/ui/QueryState';
import { useLocale } from '@/shared/i18n/LocaleProvider';

const NEXT_STEP: Record<string, string> = {
  SUBMITTED: 'Waiting for a qualified reviewer to approve or return.',
  RETURNED: 'Returned to the author for revision.',
  APPROVED: 'Approved by the Platform Manager and awaiting immutable PDF publication.',
  PUBLISHED: 'Published. This version is immutable.',
  SUPERSEDED: 'Superseded by a later version.',
};

export default function ReportDetailPage() {
  const { t } = useLocale();
  const { inspectionId = '' } = useParams<{ inspectionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const portal = (location.pathname.split('/').filter(Boolean)[0] ??
    PORTAL_IDS[0]) as PortalId;
  const user = useAuthStore((state) => state.user);
  const userId = useAuthStore((state) => state.userId);

  const [openVersionId, setOpenVersionId] = useState<string | null>(null);
  const [reviewReason, setReviewReason] = useState('');
  const [showReturnBox, setShowReturnBox] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeSubmitted, setDisputeSubmitted] = useState(false);

  const inspectionQuery = useInspection(inspectionId);
  const isReinspection = inspectionQuery.data?.inspectionType === 'RE_INSPECTION';
  const isClientPortal = portal === 'client';

  const versions = useReportVersions(inspectionId);
  const findings = useInspectionFindings(inspectionId);
  const evidence = useInspectionEvidence(inspectionId);
  const reinspectionVerifications = useReinspectionVerifications(inspectionId);
  const workflowState = useInspectionWorkflowState(inspectionId);
  const submit = useSubmitReportVersion(inspectionId);
  const withdraw = useWithdrawReportVersion(inspectionId);
  const review = useReviewReportVersion(inspectionId);
  const publish = usePublishReportVersion(inspectionId);
  const acceptReport = useAcceptReportVersion(inspectionId);
  const payosLink = useCreateInspectionPayOSLink(inspectionId);
  const paymentStatusQuery = useReportPaymentStatus(inspectionId);
  const paymentStatus = paymentStatusQuery.data;
  const isPaid = Boolean(
    paymentStatus?.paid ||
      paymentStatus?.paymentStatus === 'PAID' ||
      new URLSearchParams(location.search).get('payment') === 'success',
  );
  const isReportAccepted = Boolean(
    paymentStatus?.reportAccepted || acceptReport.isSuccess,
  );

  const canAuthor = canPerform('inspections.authorReport', user);
  const canReview = canPerform('reports.review', user);
  const canReviewReport = canReview && !isClientPortal;

  const openVersion =
    versions.data?.find((version) => version.id === openVersionId) ??
    versions.data?.[0] ??
    null;

  const isAuthor = Boolean(openVersion && userId === openVersion.authorUserId);
  const inspectionStatus = workflowState.data?.status;
  const publishedUnhanded =
    openVersion?.status === 'PUBLISHED' &&
    (inspectionStatus === 'COMPLETED' || inspectionStatus == null);
  const reportReadLoading =
    findings.isLoading || evidence.isLoading || Boolean(findings.error || evidence.error);
  const canWithdrawSubmission = Boolean(
    canAuthor && isAuthor && openVersion?.status === 'SUBMITTED' &&
      openVersion.reviewerUserId == null && openVersion.reviewedAt == null,
  );
  const canEditReturnedText =
    canAuthor && isAuthor && openVersion?.status === 'RETURNED';
  const currentFindingsConfirmationAt =
    workflowState.data?.findingsConfirmedAt ?? openVersion?.reportContext?.findingsConfirmedAt;
  const sourcesNeedFreshDraft = Boolean(
    canEditReturnedText &&
      ((inspectionStatus === 'FIELD_COMPLETED' &&
        workflowState.data?.findingsConfirmedAt == null) ||
        (currentFindingsConfirmationAt &&
          new Date(currentFindingsConfirmationAt).getTime() >
            new Date(openVersion.createdAt).getTime())),
  );

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

  const isEmbeddedInInspectionWorkspace = location.pathname.includes('/inspections/');

  return (
    <Box className="workspace-page workspace-page--reports" sx={{ width: '100%', maxWidth: '1440px', mx: 'auto' }}>
      {/* Top Navigation: shown when rendered standalone at /:portal/reports/:id */}
      {!isEmbeddedInInspectionWorkspace && (
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Button
            startIcon={<ArrowBackRounded />}
            onClick={() => navigate(`${getSectionPath(portal, 'inspections')}?view=reports`)}
            sx={{
              color: 'text.secondary',
              fontWeight: 600,
              fontSize: '0.875rem',
              textTransform: 'none',
              borderRadius: '8px',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            {canReview && !canAuthor ? 'Back to review queue' : 'Back to reports list'}
          </Button>
        </Box>
      )}

      {/* Header card */}
      <Box sx={{ mb: 3 }}>
        <Typography
          component="h1"
          sx={{
            fontSize: { xs: '1.5rem', sm: '1.875rem' },
            fontWeight: 700,
            color: 'text.primary',
            letterSpacing: '-0.025em',
            mb: 0.5,
          }}
        >
          {portal === 'admin'
            ? t('Platform Manager · Report review')
            : portal === 'client'
              ? t('Customer · Inspection Report')
              : t('Inspection Report')}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
          {t('Inspection ID:')} {inspectionId} ·{' '}
          {portal === 'admin'
            ? t('Review the submitted report, record a decision, and publish approved versions.')
            : t('Official published inspection deliverable and verified defect records.')}
        </Typography>
      </Box>

      <QueryState
        isLoading={versions.isLoading}
        error={versions.error}
        isEmpty={!versions.data?.length}
        onRetry={() => void versions.refetch()}
        empty={
          <EmptyState
            title={t('No report versions found')}
            description={t('The assigned Inspector creates a report draft once field evidence is accepted.')}
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
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                boxShadow: (theme) => (theme.palette.mode === 'dark' ? 'none' : '0 1px 3px rgba(16,24,40,0.05)'),
              }}
            >
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  {t('Versions:')}
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
                  borderRadius: '10px',
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
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                    boxShadow: (theme) => (theme.palette.mode === 'dark' ? 'none' : '0 1px 3px rgba(16, 24, 40, 0.05)'),
                  }}
                >
                  <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary', mb: 1.5 }}>
                    {t('Actions for Version')} {openVersion.versionNo}
                  </Typography>

                  <Stack spacing={2}>
                    {/* Author verification step */}
                    {sourcesNeedFreshDraft && (
                      <Stack spacing={1.25}>
                        <Alert severity="info">
                          {t('This report was returned after source changes. Confirm the updated findings and create a fresh report version before resubmitting.')}
                        </Alert>
                        <Button
                          variant="outlined"
                          component={RouterLink}
                          to={`${getSectionPath(portal, 'inspections')}/${inspectionId}/findings`}
                          sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
                        >
                          {t('Review findings and create a fresh version')}
                        </Button>
                      </Stack>
                    )}
                    {canAuthor && isAuthor && !sourcesNeedFreshDraft && canEditReturnedText && (
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                        <Button
                          variant="contained"
                          disabled={submit.isPending}
                          onClick={() => submit.mutate(openVersion.id)}
                          sx={{ borderRadius: '8px', px: 2.5 }}
                        >
                          {submit.isPending ? t('Submitting…') : t('Resubmit for review')}
                        </Button>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {t('Resubmits this revised report for Platform Manager review.')}
                        </Typography>
                      </Stack>
                    )}

                    {submit.isError && isConflict(submit.error) ? (
                      <RefusalNotice
                        testId="report-submit-refusal"
                        reason={getErrorMessage(submit.error, '')}
                        fallbackMessage={t('The server refused this submission. Refresh the report and create a new draft if its evidence has changed.')}
                      />
                    ) : null}
                    <MutationProblemAlert
                      error={submit.error}
                      isError={submit.isError && !isConflict(submit.error)}
                      fallbackMessage={t('Could not submit this report.')}
                    />
                    {canWithdrawSubmission && (
                      <Stack spacing={1.25}>
                        <Alert severity="warning">
                          {t('Withdraw only before the reviewer has made a finding decision. The submitted version remains in the audit trail; evidence and findings are not deleted.')}
                        </Alert>
                        <Button
                          variant="outlined"
                          color="warning"
                          disabled={withdraw.isPending}
                          onClick={() => withdraw.mutate({ versionId: openVersion.id })}
                          sx={{ alignSelf: 'flex-start' }}
                        >
                          {withdraw.isPending ? 'Withdrawing…' : 'Withdraw submission and revise'}
                        </Button>
                        {withdraw.isError && <MutationProblemAlert error={withdraw.error} isError fallbackMessage={t('Could not withdraw this submission.')} />}
                      </Stack>
                    )}

                    {/* Reviewer approval or return step */}
                    {canReviewReport && !isAuthor && openVersion.status === 'SUBMITTED' && (
                      <Stack spacing={2}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          {t('Review the submitted report')}
                        </Typography>
                        <ReportAiSummaryCard inspectionId={inspectionId} versionId={openVersion.id} />
                        {reportReadLoading ? (
                          <Alert severity={findings.error || evidence.error ? 'error' : 'info'}>
                            {findings.error || evidence.error
                              ? 'Could not load the report sources. Retry before approving or returning.'
                              : 'Loading report sources…'}
                          </Alert>
                        ) : (
                          <Alert severity="info">
                            {t('Review the report, Inspector-confirmed findings, evidence, and limitations together. This is a report-level decision; the Organization Manager does not separately accept each finding.')}
                          </Alert>
                        )}
                        {showReturnBox ? (
                          <Stack spacing={1.5}>
                            <TextField
                              label={t('Reason for return')}
                              placeholder={t('Required when returning for author revisions')}
                              multiline
                              minRows={2}
                              autoFocus
                              value={reviewReason}
                              onChange={(e) => setReviewReason(e.target.value)}
                              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                            />
                            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                              <Button
                                variant="contained"
                                color="error"
                                disabled={review.isPending || reportReadLoading || !reviewReason.trim()}
                                onClick={() =>
                                  review.mutate({
                                    versionId: openVersion.id,
                                    approve: false,
                                    reason: reviewReason.trim(),
                                  })
                                }
                                sx={{ borderRadius: '8px', px: 2.5 }}
                              >
                                {t('Return with reason')}
                              </Button>
                              <Button
                                variant="outlined"
                                color="inherit"
                                disabled={review.isPending}
                                onClick={() => {
                                  setShowReturnBox(false);
                                  setReviewReason('');
                                }}
                                sx={{ borderRadius: '8px', px: 2 }}
                              >
                                {t('Cancel')}
                              </Button>
                            </Stack>
                          </Stack>
                        ) : (
                          <Stack direction="row" spacing={1.5}>
                            <Button
                              variant="contained"
                              color="success"
                              disabled={
                                review.isPending ||
                                reportReadLoading
                              }
                              onClick={() => review.mutate({ versionId: openVersion.id, approve: true })}
                              sx={{ borderRadius: '8px', px: 2.5 }}
                            >
                              {t('Approve')}
                            </Button>
                            <Button
                              variant="outlined"
                              color="error"
                              disabled={review.isPending || reportReadLoading}
                              onClick={() => setShowReturnBox(true)}
                              sx={{ borderRadius: '8px', px: 2.5 }}
                            >
                              {t('Return with reason')}
                            </Button>
                          </Stack>
                        )}
                        {review.isError && isConflict(review.error) ? (
                          <RefusalNotice
                            testId="report-review-refusal"
                            reason={getErrorMessage(review.error, '')}
                            fallbackMessage={t('The server refused this report review. Refresh the report before trying again.')}
                          />
                        ) : null}
                        <MutationProblemAlert
                          error={review.error}
                          isError={review.isError && !isConflict(review.error)}
                          fallbackMessage={t('Could not record this report review.')}
                        />
                      </Stack>
                    )}

                    {/* Reviewer publish step */}
                    {canReviewReport && openVersion.status === 'APPROVED' && (
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                        <Button
                          variant="contained"
                          disabled={publish.isPending}
                          onClick={() => publish.mutate(openVersion.id)}
                          sx={{ borderRadius: '8px', px: 2.5 }}
                        >
                          {publish.isPending ? 'Publishing…' : 'Publish immutable version'}
                        </Button>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {t('Makes this version permanent and immutable.')}
                        </Typography>
                      </Stack>
                    )}

                    {publish.isError && isConflict(publish.error) ? (
                      <RefusalNotice
                        testId="report-publish-refusal"
                        reason={getErrorMessage(publish.error, '')}
                        fallbackMessage={t('The server refused this publication. Refresh the report before trying again.')}
                      />
                    ) : null}
                    <MutationProblemAlert
                      error={publish.error}
                      isError={publish.isError && !isConflict(publish.error)}
                      fallbackMessage={t('Could not publish this report version.')}
                    />
                  </Stack>
                </Paper>
              )}

              {publish.isSuccess && (
                <Alert severity="success" sx={{ borderRadius: '10px' }}>
                  {t('Published version')} {publish.data.versionNo}. The PDF is immutable; forward
                  confirmed findings to maintenance individually when they require corrective work.
                </Alert>
              )}

              {/* Customer Report Acceptance & Payment Gate */}
              {openVersion.status === 'PUBLISHED' && portal === 'client' && (
                <CustomerReportSettlementCard
                  inspectionId={inspectionId}
                  versionId={openVersion.id}
                  versionNo={openVersion.versionNo}
                  isPaid={isPaid}
                  isReportAccepted={isReportAccepted}
                  paymentStatus={paymentStatus}
                  acceptPending={acceptReport.isPending}
                  payosPending={payosLink.isPending}
                  disputeSubmitted={disputeSubmitted}
                  onAcceptReport={() =>
                    acceptReport.mutate(openVersion.id, {
                      onSuccess: () => {
                        void paymentStatusQuery.refetch();
                      },
                    })
                  }
                  onProceedToPayOS={() => payosLink.mutate()}
                  onOpenDispute={() => setDisputeOpen(true)}
                />
              )}

              {/* Platform Manager / Inspector Revenue, Commission & Auto-Disbursement Summary */}
              {portal !== 'client' && (
                <InspectorPayoutSummaryBar
                  inspectionId={inspectionId}
                  paymentDetails={paymentStatus}
                  roleView={portal === 'admin' ? 'manager' : 'inspector'}
                />
              )}

              {canReview && publishedUnhanded && !isReinspection && (
                <Stack spacing={2}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {t('Send to Maintenance (MF3-12)')}
                  </Typography>
                  <Alert severity="info">
                    The published version is immutable. Select which confirmed findings to forward to
                    maintenance; each finding’s forwarding time is recorded separately.
                  </Alert>
                  <Box>
                    <Button
                      variant="outlined"
                      component={RouterLink}
                      to={`${getSectionPath(portal, 'inspections')}/${inspectionId}/corrective`}
                      sx={{ textTransform: 'none' }}
                    >
                      {t('Send findings to Maintenance')}
                    </Button>
                  </Box>
                </Stack>
              )}

              {publishedUnhanded && isReinspection && (
                <Alert severity="info" sx={{ borderRadius: '10px' }}>
                  {t(
                    'This is a re-inspection deliverable verifying previous repair work. Findings verification has been recorded directly to the linked maintenance work order.',
                  )}
                </Alert>
              )}

              {/* MF3-08/MF3-11: authored sections, derived sections, and the delivered PDF */}
              <ReportAuthoringPanel
                version={openVersion}
                findings={findings.data ?? []}
                evidenceList={evidence.data ?? []}
                inspectionId={inspectionId}
                canEdit={canAuthor && canEditReturnedText}
                onSaveSections={(sections) => handleSaveSections(openVersion.id, sections)}
                reinspectionVerifications={reinspectionVerifications.data}
              />
            </>
          )}
        </Stack>
      </QueryState>

      {/* Customer Dispute / Clarification Request Dialog */}
      <Dialog
        open={disputeOpen}
        onClose={() => setDisputeOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '16px', p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {t('File a dispute / Request clarification')}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {t(
                'Please describe the discrepancies, unclear points, or questions regarding this inspection report. The Platform Manager will review and provide a response.',
              )}
            </Typography>
            <TextField
              label={t('Dispute details or questions')}
              multiline
              rows={4}
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder={t('e.g. Defect location is inaccurate, photo quality is unclear, severity rating requires re-evaluation…')}
              fullWidth
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDisputeOpen(false)} color="inherit" sx={{ textTransform: 'none' }}>
            {t('Cancel')}
          </Button>
          <Button
            variant="contained"
            color="warning"
            disabled={!disputeReason.trim()}
            onClick={() => {
              setDisputeSubmitted(true);
              setDisputeOpen(false);
            }}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
          >
            {t('Submit dispute request')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
