import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryState } from '@/shared/ui/QueryState';
import { MutationProblemAlert } from '@/shared/ui/MutationProblemAlert';
import { StatusChip } from '@/shared/ui/StatusChip';
import { usePendingReviewAssets, useReviewAsset } from '../hooks/useAssets';
import { useProposals, useReviewProposal } from '../hooks/useProposals';

export default function AssetReviewPage() {
  const { data, isLoading, error, refetch } = usePendingReviewAssets({ page: 1, pageSize: 50 });
  const review = useReviewAsset();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [proposalAssetId, setProposalAssetId] = useState('');
  const pending = data?.items ?? [];

  return (
    <Box>
      <PageHeader
        title="Asset review queue"
        subtitle="Approve a registered asset to generate its schedule proposals"
      />
      <QueryState
        isLoading={isLoading}
        error={error}
        onRetry={() => void refetch()}
        isEmpty={pending.length === 0}
        empty={<Alert severity="info">Nothing awaiting review.</Alert>}
      >
        <Stack spacing={2}>
          <MutationProblemAlert
            isError={review.isError}
            error={review.error}
            fallbackMessage="Could not record the review decision."
          />
          {pending.map((asset) => (
            <Card key={asset.id} variant="outlined">
              <CardContent>
                <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                  <Typography variant="h6">
                    {asset.name} ({asset.code})
                  </Typography>
                  <StatusChip status={asset.status} />
                </Stack>
                <Typography color="text.secondary">{asset.locationText}</Typography>
                <TextField
                  fullWidth
                  size="small"
                  label="Manager note"
                  sx={{ mt: 2 }}
                  value={notes[asset.id] ?? ''}
                  onChange={(event) =>
                    setNotes((current) => ({ ...current, [asset.id]: event.target.value }))
                  }
                />
                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                  <Button
                    variant="contained"
                    disabled={review.isPending}
                    onClick={() =>
                      review.mutate(
                        {
                          id: asset.id,
                          input: {
                            action: 'APPROVE',
                            ...(notes[asset.id] ? { note: notes[asset.id] } : {}),
                          },
                        },
                        { onSuccess: () => setProposalAssetId(asset.id) },
                      )
                    }
                  >
                    Approve
                  </Button>
                  <Button
                    color="error"
                    variant="outlined"
                    disabled={review.isPending}
                    onClick={() =>
                      review.mutate({
                        id: asset.id,
                        input: {
                          action: 'REJECT',
                          ...(notes[asset.id] ? { note: notes[asset.id] } : {}),
                        },
                      })
                    }
                  >
                    Reject
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </QueryState>

      <Divider sx={{ my: 4 }} />
      <Typography variant="h6" gutterBottom>
        Review schedule proposals
      </Typography>
      <Typography color="text.secondary" gutterBottom>
        Platform suggestions generated for an approved asset. Approve at least one option before the
        client can choose.
      </Typography>
      <TextField
        size="small"
        label="Approved asset id"
        sx={{ mt: 1, minWidth: 360 }}
        value={proposalAssetId}
        onChange={(event) => setProposalAssetId(event.target.value)}
        helperText="Approving an asset above fills this automatically."
      />
      <ProposalReviewList assetId={proposalAssetId} />
    </Box>
  );
}

function ProposalReviewList({ assetId }: { assetId: string }) {
  const { data: proposals } = useProposals(assetId);
  const review = useReviewProposal(assetId);
  const [intervals, setIntervals] = useState<Record<string, string>>({});

  if (!assetId) return null;
  if (!proposals?.length) {
    return (
      <Typography color="text.secondary" sx={{ mt: 2 }}>
        No proposals for this asset yet.
      </Typography>
    );
  }

  return (
    <Stack spacing={2} sx={{ mt: 2 }}>
      {/* A denial mutates nothing, so the proposals stay listed and the caller is told the action
          was refused rather than that the page failed. */}
      <MutationProblemAlert
        isError={review.isError}
        error={review.error}
        fallbackMessage="Could not review the proposal."
      />
      {proposals.map((proposal) => (
        <Card key={proposal.id} variant="outlined">
          <CardContent>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
            >
              <Box>
                <Typography variant="subtitle1">
                  {proposal.frequencyUnit} · {proposal.frequencyInterval}
                </Typography>
                <StatusChip status={proposal.status} />
              </Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <TextField
                  size="small"
                  type="number"
                  label="Interval"
                  sx={{ width: 120 }}
                  value={intervals[proposal.id] ?? String(proposal.frequencyInterval)}
                  onChange={(event) =>
                    setIntervals((current) => ({
                      ...current,
                      [proposal.id]: event.target.value,
                    }))
                  }
                  slotProps={{ htmlInput: { min: 1 } }}
                />
                <Button
                  variant="contained"
                  disabled={review.isPending}
                  onClick={() =>
                    review.mutate({
                      id: proposal.id,
                      input: {
                        action: 'APPROVE',
                        frequencyUnit: proposal.frequencyUnit,
                        frequencyInterval: Number(
                          intervals[proposal.id] ?? proposal.frequencyInterval,
                        ),
                      },
                    })
                  }
                >
                  Approve
                </Button>
                <Button
                  color="error"
                  variant="outlined"
                  disabled={review.isPending}
                  onClick={() => review.mutate({ id: proposal.id, input: { action: 'REJECT' } })}
                >
                  Reject
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}
