import { useState, type MouseEvent, type ReactNode } from 'react';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Pagination,
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
import MoreVertRounded from '@mui/icons-material/MoreVertRounded';
import FilterListRounded from '@mui/icons-material/FilterListRounded';
import SearchIcon from '@mui/icons-material/Search';
import SwapVertRounded from '@mui/icons-material/SwapVertRounded';
import type { InspectionListItem, PendingAction } from '../api/inspectionApi';
import { resolveInspectionMetadata, resolveInspectorFinanceBreakdown } from '../utils/inspectorFinance';
import { resolveRowStageSubtitle } from '../utils/workflowStepResolver';
import { StatusChip } from '@/shared/ui/StatusChip';
import { useLocale } from '@/shared/i18n/LocaleProvider';

/**
 * The one decision the organization manageristrator is being asked for, in the reviewer's words.
 *
 * <p>The phases are named rather than numbered so the queue reads as "what is waiting for me",
 * and an inspection that needs nothing from the administrator says so instead of implying a task.
 */
const PENDING_ACTION_LABEL: Record<PendingAction, string> = {
  REPORT_REVIEW: 'Report review due',
  NONE: 'Nothing waiting for you',
};

interface InspectionListTableProps {
  title?: string;
  rows: InspectionListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  /** Opens the inspection's own route, which is where the MF3 workflow lives. */
  onOpen: (inspectionId: string) => void;
  /** Opens the full inspection overview dialog (read-only mission information). */
  onOverview?: (inspectionId: string) => void;
  onAccept?: (inspectionId: string) => void;
  onDecline?: (inspectionId: string) => void;
  onReschedule?: (inspectionId: string) => void;
  onReassign?: (inspectionId: string) => void;
  onCancelInspection?: (inspectionId: string) => void;
  onForceAbort?: (inspectionId: string) => void;
  canDispatch?: boolean;
  acceptingId?: string | null;
  showReportColumn?: boolean;
  reviewerMode?: boolean;
  roleView?: 'inspector' | 'manager' | 'customer';
  getActionLabel?: (row: InspectionListItem) => string | undefined;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  statusFilter?: string;
  onStatusFilterChange?: (status: string) => void;
  statusOptions?: Array<{ value: string; label: string }>;
  sortOrder?: string;
  onSortOrderChange?: (sort: string) => void;
  sortOptions?: Array<{ value: string; label: string }>;
  actions?: ReactNode;
}

function getInitials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  const last = parts[parts.length - 1];
  if (!first) return '?';
  if (parts.length === 1 || !last) return first.slice(0, 2).toUpperCase();
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatScheduleDateRange(
  start: string | null,
  end: string | null,
  fallback: string,
  format: (input: Date | string | number, options?: Intl.DateTimeFormatOptions) => string,
): string {
  const primary = start ?? fallback;
  if (!primary) return '—';
  try {
    const startDate = new Date(primary);
    if (Number.isNaN(startDate.getTime())) return primary;
    if (start && end) {
      const endDate = new Date(end);
      if (!Number.isNaN(endDate.getTime()) && !isSameLocalDay(startDate, endDate)) {
        const sameYear = startDate.getFullYear() === endDate.getFullYear();
        const startLabel = format(
          startDate,
          sameYear
            ? { month: 'short', day: 'numeric' }
            : { month: 'short', day: 'numeric', year: 'numeric' },
        );
        const endLabel = format(endDate, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        return `${startLabel} – ${endLabel}`;
      }
    }
    return format(startDate, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return primary;
  }
}

function formatWindowTime(
  start: string | null,
  end: string | null,
  format: (input: Date | string | number, options?: Intl.DateTimeFormatOptions) => string,
): string | null {
  if (!start) return null;
  try {
    const startTime = format(new Date(start), { hour: '2-digit', minute: '2-digit' });
    if (!end) return startTime;
    const endTime = format(new Date(end), { hour: '2-digit', minute: '2-digit' });
    return `${startTime} – ${endTime}`;
  } catch {
    return null;
  }
}

function parseLocationLabel(raw?: string | null): string | null {
  if (!raw || !raw.trim()) return null;
  const trimmed = raw.trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as { label?: string };
      return parsed.label?.trim() || null;
    } catch {
      return null;
    }
  }
  return trimmed;
}

