import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Chip,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import {
  useEndRecurringSchedule,
  usePauseRecurringSchedule,
  useRecurringSchedules,
  useResumeRecurringSchedule,
} from '../hooks/useRecurringSchedules';
import { useAssets } from '@/features/assets/hooks/useAssets';
import type { RecurringSchedule, RecurringScheduleFilters, ScheduleStatus } from '../api/recurringScheduleApi';
import { RecurringScheduleDetailDialog } from '../components/RecurringScheduleDetailDialog';
import { EmptyState } from '@/shared/ui/EmptyState';
import { QueryState } from '@/shared/ui/QueryState';
import { useLocale } from '@/shared/i18n/LocaleProvider';

export interface RecurringSchedulesPanelProps {
  onOpenCreateDialog?: () => void;
}

export function RecurringSchedulesPanel({ onOpenCreateDialog }: RecurringSchedulesPanelProps) {
  const { t, formatDate } = useLocale();
  const navigate = useNavigate();

  const [assetFilter, setAssetFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);

  const assetsQuery = useAssets({ page: 1, pageSize: 100 });

  const filters: RecurringScheduleFilters = {
    page,
    size: pageSize,
    status: statusFilter === 'ALL' ? undefined : (statusFilter as ScheduleStatus),
    assetId: assetFilter === 'ALL' ? undefined : assetFilter,
  };

  const schedulesQuery = useRecurringSchedules(filters);
  const pauseMutation = usePauseRecurringSchedule();
  const resumeMutation = useResumeRecurringSchedule();
  const endMutation = useEndRecurringSchedule();

  const isActionPending =
    pauseMutation.isPending || resumeMutation.isPending || endMutation.isPending;

  const items = schedulesQuery.data?.items ?? [];
  const totalCount = schedulesQuery.data?.totalCount ?? 0;

  const handlePause = (schedule: RecurringSchedule) => {
    pauseMutation.mutate(schedule.id);
  };

  const handleResume = (schedule: RecurringSchedule) => {
    resumeMutation.mutate(schedule.id);
  };

  const handleEnd = (schedule: RecurringSchedule) => {
    endMutation.mutate(schedule.id);
  };

  const handleNavigateToInspection = (inspectionId: string) => {
    setSelectedScheduleId(null);
    navigate(`/client/inspections/${inspectionId}`);
  };

  return (
    <Stack spacing={2.5}>
      <Stack
        direction="row"
        spacing={2}
        sx={{
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1.5,
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            select
            size="small"
            label={t('Asset')}
            value={assetFilter}
            onChange={(e) => {
              setAssetFilter(e.target.value);
              setPage(1);
            }}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="ALL">{t('All assets')}</MenuItem>
            {(assetsQuery.data?.items ?? []).map((asset) => (
              <MenuItem key={asset.id} value={asset.id}>
                {asset.name} ({asset.code})
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            size="small"
            label={t('Status filter')}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="ALL">{t('All statuses')}</MenuItem>
            <MenuItem value="ACTIVE">{t('Active')}</MenuItem>
            <MenuItem value="PAUSED">{t('Paused')}</MenuItem>
            <MenuItem value="ENDED">{t('Ended')}</MenuItem>
          </TextField>
        </Stack>

        {onOpenCreateDialog && (
          <Button
            variant="contained"
            startIcon={<EventRepeatIcon />}
            onClick={onOpenCreateDialog}
            sx={{
              borderRadius: '10px',
              px: 2.5,
              py: 1,
              bgcolor: '#3758F9',
              fontSize: '14px',
              fontWeight: 600,
              textTransform: 'none',
              boxShadow: 'none',
              '&:hover': { bgcolor: '#2b45cb' },
            }}
          >
            {t('New Recurring Schedule')}
          </Button>
        )}
      </Stack>

      <QueryState
        isLoading={schedulesQuery.isLoading}
        error={schedulesQuery.error}
        isEmpty={items.length === 0}
        onRetry={() => void schedulesQuery.refetch()}
        loadingLabel={t('Loading recurring schedules…')}
        empty={
          <EmptyState
            title={t('No recurring schedules found')}
            description={
              statusFilter !== 'ALL'
                ? `No schedules found with status "${statusFilter}".`
                : 'Create a recurring schedule to automate routine inspections for your assets.'
            }
          />
        }
      >
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table size="medium">
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>{t('Target Asset')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('Objective & Recurrence')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('Assigned Pair')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('Next Due')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('Status')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('Occurrences')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">
                  {t('Actions')}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((schedule) => (
                <TableRow key={schedule.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {schedule.assetName || schedule.assetId}
                    </Typography>
                    {schedule.assetLocationText && (
                      <Typography variant="caption" color="text.secondary">
                        {schedule.assetLocationText}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {schedule.objective}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t('Every')} {schedule.interval} {schedule.unit.toLowerCase()}(s) · {schedule.timezone}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {schedule.inspectorName || t('Default pair')}
                    </Typography>
                    {schedule.droneSerialNumber && (
                      <Typography variant="caption" color="text.secondary">
                        Drone: {schedule.droneSerialNumber}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {schedule.nextDueAt ? (
                      <Typography variant="body2">
                        {formatDate(schedule.nextDueAt)}
                      </Typography>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        {t('None')}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={schedule.status}
                      size="small"
                      color={
                        schedule.status === 'ACTIVE'
                          ? 'success'
                          : schedule.status === 'PAUSED'
                            ? 'warning'
                            : 'default'
                      }
                      sx={{ fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {schedule.totalGeneratedOccurrences} {t('gen')}
                    </Typography>
                    {schedule.totalBlockedOccurrences > 0 ? (
                      <Typography variant="caption" color="error.main" sx={{ fontWeight: 700 }}>
                        {schedule.totalBlockedOccurrences} {t('blocked')}
                      </Typography>
                    ) : null}
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', alignItems: 'center' }}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => setSelectedScheduleId(schedule.id)}
                        sx={{ textTransform: 'none' }}
                      >
                        {t('Occurrences')}
                      </Button>

                      {schedule.status === 'ACTIVE' && (
                        <Tooltip title={t('Pause schedule')}>
                          <span>
                            <IconButton
                              size="small"
                              color="warning"
                              aria-label="Pause"
                              disabled={isActionPending}
                              onClick={() => handlePause(schedule)}
                            >
                              <PauseIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}

                      {schedule.status === 'PAUSED' && (
                        <Tooltip title={t('Resume schedule')}>
                          <span>
                            <IconButton
                              size="small"
                              color="success"
                              aria-label="Resume"
                              disabled={isActionPending}
                              onClick={() => handleResume(schedule)}
                            >
                              <PlayArrowIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}

                      {schedule.status !== 'ENDED' && (
                        <Tooltip title={t('End schedule')}>
                          <span>
                            <IconButton
                              size="small"
                              color="error"
                              aria-label="End"
                              disabled={isActionPending}
                              onClick={() => handleEnd(schedule)}
                            >
                              <StopIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[5, 10, 20]}
            component="div"
            count={totalCount}
            rowsPerPage={pageSize}
            page={page - 1}
            onPageChange={(_, newPage) => setPage(newPage + 1)}
            onRowsPerPageChange={(e) => {
              setPageSize(parseInt(e.target.value, 10));
              setPage(1);
            }}
          />
        </TableContainer>
      </QueryState>

      {/* Occurrences Detail Dialog */}
      <RecurringScheduleDetailDialog
        open={Boolean(selectedScheduleId)}
        onClose={() => setSelectedScheduleId(null)}
        scheduleId={selectedScheduleId}
        onNavigateToInspection={handleNavigateToInspection}
      />
    </Stack>
  );
}
