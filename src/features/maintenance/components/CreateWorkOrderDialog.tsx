import { useState, type FormEvent, useEffect } from 'react';
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
import { useAuthStore } from '@/features/auth/store/authStore';
import { MutationProblemAlert } from '@/shared/ui/MutationProblemAlert';
import { useCreateWorkOrder } from '../hooks/useMaintenance';
import type {
  MaintenancePriority,
  RepairCandidate,
  WorkOrder,
} from '../api/maintenanceApi';

const PRIORITIES: MaintenancePriority[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

interface CreateWorkOrderDialogProps {
  candidate: RepairCandidate | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: (order: WorkOrder) => void;
}

export function CreateWorkOrderDialog({
  candidate,
  open,
  onClose,
  onSuccess,
}: CreateWorkOrderDialogProps) {
  if (!open || !candidate) return null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <CreateWorkOrderForm
        candidate={candidate}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </Dialog>
  );
}

function CreateWorkOrderForm({
  candidate,
  onClose,
  onSuccess,
}: {
  candidate: RepairCandidate;
  onClose: () => void;
  onSuccess?: (order: WorkOrder) => void;
}) {
  const currentUserId = useAuthStore((state) => state.user?.id) ?? '';
  const createMutation = useCreateWorkOrder();

  const [priority, setPriority] = useState<MaintenancePriority>(
    candidate.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
  );
  const [correctiveScope, setCorrectiveScope] = useState(
    candidate.recommendedAction ? `Repair: ${candidate.recommendedAction}` : '',
  );
  const [acceptanceCriteria, setAcceptanceCriteria] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [errors, setErrors] = useState<{ correctiveScope?: string }>({});

  useEffect(() => {
    if (candidate.recommendedAction) {
      setCorrectiveScope(`Repair: ${candidate.recommendedAction}`);
    }
  }, [candidate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (createMutation.isPending) return;

    const trimmedScope = correctiveScope.trim();
    if (!trimmedScope) {
      setErrors({ correctiveScope: 'Corrective scope is required.' });
      return;
    }
    setErrors({});

    try {
      const order = await createMutation.mutateAsync({
        assetId: candidate.assetId,
        sourceReportVersionId: candidate.reportVersionId,
        sourceFindingId: candidate.findingId,
        budgetApproverUserId: currentUserId,
        priority,
        correctiveScope: trimmedScope,
        acceptanceCriteria: acceptanceCriteria.trim() || undefined,
        dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
      });

      onSuccess?.(order);
      onClose();
    } catch {
      // Handled by MutationProblemAlert
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogTitle sx={{ fontWeight: 700 }}>Open Maintenance Work Order</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <MutationProblemAlert
            error={createMutation.error}
            isError={createMutation.isError}
          />

          <Typography variant="body2" color="text.secondary">
            Creating work order for finding <b>{candidate.findingCode}</b>: {candidate.defectLabel}
          </Typography>

          <TextField
            select
            label="Priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as MaintenancePriority)}
            fullWidth
            size="small"
          >
            {PRIORITIES.map((p) => (
              <MenuItem key={p} value={p}>
                {p}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Corrective Scope"
            multiline
            rows={3}
            value={correctiveScope}
            onChange={(e) => setCorrectiveScope(e.target.value)}
            error={Boolean(errors.correctiveScope)}
            helperText={errors.correctiveScope}
            fullWidth
            required
            placeholder="Describe the required repair scope, methods, and constraints"
          />

          <TextField
            label="Acceptance Criteria"
            multiline
            rows={2}
            value={acceptanceCriteria}
            onChange={(e) => setAcceptanceCriteria(e.target.value)}
            fullWidth
            placeholder="Technical conditions that must be verified before acceptance"
          />

          <TextField
            label="Target Due Date"
            type="date"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
            size="small"
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={createMutation.isPending}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? 'Opening...' : 'Open Work Order'}
        </Button>
      </DialogActions>
    </form>
  );
}
