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
  Divider,
  MenuItem,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import PersonAddAlt from '@mui/icons-material/PersonAddAlt';
import { useQuery } from '@tanstack/react-query';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { EmptyState } from '@/shared/ui/EmptyState';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import { MetricCard } from '@/shared/ui/MetricCard';
import { MutationProblemAlert } from '@/shared/ui/MutationProblemAlert';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryState } from '@/shared/ui/QueryState';
import { StatusChip } from '@/shared/ui/StatusChip';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { useAuthStore } from '@/features/auth/store/authStore';
import { AdminTableToolbar } from '../components/AdminTableToolbar';
import {
  useCreatePlatformUser,
  usePlatformUsers,
  useResetPlatformUserPassword,
  useUpdatePlatformUserStatus,
} from '../hooks/usePlatformUsers';
import type {
  PlatformUser,
  PlatformUserRole,
  PlatformUserStatus,
} from '../api/platformUserApi';
import { inspectorProfileApi } from '../api/inspectorProfileApi';

type PlatformUserRow = PlatformUser & {
  status?: PlatformUserStatus;
};

const ROLE_LABELS: Record<PlatformUserRole, string> = {
  ADMIN: 'Platform admin',
  MANAGER: 'Platform manager',
  CUSTOMER: 'Customer admin',
  INSPECTOR: 'Inspector',
};

