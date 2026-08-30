import { Alert, Snackbar } from '@mui/material';
import type { AlertColor } from '@mui/material';
import { create } from 'zustand';

interface ToastState {
  open: boolean;
  message: string;
  severity: AlertColor;
  showToast: (message: string, severity?: AlertColor) => void;
  hideToast: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  open: false,
  message: '',
  severity: 'success',
  showToast: (message, severity = 'success') =>
    set({ open: true, message, severity }),
  hideToast: () => set({ open: false }),
}));

export function ToastHost() {
  const { open, message, severity, hideToast } = useToastStore();

  return (
    <Snackbar
      open={open}
      autoHideDuration={4_000}
      onClose={hideToast}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      <Alert severity={severity} variant="filled" onClose={hideToast}>
        {message}
      </Alert>
    </Snackbar>
  );
}
