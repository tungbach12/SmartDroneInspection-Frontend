import { useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import FlightOutlinedIcon from '@mui/icons-material/FlightOutlined';
import PaidOutlined from '@mui/icons-material/PaidOutlined';
import PersonSearchOutlinedIcon from '@mui/icons-material/PersonSearchOutlined';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import {
  type AssignOccurrenceInput,
  type PartnerCandidate,
  type ServiceRequest,
  type ServiceRequestOccurrence,
} from '../../api/contractApi';
import { dateTimeInputToInstant, instantToDateTimeInput } from '../../api/scheduleTime';
import {
  useAssignRemainingOccurrences,
  useAssignServiceOccurrence,
  useEvaluatePartnerCandidates,
  usePartnerDrones,
  usePartnerInspectors,
} from '../../hooks/useContracts';
import {
  getInspectorInitials,
  isSelectablePartnerCandidate,
  PartnerCandidateResults,
} from '../../components/PartnerCandidateResults';
import { ContractFileBanner } from '../../shared/ContractFileBanner';
import { extractContractErrorText } from '../../shared/contractStage';
import { OccurrenceFinanceDrawer } from '../components/OccurrenceFinanceDrawer';

interface ManagerOccurrencesStepProps {
  request: ServiceRequest;
  onChanged: () => void;
  onError: (message: string) => void;
}

export function ManagerOccurrencesStep({
  request,
  onChanged,
  onError,
}: ManagerOccurrencesStepProps) {
  const { t } = useLocale();
  const [searchParams] = useSearchParams();
  const activeOccurrenceId = searchParams.get('occurrenceId');
  const stepActive = activeOccurrenceId !== null;
  const [financeOccurrenceId, setFinanceOccurrenceId] = useState<string | null>(null);

  const financeOccurrence =
    request.occurrences.find((item) => item.id === financeOccurrenceId) ?? null;

  return (
    <Stack spacing={2.5}>
      {!stepActive && <ContractFileBanner request={request} onError={onError} />}

      <Box
        sx={
          stepActive
            ? { borderRadius: 0, border: 0, bgcolor: 'transparent' }
            : {
                borderRadius: '10px',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                p: 2,
              }
        }
      >
        {!stepActive && (
          <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700, mb: 1.5 }}>
            {t('Occurrences and assignment')}
          </Typography>
        )}

        <Stack spacing={stepActive ? 0 : 1.5}>
          {request.occurrences.map((occurrence) => {
            const isActive = activeOccurrenceId === occurrence.id;
            return (
              <Box key={occurrence.id} sx={{ display: stepActive && !isActive ? 'none' : 'block' }}>
                <ManagerOccurrenceRow
                  request={request}
                  occurrence={occurrence}
                  activePairSelection={isActive}
                  onChanged={onChanged}
                  onError={onError}
                  onOpenFinance={() => setFinanceOccurrenceId(occurrence.id)}
                />
              </Box>
            );
          })}
        </Stack>
      </Box>

      <OccurrenceFinanceDrawer
        open={Boolean(financeOccurrence)}
        onClose={() => setFinanceOccurrenceId(null)}
        requestId={request.id}
        occurrence={financeOccurrence}
        onChanged={onChanged}
        onError={onError}
      />
    </Stack>
  );
}

