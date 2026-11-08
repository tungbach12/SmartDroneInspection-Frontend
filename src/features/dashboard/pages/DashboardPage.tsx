import { useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import ApartmentOutlined from '@mui/icons-material/ApartmentOutlined';
import CategoryOutlined from '@mui/icons-material/CategoryOutlined';
import FactCheckOutlined from '@mui/icons-material/FactCheckOutlined';
import FlightTakeoffRounded from '@mui/icons-material/FlightTakeoffRounded';
import BuildOutlined from '@mui/icons-material/BuildOutlined';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useAssets } from '@/features/assets/hooks/useAssets';
import { useDashboardAnalytics } from '../hooks/useDashboardAnalytics';
import {
  REPORT3_ROLE_DASHBOARDS,
  type RoleId,
} from '../data/report3DashboardData';
import { MetricCard } from '@/shared/ui/MetricCard';
import { LyticPerformanceChart } from '../components/LyticPerformanceChart';
import { LyticRadialGaugeCard } from '../components/LyticRadialGaugeCard';
import { LyticStackedBarChart } from '../components/LyticStackedBarChart';
import { LyticQueueTable } from '../components/LyticQueueTable';
import { DashboardHeaderActions } from '../components/LyticHeaderActions';
import { CustomerDashboardPage } from './CustomerDashboardPage';
import { InspectorDashboardPage } from './InspectorDashboardPage';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { formatLocation } from '@/shared/airspace/airspaceZones';

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
  { label: 'Maintenance', description: 'Repair follow-up', icon: BuildOutlined, path: '/client/maintenance' },
];

const inspectorAreas: FocusArea[] = [
  { label: 'Inspections', description: 'Assigned field work and evidence', icon: FlightTakeoffRounded, path: '/operations/inspections' },
  { label: 'Reports', description: 'Verify and submit reports', icon: FactCheckOutlined, path: '/operations/reports' },
];

const maintenanceAreas: FocusArea[] = [
  { label: 'Maintenance', description: 'Assigned repair work', icon: BuildOutlined, path: '/operations/maintenance' },
];

const adminAreas: FocusArea[] = [
  { label: 'Assets', description: 'Asset records', icon: ApartmentOutlined, path: '/admin/assets' },
  { label: 'Asset catalog', description: 'Inspection classifications', icon: CategoryOutlined, path: '/admin/asset-catalog' },
  { label: 'Inspections', description: 'Inspection records', icon: FlightTakeoffRounded, path: '/admin/inspections' },
  { label: 'Reports', description: 'Inspection reports', icon: FactCheckOutlined, path: '/admin/reports' },
  { label: 'Maintenance', description: 'Maintenance follow-up', icon: BuildOutlined, path: '/admin/maintenance' },
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
      ...(roles.includes('MAINTENANCE_ENGINEER') ? maintenanceAreas : []),
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
    roles.includes('INSPECTOR') &&
    !roles.includes('MAINTENANCE_ENGINEER')
  ) {
    return <InspectorDashboardPage />;
  }

  return <OperationsAndPlatformDashboard />;
}

