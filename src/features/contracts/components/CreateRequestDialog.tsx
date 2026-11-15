import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Popover,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddBusinessRoundedIcon from '@mui/icons-material/AddBusinessRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import { type CreateServiceRequestInput } from '../api/contractApi';
import {
  addAnchoredMonths,
  addCalendarDays,
  enumerateMonthlySchedule,
  MINIMUM_INSPECTION_LEAD_DAYS,
} from '../api/recurrenceSchedule';
import { useCreateServiceRequest } from '../hooks/useContracts';

interface CreateRequestDialogProps {
  open: boolean;
  onClose: () => void;
  assets: { id: string; name: string; code: string; status?: string }[];
  onCreated: (requestId: string) => void;
  onError: (message: string) => void;
}

const MINIMUM_LEAD_DAYS = MINIMUM_INSPECTION_LEAD_DAYS;
const MAX_RECURRENCE_MONTHS = 120;
const MAX_OCCURRENCES = 100;
const RECURRENCE_PRESETS = ['1', '3', '6', '9', '12'];

function toIsoDate(year: number, monthIndex: number, day: number): string {
  const date = new Date(Date.UTC(year, monthIndex, day));
  return date.toISOString().slice(0, 10);
}

function dateInZone(timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function formatDate(dateString: string, locale: string): string {
  const [yearValue, monthValue, dayValue] = dateString.split('-').map(Number);
  const year = yearValue ?? 2000;
  const month = monthValue ?? 1;
  const day = dayValue ?? 1;
  return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

interface CalendarDateFieldProps {
  label: string;
  value: string;
  minDate: string;
  locale: string;
  onChange: (value: string) => void;
}

function CalendarDateField({ label, value, minDate, locale, onChange }: CalendarDateFieldProps) {
  const { t } = useLocale();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [blockedMessage, setBlockedMessage] = useState('');
  const initial = value ? new Date(`${value}T12:00:00`) : new Date();
  const [visibleYear, setVisibleYear] = useState(initial.getFullYear());
  const [visibleMonth, setVisibleMonth] = useState(initial.getMonth());
  const open = Boolean(anchorEl);
  const minDay = Number(minDate.slice(8, 10));
  const minMonth = Number(minDate.slice(5, 7)) - 1;
  const minYear = Number(minDate.slice(0, 4));

  const monthLabel = new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(visibleYear, visibleMonth, 15)));
  const firstWeekday = (new Date(visibleYear, visibleMonth, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(visibleYear, visibleMonth + 1, 0).getDate();
  const weekDays =
    locale === 'vi'
      ? ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
      : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const moveMonth = (amount: number) => {
    const next = new Date(visibleYear, visibleMonth + amount, 1);
    setVisibleYear(next.getFullYear());
    setVisibleMonth(next.getMonth());
    setBlockedMessage('');
  };

  const selectDay = (day: number) => {
    const dateString = toIsoDate(visibleYear, visibleMonth, day);
    if (dateString < minDate) {
      setBlockedMessage(
        t('For scheduling and preparation, choose a date at least 20 days from today.'),
      );
      return;
    }
    onChange(dateString);
    setBlockedMessage('');
    setAnchorEl(null);
  };

  return (
    <>
      <TextField
        fullWidth
        size="small"
        label={label}
        value={value ? formatDate(value, locale) : ''}
        helperText={`${t('Select a date at least 20 days from today. Earliest date')}: ${formatDate(minDate, locale)}`}
        onClick={(event) => {
          const current = value ? new Date(`${value}T12:00:00`) : new Date(`${minDate}T12:00:00`);
          setVisibleYear(current.getFullYear());
          setVisibleMonth(current.getMonth());
          setBlockedMessage('');
          setAnchorEl(event.currentTarget);
        }}
        slotProps={{
          input: {
            readOnly: true,
            endAdornment: <CalendarMonthRoundedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />,
          },
          htmlInput: { 'aria-label': label, readOnly: true },
        }}
      />
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { mt: 0.75, p: 1.5, width: 304, borderRadius: '8px' } } }}
      >
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <IconButton size="small" aria-label={t('Previous month')} onClick={() => moveMonth(-1)}>
            <ChevronLeftRoundedIcon fontSize="small" />
          </IconButton>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'capitalize' }}>
            {monthLabel}
          </Typography>
          <IconButton size="small" aria-label={t('Next month')} onClick={() => moveMonth(1)}>
            <ChevronRightRoundedIcon fontSize="small" />
          </IconButton>
        </Stack>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.25, mb: 0.5 }}>
          {weekDays.map((day) => (
            <Typography key={day} variant="caption" color="text.secondary" sx={{ textAlign: 'center', py: 0.5 }}>
              {day}
            </Typography>
          ))}
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.25 }}>
          {Array.from({ length: firstWeekday }, (_, index) => (
            <Box key={`empty-${index}`} sx={{ height: 34 }} />
          ))}
          {Array.from({ length: daysInMonth }, (_, index) => {
            const day = index + 1;
            const beforeMinimum =
              visibleYear < minYear ||
              (visibleYear === minYear && visibleMonth < minMonth) ||
              (visibleYear === minYear && visibleMonth === minMonth && day < minDay);
            const selected = value === toIsoDate(visibleYear, visibleMonth, day);
            return (
              <Button
                key={day}
                aria-disabled={beforeMinimum}
                aria-label={formatDate(toIsoDate(visibleYear, visibleMonth, day), locale)}
                onClick={() => selectDay(day)}
                sx={{
                  minWidth: 0,
                  height: 34,
                  p: 0,
                  borderRadius: '6px',
                  fontSize: '0.8125rem',
                  color: beforeMinimum ? 'text.disabled' : selected ? 'primary.contrastText' : 'text.primary',
                  opacity: beforeMinimum ? 0.4 : 1,
                  bgcolor: selected ? 'primary.main' : 'transparent',
                  '&:hover': { bgcolor: selected ? 'primary.dark' : 'action.hover' },
                }}
              >
                {day}
              </Button>
            );
          })}
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          {t('Earliest available date')}: {formatDate(minDate, locale)}
        </Typography>
        {blockedMessage && (
          <Alert severity="info" sx={{ mt: 1, py: 0, '& .MuiAlert-message': { fontSize: '0.75rem' } }}>
            {blockedMessage}
          </Alert>
        )}
      </Popover>
    </>
  );
}

