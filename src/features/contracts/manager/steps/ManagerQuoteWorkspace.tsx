import { useState } from 'react';
import { Alert, Box, Button, Chip, Stack, TextField, Typography } from '@mui/material';
import ChatOutlinedIcon from '@mui/icons-material/ChatOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import type { IssueServiceQuoteInput, ServiceRequest } from '../../api/contractApi';
import { enumerateMonthlySchedule } from '../../api/recurrenceSchedule';
import { dateTimeInputToInstant, instantToDateTimeInput } from '../../api/scheduleTime';
import { useIssueServiceQuote } from '../../hooks/useContracts';
import { extractContractErrorText, resolveCurrentQuote } from '../../shared/contractStage';
import { QuoteTermsSummary } from '../../shared/QuoteTermsSummary';
import { RequestCheckpointsEditor } from '../components/RequestCheckpointsEditor';

interface ManagerQuoteWorkspaceProps {
  request: ServiceRequest;
  onChanged: () => void;
  onError: (message: string) => void;
  onOpenInbox: (requestId: string) => void;
}

/**
 * Accepts "11000000", "11,000,000" and the Vietnamese "11.000.000" grouping so a Manager typing
 * the local convention is not rejected. Returns null when the value is not a usable amount.
 */
function parsePriceInput(raw: string): number | null {
  const trimmed = raw.trim().replace(/\s/g, '');
  if (!trimmed) return null;
  const dotGroups = /^\d{1,3}(\.\d{3})+$/.test(trimmed);
  const commaGroups = /^\d{1,3}(,\d{3})+$/.test(trimmed);
  const normalized = dotGroups
    ? trimmed.replaceAll('.', '')
    : commaGroups
      ? trimmed.replaceAll(',', '')
      : trimmed.replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}

/**
 * Step 2 of the Manager flow: prepare the commercial quote (scope, schedule, price).
 *
 * The Inspector and drone are deliberately not selected here. Dispatch assigns the partner pair in
 * step 4, and the Inspector confirms the schedule before the flight is locked in.
 */
