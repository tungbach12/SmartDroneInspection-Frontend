import { useState } from 'react';
import { PersonAddAlt } from '@mui/icons-material';
import {
  Box,
  Button,
  Alert,
  Tab,
  Tabs,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Typography,
} from '@mui/material';
import { DataTable, type DataTableColumn } from '@/shared/ui/DataTable';
import { EmptyState } from '@/shared/ui/EmptyState';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import { MutationProblemAlert, RefusalNotice } from '@/shared/ui/MutationProblemAlert';
import { getErrorMessage } from '@/shared/api/errorMessage';
import { isConflict } from '@/shared/api/problem';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryState } from '@/shared/ui/QueryState';
import { StatusChip } from '@/shared/ui/StatusChip';
import { ProvisionWorkforceUserDialog } from '../components/ProvisionWorkforceUserDialog';
import { TemporaryPasswordDialog } from '../components/TemporaryPasswordDialog';
import { CreateCredentialDialog } from '../components/CreateCredentialDialog';
import { ReviewCredentialDialog } from '../components/ReviewCredentialDialog';
import {
  GRANTABLE_WORKFORCE_ROLES,
  type GrantableWorkforceRole,
  type CreateWorkforceCredentialInput,
  type ProvisionWorkforceUserInput,
  type WorkforceCredential,
  type WorkforceUser,
  type WorkforceUserStatus,
} from '../api/workforceApi';
import {
  useCreateWorkforceCredential,
  useProvisionWorkforceUser,
  useReviewWorkforceCredential,
  useWorkforceCredentials,
  useUpdateWorkforceUserRoles,
  useUpdateWorkforceUserStatus,
  useWorkforceUsers,
} from '../hooks/useWorkforce';

const ROLE_LABELS: Record<GrantableWorkforceRole, string> = {
  INSPECTOR: 'Inspector',
  MAINTENANCE_ENGINEER: 'Maintenance engineer',
};

/** The one status change the list offers: an active member can be suspended, and back again. */
const TOGGLED_STATUS: Record<string, WorkforceUserStatus> = {
  ACTIVE: 'SUSPENDED',
  SUSPENDED: 'ACTIVE',
};

/**
 * The one-time temporary password of a freshly provisioned member.
 *
 * It exists only here, in this component's state, for as long as the dialog is open. It is never
 * placed in the query cache, a store, or browser storage — dropping it when the dialog closes or the
 * page unmounts is what makes "shown once" true rather than merely described.
 */
interface IssuedCredential {
  email: string;
  temporaryPassword: string;
}

