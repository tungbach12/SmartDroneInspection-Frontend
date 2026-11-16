import { useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ChatOutlinedIcon from '@mui/icons-material/ChatOutlined';
import FlightOutlinedIcon from '@mui/icons-material/FlightOutlined';
import PersonSearchOutlinedIcon from '@mui/icons-material/PersonSearchOutlined';
import { useSearchParams } from 'react-router-dom';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import {
  type IssueServiceQuoteInput,
  type PartnerCandidate,
  type ServiceRequest,
} from '../../api/contractApi';
import { enumerateMonthlySchedule } from '../../api/recurrenceSchedule';
import { dateTimeInputToInstant, instantToDateTimeInput } from '../../api/scheduleTime';
import {
  useEvaluatePartnerCandidates,
  useIssueServiceQuote,
  usePartnerDrones,
  usePartnerInspectors,
} from '../../hooks/useContracts';
import {
  getInspectorInitials,
  isSelectablePartnerCandidate,
  PartnerCandidateResults,
} from '../../components/PartnerCandidateResults';
import {
  extractContractErrorText,
  resolveCurrentQuote,
} from '../../shared/contractStage';
import { QuoteTermsSummary } from '../../shared/QuoteTermsSummary';

interface ManagerQuoteWorkspaceProps {
  request: ServiceRequest;
  onChanged: () => void;
  onError: (message: string) => void;
  onOpenInbox: (requestId: string) => void;
  onPairSelectionChange: (confirmed: boolean) => void;
}

export function ManagerQuoteWorkspace({
  request,
  onChanged,
  onError,
  onOpenInbox,
  onPairSelectionChange,
}: ManagerQuoteWorkspaceProps) {
  const { locale, t } = useLocale();
  const [searchParams, setSearchParams] = useSearchParams();
  const stepOpen = searchParams.get('step') === 'quote-pair';
  const setStepOpen = (open: boolean) => {
    const next = new URLSearchParams(searchParams);
    if (open) {
      next.set('step', 'quote-pair');
    } else {
      next.delete('step');
    }
    setSearchParams(next, { replace: false });
  };

  const currentQuote = resolveCurrentQuote(request);
  const save = useIssueServiceQuote(request.id);
  const evaluate = useEvaluatePartnerCandidates(request.id);
  const inspectors = usePartnerInspectors(true);
  const drones = usePartnerDrones(true);

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
  const requiredCapabilities = currentQuote?.requiredDroneFeatureCodes ?? [];
  const [candidates, setCandidates] = useState<PartnerCandidate[] | null>(null);
  const [evaluatedCriteriaKey, setEvaluatedCriteriaKey] = useState<string | null>(null);
  const [pairConfirmed, setPairConfirmed] = useState(false);

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

  const currentCriteriaKey = `${request.id}|${start}|${end}|${[...requiredCapabilities].sort().join(',')}`;
  const isEvaluationStale =
    evaluatedCriteriaKey !== null && evaluatedCriteriaKey !== currentCriteriaKey;

  const availableDrones = (drones.data ?? []).filter((drone) => drone.inspectorOwnerId === inspectorId);
  const selectedDroneId = availableDrones.some((drone) => drone.id === droneId)
    ? droneId
    : candidates?.some((item) => item.inspectorId === inspectorId && item.droneId === droneId)
      ? droneId
      : '';
  const selectedCandidate =
    candidates?.find(
      (item) => item.inspectorId === inspectorId && item.droneId === selectedDroneId,
    ) ?? null;
  const pairConfirmedAndCurrent =
    pairConfirmed &&
    candidates !== null &&
    !isEvaluationStale &&
    selectedCandidate !== null &&
    isSelectablePartnerCandidate(selectedCandidate);
  const isSelectedPairBlockedByEvaluation = currentQuote
    ? candidates !== null && !pairConfirmedAndCurrent
    : !pairConfirmedAndCurrent;

  const invalidatePairSelection = () => {
    setPairConfirmed(false);
    onPairSelectionChange(false);
  };
  const updateStart = (value: string) => {
    invalidatePairSelection();
    setStart(value);
  };
  const updateEnd = (value: string) => {
    invalidatePairSelection();
    setEnd(value);
  };

  const inspectorLicenseExpiresAt = inspectors.data?.find(
    (candidate) => candidate.id === inspectorId,
  )?.licenseExpiresAt;
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

  const runPartnerEvaluation = async () => {
    try {
      const plannedStartAt = dateTimeInputToInstant(start, request.timezone);
      const plannedEndAt = dateTimeInputToInstant(end, request.timezone);
      if (Date.parse(plannedEndAt) <= Date.parse(plannedStartAt)) {
        onError('The proposed occurrence end must be after its start.');
        return;
      }
      setPairConfirmed(false);
      onPairSelectionChange(false);
      const result = await evaluate.mutateAsync({
        plannedStartAt,
        plannedEndAt,
        requiredDroneFeatureCodes: requiredCapabilities,
      });
      setCandidates(result);
      setEvaluatedCriteriaKey(currentCriteriaKey);
      setStepOpen(true);
    } catch (error) {
      onError(extractContractErrorText(error, 'Unable to evaluate partner candidates.'));
    }
  };

  const saveQuote = async () => {
    if (!scope.trim()) {
      onError('Enter the quoted inspection scope.');
      return;
    }
    if (!inspectorId || !selectedDroneId) {
      onError('Select a registered partner Inspector and one of their drones.');
      return;
    }
    if (isSelectedPairBlockedByEvaluation) {
      onError(
        candidates === null && !currentQuote
          ? 'Find eligible partners and select a pair before saving the quote.'
          : isEvaluationStale
            ? 'Schedule or capability criteria changed. Re-run partner evaluation before saving the quote.'
            : 'Only an eligible partner pair with matching capabilities can be quoted.',
      );
      return;
    }
    if (request.requestType === 'RECURRING' && !inspectorLicenseCoversSchedule) {
      onError(
        'The selected Inspector pilot license expires before the last planned occurrence. Choose another Inspector or adjust the schedule.',
      );
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
        requiredDroneFeatureCodes: [...requiredCapabilities],
      } satisfies IssueServiceQuoteInput);
      onChanged();
    } catch (error) {
      onError(extractContractErrorText(error, 'Unable to save quote.'));
    }
  };

  if (stepOpen && candidates !== null) {
    return (
      <PartnerCandidateResults
        variant="step"
        candidates={candidates}
        loading={evaluate.isPending}
        stale={isEvaluationStale}
        windowSummary={`${start.replace('T', ' ')} → ${end.replace('T', ' ')}`}
        requiredCapabilities={requiredCapabilities}
        selectedInspectorId={inspectorId}
        selectedDroneId={selectedDroneId}
        title={t('Select partner Inspector and drone')}
        subtitle={t('Select the qualified partner pair that will be included in the quotation.')}
        backLabel={t('Back to request review')}
        onBackToForm={() => setStepOpen(false)}
        onSelectPair={(candidate) => {
          setInspectorId(candidate.inspectorId);
          setDroneId(candidate.droneId);
          setPairConfirmed(true);
          onPairSelectionChange(true);
          setStepOpen(false);
        }}
      />
    );
  }

  const currentInspector = (inspectors.data ?? []).find(
    (item) => item.id === currentQuote?.inspectorId,
  );
  const currentDrone = (drones.data ?? []).find((item) => item.id === currentQuote?.droneId);
  const partnerLabel = currentQuote
    ? `${currentInspector?.fullName ?? t('Assigned partner pilot')} · ${
        currentDrone
          ? `${currentDrone.model} (${currentDrone.serialNumber})`
          : t('Assigned inspection drone')
      }`
    : null;

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '10px',
        bgcolor: 'background.paper',
        overflow: 'hidden',
      }}
    >
      <Stack
        direction="row"
        sx={{
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          p: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>
          {currentQuote ? t('Current quote') : t('Request review')}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          {currentQuote && (
            <Chip size="small" label={t('Current terms')} sx={{ borderRadius: '6px' }} />
          )}
          <Button
            size="small"
            variant="outlined"
            startIcon={<ChatOutlinedIcon fontSize="small" />}
            onClick={() => onOpenInbox(request.id)}
            sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
          >
            Messages
          </Button>
        </Stack>
      </Stack>

      <Box sx={{ p: 2 }}>
        <Stack spacing={2}>
          {currentQuote && (
            <QuoteTermsSummary
              request={request}
              quote={currentQuote}
              partnerSummary={partnerLabel}
            />
          )}

          {!currentQuote && !pairConfirmedAndCurrent ? (
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
                <Typography variant="body2" color="text.secondary">
                  {t(
                    'Review the requested scope and schedule, then select an eligible Inspector and drone before preparing the quotation.',
                  )}
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {t('Review schedule and select partner')}
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <TextField
                    fullWidth
                    label={t('First occurrence start')}
                    type="datetime-local"
                    size="small"
                    value={start}
                    onChange={(event) => updateStart(event.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  <TextField
                    fullWidth
                    label={t('First occurrence end')}
                    type="datetime-local"
                    size="small"
                    value={end}
                    onChange={(event) => updateEnd(event.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Stack>
                <LoadingButton
                  loading={evaluate.isPending}
                  variant="contained"
                  startIcon={<PersonSearchOutlinedIcon fontSize="small" />}
                  onClick={() => void runPartnerEvaluation()}
                  sx={{
                    alignSelf: 'flex-start',
                    textTransform: 'none',
                    fontWeight: 700,
                    borderRadius: '8px',
                    boxShadow: 'none',
                  }}
                >
                  {t('Select Inspector and drone')}
                </LoadingButton>
              </Stack>
            </Box>
          ) : (
            <Stack spacing={1.5}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {currentQuote ? t('Edit current quote') : t('Create quote')}
              </Typography>

              <TextField
                label={t('Quoted scope')}
                multiline
                minRows={2}
                size="small"
                value={scope}
                onChange={(event) => setScope(event.target.value)}
              />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  fullWidth
                  label={t('First occurrence start')}
                  type="datetime-local"
                  size="small"
                  value={start}
                  onChange={(event) => updateStart(event.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField
                  fullWidth
                  label={t('First occurrence end')}
                  type="datetime-local"
                  size="small"
                  value={end}
                  onChange={(event) => updateEnd(event.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Stack>

              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
                {currentQuote && (
                  <LoadingButton
                    size="small"
                    variant="outlined"
                    loading={evaluate.isPending}
                    onClick={() => void runPartnerEvaluation()}
                    sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
                  >
                    {t('Recheck partner pair')}
                  </LoadingButton>
                )}
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setStepOpen(true)}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
                >
                  {t('Change selected pair')}
                </Button>
              </Stack>

              {pairConfirmedAndCurrent && selectedCandidate && (
                <Box
                  component="button"
                  type="button"
                  onClick={() => setStepOpen(true)}
                  aria-label={t('View selected Inspector and drone details')}
                  sx={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.25,
                    p: 1.25,
                    textAlign: 'left',
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: '8px',
                    bgcolor: 'background.default',
                    color: 'text.primary',
                    '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                    '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main' },
                  }}
                >
                  <Avatar
                    src={selectedCandidate.inspectorAvatarUrl ?? undefined}
                    alt={selectedCandidate.inspectorName}
                    sx={{
                      width: 40,
                      height: 40,
                      flexShrink: 0,
                      bgcolor: '#EEF2FF',
                      color: '#3758F9',
                      fontWeight: 700,
                    }}
                  >
                    {getInspectorInitials(selectedCandidate.inspectorName)}
                  </Avatar>
                  {selectedCandidate.droneHasImage !== false ? (
                    <AuthenticatedImage
                      src={`/drone-registration-applications/drones/${selectedCandidate.droneId}/image?index=0`}
                      alt={`${selectedCandidate.droneModel ?? t('Partner drone')} (${selectedCandidate.droneSerialNumber})`}
                      maxHeight={44}
                      sx={{
                        width: 60,
                        height: 44,
                        objectFit: 'cover',
                        borderRadius: '6px',
                        border: '1px solid',
                        borderColor: 'divider',
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: 60,
                        height: 44,
                        borderRadius: '6px',
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                        display: 'grid',
                        placeItems: 'center',
                        color: 'text.secondary',
                        flexShrink: 0,
                      }}
                    >
                      <FlightOutlinedIcon fontSize="small" />
                    </Box>
                  )}
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                        {selectedCandidate.inspectorName}
                      </Typography>
                      <Chip
                        size="small"
                        label={t('Eligible match')}
                        color="success"
                        variant="outlined"
                        sx={{
                          height: 20,
                          borderRadius: '6px',
                          fontWeight: 600,
                          fontSize: '0.6875rem',
                        }}
                      />
                    </Stack>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {selectedCandidate.droneModel ?? t('Partner drone')} ·{' '}
                      {selectedCandidate.droneSerialNumber}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600 }}>
                    {t('Details')}
                  </Typography>
                </Box>
              )}

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
                <Box
                  sx={{
                    p: 1.25,
                    bgcolor: 'background.default',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: '8px',
                  }}
                >
                  <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, mb: 0.5 }}>
                    {t('Planned occurrence dates')} · {recurringDates.length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {recurringDates
                      .slice(0, 4)
                      .map((date) =>
                        new Date(`${date}T12:00:00`).toLocaleDateString(
                          locale === 'vi' ? 'vi-VN' : 'en-US',
                          { timeZone: 'UTC' },
                        ),
                      )
                      .join(' · ')}
                    {recurringDates.length > 4 ? ' … ' : ''}
                    {recurringDates.length > 4 &&
                      new Date(`${recurringDates[recurringDates.length - 1]}T12:00:00`).toLocaleDateString(
                        locale === 'vi' ? 'vi-VN' : 'en-US',
                        { timeZone: 'UTC' },
                      )}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mt: 0.5, fontWeight: 600 }}
                  >
                    {Number(price || 0).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US')} VND ×{' '}
                    {recurringDates.length} ={' '}
                    {(Number(price || 0) * recurringDates.length).toLocaleString(
                      locale === 'vi' ? 'vi-VN' : 'en-US',
                    )}{' '}
                    VND
                  </Typography>
                </Box>
              )}

              {request.requestType === 'RECURRING' &&
                inspectorId &&
                !inspectors.isPending &&
                !inspectorLicenseCoversSchedule && (
                  <Alert severity="error" sx={{ py: 0, borderRadius: '8px' }}>
                    {t(
                      'Pilot license expires before the last planned inspection. Select another Inspector or change the schedule.',
                    )}
                  </Alert>
                )}

              {isEvaluationStale && (
                <Alert severity="warning" sx={{ py: 0, borderRadius: '8px' }}>
                  {t(
                    'Schedule or capability criteria changed. Re-run partner evaluation before confirming.',
                  )}
                </Alert>
              )}

              <Box>
                <LoadingButton
                  loading={save.isPending}
                  disabled={isSelectedPairBlockedByEvaluation}
                  variant="contained"
                  onClick={() => void saveQuote()}
                  sx={{ borderRadius: '8px', fontWeight: 700, textTransform: 'none', boxShadow: 'none' }}
                >
                  {currentQuote ? t('Save quote changes') : t('Save quote')}
                </LoadingButton>
              </Box>
            </Stack>
          )}
        </Stack>
      </Box>
    </Box>
  );
}
