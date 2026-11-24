import { useState } from 'react';
import { Alert, Box, Button, Divider, Paper, Stack, Typography } from '@mui/material';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import DownloadRounded from '@mui/icons-material/DownloadRounded';
import HourglassEmptyRounded from '@mui/icons-material/HourglassEmptyRounded';
import ScheduleRounded from '@mui/icons-material/ScheduleRounded';
import { useIsDarkMode } from '@/app/layouts/ColorModeContext';
import { getErrorMessage } from '@/shared/api/errorMessage';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { resolveInspectorFinanceBreakdown } from '../utils/inspectorFinance';
import {
  inspectionApi,
  type InspectionListItem,
  type ReportPaymentStatusDetails,
} from '../api/inspectionApi';

export interface PlatformSettlementInvoiceCardProps {
  inspectionId: string;
  listRow?: Partial<InspectionListItem> | null | undefined;
  paymentDetails?: Partial<ReportPaymentStatusDetails> | null | undefined;
  onManageFinance?: (() => void) | undefined;
}

function formatPaymentMethodLabel(
  method: string | null | undefined,
  t: (key: string) => string,
): string {
  const normalized = (method ?? '').trim().toUpperCase();
  if (normalized === 'VNPAY') return 'VNPay';
  if (normalized === 'SEPAY') return 'Sepay (VietQR)';
  if (normalized === 'MANUAL_WIRE') return t('Bank transfer');
  return method?.trim() || '';
}

