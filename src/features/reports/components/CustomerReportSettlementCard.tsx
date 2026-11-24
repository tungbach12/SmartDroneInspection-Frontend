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

function VnPayLogoMark() {
  return (
    <Box
      aria-hidden="true"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 96,
        height: 32,
        px: 1,
        borderRadius: '6px',
        bgcolor: '#FFFFFF',
        border: '1px solid',
        borderColor: 'divider',
        flexShrink: 0,
      }}
    >
      <svg width="78" height="20" viewBox="0 0 116 28" fill="none">
        <path d="M4 7L12.5 23H17L8.5 7H4Z" fill="#005BAA" />
        <path d="M12.5 23L21.5 5H26L17 23H12.5Z" fill="#ED1C24" />
        <text
          x="33"
          y="19.5"
          fill="#005BAA"
          fontFamily="Inter, Arial, sans-serif"
          fontSize="15.5"
          fontWeight="800"
          letterSpacing="0.4"
        >
          VNPAY
        </text>
      </svg>
    </Box>
  );
}

function SepayVietQrLogoMark() {
  return (
    <Box
      aria-hidden="true"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 96,
        height: 32,
        px: 1,
        borderRadius: '6px',
        bgcolor: '#FFFFFF',
        border: '1px solid',
        borderColor: 'divider',
        flexShrink: 0,
      }}
    >
      <svg width="86" height="20" viewBox="0 0 144 28" fill="none">
        <rect x="2" y="5" width="7" height="7" rx="1.2" fill="#0B4EA2" />
        <rect x="11" y="5" width="7" height="7" rx="1.2" fill="#E11D48" />
        <rect x="2" y="14" width="7" height="7" rx="1.2" fill="#0B4EA2" />
        <rect x="12" y="15" width="5" height="5" rx="1" fill="#0B4EA2" />
        <text
          x="24"
          y="19"
          fill="#0B4EA2"
          fontFamily="Inter, Arial, sans-serif"
          fontSize="13.5"
          fontWeight="800"
        >
          Viet
        </text>
        <text
          x="52"
          y="19"
          fill="#E11D48"
          fontFamily="Inter, Arial, sans-serif"
          fontSize="13.5"
          fontWeight="800"
        >
          QR
        </text>
        <circle cx="80" cy="14" r="1.75" fill="#CBD5E1" />
        <text
          x="87"
          y="18.5"
          fill="#0284C7"
          fontFamily="Inter, Arial, sans-serif"
          fontSize="12"
          fontWeight="700"
        >
          SePay
        </text>
      </svg>
    </Box>
  );
}

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
        p: { xs: 2, sm: 2.5 },
        borderRadius: '12px',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        boxShadow: 'none',
      }}
    >
      <Stack spacing={2.25}>
        {/* Header Bar: Title + Status + Report Document Actions */}
        <Stack
          direction={{ xs: 'column', lg: 'row' }}
          spacing={1.5}
          sx={{ justifyContent: 'space-between', alignItems: { lg: 'center' } }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}>
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

          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.75 }}>
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
        </Stack>

        {pdfError && (
          <Alert severity="error" sx={{ borderRadius: '8px' }} onClose={() => setPdfError(null)}>
            {pdfError}
          </Alert>
        )}

        {documentError && (
          <Alert severity="error" sx={{ borderRadius: '8px' }}>
            {documentError}
          </Alert>
        )}

        <Divider />

        {/* Main 2-Column Body: Service Invoice (Left) + Payment Action / Status (Right) */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: amountVnd ? 'minmax(270px, 5fr) minmax(0, 7fr)' : '1fr',
            },
            gap: 2.5,
            alignItems: 'stretch',
          }}
        >
          {amountVnd && (
            <Box
              sx={{
                p: 2,
                borderRadius: '10px',
                border: '1px solid',
                borderColor: isPaid ? '#176B52' : 'divider',
                bgcolor: 'background.default',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 1.5,
              }}
            >
              <Box>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ justifyContent: 'space-between', alignItems: 'baseline', mb: 1.25 }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {t('Service invoice')}
                  </Typography>
                  {!isPaid && isReportAccepted && (
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {dueLabel}
                    </Typography>
                  )}
                </Stack>
                {finance && (
                  <>
                    <Stack
                      direction="row"
                      spacing={2}
                      sx={{ justifyContent: 'space-between', py: 0.4 }}
                    >
                      <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                        {t('Base fee')}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ fontSize: '0.8125rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
                      >
                        {formatNumber(finance.serviceBaseAmount)} ₫
                      </Typography>
                    </Stack>
                    <Stack
                      direction="row"
                      spacing={2}
                      sx={{ justifyContent: 'space-between', py: 0.4 }}
                    >
                      <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                        VAT ({finance.vatRate}%)
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          fontVariantNumeric: 'tabular-nums',
                          color: 'text.secondary',
                        }}
                      >
                        +{formatNumber(finance.vatAmount)} ₫
                      </Typography>
                    </Stack>
                    <Divider sx={{ my: 1, borderStyle: 'dashed' }} />
                  </>
                )}
                <Stack
                  direction="row"
                  spacing={2}
                  sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}
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

              {isReportAccepted && !isPaid && (
                <Button
                  variant="outlined"
                  size="small"
                  fullWidth
                  disabled={documentBusy}
                  startIcon={<DownloadRounded sx={{ fontSize: 16 }} />}
                  onClick={() => void downloadPaymentDocument('notice')}
                  sx={{
                    fontWeight: 600,
                    borderRadius: '8px',
                    minHeight: 36,
                    textTransform: 'none',
                  }}
                >
                  {documentBusy ? t('Generating PDF…') : t('Download payment notice (PDF)')}
                </Button>
              )}
            </Box>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
            {isPaid ? (
              <Stack
                spacing={2}
                sx={{
                  p: 2,
                  height: '100%',
                  justifyContent: 'space-between',
                  borderRadius: '10px',
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.default',
                }}
              >
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
                  <CheckCircleRounded sx={{ fontSize: 22, color: '#176B52', flexShrink: 0, mt: 0.15 }} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 650, color: '#176B52' }}>
                      {t('Payment successful! Inspection service is officially fulfilled and deliverables are verified.')}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums', display: 'block', mt: 0.5 }}
                    >
                      {paymentStatus?.paymentMethod
                        ? `${t('Paid via')} ${paymentMethodLabel}`
                        : t('Paid')}
                      {paymentStatus?.orderCode ? ` · ${t('Order')} #${paymentStatus.orderCode}` : ''}
                      {` · ${t('Official receipt verified')}`}
                    </Typography>
                  </Box>
                </Stack>
                <Box>
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
                    }}
                  >
                    {documentBusy ? t('Generating PDF…') : t('Download payment receipt (PDF)')}
                  </Button>
                </Box>
              </Stack>
            ) : isReportAccepted ? (
              <Stack
                spacing={1.25}
                sx={{
                  p: 2,
                  height: '100%',
                  borderRadius: '10px',
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                }}
              >
                {isPaymentCancelled && (
                  <Alert severity="warning" sx={{ borderRadius: '8px' }}>
                    {t(
                      'The previous online payment session was cancelled or did not complete. Please select a payment method below to retry.',
                    )}
                  </Alert>
                )}

                <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {t('Choose a payment method')}
                  </Typography>
                  {!amountVnd && (
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {dueLabel}
                    </Typography>
                  )}
                </Stack>

                <Stack spacing={1.25}>
                  <Button
                    variant="outlined"
                    disabled={sepayPending || vnpayPending}
                    onClick={onProceedToSepay}
                    sx={{
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 1.5,
                      px: 1.75,
                      py: 1.25,
                      minHeight: 58,
                      borderRadius: '10px',
                      borderColor: 'divider',
                      bgcolor: 'background.paper',
                      color: 'text.primary',
                      textTransform: 'none',
                      fontWeight: 650,
                      '&:hover': {
                        borderColor: 'primary.main',
                        bgcolor: 'action.hover',
                      },
                    }}
                  >
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0 }}>
                      <SepayVietQrLogoMark />
                      <Typography variant="body2" sx={{ fontWeight: 650, textAlign: 'left' }}>
                        {sepayPending
                          ? t('Connecting to Sepay gateway…')
                          : t('Pay with VietQR (Sepay)')}
                      </Typography>
                    </Stack>
                    <QrCode2Rounded sx={{ fontSize: 18, color: 'text.secondary', flexShrink: 0 }} />
                  </Button>

                  {onProceedToVnPay && (
                    <Button
                      variant="outlined"
                      disabled={vnpayPending || sepayPending}
                      onClick={onProceedToVnPay}
                      sx={{
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 1.5,
                        px: 1.75,
                        py: 1.25,
                        minHeight: 58,
                        borderRadius: '10px',
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                        color: 'text.primary',
                        textTransform: 'none',
                        fontWeight: 650,
                        '&:hover': {
                          borderColor: 'primary.main',
                          bgcolor: 'action.hover',
                        },
                      }}
                    >
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0 }}>
                        <VnPayLogoMark />
                        <Typography variant="body2" sx={{ fontWeight: 650, textAlign: 'left' }}>
                          {vnpayPending
                            ? t('Connecting to VNPay gateway…')
                            : t('Pay with VNPay')}
                        </Typography>
                      </Stack>
                      <OpenInNewRounded sx={{ fontSize: 17, color: 'text.secondary', flexShrink: 0 }} />
                    </Button>
                  )}
                </Stack>

                {!amountVnd && (
                  <Box>
                    <Button
                      variant="outlined"
                      size="small"
                      disabled={documentBusy}
                      startIcon={<DownloadRounded sx={{ fontSize: 16 }} />}
                      onClick={() => void downloadPaymentDocument('notice')}
                      sx={{
                        fontWeight: 600,
                        borderRadius: '8px',
                        textTransform: 'none',
                      }}
                    >
                      {documentBusy ? t('Generating PDF…') : t('Download payment notice (PDF)')}
                    </Button>
                  </Box>
                )}

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
          </Box>
        </Box>
      </Stack>
    </Paper>
  );
}
