import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Box, Paper, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { FactCheckOutlined, RateReviewOutlined, TaskAltOutlined } from '@mui/icons-material';
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
  const isOrganizationAdmin = roles.includes('ORG_ADMIN');
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

  const openInspection = (inspectionId: string) => {
    if (!isOrganizationAdmin) {
      navigate(`${getSectionPath(portal, 'inspections')}/${inspectionId}`);
      return;
    }
    // The reviewer opens the phase the row is actually waiting in, rather than a fixed tab.
    const row = visibleItems.find((item) => item.id === inspectionId);
    const target =
      row?.pendingAction === 'READINESS_REVIEW'
        ? 'preparation'
        : row?.pendingAction === 'CORRECTIVE_DISPOSITION'
          ? 'corrective'
          : 'review';
    navigate(`${getSectionPath('client', 'inspections')}/${inspectionId}/${target}`);
  };

  // Metrics calculation
  const visibleItems = inspections.data?.items ?? [];
  const items = visibleItems;
  const totalCount = inspections.data?.totalCount ?? visibleItems.length;
  const inProgressCount = items.filter((item) =>
    ['PREPARING', 'READY_FOR_FLIGHT', 'FIELD_COMPLETED', 'REPORT_DRAFT'].includes(item.status),
  ).length;
  const repairPendingCount = items.filter((item) => item.status === 'REPAIR_PENDING').length;
  const completedCount = items.filter((item) => item.status === 'COMPLETED').length;

  // The administrator's queue is the decisions, not the records. The server names the phase on
  // each row, so the counts below are read rather than inferred from a status.
  const readinessDueCount = items.filter((item) => item.pendingAction === 'READINESS_REVIEW').length;
  const reportDueCount = items.filter((item) => item.pendingAction === 'REPORT_REVIEW').length;
  const correctiveDueCount = items.filter((item) => item.pendingAction === 'CORRECTIVE_DISPOSITION').length;

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
        title={isOrganizationAdmin ? (view === 'reports' ? 'Report review queue' : 'Organization inspections') : 'Inspections'}
        subtitle={
          isOrganizationAdmin
            ? view === 'reports'
              ? 'Prioritize submitted reports for independent review, publish approved versions, and follow up on corrective outcomes.'
              : 'Monitor progress, assigned Inspectors, and report states across your organization. Open the review queue for decisions and publication.'
            : 'Review field evidence, record findings, and prepare inspection reports'
        }
      />

      {/* Inspector workload metrics are distinct from the Organization Admin report queue. */}
      {!isOrganizationAdmin && <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
          gap: 2.5,
          mb: 3,
        }}
      >
        <MetricCard
          label={isOrganizationAdmin ? (view === 'reports' ? 'Reports in queue' : 'Organization inspections') : 'Total Inspections'}
          value={inspections.isLoading ? '…' : totalCount.toLocaleString()}
          change={isOrganizationAdmin ? 'Current view' : 'Operational'}
          positive
          subtext={isOrganizationAdmin ? (view === 'reports' ? 'across all pages' : 'across your organization') : 'scoped to your assignment'}
          iconType="plane"
        />
        <MetricCard
          label="In Progress"
          value={inspections.isLoading ? '…' : inProgressCount.toLocaleString()}
          change="Operational"
          positive
          subtext="active inspections"
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
      </Box>}

      {/* Assignment response is an Inspector action, not part of the organization review queue. */}
      {roles.includes('INSPECTOR') && (
        <Box sx={{ mb: 2.5 }}>
          <AssignmentInboxPanel />
        </Box>
      )}

      {!canBrowse ? (
        <Alert severity="info">
          The inspection list is available to Inspectors, organization administrators, and platform
          administrators. Maintenance engineers track corrective work in Maintenance.
        </Alert>
      ) : (
        <Stack spacing={2.5}>
          {isOrganizationAdmin && view === 'reports' && (
            <Alert severity="info">
              The administrator's decision is report-level: approve or return the submitted report
              with a reason. Evidence and Inspector findings are read inside the report document,
              and the corrective outcome is recorded after publication.
            </Alert>
          )}
          {isOrganizationAdmin && <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Paper variant="outlined" role="group" aria-label={`Readiness reviews due on this page: ${readinessDueCount}`} sx={{ flex: 1, p: 1.75, display: 'flex', gap: 1.25, alignItems: 'center' }}>
              <RateReviewOutlined color={readinessDueCount ? 'warning' : 'disabled'} />
              <Box><Typography variant="caption" color="text.secondary">Readiness review · this page</Typography><Typography variant="h6">{readinessDueCount}</Typography></Box>
            </Paper>
            <Paper variant="outlined" role="group" aria-label={`Report reviews due on this page: ${reportDueCount}`} sx={{ flex: 1, p: 1.75, display: 'flex', gap: 1.25, alignItems: 'center' }}>
              <TaskAltOutlined color={reportDueCount ? 'warning' : 'disabled'} />
              <Box><Typography variant="caption" color="text.secondary">Report review · this page</Typography><Typography variant="h6">{reportDueCount}</Typography></Box>
            </Paper>
            <Paper variant="outlined" role="group" aria-label={`Corrective outcomes due on this page: ${correctiveDueCount}`} sx={{ flex: 1, p: 1.75, display: 'flex', gap: 1.25, alignItems: 'center' }}>
              <FactCheckOutlined color={correctiveDueCount ? 'warning' : 'disabled'} />
              <Box><Typography variant="caption" color="text.secondary">Corrective outcome · this page</Typography><Typography variant="h6">{correctiveDueCount}</Typography></Box>
            </Paper>
          </Stack>}
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
            <ToggleButton value="all">{isOrganizationAdmin ? 'All inspections' : 'All'}</ToggleButton>
            <ToggleButton value="reports">{isOrganizationAdmin ? 'Review queue' : 'With report'}</ToggleButton>
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
              title={
                isOrganizationAdmin
                  ? view === 'reports'
                    ? 'Reports requiring organization action'
                    : 'Organization inspections'
                  : 'Inspection records'
              }
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
              showReportColumn={view === 'reports' || isOrganizationAdmin}
              reviewerMode={isOrganizationAdmin && view === 'reports'}
            />
          </QueryState>
        </Stack>
      )}
    </Box>
  );
}
