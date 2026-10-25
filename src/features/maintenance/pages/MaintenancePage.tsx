import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Chip,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { AssignmentTurnedInOutlined, BuildOutlined, TimelineOutlined } from '@mui/icons-material';
import { useAuthStore } from '@/features/auth/store/authStore';
import { DataTable, type DataTableColumn } from '@/shared/ui/DataTable';
import { EmptyState } from '@/shared/ui/EmptyState';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryState } from '@/shared/ui/QueryState';
import { MetricCard } from '@/shared/ui/MetricCard';
import { StatusChip } from '@/shared/ui/StatusChip';
import { useWorkOrders } from '../hooks/useMaintenance';
import type { WorkOrder, WorkOrderStatus } from '../api/maintenanceApi';
import { WorkOrderDetailPanel } from '../components/WorkOrderDetailPanel';
import { RepairCandidatePanel } from '../components/RepairCandidatePanel';
import { useLocale } from '@/shared/i18n/LocaleProvider';

const maintenanceSteps = [
  { label: 'Accepted finding', icon: AssignmentTurnedInOutlined },
  { label: 'Assigned engineer', icon: BuildOutlined },
  { label: 'Resolution history', icon: TimelineOutlined },
] as const;

const EMPTY_WORK_ORDERS: WorkOrder[] = [];

const OPEN_STATUSES: WorkOrderStatus[] = [
  'DRAFT',
  'AWAITING_APPROVAL',
  'APPROVED',
  'READY',
  'IN_PROGRESS',
  'WORK_COMPLETED',
  'SUBMITTED_FOR_ACCEPTANCE',
  'REWORK_REQUIRED',
  'REINSPECTION_REQUIRED',
];

const STATUS_LABELS: Record<WorkOrderStatus, string> = {
  DRAFT: 'Draft',
  AWAITING_APPROVAL: 'Awaiting approval',
  APPROVED: 'Approved',
  READY: 'Ready',
  IN_PROGRESS: 'In progress',
  WORK_COMPLETED: 'Work completed',
  SUBMITTED_FOR_ACCEPTANCE: 'Awaiting acceptance',
  ACCEPTED: 'Accepted',
  COST_RECONCILED: 'Costs reconciled',
  CLOSED: 'Closed',
  REWORK_REQUIRED: 'Rework required',
  REINSPECTION_REQUIRED: 'Re-inspection required',
};

/**
 * MF4: the organization's repair work, from the accepted finding through independent acceptance.
 *
 * The list is the discovery path. A row opens the work order, where the team, tasks, estimate,
 * execution records, change requests, completion report, acceptance and cost reconciliation each
 * live in their own panel. The role decides which of those actions appear: an ORG_MANAGER approves
 * scope, budget and acceptance, while a MAINTENANCE_ENGINEER records the work itself.
 */
