import { useState } from 'react';
import { Alert, Box, Stack, TextField, Typography } from '@mui/material';
import { useIsDarkMode } from '@/app/layouts/ColorModeContext';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import type { ServiceRequestOccurrence } from '../api/contractApi';
import {
  useCancelOccurrenceRefund,
  useCompleteOccurrenceRefund,
  useInitiateOccurrenceRefund,
  useOccurrenceFinance,
  useReconcileRefundAllocation,
  useRecordReceivableRecovery,
} from '../hooks/useContracts';

interface Props {
  requestId: string;
  occurrence: ServiceRequestOccurrence;
  enabled: boolean;
  onChanged: () => void;
  onError: (message: string) => void;
}

const amount = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return Number.NaN;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

const isPositiveAmount = (value: string) => {
  const parsed = amount(value);
  return Number.isFinite(parsed) && parsed > 0;
};

const isNonNegativeAmount = (value: string) => {
  const parsed = amount(value);
  return Number.isFinite(parsed) && parsed >= 0;
};
const fields = [
  ['inspectorPayoutReduction', 'Inspector payout reduction'],
  ['platformCommissionAdjustment', 'Platform commission adjustment'],
  ['vatAdjustment', 'VAT adjustment'],
  ['tncnAdjustment', 'TNCN adjustment'],
  ['platformAbsorbedAmount', 'Platform absorbed amount'],
] as const;
type Allocation = Record<(typeof fields)[number][0], string>;
const emptyAllocation = (): Allocation => ({
  inspectorPayoutReduction: '',
  platformCommissionAdjustment: '',
  vatAdjustment: '',
  tncnAdjustment: '',
  platformAbsorbedAmount: '',
});
const allocationPayload = (value: Allocation) =>
  Object.fromEntries(fields.map(([key]) => [key, amount(value[key])])) as Record<
    keyof Allocation,
    number
  >;

