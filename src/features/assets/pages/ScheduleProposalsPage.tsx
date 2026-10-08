import { useParams } from 'react-router-dom';
import { Alert, Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { getErrorMessage } from '@/shared/api/errorMessage';
import { isConflict } from '@/shared/api/problem';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryState } from '@/shared/ui/QueryState';
import { RefusalNotice } from '@/shared/ui/MutationProblemAlert';
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
  // One active schedule per asset is a server rule; a 409 is that rule refusing, not a failure.
  const alreadyScheduled = isConflict(select.error);

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
          {alreadyScheduled && (
            // The server's own wording stands alone: this 409 comes from one rule, but a client
            // heading would assert the reason rather than report it.
            <RefusalNotice
              testId="schedule-conflict"
              reason={getErrorMessage(select.error, '')}
              fallbackMessage="The server refused this selection."
            />
          )}
          {!alreadyScheduled && select.isError && (
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
                    {/* Only a manager-approved proposal can be selected. clientSelect permits
                        that status alone, so the action is hidden on every other state — which is
                        also what stops a stale view from reaching the service's unhandled
                        IllegalStateException (surfaced as a 500). The list itself only ever
                        returns approved rows, so no client-side status model is invented here:
                        the row shows the status the server sent, and nothing more. */}
                    <StatusChip status={proposal.status} />
                    {proposal.status === 'MANAGER_APPROVED' && (
                      <Button
                        variant="contained"
                        disabled={select.isPending}
                        onClick={() => select.mutate(proposal.id)}
                      >
                        Select
                      </Button>
                    )}
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
