import {
  Box,
  Button,
  Chip,
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
} from '@mui/material';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import type { InspectionListItem, PendingAction } from '../api/inspectionApi';
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
  showReportColumn?: boolean;
  reviewerMode?: boolean;
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
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
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
  showReportColumn = false,
  reviewerMode = false,
}: InspectionListTableProps) {
  const { t, formatDate: formatDateValue } = useLocale();
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

      <TableContainer sx={{ overflowX: 'auto' }}>
        <Table aria-label={t('Inspections table')}>
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  bgcolor: 'background.default',
                  color: 'text.secondary',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  py: 1.5,
                  px: 2.5,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                }}
              >
                {reviewerMode ? 'Inspection' : 'Objective'}
              </TableCell>
              {!reviewerMode && (
                <>
                  <TableCell
                    sx={{
                      bgcolor: 'background.default',
                      color: 'text.secondary',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      py: 1.5,
                      px: 2,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      width: 170,
                    }}
                  >
                    {t('Status')}
                  </TableCell>
                  <TableCell
                    sx={{
                      bgcolor: 'background.default',
                      color: 'text.secondary',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      py: 1.5,
                      px: 2,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      width: 180,
                    }}
                  >
                    {t('Updated')}
                  </TableCell>
                </>
              )}
              {(showReportColumn || reviewerMode) && (
                <TableCell
                  sx={{
                    bgcolor: 'background.default',
                    color: 'text.secondary',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    py: 1.5,
                    px: 2,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    width: 170,
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
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  py: 1.5,
                  px: 2.5,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  width: 130,
                }}
              >
                {reviewerMode ? 'Reviewer action' : 'Action'}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={reviewerMode ? 3 : showReportColumn ? 5 : 4}>
                  <Typography color="text.secondary" sx={{ py: 6, textAlign: 'center', fontSize: '0.9rem' }}>
                    {t('No inspections match this view yet.')}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
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
                        py: 2,
                        px: 2.5,
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: 'text.primary',
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            color: 'text.primary',
                            lineHeight: 1.4,
                            maxWidth: 500,
                          }}
                        >
                          {row.objective || `${t('Inspection')} #${row.id.slice(0, 8)}`}
                        </Typography>
                        {row.inspectionType === 'RE_INSPECTION' && (
                          <Chip
                            size="small"
                            color="secondary"
                            label={t('Re-inspection')}
                            sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }}
                          />
                        )}
                      </Stack>
                      {reviewerMode && (
                        <Typography variant="caption" color="text.secondary" component="span" sx={{ display: 'block', mt: 0.5 }}>
                          {t('Asset')} {row.assetId.slice(0, 8)}{t('… · Inspector')} {row.inspectorId.slice(0, 8)}…
                        </Typography>
                      )}
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'text.secondary',
                          fontFamily: 'monospace',
                          fontSize: '11px',
                          display: 'block',
                          mt: 0.25,
                        }}
                      >
                        {row.id.slice(0, 8)}…
                      </Typography>
                    </TableCell>

                    {!reviewerMode && (
                      <>
                      <TableCell
                        sx={{
                          py: 2,
                          px: 2,
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <StatusChip status={row.status} />
                      </TableCell>

                      <TableCell
                        sx={{
                          py: 2,
                          px: 2,
                          color: 'text.secondary',
                          fontSize: '0.875rem',
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatDate(row.updatedAt, formatDateValue)}
                      </TableCell>
                      </>
                    )}

                    {(showReportColumn || reviewerMode) && (
                      <TableCell
                        sx={{
                          py: 2,
                          px: 2,
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
                                borderRadius: '4px',
                                bgcolor: 'action.hover',
                                color: 'text.primary',
                                fontSize: '11px',
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
                            {PENDING_ACTION_LABEL[row.pendingAction] ?? row.pendingAction}
                          </Typography>
                        ) : null}
                      </TableCell>
                    )}

                    <TableCell
                      align="right"
                      sx={{
                        py: 2,
                        px: 2.5,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
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
                          fontSize: '12px',
                          px: 1.5,
                          py: 0.5,
                          '&:hover': {
                            borderColor: 'primary.main',
                            color: 'primary.main',
                            bgcolor: 'primary.light',
                          },
                        }}
                      >
                        {reviewerMode
                          ? row.pendingAction === 'REPORT_REVIEW'
                            ? 'Review submission'
                            : row.pendingAction === 'CORRECTIVE_DISPOSITION'
                              ? 'Record corrective outcome'
                              : row.reportStatus === 'APPROVED'
                                ? 'Publish report'
                                : row.reportStatus === 'RETURNED'
                                  ? 'Read returned report'
                                  : 'Open report'
                          : 'Open'}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

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
