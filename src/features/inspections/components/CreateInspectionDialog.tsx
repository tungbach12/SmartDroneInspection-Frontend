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
  FormControl,
  FormControlLabel,
  FormLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useAssets, useAssetPair } from '@/features/assets/hooks/useAssets';
import { useDroneSelection } from '@/features/assets/hooks/useDrones';
import { useWorkforceUsers } from '@/features/workforce/hooks/useWorkforce';
import { useCreateInspection } from '../hooks/useInspections';
import { useCreateRecurringSchedule, useRecurringSchedules } from '../hooks/useRecurringSchedules';
import type { RecurrenceUnit } from '../api/recurringScheduleApi';
import { getErrorMessage } from '@/shared/api/errorMessage';
import { useLocale } from '@/shared/i18n/LocaleProvider';

function ensureJsonString(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    JSON.parse(trimmed);
    return trimmed;
  } catch {
    return JSON.stringify(trimmed);
  }
}

export interface CreateInspectionDialogProps {
  open: boolean;
  onClose: () => void;
  preselectedAssetId?: string | null | undefined;
  initialScheduleMode?: 'ONE_OFF' | 'RECURRING' | undefined;
  onSuccess?: ((createdId: string) => void) | undefined;
}

interface InspectionFormProps {
  preselectedAssetId?: string | null | undefined;
  initialScheduleMode?: 'ONE_OFF' | 'RECURRING' | undefined;
  onClose: () => void;
  onSuccess?: ((createdId: string) => void) | undefined;
}

