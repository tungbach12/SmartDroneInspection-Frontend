import { useEffect, useState } from 'react';
import { Link as RouterLink, useParams, useLocation } from 'react-router-dom';
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
import { PageBreadcrumbs } from '@/shared/ui/PageBreadcrumbs';
import { canPerform } from '@/app/permissions/capability';
import {
  getSectionPath,
  PORTAL_IDS,
  type PortalId,
} from '@/app/permissions/accessPolicy';
import { useAuthStore } from '@/features/auth/store/authStore';
import {
  useAcceptReportVersion,
  useCreateInspectionSepayLink,
  useCreateInspectionVnPayUrl,
  useReviewReportVersion,
  useSubmitReportVersion,
  useWithdrawReportVersion,
  useReportVersions,
  useInspectionFindings,
  useInspectionEvidence,
  useInspectionWorkflowState,
  useInspection,
  useReinspectionVerifications,
  useReportPaymentStatus,
  useRequestReportClarification,
} from '@/features/inspections/hooks/useInspections';
import ManagerReportReviewPage from './ManagerReportReviewPage';
import CustomerReportDeliverablePage from './CustomerReportDeliverablePage';
import { ReportDeliverableTabs } from '@/features/reports/components/ReportDeliverableTabs';
import { ReportReviewDecisionBar } from '@/features/reports/components/ReportReviewDecisionBar';
import {
  CustomerReportAcceptanceBar,
  CustomerReportSettlementCard,
} from '@/features/reports/components/CustomerReportSettlementCard';
import { SepayQrDialog } from '@/features/reports/components/SepayQrDialog';
import { InspectorPayoutSummaryBar } from '@/features/inspections/components/InspectorPayoutSummaryBar';
import { EmptyState } from '@/shared/ui/EmptyState';
import { getErrorMessage } from '@/shared/api/errorMessage';
import { isConflict } from '@/shared/api/problem';
import { MutationProblemAlert, RefusalNotice } from '@/shared/ui/MutationProblemAlert';
import { QueryState } from '@/shared/ui/QueryState';
import { useLocale } from '@/shared/i18n/LocaleProvider';

const NEXT_STEP: Record<string, string> = {
  SUBMITTED: 'Waiting for a qualified reviewer to approve or return.',
  APPROVED: 'Approved by Manager — pending Inspector payout and publication to Customer.',
  RETURNED: 'Returned to the author for revision.',
  PUBLISHED: 'Published. This version is immutable.',
  SUPERSEDED: 'Superseded by a later version.',
};