const ROLE_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All roles' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'INSPECTOR', label: 'Inspector' },
  { value: 'CUSTOMER', label: 'Customer' },
];

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'DISABLED', label: 'Disabled' },
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

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | PlatformUserRole>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | PlatformUserStatus>('ALL');

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [accountTab, setAccountTab] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [roles, setRoles] = useState<PlatformUserRole[]>(
    isManager ? ['INSPECTOR'] : ['ADMIN'],
  );

  const [issuedPassword, setIssuedPassword] = useState<{
    email: string;
    temporaryPassword: string;
  } | null>(null);

  const [confirmResetUser, setConfirmResetUser] = useState<PlatformUserRow | null>(null);
  const [confirmSuspendUser, setConfirmSuspendUser] = useState<PlatformUserRow | null>(null);

  const allItems = useMemo<PlatformUserRow[]>(() => users.data ?? [], [users.data]);
  const scopedItems = useMemo(
    () => (isManager ? allItems.filter((user) => user.roles.includes('INSPECTOR')) : allItems),
    [allItems, isManager],
  );

  const items = useMemo(() => {
    const query = search.trim().toLowerCase();
    return scopedItems.filter((user) => {
      if (query) {
        const matches =
          user.fullName.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query);
        if (!matches) return false;
      }
      if (roleFilter !== 'ALL' && !user.roles.includes(roleFilter)) return false;
      if (statusFilter !== 'ALL' && (user.status ?? 'ACTIVE') !== statusFilter) return false;
      return true;
    });
  }, [roleFilter, scopedItems, search, statusFilter]);

  const roleCounts = useMemo(() => {
    const platformCount = scopedItems.filter(
      (user) => user.roles.includes('ADMIN') || user.roles.includes('MANAGER'),
    ).length;
    const customerCount = scopedItems.filter((user) => user.roles.includes('CUSTOMER')).length;
    const inspectorCount = scopedItems.filter((user) => user.roles.includes('INSPECTOR')).length;
    return { total: scopedItems.length, platformCount, customerCount, inspectorCount };
  }, [scopedItems]);

  const selectedUser = scopedItems.find((user) => user.id === selectedUserId) ?? null;
  const selectedIsInspector = Boolean(selectedUser?.roles.includes('INSPECTOR'));
  const activeAdminCount = scopedItems.filter(
    (user) => user.roles.includes('ADMIN') && (user.status ?? 'ACTIVE') === 'ACTIVE',
  ).length;
  const selectedIsLastAdmin = Boolean(
    selectedUser &&
      selectedUser.roles.includes('ADMIN') &&
      (selectedUser.status ?? 'ACTIVE') === 'ACTIVE' &&
      activeAdminCount <= 1,
  );
  const selectedIsSelf = Boolean(currentUserId && selectedUser?.id === currentUserId);
  const effectiveAccountTab = selectedIsInspector ? accountTab : 0;

  const openAccount = (user: PlatformUserRow) => {
    setSelectedUserId(user.id);
    setAccountTab(0);
    resetPassword.reset();
    updateStatus.reset();
  };

  const closeAccount = () => {
    setSelectedUserId(null);
    setAccountTab(0);
  };

  const profileQuery = useQuery({
    queryKey: ['inspector-profile', selectedUserId],
    queryFn: () => inspectorProfileApi.get(selectedUserId ?? ''),
    enabled: Boolean(selectedUserId && selectedIsInspector),
  });
  const flightLogsQuery = useQuery({
    queryKey: ['inspector-flight-logs', selectedUserId],
    queryFn: () => inspectorProfileApi.listFlightLogs(selectedUserId ?? ''),
    enabled: Boolean(selectedUserId && selectedIsInspector),
  });

  const newAccountButton = (
    <Button
      variant="contained"
      color="primary"
      startIcon={<PersonAddAlt />}
      onClick={() => {
        if (isManager) {
          setRoles(['INSPECTOR']);
        }
        setCreateOpen(true);
      }}
    >
      {isManager ? t('New partner inspector') : t('New account')}
    </Button>
  );

  return (
    <Box className="workspace-page workspace-page--admin-users">
      <PageHeader
        title={isManager ? t('Partner workforce') : t('Platform accounts')}
        subtitle={t('Provision platform accounts, review roles, and manage access status.')}
        breadcrumbs={[
          { label: t('Governance'), to: isManager ? '/manager/dashboard' : '/admin/dashboard' },
          { label: isManager ? t('Partner workforce') : t('Platform accounts') },
        ]}
        actions={newAccountButton}
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
            showTrend={false}
            subtext={t('all provisioned accounts')}
            iconType="user"
          />
          <MetricCard
            label={t('Platform governance')}
            value={users.isLoading ? '…' : formatNumber(roleCounts.platformCount)}
            change="ADMIN / MANAGER"
            showTrend={false}
            subtext={t('platform operators')}
            iconType="shield"
          />
          <MetricCard
            label={t('Customer accounts')}
            value={users.isLoading ? '…' : formatNumber(roleCounts.customerCount)}
            change="CUSTOMER"
            showTrend={false}
            subtext={t('organization owners')}
            iconType="building"
          />
          <MetricCard
            label={t('Inspectors')}
            value={users.isLoading ? '…' : formatNumber(roleCounts.inspectorCount)}
            change={t('Partner inspectors')}
            showTrend={false}
            subtext={t('inspectors & engineers')}
            iconType="plane"
          />
        </Box>
      )}

      <AdminTableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={t('Search by name or email')}
        searchLabel={t('Search accounts')}
        visibleCount={items.length}
        totalCount={scopedItems.length}
        onClearAll={() => setStatusFilter('ALL')}
        filters={[
          ...(!isManager
            ? [
                {
                  key: 'role',
                  label: t('Role'),
                  value: roleFilter,
                  options: ROLE_FILTER_OPTIONS.map((option) => ({
                    value: option.value,
                    label: t(option.label),
                  })),
                  onChange: (value: string) => setRoleFilter(value as 'ALL' | PlatformUserRole),
                },
              ]
            : []),
          {
            key: 'status',
            label: t('Status'),
            value: statusFilter,
            options: STATUS_FILTER_OPTIONS.map((option) => ({
              value: option.value,
              label: t(option.label),
            })),
            onChange: (value: string) => setStatusFilter(value as 'ALL' | PlatformUserStatus),
          },
        ]}
      />

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
        <Box
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '10px',
            bgcolor: 'background.paper',
            overflow: 'hidden',
          }}
        >
          <TableContainer>
            <Table aria-label={t('Platform accounts')}>
              <TableHead>
                <TableRow>
                  {[t('Account'), t('Roles'), t('Status'), ''].map((header, index) => (
                    <TableCell
                      key={header || 'manage'}
                      align={index === 3 ? 'right' : 'left'}
                      sx={{
                        width: index === 2 ? 140 : index === 3 ? 110 : undefined,
                        bgcolor: (muiTheme) =>
                          muiTheme.palette.mode === 'dark'
                            ? 'rgba(255, 255, 255, 0.03)'
                            : '#F9FAFB',
                        color: 'text.secondary',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        letterSpacing: '0.02em',
                      }}
                    >
                      {header}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((user) => (
                  <TableRow
                    key={user.id}
                    hover
                    tabIndex={0}
                    onClick={() => openAccount(user)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openAccount(user);
                      }
                    }}
                    sx={{
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' },
                      '&:focus-visible': {
                        outline: '2px solid',
                        outlineColor: 'primary.main',
                        outlineOffset: -2,
                      },
                    }}
                  >
                    <TableCell sx={{ py: 1.5 }}>
                      <Stack
                        direction="row"
                        spacing={1}
                        sx={{ alignItems: 'center', flexWrap: 'wrap' }}
                      >
                        <Typography sx={{ fontWeight: 650, fontSize: '0.875rem' }}>
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
                      <Typography sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                        {user.email}
                      </Typography>
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell>
                      <StatusChip status={user.status ?? 'ACTIVE'} />
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="outlined"
                        aria-label={`${t('Manage')} ${user.fullName}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          openAccount(user);
                        }}
                        sx={{ borderColor: 'divider' }}
                      >
                        {t('Manage')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </QueryState>

      {/* Centered account dialog */}
      <Dialog open={Boolean(selectedUser)} onClose={closeAccount} fullWidth maxWidth="md">
        {selectedUser && (
          <>
            <DialogTitle sx={{ fontWeight: 700 }}>
              <Typography component="span" sx={{ fontWeight: 700, fontSize: '1.0625rem' }}>
                {selectedUser.fullName}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                {selectedUser.email}
              </Typography>
            </DialogTitle>
            <Divider />
            <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
              <Tabs
                value={effectiveAccountTab}
                onChange={(_, value: number) => setAccountTab(value)}
                variant="scrollable"
                scrollButtons="auto"
                aria-label={t('Account details')}
              >
                <Tab label={t('Account & Security')} sx={{ fontWeight: 600 }} />
                {selectedIsInspector && (
                  <Tab label={t('Pilot Profile & License')} sx={{ fontWeight: 600 }} />
                )}
                {selectedIsInspector && <Tab label={t('Flight Logs')} sx={{ fontWeight: 600 }} />}
              </Tabs>
            </Box>
            <DialogContent sx={{ p: { xs: 2, sm: 3 }, minHeight: 320 }}>
              {effectiveAccountTab === 0 && (
                <Stack spacing={2.5}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      {t('Roles')}
                    </Typography>
                    <Stack direction="row" spacing={0.75} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                      {selectedUser.roles.map((role) => (
                        <Chip
                          key={role}
                          size="small"
                          label={ROLE_LABELS[role as PlatformUserRole] ?? role}
                          color={role === 'ADMIN' ? 'primary' : role === 'MANAGER' ? 'info' : 'default'}
                          variant="outlined"
                          sx={{ fontWeight: 650 }}
                        />
                      ))}
                    </Stack>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      {t('Status')}
                    </Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <StatusChip status={selectedUser.status ?? 'ACTIVE'} />
                    </Box>
                  </Box>

                  {selectedIsLastAdmin && (
                    <Alert severity="warning">
                      {t('This is the last active platform administrator. Suspend is disabled to keep the platform manageable.')}
                    </Alert>
                  )}

                  <Divider />

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
                    {!isManager && (
                      <>
                        <Button
                          variant="outlined"
                          color="inherit"
                          onClick={() => setConfirmResetUser(selectedUser)}
                          sx={{ borderColor: 'divider' }}
                        >
                          {t('Reset password')}
                        </Button>
                        {(selectedUser.status ?? 'ACTIVE') === 'SUSPENDED' ? (
                          <Button
                            variant="outlined"
                            color="success"
                            disabled={isSelfOrLastAdmin(selectedIsSelf, selectedIsLastAdmin) || updateStatus.isPending}
                            onClick={() =>
                              updateStatus.mutate({ userId: selectedUser.id, status: 'ACTIVE' })
                            }
                          >
                            {t('Activate')}
                          </Button>
                        ) : (
                          <Button
                            variant="outlined"
                            color="error"
                            disabled={isSelfOrLastAdmin(selectedIsSelf, selectedIsLastAdmin) || updateStatus.isPending}
                            onClick={() => setConfirmSuspendUser(selectedUser)}
                          >
                            {t('Suspend')}
                          </Button>
                        )}
                      </>
                    )}
                  </Stack>
                </Stack>
              )}

              {effectiveAccountTab === 1 && selectedIsInspector && (
                <QueryState
                  isLoading={profileQuery.isLoading}
                  error={profileQuery.error}
                  onRetry={() => void profileQuery.refetch()}
                  loadingLabel={t('Loading pilot profile…')}
                >
                  {profileQuery.data ? (
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          {t('UAV Pilot License')}
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                          <StatusChip
                            status={
                              profileQuery.data.licenseExpirationStatus === 'VALID'
                                ? 'ACTIVE'
                                : profileQuery.data.licenseExpirationStatus === 'EXPIRING_SOON'
                                  ? 'PENDING'
                                  : profileQuery.data.licenseExpirationStatus === 'EXPIRED'
                                    ? 'REJECTED'
                                    : 'INACTIVE'
                            }
                            label={
                              profileQuery.data.licenseExpirationStatus === 'VALID'
                                ? `${t('Valid')} (${profileQuery.data.licenseRemainingDays ?? 0}d)`
                                : profileQuery.data.licenseExpirationStatus === 'EXPIRING_SOON'
                                  ? `${t('Expiring soon')} (${profileQuery.data.licenseRemainingDays ?? 0}d)`
                                  : profileQuery.data.licenseExpirationStatus === 'EXPIRED'
                                    ? t('Expired')
                                    : t('License not set')
                            }
                          />
                          {profileQuery.data.onboardingStatus && (
                            <Chip
                              size="small"
                              variant="outlined"
                              label={profileQuery.data.onboardingStatus}
                              sx={{ fontWeight: 650 }}
                            />
                          )}
                        </Stack>
                      </Box>
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                          gap: 1.5,
                        }}
                      >
                        <DetailField label={t('License number')} value={profileQuery.data.pilotLicenseNumber} />
                        <DetailField label={t('License class')} value={profileQuery.data.pilotLicenseClass} />
                        <DetailField
                          label={t('Issued date')}
                          value={profileQuery.data.pilotLicenseIssuedDate}
                        />
                        <DetailField
                          label={t('Expires')}
                          value={profileQuery.data.pilotLicenseExpiresAt}
                        />
                        <DetailField
                          label={t('Issuing authority')}
                          value={profileQuery.data.pilotLicenseAuthority}
                        />
                        <DetailField label={t('Phone number')} value={profileQuery.data.phoneNumber} />
                      </Box>
                      <Divider />
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                          gap: 1.5,
                        }}
                      >
                        <DetailField
                          label={t('Total flight hours')}
                          value={`${formatNumber(profileQuery.data.totalFlightHours)} h`}
                        />
                        <DetailField
                          label={t('Platform missions')}
                          value={formatNumber(profileQuery.data.companyFlightsCount)}
                        />
                        <DetailField
                          label={t('License scan')}
                          value={profileQuery.data.hasLicenseScan ? t('Attached') : t('Missing')}
                        />
                      </Box>
                    </Stack>
                  ) : (
                    <Alert severity="info">{t('No pilot profile recorded for this account yet.')}</Alert>
                  )}
                </QueryState>
              )}

              {effectiveAccountTab === 2 && selectedIsInspector && (
                <QueryState
                  isLoading={flightLogsQuery.isLoading}
                  error={flightLogsQuery.error}
                  onRetry={() => void flightLogsQuery.refetch()}
                  isEmpty={(flightLogsQuery.data ?? []).length === 0}
                  loadingLabel={t('Loading flight logs…')}
                  empty={
                    <Alert severity="info">{t('No flight logs recorded yet.')}</Alert>
                  }
                >
                  <Stack spacing={1.25}>
                    {(flightLogsQuery.data ?? []).map((log) => (
                      <Box
                        key={log.id}
                        sx={{
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: '8px',
                          p: 1.5,
                        }}
                      >
                        <Stack
                          direction={{ xs: 'column', sm: 'row' }}
                          spacing={0.75}
                          sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
                        >
                          <Typography sx={{ fontWeight: 650, fontSize: '0.875rem' }}>
                            {log.missionTitle}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(log.flightDate).toLocaleDateString()}
                          </Typography>
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          {log.flightCode} · {log.droneModel} · {log.location} ·{' '}
                          {formatNumber(log.flightDurationHours)} h
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </QueryState>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={closeAccount}>{t('Close')}</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            createUser.mutate(
              {
                email: email.trim(),
                fullName: fullName.trim(),
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
                <TextField label={t('Role')} value={t('Inspector')} disabled />
              ) : (
                <TextField
                  select
                  label={t('Role')}
                  value={roles[0] ?? 'ADMIN'}
                  onChange={(e) => setRoles([e.target.value as PlatformUserRole])}
                >
                  {(['ADMIN', 'MANAGER', 'CUSTOMER', 'INSPECTOR'] as PlatformUserRole[]).map(
                    (role) => (
                      <MenuItem key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </MenuItem>
                    ),
                  )}
                </TextField>
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
            { onSuccess: () => setConfirmSuspendUser(null) },
          );
        }}
      />
    </Box>
  );
}

function isSelfOrLastAdmin(isSelf: boolean, isLastAdmin: boolean): boolean {
  return isSelf || isLastAdmin;
}

function DetailField({ label, value }: { label: string; value?: string | null | undefined }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography variant="body2" color={value ? 'text.primary' : 'text.secondary'}>
        {value || '—'}
      </Typography>
    </Box>
  );
}
