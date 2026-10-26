import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { FactCheckOutlined, TaskAltOutlined } from '@mui/icons-material';
import Add from '@mui/icons-material/Add';
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
import { CreateInspectionDialog } from '../components/CreateInspectionDialog';
import { RecurringSchedulesPanel } from './RecurringSchedulesPanel';
import { InspectorScheduleCalendar } from '../components/InspectorScheduleCalendar';
import { InspectionWorkDetailDialog } from '../components/InspectionWorkDetailDialog';
import { useInspections, useInspectionsWithReports } from '../hooks/useInspections';
import { useLocale } from '@/shared/i18n/LocaleProvider';

type InspectionsView = 'all' | 'reports' | 'schedules' | 'calendar';

const EMPTY_ITEMS: never[] = [];

/**
 * The scoped inspection collection — the discovery path Report 3 §3.5.1 requires. Selecting a row
 * opens that inspection's own route, where the MF3 workflow lives; the list holds no decisions of
 * its own, so a deep link and a row click reach the same workflow.
 *
 * The report queue is the `?view=reports` filtered view of this list: it shows only rows whose
 * report summary already carries a status or version number.
 */
export default function InspectionsPage() {
  const { formatNumber, t } = useLocale();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const portal = (location.pathname.split('/').filter(Boolean)[0] ??
    PORTAL_IDS[0]) as PortalId;
  const roles = useAuthStore((state) => state.roles);
  const isOrganizationAdmin = roles.includes('ORG_MANAGER');
  const canBrowse =
    roles.includes('INSPECTOR') ||
    roles.includes('ORG_MANAGER') ||
    roles.includes('ADMIN');
  const isOrgAdmin = roles.includes('ORG_MANAGER');
  const [createInspectionOpen, setCreateInspectionOpen] = useState(false);
  const [selectedWorkDetailId, setSelectedWorkDetailId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const view: InspectionsView =
    searchParams.get('view') === 'reports'
      ? 'reports'
      : searchParams.get('view') === 'schedules'
        ? 'schedules'
        : searchParams.get('view') === 'calendar'
          ? 'calendar'
          : 'all';

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
      row?.pendingAction === 'CORRECTIVE_DISPOSITION'
        ? 'corrective'
        : 'review';
    navigate(`${getSectionPath('client', 'inspections')}/${inspectionId}/${target}`);
  };

  // Metrics calculation
  const visibleItems = inspections.data?.items ?? EMPTY_ITEMS;
  const items = visibleItems;
  const displayedItems = useMemo(() => {
    if (statusFilter === 'ALL') return visibleItems;
    return visibleItems.filter((item) => item.status === statusFilter);
  }, [visibleItems, statusFilter]);
  const totalCount = inspections.data?.totalCount ?? visibleItems.length;
  const inProgressCount = items.filter((item) =>
    ['READY_FOR_FLIGHT', 'IN_PROGRESS', 'FIELD_COMPLETED', 'REPORT_DRAFT'].includes(item.status),
  ).length;
  const repairPendingCount = items.filter((item) => item.status === 'REPAIR_PENDING').length;
  const completedCount = items.filter((item) => item.status === 'COMPLETED').length;

  // The administrator's queue is the decisions, not the records. The server names the phase on
  // each row, so the counts below are read rather than inferred from a status.
  const reportDueCount = items.filter((item) => item.pendingAction === 'REPORT_REVIEW').length;
  const correctiveDueCount = items.filter((item) => item.pendingAction === 'CORRECTIVE_DISPOSITION').length;

  const setView = (next: InspectionsView) => {
    setPage(1);
    if (next === 'reports') {
      setSearchParams({ view: 'reports' }, { replace: true });
    } else if (next === 'schedules') {
      setSearchParams({ view: 'schedules' }, { replace: true });
    } else if (next === 'calendar') {
      setSearchParams({ view: 'calendar' }, { replace: true });
    } else {
      searchParams.delete('view');
      setSearchParams(searchParams, { replace: true });
    }
  };

  const newInspectionButton = isOrgAdmin ? (
    <Button
      variant="contained"
      startIcon={<Add />}
      onClick={() => setCreateInspectionOpen(true)}
      sx={{
        borderRadius: '10px',
        px: 2.5,
        py: 1,
        bgcolor: '#3758F9',
        fontSize: '14px',
        fontWeight: 600,
        textTransform: 'none',
        boxShadow: 'none',
        '&:hover': { bgcolor: '#2b45cb', boxShadow: '0 1px 2px rgba(16,24,40,0.05)' },
      }}
    >
      {t('New inspection')}
    </Button>
  ) : undefined;

  return (
    <Box className="workspace-page workspace-page--inspections">
      <PageHeader
        title={
          isOrganizationAdmin
            ? view === 'reports'
              ? 'Report review queue'
              : view === 'schedules'
                ? t('Recurring inspection schedules')
                : view === 'calendar'
                  ? t('Schedule calendar')
                  : 'Organization inspections'
            : view === 'calendar'
              ? t('Schedule calendar')
              : 'Inspections'
        }
        subtitle={
          view === 'calendar'
            ? t('Track scheduled inspection missions, view calendar timeline, and inspect task details.')
            : isOrganizationAdmin
              ? view === 'reports'
                ? 'Prioritize submitted reports for independent review, publish approved versions, and follow up on corrective outcomes.'
                : view === 'schedules'
                  ? t('Automate periodic asset inspections, monitor occurrence generation, and resolve blocked dispatches.')
                  : 'Monitor progress, assigned Inspectors, and report states across your organization. Open the review queue for decisions and publication.'
              : 'Review field evidence, record findings, and prepare inspection reports'
        }
        actions={newInspectionButton}
      />

      {/* Inspector workload metrics are distinct from the Organization Manager report queue. */}
      {!isOrganizationAdmin && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
            gap: 2.5,
            mb: 3,
          }}
        >
          <MetricCard
            label={isOrganizationAdmin ? (view === 'reports' ? 'Reports in queue' : 'Organization inspections') : 'Total Inspections'}
            value={inspections.isLoading ? '…' : formatNumber(totalCount)}
            change={isOrganizationAdmin ? 'Current view' : 'Operational'}
            positive
            subtext={isOrganizationAdmin ? (view === 'reports' ? 'across all pages' : 'across your organization') : 'scoped to your assignment'}
            iconType="plane"
          />
          <MetricCard
            label={t('In Progress')}
            value={inspections.isLoading ? '…' : formatNumber(inProgressCount)}
            change={t('Operational')}
            positive
            subtext="active inspections"
            iconType="clock"
          />
          <MetricCard
            label={t('Repair Pending')}
            value={inspections.isLoading ? '…' : formatNumber(repairPendingCount)}
            change={repairPendingCount > 0 ? 'Follow-up' : 'Clear'}
            positive={repairPendingCount === 0}
            subtext="requires maintenance"
            iconType="alert"
          />
          <MetricCard
            label={t('Completed')}
            value={inspections.isLoading ? '…' : formatNumber(completedCount)}
            change={t('Published')}
            positive
            subtext="immutable records"
            iconType="check-circle"
          />
        </Box>
      )}

      {!canBrowse ? (
        <Alert severity="info">
          The inspection list is available to Inspectors, organization manageristrators, and platform
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
          {isOrganizationAdmin && view !== 'schedules' && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Paper variant="outlined" role="group" aria-label={`Report reviews due on this page: ${reportDueCount}`} sx={{ flex: 1, p: 1.75, display: 'flex', gap: 1.25, alignItems: 'center' }}>
                <TaskAltOutlined color={reportDueCount ? 'warning' : 'disabled'} />
                <Box><Typography variant="caption" color="text.secondary">{t('Report review · this page')}</Typography><Typography variant="h6">{reportDueCount}</Typography></Box>
              </Paper>
              <Paper variant="outlined" role="group" aria-label={`Corrective outcomes due on this page: ${correctiveDueCount}`} sx={{ flex: 1, p: 1.75, display: 'flex', gap: 1.25, alignItems: 'center' }}>
                <FactCheckOutlined color={correctiveDueCount ? 'warning' : 'disabled'} />
                <Box><Typography variant="caption" color="text.secondary">{t('Corrective outcome · this page')}</Typography><Typography variant="h6">{correctiveDueCount}</Typography></Box>
              </Paper>
            </Stack>
          )}
          <Stack
            direction="row"
            spacing={2}
            sx={{
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 1.5,
            }}
          >
            <ToggleButtonGroup
              value={view}
              exclusive
              onChange={(_, next: InspectionsView | null) => {
                if (next) setView(next);
              }}
              aria-label={t('Inspection list view')}
              size="small"
            >
              <ToggleButton value="all">{isOrganizationAdmin ? 'All inspections' : 'All'}</ToggleButton>
              <ToggleButton value="calendar">{t('Schedule calendar')}</ToggleButton>
              <ToggleButton value="reports">{isOrganizationAdmin ? 'Review queue' : 'With report'}</ToggleButton>
              {isOrganizationAdmin && (
                <ToggleButton value="schedules">{t('Recurring schedules')}</ToggleButton>
              )}
            </ToggleButtonGroup>

            {view !== 'schedules' && view !== 'calendar' && (
              <TextField
                select
                size="small"
                label={t('Status filter')}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="ALL">{t('All statuses')}</MenuItem>
                <MenuItem value="ASSIGNED">{t('Assigned')}</MenuItem>
                <MenuItem value="READY_FOR_FLIGHT">{t('Ready for Flight')}</MenuItem>
                <MenuItem value="IN_PROGRESS">{t('In Progress')}</MenuItem>
                <MenuItem value="FIELD_COMPLETED">{t('Field Completed')}</MenuItem>
                <MenuItem value="REPORT_DRAFT">{t('Report Draft')}</MenuItem>
                <MenuItem value="REPORT_PUBLISHED">{t('Report Published')}</MenuItem>
                <MenuItem value="REPAIR_PENDING">{t('Repair Pending')}</MenuItem>
                <MenuItem value="COMPLETED">{t('Completed')}</MenuItem>
                <MenuItem value="CANCELLED">{t('Cancelled')}</MenuItem>
              </TextField>
            )}
          </Stack>

          {view === 'schedules' ? (
            <RecurringSchedulesPanel onOpenCreateDialog={() => setCreateInspectionOpen(true)} />
          ) : view === 'calendar' ? (
            <InspectorScheduleCalendar onSelectInspection={(id) => setSelectedWorkDetailId(id)} />
          ) : (
            <QueryState
              isLoading={inspections.isLoading}
              error={inspections.error}
              isEmpty={displayedItems.length === 0}
              onRetry={() => void inspections.refetch()}
              loadingLabel={t('Loading inspections…')}
              empty={
                <EmptyState
                  title={t('No inspections available')}
                  description={
                    statusFilter !== 'ALL'
                      ? `No inspections found with status "${statusFilter}".`
                      : 'Inspections you can see will appear here.'
                  }
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
                rows={displayedItems}
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
          )}
        </Stack>
      )}

      <CreateInspectionDialog
        open={createInspectionOpen}
        onClose={() => setCreateInspectionOpen(false)}
        onSuccess={(id) => openInspection(id)}
      />

      <InspectionWorkDetailDialog
        open={Boolean(selectedWorkDetailId)}
        inspectionId={selectedWorkDetailId}
        onClose={() => setSelectedWorkDetailId(null)}
      />
    </Box>
  );
}
