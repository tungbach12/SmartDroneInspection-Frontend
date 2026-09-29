import { useParams } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { getErrorMessage } from '@/shared/api/errorMessage';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryState } from '@/shared/ui/QueryState';
import { StatusChip } from '@/shared/ui/StatusChip';
import type { FrequencyUnit } from '../api/catalogApi';
import { useProposals, useSelectProposal } from '../hooks/useProposals';

const UNIT_LABEL: Record<FrequencyUnit, string> = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
  YEAR: 'year',
};

function frequencyLabel(unit: FrequencyUnit, interval: number) {
  return `Every ${interval} ${UNIT_LABEL[unit]}${interval > 1 ? 's' : ''}`;
}

export default function ScheduleProposalsPage() {
  const { assetId = '' } = useParams();
  const { data: proposals, isLoading, error, refetch } = useProposals(assetId);
  const select = useSelectProposal(assetId);

  return (
    <Box>
      <PageHeader
        title="Proposed schedules"
        subtitle="Choose the inspection frequency for this asset"
      />
      <QueryState
        isLoading={isLoading}
        error={error}
        onRetry={() => void refetch()}
        isEmpty={Boolean(proposals && proposals.length === 0)}
        empty={
          <Alert severity="info">
            No approved schedule proposals yet. Your Service Manager reviews the platform
            suggestions first.
          </Alert>
        }
      >
        <Stack spacing={2}>
          {select.isError && (
            <Alert severity="error">
              {getErrorMessage(select.error, 'Could not select this schedule.')}
            </Alert>
          )}
          {proposals?.map((proposal) => (
            <Card key={proposal.id} variant="outlined">
              <CardContent>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={2}
                  sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
                >
                  <Box>
                    <Typography variant="h6">
                      {frequencyLabel(proposal.frequencyUnit, proposal.frequencyInterval)}
                    </Typography>
                    {proposal.managerNote && (
                      <Typography color="text.secondary">{proposal.managerNote}</Typography>
                    )}
                  </Box>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <StatusChip status={proposal.status} />
                    <Button
                      variant="contained"
                      disabled={select.isPending}
                      onClick={() => select.mutate(proposal.id)}
                    >
                      Select
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
