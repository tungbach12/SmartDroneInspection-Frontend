import { Box, Chip, Divider, Paper, Stack, Typography } from '@mui/material';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import HourglassEmptyRounded from '@mui/icons-material/HourglassEmptyRounded';
import ReceiptLongOutlined from '@mui/icons-material/ReceiptLongOutlined';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { resolveInspectorFinanceBreakdown } from '../utils/inspectorFinance';
import type { InspectionListItem, ReportPaymentStatusDetails } from '../api/inspectionApi';

export interface PlatformSettlementInvoiceCardProps {
  inspectionId: string;
  listRow?: Partial<InspectionListItem> | null | undefined;
  paymentDetails?: Partial<ReportPaymentStatusDetails> | null | undefined;
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
  tone?: 'default' | 'muted' | 'deduct' | 'primary' | 'success';
  bold?: boolean;
}) {
  const amountColor =
    tone === 'primary'
      ? 'primary.main'
      : tone === 'success'
        ? '#176B52'
        : tone === 'deduct' || tone === 'muted'
          ? 'text.secondary'
          : 'text.primary';

  return (
    <Stack
      direction="row"
      spacing={2}
      sx={{ justifyContent: 'space-between', alignItems: 'baseline', py: 0.65 }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography
          variant="body2"
          sx={{
            fontSize: '0.8125rem',
            fontWeight: bold ? 700 : 500,
            color: bold ? 'text.primary' : 'text.secondary',
          }}
        >
          {label}
        </Typography>
        {sublabel && (
          <Typography
            variant="caption"
            sx={{ color: 'text.disabled', display: 'block', fontSize: '0.72rem' }}
          >
            {sublabel}
          </Typography>
        )}
      </Box>
      <Typography
        variant="body2"
        sx={{
          fontSize: bold ? '0.9375rem' : '0.8125rem',
          fontWeight: bold ? 800 : 600,
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
 * Dedicated financial statement card for Platform Manager / Admin:
 * Shows the full customer invoice and direct partner transfer while highlighting Platform Commission Revenue (+15%).
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

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: '12px',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '280px 1fr' },
        }}
      >
        <Box
          sx={{
            p: { xs: 2, sm: 2.5 },
            bgcolor: 'background.default',
            borderBottom: { xs: '1px solid', md: 'none' },
            borderRight: { xs: 'none', md: '1px solid' },
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 1.5,
          }}
        >
          <Box>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mb: 1 }}>
              <ReceiptLongOutlined sx={{ fontSize: 16, color: 'primary.main' }} />
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: 'text.secondary',
                }}
              >
                {t('Platform revenue')}
              </Typography>
            </Stack>

            <Typography
              sx={{
                fontSize: { xs: '1.5rem', sm: '1.65rem' },
                fontWeight: 800,
                lineHeight: 1.15,
                color: 'primary.main',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              +{formatNumber(finance.commissionAmount)} ₫
            </Typography>

            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
              {`${t('Platform commission')} (${finance.commissionRate}% × ${formatNumber(finance.serviceBaseAmount)} ₫)`}
            </Typography>
          </Box>

          <Box>
            <Chip
              size="small"
              icon={
                finance.isDisbursed ? (
                  <CheckCircleRounded sx={{ fontSize: 14 }} />
                ) : (
                  <HourglassEmptyRounded sx={{ fontSize: 14 }} />
                )
              }
              label={
                finance.isDisbursed
                  ? t('Paid & settled')
                  : t('Auto-disburses on customer payment')
              }
              color={finance.isDisbursed ? 'success' : 'default'}
              variant={finance.isDisbursed ? 'filled' : 'outlined'}
              sx={{
                height: 24,
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 650,
                maxWidth: '100%',
              }}
            />
          </Box>
        </Box>

        <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              color: 'text.secondary',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              display: 'block',
              mb: 1,
            }}
          >
            {t('Order & settlement breakdown')}
          </Typography>

          <Stack spacing={0}>
            <StatementLine
              label={t('Pre-VAT base')}
              amount={`${formatNumber(finance.serviceBaseAmount)} ₫`}
            />
            <StatementLine
              label={`VAT (${finance.vatRate}%)`}
              amount={`+${formatNumber(finance.vatAmount)} ₫`}
              tone="muted"
            />
            <Divider sx={{ my: 0.5, borderStyle: 'dashed' }} />
            <StatementLine
              label={t('Order total (incl. VAT)')}
              amount={`${formatNumber(finance.totalPrice)} ₫`}
              bold
            />
            <Divider sx={{ my: 0.75 }} />
            <StatementLine
              label={`${t('After commission')} (${100 - finance.commissionRate}% × ${formatNumber(finance.serviceBaseAmount)} ₫)`}
              amount={`${formatNumber(finance.afterCommissionAmount)} ₫`}
              tone="muted"
            />
            <StatementLine
              label={`${t('TNCN tax')} (${finance.tncnRate}%)`}
              amount={`−${formatNumber(finance.tncnAmount)} ₫`}
              tone="deduct"
            />
            <StatementLine
              label={t('Inspector net payout')}
              sublabel={t('Transferred directly when customer pays')}
              amount={`${formatNumber(finance.netPayoutAmount)} ₫`}
              tone="success"
            />
            <Box
              sx={{
                mt: 0.75,
                pt: 1,
                px: 1.25,
                pb: 0.75,
                borderRadius: '8px',
                bgcolor: 'action.hover',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <StatementLine
                label={`${t('Platform commission')} (${finance.commissionRate}%)`}
                amount={`+${formatNumber(finance.commissionAmount)} ₫`}
                tone="primary"
                bold
              />
            </Box>
          </Stack>
        </Box>
      </Box>
    </Paper>
  );
}
