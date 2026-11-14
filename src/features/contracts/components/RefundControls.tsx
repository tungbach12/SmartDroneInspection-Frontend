import { useState } from 'react';
import { Alert, Paper, Stack, TextField, Typography } from '@mui/material';
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

const amount = (value: string) => Number(value || 0);
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
  Object.fromEntries(fields.map(([key]) => [key, amount(value[key])])) as Record<keyof Allocation, number>;

export function RefundControls({ requestId, occurrence, enabled, onChanged, onError }: Props) {
  const { formatNumber, t } = useLocale();
  const occurrenceId = occurrence.id;
  const finance = useOccurrenceFinance(requestId, occurrenceId, enabled);
  const refunds = finance.data?.refunds ?? [];
  const receivables = finance.data?.inspectorReceivables ?? [];
  const initiate = useInitiateOccurrenceRefund(requestId, occurrenceId);
  const [refundAmount, setRefundAmount] = useState('');
  const [requestReference, setRequestReference] = useState('');
  const [reason, setReason] = useState('');
  const [receivablePlan, setReceivablePlan] = useState('');
  const [absorbedPlan, setAbsorbedPlan] = useState('');
  const [completionAllocations, setCompletionAllocations] = useState<Record<string, Allocation>>({});
  const [externalReferences, setExternalReferences] = useState<Record<string, string>>({});
  const [cancelReasons, setCancelReasons] = useState<Record<string, string>>({});
  const [legacyPlans, setLegacyPlans] = useState<Record<string, { receivable: string; absorbed: string }>>({});
  const [legacyAllocations, setLegacyAllocations] = useState<Record<string, Allocation>>({});
  const [legacyEvidence, setLegacyEvidence] = useState<Record<string, { reference: string; note: string }>>({});
  const [recoveryDrafts, setRecoveryDrafts] = useState<Record<string, { amount: string; reference: string; note: string }>>({});

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

  return (
    <Stack spacing={1.5} sx={{ pt: 1 }}>
      {finance.isError && <Alert severity="error">Refund and receivable ledger could not be loaded. Retry by refreshing the occurrence.</Alert>}
      {(occurrence.payout?.heldForRefund || occurrence.refunds?.some((refund) => refund.status === 'INITIATED' || (refund.status === 'COMPLETED' && refund.inspectorPayoutReduction == null))) && (
        <Alert severity="warning">Inspector payout is on hold until all pending transfers are completed/cancelled and legacy allocations are reconciled.</Alert>
      )}
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{t('Refund workflow (external transfers are manual)')}</Typography>
      <Paper variant="outlined" sx={{ p: 1.5 }}>
        <Stack spacing={1}>
          <Typography variant="caption" sx={{ fontWeight: 700 }}>1. Initiate refund — creates the payout hold before transfer</Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
            <TextField size="small" type="number" label="Refund amount" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} />
            <TextField size="small" label="Request reference" value={requestReference} onChange={(e) => setRequestReference(e.target.value)} />
            <TextField size="small" label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} sx={{ flex: 1 }} />
          </Stack>
          {occurrence.payout?.status === 'PAID' && (
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
              <TextField size="small" type="number" label="Inspector receivable plan" value={receivablePlan} onChange={(e) => setReceivablePlan(e.target.value)} />
              <TextField size="small" type="number" label="Platform absorbed plan" value={absorbedPlan} onChange={(e) => setAbsorbedPlan(e.target.value)} />
            </Stack>
          )}
          <LoadingButton size="small" variant="outlined" loading={initiate.isPending} disabled={!finance.data || !refundAmount || amount(refundAmount) <= 0 || !requestReference.trim() || !reason.trim() || (occurrence.payout?.status === 'PAID' && (!receivablePlan || !absorbedPlan || amount(receivablePlan) + amount(absorbedPlan) !== amount(refundAmount)))} onClick={() => mutate(() => initiate.mutateAsync({ amount: amount(refundAmount), requestReference: requestReference.trim(), reason: reason.trim(), inspectorReceivableAmount: occurrence.payout?.status === 'PAID' ? amount(receivablePlan) : 0, platformAbsorbedAmount: occurrence.payout?.status === 'PAID' ? amount(absorbedPlan) : 0 }))}>Initiate refund</LoadingButton>
        </Stack>
      </Paper>

      {enabled && refunds.map((refund) => (
        <Paper key={refund.id} variant="outlined" sx={{ p: 1.5 }}>
          <Stack spacing={1}>
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              Refund {refund.requestReference ?? refund.id} · {refund.status} · {formatNumber(refund.amount)} ₫
            </Typography>
            {refund.status === 'INITIATED' && (
              <>
                <Typography variant="caption">2. Transfer externally, then record the transfer evidence and accounting allocation.</Typography>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
                  {fields.map(([key, label]) => <TextField key={key} size="small" type="number" label={label} value={completionAllocations[refund.id]?.[key] ?? ''} onChange={(e) => updateAllocation(setCompletionAllocations, completionAllocations, refund.id, key, e.target.value)} />)}
                  <TextField size="small" label="External transfer reference" value={externalReferences[refund.id] ?? ''} onChange={(e) => setExternalReferences({ ...externalReferences, [refund.id]: e.target.value })} />
                  <CompleteButton requestId={requestId} occurrenceId={occurrenceId} refundId={refund.id} allocation={completionAllocations[refund.id] ?? emptyAllocation()} reference={externalReferences[refund.id] ?? ''} run={mutate} />
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <TextField size="small" label="Cancellation reason (only if not transferred)" value={cancelReasons[refund.id] ?? ''} onChange={(e) => setCancelReasons({ ...cancelReasons, [refund.id]: e.target.value })} />
                  <CancelButton requestId={requestId} occurrenceId={occurrenceId} refundId={refund.id} reason={cancelReasons[refund.id] ?? ''} run={mutate} />
                </Stack>
              </>
            )}
            {enabled && refund.status === 'COMPLETED' && refund.inspectorPayoutReduction == null && (
              <>
                <Typography variant="caption">3. Reconcile this legacy refund only, using its own source evidence.</Typography>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
                  {fields.map(([key, label]) => <TextField key={key} size="small" type="number" label={label} value={legacyAllocations[refund.id]?.[key] ?? ''} onChange={(e) => updateAllocation(setLegacyAllocations, legacyAllocations, refund.id, key, e.target.value)} />)}
                  <TextField size="small" type="number" label="Inspector receivable plan" value={legacyPlans[refund.id]?.receivable ?? ''} onChange={(e) => setLegacyPlans({ ...legacyPlans, [refund.id]: { receivable: e.target.value, absorbed: legacyPlans[refund.id]?.absorbed ?? '' } })} />
                  <TextField size="small" type="number" label="Platform absorbed plan" value={legacyPlans[refund.id]?.absorbed ?? ''} onChange={(e) => setLegacyPlans({ ...legacyPlans, [refund.id]: { receivable: legacyPlans[refund.id]?.receivable ?? '', absorbed: e.target.value } })} />
                  <TextField size="small" label="Evidence reference" value={legacyEvidence[refund.id]?.reference ?? ''} onChange={(e) => setLegacyEvidence({ ...legacyEvidence, [refund.id]: { reference: e.target.value, note: legacyEvidence[refund.id]?.note ?? '' } })} />
                  <TextField size="small" label="Reconciliation note" value={legacyEvidence[refund.id]?.note ?? ''} onChange={(e) => setLegacyEvidence({ ...legacyEvidence, [refund.id]: { reference: legacyEvidence[refund.id]?.reference ?? '', note: e.target.value } })} />
                  <LegacyButton requestId={requestId} occurrenceId={occurrenceId} refundId={refund.id} allocation={legacyAllocations[refund.id] ?? emptyAllocation()} plan={legacyPlans[refund.id] ?? { receivable: '', absorbed: '' }} evidence={legacyEvidence[refund.id] ?? { reference: '', note: '' }} run={mutate} />
                </Stack>
              </>
            )}
          </Stack>
        </Paper>
      ))}

      {enabled && receivables.map((receivable) => {
        const draft = recoveryDrafts[receivable.id] ?? { amount: '', reference: '', note: '' };
        return <Paper key={receivable.id} variant="outlined" sx={{ p: 1.5 }}><Stack spacing={1}>
          <Typography variant="caption" sx={{ fontWeight: 700 }}>Inspector receivable · outstanding {formatNumber(receivable.outstandingAmount)} ₫</Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
            <TextField size="small" type="number" label="Recovery amount" value={draft.amount} onChange={(e) => setRecoveryDrafts({ ...recoveryDrafts, [receivable.id]: { ...draft, amount: e.target.value } })} />
            <TextField size="small" label="Collection reference" value={draft.reference} onChange={(e) => setRecoveryDrafts({ ...recoveryDrafts, [receivable.id]: { ...draft, reference: e.target.value } })} />
            <TextField size="small" label="Note" value={draft.note} onChange={(e) => setRecoveryDrafts({ ...recoveryDrafts, [receivable.id]: { ...draft, note: e.target.value } })} />
            <RecoveryButton requestId={requestId} occurrenceId={occurrenceId} receivableId={receivable.id} draft={draft} run={mutate} />
          </Stack>
          {receivable.recoveries.map((row) => <Typography key={row.id} variant="caption" color="text.secondary">Recovered {formatNumber(row.amount)} ₫ · {row.externalReference} · {row.recordedAt}</Typography>)}
        </Stack></Paper>;
      })}
    </Stack>
  );
}

