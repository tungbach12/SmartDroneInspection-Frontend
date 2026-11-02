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
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded';
import PaidOutlined from '@mui/icons-material/PaidOutlined';
import RadioButtonCheckedRounded from '@mui/icons-material/RadioButtonCheckedRounded';
import RadioButtonUncheckedRounded from '@mui/icons-material/RadioButtonUncheckedRounded';
import VerifiedOutlined from '@mui/icons-material/VerifiedOutlined';
import type { ReportPaymentStatusDetails } from '@/features/inspections/api/inspectionApi';
import { ReportAiSummaryCard } from '@/features/reports/components/ReportAiSummaryCard';
import { useLocale } from '@/shared/i18n/LocaleProvider';

interface CustomerReportSettlementCardProps {
  inspectionId: string;
  versionId: string;
  versionNo: number;
  isPaid: boolean;
  isReportAccepted: boolean;
  isPaymentCancelled?: boolean;
  paymentStatus?: ReportPaymentStatusDetails | undefined;
  acceptPending: boolean;
  payosPending: boolean;
  vnpayPending?: boolean;
  disputeSubmitted: boolean;
  onAcceptReport: () => void;
  onProceedToPayOS: () => void;
  onProceedToVnPay?: () => void;
  onOpenDispute: () => void;
}

/**
 * Customer Report Acceptance & PayOS / VNPay Commercial Settlement Panel.
 *
 * The published report and its PDF export are always readable by the Customer once published.
 * Commercial flow from Customer's perspective:
 * 1. Review & Accept Official Report
 * 2. Settle Service Fee via VNPay or PayOS (VietQR)
 * 3. Inspection Service Fulfilled & Deliverables Verified
 */
