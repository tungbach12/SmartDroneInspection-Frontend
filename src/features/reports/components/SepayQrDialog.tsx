import { useState } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded';
import type { SepayCheckoutDetails } from '@/features/inspections/api/inspectionApi';
import { useLocale } from '@/shared/i18n/LocaleProvider';

interface SepayQrDialogProps {
  details: SepayCheckoutDetails | undefined;
  amountVnd?: string | undefined;
  onClose: () => void;
}

/**
 * Shows the Sepay VietQR image for a due occurrence.
 *
 * <p>Sepay is a bank-transfer notification service, not a hosted checkout page. The server returns a
 * VietQR image URL plus the `SDI<orderCode>` transfer content; the customer scans the code and the
 * Sepay webhook settles the payment automatically once the bank transfer arrives.
 */
export function SepayQrDialog({ details, amountVnd, onClose }: SepayQrDialogProps) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);

  const copyContent = async () => {
    if (!details?.qrCode) {
      return;
    }
    try {
      await navigator.clipboard.writeText(details.qrCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Dialog open={Boolean(details)} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{t('Sepay VietQR payment')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ alignItems: 'center' }}>
          <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
            {t(
              'Scan this VietQR code with your banking app to transfer the service fee. Payment is confirmed automatically within a few minutes.',
            )}
          </Typography>
          {details?.checkoutUrl ? (
            <Box
              component="img"
              src={details.checkoutUrl}
              alt={t('Sepay VietQR payment')}
              sx={{
                width: '100%',
                maxWidth: 280,
                borderRadius: '8px',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
              }}
            />
          ) : null}
          {amountVnd ? (
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {amountVnd}
            </Typography>
          ) : null}
          {details?.qrCode ? (
            <Stack
              direction="row"
              spacing={1}
              onClick={() => void copyContent()}
              sx={{
                alignItems: 'center',
                cursor: 'pointer',
                px: 1.5,
                py: 0.75,
                borderRadius: '6px',
                bgcolor: 'action.hover',
              }}
            >
              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                {details.qrCode}
              </Typography>
              <ContentCopyRounded sx={{ fontSize: 16, color: 'text.secondary' }} />
            </Stack>
          ) : null}
          <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'center' }}>
            {copied
              ? t('Transfer content copied.')
              : t('Keep the transfer content unchanged so the payment can be matched.')}
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none', fontWeight: 600 }}>
          {t('Close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
