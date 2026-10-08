import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import { useCreateMaintenanceTicket } from '../hooks/useMaintenance';

interface CreateTicketModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateTicketModal({ open, onClose }: CreateTicketModalProps) {
  const [assetId, setAssetId] = useState('');
  const [reportVersionId, setReportVersionId] = useState('');
  const [findingIdsText, setFindingIdsText] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
  const [deadline, setDeadline] = useState('');
  const [instructions, setInstructions] = useState('');

  const createTicket = useCreateMaintenanceTicket();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const findingIds = findingIdsText
      .split(/[,\n]/)
      .map((id) => id.trim())
      .filter(Boolean);

    await createTicket.mutateAsync({
      assetId,
      acceptedReportVersionId: reportVersionId,
      findingIds,
      priority,
      preferredDeadline: deadline ? new Date(deadline).toISOString() : null,
      instructions: instructions || null,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Create Maintenance Ticket from Drone Findings</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Asset ID"
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              required
              fullWidth
            />
            <TextField
              label="Accepted Report Version ID"
              value={reportVersionId}
              onChange={(e) => setReportVersionId(e.target.value)}
              required
              fullWidth
              helperText="Must be from an accepted drone inspection report"
            />
            <TextField
              label="Verified Finding IDs"
              value={findingIdsText}
              onChange={(e) => setFindingIdsText(e.target.value)}
              required
              fullWidth
              multiline
              rows={2}
              helperText="Enter defect finding IDs (one per line or comma-separated)"
            />
            <TextField
              select
              label="Priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as typeof priority)}
              fullWidth
            >
              <MenuItem value="LOW">Low</MenuItem>
              <MenuItem value="NORMAL">Normal</MenuItem>
              <MenuItem value="HIGH">High</MenuItem>
              <MenuItem value="URGENT">Urgent</MenuItem>
            </TextField>
            <TextField
              type="date"
              label="Preferred Deadline"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
            <TextField
              label="Maintenance Instructions / SOW"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              multiline
              rows={3}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={createTicket.isPending}>
            {createTicket.isPending ? 'Creating…' : 'Submit Ticket'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
