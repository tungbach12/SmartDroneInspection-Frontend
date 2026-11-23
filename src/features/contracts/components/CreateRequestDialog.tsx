import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddBusinessRoundedIcon from '@mui/icons-material/AddBusinessRounded';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import { getErrorMessage } from '@/shared/api/errorMessage';
import { type CreateServiceRequestInput, type ServiceRequest } from '../api/contractApi';
import {
  addAnchoredMonths,
  addCalendarDays,
  enumerateMonthlySchedule,
  MINIMUM_INSPECTION_LEAD_DAYS,
} from '../api/recurrenceSchedule';
import { useCreateServiceRequest } from '../hooks/useContracts';
import { CalendarDateField, formatCalendarIsoDate } from '../shared/CalendarDateField';

interface CreateRequestDialogProps {
  open: boolean;
  onClose: () => void;
  assets: { id: string; name: string; code: string; status?: string }[];
  existingRequests?: ServiceRequest[];
  onCreated: (requestId: string) => void;
  onError: (message: string) => void;
  initialAssetId?: string | undefined;
  sourceInspectionId?: string | undefined;
  sourceInspectionLabel?: string | undefined;
}

function isActiveServiceRequest(request: ServiceRequest): boolean {
  if (request.status === 'CANCELLED') {
    return false;
  }
  if (request.status !== 'ASSIGNED') {
    return true;
  }
  if (!request.occurrences || request.occurrences.length === 0) {
    return true;
  }
  return request.occurrences.some(
    (occ) => occ.status !== 'CANCELLED' && !occ.reportAcceptedAt,
  );
}

const MINIMUM_LEAD_DAYS = MINIMUM_INSPECTION_LEAD_DAYS;
const MAX_RECURRENCE_MONTHS = 120;
const MAX_OCCURRENCES = 100;
const RECURRENCE_PRESETS = ['1', '3', '6', '9', '12'];