function OperationsAndPlatformDashboard() {
  const { formatNumber, t } = useLocale();
  const roles = useAuthStore((state) => state.roles);
  const location = useLocation();
  const portal = location.pathname.split('/').filter(Boolean)[0] ?? '';

  const isOrganization = false;
  const isAdmin =
    (portal === 'admin' || portal === 'manager') &&
    (roles.includes('ADMIN') || roles.includes('MANAGER'));
  const isInspector = portal === 'operations' && roles.includes('INSPECTOR');
  const isMaintenanceEngineer = portal === 'operations' && roles.includes('MAINTENANCE_ENGINEER');
  const canReadAssets = isOrganization;

  const focusAreas = getAreas(roles, portal);
  const dashboardRoleOptions: RoleId[] =
    portal === 'manager'
      ? ['MANAGER']
      : portal === 'admin'
        ? ['ADMIN', 'MANAGER']
        : portal === 'client'
          ? ['CUSTOMER']
          : ['INSPECTOR', 'MAINTENANCE_ENGINEER'];
  const availableDashboardRoles = dashboardRoleOptions.filter((role) => roles.includes(role));
  const assets = useAssets({ page: 1, pageSize: 50 }, canReadAssets);
  const analytics = useDashboardAnalytics();

  // Role controls only vary presentation within roles actually assigned to the account.
  const defaultRole: RoleId = isOrganization
    ? 'CUSTOMER'
    : (portal === 'manager' || portal === 'admin') &&
        roles.includes('MANAGER') &&
        !roles.includes('ADMIN')
      ? 'MANAGER'
      : isAdmin
        ? 'ADMIN'
        : isMaintenanceEngineer && !isInspector
          ? 'MAINTENANCE_ENGINEER'
          : 'INSPECTOR';
  const [selectedRole, setSelectedRole] = useState<RoleId | null>(null);
  const activeRole =
    selectedRole && availableDashboardRoles.includes(selectedRole) ? selectedRole : defaultRole;
  const handleRoleChange = (role: RoleId) => setSelectedRole(role);

  const config = REPORT3_ROLE_DASHBOARDS[activeRole];

  // Headings
  const overviewTitle = isOrganization
    ? 'Asset overview'
    : isAdmin
      ? 'Platform overview'
      : isInspector
        ? 'Inspection workload'
        : 'Maintenance workload';

  const overviewDescription = isOrganization
    ? 'Recent structures registered to your organization.'
    : isAdmin
      ? 'Choose a workspace to review its records and activity.'
      : isInspector
        ? 'Open inspections, evidence, and reports assigned to you.'
        : 'Work and follow-up assigned to your maintenance role.';

  // Live asset calculation
  const assetList = assets.data?.items ?? [];
  const activeAssetsCount = assetList.filter((a) => a.status === 'ACTIVE').length;
  const pendingAssetsCount = assetList.filter((a) => a.status === 'PENDING_REVIEW').length;

  const metrics = isOrganization
    ? [
        {
          id: 'registered_assets',
          label: 'Registered assets',
          value: assets.error ? '—' : assets.isLoading ? '…' : formatNumber((assets.data?.totalCount ?? 0)),
          change: '+100% paired',
          positive: true,
          subtext: 'in your organization',
          iconType: 'building',
        },
        {
          id: 'active_page',
          label: 'Active on this page',
          value: assets.error ? '—' : assets.isLoading ? '…' : formatNumber(activeAssetsCount),
          change: 'Operational',
          positive: true,
          subtext: `of ${assets.data?.items.length ?? 0} shown`,
          iconType: 'check-circle',
        },
        {
          id: 'awaiting_review',
          label: 'Awaiting review',
          value: assets.error ? '—' : assets.isLoading ? '…' : formatNumber(pendingAssetsCount),
          change: 'Action due',
          positive: false,
          subtext: `of ${assets.data?.items.length ?? 0} shown`,
          iconType: 'alert',
        },
        {
          id: 'inspection_reports',
          label: 'Inspection reports',
          value: '—',
          change: '+18.5% YoY',
          positive: true,
          subtext: 'open Reports for available versions',
          iconType: 'shield',
        },
      ]
    : isAdmin
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
      : isInspector
        ? [
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
          ]
        : [
            {
              id: 'maintenance_tasks',
              label: 'Maintenance tasks',
              value: '—',
              change: 'Work orders',
              positive: true,
              subtext: 'open Maintenance to view assigned work',
              iconType: 'wrench',
            },
            {
              id: 'due_soon',
              label: 'Due soon',
              value: '—',
              change: '< 48 Hours',
              positive: false,
              subtext: 'available on assigned tasks',
              iconType: 'clock',
            },
            {
              id: 'source_findings',
              label: 'Source findings',
              value: '—',
              change: 'MF3 Certified',
              positive: true,
              subtext: 'available on assigned tasks',
              iconType: 'shield',
            },
            {
              id: 'completed',
              label: 'Completed',
              value: '—',
              change: '+16.5% Closed',
              positive: true,
              subtext: 'available on assigned tasks',
              iconType: 'check-circle',
            },
          ];

  // Dynamic rows for live asset list
  const tableRows = canReadAssets && assetList.length > 0
    ? assetList.slice(0, 4).map((a) => ({
        col1: a.name,
        col2: formatLocation(a.locationText) || 'River district',
        col3: a.code,
        col4: a.status === 'ACTIVE' ? 'Active' : 'Pending Review',
        col5: '3.2%',
        status: (a.status === 'ACTIVE' ? 'positive' : 'warning') as 'positive' | 'warning',
        link: '/client/assets',
      }))
    : config.table.rows;

  const liveMetrics = analytics.data?.summaryCards && analytics.data.summaryCards.length > 0
    ? analytics.data.summaryCards.map((m) => ({
        id: m.id,
        label: t(m.label),
        value: m.value,
        change: m.change,
        positive: m.positive,
        subtext: t(m.subtext),
        iconType: m.iconType,
      }))
    : metrics;

  const perfChart = analytics.data?.performanceChart ?? config.performanceChart;
  const radialGauge = analytics.data?.radialGauge ?? config.radialGauge;
  const stackedBar = analytics.data?.stackedBarChart ?? config.stackedBarChart;

  const dynamicTableRows = analytics.data?.queueTable?.rows && analytics.data.queueTable.rows.length > 0
    ? analytics.data.queueTable.rows
    : tableRows;
  const dynamicTableHeaders = analytics.data?.queueTable?.headers && analytics.data.queueTable.headers.length > 0
    ? analytics.data.queueTable.headers
    : (canReadAssets ? ['Asset', 'Location', 'Code', 'Status', 'Action'] : config.table.headers);
  const dynamicTableTitle = analytics.data?.queueTable?.title ?? overviewTitle;
  const dynamicTableSubtitle = analytics.data?.queueTable?.subtitle ?? overviewDescription;
  const dynamicViewAllLink = analytics.data?.queueTable?.viewAllLink ?? config.table.viewAllLink;
  const dynamicViewAllText = analytics.data?.queueTable?.viewAllText ?? config.table.viewAllText;

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
              fontSize: { xs: '20px', sm: '24px' },
              fontWeight: 500,
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
            }}
          >
            {t('Overview')}
          </Typography>
        </Box>

        <DashboardHeaderActions
          currentRole={activeRole}
          availableRoles={availableDashboardRoles}
          onRoleChange={handleRoleChange}
          onRefresh={() => {
            if (canReadAssets) void assets.refetch();
            void analytics.refetch();
          }}
          onExport={() => {
            window.print();
          }}
        />
      </Box>

      {/* Row 1: 4 Metric Cards */}
      <Box
        aria-label={t('Workspace metrics')}
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            xl: 'repeat(4, 1fr)',
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

      {/* Row 2: Performance Area Chart + Radial Gauge */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            lg: 'minmax(0, 1.85fr) minmax(320px, 1fr)',
          },
          gap: 2.5,
          mb: 3,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
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

        <Box sx={{ minWidth: 0 }}>
          <LyticRadialGaugeCard
            title={radialGauge.title}
            subtitle={radialGauge.subtitle}
            targetValue={radialGauge.targetValue}
            targetLabel={radialGauge.targetLabel}
            percentage={radialGauge.percentage}
            subMetrics={radialGauge.subMetrics}
          />
        </Box>
      </Box>

      {/* Row 3: Stacked Bar Chart + Table & Workspace Shortcuts */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            lg: 'repeat(2, 1fr)',
          },
          gap: 2.5,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
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
                borderRadius: '10px',
                p: 2.5,
                boxShadow: 'none',
              }}
            >
              <Typography
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
                        borderColor: 'divider',
                      },
                    }}
                    startIcon={
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: '8px',
                          bgcolor: 'primary.light',
                          color: 'primary.main',
                          display: 'grid',
                          placeItems: 'center',
                        }}
                      >
                        <Icon sx={{ fontSize: 18 }} />
                      </Box>
                    }
                    endIcon={<ArrowForwardRounded sx={{ color: 'text.secondary', fontSize: 16, ml: 'auto' }} />}
                  >
                    <Box sx={{ minWidth: 0, flex: 1, ml: 0.5 }}>
                      <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.2, color: 'text.primary' }}>
                        {t(label)}
                      </Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', lineHeight: 1.2, mt: 0.25 }}>
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
