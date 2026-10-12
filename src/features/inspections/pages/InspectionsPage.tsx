import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Alert, Box, Stack } from '@mui/material';
import {
  getSectionPath,
  PORTAL_IDS,
  type PortalId,
} from '@/app/permissions/accessPolicy';
import { useAuthStore } from '@/features/auth/store/authStore';
import { EmptyState } from '@/shared/ui/EmptyState';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryState } from '@/shared/ui/QueryState';
import { LyticMetricCard } from '@/features/dashboard/components/LyticMetricCard';
import { InspectionListTable } from '../components/InspectionListTable';
import AssignmentInboxPanel from './AssignmentInboxPanel';
import { useInspections } from '../hooks/useInspections';

/**
 * The scoped inspection collection — the discovery path Report 3 §3.5.1 requires. Selecting a row
 * opens that inspection's own route, where the MF3 workflow lives; the list holds no decisions of
 * its own, so a deep link and a row click reach the same workflow.
 */
export default function InspectionsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const portal = (location.pathname.split('/').filter(Boolean)[0] ??
    PORTAL_IDS[0]) as PortalId;
  const roles = useAuthStore((state) => state.roles);
  const canBrowse =
    roles.includes('INSPECTOR') ||
    roles.includes('ORG_ADMIN') ||
    roles.includes('ADMIN');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const listFilters = useMemo(() => ({ page, pageSize }), [page, pageSize]);
  const inspections = useInspections(listFilters);

  const openInspection = (inspectionId: string) =>
    navigate(`${getSectionPath(portal, 'inspections')}/${inspectionId}`);

  // Metrics calculation
  const items = inspections.data?.items ?? [];
  const totalCount = inspections.data?.totalCount ?? items.length;
  const inProgressCount = items.filter((i) =>
    ['PREPARING', 'READY_FOR_FLIGHT', 'FIELD_COMPLETED', 'REPORT_DRAFT'].includes(i.status),
  ).length;
  const repairPendingCount = items.filter((i) => i.status === 'REPAIR_PENDING').length;
  const completedCount = items.filter((i) => i.status === 'COMPLETED').length;

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
        <LyticMetricCard
          label="Total Inspections"
          value={inspections.isLoading ? '…' : totalCount.toLocaleString()}
          change="+8.4%"
          positive
          subtext="across organization"
          iconType="plane"
        />
        <LyticMetricCard
          label="In Progress"
          value={inspections.isLoading ? '…' : inProgressCount.toLocaleString()}
          change="Operational"
          positive
          subtext="active missions"
          iconType="clock"
        />
        <LyticMetricCard
          label="Repair Pending"
          value={inspections.isLoading ? '…' : repairPendingCount.toLocaleString()}
          change={repairPendingCount > 0 ? 'Follow-up' : 'Clear'}
          positive={repairPendingCount === 0}
          subtext="requires maintenance"
          iconType="alert"
        />
        <LyticMetricCard
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
          <QueryState
            isLoading={inspections.isLoading}
            error={inspections.error}
            isEmpty={!inspections.data?.items.length}
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
              rows={inspections.data?.items ?? []}
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
            />
          </QueryState>
        </Stack>
      )}
    </Box>
  );
}
