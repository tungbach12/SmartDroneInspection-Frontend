import { useCallback, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import FilterListRounded from '@mui/icons-material/FilterListRounded';
import { PageBreadcrumbs } from '@/shared/ui/PageBreadcrumbs';
import { PageHeader } from '@/shared/ui/PageHeader';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import HandshakeOutlinedIcon from '@mui/icons-material/HandshakeOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useAssets } from '@/features/assets/hooks/useAssets';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { type ServiceRequest } from '../api/contractApi';
import { useServiceRequest, useServiceRequests } from '../hooks/useContracts';
import { ContractLifecycleStepper } from '../components/ContractLifecycleStepper';
import { StatusChip } from '@/shared/ui/StatusChip';
import { RequestQuotePanel } from '../components/RequestQuotePanel';
import { SignedContractPanel } from '../components/SignedContractPanel';
import { OccurrencesPanel } from '../components/OccurrencesPanel';
import { CreateRequestDialog } from '../components/CreateRequestDialog';
import { useNavigate, useSearchParams } from 'react-router-dom';

function errorText(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { detail?: unknown; message?: unknown } } }).response;
    const detail = response?.data?.detail ?? response?.data?.message;
    if (typeof detail === 'string') return detail;
  }
  return error instanceof Error ? error.message : 'Unable to complete this action.';
}

function getEffectiveRequestStatus(request: ServiceRequest): ServiceRequest['status'] {
  if (
    request.status === 'OPEN' &&
    request.occurrences.some(
      (o) => o.status === 'ASSIGNED' || (o.status as string) === 'COMPLETED',
    )
  ) {
    return 'ASSIGNED';
  }
  return request.status;
}

function statusTone(status: ServiceRequest['status']): 'success' | 'warning' | 'error' | 'info' | 'default' {
  switch (status) {
    case 'QUOTED':
      return 'warning';
    case 'ACCEPTED':
    case 'CONTRACT_SIGNED':
      return 'info';
    case 'ASSIGNED':
      return 'success';
    case 'CANCELLED':
      return 'error';
    default:
      return 'default';
  }
}

function getStatusLabel(status: ServiceRequest['status'], t: (key: string) => string): string {
  switch (status) {
    case 'OPEN':
      return t('Open');
    case 'QUOTED':
      return t('Quoted');
    case 'ACCEPTED':
      return t('Accepted');
    case 'CONTRACT_SIGNED':
      return t('Contract Signed');
    case 'ASSIGNED':
      return t('Assigned');
    case 'CANCELLED':
      return t('Cancelled');
    default:
      return '';
  }
}

function getRequestStageSubtitle(
  status: ServiceRequest['status'],
  role: 'CUSTOMER' | 'MANAGER',
  t: (key: string) => string,
): string {
  switch (status) {
    case 'OPEN':
      return `${t('Step')} 1/5 · ${t(role === 'MANAGER' ? 'Request review' : 'Request submitted')}`;
    case 'QUOTED':
      return `${t('Step')} 3/5 · ${t('Quote review')}`;
    case 'ACCEPTED':
    case 'CONTRACT_SIGNED':
      return `${t('Step')} 4/5 · ${t('Signed agreement')}`;
    case 'ASSIGNED':
      return `${t('Step')} 5/5 · ${t('Scheduled')}`;
    case 'CANCELLED':
      return '';
    default:
      return '';
  }
}

function formatRecurrenceUnit(unit: string | null | undefined, locale: string): string {
  if (!unit) return '';
  const u = unit.toLowerCase();
  if (locale === 'vi') {
    if (u === 'month') return 'tháng';
    if (u === 'week') return 'tuần';
    if (u === 'day') return 'ngày';
    if (u === 'year') return 'năm';
  }
  return u;
}

function formatFlightTime(timeStr?: string | null): string {
  if (!timeStr) return '';
  return timeStr.slice(0, 5);
}

function formatFlightWindow(start?: string | null, end?: string | null, t?: (key: string) => string): string {
  const s = formatFlightTime(start) || '08:00';
  const e = formatFlightTime(end) || '17:00';
  const prefix = t ? t('Flight window') : 'Khung giờ bay';
  return `${prefix}: ${s} – ${e}`;
}