export function ManagerQuoteWorkspace({
  request,
  onChanged,
  onError,
  onOpenInbox,
}: ManagerQuoteWorkspaceProps) {
  const { locale, t } = useLocale();

  const currentQuote = resolveCurrentQuote(request);
  const save = useIssueServiceQuote(request.id);

  const [scope, setScope] = useState(currentQuote?.scopeSnapshot ?? request.description);
  const [start, setStart] = useState(() =>
    currentQuote
      ? instantToDateTimeInput(currentQuote.firstOccurrenceStartAt, request.timezone)
      : `${request.requestedFrom}T08:00`,
  );
  const [end, setEnd] = useState(() =>
    currentQuote
      ? instantToDateTimeInput(currentQuote.firstOccurrenceEndAt, request.timezone)
      : `${request.requestedFrom}T10:00`,
  );
  const [price, setPrice] = useState(() =>
    currentQuote
      ? String(currentQuote.pricePerOccurrenceVnd ?? currentQuote.pricePerOccurrenceUsd ?? '')
      : '',
  );
  // A saved quote waits for the customer. The editable form only opens when the Manager
  // explicitly starts a revision, so the default view answers "what happens next?".
  const [quoteEditing, setQuoteEditing] = useState(false);

  // The Manager may move the first visit later; recurring previews follow the proposed date.
  const proposedStartDate = start.slice(0, 10) || request.requestedFrom;
  const recurringDates =
    request.requestType === 'RECURRING'
      ? enumerateMonthlySchedule(proposedStartDate, request.recurrenceInterval ?? 1, {
          ...(request.occurrenceCount != null
            ? { count: request.occurrenceCount }
            : { endDate: request.recurrenceEndDate ?? request.requestedUntil }),
          maxOccurrences: 100,
        })
      : [];
  const customerEndDate = request.recurrenceEndDate ?? request.requestedUntil;
  const proposedDateChanged =
    Boolean(proposedStartDate) && proposedStartDate !== request.requestedFrom;
  const dateLabelOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  const proposedDateLabel = new Date(`${proposedStartDate}T12:00:00`).toLocaleDateString(
    locale === 'vi' ? 'vi-VN' : 'en-US',
    dateLabelOptions,
  );
  const requestedDateLabel = new Date(`${request.requestedFrom}T12:00:00`).toLocaleDateString(
    locale === 'vi' ? 'vi-VN' : 'en-US',
    dateLabelOptions,
  );

  const handleStartChange = (value: string) => {
    const previousDate = start.slice(0, 10);
    setStart(value);
    if (value && end.slice(0, 10) === previousDate) {
      setEnd(`${value.slice(0, 10)}T${end.slice(11)}`);
    }
  };

  const saveQuote = async () => {
    if (!scope.trim()) {
      onError(t('Enter the quoted inspection scope.'));
      return;
    }
    const amount = parsePriceInput(price);
    if (amount === null || amount <= 0) {
      onError(t('Enter a positive price with no more than two decimal places.'));
      return;
    }
    try {
      const startAt = dateTimeInputToInstant(start, request.timezone);
      const endAt = dateTimeInputToInstant(end, request.timezone);
      if (Date.parse(endAt) <= Date.parse(startAt)) {
        onError(t('The proposed occurrence end must be after its start.'));
        return;
      }
      const firstDate = start.slice(0, 10);
      const lastDate = end.slice(0, 10);
      if (firstDate < request.requestedFrom) {
        onError(t('The first inspection cannot be earlier than the customer-requested date.'));
        return;
      }
      if (lastDate !== firstDate) {
        onError(t('The first occurrence must start and end on the same day.'));
        return;
      }
      if (request.requestType === 'RECURRING' && request.occurrenceCount == null) {
        if (
          firstDate > customerEndDate ||
          recurringDates.length < 2 ||
          (recurringDates.at(-1) ?? firstDate) > customerEndDate
        ) {
          onError(
            t(
              'The revised schedule must keep at least two occurrences on or before the customer-selected end date.',
            ),
          );
          return;
        }
      }
      await save.mutateAsync({
        scopeSnapshot: scope.trim(),
        firstOccurrenceStartAt: startAt,
        firstOccurrenceEndAt: endAt,
        pricePerOccurrenceVnd: amount,
        requiredDroneFeatureCodes: [],
      } satisfies IssueServiceQuoteInput);
      setQuoteEditing(false);
      onChanged();
    } catch (error) {
      onError(extractContractErrorText(error, 'Unable to save quote.'));
    }
  };

  // A saved quote is locked: the Manager must click "Edit quote" to unlock the form again.
  const showQuoteForm = currentQuote === null || quoteEditing;

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
        direction={{ xs: 'column', sm: 'row' }}
        sx={{
          alignItems: { sm: 'center' },
          justifyContent: 'space-between',
          gap: { xs: 1, sm: 1.5 },
          p: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
          <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>
            {currentQuote ? t('Current quote') : t('Request review')}
          </Typography>
          {currentQuote && (
            <Chip size="small" label={t('Current terms')} sx={{ borderRadius: '6px' }} />
          )}
        </Stack>
        <Button
          size="small"
          variant="outlined"
          startIcon={<ChatOutlinedIcon fontSize="small" />}
          onClick={() => onOpenInbox(request.id)}
          sx={{
            borderRadius: '8px',
            textTransform: 'none',
            fontWeight: 600,
            alignSelf: { xs: 'flex-start', sm: 'center' },
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          {t('Messages')}
        </Button>
      </Stack>

      <Box sx={{ p: 2 }}>
        <Stack spacing={2}>
          <RequestCheckpointsEditor
            request={request}
            onChanged={onChanged}
            onError={onError}
          />
          {currentQuote && !quoteEditing && <QuoteTermsSummary request={request} quote={currentQuote} />}

          {currentQuote && !quoteEditing && (
            <Box
              sx={{
                p: 2,
                borderRadius: '8px',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.default',
              }}
            >
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
              >
                <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0 }}>
                  <TaskAltOutlinedIcon fontSize="small" sx={{ color: 'success.main' }} />
                  <Typography variant="body2" color="text.secondary">
                    {t('Quote saved · waiting for customer review')}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<EditOutlinedIcon fontSize="small" />}
                    onClick={() => setQuoteEditing(true)}
                    sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 700 }}
                  >
                    {t('Edit quote')}
                  </Button>
                </Stack>
              </Stack>
            </Box>
          )}

          {showQuoteForm && (
            <Stack spacing={1.5}>
              {currentQuote && (
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {t('Edit current quote')}
                </Typography>
              )}

              <TextField
                label={t('Quoted scope')}
                multiline
                minRows={2}
                size="small"
                value={scope}
                onChange={(event) => setScope(event.target.value)}
              />

              {proposedDateChanged && (
                <Alert severity="info">
                  {locale === 'vi'
                    ? `Bạn đang dời ngày kiểm tra đầu tiên từ ${requestedDateLabel} sang ${proposedDateLabel}. Khách hàng phải chấp nhận báo giá cập nhật.`
                    : `Moving the first inspection from ${requestedDateLabel} to ${proposedDateLabel}. The Customer must accept the updated quote.`}
                </Alert>
              )}

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  fullWidth
                  label={t('First occurrence start')}
                  type="datetime-local"
                  size="small"
                  value={start}
                  onChange={(event) => handleStartChange(event.target.value)}
                  slotProps={{
                    inputLabel: { shrink: true },
                    htmlInput: {
                      min: `${request.requestedFrom}T${request.windowStart}`,
                      max:
                        request.requestType === 'RECURRING' && request.occurrenceCount == null
                          ? `${customerEndDate}T${request.windowEnd}`
                          : undefined,
                    },
                  }}
                />
                <TextField
                  fullWidth
                  label={t('First occurrence end')}
                  type="datetime-local"
                  size="small"
                  value={end}
                  onChange={(event) => setEnd(event.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Stack>

              <TextField
                label={locale === 'vi' ? 'Đơn giá mỗi đợt bay (VND)' : 'Price per occurrence (VND)'}
                placeholder={locale === 'vi' ? 'Ví dụ: 11000000' : 'e.g. 11000000'}
                size="small"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                helperText={t(
                  'You may move the first inspection later. The Customer must accept the revised quote before it takes effect.',
                )}
                slotProps={{
                  htmlInput: { inputMode: 'decimal', spellCheck: false, 'data-lpignore': 'true' },
                }}
              />

              {request.requestType === 'RECURRING' && recurringDates.length > 0 && (
                <Box
                  sx={{
                    p: 1.25,
                    bgcolor: 'background.default',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: '8px',
                  }}
                >
                  <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, mb: 0.5 }}>
                    {t('Planned occurrence dates')} · {recurringDates.length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {recurringDates
                      .slice(0, 4)
                      .map((date) =>
                        new Date(`${date}T12:00:00`).toLocaleDateString(
                          locale === 'vi' ? 'vi-VN' : 'en-US',
                          { timeZone: 'UTC' },
                        ),
                      )
                      .join(' · ')}
                    {recurringDates.length > 4 ? ' … ' : ''}
                    {recurringDates.length > 4 &&
                      new Date(`${recurringDates.at(-1)}T12:00:00`).toLocaleDateString(
                        locale === 'vi' ? 'vi-VN' : 'en-US',
                        { timeZone: 'UTC' },
                      )}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mt: 0.5, fontWeight: 600 }}
                  >
                    {(parsePriceInput(price) ?? 0).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US')}{' '}
                    VND × {recurringDates.length} ={' '}
                    {((parsePriceInput(price) ?? 0) * recurringDates.length).toLocaleString(
                      locale === 'vi' ? 'vi-VN' : 'en-US',
                    )}{' '}
                    VND
                  </Typography>
                </Box>
              )}

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
                <LoadingButton
                  loading={save.isPending}
                  variant="contained"
                  onClick={() => void saveQuote()}
                  sx={{
                    borderRadius: '8px',
                    fontWeight: 700,
                    textTransform: 'none',
                    boxShadow: 'none',
                  }}
                >
                  {currentQuote ? t('Save quote changes') : t('Save quote')}
                </LoadingButton>
                {currentQuote && (
                  <Button
                    size="small"
                    variant="text"
                    disabled={save.isPending}
                    onClick={() => setQuoteEditing(false)}
                    sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
                  >
                    {t('Cancel editing')}
                  </Button>
                )}
              </Stack>
            </Stack>
          )}
        </Stack>
      </Box>
    </Box>
  );
}
