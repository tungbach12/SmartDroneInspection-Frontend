import { useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  useApproveMaintenanceQuotation,
  useCreateMaintenanceOrder,
  useRejectMaintenanceQuotation,
} from '../hooks/useMaintenance';
import type { MaintenanceQuotation } from '../api/maintenanceApi';

interface QuotationReviewModalProps {
  open: boolean;
  onClose: () => void;
  quotation: MaintenanceQuotation | null;
  isClient: boolean;
}

export function QuotationReviewModal({
  open,
  onClose,
  quotation,
  isClient,
}: QuotationReviewModalProps) {
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  const approveQuotation = useApproveMaintenanceQuotation();
  const createOrder = useCreateMaintenanceOrder();
  const rejectQuotation = useRejectMaintenanceQuotation();

  if (!quotation) return null;

  const handleApprove = async () => {
    await approveQuotation.mutateAsync(quotation.id);
    await createOrder.mutateAsync(quotation.id);
    onClose();
  };

  const handleReject = async () => {
    await rejectQuotation.mutateAsync({ id: quotation.id, reason: rejectReason });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Maintenance Quotation & Method Statement</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Alert severity="info">
            Direct transfer contract: No money is held by platform. Client pays Provider directly after completion acceptance.
          </Alert>

          <Typography variant="subtitle2" color="text.secondary">
            Quotation Version {quotation.versionNumber} ({quotation.status})
          </Typography>

          <Divider />

          <Typography variant="subtitle2" color="text.secondary">
            Technical Method Statement (Biện pháp kỹ thuật)
          </Typography>
          <Typography variant="body2">{quotation.scopeSnapshot}</Typography>

          <Divider />

          <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
            <Typography variant="body1">Total Quotation Amount:</Typography>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              {quotation.totalAmount.toLocaleString()} {quotation.currency}
            </Typography>
          </Stack>

          <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">Committed Warranty Period:</Typography>
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
              {quotation.lockedWarrantyDays} days (Free rework obligation)
            </Typography>
          </Stack>

          <TextField
            label="Payment Terms"
            value={quotation.paymentTerms}
            slotProps={{ input: { readOnly: true } }}
            fullWidth
            size="small"
          />

          {showRejectInput && (
            <TextField
              label="Reason for Rejection"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              multiline
              rows={2}
              required
              fullWidth
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {isClient && quotation.status === 'SENT' && !showRejectInput && (
          <>
            <Button color="error" onClick={() => setShowRejectInput(true)}>
              Reject
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleApprove}
              disabled={approveQuotation.isPending || createOrder.isPending}
            >
              Approve & Establish Order
            </Button>
          </>
        )}
        {showRejectInput && (
          <Button
            variant="contained"
            color="error"
            onClick={handleReject}
            disabled={!rejectReason || rejectQuotation.isPending}
          >
            Confirm Rejection
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
