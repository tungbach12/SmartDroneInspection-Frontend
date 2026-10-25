import { useState, type FormEvent } from 'react';
import { Add } from '@mui/icons-material';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getErrorMessage } from '@/shared/api/errorMessage';
import { DataTable, type DataTableColumn } from '@/shared/ui/DataTable';
import { EmptyState } from '@/shared/ui/EmptyState';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryState } from '@/shared/ui/QueryState';
import { StatusChip } from '@/shared/ui/StatusChip';
import type { FlightPermit, FlightPermitStatus } from '../api/permitApi';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import {
  useCreateFlightPermit,
  useFlightPermits,
  useReviewFlightPermit,
} from '../hooks/useFlightPermits';

const PERMIT_STATUSES: FlightPermitStatus[] = [
  'APPLICATION',
  'ACTIVE',
  'EXPIRED',
  'REJECTED',
  'REVOKED',
  'NOT_APPLICABLE',
];

export function FlightPermitPanel() {
  const { t, formatDate: formatDateValue } = useLocale();
  const roles = useAuthStore((state) => state.roles);
  const canManage = roles.includes('ORG_MANAGER');
  const permits = useFlightPermits();
  const createPermit = useCreateFlightPermit();
  const reviewPermit = useReviewFlightPermit();
  const [createOpen, setCreateOpen] = useState(false);
  const [reviewing, setReviewing] = useState<FlightPermit | null>(null);

  const columns: DataTableColumn<FlightPermit>[] = [
    { id: 'type', label: 'Permit type', render: (permit) => permit.permitType },
    { id: 'area', label: 'Area', render: (permit) => permit.areaReference || '—' },
    { id: 'issuer', label: 'Issuing authority (recorded)', render: (permit) => permit.issuingAuthority || '—' },
    { id: 'reference', label: 'Reference', render: (permit) => permit.permitReference || '—' },
    {
      id: 'validity',
      label: 'Validity window',
      render: (permit) => `${formatDate(permit.validFrom, formatDateValue)} – ${formatDate(permit.validUntil, formatDateValue)}`,
    },
    { id: 'status', label: 'Organization-recorded status', render: (permit) => <StatusChip status={permit.status} /> },
    {
      id: 'review',
      label: 'Internal review',
      render: (permit) => canManage ? (
        <Button size="small" onClick={() => setReviewing(permit)}>{t('Review permit')}</Button>
      ) : null,
    },
  ];

  return (
    <Stack spacing={2}>
      <PageHeader
        title={t('Flight permits')}
        subtitle={t('Organization-recorded permit and compliance inputs')}
        actions={canManage ? (
          <Button variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)}>
            {t('Record permit')}
          </Button>
        ) : undefined}
      />
      <Alert severity="info">
        {t('This is the organization-recorded permit status. No authority or registry verification is performed, and the record does not establish permission to fly or operational readiness.')}
      </Alert>
      <QueryState
        isLoading={permits.isLoading}
        error={permits.error}
        onRetry={() => void permits.refetch()}
        loadingLabel={t('Loading permit records…')}
        isEmpty={Boolean(permits.data && permits.data.length === 0)}
        empty={<EmptyState title={t('No permit records yet')} description={t('Record the permit and compliance information held by your organization.')} action={canManage ? <Button variant="contained" onClick={() => setCreateOpen(true)}>{t('Record permit')}</Button> : undefined} />}
      >
        <DataTable
          columns={columns}
          rows={permits.data ?? []}
          rowKey={(permit) => permit.id}
          searchable
          searchPlaceholder={t('Search by type, area or reference…')}
          searchPredicate={(permit, query) => [permit.permitType, permit.areaReference, permit.permitReference].some((value) => value?.toLowerCase().includes(query))}
        />
      </QueryState>
      <CreateFlightPermitDialog
        key={createOpen ? 'open' : 'closed'}
        open={createOpen}
        pending={createPermit.isPending}
        error={createPermit.isError ? getErrorMessage(createPermit.error, 'Could not record this permit.') : null}
        onClose={() => { setCreateOpen(false); createPermit.reset(); }}
        onSubmit={(input) => createPermit.mutate(input, { onSuccess: () => { setCreateOpen(false); createPermit.reset(); } })}
      />
      <ReviewFlightPermitDialog
        key={reviewing?.id ?? 'closed'}
        permit={reviewing}
        pending={reviewPermit.isPending}
        error={reviewPermit.isError ? getErrorMessage(reviewPermit.error, 'Could not update the permit record.') : null}
        onClose={() => { setReviewing(null); reviewPermit.reset(); }}
        onSubmit={(input) => {
          if (!reviewing) return;
          reviewPermit.mutate({ id: reviewing.id, input }, { onSuccess: () => { setReviewing(null); reviewPermit.reset(); } });
        }}
      />
    </Stack>
  );
}

