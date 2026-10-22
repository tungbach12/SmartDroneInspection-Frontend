import { useParams } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { getErrorMessage } from '@/shared/api/errorMessage';
import { isConflict } from '@/shared/api/problem';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryState } from '@/shared/ui/QueryState';
import { RefusalNotice } from '@/shared/ui/MutationProblemAlert';
import { StatusChip } from '@/shared/ui/StatusChip';
import type { FrequencyUnit } from '../api/catalogApi';
import { useSchedules, useToggleSchedule } from '../hooks/useSchedules';
import { useLocale } from '@/shared/i18n/LocaleProvider';

const UNIT_LABEL: Record<FrequencyUnit, string> = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
  YEAR: 'year',
};

export default function InspectionSchedulesPage() {
  const { formatDate, t } = useLocale();
    const { assetId = '' } = useParams();
  const { data: schedules, isLoading, error, refetch } = useSchedules(assetId);
  const toggle = useToggleSchedule(assetId);
  // One ACTIVE schedule per asset is enforced by the server; a 409 is that rule refusing, and the
  // refusal mutates nothing, so the listed schedules are left exactly as they are.
  const conflicting = isConflict(toggle.error);

  return (
    <Box>
      <PageHeader
        title={t('Inspection schedules')}
        subtitle={t('Pause or resume the inspection cycle for this asset')}
      />
      <QueryState
        isLoading={isLoading}
        error={error}
        onRetry={() => void refetch()}
        isEmpty={Boolean(schedules && schedules.length === 0)}
        empty={<Alert severity="info">{t('No schedule selected for this asset yet.')}</Alert>}
      >
        <Stack spacing={2}>
          {conflicting && (
            <RefusalNotice
              testId="schedule-conflict"
              reason={getErrorMessage(toggle.error, '')}
              fallbackMessage={t('The server refused this schedule change.')}
            />
          )}
          {!conflicting && toggle.isError && (
            <Alert severity="error">
              {getErrorMessage(toggle.error, 'Could not change the schedule state.')}
            </Alert>
          )}
          {schedules?.map((schedule) => (
            <Card key={schedule.id} variant="outlined">
              <CardContent>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={2}
                  sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
                >
                  <Box>
                    <Typography variant="h6">
                      {t('Every')} {schedule.frequencyInterval} {UNIT_LABEL[schedule.frequencyUnit]}
                      {schedule.frequencyInterval > 1 ? 's' : ''}
                    </Typography>
                    <Typography color="text.secondary">
                      {t('Next due')} {formatDate(new Date(schedule.nextDueAt))}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <StatusChip status={schedule.status} />
                    <Button
                      variant="outlined"
                      disabled={toggle.isPending}
                      onClick={() => toggle.mutate(schedule)}
                    >
                      {schedule.status === 'ACTIVE' ? 'Pause' : 'Activate'}
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </QueryState>
    </Box>
  );
}