export function CustomerReportSettlementCard({
  inspectionId,
  versionId,
  versionNo,
  isPaid,
  isReportAccepted,
  isPaymentCancelled = false,
  paymentStatus,
  acceptPending,
  payosPending,
  vnpayPending = false,
  disputeSubmitted,
  onAcceptReport,
  onProceedToPayOS,
  onProceedToVnPay,
  onOpenDispute,
}: CustomerReportSettlementCardProps) {
  const { formatNumber, t } = useLocale();

  const amountVnd =
    paymentStatus?.amount != null && paymentStatus.amount > 0
      ? `${formatNumber(paymentStatus.amount)} ₫`
      : null;

  const steps = [
    {
      title: t('1. Accept Official Report'),
      subtitle:
        isReportAccepted || isPaid
          ? `${t('Accepted')} · v${versionNo}`
          : t('Review report & confirm acceptance'),
      done: isReportAccepted || isPaid,
      active: !isReportAccepted && !isPaid,
      icon: DescriptionOutlined,
    },
    {
      title: t('2. Service Fee Payment'),
      subtitle: isPaid
        ? t('Paid via PayOS')
        : amountVnd
          ? `${t('Due')}: ${amountVnd}`
          : t('PayOS VietQR payment'),
      done: isPaid,
      active: isReportAccepted && !isPaid,
      icon: PaidOutlined,
    },
    {
      title: t('3. Order Fulfilled'),
      subtitle: isPaid
        ? t('Deliverables verified & fulfilled')
        : t('Fulfilled upon payment confirmation'),
      done: isPaid,
      active: false,
      icon: VerifiedOutlined,
    },
  ];

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.5,
        borderRadius: '16px',
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
                    : isReportAccepted
                      ? t('Payment Due')
                      : t('Awaiting Acceptance')
                }
                color={isPaid ? 'success' : isReportAccepted ? 'warning' : 'primary'}
                sx={{ height: 22, borderRadius: '5px', fontSize: '0.75rem', fontWeight: 650 }}
              />
            </Stack>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
              {t('Official report version')} v{versionNo} · {t('PDF available for export below')}
              {paymentStatus?.orderCode ? ` · ${t('PayOS Order')} #${paymentStatus.orderCode}` : ''}
            </Typography>
          </Box>

          {amountVnd && (
            <Paper
              variant="outlined"
              sx={{
                px: 2,
                py: 1,
                borderRadius: '10px',
                borderColor: 'divider',
                bgcolor: 'background.default',
                textAlign: { xs: 'left', sm: 'right' },
              }}
            >
              <Typography
                variant="caption"
                sx={{ color: 'text.secondary', fontWeight: 600, display: 'block' }}
              >
                {isPaid ? t('Service fee paid') : t('Contracted service fee')}
              </Typography>
              <Typography
                sx={{
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: isPaid ? '#176B52' : 'text.primary',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {amountVnd}
              </Typography>
            </Paper>
          )}
        </Stack>

        {/* 3-Step Commercial Settlement Strip */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            gap: 1.5,
          }}
        >
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <Paper
                key={step.title}
                variant="outlined"
                sx={{
                  p: 1.5,
                  borderRadius: '10px',
                  borderColor: step.active ? 'primary.main' : 'divider',
                  bgcolor: step.active ? 'action.hover' : 'background.default',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.25,
                }}
              >
                {step.done ? (
                  <CheckCircleRounded sx={{ fontSize: 20, color: '#176B52', flexShrink: 0 }} />
                ) : step.active ? (
                  <RadioButtonCheckedRounded
                    sx={{ fontSize: 20, color: 'primary.main', flexShrink: 0 }}
                  />
                ) : (
                  <RadioButtonUncheckedRounded
                    sx={{ fontSize: 20, color: 'text.disabled', flexShrink: 0 }}
                  />
                )}
                <Box sx={{ minWidth: 0 }}>
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 650,
                        fontSize: '0.875rem',
                        color: step.done ? '#176B52' : 'text.primary',
                      }}
                    >
                      {step.title}
                    </Typography>
                    <Icon sx={{ fontSize: 15, color: 'text.secondary' }} />
                  </Stack>
                  <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}
                  >
                    {step.subtitle}
                  </Typography>
                </Box>
              </Paper>
            );
          })}
        </Box>

        <Divider />

        {/* Dynamic Action State */}
        {isPaid ? (
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
                {paymentStatus?.orderCode
                  ? `${t('PayOS Order')} #${paymentStatus.orderCode} · ${t('Official receipt verified')}`
                  : t('Official receipt verified')}
              </Typography>
            </Box>
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
                  {t('Report accepted')}
                  {amountVnd ? ` · ${t('Payment due')}: ${amountVnd}` : ''}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {t(
                    'Please complete the online service payment via VNPay or PayOS (VietQR). Once payment is confirmed, your inspection service is completed and deliverables are officially archived.',
                  )}
                </Typography>
              </Box>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ flexShrink: 0 }}>
                {onProceedToVnPay && (
                  <Button
                    variant="contained"
                    disabled={vnpayPending || payosPending}
                    endIcon={<OpenInNewRounded sx={{ fontSize: 16 }} />}
                    onClick={onProceedToVnPay}
                    sx={{
                      fontWeight: 650,
                      borderRadius: '8px',
                      px: 2.5,
                      py: 1,
                      textTransform: 'none',
                      whiteSpace: 'nowrap',
                      bgcolor: '#005baa',
                      '&:hover': { bgcolor: '#004684' },
                    }}
                  >
                    {vnpayPending
                      ? t('Connecting to VNPay gateway…')
                      : t('Proceed to VNPay payment ↗')}
                  </Button>
                )}
                <Button
                  variant={onProceedToVnPay ? 'outlined' : 'contained'}
                  color="primary"
                  disabled={payosPending || vnpayPending}
                  endIcon={<OpenInNewRounded sx={{ fontSize: 16 }} />}
                  onClick={onProceedToPayOS}
                  sx={{
                    fontWeight: 650,
                    borderRadius: '8px',
                    px: 2.5,
                    py: 1,
                    textTransform: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {payosPending
                    ? t('Connecting to PayOS gateway…')
                    : amountVnd
                      ? `${t('Pay')} ${amountVnd} ${t('via PayOS')}`
                      : t('Proceed to VietQR payment via PayOS ↗')}
                </Button>
              </Stack>
            </Stack>
          </Stack>
        ) : (
          <Stack spacing={2}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 650, color: 'text.primary' }}>
                {t('Customer report acceptance')}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
                {t(
                  'Review the published report below (you can also preview or export the PDF at any time). Click "Accept Report" when satisfied to proceed to PayOS payment.',
                )}
              </Typography>
            </Box>

            <ReportAiSummaryCard inspectionId={inspectionId} versionId={versionId} />

            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                color="success"
                disabled={acceptPending}
                onClick={onAcceptReport}
                sx={{
                  fontWeight: 650,
                  borderRadius: '8px',
                  px: 2.5,
                  textTransform: 'none',
                }}
              >
                {acceptPending ? t('Accepting…') : t('Accept Report')}
              </Button>
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
            </Stack>

            {disputeSubmitted && (
              <Alert severity="warning" sx={{ borderRadius: '10px' }}>
                {t(
                  'You have submitted a dispute/clarification request regarding this report. The Platform Manager has been notified and will review your inquiry.',
                )}
              </Alert>
            )}
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}
