import { useEffect, useState } from 'react';
import { Link as RouterLink, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { contractApi, contractQueryKeys, type ServiceRequestOccurrence } from '@/features/contracts/api/contractApi';
import { OccurrenceFinanceDrawer } from '@/features/contracts/manager/components/OccurrenceFinanceDrawer';
import type { SepayCheckoutDetails } from '@/features/inspections/api/inspectionApi';
import { formatVietQrBankDisplay } from '@/shared/constants/vietQrBanks';
import { SepayVietQrLogoMark } from '@/shared/ui/PaymentBrandLogos';
import { useToastStore } from '@/shared/ui/Toast';
import {
  Alert,
  Box,
  Button,
  Divider,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import CheckRounded from '@mui/icons-material/CheckRounded';
import ContentCopyOutlined from '@mui/icons-material/ContentCopyOutlined';
import LockOutlined from '@mui/icons-material/LockOutlined';
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
import { useIsDarkMode } from '@/app/layouts/ColorModeContext';
import {
  useCreateInspectionSepayPayoutLink,
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
import { SepayPayoutQrDialog } from '@/features/reports/components/SepayPayoutQrDialog';
import { EmptyState } from '@/shared/ui/EmptyState';
import { QueryState } from '@/shared/ui/QueryState';
import { useLocale } from '@/shared/i18n/LocaleProvider';

export interface ManagerReportReviewPageProps {
  stage?: 'audit' | 'review' | 'payout' | 'settlement';
}

/**
 * Dedicated Report Review page for Platform Manager (/manager/inspections/:id/audit | /review | /payout | /settlement).
 * Focused strictly on reviewing submitted reports, settling Inspector payout, publishing approved versions, and viewing customer settlement.
 */
export default function ManagerReportReviewPage({
  stage,
}: ManagerReportReviewPageProps = {}) {
  const { formatNumber, t } = useLocale();
  const isDark = useIsDarkMode();
  const { inspectionId = '' } = useParams<{ inspectionId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const portal = (location.pathname.split('/').filter(Boolean)[0] ??
    PORTAL_IDS[0]) as PortalId;
  const userId = useAuthStore((state) => state.userId);
  const showAuditStage = stage === 'audit';
  const showReviewStage = !stage || stage === 'review';
  const showPayoutStage = stage === 'payout';
  const showSettlementStage = !stage || stage === 'settlement';

  const [openVersionId, setOpenVersionId] = useState<string | null>(null);
  const [reviewReason, setReviewReason] = useState('');
  const [showReturnBox, setShowReturnBox] = useState(false);
  const [permitPreviewOpen, setPermitPreviewOpen] = useState(false);
  const [payoutQrDetails, setPayoutQrDetails] = useState<SepayCheckoutDetails | undefined>(
    undefined,
  );
  const [prePublishPayoutError, setPrePublishPayoutError] = useState<string | null>(null);
  const [copiedAccount, setCopiedAccount] = useState(false);
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
  const createSepayPayoutLink = useCreateInspectionSepayPayoutLink(inspectionId);
  const paymentStatusQuery = useReportPaymentStatus(inspectionId, {
    pollWhenPayoutUnpaid: Boolean(payoutQrDetails),
  });

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
  const inspectorBankName = paymentStatusQuery.data?.inspectorBankName?.trim() ?? '';
  const inspectorBankAccountNumber =
    paymentStatusQuery.data?.inspectorBankAccountNumber?.trim() ?? '';
  const inspectorBankAccountHolder =
    paymentStatusQuery.data?.inspectorBankAccountHolder?.trim() ?? '';
  const inspectorBankBranch = paymentStatusQuery.data?.inspectorBankBranch?.trim() ?? '';
  const hasCompleteBankDetails = Boolean(
    inspectorBankName && inspectorBankAccountNumber && inspectorBankAccountHolder,
  );

  const handleCopyAccount = async (value: string) => {
    try {
      await navigator.clipboard?.writeText(value);
      setCopiedAccount(true);
      window.setTimeout(() => setCopiedAccount(false), 1800);
    } catch {
      // Ignore clipboard failures in restricted environments
    }
  };

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

  const handleOpenSepayPayoutQr = async () => {
    setPrePublishPayoutError(null);
    try {
      const details = await createSepayPayoutLink.mutateAsync();
      if (details?.checkoutUrl) {
        setPayoutQrDetails(details);
      }
    } catch (err) {
      setPrePublishPayoutError(
        getErrorMessage(err, t('Could not create SePay payout QR link.')),
      );
    }
  };

  useEffect(() => {
    if (!payoutQrDetails || !isPayoutSettled) return;
    setPayoutQrDetails(undefined);
    showToast(t('Inspector payout confirmed via SePay.'), 'success');
    void refreshFinanceContext();
    // refreshFinanceContext triggers query refetches; dependencies intentionally track settlement transition.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payoutQrDetails, isPayoutSettled]);

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

            {showReviewStage && openVersion.status === 'APPROVED' && portal === 'manager' && (
              <Alert
                severity={isPayoutSettled ? 'success' : 'info'}
                sx={{ borderRadius: '10px', alignItems: 'center' }}
                action={
                  <Button
                    component={RouterLink}
                    to="../payout"
                    color="inherit"
                    size="small"
                    endIcon={<ArrowForwardRounded sx={{ fontSize: 16 }} />}
                    sx={{ textTransform: 'none', fontWeight: 650, whiteSpace: 'nowrap' }}
                  >
                    {isPayoutSettled
                      ? t('Continue to Publish Report')
                      : t('Continue to Inspector Payout')}
                  </Button>
                }
              >
                {isPayoutSettled
                  ? t('Report approved and Inspector payout settled. Ready to publish to Customer.')
                  : t('Report approved. Proceed to Inspector Payout before publishing to Customer.')}
              </Alert>
            )}

            {showSettlementStage && (
              <PlatformSettlementInvoiceCard
                inspectionId={inspectionId}
                paymentDetails={paymentStatusQuery.data}
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

            {showPayoutStage && (
              openVersion.status !== 'APPROVED' && openVersion.status !== 'PUBLISHED' ? (
                <Paper
                  variant="outlined"
                  sx={{ p: 3, borderRadius: '12px', borderColor: 'divider', bgcolor: 'background.paper' }}
                >
                  <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {t('Report approval required before Inspector payout')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('Approve the inspection report in Report Decision before transferring payout and publishing to Customer.')}
                    </Typography>
                    <Button
                      component={RouterLink}
                      to="../review"
                      variant="contained"
                      sx={{ textTransform: 'none', fontWeight: 650, borderRadius: '8px', boxShadow: 'none' }}
                    >
                      {t('Back to Report Decision')}
                    </Button>
                  </Stack>
                </Paper>
              ) : (
                <Paper
                  variant="outlined"
                  sx={{
                    width: '100%',
                    borderRadius: '12px',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                    boxShadow: 'none',
                    overflow: 'hidden',
                  }}
                >
                  {/* Unified Header Band */}
                  <Box
                    sx={{
                      px: { xs: 2.5, sm: 3 },
                      py: 2,
                      bgcolor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#FAFAFB',
                      borderBottom: '1px solid',
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : '#D4D4D8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 1.5,
                    }}
                  >
                    <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary' }}>
                      {t('Inspector Payout')}
                    </Typography>
                    {isPayoutSettled && (
                      <StatusChip
                        status="settled"
                        label={t('Payout settled')}
                        tone="success"
                      />
                    )}
                  </Box>

                  {/* Vertical Sequential Sections separated by crisp 2px section dividers */}
                  <Stack
                    divider={
                      <Divider
                        sx={{
                          borderBottomWidth: 2,
                          borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : '#D4D4D8',
                        }}
                      />
                    }
                  >
                    {/* 1. Top: Payout breakdown */}
                    <Box
                      sx={{
                        px: { xs: 2.5, sm: 3 },
                        py: 2.5,
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', md: 'minmax(240px, 1fr) minmax(0, 2fr)' },
                        gap: { xs: 1.5, md: 4 },
                        alignItems: 'start',
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary', pt: 0.75 }}>
                        {t('Payout breakdown')}
                      </Typography>
                      {financeBreakdown ? (
                        <Stack divider={<Divider sx={{ opacity: 0.55 }} />} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 3, py: 0.85 }}>
                            <Typography variant="body2" color="text.secondary">{t('Base fee')}</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                              {formatNumber(Math.round(financeBreakdown.serviceBaseAmount))} ₫
                            </Typography>
                          </Stack>
                          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 3, py: 0.85 }}>
                            <Typography variant="body2" color="text.secondary">
                              {`${t('Platform commission')} (${financeBreakdown.commissionRate}%)`}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              −{formatNumber(Math.round(financeBreakdown.commissionAmount))} ₫
                            </Typography>
                          </Stack>
                          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 3, py: 0.85 }}>
                            <Typography variant="body2" color="text.secondary">{t('Inspector gross payout')}</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                              {formatNumber(Math.round(financeBreakdown.afterCommissionAmount))} ₫
                            </Typography>
                          </Stack>
                          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 3, py: 0.85 }}>
                            <Typography variant="body2" color="text.secondary">
                              {`${t('TNCN tax')} (${financeBreakdown.tncnRate}%)`}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              −{formatNumber(Math.round(financeBreakdown.tncnAmount))} ₫
                            </Typography>
                          </Stack>
                          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', gap: 3, pt: 1.25 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                              {t('Inspector net payout')}
                            </Typography>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary', letterSpacing: '-0.01em' }}>
                              {formatNumber(Math.round(financeBreakdown.netPayoutAmount))} ₫
                            </Typography>
                          </Stack>
                        </Stack>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          {t('Payout breakdown unavailable for this inspection.')}
                        </Typography>
                      )}
                    </Box>

                    {/* 2. Middle: Recipient bank account & SePay payout */}
                    <Box
                      sx={{
                        px: { xs: 2.5, sm: 3 },
                        py: 2.5,
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', md: 'minmax(240px, 1fr) minmax(0, 2fr)' },
                        gap: { xs: 1.5, md: 4 },
                        alignItems: 'start',
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary', pt: 0.75 }}>
                        {t('Recipient bank account')}
                      </Typography>

                      <Stack spacing={2}>
                        {hasCompleteBankDetails ? (
                          <Stack divider={<Divider sx={{ opacity: 0.55 }} />}>
                            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 3, py: 0.85 }}>
                              <Typography variant="body2" color="text.secondary">{t('Bank name')}</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', textAlign: 'right' }}>
                                {formatVietQrBankDisplay(inspectorBankName)}
                              </Typography>
                            </Stack>
                            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 3, py: 0.85 }}>
                              <Typography variant="body2" color="text.secondary">{t('Bank account number')}</Typography>
                              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                                <Typography variant="body2" sx={{ fontWeight: 650, fontFamily: 'monospace', color: 'text.primary' }}>
                                  {inspectorBankAccountNumber}
                                </Typography>
                                <Tooltip title={copiedAccount ? t('Copied') : t('Copy')}>
                                  <IconButton
                                    size="small"
                                    aria-label={t('Bank account number')}
                                    onClick={() => void handleCopyAccount(inspectorBankAccountNumber)}
                                    sx={{ p: 0.35, color: 'text.secondary' }}
                                  >
                                    {copiedAccount ? (
                                      <CheckRounded sx={{ fontSize: 15, color: 'success.main' }} />
                                    ) : (
                                      <ContentCopyOutlined sx={{ fontSize: 14 }} />
                                    )}
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            </Stack>
                            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 3, py: 0.85 }}>
                              <Typography variant="body2" color="text.secondary">{t('Account holder name')}</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', textAlign: 'right' }}>
                                {inspectorBankAccountHolder}
                              </Typography>
                            </Stack>
                            {inspectorBankBranch && (
                              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 3, py: 0.85 }}>
                                <Typography variant="body2" color="text.secondary">{t('Branch')}</Typography>
                                <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500, textAlign: 'right' }}>
                                  {inspectorBankBranch}
                                </Typography>
                              </Stack>
                            )}
                          </Stack>
                        ) : (
                          <Alert severity="warning" sx={{ borderRadius: '8px' }}>
                            {t('Inspector has not entered payout bank details yet.')}
                          </Alert>
                        )}

                        {prePublishPayoutError && (
                          <Alert
                            severity="error"
                            onClose={() => setPrePublishPayoutError(null)}
                            sx={{ borderRadius: '8px' }}
                          >
                            {prePublishPayoutError}
                          </Alert>
                        )}

                        {!isPayoutSettled ? (
                          portal === 'manager' && (
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 0.5 }}>
                              <LoadingButton
                                variant="outlined"
                                loading={createSepayPayoutLink.isPending}
                                disabled={!hasCompleteBankDetails}
                                onClick={() => void handleOpenSepayPayoutQr()}
                                sx={{
                                  width: { xs: '100%', sm: 'auto' },
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                  px: 1.75,
                                  py: 0.75,
                                  minHeight: 46,
                                  textTransform: 'none',
                                  fontWeight: 650,
                                  borderRadius: '10px',
                                  boxShadow: 'none',
                                  borderColor: 'divider',
                                  bgcolor: 'background.paper',
                                  color: 'text.primary',
                                  '&:hover': {
                                    borderColor: 'primary.main',
                                    bgcolor: 'action.hover',
                                  },
                                }}
                              >
                                <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
                                  <SepayVietQrLogoMark />
                                  <Typography variant="body2" sx={{ fontWeight: 650, color: 'inherit', whiteSpace: 'nowrap' }}>
                                    {t('Pay Inspector via SePay (VietQR)')}
                                  </Typography>
                                </Stack>
                              </LoadingButton>
                            </Box>
                          )
                        ) : (
                          <Alert severity="success" sx={{ borderRadius: '8px' }}>
                            {t('Inspector payout settled')}
                            {paymentStatusQuery.data?.payoutReference
                              ? ` · ${t('Ref')}: ${paymentStatusQuery.data.payoutReference}`
                              : ''}
                          </Alert>
                        )}
                      </Stack>
                    </Box>

                    {/* 3. Bottom: Publish action bar */}
                    <Box
                      sx={{
                        px: { xs: 2.5, sm: 3 },
                        py: 2,
                        bgcolor: isDark ? 'rgba(255, 255, 255, 0.02)' : '#FCFCFD',
                      }}
                    >
                      <Stack spacing={1.25}>
                        <MutationProblemAlert
                          error={publishReport.error}
                          isError={publishReport.isError}
                          fallbackMessage={t('The report could not be published.')}
                        />
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                          {openVersion.status === 'PUBLISHED' ? (
                            <Button
                              component={RouterLink}
                              to="../settlement"
                              variant="contained"
                              endIcon={<ArrowForwardRounded sx={{ fontSize: 16 }} />}
                              sx={{ textTransform: 'none', fontWeight: 650, borderRadius: '8px', boxShadow: 'none' }}
                            >
                              {t('Continue to Customer Settlement')}
                            </Button>
                          ) : (
                            <LoadingButton
                              variant="contained"
                              color="primary"
                              loading={publishReport.isPending}
                              disabled={!isPayoutSettled}
                              startIcon={!isPayoutSettled ? <LockOutlined sx={{ fontSize: 16 }} /> : undefined}
                              onClick={() =>
                                publishReport.mutate(
                                  { versionId: openVersion.id },
                                  {
                                    onSuccess: () => {
                                      if (portal === 'manager') {
                                        navigate('../settlement');
                                      }
                                    },
                                  },
                                )
                              }
                              sx={{ textTransform: 'none', fontWeight: 650, borderRadius: '8px', px: 2.5, boxShadow: 'none' }}
                            >
                              {publishReport.isPending ? t('Publishing…') : t('Publish to Customer')}
                            </LoadingButton>
                          )}
                        </Box>
                      </Stack>
                    </Box>
                  </Stack>
                </Paper>
              )
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
                onApprove={() =>
                  review.mutate(
                    { versionId: openVersion.id },
                    {
                      onSuccess: () => {
                        if (portal === 'manager') {
                          navigate('../payout');
                        }
                      },
                    },
                  )
                }
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
                  endIcon={<ArrowForwardRounded sx={{ fontSize: 16 }} />}
                  sx={{ textTransform: 'none', fontWeight: 650, borderRadius: '8px', px: 2.5, flexShrink: 0 }}
                >
                  {t('Continue to Customer Settlement')}
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

      <SepayPayoutQrDialog
        details={payoutQrDetails}
        amountVnd={
          financeBreakdown ? `${formatNumber(Math.round(financeBreakdown.netPayoutAmount))} ₫` : undefined
        }
        inspectorName={inspectionQuery.data?.inspectorName}
        bankName={inspectorBankName}
        bankAccountNumber={inspectorBankAccountNumber}
        bankAccountHolder={inspectorBankAccountHolder}
        checking={paymentStatusQuery.isFetching}
        onCheckNow={() => void paymentStatusQuery.refetch()}
        onMockPay={
          portal === 'manager' && payoutQrDetails
            ? async () => {
                try {
                  await handleInlineSettlePayout(`SEPAY-MOCK-${payoutQrDetails.orderCode}`);
                  setPayoutQrDetails(undefined);
                } catch (err) {
                  setPrePublishPayoutError(
                    getErrorMessage(err, t('Could not settle payout.')),
                  );
                }
              }
            : undefined
        }
        onClose={() => setPayoutQrDetails(undefined)}
      />
    </Box>
  );
}