/**
 * Modern Lytic-styled server-paged inspection table.
 */
export function InspectionListTable({
  title: _title,
  rows,
  page,
  pageSize,
  totalCount,
  totalPages,
  onPageChange,
  onPageSizeChange: _onPageSizeChange,
  onOpen,
  onOverview,
  onAccept,
  onDecline,
  onReschedule,
  onReassign,
  onCancelInspection,
  onForceAbort,
  acceptingId = null,
  canDispatch = false,
  showReportColumn = false,
  reviewerMode = false,
  roleView = 'inspector',
  getActionLabel,
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  statusFilter,
  onStatusFilterChange,
  statusOptions,
  sortOrder,
  onSortOrderChange,
  sortOptions,
  actions,
}: InspectionListTableProps) {
  const { t, formatDate: formatDateValue, formatNumber } = useLocale();
  const theme = useTheme();
  const isCompactViewport = useMediaQuery(theme.breakpoints.down('md'));
  const isInspector = roleView === 'inspector';
  const isManager = roleView === 'manager';
  const isCustomer = roleView === 'customer';
  const counterpartHeaderLabel = isManager
    ? t('Inspector & Drone')
    : isCustomer
      ? t('Assigned Partner')
      : t('Customer & Drone');
  const financeHeaderLabel = isManager
    ? t('Platform Fee')
    : isCustomer
      ? t('Payment')
      : t('Net Payout');
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [menuRow, setMenuRow] = useState<InspectionListItem | null>(null);

  const closeActionMenu = () => {
    setMenuAnchor(null);
    setMenuRow(null);
  };
  const openActionMenu = (event: MouseEvent<HTMLElement>, row: InspectionListItem) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setMenuRow(row);
  };
  const isPendingAcceptance = (row: InspectionListItem) =>
    row.status === 'SCHEDULED' && row.assignmentStatus === 'PENDING_ACCEPTANCE' && !row.reassignmentRequired;
  const actionLabelFor = (row: InspectionListItem) =>
    (getActionLabel ? getActionLabel(row) : undefined) ??
    (reviewerMode
      ? row.pendingAction === 'REPORT_REVIEW'
        ? 'Review submission'
        : row.reportStatus === 'RETURNED'
          ? 'Read returned report'
          : 'Open report'
      : 'Open workspace');
  const inspectionActionMenuId = (rowId: string) => `inspection-actions-${rowId}`;

  const renderActionMenu = (row: InspectionListItem) => (
    <>
      <IconButton
        size="small"
        aria-label={t('Inspection actions')}
        aria-haspopup="menu"
        aria-controls={menuRow?.id === row.id && menuAnchor ? inspectionActionMenuId(row.id) : undefined}
        aria-expanded={menuRow?.id === row.id && Boolean(menuAnchor)}
        onClick={(event) => openActionMenu(event, row)}
        sx={{
          width: { xs: 44, sm: 36 },
          height: { xs: 44, sm: 36 },
          borderRadius: '8px',
          border: '1px solid',
          borderColor: 'divider',
          color: 'text.secondary',
          bgcolor: 'background.paper',
          '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
        }}
      >
        <MoreVertRounded fontSize="small" />
      </IconButton>
      <Menu
        id={inspectionActionMenuId(row.id)}
        anchorEl={menuAnchor}
        open={menuRow?.id === row.id && Boolean(menuAnchor)}
        onClose={closeActionMenu}
        onClick={(event) => event.stopPropagation()}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { minWidth: 200, borderRadius: '12px' } } }}
      >
        <MenuItem onClick={() => { closeActionMenu(); onOpen(row.id); }}>
          {t(actionLabelFor(row))}
        </MenuItem>
        {onOverview && (
          <MenuItem onClick={() => { closeActionMenu(); onOverview(row.id); }}>
            {t('Overview')}
          </MenuItem>
        )}
        {isInspector && isPendingAcceptance(row) && onAccept && (
          <MenuItem disabled={acceptingId === row.id} onClick={() => { closeActionMenu(); onAccept(row.id); }}>
            {t('Accept mission')}
          </MenuItem>
        )}
        {isInspector && isPendingAcceptance(row) && onDecline && (
          <MenuItem onClick={() => { closeActionMenu(); onDecline(row.id); }}>
            {t('Decline mission')}
          </MenuItem>
        )}
        {canDispatch && row.status === 'SCHEDULED' && onReschedule && (
          <MenuItem onClick={() => { closeActionMenu(); onReschedule(row.id); }}>
            {t('Reschedule')}
          </MenuItem>
        )}
        {canDispatch && row.status === 'SCHEDULED' && onReassign && (
          <MenuItem onClick={() => { closeActionMenu(); onReassign(row.id); }}>
            {t('Reassign Inspector & Drone')}
          </MenuItem>
        )}
        {canDispatch && row.status === 'SCHEDULED' && onCancelInspection && <Divider />}
        {canDispatch && row.status === 'SCHEDULED' && onCancelInspection && (
          <MenuItem onClick={() => { closeActionMenu(); onCancelInspection(row.id); }} sx={{ color: 'error.main' }}>
            {t('Cancel inspection')}
          </MenuItem>
        )}
        {canDispatch && row.status === 'IN_PROGRESS' && onForceAbort && <Divider />}
        {canDispatch && row.status === 'IN_PROGRESS' && onForceAbort && (
          <MenuItem onClick={() => { closeActionMenu(); onForceAbort(row.id); }} sx={{ color: 'error.main' }}>
            {t('Force-abort session')}
          </MenuItem>
        )}
      </Menu>
    </>
  );

  return (
    <Paper
      variant="outlined"
      sx={{
        overflow: 'hidden',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '12px',
        boxShadow: 'none',
      }}
    >
      {/* Card Header / NextAdmin Toolbar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: { xs: 2, sm: 2.5 },
          py: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          flexWrap: 'wrap',
          gap: 1.5,
        }}
      >
        <TextField
          size="small"
          placeholder={searchPlaceholder ?? t('Search by id, name, or location…')}
          value={searchQuery ?? ''}
          onChange={onSearchChange ? (e) => onSearchChange(e.target.value) : undefined}
          disabled={!onSearchChange}
          slotProps={{
            htmlInput: { 'aria-label': searchPlaceholder ?? t('Search inspections') },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
              endAdornment:
                onSearchChange && (searchQuery ?? '').trim().length > 0 ? (
                  <InputAdornment position="end">
                    <Button
                      size="small"
                      color="inherit"
                      aria-label={t('Clear search')}
                      onClick={() => onSearchChange('')}
                      sx={{ minWidth: 0, p: 0.25, fontSize: '1rem', lineHeight: 1, color: 'text.secondary' }}
                    >
                      ×
                    </Button>
                  </InputAdornment>
                ) : undefined,
            },
          }}
          sx={{
            flex: { xs: '1 1 auto', md: '0 1 340px' },
            minWidth: { xs: 0, sm: 220 },
            '& .MuiOutlinedInput-root': {
              height: 40,
              borderRadius: '8px',
              bgcolor: 'background.paper',
              fontSize: '0.875rem',
            },
          }}
        />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
          {statusFilter !== undefined && onStatusFilterChange && (
            <TextField
              select
              size="small"
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              slotProps={{
                htmlInput: { 'aria-label': t('Filter by status') },
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
              {(statusOptions ?? [
                { value: 'ALL', label: t('All statuses') },
                { value: 'SCHEDULED', label: t('Scheduled') },
                { value: 'IN_PROGRESS', label: t('In Progress') },
                { value: 'FIELD_COMPLETED', label: t('Field Completed') },
                { value: 'UNDER_REVIEW', label: t('Under Review') },
                { value: 'COMPLETED', label: t('Completed') },
                { value: 'CANCELLED', label: t('Cancelled') },
              ]).map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
          )}

          {sortOrder !== undefined && onSortOrderChange && sortOptions && sortOptions.length > 0 && (
            <TextField
              select
              size="small"
              value={sortOrder}
              onChange={(e) => onSortOrderChange(e.target.value)}
              slotProps={{
                htmlInput: { 'aria-label': t('Sort inspections') },
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SwapVertRounded fontSize="small" sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{
                minWidth: 165,
                '& .MuiOutlinedInput-root': {
                  height: 40,
                  borderRadius: '8px',
                  bgcolor: 'background.paper',
                  fontSize: '0.875rem',
                },
              }}
            >
              {sortOptions.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
          )}

          {actions}
        </Box>
      </Box>

      {isCompactViewport ? (
        rows.length === 0 ? (
          <Box sx={{ p: 3 }}>
            <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center', fontSize: '0.875rem' }}>
              {t('No inspections match this view yet.')}
            </Typography>
          </Box>
        ) : (
          <Stack divider={<Divider />}>
            {rows.map((row) => {
              const finance = resolveInspectorFinanceBreakdown(row.id, row);
              const meta = resolveInspectionMetadata(row);
              const locationLabel = parseLocationLabel(row.assetLocation);
              const scheduleDate = formatScheduleDateRange(
                row.plannedStartAt,
                row.plannedEndAt,
                row.updatedAt,
                formatDateValue,
              );
              const scheduleWindow = formatWindowTime(row.plannedStartAt, row.plannedEndAt, formatDateValue);
              const stageSubtitle = resolveRowStageSubtitle(row, roleView);

              return (
                <Box
                  key={row.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onOpen(row.id)}
                  onKeyDown={(event) => {
                    if (
                      event.target === event.currentTarget &&
                      (event.key === 'Enter' || event.key === ' ')
                    ) {
                      event.preventDefault();
                      onOpen(row.id);
                    }
                  }}
                  sx={{
                    p: 2,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <Stack spacing={1.25}>
                    <Stack
                      direction="row"
                      sx={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.875rem' }}
                          >
                            {meta.displayName}
                          </Typography>
                        </Stack>
                        {isManager ? (
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
                            {[row.ownerCustomerName, row.inspectorName, [row.droneModel, row.droneSerialNumber].filter(Boolean).join(' · ')].filter(Boolean).join(' · ') || locationLabel || meta.objective}
                          </Typography>
                        ) : isCustomer ? (
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
                            {[row.inspectorName, locationLabel ?? meta.objective].filter(Boolean).join(' · ') || `${scheduleDate}${scheduleWindow ? ` · ${scheduleWindow}` : ''}`}
                          </Typography>
                        ) : (
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
                            {[row.ownerCustomerName, [row.droneModel, row.droneSerialNumber].filter(Boolean).join(' · '), locationLabel ?? meta.objective].filter(Boolean).join(' · ') || `${scheduleDate}${scheduleWindow ? ` · ${scheduleWindow}` : ''}`}
                          </Typography>
                        )}
                      </Box>
                      <Stack spacing={0.35} sx={{ alignItems: 'flex-end' }}>
                        {row.reassignmentRequired ? (
                          <>
                            <StatusChip status="DECLINED" label={t('Reassignment required')} tone="error" />
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                              {t('Scheduled')}
                            </Typography>
                          </>
                        ) : row.status === 'SCHEDULED' && row.assignmentStatus === 'PENDING_ACCEPTANCE' ? (
                          <>
                            <StatusChip status="PENDING" label={t('Pending acceptance')} tone="warning" />
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                              {t('Scheduled')}
                            </Typography>
                          </>
                        ) : (
                          <StatusChip status={row.reportStatus === 'PUBLISHED' ? 'PUBLISHED' : row.status} />
                        )}
                      </Stack>
                    </Stack>

                    <Stack
                      direction="row"
                      sx={{
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 1,
                      }}
                    >
                      <Stack spacing={0.15}>
                        <Typography
                          variant="caption"
                          sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}
                        >
                          {scheduleDate}{scheduleWindow ? ` · ${scheduleWindow}` : ''} · {t(stageSubtitle)}
                        </Typography>
                        {isCustomer ? (
                          row.paymentAmount != null && (
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 700,
                                color: 'text.primary',
                                fontSize: '0.875rem',
                                fontVariantNumeric: 'tabular-nums',
                              }}
                            >
                              {formatNumber(Math.round(row.paymentAmount))} ₫
                            </Typography>
                          )
                        ) : (
                          finance && (
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 700,
                                color: 'success.main',
                                fontSize: '0.875rem',
                                fontVariantNumeric: 'tabular-nums',
                              }}
                            >
                              {isManager
                                ? `+${formatNumber(Math.round(finance.commissionAmount))} ₫`
                                : `${formatNumber(Math.round(finance.netPayoutAmount))} ₫`}
                            </Typography>
                          )
                        )}
                      </Stack>

                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        {renderActionMenu(row)}
                      </Stack>
                    </Stack>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        )
      ) : (
      <TableContainer sx={{ overflowX: 'auto' }}>
        <Table aria-label={t('Inspections table')}>
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  bgcolor: (muiTheme) => (muiTheme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#F9FAFB'),
                  color: 'text.secondary',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                  py: 1.5,
                  px: 1.25,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  minWidth: 160,
                }}
              >
                {t('Asset')}
              </TableCell>
              <TableCell
                sx={{
                  bgcolor: (muiTheme) => (muiTheme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#F9FAFB'),
                  color: 'text.secondary',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                  py: 1.5,
                  px: 1.25,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  minWidth: 140,
                  whiteSpace: 'nowrap',
                }}
              >
                {counterpartHeaderLabel}
              </TableCell>
              <TableCell
                sx={{
                  bgcolor: (muiTheme) => (muiTheme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#F9FAFB'),
                  color: 'text.secondary',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                  py: 1.5,
                  px: 1.25,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  width: 132,
                  whiteSpace: 'nowrap',
                }}
              >
                {t('Schedule')}
              </TableCell>
              <TableCell
                sx={{
                  bgcolor: (muiTheme) => (muiTheme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#F9FAFB'),
                  color: 'text.secondary',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                  py: 1.5,
                  px: 1.25,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  minWidth: 145,
                  whiteSpace: 'nowrap',
                }}
              >
                {t('Stage')}
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  bgcolor: (muiTheme) => (muiTheme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#F9FAFB'),
                  color: 'text.secondary',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                  py: 1.5,
                  px: 1.25,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  minWidth: 135,
                  whiteSpace: 'nowrap',
                }}
              >
                {financeHeaderLabel}
              </TableCell>
              {(showReportColumn || reviewerMode) && (
                <TableCell
                  sx={{
                    bgcolor: (muiTheme) => (muiTheme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#F9FAFB'),
                    color: 'text.secondary',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    letterSpacing: '0.02em',
                    py: 1.5,
                    px: 1.25,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    width: 105,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t('Report')}
                </TableCell>
              )}
              <TableCell
                align="right"
                sx={{
                  bgcolor: (muiTheme) => (muiTheme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#F9FAFB'),
                  color: 'text.secondary',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                  py: 1.5,
                  px: 1.25,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  width: 56,
                  whiteSpace: 'nowrap',
                }}
              >
                {t('Action')}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showReportColumn || reviewerMode ? 7 : 6}>
                  <Typography color="text.secondary" sx={{ py: 6, textAlign: 'center', fontSize: '0.875rem' }}>
                    {t('No inspections match this view yet.')}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const finance = resolveInspectorFinanceBreakdown(row.id, row);
                const meta = resolveInspectionMetadata(row);
                const locationLabel = parseLocationLabel(row.assetLocation);
                const scheduleDate = formatScheduleDateRange(
                row.plannedStartAt,
                row.plannedEndAt,
                row.updatedAt,
                formatDateValue,
              );
                const scheduleWindow = formatWindowTime(row.plannedStartAt, row.plannedEndAt, formatDateValue);
                const stageSubtitle = resolveRowStageSubtitle(row, roleView);

                return (
                  <TableRow
                    key={row.id}
                    hover
                    onClick={() => onOpen(row.id)}
                    onKeyDown={(event) => {
                      if (
                        event.target === event.currentTarget &&
                        (event.key === 'Enter' || event.key === ' ')
                      ) {
                        event.preventDefault();
                        onOpen(row.id);
                      }
                    }}
                    tabIndex={0}
                    sx={{
                      cursor: 'pointer',
                      bgcolor: 'transparent',
                      transition: 'background-color 0.15s ease',
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                    }}
                  >
                    <TableCell
                      sx={{
                        py: 1.5,
                        px: 1.25,
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: 'text.primary',
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        maxWidth: 210,
                        overflow: 'hidden',
                      }}
                    >
                      <Stack spacing={0.35} sx={{ minWidth: 0 }}>
                        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
                          <Typography
                            variant="body2"
                            noWrap
                            title={meta.displayName}
                            sx={{
                              fontWeight: 650,
                              color: 'text.primary',
                              lineHeight: 1.35,
                              minWidth: 0,
                            }}
                          >
                            {meta.displayName}
                          </Typography>
                          {row.inspectionType === 'RE_INSPECTION' && (
                            <Chip
                              size="small"
                              color="secondary"
                              variant="outlined"
                              label={t('Re-inspection')}
                              sx={{ height: 18, fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}
                            />
                          )}
                        </Stack>

                        {isManager ? (
                          row.ownerCustomerName ? (
                            <Typography
                              variant="caption"
                              noWrap
                              title={row.ownerCustomerName}
                              sx={{ color: 'text.secondary', display: 'block', fontWeight: 500 }}
                            >
                              {t('Customer')}: {row.ownerCustomerName}
                            </Typography>
                          ) : (locationLabel || meta.objective) ? (
                            <Typography
                              variant="caption"
                              noWrap
                              title={locationLabel ?? meta.objective ?? undefined}
                              sx={{ color: 'text.secondary', display: 'block' }}
                            >
                              {locationLabel ?? meta.objective}
                            </Typography>
                          ) : null
                        ) : (locationLabel || meta.objective) ? (
                          <Typography
                            variant="caption"
                            noWrap
                            title={locationLabel ?? meta.objective ?? undefined}
                            sx={{ color: 'text.secondary', display: 'block' }}
                          >
                            {locationLabel ?? meta.objective}
                          </Typography>
                        ) : null}
                      </Stack>
                    </TableCell>

                    <TableCell
                      sx={{
                        py: 1.5,
                        px: 1.25,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        maxWidth: 185,
                        overflow: 'hidden',
                      }}
                    >
                      {(() => {
                        const primaryPerson =
                          isManager || isCustomer ? row.inspectorName : row.ownerCustomerName;
                        const secondaryLine = isCustomer
                          ? row.managerName
                            ? `${t('Manager')}: ${row.managerName}`
                            : null
                          : row.droneModel || row.droneSerialNumber
                            ? [row.droneModel, row.droneSerialNumber].filter(Boolean).join(' · ')
                            : null;
                        return (
                          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
                            {primaryPerson && (
                              <Avatar
                                sx={{
                                  width: 28,
                                  height: 28,
                                  flexShrink: 0,
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  bgcolor: isManager ? 'primary.main' : 'action.selected',
                                  color: isManager ? 'primary.contrastText' : 'text.primary',
                                }}
                              >
                                {getInitials(primaryPerson)}
                              </Avatar>
                            )}
                            <Box sx={{ minWidth: 0 }}>
                              <Typography
                                variant="body2"
                                noWrap
                                title={primaryPerson ?? undefined}
                                sx={{
                                  fontWeight: 600,
                                  color: 'text.primary',
                                  fontSize: '0.875rem',
                                  lineHeight: 1.35,
                                }}
                              >
                                {primaryPerson || '—'}
                              </Typography>
                              {secondaryLine && (
                                <Typography
                                  variant="caption"
                                  noWrap
                                  title={secondaryLine}
                                  sx={{ color: 'text.secondary', display: 'block' }}
                                >
                                  {secondaryLine}
                                </Typography>
                              )}
                            </Box>
                          </Stack>
                        );
                      })()}
                    </TableCell>

                      <TableCell
                        sx={{
                          py: 1.5,
                          px: 1.25,
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <Stack spacing={0.25}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 600,
                              color: 'text.primary',
                              fontSize: '0.875rem',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {scheduleDate}
                          </Typography>
                          {scheduleWindow && (
                            <Typography
                              variant="caption"
                              sx={{
                                color: 'text.secondary',
                                fontVariantNumeric: 'tabular-nums',
                              }}
                            >
                              {scheduleWindow}
                            </Typography>
                          )}
                        </Stack>
                      </TableCell>

                      <TableCell
                        sx={{
                          py: 1.5,
                          px: 1.25,
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <Stack spacing={0.35} sx={{ alignItems: 'flex-start' }}>
                          {row.reassignmentRequired ? (
                            <StatusChip status="DECLINED" label={t('Reassignment required')} tone="error" />
                          ) : row.status === 'SCHEDULED' && row.assignmentStatus === 'PENDING_ACCEPTANCE' ? (
                            <StatusChip status="PENDING" label={t('Pending acceptance')} tone="warning" />
                          ) : (
                            <StatusChip status={row.reportStatus === 'PUBLISHED' ? 'PUBLISHED' : row.status} />
                          )}
                          <Typography
                            variant="caption"
                            noWrap
                            sx={{
                              color: 'text.secondary',
                              fontSize: '0.75rem',
                              fontWeight: 400,
                              pl: 0.25,
                            }}
                          >
                            {(row.reassignmentRequired ||
                              (row.status === 'SCHEDULED' && row.assignmentStatus === 'PENDING_ACCEPTANCE'))
                              ? t('Scheduled')
                              : t(stageSubtitle)}
                          </Typography>
                        </Stack>
                      </TableCell>

                      <TableCell
                        align="right"
                        sx={{
                          py: 1.5,
                          px: 1.25,
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {isCustomer ? (
                          row.paymentAmount != null ? (
                            <Stack spacing={0.25} sx={{ alignItems: 'flex-end' }}>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 700,
                                  color: 'text.primary',
                                  fontSize: '0.875rem',
                                  fontVariantNumeric: 'tabular-nums',
                                }}
                              >
                                {formatNumber(Math.round(row.paymentAmount))} ₫
                              </Typography>
                              {row.paymentStatus && row.paymentStatus !== 'NOT_APPLICABLE' && (
                                <Typography
                                  variant="caption"
                                  sx={{
                                    fontWeight: 600,
                                    fontSize: '0.75rem',
                                    color:
                                      row.paymentStatus === 'PAID'
                                        ? 'success.main'
                                        : row.paymentStatus === 'PAYMENT_DUE'
                                          ? 'warning.main'
                                          : 'text.secondary',
                                  }}
                                >
                                  {row.paymentStatus === 'PAID'
                                    ? t('Paid')
                                    : row.paymentStatus === 'PAYMENT_DUE'
                                      ? t('Payment due')
                                      : t('Pending')}
                                </Typography>
                              )}
                            </Stack>
                          ) : (
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              {t('Pending')}
                            </Typography>
                          )
                        ) : finance ? (
                          isManager ? (
                            <Stack spacing={0.25} sx={{ alignItems: 'flex-end' }}>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 700,
                                  color: 'success.main',
                                  fontSize: '0.875rem',
                                  fontVariantNumeric: 'tabular-nums',
                                }}
                              >
                                +{formatNumber(Math.round(finance.commissionAmount))} ₫
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{
                                  color: 'text.secondary',
                                  fontSize: '0.75rem',
                                  fontVariantNumeric: 'tabular-nums',
                                }}
                              >
                                {t('Order')}: {formatNumber(Math.round(finance.totalPrice))} ₫ ({finance.commissionRate}%)
                              </Typography>
                            </Stack>
                          ) : (
                            <Stack spacing={0.25} sx={{ alignItems: 'flex-end' }}>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 700,
                                  color: 'success.main',
                                  fontSize: '0.875rem',
                                  fontVariantNumeric: 'tabular-nums',
                                }}
                              >
                                {formatNumber(Math.round(finance.netPayoutAmount))} ₫
                              </Typography>
                              {row.payoutStatus && (
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: row.payoutStatus === 'PAID' ? 'success.main' : 'text.secondary',
                                    fontWeight: 600,
                                    fontSize: '0.75rem',
                                  }}
                                >
                                  {row.payoutStatus === 'PAID'
                                    ? t('Paid')
                                    : row.payoutStatus === 'ELIGIBLE'
                                      ? t('Eligible')
                                      : t('Pending')}
                                </Typography>
                              )}
                            </Stack>
                          )
                        ) : (
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {t('Standard rate')}
                          </Typography>
                        )}
                      </TableCell>

                    {(showReportColumn || reviewerMode) && (
                      <TableCell
                        sx={{
                          py: 2,
                          px: 1.25,
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                          {row.reportStatus ? (
                            <StatusChip status={row.reportStatus} />
                          ) : (
                            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                              {t('No report')}
                            </Typography>
                          )}
                        </Stack>
                        {reviewerMode ? (
                          // The server names the phase, so the queue never guesses a decision from
                          // the inspection status.
                          <Typography
                            variant="caption"
                            sx={{ display: 'block', mt: 0.5, fontWeight: 600 }}
                            color={
                              row.pendingAction === 'NONE' ? 'text.disabled' : 'text.secondary'
                            }
                          >
                            {PENDING_ACTION_LABEL[row.pendingAction] ?? row.pendingAction}
                          </Typography>
                        ) : null}
                      </TableCell>
                    )}

                    <TableCell
                      align="right"
                      sx={{
                        py: 1.75,
                        px: 1.25,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      {renderActionMenu(row)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
      )}

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: { xs: 2, sm: 3 },
          py: 1.5,
          borderTop: '1px solid',
          borderColor: 'divider',
          flexWrap: 'wrap',
          gap: 1.5,
        }}
      >
        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
          {totalCount > 0
            ? `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, totalCount)} of ${totalCount}`
            : 'Showing 0 of 0'}
        </Typography>

        <Pagination
          count={Math.max(1, totalPages)}
          page={page}
          onChange={(_, nextPage) => onPageChange(nextPage)}
          shape="rounded"
          size="small"
          sx={{
            '& .MuiPaginationItem-root': {
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.8125rem',
              color: 'text.primary',
            },
            '& .MuiPaginationItem-page.Mui-selected': {
              bgcolor: 'primary.main',
              color: '#FFFFFF',
              '&:hover': { bgcolor: 'primary.dark' },
            },
            '& .MuiPaginationItem-previousNext': {
              border: '1px solid',
              borderColor: 'divider',
            },
          }}
        />
      </Box>
    </Paper>
  );
}
