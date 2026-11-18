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
import { useIssueServiceQuote, usePartnerCapabilities } from '../../hooks/useContracts';
import { extractContractErrorText, resolveCurrentQuote } from '../../shared/contractStage';
import { QuoteTermsSummary } from '../../shared/QuoteTermsSummary';

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
  const capabilitiesQuery = usePartnerCapabilities();
  const activeCapabilities = (capabilitiesQuery.data ?? []).filter((cap) => cap.isActive);

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
  const [requiredCapabilities, setRequiredCapabilities] = useState<string[]>(
    currentQuote?.requiredDroneFeatureCodes ?? [],
  );
  // A saved quote waits for the customer. The editable form only opens when the Manager
  // explicitly starts a revision, so the default view answers "what happens next?".
  const [quoteEditing, setQuoteEditing] = useState(false);
  const [price, setPrice] = useState(() =>
    currentQuote
      ? String(currentQuote.pricePerOccurrenceVnd ?? currentQuote.pricePerOccurrenceUsd ?? '')
      : '',
  );

  const toggleCapability = (code: string) => {
    setRequiredCapabilities((prev) =>
      prev.includes(code) ? prev.filter((item) => item !== code) : [...prev, code],
    );
  };

  const recurringDates =
    request.requestType === 'RECURRING'
      ? enumerateMonthlySchedule(request.requestedFrom, request.recurrenceInterval ?? 1, {
          ...(request.occurrenceCount != null
            ? { count: request.occurrenceCount }
            : { endDate: request.recurrenceEndDate ?? request.requestedUntil }),
          maxOccurrences: 100,
        })
      : [];
  const scheduleEndDate = recurringDates.at(-1) ?? request.requestedUntil;

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
      const scheduleEnd =
        request.requestType === 'RECURRING' ? scheduleEndDate : request.requestedUntil;
      if (
        lastDate > scheduleEnd ||
        (request.requestType === 'ONE_TIME' &&
          (firstDate !== request.requestedFrom || lastDate !== request.requestedFrom)) ||
        (request.requestType === 'RECURRING' && firstDate !== request.requestedFrom)
      ) {
        onError(
          request.requestType === 'ONE_TIME'
            ? t('One-time service must remain on the customer-selected date.')
            : t(
                'The first occurrence must match the customer-requested date, and the quote must remain inside the requested schedule.',
              ),
        );
        return;
      }
      await save.mutateAsync({
        scopeSnapshot: scope.trim(),
        firstOccurrenceStartAt: startAt,
        firstOccurrenceEndAt: endAt,
        pricePerOccurrenceVnd: amount,
        requiredDroneFeatureCodes: [...requiredCapabilities],
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

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  fullWidth
                  label={t('First occurrence start')}
                  type="datetime-local"
                  size="small"
                  value={start}
                  onChange={(event) => setStart(event.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
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
                helperText={
                  request.requestType === 'ONE_TIME'
                    ? t('The customer-selected date cannot be changed for a one-time request.')
                    : t(
                        'The first scheduled occurrence is used as the anchor for the recurring schedule.',
                      )
                }
                slotProps={{
                  htmlInput: { inputMode: 'decimal', spellCheck: false, 'data-lpignore': 'true' },
                }}
              />

              {activeCapabilities.length > 0 && (
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', fontWeight: 700, mb: 0.75 }}
                  >
                    {t('Required drone capabilities (optional)')}
                  </Typography>
                  <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.75 }}>
                    {activeCapabilities.map((cap) => {
                      const selected = requiredCapabilities.includes(cap.code);
                      return (
                        <Chip
                          key={cap.code}
                          size="small"
                          clickable
                          onClick={() => toggleCapability(cap.code)}
                          label={locale === 'vi' ? cap.nameVi : cap.nameEn}
                          color={selected ? 'primary' : 'default'}
                          variant={selected ? 'filled' : 'outlined'}
                          aria-pressed={selected}
                          sx={{ borderRadius: '6px', fontWeight: 600, fontSize: '0.75rem' }}
                        />
                      );
                    })}
                  </Stack>
                </Box>
              )}

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

              <Alert severity="info" sx={{ py: 0.5, borderRadius: '8px' }} icon={false}>
                <Typography variant="body2" color="text.secondary">
                  {t('Assign the Inspector and drone in step 4.')}
                </Typography>
              </Alert>

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