export default function ContractsPage() {
  const { locale, t } = useLocale();
  const navigate = useNavigate();
  const roles = useAuthStore((state) => state.roles);
  const isCustomer = roles.includes('CUSTOMER');
  const isManager = roles.includes('MANAGER');

  const requests = useServiceRequests();
  const assets = useAssets({ page: 1, pageSize: 100 }, isCustomer);

  const [searchParams, setSearchParams] = useSearchParams();
  const selectedRequestId = searchParams.get('requestId') ?? '';
  const selectedRequest = useServiceRequest(selectedRequestId || undefined);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [pairSelectionRequestId, setPairSelectionRequestId] = useState('');

  const selectRequest = useCallback(
    (requestId: string) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (requestId) {
            next.set('requestId', requestId);
          } else {
            next.delete('requestId');
            next.delete('step');
            next.delete('occurrenceId');
            next.delete('inspectorId');
            next.delete('droneId');
          }
          return next;
        },
        { replace: false },
      );
    },
    [setSearchParams],
  );

  const refreshSelectedRequest = () => {
    void requests.refetch();
    if (selectedRequestId) void selectedRequest.refetch();
  };

  if (!isCustomer && !isManager) {
    return (
      <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
        <Alert severity="error">MF2 is available to Customer and Platform Manager accounts.</Alert>
      </Box>
    );
  }

  if (requests.isPending) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 320 }}>
        <CircularProgress aria-label="Loading requests" />
      </Box>
    );
  }

  if (requests.isError) {
    return (
      <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
        <Alert severity="error">{errorText(requests.error)}</Alert>
      </Box>
    );
  }

  const requestItems = requests.data ?? [];
  const currentRequest =
    selectedRequest.data || requestItems.find((item) => item.id === selectedRequestId);

  // Filter requests
  const filteredRequests = requestItems.filter((req) => {
    const effectiveStatus = getEffectiveRequestStatus(req);
    const matchesSearch =
      !search.trim() ||
      req.description.toLowerCase().includes(search.toLowerCase()) ||
      effectiveStatus.toLowerCase().includes(search.toLowerCase()) ||
      req.requestType.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' || effectiveStatus === statusFilter || req.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Summary Metrics
  const openNegotiatingCount = requestItems.filter((r) => {
    const effectiveStatus = getEffectiveRequestStatus(r);
    return effectiveStatus === 'OPEN' || effectiveStatus === 'QUOTED';
  }).length;
  const signedAssignedCount = requestItems.filter((r) => {
    const effectiveStatus = getEffectiveRequestStatus(r);
    return effectiveStatus === 'CONTRACT_SIGNED' || effectiveStatus === 'ASSIGNED';
  }).length;

  const currentEffectiveStatus = currentRequest
    ? getEffectiveRequestStatus(currentRequest)
    : 'OPEN';
  const quotePairSelectionOpen = searchParams.get('step') === 'quote-pair';
  const hasConfirmedQuotePair = pairSelectionRequestId === selectedRequestId;

  return (
    <Box sx={{ maxWidth: 1440, mx: 'auto', p: { xs: 2, md: 3.5 }, pb: { xs: 11, md: 12 } }}>
      {/* Top Banner Errors */}
      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2.5, borderRadius: '8px' }}>
          {error}
        </Alert>
      )}

      {/* VIEW 1: REQUEST DETAIL WORKSPACE (When a request is selected) */}
      {selectedRequestId && currentRequest ? (
        <Stack spacing={3}>
          {/* Breadcrumb & Sync bar */}
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            <PageBreadcrumbs
              items={[
                { label: t('Service requests'), onClick: () => selectRequest('') },
                { label: currentRequest.description },
              ]}
            />
            {selectedRequest.isFetching && (
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <CircularProgress size={16} />
                <Typography variant="caption" color="text.secondary">{t('Syncing...')}</Typography>
              </Stack>
            )}
          </Stack>

          {/* Request Header Card */}
          <Card
            variant="outlined"
            sx={{
              borderRadius: '10px',
              borderColor: 'divider',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
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
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {t('Requested window')}:{' '}
                      <strong>
                        {currentRequest.requestType === 'ONE_TIME'
                          ? currentRequest.requestedFrom
                          : `${currentRequest.requestedFrom} – ${currentRequest.requestedUntil}`}
                      </strong>{' '}
                      · {formatFlightWindow(currentRequest.windowStart, currentRequest.windowEnd, t)}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Chip
                      label={getStatusLabel(currentEffectiveStatus, t)}
                      color={statusTone(currentEffectiveStatus)}
                      sx={{ fontWeight: 700, px: 0.5 }}
                    />
                    <Chip
                      label={currentRequest.requestType === 'ONE_TIME' ? t('One-time') : t('Recurring')}
                      variant="outlined"
                      sx={{ fontWeight: 600 }}
                    />
                  </Stack>
                </Stack>

                {currentRequest.requestType === 'RECURRING' && (
                  <Typography variant="body2" sx={{ color: 'text.secondary', bgcolor: 'action.hover', p: 1, borderRadius: '8px' }}>
                    {locale === 'vi' ? (
                      <>
                        Chu kỳ: mỗi {currentRequest.recurrenceInterval} {formatRecurrenceUnit(currentRequest.recurrenceUnit, locale)}
                        {currentRequest.occurrenceCount ? ` · ${currentRequest.occurrenceCount} đợt bay` : ''}
                        {currentRequest.recurrenceEndDate ? ` · đến hết ngày ${currentRequest.recurrenceEndDate}` : ''}
                        {' · Giá báo là đơn giá cho từng đợt bay'}
                      </>
                    ) : (
                      <>
                        Recurrence: every {currentRequest.recurrenceInterval} {currentRequest.recurrenceUnit?.toLowerCase()}
                        {currentRequest.occurrenceCount ? ` · ${currentRequest.occurrenceCount} flight occurrence(s)` : ''}
                        {currentRequest.recurrenceEndDate ? ` · until ${currentRequest.recurrenceEndDate}` : ''}
                        {' · Quoted price is per occurrence'}
                      </>
                    )}
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </Card>

          {/* Role-specific MF2 lifecycle progress */}
          <ContractLifecycleStepper
            status={currentEffectiveStatus}
            role={isCustomer ? 'CUSTOMER' : 'MANAGER'}
            selectionOpen={quotePairSelectionOpen}
            hasSelectedPair={hasConfirmedQuotePair}
          />

          {/* Hoạt động 1: Báo giá & Phê duyệt */}
          <RequestQuotePanel
            key={`${currentRequest.id}-${currentRequest.currentQuote?.id ?? 'none'}-${currentRequest.currentQuote?.rowVersion ?? 0}`}
            request={currentRequest}
            customer={isCustomer}
            manager={isManager}
            onChanged={refreshSelectedRequest}
            onError={setError}
            onOpenInbox={(requestId) => navigate(`${isCustomer ? '/client' : '/manager'}/messages?requestId=${requestId}`)}
            onPairSelectionChange={(confirmed) =>
              setPairSelectionRequestId(confirmed ? selectedRequestId : '')
            }
          />

          {/* Hoạt động 2: Ký hợp đồng giấy & Upload bằng chứng */}
          {(isCustomer || isManager) && (
            <SignedContractPanel
              request={currentRequest}
              manager={isManager}
              onChanged={refreshSelectedRequest}
              onError={setError}
            />
          )}

          {/* Hoạt động 3: Đợt bay & Phân công phi công/drone */}
          <OccurrencesPanel
            request={currentRequest}
            manager={isManager}
            onChanged={refreshSelectedRequest}
            onError={setError}
          />
        </Stack>
      ) : (
        /* VIEW 2: MASTER TABLE VIEW (Giống màn hình Organization inspections) */
        <Stack spacing={3}>
          <PageHeader
            title={t('Inspection service requests')}
            breadcrumbs={[
              { label: t('Operations'), to: isCustomer ? '/client/dashboard' : '/manager/dashboard' },
              { label: t('Service requests') },
            ]}
          />

          {/* Summary Metric Cards (Phong cách giống ảnh Organization inspections) */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Paper
              variant="outlined"
              sx={{
                flex: 1,
                p: 2,
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                bgcolor: 'background.paper',
              }}
            >
              <Box
                sx={{
                  p: 1.25,
                  borderRadius: '8px',
                  bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(237, 108, 2, 0.15)' : '#fff8e1'),
                  color: 'warning.main',
                  display: 'flex',
                }}
              >
                <AssignmentOutlinedIcon />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  {t('Open & negotiating requests')}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  {openNegotiatingCount}
                </Typography>
              </Box>
            </Paper>

            <Paper
              variant="outlined"
              sx={{
                flex: 1,
                p: 2,
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                bgcolor: 'background.paper',
              }}
            >
              <Box
                sx={{
                  p: 1.25,
                  borderRadius: '8px',
                  bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(46, 125, 50, 0.15)' : '#e8f5e9'),
                  color: 'success.main',
                  display: 'flex',
                }}
              >
                <HandshakeOutlinedIcon />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  {t('Signed contracts & dispatched')}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  {signedAssignedCount}
                </Typography>
              </Box>
            </Paper>
          </Stack>

          {/* Main DataTable (NextAdmin card) */}
          <Paper
            variant="outlined"
            sx={{
              borderRadius: '12px',
              borderColor: 'divider',
              overflow: 'hidden',
              bgcolor: 'background.paper',
              boxShadow: 'none',
            }}
          >
            {/* Card Toolbar */}
            <Box
              sx={{
                p: 2,
                px: 2.5,
                borderBottom: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 1.5,
              }}
            >
              <TextField
                size="small"
                placeholder={t('Search by id, name, or description…')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchRoundedIcon fontSize="small" sx={{ color: '#71717A' }} />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{
                  width: { xs: '100%', sm: 280, md: 320 },
                  '& .MuiOutlinedInput-root': {
                    height: 40,
                    borderRadius: '8px',
                    bgcolor: 'background.paper',
                    fontSize: '0.875rem',
                  },
                }}
              />

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
                <TextField
                  select
                  size="small"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <FilterListRounded fontSize="small" sx={{ color: '#71717A' }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{
                    minWidth: 160,
                    '& .MuiOutlinedInput-root': {
                      height: 40,
                      borderRadius: '8px',
                      bgcolor: 'background.paper',
                      fontSize: '0.875rem',
                    },
                  }}
                >
                  <MenuItem value="ALL">{t('All statuses')}</MenuItem>
                  <MenuItem value="OPEN">{t('Open')}</MenuItem>
                  <MenuItem value="QUOTED">{t('Quoted')}</MenuItem>
                  <MenuItem value="ACCEPTED">{t('Accepted')}</MenuItem>
                  <MenuItem value="CONTRACT_SIGNED">{t('Contract Signed')}</MenuItem>
                  <MenuItem value="ASSIGNED">{t('Assigned')}</MenuItem>
                </TextField>

                {isCustomer && (
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setCreateDialogOpen(true)}
                    sx={{
                      borderRadius: '8px',
                      px: 2,
                      py: 1,
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      textTransform: 'none',
                      boxShadow: 'none',
                    }}
                  >
                    {t('New service request')}
                  </Button>
                )}
              </Box>
            </Box>

            {filteredRequests.length === 0 ? (
              <Box sx={{ p: 6, textAlign: 'center', color: 'text.secondary' }}>
                <DescriptionOutlinedIcon sx={{ fontSize: 48, opacity: 0.25, mb: 1 }} />
                <Typography variant="body1" sx={{ fontWeight: 650 }}>
                  {t('No records found')}
                </Typography>
                <Typography variant="body2" sx={{ maxWidth: 400, mx: 'auto', mt: 0.5 }}>
                  {search || statusFilter !== 'ALL'
                    ? t('Try adjusting search keywords or clearing status filter.')
                    : isCustomer
                      ? t('Click "+ New service request" above to create your first inspection request.')
                      : t('No customer service requests are waiting in the queue.')}
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table sx={{ minWidth: 700 }}>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell sx={{ fontWeight: 750, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                        {t('Objective & Asset')}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 750, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                        {t('Service type')}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 750, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                        {t('Requested window')}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 750, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                        {t('Status')}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 750, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                        {t('Created date')}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 750, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                        {t('Action')}
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredRequests.map((req) => {
                      const effectiveStatus = getEffectiveRequestStatus(req);

                      return (
                        <TableRow
                          key={req.id}
                          hover
                          onClick={() => selectRequest(req.id)}
                          sx={{ cursor: 'pointer' }}
                        >
                          <TableCell sx={{ py: 2 }}>
                            <Typography variant="body2" sx={{ fontWeight: 750, color: 'text.primary', lineHeight: 1.3 }}>
                              {req.description}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Chip
                              label={req.requestType === 'ONE_TIME' ? t('One-time') : t('Recurring')}
                              size="small"
                              variant="outlined"
                              sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                            />
                          </TableCell>

                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {req.requestType === 'ONE_TIME' ? req.requestedFrom : `${req.requestedFrom} – ${req.requestedUntil}`}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                              {formatFlightWindow(req.windowStart, req.windowEnd, t)}
                            </Typography>
                          </TableCell>

                          <TableCell sx={{ whiteSpace: 'nowrap' }}>
                            <Stack spacing={0.35} sx={{ alignItems: 'flex-start' }}>
                              <StatusChip
                                status={effectiveStatus}
                                label={getStatusLabel(effectiveStatus, t)}
                                tone={statusTone(effectiveStatus)}
                              />
                              {getRequestStageSubtitle(effectiveStatus, isCustomer ? 'CUSTOMER' : 'MANAGER', t) && (
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: 'text.secondary',
                                    fontSize: '0.75rem',
                                    fontWeight: 500,
                                    pl: 0.25,
                                  }}
                                >
                                  {getRequestStageSubtitle(effectiveStatus, isCustomer ? 'CUSTOMER' : 'MANAGER', t)}
                                </Typography>
                              )}
                            </Stack>
                          </TableCell>

                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {new Date(req.createdAt).toLocaleDateString([], {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </Typography>
                          </TableCell>

                          <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="outlined"
                              size="small"
                              endIcon={<ArrowForwardRoundedIcon />}
                              onClick={() => selectRequest(req.id)}
                              sx={{
                                borderRadius: '8px',
                                textTransform: 'none',
                                fontWeight: 650,
                                fontSize: '0.75rem',
                              }}
                            >
                              Track progress
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Stack>
      )}

      {/* DIALOG: TẠO SERVICE REQUEST MỚI (CHO CUSTOMER) */}
      <CreateRequestDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        assets={assets.data?.items ?? []}
        onCreated={(id) => {
          setCreateDialogOpen(false);
          selectRequest(id);
          refreshSelectedRequest();
        }}
        onError={setError}
      />

    </Box>
  );
}
