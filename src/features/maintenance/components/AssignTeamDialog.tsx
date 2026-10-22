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
import { useWorkforceUsers } from '@/features/workforce/hooks/useWorkforce';
import { MutationProblemAlert } from '@/shared/ui/MutationProblemAlert';
import { useAssignTeam } from '../hooks/useMaintenance';
import type { WorkOrder } from '../api/maintenanceApi';

interface AssignTeamDialogProps {
  workOrder: WorkOrder | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AssignTeamDialog({
  workOrder,
  open,
  onClose,
  onSuccess,
}: AssignTeamDialogProps) {
  if (!open || !workOrder) return null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <AssignTeamForm
        workOrder={workOrder}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </Dialog>
  );
}

function AssignTeamForm({
  workOrder,
  onClose,
  onSuccess,
}: {
  workOrder: WorkOrder;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const { data: users = [] } = useWorkforceUsers();
  const assignTeamMutation = useAssignTeam();

  const engineers = users.filter(
    (u) => u.roles.includes('MAINTENANCE_ENGINEER') && u.status === 'ACTIVE',
  );
  const reviewers = users.filter(
    (u) => u.roles.includes('ORG_ADMIN') && u.status === 'ACTIVE',
  );

  const [leadUserId, setLeadUserId] = useState(workOrder.teamLeadUserId ?? '');
  const [reportAuthorUserId, setReportAuthorUserId] = useState(
    workOrder.reportAuthorUserId ?? '',
  );
  const [acceptingReviewerUserId, setAcceptingReviewerUserId] = useState(
    workOrder.acceptingReviewerUserId ?? '',
  );
  const [reason, setReason] = useState('Qualified internal maintenance team');
  const [errors, setErrors] = useState<{
    leadUserId?: string;
    reportAuthorUserId?: string;
    acceptingReviewerUserId?: string;
  }>({});

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (assignTeamMutation.isPending) return;

    const nextErrors: typeof errors = {};
    if (!leadUserId) nextErrors.leadUserId = 'Please select a Team Lead.';
    if (!reportAuthorUserId) nextErrors.reportAuthorUserId = 'Please select a Report Author.';
    if (!acceptingReviewerUserId)
      nextErrors.acceptingReviewerUserId = 'Please select an Independent Reviewer.';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      await assignTeamMutation.mutateAsync({
        workOrderId: workOrder.id,
        input: {
          leadUserId,
          reportAuthorUserId,
          acceptingReviewerUserId,
          reason,
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
      <DialogTitle sx={{ fontWeight: 700 }}>Designate Repair Team</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <MutationProblemAlert
            error={assignTeamMutation.error}
            isError={assignTeamMutation.isError}
          />

          <Typography variant="body2" color="text.secondary">
            Assign qualified personnel for work order <b>{workOrder.id.substring(0, 8)}...</b>.
            The independent reviewer must not be on the executing team.
          </Typography>

          {engineers.length > 0 ? (
            <TextField
              select
              label="Repair Team Lead"
              value={leadUserId}
              onChange={(e) => setLeadUserId(e.target.value)}
              error={Boolean(errors.leadUserId)}
              helperText={errors.leadUserId}
              fullWidth
              size="small"
              required
            >
              {engineers.map((eng) => (
                <MenuItem key={eng.userId} value={eng.userId}>
                  {eng.fullName} ({eng.email})
                </MenuItem>
              ))}
            </TextField>
          ) : (
            <TextField
              label="Repair Team Lead User ID"
              value={leadUserId}
              onChange={(e) => setLeadUserId(e.target.value)}
              error={Boolean(errors.leadUserId)}
              helperText={errors.leadUserId || 'Enter UUID of qualified engineer'}
              fullWidth
              size="small"
              required
            />
          )}

          {engineers.length > 0 ? (
            <TextField
              select
              label="Accountable Report Author"
              value={reportAuthorUserId}
              onChange={(e) => setReportAuthorUserId(e.target.value)}
              error={Boolean(errors.reportAuthorUserId)}
              helperText={errors.reportAuthorUserId}
              fullWidth
              size="small"
              required
            >
              {engineers.map((eng) => (
                <MenuItem key={eng.userId} value={eng.userId}>
                  {eng.fullName} ({eng.email})
                </MenuItem>
              ))}
            </TextField>
          ) : (
            <TextField
              label="Accountable Report Author User ID"
              value={reportAuthorUserId}
              onChange={(e) => setReportAuthorUserId(e.target.value)}
              error={Boolean(errors.reportAuthorUserId)}
              helperText={errors.reportAuthorUserId || 'Enter UUID of report author engineer'}
              fullWidth
              size="small"
              required
            />
          )}

          {reviewers.length > 0 ? (
            <TextField
              select
              label="Independent Accepting Reviewer"
              value={acceptingReviewerUserId}
              onChange={(e) => setAcceptingReviewerUserId(e.target.value)}
              error={Boolean(errors.acceptingReviewerUserId)}
              helperText={errors.acceptingReviewerUserId}
              fullWidth
              size="small"
              required
            >
              {reviewers.map((rev) => (
                <MenuItem key={rev.userId} value={rev.userId}>
                  {rev.fullName} ({rev.email})
                </MenuItem>
              ))}
            </TextField>
          ) : (
            <TextField
              label="Independent Accepting Reviewer User ID"
              value={acceptingReviewerUserId}
              onChange={(e) => setAcceptingReviewerUserId(e.target.value)}
              error={Boolean(errors.acceptingReviewerUserId)}
              helperText={errors.acceptingReviewerUserId || 'Enter UUID of independent admin'}
              fullWidth
              size="small"
              required
            />
          )}

          <TextField
            label="Designation Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            fullWidth
            size="small"
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={assignTeamMutation.isPending}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={assignTeamMutation.isPending}
        >
          {assignTeamMutation.isPending ? 'Assigning...' : 'Confirm Team'}
        </Button>
      </DialogActions>
    </form>
  );
}
