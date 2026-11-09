import { Box, Grid, Typography } from '@mui/material';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import type { InspectorOrderFinanceBreakdown } from '../utils/inspectorFinance';
import type { InspectionRoleView } from '../utils/workflowStepResolver';

interface OverviewFinanceSectionProps {
  finance: InspectorOrderFinanceBreakdown;
  roleView: InspectionRoleView;
}

/**
 * Role-scoped financial breakdown for the Inspection Overview dialog:
 * - Customer (`customer`): Only sees Customer Service Fee, VAT, and Total Contract Fee (never internal platform commission or partner net payout).
 * - Inspector (`inspector`): Sees Service Base, Platform Fee deduction, TNCN withholding, and Inspector Net Payout.
 * - Manager (`manager`): Sees 3-way reconciliation (Customer Total incl. VAT, Platform Commission, Inspector Net Payout).
 */
export function OverviewFinanceSection({
  finance,
  roleView,
}: OverviewFinanceSectionProps) {
  const { t, formatNumber } = useLocale();

  if (roleView === 'customer') {
    return (
      <Box sx={{ pt: 1.5, borderTop: '1px solid', borderColor: '#e2e8f0' }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          {t('Service fee summary')}
        </Typography>
        <Grid container spacing={2} sx={{ mt: 0.25 }}>
          <Grid size={{ xs: 4 }}>
            <Typography variant="caption" color="text.secondary">
              {t('Service Base Fee')}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
              {formatNumber(finance.serviceBaseAmount)} ₫
            </Typography>
          </Grid>
          <Grid size={{ xs: 4 }}>
            <Typography variant="caption" color="text.secondary">
              {t('VAT')} ({finance.vatRate}%)
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
              +{formatNumber(finance.vatAmount)} ₫
            </Typography>
          </Grid>
          <Grid size={{ xs: 4 }}>
            <Typography variant="caption" color="text.secondary">
              {t('Total Contract Fee')}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
              {formatNumber(finance.totalPrice)} ₫
            </Typography>
          </Grid>
        </Grid>
      </Box>
    );
  }

  if (roleView === 'inspector') {
    return (
      <Box sx={{ pt: 1.5, borderTop: '1px solid', borderColor: '#e2e8f0' }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          {t('Partner payout breakdown')}
        </Typography>
        <Grid container spacing={2} sx={{ mt: 0.25 }}>
          <Grid size={{ xs: 4 }}>
            <Typography variant="caption" color="text.secondary">
              {t('Service Base Fee')}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
              {formatNumber(finance.serviceBaseAmount)} ₫
            </Typography>
          </Grid>
          <Grid size={{ xs: 4 }}>
            <Typography variant="caption" color="text.secondary">
              {t('Platform & Tax Deductions')} ({finance.commissionRate}% + {finance.tncnRate}% TNCN)
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
              -{formatNumber(finance.commissionAmount + finance.tncnAmount)} ₫
            </Typography>
          </Grid>
          <Grid size={{ xs: 4 }}>
            <Typography variant="caption" color="text.secondary">
              {t('Inspector Net Payout')}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: '#176B52', fontVariantNumeric: 'tabular-nums' }}>
              {formatNumber(finance.netPayoutAmount)} ₫
            </Typography>
          </Grid>
        </Grid>
      </Box>
    );
  }

  // Manager / Admin: 3-way Platform Reconciliation
  return (
    <Box sx={{ pt: 1.5, borderTop: '1px solid', borderColor: '#e2e8f0' }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
        {t('Financial breakdown')}
      </Typography>
      <Grid container spacing={2} sx={{ mt: 0.25 }}>
        <Grid size={{ xs: 4 }}>
          <Typography variant="caption" color="text.secondary">
            {t('Order Total (incl. VAT)')}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
            {formatNumber(finance.totalPrice)} ₫
          </Typography>
        </Grid>
        <Grid size={{ xs: 4 }}>
          <Typography variant="caption" color="text.secondary">
            {t('Platform Commission')} ({finance.commissionRate}%)
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 700, color: '#176B52', fontVariantNumeric: 'tabular-nums' }}>
            +{formatNumber(finance.commissionAmount)} ₫
          </Typography>
        </Grid>
        <Grid size={{ xs: 4 }}>
          <Typography variant="caption" color="text.secondary">
            {t('Inspector Net Payout')}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155', fontVariantNumeric: 'tabular-nums' }}>
            {formatNumber(finance.netPayoutAmount)} ₫
          </Typography>
        </Grid>
      </Grid>
    </Box>
  );
}
