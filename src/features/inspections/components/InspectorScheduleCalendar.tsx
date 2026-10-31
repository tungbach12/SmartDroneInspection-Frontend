import { useState, useMemo } from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  Collapse,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TodayIcon from '@mui/icons-material/Today';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewWeekIcon from '@mui/icons-material/ViewWeek';
import ViewAgendaIcon from '@mui/icons-material/ViewAgenda';
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { useInspections } from '../hooks/useInspections';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { StatusChip } from '@/shared/ui/StatusChip';
import type { InspectionListItem, InspectionStatus } from '../api/inspectionApi';

export interface InspectorScheduleCalendarProps {
  onSelectInspection: (inspectionId: string) => void;
  initialDate?: Date;
}

type CalendarViewMode = 'month' | 'week' | 'agenda';

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatTime(isoString: string | null | undefined): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '';
  }
}

function getStatusColors(status: InspectionStatus): {
  bg: string;
  color: string;
  border: string;
  badge: string;
} {
  switch (status) {
    case 'SCHEDULED':
      return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', badge: '#3b82f6' };
    case 'IN_PROGRESS':
      return { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe', badge: '#8b5cf6' };
    case 'FIELD_COMPLETED':
      return { bg: '#f0fdfa', color: '#0f766e', border: '#99f6e4', badge: '#14b8a6' };
    case 'UNDER_REVIEW':
      return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', badge: '#3b82f6' };
    case 'COMPLETED':
      return { bg: '#ecfdf5', color: '#065f46', border: '#6ee7b7', badge: '#059669' };
    case 'CANCELLED':
      return { bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb', badge: '#9ca3af' };
    default:
      return { bg: '#f8fafc', color: '#334155', border: '#e2e8f0', badge: '#94a3b8' };
  }
}

export function InspectorScheduleCalendar({
  onSelectInspection,
  initialDate = new Date(),
}: InspectorScheduleCalendarProps) {
  const { t, formatDateTime } = useLocale();

  const [currentDate, setCurrentDate] = useState<Date>(initialDate);
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [showUnscheduled, setShowUnscheduled] = useState<boolean>(true);

  // Fetch up to 100 inspections for the current inspector scope
  const inspectionsQuery = useInspections({ page: 1, pageSize: 100 });
  const allItems = useMemo(() => inspectionsQuery.data?.items ?? [], [inspectionsQuery.data?.items]);

  // Filter items by status if selected
  const filteredItems = useMemo(() => {
    if (statusFilter === 'ALL') return allItems;
    if (statusFilter === 'UNDER_REVIEW') {
      return allItems.filter(
        (item) => item.status === 'UNDER_REVIEW' || item.pendingAction === 'REPORT_REVIEW' || item.reportStatus === 'SUBMITTED',
      );
    }
    return allItems.filter((item) => item.status === statusFilter);
  }, [allItems, statusFilter]);

  // Group items by date key
  const { scheduledMap, unscheduledList } = useMemo(() => {
    const map = new Map<string, InspectionListItem[]>();
    const unscheduled: InspectionListItem[] = [];

    for (const item of filteredItems) {
      if (item.plannedStartAt) {
        try {
          const d = new Date(item.plannedStartAt);
          const key = toDateKey(d);
          const existing = map.get(key) ?? [];
          existing.push(item);
          map.set(key, existing);
        } catch {
          unscheduled.push(item);
        }
      } else {
        unscheduled.push(item);
      }
    }

    return { scheduledMap: map, unscheduledList: unscheduled };
  }, [filteredItems]);

  // Calendar navigation
  const goToToday = () => setCurrentDate(new Date());

  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else if (viewMode === 'week') {
      const next = new Date(currentDate);
      next.setDate(next.getDate() - 7);
      setCurrentDate(next);
    } else {
      const next = new Date(currentDate);
      next.setDate(next.getDate() - 14);
      setCurrentDate(next);
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else if (viewMode === 'week') {
      const next = new Date(currentDate);
      next.setDate(next.getDate() + 7);
      setCurrentDate(next);
    } else {
      const next = new Date(currentDate);
      next.setDate(next.getDate() + 14);
      setCurrentDate(next);
    }
  };

  // Month grid calculations
  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Monday as first day of week (0=Sun, 1=Mon, ..., 6=Sat)
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6; // Sunday becomes 6

    const days: Array<{ date: Date; isCurrentMonth: boolean; dateKey: string; isToday: boolean }> = [];
    const todayKey = toDateKey(new Date());

    // Previous month padding days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({
        date: d,
        isCurrentMonth: false,
        dateKey: toDateKey(d),
        isToday: toDateKey(d) === todayKey,
      });
    }

    // Current month days
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      const d = new Date(year, month, i);
      days.push({
        date: d,
        isCurrentMonth: true,
        dateKey: toDateKey(d),
        isToday: toDateKey(d) === todayKey,
      });
    }

    // Next month padding days to complete 7-column rows
    const totalCells = days.length <= 35 ? 35 : 42;
    const remaining = totalCells - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({
        date: d,
        isCurrentMonth: false,
        dateKey: toDateKey(d),
        isToday: toDateKey(d) === todayKey,
      });
    }

    return days;
  }, [currentDate]);

  // Week days calculation
  const weekDays = useMemo(() => {
    const curr = new Date(currentDate);
    let dayOfWeek = curr.getDay() - 1;
    if (dayOfWeek === -1) dayOfWeek = 6;

    const monday = new Date(curr);
    monday.setDate(curr.getDate() - dayOfWeek);

    const days: Array<{ date: Date; dateKey: string; isToday: boolean }> = [];
    const todayKey = toDateKey(new Date());

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push({
        date: d,
        dateKey: toDateKey(d),
        isToday: toDateKey(d) === todayKey,
      });
    }

    return days;
  }, [currentDate]);

  // Month header label
  const monthHeaderLabel = useMemo(() => {
    const monthNames = [
      t('January'),
      t('February'),
      t('March'),
      t('April'),
      t('May'),
      t('June'),
      t('July'),
      t('August'),
      t('September'),
      t('October'),
      t('November'),
      t('December'),
    ];
    return `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  }, [currentDate, t]);

  const weekDayHeaders = [
    t('Mon'),
    t('Tue'),
    t('Wed'),
    t('Thu'),
    t('Fri'),
    t('Sat'),
    t('Sun'),
  ];

  return (
    <Box sx={{ width: '100%' }}>
      {/* Calendar Control Toolbar */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 2.5,
          borderRadius: '12px',
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'stretch', md: 'center' },
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        {/* Navigation & Month Title */}
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <IconButton onClick={handlePrev} size="small" aria-label={t('Previous')}>
            <ChevronLeftIcon />
          </IconButton>
          <Typography variant="h6" sx={{ fontWeight: 700, minWidth: 170, textAlign: 'center' }}>
            {monthHeaderLabel}
          </Typography>
          <IconButton onClick={handleNext} size="small" aria-label={t('Next')}>
            <ChevronRightIcon />
          </IconButton>
          <Button
            variant="outlined"
            size="small"
            startIcon={<TodayIcon />}
            onClick={goToToday}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
          >
            {t('Today')}
          </Button>
        </Stack>

        {/* View mode toggle & Status filter */}
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            select
            size="small"
            label={t('Filter status')}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="ALL">{t('All statuses')}</MenuItem>
            <MenuItem value="SCHEDULED">{t('Scheduled')}</MenuItem>
            <MenuItem value="IN_PROGRESS">{t('In Progress')}</MenuItem>
            <MenuItem value="FIELD_COMPLETED">{t('Field Completed')}</MenuItem>
            <MenuItem value="UNDER_REVIEW">{t('Under Review')}</MenuItem>
            <MenuItem value="COMPLETED">{t('Completed')}</MenuItem>
            <MenuItem value="CANCELLED">{t('Cancelled')}</MenuItem>
          </TextField>

          <ButtonGroup size="small" variant="outlined" aria-label={t('Calendar view mode')}>
            <Button
              variant={viewMode === 'month' ? 'contained' : 'outlined'}
              startIcon={<ViewModuleIcon />}
              onClick={() => setViewMode('month')}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              {t('Month')}
            </Button>
            <Button
              variant={viewMode === 'week' ? 'contained' : 'outlined'}
              startIcon={<ViewWeekIcon />}
              onClick={() => setViewMode('week')}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              {t('Week')}
            </Button>
            <Button
              variant={viewMode === 'agenda' ? 'contained' : 'outlined'}
              startIcon={<ViewAgendaIcon />}
              onClick={() => setViewMode('agenda')}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              {t('Agenda')}
            </Button>
          </ButtonGroup>
        </Stack>
      </Paper>

      {/* Main Calendar View Area */}
      {viewMode === 'month' && (
        <Paper
          elevation={0}
          sx={{
            borderRadius: '16px',
            border: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden',
            bgcolor: 'background.paper',
          }}
        >
          {/* Weekday Header Row */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              bgcolor: '#f8fafc',
              borderBottom: '1px solid',
              borderColor: 'divider',
              textAlign: 'center',
              py: 1.25,
            }}
          >
            {weekDayHeaders.map((day, idx) => (
              <Typography
                key={day}
                variant="caption"
                sx={{
                  fontWeight: 700,
                  color: idx >= 5 ? 'error.main' : 'text.secondary',
                  letterSpacing: '0.04em',
                }}
              >
                {day}
              </Typography>
            ))}
          </Box>

          {/* Month Days Grid */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            {monthDays.map((cell) => {
              const dayItems = scheduledMap.get(cell.dateKey) ?? [];
              return (
                <Box
                  key={cell.dateKey}
                  sx={{
                    minHeight: { xs: 80, sm: 110, md: 130 },
                    p: 1,
                    borderRight: '1px solid',
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    bgcolor: cell.isToday ? 'rgba(55, 88, 249, 0.03)' : cell.isCurrentMonth ? 'background.paper' : '#fcfdfe',
                    opacity: cell.isCurrentMonth ? 1 : 0.45,
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'background-color 150ms ease',
                    '&:hover': {
                      bgcolor: cell.isCurrentMonth ? 'rgba(0, 0, 0, 0.015)' : undefined,
                    },
                  }}
                >
                  {/* Day Number Header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: cell.isToday ? 700 : 500,
                        bgcolor: cell.isToday ? 'primary.main' : 'transparent',
                        color: cell.isToday ? '#ffffff' : 'text.primary',
                      }}
                    >
                      {cell.date.getDate()}
                    </Box>
                    {dayItems.length > 0 && (
                      <Typography variant="caption" sx={{ fontSize: '0.6875rem', fontWeight: 600, color: 'text.secondary' }}>
                        {dayItems.length}
                      </Typography>
                    )}
                  </Box>

                  {/* Scheduled Inspection Chips */}
                  <Stack spacing={0.5} sx={{ overflowY: 'auto', flex: 1, pr: 0.25 }}>
                    {dayItems.slice(0, 3).map((item) => {
                      const colors = getStatusColors(item.status);
                      const timeStr = formatTime(item.plannedStartAt);
                      const label = item.objective || `${t('Inspection')} #${item.id.slice(0, 8)}`;
                      return (
                        <Tooltip
                          key={item.id}
                          title={`${label} (${t(item.status)})`}
                          arrow
                          placement="top"
                        >
                          <Box
                            onClick={() => onSelectInspection(item.id)}
                            sx={{
                              p: '3px 6px',
                              borderRadius: '6px',
                              bgcolor: colors.bg,
                              color: colors.color,
                              border: `1px solid ${colors.border}`,
                              fontSize: '0.6875rem',
                              fontWeight: 600,
                              lineHeight: 1.25,
                              cursor: 'pointer',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.5,
                              transition: 'all 120ms ease',
                              '&:hover': {
                                boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                                transform: 'translateY(-1px)',
                              },
                            }}
                          >
                            <Box
                              sx={{
                                width: 5,
                                height: 5,
                                borderRadius: '50%',
                                bgcolor: colors.badge,
                                flexShrink: 0,
                              }}
                            />
                            {timeStr && <span>{timeStr}</span>}
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
                          </Box>
                        </Tooltip>
                      );
                    })}
                    {dayItems.length > 3 && (
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: '0.6875rem',
                          fontWeight: 600,
                          color: 'primary.main',
                          cursor: 'pointer',
                          textAlign: 'center',
                        }}
                        onClick={() => dayItems[3] && onSelectInspection(dayItems[3].id)}
                      >
                        +{dayItems.length - 3} {t('more')}
                      </Typography>
                    )}
                  </Stack>
                </Box>
              );
            })}
          </Box>
        </Paper>
      )}

      {/* Week View Area */}
      {viewMode === 'week' && (
        <Paper
          elevation={0}
          sx={{
            borderRadius: '16px',
            border: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden',
            bgcolor: 'background.paper',
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            {weekDays.map((col, idx) => {
              const dayItems = scheduledMap.get(col.dateKey) ?? [];
              return (
                <Box
                  key={col.dateKey}
                  sx={{
                    minHeight: 380,
                    p: 1.5,
                    borderRight: '1px solid',
                    borderColor: 'divider',
                    bgcolor: col.isToday ? 'rgba(55, 88, 249, 0.02)' : 'background.paper',
                  }}
                >
                  <Box sx={{ textAlign: 'center', pb: 1.5, mb: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 700,
                        color: idx >= 5 ? 'error.main' : 'text.secondary',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {weekDayHeaders[idx]}
                    </Typography>
                    <Box
                      sx={{
                        mx: 'auto',
                        mt: 0.5,
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.8125rem',
                        fontWeight: 700,
                        bgcolor: col.isToday ? 'primary.main' : 'transparent',
                        color: col.isToday ? '#ffffff' : 'text.primary',
                      }}
                    >
                      {col.date.getDate()}
                    </Box>
                  </Box>

                  <Stack spacing={1}>
                    {dayItems.length === 0 ? (
                      <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', mt: 4, display: 'block' }}>
                        {t('No tasks')}
                      </Typography>
                    ) : (
                      dayItems.map((item) => {
                        const colors = getStatusColors(item.status);
                        return (
                          <Paper
                            key={item.id}
                            elevation={0}
                            onClick={() => onSelectInspection(item.id)}
                            sx={{
                              p: 1.25,
                              borderRadius: '8px',
                              bgcolor: colors.bg,
                              border: `1px solid ${colors.border}`,
                              cursor: 'pointer',
                              transition: 'all 120ms ease',
                              '&:hover': {
                                boxShadow: '0 3px 8px rgba(0,0,0,0.08)',
                                transform: 'translateY(-1px)',
                              },
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 700,
                                fontSize: '0.75rem',
                                color: colors.color,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                              }}
                            >
                              <AccessTimeIcon sx={{ fontSize: 13 }} />
                              {formatTime(item.plannedStartAt)}
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 600,
                                fontSize: '0.8125rem',
                                color: '#1e293b',
                                mt: 0.5,
                                lineHeight: 1.3,
                              }}
                            >
                              {item.objective || `${t('Inspection')} #${item.id.slice(0, 8)}`}
                            </Typography>
                            <Box sx={{ mt: 1 }}>
                              <StatusChip status={item.status} size="small" />
                            </Box>
                          </Paper>
                        );
                      })
                    )}
                  </Stack>
                </Box>
              );
            })}
          </Box>
        </Paper>
      )}

      {/* Agenda / List Mode */}
      {viewMode === 'agenda' && (
        <Paper
          elevation={0}
          sx={{
            borderRadius: '16px',
            border: '1px solid',
            borderColor: 'divider',
            p: 3,
            bgcolor: 'background.paper',
          }}
        >
          {filteredItems.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <EventBusyOutlinedIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography variant="h6" color="text.secondary">
                {t('No inspections scheduled in this view')}
              </Typography>
            </Box>
          ) : (
            <Stack spacing={2}>
              {filteredItems
                .filter((item) => Boolean(item.plannedStartAt))
                .sort((a, b) => new Date(a.plannedStartAt!).getTime() - new Date(b.plannedStartAt!).getTime())
                .map((item) => {
                  const startDate = item.plannedStartAt ? new Date(item.plannedStartAt) : null;
                  return (
                    <Paper
                      key={item.id}
                      variant="outlined"
                      onClick={() => onSelectInspection(item.id)}
                      sx={{
                        p: 2,
                        borderRadius: '10px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 2,
                        transition: 'all 120ms ease',
                        '&:hover': {
                          borderColor: 'primary.main',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                        },
                      }}
                    >
                      <Stack direction="row" spacing={2.5} sx={{ alignItems: 'center' }}>
                        {startDate && (
                          <Box
                            sx={{
                              textAlign: 'center',
                              p: 1,
                              borderRadius: '8px',
                              bgcolor: '#f1f5f9',
                              minWidth: 55,
                            }}
                          >
                            <Typography variant="caption" sx={{ textTransform: 'uppercase', fontWeight: 700, color: 'text.secondary' }}>
                              {startDate.toLocaleDateString([], { month: 'short' })}
                            </Typography>
                            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1 }}>
                              {startDate.getDate()}
                            </Typography>
                          </Box>
                        )}
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a' }}>
                            {item.objective || `${t('Inspection')} #${item.id.slice(0, 8)}`}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {item.plannedStartAt ? formatDateTime(new Date(item.plannedStartAt)) : t('No time')}
                            {item.plannedEndAt && ` — ${formatTime(item.plannedEndAt)}`}
                          </Typography>
                        </Box>
                      </Stack>
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                        <StatusChip status={item.status} />
                        <ArrowForwardIosIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                      </Stack>
                    </Paper>
                  );
                })}
            </Stack>
          )}
        </Paper>
      )}

      {/* Unscheduled Inspections Notice */}
      {unscheduledList.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            mt: 2.5,
            p: 2,
            borderRadius: '12px',
            bgcolor: '#ffffff',
            border: '1px solid',
            borderColor: '#e2e8f0',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}
            onClick={() => setShowUnscheduled(!showUnscheduled)}
          >
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <EventBusyOutlinedIcon color="warning" />
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {t('Unscheduled Inspections')} ({unscheduledList.length})
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('These inspections are assigned but do not have a planned calendar date yet.')}
                </Typography>
              </Box>
            </Stack>
            <Button size="small" sx={{ textTransform: 'none' }}>
              {showUnscheduled ? t('Hide') : t('Show')}
            </Button>
          </Box>

          <Collapse in={showUnscheduled}>
            <Divider sx={{ my: 1.5 }} />
            <Stack spacing={1}>
              {unscheduledList.map((item) => (
                <Box
                  key={item.id}
                  onClick={() => onSelectInspection(item.id)}
                  sx={{
                    p: 1.25,
                    borderRadius: '8px',
                    bgcolor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: '#f1f5f9' },
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {item.objective || `${t('Inspection')} #${item.id.slice(0, 8)}`}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <StatusChip status={item.status} size="small" />
                    <Button size="small" sx={{ textTransform: 'none', fontWeight: 600 }}>
                      {t('View')}
                    </Button>
                  </Stack>
                </Box>
              ))}
            </Stack>
          </Collapse>
        </Paper>
      )}
    </Box>
  );
}
