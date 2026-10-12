import { useState } from 'react';
import { PersonAddAlt } from '@mui/icons-material';
import {
  Box,
  Button,
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
import { MutationProblemAlert } from '@/shared/ui/MutationProblemAlert';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryState } from '@/shared/ui/QueryState';
import { StatusChip } from '@/shared/ui/StatusChip';
import { ProvisionWorkforceUserDialog } from '../components/ProvisionWorkforceUserDialog';
import { TemporaryPasswordDialog } from '../components/TemporaryPasswordDialog';
import {
  GRANTABLE_WORKFORCE_ROLES,
  type GrantableWorkforceRole,
  type ProvisionWorkforceUserInput,
  type WorkforceUser,
  type WorkforceUserStatus,
} from '../api/workforceApi';
import {
  useProvisionWorkforceUser,
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
  const provision = useProvisionWorkforceUser();
  const updateStatus = useUpdateWorkforceUserStatus();
  const updateRoles = useUpdateWorkforceUserRoles();

  const [provisionOpen, setProvisionOpen] = useState(false);
  const [issued, setIssued] = useState<IssuedCredential | null>(null);
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
        isError={provision.isError}
        error={provision.error}
        fallbackMessage="Could not provision this workforce user."
      />
      <MutationProblemAlert
        isError={updateStatus.isError}
        error={updateStatus.error}
        fallbackMessage="Could not update this workforce user."
      />
      <MutationProblemAlert
        isError={updateRoles.isError}
        error={updateRoles.error}
        fallbackMessage="Could not update these roles."
      />

      <QueryState
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
      </QueryState>

      {provisionOpen && (
        <ProvisionWorkforceUserDialog
          pending={provision.isPending}
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
              onSuccess: (created) => {
                setProvisionOpen(false);
                // The password goes straight to the one-time surface and nowhere else.
                setIssued({
                  email: created.user.email,
                  temporaryPassword: created.temporaryPassword,
                });
              },
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