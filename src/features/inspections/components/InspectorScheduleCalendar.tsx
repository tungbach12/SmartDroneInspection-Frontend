import { useState, useMemo } from 'react';
import {
  Box,
  Button,
  Collapse,
  Divider,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { useInspections } from '../hooks/useInspections';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { StatusChip } from '@/shared/ui/StatusChip';
import type { InspectionListItem, InspectionStatus, ReportStatus } from '../api/inspectionApi';

export interface InspectorScheduleCalendarProps {
  onSelectInspection: (inspectionId: string) => void;
  initialDate?: Date;
}

type CalendarViewMode = 'month' | 'week' | 'agenda' | 'year';

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

function formatTimeRange(
  startIso: string | null | undefined,
  endIso: string | null | undefined,
): string {
  const start = formatTime(startIso);
  const end = formatTime(endIso);
  if (start && end) return `${start} - ${end}`;
  return start;
}

function getStatusColors(
  status: InspectionStatus,
  reportStatus?: ReportStatus | null,
): {
  bg: string;
  accent: string;
} {
  if (reportStatus === 'PUBLISHED' || status === 'COMPLETED') {
    return { bg: 'rgba(16, 185, 129, 0.10)', accent: '#10B981' };
  }
  switch (status) {
    case 'SCHEDULED':
      return { bg: 'rgba(55, 88, 249, 0.08)', accent: '#3758F9' };
    case 'IN_PROGRESS':
    case 'UNDER_REVIEW':
      return { bg: 'rgba(239, 68, 68, 0.09)', accent: '#EF4444' };
    case 'FIELD_COMPLETED':
      return { bg: 'rgba(245, 158, 11, 0.10)', accent: '#F59E0B' };
    case 'CANCELLED':
    default:
      return { bg: 'rgba(113, 113, 122, 0.10)', accent: '#71717A' };
  }
}

export function InspectorScheduleCalendar({
  onSelectInspection,
  initialDate = new Date(),
}: InspectorScheduleCalendarProps) {
  const { t, formatDateTime } = useLocale();

  const [currentDate, setCurrentDate] = useState<Date>(initialDate);
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [statusFilter] = useState<string>('ALL');
  const [showUnscheduled, setShowUnscheduled] = useState<boolean>(true);

  // Fetch up to 100 inspections for the current inspector scope
  const inspectionsQuery = useInspections({ page: 1, pageSize: 100 });
  const allItems = useMemo(() => inspectionsQuery.data?.items ?? [], [inspectionsQuery.data?.items]);

  // Filter items by status if selected
  const filteredItems = useMemo(() => {
    if (statusFilter === 'ALL') return allItems;
    if (statusFilter === 'UNDER_REVIEW') {
      return allItems.filter(
        (item) =>
          item.status === 'UNDER_REVIEW' ||
          item.pendingAction === 'REPORT_REVIEW' ||
          item.reportStatus === 'SUBMITTED',
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
    } else if (viewMode === 'year') {
      setCurrentDate(new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), 1));
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
    } else if (viewMode === 'year') {
      setCurrentDate(new Date(currentDate.getFullYear() + 1, currentDate.getMonth(), 1));
    } else {
      const next = new Date(currentDate);
      next.setDate(next.getDate() + 14);
      setCurrentDate(next);
    }
  };

  // Month grid calculations (Sunday-first 7-column grid matching NextAdmin Calendar)
  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Sunday as first day of week (0=Sun, 1=Mon, ..., 6=Sat)
    const startDayOfWeek = firstDayOfMonth.getDay();

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

  // Week days calculation (Sunday-first)
  const weekDays = useMemo(() => {
    const curr = new Date(currentDate);
    const dayOfWeek = curr.getDay();

    const sunday = new Date(curr);
    sunday.setDate(curr.getDate() - dayOfWeek);

    const days: Array<{ date: Date; dateKey: string; isToday: boolean }> = [];
    const todayKey = toDateKey(new Date());

    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      days.push({
        date: d,
        dateKey: toDateKey(d),
        isToday: toDateKey(d) === todayKey,
      });
    }

    return days;
  }, [currentDate]);

  const monthNames = useMemo(
    () => [
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
    ],
    [t],
  );

  // Month header label
  const monthHeaderLabel = useMemo(() => {
    return `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  }, [currentDate, monthNames]);

  const weekDayHeaders = [
    t('Sun'),
    t('Mon'),
    t('Tue'),
    t('Wed'),
    t('Thu'),
    t('Fri'),
    t('Sat'),
  ];

  const getSwitcherButtonSx = (active: boolean) => ({
    bgcolor: active ? 'background.paper' : 'transparent',
    color: active ? 'text.primary' : 'text.secondary',
    boxShadow: active ? '0 1px 2px 0 rgba(16, 24, 40, 0.05)' : 'none',
    borderRadius: '6px',
    px: 1.5,
    py: 0.5,
    fontSize: '0.875rem',
    fontWeight: 500,
    textTransform: 'none',
    minWidth: 'auto',
    '&:hover': {
      bgcolor: active ? 'background.paper' : 'transparent',
      color: 'text.primary',
    },
  });

  return (
    <Box sx={{ width: '100%' }}>
      {/* Unified NextAdmin Calendar Card */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: '12px',
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          overflow: 'hidden',
          boxShadow: 'none',
        }}
      >
        {/* Top Toolbar Inside the Calendar Card */}
        <Box
          sx={{
            p: { xs: 2, sm: 2.5 },
            borderBottom: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          {/* Left: Prev/Next Chevron Buttons & Month/Year Title */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2.5,
              width: { xs: '100%', sm: 'auto' },
              justifyContent: { xs: 'space-between', sm: 'flex-start' },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <IconButton
                onClick={handlePrev}
                aria-label={t('Previous')}
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  color: 'text.primary',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M12.5 4.58335L7.5 10L12.5 15.4167"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </IconButton>
              <IconButton
                onClick={handleNext}
                aria-label={t('Next')}
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  color: 'text.primary',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M7.5 15.4166L12.5 9.99998L7.5 4.58331"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </IconButton>
            </Box>
            <Typography
              component="h2"
              sx={{
                fontSize: '1rem',
                lineHeight: '1.5rem',
                fontWeight: 600,
                color: 'text.primary',
                letterSpacing: '-0.2px',
              }}
            >
              {monthHeaderLabel}
            </Typography>
          </Box>

          {/* Right: Segmented View Switcher & Primary Action Button */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              width: { xs: '100%', sm: 'auto' },
              justifyContent: { xs: 'space-between', sm: 'flex-end' },
            }}
          >
            <Box
              role="group"
              aria-label={t('Calendar view mode')}
              sx={{
                display: 'flex',
                alignItems: 'center',
                borderRadius: '8px',
                bgcolor: 'background.default',
                p: '4px',
              }}
            >
              <Button
                disableElevation
                onClick={() => setViewMode('month')}
                sx={getSwitcherButtonSx(viewMode === 'month')}
              >
                {t('Month')}
              </Button>
              <Button
                disableElevation
                onClick={() => setViewMode('week')}
                sx={getSwitcherButtonSx(viewMode === 'week')}
              >
                {t('Week')}
              </Button>
              <Button
                disableElevation
                aria-label={t('Agenda')}
                onClick={() => setViewMode('agenda')}
                sx={getSwitcherButtonSx(viewMode === 'agenda')}
              >
                {t('Day')}
              </Button>
              <Button
                disableElevation
                onClick={() => setViewMode('year')}
                sx={getSwitcherButtonSx(viewMode === 'year')}
              >
                {t('Year')}
              </Button>
            </Box>

            <Button
              onClick={goToToday}
              sx={{
                height: 36,
                px: 1.75,
                borderRadius: '8px',
                bgcolor: '#3758F9',
                '&:hover': { bgcolor: '#2237EE' },
                color: '#FFFFFF',
                fontSize: '0.875rem',
                fontWeight: 500,
                textTransform: 'none',
                boxShadow: 'none',
              }}
            >
              + {t('Today')}
            </Button>
          </Box>
        </Box>

        {/* Main Calendar View Area: Month Grid */}
        {viewMode === 'month' && (
          <Box>
            {/* Weekday Header Row */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                bgcolor: 'background.paper',
                borderBottom: '1px solid',
                borderColor: 'divider',
              }}
            >
              {weekDayHeaders.map((day, idx) => (
                <Box
                  key={day}
                  sx={{
                    py: 1.75,
                    textAlign: 'center',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: 'text.secondary',
                    borderRight: idx < 6 ? '1px solid' : 'none',
                    borderColor: 'divider',
                  }}
                >
                  {day}
                </Box>
              ))}
            </Box>

            {/* Month Days Grid */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
              }}
            >
              {monthDays.map((cell, idx) => {
                const dayItems = scheduledMap.get(cell.dateKey) ?? [];
                return (
                  <Box
                    key={cell.dateKey}
                    sx={{
                      minHeight: { xs: 95, sm: 120, md: 135 },
                      p: '8px 10px',
                      borderRight: idx % 7 < 6 ? '1px solid' : 'none',
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'background.paper',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'background-color 150ms ease',
                      '&:hover': {
                        bgcolor: 'rgba(0, 0, 0, 0.01)',
                      },
                    }}
                  >
                    {/* Day Number in Top-Right */}
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                      <Typography
                        component="span"
                        sx={{
                          fontSize: '0.875rem',
                          fontWeight: cell.isToday ? 700 : 500,
                          color: cell.isToday
                            ? '#3758F9'
                            : cell.isCurrentMonth
                              ? 'text.primary'
                              : 'text.disabled',
                          ...(cell.isToday && {
                            bgcolor: 'rgba(55, 88, 249, 0.10)',
                            px: 0.875,
                            py: 0.125,
                            borderRadius: '6px',
                          }),
                        }}
                      >
                        {cell.date.getDate()}
                      </Typography>
                    </Box>

                    {/* NextAdmin Event Cards inside Day Cells */}
                    <Stack spacing={0.75} sx={{ overflowY: 'auto', flex: 1 }}>
                      {dayItems.slice(0, 3).map((item) => {
                        const colors = getStatusColors(item.status, item.reportStatus);
                        const timeRangeStr = formatTimeRange(item.plannedStartAt, item.plannedEndAt);
                        const label =
                          item.objective ||
                          item.assetName ||
                          `${t('Inspection')} #${item.id.slice(0, 8)}`;
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
                                borderRadius: '6px',
                                p: '6px 10px 6px 12px',
                                position: 'relative',
                                cursor: 'pointer',
                                bgcolor: colors.bg,
                                transition: 'opacity 120ms ease',
                                '&::before': {
                                  content: '""',
                                  position: 'absolute',
                                  left: 4,
                                  top: 6,
                                  bottom: 6,
                                  width: '3.5px',
                                  borderRadius: '4px',
                                  bgcolor: colors.accent,
                                },
                                '&:hover': {
                                  opacity: 0.88,
                                },
                              }}
                            >
                              <Typography
                                noWrap
                                sx={{
                                  fontSize: '0.8125rem',
                                  fontWeight: 500,
                                  color: 'text.primary',
                                }}
                              >
                                {label}
                              </Typography>
                              {timeRangeStr && (
                                <Typography
                                  noWrap
                                  sx={{
                                    fontSize: '0.75rem',
                                    fontWeight: 400,
                                    color: 'text.secondary',
                                    mt: 0.15,
                                  }}
                                >
                                  {timeRangeStr}
                                </Typography>
                              )}
                            </Box>
                          </Tooltip>
                        );
                      })}
                      {dayItems.length > 3 && (
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: '#3758F9',
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
          </Box>
        )}

        {/* Week View Area */}
        {viewMode === 'week' && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
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
                    borderRight: idx < 6 ? '1px solid' : 'none',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                  }}
                >
                  <Box
                    sx={{
                      textAlign: 'center',
                      pb: 1.5,
                      mb: 1.5,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        color: 'text.secondary',
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
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.875rem',
                        fontWeight: col.isToday ? 700 : 500,
                        bgcolor: col.isToday ? 'rgba(55, 88, 249, 0.10)' : 'transparent',
                        color: col.isToday ? '#3758F9' : 'text.primary',
                      }}
                    >
                      {col.date.getDate()}
                    </Box>
                  </Box>

                  <Stack spacing={1}>
                    {dayItems.length === 0 ? (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ textAlign: 'center', mt: 4, display: 'block' }}
                      >
                        {t('No tasks')}
                      </Typography>
                    ) : (
                      dayItems.map((item) => {
                        const colors = getStatusColors(item.status, item.reportStatus);
                        const timeRangeStr = formatTimeRange(item.plannedStartAt, item.plannedEndAt);
                        const label =
                          item.objective ||
                          item.assetName ||
                          `${t('Inspection')} #${item.id.slice(0, 8)}`;
                        return (
                          <Box
                            key={item.id}
                            onClick={() => onSelectInspection(item.id)}
                            sx={{
                              borderRadius: '6px',
                              p: '6px 10px 6px 12px',
                              position: 'relative',
                              cursor: 'pointer',
                              bgcolor: colors.bg,
                              '&::before': {
                                content: '""',
                                position: 'absolute',
                                left: 4,
                                top: 6,
                                bottom: 6,
                                width: '3.5px',
                                borderRadius: '4px',
                                bgcolor: colors.accent,
                              },
                            }}
                          >
                            <Typography
                              sx={{
                                fontSize: '0.8125rem',
                                fontWeight: 500,
                                color: 'text.primary',
                                lineHeight: 1.3,
                              }}
                            >
                              {label}
                            </Typography>
                            {timeRangeStr && (
                              <Typography
                                sx={{
                                  fontSize: '0.75rem',
                                  fontWeight: 400,
                                  color: 'text.secondary',
                                  mt: 0.15,
                                }}
                              >
                                {timeRangeStr}
                              </Typography>
                            )}
                          </Box>
                        );
                      })
                    )}
                  </Stack>
                </Box>
              );
            })}
          </Box>
        )}

        {/* Agenda / Day List Mode */}
        {viewMode === 'agenda' && (
          <Box sx={{ p: 3 }}>
            {filteredItems.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <EventBusyOutlinedIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                <Typography variant="h6" color="text.secondary">
                  {t('No inspections scheduled in this view')}
                </Typography>
              </Box>
            ) : (
              <Stack spacing={1.5}>
                {filteredItems
                  .filter((item) => Boolean(item.plannedStartAt))
                  .sort(
                    (a, b) =>
                      new Date(a.plannedStartAt!).getTime() - new Date(b.plannedStartAt!).getTime(),
                  )
                  .map((item) => {
                    const startDate = item.plannedStartAt ? new Date(item.plannedStartAt) : null;
                    const colors = getStatusColors(item.status, item.reportStatus);
                    const label =
                      item.objective ||
                      item.assetName ||
                      `${t('Inspection')} #${item.id.slice(0, 8)}`;
                    return (
                      <Box
                        key={item.id}
                        onClick={() => onSelectInspection(item.id)}
                        sx={{
                          p: 2,
                           pl: 2.5,
                          borderRadius: '8px',
                          position: 'relative',
                          bgcolor: colors.bg,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 2,
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            left: 6,
                            top: 8,
                            bottom: 8,
                            width: '3.5px',
                            borderRadius: '4px',
                            bgcolor: colors.accent,
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
                                bgcolor: 'background.paper',
                                minWidth: 55,
                              }}
                            >
                              <Typography
                                variant="caption"
                                sx={{
                                  textTransform: 'uppercase',
                                  fontWeight: 600,
                                  color: 'text.secondary',
                                }}
                              >
                                {startDate.toLocaleDateString([], { month: 'short' })}
                              </Typography>
                              <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1 }}>
                                {startDate.getDate()}
                              </Typography>
                            </Box>
                          )}
                          <Box>
                            <Typography
                              sx={{
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                color: 'text.primary',
                              }}
                            >
                              {label}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {item.plannedStartAt
                                ? formatDateTime(new Date(item.plannedStartAt))
                                : t('No time')}
                              {item.plannedEndAt && ` — ${formatTime(item.plannedEndAt)}`}
                            </Typography>
                          </Box>
                        </Stack>
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                          <StatusChip status={item.status} />
                          <ArrowForwardIosIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                        </Stack>
                      </Box>
                    );
                  })}
              </Stack>
            )}
          </Box>
        )}

        {/* Year Overview Mode */}
        {viewMode === 'year' && (
          <Box
            sx={{
              p: 2.5,
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(1, minmax(0, 1fr))',
                sm: 'repeat(2, minmax(0, 1fr))',
                md: 'repeat(4, minmax(0, 1fr))',
              },
              gap: 2,
            }}
          >
            {monthNames.map((mName, mIdx) => {
              const year = currentDate.getFullYear();
              const count = filteredItems.filter((item) => {
                if (!item.plannedStartAt) return false;
                const d = new Date(item.plannedStartAt);
                return d.getFullYear() === year && d.getMonth() === mIdx;
              }).length;
              const isSelectedMonth = currentDate.getMonth() === mIdx;
              return (
                <Box
                  key={mName}
                  onClick={() => {
                    setCurrentDate(new Date(year, mIdx, 1));
                    setViewMode('month');
                  }}
                  sx={{
                    p: 2,
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: isSelectedMonth ? '#3758F9' : 'divider',
                    bgcolor: isSelectedMonth ? 'rgba(55, 88, 249, 0.04)' : 'background.paper',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    '&:hover': { borderColor: '#3758F9' },
                  }}
                >
                  <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'text.primary' }}>
                    {mName}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      color: count > 0 ? '#3758F9' : 'text.secondary',
                    }}
                  >
                    {count}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        )}
      </Paper>

      {/* Unscheduled Inspections Notice */}
      {unscheduledList.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            mt: 2.5,
            p: 2,
            borderRadius: '12px',
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: 'none',
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
                    bgcolor: 'background.default',
                    border: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
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
