import {
  Box,
  Button,
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
import type { InspectionListItem } from '../api/inspectionApi';
import { StatusChip } from '@/shared/ui/StatusChip';

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
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  try {
    const d = new Date(value);
    return d.toLocaleDateString(undefined, {
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
}: InspectionListTableProps) {
  return (
    <Paper
      variant="outlined"
      sx={{
        overflow: 'hidden',
        bgcolor: '#ffffff',
        border: '1px solid #eaecf0',
        borderRadius: '16px',
        boxShadow: '0 1px 3px 0 rgba(16, 24, 40, 0.05), 0 1px 2px 0 rgba(16, 24, 40, 0.03)',
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
          borderBottom: '1px solid #eaecf0',
        }}
      >
        <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, color: '#101828' }}>
          {title}
        </Typography>
        <Typography variant="caption" sx={{ color: '#667085', fontWeight: 500 }}>
          {totalCount} total {totalCount === 1 ? 'record' : 'records'}
        </Typography>
      </Box>

      <TableContainer sx={{ overflowX: 'auto' }}>
        <Table aria-label="Inspections table">
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  bgcolor: '#fafbfc',
                  color: '#475467',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  py: 1.5,
                  px: 2.5,
                  borderBottom: '1px solid #eaecf0',
                }}
              >
                Objective
              </TableCell>
              <TableCell
                sx={{
                  bgcolor: '#fafbfc',
                  color: '#475467',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  py: 1.5,
                  px: 2,
                  borderBottom: '1px solid #eaecf0',
                  width: 170,
                }}
              >
                Status
              </TableCell>
              <TableCell
                sx={{
                  bgcolor: '#fafbfc',
                  color: '#475467',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  py: 1.5,
                  px: 2,
                  borderBottom: '1px solid #eaecf0',
                  width: 180,
                }}
              >
                Updated
              </TableCell>
              {showReportColumn && (
                <TableCell
                  sx={{
                    bgcolor: '#fafbfc',
                    color: '#475467',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    py: 1.5,
                    px: 2,
                    borderBottom: '1px solid #eaecf0',
                    width: 170,
                  }}
                >
                  Report
                </TableCell>
              )}
              <TableCell
                align="right"
                sx={{
                  bgcolor: '#fafbfc',
                  color: '#475467',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  py: 1.5,
                  px: 2.5,
                  borderBottom: '1px solid #eaecf0',
                  width: 130,
                }}
              >
                Action
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showReportColumn ? 5 : 4}>
                  <Typography color="text.secondary" sx={{ py: 6, textAlign: 'center', fontSize: '0.9rem' }}>
                    No inspections match this view yet.
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
                        bgcolor: '#f9fafb !important',
                      },
                    }}
                  >
                    <TableCell
                      sx={{
                        py: 2,
                        px: 2.5,
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: '#101828',
                        borderBottom: '1px solid #f2f4f7',
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          color: '#101828',
                          lineHeight: 1.4,
                          maxWidth: 500,
                        }}
                      >
                        {row.objective}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: '#667085',
                          fontFamily: 'monospace',
                          fontSize: '11px',
                          display: 'block',
                          mt: 0.25,
                        }}
                      >
                        {row.id.slice(0, 8)}…
                      </Typography>
                    </TableCell>

                    <TableCell
                      sx={{
                        py: 2,
                        px: 2,
                        borderBottom: '1px solid #f2f4f7',
                      }}
                    >
                      <StatusChip status={row.status} />
                    </TableCell>

                    <TableCell
                      sx={{
                        py: 2,
                        px: 2,
                        color: '#667085',
                        fontSize: '0.875rem',
                        borderBottom: '1px solid #f2f4f7',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatDate(row.updatedAt)}
                    </TableCell>

                    {showReportColumn && (
                      <TableCell
                        sx={{
                          py: 2,
                          px: 2,
                          borderBottom: '1px solid #f2f4f7',
                        }}
                      >
                        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                          {row.reportStatus ? (
                            <StatusChip status={row.reportStatus} />
                          ) : (
                            <Typography variant="caption" sx={{ color: '#98a2b3' }}>
                              No report
                            </Typography>
                          )}
                          {row.reportVersionNo !== null && (
                            <Box
                              component="span"
                              sx={{
                                px: 0.75,
                                py: '1px',
                                borderRadius: '4px',
                                bgcolor: '#f2f4f7',
                                color: '#344054',
                                fontSize: '11px',
                                fontWeight: 600,
                              }}
                            >
                              v{row.reportVersionNo}
                            </Box>
                          )}
                        </Stack>
                      </TableCell>
                    )}

                    <TableCell
                      align="right"
                      sx={{
                        py: 2,
                        px: 2.5,
                        borderBottom: '1px solid #f2f4f7',
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
                          borderColor: '#d0d5dd',
                          color: '#344054',
                          fontWeight: 600,
                          fontSize: '12px',
                          px: 1.5,
                          py: 0.5,
                          '&:hover': {
                            borderColor: '#3758f9',
                            color: '#3758f9',
                            bgcolor: '#eff3ff',
                          },
                        }}
                      >
                        Open
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
        page={Math.min(page, Math.max(totalPages - 1, 0))}
        onPageChange={(_, nextPage) => onPageChange(nextPage + 1)}
        rowsPerPage={pageSize}
        onRowsPerPageChange={(event) => onPageSizeChange(parseInt(event.target.value, 10))}
        rowsPerPageOptions={[10, 20, 50]}
        sx={{
          borderTop: '1px solid #eaecf0',
          color: '#667085',
          px: 2,
          '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
            fontSize: '0.875rem',
            color: '#667085',
          },
        }}
      />
    </Paper>
  );
}
