import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import FlightTakeoffRounded from '@mui/icons-material/FlightTakeoffRounded';
import { PageBreadcrumbs } from '@/shared/ui/PageBreadcrumbs';
import { getSectionPath } from '@/app/permissions/accessPolicy';
import {
  useAcceptReportVersion,
  useCreateInspectionSepayLink,
  useCreateInspectionVnPayUrl,
  useInspection,
  useInspectionEvidence,
  useInspectionFindings,
  useMockConfirmInspectionSepayPayment,
  useReinspectionVerifications,
  useReportPaymentStatus,
  useReportVersions,
  useRequestReportClarification,
} from '@/features/inspections/hooks/useInspections';
import { CreateRequestDialog } from '@/features/contracts/components/CreateRequestDialog';
import {
  CustomerReportAcceptanceBar,
  CustomerReportSettlementCard,
} from '@/features/reports/components/CustomerReportSettlementCard';
import { InspectorRatingPromptCard } from '@/features/inspections/components/InspectorRatingDialog';
import { VerdictExpiryBanner } from '@/features/inspections/components/VerdictExpiryBanner';
import { ReportDeliverableTabs } from '@/features/reports/components/ReportDeliverableTabs';
import { SepayQrDialog } from '@/features/reports/components/SepayQrDialog';
import { EmptyState } from '@/shared/ui/EmptyState';
import { QueryState } from '@/shared/ui/QueryState';
import { StatusChip } from '@/shared/ui/StatusChip';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { getErrorMessage } from '@/shared/api/errorMessage';

export interface CustomerReportDeliverablePageProps {
  stage?: 'report' | 'settlement';
}

/**
 * Dedicated Customer Official Report & Deliverable Settlement Page (/client/inspections/:id/report | /settlement).
 * Handles Customer report acceptance and service invoice payment (Sepay / VNPay).
 */
