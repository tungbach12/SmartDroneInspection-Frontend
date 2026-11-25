import { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Divider,
  LinearProgress,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import CalendarTodayOutlined from '@mui/icons-material/CalendarTodayOutlined';
import StarRounded from '@mui/icons-material/StarRounded';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import type {
  DashboardActionItem,
  DashboardInspectorWorkload,
  DashboardScheduleSlot,
  DashboardServiceHealth,
  PipelineStage,
} from '../api/dashboardApi';

function toneColors(tone: string) {
  switch (tone) {
    case 'positive':
      return { bgcolor: 'rgba(22, 163, 74, 0.12)', color: '#15803D' };
    case 'warning':
      return { bgcolor: 'rgba(217, 119, 6, 0.12)', color: '#B45309' };
    case 'negative':
      return { bgcolor: 'rgba(220, 38, 38, 0.12)', color: '#B91C1C' };
    default:
      return { bgcolor: 'action.hover', color: 'text.secondary' };
  }
}

export function ServiceFunnelCard({
  title,
  subtitle,
  stages,
}: {
  title: string;
  subtitle?: string;
  stages: PipelineStage[];
}) {
  const { formatNumber } = useLocale();
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.5,
        borderRadius: '10px',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        boxShadow: 'none',
        height: '100%',
      }}
    >
      <Typography component="h2" sx={{ fontSize: '1rem', fontWeight: 600, color: 'text.primary' }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
          {subtitle}
        </Typography>
      )}
      <Stack spacing={1.5} sx={{ mt: 2 }}>
        {stages.map((stage) => (
          <Box key={stage.label}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8125rem' }}>
                {stage.label}
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontWeight: 700, fontSize: '0.8125rem', fontVariantNumeric: 'tabular-nums' }}
              >
                {formatNumber(stage.count)}
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={Math.max(stage.count > 0 ? 6 : 0, stage.percentage)}
              sx={{
                height: 7,
                borderRadius: '4px',
                bgcolor: 'action.hover',
                '& .MuiLinearProgress-bar': {
                  borderRadius: '4px',
                  bgcolor: stage.color || 'primary.main',
                },
              }}
            />
          </Box>
        ))}
      </Stack>
    </Paper>
  );
}

export function ManagerActionQueueCard({ items }: { items: DashboardActionItem[] }) {
  const { locale } = useLocale();
  const tr = (vi: string, en: string) => (locale === 'vi' ? vi : en);
  const navigate = useNavigate();
  const [tab, setTab] = useState<'QUOTES' | 'REPORTS' | 'RESCHEDULE'>('QUOTES');

  const quotes = items.filter((i) => i.category === 'QUOTES');
  const reports = items.filter((i) => i.category === 'REPORTS');
  const reschedule = items.filter((i) => i.category === 'RESCHEDULE');
  const activeItems = tab === 'QUOTES' ? quotes : tab === 'REPORTS' ? reports : reschedule;

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: '10px',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        boxShadow: 'none',
        overflow: 'hidden',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ px: 2.5, pt: 2, pb: 0.5 }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography component="h2" sx={{ fontSize: '1rem', fontWeight: 600 }}>
            {tr('Việc cần xử lý ngay', 'Action Queue')}
          </Typography>
          <Button
            component={RouterLink}
            to={tab === 'REPORTS' ? '/manager/reports' : '/manager/contracts'}
            size="small"
            endIcon={<ArrowForwardRounded sx={{ fontSize: 15 }} />}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            {tr('Xem tất cả', 'View all')}
          </Button>
        </Stack>
        <Tabs
          value={tab}
          onChange={(_, val: 'QUOTES' | 'REPORTS' | 'RESCHEDULE') => setTab(val)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36, py: 0.75, textTransform: 'none', fontWeight: 600, fontSize: '0.8125rem' } }}
        >
          <Tab value="QUOTES" label={`${tr('Chờ báo giá', 'Quotes')} (${quotes.length})`} />
          <Tab value="REPORTS" label={`${tr('Chờ duyệt báo cáo', 'Reports')} (${reports.length})`} />
          <Tab value="RESCHEDULE" label={`${tr('Cần điều phối', 'Dispatch')} (${reschedule.length})`} />
        </Tabs>
      </Box>
      <Divider />
      <Box sx={{ flex: 1 }}>
        {activeItems.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
            {tr('Không có đầu việc tồn đọng trong mục này.', 'No pending items in this queue.')}
          </Typography>
        ) : (
          <Stack divider={<Divider />}>
            {activeItems.slice(0, 6).map((item, idx) => (
              <Box
                key={`${item.code}-${idx}`}
                onClick={() => navigate(item.link)}
                sx={{
                  px: 2.5,
                  py: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1.5,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                    {item.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                    {item.code} · {item.subtitle}
                  </Typography>
                </Box>
                <Chip
                  size="small"
                  label={item.status}
                  sx={{
                    height: 22,
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    flexShrink: 0,
                    ...toneColors(item.badgeTone),
                  }}
                />
              </Box>
            ))}
          </Stack>
        )}
      </Box>
    </Paper>
  );
}

