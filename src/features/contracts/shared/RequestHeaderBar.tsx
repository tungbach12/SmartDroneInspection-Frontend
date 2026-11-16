import { Box, Chip, Stack, Typography } from '@mui/material';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { StatusChip } from '@/shared/ui/StatusChip';
import type { ServiceRequest } from '../api/contractApi';
import {
  formatFlightWindow,
  formatRecurrenceUnit,
  getStatusLabel,
  statusTone,
} from './contractStage';

interface RequestHeaderBarProps {
  request: ServiceRequest;
  effectiveStatus: ServiceRequest['status'];
}

export function RequestHeaderBar({ request, effectiveStatus }: RequestHeaderBarProps) {
  const { locale, t } = useLocale();

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 2.5 },
        borderRadius: '10px',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Stack spacing={1.25}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, flexWrap: 'wrap' }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h5" sx={{ fontWeight: 750, color: 'text.primary' }}>
              {request.description}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {t('Requested window')}:{' '}
              <strong>
                {request.requestType === 'ONE_TIME'
                  ? request.requestedFrom
                  : `${request.requestedFrom} – ${request.requestedUntil}`}
              </strong>{' '}
              · {formatFlightWindow(request.windowStart, request.windowEnd, t)} · {request.timezone}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexShrink: 0 }}>
            <StatusChip
              status={effectiveStatus}
              label={getStatusLabel(effectiveStatus, t)}
              tone={statusTone(effectiveStatus)}
            />
            <Chip
              size="small"
              label={request.requestType === 'ONE_TIME' ? t('One-time') : t('Recurring')}
              variant="outlined"
              sx={{ fontWeight: 600, borderRadius: '6px' }}
            />
          </Stack>
        </Stack>

        {request.requestType === 'RECURRING' && (
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              bgcolor: 'background.default',
              border: '1px solid',
              borderColor: 'divider',
              px: 1.5,
              py: 1,
              borderRadius: '8px',
            }}
          >
            {locale === 'vi' ? (
              <>
                Chu kỳ: mỗi {request.recurrenceInterval}{' '}
                {formatRecurrenceUnit(request.recurrenceUnit, locale)}
                {request.occurrenceCount ? ` · ${request.occurrenceCount} đợt bay` : ''}
                {request.recurrenceEndDate ? ` · đến hết ngày ${request.recurrenceEndDate}` : ''}
                {' · Giá báo là đơn giá cho từng đợt bay'}
              </>
            ) : (
              <>
                Recurrence: every {request.recurrenceInterval}{' '}
                {request.recurrenceUnit?.toLowerCase()}
                {request.occurrenceCount
                  ? ` · ${request.occurrenceCount} flight occurrence(s)`
                  : ''}
                {request.recurrenceEndDate ? ` · until ${request.recurrenceEndDate}` : ''}
                {' · Quoted price is per occurrence'}
              </>
            )}
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
