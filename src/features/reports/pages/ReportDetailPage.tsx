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
import BuildOutlined from '@mui/icons-material/BuildOutlined';
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
  useCreateInspectionPayOSLink,
  useCreateInspectionVnPayUrl,
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
import ManagerReportReviewPage from './ManagerReportReviewPage';
import CustomerReportDeliverablePage from './CustomerReportDeliverablePage';
import { ReportDeliverableTabs } from '@/features/reports/components/ReportDeliverableTabs';
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
  SUBMITTED: 'Waiting for a qualified reviewer to publish or return.',
  RETURNED: 'Returned to the author for revision.',
  PUBLISHED: 'Published. This version is immutable.',
  SUPERSEDED: 'Superseded by a later version.',
};

export default function ReportDetailPage() {
  const { t } = useLocale();
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

  useEffect(() => {
    if (!inspectionId || typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(`sdi_report_dispute_${inspectionId}`);
      if (!raw) {
        setDisputeSubmitted(false);
        setDisputeReason('');
        setDisputeSubmittedAt(null);
        return;
      }
      const parsed = JSON.parse(raw) as { reason?: string; submittedAt?: string };
      if (parsed && typeof parsed.reason === 'string') {
        setDisputeReason(parsed.reason);
        setDisputeSubmittedAt(typeof parsed.submittedAt === 'string' ? parsed.submittedAt : null);
        setDisputeSubmitted(true);
      } else {
        setDisputeReason(raw);
        setDisputeSubmitted(true);
      }
    } catch {
      // ignore
    }
  }, [inspectionId]);

  const inspectionQuery = useInspection(inspectionId);
  const isReinspection = inspectionQuery.data?.inspectionType === 'RE_INSPECTION';
  const isClientPortal = portal === 'client';
  const isManagerPortal = portal === 'admin' || portal === 'manager';

  const versions = useReportVersions(inspectionId);
  const findings = useInspectionFindings(inspectionId);
  const evidence = useInspectionEvidence(inspectionId);
  const reinspectionVerifications = useReinspectionVerifications(inspectionId);
  const workflowState = useInspectionWorkflowState(inspectionId);
  const submit = useSubmitReportVersion(inspectionId);
  const withdraw = useWithdrawReportVersion(inspectionId);
  const review = useReviewReportVersion(inspectionId);
  const acceptReport = useAcceptReportVersion(inspectionId);
  const payosLink = useCreateInspectionPayOSLink(inspectionId);
  const vnpayLink = useCreateInspectionVnPayUrl(inspectionId);
  const paymentStatusQuery = useReportPaymentStatus(inspectionId);
  const paymentStatus = paymentStatusQuery.data;
  const searchParams = new URLSearchParams(location.search);
  const isPaymentCancelled = searchParams.get('payment') === 'cancelled';
  const isPaid = Boolean(
    paymentStatus?.paid ||
      paymentStatus?.paymentStatus === 'PAID' ||
      searchParams.get('payment') === 'success',
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
  const confirmedFindingsList = (findings.data ?? []).filter(
    (item) => item.status === 'CONFIRMED' && !item.isDeleted,
  );
  const hasForwardedFindings = confirmedFindingsList.some(
    (item) => item.forwardedToMaintenanceAt != null,
  );
  const publishedUnhanded =
    openVersion?.status === 'PUBLISHED' &&
    (inspectionStatus === 'COMPLETED' || inspectionStatus == null) &&
    !hasForwardedFindings;
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
                label: canReview && !canAuthor ? t('Review queue') : t('Reports'),
                to: `${getSectionPath(portal, 'inspections')}?view=reports`,
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
                    : `${t('Published version')} ${review.data?.versionNo ?? openVersion.versionNo}. The PDF is immutable; forward confirmed findings to maintenance individually when they require corrective work.`
                  : (NEXT_STEP[openVersion.status] ?? openVersion.status)}
              </Alert>

              {/* Reviewer / Author Action controls */}
              {openVersion.status !== 'PUBLISHED' && (
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

                    {/* Reviewer approval or return step */}
                    {canReviewReport && !isAuthor && openVersion.status === 'SUBMITTED' && (
                      <Stack spacing={2}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          {t('Review the submitted report')}
                        </Typography>
                        <ReportAiSummaryCard
                          inspectionId={inspectionId}
                          versionId={openVersion.id}
                          summary={openVersion.summary}
                          findings={findings.data ?? []}
                        />
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
                              disabled={review.isPending || reportReadLoading}
                              onClick={() => review.mutate({ versionId: openVersion.id })}
                              sx={{ borderRadius: '8px', px: 2.5 }}
                            >
                              {review.isPending
                                ? t('Publishing…')
                                : t('Approve & publish')}
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
                  </Stack>
                </Paper>
              )}

              {/* Customer Report Acceptance & Payment Gate (Customer view only) */}
              {openVersion.status === 'PUBLISHED' && isClientPortal && (
                <CustomerReportSettlementCard
                  inspectionId={inspectionId}
                  versionId={openVersion.id}
                  versionNo={openVersion.versionNo}
                  summary={openVersion.summary}
                  findings={findings.data ?? []}
                  isPaid={isPaid}
                  isReportAccepted={isReportAccepted}
                  isPaymentCancelled={isPaymentCancelled}
                  paymentStatus={paymentStatus}
                  acceptPending={acceptReport.isPending}
                  payosPending={payosLink.isPending}
                  vnpayPending={vnpayLink.isPending}
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
                  onProceedToPayOS={() => payosLink.mutate()}
                  onProceedToVnPay={() => vnpayLink.mutate()}
                  onOpenDispute={() => setDisputeOpen(true)}
                />
              )}

              {/* Platform Manager / Inspector Revenue, Commission & Auto-Disbursement Summary */}
              {!isClientPortal && (
                <InspectorPayoutSummaryBar
                  inspectionId={inspectionId}
                  paymentDetails={paymentStatus}
                  roleView={isManagerPortal ? 'manager' : 'inspector'}
                />
              )}

              {/* Customer Maintenance Handoff (Customer / Organization Manager view only — never shown in Platform Manager review workspace) */}
              {canReview && !isManagerPortal && publishedUnhanded && !isReinspection && (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: '10px',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: { sm: 'center' },
                    justifyContent: 'space-between',
                    gap: 2,
                  }}
                >
                  <Stack direction="row" spacing={1.25} sx={{ alignItems: 'flex-start' }}>
                    <BuildOutlined color="primary" sx={{ mt: 0.25 }} />
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {t('Send to Maintenance (MF3-12)')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t(
                          'Select confirmed findings to forward to your maintenance team as repair candidates.',
                        )}
                      </Typography>
                    </Box>
                  </Stack>
                  <Button
                    variant="contained"
                    component={RouterLink}
                    to={`${getSectionPath(portal, 'inspections')}/${inspectionId}/corrective`}
                    sx={{ textTransform: 'none', fontWeight: 650, borderRadius: '8px', flexShrink: 0 }}
                  >
                    {t('Send findings to Maintenance')}
                  </Button>
                </Paper>
              )}

              {publishedUnhanded && isReinspection && (
                <Alert severity="info" sx={{ borderRadius: '10px' }}>
                  {t(
                    'This is a re-inspection deliverable verifying previous repair work. Findings verification has been recorded directly to the linked maintenance work order.',
                  )}
                </Alert>
              )}

              <ReportDeliverableTabs
                inspectionId={inspectionId}
                openVersion={openVersion}
                findings={findings.data ?? []}
                evidenceList={evidence.data ?? []}
                canEdit={canAuthor && canEditReturnedText}
                onSaveSections={(sections) => handleSaveSections(openVersion.id, sections)}
                reinspectionVerifications={reinspectionVerifications.data}
                assetName={inspectionQuery.data?.assetName}
                droneSummary={resolvedDroneSummary}
                flightPermitFileName={resolvedPermitFileName}
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
        slotProps={{ paper: { sx: { borderRadius: '10px', p: 1 } } }}
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
              const timestamp = new Date().toISOString();
              try {
                localStorage.setItem(
                  `sdi_report_dispute_${inspectionId}`,
                  JSON.stringify({
                    reason: disputeReason.trim(),
                    submittedAt: timestamp,
                  }),
                );
              } catch {
                // ignore
              }
              setDisputeSubmittedAt(timestamp);
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
