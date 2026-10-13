import { useState, type SyntheticEvent } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material';
import { MutationProblemAlert } from '@/shared/ui/MutationProblemAlert';
import type { WorkforceCredential, ReviewWorkforceCredentialInput } from '../api/workforceApi';

interface Props {
  credential: WorkforceCredential;
  pending: boolean;
  isError: boolean;
  error: unknown;
  onClose: () => void;
  onSubmit: (input: ReviewWorkforceCredentialInput) => void;
}

export function ReviewCredentialDialog({ credential, pending, isError, error, onClose, onSubmit }: Props) {
  const [reason, setReason] = useState('');
  const [errorText, setErrorText] = useState('');
  const submit = (event: SyntheticEvent, decision: ReviewWorkforceCredentialInput['decision']) => {
    event.preventDefault();
    if (pending) return;
    if (!reason.trim()) {
      setErrorText('Enter a review reason.');
      return;
    }
    setErrorText('');
    onSubmit({ decision, reason: reason.trim() });
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <form>
        <DialogTitle>Review credential</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2">{credential.credentialType} · {credential.status}</Typography>
            <Typography variant="caption" color="text.secondary">This is an internal review of the record and submitted information; it does not verify the credential with an external authority.</Typography>
            <MutationProblemAlert isError={isError} error={error} fallbackMessage="Could not review this credential." />
            <TextField required multiline minRows={2} label="Reason" value={reason} onChange={(event) => setReason(event.target.value)} />
            {errorText && <Typography role="alert" color="error">{errorText}</Typography>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button disabled={pending} onClick={(event) => void submit(event, 'REJECT')}>Reject</Button>
          <Button disabled={pending} variant="contained" onClick={(event) => void submit(event, 'APPROVE')}>Approve</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
