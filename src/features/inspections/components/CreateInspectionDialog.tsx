import { useState, type FormEvent } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import { useAssets } from '@/features/assets/hooks/useAssets';
import { useDroneSelection } from '@/features/assets/hooks/useDrones';
import { classifyDroneByMtow } from '@/features/assets/utils/droneClassification';
import { useWorkforceUsers } from '@/features/workforce/hooks/useWorkforce';
import { useCreateInspection } from '../hooks/useInspections';
import { getErrorMessage } from '@/shared/api/errorMessage';
import { useLocale } from '@/shared/i18n/LocaleProvider';

export interface CreateInspectionDialogProps {
  open: boolean;
  onClose: () => void;
  preselectedAssetId?: string | null | undefined;
  onSuccess?: ((createdId: string) => void) | undefined;
}

interface InspectionFormProps {
  preselectedAssetId?: string | null | undefined;
  onClose: () => void;
  onSuccess?: ((createdId: string) => void) | undefined;
}

function InspectionForm({ preselectedAssetId, onClose, onSuccess }: InspectionFormProps) {
  const { t } = useLocale();
  const [assetId, setAssetId] = useState(preselectedAssetId ?? '');
  const [inspectorId, setInspectorId] = useState('');
  const [droneId, setDroneId] = useState('');
  const [plannedStartAt, setPlannedStartAt] = useState('');
  const [plannedEndAt, setPlannedEndAt] = useState('');

  const assetsQuery = useAssets({ page: 1, pageSize: 100 }, !preselectedAssetId);
  const workforceQuery = useWorkforceUsers();
  const droneSelectionQuery = useDroneSelection();
  const createInspection = useCreateInspection();

  const activeAssets = (assetsQuery.data?.items ?? []).filter((asset) => asset.status === 'ACTIVE');
  const inspectors = (workforceQuery.data ?? []).filter(
    (user) => user.roles.includes('INSPECTOR') && user.status === 'ACTIVE',
  );
  const drones = (droneSelectionQuery.data ?? []).filter((drone) => drone.serviceability !== 'RETIRED');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!assetId || !inspectorId || !droneId || !plannedStartAt || !plannedEndAt) return;

    const startIso = plannedStartAt.includes('T')
      ? new Date(plannedStartAt).toISOString()
      : new Date(`${plannedStartAt}T08:00:00`).toISOString();
    const endIso = plannedEndAt.includes('T')
      ? new Date(plannedEndAt).toISOString()
      : new Date(`${plannedEndAt}T17:00:00`).toISOString();

    createInspection.mutate(
      { assetId, inspectorId, droneId, plannedStartAt: startIso, plannedEndAt: endIso },
      {
        onSuccess: (data) => {
          onClose();
          onSuccess?.(data.id);
        },
      },
    );
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogTitle sx={{ fontWeight: 700 }}>{t('New Inspection')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {createInspection.isError && (
            <Alert severity="error">
              {getErrorMessage(createInspection.error, 'Could not create the inspection.').includes(
                'SCHEDULE_CONFLICT',
              ) || getErrorMessage(createInspection.error, '').toLowerCase().includes('schedule conflict')
                ? 'Schedule conflict: The assigned inspector or drone is already committed to another active inspection during this planned window. Please select different dates or reassign a different inspector or drone.'
                : getErrorMessage(createInspection.error, 'Could not create the inspection.')}
            </Alert>
          )}

          {!preselectedAssetId && (
            <TextField
              select
              label={t('Target Asset')}
              required
              value={assetId}
              onChange={(event) => setAssetId(event.target.value)}
              helperText={t('Select the infrastructure asset to inspect')}
            >
              {activeAssets.map((asset) => (
                <MenuItem key={asset.id} value={asset.id}>
                  {asset.name} ({asset.code})
                </MenuItem>
              ))}
            </TextField>
          )}

          <TextField
            select
            label={t('Inspector')}
            required
            value={inspectorId}
            onChange={(event) => setInspectorId(event.target.value)}
            helperText={t('Select the qualified remote pilot/inspector')}
          >
            {inspectors.map((inspector) => (
              <MenuItem key={inspector.userId} value={inspector.userId}>
                {inspector.fullName} ({inspector.email})
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label={t('Drone')}
            required
            value={droneId}
            onChange={(event) => setDroneId(event.target.value)}
            helperText={t('Select the drone to dispatch for this mission')}
          >
            {drones.map((drone) => {
              const tier = classifyDroneByMtow(drone.model);
              return (
                <MenuItem key={drone.id} value={drone.id}>
                  {drone.serialNumber} {drone.model ? `(${drone.model})` : ''} · {tier.shortLabel} ({tier.requiredLicenseLabel}) - {drone.serviceability}
                </MenuItem>
              );
            })}
          </TextField>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              required
              label={t('Planned Start Date')}
              type="date"
              value={plannedStartAt}
              onChange={(event) => setPlannedStartAt(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
            <TextField
              required
              label={t('Planned End Date')}
              type="date"
              value={plannedEndAt}
              onChange={(event) => setPlannedEndAt(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={createInspection.isPending}>
          {t('Cancel')}
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={createInspection.isPending || !assetId || !inspectorId || !droneId || !plannedStartAt || !plannedEndAt}
        >
          {createInspection.isPending ? 'Creating…' : t('Create & Dispatch')}
        </Button>
      </DialogActions>
    </form>
  );
}

export function CreateInspectionDialog({
  open,
  onClose,
  preselectedAssetId,
  onSuccess,
}: CreateInspectionDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      {open ? (
        <InspectionForm
          key={preselectedAssetId ?? 'new'}
          preselectedAssetId={preselectedAssetId}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      ) : null}
    </Dialog>
  );
}
