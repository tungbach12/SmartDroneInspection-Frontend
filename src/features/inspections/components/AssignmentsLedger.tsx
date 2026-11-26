import { useMemo, useState, type SyntheticEvent } from 'react';
import {
  Box,
  Button,
  Chip,
  Divider,
  InputAdornment,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import SearchIcon from '@mui/icons-material/Search';
import type { InspectionListItem } from '../api/inspectionApi';
import { resolveInspectionMetadata, resolveInspectorFinanceBreakdown } from '../utils/inspectorFinance';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import { StatusChip } from '@/shared/ui/StatusChip';
import { useLocale } from '@/shared/i18n/LocaleProvider';

export type AssignmentFilterTab = 'ALL' | 'PENDING' | 'ACCEPTED' | 'DECLINED';

interface AssignmentsLedgerProps {
  rows: InspectionListItem[];
  initialFilter?: AssignmentFilterTab;
  acceptingId?: string | null;
  onAccept: (inspectionId: string) => void;
  onDecline: (inspectionId: string) => void;
  onOverview: (inspectionId: string) => void;
  onOpen: (inspectionId: string) => void;
}

type AssignmentBucket = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';

function classifyAssignment(row: InspectionListItem): AssignmentBucket {
  if (row.status === 'CANCELLED') {
    return 'CANCELLED';
  }
  if (row.reassignmentRequired || row.assignmentStatus === 'DECLINED') {
    return 'DECLINED';
  }
  if (row.status === 'SCHEDULED' && row.assignmentStatus === 'PENDING_ACCEPTANCE') {
    return 'PENDING';
  }
  return 'ACCEPTED';
}

function assignmentPriority(row: InspectionListItem): number {
  const bucket = classifyAssignment(row);
  if (bucket === 'PENDING') return 0;
  if (bucket === 'ACCEPTED') return 1;
  return 2;
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

function resolveOperationalLabel(row: InspectionListItem): string {
  if (row.reportStatus === 'PUBLISHED') return 'Published';
  switch (row.status) {
    case 'SCHEDULED':
      return 'Scheduled';
    case 'IN_PROGRESS':
      return 'In Progress';
    case 'FIELD_COMPLETED':
      return 'Field Completed';
    case 'UNDER_REVIEW':
      return 'Under Review';
    case 'COMPLETED':
      return 'Completed';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return row.status;
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

export function AssignmentsLedger({
  rows,
  initialFilter = 'ALL',
  acceptingId = null,
  onAccept,
  onDecline,
  onOverview,
  onOpen,
}: AssignmentsLedgerProps) {
  const { t, formatDate: formatDateValue, formatNumber } = useLocale();
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down('lg'));
  const [filter, setFilter] = useState<AssignmentFilterTab>(initialFilter);
  const [query, setQuery] = useState('');

  const counts = useMemo(() => {
    let pending = 0;
    let accepted = 0;
    let declined = 0;
    for (const row of rows) {
      const bucket = classifyAssignment(row);
      if (bucket === 'PENDING') pending += 1;
      else if (bucket === 'ACCEPTED') accepted += 1;
      else if (bucket === 'DECLINED') declined += 1;
    }
    return { all: rows.length, pending, accepted, declined };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((row) => {
        if (filter !== 'ALL' && classifyAssignment(row) !== filter) {
          return false;
        }
        if (!q) return true;
        return (
          (row.assetName?.toLowerCase().includes(q) ?? false) ||
          (row.assetCode?.toLowerCase().includes(q) ?? false) ||
          (row.assetLocation?.toLowerCase().includes(q) ?? false) ||
          (row.objective?.toLowerCase().includes(q) ?? false)
        );
      })
      .toSorted((a, b) => {
        const pa = assignmentPriority(a);
        const pb = assignmentPriority(b);
        if (pa !== pb) return pa - pb;
        const ta = new Date(a.plannedStartAt ?? a.updatedAt).getTime();
        const tb = new Date(b.plannedStartAt ?? b.updatedAt).getTime();
        return tb - ta;
      });
  }, [rows, filter, query]);

  const filterTabs: Array<{ value: AssignmentFilterTab; label: string; count: number }> = [
    { value: 'ALL', label: t('All'), count: counts.all },
    { value: 'PENDING', label: t('Pending'), count: counts.pending },
    { value: 'ACCEPTED', label: t('Accepted'), count: counts.accepted },
    { value: 'DECLINED', label: t('Declined'), count: counts.declined },
  ];

  const handleFilterTabChange = (_: SyntheticEvent, newValue: AssignmentFilterTab) => {
    setFilter(newValue);
  };

  const renderAssignmentBadge = (bucket: AssignmentBucket) => {
    if (bucket === 'CANCELLED') {
      return <StatusChip status="CANCELLED" label={t('Cancelled')} tone="error" />;
    }
    if (bucket === 'PENDING') {
      return <StatusChip status="PENDING" label={t('Pending acceptance')} tone="warning" />;
    }
    if (bucket === 'DECLINED') {
      return <StatusChip status="DECLINED" label={t('Declined')} tone="error" />;
    }
    return <StatusChip status="ACCEPTED" label={t('Accepted')} tone="success" />;
  };

  const renderRowActions = (row: InspectionListItem, bucket: AssignmentBucket, mobile = false) => {
    const buttonSx = {
      textTransform: 'none' as const,
      fontWeight: 600,
      borderRadius: '8px',
      minHeight: mobile ? 44 : 32,
      px: mobile ? 2 : 1.25,
      boxShadow: 'none',
    };

    return (
      <Stack
        direction="row"
        spacing={0.75}
        sx={{
          alignItems: 'center',
          flexWrap: mobile ? 'wrap' : 'nowrap',
          justifyContent: mobile ? 'flex-start' : 'flex-end',
          gap: 0.75,
        }}
      >
        <Button
          size="small"
          variant="outlined"
          color="inherit"
          onClick={() => onOverview(row.id)}
          sx={{ ...buttonSx, borderColor: 'divider', color: 'text.secondary' }}
        >
          {t('Overview')}
        </Button>

        {bucket === 'PENDING' && (
          <>
            <Button
              size="small"
              variant="outlined"
              color="warning"
              onClick={() => onDecline(row.id)}
              sx={buttonSx}
            >
              {t('Decline')}
            </Button>
            <LoadingButton
              size="small"
              variant="contained"
              color="primary"
              loading={acceptingId === row.id}
              onClick={() => onAccept(row.id)}
              sx={buttonSx}
            >
              {t('Accept')}
            </LoadingButton>
          </>
        )}

        {bucket === 'ACCEPTED' && (
          <Button
            size="small"
            variant="outlined"
            endIcon={<ArrowForwardRounded sx={{ fontSize: '0.9375rem !important' }} />}
            onClick={() => onOpen(row.id)}
            sx={{ ...buttonSx, borderColor: 'divider', color: 'text.primary' }}
          >
            {t('Open')}
          </Button>
        )}
      </Stack>
    );
  };

  const tableHeaderSx = {
    bgcolor: (tTheme: { palette: { mode: string } }) =>
      tTheme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#F9FAFB',
    color: '#71717A',
    fontSize: '0.75rem',
    fontWeight: 600,
    letterSpacing: '0.04em',
    textTransform: 'uppercase' as const,
    py: 1.5,
    px: 2,
    borderBottom: '1px solid',
    borderColor: 'divider',
    whiteSpace: 'nowrap' as const,
  };

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
      {/* Toolbar */}
      <Box
        sx={{
          px: { xs: 2, sm: 2.5 },
          pt: { xs: 1.5, md: 0.5 },
          pb: { xs: 1.5, md: 0 },
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { md: 'center' },
          justifyContent: 'space-between',
          gap: { xs: 1.5, md: 2 },
        }}
      >
        <Tabs
          value={filter}
          onChange={handleFilterTabChange}
          variant="scrollable"
          scrollButtons="auto"
          aria-label={t('Filter assignments')}
          sx={{
            minHeight: 46,
            '& .MuiTab-root': {
              minHeight: 46,
              minWidth: 'auto',
              py: 1,
              px: { xs: 1.1, sm: 1.5 },
              fontSize: { xs: '0.8125rem', sm: '0.875rem' },
              fontWeight: 500,
              textTransform: 'none',
              color: 'text.secondary',
              fontVariantNumeric: 'tabular-nums',
              '&.Mui-selected': {
                color: 'primary.main',
                fontWeight: 600,
              },
            },
          }}
        >
          {filterTabs.map((tab) => (
            <Tab
              key={tab.value}
              value={tab.value}
              label={`${tab.label} (${tab.count})`}
            />
          ))}
        </Tabs>

        <TextField
          size="small"
          placeholder={t('Search asset, code, or location…')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          slotProps={{
            htmlInput: { 'aria-label': t('Search assignments') },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{
            width: { xs: '100%', md: 280, lg: 300 },
            my: { md: 1 },
            '& .MuiOutlinedInput-root': {
              height: 38,
              borderRadius: '8px',
              fontSize: '0.875rem',
            },
          }}
        />
      </Box>

      {filteredRows.length === 0 ? (
        <Box sx={{ px: 3, py: 6, textAlign: 'center' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>
            {t('No matching assignments')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {t('New assignments will appear here.')}
          </Typography>
        </Box>
      ) : isCompact ? (
        <Stack divider={<Divider />}>
          {filteredRows.map((row) => {
            const bucket = classifyAssignment(row);
            const meta = resolveInspectionMetadata(row);
            const finance = resolveInspectorFinanceBreakdown(row.id, row);
            const locationLabel = parseLocationLabel(row.assetLocation);
            const scheduleDate = row.plannedStartAt
              ? formatScheduleDateRange(row.plannedStartAt, row.plannedEndAt, row.updatedAt, formatDateValue)
              : t('Not scheduled');
            const scheduleWindow = formatWindowTime(row.plannedStartAt, row.plannedEndAt, formatDateValue);
            const operationalLabel = t(resolveOperationalLabel(row));

            return (
              <Box key={row.id} sx={{ p: 2 }}>
                <Stack spacing={1.25}>
                  <Stack
                    direction="row"
                    sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}
                  >
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      {renderAssignmentBadge(bucket)}
                      {bucket !== 'CANCELLED' && (
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {operationalLabel}
                        </Typography>
                      )}
                    </Stack>
                    {finance && (
                      <Typography
                        variant="body2"
                        sx={{ color: 'success.main', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
                      >
                        {formatNumber(finance.netPayoutAmount)} ₫
                      </Typography>
                    )}
                  </Stack>

                  <Box sx={{ minWidth: 0 }}>
                    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 650, color: 'text.primary' }}>
                        {meta.displayName}
                      </Typography>
                      {meta.assetCode && (
                        <Chip
                          size="small"
                          label={meta.assetCode}
                          variant="outlined"
                          sx={{ height: 22, fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 600 }}
                        />
                      )}
                    </Stack>
                    {(locationLabel || meta.objective) && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                        {locationLabel ?? meta.objective}
                      </Typography>
                    )}
                    <Typography
                      variant="caption"
                      sx={{ color: 'text.secondary', display: 'block', mt: 0.5, fontVariantNumeric: 'tabular-nums' }}
                    >
                      {scheduleWindow ? `${scheduleDate} · ${scheduleWindow}` : scheduleDate}
                    </Typography>
                  </Box>

                  {renderRowActions(row, bucket, true)}
                </Stack>
              </Box>
            );
          })}
        </Stack>
      ) : (
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table aria-label={t('Assignments table')}>
            <TableHead>
              <TableRow>
                <TableCell sx={tableHeaderSx}>{t('Mission')}</TableCell>
                <TableCell sx={tableHeaderSx}>{t('Schedule')}</TableCell>
                <TableCell sx={tableHeaderSx}>{t('Assignment')}</TableCell>
                <TableCell align="right" sx={tableHeaderSx}>{t('Net payout')}</TableCell>
                <TableCell align="right" sx={tableHeaderSx}>{t('Action')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRows.map((row) => {
                const bucket = classifyAssignment(row);
                const meta = resolveInspectionMetadata(row);
                const finance = resolveInspectorFinanceBreakdown(row.id, row);
                const locationLabel = parseLocationLabel(row.assetLocation);
                const scheduleDate = row.plannedStartAt
                  ? formatScheduleDateRange(row.plannedStartAt, row.plannedEndAt, row.updatedAt, formatDateValue)
                  : t('Not scheduled');
                const scheduleWindow = formatWindowTime(row.plannedStartAt, row.plannedEndAt, formatDateValue);
                const operationalLabel = t(resolveOperationalLabel(row));

                return (
                  <TableRow key={row.id} hover>
                    <TableCell sx={{ py: 1.75, px: 2, minWidth: 200, maxWidth: 320, borderBottom: '1px solid', borderColor: 'divider' }}>
                      <Stack spacing={0.3}>
                        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                          <Typography variant="body2" noWrap title={meta.displayName} sx={{ fontWeight: 650, color: 'text.primary', maxWidth: { lg: 230, xl: 280 } }}>
                            {meta.displayName}
                          </Typography>
                          {meta.assetCode && (
                            <Chip
                              size="small"
                              label={meta.assetCode}
                              variant="outlined"
                              sx={{ height: 22, borderRadius: '6px', fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 600 }}
                            />
                          )}
                        </Stack>
                        {(locationLabel || meta.objective) && (
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 280 }}>
                            {locationLabel ?? meta.objective}
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>

                    <TableCell sx={{ py: 1.75, px: 2, whiteSpace: 'nowrap', borderBottom: '1px solid', borderColor: 'divider' }}>
                      <Stack spacing={0.25}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', fontVariantNumeric: 'tabular-nums' }}>
                          {scheduleDate}
                        </Typography>
                        {scheduleWindow && (
                          <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                            {scheduleWindow}
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>

                    <TableCell sx={{ py: 1.75, px: 2, whiteSpace: 'nowrap', borderBottom: '1px solid', borderColor: 'divider' }}>
                      <Stack spacing={0.35} sx={{ alignItems: 'flex-start' }}>
                        {renderAssignmentBadge(bucket)}
                        {bucket !== 'CANCELLED' && (
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem', lineHeight: 1.35 }}>
                            {operationalLabel}
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>

                    <TableCell align="right" sx={{ py: 1.75, px: 2, whiteSpace: 'nowrap', borderBottom: '1px solid', borderColor: 'divider' }}>
                      {finance ? (
                        <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                          {formatNumber(finance.netPayoutAmount)} ₫
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.secondary">—</Typography>
                      )}
                    </TableCell>

                    <TableCell align="right" sx={{ py: 1.75, px: 2, whiteSpace: 'nowrap', borderBottom: '1px solid', borderColor: 'divider' }}>
                      {renderRowActions(row, bucket, false)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
}
