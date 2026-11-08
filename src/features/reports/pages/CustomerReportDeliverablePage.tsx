import { useState } from 'react';
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
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import BuildOutlined from '@mui/icons-material/BuildOutlined';
import { getSectionPath } from '@/app/permissions/accessPolicy';
import {
  useAcceptReportVersion,
  useCreateInspectionPayOSLink,
  useCreateInspectionVnPayUrl,
  useInspection,
  useInspectionEvidence,
  useInspectionFindings,
  useInspectionWorkflowState,
  useReinspectionVerifications,
  useReportPaymentStatus,
  useReportVersions,
} from '@/features/inspections/hooks/useInspections';
import { CustomerReportSettlementCard } from '@/features/reports/components/CustomerReportSettlementCard';
import { ReportDeliverableTabs } from '@/features/reports/components/ReportDeliverableTabs';
import { EmptyState } from '@/shared/ui/EmptyState';
import { QueryState } from '@/shared/ui/QueryState';
import { useLocale } from '@/shared/i18n/LocaleProvider';

/**
 * Dedicated Customer Official Report & Deliverable Settlement Page (/client/inspections/:id/report).
 * Handles Customer report acceptance, service invoice payment (PayOS / VNPay), and forwarding confirmed findings to Maintenance.
 */
export default function CustomerReportDeliverablePage() {
  const { t } = useLocale();
  const { inspectionId = '' } = useParams<{ inspectionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [openVersionId, setOpenVersionId] = useState<string | null>(null);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeSubmitted, setDisputeSubmitted] = useState(false);

  const inspectionQuery = useInspection(inspectionId);
  const isReinspection = inspectionQuery.data?.inspectionType === 'RE_INSPECTION';

  const versions = useReportVersions(inspectionId);
  const findings = useInspectionFindings(inspectionId);
  const evidence = useInspectionEvidence(inspectionId);
  const reinspectionVerifications = useReinspectionVerifications(inspectionId);
  const workflowState = useInspectionWorkflowState(inspectionId);
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
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Button
              startIcon={<ArrowBackRounded />}
              onClick={() => navigate(`${getSectionPath('client', 'inspections')}?view=reports`)}
              sx={{
                color: 'text.secondary',
                fontWeight: 600,
                fontSize: '0.875rem',
                textTransform: 'none',
                borderRadius: '8px',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              Back to review queue
            </Button>
          </Box>
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
            <Alert
              severity={openVersion.status === 'PUBLISHED' ? 'success' : 'info'}
              sx={{
                borderRadius: '10px',
                fontWeight: 500,
                fontSize: '0.875rem',
              }}
            >
              {openVersion.status === 'PUBLISHED'
                ? `${t('Published version')} ${openVersion.versionNo}. The PDF is immutable; forward confirmed findings to maintenance individually when they require corrective work.`
                : openVersion.status}
            </Alert>

            {openVersion.status === 'PUBLISHED' && (
              <CustomerReportSettlementCard
                inspectionId={inspectionId}
                versionId={openVersion.id}
                versionNo={openVersion.versionNo}
                isPaid={isPaid}
                isReportAccepted={isReportAccepted}
                isPaymentCancelled={isPaymentCancelled}
                paymentStatus={paymentStatus}
                acceptPending={acceptReport.isPending}
                payosPending={payosLink.isPending}
                vnpayPending={vnpayLink.isPending}
                disputeSubmitted={disputeSubmitted}
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

            {publishedUnhanded && !isReinspection && (
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: '12px',
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
                <Button
                  variant="contained"
                  component={RouterLink}
                  to={`${getSectionPath('client', 'inspections')}/${inspectionId}/corrective`}
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
          </Stack>
        )}
      </QueryState>

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
