import { useState, type MouseEvent, type ReactNode } from 'react';
import {
  Alert,
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
  useMediaQuery,
  useTheme,
} from '@mui/material';
import MoreHorizRoundedIcon from '@mui/icons-material/MoreHorizRounded';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import FilterListRounded from '@mui/icons-material/FilterListRounded';
import HandshakeOutlinedIcon from '@mui/icons-material/HandshakeOutlined';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { PageHeader } from '@/shared/ui/PageHeader';
import { StatusChip } from '@/shared/ui/StatusChip';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { useAuthStore } from '@/features/auth/store/authStore';
import type { ServiceRequest } from '../api/contractApi';
import {
  type ContractRole,
  formatFlightTimeRange,
  formatQuotedPriceSummary,
  formatRequestScheduleSummary,
  getEffectiveRequestStatus,
  getRequestStageSubtitle,
  getStatusLabel,
  resolveAssetDisplay,
  statusTone,
  summarizeDispatchProgress,
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
  canOpenSummary?: boolean | ((request: ServiceRequest) => boolean);
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
  canOpenSummary,
  onClaimRequest,
  claimPending = false,
}: ServiceRequestListViewProps) {
  const { locale, t, formatDate } = useLocale();
  const signedInUserId = useAuthStore((state) => state.userId);
  const signedInUserName = useAuthStore((state) => state.userName);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'), { noSsr: true });
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
  const requestCanOpenSummary = (request: ServiceRequest) =>
    canOpenSummary === undefined
      ? requestCanOpenDetails(request)
      : typeof canOpenSummary === 'function'
        ? canOpenSummary(request)
        : canOpenSummary;
  const handleRequestRowClick = (event: MouseEvent<HTMLTableRowElement>, request: ServiceRequest) => {
    if ((event.target as HTMLElement).closest('button, a, input, [role="menuitem"]')) return;
    if (requestCanOpenDetails(request)) onSelectRequest(request.id);
    else if (requestCanOpenSummary(request)) setOverviewRequest(request);
  };
  const openOverview = () => {
    if (!actionMenu || !requestCanOpenSummary(actionMenu.request)) return;
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
      (req.assetName ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (req.assetCode ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (req.ownerCustomerName ?? '').toLowerCase().includes(search.toLowerCase()) ||
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
          { label: t('Home'), to: homePath },
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
              bgcolor: 'color-mix(in srgb, var(--mui-palette-warning-main) 12%, transparent)',
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
              bgcolor: 'color-mix(in srgb, var(--mui-palette-success-main) 12%, transparent)',
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
            placeholder={t('Search requests…')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
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
                      <FilterListRounded fontSize="small" sx={{ color: 'text.secondary' }} />
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
        ) : isMobile ? (
            <Box>
              {filteredRequests.map((req, index) => {
                const effectiveStatus = getEffectiveRequestStatus(req);
                const stageSubtitle = getRequestStageSubtitle(
                  effectiveStatus,
                  role,
                  t,
                  req.occurrences.length > 0,
                );
                const canClaim = role === 'MANAGER' && Boolean(req.canClaim) && Boolean(onClaimRequest);
                const canOpen = requestCanOpenDetails(req);
                const canSummary = requestCanOpenSummary(req);

                return (
                  <Box
                    key={req.id}
                    onClick={() => {
                      if (canOpen) onSelectRequest(req.id);
                      else if (canSummary) setOverviewRequest(req);
                    }}
                    sx={{
                      p: 2,
                      borderTop: index > 0 ? '1px solid' : 'none',
                      borderColor: 'divider',
                      cursor: canOpen || canSummary ? 'pointer' : 'default',
                      '&:hover': canOpen || canSummary ? { bgcolor: 'action.hover' } : undefined,
                    }}
                  >
                    <Stack spacing={1}>
                      <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.35 }}
                          >
                            {req.description}
                          </Typography>
                          {(req.assetName || (role === 'MANAGER' && req.ownerCustomerName)) && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                              {[
                                req.assetName ? [req.assetName, req.assetCode].filter(Boolean).join(' · ') : null,
                                role === 'MANAGER' ? req.ownerCustomerName : null,
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                            </Typography>
                          )}
                        </Box>
                        <IconButton
                          size="small"
                          aria-label={t('Actions for service request')}
                          aria-haspopup="menu"
                          aria-expanded={actionMenu?.request.id === req.id ? 'true' : undefined}
                          onClick={(event) => {
                            event.stopPropagation();
                            setActionMenu({ element: event.currentTarget, request: req });
                          }}
                          sx={{ width: 32, height: 32, borderRadius: '8px', color: 'text.secondary', flexShrink: 0 }}
                        >
                          <MoreHorizRoundedIcon fontSize="small" />
                        </IconButton>
                      </Stack>

                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}>
                        <StatusChip
                          status={effectiveStatus}
                          label={getStatusLabel(effectiveStatus, t)}
                          tone={statusTone(effectiveStatus)}
                        />
                        <Chip
                          label={req.requestType === 'ONE_TIME' ? t('One-time') : t('Recurring')}
                          size="small"
                          variant="outlined"
                          sx={{ fontWeight: 600, fontSize: '0.75rem', borderRadius: '6px' }}
                        />
                        {stageSubtitle && (
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                            {stageSubtitle}
                          </Typography>
                        )}
                      </Stack>

                      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                          {req.requestType === 'ONE_TIME'
                            ? requestDate(req.requestedFrom)
                            : `${requestDate(req.requestedFrom)} – ${requestDate(req.requestedUntil)}`}{' '}
                          · {formatFlightTimeRange(req.windowStart, req.windowEnd)}
                        </Typography>
                        {canClaim && (
                          <Button
                            size="small"
                            variant="outlined"
                            disabled={claimPending}
                            onClick={(event) => {
                              event.stopPropagation();
                              onClaimRequest?.(req.id);
                            }}
                            sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                          >
                            {t('Claim request')}
                          </Button>
                        )}
                      </Stack>
                    </Stack>
                  </Box>
                );
              })}
            </Box>
        ) : (
            <TableContainer>
              <Table sx={{ minWidth: 700 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 750, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                      {t('Request & Asset')}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 750, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                      {t('Schedule')}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 750, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                      {t('Stage')}
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
                    const stageSubtitle = getRequestStageSubtitle(
                      effectiveStatus,
                      role,
                      t,
                      req.occurrences.length > 0,
                    );
                    const canClaim = role === 'MANAGER' && Boolean(req.canClaim) && Boolean(onClaimRequest);

                    return (
                      <TableRow
                        key={req.id}
                        hover
                        onClick={(event) => handleRequestRowClick(event, req)}
                        sx={{
                          cursor:
                            requestCanOpenDetails(req) || requestCanOpenSummary(req)
                              ? 'pointer'
                              : 'default',
                        }}
                      >
                        <TableCell sx={{ py: 1.5 }}>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 750, color: 'text.primary', lineHeight: 1.3 }}
                          >
                            {req.description}
                          </Typography>
                          {(req.assetName || (role === 'MANAGER' && req.ownerCustomerName)) && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ display: 'block', mt: 0.25 }}
                            >
                              {[
                                req.assetName ? [req.assetName, req.assetCode].filter(Boolean).join(' · ') : null,
                                role === 'MANAGER' ? req.ownerCustomerName : null,
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                            </Typography>
                          )}
                          <Chip
                            label={req.requestType === 'ONE_TIME' ? t('One-time') : t('Recurring')}
                            size="small"
                            variant="outlined"
                            sx={{ mt: 0.75, fontWeight: 600, fontSize: '0.72rem', borderRadius: '6px' }}
                          />
                        </TableCell>

                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
                          >
                            {req.requestType === 'ONE_TIME'
                              ? requestDate(req.requestedFrom)
                              : `${requestDate(req.requestedFrom)} – ${requestDate(req.requestedUntil)}`}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: 'block', mt: 0.25 }}
                          >
                            {formatFlightTimeRange(req.windowStart, req.windowEnd)}
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

                        <TableCell align="right" onClick={(event) => event.stopPropagation()}>
                          <Stack direction="row" spacing={0.75} sx={{ justifyContent: 'flex-end', alignItems: 'center' }}>
                            {canClaim && (
                              <Button
                                size="small"
                                variant="outlined"
                                disabled={claimPending}
                                onClick={() => onClaimRequest?.(req.id)}
                                sx={{
                                  borderRadius: '8px',
                                  textTransform: 'none',
                                  fontWeight: 600,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {t('Claim request')}
                              </Button>
                            )}
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
                          </Stack>
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
        {actionMenu && requestCanOpenSummary(actionMenu.request) && (
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
            {t('Claim request')}
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
        maxWidth="sm"
        aria-labelledby="service-request-overview-title"
        slotProps={{
          paper: {
            sx: {
              borderRadius: '10px',
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
                py: 1.75,
                borderBottom: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Stack direction="row" sx={{ alignItems: 'center', gap: 1.25 }}>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                    {overviewRequest.description}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                    #{overviewRequest.id.slice(0, 8)}
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
                <Chip
                  size="small"
                  label={
                    overviewRequest.requestType === 'ONE_TIME' ? t('One-time') : t('Recurring')
                  }
                  variant="outlined"
                  sx={{ borderRadius: '6px', fontWeight: 600, flexShrink: 0 }}
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
            <DialogContent dividers sx={{ px: { xs: 2, sm: 3 }, py: 2, bgcolor: 'background.paper' }}>
              {(() => {
                const effectiveStatus = getEffectiveRequestStatus(overviewRequest);
                const assetDisplay = resolveAssetDisplay(overviewRequest);
                const quotedPriceSummary = formatQuotedPriceSummary(overviewRequest, locale);
                const scheduleSummary = formatRequestScheduleSummary(
                  overviewRequest,
                  formatDate,
                  locale,
                  t,
                );
                const hasDispatchInfo =
                  overviewRequest.occurrences.length > 0 || effectiveStatus === 'ASSIGNED';
                const dispatchSummary = hasDispatchInfo
                  ? summarizeDispatchProgress(overviewRequest, locale, t)
                  : null;
                const overviewRows: Array<{ label: string; value: ReactNode }> = [
                  {
                    label: t('Current service stage'),
                    value: (
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {getRequestStageSubtitle(
                          effectiveStatus,
                          role,
                          t,
                          overviewRequest.occurrences.length > 0,
                        ) || requestStatus}
                      </Typography>
                    ),
                  },
                  {
                    label: t('Asset'),
                    value: (
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {[assetDisplay.name, assetDisplay.code].filter((v) => v && v !== '—').join(' · ') || '—'}
                        </Typography>
                        {assetDisplay.location && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {assetDisplay.location}
                          </Typography>
                        )}
                      </Box>
                    ),
                  },
                  ...(role === 'MANAGER'
                    ? [
                        {
                          label: t('Customer'),
                          value: (
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {overviewRequest.ownerCustomerName || '—'}
                            </Typography>
                          ),
                        },
                        {
                          label: t('Service manager'),
                          value: (
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {overviewRequest.assignedManagerId
                                ? overviewRequest.serviceManager?.fullName ||
                                  (overviewRequest.assignedManagerId === signedInUserId
                                    ? signedInUserName || t('Assigned to you')
                                    : t('Assigned'))
                                : t('Unclaimed')}
                            </Typography>
                          ),
                        },
                      ]
                    : []),
                  {
                    label: t('Schedule'),
                    value: (
                      <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {scheduleSummary}
                      </Typography>
                    ),
                  },
                  ...(quotedPriceSummary
                    ? [
                        {
                          label: t('Quoted price'),
                          value: (
                            <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                              {quotedPriceSummary}
                            </Typography>
                          ),
                        },
                      ]
                    : []),
                  ...(dispatchSummary
                    ? [
                        {
                          label: t('Inspection team'),
                          value: (
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {dispatchSummary}
                            </Typography>
                          ),
                        },
                      ]
                    : []),
                ];

                return (
                  <Stack spacing={2}>
                    <Box
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: '8px',
                        overflow: 'hidden',
                      }}
                    >
                      <Table size="small" sx={{ tableLayout: { xs: 'fixed', sm: 'auto' } }}>
                        <TableBody>
                          {overviewRows.map((row, idx) => {
                            const isLast = idx === overviewRows.length - 1;
                            return (
                              <TableRow key={row.label}>
                                <TableCell
                                  sx={{
                                    width: { xs: '42%', sm: 180 },
                                    fontWeight: 600,
                                    color: 'text.secondary',
                                    verticalAlign: 'top',
                                    borderBottom: isLast ? 0 : undefined,
                                  }}
                                >
                                  {row.label}
                                </TableCell>
                                <TableCell sx={{ borderBottom: isLast ? 0 : undefined }}>
                                  {row.value}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </Box>

                    {role === 'CUSTOMER' && effectiveStatus === 'QUOTED' && (
                      <Alert severity="info" sx={{ borderRadius: '8px' }}>
                        {t('Quote ready for review — open Track progress to review and accept.')}
                      </Alert>
                    )}

                    {role === 'CUSTOMER' && managerContact && (
                      <Box
                        sx={{
                          p: 1.75,
                          borderRadius: '8px',
                          border: '1px solid',
                          borderColor: 'divider',
                          bgcolor: 'background.default',
                        }}
                      >
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 1 }}>
                          {t('Service manager profile')}
                        </Typography>
                        <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ alignItems: { sm: 'center' }, gap: 1.5 }}>
                          <Avatar src={managerContact.avatarUrl ?? undefined} alt={managerContact.fullName ?? ''} sx={{ width: 42, height: 42 }}>
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
                        </Stack>
                      </Box>
                    )}

                    {role === 'CUSTOMER' && !managerContact && (
                      <Box
                        sx={{
                          px: 1.75,
                          py: 1.25,
                          borderRadius: '8px',
                          border: '1px solid',
                          borderColor: 'divider',
                          bgcolor: 'background.default',
                        }}
                      >
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>
                          {t('Service manager')}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                          {t('Waiting for a Service Manager to claim this request.')}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                );
              })()}
            </DialogContent>
            <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
              <Button onClick={() => setOverviewRequest(null)} sx={{ textTransform: 'none' }}>
                {t('Close')}
              </Button>
              {role === 'MANAGER' && overviewRequest.canClaim && onClaimRequest && (
                <Button
                  variant={requestCanOpenDetails(overviewRequest) ? 'outlined' : 'contained'}
                  disabled={claimPending}
                  onClick={() => {
                    const requestId = overviewRequest.id;
                    setOverviewRequest(null);
                    onClaimRequest(requestId);
                  }}
                  sx={{ borderRadius: '8px', textTransform: 'none', boxShadow: 'none' }}
                >
                  {t('Claim request')}
                </Button>
              )}
              {requestCanOpenDetails(overviewRequest) && (
                <Button
                  variant="contained"
                  endIcon={<AssignmentOutlinedIcon />}
                  onClick={() => {
                    const requestId = overviewRequest.id;
                    setOverviewRequest(null);
                    onSelectRequest(requestId);
                  }}
                  sx={{ borderRadius: '8px', textTransform: 'none', boxShadow: 'none' }}
                >
                  {t('Track progress')}
                </Button>
              )}
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
            </DialogActions>
          </>
        )}
      </Dialog>

    </Stack>
  );
}