export function RefundControls({ requestId, occurrence, enabled, onChanged, onError }: Props) {
  const { formatNumber, t } = useLocale();
  const isDark = useIsDarkMode();
  const occurrenceId = occurrence.id;
  const finance = useOccurrenceFinance(requestId, occurrenceId, enabled);
  const refunds = finance.data?.refunds ?? [];
  const receivables = finance.data?.inspectorReceivables ?? [];
  const initiate = useInitiateOccurrenceRefund(requestId, occurrenceId);
  const [refundAmount, setRefundAmount] = useState('');
  const [requestReference, setRequestReference] = useState('');
  const [reason, setReason] = useState('');
  const [reasonCode, setReasonCode] = useState('');
  const [serviceStage, setServiceStage] = useState('');
  const [contractClauseReference, setContractClauseReference] = useState('');
  const [evidenceReference, setEvidenceReference] = useState('');
  const [receivablePlan, setReceivablePlan] = useState('');
  const [absorbedPlan, setAbsorbedPlan] = useState('');
  const [completionAllocations, setCompletionAllocations] = useState<Record<string, Allocation>>(
    {},
  );
  const [externalReferences, setExternalReferences] = useState<Record<string, string>>({});
  const [cancelReasons, setCancelReasons] = useState<Record<string, string>>({});
  const [legacyPlans, setLegacyPlans] = useState<
    Record<string, { receivable: string; absorbed: string }>
  >({});
  const [legacyAllocations, setLegacyAllocations] = useState<Record<string, Allocation>>({});
  const [legacyEvidence, setLegacyEvidence] = useState<
    Record<string, { reference: string; note: string }>
  >({});
  const [recoveryDrafts, setRecoveryDrafts] = useState<
    Record<string, { amount: string; reference: string; note: string }>
  >({});

  const mutate = async (action: () => Promise<unknown>) => {
    try {
      await action();
      onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Refund action could not be recorded.');
    }
  };
  const updateAllocation = (
    setter: typeof setCompletionAllocations,
    current: Record<string, Allocation>,
    id: string,
    key: keyof Allocation,
    value: string,
  ) => setter({ ...current, [id]: { ...(current[id] ?? emptyAllocation()), [key]: value } });

  const cardSx = {
    p: 2,
    borderRadius: '10px',
    border: '1px solid',
    borderColor: 'divider',
    bgcolor: isDark ? 'rgba(255, 255, 255, 0.02)' : '#FAFAFB',
  } as const;

  const twoColGridSx = {
    display: 'grid',
    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
    gap: 1.5,
  } as const;

  return (
    <Stack spacing={2}>
      {finance.isError && (
        <Alert severity="error" sx={{ borderRadius: '8px' }}>
          Refund and receivable ledger could not be loaded. Retry by refreshing the occurrence.
        </Alert>
      )}
      {(occurrence.payout?.heldForRefund ||
        occurrence.refunds?.some(
          (refund) =>
            refund.status === 'INITIATED' ||
            (refund.status === 'COMPLETED' && refund.inspectorPayoutReduction == null),
        )) && (
        <Alert severity="warning" sx={{ borderRadius: '8px' }}>
          Inspector payout is on hold until all pending transfers are completed/cancelled and legacy
          allocations are reconciled.
        </Alert>
      )}

      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
        {t('Refund workflow (external transfers are manual)')}
      </Typography>

      <Box sx={cardSx}>
        <Stack spacing={1.75}>
          <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
            {t('1. Initiate refund — creates the payout hold before transfer')}
          </Typography>
          <Alert severity="info" sx={{ borderRadius: '8px' }}>
            The amount is entered from the signed service contract and supporting records. This
            screen does not calculate a statutory refund rate, tax adjustment, or legal entitlement.
          </Alert>

          <Box sx={twoColGridSx}>
            <TextField
              size="small"
              fullWidth
              type="number"
              label="Refund amount (per contract)"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
            />
            <TextField
              size="small"
              fullWidth
              label="Request reference"
              value={requestReference}
              onChange={(e) => setRequestReference(e.target.value)}
            />
            <TextField
              select
              size="small"
              fullWidth
              label="Reason code"
              value={reasonCode}
              onChange={(e) => setReasonCode(e.target.value)}
              slotProps={{ inputLabel: { shrink: true }, select: { native: true } }}
            >
              <option value="">{t('Select reason...')}</option>
              <option value="CUSTOMER_CANCELLATION">Customer cancellation</option>
              <option value="PROVIDER_UNABLE_TO_PERFORM">Provider unable to perform</option>
              <option value="WEATHER_OR_SAFETY">Weather or safety</option>
              <option value="SERVICE_NOT_CONFORMING">Service not conforming</option>
              <option value="CUSTOMER_DISPUTE">Customer dispute</option>
              <option value="DUPLICATE_OR_OVERCHARGE">Duplicate or overcharge</option>
              <option value="OTHER">Other</option>
            </TextField>
            <TextField
              select
              size="small"
              fullWidth
              label="Service stage"
              value={serviceStage}
              onChange={(e) => setServiceStage(e.target.value)}
              slotProps={{ inputLabel: { shrink: true }, select: { native: true } }}
            >
              <option value="">{t('Select stage...')}</option>
              <option value="BEFORE_DISPATCH">Before dispatch</option>
              <option value="AFTER_DISPATCH_BEFORE_FIELDWORK">Dispatched, before fieldwork</option>
              <option value="FIELDWORK_IN_PROGRESS">Fieldwork in progress</option>
              <option value="FIELDWORK_COMPLETED">Fieldwork completed</option>
              <option value="REPORT_PUBLISHED">Report published</option>
              <option value="AFTER_CUSTOMER_ACCEPTANCE">After customer acceptance</option>
              <option value="OTHER">Other</option>
            </TextField>
            <TextField
              size="small"
              fullWidth
              label="Contract clause/reference"
              value={contractClauseReference}
              onChange={(e) => setContractClauseReference(e.target.value)}
            />
            <TextField
              size="small"
              fullWidth
              label="Supporting evidence reference"
              value={evidenceReference}
              onChange={(e) => setEvidenceReference(e.target.value)}
            />
            <Box sx={{ gridColumn: { sm: '1 / -1' } }}>
              <TextField
                size="small"
                fullWidth
                multiline
                minRows={2}
                label="Case details / reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </Box>
            {occurrence.payout?.status === 'PAID' && (
              <>
                <TextField
                  size="small"
                  fullWidth
                  type="number"
                  label="Inspector receivable plan"
                  value={receivablePlan}
                  onChange={(e) => setReceivablePlan(e.target.value)}
                />
                <TextField
                  size="small"
                  fullWidth
                  type="number"
                  label="Platform absorbed plan"
                  value={absorbedPlan}
                  onChange={(e) => setAbsorbedPlan(e.target.value)}
                />
              </>
            )}
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <LoadingButton
              size="small"
              variant="outlined"
              loading={initiate.isPending}
              disabled={
                !finance.data ||
                !isPositiveAmount(refundAmount) ||
                !requestReference.trim() ||
                !reasonCode ||
                !serviceStage ||
                !contractClauseReference.trim() ||
                !evidenceReference.trim() ||
                !reason.trim() ||
                (occurrence.payout?.status === 'PAID' &&
                  (!isNonNegativeAmount(receivablePlan) ||
                    !isNonNegativeAmount(absorbedPlan) ||
                    Math.abs(amount(receivablePlan) + amount(absorbedPlan) - amount(refundAmount)) > 0.01))
              }
              onClick={() =>
                mutate(() =>
                  initiate.mutateAsync({
                    amount: amount(refundAmount),
                    requestReference: requestReference.trim(),
                    reasonCode,
                    serviceStage,
                    reason: reason.trim(),
                    contractClauseReference: contractClauseReference.trim(),
                    evidenceReference: evidenceReference.trim(),
                    inspectorReceivableAmount:
                      occurrence.payout?.status === 'PAID' ? amount(receivablePlan) : 0,
                    platformAbsorbedAmount:
                      occurrence.payout?.status === 'PAID' ? amount(absorbedPlan) : 0,
                  }),
                )
              }
              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
            >
              {t('Initiate refund')}
            </LoadingButton>
          </Box>
        </Stack>
      </Box>

      {enabled &&
        refunds.map((refund) => (
          <Box key={refund.id} sx={cardSx}>
            <Stack spacing={1.5}>
              <Typography
                variant="body2"
                sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
              >
                Refund {refund.requestReference ?? refund.id} · {refund.status} ·{' '}
                {formatNumber(Math.round(refund.amount))} ₫ · {refund.reasonCode ?? 'Legacy'} /{' '}
                {refund.serviceStage ?? '—'}
              </Typography>
              {refund.status === 'INITIATED' && (
                <>
                  <Typography variant="caption" color="text.secondary">
                    2. Transfer externally, then record the transfer evidence and accounting
                    allocation.
                  </Typography>
                  <Box sx={twoColGridSx}>
                    {fields.map(([key, label]) => (
                      <TextField
                        key={key}
                        size="small"
                        fullWidth
                        type="number"
                        label={label}
                        value={completionAllocations[refund.id]?.[key] ?? ''}
                        onChange={(e) =>
                          updateAllocation(
                            setCompletionAllocations,
                            completionAllocations,
                            refund.id,
                            key,
                            e.target.value,
                          )
                        }
                      />
                    ))}
                    <TextField
                      size="small"
                      fullWidth
                      label="External transfer reference"
                      value={externalReferences[refund.id] ?? ''}
                      onChange={(e) =>
                        setExternalReferences({
                          ...externalReferences,
                          [refund.id]: e.target.value,
                        })
                      }
                    />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <CompleteButton
                      requestId={requestId}
                      occurrenceId={occurrenceId}
                      refundId={refund.id}
                      allocation={completionAllocations[refund.id] ?? emptyAllocation()}
                      reference={externalReferences[refund.id] ?? ''}
                      run={mutate}
                    />
                  </Box>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                    <TextField
                      size="small"
                      fullWidth
                      label="Cancellation reason (only if not transferred)"
                      value={cancelReasons[refund.id] ?? ''}
                      onChange={(e) =>
                        setCancelReasons({ ...cancelReasons, [refund.id]: e.target.value })
                      }
                    />
                    <CancelButton
                      requestId={requestId}
                      occurrenceId={occurrenceId}
                      refundId={refund.id}
                      reason={cancelReasons[refund.id] ?? ''}
                      run={mutate}
                    />
                  </Stack>
                </>
              )}
              {enabled && refund.status === 'COMPLETED' && refund.inspectorPayoutReduction == null && (
                <>
                  <Typography variant="caption" color="text.secondary">
                    3. Reconcile this legacy refund only, using its own source evidence.
                  </Typography>
                  <Box sx={twoColGridSx}>
                    {fields.map(([key, label]) => (
                      <TextField
                        key={key}
                        size="small"
                        fullWidth
                        type="number"
                        label={label}
                        value={legacyAllocations[refund.id]?.[key] ?? ''}
                        onChange={(e) =>
                          updateAllocation(
                            setLegacyAllocations,
                            legacyAllocations,
                            refund.id,
                            key,
                            e.target.value,
                          )
                        }
                      />
                    ))}
                    <TextField
                      size="small"
                      fullWidth
                      type="number"
                      label="Inspector receivable plan"
                      value={legacyPlans[refund.id]?.receivable ?? ''}
                      onChange={(e) =>
                        setLegacyPlans({
                          ...legacyPlans,
                          [refund.id]: {
                            receivable: e.target.value,
                            absorbed: legacyPlans[refund.id]?.absorbed ?? '',
                          },
                        })
                      }
                    />
                    <TextField
                      size="small"
                      fullWidth
                      type="number"
                      label="Platform absorbed plan"
                      value={legacyPlans[refund.id]?.absorbed ?? ''}
                      onChange={(e) =>
                        setLegacyPlans({
                          ...legacyPlans,
                          [refund.id]: {
                            receivable: legacyPlans[refund.id]?.receivable ?? '',
                            absorbed: e.target.value,
                          },
                        })
                      }
                    />
                    <TextField
                      size="small"
                      fullWidth
                      label="Evidence reference"
                      value={legacyEvidence[refund.id]?.reference ?? ''}
                      onChange={(e) =>
                        setLegacyEvidence({
                          ...legacyEvidence,
                          [refund.id]: {
                            reference: e.target.value,
                            note: legacyEvidence[refund.id]?.note ?? '',
                          },
                        })
                      }
                    />
                    <TextField
                      size="small"
                      fullWidth
                      label="Reconciliation note"
                      value={legacyEvidence[refund.id]?.note ?? ''}
                      onChange={(e) =>
                        setLegacyEvidence({
                          ...legacyEvidence,
                          [refund.id]: {
                            reference: legacyEvidence[refund.id]?.reference ?? '',
                            note: e.target.value,
                          },
                        })
                      }
                    />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <LegacyButton
                      requestId={requestId}
                      occurrenceId={occurrenceId}
                      refundId={refund.id}
                      allocation={legacyAllocations[refund.id] ?? emptyAllocation()}
                      plan={legacyPlans[refund.id] ?? { receivable: '', absorbed: '' }}
                      evidence={legacyEvidence[refund.id] ?? { reference: '', note: '' }}
                      run={mutate}
                    />
                  </Box>
                </>
              )}
            </Stack>
          </Box>
        ))}

      {enabled &&
        receivables.map((receivable) => {
          const draft = recoveryDrafts[receivable.id] ?? {
            amount: '',
            reference: '',
            note: '',
          };
          return (
            <Box key={receivable.id} sx={cardSx}>
              <Stack spacing={1.25}>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
                >
                  Inspector receivable · outstanding{' '}
                  {formatNumber(Math.round(receivable.outstandingAmount))} ₫
                </Typography>
                <Box sx={twoColGridSx}>
                  <TextField
                    size="small"
                    fullWidth
                    type="number"
                    label="Recovery amount"
                    value={draft.amount}
                    onChange={(e) =>
                      setRecoveryDrafts({
                        ...recoveryDrafts,
                        [receivable.id]: { ...draft, amount: e.target.value },
                      })
                    }
                  />
                  <TextField
                    size="small"
                    fullWidth
                    label="Collection reference"
                    value={draft.reference}
                    onChange={(e) =>
                      setRecoveryDrafts({
                        ...recoveryDrafts,
                        [receivable.id]: { ...draft, reference: e.target.value },
                      })
                    }
                  />
                  <Box sx={{ gridColumn: { sm: '1 / -1' } }}>
                    <TextField
                      size="small"
                      fullWidth
                      label="Note"
                      value={draft.note}
                      onChange={(e) =>
                        setRecoveryDrafts({
                          ...recoveryDrafts,
                          [receivable.id]: { ...draft, note: e.target.value },
                        })
                      }
                    />
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <RecoveryButton
                    requestId={requestId}
                    occurrenceId={occurrenceId}
                    receivableId={receivable.id}
                    draft={draft}
                    run={mutate}
                  />
                </Box>
                {receivable.recoveries.map((row) => (
                  <Typography key={row.id} variant="caption" color="text.secondary">
                    Recovered {formatNumber(Math.round(row.amount))} ₫ · {row.externalReference} ·{' '}
                    {row.recordedAt}
                  </Typography>
                ))}
              </Stack>
            </Box>
          );
        })}
    </Stack>
  );
}

