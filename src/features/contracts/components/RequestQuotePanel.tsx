import { useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { type IssueServiceQuoteInput, type ServiceRequest } from '../api/contractApi';
import { dateTimeInputToInstant, instantToDateTimeInput } from '../api/scheduleTime';
import { enumerateMonthlySchedule } from '../api/recurrenceSchedule';
import {
  useAcceptServiceQuote,
  useIssueServiceQuote,
  usePartnerDrones,
  usePartnerInspectors,
} from '../hooks/useContracts';

function describeDroneLegalCategory(model?: string | null): string {
  if (!model) return 'Chưa rõ MTOW · Kiểm tra Hạng A/B';
  const match = model.match(/mtow\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*kg/i);
  const lower = model.toLowerCase();
  let mtow: number | null = match?.[1] ? Number(match[1].replace(',', '.')) : null;
  if (mtow == null) {
    if (lower.includes('matrice 350') || lower.includes('m350') || lower.includes('matrice 300')) mtow = 9.2;
    else if (lower.includes('matrice 30') || lower.includes('m30')) mtow = 4.07;
    else if (lower.includes('wingtra')) mtow = 4.5;
    else if (lower.includes('elios 3') && lower.includes('lidar')) mtow = 2.5;
    else if (lower.includes('mavic 3') || lower.includes('m3e') || lower.includes('m3t')) mtow = 1.05;
    else if (lower.includes('mini 4')) mtow = 0.249;
  }
  if (mtow == null) return 'NĐ 288/2025 · Kiểm tra MTOW';
  if (mtow < 0.25) return `Loại 1 (${mtow} kg < 0,25 kg) · Bằng Hạng A/B`;
  if (mtow < 2) return `Loại 2 (${mtow} kg: 0,25–<2 kg) · Bằng Hạng A/B`;
  if (mtow < 25) return `Loại 3 (${mtow} kg: 2–<25 kg) · Bắt buộc Bằng Hạng B`;
  if (mtow < 150) return `Loại 4 (${mtow} kg: 25–<150 kg) · Bắt buộc Bằng Hạng B`;
  return `Loại 5 (${mtow} kg ≥ 150 kg) · Bắt buộc Bằng Hạng B`;
}

function extractErrorText(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { detail?: unknown; message?: unknown } } }).response;
    const detail = response?.data?.detail ?? response?.data?.message;
    if (typeof detail === 'string') return detail;
  }
  return error instanceof Error ? error.message : fallback;
}

interface RequestQuotePanelProps {
  request: ServiceRequest;
  customer: boolean;
  manager: boolean;
  onChanged: () => void;
  onError: (message: string) => void;
  onOpenInbox?: (requestId: string) => void;
}

