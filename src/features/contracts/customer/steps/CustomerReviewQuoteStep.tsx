import { useState } from 'react';
import { Alert, Box, Button, Chip, Stack, Typography } from '@mui/material';
import ChatOutlinedIcon from '@mui/icons-material/ChatOutlined';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import type { ServiceRequest } from '../../api/contractApi';
import { enumerateMonthlySchedule } from '../../api/recurrenceSchedule';
import { instantToLocalDate } from '../../api/scheduleTime';
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

  const unitPrice = Number(quote.pricePerOccurrenceVnd ?? quote.pricePerOccurrenceUsd ?? 0);
  const quotedFirstDate = instantToLocalDate(quote.firstOccurrenceStartAt, request.timezone);
  const recurringDates =
    request.requestType === 'RECURRING'
      ? enumerateMonthlySchedule(quotedFirstDate, request.recurrenceInterval ?? 1, {
          ...(request.occurrenceCount != null
            ? { count: request.occurrenceCount }
            : { endDate: request.recurrenceEndDate ?? request.requestedUntil }),
          maxOccurrences: 100,
        })
      : [];
  const dateChanged = quotedFirstDate !== request.requestedFrom;
  const dateLabelOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  const requestedDateLabel = new Date(`${request.requestedFrom}T12:00:00`).toLocaleDateString(
    locale === 'vi' ? 'vi-VN' : 'en-US',
    dateLabelOptions,
  );
  const quotedDateLabel = new Date(`${quotedFirstDate}T12:00:00`).toLocaleDateString(
    locale === 'vi' ? 'vi-VN' : 'en-US',
    dateLabelOptions,
  );
  const occurrenceTotal = request.requestType === 'RECURRING' ? recurringDates.length : 1;
  const totalContractVnd = unitPrice * occurrenceTotal;
  const formattedTotal = totalContractVnd.toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US');
  const priceSummaryText =
    occurrenceTotal > 1
      ? `${formatVndPerOccurrence(unitPrice, locale)} · ${occurrenceTotal} ${
          locale === 'vi' ? 'đợt' : 'occurrences'
        } = ${formattedTotal} VND`
      : formatVndPerOccurrence(unitPrice, locale);

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
          {dateChanged && (
            <Alert severity="info">
              {locale === 'vi'
                ? `Quản lý đề xuất ngày kiểm tra đầu tiên là ${quotedDateLabel} thay vì ngày bạn yêu cầu (${requestedDateLabel}). Chấp nhận báo giá này cũng là xác nhận ngày mới.`
                : `The Manager proposed ${quotedDateLabel} as the first inspection date instead of your requested ${requestedDateLabel}. Accepting this quote also confirms the new date.`}
            </Alert>
          )}
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
              {t('Messages')}
            </Button>
          </Stack>
        </Stack>
      </Box>

      <ConfirmDialog
        open={confirmOpen}
        title={t('Confirm Quote Acceptance')}
        message={
          locale === 'vi'
            ? `Bạn xác nhận chấp nhận báo giá hiện tại (${priceSummaryText})? Sau khi chấp nhận, điều khoản sẽ bị khóa. Nếu cần yêu cầu xem xét lại giá, hãy nhắn Quản lý trước khi chấp nhận. Tiếp theo hai bên ký hợp đồng giấy.`
            : `Accept the current quote (${priceSummaryText})? Terms will lock after acceptance. If you need a price review, message the Manager before accepting. Next, both parties sign the paper contract.`
        }
        confirmLabel={t('Accept quote')}
        loading={accept.isPending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void acceptCurrent()}
      />
    </Box>
  );
}
