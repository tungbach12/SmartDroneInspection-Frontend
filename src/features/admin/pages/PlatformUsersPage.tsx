import { useState } from 'react';
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
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import PersonAddAlt from '@mui/icons-material/PersonAddAlt';
import FlightTakeoffRounded from '@mui/icons-material/FlightTakeoffRounded';
import { DataTable, type DataTableColumn } from '@/shared/ui/DataTable';
import { EmptyState } from '@/shared/ui/EmptyState';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import { MutationProblemAlert } from '@/shared/ui/MutationProblemAlert';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryState } from '@/shared/ui/QueryState';
import {
  useCreatePlatformUser,
  usePlatformUsers,
  useResetPlatformUserPassword,
  useUpdatePlatformUserStatus,
} from '../hooks/usePlatformUsers';
import type { ActorZone, PlatformUser, PlatformUserRole } from '../api/platformUserApi';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { useAuthStore } from '@/features/auth/store/authStore';
import { InspectorProfileDialog } from '../components/InspectorProfileDialog';

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
  MAINTENANCE_ENGINEER: 'Maintenance engineer',
};

/**
 * The platform administrator's accounts.
 *
 * The platform manages the administrator-managed accounts: platform admins, platform managers, and
 * the Organization Manager of each customer workspace. An organization's own workforce is
 * administered by that organization's CUSTOMER, so the Inspector and Engineer rows here show
 * the accounts the platform controls rather than a full workforce roster.
 */
