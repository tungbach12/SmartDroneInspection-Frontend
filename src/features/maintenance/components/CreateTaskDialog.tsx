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
import { useCreateTask } from '../hooks/useMaintenance';
import type { TeamMember } from '../api/maintenanceApi';

interface CreateTaskDialogProps {
  workOrderId: string;
  teamMembers?: TeamMember[];
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateTaskDialog({
  workOrderId,
  teamMembers = [],
  open,
  onClose,
  onSuccess,
}: CreateTaskDialogProps) {
  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <CreateTaskForm
        workOrderId={workOrderId}
        teamMembers={teamMembers}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </Dialog>
  );
}

function CreateTaskForm({
  workOrderId,
  teamMembers,
  onClose,
  onSuccess,
}: {
  workOrderId: string;
  teamMembers: TeamMember[];
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const createTaskMutation = useCreateTask();

  const [name, setName] = useState('');
  const [method, setMethod] = useState('');
  const [assignedEngineerUserId, setAssignedEngineerUserId] = useState('');
  const [acceptanceCriteria, setAcceptanceCriteria] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (createTaskMutation.isPending) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Task name is required.');
      return;
    }
    setError(null);

    try {
      await createTaskMutation.mutateAsync({
        workOrderId,
        input: {
          name: trimmedName,
          method: method.trim() || undefined,
          assignedEngineerUserId: assignedEngineerUserId || undefined,
          acceptanceCriteria: acceptanceCriteria.trim() || undefined,
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
      <DialogTitle sx={{ fontWeight: 700 }}>Add Maintenance Task</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <MutationProblemAlert
            error={createTaskMutation.error}
            isError={createTaskMutation.isError}
          />

          <Typography variant="body2" color="text.secondary">
            Divide the approved corrective scope into concrete tasks for the repair team.
          </Typography>

          <TextField
            label="Task Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={Boolean(error)}
            helperText={error}
            fullWidth
            required
            size="small"
            placeholder="e.g. Surface cleaning and weld preparation"
          />

          <TextField
            label="Method / Procedure"
            multiline
            rows={2}
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            fullWidth
            placeholder="Technical method or equipment to be used"
          />

          {teamMembers.length > 0 ? (
            <TextField
              select
              label="Assigned Engineer"
              value={assignedEngineerUserId}
              onChange={(e) => setAssignedEngineerUserId(e.target.value)}
              fullWidth
              size="small"
            >
              <MenuItem value="">Unassigned</MenuItem>
              {teamMembers.map((m) => (
                <MenuItem key={m.id} value={m.engineerUserId}>
                  {m.engineerUserId} ({m.memberRole})
                </MenuItem>
              ))}
            </TextField>
          ) : (
            <TextField
              label="Assigned Engineer User ID"
              value={assignedEngineerUserId}
              onChange={(e) => setAssignedEngineerUserId(e.target.value)}
              fullWidth
              size="small"
              placeholder="Optional: enter engineer UUID"
            />
          )}

          <TextField
            label="Acceptance Criteria"
            multiline
            rows={2}
            value={acceptanceCriteria}
            onChange={(e) => setAcceptanceCriteria(e.target.value)}
            fullWidth
            placeholder="Verification criteria for this specific task"
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={createTaskMutation.isPending}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={createTaskMutation.isPending}
        >
          {createTaskMutation.isPending ? 'Adding...' : 'Add Task'}
        </Button>
      </DialogActions>
    </form>
  );
}