function CompleteButton({
  requestId,
  occurrenceId,
  refundId,
  allocation,
  reference,
  run,
}: {
  requestId: string;
  occurrenceId: string;
  refundId: string;
  allocation: Allocation;
  reference: string;
  run: (action: () => Promise<unknown>) => Promise<void>;
}) {
  const complete = useCompleteOccurrenceRefund(requestId, occurrenceId, refundId);
  const disabled = fields.some(([key]) => !isNonNegativeAmount(allocation[key])) || !reference.trim();
  return (
    <LoadingButton
      size="small"
      variant="outlined"
      loading={complete.isPending}
      disabled={disabled}
      onClick={() =>
        run(() =>
          complete.mutateAsync({
            ...allocationPayload(allocation),
            externalReference: reference.trim(),
          }),
        )
      }
      sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px', whiteSpace: 'nowrap' }}
    >
      Record completed transfer
    </LoadingButton>
  );
}

function CancelButton({
  requestId,
  occurrenceId,
  refundId,
  reason,
  run,
}: {
  requestId: string;
  occurrenceId: string;
  refundId: string;
  reason: string;
  run: (action: () => Promise<unknown>) => Promise<void>;
}) {
  const cancel = useCancelOccurrenceRefund(requestId, occurrenceId, refundId);
  return (
    <LoadingButton
      size="small"
      color="error"
      variant="outlined"
      loading={cancel.isPending}
      disabled={!reason.trim()}
      onClick={() => run(() => cancel.mutateAsync({ reason: reason.trim() }))}
      sx={{
        textTransform: 'none',
        fontWeight: 600,
        borderRadius: '8px',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      Cancel untransferred refund
    </LoadingButton>
  );
}

function LegacyButton({
  requestId,
  occurrenceId,
  refundId,
  allocation,
  plan,
  evidence,
  run,
}: {
  requestId: string;
  occurrenceId: string;
  refundId: string;
  allocation: Allocation;
  plan: { receivable: string; absorbed: string };
  evidence: { reference: string; note: string };
  run: (action: () => Promise<unknown>) => Promise<void>;
}) {
  const reconcile = useReconcileRefundAllocation(requestId, occurrenceId, refundId);
  return (
    <LoadingButton
      size="small"
      variant="outlined"
      loading={reconcile.isPending}
      disabled={
        fields.some(([key]) => !isNonNegativeAmount(allocation[key])) ||
        !isNonNegativeAmount(plan.receivable) ||
        !isNonNegativeAmount(plan.absorbed) ||
        !evidence.reference.trim() ||
        !evidence.note.trim()
      }
      onClick={() =>
        run(() =>
          reconcile.mutateAsync({
            ...allocationPayload(allocation),
            inspectorReceivableAmount: amount(plan.receivable),
            platformAbsorbedPlanAmount: amount(plan.absorbed),
            reconciliationReference: evidence.reference.trim(),
            note: evidence.note.trim(),
          }),
        )
      }
      sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px', whiteSpace: 'nowrap' }}
    >
      Reconcile legacy allocation
    </LoadingButton>
  );
}

function RecoveryButton({
  requestId,
  occurrenceId,
  receivableId,
  draft,
  run,
}: {
  requestId: string;
  occurrenceId: string;
  receivableId: string;
  draft: { amount: string; reference: string; note: string };
  run: (action: () => Promise<unknown>) => Promise<void>;
}) {
  const recovery = useRecordReceivableRecovery(requestId, occurrenceId, receivableId);
  return (
    <LoadingButton
      size="small"
      variant="outlined"
      loading={recovery.isPending}
      disabled={
        !isPositiveAmount(draft.amount) ||
        !draft.reference.trim() ||
        !draft.note.trim()
      }
      onClick={() =>
        run(() =>
          recovery.mutateAsync({
            amount: amount(draft.amount),
            externalReference: draft.reference.trim(),
            note: draft.note.trim(),
          }),
        )
      }
      sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px', whiteSpace: 'nowrap' }}
    >
      Record recovery
    </LoadingButton>
  );
}
