import { useState } from 'react';
import {
  Box,
  Divider,
  Drawer,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import type { ServiceRequestOccurrence } from '../../api/contractApi';
import { useRecordOccurrencePayout } from '../../hooks/useContracts';
import { RefundControls } from '../../components/RefundControls';
import { extractContractErrorText } from '../../shared/contractStage';

interface OccurrenceFinanceDrawerProps {
  open: boolean;
  onClose: () => void;
  requestId: string;
  occurrence: ServiceRequestOccurrence | null;
  onChanged: () => void;
  onError: (message: string) => void;
}

export function OccurrenceFinanceDrawer({
  open,
  onClose,
  requestId,
  occurrence,
  onChanged,
  onError,
}: OccurrenceFinanceDrawerProps) {
  const { formatNumber, t } = useLocale();
  const [payoutRef, setPayoutRef] = useState('');
  const recordPayout = useRecordOccurrencePayout(requestId, occurrence?.id ?? '');

  if (!occurrence) return null;

  const isPaid = occurrence.paymentStatus === 'PAID';
  const totalPrice = occurrence.totalPrice;
  const feeVnd = totalPrice != null && totalPrice > 0 ? `${formatNumber(totalPrice)} ₫` : null;
  const invoice = occurrence.invoice;
  const payment = occurrence.payment;
  const payout = occurrence.payout;
  const canSettlePayout =
    isPaid &&
    !payout?.heldForRefund &&
    (!['PAID', 'SETTLED'].includes(payout?.status ?? occurrence.payoutStatus ?? '') ||
      Boolean(payout?.reference?.startsWith('AUTO-DISBURSE')) ||
      Boolean(occurrence.payoutReference?.startsWith('AUTO-DISBURSE')));

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: { xs: '100%', sm: 520 },
            p: 2.5,
            bgcolor: 'background.paper',
          },
        },
      }}
    >
      <Stack spacing={2}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {t('Occurrence')} {occurrence.occurrenceIndex} · {t('Service invoice')}
          </Typography>
          <IconButton size="small" onClick={onClose} aria-label="Close">
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Stack>
        <Divider />

        <Box
          sx={{
            p: 1.5,
            borderRadius: '8px',
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.default',
          }}
        >
          <Stack spacing={0.75}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
              {t('Service invoice')}: {feeVnd ?? t('Awaiting invoice snapshot')}
              {invoice?.vatRate != null ? ` · VAT ${invoice.vatRate}%` : ''}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {t('Service payment')}: {payment?.status ?? occurrence.paymentStatus ?? 'PENDING'}
              {payment?.method ? ` · ${payment.method}` : ''}
              {payment?.payosOrderCode ? ` · #${payment.payosOrderCode}` : ''}
            </Typography>
            {totalPrice != null && totalPrice > 0 && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {t('Revenue split')}: {t('Platform fee (15%)')}{' '}
                <strong>{formatNumber(Math.round(totalPrice * 0.15))} ₫</strong> ·{' '}
                {t('Inspector net payout (85%)')}{' '}
                <strong style={{ color: '#0284c7' }}>
                  {formatNumber(totalPrice - Math.round(totalPrice * 0.15))} ₫
                </strong>
              </Typography>
            )}
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {t('Inspector payout')}: {payout?.status ?? occurrence.payoutStatus ?? 'PENDING'}
              {payout?.reference ? ` · UNC: ${payout.reference}` : ''}
              {payout?.inspectorId ? ` · ${t('Inspector')} #${payout.inspectorId.slice(0, 8)}` : ''}
              {occurrence.remainingInspectorNetPayout != null
                ? ` · Còn phải chi: ${formatNumber(occurrence.remainingInspectorNetPayout)} ₫`
                : ''}
            </Typography>
          </Stack>
        </Box>

        {canSettlePayout && (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField
              size="small"
              placeholder="Nhập mã UNC ngân hàng thực tế (VD: UNC-VCB-20261110)"
              value={payoutRef}
              onChange={(e) => setPayoutRef(e.target.value)}
              sx={{ flex: 1 }}
            />
            <LoadingButton
              size="small"
              variant="contained"
              color="primary"
              loading={recordPayout.isPending}
              disabled={!payoutRef.trim()}
              onClick={async () => {
                try {
                  await recordPayout.mutateAsync({ payoutReference: payoutRef.trim() });
                  setPayoutRef('');
                  onChanged();
                } catch (err) {
                  onError(extractContractErrorText(err, 'Could not settle payout.'));
                }
              }}
              sx={{ textTransform: 'none', fontWeight: 600, whiteSpace: 'nowrap', boxShadow: 'none' }}
            >
              Tất toán thù lao Inspector
            </LoadingButton>
          </Stack>
        )}

        {isPaid && occurrence.paymentStatus === 'PAID' && (
          <RefundControls
            requestId={requestId}
            occurrence={occurrence}
            enabled
            onChanged={onChanged}
            onError={onError}
          />
        )}
      </Stack>
    </Drawer>
  );
}
