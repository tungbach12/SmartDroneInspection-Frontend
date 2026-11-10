import {
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
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
  CORRECTIVE_DISPOSITION: 'Corrective outcome due',
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
  /** Opens the full inspection overview dialog (schedule, airspace map, checkpoints, purpose). */
  onOverview?: (inspectionId: string) => void;
  showReportColumn?: boolean;
  reviewerMode?: boolean;
  roleView?: 'inspector' | 'manager';
  getActionLabel?: (row: InspectionListItem) => string | undefined;
}

function formatDate(
  value: string | null,
  format: (input: Date | string | number, options?: Intl.DateTimeFormatOptions) => string,
): string {
  if (!value) return '—';
  try {
    const d = new Date(value);
    return format(d, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return value;
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
  title = 'Inspection records',
  rows,
  page,
  pageSize,
  totalCount,
  totalPages,
  onPageChange,
  onPageSizeChange,
  onOpen,
  onOverview,
  showReportColumn = false,
  reviewerMode = false,
  roleView = 'inspector',
  getActionLabel,
}: InspectionListTableProps) {
  const { t, formatDate: formatDateValue, formatNumber } = useLocale();
  const theme = useTheme();
  const isCompactViewport = useMediaQuery(theme.breakpoints.down('md'));
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
      {/* Card Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: { xs: 2, sm: 3 },
          py: 2.25,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography sx={{ fontSize: '1rem', fontWeight: 600, color: 'text.primary' }}>
          {title}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
          {totalCount} {t('total')} {totalCount === 1 ? 'record' : 'records'}
        </Typography>
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
              const scheduleDate = formatDate(row.plannedStartAt ?? row.updatedAt, formatDateValue);
              const scheduleWindow = formatWindowTime(row.plannedStartAt, row.plannedEndAt, formatDateValue);
              const stageSubtitle = resolveRowStageSubtitle(row, roleView);
              const actionText =
                (getActionLabel ? getActionLabel(row) : undefined) ??
                (reviewerMode
                  ? row.pendingAction === 'REPORT_REVIEW'
                    ? 'Review submission'
                    : row.pendingAction === 'CORRECTIVE_DISPOSITION'
                      ? roleView === 'manager'
                        ? 'Open report'
                        : 'Record corrective outcome'
                      : row.reportStatus === 'RETURNED'
                        ? 'Read returned report'
                        : 'Open report'
                  : 'Open');

              return (
                <Box
                  key={row.id}
                  onClick={() => onOpen(row.id)}
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
                          {meta.assetCode && (
                            <Chip
                              size="small"
                              label={meta.assetCode}
                              variant="outlined"
                              sx={{
                                height: 18,
                                borderRadius: '5px',
                                fontSize: '0.75rem',
                                fontFamily: 'monospace',
                                fontWeight: 600,
                              }}
                            />
                          )}
                        </Stack>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
                          {locationLabel ?? meta.objective ?? `${scheduleDate}${scheduleWindow ? ` · ${scheduleWindow}` : ''}`}
                        </Typography>
                      </Box>
                      <StatusChip status={row.reportStatus === 'PUBLISHED' ? 'PUBLISHED' : row.status} />
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
                        {finance && (
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 700,
                              color: '#176B52',
                              fontSize: '0.875rem',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {roleView === 'manager'
                              ? `+${formatNumber(finance.commissionAmount)} ₫`
                              : `${formatNumber(finance.netPayoutAmount)} ₫`}
                          </Typography>
                        )}
                      </Stack>

                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        {onOverview && (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={(event) => {
                              event.stopPropagation();
                              onOverview(row.id);
                            }}
                            sx={{
                              borderRadius: '8px',
                              borderColor: 'divider',
                              color: 'text.secondary',
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              textTransform: 'none',
                              px: 1.25,
                              py: 0.4,
                            }}
                          >
                            {t('Overview')}
                          </Button>
                        )}
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={(event) => {
                            event.stopPropagation();
                            onOpen(row.id);
                          }}
                          endIcon={<ArrowForwardRounded sx={{ fontSize: '14px !important' }} />}
                          sx={{
                            borderRadius: '8px',
                            borderColor: 'divider',
                            color: 'text.primary',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            textTransform: 'none',
                            px: 1.25,
                            py: 0.4,
                          }}
                        >
                          {actionText}
                        </Button>
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
                  bgcolor: 'background.default',
                  color: 'text.secondary',
                  fontSize: '0.75rem',
                  fontWeight: 650,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  py: 1.5,
                  px: 1.5,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  minWidth: 180,
                }}
              >
                {reviewerMode ? t('Inspection') : t('Asset')}
              </TableCell>
              {!reviewerMode && (
                <>
                  <TableCell
                    sx={{
                      bgcolor: 'background.default',
                      color: 'text.secondary',
                      fontSize: '0.75rem',
                      fontWeight: 650,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      py: 1.5,
                      px: 1.5,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      width: 120,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {t('Schedule')}
                  </TableCell>
                  <TableCell
                    sx={{
                      bgcolor: 'background.default',
                      color: 'text.secondary',
                      fontSize: '0.75rem',
                      fontWeight: 650,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      py: 1.5,
                      px: 1.5,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      width: 130,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {t('Stage')}
                  </TableCell>
                  <TableCell
                    sx={{
                      bgcolor: 'background.default',
                      color: 'text.secondary',
                      fontSize: '0.75rem',
                      fontWeight: 650,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      py: 1.5,
                      px: 1.5,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      width: 120,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {roleView === 'manager' ? t('Platform Fee') : t('Net Payout')}
                  </TableCell>
                </>
              )}
              {(showReportColumn || reviewerMode) && (
                <TableCell
                  sx={{
                    bgcolor: 'background.default',
                    color: 'text.secondary',
                    fontSize: '0.75rem',
                    fontWeight: 650,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    py: 1.5,
                    px: 1.5,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    width: 125,
                  }}
                >
                  {reviewerMode ? 'Decision due' : 'Report'}
                </TableCell>
              )}
              <TableCell
                align="right"
                sx={{
                  bgcolor: 'background.default',
                  color: 'text.secondary',
                  fontSize: '0.75rem',
                  fontWeight: 650,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  py: 1.5,
                  px: 1.5,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  width: 135,
                  whiteSpace: 'nowrap',
                }}
              >
                {reviewerMode ? 'Reviewer action' : t('Action')}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={reviewerMode ? 3 : showReportColumn ? 6 : 5}>
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
                const scheduleDate = formatDate(row.plannedStartAt ?? row.updatedAt, formatDateValue);
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
                        py: 1.75,
                        px: 1.5,
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: 'text.primary',
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Stack spacing={0.35} sx={{ minWidth: 0 }}>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
                          <Typography
                            variant="body2"
                            noWrap
                            title={meta.displayName}
                            sx={{
                              fontWeight: 650,
                              color: 'text.primary',
                              lineHeight: 1.35,
                              maxWidth: { xs: 120, md: 135, lg: 155 },
                            }}
                          >
                            {meta.displayName}
                          </Typography>
                          {meta.assetCode && (
                            <Chip
                              size="small"
                              label={meta.assetCode}
                              variant="outlined"
                              sx={{
                                height: 18,
                                borderRadius: '5px',
                                fontSize: '0.75rem',
                                fontFamily: 'monospace',
                                fontWeight: 600,
                                flexShrink: 0,
                              }}
                            />
                          )}
                          {row.inspectionType === 'RE_INSPECTION' && (
                            <Chip
                              size="small"
                              color="secondary"
                              label={t('Re-inspection')}
                              sx={{ height: 18, fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}
                            />
                          )}
                        </Stack>

                        {reviewerMode ? (
                          <Typography variant="caption" color="text.secondary" component="span" sx={{ display: 'block' }}>
                            {meta.displayName} · {(row as { assignedInspectorName?: string | null }).assignedInspectorName ?? t('Assigned partner inspector')}
                          </Typography>
                        ) : (locationLabel || meta.objective) ? (
                          <Typography
                            variant="caption"
                            noWrap
                            title={locationLabel ?? meta.objective ?? undefined}
                            sx={{
                              color: 'text.secondary',
                              display: 'block',
                              maxWidth: { xs: 150, md: 180, lg: 215 },
                            }}
                          >
                            {locationLabel ?? meta.objective}
                          </Typography>
                        ) : null}
                      </Stack>
                    </TableCell>

                    {!reviewerMode && (
                      <>
                      <TableCell
                        sx={{
                          py: 1.75,
                          px: 1.5,
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
                          py: 1.75,
                          px: 1.5,
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <Stack spacing={0.35} sx={{ alignItems: 'flex-start' }}>
                          <StatusChip status={row.reportStatus === 'PUBLISHED' ? 'PUBLISHED' : row.status} />
                          <Typography
                            variant="caption"
                            sx={{
                              color: 'text.secondary',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              pl: 0.25,
                            }}
                          >
                            {t(stageSubtitle)}
                          </Typography>
                        </Stack>
                      </TableCell>

                      <TableCell
                        sx={{
                          py: 1.75,
                          px: 1.5,
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {finance ? (
                          roleView === 'manager' ? (
                            <Stack spacing={0.25} sx={{ alignItems: 'flex-start' }}>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 700,
                                  color: '#176B52',
                                  fontSize: '0.875rem',
                                  fontVariantNumeric: 'tabular-nums',
                                }}
                              >
                                +{formatNumber(finance.commissionAmount)} ₫
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{
                                  color: 'text.secondary',
                                  fontSize: '0.75rem',
                                  fontVariantNumeric: 'tabular-nums',
                                }}
                              >
                                {t('Order')}: {formatNumber(finance.totalPrice)} ₫ ({finance.commissionRate}%)
                              </Typography>
                            </Stack>
                          ) : (
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 700,
                                color: '#176B52',
                                fontSize: '0.875rem',
                                fontVariantNumeric: 'tabular-nums',
                              }}
                            >
                              {formatNumber(finance.netPayoutAmount)} ₫
                            </Typography>
                          )
                        ) : (
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {t('Standard rate')}
                          </Typography>
                        )}
                      </TableCell>
                      </>
                    )}

                    {(showReportColumn || reviewerMode) && (
                      <TableCell
                        sx={{
                          py: 2,
                          px: 1.5,
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
                          {row.reportVersionNo !== null && (
                            <Box
                              component="span"
                              sx={{
                                px: 0.75,
                                py: '1px',
                                borderRadius: '5px',
                                bgcolor: 'action.hover',
                                color: 'text.primary',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                              }}
                            >
                              v{row.reportVersionNo}
                            </Box>
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
                            {roleView === 'manager' && row.pendingAction === 'CORRECTIVE_DISPOSITION'
                              ? 'Published · Settled'
                              : (PENDING_ACTION_LABEL[row.pendingAction] ?? row.pendingAction)}
                          </Typography>
                        ) : null}
                      </TableCell>
                    )}

                    <TableCell
                      align="right"
                      sx={{
                        py: 1.75,
                        px: 1.5,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Stack direction="row" spacing={0.75} sx={{ justifyContent: 'flex-end', alignItems: 'center' }}>
                        {onOverview && (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={(event) => {
                              event.stopPropagation();
                              onOverview(row.id);
                            }}
                            sx={{
                              borderRadius: '8px',
                              borderColor: 'divider',
                              color: 'text.secondary',
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              textTransform: 'none',
                              minWidth: 'auto',
                              px: 1,
                              py: 0.5,
                              whiteSpace: 'nowrap',
                              '&:hover': {
                                borderColor: 'text.primary',
                                color: 'text.primary',
                                bgcolor: 'action.hover',
                              },
                            }}
                          >
                            {t('Overview')}
                          </Button>
                        )}
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={(event) => {
                            event.stopPropagation();
                            onOpen(row.id);
                          }}
                          endIcon={<ArrowForwardRounded sx={{ fontSize: '14px !important' }} />}
                          sx={{
                            borderRadius: '8px',
                            borderColor: 'divider',
                            color: 'text.primary',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            textTransform: 'none',
                            minWidth: 'auto',
                            px: 1,
                            py: 0.5,
                            whiteSpace: 'nowrap',
                            '&:hover': {
                              borderColor: 'primary.main',
                              color: 'primary.main',
                              bgcolor: 'primary.light',
                            },
                          }}
                        >
                          {(getActionLabel ? getActionLabel(row) : undefined) ??
                            (reviewerMode
                              ? row.pendingAction === 'REPORT_REVIEW'
                                ? 'Review submission'
                                : row.pendingAction === 'CORRECTIVE_DISPOSITION'
                                  ? roleView === 'manager'
                                    ? 'Open report'
                                    : 'Record corrective outcome'
                                  : row.reportStatus === 'RETURNED'
                                    ? 'Read returned report'
                                    : 'Open report'
                              : 'Open')}
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
      )}

      <TablePagination
        component="div"
        count={totalCount}
        page={Math.max(0, Math.min(page - 1, Math.max(totalPages - 1, 0)))}
        onPageChange={(_, nextPage) => onPageChange(nextPage + 1)}
        rowsPerPage={pageSize}
        onRowsPerPageChange={(event) => onPageSizeChange(parseInt(event.target.value, 10))}
        rowsPerPageOptions={[10, 20, 50]}
        sx={{
          borderTop: '1px solid',
          borderColor: 'divider',
          color: 'text.secondary',
          px: 2,
          '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
            fontSize: '0.875rem',
            color: 'text.secondary',
          },
        }}
      />
    </Paper>
  );
}
