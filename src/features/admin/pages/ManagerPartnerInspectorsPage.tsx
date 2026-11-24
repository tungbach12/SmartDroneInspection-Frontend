import { useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import PersonAddAlt from '@mui/icons-material/PersonAddAlt';
import FlightTakeoffRounded from '@mui/icons-material/FlightTakeoffRounded';
import { useQuery } from '@tanstack/react-query';
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
} from '../hooks/usePlatformUsers';
import { inspectorProfileApi, type InspectorProfile } from '../api/inspectorProfileApi';
import { AdminTableToolbar } from '../components/AdminTableToolbar';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { InspectorProfileDialog } from '../components/InspectorProfileDialog';

interface PartnerInspectorRow {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  avatarUrl: string | null;
  accountStatus: string;
  onboardingStatus: string;
  pilotLicenseNumber: string | null;
  pilotLicenseClass: string | null;
  licenseExpirationStatus: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'UNKNOWN';
  licenseRemainingDays: number | null;
  hasLicenseScan: boolean;
  hasPartnerContract: boolean;
  totalFlightHours: number;
  companyFlightsCount: number;
}

type LicenseClassFilter = 'ALL' | 'CLASS_A' | 'CLASS_B' | 'UNASSIGNED';
type LicenseStatusFilter = 'ALL' | 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'MISSING';
type OnboardingFilter = 'ALL' | 'APPROVED' | 'PENDING' | 'SUSPENDED';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  const last = parts[parts.length - 1];
  if (!first) return '?';
  if (parts.length === 1 || !last) return first.slice(0, 2).toUpperCase();
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

function normalizeLicenseClass(rawClass: string | null | undefined): 'CLASS_A' | 'CLASS_B' | null {
  const normalized = (rawClass ?? '').trim().toUpperCase();
  if (!normalized) return null;
  if (normalized.includes('B') || normalized === 'CLASS_B') return 'CLASS_B';
  if (normalized.includes('A') || normalized === 'CLASS_A') return 'CLASS_A';
  return null;
}

function resolveLicenseStatusBadge(status: PartnerInspectorRow['licenseExpirationStatus'], hasNumber: boolean) {
  if (!hasNumber || status === 'UNKNOWN') {
    return { status: 'missing', label: 'No license', tone: 'default' as const };
  }
  if (status === 'EXPIRED') {
    return { status: 'expired', label: 'Expired', tone: 'error' as const };
  }
  if (status === 'EXPIRING_SOON') {
    return { status: 'expiring', label: 'Expiring soon', tone: 'warning' as const };
  }
  return { status: 'valid', label: 'Valid', tone: 'success' as const };
}

function resolveOnboardingBadge(row: PartnerInspectorRow) {
  const account = row.accountStatus.toUpperCase();
  const onboarding = row.onboardingStatus.toUpperCase();
  if (account === 'SUSPENDED' || onboarding === 'REJECTED') {
    return { status: 'suspended', label: 'Suspended', tone: 'error' as const };
  }
  if (onboarding === 'PENDING_REVIEW') {
    return { status: 'pending', label: 'Pending review', tone: 'warning' as const };
  }
  if (onboarding === 'APPROVED' && row.hasPartnerContract) {
    return { status: 'approved', label: 'Verified', tone: 'success' as const };
  }
  if (onboarding === 'APPROVED') {
    return { status: 'awaiting_contract', label: 'Awaiting contract', tone: 'info' as const };
  }
  return { status: 'active', label: 'Active', tone: 'info' as const };
}

/**
 * Dedicated Partner Inspectors roster page for Manager (/manager/platform-users).
 * Displays only Partner Inspector accounts with pilot license & drone qualification profile inspection.
 */
