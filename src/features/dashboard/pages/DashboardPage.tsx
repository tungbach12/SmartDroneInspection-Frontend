import { useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import ApartmentOutlined from '@mui/icons-material/ApartmentOutlined';
import CategoryOutlined from '@mui/icons-material/CategoryOutlined';
import FactCheckOutlined from '@mui/icons-material/FactCheckOutlined';
import FlightTakeoffRounded from '@mui/icons-material/FlightTakeoffRounded';
import ManageAccountsOutlined from '@mui/icons-material/ManageAccountsOutlined';
import TuneRounded from '@mui/icons-material/TuneRounded';
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useAssets } from '@/features/assets/hooks/useAssets';
import { useDashboardAnalytics } from '../hooks/useDashboardAnalytics';
import {
  REPORT3_ROLE_DASHBOARDS,
  type RoleId,
} from '../data/report3DashboardData';
import { MetricCard } from '@/shared/ui/MetricCard';
import { LyticPerformanceChart } from '@/features/dashboard/components/LyticPerformanceChart';
import { LyticRadialGaugeCard } from '@/features/dashboard/components/LyticRadialGaugeCard';
import { LyticQueueTable } from '@/features/dashboard/components/LyticQueueTable';
import { LyticStackedBarChart } from '@/features/dashboard/components/LyticStackedBarChart';
import { DashboardHeaderActions } from '../components/LyticHeaderActions';
import { CustomerDashboardPage } from './CustomerDashboardPage';
import { InspectorDashboardPage } from './InspectorDashboardPage';
import { useLocale } from '@/shared/i18n/LocaleProvider';

interface FocusArea {
  label: string;
  description: string;
  icon: typeof ApartmentOutlined;
  path: string;
}

const clientAreas: FocusArea[] = [
  { label: 'Assets', description: 'Registered structures', icon: ApartmentOutlined, path: '/client/assets' },
  { label: 'Inspections', description: 'Evidence and inspection work', icon: FlightTakeoffRounded, path: '/client/inspections' },
  { label: 'Reports', description: 'Released findings', icon: FactCheckOutlined, path: '/client/reports' },
];

const inspectorAreas: FocusArea[] = [
  { label: 'Inspections', description: 'Assigned field work and evidence', icon: FlightTakeoffRounded, path: '/operations/inspections' },
  { label: 'Reports', description: 'Verify and submit reports', icon: FactCheckOutlined, path: '/operations/reports' },
];

const adminAreas: FocusArea[] = [
  { label: 'Platform accounts', description: 'Accounts and roles', icon: ManageAccountsOutlined, path: '/admin/platform-users' },
  { label: 'Finance settings', description: 'Commission & tax rates', icon: TuneRounded, path: '/admin/finance-settings' },
  { label: 'AI configuration', description: 'Auto-confirm & model stats', icon: AutoAwesomeOutlined, path: '/admin/ai-settings' },
  { label: 'Asset catalog', description: 'Inspection classifications', icon: CategoryOutlined, path: '/admin/asset-catalog' },
  { label: 'Onboarding reviews', description: 'Airspace & drone reviews', icon: FactCheckOutlined, path: '/admin/onboarding-reviews' },
  { label: 'Assets', description: 'Asset records', icon: ApartmentOutlined, path: '/admin/assets' },
  { label: 'Inspections', description: 'Inspection records', icon: FlightTakeoffRounded, path: '/admin/inspections' },
];

const managerAreas: FocusArea[] = [
  { label: 'Service requests', description: 'Quotations and dispatch', icon: FactCheckOutlined, path: '/manager/contracts' },
  { label: 'Assets', description: 'Customer asset records', icon: ApartmentOutlined, path: '/manager/assets' },
  { label: 'Inspections', description: 'Dispatched missions', icon: FlightTakeoffRounded, path: '/manager/inspections' },
  { label: 'Reports', description: 'Review & publish queue', icon: FactCheckOutlined, path: '/manager/reports' },
];

function getAreas(roles: readonly string[], portal: string): FocusArea[] {
  if (portal === 'client' && roles.includes('CUSTOMER')) return clientAreas;
  if (portal === 'manager' && roles.includes('MANAGER')) return managerAreas;
  if (portal === 'admin' && (roles.includes('ADMIN') || roles.includes('MANAGER'))) return adminAreas;
  if (portal === 'operations') {
    return [
      ...(roles.includes('INSPECTOR') ? inspectorAreas : []),
    ];
  }
  return [];
}

