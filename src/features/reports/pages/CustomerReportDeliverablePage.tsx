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
  useCreateDirectReinspection,
  useCreateInspectionSepayLink,
  useCreateInspectionVnPayUrl,
  useInspection,
  useInspectionEvidence,
  useInspectionFindings,
  useReinspectionVerifications,
  useReportPaymentStatus,
  useReportVersions,
  useRequestReportClarification,
} from '@/features/inspections/hooks/useInspections';
import { CreateRequestDialog } from '@/features/contracts/components/CreateRequestDialog';
import { CustomerReportSettlementCard } from '@/features/reports/components/CustomerReportSettlementCard';
import { ReportDeliverableTabs } from '@/features/reports/components/ReportDeliverableTabs';
import { SepayQrDialog } from '@/features/reports/components/SepayQrDialog';
import { EmptyState } from '@/shared/ui/EmptyState';
import { QueryState } from '@/shared/ui/QueryState';
import { useLocale } from '@/shared/i18n/LocaleProvider';

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
  const { t } = useLocale();
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
  const [reinspectionOpen, setReinspectionOpen] = useState(false);
  const [mf2RequestOpen, setMf2RequestOpen] = useState(false);

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

  const versions = useReportVersions(inspectionId);
  const findings = useInspectionFindings(inspectionId);
  const evidence = useInspectionEvidence(inspectionId);
  const reinspectionVerifications = useReinspectionVerifications?.(
    isReinspection ? inspectionId : null,
  );
  const acceptReport = useAcceptReportVersion(inspectionId);
  const requestClarification = useRequestReportClarification(inspectionId);
  const createDirectReinspection = useCreateDirectReinspection(inspectionId);
  const sepayLink = useCreateInspectionSepayLink(inspectionId);
  const vnpayLink = useCreateInspectionVnPayUrl(inspectionId);
  const [sepayQrOpen, setSepayQrOpen] = useState(false);
  const paymentStatusQuery = useReportPaymentStatus(inspectionId, {
    pollIntervalMs: sepayQrOpen ? 3000 : false,
  });
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
            {showSettlementContent && openVersion.status === 'PUBLISHED' && (
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
                sepayPending={sepayLink.isPending}
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
                onProceedToSepay={() => {
                  setSepayQrOpen(false);
                  sepayLink.mutate(undefined, {
                    onSuccess: () => setSepayQrOpen(true),
                  });
                }}
                onProceedToVnPay={() => vnpayLink.mutate()}
                onOpenDispute={() => setDisputeOpen(true)}
                onViewReport={
                  !showReportContent
                    ? () => {
                        void navigate('../report');
                      }
                    : undefined
                }
              />
            )}

            <SepayQrDialog
              details={sepayQrOpen ? sepayLink.data : undefined}
              amountVnd={paymentStatus?.amount ? `${paymentStatus.amount.toLocaleString('vi-VN')} VND` : undefined}
              checking={paymentStatusQuery.isFetching}
              onCheckNow={() => void paymentStatusQuery.refetch()}
              onClose={() => setSepayQrOpen(false)}
            />

            {showSettlementContent &&
              openVersion.status === 'PUBLISHED' &&
              confirmedFindingsList.length > 0 &&
              !isReinspection && (
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
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {t('Post-Remediation Re-inspection')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {t(
                          'After remediating confirmed defects on site, schedule a targeted re-inspection flight to verify before-and-after results.',
                        )}
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={1.25} sx={{ flexShrink: 0, flexWrap: 'wrap' }}>
                    <Button
                      variant="contained"
                      onClick={() => setReinspectionOpen(true)}
                      sx={{ textTransform: 'none', fontWeight: 650, borderRadius: '8px' }}
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
                <Typography variant="body2" color="text.secondary">
                  {t(
                    'Please specify the inaccurate findings or technical questions requiring clarification. Contract terms allow up to 02 clarification requests prior to acceptance (Current: request {count}/2).',
                  ).replace('{count}', String(priorClarificationCount + 1))}
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
              if (openVersion) {
                requestClarification.mutate(
                  { versionId: openVersion.id, reason: disputeReason.trim() },
                  {
                    onSuccess: () => {
                      setDisputeSubmitted(true);
                      setDisputeOpen(false);
                    },
                    onError: () => {
                      setDisputeSubmitted(true);
                      setDisputeOpen(false);
                    },
                  },
                );
              } else {
                setDisputeSubmitted(true);
                setDisputeOpen(false);
              }
            }}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
          >
            {requestClarification.isPending ? t('Submitting…') : t('Submit dispute request')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={reinspectionOpen}
        onClose={() => setReinspectionOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '16px', p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {t('Schedule Post-Remediation Re-inspection')}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {t(
                'Choose how you would like to initiate re-inspection verification for the confirmed defects in this report:',
              )}
            </Typography>
            <Paper variant="outlined" sx={{ p: 1.75, borderRadius: '10px' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                {t('Option 1: Quick Re-inspection')}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                {t(
                  'Immediately create a targeted RE_INSPECTION mission pre-loaded with all confirmed defects using the existing assignment context.',
                )}
              </Typography>
              <Button
                variant="contained"
                disabled={createDirectReinspection.isPending}
                onClick={() => {
                  createDirectReinspection.mutate(
                    {},
                    {
                      onSuccess: (created) => {
                        setReinspectionOpen(false);
                        navigate(`${getSectionPath('client', 'inspections')}/${created.id}/tracking`);
                      },
                    },
                  );
                }}
                sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
              >
                {createDirectReinspection.isPending
                  ? t('Scheduling…')
                  : t('Start Quick Re-inspection')}
              </Button>
            </Paper>

            <Paper variant="outlined" sx={{ p: 1.75, borderRadius: '10px' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                {t('Option 2: Request Quote via Service Contract (MF2)')}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                {t(
                  'Submit a formal service request linked to this source inspection so the Manager can quote, schedule, and dispatch a partner crew.',
                )}
              </Typography>
              <Button
                variant="outlined"
                onClick={() => {
                  setReinspectionOpen(false);
                  setMf2RequestOpen(true);
                }}
                sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
              >
                {t('Create MF2 Re-inspection Request')}
              </Button>
            </Paper>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setReinspectionOpen(false)} color="inherit" sx={{ textTransform: 'none' }}>
            {t('Cancel')}
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
