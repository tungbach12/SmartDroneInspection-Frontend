import { Box, Table, TableBody, TableCell, TableRow, Typography } from '@mui/material';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import type { ServiceRequest } from '../api/contractApi';
import { enumerateMonthlySchedule } from '../api/recurrenceSchedule';
import { formatVndPerOccurrence } from './contractStage';

interface QuoteTermsSummaryProps {
  request: ServiceRequest;
  quote: NonNullable<ServiceRequest['currentQuote']>;
  partnerSummary?: string | null;
}

export function QuoteTermsSummary({ request, quote, partnerSummary }: QuoteTermsSummaryProps) {
  const { locale, t } = useLocale();
  const unitPrice = Number(quote.pricePerOccurrenceVnd ?? quote.pricePerOccurrenceUsd ?? 0);
  const recurringDates =
    request.requestType === 'RECURRING'
      ? enumerateMonthlySchedule(request.requestedFrom, request.recurrenceInterval ?? 1, {
          ...(request.occurrenceCount != null
            ? { count: request.occurrenceCount }
            : { endDate: request.recurrenceEndDate ?? request.requestedUntil }),
          maxOccurrences: 100,
        })
      : [];
  const occurrenceTotal = request.requestType === 'RECURRING' ? recurringDates.length : 1;

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
              {new Date(quote.firstOccurrenceStartAt).toLocaleString(
                locale === 'vi' ? 'vi-VN' : 'en-US',
                { timeZone: request.timezone },
              )}{' '}
              –{' '}
              {new Date(quote.firstOccurrenceEndAt).toLocaleString(
                locale === 'vi' ? 'vi-VN' : 'en-US',
                { timeZone: request.timezone },
              )}{' '}
              ({request.timezone})
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
