import { useEffect, useState } from 'react';
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
import FlightOutlinedIcon from '@mui/icons-material/FlightOutlined';
import PersonSearchOutlinedIcon from '@mui/icons-material/PersonSearchOutlined';
import { useSearchParams } from 'react-router-dom';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import {
  type IssueServiceQuoteInput,
  type PartnerCandidate,
  type ServiceRequest,
} from '../api/contractApi';
import { dateTimeInputToInstant, instantToDateTimeInput } from '../api/scheduleTime';
import { enumerateMonthlySchedule } from '../api/recurrenceSchedule';
import {
  useAcceptServiceQuote,
  useEvaluatePartnerCandidates,
  useIssueServiceQuote,
  usePartnerDrones,
  usePartnerInspectors,
  usePartnerCapabilities,
} from '../hooks/useContracts';
import {
  getInspectorInitials,
  isSelectablePartnerCandidate,
  PartnerCandidateResults,
} from './PartnerCandidateResults';

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
  onPairSelectionChange?: (confirmed: boolean) => void;
}

export function RequestQuotePanel({
  request,
  customer,
  manager,
  onChanged,
  onError,
  onOpenInbox,
  onPairSelectionChange,
}: RequestQuotePanelProps) {
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
  const legacyQuotes = (request as { quotes?: ServiceRequest['currentQuote'][] }).quotes;
  const currentQuote = request.currentQuote ?? legacyQuotes?.[0] ?? null;
  const accept = useAcceptServiceQuote(request.id);
  const save = useIssueServiceQuote(request.id);
  const evaluate = useEvaluatePartnerCandidates(request.id);
  const inspectors = usePartnerInspectors(manager);
  const drones = usePartnerDrones(manager);
  const capabilities = usePartnerCapabilities();

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
  const [requiredCapabilities, setRequiredCapabilities] = useState<string[]>(
    currentQuote?.requiredDroneFeatureCodes ?? [],
  );
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
  const [confirmAcceptOpen, setConfirmAcceptOpen] = useState(false);
  const legacyAcceptedVersion = (request as { acceptedQuoteVersion?: number | null })
    .acceptedQuoteVersion;
  const accepted =
    (currentQuote?.id != null && request.acceptedQuoteId === currentQuote.id) ||
    request.acceptedQuoteId != null ||
    legacyAcceptedVersion != null;
  const editable = manager && ['OPEN', 'QUOTED'].includes(request.status) && !accepted;

  const currentCriteriaKey = `${request.id}|${start}|${end}|${[...requiredCapabilities].sort().join(',')}`;
  const isEvaluationStale =
    evaluatedCriteriaKey !== null && evaluatedCriteriaKey !== currentCriteriaKey;
  useEffect(() => {
    if (pairConfirmed && (isEvaluationStale || candidates === null)) {
      setPairConfirmed(false);
      onPairSelectionChange?.(false);
    }
  }, [candidates, isEvaluationStale, onPairSelectionChange, pairConfirmed]);

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

  const runPartnerEvaluation = async () => {
    try {
      const plannedStartAt = dateTimeInputToInstant(start, request.timezone);
      const plannedEndAt = dateTimeInputToInstant(end, request.timezone);
      if (Date.parse(plannedEndAt) <= Date.parse(plannedStartAt)) {
        onError('The proposed occurrence end must be after its start.');
        return;
      }
      setPairConfirmed(false);
      onPairSelectionChange?.(false);
      const result = await evaluate.mutateAsync({
        plannedStartAt,
        plannedEndAt,
        requiredDroneFeatureCodes: requiredCapabilities,
      });
      setCandidates(result);
      setEvaluatedCriteriaKey(currentCriteriaKey);
      setStepOpen(true);
    } catch (error) {
      onError(extractErrorText(error, 'Unable to evaluate partner candidates.'));
    }
  };

  const invalidatePairSelection = () => {
    setPairConfirmed(false);
    onPairSelectionChange?.(false);
  };
  const updateStart = (value: string) => {
    invalidatePairSelection();
    setStart(value);
  };
  const updateEnd = (value: string) => {
    invalidatePairSelection();
    setEnd(value);
  };
  const toggleCapability = (code: string) => {
    invalidatePairSelection();
    setRequiredCapabilities((prev) =>
      prev.includes(code) ? prev.filter((item) => item !== code) : [...prev, code],
    );
  };
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
        requiredDroneFeatureCodes: [...requiredCapabilities],
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

  // The Inspector/drone choice is its own workspace step: it replaces the quote form instead of
  // being embedded in it. All draft state lives in this component, so Back returns to it intact.
  // A restored or hand-edited step URL has no in-memory evaluation, so it falls back to the
  // form instead of blanking the panel: candidate evaluation is backend-authoritative.
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
        subtitle={t(
          currentQuote
            ? 'Select the qualified partner pair that will be included in the quotation.'
            : 'Select the qualified partner pair that will be included in the quotation.',
        )}
        backLabel={t('Back to request review')}
        onBackToForm={() => {
          setStepOpen(false);
        }}
        onSelectPair={(candidate) => {
          setInspectorId(candidate.inspectorId);
          setDroneId(candidate.droneId);
          setPairConfirmed(true);
          onPairSelectionChange?.(true);
          setStepOpen(false);
        }}
      />
    );
  }

  return (
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1.5, bgcolor: 'background.paper', overflow: 'hidden' }}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1, p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>
          {currentQuote ? t('Current quote') : t('Request review')}
        </Typography>
        {currentQuote && (
          <Chip size="small" label={accepted ? t('Accepted · locked') : t('Current terms')} color={accepted ? 'success' : 'default'} />
        )}
      </Stack>

      <Box sx={{ p: 2 }}>
        {!currentQuote ? (
          <Typography color="text.secondary">
            {hasDispatchedOccurrence ? t('Commercial terms settled under active dispatch schedule.') : t('Review the requested scope and schedule, then select an eligible Inspector and drone before preparing the quotation.')}
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
                    {t('Request a price review in Messages')}
                  </LoadingButton>
                )}
              </Stack>
            )}
          </Stack>
        )}

        {editable && !currentQuote && !pairConfirmedAndCurrent && (
          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'background.default' }}>
            <Stack spacing={1.5}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {t('Review schedule and select partner')}
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField fullWidth label={t('First occurrence start')} type="datetime-local" size="small" value={start} onChange={(event) => updateStart(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
                <TextField fullWidth label={t('First occurrence end')} type="datetime-local" size="small" value={end} onChange={(event) => updateEnd(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
              </Stack>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  {t('Required capabilities')}:
                </Typography>
                {(capabilities.data ?? []).map((option) => {
                  const active = requiredCapabilities.includes(option.code);
                  return (
                    <Chip
                      key={option.code}
                      size="small"
                      label={locale === 'vi' ? option.nameVi : option.nameEn}
                      color={active ? 'primary' : 'default'}
                      variant={active ? 'filled' : 'outlined'}
                      onClick={() => toggleCapability(option.code)}
                      sx={{ borderRadius: '6px', fontWeight: 600 }}
                    />
                  );
                })}
              </Stack>
              <LoadingButton
                loading={evaluate.isPending}
                variant="contained"
                startIcon={<PersonSearchOutlinedIcon fontSize="small" />}
                onClick={() => void runPartnerEvaluation()}
                sx={{ alignSelf: 'flex-start', textTransform: 'none', fontWeight: 700 }}
              >
                {t('Select Inspector and drone')}
              </LoadingButton>
            </Stack>
          </Box>
        )}

        {editable && (currentQuote || pairConfirmedAndCurrent) && (
          <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                {currentQuote ? t('Edit current quote') : t('Create quote')}
              </Typography>
              <Stack spacing={1.5}>
                
                <TextField label={t('Quoted scope')} multiline minRows={2} size="small" value={scope} onChange={(event) => setScope(event.target.value)} />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <TextField fullWidth label={t('First occurrence start')} type="datetime-local" size="small" value={start} onChange={(event) => updateStart(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
                  <TextField fullWidth label={t('First occurrence end')} type="datetime-local" size="small" value={end} onChange={(event) => updateEnd(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
                </Stack>

                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1.5}
                  sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
                >
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      {t('Required capabilities')}:
                    </Typography>
                    {(capabilities.data ?? []).map((option) => {
                      const active = requiredCapabilities.includes(option.code);
                      return (
                        <Chip
                          key={option.code}
                          size="small"
                          label={locale === 'vi' ? option.nameVi : option.nameEn}
                          color={active ? 'primary' : 'default'}
                          variant={active ? 'filled' : 'outlined'}
                          onClick={() => toggleCapability(option.code)}
                          sx={{ borderRadius: '6px', fontWeight: 600 }}
                        />
                      );
                    })}
                  </Stack>

                  <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                    {currentQuote && manager && !accepted && (
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
                    {(pairConfirmedAndCurrent || currentQuote) && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          setStepOpen(true);
                        }}
                        sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
                      >
                        {t('Change selected pair')}
                      </Button>
                    )}
                  </Stack>
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
                      borderRadius: '10px',
                      bgcolor: 'background.default',
                      color: 'text.primary',
                      '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                      '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main' },
                    }}
                  >
                    <Avatar
                      src={selectedCandidate.inspectorAvatarUrl ?? undefined}
                      alt={selectedCandidate.inspectorName}
                      sx={{ width: 42, height: 42, flexShrink: 0, bgcolor: '#EEF2FF', color: '#3758F9', fontWeight: 700 }}
                    >
                      {getInspectorInitials(selectedCandidate.inspectorName)}
                    </Avatar>
                    {selectedCandidate.droneHasImage !== false ? (
                      <AuthenticatedImage
                        src={`/drone-registration-applications/drones/${selectedCandidate.droneId}/image?index=0`}
                        alt={`${selectedCandidate.droneModel ?? t('Partner drone')} (${selectedCandidate.droneSerialNumber})`}
                        maxHeight={48}
                        sx={{ width: 64, height: 48, objectFit: 'cover', borderRadius: '8px', border: '1px solid', borderColor: 'divider', flexShrink: 0 }}
                      />
                    ) : (
                      <Box sx={{ width: 64, height: 48, borderRadius: '8px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', display: 'grid', placeItems: 'center', color: 'text.secondary', flexShrink: 0 }}>
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
                          sx={{ height: 20, borderRadius: '6px', fontWeight: 600, fontSize: '0.6875rem' }}
                        />
                      </Stack>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {selectedCandidate.droneModel ?? t('Partner drone')} · {selectedCandidate.droneSerialNumber}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600, flexShrink: 0 }}>
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
                {isEvaluationStale && (
                  <Alert severity="warning" sx={{ py: 0 }}>
                    {t('Schedule or capability criteria changed. Re-run partner evaluation before confirming.')}
                  </Alert>
                )}
                <Box>
                  <LoadingButton
                    loading={save.isPending}
                    disabled={isSelectedPairBlockedByEvaluation}
                    variant="contained"
                    onClick={() => void saveQuote()}
                    sx={{ fontWeight: 700 }}
                  >
                    {currentQuote ? t('Save quote changes') : t('Save quote')}
                  </LoadingButton>
                </Box>
              </Stack>
            </Box>
          </Box>
        )}
      </Box>

      <ConfirmDialog
        open={confirmAcceptOpen}
        title={t('Confirm Quote Acceptance')}
        message={
          currentQuote
            ? locale === 'vi'
              ? `Bạn xác nhận chấp nhận báo giá hiện tại (${formatQuotePrice(currentQuote)})? Sau khi chấp nhận, điều khoản sẽ bị khóa. Nếu cần yêu cầu xem xét lại giá, hãy nhắn Quản lý trước khi chấp nhận. Tiếp theo hai bên ký hợp đồng giấy.`
              : `Accept the current quote (${formatQuotePrice(currentQuote)})? Terms will lock after acceptance. If you need a price review, message the Manager before accepting. Next, both parties sign the paper contract.`
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