function dateInZone(timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function CreateRequestDialog({
  open,
  onClose,
  assets,
  existingRequests = [],
  onCreated,
  onError: _onError,
  initialAssetId,
  sourceInspectionId,
  sourceInspectionLabel,
}: CreateRequestDialogProps) {
  const { locale, t } = useLocale();
  const create = useCreateServiceRequest();
  const [assetId, setAssetId] = useState(initialAssetId ?? '');
  const [from, setFrom] = useState('');
  const [requestType, setRequestType] = useState<'ONE_TIME' | 'RECURRING'>('ONE_TIME');
  const [intervalPreset, setIntervalPreset] = useState('1');
  const [customInterval, setCustomInterval] = useState('2');
  const [recurrenceLimit, setRecurrenceLimit] = useState<'COUNT' | 'END_DATE'>('COUNT');
  const [count, setCount] = useState('4');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [validationError, setValidationError] = useState('');
  const timezone = 'Asia/Ho_Chi_Minh';
  const minStartDate = addCalendarDays(dateInZone(timezone), MINIMUM_LEAD_DAYS);

  const activeAssetIds = useMemo(() => {
    const blocked = new Set<string>();
    if (sourceInspectionId) return blocked;
    for (const req of existingRequests) {
      if (req.assetId && isActiveServiceRequest(req)) {
        blocked.add(req.assetId);
      }
    }
    return blocked;
  }, [existingRequests, sourceInspectionId]);

  const selectableAssets = useMemo(
    () => assets.filter((asset) => asset.status !== 'RETIRED'),
    [assets],
  );
  const allAssetsBusy =
    !sourceInspectionId &&
    selectableAssets.length > 0 &&
    selectableAssets.every((asset) => activeAssetIds.has(asset.id));
  const effectiveInterval = intervalPreset === 'CUSTOM' ? customInterval : intervalPreset;
  const intervalMonths = Number(effectiveInterval);
  const isValidInterval =
    Number.isInteger(intervalMonths) && intervalMonths >= 1 && intervalMonths <= MAX_RECURRENCE_MONTHS;
  const recurrenceDates = useMemo(() => {
    if (requestType !== 'RECURRING' || !from || !isValidInterval) return [] as string[];
    return enumerateMonthlySchedule(from, intervalMonths, {
      ...(recurrenceLimit === 'COUNT' ? { count: Number(count) } : { endDate: recurrenceEndDate }),
      maxOccurrences: MAX_OCCURRENCES,
    });
  }, [count, from, intervalMonths, isValidInterval, recurrenceEndDate, recurrenceLimit, requestType]);
  const previewDates =
    recurrenceDates.length <= 5
      ? recurrenceDates
      : [...recurrenceDates.slice(0, 3), '…', recurrenceDates[recurrenceDates.length - 1]];

  const handleSubmit = async () => {
    setValidationError('');
    const chosenAssetId = assetId || initialAssetId || '';
    if (!chosenAssetId) {
      setValidationError(t('Please select the asset to inspect.'));
      return;
    }
    if (!sourceInspectionId && activeAssetIds.has(chosenAssetId)) {
      setValidationError(t('This asset already has an active service request in progress.'));
      return;
    }
    if (!from || from < minStartDate) {
      setValidationError(
        t('The first inspection date must be at least 20 days from today.'),
      );
      return;
    }
    if (requestType === 'RECURRING') {
      if (!isValidInterval) {
        setValidationError(t('Enter a monthly interval between 1 and 120 months.'));
        return;
      }
      if (recurrenceDates.length > MAX_OCCURRENCES) {
        setValidationError(t('A recurring request cannot contain more than 100 occurrences.'));
        return;
      }
      if (
        recurrenceLimit === 'COUNT' &&
        (!Number.isInteger(Number(count)) || Number(count) < 2 || Number(count) > MAX_OCCURRENCES)
      ) {
        setValidationError(t('A recurring request must contain between 2 and 100 occurrences.'));
        return;
      }
      if (recurrenceLimit === 'END_DATE' && recurrenceDates.length < 2) {
        setValidationError(t('Choose an end date that includes at least two occurrences.'));
        return;
      }
      if (recurrenceDates.length > MAX_OCCURRENCES) {
        setValidationError(t('A recurring request cannot contain more than 100 occurrences.'));
        return;
      }
    }

    const effectiveAssetId = assetId || initialAssetId || '';
    const input: CreateServiceRequestInput = {
      assetId: effectiveAssetId,
      requestedFrom: from,
      timezone,
      requestType,
      ...(sourceInspectionId ? { sourceInspectionId } : {}),
      ...(requestType === 'RECURRING'
        ? {
            recurrenceUnit: 'MONTH',
            recurrenceInterval: intervalMonths,
            ...(recurrenceLimit === 'COUNT'
              ? { occurrenceCount: Number(count) }
              : { recurrenceEndDate }),
          }
        : {}),
    };

    try {
      const request = await create.mutateAsync(input);
      onCreated(request.id);
      onClose();
      setAssetId('');
      setFrom('');
      setRequestType('ONE_TIME');
      setIntervalPreset('1');
      setCustomInterval('2');
      setCount('4');
      setRecurrenceLimit('COUNT');
      setRecurrenceEndDate('');
    } catch (error) {
      const message = getErrorMessage(error, t('Unable to create service request.'));
      setValidationError(message);
    }
  };

  const changeStartDate = (value: string) => {
    setFrom(value);
    if (requestType === 'RECURRING' && recurrenceLimit === 'END_DATE' && isValidInterval) {
      setRecurrenceEndDate(addAnchoredMonths(value, intervalMonths));
    }
  };

  const changeIntervalPreset = (value: string) => {
    setIntervalPreset(value);
    if (value !== 'CUSTOM' && recurrenceLimit === 'END_DATE' && from) {
      setRecurrenceEndDate(addAnchoredMonths(from, Number(value)));
    }
  };

  const earliestSecondOccurrence = from && isValidInterval ? addAnchoredMonths(from, intervalMonths) : '';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
        <AddBusinessRoundedIcon color="primary" />
        {t('Create inspection request')}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          {validationError && (
            <Alert severity="error" onClose={() => setValidationError('')}>
              {validationError}
            </Alert>
          )}

          {sourceInspectionId && (
            <Alert severity="info" sx={{ borderRadius: '8px' }}>
              {t('Re-inspection linked to source inspection')}
              {sourceInspectionLabel ? `: ${sourceInspectionLabel}` : ` #${sourceInspectionId.slice(0, 8)}`}
            </Alert>
          )}

          {selectableAssets.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: '8px' }}>
              {t('No active assets found. Register an asset before submitting a service request.')}
            </Alert>
          ) : (
            <FormControl fullWidth size="small" required>
              <InputLabel id="dialog-asset-label">{t('Asset / structure')}</InputLabel>
              <Select
                labelId="dialog-asset-label"
                label={t('Asset / structure')}
                value={activeAssetIds.has(assetId || initialAssetId || '') ? '' : (assetId || initialAssetId || '')}
                disabled={Boolean(sourceInspectionId && initialAssetId)}
                onChange={(event) => setAssetId(event.target.value)}
              >
                {selectableAssets.map((asset) => {
                  const hasActiveRequest = activeAssetIds.has(asset.id);
                  return (
                    <MenuItem key={asset.id} value={asset.id} disabled={hasActiveRequest}>
                      {asset.code} — {asset.name}
                      {hasActiveRequest ? ` (${t('Already has active request')})` : ''}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
          )}

          {allAssetsBusy && (
            <Alert severity="info">
              {t('All available assets already have an active service request in progress.')}
            </Alert>
          )}

          <FormControl fullWidth size="small">
            <InputLabel id="dialog-type-label">{t('Inspection frequency')}</InputLabel>
            <Select
              labelId="dialog-type-label"
              label={t('Inspection frequency')}
              value={requestType}
              onChange={(event) => {
                const next = event.target.value as 'ONE_TIME' | 'RECURRING';
                setRequestType(next);
                if (next === 'RECURRING' && from && isValidInterval) {
                  setRecurrenceEndDate(addAnchoredMonths(from, intervalMonths));
                }
              }}
            >
              <MenuItem value="ONE_TIME">{t('One-time inspection')}</MenuItem>
              <MenuItem value="RECURRING">{t('Recurring inspection')}</MenuItem>
            </Select>
          </FormControl>

          <CalendarDateField
            label={requestType === 'ONE_TIME' ? t('Inspection date') : t('First expected inspection date')}
            value={from}
            minDate={minStartDate}
            locale={locale}
            onChange={changeStartDate}
          />
          {requestType === 'RECURRING' && (
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: '8px', bgcolor: 'background.default' }}>
              <Stack spacing={1.5}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  {t('Recurring schedule')}
                </Typography>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="dialog-interval-label">{t('Repeat every')}</InputLabel>
                    <Select
                      labelId="dialog-interval-label"
                      label={t('Repeat every')}
                      value={intervalPreset}
                      onChange={(event) => changeIntervalPreset(event.target.value)}
                    >
                      {RECURRENCE_PRESETS.map((months) => (
                        <MenuItem key={months} value={months}>
                          {t('Every N months').replace('N', months)}
                        </MenuItem>
                      ))}
                      <MenuItem value="CUSTOM">{t('Custom monthly interval')}</MenuItem>
                    </Select>
                  </FormControl>
                  {intervalPreset === 'CUSTOM' && (
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      label={t('Months between inspections')}
                      value={customInterval}
                      onChange={(event) => {
                        setCustomInterval(event.target.value);
                        if (recurrenceLimit === 'END_DATE' && from) {
                          const value = Number(event.target.value);
                          if (Number.isInteger(value) && value >= 1 && value <= MAX_RECURRENCE_MONTHS) {
                            setRecurrenceEndDate(addAnchoredMonths(from, value));
                          }
                        }
                      }}
                      slotProps={{ htmlInput: { min: 1, max: MAX_RECURRENCE_MONTHS, step: 1 } }}
                    />
                  )}
                </Stack>

                <FormControl fullWidth size="small">
                  <InputLabel id="dialog-bound-label">{t('Schedule ends')}</InputLabel>
                  <Select
                    labelId="dialog-bound-label"
                    label={t('Schedule ends')}
                    value={recurrenceLimit}
                    onChange={(event) => {
                      const next = event.target.value as 'COUNT' | 'END_DATE';
                      setRecurrenceLimit(next);
                      if (next === 'END_DATE' && from && isValidInterval) {
                        setRecurrenceEndDate(addAnchoredMonths(from, intervalMonths));
                      }
                    }}
                  >
                    <MenuItem value="COUNT">{t('Fixed count')}</MenuItem>
                    <MenuItem value="END_DATE">{t('On an end date')}</MenuItem>
                  </Select>
                </FormControl>

                {recurrenceLimit === 'COUNT' ? (
                  <TextField
                    label={t('Total planned inspections')}
                    type="number"
                    size="small"
                    fullWidth
                    value={count}
                    onChange={(event) => setCount(event.target.value)}
                    slotProps={{ htmlInput: { min: 2, max: MAX_OCCURRENCES, step: 1 } }}
                  />
                ) : (
                  <TextField
                    label={t('Schedule end date')}
                    type="date"
                    size="small"
                    fullWidth
                    value={recurrenceEndDate}
                    onChange={(event) => setRecurrenceEndDate(event.target.value)}
                    slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: earliestSecondOccurrence } }}
                    helperText={t('The schedule must include at least two inspection dates.')}
                  />
                )}

                {from && isValidInterval && recurrenceDates.length > 0 ? (
                  <Box sx={{ p: 1.25, borderRadius: '6px', bgcolor: 'action.hover' }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                      {t('Estimated schedule')} · {recurrenceDates.length} {t('inspections')}
                    </Typography>
                    <Stack direction="row" sx={{ gap: 0.75, flexWrap: 'wrap' }}>
                      {previewDates.map((date, index) => (
                        <Typography key={`${date}-${index}`} variant="caption" color="text.secondary">
                          {date === '…' ? '…' : formatCalendarIsoDate(date ?? '', locale)}
                          {index < previewDates.length - 1 && date !== '…' ? ' ·' : ''}
                        </Typography>
                      ))}
                    </Stack>
                  </Box>
                ) : requestType === 'RECURRING' && recurrenceLimit === 'END_DATE' && from && recurrenceEndDate ? (
                  <Alert severity="warning" sx={{ py: 0, '& .MuiAlert-message': { fontSize: '0.75rem' } }}>
                    {t('The selected date range must contain at least two inspection dates.')}
                  </Alert>
                ) : null}

                <Typography variant="caption" color="text.secondary">
                  {t('Each inspection is quoted per occurrence. The Manager will assign a pilot and drone after the agreement is signed.')}
                </Typography>
              </Stack>
            </Paper>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">
          {t('Cancel')}
        </Button>
        <LoadingButton
          variant="contained"
          loading={create.isPending}
          onClick={() => void handleSubmit()}
          disabled={
            !(assetId || initialAssetId) ||
            (!sourceInspectionId && activeAssetIds.has(assetId || initialAssetId || '')) ||
            !from ||
            from < minStartDate
          }
        >
          {t('Submit service request')}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
