import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Avatar,
  Box,
  Button,
  ButtonBase,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import ChatOutlinedIcon from '@mui/icons-material/ChatOutlined';
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import FlightOutlinedIcon from '@mui/icons-material/FlightOutlined';
import PersonSearchOutlinedIcon from '@mui/icons-material/PersonSearchOutlined';
import { Link, useSearchParams } from 'react-router-dom';
import { InspectorProfileDialog } from '@/features/admin/components/InspectorProfileDialog';
import { mf1ReviewApi } from '@/features/admin/api/mf1ReviewApi';
import { useAsset } from '@/features/assets/hooks/useAssets';
import { NoFlyFootprintAlert } from '@/shared/airspace/RestrictedAirspaceNotice';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import { StatusChip } from '@/shared/ui/StatusChip';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import {
  type AssignOccurrenceInput,
  type PartnerCandidate,
  type PartnerDrone,
  type ServiceRequest,
  type ServiceRequestOccurrence,
} from '../../api/contractApi';
import { dateTimeInputToInstant, instantToDateTimeInput } from '../../api/scheduleTime';
import {
  useAssignRemainingOccurrences,
  useAssignServiceOccurrence,
  useCancelServiceOccurrence,
  useEvaluatePartnerCandidates,
  usePartnerDrones,
  usePartnerInspectors,
} from '../../hooks/useContracts';
import {
  getInspectorInitials,
  isSelectablePartnerCandidate,
  PartnerCandidateResults,
} from '../../components/PartnerCandidateResults';
import { extractContractErrorText } from '../../shared/contractStage';

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
  const [detailInspectorId, setDetailInspectorId] = useState<string | null>(null);
  const [detailDrone, setDetailDrone] = useState<{
    droneId: string;
    inspectorName: string | null;
    fallbackLabel: string;
  } | null>(null);
  const partnerDronesQuery = usePartnerDrones(Boolean(detailDrone));
  const assetQuery = useAsset(request.assetId);

  const isOneTime =
    request.requestType === 'ONE_TIME' && request.occurrences.length <= 1;

  return (
    <Stack spacing={2}>
      <Box
        sx={
          stepActive
            ? { borderRadius: 0, border: 0, bgcolor: 'transparent' }
            : {
                borderRadius: '12px',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                p: { xs: 2, sm: 2.5 },
              }
        }
      >
        {!stepActive && (
          <Stack
            direction="row"
            spacing={1}
            sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
          >
            <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>
              {isOneTime
                ? t('Scheduled flight & assignment')
                : t('Occurrences and assignment')}
            </Typography>
            {!isOneTime && request.occurrences.length > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {request.occurrences.length} {t('occurrences')}
              </Typography>
            )}
          </Stack>
        )}

        {!stepActive && (
          <NoFlyFootprintAlert
            latitude={assetQuery.data?.latitude}
            longitude={assetQuery.data?.longitude}
            footprintAreaSquareMeters={assetQuery.data?.footprintAreaSquareMeters}
            sx={{ mb: 2 }}
          />
        )}

        <Stack spacing={stepActive ? 0 : 1.5}>
          {request.occurrences.map((occurrence) => {
            const isActive = activeOccurrenceId === occurrence.id;
            return (
              <Box key={occurrence.id} sx={{ display: stepActive && !isActive ? 'none' : 'block' }}>
                <ManagerOccurrenceRow
                  request={request}
                  occurrence={occurrence}
                  isOneTime={isOneTime}
                  activePairSelection={isActive}
                  onChanged={onChanged}
                  onError={onError}
                  onOpenInspector={(inspectorId) => setDetailInspectorId(inspectorId)}
                  onOpenDrone={(droneId, inspectorName, fallbackLabel) =>
                    setDetailDrone({ droneId, inspectorName, fallbackLabel })
                  }
                />
              </Box>
            );
          })}
        </Stack>
      </Box>

      {detailInspectorId && (
        <InspectorProfileDialog
          open
          onClose={() => setDetailInspectorId(null)}
          inspectorId={detailInspectorId}
        />
      )}

      {detailDrone && (
        <PartnerDroneDetailDialog
          drone={detailDrone}
          partnerDrones={partnerDronesQuery.data ?? []}
          onClose={() => setDetailDrone(null)}
        />
      )}
    </Stack>
  );
}

