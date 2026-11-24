import { useState } from 'react';
import { Alert, Box, Button, Chip, Divider, Paper, Stack, TextField, Typography } from '@mui/material';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import DownloadRounded from '@mui/icons-material/DownloadRounded';
import ReceiptLongOutlined from '@mui/icons-material/ReceiptLongOutlined';
import { getErrorMessage } from '@/shared/api/errorMessage';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import { StatusChip } from '@/shared/ui/StatusChip';
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
  inspectorName?: string | null | undefined;
  onSettlePayout?: ((payoutReference: string) => Promise<void>) | undefined;
  onManageFinance?: (() => void) | undefined;
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
  inspectorName,
  onSettlePayout,
  onManageFinance,
}: PlatformSettlementInvoiceCardProps) {
  const { formatDate, formatNumber, t } = useLocale();
  const [documentBusy, setDocumentBusy] = useState(false);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [payoutRefInput, setPayoutRefInput] = useState('');
  const [payoutBusy, setPayoutBusy] = useState(false);
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const finance = resolveInspectorFinanceBreakdown(inspectionId, listRow, paymentDetails);

  if (!finance) {
    return null;
  }

  const customerChip = finance.isPaid
    ? { status: 'paid', label: 'Customer paid', tone: 'success' as const }
    : paymentDetails?.reportAccepted
      ? { status: 'payment_due', label: 'Awaiting payment', tone: 'info' as const }
      : { status: 'awaiting', label: 'Awaiting customer', tone: 'default' as const };

  const payoutChip = finance.isDisbursed
    ? { status: 'settled', label: 'Payout settled', tone: 'success' as const }
    : finance.isPayoutEligible
      ? { status: 'payout_pending', label: 'Payout eligible', tone: 'warning' as const }
      : { status: 'payout_locked', label: 'Payout pending', tone: 'default' as const };

  const invoiceRef = paymentDetails?.orderCode ? `INV-${paymentDetails.orderCode}` : null;
  const methodLabel = formatPaymentMethodLabel(paymentDetails?.paymentMethod, t);
  const canDownloadDocument = Boolean(finance.isPaid || paymentDetails?.reportAccepted);
  const dueLabel = paymentDetails?.paymentDueAt
    ? t('Pay by {date}').replace(
        '{date}',
        formatDate(paymentDetails.paymentDueAt, { dateStyle: 'medium' }),
      )
    : null;
  const payoutRef = paymentDetails?.payoutReference;
  const payoutStatusNote = finance.isDisbursed
    ? payoutRef
      ? `${t('Settled')} · ${t('Ref')}: ${payoutRef}`
      : t('Payout recorded')
    : finance.isPayoutEligible
      ? t('Eligible for manager payout')
      : t('Payable after report approval');
  const payoutSublabel = inspectorName
    ? `${inspectorName} · ${payoutStatusNote}`
    : payoutStatusNote;

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
          <StatusChip
            status={customerChip.status}
            label={customerChip.label}
            tone={customerChip.tone}
          />
          <StatusChip
            status={payoutChip.status}
            label={payoutChip.label}
            tone={payoutChip.tone}
          />
        </Stack>

        {documentError && (
          <Alert severity="error" sx={{ borderRadius: '8px' }}>
            {documentError}
          </Alert>
        )}

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

            {(finance.isPaid || dueLabel || canDownloadDocument) && (
              <Stack spacing={1.25}>
                {finance.isPaid ? (
                  <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}
                  >
                    {methodLabel ? `${t('Paid via')} ${methodLabel}` : t('Paid')}
                    {paymentDetails?.orderCode ? ` · ${t('Order')} #${paymentDetails.orderCode}` : ''}
                    {paymentDetails?.paymentReference
                      ? ` · ${t('Ref')}: ${paymentDetails.paymentReference}`
                      : ''}
                  </Typography>
                ) : dueLabel ? (
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {dueLabel}
                  </Typography>
                ) : null}

                {canDownloadDocument && (
                  <Box>
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
              gap: 1.5,
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
                sublabel={payoutSublabel}
                amount={`${formatNumber(finance.netPayoutAmount)} ₫`}
                bold
              />
            </Box>

            {((!finance.isDisbursed && finance.isPayoutEligible && Boolean(onSettlePayout)) || Boolean(onManageFinance)) && (
              <Stack
                spacing={1.25}
                sx={{ pt: 1.5, borderTop: '1px dashed', borderColor: 'divider' }}
              >
                {!finance.isDisbursed && finance.isPayoutEligible && onSettlePayout && (
                  <Stack spacing={1}>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                      {t('Record partner transfer')}
                    </Typography>
                    {payoutError && (
                      <Alert severity="error" onClose={() => setPayoutError(null)} sx={{ borderRadius: '8px' }}>
                        {payoutError}
                      </Alert>
                    )}
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                      <TextField
                        size="small"
                        placeholder={t('Bank transfer reference (e.g. UNC-VCB-20261110)')}
                        value={payoutRefInput}
                        onChange={(e) => setPayoutRefInput(e.target.value)}
                        sx={{ flex: 1 }}
                      />
                      <LoadingButton
                        size="small"
                        variant="contained"
                        color="primary"
                        loading={payoutBusy}
                        disabled={!payoutRefInput.trim()}
                        onClick={async () => {
                          setPayoutBusy(true);
                          setPayoutError(null);
                          try {
                            await onSettlePayout(payoutRefInput.trim());
                            setPayoutRefInput('');
                          } catch (error) {
                            setPayoutError(
                              getErrorMessage(error, t('Could not settle payout.')),
                            );
                          } finally {
                            setPayoutBusy(false);
                          }
                        }}
                        sx={{
                          textTransform: 'none',
                          fontWeight: 650,
                          whiteSpace: 'nowrap',
                          borderRadius: '8px',
                          boxShadow: 'none',
                        }}
                      >
                        {t('Settle Inspector payout')}
                      </LoadingButton>
                    </Stack>
                  </Stack>
                )}

                {onManageFinance && (
                  <Box>
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
                      {onSettlePayout && finance.isPayoutEligible
                        ? t('Refunds & wire transfer')
                        : t('Manage payout & refunds')}
                    </Button>
                  </Box>
                )}
              </Stack>
            )}
          </Box>
        </Box>
      </Stack>
    </Paper>
  );
}
