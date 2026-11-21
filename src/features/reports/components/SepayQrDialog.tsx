import { useMemo, useState } from 'react';
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
import QrCode2Rounded from '@mui/icons-material/QrCode2Rounded';
import type { SepayCheckoutDetails } from '@/features/inspections/api/inspectionApi';
import { useLocale } from '@/shared/i18n/LocaleProvider';

interface SepayQrDialogProps {
  details: SepayCheckoutDetails | undefined;
  amountVnd?: string | undefined;
  checking?: boolean;
  onCheckNow?: () => void;
  onClose: () => void;
}

interface ParsedBankInfo {
  bank: string | null;
  accountNumber: string | null;
  accountHolder: string | null;
}

function parseBankInfoFromQrUrl(url: string | null | undefined): ParsedBankInfo {
  if (!url) {
    return { bank: null, accountNumber: null, accountHolder: null };
  }
  try {
    const parsed = new URL(url);
    return {
      bank: parsed.searchParams.get('bank')?.trim() || null,
      accountNumber: parsed.searchParams.get('acc')?.trim() || null,
      accountHolder: parsed.searchParams.get('holder')?.trim() || null,
    };
  } catch {
    return { bank: null, accountNumber: null, accountHolder: null };
  }
}

/**
 * Shows the Sepay VietQR image and manual bank-transfer summary for a due occurrence.
 *
 * <p>Sepay notifies the server when the bank transfer arrives; keeping the transfer content
 * (`SDI<orderCode>`) unchanged allows automatic settlement.
 */
export function SepayQrDialog({
  details,
  amountVnd,
  checking = false,
  onCheckNow,
  onClose,
}: SepayQrDialogProps) {
  const { t } = useLocale();
  const [copiedKey, setCopiedKey] = useState<'account' | 'content' | null>(null);
  const [qrLoadError, setQrLoadError] = useState(false);

  const bankInfo = useMemo(
    () => parseBankInfoFromQrUrl(details?.checkoutUrl),
    [details?.checkoutUrl],
  );

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
      slotProps={{ paper: { sx: { borderRadius: '14px' } } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <QrCode2Rounded color="primary" fontSize="small" />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {t('Sepay VietQR payment')}
            </Typography>
          </Stack>
          <Chip
            size="small"
            icon={<HourglassTopRounded sx={{ fontSize: 14 }} />}
            label={t('Awaiting automatic confirmation')}
            color="primary"
            variant="outlined"
            sx={{ height: 24, fontSize: '0.7rem', fontWeight: 600 }}
          />
        </Stack>
      </DialogTitle>

      <DialogContent dividers sx={{ pt: 2 }}>
        <Stack spacing={2} sx={{ alignItems: 'center' }}>
          <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
            {t(
              'Scan this VietQR code with your banking app to transfer the service fee. Payment is confirmed automatically within a few minutes.',
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
                alt={t('Sepay VietQR payment')}
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
                    {t('Amount to pay')}
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'primary.main' }}>
                    {amountVnd}
                  </Typography>
                </Stack>
              )}

              {(bankInfo.bank || bankInfo.accountNumber || bankInfo.accountHolder) && (
                <Divider sx={{ borderStyle: 'dashed' }} />
              )}

              {bankInfo.bank && (
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    {t('Bank')}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {bankInfo.bank}
                  </Typography>
                </Stack>
              )}

              {bankInfo.accountNumber && (
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    {t('Account number')}
                  </Typography>
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 650 }}>
                      {bankInfo.accountNumber}
                    </Typography>
                    <Tooltip title={copiedKey === 'account' ? t('Copied') : t('Copy')}>
                      <IconButton
                        size="small"
                        aria-label={t('Account number')}
                        onClick={() => void copyText('account', bankInfo.accountNumber)}
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

              {bankInfo.accountHolder && (
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    {t('Account holder')}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {bankInfo.accountHolder}
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

          <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'center' }}>
            {copiedKey === 'content'
              ? t('Transfer content copied.')
              : t('Keep the transfer content unchanged so the payment can be matched.')}
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
            {checking ? t('Checking…') : t('Check payment status')}
          </Button>
        )}
        <Button onClick={onClose} variant="outlined" size="small" sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}>
          {t('Close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