export function CreateRequestDialog({
  open,
  onClose,
  assets,
  onCreated,
  onError,
}: CreateRequestDialogProps) {
  const { locale, t } = useLocale();
  const create = useCreateServiceRequest();
  const [assetId, setAssetId] = useState('');
  const [from, setFrom] = useState('');
  const [requestType, setRequestType] = useState<'ONE_TIME' | 'RECURRING'>('ONE_TIME');
  const [intervalPreset, setIntervalPreset] = useState('1');
  const [customInterval, setCustomInterval] = useState('2');
  const [recurrenceLimit, setRecurrenceLimit] = useState<'COUNT' | 'END_DATE'>('COUNT');
  const [count, setCount] = useState('4');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [validationError, setValidationError] = useState('');
  const timezone = 'Asia/Ho_Chi_Minh';
  const minStartDate = addCalendarDays(dateInZone(timezone), MINIMUM_LEAD_DAYS);
  const effectiveInterval = intervalPreset === 'CUSTOM' ? customInterval : intervalPreset;
  const intervalMonths = Number(effectiveInterval);
  const isValidInterval =
    Number.isInteger(intervalMonths) && intervalMonths >= 1 && intervalMonths <= MAX_RECURRENCE_MONTHS;
  const recurrenceDates = useMemo(() => {
    if (requestType !== 'RECURRING' || !from || !isValidInterval) return [] as string[];
    return enumerateMonthlySchedule(from, intervalMonths, {
      ...(recurrenceLimit === 'COUNT' ? { count: Number(count) } : { endDate: recurrenceEndDate }),
      maxOccurrences: MAX_OCCURRENCES,
    });
  }, [count, from, intervalMonths, isValidInterval, recurrenceEndDate, recurrenceLimit, requestType]);
  const previewDates =
    recurrenceDates.length <= 5
      ? recurrenceDates
      : [...recurrenceDates.slice(0, 3), '…', recurrenceDates[recurrenceDates.length - 1]];

  const handleSubmit = async () => {
    setValidationError('');
    if (!assetId) {
      setValidationError(t('Please select the asset to inspect.'));
      return;
    }
    if (!from || from < minStartDate) {
      setValidationError(
        t('The first inspection date must be at least 20 days from today.'),
      );
      return;
    }
    if (requestType === 'RECURRING') {
      if (!isValidInterval) {
        setValidationError(t('Enter a monthly interval between 1 and 120 months.'));
        return;
      }
      if (recurrenceDates.length > MAX_OCCURRENCES) {
        setValidationError(t('A recurring request cannot contain more than 100 occurrences.'));
        return;
      }
      if (
        recurrenceLimit === 'COUNT' &&
        (!Number.isInteger(Number(count)) || Number(count) < 2 || Number(count) > MAX_OCCURRENCES)
      ) {
        setValidationError(t('A recurring request must contain between 2 and 100 occurrences.'));
        return;
      }
      if (recurrenceLimit === 'END_DATE' && recurrenceDates.length < 2) {
        setValidationError(t('Choose an end date that includes at least two occurrences.'));
        return;
      }
      if (recurrenceDates.length > MAX_OCCURRENCES) {
        setValidationError(t('A recurring request cannot contain more than 100 occurrences.'));
        return;
      }
    }

    const input: CreateServiceRequestInput = {
      assetId,
      requestedFrom: from,
      timezone,
      requestType,
      ...(requestType === 'RECURRING'
        ? {
            recurrenceUnit: 'MONTH',
            recurrenceInterval: intervalMonths,
            ...(recurrenceLimit === 'COUNT'
              ? { occurrenceCount: Number(count) }
              : { recurrenceEndDate }),
          }
        : {}),
    };

    try {
      const request = await create.mutateAsync(input);
      onCreated(request.id);
      onClose();
      setAssetId('');
      setFrom('');
      setRequestType('ONE_TIME');
      setIntervalPreset('1');
      setCustomInterval('2');
      setCount('4');
      setRecurrenceLimit('COUNT');
      setRecurrenceEndDate('');
    } catch (error) {
      const message = error instanceof Error ? error.message : t('Unable to create service request.');
      setValidationError(message);
      onError(message);
    }
  };

  const changeStartDate = (value: string) => {
    setFrom(value);
    if (requestType === 'RECURRING' && recurrenceLimit === 'END_DATE' && isValidInterval) {
      setRecurrenceEndDate(addAnchoredMonths(value, intervalMonths));
    }
  };

  const changeIntervalPreset = (value: string) => {
    setIntervalPreset(value);
    if (value !== 'CUSTOM' && recurrenceLimit === 'END_DATE' && from) {
      setRecurrenceEndDate(addAnchoredMonths(from, Number(value)));
    }
  };

  const earliestSecondOccurrence = from && isValidInterval ? addAnchoredMonths(from, intervalMonths) : '';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
        <AddBusinessRoundedIcon color="primary" />
        {t('Create inspection request')}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          {validationError && (
            <Alert severity="error" onClose={() => setValidationError('')}>
              {validationError}
            </Alert>
          )}

          <FormControl fullWidth size="small" required>
            <InputLabel id="dialog-asset-label">{t('Asset / structure')}</InputLabel>
            <Select
              labelId="dialog-asset-label"
              label={t('Asset / structure')}
              value={assetId}
              onChange={(event) => setAssetId(event.target.value)}
            >
              {assets
                .filter((asset) => asset.status !== 'RETIRED')
                .map((asset) => (
                  <MenuItem key={asset.id} value={asset.id}>
                    {asset.code} — {asset.name}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel id="dialog-type-label">{t('Inspection frequency')}</InputLabel>
            <Select
              labelId="dialog-type-label"
              label={t('Inspection frequency')}
              value={requestType}
              onChange={(event) => {
                const next = event.target.value as 'ONE_TIME' | 'RECURRING';
                setRequestType(next);
                if (next === 'RECURRING' && from && isValidInterval) {
                  setRecurrenceEndDate(addAnchoredMonths(from, intervalMonths));
                }
              }}
            >
              <MenuItem value="ONE_TIME">{t('One-time inspection')}</MenuItem>
              <MenuItem value="RECURRING">{t('Recurring inspection')}</MenuItem>
            </Select>
          </FormControl>

          <CalendarDateField
            label={requestType === 'ONE_TIME' ? t('Inspection date') : t('First expected inspection date')}
            value={from}
            minDate={minStartDate}
            locale={locale}
            onChange={changeStartDate}
          />
          {requestType === 'RECURRING' && (
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: '8px', bgcolor: 'background.default' }}>
              <Stack spacing={1.5}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  {t('Recurring schedule')}
                </Typography>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="dialog-interval-label">{t('Repeat every')}</InputLabel>
                    <Select
                      labelId="dialog-interval-label"
                      label={t('Repeat every')}
                      value={intervalPreset}
                      onChange={(event) => changeIntervalPreset(event.target.value)}
                    >
                      {RECURRENCE_PRESETS.map((months) => (
                        <MenuItem key={months} value={months}>
                          {t('Every N months').replace('N', months)}
                        </MenuItem>
                      ))}
                      <MenuItem value="CUSTOM">{t('Custom monthly interval')}</MenuItem>
                    </Select>
                  </FormControl>
                  {intervalPreset === 'CUSTOM' && (
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      label={t('Months between inspections')}
                      value={customInterval}
                      onChange={(event) => {
                        setCustomInterval(event.target.value);
                        if (recurrenceLimit === 'END_DATE' && from) {
                          const value = Number(event.target.value);
                          if (Number.isInteger(value) && value >= 1 && value <= MAX_RECURRENCE_MONTHS) {
                            setRecurrenceEndDate(addAnchoredMonths(from, value));
                          }
                        }
                      }}
                      slotProps={{ htmlInput: { min: 1, max: MAX_RECURRENCE_MONTHS, step: 1 } }}
                    />
                  )}
                </Stack>

                <FormControl fullWidth size="small">
                  <InputLabel id="dialog-bound-label">{t('Schedule ends')}</InputLabel>
                  <Select
                    labelId="dialog-bound-label"
                    label={t('Schedule ends')}
                    value={recurrenceLimit}
                    onChange={(event) => {
                      const next = event.target.value as 'COUNT' | 'END_DATE';
                      setRecurrenceLimit(next);
                      if (next === 'END_DATE' && from && isValidInterval) {
                        setRecurrenceEndDate(addAnchoredMonths(from, intervalMonths));
                      }
                    }}
                  >
                    <MenuItem value="COUNT">{t('After a number of inspections')}</MenuItem>
                    <MenuItem value="END_DATE">{t('On an end date')}</MenuItem>
                  </Select>
                </FormControl>

                {recurrenceLimit === 'COUNT' ? (
                  <TextField
                    label={t('Total planned inspections')}
                    type="number"
                    size="small"
                    fullWidth
                    value={count}
                    onChange={(event) => setCount(event.target.value)}
                    slotProps={{ htmlInput: { min: 2, max: MAX_OCCURRENCES, step: 1 } }}
                  />
                ) : (
                  <TextField
                    label={t('Schedule end date')}
                    type="date"
                    size="small"
                    fullWidth
                    value={recurrenceEndDate}
                    onChange={(event) => setRecurrenceEndDate(event.target.value)}
                    slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: earliestSecondOccurrence } }}
                    helperText={t('The schedule must include at least two inspection dates.')}
                  />
                )}

                {from && isValidInterval && recurrenceDates.length > 0 ? (
                  <Box sx={{ p: 1.25, borderRadius: '6px', bgcolor: 'action.hover' }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                      {t('Estimated schedule')} · {recurrenceDates.length} {t('inspections')}
                    </Typography>
                    <Stack direction="row" sx={{ gap: 0.75, flexWrap: 'wrap' }}>
                      {previewDates.map((date, index) => (
                        <Typography key={`${date}-${index}`} variant="caption" color="text.secondary">
                          {date === '…' ? '…' : formatDate(date ?? '', locale)}
                          {index < previewDates.length - 1 && date !== '…' ? ' ·' : ''}
                        </Typography>
                      ))}
                    </Stack>
                  </Box>
                ) : requestType === 'RECURRING' && recurrenceLimit === 'END_DATE' && from && recurrenceEndDate ? (
                  <Alert severity="warning" sx={{ py: 0, '& .MuiAlert-message': { fontSize: '0.8rem' } }}>
                    {t('The selected date range must contain at least two inspection dates.')}
                  </Alert>
                ) : null}

                <Typography variant="caption" color="text.secondary">
                  {t('Each inspection is quoted per occurrence. The Manager will assign a pilot and drone after the agreement is signed.')}
                </Typography>
              </Stack>
            </Paper>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">
          {t('Cancel')}
        </Button>
        <LoadingButton
          variant="contained"
          loading={create.isPending}
          onClick={() => void handleSubmit()}
          disabled={!assetId || !from || from < minStartDate}
        >
          {t('Submit service request')}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
