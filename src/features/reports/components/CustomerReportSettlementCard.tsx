import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import DownloadRounded from '@mui/icons-material/DownloadRounded';
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded';
import PictureAsPdfRounded from '@mui/icons-material/PictureAsPdfRounded';
import QrCode2Rounded from '@mui/icons-material/QrCode2Rounded';
import ReceiptLongOutlined from '@mui/icons-material/ReceiptLongOutlined';
import {
  inspectionApi,
  type ReportPaymentStatusDetails,
} from '@/features/inspections/api/inspectionApi';
import { resolveInspectorFinanceBreakdown } from '@/features/inspections/utils/inspectorFinance';
import { getErrorMessage } from '@/shared/api/errorMessage';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { useLocale } from '@/shared/i18n/LocaleProvider';

export interface CustomerReportAcceptanceBarProps {
  acceptPending: boolean;
  disputeSubmitted: boolean;
  disputeReason?: string | null | undefined;
  disputeSubmittedAt?: string | null | undefined;
  acceptError?: unknown;
  amountVnd?: string | null | undefined;
  onAcceptReport: () => void;
  onOpenDispute: () => void;
}

/**
 * Compact report acceptance & clarification bar shown at Step 2 (Inspection Report).
 */
export function CustomerReportAcceptanceBar({
  acceptPending,
  disputeSubmitted,
  disputeReason,
  disputeSubmittedAt,
  acceptError,
  amountVnd,
  onAcceptReport,
  onOpenDispute,
}: CustomerReportAcceptanceBarProps) {
  const { formatDateTime, t } = useLocale();
  const [confirmAcceptOpen, setConfirmAcceptOpen] = useState(false);

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: '10px',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Stack spacing={1.5}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: '0.95rem', fontWeight: 650, color: 'text.primary' }}>
              {t('Report acceptance')}
            </Typography>
            <Chip
              size="small"
              label={t('Awaiting Acceptance')}
              color="primary"
              sx={{ height: 22, borderRadius: '6px', fontSize: '0.75rem', fontWeight: 650 }}
            />
            {amountVnd && (
              <Chip
                size="small"
                variant="outlined"
                label={amountVnd}
                sx={{ height: 22, fontSize: '0.75rem', fontWeight: 650, fontVariantNumeric: 'tabular-nums' }}
              />
            )}
          </Stack>
          <Stack direction="row" spacing={1.25} sx={{ flexShrink: 0, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              color="warning"
              onClick={onOpenDispute}
              sx={{
                fontWeight: 600,
                borderRadius: '8px',
                px: 2,
                textTransform: 'none',
              }}
            >
              {t('File a dispute / Request clarification')}
            </Button>
            <Button
              variant="contained"
              color="success"
              disabled={acceptPending}
              onClick={() => setConfirmAcceptOpen(true)}
              sx={{
                fontWeight: 650,
                borderRadius: '8px',
                px: 2.5,
                textTransform: 'none',
              }}
            >
              {acceptPending ? t('Accepting…') : t('Accept Report')}
            </Button>
          </Stack>
        </Stack>

        {Boolean(acceptError) && (
          <Alert severity="error" sx={{ borderRadius: '8px' }}>
            {getErrorMessage(acceptError, t('Could not accept report.'))}
          </Alert>
        )}

        {disputeSubmitted && (
          <Alert severity="warning" sx={{ borderRadius: '10px' }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {t(
                'You have submitted a dispute/clarification request regarding this report. The Platform Manager has been notified and will review your inquiry.',
              )}
            </Typography>
            {disputeReason && (
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                <strong>{t('Dispute reason')}:</strong> {disputeReason}
              </Typography>
            )}
            {disputeSubmittedAt && (
              <Typography variant="caption" sx={{ display: 'block', mt: 0.25, color: 'text.secondary' }}>
                {t('Submitted')}: {formatDateTime(new Date(disputeSubmittedAt))}
              </Typography>
            )}
          </Alert>
        )}

        <ConfirmDialog
          open={confirmAcceptOpen}
          title={t('Confirm Report Acceptance')}
          message={t(
            'Accepting the official inspection report locks your deliverable acceptance and proceeds to service invoice settlement. Would you like to accept this report?',
          )}
          confirmLabel={t('Confirm & Accept Report')}
          cancelLabel={t('Cancel')}
          confirmColor="success"
          loading={acceptPending}
          onCancel={() => setConfirmAcceptOpen(false)}
          onConfirm={() => {
            setConfirmAcceptOpen(false);
            onAcceptReport();
          }}
        />
      </Stack>
    </Paper>
  );
}

interface CustomerReportSettlementCardProps {
  inspectionId: string;
  versionId: string;
  versionNo: number;
  isPaid: boolean;
  isReportAccepted: boolean;
  isPaymentCancelled?: boolean;
  isPaymentConfirming?: boolean;
  paymentStatus?: ReportPaymentStatusDetails | undefined;
  acceptPending: boolean;
  sepayPending: boolean;
  vnpayPending?: boolean;
  gatewayError?: unknown;
  disputeSubmitted: boolean;
  disputeReason?: string | null;
  disputeSubmittedAt?: string | null;
  onAcceptReport: () => void;
  onProceedToSepay: () => void;
  onProceedToVnPay?: () => void;
  onOpenDispute: () => void;
  onViewReport?: (() => void) | undefined;
}

function formatPaymentMethodLabel(method: string | null | undefined, t: (key: string) => string): string {
  const normalized = (method ?? '').trim().toUpperCase();
  if (normalized === 'VNPAY') return 'VNPay';
  if (normalized === 'SEPAY') return 'Sepay (VietQR)';
  if (normalized === 'MANUAL_WIRE') return t('Bank transfer');
  return method?.trim() || 'Sepay';
}

/**
 * Customer Report Acceptance & Sepay / VNPay Commercial Settlement Panel.
 *
 * The published report and its PDF export are always readable by the Customer once published.
 * Commercial flow from Customer's perspective:
 * 1. Review & Accept Official Report
 * 2. Settle Service Fee via VNPay or Sepay (VietQR)
 * 3. Inspection Service Fulfilled & Deliverables Verified
 */
export function CustomerReportSettlementCard({
  inspectionId,
  versionId: _versionId,
  versionNo: _versionNo,
  isPaid,
  isReportAccepted,
  isPaymentCancelled = false,
  isPaymentConfirming = false,
  paymentStatus,
  acceptPending,
  sepayPending,
  vnpayPending = false,
  gatewayError,
  disputeSubmitted,
  disputeReason,
  disputeSubmittedAt,
  onAcceptReport,
  onProceedToSepay,
  onProceedToVnPay,
  onOpenDispute,
  onViewReport,
}: CustomerReportSettlementCardProps) {
  const { formatDate, formatNumber, t } = useLocale();
  const [previewingPdf, setPreviewingPdf] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [documentBusy, setDocumentBusy] = useState(false);
  const prevAcceptedRef = useRef(isReportAccepted);
  const prevPaidRef = useRef(isPaid);

  const downloadPaymentDocument = useCallback(async (kind: 'notice' | 'receipt') => {
    setDocumentBusy(true);
    setDocumentError(null);
    try {
      const blob = await inspectionApi.downloadPaymentDocument(inspectionId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `SDI-payment-${kind}-${inspectionId.slice(0, 8)}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setDocumentError(getErrorMessage(error, 'Payment document could not be downloaded.'));
    } finally {
      setDocumentBusy(false);
    }
  }, [inspectionId]);

  useEffect(() => {
    const becameAccepted = !prevAcceptedRef.current && isReportAccepted;
    prevAcceptedRef.current = isReportAccepted;
    if (becameAccepted && !isPaid) {
      void downloadPaymentDocument('notice');
    }
  }, [isReportAccepted, isPaid, downloadPaymentDocument]);

  useEffect(() => {
    const becamePaid = !prevPaidRef.current && isPaid;
    prevPaidRef.current = isPaid;
    let firstReceiptAfterCheckout = false;
    if (isPaid && typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        const key = `sdi_payment_receipt_downloaded_${inspectionId}`;
        if (params.get('payment') === 'success' && !sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, '1');
          firstReceiptAfterCheckout = true;
        }
      } catch {
        // ignore storage errors
      }
    }
    if (becamePaid || firstReceiptAfterCheckout) {
      void downloadPaymentDocument('receipt');
    }
  }, [isPaid, inspectionId, downloadPaymentDocument]);
  const finance = resolveInspectorFinanceBreakdown(inspectionId, null, paymentStatus);

  const reportPdfFileName = `SDI-RPT-${_versionId.slice(0, 8).toUpperCase()}-V${_versionNo}.pdf`;

  const handlePreviewPdf = async () => {
    setPreviewingPdf(true);
    setPdfError(null);
    try {
      const blob = await inspectionApi.downloadReport(inspectionId, _versionId);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      setPdfError(getErrorMessage(error, t('The report preview could not be produced.')));
    } finally {
      setPreviewingPdf(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    setPdfError(null);
    try {
      const blob = await inspectionApi.downloadReport(inspectionId, _versionId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = reportPdfFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      setPdfError(getErrorMessage(error, t('The report document could not be downloaded.')));
    } finally {
      setDownloadingPdf(false);
    }
  };

  const rawTotal = paymentStatus?.amount ?? finance?.totalPrice ?? null;
  const amountVnd =
    rawTotal != null && rawTotal > 0 ? `${formatNumber(rawTotal)} ₫` : null;
  const invoiceRef = paymentStatus?.orderCode
    ? `INV-${paymentStatus.orderCode}`
    : `INV-${inspectionId.slice(0, 8).toUpperCase()}`;
  const dueLabel = paymentStatus?.paymentDueAt
    ? t('Pay by {date}').replace(
        '{date}',
        formatDate(paymentStatus.paymentDueAt, { dateStyle: 'medium' }),
      )
    : t('Pay within 15 days to complete your service.');

  const paymentMethodLabel = formatPaymentMethodLabel(paymentStatus?.paymentMethod, t);

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.5,
        borderRadius: '10px',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Stack spacing={2}>
        {/* Top Commercial Summary Header */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
        >
          <Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography sx={{ fontSize: '1rem', fontWeight: 650, color: 'text.primary' }}>
                {t('Report acceptance & service fee payment')}
              </Typography>
              <Chip
                size="small"
                label={
                  isPaid
                    ? t('Paid & Fulfilled')
                    : isPaymentConfirming
                      ? t('Confirming payment…')
                      : isReportAccepted
                        ? t('Payment Due')
                        : t('Awaiting Acceptance')
                }
                color={isPaid ? 'success' : isPaymentConfirming ? 'info' : isReportAccepted ? 'warning' : 'primary'}
                sx={{ height: 22, borderRadius: '6px', fontSize: '0.75rem', fontWeight: 650 }}
              />
              <Chip
                size="small"
                variant="outlined"
                icon={<ReceiptLongOutlined sx={{ fontSize: 13 }} />}
                label={invoiceRef}
                sx={{
                  height: 22,
                  fontSize: '0.75rem',
                  fontWeight: 650,
                  fontFamily: 'monospace',
                }}
              />
            </Stack>
            <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.75 }}>
              {onViewReport && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<DescriptionOutlined fontSize="small" />}
                  onClick={onViewReport}
                  sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                >
                  {t('View report')}
                </Button>
              )}
              <Button
                size="small"
                variant="outlined"
                startIcon={<PictureAsPdfRounded fontSize="small" />}
                onClick={() => void handlePreviewPdf()}
                disabled={previewingPdf}
                sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
              >
                {previewingPdf ? t('Rendering…') : t('Preview PDF')}
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<DownloadRounded fontSize="small" />}
                onClick={() => void handleDownloadPdf()}
                disabled={downloadingPdf}
                sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
              >
                {downloadingPdf ? t('Downloading…') : t('Download report')}
              </Button>
            </Stack>
            {pdfError && (
              <Alert severity="error" sx={{ mt: 1, borderRadius: '8px' }} onClose={() => setPdfError(null)}>
                {pdfError}
              </Alert>
            )}
          </Box>

          {amountVnd && (
            <Box
              sx={{
                p: 1.75,
                minWidth: { sm: 290 },
                borderRadius: '10px',
                border: '1px solid',
                borderColor: isPaid ? '#176B52' : 'divider',
                bgcolor: 'background.default',
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  display: 'block',
                  mb: 0.75,
                }}
              >
                {t('Service invoice')}
              </Typography>
              {finance && (
                <>
                  <Stack
                    direction="row"
                    spacing={2}
                    sx={{ justifyContent: 'space-between', py: 0.35 }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      {t('Base fee')}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
                    >
                      {formatNumber(finance.serviceBaseAmount)} ₫
                    </Typography>
                  </Stack>
                  <Stack
                    direction="row"
                    spacing={2}
                    sx={{ justifyContent: 'space-between', py: 0.35 }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      VAT ({finance.vatRate}%)
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: 'text.secondary' }}
                    >
                      +{formatNumber(finance.vatAmount)} ₫
                    </Typography>
                  </Stack>
                  <Divider sx={{ my: 0.65, borderStyle: 'dashed' }} />
                </>
              )}
              <Stack
                direction="row"
                spacing={2}
                sx={{ justifyContent: 'space-between', alignItems: 'baseline', pt: 0.25 }}
              >
                <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.875rem' }}>
                  {isPaid ? t('Total paid') : t('Amount to pay')}
                </Typography>
                <Typography
                  sx={{
                    fontSize: '1rem',
                    fontWeight: 800,
                    color: isPaid ? '#176B52' : 'primary.main',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {amountVnd}
                </Typography>
              </Stack>
            </Box>
          )}
        </Stack>

        <Divider />

        {/* Dynamic Action State */}
        {documentError && (
          <Alert severity="error" sx={{ borderRadius: '8px' }}>
            {documentError}
          </Alert>
        )}
        {isPaid ? (
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
          >
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <CheckCircleRounded sx={{ fontSize: 22, color: '#176B52', flexShrink: 0 }} />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 650, color: '#176B52' }}>
                  {t('Payment successful! Inspection service is officially fulfilled and deliverables are verified.')}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}
                >
                  {paymentStatus?.paymentMethod
                    ? `${t('Paid via')} ${paymentMethodLabel}`
                    : t('Paid')}
                  {paymentStatus?.orderCode ? ` · ${t('Order')} #${paymentStatus.orderCode}` : ''}
                  {` · ${t('Official receipt verified')}`}
                </Typography>
              </Box>
            </Stack>
            <Button
              variant="outlined"
              size="small"
              disabled={documentBusy}
              startIcon={<DownloadRounded sx={{ fontSize: 16 }} />}
              onClick={() => void downloadPaymentDocument('receipt')}
              sx={{
                fontWeight: 600,
                borderRadius: '8px',
                textTransform: 'none',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {documentBusy ? t('Generating PDF…') : t('Download payment receipt (PDF)')}
            </Button>
          </Stack>
        ) : isReportAccepted ? (
          <Stack spacing={1.5}>
            {isPaymentCancelled && (
              <Alert severity="warning" sx={{ borderRadius: '8px' }}>
                {t(
                  'The previous online payment session was cancelled or did not complete. Please select a payment method below to retry.',
                )}
              </Alert>
            )}
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
            >
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 650, color: 'text.primary' }}>
                  {t('Choose a payment method')}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
                  {dueLabel}
                </Typography>
              </Box>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ flexShrink: 0, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  size="small"
                  disabled={documentBusy}
                  startIcon={<DownloadRounded sx={{ fontSize: 16 }} />}
                  onClick={() => void downloadPaymentDocument('notice')}
                  sx={{
                    fontWeight: 600,
                    borderRadius: '8px',
                    px: 2,
                    minHeight: 44,
                    textTransform: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {documentBusy ? t('Generating PDF…') : t('Download payment notice (PDF)')}
                </Button>
                {onProceedToVnPay && (
                  <Button
                    variant="outlined"
                    disabled={vnpayPending || sepayPending}
                    endIcon={<OpenInNewRounded sx={{ fontSize: 16 }} />}
                    onClick={onProceedToVnPay}
                    sx={{
                      fontWeight: 650,
                      borderRadius: '8px',
                      px: 2.5,
                      minHeight: 44,
                      textTransform: 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {vnpayPending
                      ? t('Connecting to VNPay gateway…')
                      : t('Pay with VNPay')}
                  </Button>
                )}
                <Button
                  variant="outlined"
                  disabled={sepayPending || vnpayPending}
                  startIcon={<QrCode2Rounded sx={{ fontSize: 18 }} />}
                  onClick={onProceedToSepay}
                  sx={{
                    fontWeight: 650,
                    borderRadius: '8px',
                    px: 2.5,
                    minHeight: 44,
                    textTransform: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {sepayPending
                    ? t('Connecting to Sepay gateway…')
                    : t('Pay with VietQR (Sepay)')}
                </Button>
              </Stack>
            </Stack>
            {Boolean(gatewayError) && (
              <Alert severity="error" sx={{ borderRadius: '8px' }}>
                {getErrorMessage(gatewayError, t('Payment checkout could not be started.'))}
              </Alert>
            )}
          </Stack>
        ) : (
          <CustomerReportAcceptanceBar
            acceptPending={acceptPending}
            disputeSubmitted={disputeSubmitted}
            disputeReason={disputeReason}
            disputeSubmittedAt={disputeSubmittedAt}
            amountVnd={amountVnd}
            onAcceptReport={onAcceptReport}
            onOpenDispute={onOpenDispute}
          />
        )}
      </Stack>
    </Paper>
  );
}