function InspectionForm({
  preselectedAssetId,
  initialScheduleMode,
  onClose,
  onSuccess,
}: InspectionFormProps) {
  const { t } = useLocale();
  const [scheduleMode, setScheduleMode] = useState<'ONE_OFF' | 'RECURRING'>(
    initialScheduleMode ?? 'ONE_OFF',
  );
  const [assetId, setAssetId] = useState(preselectedAssetId ?? '');
  const [objective, setObjective] = useState('');
  const [scope, setScope] = useState('');
  const [componentScope, setComponentScope] = useState('');
  const [acceptanceCriteria, setAcceptanceCriteria] = useState('');
  const [plannedStartAt, setPlannedStartAt] = useState('');
  const [plannedEndAt, setPlannedEndAt] = useState('');

  // Recurrence schedule fields
  const defaultTimezone =
    typeof Intl !== 'undefined' && Intl.DateTimeFormat
      ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Ho_Chi_Minh'
      : 'Asia/Ho_Chi_Minh';
  const [anchor, setAnchor] = useState('');
  const [firstWindowEnd, setFirstWindowEnd] = useState('');
  const [timezone, setTimezone] = useState(defaultTimezone);
  const [unit, setUnit] = useState<RecurrenceUnit>('WEEK');
  const [interval, setInterval] = useState(1);
  const [reminderDays, setReminderDays] = useState(3);
  const [endsAt, setEndsAt] = useState('');

  const [overridePair, setOverridePair] = useState(false);
  const [overrideInspectorId, setOverrideInspectorId] = useState('');
  const [overrideDroneId, setOverrideDroneId] = useState('');
  const [reassignmentReason, setReassignmentReason] = useState('');

  const assetsQuery = useAssets({ page: 1, pageSize: 100 }, !preselectedAssetId);
  const assetPairQuery = useAssetPair(assetId || null);
  const workforceQuery = useWorkforceUsers();
  const droneSelectionQuery = useDroneSelection();
  const createInspection = useCreateInspection();
  const createRecurringSchedule = useCreateRecurringSchedule();
  const recurringSchedulesQuery = useRecurringSchedules({ assetId: assetId || undefined, status: 'ACTIVE' });

  const activeAssets = (assetsQuery.data?.items ?? []).filter((a) => a.status === 'ACTIVE');
  const inspectors = (workforceQuery.data ?? []).filter(
    (u) => u.roles.includes('INSPECTOR') && u.status === 'ACTIVE',
  );
  const drones = (droneSelectionQuery.data ?? []).filter((d) => d.serviceability !== 'RETIRED');

  const defaultPair = assetPairQuery.data;
  const activeSchedules = (recurringSchedulesQuery.data?.items ?? []).filter(
    (s) => s.status === 'ACTIVE' && (!assetId || s.assetId === assetId),
  );
  const hasActiveRecurringSchedule = scheduleMode === 'RECURRING' && activeSchedules.length > 0;

  const handleToggleOverride = (checked: boolean) => {
    setOverridePair(checked);
    if (checked && defaultPair) {
      if (!overrideInspectorId) setOverrideInspectorId(defaultPair.inspectorUserId);
      if (!overrideDroneId) setOverrideDroneId(defaultPair.droneId);
    }
  };

  const isPending = createInspection.isPending || createRecurringSchedule.isPending;
  const currentError =
    scheduleMode === 'ONE_OFF' ? createInspection.error : createRecurringSchedule.error;
  const isError =
    scheduleMode === 'ONE_OFF' ? createInspection.isError : createRecurringSchedule.isError;

  const calculateDurationSeconds = (): number => {
    if (anchor && firstWindowEnd) {
      const startMs = new Date(anchor).getTime();
      const endMs = new Date(firstWindowEnd).getTime();
      const diffSec = Math.round((endMs - startMs) / 1000);
      if (diffSec > 0) return diffSec;
    }
    return 7200; // default 2 hours
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!assetId || !objective.trim()) return;

    if (scheduleMode === 'ONE_OFF') {
      createInspection.mutate(
        {
          assetId,
          objective: objective.trim(),
          scope: ensureJsonString(scope),
          componentScope: ensureJsonString(componentScope),
          acceptanceCriteria: ensureJsonString(acceptanceCriteria),
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
    } else {
      if (!anchor) return;
      const formattedAnchor = anchor.length === 16 ? `${anchor}:00` : anchor;
      const durationSeconds = calculateDurationSeconds();

      createRecurringSchedule.mutate(
        {
          assetId,
          objective: objective.trim(),
          scope: ensureJsonString(scope),
          componentScope: ensureJsonString(componentScope),
          acceptanceCriteria: ensureJsonString(acceptanceCriteria),
          anchor: formattedAnchor,
          timezone: timezone.trim() || defaultTimezone,
          unit,
          interval: Math.max(1, Math.min(120, Number(interval) || 1)),
          durationSeconds,
          reminderDays: Math.max(0, Math.min(30, Number(reminderDays) || 3)),
          endsAt: endsAt ? new Date(endsAt).toISOString() : null,
          inspectorId: overridePair && overrideInspectorId ? overrideInspectorId : null,
          droneId: overridePair && overrideDroneId ? overrideDroneId : null,
        },
        {
          onSuccess: (data) => {
            onClose();
            if (onSuccess) onSuccess(data.id);
          },
        },
      );
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogTitle sx={{ fontWeight: 700 }}>
        {scheduleMode === 'RECURRING' ? t('New Recurring Schedule') : t('New Inspection')}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {isError && (
            <Alert severity="error">
              {getErrorMessage(currentError, 'Could not create the inspection.').includes(
                'SCHEDULE_CONFLICT',
              ) ||
              getErrorMessage(currentError, '')
                .toLowerCase()
                .includes('schedule conflict')
                ? 'Schedule conflict: The assigned inspector or drone is already committed to another active inspection during this planned window. Please select different dates or reassign a different inspector or drone.'
                : getErrorMessage(currentError, 'Could not create the inspection.')}
            </Alert>
          )}

          {hasActiveRecurringSchedule && (
            <Alert severity="warning">
              {t(
                'This asset already has an active recurring inspection schedule. End the existing schedule before creating a new one.',
              )}
            </Alert>
          )}

          <FormControl component="fieldset">
            <FormLabel component="legend" sx={{ fontSize: '0.85rem', fontWeight: 600 }}>
              {t('Inspection schedule type')}
            </FormLabel>
            <RadioGroup
              row
              value={scheduleMode}
              onChange={(e) => setScheduleMode(e.target.value as 'ONE_OFF' | 'RECURRING')}
            >
              <FormControlLabel
                value="ONE_OFF"
                control={<Radio size="small" />}
                label={t('One-off inspection')}
              />
              <FormControlLabel
                value="RECURRING"
                control={<Radio size="small" />}
                label={t('Recurring schedule')}
              />
            </RadioGroup>
          </FormControl>

          {!preselectedAssetId ? (
            <TextField
              select
              label={t('Target Asset')}
              required
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              helperText={t('Select the infrastructure asset to inspect')}
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
                {t('Default Operational Pair')}
              </Typography>
              {assetPairQuery.isLoading ? (
                <CircularProgress size={20} sx={{ mt: 1 }} />
              ) : defaultPair ? (
                <Typography variant="body2" sx={{ mt: 0.5, color: '#475569' }}>
                  <strong>{t('Inspector:')}</strong>{' '}
                  {defaultPair.inspectorName ?? defaultPair.inspectorUserId}
                  <br />
                  <strong>Drone:</strong> {defaultPair.droneSerialNumber}{' '}
                  {defaultPair.droneModel ? `(${defaultPair.droneModel})` : ''}
                </Typography>
              ) : (
                <Typography variant="body2" color="warning.main" sx={{ mt: 0.5 }}>
                  {t('No default pair assigned. You must specify an inspector and drone below.')}
                </Typography>
              )}
            </Box>
          )}

          <TextField
            label={t('Inspection Objective')}
            required
            multiline
            rows={2}
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder={t('e.g. Periodic visual crack survey and structural alignment check')}
            helperText={t('State the objective and required focus of this mission')}
          />

          {scheduleMode === 'ONE_OFF' ? (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label={t('Planned Start')}
                type="datetime-local"
                value={plannedStartAt}
                onChange={(e) => setPlannedStartAt(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />
              <TextField
                label={t('Planned End')}
                type="datetime-local"
                value={plannedEndAt}
                onChange={(e) => setPlannedEndAt(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />
            </Stack>
          ) : (
            <Stack
              spacing={2}
              sx={{
                p: 2,
                bgcolor: '#f1f5f9',
                borderRadius: 1.5,
                border: '1px solid #cbd5e1',
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                {t('Recurrence Configuration')}
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  select
                  label={t('Recurrence Frequency')}
                  required
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as RecurrenceUnit)}
                  fullWidth
                >
                  <MenuItem value="WEEK">{t('Weekly')}</MenuItem>
                  <MenuItem value="MONTH">{t('Monthly')}</MenuItem>
                  <MenuItem value="YEAR">{t('Yearly')}</MenuItem>
                </TextField>
                <TextField
                  label={t('Repeat Interval')}
                  type="number"
                  required
                  value={interval}
                  onChange={(e) => setInterval(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  slotProps={{ htmlInput: { min: 1, max: 120 } }}
                  helperText={t('Interval units between occurrences')}
                  fullWidth
                />
              </Stack>

              <TextField
                label={t('Timezone Anchor')}
                required
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                helperText={t('IANA timezone for recurring calendar calculation')}
                fullWidth
              />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label={t('First Window Start')}
                  type="datetime-local"
                  required
                  value={anchor}
                  onChange={(e) => setAnchor(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                  helperText={t('Anchor date and start time for first occurrence')}
                  fullWidth
                />
                <TextField
                  label={t('First Window End')}
                  type="datetime-local"
                  value={firstWindowEnd}
                  onChange={(e) => setFirstWindowEnd(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                  helperText={
                    anchor && firstWindowEnd
                      ? `${t('Duration:')} ${(calculateDurationSeconds() / 3600).toFixed(1)} ${t('hours')}`
                      : t('End time of first occurrence (sets duration)')
                  }
                  fullWidth
                />
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label={t('Reminder Days')}
                  type="number"
                  value={reminderDays}
                  onChange={(e) => setReminderDays(Math.max(0, Math.min(30, parseInt(e.target.value, 10) || 0)))}
                  slotProps={{ htmlInput: { min: 0, max: 30 } }}
                  helperText={t('Days before inspection to notify (default: 3)')}
                  fullWidth
                />
                <TextField
                  label={t('End Date (Optional)')}
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                  helperText={t('Optional schedule termination date')}
                  fullWidth
                />
              </Stack>
            </Stack>
          )}

          <TextField
            label={t('Method / General Scope')}
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            placeholder={t('e.g. {"method": "visual", "sensor": "RGB"}')}
            helperText={t('General inspection methodology and configuration')}
          />

          <TextField
            label={t('Component Scope')}
            value={componentScope}
            onChange={(e) => setComponentScope(e.target.value)}
            placeholder={t('e.g. ["main span", "pier 1", "abutment"]')}
            helperText={t('Components or structures included in this inspection')}
          />

          <TextField
            label={t('Acceptance Criteria')}
            value={acceptanceCriteria}
            onChange={(e) => setAcceptanceCriteria(e.target.value)}
            placeholder={t('e.g. {"minResolution": "0.5mm", "coverage": "100%"}')}
            helperText={t('Criteria required for satisfactory inspection')}
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={overridePair || !defaultPair}
                onChange={(e) => handleToggleOverride(e.target.checked)}
                disabled={!defaultPair}
              />
            }
            label={t('Reassign Inspector or Drone for this inspection')}
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
                {t('SPECIFIC MISSION ASSIGNMENT')}
              </Typography>
              <TextField
                select
                label={t('Inspector')}
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

              {scheduleMode === 'ONE_OFF' && (
                <TextField
                  label={t('Reassignment Reason')}
                  required={overridePair}
                  value={reassignmentReason}
                  onChange={(e) => setReassignmentReason(e.target.value)}
                  placeholder={t('e.g. Primary inspector on leave / special thermal payload required')}
                />
              )}
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={isPending}>
          {t('Cancel')}
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={
            isPending ||
            !assetId ||
            !objective.trim() ||
            hasActiveRecurringSchedule ||
            (scheduleMode === 'RECURRING' && !anchor)
          }
        >
          {isPending
            ? 'Creating…'
            : scheduleMode === 'RECURRING'
              ? t('Create Schedule')
              : t('Create & Dispatch')}
        </Button>
      </DialogActions>
    </form>
  );
}

export function CreateInspectionDialog({
  open,
  onClose,
  preselectedAssetId,
  initialScheduleMode,
  onSuccess,
}: CreateInspectionDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      {open ? (
        <InspectionForm
          key={`${preselectedAssetId ?? 'new'}-${initialScheduleMode ?? 'ONE_OFF'}`}
          preselectedAssetId={preselectedAssetId}
          initialScheduleMode={initialScheduleMode}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      ) : null}
    </Dialog>
  );
}
