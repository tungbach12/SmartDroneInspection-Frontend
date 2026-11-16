import { useState, type MouseEvent, type ReactNode } from 'react';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Menu,
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
import MoreHorizRoundedIcon from '@mui/icons-material/MoreHorizRounded';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import FlightOutlinedIcon from '@mui/icons-material/FlightOutlined';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import FilterListRounded from '@mui/icons-material/FilterListRounded';
import HandshakeOutlinedIcon from '@mui/icons-material/HandshakeOutlined';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { PageHeader } from '@/shared/ui/PageHeader';
import { StatusChip } from '@/shared/ui/StatusChip';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import type { ServiceRequest } from '../api/contractApi';
import {
  type ContractRole,
  formatFlightWindow,
  getEffectiveRequestStatus,
  getRequestStageSubtitle,
  getStatusLabel,
  statusTone,
} from './contractStage';

interface ServiceRequestListViewProps {
  requests: ServiceRequest[];
  role: ContractRole;
  isAdmin?: boolean;
  adminAssignees?: Array<{ id: string; fullName: string; email: string }>;
  onAdminAssign?: (requestId: string, managerId: string) => void;
  onAdminReassign?: (requestId: string, managerId: string) => void;
  onAdminUnassign?: (requestId: string) => void;
  adminAssignmentPending?: boolean;
  homePath: string;
  emptyQueueMessage: string;
  toolbarAction?: ReactNode;
  onSelectRequest: (requestId: string) => void;
  canOpenDetails?: boolean | ((request: ServiceRequest) => boolean);
  onClaimRequest?: (requestId: string) => void;
  claimPending?: boolean;
}