export default function DashboardPage() {
  const roles = useAuthStore((state) => state.roles);
  const location = useLocation();
  const portal = location.pathname.split('/').filter(Boolean)[0] ?? '';

  if (portal === 'client' && roles.includes('CUSTOMER')) {
    return <CustomerDashboardPage />;
  }

  if (
    portal === 'operations' &&
    roles.includes('INSPECTOR')
  ) {
    return <InspectorDashboardPage />;
  }

  return <OperationsAndPlatformDashboard />;
}

const BACKEND_VI_TO_EN: Record<string, string> = {
  'Tổng số tài sản': 'Total assets',
  'công trình đăng ký quản lý': 'registered structures',
  'Tổ chức khách hàng': 'Customer organizations',
  'doanh nghiệp hạ tầng': 'infrastructure enterprises',
  'Hồ sơ tài sản': 'Asset records',
  'tài sản toàn hệ thống': 'platform-wide assets',
  'Đợt kiểm tra': 'Inspections',
  'phiên bay toàn nền tảng': 'platform flight missions',
  'hoạt động bay drone khảo sát': 'drone survey operations',
  'Khuyết tật ghi nhận': 'Recorded defects',
  'phát hiện cần xử lý': 'findings requiring action',
  'Nhiệm vụ bay': 'Flight missions',
  'lịch phân công kiểm định': 'assigned inspection schedule',
  'Phát hiện khuyết tật': 'Defect findings',
  'ghi nhận qua drone': 'captured via drone',
  'Bằng chứng đã tải': 'Uploaded evidence',
  '100% toàn vẹn': '100% integrity',
  'lưu trữ bảo mật MinIO': 'MinIO secure storage',
  'Báo cáo kiểm định': 'Inspection reports',
  'Đã xuất bản': 'Published',
  'bàn giao khách hàng': 'delivered to customer',
  'Phân bổ khuyết tật theo mức độ nghiêm trọng': 'Defect distribution by severity',
  'Nghiêm trọng (High/Critical)': 'High / Critical',
  'Trung bình (Medium)': 'Medium',
  'Thấp (Low)': 'Low',
  'KHẢO SÁT HIỆN TRƯỜNG & PHÁT HIỆN KHUYẾT TẬT': 'FIELD SURVEYS & DEFECT DETECTION',
  '100% Hoàn thành đúng lịch': '100% On-schedule completion',
  'Đợt kiểm tra hoàn thành': 'Completed inspections',
  'Khuyết tật phát hiện': 'Detected defects',
  'Chưa phát sinh chi phí': 'No incurred costs yet',
  'Dự toán phê duyệt': 'Approved estimate',
  'Chi phí thực tế': 'Actual cost',
  'Hiệu suất & An toàn Bay kiểm định': 'Flight Inspection Performance & Safety',
  'Tỷ lệ hoàn thành nhiệm vụ và lập báo cáo': 'Mission completion and reporting rate',
  'Tiến độ Hoàn thành & An toàn': 'Completion & Safety Progress',
  'Tỷ lệ hoàn thành đúng hạn': 'On-time completion rate',
  'Toàn vẹn bằng chứng MinIO': 'MinIO evidence integrity',
  '100% Đạt kiểm tra': '100% Inspection passed',
  'Đạt chuẩn': 'Compliant',
  'Đang tiến hành': 'In progress',
  'Khởi tạo': 'Initialized',
  'Đợt kiểm tra được phân công gần đây': 'Recently assigned inspections',
  'Các nhiệm vụ bay khảo sát hiện trường và lập báo cáo của bạn':
    'Your assigned field survey missions and reporting tasks',
  'Xem toàn bộ đợt kiểm tra': 'View all inspections',
  'Công trình / Tài sản': 'Asset / Structure',
  'Mã công trình': 'Asset code',
  'Mục tiêu khảo sát': 'Survey objective',
  'Trạng thái': 'Status',
  'Hành động': 'Action',
  'Khảo sát bay hiện trường drone': 'Field drone inspection survey',
  'Đang thực hiện': 'In progress',
  'Hoàn thành': 'Completed',
  'Khách hàng': 'Customer',
  'Tiến độ': 'Progress',
  'Mã': 'Code',
  'Thg 1': 'Jan',
  'Thg 2': 'Feb',
  'Thg 3': 'Mar',
  'Thg 4': 'Apr',
  'Thg 5': 'May',
  'Thg 6': 'Jun',
  'Thg 7': 'Jul',
  'Thg 8': 'Aug',
  'Thg 9': 'Sep',
  'Thg 10': 'Oct',
  'Thg 11': 'Nov',
  'Thg 12': 'Dec',
};

