import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
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
import CloseIcon from '@mui/icons-material/Close';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import ReplayIcon from '@mui/icons-material/Replay';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  useEndRecurringSchedule,
  usePauseRecurringSchedule,
  useRecurringSchedule,
  useResumeRecurringSchedule,
  useRetryScheduleOccurrence,
  useSkipScheduleOccurrence,
} from '../hooks/useRecurringSchedules';
import type { ScheduleOccurrence } from '../api/recurringScheduleApi';
import { useLocale } from '@/shared/i18n/LocaleProvider';

export interface RecurringScheduleDetailDialogProps {
  open: boolean;
  onClose: () => void;
  scheduleId: string | null;
  onNavigateToInspection?: (inspectionId: string) => void;
}

export function RecurringScheduleDetailDialog({
  open,
  onClose,
  scheduleId,
  onNavigateToInspection,
}: RecurringScheduleDetailDialogProps) {
  const { t, formatDate } = useLocale();
  const scheduleQuery = useRecurringSchedule(scheduleId ?? '', Boolean(scheduleId && open));
  const schedule = scheduleQuery.data;

  const pauseMutation = usePauseRecurringSchedule();
  const resumeMutation = useResumeRecurringSchedule();
  const endMutation = useEndRecurringSchedule();
  const retryMutation = useRetryScheduleOccurrence();
  const skipMutation = useSkipScheduleOccurrence();

  const [skipTarget, setSkipTarget] = useState<ScheduleOccurrence | null>(null);
  const [skipReason, setSkipReason] = useState('');

  const isActionPending =
    pauseMutation.isPending ||
    resumeMutation.isPending ||
    endMutation.isPending ||
    retryMutation.isPending ||
    skipMutation.isPending;

  const handlePause = () => {
    if (!scheduleId) return;
    pauseMutation.mutate(scheduleId);
  };

  const handleResume = () => {
    if (!scheduleId) return;
    resumeMutation.mutate(scheduleId);
  };

  const handleEnd = () => {
    if (!scheduleId) return;
    endMutation.mutate(scheduleId);
  };

  const handleRetryOccurrence = (occ: ScheduleOccurrence) => {
    if (!scheduleId) return;
    retryMutation.mutate({ scheduleId, occurrenceId: occ.id });
  };

  const handleOpenSkipDialog = (occ: ScheduleOccurrence) => {
    setSkipTarget(occ);
    setSkipReason('');
  };

  const handleConfirmSkip = () => {
    if (!scheduleId || !skipTarget || !skipReason.trim()) return;
    skipMutation.mutate(
      {
        scheduleId,
        occurrenceId: skipTarget.id,
        reason: skipReason.trim(),
      },
      {
        onSuccess: () => {
          setSkipTarget(null);
          setSkipReason('');
        },
      },
    );
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6" component="span" sx={{ fontWeight: 700 }}>
              {schedule?.objective || t('Recurring Schedule Details')}
            </Typography>
            {schedule && (
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
                sx={{ ml: 1.5, fontWeight: 600 }}
              />
            )}
          </Box>
          <IconButton aria-label="close" onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {scheduleQuery.isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : !schedule ? (
            <Alert severity="warning">{t('Schedule not found.')}</Alert>
          ) : (
            <Stack spacing={3}>
              {/* Controls bar */}
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                {schedule.status === 'ACTIVE' && (
                  <Button
                    variant="outlined"
                    color="warning"
                    size="small"
                    startIcon={<PauseIcon />}
                    disabled={isActionPending}
                    onClick={handlePause}
                  >
                    {t('Pause')}
                  </Button>
                )}

                {schedule.status === 'PAUSED' && (
                  <Button
                    variant="outlined"
                    color="success"
                    size="small"
                    startIcon={<PlayArrowIcon />}
                    disabled={isActionPending}
                    onClick={handleResume}
                  >
                    {t('Resume')}
                  </Button>
                )}

                {schedule.status !== 'ENDED' && (
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    startIcon={<StopIcon />}
                    disabled={isActionPending}
                    onClick={handleEnd}
                  >
                    {t('End Schedule')}
                  </Button>
                )}
              </Box>

              {/* Schedule Info Grid */}
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#f8fafc' }}>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                    gap: 2,
                  }}
                >
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {t('Target Asset')}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {schedule.assetName || schedule.assetId}
                      {schedule.assetLocationText ? ` (${schedule.assetLocationText})` : ''}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {t('Assigned Pair')}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {schedule.inspectorName || schedule.inspectorId}
                      {schedule.droneSerialNumber ? ` · Drone ${schedule.droneSerialNumber}` : ''}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {t('Recurrence Rule')}
                    </Typography>
                    <Typography variant="body2">
                      {t('Every')} {schedule.interval} {schedule.unit.toLowerCase()}(s) · {schedule.timezone}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {t('Next Due')}
                    </Typography>
                    <Typography variant="body2">
                      {schedule.nextDueAt ? formatDate(schedule.nextDueAt) : t('None')}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {t('Duration & Reminders')}
                    </Typography>
                    <Typography variant="body2">
                      {(schedule.durationSeconds / 3600).toFixed(1)} {t('hours')} · {t('Remind')} {schedule.reminderDays} {t('days before')}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {t('Generated / Blocked Occurrences')}
                    </Typography>
                    <Typography variant="body2">
                      {schedule.totalGeneratedOccurrences} {t('generated')} ·{' '}
                      <span style={{ color: schedule.totalBlockedOccurrences > 0 ? '#dc2626' : 'inherit', fontWeight: schedule.totalBlockedOccurrences > 0 ? 600 : 400 }}>
                        {schedule.totalBlockedOccurrences} {t('blocked')}
                      </span>
                    </Typography>
                  </Box>
                </Box>
              </Paper>

              <Divider />

              {/* Occurrences Section */}
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                  {t('Occurrences')}
                </Typography>

                {(!schedule.occurrences || schedule.occurrences.length === 0) ? (
                  <Typography variant="body2" color="text.secondary">
                    {t('No occurrences generated yet.')}
                  </Typography>
                ) : (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>#</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{t('Planned Window')}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{t('Status')}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{t('Details / Blocked Reason')}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }} align="right">
                            {t('Actions')}
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {schedule.occurrences.map((occ) => (
                          <TableRow key={occ.id}>
                            <TableCell>{occ.occurrenceIndex + 1}</TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {formatDate(occ.plannedStartAt)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {t('to')} {formatDate(occ.plannedEndAt)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={occ.status}
                                size="small"
                                color={
                                  occ.status === 'GENERATED'
                                    ? 'success'
                                    : occ.status === 'BLOCKED'
                                      ? 'error'
                                      : 'default'
                                }
                                sx={{ fontWeight: 600 }}
                              />
                            </TableCell>
                            <TableCell>
                              {occ.blockedReason ? (
                                <Typography variant="body2" color="error.main" sx={{ fontSize: '0.85rem' }}>
                                  {occ.blockedReason}
                                </Typography>
                              ) : occ.inspectionId ? (
                                <Typography variant="caption" color="text.secondary">
                                  {t('Inspection ID:')} {occ.inspectionId.slice(0, 8)}…
                                </Typography>
                              ) : (
                                '—'
                              )}
                            </TableCell>
                            <TableCell align="right">
                              <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                                {occ.status === 'GENERATED' && occ.inspectionId && onNavigateToInspection && (
                                  <Button
                                    size="small"
                                    variant="text"
                                    endIcon={<OpenInNewIcon fontSize="small" />}
                                    onClick={() => onNavigateToInspection(occ.inspectionId!)}
                                  >
                                    {t('View')}
                                  </Button>
                                )}

                                {occ.status === 'BLOCKED' && (
                                  <>
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      color="primary"
                                      startIcon={<ReplayIcon fontSize="small" />}
                                      disabled={isActionPending}
                                      onClick={() => handleRetryOccurrence(occ)}
                                    >
                                      {t('Retry')}
                                    </Button>
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      color="warning"
                                      startIcon={<SkipNextIcon fontSize="small" />}
                                      disabled={isActionPending}
                                      onClick={() => handleOpenSkipDialog(occ)}
                                    >
                                      {t('Skip')}
                                    </Button>
                                  </>
                                )}
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose}>{t('Close')}</Button>
        </DialogActions>
      </Dialog>

      {/* Skip occurrence prompt dialog */}
      <Dialog
        open={Boolean(skipTarget)}
        onClose={() => setSkipTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>{t('Skip Occurrence')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, mt: 1 }}>
            {t('State the reason for skipping this occurrence. This action is recorded permanently.')}
          </Typography>
          <TextField
            autoFocus
            label={t('Skip reason')}
            required
            multiline
            rows={3}
            fullWidth
            value={skipReason}
            onChange={(e) => setSkipReason(e.target.value)}
            placeholder={t('e.g. Asset undergoing unscheduled overhaul')}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setSkipTarget(null)} disabled={skipMutation.isPending}>
            {t('Cancel')}
          </Button>
          <Button
            variant="contained"
            color="warning"
            disabled={!skipReason.trim() || skipMutation.isPending}
            onClick={handleConfirmSkip}
          >
            {skipMutation.isPending ? t('Skipping…') : t('Confirm Skip')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