function ManagerOccurrenceRow({
  request,
  occurrence,
  isOneTime,
  activePairSelection,
  onChanged,
  onError,
  onOpenInspector,
  onOpenDrone,
}: {
  request: ServiceRequest;
  occurrence: ServiceRequestOccurrence;
  isOneTime: boolean;
  activePairSelection: boolean;
  onChanged: () => void;
  onError: (message: string) => void;
  onOpenInspector: (inspectorId: string) => void;
  onOpenDrone: (droneId: string, inspectorName: string | null, fallbackLabel: string) => void;
}) {
  const { formatNumber, locale, t } = useLocale();
  const assign = useAssignServiceOccurrence(request.id, occurrence.id);
  const bulkAssign = useAssignRemainingOccurrences(request.id);
  const cancelOccurrence = useCancelServiceOccurrence(request.id, occurrence.id);
  const evaluate = useEvaluatePartnerCandidates(request.id);
  const inspectors = usePartnerInspectors(true);
  const drones = usePartnerDrones(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [bulkPair, setBulkPair] = useState<{ inspectorId: string; droneId: string } | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

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
        title={
          isOneTime
            ? t('Select partner Inspector and drone')
            : `${t('Select partner Inspector and drone')} · ${t('Occurrence')} ${occurrence.occurrenceIndex}`
        }
        backLabel={isOneTime ? t('Back to assignment') : t('Back to occurrence')}
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
  const assignedInspectorRecord = (inspectors.data ?? []).find(
    (item) => item.id === occurrence.inspectorId,
  );
  const assignedInspectorName =
    assignedInspectorRecord?.fullName ??
    occurrence.inspectorName ??
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
        p: { xs: 1.75, sm: 2 },
        borderRadius: '10px',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Stack spacing={1.5}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: 1.25 }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem', color: 'text.primary' }}>
                {isOneTime
                  ? t('Inspection flight')
                  : `${t('Occurrence')} ${occurrence.occurrenceIndex}`}
              </Typography>
              <StatusChip
                status={isAssigned ? 'assigned' : 'pending'}
                label={occurrence.status === 'ASSIGNED' ? 'Assigned' : 'Unassigned'}
                tone={isAssigned ? 'success' : 'default'}
              />
              {isPaid && <StatusChip status="paid" label="Paid" tone="success" />}
              {isPaymentDue && (
                <StatusChip status="payment_due" label="Payment Due" tone="warning" />
              )}
              {occurrence.reportAcceptedAt && (
                <StatusChip status="accepted" label="Report accepted" tone="success" />
              )}
            </Stack>
            <Stack
              direction="row"
              spacing={0.75}
              sx={{ alignItems: 'center', mt: 0.75, color: 'text.secondary' }}
            >
              <CalendarTodayOutlinedIcon sx={{ fontSize: 14, flexShrink: 0 }} />
              <Typography variant="caption" sx={{ fontVariantNumeric: 'tabular-nums', fontSize: '0.8125rem' }}>
                {new Date(occurrence.plannedStartAt).toLocaleString(undefined, {
                  timeZone: request.timezone,
                })}{' '}
                –{' '}
                {new Date(occurrence.plannedEndAt).toLocaleString(undefined, {
                  timeZone: request.timezone,
                })}
              </Typography>
            </Stack>
          </Box>

          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1, flexShrink: 0 }}
          >
            {feeVnd && (
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 700,
                  fontSize: '0.9375rem',
                  color: 'text.primary',
                  fontVariantNumeric: 'tabular-nums',
                  whiteSpace: 'nowrap',
                  mr: 0.5,
                }}
              >
                {feeVnd}
              </Typography>
            )}
            {isAssigned && occurrence.inspectionId && (
              <Button
                component={Link}
                to={`/manager/inspections/${occurrence.inspectionId}/audit`}
                size="small"
                variant="outlined"
                endIcon={<ArrowForwardRounded sx={{ fontSize: 14 }} />}
                sx={{
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  fontWeight: 650,
                  textTransform: 'none',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {t('Open review')}
              </Button>
            )}
          </Stack>
        </Stack>

        {isAssigned ? (
          <Stack
            spacing={1.5}
            sx={{ pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}
          >
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'minmax(0, 1fr)',
                  md: 'minmax(0, 1fr) minmax(0, 1fr) auto',
                },
                gap: { xs: 1.5, md: 2 },
                alignItems: 'center',
              }}
            >
              {assignedInspectorName && (() => {
                const inspectorContent = (
                  <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0, width: '100%' }}>
                    <Avatar
                      src={assignedInspectorRecord?.avatarUrl ?? undefined}
                      alt={assignedInspectorName}
                      sx={{
                        width: 40,
                        height: 40,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'action.hover',
                        color: 'text.primary',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        flexShrink: 0,
                      }}
                    >
                      {getInspectorInitials(assignedInspectorName)}
                    </Avatar>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography
                        component="div"
                        variant="caption"
                        noWrap
                        sx={{
                          color: 'text.secondary',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                          lineHeight: 1.2,
                        }}
                      >
                        {t('Inspector')}
                        {occurrence.assignmentStatus === 'ACCEPTED' && (
                          <Box
                            component="span"
                            sx={{
                              color: 'success.main',
                              textTransform: 'none',
                              letterSpacing: 0,
                              ml: 0.5,
                            }}
                          >
                            · {t('Confirmed')}
                          </Box>
                        )}
                        {occurrence.assignmentStatus === 'PENDING_ACCEPTANCE' && (
                          <Box
                            component="span"
                            sx={{
                              color: 'warning.main',
                              textTransform: 'none',
                              letterSpacing: 0,
                              ml: 0.5,
                            }}
                          >
                            · {t('Awaiting confirmation')}
                          </Box>
                        )}
                      </Typography>
                      <Typography
                        className="pair-primary-text"
                        variant="body2"
                        noWrap
                        title={assignedInspectorName}
                        sx={{
                          fontWeight: 650,
                          fontSize: '0.875rem',
                          color: 'text.primary',
                          lineHeight: 1.35,
                          mt: 0.15,
                        }}
                      >
                        {assignedInspectorName}
                      </Typography>
                    </Box>
                  </Stack>
                );

                return occurrence.inspectorId ? (
                  <ButtonBase
                    type="button"
                    aria-label={assignedInspectorName}
                    onClick={() => onOpenInspector(occurrence.inspectorId as string)}
                    sx={{
                      width: '100%',
                      textAlign: 'left',
                      justifyContent: 'flex-start',
                      borderRadius: '8px',
                      p: 0.75,
                      m: -0.75,
                      transition: 'background-color 150ms ease, color 150ms ease',
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                      '&:hover .pair-primary-text': {
                        color: 'primary.main',
                        textDecoration: 'underline',
                      },
                    }}
                  >
                    {inspectorContent}
                  </ButtonBase>
                ) : (
                  inspectorContent
                );
              })()}

              {assignedDroneLabel && (() => {
                const dronePrimaryTitle = assignedDroneRecord?.model || assignedDroneLabel;
                const droneSubLabel = assignedDroneRecord?.serialNumber || null;
                const droneContent = (
                  <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0, width: '100%' }}>
                    <Box
                      sx={{
                        width: 56,
                        height: 40,
                        flexShrink: 0,
                        borderRadius: '8px',
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'action.hover',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {occurrence.droneId && assignedDroneRecord?.hasImage ? (
                        <AuthenticatedImage
                          src={`/drone-registration-applications/drones/${occurrence.droneId}/image?index=0`}
                          alt={assignedDroneLabel}
                          maxHeight={40}
                          sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                      ) : (
                        <FlightOutlinedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                      )}
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography
                        component="div"
                        variant="caption"
                        noWrap
                        sx={{
                          color: 'text.secondary',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                          lineHeight: 1.2,
                        }}
                      >
                        {t('Drone')}
                        {droneSubLabel && (
                          <Box
                            component="span"
                            sx={{
                              textTransform: 'none',
                              letterSpacing: 0,
                              fontVariantNumeric: 'tabular-nums',
                              fontWeight: 500,
                              ml: 0.5,
                            }}
                          >
                            · {droneSubLabel}
                          </Box>
                        )}
                      </Typography>
                      <Typography
                        className="pair-primary-text"
                        variant="body2"
                        noWrap
                        title={assignedDroneLabel}
                        sx={{
                          fontWeight: 650,
                          fontSize: '0.875rem',
                          color: 'text.primary',
                          lineHeight: 1.35,
                          mt: 0.15,
                        }}
                      >
                        {dronePrimaryTitle}
                      </Typography>
                    </Box>
                  </Stack>
                );

                return occurrence.droneId ? (
                  <ButtonBase
                    type="button"
                    aria-label={assignedDroneLabel}
                    onClick={() =>
                      onOpenDrone(
                        occurrence.droneId as string,
                        assignedInspectorName,
                        assignedDroneLabel,
                      )
                    }
                    sx={{
                      width: '100%',
                      textAlign: 'left',
                      justifyContent: 'flex-start',
                      borderRadius: '8px',
                      p: 0.75,
                      m: -0.75,
                      transition: 'background-color 150ms ease, color 150ms ease',
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                      '&:hover .pair-primary-text': {
                        color: 'primary.main',
                        textDecoration: 'underline',
                      },
                    }}
                  >
                    {droneContent}
                  </ButtonBase>
                ) : (
                  droneContent
                );
              })()}

              <Stack
                direction="row"
                spacing={1}
                sx={{ flexWrap: 'wrap', gap: 1, flexShrink: 0, justifySelf: { md: 'end' } }}
              >
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
                {occurrence.inspectorId && (
                  <Button
                    component={Link}
                    to={`/manager/messages?partnerRequestId=${request.id}&inspectorId=${occurrence.inspectorId}`}
                    size="small"
                    variant="outlined"
                    startIcon={<ChatOutlinedIcon sx={{ fontSize: 14 }} />}
                    sx={{
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      textTransform: 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {t('Messages')}
                  </Button>
                )}
              </Stack>
            </Box>

            {occurrence.reassignmentRequired && (
              <Alert
                severity="error"
                sx={{ borderRadius: '8px', alignItems: 'flex-start' }}
                action={
                  <Stack direction="row" spacing={1} sx={{ flexShrink: 0, flexWrap: 'wrap' }}>
                    {occurrence.inspectionId && (
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
                    )}
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={() => {
                        setCancelReason(
                          occurrence.declineReason || t('Unable to obtain restricted-airspace flight permit'),
                        );
                        setCancelOpen(true);
                      }}
                      sx={{
                        borderRadius: '8px',
                        textTransform: 'none',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {t('Cancel flight')}
                    </Button>
                  </Stack>
                }
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {t('Inspector declined this schedule')}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.25 }}>
                  {occurrence.declineReason
                    ? `${t('Decline reason')}: ${occurrence.declineReason}`
                    : t('Reassign this flight to another Inspector or cancel it.')}
                </Typography>
              </Alert>
            )}

            {occurrence.assignmentStatus === 'PENDING_ACCEPTANCE' && (
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
              >
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
                <Button
                  size="small"
                  variant="text"
                  color="error"
                  onClick={() => {
                    setCancelReason('');
                    setCancelOpen(true);
                  }}
                  sx={{ textTransform: 'none', fontWeight: 600, alignSelf: { xs: 'flex-start', sm: 'center' } }}
                >
                  {t('Cancel flight')}
                </Button>
              </Stack>
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
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={() => {
                      setCancelReason('');
                      setCancelOpen(true);
                    }}
                    sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                  >
                    {t('Cancel flight')}
                  </Button>
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

      <Dialog open={cancelOpen} onClose={() => setCancelOpen(false)} maxWidth="xs" fullWidth>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (!cancelReason.trim()) return;
            try {
              await cancelOccurrence.mutateAsync({ reason: cancelReason.trim() });
              setCancelOpen(false);
              onChanged();
            } catch (error) {
              onError(extractContractErrorText(error, 'Could not cancel scheduled flight.'));
            }
          }}
        >
          <DialogTitle sx={{ fontWeight: 700 }}>{t('Cancel scheduled flight?')}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label={t('Cancellation reason')}
                multiline
                minRows={3}
                required
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                helperText={t(
                  'Enter why this flight is cancelled (e.g., restricted-airspace permit unavailable).',
                )}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setCancelOpen(false)}>{t('Back')}</Button>
            <LoadingButton
              type="submit"
              color="error"
              variant="contained"
              loading={Boolean(cancelOccurrence?.isPending)}
              disabled={!cancelReason.trim()}
            >
              {t('Confirm cancellation')}
            </LoadingButton>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}

