import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import PersonAddAlt from '@mui/icons-material/PersonAddAlt';
import FlightTakeoffRounded from '@mui/icons-material/FlightTakeoffRounded';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { DataTable, type DataTableColumn } from '@/shared/ui/DataTable';
import { EmptyState } from '@/shared/ui/EmptyState';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import { MetricCard } from '@/shared/ui/MetricCard';
import { MutationProblemAlert } from '@/shared/ui/MutationProblemAlert';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryState } from '@/shared/ui/QueryState';
import { StatusChip } from '@/shared/ui/StatusChip';
import {
  useCreatePlatformUser,
  usePlatformUsers,
  useResetPlatformUserPassword,
  useUpdatePlatformUserStatus,
} from '../hooks/usePlatformUsers';
import type {
  ActorZone,
  PlatformUser,
  PlatformUserRole,
  PlatformUserStatus,
} from '../api/platformUserApi';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { useAuthStore } from '@/features/auth/store/authStore';
import { InspectorProfileDialog } from '../components/InspectorProfileDialog';

type PlatformUserRow = PlatformUser & {
  status?: PlatformUserStatus;
};

const ZONE_LABELS: Record<string, string> = {
  PLATFORM: 'Platform',
  CUSTOMER_ORGANIZATION: 'Customer organization',
  INSPECTOR_PARTNER: 'Inspector partner',
  PROSPECT_CUSTOMER: 'Prospect customer',
};

const ROLE_LABELS: Record<PlatformUserRole, string> = {
  ADMIN: 'Platform admin',
  MANAGER: 'Platform manager',
  CUSTOMER: 'Customer admin',
  INSPECTOR: 'Inspector',
};

const ROLE_FILTERS: Array<{ id: 'ALL' | PlatformUserRole; label: string }> = [
  { id: 'ALL', label: 'All roles' },
  { id: 'ADMIN', label: 'Admin' },
  { id: 'MANAGER', label: 'Manager' },
  { id: 'CUSTOMER', label: 'Customer' },
  { id: 'INSPECTOR', label: 'Inspector' },
];