export default function PlatformUsersPage() {
  const { t } = useLocale();
  const currentRoles = useAuthStore((state) => state.roles);
  const isManager = currentRoles.includes('MANAGER') && !currentRoles.includes('ADMIN');

  const users = usePlatformUsers();
  const createUser = useCreatePlatformUser();
  const resetPassword = useResetPlatformUserPassword();
  const updateStatus = useUpdatePlatformUserStatus();

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

  const allItems = users.data ?? [];
  const items = isManager
    ? allItems.filter(
        (user) => user.roles.includes('INSPECTOR') || user.actorZone === 'INSPECTOR_PARTNER',
      )
    : allItems;

  const columns: DataTableColumn<PlatformUser>[] = [
    {
      id: 'email',
      label: 'Account',
      render: (user) => (
        <Box>
          <Typography sx={{ fontWeight: 600, color: '#101828', fontSize: '0.875rem' }}>
            {user.fullName}
          </Typography>
          <Typography sx={{ color: '#667085', fontSize: '0.75rem' }}>{user.email}</Typography>
        </Box>
      ),
    },
    {
      id: 'zone',
      label: 'Zone',
      width: 190,
      render: (user) => (
        <Typography sx={{ color: '#475467', fontSize: '0.8125rem' }}>
          {ZONE_LABELS[user.actorZone] ?? user.actorZone}
        </Typography>
      ),
    },
    {
      id: 'roles',
      label: 'Roles',
      width: 260,
      render: (user) => (
        <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap' }}>
          {user.roles.map((role) => (
            <Chip key={role} size="small" label={role} sx={{ height: 20, fontSize: 10 }} />
          ))}
        </Stack>
      ),
    },
    {
      id: 'actions',
      label: '',
      width: isManager ? 200 : 360,
      align: 'right' as const,
      render: (user: PlatformUser) => {
        const isInspectorUser =
          user.roles.includes('INSPECTOR') || user.actorZone === 'INSPECTOR_PARTNER';

        return (
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', alignItems: 'center' }}>
            {isInspectorUser && (
              <Button
                size="small"
                variant="contained"
                startIcon={<FlightTakeoffRounded />}
                onClick={() => {
                  setSelectedInspectorId(user.id);
                  setProfileDialogOpen(true);
                }}
                sx={{
                  bgcolor: '#3758F9',
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '12px',
                  borderRadius: '8px',
                  boxShadow: 'none',
                  '&:hover': { bgcolor: '#2b45cb' },
                }}
              >
                {t('Hồ sơ phi công')}
              </Button>
            )}
            {!isManager && (
              <>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() =>
                    resetPassword.mutate(user.id, {
                      onSuccess: (data) =>
                        setIssuedPassword({
                          email: user.email,
                          temporaryPassword: data.temporaryPassword,
                        }),
                    })
                  }
                >
                  {t('Reset password')}
                </Button>
                <Button
                  size="small"
                  variant="text"
                  color="error"
                  onClick={() => updateStatus.mutate({ userId: user.id, status: 'SUSPENDED' })}
                >
                  {t('Suspend')}
                </Button>
              </>
            )}
          </Stack>
        );
      },
    },
  ];

  return (
    <Box className="workspace-page workspace-page--admin-users">
      <PageHeader
        title={isManager ? t('Partner workforce') : t('Platform accounts')}
        subtitle={
          isManager
            ? t('Manage partner Inspector accounts.')
            : t('Administrator-managed accounts: platform admins and each workspace\'s Organization Manager')
        }
        actions={
          <Button
            variant="contained"
            startIcon={<PersonAddAlt />}
            onClick={() => {
              if (isManager) {
                setActorZone('INSPECTOR_PARTNER');
                setRoles(['INSPECTOR']);
              }
              setCreateOpen(true);
            }}
            sx={{
              borderRadius: '10px',
              px: 2.5,
              py: 1,
              bgcolor: '#3758F9',
              fontSize: '14px',
              fontWeight: 600,
              textTransform: 'none',
              boxShadow: 'none',
              '&:hover': { bgcolor: '#2b45cb' },
            }}
          >
            {isManager ? t('New partner inspector') : t('New account')}
          </Button>
        }
      />

      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2, sm: 2.5 },
          borderRadius: '16px',
          border: '1px solid #eaecf0',
          bgcolor: '#ffffff',
          boxShadow: '0 1px 3px rgba(16, 24, 40, 0.05)',
        }}
      >
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
              description={t('Platform and Organization Manager accounts will appear here.')}
            />
          }
        >
          <DataTable
            title={t('Accounts')}
            columns={columns}
            rows={items}
            rowKey={(user) => user.id}
            searchable
            searchPlaceholder={t('Search by name or email…')}
            searchPredicate={(user, query) =>
              user.fullName.toLowerCase().includes(query) ||
              user.email.toLowerCase().includes(query)
            }
          />
        </QueryState>
      </Paper>

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
                  <TextField
                    label={t('Zone')}
                    value={t('Inspector partner')}
                    disabled
                  />
                  <TextField
                    label={t('Role')}
                    value={t('Inspector')}
                    disabled
                  />
                  <Alert severity="info">
                    {t('Platform Manager is authorized to provision partner Inspector accounts.')}
                  </Alert>
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
                    helperText={t('The platform manages administrator-managed accounts only.')}
                  >
                    {(
                      actorZone === 'PLATFORM'
                        ? (['ADMIN', 'MANAGER'] as PlatformUserRole[])
                        : actorZone === 'INSPECTOR_PARTNER'
                          ? (['INSPECTOR'] as PlatformUserRole[])
                          : (['CUSTOMER', 'INSPECTOR', 'MAINTENANCE_ENGINEER'] as PlatformUserRole[])
                    ).map((role) => (
                      <MenuItem key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </MenuItem>
                    ))}
                  </TextField>
                  <Alert severity="info">
                    A customer-organization account needs the organization it belongs to. Provisioning
                    one here registers the account without a workspace, so use the organization's own
                    registration or its Organization Manager for that.
                  </Alert>
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
        fullWidth maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 700 }}>{t('Temporary password issued')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="warning">
              This password is shown once and is not retrievable again. Give it to the account
              holder directly; they must set their own password at first sign-in.
            </Alert>
            <Box>
              <Typography variant="caption" sx={{ color: '#667085', fontWeight: 600 }}>
                {t('ACCOUNT')}
              </Typography>
              <Typography variant="body2" sx={{ color: '#344054' }}>
                {issuedPassword?.email}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#667085', fontWeight: 600 }}>
                {t('TEMPORARY PASSWORD')}
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  color: '#101828',
                  p: 1.5,
                  bgcolor: '#f8fafc',
                  borderRadius: 1,
                  border: '1px solid #e2e8f0',
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

      <InspectorProfileDialog
        open={profileDialogOpen}
        onClose={() => setProfileDialogOpen(false)}
        inspectorId={selectedInspectorId}
      />
    </Box>
  );
}