export function ServiceRequestListView({
  requests,
  role,
  isAdmin = false,
  adminAssignees = [],
  onAdminAssign,
  onAdminReassign,
  onAdminUnassign,
  adminAssignmentPending = false,
  homePath,
  emptyQueueMessage,
  toolbarAction,
  onSelectRequest,
  canOpenDetails = true,
  onClaimRequest,
  claimPending = false,
}: ServiceRequestListViewProps) {
  const { locale, t } = useLocale();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [overviewRequest, setOverviewRequest] = useState<ServiceRequest | null>(null);
  const [managerProfileRequest, setManagerProfileRequest] = useState<ServiceRequest | null>(null);
  const [assignmentRequest, setAssignmentRequest] = useState<ServiceRequest | null>(null);
  const [selectedManagerId, setSelectedManagerId] = useState('');
  const [actionMenu, setActionMenu] = useState<{ element: HTMLElement; request: ServiceRequest } | null>(null);

  const managerContact = overviewRequest?.serviceManager;
  const managerEmail = managerContact?.email?.trim();
  const managerPhone = managerContact?.phoneNumber?.trim();
  const profileContact = managerProfileRequest?.serviceManager;
  const profileEmail = profileContact?.email?.trim();
  const profilePhone = profileContact?.phoneNumber?.trim();
  const requestStatus = overviewRequest
    ? getStatusLabel(getEffectiveRequestStatus(overviewRequest), t)
    : '';
  const requestDate = (date: string) =>
    new Date(`${date}T00:00:00`).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  const closeActionMenu = () => setActionMenu(null);
  const requestCanOpenDetails = (request: ServiceRequest) =>
    typeof canOpenDetails === 'function' ? canOpenDetails(request) : canOpenDetails;
  const handleRequestRowClick = (event: MouseEvent<HTMLTableRowElement>, request: ServiceRequest) => {
    if ((event.target as HTMLElement).closest('button, a, input, [role="menuitem"]')) return;
    if (requestCanOpenDetails(request)) onSelectRequest(request.id);
  };
  const openOverview = () => {
    if (!actionMenu || !requestCanOpenDetails(actionMenu.request)) return;
    setOverviewRequest(actionMenu.request);
    closeActionMenu();
  };
  const openManagerProfile = () => {
    if (!actionMenu) return;
    setManagerProfileRequest(actionMenu.request);
    closeActionMenu();
  };
  const openRequestProgress = () => {
    if (!actionMenu || !requestCanOpenDetails(actionMenu.request)) return;
    const request = actionMenu.request;
    closeActionMenu();
    if (requestCanOpenDetails(request)) onSelectRequest(request.id);
  };
  const filteredRequests = requests.filter((req) => {
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

  const openNegotiatingCount = requests.filter((r) => {
    const effectiveStatus = getEffectiveRequestStatus(r);
    return effectiveStatus === 'OPEN' || effectiveStatus === 'QUOTED';
  }).length;

  const signedAssignedCount = requests.filter((r) => {
    const effectiveStatus = getEffectiveRequestStatus(r);
    return effectiveStatus === 'CONTRACT_SIGNED' || effectiveStatus === 'ASSIGNED';
  }).length;

  return (
    <Stack spacing={3}>
      <PageHeader
        title={t('Inspection service requests')}
        breadcrumbs={[
          { label: 'Home', to: homePath },
          { label: t('Service requests') },
        ]}
      />

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
              bgcolor: (theme) =>
                theme.palette.mode === 'dark' ? 'rgba(237, 108, 2, 0.15)' : '#fff8e1',
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
              bgcolor: (theme) =>
                theme.palette.mode === 'dark' ? 'rgba(46, 125, 50, 0.15)' : '#e8f5e9',
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

      <Paper
        variant="outlined"
        sx={{
          borderRadius: '10px',
          borderColor: 'divider',
          overflow: 'hidden',
          bgcolor: 'background.paper',
          boxShadow: 'none',
        }}
      >
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
            {toolbarAction}
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
                : emptyQueueMessage}
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
                  <TableCell
                    align="right"
                    sx={{ fontWeight: 750, fontSize: '0.75rem', textTransform: 'uppercase' }}
                  >
                    {t('Action')}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRequests.map((req) => {
                  const effectiveStatus = getEffectiveRequestStatus(req);
                  const stageSubtitle = getRequestStageSubtitle(effectiveStatus, role, t);

                  return (
                    <TableRow
                      key={req.id}
                      hover
                      onClick={(event) => handleRequestRowClick(event, req)}
                      sx={{ cursor: requestCanOpenDetails(req) ? 'pointer' : 'default' }}
                    >
                      <TableCell sx={{ py: 2 }}>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 750, color: 'text.primary', lineHeight: 1.3 }}
                        >
                          {req.description}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={req.requestType === 'ONE_TIME' ? t('One-time') : t('Recurring')}
                          size="small"
                          variant="outlined"
                          sx={{ fontWeight: 600, fontSize: '0.75rem', borderRadius: '6px' }}
                        />
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {req.requestType === 'ONE_TIME'
                            ? req.requestedFrom
                            : `${req.requestedFrom} – ${req.requestedUntil}`}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: 'block', mt: 0.25 }}
                        >
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
                          {stageSubtitle && (
                            <Typography
                              variant="caption"
                              sx={{
                                color: 'text.secondary',
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                pl: 0.25,
                              }}
                            >
                              {stageSubtitle}
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

                      <TableCell align="right" onClick={(event) => event.stopPropagation()}>
                        <IconButton
                          size="small"
                          aria-label={t('Actions for service request')}
                          aria-haspopup="menu"
                          aria-expanded={actionMenu?.request.id === req.id ? 'true' : undefined}
                          onClick={(event) =>
                            setActionMenu({ element: event.currentTarget, request: req })
                          }
                          sx={{
                            width: 34,
                            height: 34,
                            borderRadius: '8px',
                            color: 'text.secondary',
                          }}
                        >
                          <MoreHorizRoundedIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Menu
        anchorEl={actionMenu?.element ?? null}
        open={Boolean(actionMenu)}
        onClose={closeActionMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: { sx: { minWidth: 190, borderRadius: '8px', boxShadow: 'none', border: 1, borderColor: 'divider' } },
          list: { 'aria-label': t('Service request actions') },
        }}
      >
        {actionMenu && requestCanOpenDetails(actionMenu.request) && (
          <MenuItem onClick={openOverview}>
            <DescriptionOutlinedIcon fontSize="small" sx={{ mr: 1.25, color: 'text.secondary' }} />
            {t('Overview')}
          </MenuItem>
        )}
        {isAdmin && actionMenu && (
          <MenuItem
            onClick={() => {
              setAssignmentRequest(actionMenu.request);
              setSelectedManagerId(actionMenu.request.assignedManagerId ?? '');
              closeActionMenu();
            }}
          >
            <PersonOutlineRoundedIcon fontSize="small" sx={{ mr: 1.25, color: 'text.secondary' }} />
            {t(actionMenu.request.assignedManagerId ? 'Reassign manager' : 'Assign manager')}
          </MenuItem>
        )}
        {isAdmin && actionMenu?.request.assignedManagerId && onAdminUnassign && (
          <MenuItem
            disabled={adminAssignmentPending}
            onClick={() => {
              const requestId = actionMenu.request.id;
              closeActionMenu();
              onAdminUnassign(requestId);
            }}
          >
            {t('Unassign manager')}
          </MenuItem>
        )}
        {role === 'MANAGER' && actionMenu?.request.canClaim && onClaimRequest && (
          <MenuItem
            disabled={claimPending}
            onClick={() => {
              const requestId = actionMenu.request.id;
              closeActionMenu();
              onClaimRequest(requestId);
            }}
          >
            <PersonOutlineRoundedIcon fontSize="small" sx={{ mr: 1.25, color: 'text.secondary' }} />
            {t(actionMenu.request.assignedManagerId ? 'Open assigned request' : 'Claim request')}
          </MenuItem>
        )}
        {role === 'CUSTOMER' && actionMenu?.request.serviceManager && (
          <MenuItem onClick={openManagerProfile}>
            <PersonOutlineRoundedIcon fontSize="small" sx={{ mr: 1.25, color: 'text.secondary' }} />
            {t('Manager profile')}
          </MenuItem>
        )}
        {actionMenu && requestCanOpenDetails(actionMenu.request) && (
          <MenuItem onClick={openRequestProgress}>
            <AssignmentOutlinedIcon fontSize="small" sx={{ mr: 1.25, color: 'text.secondary' }} />
            {t('Track progress')}
          </MenuItem>
        )}
      </Menu>

      <Dialog
        open={Boolean(overviewRequest)}
        onClose={() => setOverviewRequest(null)}
        fullWidth
        maxWidth="md"
        aria-labelledby="service-request-overview-title"
        slotProps={{
          paper: {
            sx: {
              borderRadius: '8px',
              minHeight: { sm: 580 },
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
            },
          },
        }}
      >
        {overviewRequest && (
          <>
            <DialogTitle
              id="service-request-overview-title"
              sx={{
                px: { xs: 2, sm: 3 },
                py: 1.5,
                borderBottom: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    display: 'grid',
                    placeItems: 'center',
                    width: 40,
                    height: 40,
                    borderRadius: '8px',
                    bgcolor: 'action.hover',
                    color: 'primary.main',
                    flexShrink: 0,
                  }}
                >
                  <CalendarMonthOutlinedIcon />
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                    {overviewRequest.description}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t('Service request ID')}: {overviewRequest.id}
                  </Typography>
                </Box>
                <Chip
                  size="small"
                  label={requestStatus}
                  color={statusTone(getEffectiveRequestStatus(overviewRequest)) === 'default'
                    ? 'default'
                    : statusTone(getEffectiveRequestStatus(overviewRequest))}
                  variant="outlined"
                  sx={{ borderRadius: '6px', flexShrink: 0 }}
                />
                <IconButton
                  aria-label={t('Close')}
                  onClick={() => setOverviewRequest(null)}
                  size="small"
                >
                  <CloseRoundedIcon fontSize="small" />
                </IconButton>
              </Stack>
            </DialogTitle>
            <DialogContent
              dividers
              sx={{
                px: { xs: 2, sm: 3 },
                py: 2,
                bgcolor: 'background.default',
                overflowY: 'auto',
              }}
            >
              <Stack spacing={2}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: '8px', boxShadow: 'none' }}>
                  <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    sx={{ alignItems: { md: 'center' }, justifyContent: 'space-between', gap: 2 }}
                  >
                    <Box>
                      <Typography
                        variant="caption"
                        color="primary.main"
                        sx={{ fontWeight: 750, textTransform: 'uppercase', letterSpacing: '0.04em' }}
                      >
                        {t('Current service stage')}
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {getRequestStageSubtitle(getEffectiveRequestStatus(overviewRequest), role, t)}
                      </Typography>
                    </Box>
                    {role === 'MANAGER' && overviewRequest.canClaim && onClaimRequest && (
                      <Button
                        variant="outlined"
                        disabled={claimPending}
                        onClick={() => {
                          const requestId = overviewRequest.id;
                          setOverviewRequest(null);
                          onClaimRequest(requestId);
                        }}
                        sx={{ borderRadius: '8px', textTransform: 'none', flexShrink: 0 }}
                      >
                        {t(overviewRequest.assignedManagerId ? 'Open assigned request' : 'Claim request')}
                      </Button>
                    )}
                    {canOpenDetails && (
                      <Button
                        variant="contained"
                        endIcon={<AssignmentOutlinedIcon />}
                        onClick={() => {
                          const requestId = overviewRequest.id;
                          setOverviewRequest(null);
                          onSelectRequest(requestId);
                        }}
                        sx={{ borderRadius: '8px', textTransform: 'none', boxShadow: 'none', flexShrink: 0 }}
                      >
                        {t('Track progress')}
                      </Button>
                    )}
                  </Stack>
                </Paper>

                <Paper variant="outlined" sx={{ p: 2, borderRadius: '8px', boxShadow: 'none' }}>
                  <Stack direction="row" sx={{ alignItems: 'center', gap: 1, mb: 1.75 }}>
                    <CalendarMonthOutlinedIcon fontSize="small" color="primary" />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {t('Planned work schedule')}
                    </Typography>
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" color="text.secondary">{t('Planned start')}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.25 }}>
                        {requestDate(overviewRequest.requestedFrom)} · {overviewRequest.windowStart}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" color="text.secondary">{t('Planned end')}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.25 }}>
                        {requestDate(overviewRequest.requestedUntil)} · {overviewRequest.windowEnd}
                      </Typography>
                    </Box>
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    {overviewRequest.requestType === 'ONE_TIME' ? t('One-time') : t('Recurring')}
                    {overviewRequest.requestType === 'RECURRING'
                      ? ` · ${overviewRequest.recurrenceInterval} ${t(overviewRequest.recurrenceUnit ?? 'month')} · ${overviewRequest.occurrenceCount ?? overviewRequest.occurrences.length} ${t('occurrences')}`
                      : ''}
                  </Typography>
                </Paper>

                <Paper variant="outlined" sx={{ p: 2, borderRadius: '8px', boxShadow: 'none' }}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: 1.5, mb: 1.5 }}
                  >
                    <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
                      <LocationOnOutlinedIcon fontSize="small" color="primary" />
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {t('Infrastructure asset')}
                      </Typography>
                    </Stack>
                    <Chip size="small" label={overviewRequest.assetId} variant="outlined" sx={{ borderRadius: '6px' }} />
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" color="text.secondary">{t('Asset ID')}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.25 }}>{overviewRequest.assetId}</Typography>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" color="text.secondary">{t('Customer requested window')}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.25 }}>
                        {requestDate(overviewRequest.requestedFrom)}
                        {overviewRequest.requestedFrom !== overviewRequest.requestedUntil
                          ? ` – ${requestDate(overviewRequest.requestedUntil)}`
                          : ''}
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>

                <Paper variant="outlined" sx={{ p: 2, borderRadius: '8px', boxShadow: 'none' }}>
                  <Stack direction="row" sx={{ alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <FlightOutlinedIcon fontSize="small" color="primary" />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {t('Request details')}
                    </Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">{t('Objective & Asset')}</Typography>
                  <Typography variant="body2" sx={{ mt: 0.25 }}>{overviewRequest.description}</Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1.5 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" color="text.secondary">{t('Service type')}</Typography>
                      <Typography variant="body2" sx={{ mt: 0.25 }}>{overviewRequest.requestType === 'ONE_TIME' ? t('One-time') : t('Recurring')}</Typography>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" color="text.secondary">{t('Daily inspection window')}</Typography>
                      <Typography variant="body2" sx={{ mt: 0.25 }}>{formatFlightWindow(overviewRequest.windowStart, overviewRequest.windowEnd, t)}</Typography>
                    </Box>
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
                    {t('Created date')}: {new Date(overviewRequest.createdAt).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </Typography>
                </Paper>

                {role === 'CUSTOMER' && managerContact && (
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: '8px', boxShadow: 'none' }}>
                    <Stack direction="row" sx={{ alignItems: 'center', gap: 1, mb: 1.5 }}>
                      <PersonOutlineRoundedIcon fontSize="small" color="primary" />
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {t('Service manager profile')}
                      </Typography>
                    </Stack>
                    <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ alignItems: { sm: 'center' }, gap: 1.5 }}>
                      <Avatar src={managerContact.avatarUrl ?? undefined} alt={managerContact.fullName ?? ''} sx={{ width: 48, height: 48 }}>
                        {(managerContact.fullName ?? 'M').slice(0, 1).toUpperCase()}
                      </Avatar>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {managerContact.fullName || t('Service manager')}
                        </Typography>
                        {managerEmail && <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{managerEmail}</Typography>}
                        {managerPhone && <Typography variant="body2" color="text.secondary">{managerPhone}</Typography>}
                        {!managerEmail && !managerPhone && <Typography variant="caption" color="text.secondary">{t('No contact details available')}</Typography>}
                      </Box>
                      <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
                        {managerEmail && <Button component="a" href={`mailto:${managerEmail}`} size="small" variant="outlined" sx={{ borderRadius: '8px', textTransform: 'none' }}>{t('Email')}</Button>}
                        {managerPhone && <Button component="a" href={`tel:${managerPhone}`} size="small" variant="outlined" sx={{ borderRadius: '8px', textTransform: 'none' }}>{t('Call')}</Button>}
                      </Stack>
                    </Stack>
                  </Paper>
                )}
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
              <Button onClick={() => setOverviewRequest(null)} sx={{ textTransform: 'none' }}>
                {t('Close')}
              </Button>
              <Button
                variant="outlined"
                endIcon={<AssignmentOutlinedIcon />}
                onClick={() => {
                  const requestId = overviewRequest.id;
                  setOverviewRequest(null);
                  onSelectRequest(requestId);
                }}
                sx={{ borderRadius: '8px', textTransform: 'none' }}
              >
                {t('Open full request workspace')}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Dialog
        open={Boolean(assignmentRequest)}
        onClose={() => setAssignmentRequest(null)}
        fullWidth
        maxWidth="xs"
        aria-labelledby="assign-service-manager-title"
        slotProps={{ paper: { sx: { borderRadius: '8px' } } }}
      >
        <DialogTitle id="assign-service-manager-title">
          {t(assignmentRequest?.assignedManagerId ? 'Reassign manager' : 'Assign manager')}
        </DialogTitle>
        <DialogContent dividers>
          <TextField
            select
            fullWidth
            label={t('Service manager')}
            value={selectedManagerId}
            onChange={(event) => setSelectedManagerId(event.target.value)}
          >
            {adminAssignees.map((assignee) => (
              <MenuItem key={assignee.id} value={assignee.id}>
                {assignee.fullName} · {assignee.email}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setAssignmentRequest(null)} sx={{ textTransform: 'none' }}>
            {t('Cancel')}
          </Button>
          <Button
            variant="contained"
            disabled={!assignmentRequest || !selectedManagerId || adminAssignmentPending}
            onClick={() => {
              if (!assignmentRequest || !selectedManagerId) return;
              if (assignmentRequest.assignedManagerId) {
                onAdminReassign?.(assignmentRequest.id, selectedManagerId);
              } else {
                onAdminAssign?.(assignmentRequest.id, selectedManagerId);
              }
              setAssignmentRequest(null);
            }}
            sx={{ borderRadius: '8px', textTransform: 'none', boxShadow: 'none' }}
          >
            {t('Save assignment')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(managerProfileRequest)}
        onClose={() => setManagerProfileRequest(null)}
        fullWidth
        maxWidth="xs"
        aria-labelledby="service-manager-profile-title"
        slotProps={{ paper: { sx: { borderRadius: '8px' } } }}
      >
        {profileContact && (
          <>
            <DialogTitle id="service-manager-profile-title">{t('Service manager profile')}</DialogTitle>
            <DialogContent dividers>
              <Stack sx={{ alignItems: 'center', textAlign: 'center', gap: 1.25, py: 1 }}>
                <Avatar src={profileContact.avatarUrl ?? undefined} alt={profileContact.fullName ?? ''} sx={{ width: 72, height: 72 }}>
                  {(profileContact.fullName ?? 'M').slice(0, 1).toUpperCase()}
                </Avatar>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>{profileContact.fullName || t('Service manager')}</Typography>
                {profileEmail && <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{profileEmail}</Typography>}
                {profilePhone && <Typography variant="body2" color="text.secondary">{profilePhone}</Typography>}
                {!profileEmail && !profilePhone && <Typography variant="caption" color="text.secondary">{t('No contact details available')}</Typography>}
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
              <Button onClick={() => setManagerProfileRequest(null)} sx={{ textTransform: 'none' }}>{t('Close')}</Button>
              <Stack direction="row" sx={{ gap: 1 }}>
                {profileEmail && <Button component="a" href={`mailto:${profileEmail}`} size="small" variant="outlined" sx={{ borderRadius: '8px', textTransform: 'none' }}>{t('Email')}</Button>}
                {profilePhone && <Button component="a" href={`tel:${profilePhone}`} size="small" variant="outlined" sx={{ borderRadius: '8px', textTransform: 'none' }}>{t('Call')}</Button>}
              </Stack>
            </DialogActions>
          </>
        )}
      </Dialog>

    </Stack>
  );
}