function CreateFlightPermitDialog({
  open,
  pending,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (input: {
    permitType: string;
    areaReference?: string;
    issuingAuthority?: string;
    permitReference?: string;
    geographicScope?: string;
    validFrom?: string;
    validUntil?: string;
    conditions?: string;
    status?: FlightPermitStatus;
    assetId?: string;
    sourceEvidenceId?: string;
  }) => void;
}) {
  const { t } = useLocale();
  const [permitType, setPermitType] = useState('');
  const [areaReference, setAreaReference] = useState('');
  const [issuingAuthority, setIssuingAuthority] = useState('');
  const [permitReference, setPermitReference] = useState('');
  const [geographicScope, setGeographicScope] = useState('');
  const [conditions, setConditions] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [status, setStatus] = useState<FlightPermitStatus>('APPLICATION');
  const [assetId, setAssetId] = useState('');
  const [sourceEvidenceId, setSourceEvidenceId] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const scope = parseJson(geographicScope);
    const conditionData = parseJson(conditions);
    const nextJsonError = scope.error ?? conditionData.error;
    setJsonError(nextJsonError ?? null);
    const fromDate = validFrom ? new Date(validFrom) : null;
    const untilDate = validUntil ? new Date(validUntil) : null;
    const nextDateError =
      (fromDate && !Number.isFinite(fromDate.getTime())) ||
      (untilDate && !Number.isFinite(untilDate.getTime()))
        ? 'Enter valid dates for the permit period.'
        : fromDate && untilDate && untilDate <= fromDate
          ? 'Valid until must be after valid from.'
          : null;
    setDateError(nextDateError);
    if (nextJsonError || nextDateError) return;

    onSubmit({
      permitType: permitType.trim(),
      ...(areaReference.trim() ? { areaReference: areaReference.trim() } : {}),
      ...(issuingAuthority.trim() ? { issuingAuthority: issuingAuthority.trim() } : {}),
      ...(permitReference.trim() ? { permitReference: permitReference.trim() } : {}),
      ...(scope.value ? { geographicScope: scope.value } : {}),
      ...(conditions.trim() ? { conditions: conditions.trim() } : {}),
      ...(validFrom ? { validFrom: new Date(validFrom).toISOString() } : {}),
      ...(validUntil ? { validUntil: new Date(validUntil).toISOString() } : {}),
      status,
      ...(assetId.trim() ? { assetId: assetId.trim() } : {}),
      ...(sourceEvidenceId.trim() ? { sourceEvidenceId: sourceEvidenceId.trim() } : {}),
    });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <form onSubmit={submit}>
        <DialogTitle>{t('Record organization permit')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <Alert severity="info">{t('Record only information held by your organization. This does not verify a permit with an authority.')}</Alert>
            <TextField required label={t('Permit type')} value={permitType} onChange={(event) => setPermitType(event.target.value)} />
            <TextField label={t('Area reference')} value={areaReference} onChange={(event) => setAreaReference(event.target.value)} />
            <TextField label={t('Issuing authority (as recorded)')} value={issuingAuthority} onChange={(event) => setIssuingAuthority(event.target.value)} />
            <TextField label={t('Permit reference')} value={permitReference} onChange={(event) => setPermitReference(event.target.value)} />
            <TextField label={t('Geographic scope JSON')} value={geographicScope} onChange={(event) => { setGeographicScope(event.target.value); setJsonError(null); }} multiline minRows={2} helperText={t('Optional JSON value as recorded by your organization.')} />
            <TextField label={t('Conditions JSON')} value={conditions} onChange={(event) => { setConditions(event.target.value); setJsonError(null); }} multiline minRows={2} helperText={t('Optional JSON value as recorded by your organization.')} />
            {jsonError && <Alert severity="error">{jsonError}</Alert>}
            <TextField type="datetime-local" label={t('Valid from')} value={validFrom} onChange={(event) => { setValidFrom(event.target.value); setDateError(null); }} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField type="datetime-local" label={t('Valid until')} value={validUntil} onChange={(event) => { setValidUntil(event.target.value); setDateError(null); }} slotProps={{ inputLabel: { shrink: true } }} />
            {dateError && <Alert severity="error">{dateError}</Alert>}
            <TextField select label={t('Organization-recorded status')} value={status} onChange={(event) => setStatus(event.target.value as FlightPermitStatus)}>
              {PERMIT_STATUSES.map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
            </TextField>
            <TextField label={t('Related asset ID (optional)')} value={assetId} onChange={(event) => setAssetId(event.target.value)} />
            <TextField label={t('Source evidence ID (optional)')} value={sourceEvidenceId} onChange={(event) => setSourceEvidenceId(event.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="contained" disabled={pending}>{t('Record permit')}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

function ReviewFlightPermitDialog({
  permit,
  pending,
  error,
  onClose,
  onSubmit,
}: {
  permit: FlightPermit | null;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (input: { status: FlightPermitStatus; reason: string }) => void;
}) {
  const { t } = useLocale();
  const [status, setStatus] = useState<FlightPermitStatus>(permit?.status ?? 'APPLICATION');
  const [reason, setReason] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!reason.trim()) return;
    onSubmit({ status, reason: reason.trim() });
  };

  return (
    <Dialog open={Boolean(permit)} onClose={onClose} fullWidth maxWidth="sm">
      <form onSubmit={submit}>
        <DialogTitle>{t('Internal permit record review')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <Alert severity="info">{t('This records your organization’s internal review only; it is not external verification or flight clearance.')}</Alert>
            <Typography variant="body2">{permit?.permitType} · {permit?.permitReference || 'No reference recorded'}</Typography>
            <TextField select label={t('Organization-recorded status')} value={status} onChange={(event) => setStatus(event.target.value as FlightPermitStatus)}>
              {PERMIT_STATUSES.map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
            </TextField>
            <TextField required label={t('Reason')} value={reason} onChange={(event) => setReason(event.target.value)} multiline minRows={3} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="contained" disabled={pending || !reason.trim()}>{t('Save internal review')}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

function parseJson(value: string): { value?: string; error?: string } {
  if (!value.trim()) return {};
  try {
    JSON.parse(value);
    return { value };
  } catch {
    return { error: 'Enter valid JSON for geographic scope and conditions.' };
  }
}

function formatDate(
  value: string | null,
  format: (input: Date | string | number, options?: Intl.DateTimeFormatOptions) => string,
) {
  return value ? format(new Date(value)) : '—';
}
