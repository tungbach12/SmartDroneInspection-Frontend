import { useParams } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { getErrorMessage } from '@/shared/api/errorMessage';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryState } from '@/shared/ui/QueryState';
import { StatusChip } from '@/shared/ui/StatusChip';
import type { FrequencyUnit } from '../api/catalogApi';
import { useSchedules, useToggleSchedule } from '../hooks/useSchedules';

const UNIT_LABEL: Record<FrequencyUnit, string> = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
  YEAR: 'year',
};

export default function InspectionSchedulesPage() {
  const { assetId = '' } = useParams();
  const { data: schedules, isLoading, error, refetch } = useSchedules(assetId);
  const toggle = useToggleSchedule(assetId);

  return (
    <Box>
      <PageHeader
        title="Inspection schedules"
        subtitle="Pause or resume the inspection cycle for this asset"
      />
      <QueryState
        isLoading={isLoading}
        error={error}
        onRetry={() => void refetch()}
        isEmpty={Boolean(schedules && schedules.length === 0)}
        empty={<Alert severity="info">No schedule selected for this asset yet.</Alert>}
      >
        <Stack spacing={2}>
          {toggle.isError && (
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
                      Every {schedule.frequencyInterval} {UNIT_LABEL[schedule.frequencyUnit]}
                      {schedule.frequencyInterval > 1 ? 's' : ''}
                    </Typography>
                    <Typography color="text.secondary">
                      Next due {new Date(schedule.nextDueAt).toLocaleDateString()}
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
