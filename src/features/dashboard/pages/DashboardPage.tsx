import React, { useState } from 'react';
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
import {
  REPORT3_ROLE_DASHBOARDS,
  type RoleId,
} from '../data/report3DashboardData';
import { LyticMetricCard } from '../components/LyticMetricCard';
import { LyticPerformanceChart } from '../components/LyticPerformanceChart';
import { LyticRadialGaugeCard } from '../components/LyticRadialGaugeCard';
import { LyticStackedBarChart } from '../components/LyticStackedBarChart';
import { LyticQueueTable } from '../components/LyticQueueTable';
import { LyticHeaderActions } from '../components/LyticHeaderActions';

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

function getAreas(roles: readonly string[], portal: string): FocusArea[] {
  if (portal === 'client' && roles.includes('ORG_ADMIN')) return clientAreas;
  if (portal === 'admin' && roles.includes('ADMIN')) return adminAreas;
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

  const isOrganization = portal === 'client' && roles.includes('ORG_ADMIN');
  const isAdmin = portal === 'admin' && roles.includes('ADMIN');
  const isInspector = portal === 'operations' && roles.includes('INSPECTOR');
  const isMaintenanceEngineer = portal === 'operations' && roles.includes('MAINTENANCE_ENGINEER');
  const canReadAssets = isOrganization;

  const focusAreas = getAreas(roles, portal);
  const assets = useAssets({ page: 1, pageSize: 50 }, canReadAssets);

  // Default role from portal & auth state
  const defaultRole: RoleId = isOrganization
    ? 'ORG_ADMIN'
    : isAdmin
      ? 'ADMIN'
      : isMaintenanceEngineer && !isInspector
        ? 'MAINTENANCE_ENGINEER'
        : 'INSPECTOR';

  const [activeRole, setActiveRole] = useState<RoleId>(defaultRole);

  React.useEffect(() => {
    setActiveRole(defaultRole);
  }, [defaultRole]);

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
          value: assets.error ? '—' : assets.isLoading ? '…' : (assets.data?.totalCount ?? 0).toLocaleString(),
          change: '+100% paired',
          positive: true,
          subtext: 'in your organization',
          iconType: 'building',
        },
        {
          id: 'active_page',
          label: 'Active on this page',
          value: assets.error ? '—' : assets.isLoading ? '…' : activeAssetsCount.toLocaleString(),
          change: 'Operational',
          positive: true,
          subtext: `of ${assets.data?.items.length ?? 0} shown`,
          iconType: 'check-circle',
        },
        {
          id: 'awaiting_review',
          label: 'Awaiting review',
          value: assets.error ? '—' : assets.isLoading ? '…' : pendingAssetsCount.toLocaleString(),
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
        col2: a.locationText || 'River district',
        col3: a.code,
        col4: a.status === 'ACTIVE' ? 'Active' : 'Pending Review',
        col5: '3.2%',
        status: (a.status === 'ACTIVE' ? 'positive' : 'warning') as 'positive' | 'warning',
        link: '/client/assets',
      }))
    : config.table.rows;

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 1400,
        mx: 'auto',
        fontFamily: 'var(--lytic-font)',
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
              color: 'var(--lytic-title, #1f2937)',
              fontSize: { xs: '20px', sm: '24px' },
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
            }}
          >
            Overview
          </Typography>
        </Box>

        <LyticHeaderActions
          currentRole={activeRole}
          onRoleChange={setActiveRole}
          onRefresh={() => {
            if (canReadAssets) void assets.refetch();
          }}
          onExport={() => {
            window.print();
          }}
        />
      </Box>

      {/* Row 1: 4 Metric Cards */}
      <Box
        aria-label="Workspace metrics"
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
        {metrics.map((st) => (
          <LyticMetricCard
            key={st.id}
            label={st.label}
            value={st.value}
            change={st.change}
            positive={st.positive}
            subtext={st.subtext}
            iconType={st.iconType}
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
            headerLabel={config.performanceChart.headerLabel}
            headlineValue={config.performanceChart.headlineValue}
            trendBadge={config.performanceChart.trendBadge}
            series1Name={config.performanceChart.series1Name}
            series1Color={config.performanceChart.series1Color}
            series1Data={config.performanceChart.series1Data}
            series2Name={config.performanceChart.series2Name}
            series2Color={config.performanceChart.series2Color}
            series2Data={config.performanceChart.series2Data}
            months={config.performanceChart.months}
            yTicks={config.performanceChart.yTicks}
            maxVal={config.performanceChart.maxVal}
          />
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <LyticRadialGaugeCard
            title={config.radialGauge.title}
            subtitle={config.radialGauge.subtitle}
            targetValue={config.radialGauge.targetValue}
            targetLabel={config.radialGauge.targetLabel}
            percentage={config.radialGauge.percentage}
            subMetrics={config.radialGauge.subMetrics}
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
            title={config.stackedBarChart.title}
            categories={config.stackedBarChart.categories}
            channels={config.stackedBarChart.channels}
            maxStack={config.stackedBarChart.maxStack}
          />
        </Box>

        <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <LyticQueueTable
            title={overviewTitle}
            subtitle={overviewDescription}
            headers={canReadAssets ? ['Asset', 'Location', 'Code', 'Status', 'Action'] : config.table.headers}
            rows={tableRows}
            viewAllLink={canReadAssets ? '/client/assets' : config.table.viewAllLink}
            viewAllText={canReadAssets ? 'View all assets' : config.table.viewAllText}
          />

          {/* Workspace Shortcuts Section */}
          {focusAreas.length > 0 && (
            <Box
              sx={{
                bgcolor: 'var(--lytic-bg-card, #ffffff)',
                border: '1px solid var(--lytic-border, #e5e7eb)',
                borderRadius: '12px',
                p: 2.5,
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
              }}
            >
              <Typography
                sx={{
                  color: 'var(--lytic-title, #1f2937)',
                  fontSize: '15px',
                  fontWeight: 600,
                  mb: 1.5,
                }}
              >
                Workspace shortcuts
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
                      border: '1px solid var(--lytic-border-light, #f3f4f6)',
                      bgcolor: 'var(--lytic-bg-page, #f9fafb)',
                      color: 'var(--lytic-title, #1f2937)',
                      textTransform: 'none',
                      '&:hover': {
                        bgcolor: 'var(--lytic-border-light, #f3f4f6)',
                        borderColor: 'var(--lytic-border, #e5e7eb)',
                      },
                    }}
                    startIcon={
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: '6px',
                          bgcolor: 'var(--lytic-primary-light, #eff3ff)',
                          color: 'var(--lytic-primary, #3758F9)',
                          display: 'grid',
                          placeItems: 'center',
                        }}
                      >
                        <Icon sx={{ fontSize: 18 }} />
                      </Box>
                    }
                    endIcon={<ArrowForwardRounded sx={{ color: 'var(--lytic-text, #6b7280)', fontSize: 16, ml: 'auto' }} />}
                  >
                    <Box sx={{ minWidth: 0, flex: 1, ml: 0.5 }}>
                      <Typography sx={{ fontSize: '13px', fontWeight: 600, lineHeight: 1.2, color: 'var(--lytic-title, #1f2937)' }}>
                        {label}
                      </Typography>
                      <Typography sx={{ fontSize: '11px', color: 'var(--lytic-text, #6b7280)', lineHeight: 1.2, mt: 0.25 }}>
                        {description}
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
