import { useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
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
import CloseRounded from '@mui/icons-material/CloseRounded';
import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded';
import RefreshRounded from '@mui/icons-material/RefreshRounded';
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
  const { formatNumber, t } = useLocale();
  const [copiedKey, setCopiedKey] = useState<'account' | 'content' | null>(null);
  const [qrLoadError, setQrLoadError] = useState(false);

  const formattedBank = bankName ? formatVietQrBankDisplay(bankName) : null;
  const resolvedAmount =
    details?.amount != null && Number.isFinite(details.amount)
      ? `${
          typeof formatNumber === 'function'
            ? formatNumber(Math.round(details.amount))
            : new Intl.NumberFormat('en-US').format(Math.round(details.amount))
        } ₫`
      : amountVnd;
  const recipientName = bankAccountHolder?.trim() || inspectorName?.trim() || null;

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
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: '16px',
            boxShadow: 'none',
            border: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden',
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          px: 3,
          py: 1.75,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0 }}>
          <SepayVietQrLogoMark />
          <Divider orientation="vertical" flexItem sx={{ height: 18, alignSelf: 'center' }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700, letterSpacing: '-0.01em' }} noWrap>
            {t('Inspector payout VietQR')}
          </Typography>
        </Stack>
        <IconButton
          size="small"
          aria-label={t('Close')}
          onClick={onClose}
          sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
        >
          <CloseRounded fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 3, py: 2.5 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '212px minmax(0, 1fr)' },
            gap: 3,
            alignItems: 'center',
          }}
        >
          {/* Left column: single crisp QR surface */}
          <Stack spacing={1} sx={{ alignItems: 'center' }}>
            {details?.checkoutUrl && !qrLoadError ? (
              <Box
                sx={{
                  p: 1.25,
                  borderRadius: '12px',
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: '#FFFFFF',
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
                    width: 188,
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
                  minHeight: 188,
                  p: 2,
                  borderRadius: '12px',
                  border: '1px dashed',
                  borderColor: 'divider',
                  bgcolor: 'background.default',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  {t('QR image unavailable. Use the bank details below to transfer manually.')}
                </Typography>
              </Box>
            )}
            <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
              {t('Scan with banking app')}
            </Typography>
          </Stack>

          {/* Right column: clean border-separated transfer specification */}
          <Stack spacing={1.75} sx={{ minWidth: 0, fontVariantNumeric: 'tabular-nums' }}>
            {resolvedAmount && (
              <Box sx={{ pb: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
                  {t('Transfer amount')}
                </Typography>
                <Typography
                  variant="h5"
                  sx={{
                    fontSize: '1.625rem',
                    lineHeight: 1.2,
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    color: 'text.primary',
                  }}
                >
                  {resolvedAmount}
                </Typography>
              </Box>
            )}

            <Stack spacing={1}>
              {formattedBank && (
                <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    {t('Bank')}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>
                    {formattedBank}
                  </Typography>
                </Stack>
              )}

              {bankAccountNumber && (
                <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
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
                        sx={{ p: 0.35, color: 'text.secondary' }}
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

              {recipientName && (
                <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    {t('Account holder')}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>
                    {recipientName}
                  </Typography>
                </Stack>
              )}
            </Stack>

            {details?.qrCode && (
              <Box
                sx={{
                  px: 1.5,
                  py: 1,
                  borderRadius: '8px',
                  bgcolor: 'action.hover',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1.5,
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>
                    {t('Transfer content')}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ fontFamily: 'monospace', fontWeight: 700, color: 'primary.main', mt: 0.25 }}
                    noWrap
                  >
                    {details.qrCode}
                  </Typography>
                </Box>
                <Tooltip title={copiedKey === 'content' ? t('Copied') : t('Copy')}>
                  <IconButton
                    size="small"
                    aria-label={t('Transfer content')}
                    onClick={() => void copyText('content', details.qrCode)}
                    sx={{ p: 0.5, color: 'text.secondary', flexShrink: 0 }}
                  >
                    {copiedKey === 'content' ? (
                      <CheckRounded sx={{ fontSize: 16, color: 'success.main' }} />
                    ) : (
                      <ContentCopyRounded sx={{ fontSize: 15 }} />
                    )}
                  </IconButton>
                </Tooltip>
              </Box>
            )}

            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.45 }}>
              {t('Keep the transfer content unchanged for automatic confirmation.')}
            </Typography>
          </Stack>
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          py: 1.5,
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.default',
          justifyContent: 'space-between',
          gap: 1.5,
          flexWrap: 'wrap',
        }}
      >
        <Stack
          direction="row"
          spacing={1}
          role="status"
          aria-live="polite"
          sx={{ alignItems: 'center', minWidth: 0 }}
        >
          {checking ? (
            <CircularProgress size={12} thickness={5} />
          ) : (
            <Box
              aria-hidden="true"
              sx={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                bgcolor: copiedKey === 'content' ? 'success.main' : 'primary.main',
                flexShrink: 0,
              }}
            />
          )}
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
            {checking
              ? t('Checking…')
              : copiedKey === 'content'
                ? t('Transfer content copied.')
                : t('Awaiting SePay confirmation')}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          {onCheckNow && (
            <Button
              onClick={onCheckNow}
              disabled={checking}
              size="small"
              startIcon={<RefreshRounded sx={{ fontSize: 15 }} />}
              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px', color: 'text.secondary' }}
            >
              {checking ? t('Checking…') : t('Check payout status')}
            </Button>
          )}
          <Button
            onClick={onClose}
            variant="outlined"
            color="inherit"
            size="small"
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px', borderColor: 'divider' }}
          >
            {t('Close')}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
