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
import type { PlatformUser, PlatformUserRole } from '../api/platformUserApi';
import { useLocale } from '@/shared/i18n/LocaleProvider';

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
  const users = usePlatformUsers();
  const createUser = useCreatePlatformUser();
  const resetPassword = useResetPlatformUserPassword();
  const updateStatus = useUpdatePlatformUserStatus();

  const [createOpen, setCreateOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [actorZone, setActorZone] = useState<'PLATFORM' | 'CUSTOMER_ORGANIZATION'>('PLATFORM');
  const [roles, setRoles] = useState<PlatformUserRole[]>(['ADMIN']);

  const [issuedPassword, setIssuedPassword] = useState<{
    email: string;
    temporaryPassword: string;
  } | null>(null);

  const items = users.data ?? [];

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
      width: 220,
      align: 'right',
      render: (user) => (
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => resetPassword.mutate(user.id)}
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
        </Stack>
      ),
    },
  ];

  return (
    <Box className="workspace-page workspace-page--admin-users">
      <PageHeader
        title={t('Platform accounts')}
        subtitle={t('Administrator-managed accounts: platform admins and each workspace\'s Organization Manager')}
        actions={
          <Button
            variant="contained"
            startIcon={<PersonAddAlt />}
            onClick={() => setCreateOpen(true)}
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
            {t('New account')}
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
                actorZone,
                organizationId: null,
                roles,
              },
              {
                onSuccess: (provisioned) => {
                  setCreateOpen(false);
                  setEmail('');
                  setFullName('');
                  setRoles(['ADMIN']);
                  setIssuedPassword({
                    email: provisioned.user.email,
                    temporaryPassword: provisioned.temporaryPassword,
                  });
                },
              },
            );
          }}
        >
          <DialogTitle sx={{ fontWeight: 700 }}>{t('New platform account')}</DialogTitle>
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
              <TextField
                select
                label={t('Zone')}
                value={actorZone}
                onChange={(e) => {
                  const nextZone = e.target.value as typeof actorZone;
                  setActorZone(nextZone);
                  if (nextZone === 'PLATFORM') {
                    setRoles(['ADMIN']);
                  } else {
                    setRoles(['CUSTOMER']);
                  }
                }}
              >
                <MenuItem value="PLATFORM">{t('Platform')}</MenuItem>
                <MenuItem value="CUSTOMER_ORGANIZATION">{t('Customer organization')}</MenuItem>
              </TextField>
              <TextField
                select
                label={t('Role')}
                value={roles[0] ?? (actorZone === 'PLATFORM' ? 'ADMIN' : 'CUSTOMER')}
                onChange={(e) => setRoles([e.target.value as PlatformUserRole])}
                helperText={t('The platform manages administrator-managed accounts only.')}
              >
                {(
                  actorZone === 'PLATFORM'
                    ? (['ADMIN', 'MANAGER'] as PlatformUserRole[])
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
    </Box>
  );
}
