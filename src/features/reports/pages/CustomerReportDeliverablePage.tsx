import { useEffect, useState } from 'react';
import { Link as RouterLink, useLocation, useNavigate, useParams } from 'react-router-dom';
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
import BuildOutlined from '@mui/icons-material/BuildOutlined';
import { PageBreadcrumbs } from '@/shared/ui/PageBreadcrumbs';
import { getSectionPath } from '@/app/permissions/accessPolicy';
import {
  useAcceptReportVersion,
  useCreateDirectReinspection,
  useCreateInspectionPayOSLink,
  useCreateInspectionVnPayUrl,
  useInspection,
  useInspectionEvidence,
  useInspectionFindings,
  useInspectionWorkflowState,
  useReinspectionVerifications,
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
 * Handles Customer report acceptance, service invoice payment (PayOS / VNPay), and forwarding confirmed findings to Maintenance.
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
  const [reinspectionNotes, setReinspectionNotes] = useState('');
  const [reinspectionProofUrl, setReinspectionProofUrl] = useState('');

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
  const reinspectionVerifications = useReinspectionVerifications(inspectionId);
  const workflowState = useInspectionWorkflowState(inspectionId);
  const acceptReport = useAcceptReportVersion(inspectionId);
  const requestClarification = useRequestReportClarification(inspectionId);
  const createDirectReinspection = useCreateDirectReinspection(inspectionId);
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

            {showSettlementContent && publishedUnhanded && !isReinspection && (
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
                      {t('Select confirmed findings to forward to your maintenance team as repair candidates.')}
                    </Typography>
                  </Box>
                </Stack>
                <Stack direction="row" spacing={1.25} sx={{ flexShrink: 0, flexWrap: 'wrap' }}>
                  <Button
                    variant="outlined"
                    onClick={() => setReinspectionOpen(true)}
                    sx={{ textTransform: 'none', fontWeight: 650, borderRadius: '8px' }}
                  >
                    {t('Schedule Re-inspection')}
                  </Button>
                  <Button
                    variant="contained"
                    component={RouterLink}
                    to={`${getSectionPath('client', 'inspections')}/${inspectionId}/corrective`}
                    sx={{ textTransform: 'none', fontWeight: 650, borderRadius: '8px' }}
                  >
                    {t('Send findings to Maintenance')}
                  </Button>
                </Stack>
              </Paper>
            )}

            {showSettlementContent && publishedUnhanded && isReinspection && (
              <Alert severity="info" sx={{ borderRadius: '10px' }}>
                {t(
                  'This is a re-inspection deliverable verifying previous repair work. Findings verification has been recorded directly to the linked maintenance work order.',
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
                reinspectionVerifications={reinspectionVerifications.data}
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

      <Dialog
        open={reinspectionOpen}
        onClose={() => setReinspectionOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '16px', p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {t('Schedule Post-Repair Re-inspection')}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {t(
                'Schedule a targeted re-inspection flight to verify that all confirmed defects from this report have been remediated.',
              )}
            </Typography>
            <TextField
              label={t('Contractor repair summary / Handover notes')}
              multiline
              rows={3}
              value={reinspectionNotes}
              onChange={(e) => setReinspectionNotes(e.target.value)}
              placeholder={t('e.g. Repaired facade cracks at 18F with epoxy injection and waterproof coating…')}
              fullWidth
            />
            <TextField
              label={t('Repair proof photo URL (optional)')}
              value={reinspectionProofUrl}
              onChange={(e) => setReinspectionProofUrl(e.target.value)}
              placeholder="https://..."
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setReinspectionOpen(false)} color="inherit" sx={{ textTransform: 'none' }}>
            {t('Cancel')}
          </Button>
          <Button
            variant="contained"
            disabled={createDirectReinspection.isPending}
            onClick={() => {
              createDirectReinspection.mutate(
                {
                  ...(reinspectionNotes.trim() ? { repairNotes: reinspectionNotes.trim() } : {}),
                  ...(reinspectionProofUrl.trim() ? { repairProofUrl: reinspectionProofUrl.trim() } : {}),
                },
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
            {createDirectReinspection.isPending ? t('Scheduling…') : t('Confirm Re-inspection')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
