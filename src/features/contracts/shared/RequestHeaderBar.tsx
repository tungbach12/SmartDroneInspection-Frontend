import { type ReactNode } from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { StatusChip } from '@/shared/ui/StatusChip';
import type { ServiceRequest } from '../api/contractApi';
import {
  formatFlightTimeRange,
  getStatusLabel,
  statusTone,
} from './contractStage';

interface RequestHeaderBarProps {
  request: ServiceRequest;
  effectiveStatus: ServiceRequest['status'];
  headerAction?: ReactNode;
  children?: ReactNode;
}

export function RequestHeaderBar({
  request,
  effectiveStatus,
  headerAction,
  children,
}: RequestHeaderBarProps) {
  const { locale, t } = useLocale();
  const scheduledCount =
    request.requestType === 'RECURRING'
      ? request.occurrenceCount ?? request.occurrences.length
      : 0;
  const requestDate = (date: string) =>
    new Date(`${date}T00:00:00`).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  return (
    <Box
      sx={{
        borderRadius: '10px',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, flexWrap: 'wrap' }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h5" sx={{ fontWeight: 750, color: 'text.primary' }}>
              {request.description}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.5, fontVariantNumeric: 'tabular-nums' }}
            >
              {request.requestType === 'ONE_TIME'
                ? requestDate(request.requestedFrom)
                : `${requestDate(request.requestedFrom)} – ${requestDate(request.requestedUntil)}`}
              {' · '}
              {formatFlightTimeRange(request.windowStart, request.windowEnd)}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
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
            {scheduledCount > 0 && (
              <Chip
                size="small"
                label={`${scheduledCount} ${t('occurrences')}`}
                variant="outlined"
                sx={{ fontWeight: 600, borderRadius: '6px' }}
              />
            )}
            {headerAction}
          </Stack>
        </Stack>
      </Box>
      {children}
    </Box>
  );
}
