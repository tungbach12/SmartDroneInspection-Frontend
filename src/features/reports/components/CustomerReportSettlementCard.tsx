import { useState } from 'react';
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
import DownloadRounded from '@mui/icons-material/DownloadRounded';
import ReceiptLongOutlined from '@mui/icons-material/ReceiptLongOutlined';
import {
  inspectionApi,
  type ReportPaymentStatusDetails,
} from '@/features/inspections/api/inspectionApi';
import { resolveInspectorFinanceBreakdown } from '@/features/inspections/utils/inspectorFinance';
import { getErrorMessage } from '@/shared/api/errorMessage';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { SepayVietQrLogoMark, VnPayLogoMark } from '@/shared/ui/PaymentBrandLogos';
import { StatusChip } from '@/shared/ui/StatusChip';
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
}

function formatPaymentMethodLabel(method: string | null | undefined, t: (key: string) => string): string {
  const normalized = (method ?? '').trim().toUpperCase();
  if (normalized === 'VNPAY') return 'VNPay';
  if (normalized === 'SEPAY') return 'Sepay (VietQR)';
  if (normalized === 'MANUAL_WIRE') return t('Bank transfer');
  return method?.trim() || 'Sepay';
}

function PaymentMethodLogoMark({ method }: { method: string | null | undefined }) {
  const normalized = (method ?? '').trim().toUpperCase();
  if (normalized === 'VNPAY') return <VnPayLogoMark />;
  if (normalized === 'SEPAY') return <SepayVietQrLogoMark />;
  return (
    <Box
      aria-hidden="true"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 44,
        height: 32,
        borderRadius: '6px',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        color: 'text.secondary',
        flexShrink: 0,
      }}
    >
      <ReceiptLongOutlined sx={{ fontSize: 18 }} />
    </Box>
  );
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
}: CustomerReportSettlementCardProps) {
  const { formatDate, formatNumber, t } = useLocale();
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [documentBusy, setDocumentBusy] = useState(false);

  const downloadPaymentReceipt = async () => {
    setDocumentBusy(true);
    setDocumentError(null);
    try {
      const blob = await inspectionApi.downloadPaymentDocument(inspectionId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `SDI-payment-receipt-${inspectionId.slice(0, 8)}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setDocumentError(getErrorMessage(error, 'Payment document could not be downloaded.'));
    } finally {
      setDocumentBusy(false);
    }
  };
  const finance = resolveInspectorFinanceBreakdown(inspectionId, null, paymentStatus);

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
        {/* Header Bar: Title + Status + Invoice Ref */}
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}>
          <Typography sx={{ fontSize: '1rem', fontWeight: 650, color: 'text.primary' }}>
            {t('Service fee payment')}
          </Typography>
          {(isPaid || isPaymentConfirming) && (
            <StatusChip
              status={isPaid ? 'paid' : 'confirming'}
              label={isPaid ? 'Paid & Fulfilled' : 'Confirming payment…'}
              tone={isPaid ? 'success' : 'info'}
            />
          )}
          <Chip
            size="small"
            variant="outlined"
            icon={<ReceiptLongOutlined sx={{ fontSize: 13 }} />}
            label={invoiceRef}
            sx={{
              height: 24,
              borderRadius: '6px',
              borderColor: 'divider',
              color: 'text.secondary',
              fontSize: '0.75rem',
              fontWeight: 600,
              fontFamily: 'monospace',
            }}
          />
        </Stack>

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
                borderColor: 'divider',
                bgcolor: 'background.paper',
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
                  <Typography variant="body2" sx={{ fontWeight: 650, fontSize: '0.875rem', color: 'text.primary' }}>
                    {isPaid ? t('Total paid') : t('Amount to pay')}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '0.9375rem',
                      fontWeight: 700,
                      color: 'text.primary',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {amountVnd}
                  </Typography>
                </Stack>
              </Box>
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
                  bgcolor: 'background.paper',
                }}
              >
                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <CheckCircleRounded sx={{ fontSize: 18, color: '#16A34A', flexShrink: 0 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                      {t('Payment confirmed')}
                    </Typography>
                  </Stack>

                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                    <PaymentMethodLogoMark method={paymentStatus?.paymentMethod} />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                        {paymentStatus?.paymentMethod
                          ? `${t('Paid via')} ${paymentMethodLabel}`
                          : t('Paid')}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'text.secondary',
                          fontVariantNumeric: 'tabular-nums',
                          display: 'block',
                        }}
                      >
                        {paymentStatus?.orderCode
                          ? `${t('Order')} #${paymentStatus.orderCode}`
                          : t('Official receipt verified')}
                      </Typography>
                    </Box>
                  </Stack>
                </Stack>

                <Box>
                  <Button
                    variant="outlined"
                    color="inherit"
                    size="small"
                    disabled={documentBusy}
                    startIcon={<DownloadRounded sx={{ fontSize: 16 }} />}
                    onClick={() => void downloadPaymentReceipt()}
                    sx={{
                      fontWeight: 600,
                      borderRadius: '8px',
                      borderColor: 'divider',
                      bgcolor: 'background.paper',
                      color: 'text.primary',
                      textTransform: 'none',
                      whiteSpace: 'nowrap',
                      '&:hover': {
                        borderColor: 'text.secondary',
                        bgcolor: 'action.hover',
                      },
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
                      justifyContent: 'flex-start',
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
                    <SepayVietQrLogoMark />
                    <Typography variant="body2" sx={{ fontWeight: 650, textAlign: 'left' }}>
                      {sepayPending
                        ? t('Connecting to Sepay gateway…')
                        : t('Pay with VietQR (Sepay)')}
                    </Typography>
                  </Button>

                  {onProceedToVnPay && (
                    <Button
                      variant="outlined"
                      disabled={vnpayPending || sepayPending}
                      onClick={onProceedToVnPay}
                      sx={{
                        justifyContent: 'flex-start',
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
                      <VnPayLogoMark />
                      <Typography variant="body2" sx={{ fontWeight: 650, textAlign: 'left' }}>
                        {vnpayPending
                          ? t('Connecting to VNPay gateway…')
                          : t('Pay with VNPay')}
                      </Typography>
                    </Button>
                  )}
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
          </Box>
        </Box>
      </Stack>
    </Paper>
  );
}