function StatementLine({
  label,
  sublabel,
  amount,
  tone = 'default',
  bold = false,
}: {
  label: string;
  sublabel?: string;
  amount: string;
  tone?: 'default' | 'muted' | 'deduct' | 'accent';
  bold?: boolean;
}) {
  const amountColor =
    tone === 'accent'
      ? 'primary.main'
      : tone === 'deduct' || tone === 'muted'
        ? 'text.secondary'
        : 'text.primary';

  return (
    <Stack
      direction="row"
      spacing={3}
      sx={{ justifyContent: 'space-between', alignItems: 'center', py: 0.85 }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: bold ? 700 : 500,
            color: bold ? 'text.primary' : 'text.secondary',
          }}
        >
          {label}
        </Typography>
        {sublabel && (
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', display: 'block', mt: 0.2 }}
          >
            {sublabel}
          </Typography>
        )}
      </Box>
      <Typography
        variant={bold ? 'subtitle1' : 'body2'}
        sx={{
          fontWeight: bold ? 700 : 600,
          color: amountColor,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: bold ? '-0.01em' : undefined,
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        {amount}
      </Typography>
    </Stack>
  );
}

/**
 * Unified Step 4 Customer Settlement card for Platform Manager / Admin.
 *
 * Strictly scoped to customer collection & acceptance tracking, integer-rounded VND
 * customer invoice breakdown, PDF receipt/notice download, and refund/collection adjustments.
 * Inspector payouts are managed separately in Step 3.
 */
export function PlatformSettlementInvoiceCard({
  inspectionId,
  listRow,
  paymentDetails,
  onManageFinance,
}: PlatformSettlementInvoiceCardProps) {
  const { formatDate, formatDateTime, formatNumber, t } = useLocale();
  const isDark = useIsDarkMode();
  const [documentBusy, setDocumentBusy] = useState(false);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const finance = resolveInspectorFinanceBreakdown(inspectionId, listRow, paymentDetails);

  if (!finance) {
    return null;
  }

  const invoiceRef = paymentDetails?.orderCode ? `INV-${paymentDetails.orderCode}` : null;
  const methodLabel = formatPaymentMethodLabel(paymentDetails?.paymentMethod, t);
  const isAccepted = Boolean(paymentDetails?.reportAccepted || finance.isPaid);
  const canDownloadDocument = Boolean(finance.isPaid || isAccepted);
  const dueLabel = paymentDetails?.paymentDueAt
    ? t('Pay by {date}').replace(
        '{date}',
        formatDate(paymentDetails.paymentDueAt, { dateStyle: 'medium' }),
      )
    : null;
  const confirmedAtLabel = paymentDetails?.paymentConfirmedAt
    ? formatDateTime(paymentDetails.paymentConfirmedAt)
    : null;

  const sectionDividerColor = isDark ? 'rgba(255, 255, 255, 0.14)' : '#D4D4D8';

  const statusTone = finance.isPaid
    ? {
        bg: isDark ? 'rgba(16, 185, 129, 0.10)' : '#F0FDF4',
        border: isDark ? 'rgba(255, 255, 255, 0.14)' : 'divider',
        titleColor: isDark ? '#6EE7B7' : '#15803D',
        iconColor: isDark ? '#34D399' : '#16A34A',
        title: t('Customer paid'),
        Icon: CheckCircleRounded,
      }
    : isAccepted
      ? {
          bg: isDark ? 'rgba(59, 130, 246, 0.12)' : '#EFF3FF',
          border: isDark ? 'rgba(255, 255, 255, 0.14)' : 'divider',
          titleColor: isDark ? '#93C5FD' : '#1D4ED8',
          iconColor: isDark ? '#60A5FA' : '#3758F9',
          title: t('Awaiting customer payment'),
          Icon: ScheduleRounded,
        }
      : {
          bg: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F9FAFB',
          border: isDark ? 'rgba(255, 255, 255, 0.14)' : 'divider',
          titleColor: 'text.primary',
          iconColor: 'text.secondary',
          title: t('Awaiting customer report acceptance'),
          Icon: HourglassEmptyRounded,
        };

  const StatusIcon = statusTone.iconColor ? statusTone.Icon : HourglassEmptyRounded;

  const handleDownloadDocument = async () => {
    setDocumentBusy(true);
    setDocumentError(null);
    try {
      const blob = await inspectionApi.downloadPaymentDocument(inspectionId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${finance.isPaid ? 'SDI-payment-receipt' : 'SDI-payment-notice'}-${inspectionId.slice(0, 8)}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setDocumentError(getErrorMessage(error, t('Payment document could not be downloaded.')));
    } finally {
      setDocumentBusy(false);
    }
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        width: '100%',
        borderRadius: '12px',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        boxShadow: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Header Band */}
      <Box
        sx={{
          px: { xs: 2.5, sm: 3 },
          py: 2,
          bgcolor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#FAFAFB',
          borderBottom: '1px solid',
          borderColor: sectionDividerColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary' }}>
          {t('Customer Settlement')}
        </Typography>
        {invoiceRef && (
          <Typography
            variant="caption"
            sx={{ fontFamily: 'monospace', fontWeight: 650, color: 'text.secondary' }}
          >
            {invoiceRef}
          </Typography>
        )}
      </Box>

      {/* Vertical Sequential Sections separated by crisp 2px section dividers */}
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
        {/* 1. Prominent Customer Collection & Acceptance Status */}
        <Box
          sx={{
            px: { xs: 2.5, sm: 3 },
            py: 2.5,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(240px, 1fr) minmax(0, 2fr)' },
            gap: { xs: 1.5, md: 4 },
            alignItems: 'start',
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary', pt: 0.75 }}>
            {t('Collection status')}
          </Typography>

          <Stack spacing={1.5}>
            <Box
              sx={{
                p: 2,
                borderRadius: '10px',
                border: '1px solid',
                borderColor: statusTone.border,
                bgcolor: statusTone.bg,
              }}
            >
              <Stack spacing={1.5}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
                >
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <StatusIcon sx={{ fontSize: 20, color: statusTone.iconColor }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: statusTone.titleColor }}>
                      {statusTone.title}
                    </Typography>
                  </Stack>
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 700, color: 'text.primary', fontVariantNumeric: 'tabular-nums' }}
                  >
                    {`${formatNumber(Math.round(finance.totalPrice))} ₫`}
                  </Typography>
                </Stack>

                <Divider sx={{ opacity: 0.5 }} />

                <Stack spacing={0.75} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      {t('Report acceptance')}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                      {isAccepted ? t('Accepted') : t('Awaiting customer acceptance')}
                    </Typography>
                  </Stack>

                  {finance.isPaid ? (
                    <>
                      <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          {t('Paid at')}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                          {confirmedAtLabel ?? t('Confirmed')}
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          {t('Payment method')}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', textAlign: 'right' }}>
                          {methodLabel || 'Sepay'}
                          {paymentDetails?.orderCode ? ` · ${t('Order')} #${paymentDetails.orderCode}` : ''}
                          {paymentDetails?.paymentReference
                            ? ` · ${t('Ref')}: ${paymentDetails.paymentReference}`
                            : ''}
                        </Typography>
                      </Stack>
                    </>
                  ) : (
                    <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        {t('Payment due')}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                        {isAccepted ? (dueLabel ?? t('Awaiting payment')) : t('Starts on acceptance')}
                      </Typography>
                    </Stack>
                  )}
                </Stack>

                {canDownloadDocument && (
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 0.5 }}>
                    <Button
                      variant="outlined"
                      color="inherit"
                      size="small"
                      disabled={documentBusy}
                      startIcon={<DownloadRounded sx={{ fontSize: 16 }} />}
                      onClick={() => void handleDownloadDocument()}
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
                      {documentBusy
                        ? t('Generating PDF…')
                        : finance.isPaid
                          ? t('Download receipt (PDF)')
                          : t('Download payment notice (PDF)')}
                    </Button>
                  </Box>
                )}
              </Stack>
            </Box>

            {documentError && (
              <Alert severity="error" sx={{ borderRadius: '8px' }}>
                {documentError}
              </Alert>
            )}
          </Stack>
        </Box>

        {/* 2. Customer Invoice Breakdown & Refund Adjustments */}
        <Box
          sx={{
            px: { xs: 2.5, sm: 3 },
            py: 2.5,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(240px, 1fr) minmax(0, 2fr)' },
            gap: { xs: 1.5, md: 4 },
            alignItems: 'start',
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary', pt: 0.75 }}>
            {t('Service invoice')}
          </Typography>

          <Stack spacing={2}>
            <Stack divider={<Divider sx={{ opacity: 0.55 }} />} sx={{ fontVariantNumeric: 'tabular-nums' }}>
              <StatementLine
                label={t('Base fee')}
                amount={`${formatNumber(Math.round(finance.serviceBaseAmount))} ₫`}
              />
              <StatementLine
                label={`VAT (${finance.vatRate}%)`}
                amount={`+${formatNumber(Math.round(finance.vatAmount))} ₫`}
                tone="muted"
              />
              <StatementLine
                label={finance.isPaid ? t('Total paid') : t('Order total (incl. VAT)')}
                amount={`${formatNumber(Math.round(finance.totalPrice))} ₫`}
                bold
              />
            </Stack>

            {onManageFinance && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  color="inherit"
                  size="small"
                  endIcon={<ArrowForwardRounded sx={{ fontSize: 15 }} />}
                  onClick={onManageFinance}
                  sx={{
                    fontWeight: 600,
                    borderRadius: '8px',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                    color: 'text.secondary',
                    textTransform: 'none',
                    whiteSpace: 'nowrap',
                    '&:hover': {
                      borderColor: 'text.secondary',
                      color: 'text.primary',
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  {finance.isPaid ? t('Refunds & adjustments') : t('Collection & refund controls')}
                </Button>
              </Box>
            )}
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
}
