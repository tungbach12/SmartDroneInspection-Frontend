import { useState } from 'react';
import {
  Alert,
  Box,
  Dialog,
  DialogContent,
  Divider,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ScheduleRounded from '@mui/icons-material/ScheduleRounded';
import { useIsDarkMode } from '@/app/layouts/ColorModeContext';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import type { ServiceRequestOccurrence } from '../../api/contractApi';
import {
  useCancelUnpaidPaymentOrder,
  useConfirmOccurrencePayment,
} from '../../hooks/useContracts';
import { RefundControls } from '../../components/RefundControls';
import { extractContractErrorText } from '../../shared/contractStage';

interface OccurrenceFinanceDrawerProps {
  open: boolean;
  onClose: () => void;
  requestId: string;
  occurrence: ServiceRequestOccurrence | null;
  isOneTime?: boolean;
  onChanged: () => void;
  onError?: (message: string) => void;
}

function formatCollectionMethod(method: string | null | undefined, t: (key: string) => string) {
  const normalized = (method ?? '').trim().toUpperCase();
  if (normalized === 'VNPAY') return 'VNPay';
  if (normalized === 'SEPAY') return 'Sepay (VietQR)';
  if (normalized === 'MANUAL_WIRE') return t('Bank transfer');
  return method?.trim() || '';
}

function SummaryRow({
  label,
  value,
  bold = false,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <Stack
      direction="row"
      spacing={2}
      sx={{ justifyContent: 'space-between', alignItems: 'center', py: 0.45 }}
    >
      <Typography
        variant="body2"
        sx={{ color: bold ? 'text.primary' : 'text.secondary', fontWeight: bold ? 700 : 500 }}
      >
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          color: 'text.primary',
          fontWeight: bold ? 700 : 600,
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </Typography>
    </Stack>
  );
}

/**
 * Centered modal for Customer collection overrides and post-payment Refunds & adjustments.
 * Inspector payout disbursement is handled separately via SePay VietQR on Step 3 / Payouts.
 */
export function OccurrenceFinanceDrawer({
  open,
  onClose,
  requestId,
  occurrence,
  isOneTime = false,
  onChanged,
  onError,
}: OccurrenceFinanceDrawerProps) {
  const { formatNumber, t } = useLocale();
  const isDark = useIsDarkMode();
  const [paymentRef, setPaymentRef] = useState('');
  const [drawerError, setDrawerError] = useState('');
  const confirmPayment = useConfirmOccurrencePayment(requestId, occurrence?.id ?? '');
  const cancelUnpaidOrder = useCancelUnpaidPaymentOrder(requestId, occurrence?.id ?? '');

  if (!occurrence) return null;

  const paymentStatus = (occurrence.payment?.status ?? occurrence.paymentStatus ?? 'PENDING').toUpperCase();
  const isPaid = occurrence.paymentStatus === 'PAID';
  const totalPrice = occurrence.totalPrice;
  const feeVnd = totalPrice != null && totalPrice > 0 ? `${formatNumber(Math.round(totalPrice))} ₫` : null;
  const invoice = occurrence.invoice;
  const payment = occurrence.payment;
  const isReportAccepted = Boolean(occurrence.reportAcceptedAt ?? invoice?.reportAcceptedAt);
  const canConfirmManualPayment =
    occurrence.paymentStatus === 'PAYMENT_DUE' &&
    isReportAccepted &&
    totalPrice != null &&
    totalPrice > 0;
  const hasUnpaidGatewayOrder =
    occurrence.paymentStatus === 'PAYMENT_DUE' && Boolean(payment?.gatewayOrderCode);

  const methodLabel = formatCollectionMethod(payment?.method, t);
  const invoiceCode = payment?.gatewayOrderCode ? `INV-${payment.gatewayOrderCode}` : null;
  const sectionDividerColor = isDark ? 'rgba(255, 255, 255, 0.14)' : '#D4D4D8';

  const statusTone = isPaid
    ? {
        bg: isDark ? 'rgba(16, 185, 129, 0.10)' : '#F0FDF4',
        titleColor: isDark ? '#6EE7B7' : '#15803D',
        iconColor: isDark ? '#34D399' : '#16A34A',
        title: t('Customer paid'),
        Icon: CheckCircleRounded,
      }
    : {
        bg: isDark ? 'rgba(59, 130, 246, 0.10)' : '#EFF3FF',
        titleColor: isDark ? '#93C5FD' : '#1D4ED8',
        iconColor: isDark ? '#60A5FA' : '#3758F9',
        title:
          paymentStatus === 'PAYMENT_DUE'
            ? t('Awaiting customer payment')
            : t('Awaiting customer report acceptance'),
        Icon: ScheduleRounded,
      };
  const StatusIcon = statusTone.Icon;

  const handleClose = () => {
    setDrawerError('');
    setPaymentRef('');
    onClose();
  };

  const reportError = (message: string) => {
    setDrawerError(message);
    onError?.(message);
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      scroll="paper"
      slotProps={{
        paper: {
          sx: {
            borderRadius: '16px',
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            backgroundImage: 'none',
            boxShadow: 'none',
          },
        },
      }}
    >
      <Box
        sx={{
          px: { xs: 2.5, sm: 3 },
          py: 2,
          bgcolor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#FAFAFB',
          borderBottom: '2px solid',
          borderColor: sectionDividerColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
        }}
      >
        <Stack spacing={0.25} sx={{ minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.02rem', color: 'text.primary' }}>
            {isOneTime
              ? t('Customer collection & refunds')
              : `${t('Occurrence')} ${occurrence.occurrenceIndex} · ${t('Customer collection & refunds')}`}
          </Typography>
          {invoiceCode && (
            <Typography
              variant="caption"
              sx={{ fontFamily: 'monospace', fontWeight: 600, color: 'text.secondary' }}
            >
              {invoiceCode}
            </Typography>
          )}
        </Stack>
        <IconButton size="small" onClick={handleClose} aria-label={t('Close')}>
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 0 }}>
        <Stack
          divider={
            <Divider
              sx={{
                borderBottomWidth: 2,
                borderColor: sectionDividerColor,
              }}
            />
          }
        >
          {/* 1. Customer Invoice & Collection Status */}
          <Box sx={{ px: { xs: 2.5, sm: 3 }, py: 2.5 }}>
            <Stack spacing={2}>
              {drawerError && (
                <Alert
                  severity="error"
                  onClose={() => setDrawerError('')}
                  sx={{ borderRadius: '8px' }}
                >
                  {drawerError}
                </Alert>
              )}

              <Box
                sx={{
                  p: 2,
                  borderRadius: '10px',
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: statusTone.bg,
                }}
              >
                <Stack spacing={1.25}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1}
                    sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
                  >
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <StatusIcon sx={{ fontSize: 19, color: statusTone.iconColor }} />
                      <Typography
                        variant="subtitle2"
                        sx={{ fontWeight: 700, color: statusTone.titleColor }}
                      >
                        {statusTone.title}
                      </Typography>
                    </Stack>
                    <Typography
                      variant="subtitle1"
                      sx={{
                        fontWeight: 700,
                        color: 'text.primary',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {feeVnd ?? t('Awaiting invoice snapshot')}
                    </Typography>
                  </Stack>

                  <Divider sx={{ opacity: 0.5 }} />

                  <Stack spacing={0.25}>
                    {methodLabel || payment?.gatewayOrderCode ? (
                      <SummaryRow
                        label={t('Payment method')}
                        value={[
                          methodLabel || paymentStatus,
                          payment?.gatewayOrderCode ? `#${payment.gatewayOrderCode}` : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      />
                    ) : null}
                    {occurrence.serviceBaseAmount != null && (
                      <SummaryRow
                        label={t('Base fee')}
                        value={`${formatNumber(Math.round(occurrence.serviceBaseAmount))} ₫`}
                      />
                    )}
                    {occurrence.vatAmount != null && (
                      <SummaryRow
                        label={
                          invoice?.vatRate != null ? `VAT (${invoice.vatRate}%)` : 'VAT'
                        }
                        value={`+${formatNumber(Math.round(occurrence.vatAmount))} ₫`}
                      />
                    )}
                    {feeVnd && (
                      <SummaryRow
                        label={isPaid ? t('Total paid') : t('Order total (incl. VAT)')}
                        value={feeVnd}
                        bold
                      />
                    )}
                  </Stack>
                </Stack>
              </Box>

              {hasUnpaidGatewayOrder && (
                <Box
                  sx={{
                    p: 1.75,
                    borderRadius: '10px',
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: isDark ? 'rgba(255, 255, 255, 0.02)' : '#FAFAFB',
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: { sm: 'center' },
                    justifyContent: 'space-between',
                    gap: 1.5,
                  }}
                >
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {t('Unpaid order')} #{payment?.gatewayOrderCode}
                  </Typography>
                  <LoadingButton
                    size="small"
                    variant="outlined"
                    color="warning"
                    loading={cancelUnpaidOrder.isPending}
                    onClick={async () => {
                      setDrawerError('');
                      try {
                        await cancelUnpaidOrder.mutateAsync();
                        onChanged();
                      } catch (err) {
                        reportError(
                          extractContractErrorText(err, 'Could not cancel the active payment order.'),
                        );
                      }
                    }}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 600,
                      borderRadius: '8px',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    {t('Reset order')}
                  </LoadingButton>
                </Box>
              )}

              {canConfirmManualPayment && (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
                  <TextField
                    size="small"
                    placeholder={t('Wire reference (e.g. FT261123)')}
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    sx={{ flex: 1 }}
                  />
                  <LoadingButton
                    size="small"
                    variant="contained"
                    color="success"
                    loading={confirmPayment.isPending}
                    disabled={!paymentRef.trim()}
                    onClick={async () => {
                      setDrawerError('');
                      try {
                        await confirmPayment.mutateAsync({
                          paymentReference: paymentRef.trim(),
                          amount: totalPrice,
                        });
                        setPaymentRef('');
                        onChanged();
                      } catch (err) {
                        reportError(
                          extractContractErrorText(err, 'Could not confirm customer payment.'),
                        );
                      }
                    }}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 600,
                      borderRadius: '8px',
                      whiteSpace: 'nowrap',
                      boxShadow: 'none',
                    }}
                  >
                    {t('Confirm payment')}
                  </LoadingButton>
                </Stack>
              )}
            </Stack>
          </Box>

          {/* 2. Refunds & Adjustments Workflow */}
          <Box sx={{ px: { xs: 2.5, sm: 3 }, py: 2.5 }}>
            {isPaid && occurrence.paymentStatus === 'PAID' ? (
              <RefundControls
                requestId={requestId}
                occurrence={occurrence}
                enabled
                onChanged={() => {
                  setDrawerError('');
                  onChanged();
                }}
                onError={reportError}
              />
            ) : (
              <Typography variant="body2" color="text.secondary">
                {t('Refund and adjustment controls unlock after customer payment is confirmed.')}
              </Typography>
            )}
          </Box>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
