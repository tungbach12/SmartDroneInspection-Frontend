import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import AccountBalanceWalletOutlined from '@mui/icons-material/AccountBalanceWalletOutlined';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import HourglassEmptyRounded from '@mui/icons-material/HourglassEmptyRounded';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { resolveInspectorFinanceBreakdown } from '../utils/inspectorFinance';
import type { InspectionListItem, ReportPaymentStatusDetails } from '../api/inspectionApi';

interface InspectorPayoutSummaryBarProps {
  inspectionId: string;
  listRow?: Partial<InspectionListItem> | null | undefined;
  paymentDetails?: Partial<ReportPaymentStatusDetails> | null | undefined;
  roleView?: 'inspector' | 'manager';
}

/**
 * Displays the order value, platform commission deduction, and partner inspector payout
 * with automatic disbursement status once the Customer settles payment.
 */
export function InspectorPayoutSummaryBar({
  inspectionId,
  listRow,
  paymentDetails,
  roleView = 'inspector',
}: InspectorPayoutSummaryBarProps) {
  const { formatNumber, t } = useLocale();
  const finance = resolveInspectorFinanceBreakdown(inspectionId, listRow, paymentDetails);

  if (!finance) {
    return null;
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 1.75, sm: 2 },
        borderRadius: '10px',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Stack spacing={1.5}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <AccountBalanceWalletOutlined sx={{ fontSize: 18, color: 'primary.main' }} />
            <Typography sx={{ fontSize: '0.875rem', fontWeight: 650, color: 'text.primary' }}>
              {roleView === 'manager'
                ? t('Order revenue, platform commission & auto-disbursement')
                : t('Partner order value & payout breakdown')}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', ml: 3.5 }}>
              Invoice: service_invoices · Payment: service_payments · Payout: inspector_payouts
            </Typography>
          </Stack>

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
                ? t('Auto-disbursed · Paid')
                : t('Auto-disburses on customer payment')
            }
            color={finance.isDisbursed ? 'success' : 'default'}
            variant={finance.isDisbursed ? 'filled' : 'outlined'}
            sx={{ height: 22, borderRadius: '5px', fontSize: '0.75rem', fontWeight: 650 }}
          />
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, 1fr)',
              md: 'repeat(4, 1fr)',
            },
            gap: 1.5,
          }}
        >
          <Box
            sx={{
              p: 1.25,
              borderRadius: '8px',
              bgcolor: 'background.default',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              {t('Order total (incl. VAT)')}
            </Typography>
            <Typography
              sx={{
                fontSize: '1rem',
                fontWeight: 700,
                color: 'text.primary',
                fontVariantNumeric: 'tabular-nums',
                mt: 0.25,
              }}
            >
              {formatNumber(finance.totalPrice)} ₫
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}
            >
              {t('Pre-VAT base')}: {formatNumber(finance.serviceBaseAmount)} ₫
            </Typography>
          </Box>

          <Box
            sx={{
              p: 1.25,
              borderRadius: '8px',
              bgcolor: 'background.default',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              {t('Platform commission')} ({finance.commissionRate}%)
            </Typography>
            <Typography
              sx={{
                fontSize: '1rem',
                fontWeight: 700,
                color: roleView === 'manager' ? 'primary.main' : '#8C520B',
                fontVariantNumeric: 'tabular-nums',
                mt: 0.25,
              }}
            >
              {roleView === 'manager' ? '+' : '-'}
              {formatNumber(finance.commissionAmount)} ₫
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {roleView === 'manager' ? t('Retained by platform') : t('Platform service fee')}
            </Typography>
          </Box>

          <Box
            sx={{
              p: 1.25,
              borderRadius: '8px',
              bgcolor: 'background.default',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              {t('After commission')}
            </Typography>
            <Typography
              sx={{
                fontSize: '1rem',
                fontWeight: 700,
                color: 'text.primary',
                fontVariantNumeric: 'tabular-nums',
                mt: 0.25,
              }}
            >
              {formatNumber(finance.afterCommissionAmount)} ₫
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}
            >
              {t('TNCN tax')} ({finance.tncnRate}%): -{formatNumber(finance.tncnAmount)} ₫
            </Typography>
          </Box>

          <Box
            sx={{
              p: 1.25,
              borderRadius: '8px',
              bgcolor: finance.isDisbursed ? 'rgba(23, 107, 82, 0.08)' : 'background.default',
              border: '1px solid',
              borderColor: finance.isDisbursed ? '#176B52' : 'divider',
            }}
          >
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              {roleView === 'manager' ? t('Inspector net payout') : t('Your net payout')}
            </Typography>
            <Typography
              sx={{
                fontSize: '1rem',
                fontWeight: 700,
                color: '#176B52',
                fontVariantNumeric: 'tabular-nums',
                mt: 0.25,
              }}
            >
              {formatNumber(finance.netPayoutAmount)} ₫
            </Typography>
            <Typography variant="caption" sx={{ color: '#176B52', fontWeight: 600 }}>
              {finance.isDisbursed
                ? t('✓ Received in inspector account')
                : t('Auto-sent when customer pays')}
            </Typography>
          </Box>
        </Box>
      </Stack>
    </Paper>
  );
}
