import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  Typography,
} from '@mui/material';
import {
  AddCircleOutlined,
  AssignmentTurnedInOutlined,
  BuildOutlined,
  CheckCircleOutlined,
  GroupAddOutlined,
  PictureAsPdfOutlined,
  PlayArrowOutlined,
  ThumbDownOutlined,
} from '@mui/icons-material';
import { EmptyState } from '@/shared/ui/EmptyState';
import { PageHeader } from '@/shared/ui/PageHeader';
import { MetricCard } from '@/shared/ui/MetricCard';
import {
  useRepairCandidates,
  useWorkOrders,
  useWorkOrderTasks,
  useWorkOrderTeam,
  useWorkOrderLogs,
  useWorkOrderCostReconciliation,
  useApproveEstimate,
  useCloseWorkOrder,
  useReleaseWorkOrder,
  useStartWorkOrder,
  useVerifyWorkLog,
  useDeclareComplete,
} from '../hooks/useMaintenance';
import type {
  MaintenancePriority,
  RepairCandidate,
  WorkOrder,
  WorkOrderStatus,
} from '../api/maintenanceApi';
import { CreateWorkOrderDialog } from '../components/CreateWorkOrderDialog';
import { AssignTeamDialog } from '../components/AssignTeamDialog';
import { RecordAcceptanceDialog } from '../components/RecordAcceptanceDialog';
import { RejectEstimateDialog } from '../components/RejectEstimateDialog';
import { CreateTaskDialog } from '../components/CreateTaskDialog';
import { RecordWorkLogDialog } from '../components/RecordWorkLogDialog';
import { ProposeChangeDialog } from '../components/ProposeChangeDialog';
import { CreateReportDialog } from '../components/CreateReportDialog';

const statusColorMap: Record<
  WorkOrderStatus,
  'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'
> = {
  DRAFT: 'default',
  AWAITING_APPROVAL: 'warning',
  APPROVED: 'info',
  READY: 'primary',
  IN_PROGRESS: 'primary',
  WORK_COMPLETED: 'secondary',
  SUBMITTED_FOR_ACCEPTANCE: 'warning',
  REWORK_REQUIRED: 'error',
  REINSPECTION_REQUIRED: 'error',
  ACCEPTED: 'success',
  COSTS_RECONCILED: 'info',
  CLOSED: 'success',
};

const priorityColorMap: Record<
  MaintenancePriority,
  'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'
> = {
  LOW: 'default',
  MEDIUM: 'info',
  HIGH: 'warning',
  CRITICAL: 'error',
};

