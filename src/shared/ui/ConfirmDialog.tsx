import type { ReactNode } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: ReactNode;
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  severity?: 'default' | 'danger' | 'warning' | 'info';
  confirmColor?: 'primary' | 'error' | 'warning' | 'success';
  loading?: boolean;
  disabled?: boolean;
  maxWidth?: 'xs' | 'sm' | 'md';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  severity = 'default',
  confirmColor,
  loading = false,
  disabled = false,
  maxWidth = 'xs',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const resolvedColor =
    confirmColor ??
    (severity === 'danger' ? 'error' : severity === 'warning' ? 'warning' : 'primary');

  return (
    <Dialog open={open} onClose={loading ? undefined : onCancel} maxWidth={maxWidth} fullWidth>
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>{title}</DialogTitle>
      <DialogContent dividers>
        {message ? (
          typeof message === 'string' ? (
            <DialogContentText sx={{ my: 0.5 }}>{message}</DialogContentText>
          ) : (
            message
          )
        ) : null}
        {children}
      </DialogContent>
      <DialogActions sx={{ px: 2.5, py: 1.5 }}>
        <Button onClick={onCancel} color="inherit" sx={{ textTransform: 'none' }} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          onClick={onConfirm}
          color={resolvedColor}
          variant="contained"
          disabled={disabled || loading}
          sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
        >
          {loading ? `${confirmLabel}…` : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
