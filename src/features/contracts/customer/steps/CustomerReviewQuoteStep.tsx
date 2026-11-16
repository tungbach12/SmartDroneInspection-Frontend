import { useState } from 'react';
import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import ChatOutlinedIcon from '@mui/icons-material/ChatOutlined';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import type { ServiceRequest } from '../../api/contractApi';
import { useAcceptServiceQuote } from '../../hooks/useContracts';
import { extractContractErrorText, formatVndPerOccurrence } from '../../shared/contractStage';
import { QuoteTermsSummary } from '../../shared/QuoteTermsSummary';

interface CustomerReviewQuoteStepProps {
  request: ServiceRequest;
  quote: NonNullable<ServiceRequest['currentQuote']>;
  onChanged: () => void;
  onError: (message: string) => void;
  onOpenInbox: (requestId: string) => void;
}

export function CustomerReviewQuoteStep({
  request,
  quote,
  onChanged,
  onError,
  onOpenInbox,
}: CustomerReviewQuoteStepProps) {
  const { locale, t } = useLocale();
  const accept = useAcceptServiceQuote(request.id);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const acceptCurrent = async () => {
    try {
      await accept.mutateAsync(quote.rowVersion);
      setConfirmOpen(false);
      onChanged();
    } catch (error) {
      onError(extractContractErrorText(error, 'Unable to accept quote.'));
    }
  };

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '10px',
        bgcolor: 'background.paper',
        overflow: 'hidden',
      }}
    >
      <Stack
        direction="row"
        sx={{
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          p: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>
          {t('Current quote')}
        </Typography>
        <Chip size="small" label={t('Current terms')} sx={{ borderRadius: '6px' }} />
      </Stack>

      <Box sx={{ p: 2 }}>
        <Stack spacing={2}>
          <QuoteTermsSummary request={request} quote={quote} />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
            <LoadingButton
              loading={accept.isPending}
              variant="contained"
              color="success"
              onClick={() => setConfirmOpen(true)}
              sx={{ borderRadius: '8px', fontWeight: 700, textTransform: 'none', boxShadow: 'none' }}
            >
              {t('Accept quote')}
            </LoadingButton>
            <Button
              variant="outlined"
              startIcon={<ChatOutlinedIcon fontSize="small" />}
              onClick={() => onOpenInbox(request.id)}
              sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
            >
              {t('Request a price review in Messages')}
            </Button>
          </Stack>
        </Stack>
      </Box>

      <ConfirmDialog
        open={confirmOpen}
        title={t('Confirm Quote Acceptance')}
        message={
          locale === 'vi'
            ? `Bạn xác nhận chấp nhận báo giá hiện tại (${formatVndPerOccurrence(quote.pricePerOccurrenceVnd ?? quote.pricePerOccurrenceUsd, locale)})? Sau khi chấp nhận, điều khoản sẽ bị khóa. Nếu cần yêu cầu xem xét lại giá, hãy nhắn Quản lý trước khi chấp nhận. Tiếp theo hai bên ký hợp đồng giấy.`
            : `Accept the current quote (${formatVndPerOccurrence(quote.pricePerOccurrenceVnd ?? quote.pricePerOccurrenceUsd, locale)})? Terms will lock after acceptance. If you need a price review, message the Manager before accepting. Next, both parties sign the paper contract.`
        }
        confirmLabel={t('Accept quote')}
        loading={accept.isPending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void acceptCurrent()}
      />
    </Box>
  );
}
