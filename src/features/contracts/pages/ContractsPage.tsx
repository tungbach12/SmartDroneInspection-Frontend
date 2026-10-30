import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useAuthStore } from '@/features/auth/store/authStore';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import { useAssets } from '@/features/assets/hooks/useAssets';
import {
  type AssignOccurrenceInput,
  type CreateServiceRequestInput,
  type IssueServiceQuoteInput,
  type ServiceRequest,
} from '../api/contractApi';
import {
  useAcceptServiceQuote,
  useAssignServiceOccurrence,
  useCreateServiceRequest,
  useDownloadSignedContract,
  useIssueServiceQuote,
  usePartnerDrones,
  usePartnerInspectors,
  usePostRequestMessage,
  useServiceRequest,
  useServiceRequests,
  useUploadSignedContract,
} from '../hooks/useContracts';
import { dateTimeInputToInstant, instantToDateTimeInput } from '../api/scheduleTime';

const plusDays = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

function errorText(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { detail?: unknown; message?: unknown } } }).response;
    const detail = response?.data?.detail ?? response?.data?.message;
    if (typeof detail === 'string') return detail;
  }
  return error instanceof Error ? error.message : 'Unable to complete this action.';
}

export default function ContractsPage() {
  const roles = useAuthStore((state) => state.roles);
  const isCustomer = roles.includes('ORG_MANAGER');
  const isManager = roles.includes('PLATFORM_MANAGER');
  const requests = useServiceRequests();
  const assets = useAssets({ page: 1, pageSize: 100 }, isCustomer);
  const [selectedRequestId, setSelectedRequestId] = useState('');
  const selectedRequest = useServiceRequest(selectedRequestId || undefined);
  const [error, setError] = useState('');
  const refreshSelectedRequest = () => {
    void requests.refetch();
    if (selectedRequestId) void selectedRequest.refetch();
  };

  if (!isCustomer && !isManager) {
    return <Alert severity="error">MF2 is available to Customer and Platform Manager accounts.</Alert>;
  }
  if (requests.isPending) return <CircularProgress aria-label="Loading requests" />;
  if (requests.isError) return <Alert severity="error">{errorText(requests.error)}</Alert>;

  const requestItems = requests.data ?? [];
  const activeRequestId = selectedRequestId || requestItems[0]?.id || '';
  const currentRequest = selectedRequest.data?.id === activeRequestId
    ? selectedRequest.data
    : requestItems.find((item) => item.id === activeRequestId);

  return (
    <Stack spacing={3} sx={{ maxWidth: 1240, mx: 'auto', p: { xs: 2, md: 4 } }}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 750 }}>Inspection service requests</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.75 }}>
          Request, agree commercial terms, upload the signed paper contract, then assign each occurrence.
          Field execution starts later in Inspections.
        </Typography>
      </Box>
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      {isCustomer && assets.isError && <Alert severity="error">{errorText(assets.error)}</Alert>}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: 'flex-start' }}>
        <Card variant="outlined" sx={{ width: { xs: '100%', md: 310 }, flexShrink: 0 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>Requests</Typography>
            {isCustomer && assets.isPending ? <CircularProgress size={22} aria-label="Loading assets" /> : null}
            {isCustomer && !assets.isPending && (assets.data?.items?.length ?? 0) === 0 ? (
              <Typography color="text.secondary">Add an active asset before submitting an inspection request.</Typography>
            ) : null}
            {isCustomer && !assets.isPending && (assets.data?.items?.length ?? 0) > 0 && (
              <CreateRequestForm assets={assets.data?.items ?? []} onCreated={(id) => setSelectedRequestId(id)} onError={setError} />
            )}
            {requestItems.length === 0 ? (
              <Typography color="text.secondary">No requests yet.</Typography>
            ) : (
              <Stack spacing={1} sx={{ mt: 2 }}>
                {requestItems.map((request) => (
                  <Button
                    key={request.id}
                    variant={request.id === activeRequestId ? 'contained' : 'outlined'}
                    onClick={() => setSelectedRequestId(request.id)}
                    sx={{ justifyContent: 'space-between', textTransform: 'none', gap: 1 }}
                  >
                    <Box sx={{ minWidth: 0, textAlign: 'left' }}>
                      <Typography variant="body2" noWrap>{request.description}</Typography>
                      <Typography variant="caption" sx={{ opacity: 0.8 }}>{request.requestedFrom} · {request.status}</Typography>
                    </Box>
                  </Button>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
        <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
          {selectedRequest.isFetching && <CircularProgress size={24} aria-label="Refreshing request" />}
          {currentRequest && (
            <RequestWorkspace
              request={currentRequest}
              customer={isCustomer}
              manager={isManager}
              onChanged={refreshSelectedRequest}
              onError={setError}
            />
          )}
        </Box>
      </Stack>
    </Stack>
  );
}

function CreateRequestForm({
  assets,
  onCreated,
  onError,
}: {
  assets: { id: string; name: string; code: string }[];
  onCreated: (requestId: string) => void;
  onError: (message: string) => void;
}) {
  const create = useCreateServiceRequest();
  const [assetId, setAssetId] = useState('');
  const [description, setDescription] = useState('');
  const [from, setFrom] = useState(plusDays(1));
  const [until, setUntil] = useState(plusDays(14));
  const [requestType, setRequestType] = useState<'ONE_TIME' | 'RECURRING'>('ONE_TIME');
  const [unit, setUnit] = useState('MONTH');
  const [interval, setInterval] = useState('1');
  const [recurrenceLimit, setRecurrenceLimit] = useState<'COUNT' | 'END_DATE'>('COUNT');
  const [count, setCount] = useState('4');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(plusDays(90));
  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', []);

  const submit = async () => {
    if (!assetId || !description.trim()) {
      onError('Select an asset and describe the requested inspection.');
      return;
    }
    if (until < from) {
      onError('The requested end date must be on or after the start date.');
      return;
    }
    const recurrenceInterval = Number(interval);
    const occurrenceCount = Number(count);
    if (
      requestType === 'RECURRING' &&
      (!Number.isInteger(recurrenceInterval) || recurrenceInterval < 1 || recurrenceInterval > 52 ||
        (recurrenceLimit === 'COUNT' && (!Number.isInteger(occurrenceCount) || occurrenceCount < 1 || occurrenceCount > 100)) ||
        (recurrenceLimit === 'END_DATE' && (recurrenceEndDate < from || recurrenceEndDate > until)))
    ) {
      onError('Enter a valid recurrence interval and a count or end date within the requested range.');
      return;
    }
    const input: CreateServiceRequestInput = {
      assetId,
      description: description.trim(),
      requestedFrom: from,
      requestedUntil: until,
      timezone,
      requestType,
      ...(requestType === 'RECURRING'
        ? {
            recurrenceUnit: unit,
            recurrenceInterval,
            ...(recurrenceLimit === 'COUNT'
              ? { occurrenceCount }
              : { recurrenceEndDate }),
          }
        : {}),
    };
    try {
      const request = await create.mutateAsync(input);
      onCreated(request.id);
      setDescription('');
    } catch (error) {
      onError(errorText(error));
    }
  };

  return (
    <Stack spacing={1.25}>
      <FormControl fullWidth size="small">
        <InputLabel id="mf2-asset-label">Asset</InputLabel>
        <Select labelId="mf2-asset-label" label="Asset" value={assetId} onChange={(event) => setAssetId(event.target.value)}>
          {assets.map((asset) => <MenuItem key={asset.id} value={asset.id}>{asset.code} — {asset.name}</MenuItem>)}
        </Select>
      </FormControl>
      <TextField label="Inspection scope" multiline minRows={2} size="small" value={description} onChange={(event) => setDescription(event.target.value)} />
      <TextField label="Desired from" type="date" size="small" value={from} onChange={(event) => setFrom(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
      <TextField label="Desired until" type="date" size="small" value={until} onChange={(event) => setUntil(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
      <Typography variant="caption" color="text.secondary">Daily availability defaults to 08:00–17:00 · {timezone}</Typography>
      <FormControl fullWidth size="small">
        <InputLabel id="mf2-type-label">Request type</InputLabel>
        <Select labelId="mf2-type-label" label="Request type" value={requestType} onChange={(event) => setRequestType(event.target.value as 'ONE_TIME' | 'RECURRING')}>
          <MenuItem value="ONE_TIME">One time</MenuItem>
          <MenuItem value="RECURRING">Recurring</MenuItem>
        </Select>
      </FormControl>
      {requestType === 'RECURRING' && (
        <>
          <FormControl fullWidth size="small">
            <InputLabel id="mf2-unit-label">Cadence</InputLabel>
            <Select labelId="mf2-unit-label" label="Cadence" value={unit} onChange={(event) => setUnit(event.target.value)}>
              <MenuItem value="DAY">Every day</MenuItem><MenuItem value="WEEK">Every week</MenuItem><MenuItem value="MONTH">Every month</MenuItem>
            </Select>
          </FormControl>
          <TextField label="Cadence interval" type="number" size="small" value={interval} onChange={(event) => setInterval(event.target.value)} slotProps={{ htmlInput: { min: 1, max: 52 } }} />
          <FormControl fullWidth size="small">
            <InputLabel id="mf2-recurrence-limit-label">Recurrence bound</InputLabel>
            <Select labelId="mf2-recurrence-limit-label" label="Recurrence bound" value={recurrenceLimit} onChange={(event) => setRecurrenceLimit(event.target.value as 'COUNT' | 'END_DATE')}>
              <MenuItem value="COUNT">Number of occurrences</MenuItem>
              <MenuItem value="END_DATE">End date</MenuItem>
            </Select>
          </FormControl>
          {recurrenceLimit === 'COUNT' ? (
            <TextField label="Number of occurrences" type="number" size="small" value={count} onChange={(event) => setCount(event.target.value)} slotProps={{ htmlInput: { min: 1, max: 100 } }} />
          ) : (
            <TextField label="Recurrence end date" type="date" size="small" value={recurrenceEndDate} onChange={(event) => setRecurrenceEndDate(event.target.value)} slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: from, max: until } }} />
          )}
          <Typography variant="caption" color="text.secondary">Price is quoted per occurrence. The Manager assigns each occurrence separately after the signed contract is uploaded.</Typography>
        </>
      )}
      <LoadingButton loading={create.isPending} variant="contained" onClick={() => void submit()}>Submit request</LoadingButton>
    </Stack>
  );
}

function RequestWorkspace({
  request,
  customer,
  manager,
  onChanged,
  onError,
}: {
  request: ServiceRequest;
  customer: boolean;
  manager: boolean;
  onChanged: () => void;
  onError: (message: string) => void;
}) {
  return (
    <Stack spacing={2}>
      <Card variant="outlined"><CardContent>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, flex: 1 }}>{request.description}</Typography>
          <Chip label={request.status.replaceAll('_', ' ')} color={request.status === 'ASSIGNED' ? 'success' : 'default'} />
          <Chip label={request.requestType === 'ONE_TIME' ? 'One time' : 'Recurring'} variant="outlined" />
        </Stack>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Desired window: {request.requestedFrom} – {request.requestedUntil} · {request.timezone} · {request.windowStart}–{request.windowEnd}
        </Typography>
        {request.requestType === 'RECURRING' && (
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            Cadence: every {request.recurrenceInterval} {request.recurrenceUnit?.toLowerCase()}
            {request.occurrenceCount ? ` · ${request.occurrenceCount} occurrences` : ''}
            {request.recurrenceEndDate ? ` · through ${request.recurrenceEndDate}` : ''}
            {' · quote amount is per occurrence'}
          </Typography>
        )}
      </CardContent></Card>
      <RequestChat request={request} onChanged={onChanged} onError={onError} />
      <QuotePanel request={request} customer={customer} manager={manager} onChanged={onChanged} onError={onError} />
      {(customer || manager) && <SignedContractPanel request={request} manager={manager} onChanged={onChanged} onError={onError} />}
      <OccurrencesPanel request={request} manager={manager} onChanged={onChanged} onError={onError} />
    </Stack>
  );
}

function RequestChat({ request, onChanged, onError }: { request: ServiceRequest; onChanged: () => void; onError: (message: string) => void }) {
  const post = usePostRequestMessage(request.id);
  const [body, setBody] = useState('');
  const send = async () => {
    if (!body.trim()) return;
    try { await post.mutateAsync(body); setBody(''); onChanged(); } catch (error) { onError(errorText(error)); }
  };
  return (
    <Card variant="outlined"><CardContent>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>Request chat</Typography>
      <Stack spacing={1} sx={{ my: 1.5, maxHeight: 240, overflow: 'auto' }}>
        {request.messages.length === 0 ? <Typography color="text.secondary">No messages yet.</Typography> : request.messages.map((message) => (
          <Box key={message.id} sx={{ p: 1.25, bgcolor: 'action.hover', borderRadius: 1.5 }}>
            <Typography variant="caption" color="text.secondary">{message.authorUserId} · {new Date(message.createdAt).toLocaleString()}</Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{message.body}</Typography>
          </Box>
        ))}
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <TextField fullWidth size="small" label="Message" value={body} onChange={(event) => setBody(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send(); } }} />
        <LoadingButton loading={post.isPending} variant="outlined" onClick={() => void send()}>Send</LoadingButton>
      </Stack>
    </CardContent></Card>
  );
}

function QuotePanel({ request, customer, manager, onChanged, onError }: { request: ServiceRequest; customer: boolean; manager: boolean; onChanged: () => void; onError: (message: string) => void }) {
  const latest = request.quotes[0];
  const accept = useAcceptServiceQuote(request.id);
  const issue = useIssueServiceQuote(request.id);
  const inspectors = usePartnerInspectors();
  const drones = usePartnerDrones();
  const [scope, setScope] = useState(request.description);
  const [start, setStart] = useState(`${request.requestedFrom}T08:00`);
  const [end, setEnd] = useState(`${request.requestedFrom}T10:00`);
  const [inspectorId, setInspectorId] = useState('');
  const [droneId, setDroneId] = useState('');
  const [price, setPrice] = useState('100');
  const availableDrones = (drones.data ?? []).filter((drone) => drone.inspectorOwnerId === inspectorId);
  const selectedDroneId = availableDrones.some((drone) => drone.id === droneId) ? droneId : '';

  const issueQuote = async () => {
    if (!scope.trim()) { onError('Enter the quoted inspection scope.'); return; }
    if (!inspectorId || !selectedDroneId) { onError('Select a registered partner Inspector and one of their drones.'); return; }
    const amount = Number(price);
    if (!Number.isFinite(amount) || amount <= 0 || Math.round(amount * 100) !== amount * 100) {
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
      await issue.mutateAsync({
        scopeSnapshot: scope.trim(),
        firstOccurrenceStartAt: startAt,
        firstOccurrenceEndAt: endAt,
        inspectorId,
        droneId: selectedDroneId,
        pricePerOccurrenceUsd: amount,
      } satisfies IssueServiceQuoteInput);
      onChanged();
    } catch (error) {
      onError(errorText(error));
    }
  };

  const acceptLatest = async () => {
    if (!latest) return;
    try { await accept.mutateAsync(latest.versionNo); onChanged(); } catch (error) { onError(errorText(error)); }
  };

  return (
    <Card variant="outlined"><CardContent>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>Quotes</Typography>
      <Stack spacing={1.25} sx={{ my: 1.5 }}>
        {request.quotes.length === 0 ? <Typography color="text.secondary">No quote issued yet.</Typography> : request.quotes.map((quote) => (
          <Box key={quote.id} sx={{ p: 1.5, border: 1, borderColor: quote.versionNo === latest?.versionNo ? 'primary.main' : 'divider', borderRadius: 1.5 }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
              <Typography sx={{ fontWeight: 700 }}>Version {quote.versionNo}{quote.versionNo === latest?.versionNo ? ' · Latest' : ''}</Typography>
              <Chip size="small" label={`$${quote.pricePerOccurrenceUsd.toFixed(2)} USD / occurrence`} />
            </Stack>
            <Typography variant="body2" sx={{ mt: 1 }}>{quote.scopeSnapshot}</Typography>
            <Typography variant="caption" color="text.secondary">First occurrence proposal: {new Date(quote.firstOccurrenceStartAt).toLocaleString()} – {new Date(quote.firstOccurrenceEndAt).toLocaleString()} · Inspector {quote.inspectorId} · Drone {quote.droneId}</Typography>
            {customer && request.status === 'QUOTED' && quote.versionNo === latest?.versionNo && (
              <Box sx={{ mt: 1.5 }}><LoadingButton loading={accept.isPending} variant="contained" onClick={() => void acceptLatest()}>Accept latest quote</LoadingButton></Box>
            )}
          </Box>
        ))}
      </Stack>
      {manager && ['OPEN', 'QUOTED'].includes(request.status) && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Issue quote version</Typography>
          <Stack spacing={1.25} sx={{ mt: 1.25 }}>
            <TextField label="Quoted scope" multiline minRows={2} value={scope} onChange={(event) => setScope(event.target.value)} />
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
              <TextField fullWidth label="First occurrence start" type="datetime-local" value={start} onChange={(event) => setStart(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
              <TextField fullWidth label="First occurrence end" type="datetime-local" value={end} onChange={(event) => setEnd(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            </Stack>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
              <FormControl fullWidth>
                <InputLabel id="partner-inspector-label">Partner Inspector</InputLabel>
                <Select labelId="partner-inspector-label" label="Partner Inspector" value={inspectorId} onChange={(event) => { setInspectorId(event.target.value); setDroneId(''); }}>
                  {(inspectors.data ?? []).map((inspector) => <MenuItem key={inspector.id} value={inspector.id}>{inspector.fullName} · License expires {inspector.licenseExpiresAt ? new Date(inspector.licenseExpiresAt).toLocaleDateString() : 'not recorded'}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl fullWidth disabled={!inspectorId || drones.isPending}>
                <InputLabel id="partner-drone-label">Partner drone</InputLabel>
                <Select labelId="partner-drone-label" label="Partner drone" value={selectedDroneId} onChange={(event) => setDroneId(event.target.value)}>
                  {availableDrones.map((drone) => <MenuItem key={drone.id} value={drone.id}>{drone.serialNumber} · {drone.model}</MenuItem>)}
                </Select>
                {inspectorId && availableDrones.length === 0 && !drones.isPending && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                    No eligible registered drone is listed for this Inspector.
                  </Typography>
                )}
              </FormControl>
            </Stack>
            <TextField label="Price per occurrence (USD)" type="number" value={price} onChange={(event) => setPrice(event.target.value)} slotProps={{ htmlInput: { min: 0.01, step: 0.01 } }} />
            <LoadingButton loading={issue.isPending} variant="contained" onClick={() => void issueQuote()}>Issue new quote version</LoadingButton>
          </Stack>
        </>
      )}
    </CardContent></Card>
  );
}

function SignedContractPanel({ request, manager, onChanged, onError }: { request: ServiceRequest; manager: boolean; onChanged: () => void; onError: (message: string) => void }) {
  const upload = useUploadSignedContract(request.id);
  const download = useDownloadSignedContract();
  const [file, setFile] = useState<File | null>(null);
  const submit = async () => {
    if (!file) { onError('Choose the signed contract scan (PDF, JPEG, or PNG).'); return; }
    if (file.size > 10 * 1024 * 1024) { onError('The signed contract scan must be 10 MB or smaller.'); return; }
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) { onError('Choose a PDF, JPEG, or PNG signed contract scan.'); return; }
    try { await upload.mutateAsync(file); setFile(null); onChanged(); } catch (error) { onError(errorText(error)); }
  };
  const downloadContract = async () => {
    try {
      const blob = await download.mutateAsync(request.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = request.contractFileName || 'signed-contract';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (error) {
      onError(errorText(error));
    }
  };
  return (
    <Card variant="outlined"><CardContent>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>Paper contract evidence</Typography>
      {request.contractFileName ? (
        <Stack spacing={1} sx={{ mt: 1 }}>
          <Alert severity="success">Signed scan recorded: {request.contractFileName} · {request.contractContentType} · {request.contractSizeBytes} bytes</Alert>
          <LoadingButton loading={download.isPending} variant="outlined" onClick={() => void downloadContract()}>Download signed contract</LoadingButton>
        </Stack>
      ) : manager && request.status === 'ACCEPTED' ? (
        <Stack spacing={1.5} sx={{ mt: 1.5 }}>
          <Typography color="text.secondary">Upload the scan after both parties sign the paper contract offline. No online signature or payment is collected here.</Typography>
          <Button component="label" variant="outlined">{file?.name ?? 'Choose signed contract scan'}<input hidden type="file" accept="application/pdf,image/jpeg,image/png" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></Button>
          <LoadingButton loading={upload.isPending} variant="contained" onClick={() => void submit()}>Upload signed scan</LoadingButton>
        </Stack>
      ) : <Typography color="text.secondary" sx={{ mt: 1 }}>Customer acceptance is required before the Manager can upload contract evidence.</Typography>}
    </CardContent></Card>
  );
}

function OccurrencesPanel({ request, manager, onChanged, onError }: { request: ServiceRequest; manager: boolean; onChanged: () => void; onError: (message: string) => void }) {
  return (
    <Card variant="outlined"><CardContent>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>Occurrences and assignment</Typography>
      <Stack spacing={1.5} sx={{ mt: 1.5 }}>
        {request.occurrences.length === 0 ? <Typography color="text.secondary">Occurrences are created after the signed contract is uploaded.</Typography> : request.occurrences.map((occurrence) => (
          <OccurrenceRow key={occurrence.id} request={request} occurrenceId={occurrence.id} occurrenceIndex={occurrence.occurrenceIndex} startAt={occurrence.plannedStartAt} endAt={occurrence.plannedEndAt} status={occurrence.status} inspectorId={occurrence.inspectorId} droneId={occurrence.droneId} inspectionId={occurrence.inspectionId} manager={manager} onChanged={onChanged} onError={onError} />
        ))}
      </Stack>
    </CardContent></Card>
  );
}

function OccurrenceRow({ request, occurrenceId, occurrenceIndex, startAt, endAt, status, inspectorId, droneId, inspectionId, manager, onChanged, onError }: {
  request: ServiceRequest; occurrenceId: string; occurrenceIndex: number; startAt: string; endAt: string; status: string; inspectorId: string | null; droneId: string | null; inspectionId: string | null; manager: boolean; onChanged: () => void; onError: (message: string) => void;
}) {
  const assign = useAssignServiceOccurrence(request.id, occurrenceId);
  const inspectors = usePartnerInspectors();
  const drones = usePartnerDrones();
  const [inspector, setInspector] = useState('');
  const [drone, setDrone] = useState('');
  const [customStart, setCustomStart] = useState<string | null>(null);
  const [customEnd, setCustomEnd] = useState<string | null>(null);
  const start = customStart ?? instantToDateTimeInput(startAt, request.timezone);
  const end = customEnd ?? instantToDateTimeInput(endAt, request.timezone);
  const availableDrones = (drones.data ?? []).filter((item) => item.inspectorOwnerId === inspector);
  const selectedDrone = availableDrones.some((item) => item.id === drone) ? drone : '';

  const submit = async () => {
    if (!inspector || !selectedDrone) { onError('Select an Inspector and one of their registered drones for this occurrence.'); return; }
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
      onError(errorText(error));
    }
  };
  return (
    <Box sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1.5 }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
        <Typography sx={{ fontWeight: 700 }}>Occurrence {occurrenceIndex}</Typography>
        <Chip size="small" label={status.replaceAll('_', ' ')} color={status === 'ASSIGNED' ? 'success' : 'default'} />
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        {new Date(startAt).toLocaleString(undefined, { timeZone: request.timezone })} – {new Date(endAt).toLocaleString(undefined, { timeZone: request.timezone })} · {request.timezone}
      </Typography>
      {status === 'ASSIGNED' ? (
        <Typography variant="caption" sx={{ display: 'block', mt: 0.75 }}>Inspector {inspectorId} · Drone {droneId} · Inspection {inspectionId} · MF2 ends at assignment; field work is in MF3.</Typography>
      ) : manager && request.status === 'CONTRACT_SIGNED' && (
        <Stack spacing={1} sx={{ mt: 1.25 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
            <TextField fullWidth label="Confirmed start" type="datetime-local" value={start} onChange={(event) => setCustomStart(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField fullWidth label="Confirmed end" type="datetime-local" value={end} onChange={(event) => setCustomEnd(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
            <FormControl fullWidth>
              <InputLabel id={`inspector-${occurrenceId}`}>Inspector</InputLabel>
              <Select labelId={`inspector-${occurrenceId}`} label="Inspector" value={inspector} onChange={(event) => { setInspector(event.target.value); setDrone(''); }}>
                {(inspectors.data ?? []).map((item) => <MenuItem key={item.id} value={item.id}>{item.fullName}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth disabled={!inspector || drones.isPending}>
              <InputLabel id={`drone-${occurrenceId}`}>Drone</InputLabel>
              <Select labelId={`drone-${occurrenceId}`} label="Drone" value={selectedDrone} onChange={(event) => setDrone(event.target.value)}>
                {availableDrones.map((item) => <MenuItem key={item.id} value={item.id}>{item.serialNumber} · {item.model}</MenuItem>)}
              </Select>
              {inspector && availableDrones.length === 0 && !drones.isPending && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                  No eligible registered drone is listed for this Inspector.
                </Typography>
              )}
            </FormControl>
          </Stack>
          <LoadingButton loading={assign.isPending} variant="contained" onClick={() => void submit()}>Assign occurrence</LoadingButton>
        </Stack>
      )}
    </Box>
  );
}
