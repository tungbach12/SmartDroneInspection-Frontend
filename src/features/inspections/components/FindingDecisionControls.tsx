import { useState } from 'react';
import { Alert, Button, Stack, TextField, Typography } from '@mui/material';
import { getErrorMessage } from '@/shared/api/errorMessage';
import type { FindingDecision } from '../api/inspectionApi';

interface FindingDecisionControlsProps {
  findingId: string;
  defectLabel: string;
  isPending: boolean;
  error: unknown;
  onDecide: (findingId: string, decision: FindingDecision, rationale: string) => void;
}

const DECISIONS: { value: FindingDecision; label: string; primary: boolean }[] = [
  { value: 'CONFIRMED', label: 'Confirm finding', primary: true },
  { value: 'MODIFIED', label: 'Confirm as modified', primary: false },
  { value: 'REJECTED', label: 'Reject finding', primary: false },
];

/**
 * MF3-09: the qualified reviewer's final decision on one finding.
 *
 * <p>This is a separate act from the Inspector's MF3-06 candidate review, which only records a
 * recommendation and leaves the finding undecided. Report 3 gives the final decision to an
 * Organization Admin who is not the author, and a finding reaches the report and the corrective-work
 * scope only once it is CONFIRMED or MODIFIED here.
 *
 * <p>The rationale is optional because the backend accepts a decision without one. It is offered
 * because it is the reasoning the report can cite, not because the route demands it.
 */
export function FindingDecisionControls({
  findingId,
  defectLabel,
  isPending,
  error,
  onDecide,
}: FindingDecisionControlsProps) {
  const [rationale, setRationale] = useState('');

  return (
    <Stack spacing={1.5} sx={{ mt: 2, pt: 2, borderTop: '1px solid',
      borderColor: 'divider' }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
        Reviewer decision — {defectLabel}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        MF3-09 is the qualified reviewer&apos;s decision, distinct from the Inspector&apos;s
        recommendation. A finding is official — and reaches the report and the repair scope — only
        once it is confirmed.
      </Typography>
      <TextField
        label="Reviewer rationale"
        multiline
        minRows={2}
        value={rationale}
        onChange={(event) => setRationale(event.target.value)}
        slotProps={{ htmlInput: { maxLength: 4000 } }}
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        {DECISIONS.map((option) => (
          <Button
            key={option.value}
            variant={option.primary ? 'contained' : 'outlined'}
            disabled={isPending}
            onClick={() => onDecide(findingId, option.value, rationale.trim())}
          >
            {option.label}
          </Button>
        ))}
      </Stack>
      {error ? (
        <Alert severity="error">
          {getErrorMessage(error, 'The reviewer decision was not recorded.')}
        </Alert>
      ) : null}
    </Stack>
  );
}