export function ManagerScheduleAndWorkloadCard({
  schedule,
  workloads,
}: {
  schedule: DashboardScheduleSlot[];
  workloads: DashboardInspectorWorkload[];
}) {
  const { locale } = useLocale();
  const tr = (vi: string, en: string) => (locale === 'vi' ? vi : en);
  const navigate = useNavigate();

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.5,
        borderRadius: '10px',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        boxShadow: 'none',
        height: '100%',
      }}
    >
      <Stack spacing={2.5}>
        <Box>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.25 }}>
            <Typography component="h2" sx={{ fontSize: '1rem', fontWeight: 600 }}>
              {tr('Lịch bay sắp tới', 'Upcoming Flight Schedule')}
            </Typography>
            <Button
              component={RouterLink}
              to="/manager/inspections"
              size="small"
              endIcon={<ArrowForwardRounded sx={{ fontSize: 15 }} />}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              {tr('Lịch bay', 'Schedule')}
            </Button>
          </Stack>
          {schedule.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {tr('Chưa có ca bay nào đang lên lịch.', 'No upcoming scheduled flights.')}
            </Typography>
          ) : (
            <Stack spacing={1}>
              {schedule.slice(0, 4).map((slot) => (
                <Box
                  key={slot.id}
                  onClick={() => navigate(slot.link)}
                  sx={{
                    p: 1.25,
                    borderRadius: '8px',
                    bgcolor: 'action.hover',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1.5,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.selected' },
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                      {slot.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                      {slot.subtitle}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexShrink: 0 }}>
                    <CalendarTodayOutlined sx={{ fontSize: 13, color: 'text.secondary' }} />
                    <Typography variant="caption" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      {slot.timeLabel}
                    </Typography>
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </Box>

        <Divider />

        <Box>
          <Typography component="h3" sx={{ fontSize: '0.9375rem', fontWeight: 600, mb: 1.25 }}>
            {tr('Tải công việc Inspector', 'Inspector Workload')}
          </Typography>
          {workloads.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {tr('Chưa có đối tác Inspector hoạt động.', 'No active inspectors.')}
            </Typography>
          ) : (
            <Stack spacing={1}>
              {workloads.slice(0, 4).map((w) => (
                <Stack
                  key={w.inspectorName}
                  direction="row"
                  sx={{ justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                      {w.inspectorName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {w.licenseClass}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexShrink: 0 }}>
                    {w.ratingCount > 0 && (
                      <Stack direction="row" spacing={0.25} sx={{ alignItems: 'center' }}>
                        <StarRounded sx={{ fontSize: 15, color: '#F59E0B' }} />
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>
                          {w.averageRating.toFixed(1)}
                        </Typography>
                      </Stack>
                    )}
                    <Chip
                      size="small"
                      label={tr(`${w.activeMissions} ca`, `${w.activeMissions} active`)}
                      color={w.activeMissions === 0 ? 'success' : 'default'}
                      variant="outlined"
                      sx={{ height: 22, fontSize: '0.72rem', fontWeight: 600 }}
                    />
                  </Stack>
                </Stack>
              ))}
            </Stack>
          )}
        </Box>
      </Stack>
    </Paper>
  );
}

export function AdminServiceHealthCard({
  stages,
  services,
}: {
  stages: PipelineStage[];
  services: DashboardServiceHealth[];
}) {
  const { locale, formatNumber } = useLocale();
  const tr = (vi: string, en: string) => (locale === 'vi' ? vi : en);

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.5,
        borderRadius: '10px',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        boxShadow: 'none',
        height: '100%',
      }}
    >
      <Stack spacing={2.5}>
        <Box>
          <Typography component="h2" sx={{ fontSize: '1rem', fontWeight: 600, mb: 1.5 }}>
            {tr('Phân bổ AI & Thiết bị', 'AI & Fleet Breakdown')}
          </Typography>
          <Stack spacing={1.25}>
            {stages.map((s) => (
              <Box key={s.label}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.4 }}>
                  <Typography variant="body2" sx={{ fontSize: '0.8125rem', fontWeight: 500 }}>
                    {s.label}
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.8125rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {formatNumber(s.count)}
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={Math.max(s.count > 0 ? 5 : 0, s.percentage)}
                  sx={{
                    height: 6,
                    borderRadius: '4px',
                    bgcolor: 'action.hover',
                    '& .MuiLinearProgress-bar': { borderRadius: '4px', bgcolor: s.color || 'primary.main' },
                  }}
                />
              </Box>
            ))}
          </Stack>
        </Box>

        <Divider />

        <Box>
          <Typography component="h3" sx={{ fontSize: '0.9375rem', fontWeight: 600, mb: 1.25 }}>
            {tr('Trạng thái dịch vụ', 'Service Status')}
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            {services.map((svc) => (
              <Box
                key={svc.name}
                sx={{
                  p: 1.25,
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.default',
                }}
              >
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary' }} noWrap>
                    {svc.name}
                  </Typography>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      flexShrink: 0,
                      bgcolor: svc.status === 'HEALTHY' ? '#10B981' : '#F59E0B',
                    }}
                  />
                </Stack>
                <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', mt: 0.25 }}>
                  {svc.detail}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Stack>
    </Paper>
  );
}

