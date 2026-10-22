import { useState, type FormEvent } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { MutationProblemAlert } from '@/shared/ui/MutationProblemAlert';
import { useProposeChange } from '../hooks/useMaintenance';

interface ProposeChangeDialogProps {
  workOrderId: string;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ProposeChangeDialog({
  workOrderId,
  open,
  onClose,
  onSuccess,
}: ProposeChangeDialogProps) {
  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <ProposeChangeForm
        workOrderId={workOrderId}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </Dialog>
  );
}

function ProposeChangeForm({
  workOrderId,
  onClose,
  onSuccess,
}: {
  workOrderId: string;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const changeMutation = useProposeChange();

  const [reason, setReason] = useState('');
  const [affectedTasks, setAffectedTasks] = useState('');
  const [proposedDelta, setProposedDelta] = useState('0');
  const [supportingEvidence, setSupportingEvidence] = useState('');
  const [errors, setErrors] = useState<{ reason?: string; proposedDelta?: string }>({});

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (changeMutation.isPending) return;

    const nextErrors: typeof errors = {};
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      nextErrors.reason = 'Reason for change is required.';
    }
    const delta = parseFloat(proposedDelta);
    if (isNaN(delta)) {
      nextErrors.proposedDelta = 'Enter a valid numeric amount.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      await changeMutation.mutateAsync({
        workOrderId,
        input: {
          reason: trimmedReason,
          affectedTasks: affectedTasks.trim() || undefined,
          proposedDelta: delta,
          supportingEvidence: supportingEvidence.trim() || undefined,
        },
      });
      onSuccess?.();
      onClose();
    } catch {
      // Handled by MutationProblemAlert
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogTitle sx={{ fontWeight: 700 }}>Propose Scope or Cost Change</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <MutationProblemAlert
            error={changeMutation.error}
            isError={changeMutation.isError}
          />

          <Typography variant="body2" color="text.secondary">
            Changes require formal approval from the Organization Budget Approver before additional
            work or cost can be authorized.
          </Typography>

          <TextField
            label="Change Reason"
            multiline
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            error={Boolean(errors.reason)}
            helperText={errors.reason}
            fullWidth
            required
            placeholder="e.g. Hidden corroded beam section discovered during weld removal"
          />

          <TextField
            label="Proposed Cost Delta"
            type="number"
            value={proposedDelta}
            onChange={(e) => setProposedDelta(e.target.value)}
            error={Boolean(errors.proposedDelta)}
            helperText={errors.proposedDelta || 'Positive for increased budget, negative for reduced'}
            fullWidth
            size="small"
            required
          />

          <TextField
            label="Affected Tasks"
            value={affectedTasks}
            onChange={(e) => setAffectedTasks(e.target.value)}
            fullWidth
            size="small"
            placeholder="e.g. Task #1, Task #3"
          />

          <TextField
            label="Supporting Evidence Reference"
            value={supportingEvidence}
            onChange={(e) => setSupportingEvidence(e.target.value)}
            fullWidth
            size="small"
            placeholder="e.g. Supplier quotation ref #QUO-8891"
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={changeMutation.isPending}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={changeMutation.isPending}
        >
          {changeMutation.isPending ? 'Submitting...' : 'Submit Proposal'}
        </Button>
      </DialogActions>
    </form>
  );
}
