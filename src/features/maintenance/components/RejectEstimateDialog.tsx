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
import { useRejectEstimate } from '../hooks/useMaintenance';

interface RejectEstimateDialogProps {
  workOrderId: string;
  versionNo: number;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function RejectEstimateDialog({
  workOrderId,
  versionNo,
  open,
  onClose,
  onSuccess,
}: RejectEstimateDialogProps) {
  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <RejectEstimateForm
        workOrderId={workOrderId}
        versionNo={versionNo}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </Dialog>
  );
}

function RejectEstimateForm({
  workOrderId,
  versionNo,
  onClose,
  onSuccess,
}: {
  workOrderId: string;
  versionNo: number;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const rejectMutation = useRejectEstimate();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (rejectMutation.isPending) return;

    const trimmed = reason.trim();
    if (!trimmed) {
      setError('Please provide a reason for returning the estimate.');
      return;
    }
    setError(null);

    try {
      await rejectMutation.mutateAsync({
        workOrderId,
        versionNo,
        reason: trimmed,
      });
      onSuccess?.();
      onClose();
    } catch {
      // Handled by MutationProblemAlert
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogTitle sx={{ fontWeight: 700 }}>Return Estimate for Rework</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <MutationProblemAlert
            error={rejectMutation.error}
            isError={rejectMutation.isError}
          />

          <Typography variant="body2" color="text.secondary">
            State the corrections required for estimate version v{versionNo}.
          </Typography>

          <TextField
            label="Return Reason"
            multiline
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            error={Boolean(error)}
            helperText={error}
            fullWidth
            required
            placeholder="e.g. Rate exceeds standard allocation; add labor breakdown"
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={rejectMutation.isPending}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          color="warning"
          disabled={rejectMutation.isPending}
        >
          {rejectMutation.isPending ? 'Returning...' : 'Return for Rework'}
        </Button>
      </DialogActions>
    </form>
  );
}
