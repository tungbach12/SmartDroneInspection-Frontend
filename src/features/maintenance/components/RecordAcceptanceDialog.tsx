import { useState, type FormEvent } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { MutationProblemAlert } from '@/shared/ui/MutationProblemAlert';
import { useRecordAcceptance } from '../hooks/useMaintenance';
import type { AcceptanceDecisionKind, WorkOrder } from '../api/maintenanceApi';

const DECISIONS: { value: AcceptanceDecisionKind; label: string }[] = [
  { value: 'ACCEPTED', label: 'Accept — Work completed to specification' },
  { value: 'REWORK_REQUIRED', label: 'Return for Rework — Deficiencies must be corrected' },
  {
    value: 'REINSPECTION_REQUIRED',
    label: 'Request Re-inspection — Independent drone verification required',
  },
];

interface RecordAcceptanceDialogProps {
  workOrder: WorkOrder | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function RecordAcceptanceDialog({
  workOrder,
  open,
  onClose,
  onSuccess,
}: RecordAcceptanceDialogProps) {
  if (!open || !workOrder) return null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <RecordAcceptanceForm
        workOrder={workOrder}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </Dialog>
  );
}

function RecordAcceptanceForm({
  workOrder,
  onClose,
  onSuccess,
}: {
  workOrder: WorkOrder;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const acceptanceMutation = useRecordAcceptance();

  const [decision, setDecision] = useState<AcceptanceDecisionKind>('ACCEPTED');
  const [technicalComments, setTechnicalComments] = useState('');
  const [signatureReference, setSignatureReference] = useState('');
  const [errors, setErrors] = useState<{ technicalComments?: string }>({});

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (acceptanceMutation.isPending) return;

    if (decision !== 'ACCEPTED' && !technicalComments.trim()) {
      setErrors({ technicalComments: 'Technical comments are required when returning for rework or re-inspection.' });
      return;
    }
    setErrors({});

    try {
      await acceptanceMutation.mutateAsync({
        workOrderId: workOrder.id,
        input: {
          decision,
          technicalComments: technicalComments.trim() || undefined,
          signatureReference: signatureReference.trim() || undefined,
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
      <DialogTitle sx={{ fontWeight: 700 }}>Record Acceptance Decision</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <MutationProblemAlert
            error={acceptanceMutation.error}
            isError={acceptanceMutation.isError}
          />

          <Typography variant="body2" color="text.secondary">
            Independent technical review for work order <b>{workOrder.id.substring(0, 8)}...</b>.
            The executing team cannot review its own work.
          </Typography>

          <TextField
            select
            label="Acceptance Decision"
            value={decision}
            onChange={(e) => setDecision(e.target.value as AcceptanceDecisionKind)}
            fullWidth
            size="small"
            required
          >
            {DECISIONS.map((d) => (
              <MenuItem key={d.value} value={d.value}>
                {d.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Technical Comments"
            multiline
            rows={3}
            value={technicalComments}
            onChange={(e) => setTechnicalComments(e.target.value)}
            error={Boolean(errors.technicalComments)}
            helperText={errors.technicalComments}
            fullWidth
            required={decision !== 'ACCEPTED'}
            placeholder="Review observations, residual defect notes, or reasons for return"
          />

          <TextField
            label="Signature / Document Reference"
            value={signatureReference}
            onChange={(e) => setSignatureReference(e.target.value)}
            fullWidth
            size="small"
            placeholder="e.g. SIG-REVIEW-2026-001"
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={acceptanceMutation.isPending}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          color={decision === 'ACCEPTED' ? 'success' : 'warning'}
          disabled={acceptanceMutation.isPending}
        >
          {acceptanceMutation.isPending ? 'Recording...' : 'Submit Decision'}
        </Button>
      </DialogActions>
    </form>
  );
}