export default function WorkforcePage() {
  const { data: members, isLoading, error, refetch } = useWorkforceUsers();
  const [issued, setIssued] = useState<IssuedCredential | null>(null);
  const credentialQuery = useWorkforceCredentials();
  const createCredential = useCreateWorkforceCredential();
  const reviewCredential = useReviewWorkforceCredential();
  const [tab, setTab] = useState(0);
  const [credentialOpen, setCredentialOpen] = useState(false);
  const [reviewingCredential, setReviewingCredential] = useState<WorkforceCredential | null>(null);
  const provision = useProvisionWorkforceUser((created) => {
    // Keep the one-time password only in local component state; the mutation result itself is
    // sanitized to the user projection before TanStack stores it in MutationCache.
    setIssued({ email: created.user.email, temporaryPassword: created.temporaryPassword });
  });
  const updateStatus = useUpdateWorkforceUserStatus();
  const updateRoles = useUpdateWorkforceUserRoles();

  const [provisionOpen, setProvisionOpen] = useState(false);
  const [editingRoles, setEditingRoles] = useState<WorkforceUser | null>(null);

  const provisionButton = (
    <Button variant="contained" startIcon={<PersonAddAlt />} onClick={() => setProvisionOpen(true)}>
      Provision user
    </Button>
  );

  const columns: DataTableColumn<WorkforceUser>[] = [
    { id: 'name', label: 'Name', render: (member) => member.fullName },
    { id: 'email', label: 'Email', render: (member) => member.email },
    {
      id: 'roles',
      label: 'Roles',
      render: (member) => member.roles.join(', ') || '—',
    },
    {
      id: 'status',
      label: 'Status',
      width: 140,
      render: (member) => <StatusChip status={member.status} />,
    },
    {
      id: 'actions',
      label: '',
      width: 220,
      render: (member) => {
        const nextStatus = TOGGLED_STATUS[member.status];
        return (
          <Stack direction="row" spacing={1}>
            <Button size="small" onClick={() => setEditingRoles(member)}>
              Edit roles
            </Button>
            {nextStatus && (
              <Button
                size="small"
                disabled={updateStatus.isPending}
                onClick={() =>
                  updateStatus.mutate({ userId: member.userId, status: nextStatus })
                }
              >
                {nextStatus === 'SUSPENDED' ? 'Suspend user' : 'Activate user'}
              </Button>
            )}
          </Stack>
        );
      },
    },
  ];

  return (
    <Box className="workspace-page workspace-page--workforce">
      <PageHeader
        title="Workforce"
        subtitle="Inspectors and maintenance engineers in your organization"
        actions={provisionButton}
      />

      <MutationProblemAlert
        isError={updateStatus.isError}
        error={updateStatus.error}
        fallbackMessage="Could not update this workforce user."
      />

      <Tabs value={tab} onChange={(_event, value: number) => setTab(value)} aria-label="Workforce management">
        <Tab label="Users" />
        <Tab label="Credentials" />
      </Tabs>

      {tab === 0 && <QueryState
        isLoading={isLoading}
        error={error}
        onRetry={() => void refetch()}
        isEmpty={Boolean(members && members.length === 0)}
        empty={
          <EmptyState
            title="No workforce users yet"
            description="Provision an inspector or maintenance engineer to assign inspection and maintenance work."
            action={provisionButton}
          />
        }
      >
        <DataTable
          columns={columns}
          rows={members ?? []}
          rowKey={(member) => member.userId}
          searchable
          searchPlaceholder="Search by name or email…"
          searchPredicate={(member, query) =>
            member.fullName.toLowerCase().includes(query) ||
            member.email.toLowerCase().includes(query)
          }
        />
      </QueryState>}

      {tab === 1 && (
        <Stack spacing={2} sx={{ mt: 2 }}>
          <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              disabled={isLoading || Boolean(error) || !members?.length}
              onClick={() => setCredentialOpen(true)}
            >
              Add credential
            </Button>
          </Stack>
          <Alert severity="info">
            Credential status is recorded internally. Expiry is a reminder and does not indicate
            government or external verification.
          </Alert>
          {isLoading ? (
            <Typography role="status" color="text.secondary">Loading workforce users…</Typography>
          ) : error ? (
            <Alert severity="warning" action={<Button onClick={() => void refetch()}>Retry workforce users</Button>}>
              Workforce users are unavailable. Credential records can still be viewed, but a subject
              must load before you can add one.
            </Alert>
          ) : members?.length === 0 ? (
            <EmptyState
              title="No workforce users available"
              description="Provision an inspector or maintenance engineer before recording credentials."
              action={provisionButton}
            />
          ) : null}
          <QueryState
            isLoading={credentialQuery.isLoading}
            error={credentialQuery.error}
            onRetry={() => void credentialQuery.refetch()}
            isEmpty={Boolean(credentialQuery.data && credentialQuery.data.length === 0)}
            empty={
              <EmptyState
                title="No credentials recorded"
                description={error
                  ? "No credentials are recorded. Workforce subjects are unavailable; retry the users list before adding a credential."
                  : "Add a credential record for a workforce user."}
                action={<Button disabled={isLoading || Boolean(error) || !members?.length} onClick={() => setCredentialOpen(true)}>Add credential</Button>}
              />
            }
          >
            <DataTable
              columns={[
                { id: 'subject', label: 'Workforce user', render: (credential) => members?.find((user) => user.userId === credential.userId)?.fullName ?? credential.userId },
                { id: 'type', label: 'Credential type', render: (credential) => credential.credentialType },
                { id: 'issuer', label: 'Issuer', render: (credential) => credential.issuer || '—' },
                { id: 'expires', label: 'Expires', render: (credential) => credential.expiresAt ? new Date(credential.expiresAt).toLocaleDateString() : '—' },
                { id: 'status', label: 'Recorded status', render: (credential) => <StatusChip status={credential.status} /> },
                { id: 'actions', label: '', render: (credential) => credential.status === 'PENDING_REVIEW' ? <Button size="small" onClick={() => setReviewingCredential(credential)}>Review credential</Button> : null },
              ] as DataTableColumn<WorkforceCredential>[]}
              rows={credentialQuery.data ?? []}
              rowKey={(credential) => credential.id}
            />
          </QueryState>
        </Stack>
      )}

      {credentialOpen && (
        <CreateCredentialDialog
          users={members ?? []}
          pending={createCredential.isPending}
          isError={createCredential.isError}
          error={createCredential.error}
          onClose={() => { createCredential.reset(); setCredentialOpen(false); }}
          onSubmit={(input: CreateWorkforceCredentialInput) => createCredential.mutate(input, { onSuccess: () => setCredentialOpen(false) })}
        />
      )}

      {reviewingCredential && (
        <ReviewCredentialDialog
          credential={reviewingCredential}
          pending={reviewCredential.isPending}
          isError={reviewCredential.isError}
          error={reviewCredential.error}
          onClose={() => { reviewCredential.reset(); setReviewingCredential(null); }}
          onSubmit={(input) => reviewCredential.mutate({ id: reviewingCredential.id, ...input }, { onSuccess: () => setReviewingCredential(null) })}
        />
      )}

      {provisionOpen && (
        <ProvisionWorkforceUserDialog
          pending={provision.isPending}
          isError={provision.isError}
          error={provision.error}
          onClose={() => {
            // Closing a failed provision must not leave its error on the next blank form, and a
            // successful provision must not leave the mutation record holding the one-time
            // password: TanStack keeps every resolved mutation value in its MutationCache until
            // reset, so "shown once" is only true once this clears it.
            provision.reset();
            setProvisionOpen(false);
          }}
          onSubmit={(input: ProvisionWorkforceUserInput) =>
            provision.mutate(input, {
              onSuccess: () => setProvisionOpen(false),
            })
          }
        />
      )}

      {issued && (
        <TemporaryPasswordDialog
          open
          email={issued.email}
          temporaryPassword={issued.temporaryPassword}
          onClose={() => {
            provision.reset();
            setIssued(null);
          }}
        />
      )}

      {editingRoles && (
        <EditRolesDialog
          member={editingRoles}
          pending={updateRoles.isPending}
          isError={updateRoles.isError}
          error={updateRoles.error}
          onClose={() => {
            updateRoles.reset();
            setEditingRoles(null);
          }}
          onSubmit={(roles) =>
            updateRoles.mutate(
              { userId: editingRoles.userId, roles },
              { onSuccess: () => {
                updateRoles.reset();
                setEditingRoles(null);
              } },
            )
          }
        />
      )}
    </Box>
  );
}

