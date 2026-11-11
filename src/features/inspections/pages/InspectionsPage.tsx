import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { TaskAltOutlined } from '@mui/icons-material';
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
import { InspectionListTable } from '../components/InspectionListTable';
import { CreateInspectionDialog } from '../components/CreateInspectionDialog';
import type { InspectionListItem } from '../api/inspectionApi';
import { CustomerInspectionsPage } from './CustomerInspectionsPage';
import {
  resolveInitialStepForRow,
  type InspectionRoleView,
} from '../utils/workflowStepResolver';
import { InspectorScheduleCalendar } from '../components/InspectorScheduleCalendar';
import { InspectionWorkDetailDialog } from '../components/InspectionWorkDetailDialog';
import { useInspections, useInspectionsWithReports } from '../hooks/useInspections';
import { useLocale } from '@/shared/i18n/LocaleProvider';

type InspectionsView = 'all' | 'reports' | 'calendar';

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
  const { t } = useLocale();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const portal = (location.pathname.split('/').filter(Boolean)[0] ??
    PORTAL_IDS[0]) as PortalId;
  const roles = useAuthStore((state) => state.roles);
  const isOrganizationAdmin = roles.includes('CUSTOMER');
  const isPlatformManager = roles.includes('ADMIN') || roles.includes('MANAGER');
  const isReviewer = isOrganizationAdmin || isPlatformManager;
  const canBrowse =
    roles.includes('INSPECTOR') ||
    roles.includes('CUSTOMER') ||
    roles.includes('MANAGER') ||
    roles.includes('ADMIN');
  const isOrgAdmin = roles.includes('CUSTOMER');
  const [createInspectionOpen, setCreateInspectionOpen] = useState(false);
  const [selectedWorkDetailId, setSelectedWorkDetailId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const view: InspectionsView =
    searchParams.get('view') === 'reports'
      ? 'reports'
      : searchParams.get('view') === 'calendar'
        ? 'calendar'
        : 'all';

  const listFilters = useMemo(() => ({ page, pageSize }), [page, pageSize]);
  // The report queue is server-paged from /with-reports so its rows, total and pages stay
  // consistent; the all-view reads the scoped collection instead.
  const allInspections = useInspections(listFilters, view === 'all');
  const reportInspections = useInspectionsWithReports(listFilters, view === 'reports');
  const inspections = view === 'reports' ? reportInspections : allInspections;

  const roleView: InspectionRoleView =
    portal === 'admin' || portal === 'manager'
      ? 'manager'
      : portal === 'client'
        ? 'customer'
        : 'inspector';

  const openInspection = (inspectionId: string) => {
    const row = visibleItems.find((item) => item.id === inspectionId);
    const target = resolveInitialStepForRow(row, roleView, {
      isReportsQueue: view === 'reports',
    });
    navigate(`${getSectionPath(portal, 'inspections')}/${inspectionId}/${target}`, {
      state: { autoResumeStep: true },
    });
  };

  const getActionLabel = (row: InspectionListItem): string | undefined => {
    if (view === 'reports' && isReviewer) {
      return undefined;
    }
    if (portal === 'client') {
      return row.reportStatus === 'PUBLISHED' ? t('View report') : t('Track progress');
    }
    return undefined;
  };

  // Metrics calculation
  const visibleItems = inspections.data?.items ?? EMPTY_ITEMS;
  const items = visibleItems;
  const displayedItems = useMemo(() => {
    let result = visibleItems;
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'UNDER_REVIEW') {
        result = result.filter(
          (item) => item.status === 'UNDER_REVIEW' || item.pendingAction === 'REPORT_REVIEW' || item.reportStatus === 'SUBMITTED',
        );
      } else {
        result = result.filter((item) => item.status === statusFilter);
      }
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (item) =>
          (item.assetName && item.assetName.toLowerCase().includes(q)) ||
          (item.assetCode && item.assetCode.toLowerCase().includes(q)) ||
          (item.assetLocation && item.assetLocation.toLowerCase().includes(q)) ||
          (item.objective && item.objective.toLowerCase().includes(q)),
      );
    }
    return result;
  }, [visibleItems, statusFilter, searchQuery]);

  // The administrator's queue is the decisions, not the records. The server names the phase on
  // each row, so the counts below are read rather than inferred from a status.
  const reportDueCount = items.filter((item) => item.pendingAction === 'REPORT_REVIEW').length;

  const newInspectionButton = isOrgAdmin ? (
    <Button
      variant="contained"
      startIcon={<Add />}
      onClick={() => setCreateInspectionOpen(true)}
      sx={{
        borderRadius: '10px',
        px: 2.5,
        py: 1,
        bgcolor: 'primary.main',
        fontSize: '0.875rem',
        fontWeight: 600,
        textTransform: 'none',
        boxShadow: 'none',
        '&:hover': { bgcolor: 'primary.dark', boxShadow: '0 1px 2px rgba(16,24,40,0.05)' },
      }}
    >
      {t('New inspection')}
    </Button>
  ) : undefined;

  if (portal === 'client' && isOrganizationAdmin && view === 'all') {
    return <CustomerInspectionsPage />;
  }

  return (
    <Box className="workspace-page workspace-page--inspections">
      {view === 'calendar' ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2.5,
          }}
        >
          <Typography
            component="h1"
            sx={{
              fontSize: '1.75rem',
              lineHeight: '2rem',
              fontWeight: 500,
              color: 'text.primary',
            }}
          >
            {t('Calendar')}
          </Typography>
          <Box component="nav" aria-label="Breadcrumb">
            <Box
              component="ol"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                listStyle: 'none',
                m: 0,
                p: 0,
                fontSize: '0.875rem',
                fontWeight: 500,
              }}
            >
              <Box component="li" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  component={Link}
                  to={`/${portal}/dashboard`}
                  sx={{
                    color: '#71717A',
                    textDecoration: 'none',
                    '&:hover': { color: 'primary.main' },
                  }}
                >
                  {t('Home')}
                </Box>
                <Box
                  component="svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  sx={{ color: '#71717A', flexShrink: 0 }}
                >
                  <path
                    d="M9.62 18.25L15.87 12L9.62 5.75"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Box>
              </Box>
              <Box component="li" sx={{ color: 'text.primary' }}>
                {t('Calendar')}
              </Box>
            </Box>
          </Box>
        </Box>
      ) : (
        <PageHeader
          title={
            isOrganizationAdmin
              ? view === 'reports'
                ? t('Report review queue')
                : t('Organization inspections')
              : t('Inspections')
          }
          breadcrumbs={[
            { label: 'Home', to: getSectionPath(portal, 'dashboard') },
            {
              label:
                isOrganizationAdmin && view === 'reports'
                  ? t('Report review queue')
                  : t('Inspections'),
            },
          ]}
        />
      )}

      {!canBrowse ? (
        <Alert severity="info">
          The inspection list is available to Inspectors, organization managers, and platform
          administrators.
        </Alert>
      ) : (
        <Stack spacing={2.5}>
          {isOrganizationAdmin && view === 'reports' && (
            <Alert severity="info">
              The administrator's decision is report-level: approve or return the submitted report
              with a reason. Evidence and Inspector findings are read inside the report document.
            </Alert>
          )}
          {isOrganizationAdmin && view !== 'calendar' && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Paper variant="outlined" role="group" aria-label={`Report reviews due on this page: ${reportDueCount}`} sx={{ flex: 1, p: 1.75, display: 'flex', gap: 1.25, alignItems: 'center' }}>
                <TaskAltOutlined color={reportDueCount ? 'warning' : 'disabled'} />
                <Box><Typography variant="caption" color="text.secondary">{t('Report review · this page')}</Typography><Typography variant="h6">{reportDueCount}</Typography></Box>
              </Paper>

            </Stack>
          )}
          {view === 'calendar' ? (
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
                onOverview={(id) => setSelectedWorkDetailId(id)}
                getActionLabel={getActionLabel}
                showReportColumn={view === 'reports' || isReviewer}
                reviewerMode={isReviewer && view === 'reports'}
                roleView={roleView === 'customer' ? 'inspector' : roleView}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder={t('Search by asset name, code, or location…')}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                actions={newInspectionButton}
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
