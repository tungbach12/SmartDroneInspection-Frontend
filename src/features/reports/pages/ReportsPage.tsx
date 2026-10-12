import { Box, Stack } from '@mui/material';
import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  getSectionPath,
  PORTAL_IDS,
  type PortalId,
} from '@/app/permissions/accessPolicy';
import { useInspectionsWithReports } from '@/features/inspections/hooks/useInspections';
import { InspectionListTable } from '@/features/inspections/components/InspectionListTable';
import { LyticMetricCard } from '@/features/dashboard/components/LyticMetricCard';
import { EmptyState } from '@/shared/ui/EmptyState';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryState } from '@/shared/ui/QueryState';

/**
 * Modern Lytic-styled Reports list page.
 * Displays top KPI metric cards and a full-width records table.
 * Clicking a row or "Open" navigates to the dedicated ReportDetailPage.
 */
export default function ReportsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const portal = (location.pathname.split('/').filter(Boolean)[0] ??
    PORTAL_IDS[0]) as PortalId;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const listFilters = useMemo(() => ({ page, pageSize }), [page, pageSize]);
  const inspections = useInspectionsWithReports(listFilters);

  const items = inspections.data?.items ?? [];
  const totalCount = inspections.data?.totalCount ?? items.length;
  const inReviewCount = items.filter((i) => i.reportStatus === 'SUBMITTED' || i.reportStatus === 'AUTHOR_VERIFIED').length;
  const approvedCount = items.filter((i) => i.reportStatus === 'APPROVED').length;
  const publishedCount = items.filter((i) => i.reportStatus === 'PUBLISHED').length;

  const openReportDetail = (inspectionId: string) => {
    navigate(`${getSectionPath(portal, 'reports')}/${inspectionId}`);
  };

  return (
    <Box className="workspace-page workspace-page--reports">
      <PageHeader
        title="Reports"
        subtitle="Review, approve, and verify immutable inspection findings"
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
          label="Total Reports"
          value={inspections.isLoading ? '…' : totalCount.toLocaleString()}
          change="+18.5%"
          positive
          subtext="across organization"
          iconType="report"
        />
        <LyticMetricCard
          label="In Review"
          value={inspections.isLoading ? '…' : inReviewCount.toLocaleString()}
          change={inReviewCount > 0 ? 'Pending' : 'Clear'}
          positive={inReviewCount === 0}
          subtext="awaiting approval"
          iconType="clock"
        />
        <LyticMetricCard
          label="Approved"
          value={inspections.isLoading ? '…' : approvedCount.toLocaleString()}
          change="Ready to publish"
          positive
          subtext="verified by reviewer"
          iconType="check-circle"
        />
        <LyticMetricCard
          label="Published"
          value={inspections.isLoading ? '…' : publishedCount.toLocaleString()}
          change="Immutable"
          positive
          subtext="finalized records"
          iconType="shield"
        />
      </Box>

      {/* Main Full-width Table Card */}
      <Stack spacing={2.5}>
        <QueryState
          isLoading={inspections.isLoading}
          error={inspections.error}
          isEmpty={!items.length}
          onRetry={() => void inspections.refetch()}
          loadingLabel="Loading reports…"
          empty={
            <EmptyState
              title="No reports to review"
              description="A report appears here once the assigned Inspector authors a draft."
            />
          }
        >
          <InspectionListTable
            title="Report records"
            rows={items}
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            totalPages={inspections.data?.totalPages ?? 0}
            onPageChange={setPage}
            onPageSizeChange={(next) => {
              setPageSize(next);
              setPage(1);
            }}
            onOpen={openReportDetail}
            showReportColumn
          />
        </QueryState>
      </Stack>
    </Box>
  );
}
