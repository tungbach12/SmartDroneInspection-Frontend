import { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import CheckRounded from '@mui/icons-material/CheckRounded';
import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded';
import HourglassTopRounded from '@mui/icons-material/HourglassTopRounded';
import type { SepayCheckoutDetails } from '@/features/inspections/api/inspectionApi';
import { formatVietQrBankDisplay } from '@/shared/constants/vietQrBanks';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { SepayVietQrLogoMark } from '@/shared/ui/PaymentBrandLogos';

export interface SepayPayoutQrDialogProps {
  details: SepayCheckoutDetails | undefined;
  amountVnd?: string | undefined;
  inspectorName?: string | null | undefined;
  bankName?: string | null | undefined;
  bankAccountNumber?: string | null | undefined;
  bankAccountHolder?: string | null | undefined;
  checking?: boolean;
  onCheckNow?: () => void;
  onClose: () => void;
}

/**
 * Displays the SePay VietQR code targeting the assigned Inspector's bank account.
 *
 * Outgoing bank transfers containing `SDIPAY<payoutOrderCode>` are matched automatically via
 * SePay webhook (`transferType: "out"`), settling the Inspector payout without manual UNC input.
 */
export function SepayPayoutQrDialog({
  details,
  amountVnd,
  inspectorName,
  bankName,
  bankAccountNumber,
  bankAccountHolder,
  checking = false,
  onCheckNow,
  onClose,
}: SepayPayoutQrDialogProps) {
  const { t } = useLocale();
  const [copiedKey, setCopiedKey] = useState<'account' | 'content' | null>(null);
  const [qrLoadError, setQrLoadError] = useState(false);

  const formattedBank = bankName ? formatVietQrBankDisplay(bankName) : null;

  const copyText = async (key: 'account' | 'content', value: string | null | undefined) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 2000);
    } catch {
      setCopiedKey(null);
    }
  };

  return (
    <Dialog
      open={Boolean(details)}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: '16px' } } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <SepayVietQrLogoMark />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {t('Inspector payout VietQR')}
            </Typography>
          </Stack>
          <Chip
            size="small"
            icon={<HourglassTopRounded sx={{ fontSize: 14 }} />}
            label={t('Awaiting SePay confirmation')}
            color="primary"
            variant="outlined"
            sx={{ height: 24, fontSize: '0.75rem', fontWeight: 600 }}
          />
        </Stack>
      </DialogTitle>

      <DialogContent dividers sx={{ pt: 2 }}>
        <Stack spacing={2} sx={{ alignItems: 'center' }}>
          <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
            {t(
              'Scan this VietQR code with the company banking app to transfer the net payout to the Inspector. Payout settles automatically once SePay confirms the outgoing transfer.',
            )}
          </Typography>

          {details?.checkoutUrl && !qrLoadError ? (
            <Box
              sx={{
                p: 1.5,
                borderRadius: '12px',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: '#ffffff',
                display: 'inline-flex',
                justifyContent: 'center',
              }}
            >
              <Box
                component="img"
                src={details.checkoutUrl}
                alt={t('VietQR code for Inspector payout')}
                onError={() => setQrLoadError(true)}
                sx={{
                  width: 224,
                  height: 'auto',
                  display: 'block',
                  borderRadius: '6px',
                }}
              />
            </Box>
          ) : (
            <Box
              sx={{
                width: '100%',
                p: 1.5,
                borderRadius: '8px',
                bgcolor: 'action.hover',
                textAlign: 'center',
              }}
            >
              <Typography variant="caption" color="text.secondary">
                {t('QR image unavailable. Use the bank details below to transfer manually.')}
              </Typography>
            </Box>
          )}

          <Box
            sx={{
              width: '100%',
              p: 1.5,
              borderRadius: '10px',
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.default',
            }}
          >
            <Stack spacing={0.85} sx={{ fontVariantNumeric: 'tabular-nums' }}>
              {amountVnd && (
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <Typography variant="caption" color="text.secondary">
                    {t('Inspector net payout')}
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'primary.main' }}>
                    {amountVnd}
                  </Typography>
                </Stack>
              )}

              {(inspectorName || formattedBank || bankAccountNumber || bankAccountHolder) && (
                <Divider sx={{ borderStyle: 'dashed' }} />
              )}

              {inspectorName && (
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    {t('Inspector')}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {inspectorName}
                  </Typography>
                </Stack>
              )}

              {formattedBank && (
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    {t('Bank')}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {formattedBank}
                  </Typography>
                </Stack>
              )}

              {bankAccountNumber && (
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    {t('Account number')}
                  </Typography>
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 650 }}>
                      {bankAccountNumber}
                    </Typography>
                    <Tooltip title={copiedKey === 'account' ? t('Copied') : t('Copy')}>
                      <IconButton
                        size="small"
                        aria-label={t('Account number')}
                        onClick={() => void copyText('account', bankAccountNumber)}
                        sx={{ p: 0.35 }}
                      >
                        {copiedKey === 'account' ? (
                          <CheckRounded sx={{ fontSize: 15, color: 'success.main' }} />
                        ) : (
                          <ContentCopyRounded sx={{ fontSize: 14 }} />
                        )}
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Stack>
              )}

              {bankAccountHolder && (
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    {t('Account holder')}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {bankAccountHolder}
                  </Typography>
                </Stack>
              )}

              {details?.qrCode && (
                <>
                  <Divider sx={{ borderStyle: 'dashed' }} />
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      {t('Transfer content')}
                    </Typography>
                    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                      <Typography
                        variant="body2"
                        sx={{ fontFamily: 'monospace', fontWeight: 700, color: 'primary.main' }}
                      >
                        {details.qrCode}
                      </Typography>
                      <Tooltip title={copiedKey === 'content' ? t('Copied') : t('Copy')}>
                        <IconButton
                          size="small"
                          aria-label={t('Transfer content')}
                          onClick={() => void copyText('content', details.qrCode)}
                          sx={{ p: 0.35 }}
                        >
                          {copiedKey === 'content' ? (
                            <CheckRounded sx={{ fontSize: 15, color: 'success.main' }} />
                          ) : (
                            <ContentCopyRounded sx={{ fontSize: 14 }} />
                          )}
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>
                </>
              )}
            </Stack>
          </Box>

          <Typography
            component="p"
            role="status"
            aria-live="polite"
            variant="caption"
            sx={{ color: 'text.secondary', textAlign: 'center', m: 0 }}
          >
            {checking
              ? t('Checking…')
              : copiedKey === 'content'
                ? t('Transfer content copied.')
                : t('Keep the transfer content unchanged so SePay can match this payout automatically.')}
          </Typography>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.5, justifyContent: onCheckNow ? 'space-between' : 'flex-end' }}>
        {onCheckNow && (
          <Button
            onClick={onCheckNow}
            disabled={checking}
            size="small"
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
          >
            {checking ? t('Checking…') : t('Check payout status')}
          </Button>
        )}
        <Button onClick={onClose} variant="outlined" size="small" sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}>
          {t('Close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
