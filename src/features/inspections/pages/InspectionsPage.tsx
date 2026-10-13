import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Box, Stack, ToggleButton, ToggleButtonGroup } from '@mui/material';
import {
  getSectionPath,
  PORTAL_IDS,
  type PortalId,
} from '@/app/permissions/accessPolicy';
import { useAuthStore } from '@/features/auth/store/authStore';
import { EmptyState } from '@/shared/ui/EmptyState';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryState } from '@/shared/ui/QueryState';
import { MetricCard } from '@/shared/ui/MetricCard';
import { InspectionListTable } from '../components/InspectionListTable';
import AssignmentInboxPanel from './AssignmentInboxPanel';
import { useInspections, useInspectionsWithReports } from '../hooks/useInspections';

type InspectionsView = 'all' | 'reports';

/**
 * The scoped inspection collection — the discovery path Report 3 §3.5.1 requires. Selecting a row
 * opens that inspection's own route, where the MF3 workflow lives; the list holds no decisions of
 * its own, so a deep link and a row click reach the same workflow.
 *
 * The report queue is the `?view=reports` filtered view of this list: it shows only rows whose
 * report summary already carries a status or version number.
 */
export default function InspectionsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const portal = (location.pathname.split('/').filter(Boolean)[0] ??
    PORTAL_IDS[0]) as PortalId;
  const roles = useAuthStore((state) => state.roles);
  const canBrowse =
    roles.includes('INSPECTOR') ||
    roles.includes('ORG_ADMIN') ||
    roles.includes('ADMIN');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const view: InspectionsView = searchParams.get('view') === 'reports' ? 'reports' : 'all';

  const listFilters = useMemo(() => ({ page, pageSize }), [page, pageSize]);
  // The report queue is server-paged from /with-reports so its rows, total and pages stay
  // consistent; the all-view reads the scoped collection instead.
  const allInspections = useInspections(listFilters, view === 'all');
  const reportInspections = useInspectionsWithReports(listFilters, view === 'reports');
  const inspections = view === 'reports' ? reportInspections : allInspections;

  const openInspection = (inspectionId: string) =>
    navigate(`${getSectionPath(portal, 'inspections')}/${inspectionId}`);

  // Metrics calculation
  const visibleItems = inspections.data?.items ?? [];
  const items = visibleItems;
  const totalCount = inspections.data?.totalCount ?? visibleItems.length;
  const inProgressCount = items.filter((i) =>
    ['PREPARING', 'READY_FOR_FLIGHT', 'FIELD_COMPLETED', 'REPORT_DRAFT'].includes(i.status),
  ).length;
  const repairPendingCount = items.filter((i) => i.status === 'REPAIR_PENDING').length;
  const completedCount = items.filter((i) => i.status === 'COMPLETED').length;

  const setView = (next: InspectionsView) => {
    setPage(1);
    if (next === 'reports') {
      setSearchParams({ view: 'reports' }, { replace: true });
    } else {
      searchParams.delete('view');
      setSearchParams(searchParams, { replace: true });
    }
  };

  return (
    <Box className="workspace-page workspace-page--inspections">
      <PageHeader
        title="Inspections"
        subtitle="Review field evidence, record findings, and prepare inspection reports"
      />

      {/* 4 Lytic KPI Metric Cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
          gap: 2.5,
          mb: 3,
        }}
      >
        <MetricCard
          label="Total Inspections"
          value={inspections.isLoading ? '…' : totalCount.toLocaleString()}
          change="+8.4%"
          positive
          subtext="across organization"
          iconType="plane"
        />
        <MetricCard
          label="In Progress"
          value={inspections.isLoading ? '…' : inProgressCount.toLocaleString()}
          change="Operational"
          positive
          subtext="active missions"
          iconType="clock"
        />
        <MetricCard
          label="Repair Pending"
          value={inspections.isLoading ? '…' : repairPendingCount.toLocaleString()}
          change={repairPendingCount > 0 ? 'Follow-up' : 'Clear'}
          positive={repairPendingCount === 0}
          subtext="requires maintenance"
          iconType="alert"
        />
        <MetricCard
          label="Completed"
          value={inspections.isLoading ? '…' : completedCount.toLocaleString()}
          change="Published"
          positive
          subtext="immutable records"
          iconType="check-circle"
        />
      </Box>

      {/* Assignment inbox for inspectors */}
      <Box sx={{ mb: 2.5 }}>
        <AssignmentInboxPanel />
      </Box>

      {!canBrowse ? (
        <Alert severity="info">
          The inspection list is available to Inspectors, organization administrators, and platform
          administrators. Maintenance engineers track corrective work in Maintenance.
        </Alert>
      ) : (
        <Stack spacing={2.5}>
          <ToggleButtonGroup
            value={view}
            exclusive
            onChange={(_, next: InspectionsView | null) => {
              if (next) setView(next);
            }}
            aria-label="Inspection list view"
            size="small"
            sx={{ alignSelf: 'flex-start' }}
          >
            <ToggleButton value="all">All</ToggleButton>
            <ToggleButton value="reports">With report</ToggleButton>
          </ToggleButtonGroup>
          <QueryState
            isLoading={inspections.isLoading}
            error={inspections.error}
            isEmpty={visibleItems.length === 0}
            onRetry={() => void inspections.refetch()}
            loadingLabel="Loading inspections…"
            empty={
              <EmptyState
                title="No inspections available"
                description="Inspections you can see will appear here."
              />
            }
          >
            <InspectionListTable
              title="Inspection records"
              rows={visibleItems}
              page={page}
              pageSize={pageSize}
              totalCount={inspections.data?.totalCount ?? 0}
              totalPages={inspections.data?.totalPages ?? 0}
              onPageChange={setPage}
              onPageSizeChange={(next) => {
                setPageSize(next);
                setPage(1);
              }}
              onOpen={openInspection}
              showReportColumn={view === 'reports'}
            />
          </QueryState>
        </Stack>
      )}
    </Box>
  );
}
