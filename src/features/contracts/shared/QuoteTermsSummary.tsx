import { Box, Table, TableBody, TableCell, TableRow, Typography } from '@mui/material';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import type { ServiceRequest } from '../api/contractApi';
import { enumerateMonthlySchedule } from '../api/recurrenceSchedule';
import { instantToLocalDate } from '../api/scheduleTime';
import { formatVndPerOccurrence } from './contractStage';

interface QuoteTermsSummaryProps {
  request: ServiceRequest;
  quote: NonNullable<ServiceRequest['currentQuote']>;
  partnerSummary?: string | null;
}

export function QuoteTermsSummary({ request, quote, partnerSummary }: QuoteTermsSummaryProps) {
  const { locale, t } = useLocale();
  const unitPrice = Number(quote.pricePerOccurrenceVnd ?? quote.pricePerOccurrenceUsd ?? 0);
  // The recurring term follows the quoted first date; an end-date term keeps the customer end date.
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
  const occurrenceTotal = request.requestType === 'RECURRING' ? recurringDates.length : 1;
  const dateFormatter = new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
    timeZone: request.timezone,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const timeFormatter = new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
    timeZone: request.timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const firstStart = new Date(quote.firstOccurrenceStartAt);
  const firstEnd = new Date(quote.firstOccurrenceEndAt);
  const sameDay = dateFormatter.format(firstStart) === dateFormatter.format(firstEnd);
  const firstOccurrenceLabel = sameDay
    ? `${dateFormatter.format(firstStart)} · ${timeFormatter.format(firstStart)} – ${timeFormatter.format(firstEnd)}`
    : `${dateFormatter.format(firstStart)} ${timeFormatter.format(firstStart)} – ${dateFormatter.format(firstEnd)} ${timeFormatter.format(firstEnd)}`;

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '8px',
        bgcolor: 'background.default',
        overflow: 'hidden',
      }}
    >
      <Table size="small" sx={{ tableLayout: { xs: 'fixed', sm: 'auto' } }}>
        <TableBody>
          <TableRow>
            <TableCell
              sx={{
                width: { xs: '38%', sm: 200 },
                fontWeight: 600,
                color: 'text.secondary',
                verticalAlign: 'top',
                pr: 1,
              }}
            >
              {t('Price per occurrence (VND)')}
            </TableCell>
            <TableCell sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              {formatVndPerOccurrence(unitPrice, locale)}
              {occurrenceTotal > 1 && (
                <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                  ({occurrenceTotal} {locale === 'vi' ? 'đợt' : 'occurrences'} ·{' '}
                  {(unitPrice * occurrenceTotal).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US')}{' '}
                  VND)
                </Typography>
              )}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell
              sx={{ fontWeight: 600, color: 'text.secondary', verticalAlign: 'top', pr: 1 }}
            >
              {t('Quoted scope')}
            </TableCell>
            <TableCell sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
              {quote.scopeSnapshot}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell sx={{ fontWeight: 600, color: 'text.secondary', verticalAlign: 'top', pr: 1 }}>
              {t('First occurrence')}
            </TableCell>
            <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>
              {firstOccurrenceLabel}
            </TableCell>
          </TableRow>
          {partnerSummary && (
            <TableRow>
              <TableCell sx={{ fontWeight: 600, color: 'text.secondary', borderBottom: 0 }}>
                {t('Partner Inspector')} & {t('Drone')}
              </TableCell>
              <TableCell sx={{ borderBottom: 0 }}>{partnerSummary}</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Box>
  );
}
