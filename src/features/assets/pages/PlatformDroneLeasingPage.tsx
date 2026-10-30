import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import AddRounded from '@mui/icons-material/AddRounded';
import CheckCircleOutlineRounded from '@mui/icons-material/CheckCircleOutlineRounded';
import FlightRounded from '@mui/icons-material/FlightRounded';
import ReplayRounded from '@mui/icons-material/ReplayRounded';
import { useAuthStore } from '@/features/auth/store/authStore';
import { DataTable, type DataTableColumn } from '@/shared/ui/DataTable';
import { EmptyState } from '@/shared/ui/EmptyState';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryState } from '@/shared/ui/QueryState';
import { StatusChip } from '@/shared/ui/StatusChip';
import {
  useConfirmDroneLeasePayment,
  useCreatePlatformDrone,
  usePlatformDroneLeases,
  usePlatformDronePool,
  useReclaimDroneLease,
  useUpdatePlatformDroneStatus,
} from '../hooks/useDroneLeases';
import type {
  DroneLease,
  PlatformDrone,
  PlatformDroneStatus,
} from '../api/droneLeaseApi';

const POOL_STATUSES: PlatformDroneStatus[] = [
  'AVAILABLE',
  'LEASED',
  'MAINTENANCE',
  'RETIRED',
];

const LEASE_STATUS_FILTERS = [
  'ALL',
  'PENDING',
  'ACTIVE',
  'RECLAIMED',
  'CANCELLED',
] as const;