export default function CustomerReportDeliverablePage({
  stage,
}: CustomerReportDeliverablePageProps = {}) {
  const { formatNumber, t } = useLocale();
  const { inspectionId = '' } = useParams<{ inspectionId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const showReportContent = !stage || stage === 'report';
  const showSettlementContent = !stage || stage === 'settlement';

  const [openVersionId, setOpenVersionId] = useState<string | null>(null);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeSubmitted, setDisputeSubmitted] = useState(false);
  const [disputeSubmittedAt, setDisputeSubmittedAt] = useState<string | null>(null);
  const [mf2RequestOpen, setMf2RequestOpen] = useState(false);

  const inspectionQuery = useInspection(inspectionId);
  const isReinspection = inspectionQuery.data?.inspectionType === 'RE_INSPECTION';

  const versions = useReportVersions(inspectionId);
  const findings = useInspectionFindings(inspectionId);
  const evidence = useInspectionEvidence(inspectionId);
  const reinspectionVerifications = useReinspectionVerifications?.(
    isReinspection ? inspectionId : null,
  );
  const acceptReport = useAcceptReportVersion(inspectionId);
  const requestClarification = useRequestReportClarification(inspectionId);
  const sepayLink = useCreateInspectionSepayLink(inspectionId);
  const mockConfirmSepay = useMockConfirmInspectionSepayPayment(inspectionId);
  const vnpayLink = useCreateInspectionVnPayUrl(inspectionId);
  const searchParams = new URLSearchParams(location.search);
  const isPaymentCancelled = searchParams.get('payment') === 'cancelled';
  const returnedPaymentSuccess = searchParams.get('payment') === 'success';
  const [sepayQrOpen, setSepayQrOpen] = useState(false);
  const paymentStatusQuery = useReportPaymentStatus(inspectionId, {
    pollWhenUnpaid: sepayQrOpen || returnedPaymentSuccess,
  });
  const paymentStatus = paymentStatusQuery.data;
  const paymentStatusFailed = paymentStatusQuery.isError;

  const isPaid = Boolean(
    paymentStatus?.paid || paymentStatus?.paymentStatus === 'PAID',
  );
  const isPaymentConfirming = returnedPaymentSuccess && !isPaid;
  const isReportAccepted = Boolean(paymentStatus?.reportAccepted);

  useEffect(() => {
    if (sepayQrOpen && isPaid) {
      setSepayQrOpen(false);
    }
  }, [sepayQrOpen, isPaid]);

  const openVersion =
    versions.data?.find((version) => version.id === openVersionId) ??
    versions.data?.[0] ??
    null;

  const confirmedFindingsList = (findings.data ?? []).filter(
    (item) => item.status === 'CONFIRMED' && !item.isDeleted,
  );

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

  const isEmbeddedInInspectionWorkspace = location.pathname.includes('/inspections/');

  const priorClarificationCount =
    inspectionQuery.data?.clarificationCount ??
    (versions.data ?? []).filter((v) => Boolean(v.clarificationRequested)).length;

  return (
    <Box className="workspace-page workspace-page--reports" sx={{ width: '100%', maxWidth: '1440px', mx: 'auto' }}>
      {!isEmbeddedInInspectionWorkspace && (
        <Box sx={{ mb: 3 }}>
          <PageBreadcrumbs
            items={[
              { label: t('Dashboard'), to: getSectionPath('client', 'dashboard') },
              {
                label: t('Reports'),
                to: `${getSectionPath('client', 'inspections')}?view=reports`,
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

      {paymentStatusFailed && (
        <Alert
          severity="error"
          sx={{ mb: 2, borderRadius: '8px' }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => void paymentStatusQuery.refetch()}
              sx={{ textTransform: 'none' }}
            >
              {t('Retry')}
            </Button>
          }
        >
          {getErrorMessage(paymentStatusQuery.error, t('Payment status could not be loaded.'))}
        </Alert>
      )}

      <QueryState
        isLoading={versions.isLoading}
        error={versions.error}
        isEmpty={!versions.data?.length}
        onRetry={() => void versions.refetch()}
        empty={
          <EmptyState
            title={t('No report versions found')}
            description={t('The official report will appear here once published.')}
          />
        }
      >
        {openVersion && (
          <Stack spacing={3}>
            {showReportContent &&
              openVersion.status === 'PUBLISHED' &&
              !isReportAccepted &&
              !isPaid &&
              !paymentStatusFailed && (
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
                        if (stage === 'report') {
                          void navigate('../settlement');
                        }
                      },
                    })
                  }
                  onOpenDispute={() => setDisputeOpen(true)}
                />
              )}

            {showSettlementContent &&
              openVersion.status === 'PUBLISHED' &&
              !paymentStatusFailed &&
              (isReportAccepted || isPaid ? (
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
              ) : stage === 'settlement' ? (
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
                    gap: 1.5,
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {t('Accept report in Step 2 to unlock payment.')}
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={() => void navigate('../report')}
                    sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 650, flexShrink: 0 }}
                  >
                    {t('Go to Inspection Report')}
                  </Button>
                </Paper>
              ) : null)}

            {showSettlementContent && openVersion.status === 'PUBLISHED' && inspectionId && (
              <InspectorRatingPromptCard inspectionId={inspectionId} />
            )}

            <SepayQrDialog
              details={sepayQrOpen ? sepayLink.data : undefined}
              amountVnd={paymentStatus?.amount ? `${formatNumber(paymentStatus.amount)} ₫` : undefined}
              checking={paymentStatusQuery.isFetching}
              onCheckNow={() => void paymentStatusQuery.refetch()}
              onMockPay={
                inspectionId && sepayLink.data
                  ? async () => {
                      await mockConfirmSepay.mutateAsync();
                      await paymentStatusQuery.refetch();
                      setSepayQrOpen(false);
                    }
                  : undefined
              }
              onClose={() => setSepayQrOpen(false)}
            />

            {showSettlementContent &&
              openVersion.status === 'PUBLISHED' &&
              confirmedFindingsList.length > 0 &&
              !isReinspection &&
              isPaid && (
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
                    <FlightTakeoffRounded color="primary" sx={{ mt: 0.25 }} />
                    <Box>
                      <Typography component="h2" variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {t('Post-Remediation Re-inspection')}
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={1.25} sx={{ flexShrink: 0, flexWrap: 'wrap' }}>
                    <Button
                      variant="text"
                      color="primary"
                      disabled={!inspectionQuery.data?.assetId}
                      onClick={() => setMf2RequestOpen(true)}
                      sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
                    >
                      {t('Schedule Re-inspection')}
                    </Button>
                  </Stack>
                </Paper>
              )}

            {showSettlementContent && openVersion.status === 'PUBLISHED' && isReinspection && (
              <Alert severity="info" sx={{ borderRadius: '10px' }}>
                {t(
                  'This is a re-inspection deliverable verifying confirmed target defects from the prior inspection.',
                )}
              </Alert>
            )}

            {isReinspection && (showReportContent || showSettlementContent) && (
              <VerdictExpiryBanner
                verifications={reinspectionVerifications?.data}
                audience="customer"
              />
            )}

            {showReportContent && (
              <ReportDeliverableTabs
                inspectionId={inspectionId}
                versions={versions.data}
                openVersion={openVersion}
                onSelectVersion={setOpenVersionId}
                findings={findings.data ?? []}
                evidenceList={evidence.data ?? []}
                reinspectionVerifications={reinspectionVerifications?.data}
                assetName={inspectionQuery.data?.assetName}
                droneSummary={resolvedDroneSummary}
                flightPermitFileName={resolvedPermitFileName}
                headerBadge={
                  openVersion.status === 'PUBLISHED' && (isReportAccepted || isPaid) ? (
                    <StatusChip status="accepted" label="Accepted" tone="success" />
                  ) : undefined
                }
              />
            )}
          </Stack>
        )}
      </QueryState>

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
            {priorClarificationCount >= 2 ? (
              <Alert severity="error" sx={{ borderRadius: '8px' }}>
                {t(
                  'This report has already reached the maximum of 02 clarification requests allowed under the contract. Online dispute submission is locked to protect schedule progress. Please contact the Manager directly for reconciliation.',
                )}
              </Alert>
            ) : (
              <>
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
              </>
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
            {requestClarification.isPending ? t('Submitting…') : t('Submit dispute request')}
          </Button>
        </DialogActions>
      </Dialog>

      {inspectionQuery.data?.assetId && (
        <CreateRequestDialog
          open={mf2RequestOpen}
          onClose={() => setMf2RequestOpen(false)}
          assets={[
            {
              id: inspectionQuery.data.assetId,
              name: inspectionQuery.data.assetName ?? t('Inspected structure'),
              code: '',
            },
          ]}
          initialAssetId={inspectionQuery.data.assetId}
          sourceInspectionId={inspectionId}
          sourceInspectionLabel={inspectionQuery.data.assetName ?? undefined}
          onCreated={(requestId) => {
            navigate(`${getSectionPath('client', 'contracts')}?request=${requestId}`);
          }}
          onError={() => {}}
        />
      )}
    </Box>
  );
}
