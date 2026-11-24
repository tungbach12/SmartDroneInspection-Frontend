import { Box, Chip, Divider, Paper, Stack, Typography } from '@mui/material';
import ReceiptLongOutlined from '@mui/icons-material/ReceiptLongOutlined';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { StatusChip } from '@/shared/ui/StatusChip';
import { resolveInspectorFinanceBreakdown } from '../utils/inspectorFinance';
import type { InspectionListItem, ReportPaymentStatusDetails } from '../api/inspectionApi';

export interface PlatformSettlementInvoiceCardProps {
  inspectionId: string;
  listRow?: Partial<InspectionListItem> | null | undefined;
  paymentDetails?: Partial<ReportPaymentStatusDetails> | null | undefined;
}

function formatPaymentMethodLabel(method: string | null | undefined, t: (key: string) => string): string {
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
      spacing={2}
      sx={{ justifyContent: 'space-between', alignItems: 'baseline', py: 0.5 }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography
          variant="body2"
          sx={{
            fontSize: bold ? '0.875rem' : '0.8125rem',
            fontWeight: bold ? 650 : 500,
            color: bold ? 'text.primary' : 'text.secondary',
          }}
        >
          {label}
        </Typography>
        {sublabel && (
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', display: 'block', fontSize: '0.75rem' }}
          >
            {sublabel}
          </Typography>
        )}
      </Box>
      <Typography
        variant="body2"
        sx={{
          fontSize: bold ? '0.875rem' : '0.8125rem',
          fontWeight: bold ? 700 : 600,
          color: amountColor,
          fontVariantNumeric: 'tabular-nums',
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
 * Clean financial breakdown card for Platform Manager / Admin:
 * Shows Customer invoice (left) alongside Platform Commission & Partner Inspector payout (right)
 * using calm neutral surfaces without duplicated metric panels.
 */
export function PlatformSettlementInvoiceCard({
  inspectionId,
  listRow,
  paymentDetails,
}: PlatformSettlementInvoiceCardProps) {
  const { formatNumber, t } = useLocale();
  const finance = resolveInspectorFinanceBreakdown(inspectionId, listRow, paymentDetails);

  if (!finance) {
    return null;
  }

  const statusConfig = finance.isDisbursed
    ? { status: 'paid', label: 'Paid & settled', tone: 'success' as const }
    : finance.isPaid
      ? { status: 'payout_pending', label: 'Customer paid · payout pending', tone: 'warning' as const }
      : paymentDetails?.reportAccepted
        ? { status: 'payment_due', label: 'Awaiting payment', tone: 'info' as const }
        : { status: 'awaiting', label: 'Awaiting customer', tone: 'default' as const };

  const invoiceRef = paymentDetails?.orderCode ? `INV-${paymentDetails.orderCode}` : null;
  const methodLabel = formatPaymentMethodLabel(paymentDetails?.paymentMethod, t);

  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 2, sm: 2.5 },
        borderRadius: '12px',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        boxShadow: 'none',
      }}
    >
      <Stack spacing={2.25}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}>
          <Typography sx={{ fontSize: '1rem', fontWeight: 650, color: 'text.primary' }}>
            {t('Order & settlement breakdown')}
          </Typography>
          <StatusChip
            status={statusConfig.status}
            label={statusConfig.label}
            tone={statusConfig.tone}
          />
          {invoiceRef && (
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
          )}
        </Stack>

        <Divider />

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 2.5,
            alignItems: 'stretch',
          }}
        >
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
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary', mb: 1.25 }}>
                {t('Service invoice')}
              </Typography>
              <StatementLine
                label={t('Base fee')}
                amount={`${formatNumber(finance.serviceBaseAmount)} ₫`}
              />
              <StatementLine
                label={`VAT (${finance.vatRate}%)`}
                amount={`+${formatNumber(finance.vatAmount)} ₫`}
                tone="muted"
              />
              <Divider sx={{ my: 1, borderStyle: 'dashed' }} />
              <StatementLine
                label={finance.isPaid ? t('Total paid') : t('Order total (incl. VAT)')}
                amount={`${formatNumber(finance.totalPrice)} ₫`}
                bold
              />
            </Box>
            {finance.isPaid && methodLabel && (
              <Typography variant="caption" sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
                {`${t('Paid via')} ${methodLabel}`}
                {paymentDetails?.orderCode ? ` · ${t('Order')} #${paymentDetails.orderCode}` : ''}
              </Typography>
            )}
          </Box>

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
            }}
          >
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary', mb: 1.25 }}>
                {t('Commission & payout')}
              </Typography>
              <StatementLine
                label={`${t('Platform commission')} (${finance.commissionRate}%)`}
                amount={`+${formatNumber(finance.commissionAmount)} ₫`}
                tone="accent"
              />
              <StatementLine
                label={t('Inspector gross payout')}
                amount={`${formatNumber(finance.afterCommissionAmount)} ₫`}
              />
              <StatementLine
                label={`${t('TNCN tax')} (${finance.tncnRate}%)`}
                amount={`−${formatNumber(finance.tncnAmount)} ₫`}
                tone="deduct"
              />
              <Divider sx={{ my: 1, borderStyle: 'dashed' }} />
              <StatementLine
                label={t('Inspector net payout')}
                sublabel={
                  finance.isDisbursed
                    ? t('Payout recorded')
                    : finance.isPaid
                      ? t('Eligible for manager payout')
                      : t('Payable after customer payment')
                }
                amount={`${formatNumber(finance.netPayoutAmount)} ₫`}
                bold
              />
            </Box>
          </Box>
        </Box>
      </Stack>
    </Paper>
  );
}
