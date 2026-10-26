import { useState, type FormEvent } from 'react';
import { Add } from '@mui/icons-material';
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
  Drawer,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getErrorMessage } from '@/shared/api/errorMessage';
import { DataTable, type DataTableColumn } from '@/shared/ui/DataTable';
import { EmptyState } from '@/shared/ui/EmptyState';
import { QueryState } from '@/shared/ui/QueryState';
import { StatusChip } from '@/shared/ui/StatusChip';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import type { Drone, DroneServiceability } from '../api/droneApi';
import {
  useCreateDrone,
  useDrone,
  useDrones,
  useUpdateDroneServiceability,
} from '../hooks/useDrones';

const SERVICEABILITY_VALUES: DroneServiceability[] = [
  'ACTIVE',
  'MAINTENANCE',
  'SUSPENDED',
  'RETIRED',
];

export function DroneInventoryPanel() {
  const { formatDate, t } = useLocale();
  const roles = useAuthStore((state) => state.roles);
  const canManage = roles.includes('ORG_MANAGER');
  const drones = useDrones();
  const createDrone = useCreateDrone();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ownershipFilter, setOwnershipFilter] = useState<'ALL' | 'OWNED' | 'LEASED'>('ALL');
  const [serviceabilityFilter, setServiceabilityFilter] = useState<'ALL' | DroneServiceability>('ALL');

  const rawDrones = drones.data ?? [];
  const filteredDrones = rawDrones.filter((d) => {
    const ownership = d.ownershipType ?? 'OWNED';
    if (ownershipFilter !== 'ALL' && ownership !== ownershipFilter) return false;
    if (serviceabilityFilter !== 'ALL' && d.serviceability !== serviceabilityFilter) return false;
    return true;
  });

  const columns: DataTableColumn<Drone>[] = [
    {
      id: 'serial',
      label: 'Serial number',
      render: (drone) => drone.serialNumber,
    },
    { id: 'model', label: 'Model', render: (drone) => drone.model || '—' },
    {
      id: 'manufacturer',
      label: 'Manufacturer',
      render: (drone) => drone.manufacturer || '—',
    },
    {
      id: 'registration',
      label: 'Registration',
      render: (drone) => drone.registrationNumber || '—',
    },
    {
      id: 'ownership',
      label: 'Ownership',
      render: (drone) => {
        const ownership = drone.ownershipType ?? 'OWNED';
        return (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Chip
              size="small"
              label={ownership}
              color={ownership === 'LEASED' ? 'primary' : 'default'}
              variant={ownership === 'LEASED' ? 'filled' : 'outlined'}
            />
            {ownership === 'LEASED' && drone.leaseExpiresAt && (
              <Typography variant="caption" color="text.secondary">
                Expires {formatDate(new Date(drone.leaseExpiresAt))}
              </Typography>
            )}
          </Stack>
        );
      },
    },
    {
      id: 'serviceability',
      label: 'Serviceability',
      render: (drone) => <StatusChip status={drone.serviceability} />,
    },
    {
      id: 'details',
      label: '',
      render: (drone) => (
        <Button size="small" onClick={() => setSelectedId(drone.id)}>
          {t('Open drone')}
        </Button>
      ),
    },
  ];

  const registerButton = canManage ? (
    <Button
      variant="contained"
      startIcon={<Add />}
      onClick={() => setCreateOpen(true)}
    >
      {t('Register drone')}
    </Button>
  ) : undefined;

  return (
    <Stack spacing={2}>
      <Alert severity="info">
        Serviceability describes the recorded maintenance state only; it does
        not confirm permission to fly or operational readiness.
      </Alert>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <TextField
            select
            size="small"
            label="Ownership"
            value={ownershipFilter}
            onChange={(e) => setOwnershipFilter(e.target.value as 'ALL' | 'OWNED' | 'LEASED')}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="ALL">All ownership</MenuItem>
            <MenuItem value="OWNED">Owned</MenuItem>
            <MenuItem value="LEASED">Leased</MenuItem>
          </TextField>

          <TextField
            select
            size="small"
            label="Serviceability"
            value={serviceabilityFilter}
            onChange={(e) => setServiceabilityFilter(e.target.value as 'ALL' | DroneServiceability)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="ALL">All serviceability</MenuItem>
            {SERVICEABILITY_VALUES.map((status) => (
              <MenuItem key={status} value={status}>
                {status}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        {registerButton}
      </Box>
      <QueryState
        isLoading={drones.isLoading}
        error={drones.error}
        onRetry={() => void drones.refetch()}
        loadingLabel={t('Loading drones…')}
        isEmpty={Boolean(drones.data && drones.data.length === 0)}
        empty={
          <EmptyState
            title={t('No drones registered')}
            description={t('Register an organization drone to track its serviceability and registration.')}
            action={registerButton}
          />
        }
      >
        <DataTable
          columns={columns}
          rows={filteredDrones}
          rowKey={(drone) => drone.id}
          searchable
          searchPlaceholder={t('Search by serial number or model…')}
          searchPredicate={(drone, query) =>
            drone.serialNumber.toLowerCase().includes(query) ||
            Boolean(drone.model && drone.model.toLowerCase().includes(query)) ||
            Boolean(drone.manufacturer && drone.manufacturer.toLowerCase().includes(query))
          }
          emptyMessage={t('No drones match the selected filters or search query.')}
        />
      </QueryState>
      <CreateDroneDialog
        open={createOpen}
        pending={createDrone.isPending}
        errorMessage={
          createDrone.isError
            ? getErrorMessage(
                createDrone.error,
                'Could not register the drone.',
              )
            : null
        }
        onClose={() => setCreateOpen(false)}
        onSubmit={(input) =>
          createDrone.mutate(input, { onSuccess: () => setCreateOpen(false) })
        }
      />
      <DroneDetailDrawer
        droneId={selectedId}
        canManage={canManage}
        onClose={() => setSelectedId(null)}
      />
    </Stack>
  );
}

function CreateDroneDialog({
  open,
  pending,
  errorMessage,
  onClose,
  onSubmit,
}: {
  open: boolean;
  pending: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onSubmit: (input: {
    serialNumber: string;
    model?: string;
    manufacturer?: string;
    registrationNumber?: string;
    registrationExpiresAt?: string;
    payloadMetadata?: string;
    notes?: string;
  }) => void;
}) {
  const { t } = useLocale();
  const [serialNumber, setSerialNumber] = useState('');
  const [model, setModel] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [registrationExpiresAt, setRegistrationExpiresAt] = useState('');
  const [cameraModel, setCameraModel] = useState('');
  const [sensorResolution, setSensorResolution] = useState('');
  const [thermalSupport, setThermalSupport] = useState(false);
  const [notes, setNotes] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    let metadata: string | undefined;
    if (cameraModel.trim() || sensorResolution.trim() || thermalSupport) {
      metadata = JSON.stringify({
        cameraModel: cameraModel.trim() || undefined,
        sensorResolution: sensorResolution.trim() || undefined,
        thermalSupport,
      });
    }
    onSubmit({
      serialNumber: serialNumber.trim(),
      ...(model.trim() ? { model: model.trim() } : {}),
      ...(manufacturer.trim() ? { manufacturer: manufacturer.trim() } : {}),
      ...(registrationNumber.trim() ? { registrationNumber: registrationNumber.trim() } : {}),
      ...(registrationExpiresAt ? { registrationExpiresAt: new Date(registrationExpiresAt).toISOString() } : {}),
      ...(metadata ? { payloadMetadata: metadata } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <form onSubmit={submit}>
        <DialogTitle>{t('Register drone')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
            <TextField
              required
              label={t('Serial number')}
              value={serialNumber}
              onChange={(event) => setSerialNumber(event.target.value)}
            />
            <TextField
              label={t('Model')}
              value={model}
              onChange={(event) => setModel(event.target.value)}
            />
            <TextField
              label={t('Manufacturer')}
              value={manufacturer}
              onChange={(event) => setManufacturer(event.target.value)}
            />
            <Typography variant="caption" sx={{ fontWeight: 600, color: '#475467', mt: 1 }}>
              Registration & Licensing
            </Typography>
            <Stack direction="row" spacing={1.5}>
              <TextField
                fullWidth
                label="Registration number"
                placeholder="e.g. VN-UAV-00123"
                value={registrationNumber}
                onChange={(event) => setRegistrationNumber(event.target.value)}
              />
              <TextField
                fullWidth
                type="datetime-local"
                label="Registration expiry"
                value={registrationExpiresAt}
                onChange={(event) => setRegistrationExpiresAt(event.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Stack>
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
                onChange={(event) => setCameraModel(event.target.value)}
              />
              <TextField
                fullWidth
                size="small"
                label="Sensor resolution"
                placeholder="e.g. 20 MP"
                value={sensorResolution}
                onChange={(event) => setSensorResolution(event.target.value)}
              />
            </Stack>
            <TextField
              select
              size="small"
              label="Thermal imaging capability"
              value={thermalSupport ? 'YES' : 'NO'}
              onChange={(event) => setThermalSupport(event.target.value === 'YES')}
            >
              <MenuItem value="NO">Standard Optical Only</MenuItem>
              <MenuItem value="YES">Thermal & Optical</MenuItem>
            </TextField>
            <TextField
              label={t('Notes')}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="contained" disabled={pending}>
            {t('Register drone')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

function DroneDetailDrawer({
  droneId,
  canManage,
  onClose,
}: {
  droneId: string | null;
  canManage: boolean;
  onClose: () => void;
}) {
  const { formatDate, t } = useLocale();
  const isOpen = Boolean(droneId);
  const drone = useDrone(droneId ?? '', isOpen);
  const updateServiceability = useUpdateDroneServiceability();

  return (
    <Drawer anchor="right" open={Boolean(droneId)} onClose={onClose}>
      <Box
        sx={{
          width: { xs: '100vw', sm: 480 },
          maxWidth: '100vw',
          p: { xs: 2, sm: 3 },
        }}
      >
        {drone.isLoading ? (
          <Typography role="status">{t('Loading drone…')}</Typography>
        ) : drone.error ? (
          <Alert
            severity="error"
            action={
              <Button onClick={() => void drone.refetch()}>{t('Retry drone')}</Button>
            }
          >
            {getErrorMessage(drone.error, 'Could not load drone details.')}
          </Alert>
        ) : drone.data ? (
          <Stack spacing={2}>
            <Box>
              <Typography variant="h6">{drone.data.serialNumber}</Typography>
              <Typography variant="body2" color="text.secondary">
                {drone.data.manufacturer || '—'} · {drone.data.model || '—'}
              </Typography>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                {t('Registration Information')}
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                <strong>{t('Registration number:')}</strong> {drone.data.registrationNumber || '—'}
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                <strong>{t('Expires at:')}</strong>{' '}
                {drone.data.registrationExpiresAt
                  ? formatDate(new Date(drone.data.registrationExpiresAt))
                  : '—'}
              </Typography>
            </Box>

            <Divider />

            <Box>
              <Typography variant="body2">
                {t('Serviceability:')} {drone.data.serviceability}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Serviceability describes maintenance state and is not flight clearance.
              </Typography>
              {canManage && (
                <TextField
                  select
                  fullWidth
                  sx={{ mt: 2 }}
                  label={t('Serviceability')}
                  value={drone.data.serviceability}
                  disabled={updateServiceability.isPending}
                  onChange={(event) =>
                    updateServiceability.mutate({
                      id: drone.data!.id,
                      serviceability: event.target.value as DroneServiceability,
                    })
                  }
                >
                  {SERVICEABILITY_VALUES.map((status) => (
                    <MenuItem key={status} value={status}>
                      {status}
                    </MenuItem>
                  ))}
                </TextField>
              )}
              {updateServiceability.isError && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {getErrorMessage(
                    updateServiceability.error,
                    'Could not update serviceability.',
                  )}
                </Alert>
              )}
            </Box>

            {drone.data.notes && (
              <>
                <Divider />
                <Box>
                  <Typography variant="subtitle2">{t('Notes')}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {drone.data.notes}
                  </Typography>
                </Box>
              </>
            )}
          </Stack>
        ) : null}
      </Box>
    </Drawer>
  );
}