function WorkOrderDetailDialog({
  workOrder,
  open,
  onClose,
  onOpenAssignTeam,
  onOpenAcceptance,
  onOpenRejectEstimate,
}: {
  workOrder: WorkOrder | null;
  open: boolean;
  onClose: () => void;
  onOpenAssignTeam: () => void;
  onOpenAcceptance: () => void;
  onOpenRejectEstimate: (versionNo: number) => void;
}) {
  if (!workOrder) return null;

  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isRecordLogOpen, setIsRecordLogOpen] = useState(false);
  const [isProposeChangeOpen, setIsProposeChangeOpen] = useState(false);
  const [isCreateReportOpen, setIsCreateReportOpen] = useState(false);

  const { data: team, isLoading: isTeamLoading } = useWorkOrderTeam(workOrder.id, open);
  const { data: tasks, isLoading: isTasksLoading } = useWorkOrderTasks(workOrder.id, open);
  const { data: logs, isLoading: isLogsLoading } = useWorkOrderLogs(workOrder.id, open);
  const { data: reconciliation } = useWorkOrderCostReconciliation(workOrder.id, open);

  const approveEstimateMutation = useApproveEstimate();
  const releaseMutation = useReleaseWorkOrder();
  const startMutation = useStartWorkOrder();
  const verifyLogMutation = useVerifyWorkLog();
  const declareCompleteMutation = useDeclareComplete();
  const closeMutation = useCloseWorkOrder();

  const pdfUrl = `/api/v1/maintenance/work-orders/${workOrder.id}/reports/1/pdf`;

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Work Order Details
              </Typography>
              <Typography variant="caption" color="text.secondary">
                ID: {workOrder.id}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Chip
                label={workOrder.priority}
                color={priorityColorMap[workOrder.priority]}
                size="small"
              />
              <Chip
                label={workOrder.status}
                color={statusColorMap[workOrder.status]}
                size="small"
              />
            </Stack>
          </Stack>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={3}>
            {/* Scope and criteria */}
            <Box>
              <Typography variant="subtitle2" color="primary" fontWeight={700}>
                Corrective Scope
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5, bgcolor: '#f8fafc', p: 1.5, borderRadius: 1 }}>
                {workOrder.correctiveScope || 'Not specified'}
              </Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" color="primary" fontWeight={700}>
                Acceptance Criteria
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5, bgcolor: '#f8fafc', p: 1.5, borderRadius: 1 }}>
                {workOrder.acceptanceCriteria || 'Not specified'}
              </Typography>
            </Box>

            {/* Assigned Team */}
            <Box>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                Assigned Team Roster
              </Typography>
              {isTeamLoading ? (
                <CircularProgress size={20} />
              ) : team && team.length > 0 ? (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Engineer User ID</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Designation Reason</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {team.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                            {m.engineerUserId}
                          </TableCell>
                          <TableCell>
                            <Chip label={m.memberRole} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell>{m.reason || 'Standard assignment'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No team assigned yet.
                </Typography>
              )}
            </Box>

            {/* Tasks */}
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle2" fontWeight={700}>
                  Planned Tasks
                </Typography>
                {(workOrder.status === 'APPROVED' ||
                  workOrder.status === 'READY' ||
                  workOrder.status === 'IN_PROGRESS') && (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<AddCircleOutlined />}
                    onClick={() => setIsCreateTaskOpen(true)}
                  >
                    Add Task
                  </Button>
                )}
              </Stack>
              {isTasksLoading ? (
                <CircularProgress size={20} />
              ) : tasks && tasks.length > 0 ? (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>#</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Task Name</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Method</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {tasks.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell>{t.taskNumber}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>{t.name}</TableCell>
                          <TableCell>{t.method || 'Standard method'}</TableCell>
                          <TableCell>
                            <Chip label={t.status} size="small" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No tasks planned yet.
                </Typography>
              )}
            </Box>

            {/* Work Logs */}
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle2" fontWeight={700}>
                  Verified Work Logs
                </Typography>
                {workOrder.status === 'IN_PROGRESS' && (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => setIsRecordLogOpen(true)}
                  >
                    Record Work Log
                  </Button>
                )}
              </Stack>
              {isLogsLoading ? (
                <CircularProgress size={20} />
              ) : logs && logs.length > 0 ? (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Engineer</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Hours</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>As-Left Condition</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                            {log.engineerUserId.substring(0, 8)}...
                          </TableCell>
                          <TableCell>{log.workHours}h</TableCell>
                          <TableCell>{log.asLeftCondition || 'Completed'}</TableCell>
                          <TableCell>
                            <Chip
                              label={log.status}
                              size="small"
                              color={log.status === 'VERIFIED' ? 'success' : 'default'}
                            />
                          </TableCell>
                          <TableCell align="right">
                            {log.status === 'SUBMITTED' && (
                              <Button
                                size="small"
                                variant="contained"
                                color="primary"
                                disabled={verifyLogMutation.isPending}
                                onClick={() =>
                                  verifyLogMutation.mutate({
                                    workOrderId: workOrder.id,
                                    workLogId: log.id,
                                  })
                                }
                              >
                                Verify
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No work logs recorded yet.
                </Typography>
              )}
            </Box>

            {/* Cost reconciliation */}
            {reconciliation && (
              <Box>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                  Cost Reconciliation
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f8fafc' }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between">
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Authorized Budget
                      </Typography>
                      <Typography variant="body1" fontWeight={700}>
                        {reconciliation.currency} {reconciliation.authorizedAmount.toLocaleString()}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Actual Total
                      </Typography>
                      <Typography variant="body1" fontWeight={700}>
                        {reconciliation.currency} {reconciliation.actualTotal.toLocaleString()}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Variance
                      </Typography>
                      <Typography
                        variant="body1"
                        fontWeight={700}
                        color={reconciliation.variance > 0 ? 'error.main' : 'success.main'}
                      >
                        {reconciliation.currency} {reconciliation.variance.toLocaleString()} (
                        {reconciliation.variancePercent !== null ? `${reconciliation.variancePercent}%` : 'N/A'})
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2, flexWrap: 'wrap', gap: 1 }}>
          {workOrder.status === 'DRAFT' && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<GroupAddOutlined />}
              onClick={() => {
                onClose();
                onOpenAssignTeam();
              }}
            >
              Assign Team
            </Button>
          )}

          {workOrder.status === 'AWAITING_APPROVAL' && (
            <>
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckCircleOutlined />}
                disabled={approveEstimateMutation.isPending}
                onClick={() =>
                  approveEstimateMutation.mutate({ workOrderId: workOrder.id, versionNo: 1 })
                }
              >
                Approve Estimate
              </Button>
              <Button
                variant="outlined"
                color="warning"
                startIcon={<ThumbDownOutlined />}
                onClick={() => {
                  onClose();
                  onOpenRejectEstimate(1);
                }}
              >
                Return for Rework
              </Button>
            </>
          )}

          {workOrder.status === 'APPROVED' && (
            <Button
              variant="contained"
              color="primary"
              disabled={releaseMutation.isPending}
              onClick={() => releaseMutation.mutate(workOrder.id)}
            >
              {releaseMutation.isPending ? 'Releasing...' : 'Release to Team'}
            </Button>
          )}

          {workOrder.status === 'READY' && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<PlayArrowOutlined />}
              disabled={startMutation.isPending}
              onClick={() => startMutation.mutate(workOrder.id)}
            >
              {startMutation.isPending ? 'Starting...' : 'Start Execution'}
            </Button>
          )}

          {workOrder.status === 'IN_PROGRESS' && (
            <>
              <Button
                variant="outlined"
                color="warning"
                onClick={() => setIsProposeChangeOpen(true)}
              >
                Propose Change
              </Button>
              <Button
                variant="contained"
                color="success"
                disabled={declareCompleteMutation.isPending}
                onClick={() => declareCompleteMutation.mutate(workOrder.id)}
              >
                {declareCompleteMutation.isPending ? 'Completing...' : 'Declare Work Complete'}
              </Button>
            </>
          )}

          {workOrder.status === 'WORK_COMPLETED' && (
            <Button
              variant="contained"
              color="primary"
              onClick={() => setIsCreateReportOpen(true)}
            >
              Author &amp; Submit Report
            </Button>
          )}

          {workOrder.status === 'SUBMITTED_FOR_ACCEPTANCE' && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<CheckCircleOutlined />}
              onClick={() => {
                onClose();
                onOpenAcceptance();
              }}
            >
              Review &amp; Accept
            </Button>
          )}

          {(workOrder.status === 'ACCEPTED' || workOrder.status === 'COSTS_RECONCILED') && (
            <Button
              variant="contained"
              color="success"
              disabled={closeMutation.isPending}
              onClick={() => closeMutation.mutate(workOrder.id)}
            >
              {closeMutation.isPending ? 'Closing...' : 'Close Work Order'}
            </Button>
          )}

          <Button
            startIcon={<PictureAsPdfOutlined />}
            variant="outlined"
            color="primary"
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Download PDF
          </Button>
          <Button onClick={onClose} variant="outlined">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Embedded Dialogs */}
      <CreateTaskDialog
        workOrderId={workOrder.id}
        teamMembers={team ?? []}
        open={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
      />

      <RecordWorkLogDialog
        workOrderId={workOrder.id}
        tasks={tasks ?? []}
        open={isRecordLogOpen}
        onClose={() => setIsRecordLogOpen(false)}
      />

      <ProposeChangeDialog
        workOrderId={workOrder.id}
        open={isProposeChangeOpen}
        onClose={() => setIsProposeChangeOpen(false)}
      />

      <CreateReportDialog
        workOrderId={workOrder.id}
        open={isCreateReportOpen}
        onClose={() => setIsCreateReportOpen(false)}
      />
    </>
  );
}

