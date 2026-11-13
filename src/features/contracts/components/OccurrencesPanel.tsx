import { useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import FlightOutlinedIcon from '@mui/icons-material/FlightOutlined';
import PaidOutlined from '@mui/icons-material/PaidOutlined';
import PersonSearchOutlinedIcon from '@mui/icons-material/PersonSearchOutlined';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import {
  type AssignOccurrenceInput,
  type PartnerCandidate,
  type ServiceRequest,
  type ServiceRequestOccurrence,
} from '../api/contractApi';
import { dateTimeInputToInstant, instantToDateTimeInput } from '../api/scheduleTime';
import {
  useAssignServiceOccurrence,
  useEvaluatePartnerCandidates,
  usePartnerDrones,
  usePartnerInspectors,
  useRecordOccurrencePayout,
} from '../hooks/useContracts';
import { useSearchParams } from 'react-router-dom';
import {
  getInspectorInitials,
  isSelectablePartnerCandidate,
  PartnerCandidateResults,
} from './PartnerCandidateResults';

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
  const [searchParams] = useSearchParams();
  const activeOccurrenceId = searchParams.get('occurrenceId');
  const stepActive = activeOccurrenceId !== null;

  return (
    <Card
      variant="outlined"
      sx={
        stepActive
          ? { borderRadius: 0, border: 0, boxShadow: 'none', bgcolor: 'transparent' }
          : {
              borderRadius: '12px',
              borderColor: 'divider',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }
      }
    >
      <CardContent sx={{ p: stepActive ? 0 : { xs: 2, sm: 2.5 }, '&:last-child': { pb: stepActive ? 0 : undefined } }}>
        {!stepActive && (
          <Typography variant="h6" component="h2" sx={{ fontWeight: 700, mb: 1.5 }}>
            {t('Occurrences and assignment')}
          </Typography>
        )}

        {request.occurrences.length === 0 ? (
          <Typography color="text.secondary">
            {t('Occurrences are created after the signed contract is uploaded.')}
          </Typography>
        ) : (
          <Stack spacing={stepActive ? 0 : 2}>
            {request.occurrences.map((occurrence) => {
              const isActive = activeOccurrenceId === occurrence.id;
              return (
                // Sibling occurrences stay mounted so their drafts survive the step.
                <Box key={occurrence.id} sx={{ display: stepActive && !isActive ? 'none' : 'block' }}>
                  <OccurrenceCard
                    request={request}
                    occurrence={occurrence}
                    manager={manager}
                    onChanged={onChanged}
                    onError={onError}
                    activePairSelection={isActive}
                  />
                </Box>
              );
            })}
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
  activePairSelection,
}: {
  request: ServiceRequest;
  occurrence: ServiceRequestOccurrence;
  manager: boolean;
  onChanged: () => void;
  onError: (message: string) => void;
  activePairSelection?: boolean;
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
  const evaluate = useEvaluatePartnerCandidates(request.id);
  const recordPayout = useRecordOccurrencePayout(request.id, occurrenceId);
  const inspectors = usePartnerInspectors(manager);
  const drones = usePartnerDrones(manager);
  const [searchParams, setSearchParams] = useSearchParams();
  const stepOpen = activePairSelection ?? false;
  const setStepOpen = (open: boolean) => {
    const next = new URLSearchParams(searchParams);
    if (open) {
      next.set('step', 'dispatch-pair');
      next.set('occurrenceId', occurrenceId);
    } else {
      next.delete('step');
      next.delete('occurrenceId');
    }
    setSearchParams(next, { replace: false });
  };
  const [inspector, setInspector] = useState('');
  const [drone, setDrone] = useState('');
  const [customStart, setCustomStart] = useState<string | null>(null);
  const [customEnd, setCustomEnd] = useState<string | null>(null);
  const [payoutRef, setPayoutRef] = useState('');
  const [candidates, setCandidates] = useState<PartnerCandidate[] | null>(null);
  const [evaluatedKey, setEvaluatedKey] = useState<string | null>(null);

  const start = customStart ?? instantToDateTimeInput(startAt, request.timezone);
  const end = customEnd ?? instantToDateTimeInput(endAt, request.timezone);
  const snapshotFeatures = Array.isArray(
    request.acceptedTermsSnapshot?.requiredDroneFeatureCodes,
  )
    ? (request.acceptedTermsSnapshot.requiredDroneFeatureCodes as unknown[])
        .filter((item): item is string => typeof item === 'string')
    : [];
  const currentCriteriaKey = `${request.id}|${occurrenceId}|${request.acceptedQuoteId ?? ''}|${start}|${end}|${[...snapshotFeatures].sort().join(',')}`;
  const isEvaluationStale = evaluatedKey !== null && evaluatedKey !== currentCriteriaKey;

  const availableDrones = (drones.data ?? []).filter((item) => item.inspectorOwnerId === inspector);
  const selectedDrone = availableDrones.some((item) => item.id === drone)
    ? drone
    : candidates?.some((item) => item.inspectorId === inspector && item.droneId === drone)
      ? drone
      : '';
  const selectedCandidate =
    candidates?.find(
      (item) => item.inspectorId === inspector && item.droneId === selectedDrone,
    ) ?? null;
  const isSelectedPairBlockedByEvaluation =
    candidates === null ||
    isEvaluationStale ||
    !selectedCandidate ||
    !isSelectablePartnerCandidate(selectedCandidate);

  const runPartnerEvaluation = async () => {
    try {
      const plannedStartAt = dateTimeInputToInstant(start, request.timezone);
      const plannedEndAt = dateTimeInputToInstant(end, request.timezone);
      if (Date.parse(plannedEndAt) <= Date.parse(plannedStartAt)) {
        onError('The confirmed end time must be after the start time.');
        return;
      }
      const result = await evaluate.mutateAsync({
        plannedStartAt,
        plannedEndAt,
        requiredDroneFeatureCodes: snapshotFeatures,
      });
      setCandidates(result);
      setEvaluatedKey(currentCriteriaKey);
      setStepOpen(true);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unable to evaluate partner candidates.';
      onError(msg);
    }
  };

  const isAssigned = status === 'ASSIGNED';
  const assignedInspectorName =
    (inspectors.data ?? []).find((item) => item.id === inspectorId)?.fullName ??
    (inspectorId
      ? manager
        ? `${t('Partner Pilot')} #${inspectorId.slice(0, 8)}`
        : t('Assigned partner pilot')
      : null);
  const assignedDroneRecord = (drones.data ?? []).find((item) => item.id === droneId);
  const assignedDroneLabel = assignedDroneRecord
    ? `${assignedDroneRecord.model} (${assignedDroneRecord.serialNumber})`
    : droneId
      ? manager
        ? `${t('Drone')} #${droneId.slice(0, 8)}`
        : t('Assigned inspection drone')
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
    if (isSelectedPairBlockedByEvaluation) {
      onError(
        candidates === null
          ? 'Find eligible partners and select a pair before assigning the occurrence.'
          : isEvaluationStale
            ? 'Schedule criteria changed. Re-run partner evaluation before assigning.'
            : 'Only an eligible partner pair with matching capabilities can be assigned.',
      );
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

  // The dispatch pair step takes over this occurrence's surface instead of nesting inside it.
  if (stepOpen && candidates !== null) {
    return (
      <PartnerCandidateResults
        variant="step"
        candidates={candidates}
        loading={evaluate.isPending}
        stale={isEvaluationStale}
        windowSummary={`${start.replace('T', ' ')} → ${end.replace('T', ' ')}`}
        requiredCapabilities={snapshotFeatures}
        selectedInspectorId={inspector}
        selectedDroneId={selectedDrone}
        title={`${t('Select partner Inspector and drone')} · ${t('Occurrence')} ${occurrenceIndex}`}
        subtitle={t(
          'Only eligible pairs that match the schedule and required capabilities are listed by default.',
        )}
        backLabel={t('Back to occurrence')}
        onBackToForm={() => {
          setStepOpen(false);
        }}
        onSelectPair={(candidate) => {
          setInspector(candidate.inspectorId);
          setDrone(candidate.droneId);
          setStepOpen(false);
        }}
      />
    );
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: '12px',
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
              sx={{ height: 22, borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}
            />
            {isPaid && (
              <Chip
                size="small"
                icon={<CheckCircleRounded sx={{ fontSize: 14 }} />}
                label={t('Paid')}
                color="success"
                variant="outlined"
                sx={{ height: 22, borderRadius: '6px', fontSize: '0.75rem', fontWeight: 650 }}
              />
            )}
            {isPaymentDue && (
              <Chip
                size="small"
                label={t('Payment Due')}
                color="warning"
                sx={{ height: 22, borderRadius: '6px', fontSize: '0.75rem', fontWeight: 650 }}
              />
            )}
          </Stack>

          {feeVnd && (
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
              <PaidOutlined sx={{ fontSize: 16, color: isPaid ? 'success.main' : 'text.secondary' }} />
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 700,
                  color: isPaid ? 'success.main' : 'text.primary',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {feeVnd}
              </Typography>
            </Stack>
          )}
        </Stack>

        <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {new Date(startAt).toLocaleString(undefined, { timeZone: request.timezone })} –{' '}
          {new Date(endAt).toLocaleString(undefined, { timeZone: request.timezone })}
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
            <Box sx={{ mt: 1, p: 2, bgcolor: 'action.hover', borderRadius: '8px' }}>
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

                <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  {candidates !== null && !isEvaluationStale && (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        setStepOpen(true);
                      }}
                      sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
                    >
                      {t('Choose partner & drone')}
                    </Button>
                  )}
                  <LoadingButton
                    size="small"
                    variant="outlined"
                    loading={evaluate.isPending}
                    startIcon={<PersonSearchOutlinedIcon fontSize="small" />}
                    onClick={() => void runPartnerEvaluation()}
                    sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
                  >
                    {t('Find eligible partners')}
                  </LoadingButton>
                </Stack>

                {selectedCandidate && (
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1.5}
                    sx={{
                      p: 1.5,
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'background.paper',
                      alignItems: { sm: 'center' },
                      justifyContent: 'space-between',
                    }}
                  >
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0 }}>
                      <Avatar
                        src={selectedCandidate.inspectorAvatarUrl ?? undefined}
                        alt={selectedCandidate.inspectorName}
                        sx={{
                          width: 40,
                          height: 40,
                          bgcolor: '#EEF2FF',
                          color: '#3758F9',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                        }}
                      >
                        {getInspectorInitials(selectedCandidate.inspectorName)}
                      </Avatar>
                      {selectedCandidate.droneHasImage ? (
                        <Box sx={{ width: 56, height: 40, flexShrink: 0 }}>
                          <AuthenticatedImage
                            src={`/drone-registration-applications/drones/${selectedCandidate.droneId}/image?index=0`}
                            alt={selectedCandidate.droneModel ?? t('Partner drone')}
                            maxHeight={40}
                            sx={{
                              width: 56,
                              height: 40,
                              objectFit: 'cover',
                              borderRadius: '6px',
                              border: '1px solid',
                              borderColor: 'divider',
                            }}
                          />
                        </Box>
                      ) : (
                        <Box
                          sx={{
                            width: 56,
                            height: 40,
                            borderRadius: '6px',
                            border: '1px solid',
                            borderColor: 'divider',
                            bgcolor: 'background.default',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'text.secondary',
                            flexShrink: 0,
                          }}
                        >
                          <FlightOutlinedIcon fontSize="small" />
                        </Box>
                      )}
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {selectedCandidate.inspectorName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {selectedCandidate.droneModel} · {selectedCandidate.droneSerialNumber}
                        </Typography>
                      </Box>
                    </Stack>
                    <Chip
                      size="small"
                      label={
                        isSelectablePartnerCandidate(selectedCandidate)
                          ? t('Eligible match')
                          : t('Not eligible')
                      }
                      color={
                        isSelectablePartnerCandidate(selectedCandidate) ? 'success' : 'error'
                      }
                      variant="outlined"
                      sx={{ fontWeight: 700, borderRadius: '6px' }}
                    />
                  </Stack>
                )}

                {isEvaluationStale && (
                  <Alert severity="warning" sx={{ py: 0 }}>
                    {t('Schedule or capability criteria changed. Re-run partner evaluation before confirming.')}
                  </Alert>
                )}
                <Box>
                  <LoadingButton
                    loading={assign.isPending}
                    disabled={isSelectedPairBlockedByEvaluation}
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
