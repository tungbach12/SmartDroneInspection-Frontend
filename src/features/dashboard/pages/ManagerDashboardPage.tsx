import { useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import { Link as RouterLink } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useAssets } from '@/features/assets/hooks/useAssets';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { MetricCard } from '@/shared/ui/MetricCard';
import { LyticPerformanceChart } from '../components/LyticPerformanceChart';
import { DashboardHeaderActions } from '../components/LyticHeaderActions';
import {
  ManagerActionQueueCard,
  ManagerScheduleAndWorkloadCard,
  ServiceFunnelCard,
} from '../components/NextAdminWidgets';
import type { RoleId } from '../data/report3DashboardData';
import { useDashboardAnalytics } from '../hooks/useDashboardAnalytics';

export function ManagerDashboardPage({
  availableRoles = ['MANAGER'],
  onRoleChange,
}: {
  availableRoles?: readonly RoleId[];
  onRoleChange?: (role: RoleId) => void;
}) {
  const { locale, t } = useLocale();
  const tr = (vi: string, en: string) => (locale === 'vi' ? vi : en);
  const roles = useAuthStore((state) => state.roles);
  useAssets({ page: 1, pageSize: 50 }, false);

  const analytics = useDashboardAnalytics('MANAGER');
  const [chartView, setChartView] = useState<'REVENUE' | 'VOLUME'>('REVENUE');

  const data = analytics.data;
  const fallbackMetrics = [
    {
      id: 'pending_quotes',
      label: tr('Yêu cầu chờ báo giá', 'Pending quotes'),
      value: '0',
      change: tr('Đang tải', 'Loading'),
      positive: true,
      subtext: '',
      iconType: 'clock',
    },
    {
      id: 'dispatch_queue',
      label: tr('Ca cần điều phối', 'Dispatch queue'),
      value: '0',
      change: tr('Đúng lịch', 'On track'),
      positive: true,
      subtext: '',
      iconType: 'plane',
    },
    {
      id: 'pending_reports',
      label: tr('Báo cáo chờ duyệt', 'Reports to review'),
      value: '0',
      change: tr('Nghiệm thu', 'Review'),
      positive: true,
      subtext: '',
      iconType: 'shield',
    },
    {
      id: 'paid_revenue',
      label: tr('Doanh thu tháng này', 'Monthly revenue'),
      value: '0 ₫',
      change: tr('Đã thanh toán', 'Paid'),
      positive: true,
      subtext: '',
      iconType: 'dollar',
    },
  ];

  const metrics = data?.summaryCards && data.summaryCards.length > 0 ? data.summaryCards : fallbackMetrics;
  const activeChart =
    chartView === 'VOLUME' && data?.secondaryPerformanceChart
      ? data.secondaryPerformanceChart
      : data?.performanceChart ?? {
          headerLabel: tr('DOANH THU THEO THÁNG', 'MONTHLY REVENUE'),
          headlineValue: '0 ₫',
          trendBadge: tr('Chưa có hóa đơn', 'No invoices yet'),
          series1Name: tr('Đã thu (triệu ₫)', 'Paid (M VND)'),
          series1Color: '#3758F9',
          series1Data: Array(12).fill(0),
          series2Name: tr('Tổng hóa đơn (triệu ₫)', 'Invoiced (M VND)'),
          series2Color: '#13B2E4',
          series2Data: Array(12).fill(0),
          months: ['Thg 1', 'Thg 2', 'Thg 3', 'Thg 4', 'Thg 5', 'Thg 6', 'Thg 7', 'Thg 8', 'Thg 9', 'Thg 10', 'Thg 11', 'Thg 12'],
          yTicks: ['0', '1', '2', '3', '4'],
          maxVal: 4,
        };

  const pipelineStages = data?.pipelineStages ?? [];
  const actionItems = data?.actionItems ?? [];
  const upcomingSchedule = data?.upcomingSchedule ?? [];
  const inspectorWorkloads = data?.inspectorWorkloads ?? [];

  const switchableRoles = availableRoles.filter((r) => roles.includes(r));

  return (
    <Box sx={{ width: '100%', maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: { xs: 'flex-start', md: 'center' },
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography
            component="h1"
            sx={{
              color: 'text.primary',
              fontSize: '1.625rem',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
            }}
          >
            {tr('Điều phối & Thương mại', 'Operations & Commercial Overview')}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
          <Button
            component={RouterLink}
            to="/manager/contracts"
            variant="contained"
            size="small"
            endIcon={<ArrowForwardRounded sx={{ fontSize: 16 }} />}
            sx={{
              height: 40,
              px: 1.75,
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 600,
              boxShadow: 'none',
            }}
          >
            {t('Service requests')}
          </Button>
          <DashboardHeaderActions
            currentRole="MANAGER"
            availableRoles={switchableRoles.length > 0 ? switchableRoles : ['MANAGER']}
            onRoleChange={onRoleChange ?? (() => {})}
            onRefresh={() => {
              void analytics.refetch();
            }}
            onExport={() => {
              window.print();
            }}
          />
        </Stack>
      </Box>

      {/* Row 1: 4 Real KPI Cards */}
      <Box
        role="region"
        aria-label={t('Workspace metrics')}
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: `repeat(${Math.min(2, Math.max(1, metrics.length))}, 1fr)`,
            lg: `repeat(${Math.min(4, Math.max(1, metrics.length))}, minmax(0, 1fr))`,
          },
          gap: 2.5,
          mb: 3,
        }}
      >
        {metrics.map((m) => (
          <MetricCard
            key={m.id}
            label={m.label}
            value={m.value}
            change={m.change}
            positive={m.positive}
            showTrend={m.value !== '0'}
            iconType={m.iconType}
          />
        ))}
      </Box>

      {/* Row 2: 65/35 Split — Revenue & Volume Chart + Service Pipeline Funnel */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.85fr) minmax(300px, 1fr)' },
          gap: 2.5,
          mb: 3,
          alignItems: 'stretch',
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <LyticPerformanceChart
            headerLabel={activeChart.headerLabel}
            headlineValue={activeChart.headlineValue}
            trendBadge={activeChart.trendBadge}
            series1Name={activeChart.series1Name}
            series1Color={activeChart.series1Color}
            series1Data={activeChart.series1Data}
            series2Name={activeChart.series2Name}
            series2Color={activeChart.series2Color}
            series2Data={activeChart.series2Data}
            months={activeChart.months}
            yTicks={activeChart.yTicks}
            maxVal={activeChart.maxVal}
            headerAction={
              data?.secondaryPerformanceChart ? (
                <Stack
                  direction="row"
                  spacing={0.5}
                  sx={{
                    bgcolor: 'action.hover',
                    p: 0.4,
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: 'divider',
                    flexShrink: 0,
                  }}
                >
                  <Button
                    size="small"
                    onClick={() => setChartView('REVENUE')}
                    sx={{
                      px: 1.25,
                      py: 0.35,
                      minHeight: 26,
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      textTransform: 'none',
                      bgcolor: chartView === 'REVENUE' ? 'primary.main' : 'transparent',
                      color: chartView === 'REVENUE' ? '#fff' : 'text.secondary',
                    }}
                  >
                    {tr('Doanh thu', 'Revenue')}
                  </Button>
                  <Button
                    size="small"
                    onClick={() => setChartView('VOLUME')}
                    sx={{
                      px: 1.25,
                      py: 0.35,
                      minHeight: 26,
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      textTransform: 'none',
                      bgcolor: chartView === 'VOLUME' ? 'primary.main' : 'transparent',
                      color: chartView === 'VOLUME' ? '#fff' : 'text.secondary',
                    }}
                  >
                    {tr('Số ca bay', 'Missions')}
                  </Button>
                </Stack>
              ) : undefined
            }
          />
        </Box>

        <ServiceFunnelCard
          title={tr('Phễu tiến độ dịch vụ', 'Service Pipeline')}
          subtitle={tr('Yêu cầu → Báo giá → Ký HĐ → Thanh toán', 'Request → Quote → Signed → Paid')}
          stages={pipelineStages}
        />
      </Box>

      {/* Row 3: 55/45 Split — Action Queue (3 Tabs) + Upcoming Schedule & Inspector Workload */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.2fr) minmax(0, 1fr)' },
          gap: 2.5,
          alignItems: 'stretch',
        }}
      >
        <ManagerActionQueueCard items={actionItems} />
        <ManagerScheduleAndWorkloadCard schedule={upcomingSchedule} workloads={inspectorWorkloads} />
      </Box>
    </Box>
  );
}