export default function ReportDetailPage() {
  const { formatNumber, t } = useLocale();
  const { inspectionId = '' } = useParams<{ inspectionId: string }>();
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
  const [disputeSubmittedAt, setDisputeSubmittedAt] = useState<string | null>(null);
  const [sepayQrOpen, setSepayQrOpen] = useState(false);

  const isClientPortal = portal === 'client';
  const isManagerPortal = portal === 'admin' || portal === 'manager';
  const findings = useInspectionFindings(inspectionId);
  const evidence = useInspectionEvidence(inspectionId);
  const workflowState = useInspectionWorkflowState(inspectionId);
  const inspectionQuery = useInspection(inspectionId);
  const reinspectionVerifications = useReinspectionVerifications?.(inspectionId);
  const inspectionStatus = workflowState.data?.status;

  const versions = useReportVersions(inspectionId);
  const submit = useSubmitReportVersion(inspectionId);
  const withdraw = useWithdrawReportVersion(inspectionId);
  const review = useReviewReportVersion(inspectionId);
  const acceptReport = useAcceptReportVersion(inspectionId);
  const requestClarification = useRequestReportClarification(inspectionId);
  const sepayLink = useCreateInspectionSepayLink(inspectionId);
  const vnpayLink = useCreateInspectionVnPayUrl(inspectionId);
  const searchParams = new URLSearchParams(location.search);
  const isPaymentCancelled = searchParams.get('payment') === 'cancelled';
  const returnedPaymentSuccess = searchParams.get('payment') === 'success';
  const paymentStatusQuery = useReportPaymentStatus(inspectionId, {
    pollWhenUnpaid: sepayQrOpen || returnedPaymentSuccess,
  });
  const paymentStatus = paymentStatusQuery.data;
  const isPaid = Boolean(
    paymentStatus?.paid || paymentStatus?.paymentStatus === 'PAID',
  );
  const isPaymentConfirming = returnedPaymentSuccess && !isPaid;
  const isReportAccepted = Boolean(paymentStatus?.reportAccepted);
  const priorClarificationCount = inspectionQuery.data?.clarificationCount ?? 0;

  useEffect(() => {
    if (sepayQrOpen && isPaid) {
      setSepayQrOpen(false);
    }
  }, [sepayQrOpen, isPaid]);

  const canAuthor = canPerform('inspections.authorReport', user);
  const canReview = canPerform('reports.review', user);
  const canReviewReport = canReview && !isClientPortal;

  const openVersion =
    versions.data?.find((version) => version.id === openVersionId) ??
    versions.data?.[0] ??
    null;

  const isAuthor = Boolean(openVersion && userId === openVersion.authorUserId);
  const resolvedDroneSummary =
    [
      openVersion?.reportContext?.assignedDrone?.manufacturer,
      openVersion?.reportContext?.assignedDrone?.model ?? inspectionQuery.data?.droneModel,
      openVersion?.reportContext?.assignedDrone?.serialNumber ??
        inspectionQuery.data?.droneSerialNumber,
    ]
      .filter(Boolean)
      .join(' · ') || null;
  const resolvedPermitFileName =
    openVersion?.reportContext?.flightPermitFileName ??
    inspectionQuery.data?.flightPermitFileName ??
    null;
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

  const isEmbeddedInInspectionWorkspace = location.pathname.includes('/inspections/');

  if (isManagerPortal) {
    return <ManagerReportReviewPage />;
  }
  if (isClientPortal && isEmbeddedInInspectionWorkspace) {
    return <CustomerReportDeliverablePage />;
  }

  return (
    <Box className="workspace-page workspace-page--reports" sx={{ width: '100%', maxWidth: '1440px', mx: 'auto' }}>
      {/* Top Navigation & Header: shown only when rendered standalone at /:portal/reports/:id */}
      {!isEmbeddedInInspectionWorkspace && (
        <Box sx={{ mb: 3 }}>
          <PageBreadcrumbs
            items={[
              { label: t('Dashboard'), to: getSectionPath(portal, 'dashboard') },
              {
                label: canReview && !canAuthor ? t('Inspections') : t('Reports'),
                to:
                  canReview && !canAuthor
                    ? getSectionPath(portal, 'inspections')
                    : `${getSectionPath(portal, 'inspections')}?view=reports`,
              },
              { label: t('Inspection Report') },
            ]}
          />
          <Typography
            component="h1"
            sx={{
              fontSize: { xs: '1.5rem', sm: '1.875rem' },
              fontWeight: 700,
              color: 'text.primary',
              letterSpacing: '-0.025em',
            }}
          >
            {t('Inspection Report')}
          </Typography>
        </Box>
      )}

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
                borderRadius: '10px',
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
              {/* Unified status banner (single alert, no duplicate publish notices) */}
              <Alert
                severity={
                  openVersion.status === 'PUBLISHED' ||
                  (review.isSuccess && !review.variables?.reason)
                    ? 'success'
                    : 'info'
                }
                sx={{
                  borderRadius: '10px',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                }}
              >
                {openVersion.status === 'PUBLISHED' ||
                (review.isSuccess && !review.variables?.reason)
                  ? isManagerPortal
                    ? `${t('Published version')} ${review.data?.versionNo ?? openVersion.versionNo}. ${t('This version is immutable and delivered to the Customer.')}`
                    : `${t('Published version')} ${review.data?.versionNo ?? openVersion.versionNo}. The PDF is immutable.`
                  : (NEXT_STEP[openVersion.status] ?? openVersion.status)}
              </Alert>

              {/* Author Action controls */}
              {openVersion.status !== 'PUBLISHED' &&
                (sourcesNeedFreshDraft ||
                  (canAuthor && isAuthor && !sourcesNeedFreshDraft && canEditReturnedText) ||
                  submit.isError ||
                  canWithdrawSubmission) && (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2.5,
                    borderRadius: '10px',
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
                  </Stack>
                </Paper>
              )}

              {/* Customer Report Acceptance & Payment Gate (Customer view only) */}
              {openVersion.status === 'PUBLISHED' && isClientPortal && (
                isReportAccepted || isPaid ? (
                  <CustomerReportSettlementCard
                    inspectionId={inspectionId}
                    versionId={openVersion.id}
                    versionNo={openVersion.versionNo}
                    isPaid={isPaid}
                    isReportAccepted={isReportAccepted}
                    isPaymentCancelled={isPaymentCancelled}
                    isPaymentConfirming={isPaymentConfirming}
                    paymentStatus={paymentStatus}
                    acceptPending={acceptReport.isPending}
                    sepayPending={sepayLink.isPending}
                    vnpayPending={vnpayLink.isPending}
                    gatewayError={sepayLink.error ?? vnpayLink.error}
                    disputeSubmitted={disputeSubmitted}
                    disputeReason={disputeReason.trim() || null}
                    disputeSubmittedAt={disputeSubmittedAt}
                    onAcceptReport={() =>
                      acceptReport.mutate(openVersion.id, {
                        onSuccess: () => {
                          void paymentStatusQuery.refetch();
                        },
                      })
                    }
                    onProceedToSepay={() => {
                      setSepayQrOpen(false);
                      sepayLink.mutate(undefined, {
                        onSuccess: () => setSepayQrOpen(true),
                      });
                    }}
                    onProceedToVnPay={() => vnpayLink.mutate()}
                    onOpenDispute={() => setDisputeOpen(true)}
                  />
                ) : (
                  <CustomerReportAcceptanceBar
                    acceptPending={acceptReport.isPending}
                    acceptError={acceptReport.error}
                    disputeSubmitted={disputeSubmitted}
                    disputeReason={disputeReason.trim() || null}
                    disputeSubmittedAt={disputeSubmittedAt}
                    amountVnd={
                      paymentStatus?.amount ? `${formatNumber(paymentStatus.amount)} ₫` : null
                    }
                    onAcceptReport={() =>
                      acceptReport.mutate(openVersion.id, {
                        onSuccess: () => {
                          void paymentStatusQuery.refetch();
                        },
                      })
                    }
                    onOpenDispute={() => setDisputeOpen(true)}
                  />
                )
              )}

              <SepayQrDialog
                details={sepayQrOpen ? sepayLink.data : undefined}
                amountVnd={
                  paymentStatus?.amount
                    ? `${formatNumber(paymentStatus.amount)} ₫`
                    : undefined
                }
                checking={paymentStatusQuery.isFetching}
                onCheckNow={() => void paymentStatusQuery.refetch()}
                onClose={() => setSepayQrOpen(false)}
              />

              {/* Platform Manager / Inspector Revenue, Commission & Auto-Disbursement Summary */}
              {!isClientPortal && (
                <InspectorPayoutSummaryBar
                  inspectionId={inspectionId}
                  paymentDetails={paymentStatus}
                  roleView={isManagerPortal ? 'manager' : 'inspector'}
                />
              )}
              <ReportDeliverableTabs
                inspectionId={inspectionId}
                openVersion={openVersion}
                findings={findings.data ?? []}
                evidenceList={evidence.data ?? []}
                reinspectionVerifications={reinspectionVerifications?.data}
                canEdit={canAuthor && canEditReturnedText}
                assetName={inspectionQuery.data?.assetName}
                droneSummary={resolvedDroneSummary}
                flightPermitFileName={resolvedPermitFileName}
              />
              {canReviewReport && !isAuthor && openVersion.status === 'SUBMITTED' && (
                <ReportReviewDecisionBar
                  isPending={review.isPending}
                  reportReadLoading={reportReadLoading}
                  hasReadError={Boolean(findings.error || evidence.error)}
                  showReturnBox={showReturnBox}
                  reviewReason={reviewReason}
                  onReviewReasonChange={setReviewReason}
                  onShowReturnBox={setShowReturnBox}
                  onApprove={() => review.mutate({ versionId: openVersion.id })}
                  onReturn={() =>
                    review.mutate({
                      versionId: openVersion.id,
                      reason: reviewReason.trim(),
                    })
                  }
                  reviewError={review.error}
                  isReviewError={review.isError}
                />
              )}
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
        slotProps={{ paper: { sx: { borderRadius: '10px', p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {t('File a dispute / Request clarification')}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {priorClarificationCount >= 2 && (
              <Alert severity="error" sx={{ borderRadius: '8px' }}>
                {t('Clarification limit reached. Contact your Manager.')}
              </Alert>
            )}
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
            {requestClarification.isError && (
              <Alert severity="error" sx={{ borderRadius: '8px' }}>
                {t('Request not sent. Try again.')}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDisputeOpen(false)} color="inherit" sx={{ textTransform: 'none' }}>
            {t('Cancel')}
          </Button>
          <Button
            variant="contained"
            color="warning"
            disabled={priorClarificationCount >= 2 || !disputeReason.trim() || requestClarification.isPending}
            onClick={() => {
              if (!openVersion) return;
              requestClarification.mutate(
                { versionId: openVersion.id, reason: disputeReason.trim() },
                {
                  onSuccess: () => {
                    setDisputeSubmittedAt(new Date().toISOString());
                    setDisputeSubmitted(true);
                    setDisputeOpen(false);
                  },
                },
              );
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
