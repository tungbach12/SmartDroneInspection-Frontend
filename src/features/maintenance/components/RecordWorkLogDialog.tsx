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
import { useRecordWorkLog } from '../hooks/useMaintenance';
import type { MaintenanceTask } from '../api/maintenanceApi';

interface RecordWorkLogDialogProps {
  workOrderId: string;
  tasks?: MaintenanceTask[];
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function RecordWorkLogDialog({
  workOrderId,
  tasks = [],
  open,
  onClose,
  onSuccess,
}: RecordWorkLogDialogProps) {
  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <RecordWorkLogForm
        workOrderId={workOrderId}
        tasks={tasks}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </Dialog>
  );
}

function RecordWorkLogForm({
  workOrderId,
  tasks,
  onClose,
  onSuccess,
}: {
  workOrderId: string;
  tasks: MaintenanceTask[];
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const recordLogMutation = useRecordWorkLog();

  const [taskId, setTaskId] = useState(tasks[0]?.id ?? '');
  const [hours, setHours] = useState('1.0');
  const [asLeftCondition, setAsLeftCondition] = useState('');
  const [testReadings, setTestReadings] = useState('');
  const [errors, setErrors] = useState<{ taskId?: string; hours?: string }>({});

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (recordLogMutation.isPending) return;

    const nextErrors: typeof errors = {};
    if (!taskId) nextErrors.taskId = 'Please select a task.';
    const parsedHours = parseFloat(hours);
    if (isNaN(parsedHours) || parsedHours <= 0) {
      nextErrors.hours = 'Please enter a valid positive number of hours.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      await recordLogMutation.mutateAsync({
        workOrderId,
        input: {
          taskId,
          hours: parsedHours,
          startedAt: new Date(Date.now() - parsedHours * 3600000).toISOString(),
          endedAt: new Date().toISOString(),
          asLeftCondition: asLeftCondition.trim() || undefined,
          testReadings: testReadings.trim() || undefined,
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
      <DialogTitle sx={{ fontWeight: 700 }}>Record Work Log</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <MutationProblemAlert
            error={recordLogMutation.error}
            isError={recordLogMutation.isError}
          />

          <Typography variant="body2" color="text.secondary">
            Log hours, completed physical actions, and test measurements for the team.
          </Typography>

          {tasks.length > 0 ? (
            <TextField
              select
              label="Task"
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              error={Boolean(errors.taskId)}
              helperText={errors.taskId}
              fullWidth
              size="small"
              required
            >
              {tasks.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  #{t.taskNumber} — {t.name} ({t.status})
                </MenuItem>
              ))}
            </TextField>
          ) : (
            <TextField
              label="Task ID"
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              error={Boolean(errors.taskId)}
              helperText={errors.taskId || 'Enter task UUID'}
              fullWidth
              size="small"
              required
            />
          )}

          <TextField
            label="Hours Worked"
            type="number"
            inputProps={{ step: '0.25', min: '0.25' }}
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            error={Boolean(errors.hours)}
            helperText={errors.hours}
            fullWidth
            size="small"
            required
          />

          <TextField
            label="As-Left Condition"
            multiline
            rows={2}
            value={asLeftCondition}
            onChange={(e) => setAsLeftCondition(e.target.value)}
            fullWidth
            placeholder="Observed physical condition of the component upon leaving"
          />

          <TextField
            label="Test Readings & Technical Observations"
            multiline
            rows={2}
            value={testReadings}
            onChange={(e) => setTestReadings(e.target.value)}
            fullWidth
            placeholder="e.g. Ultrasonic density reading: 2.45 g/cm3, 100% sound bond"
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={recordLogMutation.isPending}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={recordLogMutation.isPending}
        >
          {recordLogMutation.isPending ? 'Submitting...' : 'Submit Log'}
        </Button>
      </DialogActions>
    </form>
  );
}
