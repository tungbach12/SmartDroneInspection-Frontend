import { useState, type FormEvent } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { MutationProblemAlert } from '@/shared/ui/MutationProblemAlert';
import type { CreateWorkforceCredentialInput, WorkforceUser } from '../api/workforceApi';
import { useLocale } from '@/shared/i18n/LocaleProvider';

interface Props {
  users: WorkforceUser[];
  pending: boolean;
  isError: boolean;
  error: unknown;
  onClose: () => void;
  onSubmit: (input: CreateWorkforceCredentialInput) => void;
}

export function CreateCredentialDialog({ users, pending, isError, error, onClose, onSubmit }: Props) {
  const { t } = useLocale();
  const [userId, setUserId] = useState('');
  const [credentialType, setCredentialType] = useState('');
  const [issuer, setIssuer] = useState('');
  const [credentialReference, setCredentialReference] = useState('');
  const [evidenceId, setEvidenceId] = useState('');
  const [issuedAt, setIssuedAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [errorText, setErrorText] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;
    if (!userId || !credentialType.trim()) {
      setErrorText('Select a workforce user and enter a credential type.');
      return;
    }
    const issued = issuedAt ? new Date(issuedAt) : undefined;
    const expires = expiresAt ? new Date(expiresAt) : undefined;
    if (issued && expires && expires <= issued) {
      setErrorText('Expiry must be after the issue date.');
      return;
    }
    setErrorText('');
    onSubmit({
      userId,
      credentialType: credentialType.trim(),
      ...(issuer.trim() ? { issuer: issuer.trim() } : {}),
      ...(credentialReference.trim() ? { credentialReference: credentialReference.trim() } : {}),
      ...(issued ? { issuedAt: issued } : {}),
      ...(expires ? { expiresAt: expires } : {}),
      ...(evidenceId.trim() ? { evidenceId: evidenceId.trim() } : {}),
    });
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <form onSubmit={submit} noValidate>
        <DialogTitle>{t('Add credential')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <MutationProblemAlert isError={isError} error={error} fallbackMessage={t('Could not create this credential.')} />
            <TextField select required label={t('Workforce user')} value={userId} onChange={(event) => setUserId(event.target.value)}>
              {users.map((user) => <MenuItem key={user.userId} value={user.userId}>{user.fullName} · {user.email}</MenuItem>)}
            </TextField>
            <TextField required label={t('Credential type')} value={credentialType} onChange={(event) => setCredentialType(event.target.value)} />
            <TextField label={t('Issuer (optional)')} value={issuer} onChange={(event) => setIssuer(event.target.value)} />
            <TextField label={t('Credential reference (optional)')} value={credentialReference} onChange={(event) => setCredentialReference(event.target.value)} />
            <TextField label={t('Issued at')} type="datetime-local" value={issuedAt} onChange={(event) => setIssuedAt(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField label={t('Expires at')} type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField label={t('Evidence ID (optional)')} value={evidenceId} onChange={(event) => setEvidenceId(event.target.value)} helperText={t('Enter an existing evidence reference; this form does not upload or select files.')} />
            {errorText && <Typography role="alert" color="error">{errorText}</Typography>}
            <Typography variant="caption" color="text.secondary">{t('Expiry dates are recorded reminders, not government or external verification.')}</Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="contained" disabled={pending}>{t('Create credential')}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