export default function MaintenancePage() {
  const [currentTab, setCurrentTab] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Dialog selection states
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
  const [candidateToOpen, setCandidateToOpen] = useState<RepairCandidate | null>(null);
  const [workOrderToAssign, setWorkOrderToAssign] = useState<WorkOrder | null>(null);
  const [workOrderToAccept, setWorkOrderToAccept] = useState<WorkOrder | null>(null);
  const [estimateToReject, setEstimateToReject] = useState<{
    workOrderId: string;
    versionNo: number;
  } | null>(null);

  const {
    data: candidates,
    isLoading: isCandidatesLoading,
    error: candidatesError,
  } = useRepairCandidates();

  const {
    data: workOrdersPage,
    isLoading: isWorkOrdersLoading,
    error: workOrdersError,
  } = useWorkOrders({ page, size: rowsPerPage });

  const totalOrders = workOrdersPage?.total ?? 0;
  const inProgressOrders =
    workOrdersPage?.items.filter(
      (wo) => wo.status === 'IN_PROGRESS' || wo.status === 'READY' || wo.status === 'APPROVED',
    ).length ?? 0;
  const resolvedOrders =
    workOrdersPage?.items.filter(
      (wo) => wo.status === 'CLOSED' || wo.status === 'ACCEPTED' || wo.status === 'COSTS_RECONCILED',
    ).length ?? 0;

  return (
    <Box className="workspace-page workspace-page--maintenance">
      <PageHeader
        title="Maintenance"
        subtitle="Manage repair queues, internal team orders, and completion acceptance"
      />

      {/* KPI Metric Cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
          gap: 2.5,
          mb: 3,
        }}
      >
        <MetricCard
          label="Total Work Orders"
          value={totalOrders.toString()}
          change="Tracked"
          positive
          subtext="total orders"
          iconType="wrench"
        />
        <MetricCard
          label="Pending Repair"
          value={(candidates?.length ?? 0).toString()}
          change={candidates && candidates.length > 0 ? 'Action needed' : 'Clear'}
          positive={candidates?.length === 0}
          subtext="published findings"
          iconType="alert"
        />
        <MetricCard
          label="In Progress"
          value={inProgressOrders.toString()}
          change="Active"
          positive
          subtext="executing repairs"
          iconType="clock"
        />
        <MetricCard
          label="Resolved &amp; Closed"
          value={resolvedOrders.toString()}
          change="Completed"
          positive
          subtext="accepted orders"
          iconType="check-circle"
        />
      </Box>

      {/* Main Content Tabs */}
      <Paper
        variant="outlined"
        sx={{
          borderRadius: '16px',
          border: '1px solid #eaecf0',
          bgcolor: '#ffffff',
          boxShadow: '0 1px 3px rgba(16, 24, 40, 0.05)',
          overflow: 'hidden',
        }}
      >
        <Tabs
          value={currentTab}
          onChange={(_, newValue) => setCurrentTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2, pt: 1 }}
        >
          <Tab
            label={`Work Orders (${totalOrders})`}
            icon={<BuildOutlined fontSize="small" />}
            iconPosition="start"
            sx={{ textTransform: 'none', fontWeight: 600 }}
          />
          <Tab
            label={`Repair Candidates (${candidates?.length ?? 0})`}
            icon={<AssignmentTurnedInOutlined fontSize="small" />}
            iconPosition="start"
            sx={{ textTransform: 'none', fontWeight: 600 }}
          />
        </Tabs>

        {/* Tab 0: Work Orders List */}
        {currentTab === 0 && (
          <Box sx={{ p: 3 }}>
            {workOrdersError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                Failed to load work orders. Please try again.
              </Alert>
            )}

            {isWorkOrdersLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
              </Box>
            ) : workOrdersPage && workOrdersPage.items.length > 0 ? (
              <>
                <TableContainer>
                  <Table sx={{ minWidth: 650 }}>
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Work Order ID</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Priority</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Corrective Scope</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Created Date</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          Action
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {workOrdersPage.items.map((order) => (
                        <TableRow key={order.id} hover>
                          <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                            {order.id.substring(0, 8)}...
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={order.priority}
                              color={priorityColorMap[order.priority]}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={order.status}
                              color={statusColorMap[order.status]}
                              size="small"
                            />
                          </TableCell>
                          <TableCell sx={{ maxWidth: 280, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {order.correctiveScope || 'Not specified'}
                          </TableCell>
                          <TableCell>
                            {new Date(order.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              {order.status === 'DRAFT' && (
                                <Button
                                  variant="contained"
                                  size="small"
                                  startIcon={<GroupAddOutlined />}
                                  onClick={() => setWorkOrderToAssign(order)}
                                >
                                  Assign Team
                                </Button>
                              )}
                              <Button
                                variant="outlined"
                                size="small"
                                onClick={() => setSelectedWorkOrder(order)}
                              >
                                View Details
                              </Button>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <TablePagination
                  component="div"
                  count={workOrdersPage.total}
                  page={page}
                  onPageChange={(_, newPage) => setPage(newPage)}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={(e) => {
                    setRowsPerPage(parseInt(e.target.value, 10));
                    setPage(0);
                  }}
                  rowsPerPageOptions={[5, 10, 20]}
                />
              </>
            ) : (
              <EmptyState
                title="No active work orders"
                description="When repair candidates are triaged and opened into work orders, they will appear here with full execution tracking."
              />
            )}
          </Box>
        )}

        {/* Tab 1: Repair Candidates Queue */}
        {currentTab === 1 && (
          <Box sx={{ p: 3 }}>
            {candidatesError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                Failed to load repair candidates from published inspection reports.
              </Alert>
            )}

            {isCandidatesLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
              </Box>
            ) : candidates && candidates.length > 0 ? (
              <TableContainer>
                <Table sx={{ minWidth: 650 }}>
                  <TableHead sx={{ bgcolor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Finding Code</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Severity</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Defect Label</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Recommended Action</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Published At</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        Action
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {candidates.map((candidate: RepairCandidate) => (
                      <TableRow key={candidate.findingId} hover>
                        <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>
                          {candidate.findingCode}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={candidate.severity}
                            color={
                              candidate.severity === 'CRITICAL' || candidate.severity === 'HIGH'
                                ? 'error'
                                : 'warning'
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{candidate.defectLabel}</TableCell>
                        <TableCell>{candidate.recommendedAction || 'Repair required'}</TableCell>
                        <TableCell>
                          {new Date(candidate.reportPublishedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<BuildOutlined />}
                            onClick={() => setCandidateToOpen(candidate)}
                          >
                            Open Work Order
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <EmptyState
                title="No pending repair candidates"
                description="All published findings requiring repair have already been converted into active work orders or resolved."
              />
            )}
          </Box>
        )}
      </Paper>

      {/* Work Order Detail Dialog */}
      <WorkOrderDetailDialog
        workOrder={selectedWorkOrder}
        open={Boolean(selectedWorkOrder)}
        onClose={() => setSelectedWorkOrder(null)}
        onOpenAssignTeam={() => {
          if (selectedWorkOrder) setWorkOrderToAssign(selectedWorkOrder);
        }}
        onOpenAcceptance={() => {
          if (selectedWorkOrder) setWorkOrderToAccept(selectedWorkOrder);
        }}
        onOpenRejectEstimate={(vNo) => {
          if (selectedWorkOrder) {
            setEstimateToReject({ workOrderId: selectedWorkOrder.id, versionNo: vNo });
          }
        }}
      />

      {/* Action Dialogs */}
      <CreateWorkOrderDialog
        candidate={candidateToOpen}
        open={Boolean(candidateToOpen)}
        onClose={() => setCandidateToOpen(null)}
        onSuccess={() => {
          setCandidateToOpen(null);
          setCurrentTab(0);
        }}
      />

      <AssignTeamDialog
        workOrder={workOrderToAssign}
        open={Boolean(workOrderToAssign)}
        onClose={() => setWorkOrderToAssign(null)}
        onSuccess={() => setWorkOrderToAssign(null)}
      />

      <RecordAcceptanceDialog
        workOrder={workOrderToAccept}
        open={Boolean(workOrderToAccept)}
        onClose={() => setWorkOrderToAccept(null)}
        onSuccess={() => setWorkOrderToAccept(null)}
      />

      <RejectEstimateDialog
        workOrderId={estimateToReject?.workOrderId ?? ''}
        versionNo={estimateToReject?.versionNo ?? 1}
        open={Boolean(estimateToReject)}
        onClose={() => setEstimateToReject(null)}
        onSuccess={() => setEstimateToReject(null)}
      />
    </Box>
  );
}
