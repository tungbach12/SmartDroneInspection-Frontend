import {
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
import type { InspectionListItem } from '../api/inspectionApi';
import { StatusChip } from '@/shared/ui/StatusChip';

interface InspectionListTableProps {
  rows: InspectionListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  /** Reported by the backend, and a floor: no row is dropped if a count ever disagrees. */
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onSelect: (inspectionId: string) => void;
  selectedInspectionId?: string | null;
  /** The reports view needs the report columns; the inspections view does not. */
  showReportColumn?: boolean;
}

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleString() : '—';
}

/**
 * Server-paged inspection rows. Paging is deliberately not client-side: the list endpoint already
 * scopes and pages the data, so filtering here would hide rows the caller may legitimately see.
 */
export function InspectionListTable({
  rows,
  page,
  pageSize,
  totalCount,
  totalPages,
  onPageChange,
  onPageSizeChange,
  onSelect,
  selectedInspectionId,
  showReportColumn = false,
}: InspectionListTableProps) {
  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
      <TableContainer sx={{ overflowX: 'auto' }}>
        <Table size="small" aria-label="Inspections">
          <TableHead>
            <TableRow>
              <TableCell>Objective</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Updated</TableCell>
              {showReportColumn && <TableCell>Report</TableCell>}
              <TableCell>Inspection</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showReportColumn ? 5 : 4}>
                  <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                    No inspections match this view yet.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  hover
                  onClick={() => onSelect(row.id)}
                  onKeyDown={(event) => {
                    if (
                      event.target === event.currentTarget &&
                      (event.key === 'Enter' || event.key === ' ')
                    ) {
                      event.preventDefault();
                      onSelect(row.id);
                    }
                  }}
                  tabIndex={0}
                  aria-current={row.id === selectedInspectionId}
                  sx={{
                    cursor: 'pointer',
                    bgcolor:
                      row.id === selectedInspectionId
                        ? 'action.selected'
                        : 'transparent',
                  }}
                >
                  <TableCell>{row.objective}</TableCell>
                  <TableCell>
                    <StatusChip status={row.status} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(row.updatedAt)}
                    </Typography>
                  </TableCell>
                  {showReportColumn && (
                    <TableCell>
                      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                        {row.reportStatus ? (
                          <StatusChip status={row.reportStatus} />
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            No report
                          </Typography>
                        )}
                        {row.reportVersionNo !== null && (
                          <Typography variant="caption" color="text.secondary">
                            v{row.reportVersionNo}
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>
                  )}
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {row.id.slice(0, 8)}…
                    </Typography>
                  </TableCell>
                </TableRow>
              ))
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
      />
    </Paper>
  );
}
