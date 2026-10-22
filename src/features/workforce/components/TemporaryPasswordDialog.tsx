import { useState } from 'react';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

interface TemporaryPasswordDialogProps {
  open: boolean;
  email: string;
  /** The one-time password. Held by the caller in component state only, never cached or persisted. */
  temporaryPassword: string;
  onClose: () => void;
}

/**
 * Shows a newly issued temporary password exactly once.
 *
 * This is the only surface that ever holds the credential. It is never copied into the query
 * cache, a store, or browser storage, and dismissing the dialog returns it to the server's control
 * for good — there is no way to read it back later, so the copy is the operator's only chance.
 */
export function TemporaryPasswordDialog({
  open,
  email,
  temporaryPassword,
  onClose,
}: TemporaryPasswordDialogProps) {
  const { t } = useLocale();
  // The copy acknowledgement is component state, and the caller unmounts this dialog when it
  // closes, so it starts fresh on the next issuance rather than inheriting a stale "Copied".
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(temporaryPassword);
      setCopied(true);
    } catch {
      // Clipboard access can be refused outright (insecure context, denied permission). The
      // password stays selectable on screen, so this is not worth an alert of its own.
      setCopied(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('Temporary password')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <DialogContentText component="div">
            {t('Share this one-time password with')} {email} through a channel you trust. It is shown once
            and cannot be retrieved again — if it is lost, reset the user&apos;s password instead of
            searching for a copy here.
          </DialogContentText>
          <TextField
            label={t('Temporary password')}
            value={temporaryPassword}
            fullWidth
            slotProps={{ htmlInput: { readOnly: true, 'aria-label': 'Temporary password' } }}
          />
          <Typography variant="caption" color="text.secondary">
            Delivering it by email is not recorded here: this screen cannot tell you whether a
            message was sent or received.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => void copy()}>{copied ? 'Copied' : 'Copy password'}</Button>
        <Button variant="contained" onClick={onClose}>
          {t('Done')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}