import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import PictureAsPdfOutlined from '@mui/icons-material/PictureAsPdfOutlined';
import { useWorkforceUsers } from '@/features/workforce/hooks/useWorkforce';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import { MutationProblemAlert } from '@/shared/ui/MutationProblemAlert';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryState } from '@/shared/ui/QueryState';
import { StatusChip } from '@/shared/ui/StatusChip';
import {
  useAcceptanceDecisions,
  useChanges,
  useCloseWorkOrder,
  useCreateEstimateVersion,
  useCreateMaintenanceReport,
  useCreateTask,
  useAssignTeam,
  useDecideChange,
  useDecideEstimate,
  useEstimateVersions,
  useProposeChange,
  useReconciliation,
  useRecordAcceptance,
  useRecordWork,
  useReconcileCosts,
  useSubmitEstimate,
  useSubmitMaintenanceReport,
  useSubmitWorkLog,
  useVerifyWorkLog,
  useTasks,
  useTeam,
  useVerifyMaintenanceReport,
  useWorkLogs,
  useWorkOrderTransition,
  useMaintenanceReportVersions,
} from '../hooks/useMaintenance';
import { maintenanceApi, type WorkOrder } from '../api/maintenanceApi';
import { useLocale } from '@/shared/i18n/LocaleProvider';

interface WorkOrderDetailPanelProps {
  workOrder: WorkOrder;
  isOrgAdmin: boolean;
  onClose: () => void;
  onOpenInspection?: (() => void) | undefined;
}

type DetailTab = 'overview' | 'execution' | 'estimate' | 'changes' | 'report' | 'costs';

const TABS: { value: DetailTab; label: string }[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'execution', label: 'Tasks & work' },
  { value: 'estimate', label: 'Estimate' },
  { value: 'changes', label: 'Changes' },
  { value: 'report', label: 'Completion report' },
  { value: 'costs', label: 'Costs & acceptance' },
];

/**
 * MF4 detail: one work order and the actions its role may perform.
 *
 * The role decides which buttons appear, but the backend stays the enforcement boundary: this panel
 * only decides what to offer, never what is permitted. A refusal from the server is shown with its
 * own wording rather than replaced by a client-side guess.
 */
export function WorkOrderDetailPanel({
  workOrder,
  isOrgAdmin,
  onClose,
  onOpenInspection,
}: WorkOrderDetailPanelProps) {
  const { t } = useLocale();
  const [tab, setTab] = useState<DetailTab>('overview');

  return (
    <Stack spacing={2.5}>
      <Button
        startIcon={<ArrowBackRounded />}
        onClick={onClose}
        sx={{
          color: 'text.secondary',
          fontWeight: 500,
          fontSize: '0.875rem',
          textTransform: 'none',
          borderRadius: '8px',
          alignSelf: 'flex-start',
        }}
      >
        {t('Back to work orders')}
      </Button>

      <PageHeader
        title={workOrder.correctiveScope}
        subtitle={`Work order · Priority ${workOrder.priority} · opened for a confirmed repair-required finding`}
        actions={<StatusChip status={workOrder.status} size="medium" />}
      />

      <Tabs value={tab} onChange={(_e, next: DetailTab) => setTab(next)}>
        {TABS.map((entry) => (
          <Tab
            key={entry.value}
            value={entry.value}
            label={entry.label}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          />
        ))}
      </Tabs>

      {tab === 'overview' ? (
        <OverviewTab workOrder={workOrder} isOrgAdmin={isOrgAdmin} onOpenInspection={onOpenInspection} />
      ) : null}
      {tab === 'execution' ? (
        <ExecutionTab workOrder={workOrder} isOrgAdmin={isOrgAdmin} />
      ) : null}
      {tab === 'estimate' ? (
        <EstimateTab workOrder={workOrder} isOrgAdmin={isOrgAdmin} />
      ) : null}
      {tab === 'changes' ? (
        <ChangesTab workOrder={workOrder} isOrgAdmin={isOrgAdmin} />
      ) : null}
      {tab === 'report' ? (
        <ReportTab workOrder={workOrder} isOrgAdmin={isOrgAdmin} />
      ) : null}
      {tab === 'costs' ? (
        <CostsTab workOrder={workOrder} isOrgAdmin={isOrgAdmin} />
      ) : null}
    </Stack>
  );
}

interface OverviewTabProps {
  workOrder: WorkOrder;
  isOrgAdmin: boolean;
  onOpenInspection?: (() => void) | undefined;
}