function PartnerDroneDetailDialog({
  drone,
  partnerDrones,
  onClose,
}: {
  drone: { droneId: string; inspectorName: string | null; fallbackLabel: string };
  partnerDrones: PartnerDrone[];
  onClose: () => void;
}) {
  const { formatDate, t } = useLocale();
  const droneRecord = partnerDrones.find((item) => item.id === drone.droneId) ?? null;
  const historyQuery = useQuery({
    queryKey: ['mf1-drone-history'],
    queryFn: mf1ReviewApi.droneHistory,
    staleTime: 30_000,
  });

  const registration = (historyQuery.data ?? []).find((app) => app.droneId === drone.droneId) ?? null;
  const hasImage = Boolean(droneRecord?.hasImage || (registration?.imageFileKeys?.length ?? 0) > 0);
  const rawTitleText = droneRecord?.model || registration?.model || drone.fallbackLabel;
  const titleText =
    rawTitleText
      .replace(/\s*\[[^\]]*(?:MTOW:|Thời gian bay:|Flight time:|Camera(?:\s*\/\s*Sensor)?:)[^\]]*\]\s*$/i, '')
      .trim() || rawTitleText;

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: '12px' } } }}>
      <DialogTitle sx={{ pr: 6 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <FlightOutlinedIcon color="primary" fontSize="small" />
          <Typography variant="subtitle1" component="span" sx={{ fontWeight: 700 }}>
            {titleText}
          </Typography>
        </Stack>
        <IconButton
          aria-label={t('Close')}
          onClick={onClose}
          sx={{ position: 'absolute', right: 12, top: 12 }}
        >
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {hasImage && (
            <Box
              sx={{
                borderRadius: '10px',
                overflow: 'hidden',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.default',
              }}
            >
              <AuthenticatedImage
                src={`/drone-registration-applications/drones/${drone.droneId}/image?index=0`}
                alt={titleText}
                maxHeight={220}
                sx={{ width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block' }}
              />
            </Box>
          )}

          {historyQuery.isLoading && (
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', color: 'text.secondary' }}>
              <CircularProgress size={16} />
              <Typography variant="caption">{t('Loading drone specifications…')}</Typography>
            </Stack>
          )}

          <Stack spacing={1} sx={{ fontVariantNumeric: 'tabular-nums' }}>
            <DroneDetailRow
              label={t('Serial number')}
              value={droneRecord?.serialNumber ?? registration?.serialNumber ?? '—'}
            />
            {registration?.manufacturer && (
              <DroneDetailRow label={t('Manufacturer')} value={registration.manufacturer} />
            )}
            {(drone.inspectorName || registration?.inspectorFullName) && (
              <DroneDetailRow
                label={t('Owner / Inspector')}
                value={registration?.inspectorFullName ?? drone.inspectorName ?? '—'}
              />
            )}
            {registration?.registrationNumber && (
              <DroneDetailRow
                label={t('Registration number')}
                value={registration.registrationNumber}
              />
            )}
            {registration?.registrationExpiresAt && (
              <DroneDetailRow
                label={t('Registration expires')}
                value={formatDate(new Date(registration.registrationExpiresAt))}
              />
            )}
            {registration?.maxAltitudeMeters != null && (
              <DroneDetailRow
                label={t('Max altitude')}
                value={`${registration.maxAltitudeMeters} m`}
              />
            )}
            {registration?.maxWindResistanceMps != null && (
              <DroneDetailRow
                label={t('Max wind resistance')}
                value={`${registration.maxWindResistanceMps} m/s`}
              />
            )}
            {registration?.opticalZoomLevel && (
              <DroneDetailRow label={t('Optical zoom')} value={registration.opticalZoomLevel} />
            )}
            {registration?.mtowKg != null && (
              <DroneDetailRow label="MTOW" value={`${registration.mtowKg} kg`} />
            )}
            {registration?.maxFlightTimeMinutes != null && (
              <DroneDetailRow
                label={t('Max flight time')}
                value={`${registration.maxFlightTimeMinutes} min`}
              />
            )}
            {registration?.cameraSensor && (
              <DroneDetailRow label={t('Camera / Sensor')} value={registration.cameraSensor} />
            )}
          </Stack>

          {(registration?.hasThermalCamera ||
            registration?.hasRtk ||
            Boolean(registration?.features?.length)) && (
            <>
              <Divider />
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                  {t('Declared capabilities')}
                </Typography>
                <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.75 }}>
                  {registration?.hasThermalCamera && (
                    <Chip size="small" label={t('Thermal camera')} variant="outlined" />
                  )}
                  {registration?.hasRtk && (
                    <Chip size="small" label="RTK" variant="outlined" />
                  )}
                  {(registration?.features ?? []).map((code) => (
                    <Chip key={code} size="small" label={code} variant="outlined" />
                  ))}
                </Stack>
              </Box>
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none', fontWeight: 600 }}>
          {t('Close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function DroneDetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>
        {value}
      </Typography>
    </Stack>
  );
}