export default function ManagerPartnerInspectorsPage() {
  const { locale, t, formatNumber } = useLocale();
  const users = usePlatformUsers();
  const profilesQuery = useQuery({
    queryKey: ['platform-inspectors'],
    queryFn: inspectorProfileApi.list,
    retry: false,
  });
  const createUser = useCreatePlatformUser();

  const [createOpen, setCreateOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [issuedPassword, setIssuedPassword] = useState<{
    email: string;
    temporaryPassword: string;
  } | null>(null);

  const [search, setSearch] = useState('');
  const [licenseClassFilter, setLicenseClassFilter] = useState<LicenseClassFilter>('ALL');
  const [licenseStatusFilter, setLicenseStatusFilter] = useState<LicenseStatusFilter>('ALL');
  const [onboardingFilter, setOnboardingFilter] = useState<OnboardingFilter>('ALL');

  const [selectedInspectorId, setSelectedInspectorId] = useState<string | null>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);

  const allInspectors = useMemo<PartnerInspectorRow[]>(() => {
    const profileById = new Map<string, InspectorProfile>();
    for (const profile of profilesQuery.data ?? []) {
      profileById.set(profile.id, profile);
    }

    const merged = new Map<string, PartnerInspectorRow>();
    for (const user of users.data ?? []) {
      if (!user.roles.includes('INSPECTOR')) continue;
      const profile = profileById.get(user.id);
      merged.set(user.id, {
        id: user.id,
        fullName: profile?.fullName || user.fullName,
        email: profile?.email || user.email,
        phoneNumber: profile?.phoneNumber ?? null,
        avatarUrl: profile?.avatarUrl ?? null,
        accountStatus:
          profile?.status ??
          ('status' in user && typeof user.status === 'string' ? user.status : undefined) ??
          'ACTIVE',
        onboardingStatus: profile?.onboardingStatus ?? 'APPROVED',
        pilotLicenseNumber: profile?.pilotLicenseNumber ?? null,
        pilotLicenseClass: profile?.pilotLicenseClass ?? null,
        licenseExpirationStatus: profile?.licenseExpirationStatus ?? 'UNKNOWN',
        licenseRemainingDays: profile?.licenseRemainingDays ?? null,
        hasLicenseScan: profile?.hasLicenseScan ?? false,
        hasPartnerContract: profile?.hasPartnerContract ?? false,
        totalFlightHours: profile?.totalFlightHours ?? 0,
        companyFlightsCount: profile?.companyFlightsCount ?? 0,
      });
    }

    for (const profile of profilesQuery.data ?? []) {
      if (merged.has(profile.id)) continue;
      merged.set(profile.id, {
        id: profile.id,
        fullName: profile.fullName,
        email: profile.email,
        phoneNumber: profile.phoneNumber ?? null,
        avatarUrl: profile.avatarUrl ?? null,
        accountStatus: profile.status ?? 'ACTIVE',
        onboardingStatus: profile.onboardingStatus ?? 'APPROVED',
        pilotLicenseNumber: profile.pilotLicenseNumber ?? null,
        pilotLicenseClass: profile.pilotLicenseClass ?? null,
        licenseExpirationStatus: profile.licenseExpirationStatus ?? 'UNKNOWN',
        licenseRemainingDays: profile.licenseRemainingDays ?? null,
        hasLicenseScan: profile.hasLicenseScan ?? false,
        hasPartnerContract: profile.hasPartnerContract ?? false,
        totalFlightHours: profile.totalFlightHours ?? 0,
        companyFlightsCount: profile.companyFlightsCount ?? 0,
      });
    }

    return Array.from(merged.values()).sort((left, right) =>
      left.fullName.localeCompare(right.fullName, locale, { sensitivity: 'base' }),
    );
  }, [locale, profilesQuery.data, users.data]);

  const metrics = useMemo(() => {
    let validCount = 0;
    let attentionCount = 0;
    for (const row of allInspectors) {
      const hasValidLicense = Boolean(row.pilotLicenseNumber) && row.licenseExpirationStatus === 'VALID';
      if (hasValidLicense) validCount += 1;
      const needsAttention =
        row.accountStatus.toUpperCase() === 'SUSPENDED' ||
        row.onboardingStatus.toUpperCase() === 'REJECTED' ||
        row.licenseExpirationStatus === 'EXPIRED' ||
        row.licenseExpirationStatus === 'EXPIRING_SOON' ||
        !row.pilotLicenseNumber;
      if (needsAttention) attentionCount += 1;
    }
    return {
      total: allInspectors.length,
      validCount,
      attentionCount,
    };
  }, [allInspectors]);

  const filteredInspectors = useMemo(() => {
    const query = search.trim().toLowerCase();
    return allInspectors.filter((row) => {
      if (licenseClassFilter !== 'ALL') {
        const cls = normalizeLicenseClass(row.pilotLicenseClass);
        if (licenseClassFilter === 'UNASSIGNED' && cls !== null) return false;
        if (licenseClassFilter !== 'UNASSIGNED' && cls !== licenseClassFilter) return false;
      }

      if (licenseStatusFilter !== 'ALL') {
        const isMissing = !row.pilotLicenseNumber || row.licenseExpirationStatus === 'UNKNOWN';
        if (licenseStatusFilter === 'MISSING' && !isMissing) return false;
        if (licenseStatusFilter !== 'MISSING' && row.licenseExpirationStatus !== licenseStatusFilter) {
          return false;
        }
      }

      if (onboardingFilter !== 'ALL') {
        const account = row.accountStatus.toUpperCase();
        const onboarding = row.onboardingStatus.toUpperCase();
        const isSuspended = account === 'SUSPENDED' || onboarding === 'REJECTED';
        const isPending = onboarding === 'PENDING_REVIEW' || (onboarding === 'APPROVED' && !row.hasPartnerContract);
        const isApproved = !isSuspended && onboarding === 'APPROVED' && row.hasPartnerContract;
        if (onboardingFilter === 'SUSPENDED' && !isSuspended) return false;
        if (onboardingFilter === 'PENDING' && !isPending) return false;
        if (onboardingFilter === 'APPROVED' && !isApproved) return false;
      }

      if (!query) return true;
      return (
        row.id.toLowerCase().includes(query) ||
        row.fullName.toLowerCase().includes(query) ||
        row.email.toLowerCase().includes(query) ||
        (row.phoneNumber ?? '').toLowerCase().includes(query) ||
        (row.pilotLicenseNumber ?? '').toLowerCase().includes(query)
      );
    });
  }, [allInspectors, licenseClassFilter, licenseStatusFilter, onboardingFilter, search]);

  const hasActiveFilters =
    search.trim().length > 0 ||
    licenseClassFilter !== 'ALL' ||
    licenseStatusFilter !== 'ALL' ||
    onboardingFilter !== 'ALL';

  const clearAllFilters = () => {
    setSearch('');
    setLicenseClassFilter('ALL');
    setLicenseStatusFilter('ALL');
    setOnboardingFilter('ALL');
  };

  const openProfile = (inspectorId: string) => {
    setSelectedInspectorId(inspectorId);
    setProfileDialogOpen(true);
  };

  const columns: DataTableColumn<PartnerInspectorRow>[] = [
    {
      id: 'inspector',
      label: t('Partner Inspector'),
      sortValue: (row) => row.fullName,
      render: (row) => (
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0, maxWidth: 290 }}>
          <Avatar
            src={row.avatarUrl ?? undefined}
            sx={{
              width: 34,
              height: 34,
              fontSize: '0.75rem',
              fontWeight: 700,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
            }}
          >
            {getInitials(row.fullName)}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              noWrap
              title={row.fullName}
              sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.875rem' }}
            >
              {row.fullName}
            </Typography>
            <Typography noWrap title={row.email} sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
              {row.email}
            </Typography>
          </Box>
        </Stack>
      ),
    },
    {
      id: 'license',
      label: t('Pilot license'),
      sortValue: (row) => row.pilotLicenseNumber ?? '',
      render: (row) => {
        const badge = resolveLicenseStatusBadge(
          row.licenseExpirationStatus,
          Boolean(row.pilotLicenseNumber),
        );
        const cls = normalizeLicenseClass(row.pilotLicenseClass);
        return (
          <Stack spacing={0.5} sx={{ minWidth: 160 }}>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography
                variant="body2"
                sx={{ fontFamily: 'monospace', fontWeight: 600, color: row.pilotLicenseNumber ? 'text.primary' : 'text.secondary' }}
              >
                {row.pilotLicenseNumber ?? t('Unregistered')}
              </Typography>
              {cls && (
                <Chip
                  size="small"
                  label={cls === 'CLASS_B' ? t('Class B') : t('Class A')}
                  variant="outlined"
                  sx={{ height: 20, fontSize: '0.75rem', fontWeight: 600 }}
                />
              )}
            </Stack>
            <Box>
              <StatusChip status={badge.status} label={badge.label} tone={badge.tone} />
            </Box>
          </Stack>
        );
      },
    },
    {
      id: 'experience',
      label: t('Flight experience'),
      align: 'right',
      noWrap: true,
      sortValue: (row) => row.totalFlightHours,
      render: (row) => (
        <Box sx={{ fontVariantNumeric: 'tabular-nums' }}>
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
            {row.totalFlightHours.toFixed(1)} {t('hrs')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatNumber(row.companyFlightsCount)}{' '}
            {row.companyFlightsCount === 1 ? t('mission') : t('missions')}
          </Typography>
        </Box>
      ),
    },
    {
      id: 'status',
      label: t('Status'),
      noWrap: true,
      sortValue: (row) => resolveOnboardingBadge(row).label,
      render: (row) => {
        const badge = resolveOnboardingBadge(row);
        return <StatusChip status={badge.status} label={badge.label} tone={badge.tone} />;
      },
    },
    {
      id: 'actions',
      label: '',
      width: 170,
      align: 'right' as const,
      noWrap: true,
      render: (row) => (
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', alignItems: 'center' }}>
          <Button
            size="small"
            variant="outlined"
            color="primary"
            startIcon={<FlightTakeoffRounded />}
            onClick={(event) => {
              event.stopPropagation();
              openProfile(row.id);
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
        </Stack>
      ),
    },
  ];

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault();
    createUser.mutate(
      {
        email: email.trim(),
        fullName: fullName.trim(),
        roles: ['INSPECTOR'],
      },
      {
        onSuccess: (created) => {
          setIssuedPassword({
            email: created.user.email,
            temporaryPassword: created.temporaryPassword,
          });
          setCreateOpen(false);
          setEmail('');
          setFullName('');
        },
      },
    );
  };

  const newInspectorButton = (
    <Button
      variant="contained"
      startIcon={<PersonAddAlt />}
      onClick={() => setCreateOpen(true)}
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
      {t('New partner inspector')}
    </Button>
  );

  const isLoadingRoster = users.isLoading && profilesQuery.isLoading;
  const rosterError = allInspectors.length === 0 ? (users.error ?? profilesQuery.error) : null;

  return (
    <Box className="workspace-page workspace-page--admin-users">
      <PageHeader
        title={t('Partner workforce')}
        actions={newInspectorButton}
        breadcrumbs={[
          { label: t('Governance'), to: '/manager/dashboard' },
          { label: t('Partner workforce') },
        ]}
      />

      <Box>
        <MutationProblemAlert
          error={createUser.error}
          isError={createUser.isError}
          fallbackMessage={t('Could not create the account.')}
        />

        {issuedPassword && (
          <Alert
            severity="success"
            onClose={() => setIssuedPassword(null)}
            sx={{ mb: 2, borderRadius: '10px' }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {t('Temporary password issued for')} {issuedPassword.email}
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', mt: 0.5 }}>
              {issuedPassword.temporaryPassword}
            </Typography>
          </Alert>
        )}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
            gap: 2,
            mb: 2.5,
          }}
        >
          <MetricCard
            label={t('Partner inspectors')}
            value={isLoadingRoster ? '…' : formatNumber(metrics.total)}
            change={t('Active roster')}
            showTrend={false}
            subtext={t('onboarded partner pilots')}
            iconType="user"
          />
          <MetricCard
            label={t('Valid licenses')}
            value={isLoadingRoster ? '…' : formatNumber(metrics.validCount)}
            change={t('Flight cleared')}
            showTrend={false}
            subtext={t('current pilot certificates')}
            iconType="shield"
          />
          <MetricCard
            label={t('Attention needed')}
            value={isLoadingRoster ? '…' : formatNumber(metrics.attentionCount)}
            change={t('Compliance check')}
            showTrend={false}
            subtext={t('expiring, missing license, or suspended')}
            iconType="plane"
          />
        </Box>

        <AdminTableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder={t('Search ID, name, email, phone, or license…')}
          searchLabel={t('Search partner inspectors')}
          visibleCount={filteredInspectors.length}
          totalCount={allInspectors.length}
          onClearAll={clearAllFilters}
          filters={[
            {
              key: 'licenseClass',
              label: t('License class'),
              value: licenseClassFilter,
              options: [
                { value: 'ALL', label: t('All classes') },
                { value: 'CLASS_A', label: t('Class A') },
                { value: 'CLASS_B', label: t('Class B') },
                { value: 'UNASSIGNED', label: t('Unassigned') },
              ],
              onChange: (value) => setLicenseClassFilter(value as LicenseClassFilter),
              width: 150,
            },
            {
              key: 'licenseStatus',
              label: t('License status'),
              value: licenseStatusFilter,
              options: [
                { value: 'ALL', label: t('All licenses') },
                { value: 'VALID', label: t('Valid') },
                { value: 'EXPIRING_SOON', label: t('Expiring soon') },
                { value: 'EXPIRED', label: t('Expired') },
                { value: 'MISSING', label: t('No license') },
              ],
              onChange: (value) => setLicenseStatusFilter(value as LicenseStatusFilter),
              width: 155,
            },
            {
              key: 'onboarding',
              label: t('Onboarding'),
              value: onboardingFilter,
              options: [
                { value: 'ALL', label: t('All statuses') },
                { value: 'APPROVED', label: t('Verified') },
                { value: 'PENDING', label: t('Pending') },
                { value: 'SUSPENDED', label: t('Suspended') },
              ],
              onChange: (value) => setOnboardingFilter(value as OnboardingFilter),
              width: 150,
            },
          ]}
        />

        <QueryState
          isLoading={isLoadingRoster}
          error={rosterError}
          isEmpty={allInspectors.length === 0}
          onRetry={() => {
            void users.refetch();
            void profilesQuery.refetch();
          }}
          empty={
            <EmptyState
              title={t('No partner inspectors found')}
              description={t('Approved partner drone inspectors will appear in this roster.')}
            />
          }
        >
          <DataTable
            columns={columns}
            rows={filteredInspectors}
            rowKey={(row) => row.id}
            onRowClick={(row) => openProfile(row.id)}
            emptyContent={
              <EmptyState
                title={t('No matching partner inspectors')}
                description={t('Try adjusting your search or clearing the active filters.')}
                action={
                  hasActiveFilters ? (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={clearAllFilters}
                      sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                    >
                      {t('Clear filters')}
                    </Button>
                  ) : undefined
                }
              />
            }
          />
        </QueryState>
      </Box>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleCreate}>
          <DialogTitle sx={{ fontWeight: 700 }}>{t('New partner inspector')}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label={t('Full name')}
                required
                fullWidth
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
              <TextField
                label="Email"
                type="email"
                required
                fullWidth
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
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

      <InspectorProfileDialog
        open={profileDialogOpen}
        inspectorId={selectedInspectorId}
        onClose={() => {
          setProfileDialogOpen(false);
          setSelectedInspectorId(null);
        }}
      />
    </Box>
  );
}
