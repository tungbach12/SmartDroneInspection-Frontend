import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { PageBreadcrumbs } from '@/shared/ui/PageBreadcrumbs';
import { getSectionPath } from '@/app/permissions/accessPolicy';
import {
  useAcceptReportVersion,
  useCreateInspectionPayOSLink,
  useCreateInspectionVnPayUrl,
  useInspection,
  useInspectionEvidence,
  useInspectionFindings,
  useReportPaymentStatus,
  useReportVersions,
  useRequestReportClarification,
} from '@/features/inspections/hooks/useInspections';
import { CustomerReportSettlementCard } from '@/features/reports/components/CustomerReportSettlementCard';
import { ReportDeliverableTabs } from '@/features/reports/components/ReportDeliverableTabs';
import { EmptyState } from '@/shared/ui/EmptyState';
import { QueryState } from '@/shared/ui/QueryState';
import { useLocale } from '@/shared/i18n/LocaleProvider';

export interface CustomerReportDeliverablePageProps {
  stage?: 'report' | 'settlement';
}

/**
 * Dedicated Customer Official Report & Deliverable Settlement Page (/client/inspections/:id/report | /settlement).
 * Handles Customer report acceptance and service invoice payment (PayOS / VNPay).
 */
export default function CustomerReportDeliverablePage({
  stage,
}: CustomerReportDeliverablePageProps = {}) {
  const { t } = useLocale();
  const { inspectionId = '' } = useParams<{ inspectionId: string }>();
  const location = useLocation();
  const showReportContent = !stage || stage === 'report';
  const showSettlementContent = !stage || stage === 'settlement';

  const [openVersionId, setOpenVersionId] = useState<string | null>(null);
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

  const versions = useReportVersions(inspectionId);
  const findings = useInspectionFindings(inspectionId);
  const evidence = useInspectionEvidence(inspectionId);
  const acceptReport = useAcceptReportVersion(inspectionId);
  const requestClarification = useRequestReportClarification(inspectionId);
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

  const openVersion =
    versions.data?.find((version) => version.id === openVersionId) ??
    versions.data?.[0] ??
    null;

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

            {showReportContent && (
              <ReportDeliverableTabs
                inspectionId={inspectionId}
                versions={versions.data}
                openVersion={openVersion}
                onSelectVersion={setOpenVersionId}
                findings={findings.data ?? []}
                evidenceList={evidence.data ?? []}
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
            disabled={!disputeReason.trim() || requestClarification.isPending}
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

    </Box>
  );
}