export function AdminActionListCard({
  title,
  emptyText,
  viewAllLink,
  viewAllLabel,
  items,
}: {
  title: string;
  emptyText: string;
  viewAllLink: string;
  viewAllLabel: string;
  items: DashboardActionItem[];
}) {
  const navigate = useNavigate();
  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: '10px',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        boxShadow: 'none',
        overflow: 'hidden',
        height: '100%',
      }}
    >
      <Box
        sx={{
          px: 2.5,
          py: 1.75,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography component="h2" sx={{ fontSize: '1rem', fontWeight: 600 }}>
          {title}
        </Typography>
        <Button
          component={RouterLink}
          to={viewAllLink}
          size="small"
          endIcon={<ArrowForwardRounded sx={{ fontSize: 15 }} />}
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          {viewAllLabel}
        </Button>
      </Box>
      {items.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
          {emptyText}
        </Typography>
      ) : (
        <Stack divider={<Divider />}>
          {items.slice(0, 6).map((item, idx) => (
            <Box
              key={`${item.code}-${idx}`}
              onClick={() => navigate(item.link)}
              sx={{
                px: 2.5,
                py: 1.35,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1.5,
                cursor: 'pointer',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                  {item.title}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                  {item.code} · {item.subtitle}
                </Typography>
              </Box>
              <Chip
                size="small"
                label={item.status}
                sx={{
                  height: 22,
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  flexShrink: 0,
                  ...toneColors(item.badgeTone),
                }}
              />
            </Box>
          ))}
        </Stack>
      )}
    </Paper>
  );
}

export function DefectSeverityDonutCard({
  criticalHigh,
  medium,
  low,
}: {
  criticalHigh: number;
  medium: number;
  low: number;
}) {
  const { locale, formatNumber } = useLocale();
  const tr = (vi: string, en: string) => (locale === 'vi' ? vi : en);
  const total = criticalHigh + medium + low;
  const r = 46;
  const circ = 2 * Math.PI * r;
  const segments = [
    {
      label: tr('Nghiêm trọng (High/Critical)', 'Critical / High'),
      count: criticalHigh,
      color: '#F04438',
      trackBg: 'rgba(240, 68, 56, 0.12)',
    },
    {
      label: tr('Trung bình (Medium)', 'Medium'),
      count: medium,
      color: '#F79009',
      trackBg: 'rgba(247, 144, 9, 0.14)',
    },
    {
      label: tr('Thấp (Low)', 'Low'),
      count: low,
      color: '#12B76A',
      trackBg: 'rgba(18, 183, 106, 0.12)',
    },
  ];
  const nonZeroCount = segments.filter((s) => s.count > 0).length;
  const gap = nonZeroCount > 1 ? 4 : 0;

  let offset = 0;
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.5,
        borderRadius: '12px',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        boxShadow: 'none',
      }}
    >
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography component="h2" sx={{ fontSize: '1rem', fontWeight: 600, color: 'text.primary' }}>
            {tr('Mức độ khuyết tật công trình', 'Asset Defect Health')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {tr('Tổng hợp phát hiện gần đây', 'Across recent inspections')}
          </Typography>
        </Box>
        <Chip
          size="small"
          label={
            criticalHigh > 0
              ? tr(`${criticalHigh} nghiêm trọng`, `${criticalHigh} critical`)
              : tr('Ổn định', 'Healthy')
          }
          sx={{
            height: 22,
            fontSize: '0.72rem',
            fontWeight: 700,
            ...(criticalHigh > 0
              ? { bgcolor: 'rgba(240, 68, 56, 0.12)', color: '#B91C1C' }
              : { bgcolor: 'rgba(18, 183, 106, 0.12)', color: '#15803D' }),
          }}
        />
      </Stack>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2.5}
        sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}
      >
        <Box sx={{ position: 'relative', width: 118, height: 118, flexShrink: 0, mx: { xs: 'auto', sm: 0 } }}>
          <svg viewBox="0 0 120 120" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
            <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(148,163,184,0.18)" strokeWidth="13" />
            {total > 0 &&
              segments.map((seg) => {
                if (seg.count <= 0) return null;
                const rawDash = (seg.count / total) * circ;
                const visibleDash = Math.max(2, rawDash - gap);
                const el = (
                  <circle
                    key={seg.label}
                    cx="60"
                    cy="60"
                    r={r}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth="13"
                    strokeLinecap={nonZeroCount === 1 ? 'butt' : 'round'}
                    strokeDasharray={`${visibleDash} ${circ - visibleDash}`}
                    strokeDashoffset={-(offset + gap / 2)}
                  />
                );
                offset += rawDash;
                return el;
              })}
          </svg>
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
              {formatNumber(total)}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', mt: 0.25 }}>
              {tr('phát hiện', 'findings')}
            </Typography>
          </Box>
        </Box>

        <Stack spacing={1.25} sx={{ flex: 1, minWidth: 0 }}>
          {segments.map((seg) => {
            const pct = total > 0 ? Math.round((seg.count / total) * 100) : 0;
            return (
              <Box key={seg.label}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 1, mb: 0.4 }}>
                  <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: seg.color, flexShrink: 0 }} />
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }} noWrap>
                      {seg.label}
                    </Typography>
                  </Stack>
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 700, color: 'text.primary', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}
                  >
                    {formatNumber(seg.count)}{' '}
                    <Box component="span" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                      ({pct}%)
                    </Box>
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={pct}
                  sx={{
                    height: 5,
                    borderRadius: '4px',
                    bgcolor: seg.trackBg,
                    '& .MuiLinearProgress-bar': {
                      borderRadius: '4px',
                      bgcolor: seg.color,
                    },
                  }}
                />
              </Box>
            );
          })}
        </Stack>
      </Stack>
    </Paper>
  );
}