export function RequestQuotePanel({
  request,
  customer,
  manager,
  onChanged,
  onError,
  onOpenInbox,
}: RequestQuotePanelProps) {
  const { locale, t } = useLocale();
  const currentQuote = request.currentQuote;
  const accept = useAcceptServiceQuote(request.id);
  const save = useIssueServiceQuote(request.id);
  const inspectors = usePartnerInspectors(manager);
  const drones = usePartnerDrones(manager);

  const [scope, setScope] = useState(currentQuote?.scopeSnapshot ?? request.description);
  const [start, setStart] = useState(() =>
    currentQuote
      ? instantToDateTimeInput(currentQuote.firstOccurrenceStartAt, request.timezone)
      : `${request.requestedFrom}T08:00`,
  );
  const [end, setEnd] = useState(() =>
    currentQuote
      ? instantToDateTimeInput(currentQuote.firstOccurrenceEndAt, request.timezone)
      : `${request.requestedFrom}T10:00`,
  );
  const recurringDates =
    request.requestType === 'RECURRING'
      ? enumerateMonthlySchedule(request.requestedFrom, request.recurrenceInterval ?? 1, {
          ...(request.occurrenceCount != null
            ? { count: request.occurrenceCount }
            : { endDate: request.recurrenceEndDate ?? request.requestedUntil }),
          maxOccurrences: 100,
        })
      : [];
  const scheduleEndDate = recurringDates.at(-1) ?? request.requestedUntil;

  const [inspectorId, setInspectorId] = useState(currentQuote?.inspectorId ?? '');
  const [droneId, setDroneId] = useState(currentQuote?.droneId ?? '');
  const [price, setPrice] = useState(
    String(currentQuote?.pricePerOccurrenceVnd ?? currentQuote?.pricePerOccurrenceUsd ?? 11000000),
  );
  const [confirmAcceptOpen, setConfirmAcceptOpen] = useState(false);
  const accepted = request.acceptedQuoteId === currentQuote?.id || request.acceptedQuoteId != null;
  const editable = manager && ['OPEN', 'QUOTED'].includes(request.status) && !accepted;

  const availableDrones = (drones.data ?? []).filter((drone) => drone.inspectorOwnerId === inspectorId);
  const selectedDroneId = availableDrones.some((drone) => drone.id === droneId) ? droneId : '';
  const inspectorLicenseExpiresAt = inspectors.data?.find((candidate) => candidate.id === inspectorId)?.licenseExpiresAt;
  const lastPlannedDate = recurringDates.at(-1);
  const lastPlannedStartAt = (() => {
    if (!lastPlannedDate) return null;
    try {
      return dateTimeInputToInstant(`${lastPlannedDate}T${start.slice(11, 16)}`, request.timezone);
    } catch {
      return null;
    }
  })();
  const inspectorLicenseCoversSchedule =
    !inspectorLicenseExpiresAt ||
    !lastPlannedStartAt ||
    Date.parse(inspectorLicenseExpiresAt) > Date.parse(lastPlannedStartAt);
  const hasDispatchedOccurrence = request.occurrences.some(
    (occurrence) => occurrence.status === 'ASSIGNED' || (occurrence.status as string) === 'COMPLETED',
  );

  const saveQuote = async () => {
    if (!scope.trim()) {
      onError('Enter the quoted inspection scope.');
      return;
    }
    if (!inspectorId || !selectedDroneId) {
      onError('Select a registered partner Inspector and one of their drones.');
      return;
    }
    if (request.requestType === 'RECURRING' && !inspectorLicenseCoversSchedule) {
      onError('The selected Inspector pilot license expires before the last planned occurrence. Choose another Inspector or adjust the schedule.');
      return;
    }
    const amount = Number(price);
    if (!Number.isFinite(amount) || amount <= 0 || !/^\d+(\.\d{1,2})?$/.test(price.trim())) {
      onError('Enter a positive price with no more than two decimal places.');
      return;
    }
    try {
      const startAt = dateTimeInputToInstant(start, request.timezone);
      const endAt = dateTimeInputToInstant(end, request.timezone);
      if (Date.parse(endAt) <= Date.parse(startAt)) {
        onError('The proposed occurrence end must be after its start.');
        return;
      }
      const firstDate = start.slice(0, 10);
      const lastDate = end.slice(0, 10);
      const scheduleEnd =
        request.requestType === 'RECURRING' ? scheduleEndDate : request.requestedUntil;
      if (
        lastDate > scheduleEnd ||
        (request.requestType === 'ONE_TIME' &&
          (firstDate !== request.requestedFrom || lastDate !== request.requestedFrom)) ||
        (request.requestType === 'RECURRING' && firstDate !== request.requestedFrom)
      ) {
        onError(
          request.requestType === 'ONE_TIME'
            ? 'One-time service must remain on the customer-selected date.'
            : 'The first occurrence must match the customer-requested date, and the quote must remain inside the requested schedule.',
        );
        return;
      }
      await save.mutateAsync({
        scopeSnapshot: scope.trim(),
        firstOccurrenceStartAt: startAt,
        firstOccurrenceEndAt: endAt,
        inspectorId,
        droneId: selectedDroneId,
        pricePerOccurrenceVnd: amount,
      } satisfies IssueServiceQuoteInput);
      onChanged();
    } catch (error) {
      onError(extractErrorText(error, 'Unable to save quote.'));
    }
  };

  const acceptCurrent = async () => {
    if (!currentQuote) return;
    try {
      await accept.mutateAsync(currentQuote.rowVersion);
      setConfirmAcceptOpen(false);
      onChanged();
    } catch (error) {
      onError(extractErrorText(error, 'Unable to accept quote.'));
    }
  };

  const formatQuotePrice = (quote: NonNullable<ServiceRequest['currentQuote']>) =>
    `${Number(quote.pricePerOccurrenceVnd ?? quote.pricePerOccurrenceUsd).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US')} VND / ${locale === 'vi' ? 'đợt' : 'occurrence'}`;

  const inspector = (inspectors.data ?? []).find((candidate) => candidate.id === currentQuote?.inspectorId);
  const drone = (drones.data ?? []).find((candidate) => candidate.id === currentQuote?.droneId);

  return (
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1.5, bgcolor: 'background.paper', overflow: 'hidden' }}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1, p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>
          {t('Current quote')}
        </Typography>
        {currentQuote && (
          <Chip size="small" label={accepted ? t('Accepted · locked') : t('Current terms')} color={accepted ? 'success' : 'default'} />
        )}
      </Stack>

      <Box sx={{ p: 2 }}>
        {!currentQuote ? (
          <Typography color="text.secondary">
            {hasDispatchedOccurrence ? t('Commercial terms settled under active dispatch schedule.') : t('No quote issued yet.')}
          </Typography>
        ) : (
          <Stack spacing={1}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {formatQuotePrice(currentQuote)}
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {currentQuote.scopeSnapshot}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('First occurrence')}: {new Date(currentQuote.firstOccurrenceStartAt).toLocaleString()} –{' '}
              {new Date(currentQuote.firstOccurrenceEndAt).toLocaleString()}
              {manager ? ` · ${t('Inspector')}: ${inspector?.fullName ?? t('Assigned partner pilot')} · ${t('Drone')}: ${drone ? `${drone.model} (${drone.serialNumber})` : t('Assigned inspection drone')}` : ''}
            </Typography>
            {customer && request.status === 'QUOTED' && !accepted && (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ pt: 1 }}>
                <LoadingButton
                  loading={accept.isPending}
                  variant="contained"
                  color="success"
                  onClick={() => setConfirmAcceptOpen(true)}
                  sx={{ fontWeight: 700 }}
                >
                  {t('Accept quote')}
                </LoadingButton>
                {onOpenInbox && (
                  <LoadingButton variant="outlined" onClick={() => onOpenInbox(request.id)}>
                    {t('Message manager to negotiate')}
                  </LoadingButton>
                )}
              </Stack>
            )}
          </Stack>
        )}

        {editable && (
          <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
              {currentQuote ? t('Edit current quote') : t('Create quote')}
            </Typography>
            <Stack spacing={1.5}>
              <TextField label={t('Quoted scope')} multiline minRows={2} size="small" value={scope} onChange={(event) => setScope(event.target.value)} />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField fullWidth label={t('First occurrence start')} type="datetime-local" size="small" value={start} onChange={(event) => setStart(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
                <TextField fullWidth label={t('First occurrence end')} type="datetime-local" size="small" value={end} onChange={(event) => setEnd(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <FormControl fullWidth size="small">
                  <InputLabel id="partner-inspector-label">{t('Partner Inspector')}</InputLabel>
                  <Select labelId="partner-inspector-label" label={t('Partner Inspector')} value={inspectorId} onChange={(event) => { setInspectorId(event.target.value); setDroneId(''); }}>
                    {(inspectors.data ?? []).map((candidate) => (
                      <MenuItem key={candidate.id} value={candidate.id}>
                        {candidate.fullName} · {t('License expires')} {candidate.licenseExpiresAt ? new Date(candidate.licenseExpiresAt).toLocaleDateString() : t('not recorded')}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth size="small" disabled={!inspectorId || drones.isPending}>
                  <InputLabel id="partner-drone-label">{t('Partner drone')}</InputLabel>
                  <Select labelId="partner-drone-label" label={t('Partner drone')} value={selectedDroneId} onChange={(event) => setDroneId(event.target.value)}>
                    {availableDrones.map((candidate) => (
                      <MenuItem key={candidate.id} value={candidate.id}>
                        {candidate.serialNumber} · {candidate.model} ({describeDroneLegalCategory(candidate.model)})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
              <TextField
                label={locale === 'vi' ? 'Đơn giá mỗi đợt bay (VND)' : 'Price per occurrence (VND)'}
                type="number"
                size="small"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                helperText={
                  request.requestType === 'ONE_TIME'
                    ? t('The customer-selected date cannot be changed for a one-time request.')
                    : t('The first scheduled occurrence is used as the anchor for the recurring schedule.')
                }
                slotProps={{ htmlInput: { min: 0.01, step: 0.01 } }}
              />
              {request.requestType === 'RECURRING' && recurringDates.length > 0 && (
                <Box sx={{ p: 1.25, bgcolor: 'action.hover', borderRadius: '6px' }}>
                  <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, mb: 0.5 }}>
                    {t('Planned occurrence dates')} · {recurringDates.length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {recurringDates.slice(0, 4).map((date) => new Date(`${date}T12:00:00`).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', { timeZone: 'UTC' })).join(' · ')}
                    {recurringDates.length > 4 ? ' … ' : ''}
                    {recurringDates.length > 4 && new Date(`${recurringDates[recurringDates.length - 1]}T12:00:00`).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', { timeZone: 'UTC' })}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontWeight: 600 }}>
                    {Number(price || 0).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US')} VND × {recurringDates.length} = {(Number(price || 0) * recurringDates.length).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US')} VND
                  </Typography>
                </Box>
              )}
              {request.requestType === 'RECURRING' && inspectorId && !inspectors.isPending && !inspectorLicenseCoversSchedule && (
                <Alert severity="error" sx={{ py: 0 }}>
                  {t('Pilot license expires before the last planned inspection. Select another Inspector or change the schedule.')}
                </Alert>
              )}
              <Box>
                <LoadingButton loading={save.isPending} variant="contained" onClick={() => void saveQuote()} sx={{ fontWeight: 700 }}>
                  {currentQuote ? t('Save quote changes') : t('Save quote')}
                </LoadingButton>
              </Box>
            </Stack>
          </Box>
        )}
      </Box>

      <ConfirmDialog
        open={confirmAcceptOpen}
        title={t('Confirm Quote Acceptance')}
        message={
          currentQuote
            ? locale === 'vi'
              ? `Bạn xác nhận chấp nhận báo giá hiện tại (${formatQuotePrice(currentQuote)})? Sau khi chấp nhận, điều khoản sẽ được khóa; nếu cần thương lượng, hãy nhắn Quản lý trước. Tiếp theo hai bên ký hợp đồng giấy.`
              : `Accept the current quote (${formatQuotePrice(currentQuote)})? Terms will lock after acceptance. Message the Manager first if you want to negotiate. Next, both parties sign the paper contract.`
            : ''
        }
        confirmLabel={t('Accept quote')}
        cancelLabel={t('Cancel')}
        confirmColor="success"
        loading={accept.isPending}
        onCancel={() => setConfirmAcceptOpen(false)}
        onConfirm={() => void acceptCurrent()}
      />
    </Box>
  );
}
