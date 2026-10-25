import { useState, type FormEvent } from 'react';
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { MutationProblemAlert, RefusalNotice } from '@/shared/ui/MutationProblemAlert';
import { getErrorMessage } from '@/shared/api/errorMessage';
import { isConflict } from '@/shared/api/problem';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import {
  GRANTABLE_WORKFORCE_ROLES,
  type GrantableWorkforceRole,
  type ProvisionWorkforceUserInput,
} from '../api/workforceApi';

const ROLE_LABELS: Record<GrantableWorkforceRole, string> = {
  INSPECTOR: 'Inspector',
  MAINTENANCE_ENGINEER: 'Maintenance engineer',
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ProvisionWorkforceUserDialogProps {
  pending: boolean;
  error?: unknown;
  isError?: boolean;
  onClose: () => void;
  onSubmit: (input: ProvisionWorkforceUserInput) => void;
}

/**
 * Collects the fields needed to create one workforce member.
 *
 * The organization is not a field: the server scopes the new account to the authenticated ORG_MANAGER,
 * so offering one here would suggest a capability the client does not have. Role choices are limited
 * to the two grantable workforce roles rather than to the whole platform role vocabulary.
 */
export function ProvisionWorkforceUserDialog(props: ProvisionWorkforceUserDialogProps) {
  // The draft is this component's own state and the page mounts it only while the dialog is open.
  // That is what clears a draft: closing removes the component, so the next dialog starts empty —
  // and a submission that fails leaves the component mounted, preserving what was typed so the
  // address or name can be corrected instead of re-entered.
  return (
    <Dialog open onClose={props.onClose} fullWidth maxWidth="sm">
      <ProvisionForm {...props} />
    </Dialog>
  );
}

function ProvisionForm({
  pending,
  error,
  isError = false,
  onClose,
  onSubmit,
}: ProvisionWorkforceUserDialogProps) {
  const { t } = useLocale();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [roles, setRoles] = useState<GrantableWorkforceRole[]>([]);
  const [errors, setErrors] = useState<{ email?: string; fullName?: string; roles?: string }>({});

  const submit = (event: FormEvent) => {
    event.preventDefault();

    // A disabled submit button is not a complete guard on its own: a form can also be submitted with
    // Enter from a text field, and that path never consults the button. Provisioning is not
    // idempotent — it creates an account and issues a credential — so the in-flight check has to
    // live here rather than only in the button.
    if (pending) {
      return;
    }

    const nextErrors: typeof errors = {};
    const trimmedEmail = email.trim();
    const trimmedName = fullName.trim();
    if (trimmedEmail.length === 0) {
      nextErrors.email = 'Enter the email address.';
    } else if (!EMAIL_PATTERN.test(trimmedEmail) || trimmedEmail.length > 320) {
      nextErrors.email = 'Enter a valid email address.';
    }
    if (trimmedName.length === 0) {
      nextErrors.fullName = 'Enter the full name.';
    } else if (trimmedName.length > 200) {
      nextErrors.fullName = 'Name must be 200 characters or fewer.';
    }
    if (roles.length === 0) {
      nextErrors.roles = 'Select at least one role.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    onSubmit({ email: trimmedEmail, fullName: trimmedName, roles });
  };

  const toggleRole = (role: GrantableWorkforceRole, checked: boolean) => {
    setRoles((current) =>
      checked ? [...current, role] : current.filter((candidate) => candidate !== role),
    );
  };

  return (
    <form onSubmit={submit} noValidate>
      <DialogTitle>{t('Provision a workforce user')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {isError && isConflict(error) ? (
            <RefusalNotice
              reason={getErrorMessage(error, '')}
              fallbackMessage={t('This request conflicts with an existing workforce record.')}
              testId="provision-conflict"
            />
          ) : (
            <MutationProblemAlert
              isError={isError}
              error={error}
              fallbackMessage={t('Could not provision this workforce user.')}
            />
          )}
          <TextField
            required
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={Boolean(errors.email)}
            helperText={errors.email ?? 'The new user signs in with this address.'}
          />
          <TextField
            required
            label={t('Full name')}
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            error={Boolean(errors.fullName)}
            helperText={errors.fullName}
          />
          <Stack spacing={0.5}>
            <Typography variant="subtitle2">{t('Roles')}</Typography>
            {GRANTABLE_WORKFORCE_ROLES.map((role) => (
              <FormControlLabel
                key={role}
                control={
                  <Checkbox
                    checked={roles.includes(role)}
                    onChange={(event) => toggleRole(role, event.target.checked)}
                  />
                }
                label={ROLE_LABELS[role]}
              />
            ))}
            {Object.keys(errors).length > 0 && (
              <Typography variant="caption" color="error">
                {errors.roles}
              </Typography>
            )}
          </Stack>
          <Typography variant="caption" color="text.secondary">
            The new account belongs to your organization and is created with a temporary password you
            hand over yourself.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('Cancel')}</Button>
        <Button type="submit" variant="contained" disabled={pending}>
          {t('Create user')}
        </Button>
      </DialogActions>
    </form>
  );
}