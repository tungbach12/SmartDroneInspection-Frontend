import { useState, type FormEvent } from 'react';
import {
  Alert,
  Button,
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
import { useAssets } from '@/features/assets/hooks/useAssets';
import { useDroneSelection } from '@/features/assets/hooks/useDrones';
import { useWorkforceUsers } from '@/features/workforce/hooks/useWorkforce';
import { useCreateInspection } from '../hooks/useInspections';
import { useCreateRecurringSchedule, useRecurringSchedules } from '../hooks/useRecurringSchedules';
import type { RecurrenceUnit } from '../api/recurringScheduleApi';
import { getErrorMessage } from '@/shared/api/errorMessage';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { useIsDarkMode } from '@/app/layouts/ColorModeContext';

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
  const isDark = useIsDarkMode();
  const [scheduleMode, setScheduleMode] = useState<'ONE_OFF' | 'RECURRING'>(
    initialScheduleMode ?? 'ONE_OFF',
  );
  const [assetId, setAssetId] = useState(preselectedAssetId ?? '');
  const [inspectorId, setInspectorId] = useState('');
  const [droneId, setDroneId] = useState('');
  const [plannedStartAt, setPlannedStartAt] = useState('');
  const [plannedEndAt, setPlannedEndAt] = useState('');

  // Recurrence schedule fields
  const defaultTimezone =
    typeof Intl !== 'undefined' && Intl.DateTimeFormat
      ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Ho_Chi_Minh'
      : 'Asia/Ho_Chi_Minh';
  const [anchor, setAnchor] = useState('');
  const [timezone, setTimezone] = useState(defaultTimezone);
  const [unit, setUnit] = useState<RecurrenceUnit>('WEEK');
  const [interval, setInterval] = useState(1);
  const [reminderDays, setReminderDays] = useState(3);
  const [endsAt, setEndsAt] = useState('');

  const assetsQuery = useAssets({ page: 1, pageSize: 100 }, !preselectedAssetId);
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

  const activeSchedules = (recurringSchedulesQuery.data?.items ?? []).filter(
    (s) => s.status === 'ACTIVE' && (!assetId || s.assetId === assetId),
  );
  const hasActiveRecurringSchedule = scheduleMode === 'RECURRING' && activeSchedules.length > 0;

  const isPending = createInspection.isPending || createRecurringSchedule.isPending;
  const currentError =
    scheduleMode === 'ONE_OFF' ? createInspection.error : createRecurringSchedule.error;
  const isError =
    scheduleMode === 'ONE_OFF' ? createInspection.isError : createRecurringSchedule.isError;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!assetId || !inspectorId || !droneId) return;

    if (scheduleMode === 'ONE_OFF') {
      if (!plannedStartAt || !plannedEndAt) return;
      const startIso = plannedStartAt.includes('T')
        ? new Date(plannedStartAt).toISOString()
        : new Date(`${plannedStartAt}T08:00:00`).toISOString();
      const endIso = plannedEndAt.includes('T')
        ? new Date(plannedEndAt).toISOString()
        : new Date(`${plannedEndAt}T17:00:00`).toISOString();

      createInspection.mutate(
        {
          assetId,
          inspectorId,
          droneId,
          plannedStartAt: startIso,
          plannedEndAt: endIso,
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
      const formattedAnchor = anchor.includes('T')
        ? (anchor.length === 16 ? `${anchor}:00` : anchor)
        : `${anchor}T08:00:00`;
      const durationSeconds = 9 * 3600; // 9 hours (08:00 to 17:00 shift)
      const endsAtIso = endsAt
        ? (endsAt.includes('T') ? new Date(endsAt).toISOString() : new Date(`${endsAt}T23:59:59`).toISOString())
        : null;

      createRecurringSchedule.mutate(
        {
          assetId,
          anchor: formattedAnchor,
          timezone: timezone.trim() || defaultTimezone,
          unit,
          interval: Math.max(1, Math.min(120, Number(interval) || 1)),
          durationSeconds,
          reminderDays: Math.max(0, Math.min(30, Number(reminderDays) || 3)),
          endsAt: endsAtIso,
          inspectorId,
          droneId,
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

          <TextField
            select
            label={t('Inspector')}
            required
            value={inspectorId}
            onChange={(e) => setInspectorId(e.target.value)}
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
            onChange={(e) => setDroneId(e.target.value)}
            helperText={t('Select the drone to dispatch for this mission')}
          >
            {drones.map((drone) => (
              <MenuItem key={drone.id} value={drone.id}>
                {drone.serialNumber} {drone.model ? `(${drone.model})` : ''} - {drone.serviceability}
              </MenuItem>
            ))}
          </TextField>

          {scheduleMode === 'ONE_OFF' ? (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                required
                label={t('Planned Start Date')}
                type="date"
                value={plannedStartAt}
                onChange={(e) => setPlannedStartAt(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />
              <TextField
                required
                label={t('Planned End Date')}
                type="date"
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
                bgcolor: isDark ? 'rgba(30, 41, 59, 0.45)' : '#f1f5f9',
                borderRadius: '12px',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
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
                  label={t('First Inspection Date')}
                  type="date"
                  required
                  value={anchor}
                  onChange={(e) => setAnchor(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                  helperText={t('Start date for first recurring occurrence')}
                  fullWidth
                />
                <TextField
                  label={t('End Date (Optional)')}
                  type="date"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                  helperText={t('Optional schedule termination date')}
                  fullWidth
                />
              </Stack>

              <TextField
                label={t('Reminder Days')}
                type="number"
                value={reminderDays}
                onChange={(e) => setReminderDays(Math.max(0, Math.min(30, parseInt(e.target.value, 10) || 0)))}
                slotProps={{ htmlInput: { min: 0, max: 30 } }}
                helperText={t('Days before inspection to notify (default: 3)')}
                fullWidth
              />
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
            !inspectorId ||
            !droneId ||
            (scheduleMode === 'ONE_OFF'
              ? !plannedStartAt || !plannedEndAt
              : !anchor || hasActiveRecurringSchedule)
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
