import { Box, Typography } from '@mui/material';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useAssets } from '@/features/assets/hooks/useAssets';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { MetricCard } from '@/shared/ui/MetricCard';
import { LyticPerformanceChart } from '../components/LyticPerformanceChart';
import { DashboardHeaderActions } from '../components/LyticHeaderActions';
import {
  AdminActionListCard,
  AdminServiceHealthCard,
} from '../components/NextAdminWidgets';
import type { RoleId } from '../data/report3DashboardData';
import { useDashboardAnalytics } from '../hooks/useDashboardAnalytics';

export function AdminDashboardPage({
  availableRoles = ['ADMIN'],
  onRoleChange,
}: {
  availableRoles?: readonly RoleId[];
  onRoleChange?: (role: RoleId) => void;
}) {
  const { locale, t } = useLocale();
  const tr = (vi: string, en: string) => (locale === 'vi' ? vi : en);
  const roles = useAuthStore((state) => state.roles);
  useAssets({ page: 1, pageSize: 50 }, false);

  const analytics = useDashboardAnalytics('ADMIN');
  const data = analytics.data;

  const fallbackMetrics = [
    {
      id: 'active_users',
      label: tr('Người dùng hoạt động', 'Active users'),
      value: '0',
      change: tr('Toàn nền tảng', 'Platform'),
      positive: true,
      subtext: '',
      iconType: 'users',
    },
    {
      id: 'mf1_pending',
      label: tr('Hồ sơ chờ thẩm định', 'MF1 pending reviews'),
      value: '0',
      change: tr('Đã xử lý', 'Clear'),
      positive: true,
      subtext: '',
      iconType: 'shield',
    },
    {
      id: 'ai_findings',
      label: tr('Phát hiện AI tháng này', 'Monthly AI detections'),
      value: '0',
      change: 'YOLO11 & LLM',
      positive: true,
      subtext: '',
      iconType: 'eye',
    },
    {
      id: 'platform_volume',
      label: tr('Tổng giao dịch nền tảng', 'Platform volume'),
      value: '0 ₫',
      change: tr('Hệ thống ổn định', 'Healthy'),
      positive: true,
      subtext: '',
      iconType: 'dollar',
    },
  ];

  const metrics = data?.summaryCards && data.summaryCards.length > 0 ? data.summaryCards : fallbackMetrics;
  const perfChart = data?.performanceChart ?? {
    headerLabel: tr('HOẠT ĐỘNG AI THEO TUẦN', 'WEEKLY AI ACTIVITY'),
    headlineValue: '0',
    trendBadge: 'YOLO11 & Vision',
    series1Name: 'YOLO11',
    series1Color: '#3758F9',
    series1Data: Array(8).fill(0),
    series2Name: 'Vision Fallback',
    series2Color: '#13B2E4',
    series2Data: Array(8).fill(0),
    months: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8'],
    yTicks: ['0', '1', '2', '3', '4'],
    maxVal: 4,
  };

  const allItems = data?.actionItems ?? [];
  const mf1PendingItems = allItems.filter((i) => i.category === 'MF1');
  const auditItems = allItems.filter((i) => i.category === 'AUDIT');
  const adminMix = data?.pipelineStages ?? [];
  const serviceHealth = data?.serviceHealth ?? [];

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
            {t('Platform overview')}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            {tr(
              'Giám sát người dùng, hồ sơ thẩm định MF1, hoạt động AI Vision và nhật ký kiểm toán.',
              'Monitor platform users, MF1 compliance reviews, AI Vision activity, and audit logs.',
            )}
          </Typography>
        </Box>

        <DashboardHeaderActions
          currentRole="ADMIN"
          availableRoles={switchableRoles.length > 0 ? switchableRoles : ['ADMIN']}
          onRoleChange={onRoleChange ?? (() => {})}
          onRefresh={() => {
            void analytics.refetch();
          }}
          onExport={() => {
            window.print();
          }}
        />
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

      {/* Row 2: 60/40 Split — Weekly AI Activity + AI Breakdown & Service Health */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.55fr) minmax(300px, 1fr)' },
          gap: 2.5,
          mb: 3,
          alignItems: 'stretch',
        }}
      >
        <LyticPerformanceChart
          headerLabel={perfChart.headerLabel}
          headlineValue={perfChart.headlineValue}
          trendBadge={perfChart.trendBadge}
          series1Name={perfChart.series1Name}
          series1Color={perfChart.series1Color}
          series1Data={perfChart.series1Data}
          series2Name={perfChart.series2Name}
          series2Color={perfChart.series2Color}
          series2Data={perfChart.series2Data}
          months={perfChart.months}
          yTicks={perfChart.yTicks}
          maxVal={perfChart.maxVal}
        />

        <AdminServiceHealthCard stages={adminMix} services={serviceHealth} />
      </Box>

      {/* Row 3: 50/50 Split — Pending MF1 Reviews + Recent Audit Activities */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
          gap: 2.5,
          alignItems: 'stretch',
        }}
      >
        <AdminActionListCard
          title={tr('Hàng đợi thẩm định MF1', 'Pending MF1 Reviews')}
          emptyText={tr('Không còn hồ sơ chờ duyệt.', 'All MF1 applications reviewed.')}
          viewAllLink="/admin/onboarding-reviews"
          viewAllLabel={tr('Mở thẩm định', 'Review queue')}
          items={mf1PendingItems}
        />
        <AdminActionListCard
          title={tr('Hoạt động gần đây (Audit Log)', 'Recent Activities')}
          emptyText={tr('Chưa có nhật ký kiểm toán.', 'No recent audit events.')}
          viewAllLink="/admin/audit-logs"
          viewAllLabel={tr('Nhật ký hệ thống', 'Audit logs')}
          items={auditItems}
        />
      </Box>
    </Box>
  );
}
