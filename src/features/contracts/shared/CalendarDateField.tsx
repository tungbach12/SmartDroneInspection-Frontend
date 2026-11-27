import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  IconButton,
  Popover,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import { useLocale } from '@/shared/i18n/LocaleProvider';

export function toCalendarIsoDate(year: number, monthIndex: number, day: number): string {
  const date = new Date(Date.UTC(year, monthIndex, day));
  return date.toISOString().slice(0, 10);
}

export function formatCalendarIsoDate(dateString: string, locale: string): string {
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

export interface CalendarDateFieldProps {
  label: string;
  value: string;
  minDate: string;
  maxDate?: string | undefined;
  leadDays?: number | undefined;
  locale: string;
  helperText?: string | undefined;
  blockedMessageText?: string | undefined;
  onChange: (value: string) => void;
}

export function CalendarDateField({
  label,
  value,
  minDate,
  maxDate,
  leadDays = 20,
  locale,
  helperText,
  blockedMessageText,
  onChange,
}: CalendarDateFieldProps) {
  const { t } = useLocale();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [blockedMessage, setBlockedMessage] = useState('');
  const initial = value ? new Date(`${value}T12:00:00`) : new Date(`${minDate}T12:00:00`);
  const [visibleYear, setVisibleYear] = useState(initial.getFullYear());
  const [visibleMonth, setVisibleMonth] = useState(initial.getMonth());
  const open = Boolean(anchorEl);

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
    const dateString = toCalendarIsoDate(visibleYear, visibleMonth, day);
    if (dateString < minDate) {
      setBlockedMessage(
        blockedMessageText ??
          t('For scheduling and preparation, choose a date at least {days} days from today.').replace(
            '{days}',
            String(leadDays),
          ),
      );
      return;
    }
    if (maxDate && dateString > maxDate) {
      setBlockedMessage(
        `${t('Latest available date')}: ${formatCalendarIsoDate(maxDate, locale)}`,
      );
      return;
    }
    onChange(dateString);
    setBlockedMessage('');
    setAnchorEl(null);
  };

  const openPicker = (target: HTMLElement) => {
    const current = value ? new Date(`${value}T12:00:00`) : new Date(`${minDate}T12:00:00`);
    setVisibleYear(current.getFullYear());
    setVisibleMonth(current.getMonth());
    setBlockedMessage('');
    setAnchorEl(target);
  };

  return (
    <>
      <TextField
        fullWidth
        size="small"
        label={label}
        value={value ? formatCalendarIsoDate(value, locale) : ''}
        helperText={
          helperText ??
          `${t('Select a date at least {days} days from today. Earliest date').replace(
            '{days}',
            String(leadDays),
          )}: ${formatCalendarIsoDate(minDate, locale)}`
        }
        onClick={(event) => openPicker(event.currentTarget)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openPicker(event.currentTarget);
          }
        }}
        slotProps={{
          input: {
            readOnly: true,
            endAdornment: <CalendarMonthRoundedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />,
          },
          htmlInput: { 'aria-label': label, readOnly: true, role: 'button', 'aria-haspopup': 'dialog' },
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
            const dateString = toCalendarIsoDate(visibleYear, visibleMonth, day);
            const outOfBounds = dateString < minDate || (Boolean(maxDate) && dateString > maxDate!);
            const selected = value === dateString;
            return (
              <Button
                key={day}
                aria-disabled={outOfBounds}
                aria-label={formatCalendarIsoDate(dateString, locale)}
                onClick={() => selectDay(day)}
                sx={{
                  minWidth: 0,
                  height: 34,
                  p: 0,
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  color: outOfBounds ? 'text.disabled' : selected ? 'primary.contrastText' : 'text.primary',
                  opacity: outOfBounds ? 0.4 : 1,
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
          {t('Earliest available date')}: {formatCalendarIsoDate(minDate, locale)}
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