export default function MaintenancePage() {
  const { formatDate, formatNumber, t } = useLocale();
  const navigate = useNavigate();
  const roles = useAuthStore((state) => state.roles);
  const isOrgAdmin = roles.includes('ORG_MANAGER');
  const workOrders = useWorkOrders(0, 50);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const items = useMemo(
    () => workOrders.data?.items ?? EMPTY_WORK_ORDERS,
    [workOrders.data?.items],
  );
  const totalCount = workOrders.data?.total ?? items.length;
  const openCount = items.filter((order) => OPEN_STATUSES.includes(order.status)).length;
  const inProgressCount = items.filter((order) => order.status === 'IN_PROGRESS').length;
  const awaitingAcceptance = items.filter(
    (order) => order.status === 'SUBMITTED_FOR_ACCEPTANCE',
  ).length;

  const selected = useMemo(
    () => items.find((order) => order.id === selectedId) ?? null,
    [items, selectedId],
  );

  const columns: DataTableColumn<WorkOrder>[] = [
    {
      id: 'scope',
      label: t('Corrective scope'),
      render: (order) => (
        <Typography sx={{ fontWeight: 600, color: '#101828', fontSize: '0.875rem' }}>
          {order.correctiveScope}
        </Typography>
      ),
    },
    {
      id: 'status',
      label: t('Status'),
      width: 190,
      render: (order) => (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <StatusChip status={order.status} />
          {order.priority !== 'MEDIUM' && order.priority !== 'NORMAL' ? (
            <Chip
              size="small"
              label={order.priority}
              sx={{ height: 20, fontSize: 10, fontWeight: 700 }}
            />
          ) : null}
        </Stack>
      ),
    },
    {
      id: 'due',
      label: t('Due'),
      width: 130,
      render: (order) => (
        <Typography sx={{ color: '#475467', fontSize: '0.8125rem' }}>
          {order.dueAt ? formatDate(new Date(order.dueAt)) : '—'}
        </Typography>
      ),
    },
  ];

  return (
    <Box className="workspace-page workspace-page--maintenance">
      <PageHeader
        title={t('Maintenance')}
        subtitle={t('Repair work opened from accepted inspection findings')}
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
          label={t('Total Work Orders')}
          value={workOrders.isLoading ? '…' : formatNumber(totalCount)}
          change={t('Tracked')}
          positive
          subtext={t('repair work orders')}
          iconType="wrench"
        />
        <MetricCard
          label={t('Open Work')}
          value={workOrders.isLoading ? '…' : formatNumber(openCount)}
          change={openCount > 0 ? t('Action required') : t('Clear')}
          positive={openCount === 0}
          subtext={t('not yet closed')}
          iconType="alert"
        />
        <MetricCard
          label={t('In Progress')}
          value={workOrders.isLoading ? '…' : formatNumber(inProgressCount)}
          change={t('Operational')}
          positive
          subtext={t('engineers on site')}
          iconType="clock"
        />
        <MetricCard
          label={t('Awaiting Acceptance')}
          value={workOrders.isLoading ? '…' : formatNumber(awaitingAcceptance)}
          change={awaitingAcceptance > 0 ? t('Review due') : t('Clear')}
          positive={awaitingAcceptance === 0}
          subtext={t('independent review')}
          iconType="check-circle"
        />
      </Box>

      {selected ? (
        <WorkOrderDetailPanel
          workOrder={selected}
          isOrgAdmin={isOrgAdmin}
          onClose={() => setSelectedId(null)}
          onOpenInspection={isOrgAdmin ? () => navigate('/client/inspections') : undefined}
        />
      ) : (
        <Stack spacing={2.5}>
          {isOrgAdmin ? (
            <RepairCandidatePanel onCreated={() => void workOrders.refetch()} />
          ) : null}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: 'minmax(0, 1.2fr) minmax(280px, 0.8fr)',
              },
              gap: 2.5,
            }}
          >
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 2, sm: 2.5 },
              borderRadius: '16px',
              border: '1px solid #eaecf0',
              bgcolor: '#ffffff',
              boxShadow: '0 1px 3px rgba(16, 24, 40, 0.05)',
            }}
          >
            <QueryState
              isLoading={workOrders.isLoading}
              error={workOrders.error}
              onRetry={() => void workOrders.refetch()}
              loadingLabel={t('Loading work orders…')}
              isEmpty={items.length === 0}
              empty={
                <EmptyState
                  title={t('No maintenance tasks')}
                  description={t('Assigned maintenance work will appear here with its source finding, owner, and resolution status.')}
                />
              }
            >
              <DataTable
                title={t('Work orders')}
                columns={columns}
                rows={items}
                rowKey={(order) => order.id}
                searchable
                searchPlaceholder={t('Search by corrective scope…')}
                searchPredicate={(order, query) =>
                  order.correctiveScope.toLowerCase().includes(query)
                }
                onRowClick={(order) => setSelectedId(order.id)}
              />
            </QueryState>
          </Paper>

          <Paper
            variant="outlined"
            sx={{
              p: { xs: 2.5, sm: 3.5 },
              borderRadius: '16px',
              border: '1px solid #eaecf0',
              bgcolor: '#ffffff',
              boxShadow: '0 1px 3px rgba(16, 24, 40, 0.05)',
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#101828' }}>
              {t('Traceable follow-up')}
            </Typography>
            <Typography variant="body2" sx={{ color: '#667085', mt: 0.75 }}>
              {t('Keep the reason for the work visible from the finding through completion.')}
            </Typography>
            <Stack spacing={2} sx={{ mt: 3 }}>
              {maintenanceSteps.map(({ label, icon: Icon }) => (
                <Stack key={label} direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '8px',
                      bgcolor: '#eff8ff',
                      color: '#2e90fa',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon fontSize="small" />
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#344054' }}>
                    {t(label)}
                  </Typography>
                </Stack>
              ))}
            </Stack>
            <Divider sx={{ my: 2.5 }} />
            <Typography variant="caption" sx={{ color: '#667085' }}>
              {isOrgAdmin
                ? t('As Organization Manager you approve scope, budget, changes and final acceptance.')
                : t('As Maintenance Engineer you record tasks, time, changes and the completion report.')}
            </Typography>
          </Paper>
          </Box>
        </Stack>
      )}
    </Box>
  );
}

export { STATUS_LABELS };