export default function PlatformDroneLeasingPage() {
  const roles = useAuthStore((s) => s.roles);
  const canManage = roles.includes('MANAGER');
  const isReadOnlyAdmin = roles.includes('ADMIN') && !canManage;

  const [activeTab, setActiveTab] = useState<'POOL' | 'LEASES'>('POOL');
  const [leaseStatusFilter, setLeaseStatusFilter] = useState<string>('ALL');

  // Add leasable drone dialog state
  const [addDroneOpen, setAddDroneOpen] = useState(false);
  const [serialNumber, setSerialNumber] = useState('');
  const [model, setModel] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [monthlyRateUsd, setMonthlyRateUsd] = useState('450');
  const [cameraModel, setCameraModel] = useState('');
  const [sensorResolution, setSensorResolution] = useState('');
  const [thermalSupport, setThermalSupport] = useState(false);
  const [droneNotes, setDroneNotes] = useState('');

  // Pool filtering & search
  const [poolStatusFilter, setPoolStatusFilter] = useState<'ALL' | PlatformDroneStatus>('ALL');

  // Confirm lease payment dialog state
  const [confirmingLease, setConfirmingLease] = useState<DroneLease | null>(null);
  const [externalReference, setExternalReference] = useState('');
  const [startsAtInput, setStartsAtInput] = useState('');
  const [endsAtInput, setEndsAtInput] = useState('');
  const [agreedAmountInput, setAgreedAmountInput] = useState('');
  const [confirmNotesInput, setConfirmNotesInput] = useState('');

  const poolQuery = usePlatformDronePool();
  const leasesQuery = usePlatformDroneLeases(
    leaseStatusFilter === 'ALL' ? undefined : leaseStatusFilter,
  );
  const createDroneMutation = useCreatePlatformDrone();
  const updateDroneStatusMutation = useUpdatePlatformDroneStatus();
  const confirmPaymentMutation = useConfirmDroneLeasePayment();
  const reclaimMutation = useReclaimDroneLease();

  const poolItems = poolQuery.data ?? [];
  const leaseItems = leasesQuery.data ?? [];

  const availablePoolCount = poolItems.filter((d) => d.status === 'AVAILABLE').length;
  const leasedPoolCount = poolItems.filter((d) => d.status === 'LEASED').length;
  const pendingLeasesCount = leaseItems.filter((l) => l.status === 'PENDING').length;

  const filteredPoolItems = poolItems.filter((drone) => {
    if (poolStatusFilter !== 'ALL' && drone.status !== poolStatusFilter) return false;
    return true;
  });

  const handleCreateDrone = () => {
    if (!serialNumber.trim() || !model.trim() || !monthlyRateUsd.trim()) return;
    let payloadMetadataStr: string | undefined;
    if (cameraModel.trim() || sensorResolution.trim() || thermalSupport) {
      payloadMetadataStr = JSON.stringify({
        cameraModel: cameraModel.trim() || undefined,
        sensorResolution: sensorResolution.trim() || undefined,
        thermalSupport,
      });
    }
    createDroneMutation.mutate(
      {
        serialNumber: serialNumber.trim(),
        model: model.trim(),
        manufacturer: manufacturer.trim() || undefined,
        payloadMetadata: payloadMetadataStr,
        monthlyRateUsd: Number(monthlyRateUsd.trim()),
        notes: droneNotes.trim() || undefined,
      },
      {
        onSuccess: () => {
          setAddDroneOpen(false);
          setSerialNumber('');
          setModel('');
          setManufacturer('');
          setMonthlyRateUsd('450');
          setCameraModel('');
          setSensorResolution('');
          setThermalSupport(false);
          setDroneNotes('');
        },
      },
    );
  };

  const handleOpenConfirmDialog = (lease: DroneLease) => {
    setConfirmingLease(lease);
    setExternalReference('');
    const today = new Date().toISOString().split('T')[0]!;
    setStartsAtInput(today);
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + lease.leasePeriodMonths);
    setEndsAtInput(endDate.toISOString().split('T')[0]!);
    setAgreedAmountInput(String(lease.agreedAmountUsd));
    setConfirmNotesInput('');
  };

  const handleConfirmPayment = () => {
    if (!confirmingLease || !externalReference.trim()) return;
    confirmPaymentMutation.mutate(
      {
        leaseId: confirmingLease.id,
        input: {
          externalReference: externalReference.trim(),
          startsAt: startsAtInput ? new Date(startsAtInput).toISOString() : undefined,
          endsAt: endsAtInput ? new Date(endsAtInput).toISOString() : undefined,
          agreedAmountUsd: agreedAmountInput.trim()
            ? Number(agreedAmountInput.trim())
            : undefined,
          notes: confirmNotesInput.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          setConfirmingLease(null);
          setExternalReference('');
          setConfirmNotesInput('');
        },
      },
    );
  };

  const poolColumns: DataTableColumn<PlatformDrone>[] = [
    {
      id: 'serialNumber',
      label: 'Serial number',
      render: (drone) => (
        <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
          {drone.serialNumber}
        </Typography>
      ),
    },
    {
      id: 'model',
      label: 'Model',
      render: (drone) => drone.model,
    },
    {
      id: 'manufacturer',
      label: 'Manufacturer',
      render: (drone) => drone.manufacturer || '—',
    },
    {
      id: 'monthlyRateUsd',
      label: 'Monthly rate',
      render: (drone) => (
        <Typography variant="body2" sx={{ fontWeight: 600, color: '#0A968A' }}>
          ${Number(drone.monthlyRateUsd).toLocaleString()} USD/mo
        </Typography>
      ),
    },
    {
      id: 'status',
      label: 'Status',
      render: (drone) => <StatusChip status={drone.status} />,
    },
    ...(canManage
      ? [
          {
            id: 'actions',
            label: 'Manage status',
            width: 200,
            render: (drone: PlatformDrone) => (
              <TextField
                select
                size="small"
                label={`Status for ${drone.serialNumber}`}
                value={drone.status}
                disabled={drone.status === 'LEASED' || updateDroneStatusMutation.isPending}
                onChange={(e) =>
                  updateDroneStatusMutation.mutate({
                    id: drone.id,
                    input: { status: e.target.value as PlatformDroneStatus },
                  })
                }
              >
                {POOL_STATUSES.map((st) => (
                  <MenuItem key={st} value={st} disabled={st === 'LEASED'}>
                    {st}
                  </MenuItem>
                ))}
              </TextField>
            ),
          },
        ]
      : []),
  ];

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', p: { xs: 2, sm: 3 } }}>
      <PageHeader
        title="B2B Drone Leasing"
        subtitle="Manage the platform leasable drone pool, reconcile corporate lease payments, provision customer drones, and reclaim expired leases."
        actions={
          canManage ? (
            <Button
              variant="contained"
              startIcon={<AddRounded />}
              onClick={() => setAddDroneOpen(true)}
              sx={{
                textTransform: 'none',
                borderRadius: '10px',
                fontWeight: 700,
                bgcolor: '#0A968A',
                '&:hover': { bgcolor: '#087f75' },
              }}
            >
              Add leasable drone
            </Button>
          ) : undefined
        }
      />

      {isReadOnlyAdmin && (
        <Alert severity="info" sx={{ mt: 2, mb: 2, borderRadius: '10px' }}>
          Read-only for Platform Admin — drone pool and lease reconciliation require Platform Manager
        </Alert>
      )}

      {/* KPI Summary Cards */}
      <Grid container spacing={2} sx={{ mt: 1, mb: 3 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper
            elevation={0}
            sx={{ p: 2.5, borderRadius: '12px', border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}
          >
            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
              AVAILABLE IN POOL
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#0A968A', mt: 0.5 }}>
              {availablePoolCount}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              Ready for customer lease allocation
            </Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper
            elevation={0}
            sx={{ p: 2.5, borderRadius: '12px', border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}
          >
            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
              ACTIVELY LEASED DRONES
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a', mt: 0.5 }}>
              {leasedPoolCount}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              Provisioned to customer workspaces
            </Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper
            elevation={0}
            sx={{ p: 2.5, borderRadius: '12px', border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}
          >
            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
              PENDING LEASE REQUESTS
            </Typography>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                color: pendingLeasesCount > 0 ? '#d97706' : '#0f172a',
                mt: 0.5,
              }}
            >
              {pendingLeasesCount}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              Awaiting wire reconciliation or PayPal capture
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Paper elevation={0} sx={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <Tabs
          value={activeTab}
          onChange={(_, val: 'POOL' | 'LEASES') => setActiveTab(val)}
          sx={{ px: 2, borderBottom: '1px solid #e2e8f0' }}
        >
          <Tab
            label="Platform Drone Pool"
            value="POOL"
            sx={{ textTransform: 'none', fontWeight: 700 }}
          />
          <Tab
            label="Lease Contracts & Reconciliation"
            value="LEASES"
            sx={{ textTransform: 'none', fontWeight: 700 }}
          />
        </Tabs>

        {activeTab === 'POOL' && (
          <Box sx={{ p: 2.5 }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              sx={{ mb: 2.5, justifyContent: 'space-between', alignItems: { sm: 'center' } }}
            >
              <TextField
                select
                size="small"
                label="Pool status"
                value={poolStatusFilter}
                onChange={(e) => setPoolStatusFilter(e.target.value as 'ALL' | PlatformDroneStatus)}
                sx={{ minWidth: 160 }}
              >
                <MenuItem value="ALL">All statuses</MenuItem>
                {POOL_STATUSES.map((st) => (
                  <MenuItem key={st} value={st}>
                    {st}
                  </MenuItem>
                ))}
              </TextField>

              <Typography variant="caption" sx={{ color: '#64748b' }}>
                Showing {filteredPoolItems.length} of {poolItems.length} drones in pool
              </Typography>
            </Stack>

            <QueryState
              isLoading={poolQuery.isLoading}
              error={poolQuery.isError ? poolQuery.error : null}
              onRetry={() => void poolQuery.refetch()}
              loadingLabel="Loading platform drone pool…"
              isEmpty={poolItems.length === 0}
              empty={
                <EmptyState
                  title="No platform drones in pool"
                  description="Register serial-numbered drones in the platform pool so organizations can request B2B leases."
                />
              }
            >
              <DataTable
                columns={poolColumns}
                rows={filteredPoolItems}
                rowKey={(drone) => drone.id}
                searchable
                searchPlaceholder="Search pool by serial number or model…"
                searchPredicate={(drone, q) =>
                  drone.serialNumber.toLowerCase().includes(q) ||
                  drone.model.toLowerCase().includes(q) ||
                  (drone.manufacturer ?? '').toLowerCase().includes(q)
                }
              />
            </QueryState>
          </Box>
        )}

        {activeTab === 'LEASES' && (
          <Box sx={{ p: 2.5 }}>
            <Tabs
              value={leaseStatusFilter}
              onChange={(_, val: string) => setLeaseStatusFilter(val)}
              sx={{ mb: 2, borderBottom: '1px solid #e2e8f0' }}
            >
              {LEASE_STATUS_FILTERS.map((st) => (
                <Tab
                  key={st}
                  label={st === 'ALL' ? 'All Leases' : st}
                  value={st}
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                />
              ))}
            </Tabs>

            <QueryState
              isLoading={leasesQuery.isLoading}
              error={leasesQuery.isError ? leasesQuery.error : null}
              onRetry={() => void leasesQuery.refetch()}
              loadingLabel="Loading lease contracts…"
              isEmpty={leaseItems.length === 0}
              empty={
                <Box sx={{ py: 6, textAlign: 'center' }}>
                  <FlightRounded sx={{ fontSize: 48, color: '#94a3b8', mb: 1 }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#475467' }}>
                    No drone leases found
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>
                    Customer lease requests and active lease contracts will appear here.
                  </Typography>
                </Box>
              }
            >
              <Stack spacing={2} divider={<Divider />}>
                {leaseItems.map((lease) => {
                  const serial = lease.serialNumber ?? lease.droneSerialNumber ?? '—';
                  const modelName = lease.model ?? lease.droneModel ?? '—';
                  return (
                    <Box
                      key={lease.id}
                      sx={{
                        py: 1.5,
                        display: 'flex',
                        flexDirection: { xs: 'column', md: 'row' },
                        justifyContent: 'space-between',
                        alignItems: { xs: 'flex-start', md: 'center' },
                        gap: 2,
                      }}
                    >
                      <Stack spacing={0.5} sx={{ minWidth: 220 }}>
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                            {lease.organizationName ?? lease.organizationId}
                          </Typography>
                          <StatusChip status={lease.status} />
                        </Stack>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>
                          Drone: <strong>{serial}</strong> ({modelName})
                        </Typography>
                      </Stack>

                      <Box sx={{ minWidth: 150 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {lease.leasePeriodMonths} Months
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#0A968A', fontWeight: 700 }}>
                          ${Number(lease.agreedAmountUsd).toLocaleString()} USD
                        </Typography>
                      </Box>

                      <Box sx={{ minWidth: 180 }}>
                        <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                          LEASE WINDOW
                        </Typography>
                        {lease.startsAt && lease.endsAt ? (
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {new Date(lease.startsAt).toLocaleDateString()} –{' '}
                            {new Date(lease.endsAt).toLocaleDateString()}
                          </Typography>
                        ) : (
                          <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                            Pending provisioning
                          </Typography>
                        )}
                      </Box>

                      <Box sx={{ minWidth: 160 }}>
                        <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                          PAYMENT REFERENCE
                        </Typography>
                        {lease.externalReference ? (
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#0A968A' }}>
                            <code>{lease.externalReference}</code>
                          </Typography>
                        ) : lease.wireReferenceCode ? (
                          <Typography variant="caption" sx={{ color: '#d97706' }}>
                            Wire Ref: <code>{lease.wireReferenceCode}</code>
                          </Typography>
                        ) : (
                          <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                            Awaiting payment
                          </Typography>
                        )}
                      </Box>

                      {canManage && (
                        <Stack direction="row" spacing={1}>
                          {lease.status === 'PENDING' && (
                            <Button
                              size="small"
                              variant="contained"
                              startIcon={<CheckCircleOutlineRounded />}
                              onClick={() => handleOpenConfirmDialog(lease)}
                              sx={{
                                textTransform: 'none',
                                borderRadius: '8px',
                                fontWeight: 700,
                                bgcolor: '#0A968A',
                                '&:hover': { bgcolor: '#087f75' },
                              }}
                            >
                              Confirm Payment & Provision
                            </Button>
                          )}
                          {lease.status === 'ACTIVE' && (
                            <Button
                              size="small"
                              variant="outlined"
                              color="warning"
                              startIcon={<ReplayRounded />}
                              disabled={reclaimMutation.isPending}
                              onClick={() =>
                                reclaimMutation.mutate({
                                  leaseId: lease.id,
                                  input: { notes: 'Reclaimed by Platform Manager' },
                                })
                              }
                              sx={{ textTransform: 'none', borderRadius: '8px', fontWeight: 600 }}
                            >
                              Reclaim Drone
                            </Button>
                          )}
                        </Stack>
                      )}
                    </Box>
                  );
                })}
              </Stack>
            </QueryState>
          </Box>
        )}
      </Paper>

      {/* Add Leasable Drone Dialog */}
      <Dialog
        open={addDroneOpen}
        onClose={() => setAddDroneOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Add Leasable Drone to Pool</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <TextField
              label="Serial Number"
              required
              fullWidth
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
            />
            <TextField
              label="Model"
              required
              fullWidth
              value={model}
              onChange={(e) => setModel(e.target.value)}
            />
            <TextField
              label="Manufacturer"
              fullWidth
              value={manufacturer}
              onChange={(e) => setManufacturer(e.target.value)}
            />
            <TextField
              label="Monthly Rate (USD)"
              required
              type="number"
              fullWidth
              value={monthlyRateUsd}
              onChange={(e) => setMonthlyRateUsd(e.target.value)}
            />
            <Typography variant="caption" sx={{ fontWeight: 600, color: '#475467', mt: 1 }}>
              Payload & Camera Equipment
            </Typography>
            <Stack direction="row" spacing={1.5}>
              <TextField
                fullWidth
                size="small"
                label="Camera / Sensor model"
                placeholder="e.g. Zenmuse H20T"
                value={cameraModel}
                onChange={(e) => setCameraModel(e.target.value)}
              />
              <TextField
                fullWidth
                size="small"
                label="Sensor resolution"
                placeholder="e.g. 20 MP"
                value={sensorResolution}
                onChange={(e) => setSensorResolution(e.target.value)}
              />
            </Stack>
            <TextField
              select
              size="small"
              label="Thermal imaging capability"
              value={thermalSupport ? 'YES' : 'NO'}
              onChange={(e) => setThermalSupport(e.target.value === 'YES')}
            >
              <MenuItem value="NO">Standard Optical Only</MenuItem>
              <MenuItem value="YES">Thermal & Optical</MenuItem>
            </TextField>
            <TextField
              label="Notes"
              fullWidth
              multiline
              minRows={2}
              value={droneNotes}
              onChange={(e) => setDroneNotes(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setAddDroneOpen(false)}>Cancel</Button>
          <LoadingButton
            variant="contained"
            loading={createDroneMutation.isPending}
            disabled={!serialNumber.trim() || !model.trim() || !monthlyRateUsd.trim()}
            onClick={handleCreateDrone}
          >
            Add Drone
          </LoadingButton>
        </DialogActions>
      </Dialog>

      {/* Confirm Payment & Provision Dialog */}
      <Dialog
        open={Boolean(confirmingLease)}
        onClose={() => setConfirmingLease(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Confirm Lease Payment & Provision Drone
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ mt: 0.5 }}>
            <TextField
              label="Bank Wire Statement / External Reference"
              required
              fullWidth
              value={externalReference}
              onChange={(e) => setExternalReference(e.target.value)}
            />
            <TextField
              label="Final Agreed Amount (USD)"
              type="number"
              fullWidth
              value={agreedAmountInput}
              onChange={(e) => setAgreedAmountInput(e.target.value)}
            />
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Lease Starts At"
                  type="date"
                  fullWidth
                  value={startsAtInput}
                  onChange={(e) => setStartsAtInput(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Lease Ends At"
                  type="date"
                  fullWidth
                  value={endsAtInput}
                  onChange={(e) => setEndsAtInput(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
            </Grid>
            <TextField
              label="Notes"
              fullWidth
              multiline
              minRows={2}
              value={confirmNotesInput}
              onChange={(e) => setConfirmNotesInput(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setConfirmingLease(null)}>Cancel</Button>
          <LoadingButton
            variant="contained"
            loading={confirmPaymentMutation.isPending}
            disabled={!externalReference.trim()}
            onClick={handleConfirmPayment}
            sx={{ bgcolor: '#0A968A', '&:hover': { bgcolor: '#087f75' } }}
          >
            Confirm & Provision
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