export default function PlatformUsersPage() {
  const { formatNumber, t } = useLocale();
  const currentRoles = useAuthStore((state) => state.roles);
  const currentUserId = useAuthStore((state) => state.userId);
  const isManager = currentRoles.includes('MANAGER') && !currentRoles.includes('ADMIN');

  const users = usePlatformUsers();
  const createUser = useCreatePlatformUser();
  const resetPassword = useResetPlatformUserPassword();
  const updateStatus = useUpdatePlatformUserStatus();

  const [roleFilter, setRoleFilter] = useState<'ALL' | PlatformUserRole>('ALL');
  const [createOpen, setCreateOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [actorZone, setActorZone] = useState<ActorZone>(
    isManager ? 'INSPECTOR_PARTNER' : 'PLATFORM',
  );
  const [roles, setRoles] = useState<PlatformUserRole[]>(
    isManager ? ['INSPECTOR'] : ['ADMIN'],
  );

  const [issuedPassword, setIssuedPassword] = useState<{
    email: string;
    temporaryPassword: string;
  } | null>(null);

  const [selectedInspectorId, setSelectedInspectorId] = useState<string | null>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [confirmResetUser, setConfirmResetUser] = useState<PlatformUserRow | null>(null);
  const [confirmSuspendUser, setConfirmSuspendUser] = useState<PlatformUserRow | null>(null);

  const allItems = useMemo<PlatformUserRow[]>(() => users.data ?? [], [users.data]);
  const scopedItems = useMemo(
    () =>
      isManager
        ? allItems.filter(
            (user) => user.roles.includes('INSPECTOR') || user.actorZone === 'INSPECTOR_PARTNER',
          )
        : allItems,
    [allItems, isManager],
  );

  const items = useMemo(
    () =>
      roleFilter === 'ALL'
        ? scopedItems
        : scopedItems.filter((user) => user.roles.includes(roleFilter)),
    [roleFilter, scopedItems],
  );

  const roleCounts = useMemo(() => {
    const platformCount = scopedItems.filter(
      (u) => u.roles.includes('ADMIN') || u.roles.includes('MANAGER'),
    ).length;
    const customerCount = scopedItems.filter((u) => u.roles.includes('CUSTOMER')).length;
    const inspectorCount = scopedItems.filter((u) => u.roles.includes('INSPECTOR')).length;
    return {
      total: scopedItems.length,
      platformCount,
      customerCount,
      inspectorCount,
    };
  }, [scopedItems]);

  const columns: DataTableColumn<PlatformUserRow>[] = [
    {
      id: 'email',
      label: t('Account'),
      render: (user) => (
        <Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.875rem' }}>
              {user.fullName}
            </Typography>
            {currentUserId && user.id === currentUserId && (
              <Chip
                size="small"
                color="primary"
                variant="outlined"
                label={t('You')}
                sx={{ height: 20, fontSize: '0.75rem', fontWeight: 700 }}
              />
            )}
          </Stack>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>{user.email}</Typography>
        </Box>
      ),
    },
    {
      id: 'zone',
      label: t('Zone'),
      width: 190,
      render: (user) => (
        <Typography sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}>
          {ZONE_LABELS[user.actorZone] ?? user.actorZone}
        </Typography>
      ),
    },
    {
      id: 'roles',
      label: t('Roles'),
      width: 240,
      render: (user) => (
        <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap' }}>
          {user.roles.map((role) => (
            <Chip
              key={role}
              size="small"
              label={role}
              color={
                role === 'ADMIN'
                  ? 'primary'
                  : role === 'MANAGER'
                    ? 'info'
                    : role === 'INSPECTOR'
                      ? 'success'
                      : 'default'
              }
              variant="outlined"
              sx={{ height: 22, fontSize: '0.75rem', fontWeight: 650 }}
            />
          ))}
        </Stack>
      ),
    },
    {
      id: 'status',
      label: t('Status'),
      width: 140,
      render: (user) => <StatusChip status={user.status ?? 'ACTIVE'} />,
    },
    {
      id: 'actions',
      label: '',
      width: isManager ? 200 : 340,
      align: 'right' as const,
      render: (user: PlatformUserRow) => {
        const isInspectorUser =
          user.roles.includes('INSPECTOR') || user.actorZone === 'INSPECTOR_PARTNER';
        const isSelf = Boolean(currentUserId && user.id === currentUserId);
        const isSuspended = user.status === 'SUSPENDED';

        return (
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', alignItems: 'center' }}>
            {isInspectorUser && (
              <Button
                size="small"
                variant="outlined"
                color="primary"
                startIcon={<FlightTakeoffRounded />}
                onClick={() => {
                  setSelectedInspectorId(user.id);
                  setProfileDialogOpen(true);
                }}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  borderRadius: '8px',
                }}
              >
                {t('Pilot profile')}
              </Button>
            )}
            {!isManager && (
              <>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setConfirmResetUser(user)}
                  sx={{ textTransform: 'none', borderRadius: '8px', fontWeight: 600 }}
                >
                  {t('Reset password')}
                </Button>
                {isSuspended ? (
                  <Button
                    size="small"
                    variant="text"
                    color="success"
                    disabled={isSelf || updateStatus.isPending}
                    onClick={() => updateStatus.mutate({ userId: user.id, status: 'ACTIVE' })}
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  >
                    {t('Activate')}
                  </Button>
                ) : (
                  <Button
                    size="small"
                    variant="text"
                    color="error"
                    disabled={isSelf || updateStatus.isPending}
                    onClick={() => setConfirmSuspendUser(user)}
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  >
                    {t('Suspend')}
                  </Button>
                )}
              </>
            )}
          </Stack>
        );
      },
    },
  ];

  const newAccountButton = (
    <Button
      variant="contained"
      color="primary"
      startIcon={<PersonAddAlt />}
      onClick={() => {
        if (isManager) {
          setActorZone('INSPECTOR_PARTNER');
          setRoles(['INSPECTOR']);
        }
        setCreateOpen(true);
      }}
      sx={{
        borderRadius: '8px',
        px: 2,
        py: 0.875,
        fontSize: '0.875rem',
        fontWeight: 600,
        textTransform: 'none',
        boxShadow: 'none',
      }}
    >
      {isManager ? t('New partner inspector') : t('New account')}
    </Button>
  );

  return (
    <Box className="workspace-page workspace-page--admin-users">
      <PageHeader
        title={isManager ? t('Partner workforce') : t('Platform accounts')}
        breadcrumbs={[
          { label: 'Home', to: isManager ? '/manager/dashboard' : '/admin/dashboard' },
          { label: isManager ? t('Partner workforce') : t('Platform accounts') },
        ]}
      />

      {!isManager && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
            gap: 2,
            mb: 2.5,
          }}
        >
          <MetricCard
            label={t('Total accounts')}
            value={users.isLoading ? '…' : formatNumber(roleCounts.total)}
            change={t('Active directory')}
            positive
            subtext={t('all provisioned accounts')}
            iconType="user"
          />
          <MetricCard
            label={t('Platform governance')}
            value={users.isLoading ? '…' : formatNumber(roleCounts.platformCount)}
            change="ADMIN / MANAGER"
            positive
            subtext={t('platform operators')}
            iconType="shield"
          />
          <MetricCard
            label={t('Customer accounts')}
            value={users.isLoading ? '…' : formatNumber(roleCounts.customerCount)}
            change="CUSTOMER"
            positive
            subtext={t('organization owners')}
            iconType="building"
          />
          <MetricCard
            label={t('Inspectors')}
            value={users.isLoading ? '…' : formatNumber(roleCounts.inspectorCount)}
            change={t('Partner inspectors')}
            positive
            subtext={t('inspectors & engineers')}
            iconType="plane"
          />
        </Box>
      )}

      <Box>
        {!isManager && (
          <Stack
            direction="row"
            spacing={1}
            sx={{ mb: 2, flexWrap: 'wrap', gap: 1, alignItems: 'center' }}
          >
            {ROLE_FILTERS.map((f) => {
              const active = roleFilter === f.id;
              return (
                <Chip
                  key={f.id}
                  label={t(f.label)}
                  color={active ? 'primary' : 'default'}
                  variant={active ? 'filled' : 'outlined'}
                  onClick={() => setRoleFilter(f.id)}
                  sx={{ fontWeight: 650, cursor: 'pointer' }}
                />
              );
            })}
          </Stack>
        )}

        <MutationProblemAlert
          error={createUser.error}
          isError={createUser.isError}
          fallbackMessage={t('Could not create the account.')}
        />
        <MutationProblemAlert
          error={resetPassword.error}
          isError={resetPassword.isError}
          fallbackMessage={t('Could not reset the password.')}
        />
        <MutationProblemAlert
          error={updateStatus.error}
          isError={updateStatus.isError}
          fallbackMessage={t('Could not update the account.')}
        />

        <QueryState
          isLoading={users.isLoading}
          error={users.error}
          onRetry={() => void users.refetch()}
          isEmpty={items.length === 0}
          loadingLabel={t('Loading platform accounts…')}
          empty={
            <EmptyState
              title={t('No platform accounts')}
              description={t('Accounts matching the selected filter will appear here.')}
            />
          }
        >
          <DataTable
            columns={columns}
            rows={items}
            rowKey={(user) => user.id}
            searchable
            searchPlaceholder={t('Search by id, name, or email…')}
            searchPredicate={(user, query) =>
              user.fullName.toLowerCase().includes(query) ||
              user.email.toLowerCase().includes(query)
            }
            actions={newAccountButton}
          />
        </QueryState>
      </Box>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            createUser.mutate(
              {
                email: email.trim(),
                fullName: fullName.trim(),
                actorZone: isManager ? 'INSPECTOR_PARTNER' : actorZone,
                organizationId: null,
                roles: isManager ? ['INSPECTOR'] : roles,
              },
              {
                onSuccess: (provisioned) => {
                  setCreateOpen(false);
                  setEmail('');
                  setFullName('');
                  setRoles(isManager ? ['INSPECTOR'] : ['ADMIN']);
                  setIssuedPassword({
                    email: provisioned.user.email,
                    temporaryPassword: provisioned.temporaryPassword,
                  });
                },
              },
            );
          }}
        >
          <DialogTitle sx={{ fontWeight: 700 }}>
            {isManager ? t('New partner inspector') : t('New platform account')}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <MutationProblemAlert
                error={createUser.error}
                isError={createUser.isError}
                fallbackMessage={t('Could not create the account.')}
              />
              <TextField
                label={t('Email address')}
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <TextField
                label={t('Full name')}
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
              {isManager ? (
                <>
                  <TextField label={t('Zone')} value={t('Inspector partner')} disabled />
                  <TextField label={t('Role')} value={t('Inspector')} disabled />
                </>
              ) : (
                <>
                  <TextField
                    select
                    label={t('Zone')}
                    value={actorZone}
                    onChange={(e) => {
                      const nextZone = e.target.value as ActorZone;
                      setActorZone(nextZone);
                      if (nextZone === 'PLATFORM') {
                        setRoles(['ADMIN']);
                      } else if (nextZone === 'INSPECTOR_PARTNER') {
                        setRoles(['INSPECTOR']);
                      } else {
                        setRoles(['CUSTOMER']);
                      }
                    }}
                  >
                    <MenuItem value="PLATFORM">{t('Platform')}</MenuItem>
                    <MenuItem value="CUSTOMER_ORGANIZATION">{t('Customer organization')}</MenuItem>
                    <MenuItem value="INSPECTOR_PARTNER">{t('Inspector partner')}</MenuItem>
                  </TextField>
                  <TextField
                    select
                    label={t('Role')}
                    value={
                      roles[0] ??
                      (actorZone === 'PLATFORM'
                        ? 'ADMIN'
                        : actorZone === 'INSPECTOR_PARTNER'
                          ? 'INSPECTOR'
                          : 'CUSTOMER')
                    }
                    onChange={(e) => setRoles([e.target.value as PlatformUserRole])}
                  >
                    {(
                      actorZone === 'PLATFORM'
                        ? (['ADMIN', 'MANAGER'] as PlatformUserRole[])
                        : actorZone === 'INSPECTOR_PARTNER'
                          ? (['INSPECTOR'] as PlatformUserRole[])
                          : (['CUSTOMER', 'INSPECTOR'] as PlatformUserRole[])
                    ).map((role) => (
                      <MenuItem key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </MenuItem>
                    ))}
                  </TextField>
                </>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setCreateOpen(false)}>{t('Cancel')}</Button>
            <LoadingButton
              type="submit"
              variant="contained"
              loading={createUser.isPending}
              disabled={!email.trim() || !fullName.trim()}
            >
              {t('Create account')}
            </LoadingButton>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={Boolean(issuedPassword)}
        onClose={() => setIssuedPassword(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 700 }}>{t('Temporary password issued')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="warning">
              {t('Share this one-time password with the account holder for their initial sign-in.')}
            </Alert>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                {t('ACCOUNT')}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.primary' }}>
                {issuedPassword?.email}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                {t('TEMPORARY PASSWORD')}
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  color: 'text.primary',
                  p: 1.5,
                  bgcolor: 'background.default',
                  borderRadius: 1,
                  border: 1,
                  borderColor: 'divider',
                  wordBreak: 'break-all',
                }}
              >
                {issuedPassword?.temporaryPassword}
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="contained" onClick={() => setIssuedPassword(null)}>
            {t('Done')}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(confirmResetUser)}
        title={t('Reset password')}
        message={
          confirmResetUser
            ? `${t('Issue a new temporary password for')} ${confirmResetUser.fullName} (${confirmResetUser.email})?`
            : ''
        }
        confirmLabel={t('Reset password')}
        cancelLabel={t('Cancel')}
        severity="warning"
        loading={resetPassword.isPending}
        onCancel={() => setConfirmResetUser(null)}
        onConfirm={() => {
          if (!confirmResetUser) return;
          resetPassword.mutate(confirmResetUser.id, {
            onSuccess: (data) => {
              setIssuedPassword({
                email: confirmResetUser.email,
                temporaryPassword: data.temporaryPassword,
              });
              setConfirmResetUser(null);
            },
          });
        }}
      />

      <ConfirmDialog
        open={Boolean(confirmSuspendUser)}
        title={t('Suspend account')}
        message={
          confirmSuspendUser
            ? `${t('Are you sure you want to suspend')} ${confirmSuspendUser.fullName} (${confirmSuspendUser.email})?`
            : ''
        }
        confirmLabel={t('Suspend')}
        cancelLabel={t('Cancel')}
        severity="danger"
        loading={updateStatus.isPending}
        onCancel={() => setConfirmSuspendUser(null)}
        onConfirm={() => {
          if (!confirmSuspendUser) return;
          updateStatus.mutate(
            { userId: confirmSuspendUser.id, status: 'SUSPENDED' },
            {
              onSuccess: () => setConfirmSuspendUser(null),
            },
          );
        }}
      />

      <InspectorProfileDialog
        open={profileDialogOpen}
        onClose={() => setProfileDialogOpen(false)}
        inspectorId={selectedInspectorId}
      />
    </Box>
  );
}
