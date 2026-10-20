import { useState, type FormEvent } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useAssets, useAssetPair } from '@/features/assets/hooks/useAssets';
import { useDroneSelection } from '@/features/assets/hooks/useDrones';
import { useWorkforceUsers } from '@/features/workforce/hooks/useWorkforce';
import { useCreateInspection } from '../hooks/useInspections';
import { getErrorMessage } from '@/shared/api/errorMessage';

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
  const [assetId, setAssetId] = useState(preselectedAssetId ?? '');
  const [objective, setObjective] = useState('');
  const [scope, setScope] = useState('');
  const [componentScope, setComponentScope] = useState('');
  const [acceptanceCriteria, setAcceptanceCriteria] = useState('');
  const [plannedStartAt, setPlannedStartAt] = useState('');
  const [plannedEndAt, setPlannedEndAt] = useState('');

  const [overridePair, setOverridePair] = useState(false);
  const [overrideInspectorId, setOverrideInspectorId] = useState('');
  const [overrideDroneId, setOverrideDroneId] = useState('');
  const [reassignmentReason, setReassignmentReason] = useState('');

  const assetsQuery = useAssets({ page: 1, pageSize: 100 }, !preselectedAssetId);
  const assetPairQuery = useAssetPair(assetId || null);
  const workforceQuery = useWorkforceUsers();
  const droneSelectionQuery = useDroneSelection();
  const createInspection = useCreateInspection();

  const activeAssets = (assetsQuery.data?.items ?? []).filter((a) => a.status === 'ACTIVE');
  const inspectors = (workforceQuery.data ?? []).filter(
    (u) => u.roles.includes('INSPECTOR') && u.status === 'ACTIVE',
  );
  const drones = (droneSelectionQuery.data ?? []).filter((d) => d.serviceability !== 'RETIRED');

  const defaultPair = assetPairQuery.data;

  const handleToggleOverride = (checked: boolean) => {
    setOverridePair(checked);
    if (checked && defaultPair) {
      if (!overrideInspectorId) setOverrideInspectorId(defaultPair.inspectorUserId);
      if (!overrideDroneId) setOverrideDroneId(defaultPair.droneId);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!assetId || !objective.trim()) return;

    createInspection.mutate(
      {
        assetId,
        objective: objective.trim(),
        scope: scope.trim() || null,
        componentScope: componentScope.trim() || null,
        acceptanceCriteria: acceptanceCriteria.trim() || null,
        plannedStartAt: plannedStartAt ? new Date(plannedStartAt).toISOString() : null,
        plannedEndAt: plannedEndAt ? new Date(plannedEndAt).toISOString() : null,
        inspectorId: overridePair && overrideInspectorId ? overrideInspectorId : null,
        droneId: overridePair && overrideDroneId ? overrideDroneId : null,
        reassignmentReason: overridePair && reassignmentReason ? reassignmentReason.trim() : null,
      },
      {
        onSuccess: (data) => {
          onClose();
          if (onSuccess) onSuccess(data.id);
        },
      },
    );
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogTitle sx={{ fontWeight: 700 }}>New Inspection</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {createInspection.isError && (
            <Alert severity="error">
              {getErrorMessage(createInspection.error, 'Could not create the inspection.')}
            </Alert>
          )}

          {!preselectedAssetId ? (
            <TextField
              select
              label="Target Asset"
              required
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              helperText="Select the infrastructure asset to inspect"
            >
              {activeAssets.map((asset) => (
                <MenuItem key={asset.id} value={asset.id}>
                  {asset.name} ({asset.code})
                </MenuItem>
              ))}
            </TextField>
          ) : null}

          {assetId && (
            <Box
              sx={{
                p: 2,
                bgcolor: '#f8fafc',
                borderRadius: 1.5,
                border: '1px solid #e2e8f0',
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#334155' }}>
                Default Operational Pair
              </Typography>
              {assetPairQuery.isLoading ? (
                <CircularProgress size={20} sx={{ mt: 1 }} />
              ) : defaultPair ? (
                <Typography variant="body2" sx={{ mt: 0.5, color: '#475569' }}>
                  <strong>Inspector:</strong>{' '}
                  {defaultPair.inspectorName ?? defaultPair.inspectorUserId}
                  <br />
                  <strong>Drone:</strong> {defaultPair.droneSerialNumber}{' '}
                  {defaultPair.droneModel ? `(${defaultPair.droneModel})` : ''}
                </Typography>
              ) : (
                <Typography variant="body2" color="warning.main" sx={{ mt: 0.5 }}>
                  No default pair assigned. You must specify an inspector and drone below.
                </Typography>
              )}
            </Box>
          )}

          <TextField
            label="Inspection Objective"
            required
            multiline
            rows={2}
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="e.g. Periodic visual crack survey and structural alignment check"
            helperText="State the objective and required focus of this mission"
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Planned Start"
              type="datetime-local"
              value={plannedStartAt}
              onChange={(e) => setPlannedStartAt(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
            <TextField
              label="Planned End"
              type="datetime-local"
              value={plannedEndAt}
              onChange={(e) => setPlannedEndAt(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
          </Stack>

          <TextField
            label="Method / General Scope"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            placeholder='e.g. {"method": "visual", "sensor": "RGB"}'
            helperText="General inspection methodology and configuration"
          />

          <TextField
            label="Component Scope"
            value={componentScope}
            onChange={(e) => setComponentScope(e.target.value)}
            placeholder='e.g. ["main span", "pier 1", "abutment"]'
            helperText="Components or structures included in this inspection"
          />

          <TextField
            label="Acceptance Criteria"
            value={acceptanceCriteria}
            onChange={(e) => setAcceptanceCriteria(e.target.value)}
            placeholder='e.g. {"minResolution": "0.5mm", "coverage": "100%"}'
            helperText="Criteria required for satisfactory inspection"
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={overridePair || !defaultPair}
                onChange={(e) => handleToggleOverride(e.target.checked)}
                disabled={!defaultPair}
              />
            }
            label="Reassign Inspector or Drone for this inspection"
          />

          {(overridePair || !defaultPair) && (
            <Stack
              spacing={2}
              sx={{
                p: 2,
                bgcolor: '#fff',
                borderRadius: 1.5,
                border: '1px solid #cbd5e1',
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 600, color: '#64748b' }}>
                SPECIFIC MISSION ASSIGNMENT
              </Typography>
              <TextField
                select
                label="Inspector"
                required={overridePair || !defaultPair}
                value={overrideInspectorId}
                onChange={(e) => setOverrideInspectorId(e.target.value)}
              >
                {inspectors.map((inspector) => (
                  <MenuItem key={inspector.userId} value={inspector.userId}>
                    {inspector.fullName} ({inspector.email})
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label="Drone"
                required={overridePair || !defaultPair}
                value={overrideDroneId}
                onChange={(e) => setOverrideDroneId(e.target.value)}
              >
                {drones.map((drone) => (
                  <MenuItem key={drone.id} value={drone.id}>
                    {drone.serialNumber} {drone.model ? `(${drone.model})` : ''} -{' '}
                    {drone.serviceability}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Reassignment Reason"
                required={overridePair}
                value={reassignmentReason}
                onChange={(e) => setReassignmentReason(e.target.value)}
                placeholder="e.g. Primary inspector on leave / special thermal payload required"
              />
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={createInspection.isPending}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={createInspection.isPending || !assetId || !objective.trim()}
        >
          {createInspection.isPending ? 'Creating…' : 'Create & Dispatch'}
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
