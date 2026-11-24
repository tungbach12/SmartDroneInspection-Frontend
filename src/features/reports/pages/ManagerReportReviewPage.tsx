import { useRef, useState } from 'react';
import { Link as RouterLink, useLocation, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { contractApi, contractQueryKeys, type ServiceRequestOccurrence } from '@/features/contracts/api/contractApi';
import { OccurrenceFinanceDrawer } from '@/features/contracts/manager/components/OccurrenceFinanceDrawer';
import { useToastStore } from '@/shared/ui/Toast';
import {
  Alert,
  Box,
  Button,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { getErrorMessage } from '@/shared/api/errorMessage';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import { MutationProblemAlert } from '@/shared/ui/MutationProblemAlert';
import { StatusChip } from '@/shared/ui/StatusChip';
import { PageBreadcrumbs } from '@/shared/ui/PageBreadcrumbs';
import {
  getSectionPath,
  PORTAL_IDS,
  type PortalId,
} from '@/app/permissions/accessPolicy';
import { useAuthStore } from '@/features/auth/store/authStore';
import {
  useFieldSessions,
  useInspection,
  useInspectionEvidence,
  useInspectionFindings,
  usePublishReportVersion,
  useReinspectionVerifications,
  useReportPaymentStatus,
  useReportVersions,
  useReviewReportVersion,
} from '@/features/inspections/hooks/useInspections';
import { FlightPermitPreviewDialog } from '@/features/inspections/components/FlightPermitPreviewDialog';
import { FlightPermitVerificationPanel } from '@/features/inspections/components/FlightPermitVerificationPanel';
import { PlatformSettlementInvoiceCard } from '@/features/inspections/components/PlatformSettlementInvoiceCard';
import { resolveInspectorFinanceBreakdown } from '@/features/inspections/utils/inspectorFinance';
import { FlightOperationsReportView } from '@/features/reports/components/FlightOperationsReportView';
import { ReportDeliverableTabs } from '@/features/reports/components/ReportDeliverableTabs';
import { ReportReviewDecisionBar } from '@/features/reports/components/ReportReviewDecisionBar';
import { EmptyState } from '@/shared/ui/EmptyState';
import { QueryState } from '@/shared/ui/QueryState';
import { useLocale } from '@/shared/i18n/LocaleProvider';

export interface ManagerReportReviewPageProps {
  stage?: 'audit' | 'review' | 'settlement';
}

/**
 * Dedicated Report Review page for Platform Manager (/manager/inspections/:id/audit | /review | /settlement).
 * Focused strictly on reviewing submitted reports, publishing approved versions, and viewing platform commission.
 */
export default function ManagerReportReviewPage({
  stage,
}: ManagerReportReviewPageProps = {}) {
  const { formatNumber, t } = useLocale();
  const { inspectionId = '' } = useParams<{ inspectionId: string }>();
  const location = useLocation();
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const portal = (location.pathname.split('/').filter(Boolean)[0] ??
    PORTAL_IDS[0]) as PortalId;
  const userId = useAuthStore((state) => state.userId);
  const showAuditStage = stage === 'audit';
  const showReviewStage = !stage || stage === 'review';
  const showSettlementStage = !stage || stage === 'settlement';

  const [openVersionId, setOpenVersionId] = useState<string | null>(null);
  const [reviewReason, setReviewReason] = useState('');
  const [showReturnBox, setShowReturnBox] = useState(false);
  const [permitPreviewOpen, setPermitPreviewOpen] = useState(false);
  const [prePublishPayoutRef, setPrePublishPayoutRef] = useState('');
  const [prePublishPayoutBusy, setPrePublishPayoutBusy] = useState(false);
  const [prePublishPayoutError, setPrePublishPayoutError] = useState<string | null>(null);
  const payoutGateRef = useRef<HTMLDivElement>(null);
  const [financeDrawerTarget, setFinanceDrawerTarget] = useState<{
    requestId: string;
    occurrence: ServiceRequestOccurrence;
  } | null>(null);

  const inspectionQuery = useInspection(inspectionId);
  const fieldSessionsQuery = useFieldSessions(inspectionId);
  const versions = useReportVersions(inspectionId);
  const findings = useInspectionFindings(inspectionId);
  const evidence = useInspectionEvidence(inspectionId);
  const reinspectionVerifications = useReinspectionVerifications?.(inspectionId);
  const review = useReviewReportVersion(inspectionId);
  const publishReport = usePublishReportVersion(inspectionId);
  const paymentStatusQuery = useReportPaymentStatus(inspectionId);

  const openVersion =
    versions.data?.find((version) => version.id === openVersionId) ??
    versions.data?.[0] ??
    null;

  const isAuthor = Boolean(openVersion && userId === openVersion.authorUserId);
  const reportReadLoading =
    findings.isLoading || evidence.isLoading || Boolean(findings.error || evidence.error);

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
  const auditFieldSessionId =
    openVersion?.reportContext?.fieldSessions?.at(-1)?.id ??
    fieldSessionsQuery.data?.at(-1)?.id ??
    null;

  const isPaid =
    Boolean(paymentStatusQuery.data?.paid) ||
    paymentStatusQuery.data?.paymentStatus === 'PAID';
  const isAccepted = Boolean(paymentStatusQuery.data?.reportAccepted) || isPaid;
  const payoutStatus = (paymentStatusQuery.data?.payoutStatus ?? '').toUpperCase();
  const isPayoutSettled = payoutStatus === 'PAID' || payoutStatus === 'SETTLED';
  const financeBreakdown = resolveInspectorFinanceBreakdown(
    inspectionId,
    inspectionQuery.data,
    paymentStatusQuery.data,
  );

  const isApproved = openVersion?.status === 'APPROVED';
  const notPublished = Boolean(openVersion && openVersion.status !== 'PUBLISHED' && !isApproved);
  const customerStatusNotice = isApproved ? (
    <Alert severity={isPayoutSettled ? 'success' : 'warning'} sx={{ borderRadius: '10px', py: 0.75 }} aria-live="polite">
      {isPayoutSettled
        ? t('Report approved and Inspector payout settled. Ready to publish to Customer.')
        : t('Report approved. Settle Inspector payout before publishing to Customer.')}
    </Alert>
  ) : notPublished ? (
    <Alert severity="info" sx={{ borderRadius: '10px', py: 0.75 }} aria-live="polite">
      {t('Not yet published')}
    </Alert>
  ) : isPaid ? (
    <Alert severity="success" sx={{ borderRadius: '10px', py: 0.75 }} aria-live="polite">
      {t('Paid & settled')}
    </Alert>
  ) : (
    <Alert severity="info" sx={{ borderRadius: '10px', py: 0.75 }} aria-live="polite">
      {isAccepted
        ? t('Customer accepted the report. Awaiting payment.')
        : t('Report published. Awaiting customer acceptance.')}
    </Alert>
  );

  const isEmbeddedInInspectionWorkspace = location.pathname.includes('/inspections/');

  const findMatchedOccurrence = async () => {
    const requests = await contractApi.listRequests();
    for (const req of requests) {
      const occ = req.occurrences?.find((item) => item.inspectionId === inspectionId);
      if (occ) {
        return { requestId: req.id, occurrence: occ };
      }
    }
    return null;
  };

  const refreshFinanceContext = async () => {
    await Promise.all([
      paymentStatusQuery.refetch(),
      inspectionQuery.refetch(),
      queryClient.invalidateQueries({ queryKey: ['finance-history'] }),
      queryClient.invalidateQueries({ queryKey: contractQueryKeys.requests() }),
    ]);
    if (financeDrawerTarget) {
      const latest = await findMatchedOccurrence().catch(() => null);
      if (latest) {
        setFinanceDrawerTarget(latest);
      }
    }
  };

  const handleOpenFinanceDrawer = async () => {
    try {
      const matched = await findMatchedOccurrence();
      if (!matched) {
        showToast(t('Linked service request occurrence could not be found.'), 'error');
        return;
      }
      setFinanceDrawerTarget(matched);
    } catch {
      showToast(t('Unable to load financial drawer.'), 'error');
    }
  };

  const handleInlineSettlePayout = async (payoutReference: string) => {
    const matched = await findMatchedOccurrence();
    if (!matched) {
      throw new Error(t('Linked service request occurrence could not be found.'));
    }
    await contractApi.recordOccurrencePayout(matched.requestId, matched.occurrence.id, {
      payoutReference,
    });
    showToast(t('Inspector partner payout settled.'), 'success');
    await refreshFinanceContext();
  };

  return (
    <Box className="workspace-page workspace-page--reports" sx={{ width: '100%', maxWidth: '1440px', mx: 'auto' }}>
      {!isEmbeddedInInspectionWorkspace && (
        <Box sx={{ mb: 3 }}>
          <PageBreadcrumbs
            items={[
              { label: t('Dashboard'), to: getSectionPath(portal, 'dashboard') },
              {
                label: t('Inspections'),
                to: getSectionPath(portal, 'inspections'),
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

      {showAuditStage ? (
        <Stack spacing={2.5}>
          {inspectionQuery.data && (
            <FlightPermitVerificationPanel
              inspection={inspectionQuery.data}
              onPreviewPermit={() => setPermitPreviewOpen(true)}
              compact
              showAirspace={false}
              showPendingPrompt={false}
            />
          )}

          {inspectionQuery.data?.flightPermitFileName && (
            <FlightPermitPreviewDialog
              open={permitPreviewOpen}
              onClose={() => setPermitPreviewOpen(false)}
              inspectionId={inspectionId}
              fileName={inspectionQuery.data.flightPermitFileName}
              uploadedAt={inspectionQuery.data.flightPermitUploadedAt}
              assetName={inspectionQuery.data.assetName}
              droneSummary={resolvedDroneSummary}
              permitNumber={inspectionQuery.data.flightPermitNumber}
              issuingAuthority={inspectionQuery.data.flightPermitAuthority}
              validFrom={inspectionQuery.data.flightPermitValidFrom}
              validTo={inspectionQuery.data.flightPermitValidTo}
              verificationStatus={inspectionQuery.data.flightPermitVerificationStatus}
              fileSha256={inspectionQuery.data.flightPermitFileSha256}
            />
          )}

          {auditFieldSessionId && (
            <FlightOperationsReportView
              inspectionId={inspectionId}
              fieldSessionId={auditFieldSessionId}
              version={openVersion}
              evidenceList={evidence.data ?? []}
              assetName={inspectionQuery.data?.assetName}
              droneSummary={resolvedDroneSummary}
              flightPermitFileName={resolvedPermitFileName}
              collapsible
            />
          )}

          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              component={RouterLink}
              to="../review"
              variant="contained"
              sx={{ textTransform: 'none', fontWeight: 650, flexShrink: 0 }}
            >
              {t('Continue to Report Decision')}
            </Button>
          </Box>
        </Stack>
      ) : showSettlementStage && stage === 'settlement' ? (
        <Stack spacing={2.5}>
          {(notPublished || isApproved) && customerStatusNotice}
          <PlatformSettlementInvoiceCard
            inspectionId={inspectionId}
            paymentDetails={paymentStatusQuery.data}
            inspectorName={inspectionQuery.data?.inspectorName}
            onSettlePayout={portal === 'manager' ? handleInlineSettlePayout : undefined}
            onManageFinance={
              portal === 'manager' ? () => void handleOpenFinanceDrawer() : undefined
            }
          />
        </Stack>
      ) : (
      <QueryState
        isLoading={versions.isLoading}
        error={versions.error}
        isEmpty={!versions.data?.length}
        onRetry={() => void versions.refetch()}
        empty={
          <EmptyState
            title={t('No report versions found')}
            description={
              inspectionQuery.data?.inspectorName
                ? `${t('Waiting for')} ${inspectionQuery.data.inspectorName} ${t('to finalize findings and submit the technical report.')}`
                : t('The assigned Inspector creates a report draft once field evidence is accepted.')
            }
          />
        }
      >
        {openVersion && (
          <Stack spacing={3}>
            {showReviewStage && openVersion.status === 'PUBLISHED' && customerStatusNotice}

            {showReviewStage && openVersion.status === 'APPROVED' && (
              <Alert
                severity={isPayoutSettled ? 'success' : 'warning'}
                sx={{ borderRadius: '10px', alignItems: 'center' }}
                action={
                  <Button
                    color="inherit"
                    size="small"
                    onClick={() =>
                      payoutGateRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }
                    sx={{ textTransform: 'none', fontWeight: 650, whiteSpace: 'nowrap' }}
                  >
                    {isPayoutSettled ? t('Go to publish') : t('Go to payout')}
                  </Button>
                }
              >
                {isPayoutSettled
                  ? t('Report approved and Inspector payout settled. Ready to publish to Customer.')
                  : t('Report approved. Settle Inspector payout before publishing to Customer.')}
              </Alert>
            )}

            {showSettlementStage && (
              <PlatformSettlementInvoiceCard
                inspectionId={inspectionId}
                paymentDetails={paymentStatusQuery.data}
                inspectorName={inspectionQuery.data?.inspectorName}
                onSettlePayout={portal === 'manager' ? handleInlineSettlePayout : undefined}
                onManageFinance={
                  portal === 'manager' ? () => void handleOpenFinanceDrawer() : undefined
                }
              />
            )}

            {showReviewStage && (
              <ReportDeliverableTabs
                inspectionId={inspectionId}
                versions={versions.data}
                openVersion={openVersion}
                onSelectVersion={setOpenVersionId}
                findings={findings.data ?? []}
                evidenceList={evidence.data ?? []}
                fieldSessions={fieldSessionsQuery.data}
                reinspectionVerifications={reinspectionVerifications?.data}
                assetName={inspectionQuery.data?.assetName}
                droneSummary={resolvedDroneSummary}
                flightPermitFileName={resolvedPermitFileName}
              />
            )}

            {showReviewStage && openVersion.status === 'APPROVED' && (
              <Box ref={payoutGateRef}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2.5,
                    borderRadius: '12px',
                    borderColor: isPayoutSettled ? 'divider' : 'warning.main',
                    bgcolor: 'background.paper',
                    boxShadow: 'none',
                  }}
                >
                  <Stack spacing={2}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                        {t('Report decision & payout gate')}
                      </Typography>
                      <StatusChip status="approved" label={t('Approved')} tone="info" />
                      <StatusChip
                        status={isPayoutSettled ? 'settled' : 'payout_pending'}
                        label={isPayoutSettled ? t('Payout settled') : t('Payout eligible')}
                        tone={isPayoutSettled ? 'success' : 'warning'}
                      />
                    </Stack>

                    {!isPayoutSettled ? (
                      <>
                        <Alert severity="warning" sx={{ borderRadius: '8px' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {t('Inspector payout required before publishing to Customer')}
                          </Typography>
                          {(inspectionQuery.data?.inspectorName || financeBreakdown) && (
                            <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                              {inspectionQuery.data?.inspectorName ? `${inspectionQuery.data.inspectorName}` : t('Inspector')}
                              {financeBreakdown
                                ? ` · ${t('Inspector net payout')}: ${formatNumber(financeBreakdown.netPayoutAmount)} ₫`
                                : ''}
                            </Typography>
                          )}
                        </Alert>

                        {prePublishPayoutError && (
                          <Alert
                            severity="error"
                            onClose={() => setPrePublishPayoutError(null)}
                            sx={{ borderRadius: '8px' }}
                          >
                            {prePublishPayoutError}
                          </Alert>
                        )}

                        {portal === 'manager' && (
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' }, flexWrap: 'wrap' }}>
                            <TextField
                              size="small"
                              placeholder={t('Bank transfer reference (e.g. UNC-VCB-20261110)')}
                              value={prePublishPayoutRef}
                              onChange={(e) => setPrePublishPayoutRef(e.target.value)}
                              sx={{ flex: 1, minWidth: { sm: 240 } }}
                            />
                            <LoadingButton
                              size="small"
                              variant="contained"
                              color="primary"
                              loading={prePublishPayoutBusy}
                              disabled={!prePublishPayoutRef.trim()}
                              onClick={async () => {
                                setPrePublishPayoutBusy(true);
                                setPrePublishPayoutError(null);
                                try {
                                  await handleInlineSettlePayout(prePublishPayoutRef.trim());
                                  setPrePublishPayoutRef('');
                                } catch (err) {
                                  setPrePublishPayoutError(
                                    getErrorMessage(err, t('Could not settle payout.')),
                                  );
                                } finally {
                                  setPrePublishPayoutBusy(false);
                                }
                              }}
                              sx={{ textTransform: 'none', fontWeight: 650, whiteSpace: 'nowrap', borderRadius: '8px', boxShadow: 'none' }}
                            >
                              {t('Settle Inspector payout')}
                            </LoadingButton>
                            <Button
                              component={RouterLink}
                              to="../settlement"
                              size="small"
                              variant="outlined"
                              color="inherit"
                              sx={{ textTransform: 'none', fontWeight: 600, whiteSpace: 'nowrap', borderRadius: '8px', borderColor: 'divider' }}
                            >
                              {t('Go to Commission & Settlement')}
                            </Button>
                            <Button
                              component={RouterLink}
                              to="/manager/payout-settlements"
                              size="small"
                              variant="outlined"
                              color="inherit"
                              sx={{ textTransform: 'none', fontWeight: 600, whiteSpace: 'nowrap', borderRadius: '8px', borderColor: 'divider' }}
                            >
                              {t('Open Inspector payouts')}
                            </Button>
                          </Stack>
                        )}

                        <Divider />
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}>
                          <Typography variant="caption" color="text.secondary">
                            {t('Settle Inspector payout to unlock publishing.')}
                          </Typography>
                          <Button
                            variant="contained"
                            disabled
                            sx={{ textTransform: 'none', fontWeight: 650, borderRadius: '8px', boxShadow: 'none' }}
                          >
                            {t('Publish to Customer')}
                          </Button>
                        </Stack>
                      </>
                    ) : (
                      <>
                        <Alert severity="success" sx={{ borderRadius: '8px' }}>
                          {t('Inspector payout settled')}
                          {paymentStatusQuery.data?.payoutReference
                            ? ` · ${t('Ref')}: ${paymentStatusQuery.data.payoutReference}`
                            : ''}
                        </Alert>
                        <MutationProblemAlert
                          error={publishReport.error}
                          isError={publishReport.isError}
                          fallbackMessage={t('The report could not be published.')}
                        />
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <LoadingButton
                            variant="contained"
                            color="primary"
                            loading={publishReport.isPending}
                            onClick={() => publishReport.mutate({ versionId: openVersion.id })}
                            sx={{ textTransform: 'none', fontWeight: 650, borderRadius: '8px', px: 2.5, boxShadow: 'none' }}
                          >
                            {publishReport.isPending ? t('Publishing…') : t('Publish to Customer')}
                          </LoadingButton>
                        </Box>
                      </>
                    )}
                  </Stack>
                </Paper>
              </Box>
            )}

            {showReviewStage && openVersion.status === 'SUBMITTED' && !isAuthor && (
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
                approveLabel={portal === 'manager' ? t('Approve report') : undefined}
                pendingApproveLabel={portal === 'manager' ? t('Approving…') : undefined}
                confirmTitle={portal === 'manager' ? t('Approve report?') : undefined}
                confirmMessage={
                  portal === 'manager'
                    ? t('Are you sure you want to approve this report? By approving, you confirm the inspection results are accurate and take responsibility for this decision.')
                    : undefined
                }
                confirmLabel={portal === 'manager' ? t('Approve report') : undefined}
              />
            )}

            {stage === 'review' && openVersion.status === 'PUBLISHED' && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  component={RouterLink}
                  to="../settlement"
                  variant="contained"
                  sx={{ textTransform: 'none', fontWeight: 650, borderRadius: '8px', px: 2.5, flexShrink: 0 }}
                >
                  {t('Continue to Commission & Settlement')}
                </Button>
              </Box>
            )}
          </Stack>
        )}
      </QueryState>
      )}

      <OccurrenceFinanceDrawer
        open={Boolean(financeDrawerTarget)}
        onClose={() => setFinanceDrawerTarget(null)}
        requestId={financeDrawerTarget?.requestId ?? ''}
        occurrence={financeDrawerTarget?.occurrence ?? null}
        onChanged={() => void refreshFinanceContext()}
      />
    </Box>
  );
}
