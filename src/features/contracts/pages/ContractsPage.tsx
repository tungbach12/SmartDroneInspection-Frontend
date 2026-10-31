import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import { useAuthStore } from '@/features/auth/store/authStore';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import { useAssets } from '@/features/assets/hooks/useAssets';
import {
  type CreateServiceRequestInput,
} from '../api/contractApi';
import {
  useCreateServiceRequest,
  useServiceRequest,
  useServiceRequests,
} from '../hooks/useContracts';
import { ContractLifecycleStepper } from '../components/ContractLifecycleStepper';
import { RequestChatPanel } from '../components/RequestChatPanel';
import { RequestQuotePanel } from '../components/RequestQuotePanel';
import { SignedContractPanel } from '../components/SignedContractPanel';
import { OccurrencesPanel } from '../components/OccurrencesPanel';

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
  const isCustomer = roles.includes('CUSTOMER');
  const isManager = roles.includes('MANAGER');
  const requests = useServiceRequests();
  const assets = useAssets({ page: 1, pageSize: 100 }, isCustomer);

  const [selectedRequestId, setSelectedRequestId] = useState('');
  const selectedRequest = useServiceRequest(selectedRequestId || undefined);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

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
  const currentRequest =
    selectedRequest.data?.id === activeRequestId
      ? selectedRequest.data
      : requestItems.find((item) => item.id === activeRequestId);

  const filteredRequests = requestItems.filter((req) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      req.description.toLowerCase().includes(term) ||
      req.status.toLowerCase().includes(term) ||
      req.requestType.toLowerCase().includes(term)
    );
  });

  return (
    <Stack spacing={3} sx={{ maxWidth: 1400, mx: 'auto', p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary' }}>
          Inspection service requests
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: '0.95rem' }}>
          Đàm phán yêu cầu dịch vụ, thỏa thuận điều khoản thương mại, lưu trữ bản scan hợp đồng và phân công lịch bay.
        </Typography>
      </Box>

      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      {isCustomer && assets.isError && <Alert severity="error">{errorText(assets.error)}</Alert>}

      {/* Main 2-Column Split */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5} sx={{ alignItems: 'flex-start' }}>
        {/* Left Sidebar (Requests List & Create Form) */}
        <Card
          variant="outlined"
          sx={{
            width: { xs: '100%', md: 330 },
            flexShrink: 0,
            borderRadius: 3,
            borderColor: 'divider',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <CardContent sx={{ p: 2 }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Requests
              </Typography>
              <Chip
                label={`${requestItems.length} yêu cầu`}
                size="small"
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
            </Stack>

            {/* Create Request Form for Customer */}
            {isCustomer && assets.isPending ? <CircularProgress size={22} aria-label="Loading assets" /> : null}
            {isCustomer && !assets.isPending && (assets.data?.items?.length ?? 0) === 0 ? (
              <Typography color="text.secondary" variant="body2" sx={{ mb: 1.5 }}>
                Add an active asset before submitting an inspection request.
              </Typography>
            ) : null}
            {isCustomer && !assets.isPending && (assets.data?.items?.length ?? 0) > 0 && (
              <Paper
                variant="outlined"
                sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: 'action.hover', borderColor: 'divider' }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.25, color: 'primary.main' }}>
                  Tạo yêu cầu kiểm định mới
                </Typography>
                <CreateRequestForm
                  assets={assets.data?.items ?? []}
                  onCreated={(id) => setSelectedRequestId(id)}
                  onError={setError}
                />
              </Paper>
            )}

            {/* Search Box */}
            <TextField
              size="small"
              fullWidth
              placeholder="Tìm kiếm yêu cầu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRoundedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                  sx: { borderRadius: 2, fontSize: '0.875rem' },
                },
              }}
              sx={{ mb: 1.5 }}
            />

            {/* Request List */}
            {filteredRequests.length === 0 ? (
              <Typography color="text.secondary" variant="body2" sx={{ py: 3, textAlign: 'center' }}>
                {search ? 'Không tìm thấy yêu cầu phù hợp.' : 'No requests yet.'}
              </Typography>
            ) : (
              <Stack spacing={1.25} sx={{ maxHeight: 600, overflowY: 'auto', pr: 0.5 }}>
                {filteredRequests.map((request) => {
                  const isSelected = request.id === activeRequestId;
                  const isAssigned = request.status === 'ASSIGNED';

                  return (
                    <Paper
                      key={request.id}
                      variant="outlined"
                      onClick={() => setSelectedRequestId(request.id)}
                      sx={{
                        p: 1.5,
                        cursor: 'pointer',
                        borderRadius: 2,
                        transition: 'all 0.15s ease',
                        border: '1.5px solid',
                        borderColor: isSelected ? 'primary.main' : 'divider',
                        bgcolor: isSelected ? 'primary.50' : 'background.paper',
                        '&:hover': {
                          bgcolor: isSelected ? 'primary.50' : 'action.hover',
                          borderColor: isSelected ? 'primary.main' : 'primary.light',
                        },
                      }}
                    >
                      <Stack spacing={0.75}>
                        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: isSelected ? 750 : 600,
                              color: isSelected ? 'primary.dark' : 'text.primary',
                              lineHeight: 1.3,
                            }}
                          >
                            {request.description}
                          </Typography>
                          <Chip
                            label={request.status.replaceAll('_', ' ')}
                            size="small"
                            color={isAssigned ? 'success' : isSelected ? 'primary' : 'default'}
                            variant={isSelected ? 'filled' : 'outlined'}
                            sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700, flexShrink: 0 }}
                          />
                        </Stack>

                        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="caption" color="text.secondary">
                            {request.requestedFrom} – {request.requestedUntil}
                          </Typography>
                          <Chip
                            label={request.requestType === 'ONE_TIME' ? 'Một lần' : 'Định kỳ'}
                            size="small"
                            variant="outlined"
                            sx={{ height: 18, fontSize: '0.65rem' }}
                          />
                        </Stack>
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>
            )}
          </CardContent>
        </Card>

        {/* Right Workspace (Detailed View) */}
        <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
          {selectedRequest.isFetching && (
            <CircularProgress size={24} aria-label="Refreshing request" sx={{ mb: 1 }} />
          )}

          {currentRequest ? (
            <Stack spacing={2.5}>
              {/* Request Summary Overview Card */}
              <Card
                variant="outlined"
                sx={{ borderRadius: 3, borderColor: 'divider', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
              >
                <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                  <Stack spacing={1.5}>
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1.5}
                      sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, flexWrap: 'wrap' }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary' }}>
                          {currentRequest.description}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                          Desired window: {currentRequest.requestedFrom} – {currentRequest.requestedUntil} ·{' '}
                          {currentRequest.timezone} · {currentRequest.windowStart}–{currentRequest.windowEnd}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Chip
                          label={currentRequest.status.replaceAll('_', ' ')}
                          color={currentRequest.status === 'ASSIGNED' ? 'success' : 'default'}
                          sx={{ fontWeight: 700 }}
                        />
                        <Chip
                          label={currentRequest.requestType === 'ONE_TIME' ? 'One time' : 'Recurring'}
                          variant="outlined"
                        />
                      </Stack>
                    </Stack>

                    {currentRequest.requestType === 'RECURRING' && (
                      <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
                        Cadence: every {currentRequest.recurrenceInterval} {currentRequest.recurrenceUnit?.toLowerCase()}
                        {currentRequest.occurrenceCount ? ` · ${currentRequest.occurrenceCount} occurrences` : ''}
                        {currentRequest.recurrenceEndDate ? ` · through ${currentRequest.recurrenceEndDate}` : ''}
                        {' · quote amount is per occurrence'}
                      </Typography>
                    )}
                  </Stack>
                </CardContent>
              </Card>

              {/* Lifecycle Progress Stepper */}
              <ContractLifecycleStepper status={currentRequest.status} />

              {/* Chat Panel */}
              <RequestChatPanel
                request={currentRequest}
                onChanged={refreshSelectedRequest}
                onError={setError}
              />

              {/* Quotes Panel */}
              <RequestQuotePanel
                request={currentRequest}
                customer={isCustomer}
                manager={isManager}
                onChanged={refreshSelectedRequest}
                onError={setError}
              />

              {/* Signed Contract Panel */}
              {(isCustomer || isManager) && (
                <SignedContractPanel
                  request={currentRequest}
                  manager={isManager}
                  onChanged={refreshSelectedRequest}
                  onError={setError}
                />
              )}

              {/* Occurrences Panel */}
              <OccurrencesPanel
                request={currentRequest}
                manager={isManager}
                onChanged={refreshSelectedRequest}
                onError={setError}
              />
            </Stack>
          ) : (
            <Paper
              variant="outlined"
              sx={{
                p: 6,
                textAlign: 'center',
                borderRadius: 3,
                borderColor: 'divider',
                color: 'text.secondary',
              }}
            >
              <DescriptionOutlinedIcon sx={{ fontSize: 56, opacity: 0.3, mb: 1.5 }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Chọn một yêu cầu dịch vụ từ danh sách bên trái
              </Typography>
              <Typography variant="body2" sx={{ maxWidth: 420, mx: 'auto', mt: 0.5 }}>
                Xem chi tiết các điều khoản thương mại, trao đổi đàm phán với đối tác, tải hợp đồng scan và phân công các đợt bay kiểm định.
              </Typography>
            </Paper>
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
  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Ho_Chi_Minh', []);

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
      (!Number.isInteger(recurrenceInterval) ||
        recurrenceInterval < 1 ||
        recurrenceInterval > 52 ||
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
            ...(recurrenceLimit === 'COUNT' ? { occurrenceCount } : { recurrenceEndDate }),
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
        <Select
          labelId="mf2-asset-label"
          label="Asset"
          value={assetId}
          onChange={(event) => setAssetId(event.target.value)}
        >
          {assets.map((asset) => (
            <MenuItem key={asset.id} value={asset.id}>
              {asset.code} — {asset.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <TextField
        label="Inspection scope"
        multiline
        minRows={2}
        size="small"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
      />
      <TextField
        label="Desired from"
        type="date"
        size="small"
        value={from}
        onChange={(event) => setFrom(event.target.value)}
        slotProps={{ inputLabel: { shrink: true } }}
      />
      <TextField
        label="Desired until"
        type="date"
        size="small"
        value={until}
        onChange={(event) => setUntil(event.target.value)}
        slotProps={{ inputLabel: { shrink: true } }}
      />
      <FormControl fullWidth size="small">
        <InputLabel id="mf2-type-label">Request type</InputLabel>
        <Select
          labelId="mf2-type-label"
          label="Request type"
          value={requestType}
          onChange={(event) => setRequestType(event.target.value as 'ONE_TIME' | 'RECURRING')}
        >
          <MenuItem value="ONE_TIME">One time</MenuItem>
          <MenuItem value="RECURRING">Recurring</MenuItem>
        </Select>
      </FormControl>
      {requestType === 'RECURRING' && (
        <>
          <FormControl fullWidth size="small">
            <InputLabel id="mf2-unit-label">Cadence</InputLabel>
            <Select
              labelId="mf2-unit-label"
              label="Cadence"
              value={unit}
              onChange={(event) => setUnit(event.target.value)}
            >
              <MenuItem value="DAY">Every day</MenuItem>
              <MenuItem value="WEEK">Every week</MenuItem>
              <MenuItem value="MONTH">Every month</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Cadence interval"
            type="number"
            size="small"
            value={interval}
            onChange={(event) => setInterval(event.target.value)}
            slotProps={{ htmlInput: { min: 1, max: 52 } }}
          />
          <FormControl fullWidth size="small">
            <InputLabel id="mf2-recurrence-limit-label">Recurrence bound</InputLabel>
            <Select
              labelId="mf2-recurrence-limit-label"
              label="Recurrence bound"
              value={recurrenceLimit}
              onChange={(event) => setRecurrenceLimit(event.target.value as 'COUNT' | 'END_DATE')}
            >
              <MenuItem value="COUNT">Number of occurrences</MenuItem>
              <MenuItem value="END_DATE">End date</MenuItem>
            </Select>
          </FormControl>
          {recurrenceLimit === 'COUNT' ? (
            <TextField
              label="Number of occurrences"
              type="number"
              size="small"
              value={count}
              onChange={(event) => setCount(event.target.value)}
              slotProps={{ htmlInput: { min: 1, max: 100 } }}
            />
          ) : (
            <TextField
              label="Recurrence end date"
              type="date"
              size="small"
              value={recurrenceEndDate}
              onChange={(event) => setRecurrenceEndDate(event.target.value)}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: from, max: until } }}
            />
          )}
        </>
      )}
      <LoadingButton loading={create.isPending} variant="contained" onClick={() => void submit()}>
        Submit request
      </LoadingButton>
    </Stack>
  );
}
