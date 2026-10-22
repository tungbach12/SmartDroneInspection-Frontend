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
import { useCreateAndSubmitReport } from '../hooks/useMaintenance';

interface CreateReportDialogProps {
  workOrderId: string;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateReportDialog({
  workOrderId,
  open,
  onClose,
  onSuccess,
}: CreateReportDialogProps) {
  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <CreateReportForm
        workOrderId={workOrderId}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </Dialog>
  );
}

function CreateReportForm({
  workOrderId,
  onClose,
  onSuccess,
}: {
  workOrderId: string;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const reportMutation = useCreateAndSubmitReport();

  const [summary, setSummary] = useState('');
  const [residualIssues, setResidualIssues] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (reportMutation.isPending) return;

    const trimmedSummary = summary.trim();
    if (!trimmedSummary) {
      setError('Completion summary narrative is required.');
      return;
    }
    setError(null);

    const snapshot = JSON.stringify({
      summary: trimmedSummary,
      residualIssues: residualIssues.trim() || 'None',
      submittedAt: new Date().toISOString(),
    });

    try {
      await reportMutation.mutateAsync({
        workOrderId,
        input: {
          contentSnapshot: snapshot,
          approvedScopeHash: 'scope-snapshot-verified',
          workLogSnapshotHash: 'worklog-snapshot-verified',
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
      <DialogTitle sx={{ fontWeight: 700 }}>Author &amp; Submit Completion Report</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <MutationProblemAlert
            error={reportMutation.error}
            isError={reportMutation.isError}
          />

          <Typography variant="body2" color="text.secondary">
            As the designated report author, verify the team's work logs and compile the final
            completion narrative for independent acceptance.
          </Typography>

          <TextField
            label="Executive Summary of Completed Work"
            multiline
            rows={4}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            error={Boolean(error)}
            helperText={error}
            fullWidth
            required
            placeholder="Summarize physical work performed, parts installed, and observed as-left condition"
          />

          <TextField
            label="Residual Issues &amp; Follow-up Recommendations"
            multiline
            rows={2}
            value={residualIssues}
            onChange={(e) => setResidualIssues(e.target.value)}
            fullWidth
            placeholder="Document any residual restrictions, monitoring needs, or warranty terms"
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={reportMutation.isPending}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={reportMutation.isPending}
        >
          {reportMutation.isPending ? 'Submitting...' : 'Sign & Submit for Acceptance'}
        </Button>
      </DialogActions>
    </form>
  );
}