function CompleteButton({ requestId, occurrenceId, refundId, allocation, reference, run }: { requestId: string; occurrenceId: string; refundId: string; allocation: Allocation; reference: string; run: (action: () => Promise<unknown>) => Promise<void> }) {
  const complete = useCompleteOccurrenceRefund(requestId, occurrenceId, refundId);
  const disabled = fields.some(([key]) => allocation[key] === '') || !reference.trim();
  return <LoadingButton size="small" loading={complete.isPending} disabled={disabled} onClick={() => run(() => complete.mutateAsync({ ...allocationPayload(allocation), externalReference: reference.trim() }))}>Record completed transfer</LoadingButton>;
}

function CancelButton({ requestId, occurrenceId, refundId, reason, run }: { requestId: string; occurrenceId: string; refundId: string; reason: string; run: (action: () => Promise<unknown>) => Promise<void> }) {
  const cancel = useCancelOccurrenceRefund(requestId, occurrenceId, refundId);
  return <LoadingButton size="small" color="error" loading={cancel.isPending} disabled={!reason.trim()} onClick={() => run(() => cancel.mutateAsync({ reason: reason.trim() }))}>Cancel untransferred refund</LoadingButton>;
}

function LegacyButton({ requestId, occurrenceId, refundId, allocation, plan, evidence, run }: { requestId: string; occurrenceId: string; refundId: string; allocation: Allocation; plan: { receivable: string; absorbed: string }; evidence: { reference: string; note: string }; run: (action: () => Promise<unknown>) => Promise<void> }) {
  const reconcile = useReconcileRefundAllocation(requestId, occurrenceId, refundId);
  return <LoadingButton size="small" loading={reconcile.isPending} disabled={fields.some(([key]) => allocation[key] === '') || !plan.receivable || !plan.absorbed || !evidence.reference.trim() || !evidence.note.trim()} onClick={() => run(() => reconcile.mutateAsync({ ...allocationPayload(allocation), inspectorReceivableAmount: amount(plan.receivable), platformAbsorbedPlanAmount: amount(plan.absorbed), reconciliationReference: evidence.reference.trim(), note: evidence.note.trim() }))}>Reconcile legacy allocation</LoadingButton>;
}

function RecoveryButton({ requestId, occurrenceId, receivableId, draft, run }: { requestId: string; occurrenceId: string; receivableId: string; draft: { amount: string; reference: string; note: string }; run: (action: () => Promise<unknown>) => Promise<void> }) {
  const recovery = useRecordReceivableRecovery(requestId, occurrenceId, receivableId);
  return <LoadingButton size="small" loading={recovery.isPending} disabled={!draft.amount || amount(draft.amount) <= 0 || !draft.reference.trim() || !draft.note.trim()} onClick={() => run(() => recovery.mutateAsync({ amount: amount(draft.amount), externalReference: draft.reference.trim(), note: draft.note.trim() }))}>Record recovery</LoadingButton>;
}
