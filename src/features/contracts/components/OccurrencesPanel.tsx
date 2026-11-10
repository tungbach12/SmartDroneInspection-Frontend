import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import FlightOutlinedIcon from '@mui/icons-material/FlightOutlined';
import PaidOutlined from '@mui/icons-material/PaidOutlined';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import {
  type AssignOccurrenceInput,
  type ServiceRequest,
  type ServiceRequestOccurrence,
} from '../api/contractApi';
import { dateTimeInputToInstant, instantToDateTimeInput } from '../api/scheduleTime';
import {
  useAssignServiceOccurrence,
  usePartnerDrones,
  usePartnerInspectors,
  useRecordOccurrencePayout,
} from '../hooks/useContracts';
import { classifyDroneByMtow } from '@/features/assets/utils/droneClassification';

interface OccurrencesPanelProps {
  request: ServiceRequest;
  manager: boolean;
  onChanged: () => void;
  onError: (message: string) => void;
}

export function OccurrencesPanel({
  request,
  manager,
  onChanged,
  onError,
}: OccurrencesPanelProps) {
  const { t } = useLocale();
  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: '16px',
        borderColor: 'divider',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
          {t('Occurrences and assignment')}
        </Typography>

        {request.occurrences.length === 0 ? (
          <Typography color="text.secondary">
            {t('Occurrences are created after the signed contract is uploaded.')}
          </Typography>
        ) : (
          <Stack spacing={2}>
            {request.occurrences.map((occurrence) => (
              <OccurrenceCard
                key={occurrence.id}
                request={request}
                occurrence={occurrence}
                manager={manager}
                onChanged={onChanged}
                onError={onError}
              />
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

function OccurrenceCard({
  request,
  occurrence,
  manager,
  onChanged,
  onError,
}: {
  request: ServiceRequest;
  occurrence: ServiceRequestOccurrence;
  manager: boolean;
  onChanged: () => void;
  onError: (message: string) => void;
}) {
  const { formatNumber, t } = useLocale();
  const {
    id: occurrenceId,
    occurrenceIndex,
    plannedStartAt: startAt,
    plannedEndAt: endAt,
    status,
    inspectorId,
    droneId,
    inspectionId,
    totalPrice,
    paymentStatus,
    reportAcceptedAt,
  } = occurrence;

  const assign = useAssignServiceOccurrence(request.id, occurrenceId);
  const recordPayout = useRecordOccurrencePayout(request.id, occurrenceId);
  const inspectors = usePartnerInspectors(manager);
  const drones = usePartnerDrones(manager);
  const [inspector, setInspector] = useState('');
  const [drone, setDrone] = useState('');
  const [customStart, setCustomStart] = useState<string | null>(null);
  const [customEnd, setCustomEnd] = useState<string | null>(null);
  const [payoutRef, setPayoutRef] = useState('');

  const start = customStart ?? instantToDateTimeInput(startAt, request.timezone);
  const end = customEnd ?? instantToDateTimeInput(endAt, request.timezone);
  const availableDrones = (drones.data ?? []).filter((item) => item.inspectorOwnerId === inspector);
  const selectedDrone = availableDrones.some((item) => item.id === drone) ? drone : '';

  const isAssigned = status === 'ASSIGNED';
  const assignedInspectorName =
    (inspectors.data ?? []).find((item) => item.id === inspectorId)?.fullName ??
    (inspectorId ? `${t('Partner Pilot')} #${inspectorId.slice(0, 8)}` : null);
  const assignedDroneRecord = (drones.data ?? []).find((item) => item.id === droneId);
  const assignedDroneLabel = assignedDroneRecord
    ? `${assignedDroneRecord.model} (${assignedDroneRecord.serialNumber})`
    : droneId
      ? `${t('Drone')} #${droneId.slice(0, 8)}`
      : null;

  const feeVnd = totalPrice != null && totalPrice > 0 ? `${formatNumber(totalPrice)} ₫` : null;
  const isPaid = paymentStatus === 'PAID';
  const isPaymentDue = paymentStatus === 'PAYMENT_DUE';
  const invoice = occurrence.invoice;
  const payment = occurrence.payment;
  const payout = occurrence.payout;

  const submit = async () => {
    if (!inspector || !selectedDrone) {
      onError('Select an Inspector and one of their registered drones for this occurrence.');
      return;
    }
    try {
      const plannedStartAt = dateTimeInputToInstant(start, request.timezone);
      const plannedEndAt = dateTimeInputToInstant(end, request.timezone);
      if (Date.parse(plannedEndAt) <= Date.parse(plannedStartAt)) {
        onError('The confirmed end time must be after the start time.');
        return;
      }
      const input: AssignOccurrenceInput = {
        plannedStartAt,
        plannedEndAt,
        inspectorId: inspector,
        droneId: selectedDrone,
      };
      await assign.mutateAsync(input);
      onChanged();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unable to assign occurrence.';
      onError(msg);
    }
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: '10px',
        border: '1px solid',
        borderColor: isAssigned ? 'divider' : 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Stack spacing={1.5}>
        <Stack
          direction="row"
          sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }}>
              Occurrence {occurrenceIndex}
            </Typography>
            <Chip
              size="small"
              label={status.replaceAll('_', ' ')}
              color={isAssigned ? 'success' : 'default'}
              sx={{ height: 22, borderRadius: '5px', fontSize: '0.75rem', fontWeight: 700 }}
            />
            {isPaid && (
              <Chip
                size="small"
                icon={<CheckCircleRounded sx={{ fontSize: 14 }} />}
                label={t('Paid')}
                color="success"
                variant="outlined"
                sx={{ height: 22, borderRadius: '5px', fontSize: '0.75rem', fontWeight: 650 }}
              />
            )}
            {isPaymentDue && (
              <Chip
                size="small"
                label={t('Payment Due')}
                color="warning"
                sx={{ height: 22, borderRadius: '5px', fontSize: '0.75rem', fontWeight: 650 }}
              />
            )}
          </Stack>

          {feeVnd && (
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
              <PaidOutlined sx={{ fontSize: 16, color: isPaid ? '#176B52' : 'text.secondary' }} />
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 700,
                  color: isPaid ? '#176B52' : 'text.primary',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {feeVnd}
              </Typography>
            </Stack>
          )}
        </Stack>

        <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {new Date(startAt).toLocaleString(undefined, { timeZone: request.timezone })} -{' '}
          {new Date(endAt).toLocaleString(undefined, { timeZone: request.timezone })} · {request.timezone}
        </Typography>

        <Paper variant="outlined" sx={{ p: 1.5, borderRadius: '8px', bgcolor: 'background.default' }}>
          <Stack spacing={0.75}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
              {t('Service invoice')}: {feeVnd ?? t('Awaiting invoice snapshot')}
              {invoice?.vatRate != null ? ` · VAT ${invoice.vatRate}%` : ''}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {t('Service payment')}: {payment?.status ?? paymentStatus ?? 'PENDING'}
              {payment?.method ? ` · ${payment.method}` : ''}
              {payment?.payosOrderCode ? ` · #${payment.payosOrderCode}` : ''}
            </Typography>
            {manager && (
              <>
                {totalPrice != null && totalPrice > 0 && (
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {t('Revenue split')}: {t('Platform fee (15%)')}{' '}
                    <strong>{formatNumber(Math.round(totalPrice * 0.15))} ₫</strong> ·{' '}
                    {t('Inspector net payout (85%)')}{' '}
                    <strong style={{ color: '#0284c7' }}>
                      {formatNumber(totalPrice - Math.round(totalPrice * 0.15))} ₫
                    </strong>
                  </Typography>
                )}
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {t('Inspector payout')}: {payout?.status ?? occurrence.payoutStatus ?? 'PENDING'}
                  {payout?.reference ? ` · UNC: ${payout.reference}` : ''}
                  {payout?.inspectorId ? ` · ${t('Inspector')} #${payout.inspectorId.slice(0, 8)}` : ''}
                </Typography>
                {isPaid &&
                  !['PAID', 'SETTLED'].includes(payout?.status ?? occurrence.payoutStatus ?? '') && (
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ pt: 0.75 }}>
                    <TextField
                      size="small"
                      placeholder="Nhập mã giao dịch ngân hàng (VD: UNC-VCB-20261110)"
                      value={payoutRef}
                      onChange={(e) => setPayoutRef(e.target.value)}
                      sx={{ flex: 1, bgcolor: 'background.paper' }}
                    />
                    <LoadingButton
                      size="small"
                      variant="contained"
                      color="primary"
                      loading={recordPayout.isPending}
                      disabled={!payoutRef.trim()}
                      onClick={async () => {
                        try {
                          await recordPayout.mutateAsync({ payoutReference: payoutRef.trim() });
                          setPayoutRef('');
                          onChanged();
                        } catch (err) {
                          const msg = err instanceof Error ? err.message : 'Could not settle payout.';
                          onError(msg);
                        }
                      }}
                      sx={{ textTransform: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}
                    >
                      Tất toán thù lao Inspector
                    </LoadingButton>
                  </Stack>
                )}
              </>
            )}
          </Stack>
        </Paper>

        {isAssigned ? (
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, pt: 0.5 }}
          >
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
              {assignedInspectorName && (
                <Chip
                  icon={<BadgeOutlinedIcon />}
                  label={assignedInspectorName}
                  variant="outlined"
                  size="small"
                />
              )}
              {assignedDroneLabel && (
                <Chip
                  icon={<FlightOutlinedIcon />}
                  label={assignedDroneLabel}
                  variant="outlined"
                  size="small"
                />
              )}
              {reportAcceptedAt && (
                <Chip
                  label={t('Report accepted')}
                  color="success"
                  variant="outlined"
                  size="small"
                />
              )}
            </Stack>

            {inspectionId && (
              <Button
                component="a"
                href={
                  manager
                    ? `/manager/inspections/${inspectionId}/review`
                    : `/client/inspections/${inspectionId}/${reportAcceptedAt || isPaid ? 'report' : 'tracking'}`
                }
                size="small"
                variant="outlined"
                endIcon={<ArrowForwardRounded sx={{ fontSize: 14 }} />}
                sx={{
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  alignSelf: { xs: 'flex-start', sm: 'center' },
                }}
              >
                {manager ? t('Open review') : t('Open inspection')}
              </Button>
            )}
          </Stack>
        ) : (
          manager &&
          request.status === 'CONTRACT_SIGNED' && (
            <Box sx={{ mt: 1, p: 2, bgcolor: 'action.hover', borderRadius: '10px' }}>
              <Stack spacing={1.5}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                  <TextField
                    fullWidth
                    label="Confirmed start"
                    type="datetime-local"
                    size="small"
                    value={start}
                    onChange={(e) => setCustomStart(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  <TextField
                    fullWidth
                    label="Confirmed end"
                    type="datetime-local"
                    size="small"
                    value={end}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Stack>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                  <FormControl fullWidth size="small">
                    <InputLabel id={`inspector-${occurrenceId}`}>Inspector</InputLabel>
                    <Select
                      labelId={`inspector-${occurrenceId}`}
                      label="Inspector"
                      value={inspector}
                      onChange={(e) => {
                        setInspector(e.target.value);
                        setDrone('');
                      }}
                    >
                      {(inspectors.data ?? []).map((item) => (
                        <MenuItem key={item.id} value={item.id}>
                          {item.fullName}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl fullWidth size="small" disabled={!inspector || drones.isPending}>
                    <InputLabel id={`drone-${occurrenceId}`}>Drone</InputLabel>
                    <Select
                      labelId={`drone-${occurrenceId}`}
                      label="Drone"
                      value={selectedDrone}
                      onChange={(e) => setDrone(e.target.value)}
                    >
                      {availableDrones.map((item) => {
                        const tier = classifyDroneByMtow(item.model);
                        return (
                          <MenuItem key={item.id} value={item.id}>
                            {item.serialNumber} · {item.model} ({tier.shortLabel} · {tier.requiredLicenseLabel})
                          </MenuItem>
                        );
                      })}
                    </Select>
                    {inspector && availableDrones.length === 0 && !drones.isPending && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                        No eligible registered drone is listed for this Inspector.
                      </Typography>
                    )}
                  </FormControl>
                </Stack>
                <Box>
                  <LoadingButton
                    loading={assign.isPending}
                    variant="contained"
                    onClick={() => void submit()}
                    sx={{ borderRadius: '8px', fontWeight: 700 }}
                  >
                    Assign occurrence
                  </LoadingButton>
                </Box>
              </Stack>
            </Box>
          )
        )}
      </Stack>
    </Paper>
  );
}