function OverviewTab({
  workOrder,
  isOrgAdmin,
  onOpenInspection,
}: OverviewTabProps) {
  const { formatDateTime, t } = useLocale();
  const transition = useWorkOrderTransition(workOrder.id);
  const close = useCloseWorkOrder(workOrder.id);
  const [teamOpen, setTeamOpen] = useState(false);

  const engineerActions: { action: 'release' | 'start' | 'declare-complete' | 'resume-after-rework'; label: string }[] =
    [
      { action: 'release', label: 'Mark ready' },
      { action: 'start', label: 'Start execution' },
      { action: 'declare-complete', label: 'Declare work completed' },
      { action: 'resume-after-rework', label: 'Resume after rework' },
    ];

  const isActionDisabled = (action: string) => {
    switch (action) {
      case 'release':
        return workOrder.status !== 'APPROVED';
      case 'start':
        return workOrder.status !== 'READY';
      case 'declare-complete':
        return workOrder.status !== 'IN_PROGRESS';
      case 'resume-after-rework':
        return workOrder.status !== 'REWORK_REQUIRED';
      default:
        return false;
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #eaecf0' }}>
      <Stack spacing={2}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
          <DetailField label={t('Acceptance criteria')} value={workOrder.acceptanceCriteria} />
          <DetailField label={t('Due')} value={workOrder.dueAt ? formatDateTime(new Date(workOrder.dueAt)) : 'Not set'} />
          <DetailField label={t('Budget approver')} value={workOrder.budgetApproverUserId} />
          <DetailField label={t('Team lead')} value={workOrder.teamLeadUserId} />
          <DetailField label={t('Report author')} value={workOrder.reportAuthorUserId} />
          <DetailField label={t('Accepting reviewer')} value={workOrder.acceptingReviewerUserId} />
        </Box>

        {onOpenInspection ? (
          <Box>
            <Button size="small" variant="outlined" onClick={onOpenInspection}>
              {t('Open the source inspection')}
            </Button>
          </Box>
        ) : null}

        <Divider />

        <MutationProblemAlert
          error={transition.error}
          isError={transition.isError}
          fallbackMessage={t('Could not update the work order.')}
        />
        <MutationProblemAlert
          error={close.error}
          isError={close.isError}
          fallbackMessage={t('Could not close the work order.')}
        />

        <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', gap: 1 }}>
          {!isOrgAdmin
            ? engineerActions.map((entry) => (
                <LoadingButton
                  key={entry.action}
                  size="small"
                  variant="outlined"
                  disabled={isActionDisabled(entry.action)}
                  loading={transition.isPending && transition.variables === entry.action}
                  onClick={() => transition.mutate(entry.action)}
                >
                  {entry.label}
                </LoadingButton>
              ))
            : null}
          {isOrgAdmin && !workOrder.teamLeadUserId ? (
            <Button
              size="small"
              variant="outlined"
              onClick={() => setTeamOpen(true)}
            >
              {t('Assign the repair team')}
            </Button>
          ) : null}
          {isOrgAdmin && workOrder.status === 'COST_RECONCILED' ? (
            <LoadingButton
              size="small"
              variant="contained"
              loading={close.isPending}
              onClick={() => close.mutate()}
            >
              {t('Close work order')}
            </LoadingButton>
          ) : null}
        </Stack>

        <Alert severity="info">
          A work order closes only after independent acceptance and cost reconciliation. Closing is
          not a shortcut: the platform keeps the record either way.
        </Alert>

        <AssignTeamDialog
          open={teamOpen}
          onClose={() => setTeamOpen(false)}
          workOrderId={workOrder.id}
          onAssigned={() => setTeamOpen(false)}
        />
      </Stack>
    </Paper>
  );
}

function DetailField({ label, value }: { label: string; value: string | null }) {
  return (
    <Box>
      <Typography
        variant="caption"
        sx={{ color: '#667085', fontWeight: 600, textTransform: 'uppercase' }}
      >
        {label}
      </Typography>
      <Typography variant="body2" sx={{ color: '#344054', mt: 0.25, wordBreak: 'break-word' }}>
        {value ?? '—'}
      </Typography>
    </Box>
  );
}

/**
 * MF4-03 and MF4-04: designate exactly one lead, one report author and one independent accepting
 * reviewer.
 *
 * The accepting reviewer must be someone other than the executing team. The platform enforces that
 * separation, so the dialog says so rather than pretending the client prevents it.
 */
function AssignTeamDialog({
  open,
  onClose,
  workOrderId,
  onAssigned,
}: {
  open: boolean;
  onClose: () => void;
  workOrderId: string;
  onAssigned: () => void;
}) {
  const { t } = useLocale();
  const assignTeam = useAssignTeam(workOrderId);
  const workforce = useWorkforceUsers();

  const engineers = (workforce.data ?? []).filter(
    (member) => member.roles.includes('MAINTENANCE_ENGINEER') && member.status === 'ACTIVE',
  );
  const orgAdmins = (workforce.data ?? []).filter(
    (member) => member.roles.includes('ORG_ADMIN') && member.status === 'ACTIVE',
  );

  const [leadUserId, setLeadUserId] = useState('');
  const [reportAuthorUserId, setReportAuthorUserId] = useState('');
  const [acceptingReviewerUserId, setAcceptingReviewerUserId] = useState('');
  const [reason, setReason] = useState('');

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          assignTeam.mutate(
            {
              leadUserId,
              reportAuthorUserId,
              acceptingReviewerUserId,
              reason: reason.trim() || undefined,
            },
            { onSuccess: onAssigned },
          );
        }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>{t('Assign the repair team')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <MutationProblemAlert
              error={assignTeam.error}
              isError={assignTeam.isError}
              fallbackMessage={t('Could not assign the team.')}
            />
            <TextField
              select
              label={t('Team lead')}
              required
              value={leadUserId}
              onChange={(e) => setLeadUserId(e.target.value)}
            >
              {engineers.map((engineer) => (
                <MenuItem key={engineer.userId} value={engineer.userId}>
                  {engineer.fullName} ({engineer.email})
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label={t('Report author')}
              required
              value={reportAuthorUserId}
              onChange={(e) => setReportAuthorUserId(e.target.value)}
            >
              {engineers.map((engineer) => (
                <MenuItem key={engineer.userId} value={engineer.userId}>
                  {engineer.fullName} ({engineer.email})
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label={t('Independent accepting reviewer')}
              required
              value={acceptingReviewerUserId}
              onChange={(e) => setAcceptingReviewerUserId(e.target.value)}
              helperText={t('Must be someone outside the executing team.')}
            >
              {orgAdmins.map((admin) => (
                <MenuItem key={admin.userId} value={admin.userId}>
                  {admin.fullName} ({admin.email})
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label={t('Reason')}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              helperText={t('Why this team was designated.')}
            />
            <Alert severity="warning">
              The lead and the report author may be the same engineer. The accepting reviewer may
              not be on the executing team, and the platform refuses that assignment.
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <LoadingButton
            type="submit"
            variant="contained"
            loading={assignTeam.isPending}
            disabled={!leadUserId || !reportAuthorUserId || !acceptingReviewerUserId}
          >
            {t('Assign team')}
          </LoadingButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}

function ExecutionTab({
  workOrder,
  isOrgAdmin,
}: {
  workOrder: WorkOrder;
  isOrgAdmin: boolean;
}) {
  const { t } = useLocale();
  const tasks = useTasks(workOrder.id);
  const logs = useWorkLogs(workOrder.id);
  const team = useTeam(workOrder.id);
  const createTask = useCreateTask(workOrder.id);
  const recordWork = useRecordWork(workOrder.id);
  const submitLog = useSubmitWorkLog(workOrder.id);
  const verifyLog = useVerifyWorkLog(workOrder.id);
  const workforce = useWorkforceUsers();

  const engineers = (workforce.data ?? []).filter(
    (member) => member.roles.includes('MAINTENANCE_ENGINEER') && member.status === 'ACTIVE',
  );

  const [taskOpen, setTaskOpen] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [taskMethod, setTaskMethod] = useState('');
  const [taskEngineer, setTaskEngineer] = useState('');
  const [logTaskId, setLogTaskId] = useState('');
  const [logHours, setLogHours] = useState('');
  const [logCondition, setLogCondition] = useState('');
  const [logReadings, setLogReadings] = useState('');

  return (
    <Stack spacing={2.5}>
      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #eaecf0' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#101828', mb: 1.5 }}>
          {t('Repair team')}
        </Typography>
        <QueryState
          isLoading={team.isLoading}
          error={team.error}
          onRetry={() => void team.refetch()}
        >
          {null}
        </QueryState>
        {team.data && team.data.length > 0 ? (
          <Stack spacing={1}>
            {team.data.map((member) => (
              <Stack
                key={member.id}
                direction="row"
                spacing={1.5}
                sx={{ alignItems: 'center', justifyContent: 'space-between' }}
              >
                <Typography variant="body2" sx={{ color: '#344054' }}>
                  {member.engineerUserId}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Chip size="small" label={member.memberRole} sx={{ height: 20, fontSize: 10 }} />
                  <StatusChip status={member.active ? 'ACTIVE' : 'INACTIVE'} />
                </Stack>
              </Stack>
            ))}
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            {t('No team assigned yet.')}
          </Typography>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #eaecf0' }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#101828' }}>
            {t('Tasks')}
          </Typography>
          {!isOrgAdmin ? (
            <Button size="small" variant="outlined" onClick={() => setTaskOpen(true)}>
              {t('Add task')}
            </Button>
          ) : null}
        </Stack>
        <QueryState
          isLoading={tasks.isLoading}
          error={tasks.error}
          onRetry={() => void tasks.refetch()}
          isEmpty={(tasks.data ?? []).length === 0}
          empty={
            <Typography variant="body2" color="text.secondary">
              {t('No task planned yet.')}
            </Typography>
          }
        >
          {null}
        </QueryState>
        {tasks.data && tasks.data.length > 0 ? (
          <Stack spacing={1}>
            {tasks.data.map((task) => (
              <Box
                key={task.id}
                sx={{ p: 1.5, border: '1px solid #e2e8f0', borderRadius: 1.5 }}
              >
                <Stack
                  direction="row"
                  spacing={1.5}
                  sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#101828' }}>
                    {task.taskNumber}. {task.name}
                  </Typography>
                  <StatusChip status={task.status} />
                </Stack>
                {task.method ? (
                  <Typography variant="caption" sx={{ color: '#667085' }}>
                    {t('Method:')} {task.method}
                  </Typography>
                ) : null}
              </Box>
            ))}
          </Stack>
        ) : null}
      </Paper>

      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #eaecf0' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#101828', mb: 1.5 }}>
          {t('Work logs')}
        </Typography>
        <QueryState
          isLoading={logs.isLoading}
          error={logs.error}
          onRetry={() => void logs.refetch()}
          isEmpty={(logs.data ?? []).length === 0}
          empty={
            <Typography variant="body2" color="text.secondary">
              {t('No time recorded yet.')}
            </Typography>
          }
        >
          {null}
        </QueryState>
        {logs.data && logs.data.length > 0 ? (
          <Stack spacing={1}>
            {logs.data.map((log) => (
              <Box
                key={log.id}
                sx={{ p: 1.5, border: '1px solid #e2e8f0', borderRadius: 1.5 }}
              >
                <Stack
                  direction="row"
                  spacing={1.5}
                  sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Typography variant="body2" sx={{ color: '#344054' }}>
                    {log.hours} {t('h ·')} {log.asLeftCondition ?? 'No as-left condition recorded'}
                  </Typography>
                  <StatusChip status={log.status} />
                </Stack>
                {!isOrgAdmin && log.status === 'DRAFT' ? (
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => submitLog.mutate(log.id)}
                  >
                    {t('Submit for verification')}
                  </Button>
                ) : null}
                {!isOrgAdmin && log.status === 'SUBMITTED' ? (
                  <LoadingButton
                    size="small"
                    variant="text"
                    loading={verifyLog.isPending}
                    onClick={() => verifyLog.mutate(log.id)}
                  >
                    {t('Verify work log')}
                  </LoadingButton>
                ) : null}
              </Box>
            ))}
          </Stack>
        ) : null}

        {!isOrgAdmin && (tasks.data ?? []).length > 0 ? (
          <Box sx={{ mt: 2, p: 2, bgcolor: '#f8fafc', borderRadius: 1.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#101828', mb: 1.5 }}>
              {t('Record work')}
            </Typography>
            <Stack spacing={1.5}>
              <TextField
                select
                size="small"
                label={t('Task')}
                value={logTaskId}
                onChange={(e) => setLogTaskId(e.target.value)}
              >
                {(tasks.data ?? []).map((task) => (
                  <MenuItem key={task.id} value={task.id}>
                    {task.taskNumber}. {task.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                size="small"
                label={t('Hours')}
                type="number"
                value={logHours}
                onChange={(e) => setLogHours(e.target.value)}
              />
              <TextField
                size="small"
                label={t('As-left condition')}
                value={logCondition}
                onChange={(e) => setLogCondition(e.target.value)}
              />
              <TextField
                size="small"
                label={t('Test readings')}
                value={logReadings}
                onChange={(e) => setLogReadings(e.target.value)}
              />
              <MutationProblemAlert
                error={recordWork.error}
                isError={recordWork.isError}
                fallbackMessage={t('Could not record the work.')}
              />
              <LoadingButton
                size="small"
                variant="contained"
                loading={recordWork.isPending}
                disabled={!logTaskId || !logHours}
                onClick={() =>
                  recordWork.mutate({
                    taskId: logTaskId,
                    hours: Number(logHours),
                    asLeftCondition: logCondition || null,
                    testReadings: logReadings || null,
                  })
                }
              >
                {t('Record work')}
              </LoadingButton>
            </Stack>
          </Box>
        ) : null}
      </Paper>

      <Dialog open={taskOpen} onClose={() => setTaskOpen(false)} fullWidth maxWidth="sm">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            createTask.mutate(
              {
                name: taskName,
                method: taskMethod || null,
                assignedEngineerUserId: taskEngineer || null,
              },
              { onSuccess: () => setTaskOpen(false) },
            );
          }}
        >
          <DialogTitle sx={{ fontWeight: 700 }}>{t('Add task')}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <MutationProblemAlert
                error={createTask.error}
                isError={createTask.isError}
                fallbackMessage={t('Could not add the task.')}
              />
              <TextField
                label={t('Task name')}
                required
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
              />
              <TextField
                label={t('Method')}
                value={taskMethod}
                onChange={(e) => setTaskMethod(e.target.value)}
              />
              <TextField
                select
                label={t('Assigned engineer')}
                value={taskEngineer}
                onChange={(e) => setTaskEngineer(e.target.value)}
              >
                {engineers.map((engineer) => (
                  <MenuItem key={engineer.userId} value={engineer.userId}>
                    {engineer.fullName}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setTaskOpen(false)}>{t('Cancel')}</Button>
            <Button type="submit" variant="contained" disabled={!taskName.trim()}>
              {t('Add task')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Stack>
  );
}

function EstimateTab({
  workOrder,
  isOrgAdmin,
}: {
  workOrder: WorkOrder;
  isOrgAdmin: boolean;
}) {
  const { t } = useLocale();
  const estimates = useEstimateVersions(workOrder.id);
  const createEstimate = useCreateEstimateVersion(workOrder.id);
  const submitEstimate = useSubmitEstimate(workOrder.id);
  const decideEstimate = useDecideEstimate(workOrder.id);

  const [open, setOpen] = useState(false);
  const [currency, setCurrency] = useState('VND');
  const [snapshot, setSnapshot] = useState('');
  const [lineDescription, setLineDescription] = useState('');
  const [lineQuantity, setLineQuantity] = useState('1');
  const [lineRate, setLineRate] = useState('');

  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #eaecf0' }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#101828' }}>
          {t('Estimate versions')}
        </Typography>
        {!isOrgAdmin ? (
          <Button size="small" variant="outlined" onClick={() => setOpen(true)}>
            {t('New estimate')}
          </Button>
        ) : null}
      </Stack>

      <QueryState
        isLoading={estimates.isLoading}
        error={estimates.error}
        onRetry={() => void estimates.refetch()}
        isEmpty={(estimates.data ?? []).length === 0}
        empty={
          <Typography variant="body2" color="text.secondary">
            {t('No estimate prepared yet. The engineer supplies the rates; the platform totals them.')}
          </Typography>
        }
      >
        {null}
      </QueryState>

      {estimates.data && estimates.data.length > 0 ? (
        <Stack spacing={1.5}>
          {estimates.data.map((version) => (
            <Box key={version.id} sx={{ p: 1.5, border: '1px solid #e2e8f0', borderRadius: 1.5 }}>
              <Stack
                direction="row"
                spacing={1.5}
                sx={{ alignItems: 'center', justifyContent: 'space-between' }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#101828' }}>
                  {t('Version')} {version.versionNo} · {version.baselineTotal ?? '—'} {version.currency}
                </Typography>
                <StatusChip status={version.status} />
              </Stack>
              {version.assumptions ? (
                <Typography variant="caption" sx={{ color: '#667085' }}>
                  {version.assumptions}
                </Typography>
              ) : null}
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                {!isOrgAdmin && version.status === 'DRAFT' ? (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => submitEstimate.mutate(version.versionNo)}
                  >
                    {t('Submit for approval')}
                  </Button>
                ) : null}
                {isOrgAdmin && version.status === 'SUBMITTED' ? (
                  <>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() =>
                        decideEstimate.mutate({ versionNo: version.versionNo, approve: true })
                      }
                    >
                      {t('Approve')}
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={() =>
                        decideEstimate.mutate({
                          versionNo: version.versionNo,
                          approve: false,
                          reason: 'Rejected by the budget approver',
                        })
                      }
                    >
                      {t('Reject')}
                    </Button>
                  </>
                ) : null}
              </Stack>
            </Box>
          ))}
        </Stack>
      ) : null}

      <MutationProblemAlert
        error={createEstimate.error}
        isError={createEstimate.isError}
        fallbackMessage={t('Could not create the estimate.')}
      />
      <MutationProblemAlert
        error={decideEstimate.error}
        isError={decideEstimate.isError}
        fallbackMessage={t('Could not record the estimate decision.')}
      />

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            createEstimate.mutate(
              {
                currency,
                snapshot: snapshot || 'Estimate prepared from the approved task scope',
                lines: [
                  {
                    lineKind: 'LABOR',
                    description: lineDescription,
                    quantity: Number(lineQuantity),
                    unitRate: Number(lineRate),
                  },
                ],
              },
              { onSuccess: () => setOpen(false) },
            );
          }}
        >
          <DialogTitle sx={{ fontWeight: 700 }}>{t('New estimate version')}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <MutationProblemAlert
                error={createEstimate.error}
                isError={createEstimate.isError}
                fallbackMessage={t('Could not create the estimate.')}
              />
              <TextField
                select
                label={t('Currency')}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <MenuItem value="VND">VND</MenuItem>
                <MenuItem value="USD">USD</MenuItem>
              </TextField>
              <TextField
                label={t('Line description')}
                required
                value={lineDescription}
                onChange={(e) => setLineDescription(e.target.value)}
              />
              <Stack direction="row" spacing={2}>
                <TextField
                  label={t('Quantity')}
                  type="number"
                  value={lineQuantity}
                  onChange={(e) => setLineQuantity(e.target.value)}
                  fullWidth
                />
                <TextField
                  label={t('Unit rate')}
                  type="number"
                  value={lineRate}
                  onChange={(e) => setLineRate(e.target.value)}
                  fullWidth
                />
              </Stack>
              <TextField
                label={t('Assumptions')}
                value={snapshot}
                onChange={(e) => setSnapshot(e.target.value)}
              />
              <Alert severity="info">
                {t('The platform totals the priced lines. A missing rate is not recorded as zero.')}
              </Alert>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOpen(false)}>{t('Cancel')}</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={!lineDescription.trim() || !lineRate}
            >
              {t('Create estimate')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Paper>
  );
}

function ChangesTab({
  workOrder,
  isOrgAdmin,
}: {
  workOrder: WorkOrder;
  isOrgAdmin: boolean;
}) {
  const { t } = useLocale();
  const changes = useChanges(workOrder.id);
  const propose = useProposeChange(workOrder.id);
  const decide = useDecideChange(workOrder.id);

  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [delta, setDelta] = useState('');
  const [evidence, setEvidence] = useState('');

  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #eaecf0' }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#101828' }}>
          {t('Change requests')}
        </Typography>
        {!isOrgAdmin ? (
          <Button size="small" variant="outlined" onClick={() => setOpen(true)}>
            {t('Propose change')}
          </Button>
        ) : null}
      </Stack>

      <QueryState
        isLoading={changes.isLoading}
        error={changes.error}
        onRetry={() => void changes.refetch()}
        isEmpty={(changes.data ?? []).length === 0}
        empty={
          <Typography variant="body2" color="text.secondary">
            No change proposed. A change widens scope, cost or time and authorizes nothing until
            approved.
          </Typography>
        }
      >
        {null}
      </QueryState>

      {changes.data && changes.data.length > 0 ? (
        <Stack spacing={1.5}>
          {changes.data.map((change) => (
            <Box key={change.id} sx={{ p: 1.5, border: '1px solid #e2e8f0', borderRadius: 1.5 }}>
              <Stack
                direction="row"
                spacing={1.5}
                sx={{ alignItems: 'center', justifyContent: 'space-between' }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#101828' }}>
                  {t('Change #')}{change.changeNumber}
                  {change.proposedDelta ? ` · ${change.proposedDelta}` : ''}
                </Typography>
                <StatusChip status={change.status} />
              </Stack>
              <Typography variant="caption" sx={{ color: '#475467' }}>
                {change.reason}
              </Typography>
              {isOrgAdmin && change.status === 'PROPOSED' ? (
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() =>
                      decide.mutate({
                        changeNumber: change.changeNumber,
                        decision: 'approve',
                        reason: 'Approved by the budget approver',
                      })
                    }
                  >
                    {t('Approve')}
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={() =>
                      decide.mutate({
                        changeNumber: change.changeNumber,
                        decision: 'reject',
                        reason: 'Rejected by the budget approver',
                      })
                    }
                  >
                    {t('Reject')}
                  </Button>
                  <Button
                    size="small"
                    variant="text"
                    onClick={() =>
                      decide.mutate({
                        changeNumber: change.changeNumber,
                        decision: 'return',
                        reason: 'Returned for more detail',
                      })
                    }
                  >
                    {t('Return')}
                  </Button>
                </Stack>
              ) : null}
            </Box>
          ))}
        </Stack>
      ) : null}

      <MutationProblemAlert
        error={propose.error}
        isError={propose.isError}
        fallbackMessage={t('Could not propose the change.')}
      />

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            propose.mutate(
              {
                reason,
                proposedDelta: delta ? Number(delta) : null,
                supportingEvidence: evidence || null,
              },
              { onSuccess: () => setOpen(false) },
            );
          }}
        >
          <DialogTitle sx={{ fontWeight: 700 }}>{t('Propose a change')}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <MutationProblemAlert
                error={propose.error}
                isError={propose.isError}
                fallbackMessage={t('Could not propose the change.')}
              />
              <TextField
                label={t('Reason')}
                required
                multiline
                minRows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <TextField
                label={t('Proposed cost delta')}
                type="number"
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
              />
              <TextField
                label={t('Supporting evidence')}
                value={evidence}
                onChange={(e) => setEvidence(e.target.value)}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOpen(false)}>{t('Cancel')}</Button>
            <Button type="submit" variant="contained" disabled={!reason.trim()}>
              {t('Propose')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Paper>
  );
}

function ReportTab({
  workOrder,
  isOrgAdmin,
}: {
  workOrder: WorkOrder;
  isOrgAdmin: boolean;
}) {
  const { t } = useLocale();
  const reports = useMaintenanceReportVersions(workOrder.id);
  const createReport = useCreateMaintenanceReport(workOrder.id);
  const verifyReport = useVerifyMaintenanceReport(workOrder.id);
  const submitReport = useSubmitMaintenanceReport(workOrder.id);

  const [content, setContent] = useState('');

  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #eaecf0' }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#101828', mb: 1.5 }}>
        {t('Completion report versions')}
      </Typography>

      <QueryState
        isLoading={reports.isLoading}
        error={reports.error}
        onRetry={() => void reports.refetch()}
        isEmpty={(reports.data ?? []).length === 0}
        empty={
          <Typography variant="body2" color="text.secondary">
            {t('No completion report drafted yet.')}
          </Typography>
        }
      >
        {null}
      </QueryState>

      {reports.data && reports.data.length > 0 ? (
        <Stack spacing={1.5}>
          {reports.data.map((version) => (
            <Box key={version.id} sx={{ p: 1.5, border: '1px solid #e2e8f0', borderRadius: 1.5 }}>
              <Stack
                direction="row"
                spacing={1.5}
                sx={{ alignItems: 'center', justifyContent: 'space-between' }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#101828' }}>
                  {t('Version')} {version.versionNo}
                </Typography>
                <StatusChip status={version.status} />
              </Stack>
              {version.contentSnapshot ? (
                <Typography
                  variant="body2"
                  sx={{ color: '#475467', mt: 0.5, whiteSpace: 'pre-wrap' }}
                >
                  {version.contentSnapshot}
                </Typography>
              ) : null}
              <Stack direction="row" spacing={1} sx={{ mt: 1, alignItems: 'center' }}>
                {!isOrgAdmin && version.status === 'DRAFT' ? (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => verifyReport.mutate(version.versionNo)}
                  >
                    {t('Verify against sources')}
                  </Button>
                ) : null}
                {!isOrgAdmin && version.status === 'AUTHOR_VERIFIED' ? (
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => submitReport.mutate(version.versionNo)}
                  >
                    {t('Submit for acceptance')}
                  </Button>
                ) : null}
                <Button
                  size="small"
                  variant="text"
                  component="a"
                  href={maintenanceApi.getReportPdfUrl(workOrder.id, version.versionNo)}
                  target="_blank"
                  rel="noopener noreferrer"
                  startIcon={<PictureAsPdfOutlined />}
                >
                  {t('Download PDF')}
                </Button>
              </Stack>
            </Box>
          ))}
        </Stack>
      ) : null}

      {!isOrgAdmin ? (
        <Box sx={{ mt: 2, p: 2, bgcolor: '#f8fafc', borderRadius: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#101828', mb: 1.5 }}>
            {t('Draft a completion report')}
          </Typography>
          <Stack spacing={1.5}>
            <TextField
              label={t('Completion narrative')}
              multiline
              minRows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <MutationProblemAlert
              error={createReport.error}
              isError={createReport.isError}
              fallbackMessage={t('Could not draft the report.')}
            />
            <LoadingButton
              size="small"
              variant="contained"
              loading={createReport.isPending}
              disabled={!content.trim()}
              onClick={() => createReport.mutate(content.trim())}
            >
              {t('Draft report')}
            </LoadingButton>
          </Stack>
        </Box>
      ) : null}
    </Paper>
  );
}

function CostsTab({
  workOrder,
  isOrgAdmin,
}: {
  workOrder: WorkOrder;
  isOrgAdmin: boolean;
}) {
  const { formatDateTime, t } = useLocale();
  const reconciliation = useReconciliation(workOrder.id);
  const acceptance = useAcceptanceDecisions(workOrder.id);
  const recordAcceptance = useRecordAcceptance(workOrder.id);
  const reconcile = useReconcileCosts(workOrder.id);
  const tasks = useTasks(workOrder.id);

  const [decision, setDecision] = useState<'ACCEPTED' | 'REWORK_REQUIRED' | 'REINSPECTION_REQUIRED'>(
    'ACCEPTED',
  );
  const [comments, setComments] = useState('');
  const [checklist, setChecklist] = useState('');
  const [testResult, setTestResult] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [lineDescription, setLineDescription] = useState('');
  const [lineQuantity, setLineQuantity] = useState('1');
  const [lineRate, setLineRate] = useState('');
  const [lineCurrency, setLineCurrency] = useState('VND');

  return (
    <Stack spacing={2.5}>
      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #eaecf0' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#101828', mb: 1.5 }}>
          {t('Cost reconciliation')}
        </Typography>
        <QueryState
          isLoading={reconciliation.isLoading}
          error={reconciliation.error}
          onRetry={() => void reconciliation.refetch()}
        >
          {null}
        </QueryState>
        {reconciliation.data ? (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' },
              gap: 2,
            }}
          >
            <DetailField
              label={t('Approved baseline')}
              value={`${reconciliation.data.approvedBaselineTotal} ${reconciliation.data.currency}`}
            />
            <DetailField
              label={t('Approved changes')}
              value={`${reconciliation.data.approvedChangeDelta} ${reconciliation.data.currency}`}
            />
            <DetailField
              label={t('Authorized amount')}
              value={`${reconciliation.data.authorizedAmount} ${reconciliation.data.currency}`}
            />
            <DetailField
              label={t('Actual total')}
              value={`${reconciliation.data.actualTotal} ${reconciliation.data.currency}`}
            />
            <DetailField
              label={t('Variance')}
              value={`${reconciliation.data.variance} ${reconciliation.data.currency}`}
            />
            <DetailField
              label={t('Variance %')}
              value={
                reconciliation.data.variancePercent === null
                  ? 'Not applicable'
                  : `${reconciliation.data.variancePercent}%`
              }
            />
          </Box>
        ) : null}

        {isOrgAdmin ? (
          <Box sx={{ mt: 2, p: 2, bgcolor: '#f8fafc', borderRadius: 1.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#101828', mb: 1.5 }}>
              {t('Record actual cost')}
            </Typography>
            <Stack spacing={1.5}>
              <TextField
                label={t('Description')}
                required
                value={lineDescription}
                onChange={(e) => setLineDescription(e.target.value)}
              />
              {(tasks.data ?? []).length > 0 ? (
                <TextField
                  select
                  label={t('Task')}
                  required
                  value={selectedTaskId || (tasks.data?.[0]?.id ?? '')}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  fullWidth
                >
                  {(tasks.data ?? []).map((task) => (
                    <MenuItem key={task.id} value={task.id}>
                      #{task.taskNumber} · {task.name}
                    </MenuItem>
                  ))}
                </TextField>
              ) : null}
              <Stack direction="row" spacing={2}>
                <TextField
                  label={t('Quantity')}
                  type="number"
                  value={lineQuantity}
                  onChange={(e) => setLineQuantity(e.target.value)}
                  fullWidth
                />
                <TextField
                  label={t('Unit rate')}
                  type="number"
                  value={lineRate}
                  onChange={(e) => setLineRate(e.target.value)}
                  fullWidth
                />
                <TextField
                  select
                  label={t('Currency')}
                  value={lineCurrency}
                  onChange={(e) => setLineCurrency(e.target.value)}
                  fullWidth
                >
                  <MenuItem value="VND">VND</MenuItem>
                  <MenuItem value="USD">USD</MenuItem>
                </TextField>
              </Stack>
              <MutationProblemAlert
                error={reconcile.error}
                isError={reconcile.isError}
                fallbackMessage={t('Could not reconcile the costs.')}
              />
              <LoadingButton
                size="small"
                variant="contained"
                loading={reconcile.isPending}
                disabled={!lineDescription.trim() || !lineRate || !(selectedTaskId || tasks.data?.[0]?.id)}
                onClick={() => {
                  const effectiveTaskId = selectedTaskId || tasks.data?.[0]?.id;
                  if (!effectiveTaskId) return;
                  reconcile.mutate({
                    actualLines: [
                      {
                        taskId: effectiveTaskId,
                        lineKind: 'MATERIAL',
                        description: lineDescription,
                        quantity: Number(lineQuantity),
                        unitRate: Number(lineRate),
                        currency: lineCurrency,
                      },
                    ],
                  });
                }}
              >
                {t('Reconcile costs')}
              </LoadingButton>
              <Alert severity="info">
                Actual cost lines never overwrite an estimate line. The variance is computed by the
                platform from the approved baseline, the approved changes and these actuals.
              </Alert>
            </Stack>
          </Box>
        ) : null}
      </Paper>

      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #eaecf0' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#101828', mb: 1.5 }}>
          {t('Acceptance decisions')}
        </Typography>
        <QueryState
          isLoading={acceptance.isLoading}
          error={acceptance.error}
          onRetry={() => void acceptance.refetch()}
          isEmpty={(acceptance.data ?? []).length === 0}
          empty={
            <Typography variant="body2" color="text.secondary">
              {t('No acceptance decision recorded yet.')}
            </Typography>
          }
        >
          {null}
        </QueryState>
        {acceptance.data && acceptance.data.length > 0 ? (
          <Stack spacing={1.5}>
            {acceptance.data.map((entry) => (
              <Box key={entry.id} sx={{ p: 1.5, border: '1px solid #e2e8f0', borderRadius: 1.5 }}>
                <Stack
                  direction="row"
                  spacing={1.5}
                  sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#101828' }}>
                    {entry.decision}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#667085' }}>
                    {formatDateTime(new Date(entry.decidedAt))}
                  </Typography>
                </Stack>
                {entry.technicalComments ? (
                  <Typography variant="body2" sx={{ color: '#475467', mt: 0.5 }}>
                    {entry.technicalComments}
                  </Typography>
                ) : null}
              </Box>
            ))}
          </Stack>
        ) : null}

        {isOrgAdmin ? (
          <Box sx={{ mt: 2, p: 2, bgcolor: '#f8fafc', borderRadius: 1.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#101828', mb: 1.5 }}>
              {t('Record the acceptance decision')}
            </Typography>
            <Stack spacing={1.5}>
              <TextField
                select
                label={t('Decision')}
                value={decision}
                onChange={(e) =>
                  setDecision(e.target.value as typeof decision)
                }
              >
                <MenuItem value="ACCEPTED">{t('Accepted')}</MenuItem>
                <MenuItem value="REWORK_REQUIRED">{t('Return for rework')}</MenuItem>
                <MenuItem value="REINSPECTION_REQUIRED">{t('Request re-inspection')}</MenuItem>
              </TextField>
              <TextField
                label={t('Technical comments')}
                multiline
                minRows={2}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
              />
              <TextField
                label={t('Acceptance checklist')}
                value={checklist}
                onChange={(e) => setChecklist(e.target.value)}
              />
              <TextField
                label={t('Test result')}
                value={testResult}
                onChange={(e) => setTestResult(e.target.value)}
              />
              <MutationProblemAlert
                error={recordAcceptance.error}
                isError={recordAcceptance.isError}
                fallbackMessage={t('Could not record the acceptance decision.')}
              />
              <LoadingButton
                size="small"
                variant="contained"
                loading={recordAcceptance.isPending}
                onClick={() =>
                  recordAcceptance.mutate({
                    decision,
                    technicalComments: comments || null,
                    acceptanceChecklist: checklist || null,
                    testResult: testResult || null,
                  })
                }
              >
                {t('Record decision')}
              </LoadingButton>
              <Alert severity="warning">
                Only the designated independent reviewer can record this. The engineer who did the
                work cannot accept it.
              </Alert>
            </Stack>
          </Box>
        ) : null}
      </Paper>
    </Stack>
  );
}
