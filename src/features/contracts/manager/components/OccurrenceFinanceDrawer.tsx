import { useState } from 'react';
import {
  Alert,
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
  onError?: (message: string) => void;
}

export function OccurrenceFinanceDrawer({
  open,
  onClose,
  requestId,
  occurrence,
  onChanged,
}: OccurrenceFinanceDrawerProps) {
  const { formatNumber, t } = useLocale();
  const [payoutRef, setPayoutRef] = useState('');
  const [drawerError, setDrawerError] = useState('');
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

  const handleClose = () => {
    setDrawerError('');
    onClose();
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={handleClose}
      slotProps={{
        paper: {
          sx: {
            width: { xs: '100%', sm: 540 },
            p: { xs: 2, sm: 2.5 },
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
          <IconButton size="small" onClick={handleClose} aria-label={t('Close')}>
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Stack>
        <Divider />

        {drawerError && (
          <Alert severity="error" onClose={() => setDrawerError('')} sx={{ borderRadius: '8px' }}>
            {drawerError}
          </Alert>
        )}

        <Box
          sx={{
            p: 1.75,
            borderRadius: '8px',
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.default',
          }}
        >
          <Stack spacing={1} sx={{ fontVariantNumeric: 'tabular-nums' }}>
            <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
              {t('Service invoice')}:{' '}
              <Box component="span" sx={{ whiteSpace: 'nowrap' }}>
                {feeVnd ?? t('Awaiting invoice snapshot')}
              </Box>
              {invoice?.vatRate != null ? ` · VAT ${invoice.vatRate}%` : ''}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('Service payment')}: {payment?.status ?? occurrence.paymentStatus ?? 'PENDING'}
              {payment?.method ? ` · ${payment.method}` : ''}
              {payment?.payosOrderCode ? ` · #${payment.payosOrderCode}` : ''}
            </Typography>
            {totalPrice != null && totalPrice > 0 && (
              <Stack spacing={0.35}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {t('Platform fee (15%)')}:{' '}
                  <Box component="strong" sx={{ color: 'text.primary', whiteSpace: 'nowrap' }}>
                    {formatNumber(Math.round(totalPrice * 0.15))} ₫
                  </Box>
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {t('Inspector net payout (85%)')}:{' '}
                  <Box component="strong" sx={{ color: 'info.main', whiteSpace: 'nowrap' }}>
                    {formatNumber(totalPrice - Math.round(totalPrice * 0.15))} ₫
                  </Box>
                </Typography>
              </Stack>
            )}
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('Inspector payout')}: {payout?.status ?? occurrence.payoutStatus ?? 'PENDING'}
              {payout?.reference ? ` · UNC: ${payout.reference}` : ''}
              {payout?.inspectorId ? ` · ${t('Inspector')} #${payout.inspectorId.slice(0, 8)}` : ''}
            </Typography>
            {occurrence.remainingInspectorNetPayout != null && (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {t('Remaining to pay')}:{' '}
                <Box component="strong" sx={{ color: 'text.primary', whiteSpace: 'nowrap' }}>
                  {formatNumber(occurrence.remainingInspectorNetPayout)} ₫
                </Box>
              </Typography>
            )}
          </Stack>
        </Box>

        {canSettlePayout && (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField
              size="small"
              placeholder={t('Bank transfer reference (e.g. UNC-VCB-20261110)')}
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
                setDrawerError('');
                try {
                  await recordPayout.mutateAsync({ payoutReference: payoutRef.trim() });
                  setPayoutRef('');
                  onChanged();
                } catch (err) {
                  setDrawerError(extractContractErrorText(err, 'Could not settle payout.'));
                }
              }}
              sx={{ textTransform: 'none', fontWeight: 600, whiteSpace: 'nowrap', boxShadow: 'none' }}
            >
              {t('Settle Inspector payout')}
            </LoadingButton>
          </Stack>
        )}

        {isPaid && occurrence.paymentStatus === 'PAID' && (
          <RefundControls
            requestId={requestId}
            occurrence={occurrence}
            enabled
            onChanged={() => {
              setDrawerError('');
              onChanged();
            }}
            onError={setDrawerError}
          />
        )}
      </Stack>
    </Drawer>
  );
}