interface EditRolesDialogProps {
  member: WorkforceUser;
  pending: boolean;
  isError: boolean;
  error: unknown;
  onClose: () => void;
  onSubmit: (roles: GrantableWorkforceRole[]) => void;
}

/**
 * Edits the grantable roles of one member.
 *
 * Roles outside the grantable set are not shown even when the server reports one: the backend
 * refuses to manage such an account here, so offering a control for it would promise an action
 * that cannot succeed. The server decides the final role set regardless of what is selected.
 */
function EditRolesDialog({
  member,
  pending,
  isError,
  error,
  onClose,
  onSubmit,
}: EditRolesDialogProps) {
  const initialRoles = GRANTABLE_WORKFORCE_ROLES.filter((role) =>
    member.roles.includes(role),
  );
  const [roles, setRoles] = useState<GrantableWorkforceRole[]>(initialRoles);

  const toggleRole = (role: GrantableWorkforceRole, checked: boolean) => {
    setRoles((current) =>
      checked ? [...current, role] : current.filter((candidate) => candidate !== role),
    );
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Edit roles</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {member.fullName} · {member.email}
          </Typography>
          {isError && isConflict(error) ? (
            <RefusalNotice
              reason={getErrorMessage(error, '')}
              fallbackMessage="These roles conflict with the user's current organization role."
              testId="roles-conflict"
            />
          ) : (
            <MutationProblemAlert
              isError={isError}
              error={error}
              fallbackMessage="Could not update these roles."
            />
          )}
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
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <LoadingButton
          variant="contained"
          loading={pending}
          disabled={roles.length === 0}
          onClick={() => onSubmit(roles)}
        >
          Save roles
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}