function OperationsAndPlatformDashboard() {
  const { locale, t } = useLocale();
  const localizeAnalytics = (text: string): string => {
    if (locale === 'vi') return t(text);
    if (BACKEND_VI_TO_EN[text]) return BACKEND_VI_TO_EN[text];
    return text
      .replace(' đang hoạt động', ' active')
      .replace(' đang thực hiện', ' in progress')
      .replace(' mức nghiêm trọng', ' critical')
      .replace(' nghiêm trọng', ' critical')
      .replace(' đã hoàn thành', ' completed')
      .replace(' đang tiến hành', ' in progress')
      .replace(' đã quyết toán', ' closed')
      .replace(' đang mở', ' open')
      .replace(' đang thi công', ' in progress')
      .replace(
        'KHẢO SÁT HIỆN TRƯỜNG & PHÁT HIỆN KHUYẾT TẬT',
        'FIELD SURVEYS & DEFECT DETECTION',
      )
      .replace(' Đợt kiểm tra', ' Inspections')
      .replace('Giải ngân ', 'Disbursed ')
      .replace('Đã chi ', 'Spent ')
      .replace(' Nhiệm vụ', ' Missions')
      .replace(' Nghiệm thu', ' Accepted')
      .replace(' Lệnh', ' Orders');
  };
  const roles = useAuthStore((state) => state.roles);
  const location = useLocation();
  const portal = location.pathname.split('/').filter(Boolean)[0] ?? '';

  const isAdmin =
    (portal === 'admin' || portal === 'manager') &&
    (roles.includes('ADMIN') || roles.includes('MANAGER'));

  const focusAreas = getAreas(roles, portal);
  const dashboardRoleOptions: RoleId[] =
    portal === 'manager'
      ? ['MANAGER']
      : portal === 'admin'
        ? ['ADMIN', 'MANAGER']
        : portal === 'client'
          ? ['CUSTOMER']
          : ['INSPECTOR'];
  const availableDashboardRoles = dashboardRoleOptions.filter((role) => roles.includes(role));
  useAssets({ page: 1, pageSize: 50 }, false);
  const analytics = useDashboardAnalytics();

  // Role controls only vary presentation within roles actually assigned to the account.
  const defaultRole: RoleId =
    (portal === 'manager' || portal === 'admin') &&
    roles.includes('MANAGER') &&
    !roles.includes('ADMIN')
      ? 'MANAGER'
      : isAdmin
        ? 'ADMIN'
        : 'INSPECTOR';
  const [selectedRole, setSelectedRole] = useState<RoleId | null>(null);
  const activeRole =
    selectedRole && availableDashboardRoles.includes(selectedRole) ? selectedRole : defaultRole;
  const handleRoleChange = (role: RoleId) => setSelectedRole(role);

  const config = REPORT3_ROLE_DASHBOARDS[activeRole];

  // Headings
  const overviewTitle = isAdmin
    ? 'Platform overview'
    : 'Inspection workload';

  const overviewDescription = isAdmin
    ? 'Choose a workspace to review its records and activity.'
    : 'Open inspections, evidence, and reports assigned to you.';

  const metrics = isAdmin
      ? [
          {
            id: 'organizations',
            label: 'Organizations',
            value: '—',
            change: '+14.2% MoM',
            positive: true,
            subtext: 'summary not available',
            iconType: 'building',
          },
          {
            id: 'asset_records',
            label: 'Asset records',
            value: '—',
            change: '+8.5% Growth',
            positive: true,
            subtext: 'summary not available',
            iconType: 'shield',
          },
          {
            id: 'inspection_records',
            label: 'Inspection records',
            value: '—',
            change: '+22.4% Volume',
            positive: true,
            subtext: 'summary not available',
            iconType: 'plane',
          },
          {
            id: 'report_versions',
            label: 'Report versions',
            value: '—',
            change: '+18.1% Active',
            positive: true,
            subtext: 'summary not available',
            iconType: 'check-circle',
          },
        ]
      : [
          {
            id: 'assignments',
            label: 'Assignments',
            value: '—',
            change: '4 in Progress',
            positive: true,
            subtext: 'open Inspections to view assigned work',
            iconType: 'plane',
          },
          {
            id: 'evidence_sets',
            label: 'Evidence sets',
            value: '—',
            change: '100% SHA-256',
            positive: true,
            subtext: 'available inside each inspection',
            iconType: 'check-circle',
          },
          {
            id: 'reports',
            label: 'Reports',
            value: '—',
            change: '3 Drafts',
            positive: false,
            subtext: 'open Reports for a selected inspection',
            iconType: 'shield',
          },
          {
            id: 'deadlines',
            label: 'Deadlines',
            value: '—',
            change: 'On Schedule',
            positive: true,
            subtext: 'available on assigned work',
            iconType: 'clock',
          },
        ];

  const tableRows = config.table.rows;

  const nextAdminIconCycle = ['building', 'dollar', 'shield', 'users'] as const;
  const liveMetrics = analytics.data?.summaryCards && analytics.data.summaryCards.length > 0
    ? analytics.data.summaryCards.map((m, idx) => ({
        id: m.id,
        label: localizeAnalytics(m.label),
        value: m.value,
        change: localizeAnalytics(m.change),
        positive: m.positive,
        subtext: localizeAnalytics(m.subtext),
        iconType: nextAdminIconCycle[idx % nextAdminIconCycle.length] ?? m.iconType,
      }))
    : metrics.map((m, idx) => ({
        ...m,
        iconType: nextAdminIconCycle[idx % nextAdminIconCycle.length] ?? m.iconType,
      }));

  const rawPerfChart = analytics.data?.performanceChart ?? config.performanceChart;
  const perfChart = {
    ...rawPerfChart,
    headerLabel: localizeAnalytics(rawPerfChart.headerLabel),
    headlineValue: localizeAnalytics(rawPerfChart.headlineValue),
    trendBadge: localizeAnalytics(rawPerfChart.trendBadge),
    series1Name: localizeAnalytics(rawPerfChart.series1Name),
    series2Name: localizeAnalytics(rawPerfChart.series2Name),
    months: rawPerfChart.months.map((m) => localizeAnalytics(m)),
  };
  const rawRadialGauge = analytics.data?.radialGauge ?? config.radialGauge;
  const radialGauge = {
    ...rawRadialGauge,
    title: localizeAnalytics(rawRadialGauge.title),
    subtitle: localizeAnalytics(rawRadialGauge.subtitle),
    targetValue: localizeAnalytics(rawRadialGauge.targetValue),
    targetLabel: localizeAnalytics(rawRadialGauge.targetLabel),
    subMetrics: rawRadialGauge.subMetrics.map((sm) => ({
      ...sm,
      label: localizeAnalytics(sm.label),
      value: localizeAnalytics(sm.value),
    })),
  };
  const rawStackedBar = analytics.data?.stackedBarChart ?? config.stackedBarChart;
  const stackedBar = {
    ...rawStackedBar,
    title: localizeAnalytics(rawStackedBar.title),
    categories: rawStackedBar.categories.map((c) => localizeAnalytics(c)),
    channels: rawStackedBar.channels.map((ch) => ({
      ...ch,
      name: localizeAnalytics(ch.name),
    })),
  };

  const normalizeQueueLink = (link?: string) => {
    if (!link) return link;
    if (portal === 'admin' && link.startsWith('/client/')) {
      return link.replace('/client/', '/admin/');
    }
    if (portal === 'manager' && link.startsWith('/client/')) {
      return '/manager/inspections';
    }
    return link;
  };

  const dynamicTableRows = (
    analytics.data?.queueTable?.rows && analytics.data.queueTable.rows.length > 0
      ? analytics.data.queueTable.rows
      : tableRows
  ).map((row) => {
    const normalizedLink = normalizeQueueLink(row.link);
    return {
      col1: localizeAnalytics(row.col1),
      col2: localizeAnalytics(row.col2),
      col3: localizeAnalytics(row.col3),
      col4: localizeAnalytics(row.col4),
      col5: localizeAnalytics(row.col5),
      status: row.status,
      ...(normalizedLink !== undefined ? { link: normalizedLink } : {}),
    };
  });
  const dynamicTableHeaders = (
    analytics.data?.queueTable?.headers && analytics.data.queueTable.headers.length > 0
      ? analytics.data.queueTable.headers
      : config.table.headers
  ).map((h) => localizeAnalytics(h));
  const dynamicTableTitle = localizeAnalytics(analytics.data?.queueTable?.title ?? overviewTitle);
  const dynamicTableSubtitle = localizeAnalytics(
    analytics.data?.queueTable?.subtitle ?? overviewDescription,
  );
  const dynamicViewAllLink = normalizeQueueLink(
    analytics.data?.queueTable?.viewAllLink ?? config.table.viewAllLink,
  );
  const dynamicViewAllText = localizeAnalytics(
    analytics.data?.queueTable?.viewAllText ?? config.table.viewAllText ?? 'View all',
  );

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 1400,
        mx: 'auto',
      }}
    >
      {/* Top Header Controls */}
      <Box
        sx={{
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography
            component="h1"
            sx={{
              color: 'text.primary',
              fontSize: '1.5rem',
              fontWeight: 600,
              letterSpacing: '-0.01em',
              lineHeight: '2rem',
            }}
          >
            {t('Overview')}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: '#71717A',
              fontSize: '0.875rem',
              fontWeight: 400,
              lineHeight: '1.25rem',
              mt: '4px',
            }}
          >
            {t(overviewDescription)}
          </Typography>
        </Box>

        <DashboardHeaderActions
          currentRole={activeRole}
          availableRoles={availableDashboardRoles}
          onRoleChange={handleRoleChange}
          onRefresh={() => {
            void analytics.refetch();
          }}
          onExport={() => {
            window.print();
          }}
        />
      </Box>

      {/* Row 1: 4 NextAdmin Metric Cards */}
      <Box
        role="region"
        aria-label={t('Workspace metrics')}
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            lg: 'repeat(4, 1fr)',
          },
          gap: 2.5,
          mb: 3,
        }}
      >
        {liveMetrics.map((st) => (
          <MetricCard
            key={st.id}
            label={st.label}
            value={st.value}
            change={st.change}
            positive={st.positive}
            subtext={st.subtext}
            iconType={st.iconType as any}
          />
        ))}
      </Box>

      {/* Row 2: Full-width Spline Area Chart Card */}
      <Box sx={{ mb: 3, minWidth: 0 }}>
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
      </Box>

      {/* Row 3: 2-Column Split (Radial Gauge & Stacked Bar on Left + Queue Table & Shortcuts on Right) */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            lg: 'minmax(320px, 1fr) minmax(0, 1.4fr)',
          },
          gap: 2.5,
          alignItems: 'start',
        }}
      >
        <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <LyticRadialGaugeCard
            title={radialGauge.title}
            subtitle={radialGauge.subtitle}
            targetValue={radialGauge.targetValue}
            targetLabel={radialGauge.targetLabel}
            percentage={radialGauge.percentage}
            subMetrics={radialGauge.subMetrics}
          />

          <LyticStackedBarChart
            title={stackedBar.title}
            categories={stackedBar.categories}
            channels={stackedBar.channels}
            maxStack={stackedBar.maxStack}
          />
        </Box>

        <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <LyticQueueTable
            title={dynamicTableTitle}
            subtitle={dynamicTableSubtitle}
            headers={dynamicTableHeaders}
            rows={dynamicTableRows}
            viewAllLink={dynamicViewAllLink}
            viewAllText={dynamicViewAllText}
          />

          {/* Workspace Shortcuts Section */}
          {focusAreas.length > 0 && (
            <Box
              sx={{
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '12px',
                p: '20px',
                boxShadow: 'none',
              }}
            >
              <Typography
                component="h2"
                sx={{
                  color: 'text.primary',
                  fontSize: '1rem',
                  fontWeight: 600,
                  mb: 1.5,
                }}
              >
                {t('Workspace shortcuts')}
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                  gap: 1.5,
                }}
              >
                {focusAreas.map(({ label, description, icon: Icon, path }) => (
                  <Button
                    key={label}
                    component={RouterLink}
                    to={path}
                    sx={{
                      justifyContent: 'flex-start',
                      textAlign: 'left',
                      px: 1.75,
                      py: 1.5,
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'background.default',
                      color: 'text.primary',
                      textTransform: 'none',
                      '&:hover': {
                        bgcolor: 'action.hover',
                        borderColor: '#3758F9',
                      },
                    }}
                    startIcon={
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: '8px',
                          bgcolor: 'rgba(55, 88, 249, 0.10)',
                          color: '#3758F9',
                          display: 'grid',
                          placeItems: 'center',
                        }}
                      >
                        <Icon sx={{ fontSize: 18 }} />
                      </Box>
                    }
                    endIcon={
                      <ArrowForwardRounded
                        sx={{ color: '#71717A', fontSize: 16, ml: 'auto' }}
                      />
                    }
                  >
                    <Box sx={{ minWidth: 0, flex: 1, ml: 0.5 }}>
                      <Typography
                        sx={{
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          lineHeight: 1.2,
                          color: 'text.primary',
                        }}
                      >
                        {t(label)}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: '0.75rem',
                          color: '#71717A',
                          lineHeight: 1.2,
                          mt: 0.25,
                        }}
                      >
                        {t(description)}
                      </Typography>
                    </Box>
                  </Button>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