function ManagerOccurrenceRow({
  request,
  occurrence,
  activePairSelection,
  onChanged,
  onError,
  onOpenFinance,
}: {
  request: ServiceRequest;
  occurrence: ServiceRequestOccurrence;
  activePairSelection: boolean;
  onChanged: () => void;
  onError: (message: string) => void;
  onOpenFinance: () => void;
}) {
  const { formatNumber, locale, t } = useLocale();
  const assign = useAssignServiceOccurrence(request.id, occurrence.id);
  const bulkAssign = useAssignRemainingOccurrences(request.id);
  const evaluate = useEvaluatePartnerCandidates(request.id);
  const inspectors = usePartnerInspectors(true);
  const drones = usePartnerDrones(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [bulkPair, setBulkPair] = useState<{ inspectorId: string; droneId: string } | null>(null);

  const remainingUnassignedOther = request.occurrences.filter(
    (item) => item.status === 'PENDING_ASSIGNMENT' && item.id !== occurrence.id,
  );

  const setStepOpen = (open: boolean) => {
    const next = new URLSearchParams(searchParams);
    if (open) {
      next.set('step', 'dispatch-pair');
      next.set('occurrenceId', occurrence.id);
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
  const [candidates, setCandidates] = useState<PartnerCandidate[] | null>(null);
  const [evaluatedKey, setEvaluatedKey] = useState<string | null>(null);

  const start = customStart ?? instantToDateTimeInput(occurrence.plannedStartAt, request.timezone);
  const end = customEnd ?? instantToDateTimeInput(occurrence.plannedEndAt, request.timezone);
  const snapshotFeatures = Array.isArray(request.acceptedTermsSnapshot?.requiredDroneFeatureCodes)
    ? (request.acceptedTermsSnapshot.requiredDroneFeatureCodes as unknown[]).filter(
        (item): item is string => typeof item === 'string',
      )
    : [];
  const currentCriteriaKey = `${request.id}|${occurrence.id}|${request.acceptedQuoteId ?? ''}|${start}|${end}|${[...snapshotFeatures].sort().join(',')}`;
  const isEvaluationStale = evaluatedKey !== null && evaluatedKey !== currentCriteriaKey;

  const availableDrones = (drones.data ?? []).filter((item) => item.inspectorOwnerId === inspector);
  const selectedDrone = availableDrones.some((item) => item.id === drone)
    ? drone
    : candidates?.some((item) => item.inspectorId === inspector && item.droneId === drone)
      ? drone
      : '';
  const selectedCandidate =
    candidates?.find((item) => item.inspectorId === inspector && item.droneId === selectedDrone) ??
    null;
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
        onError(t('The confirmed end time must be after the start time.'));
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
      onError(extractContractErrorText(error, 'Unable to evaluate partner candidates.'));
    }
  };

  const submit = async () => {
    if (!inspector || !selectedDrone) {
      onError(t('Select an Inspector and one of their registered drones for this occurrence.'));
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
        onError(t('The confirmed end time must be after the start time.'));
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
      onError(extractContractErrorText(error, 'Unable to assign occurrence.'));
    }
  };

  if (activePairSelection && candidates !== null) {
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
        title={`${t('Select partner Inspector and drone')} · ${t('Occurrence')} ${occurrence.occurrenceIndex}`}
        subtitle={t(
          'Only eligible pairs that match the schedule and required capabilities are listed by default.',
        )}
        backLabel={t('Back to occurrence')}
        onBackToForm={() => setStepOpen(false)}
        onSelectPair={(candidate) => {
          setInspector(candidate.inspectorId);
          setDrone(candidate.droneId);
          setStepOpen(false);
        }}
      />
    );
  }

  const isAssigned = occurrence.status === 'ASSIGNED';
  const isPaid = occurrence.paymentStatus === 'PAID';
  const isPaymentDue = occurrence.paymentStatus === 'PAYMENT_DUE';
  const feeVnd =
    occurrence.totalPrice != null && occurrence.totalPrice > 0
      ? `${formatNumber(occurrence.totalPrice)} ₫`
      : null;
  const assignedInspectorName =
    (inspectors.data ?? []).find((item) => item.id === occurrence.inspectorId)?.fullName ??
    (occurrence.inspectorId ? t('Inspector') : null);
  const assignedDroneRecord = (drones.data ?? []).find((item) => item.id === occurrence.droneId);
  const assignedDroneLabel = assignedDroneRecord
    ? `${assignedDroneRecord.model} (${assignedDroneRecord.serialNumber})`
    : occurrence.droneId
      ? t('Drone')
      : null;

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: '8px',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.default',
      }}
    >
      <Stack spacing={1.5}>
        <Stack
          direction="row"
          sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }}>
              {t('Occurrence')} {occurrence.occurrenceIndex}
            </Typography>
            <Chip
              size="small"
              label={occurrence.status === 'ASSIGNED' ? t('Assigned') : t('Unassigned')}
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

          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            {feeVnd && (
              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexShrink: 0 }}>
                <PaidOutlined
                  sx={{ fontSize: 16, color: isPaid ? 'success.main' : 'text.secondary' }}
                />
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 700,
                    color: isPaid ? 'success.main' : 'text.primary',
                    fontVariantNumeric: 'tabular-nums',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {feeVnd}
                </Typography>
              </Stack>
            )}
            {(isAssigned ||
              Boolean(occurrence.invoice || occurrence.payment || occurrence.payout)) && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<AccountBalanceWalletOutlinedIcon fontSize="small" />}
                onClick={onOpenFinance}
                sx={{
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {t('Service invoice')}
              </Button>
            )}
          </Stack>
        </Stack>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {new Date(occurrence.plannedStartAt).toLocaleString(undefined, {
            timeZone: request.timezone,
          })}{' '}
          –{' '}
          {new Date(occurrence.plannedEndAt).toLocaleString(undefined, {
            timeZone: request.timezone,
          })}
        </Typography>

        {isAssigned ? (
          <Stack spacing={1.25}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
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
                {occurrence.assignmentStatus === 'PENDING_ACCEPTANCE' && (
                  <Chip
                    label={t('Awaiting Inspector confirmation')}
                    color="warning"
                    variant="outlined"
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                )}
                {occurrence.assignmentStatus === 'ACCEPTED' && (
                  <Chip
                    label={t('Inspector confirmed the schedule')}
                    color="success"
                    variant="outlined"
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                )}
                {occurrence.reportAcceptedAt && (
                  <Chip
                    label={t('Report accepted')}
                    color="success"
                    variant="outlined"
                    size="small"
                  />
                )}
              </Stack>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, flexShrink: 0 }}>
                {remainingUnassignedOther.length > 0 &&
                  occurrence.inspectorId &&
                  occurrence.droneId && (
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={bulkAssign.isPending}
                      onClick={() =>
                        setBulkPair({
                          inspectorId: occurrence.inspectorId as string,
                          droneId: occurrence.droneId as string,
                        })
                      }
                      sx={{
                        borderRadius: '8px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'none',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {bulkAssign.isPending
                        ? t('Assigning…')
                        : `${t('Apply this team to the remaining')} (${remainingUnassignedOther.length})`}
                    </Button>
                  )}
                {occurrence.inspectionId && (
                  <Button
                    component={Link}
                    to={`/manager/inspections/${occurrence.inspectionId}/review`}
                    size="small"
                    variant="outlined"
                    endIcon={<ArrowForwardRounded sx={{ fontSize: 14 }} />}
                    sx={{
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      textTransform: 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {t('Open review')}
                  </Button>
                )}
              </Stack>
            </Stack>

            {occurrence.reassignmentRequired && (
              <Alert
                severity="error"
                sx={{ borderRadius: '8px', alignItems: 'flex-start' }}
                action={
                  occurrence.inspectionId ? (
                    <Button
                      component={Link}
                      to={`/manager/inspections/${occurrence.inspectionId}?action=reassign`}
                      size="small"
                      variant="outlined"
                      color="error"
                      sx={{
                        borderRadius: '8px',
                        textTransform: 'none',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {t('Assign another team')}
                    </Button>
                  ) : undefined
                }
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {t('Inspector declined this schedule')}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.25 }}>
                  {occurrence.declineReason
                    ? `${t('Decline reason')}: ${occurrence.declineReason}`
                    : t('Reassign this flight to another Inspector.')}
                </Typography>
              </Alert>
            )}

            {occurrence.assignmentStatus === 'PENDING_ACCEPTANCE' && (
              <Typography variant="caption" color="text.secondary">
                {occurrence.acceptanceDeadlineAt
                  ? locale === 'vi'
                    ? `Đang chờ Inspector xác nhận trước ${new Date(
                        occurrence.acceptanceDeadlineAt,
                      ).toLocaleString(undefined, { timeZone: request.timezone })}.`
                    : `Waiting for the Inspector to confirm before ${new Date(
                        occurrence.acceptanceDeadlineAt,
                      ).toLocaleString(undefined, { timeZone: request.timezone })}.`
                  : t('Waiting for the Inspector to confirm the flight.')}
              </Typography>
            )}
          </Stack>
        ) : (
          request.status === 'CONTRACT_SIGNED' && (
            <Box
              sx={{
                p: 1.5,
                borderRadius: '8px',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
              }}
            >
              <Stack spacing={1.5}>
                {occurrence.lastTimeoutCancelledAt && (
                  <Alert severity="warning" sx={{ borderRadius: '8px' }}>
                    {locale === 'vi'
                      ? `Phân công trước đó${
                          occurrence.lastTimeoutInspectorName
                            ? ` cho ${occurrence.lastTimeoutInspectorName}`
                            : ''
                        } đã tự động hủy do quá thời hạn xác nhận (${new Date(
                          occurrence.lastTimeoutCancelledAt,
                        ).toLocaleString(undefined, {
                          timeZone: request.timezone,
                        })}). Vui lòng chọn và phân công Inspector khác.`
                      : `Previous assignment${
                          occurrence.lastTimeoutInspectorName
                            ? ` to ${occurrence.lastTimeoutInspectorName}`
                            : ''
                        } was auto-cancelled due to confirmation timeout (${new Date(
                          occurrence.lastTimeoutCancelledAt,
                        ).toLocaleString(undefined, {
                          timeZone: request.timezone,
                        })}). Please assign another Inspector.`}
                  </Alert>
                )}
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                  <TextField
                    fullWidth
                    label={t('Flight start')}
                    type="datetime-local"
                    size="small"
                    value={start}
                    onChange={(e) => setCustomStart(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  <TextField
                    fullWidth
                    label={t('Flight end')}
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
                      onClick={() => setStepOpen(true)}
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
                      p: 1.25,
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'background.default',
                      alignItems: { sm: 'center' },
                      justifyContent: 'space-between',
                    }}
                  >
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0 }}>
                      <Avatar
                        src={selectedCandidate.inspectorAvatarUrl ?? undefined}
                        alt={selectedCandidate.inspectorName}
                        sx={{
                          width: 38,
                          height: 38,
                          bgcolor: '#EEF2FF',
                          color: '#3758F9',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                        }}
                      >
                        {getInspectorInitials(selectedCandidate.inspectorName)}
                      </Avatar>
                      {selectedCandidate.droneHasImage ? (
                        <Box sx={{ width: 52, height: 38, flexShrink: 0 }}>
                          <AuthenticatedImage
                            src={`/drone-registration-applications/drones/${selectedCandidate.droneId}/image?index=0`}
                            alt={selectedCandidate.droneModel ?? t('Partner drone')}
                            maxHeight={38}
                            sx={{
                              width: 52,
                              height: 38,
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
                            width: 52,
                            height: 38,
                            borderRadius: '6px',
                            border: '1px solid',
                            borderColor: 'divider',
                            bgcolor: 'background.paper',
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

                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                  <LoadingButton
                    variant="contained"
                    size="small"
                    loading={assign.isPending}
                    disabled={isSelectedPairBlockedByEvaluation}
                    onClick={() => void submit()}
                    sx={{ borderRadius: '8px', fontWeight: 700, textTransform: 'none', boxShadow: 'none' }}
                  >
                    {t('Assign occurrence')}
                  </LoadingButton>
                  {remainingUnassignedOther.length > 0 && selectedCandidate && (
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={isSelectedPairBlockedByEvaluation || bulkAssign.isPending}
                      onClick={() => setBulkPair({ inspectorId: inspector, droneId: selectedDrone })}
                      sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                    >
                      {bulkAssign.isPending
                        ? t('Assigning…')
                        : `${t('Apply to remaining')} (${remainingUnassignedOther.length})`}
                    </Button>
                  )}
                </Stack>
              </Stack>
            </Box>
          )
        )}
      </Stack>

      <Dialog
        open={Boolean(bulkPair)}
        onClose={() => setBulkPair(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem' }}>
          {t('Apply this team to the remaining flights?')}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {t(
              'The same Inspector and drone will be assigned to the remaining unassigned flights. The Inspector must still confirm each schedule.',
            )}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            size="small"
            onClick={() => setBulkPair(null)}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            {t('Cancel')}
          </Button>
          <LoadingButton
            size="small"
            variant="contained"
            loading={bulkAssign.isPending}
            onClick={() => {
              const pair = bulkPair;
              setBulkPair(null);
              if (!pair) return;
              void bulkAssign
                .mutateAsync({
                  occurrences: remainingUnassignedOther.map((item) => ({
                    id: item.id,
                    plannedStartAt: item.plannedStartAt,
                    plannedEndAt: item.plannedEndAt,
                  })),
                  inspectorId: pair.inspectorId,
                  droneId: pair.droneId,
                })
                .then((result) => {
                  if (result.failed > 0) {
                    onError(
                      `${result.assigned} assigned, ${result.failed} could not be assigned.`,
                    );
                  }
                  onChanged();
                })
                .catch((error) => onError(extractContractErrorText(error, 'Unable to assign flights.')));
            }}
            sx={{ textTransform: 'none', fontWeight: 700, boxShadow: 'none', borderRadius: '8px' }}
          >
            {t('Apply to remaining')}
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
