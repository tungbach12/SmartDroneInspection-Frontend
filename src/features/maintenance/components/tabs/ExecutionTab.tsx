import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useWorkforceUsers } from '@/features/workforce/hooks/useWorkforce';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import { MutationProblemAlert } from '@/shared/ui/MutationProblemAlert';
import { QueryState } from '@/shared/ui/QueryState';
import { StatusChip } from '@/shared/ui/StatusChip';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import {
  useBatchVerifyWorkLogs,
  useCreateTask,
  useRecordWork,
  useSubmitWorkLog,
  useTasks,
  useTeam,
  useVerifyWorkLog,
  useWorkLogs,
  useWorkOrderTransition,
} from '../../hooks/useMaintenance';
import { maintenanceApi, type WorkOrder } from '../../api/maintenanceApi';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';

export interface ExecutionTabProps {
  workOrder: WorkOrder;
  isOrgAdmin: boolean;
  isEngineer?: boolean;
}

export function ExecutionTab({
  workOrder,
  isOrgAdmin,
  isEngineer = !isOrgAdmin,
}: ExecutionTabProps) {
  const { t } = useLocale();
  const tasks = useTasks(workOrder.id);
  const logs = useWorkLogs(workOrder.id);
  const team = useTeam(workOrder.id);
  const createTask = useCreateTask(workOrder.id);
  const recordWork = useRecordWork(workOrder.id);
  const submitLog = useSubmitWorkLog(workOrder.id);
  const verifyLog = useVerifyWorkLog(workOrder.id);
  const batchVerifyLog = useBatchVerifyWorkLogs(workOrder.id);
  const transition = useWorkOrderTransition(workOrder.id);
  const workforce = useWorkforceUsers(isOrgAdmin);
  const currentUser = useAuthStore((state) => state.user);

  const engineers = useMemo(() => {
    const workforceById = new Map(
      (workforce.data ?? []).map((member) => [member.userId, member]),
    );
    const activeTeam = (team.data ?? []).filter((member) => member.active);
    if (activeTeam.length > 0) {
      const seen = new Set<string>();
      const fromTeam: {
        userId: string;
        email: string;
        fullName: string;
      }[] = [];
      for (const member of activeTeam) {
        if (seen.has(member.engineerUserId)) continue;
        seen.add(member.engineerUserId);
        const wf = workforceById.get(member.engineerUserId);
        const isMe = currentUser?.id === member.engineerUserId;
        fromTeam.push({
          userId: member.engineerUserId,
          email:
            member.engineerEmail ??
            wf?.email ??
            (isMe ? currentUser.email : member.memberRole),
          fullName:
            member.engineerName ??
            wf?.fullName ??
            (isMe ? currentUser.fullName : `${member.memberRole} (${member.engineerUserId.slice(0, 8)})`),
        });
      }
      return fromTeam;
    }

    const list = (workforce.data ?? []).filter(
      (member) => member.roles.includes('MAINTENANCE_ENGINEER') && member.status === 'ACTIVE',
    );
    if (list.length > 0) return list;
    if (currentUser?.roles.includes('MAINTENANCE_ENGINEER')) {
      return [
        {
          userId: currentUser.id,
          email: currentUser.email,
          fullName: currentUser.fullName,
        },
      ];
    }
    return [];
  }, [team.data, workforce.data, currentUser]);

  const [taskOpen, setTaskOpen] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [taskMethod, setTaskMethod] = useState('');
  const [taskEngineer, setTaskEngineer] = useState('');
  const [logTaskId, setLogTaskId] = useState('');
  const [logHours, setLogHours] = useState('');
  const [logCondition, setLogCondition] = useState('');
  const [logReadings, setLogReadings] = useState('');
  const [logProofFile, setLogProofFile] = useState<File | null>(null);
  const [logProofUploading, setLogProofUploading] = useState(false);

  return (
    <Stack spacing={2.5}>
      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary', mb: 1.5 }}>
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
                sx={{ alignItems: 'center', justifyContent: 'space-between', py: 0.5 }}
              >
                <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500 }}>
                  {member.engineerName
                    ? `${member.engineerName}${member.engineerEmail ? ` (${member.engineerEmail})` : ''}`
                    : member.engineerUserId}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Chip size="small" label={member.memberRole} sx={{ height: 22, fontSize: '0.72rem', fontWeight: 600 }} />
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

      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
            {t('Tasks')}
          </Typography>
          {isEngineer && workOrder.status !== 'CLOSED' ? (
            <Button size="small" variant="outlined" onClick={() => setTaskOpen(true)} sx={{ textTransform: 'none', borderRadius: '8px' }}>
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
          <Stack spacing={1.25}>
            {tasks.data.map((task) => (
              <Box
                key={task.id}
                sx={{
                  p: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: '8px',
                  bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'background.default' : '#f8fafc'),
                }}
              >
                <Stack
                  direction="row"
                  spacing={1.5}
                  sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 650, color: 'text.primary' }}>
                    {task.taskNumber}. {task.name}
                  </Typography>
                  <StatusChip status={task.status} />
                </Stack>
                {task.method ? (
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                    {t('Method:')} {task.method}
                  </Typography>
                ) : null}
              </Box>
            ))}
          </Stack>
        ) : null}
      </Paper>

      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
            {t('Work logs')}
          </Typography>
          {isEngineer && (logs.data ?? []).some((l) => l.status === 'SUBMITTED') ? (
            <LoadingButton
              size="small"
              variant="outlined"
              color="primary"
              loading={batchVerifyLog.isPending}
              onClick={() => batchVerifyLog.mutate()}
              sx={{ textTransform: 'none', borderRadius: '8px' }}
            >
              {`${t('Duyệt tất cả nhật ký')} (${(logs.data ?? []).filter((l) => l.status === 'SUBMITTED').length})`}
            </LoadingButton>
          ) : null}
        </Stack>
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
          <Stack spacing={1.25}>
            {logs.data.map((log) => (
              <Box
                key={log.id}
                sx={{
                  p: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: '8px',
                  bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'background.default' : '#f8fafc'),
                }}
              >
                <Stack
                  direction="row"
                  spacing={1.5}
                  sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500 }}>
                    {log.hours} {t('h ·')} {log.asLeftCondition ?? t('No as-left condition recorded')}
                  </Typography>
                  <StatusChip status={log.status} />
                </Stack>
                {log.repairProofUrl && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                      {t('Repair proof photo (AFTER_REPAIR):')}
                    </Typography>
                    {log.repairProofUrl.startsWith('/api/v1/') ? (
                      <AuthenticatedImage
                        src={log.repairProofUrl.replace(/^\/api\/v1/, '')}
                        alt="Repair Proof"
                        maxHeight={140}
                        sx={{ borderRadius: '6px', objectFit: 'contain', bgcolor: '#000' }}
                      />
                    ) : (
                      <Box
                        component="img"
                        src={log.repairProofUrl}
                        alt="Repair Proof"
                        sx={{ maxHeight: 140, borderRadius: '6px', objectFit: 'contain' }}
                      />
                    )}
                  </Box>
                )}
                {isEngineer && (log.status === 'IN_PROGRESS' || log.status === 'DRAFT') ? (
                  <LoadingButton
                    size="small"
                    variant="text"
                    loading={submitLog.isPending && submitLog.variables === log.id}
                    onClick={() => submitLog.mutate(log.id)}
                    sx={{ textTransform: 'none', mt: 0.5 }}
                  >
                    {t('Submit for verification')}
                  </LoadingButton>
                ) : null}
                {isEngineer && log.status === 'SUBMITTED' ? (
                  <LoadingButton
                    size="small"
                    variant="text"
                    loading={verifyLog.isPending && verifyLog.variables === log.id}
                    onClick={() => verifyLog.mutate(log.id)}
                    sx={{ textTransform: 'none', mt: 0.5 }}
                  >
                    {t('Verify work log')}
                  </LoadingButton>
                ) : null}
              </Box>
            ))}
          </Stack>
        ) : null}

        <MutationProblemAlert
          error={submitLog.error}
          isError={submitLog.isError}
          fallbackMessage={t('Could not submit the work log.')}
        />
        <MutationProblemAlert
          error={verifyLog.error}
          isError={verifyLog.isError}
          fallbackMessage={t('Could not verify the work log.')}
        />
        <MutationProblemAlert
          error={batchVerifyLog.error}
          isError={batchVerifyLog.isError}
          fallbackMessage={t('Could not verify the work logs.')}
        />
        <MutationProblemAlert
          error={transition.error}
          isError={transition.isError}
          fallbackMessage={t('Could not update the work order.')}
        />

        {isEngineer &&
        workOrder.status === 'IN_PROGRESS' &&
        (logs.data ?? []).length > 0 &&
        (logs.data ?? []).every((l) => l.status === 'VERIFIED') ? (
          <Box sx={{ mt: 1.5 }}>
            <LoadingButton
              size="small"
              variant="contained"
              color="success"
              loading={transition.isPending}
              onClick={() => transition.mutate('declare-complete')}
              sx={{ textTransform: 'none', borderRadius: '8px' }}
            >
              {t('Declare work completed')}
            </LoadingButton>
          </Box>
        ) : null}

        {isEngineer && workOrder.status !== 'CLOSED' && (tasks.data ?? []).length > 0 ? (
          <Box
            sx={{
              mt: 2,
              p: 2,
              bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'background.default' : '#f1f5f9'),
              borderRadius: '8px',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary', mb: 1.5 }}>
              {t('Record work')}
            </Typography>
            <Stack spacing={1.5}>
              <TextField
                select
                size="small"
                label={t('Task')}
                value={logTaskId || (tasks.data?.[0]?.id ?? '')}
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
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <Button
                  size="small"
                  variant="outlined"
                  component="label"
                  sx={{ textTransform: 'none', borderRadius: '8px' }}
                >
                  {logProofFile
                    ? `${t('Attached')}: ${logProofFile.name}`
                    : t('Attach Repair Proof Photo (BEFORE/AFTER)')}
                  <input
                    hidden
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={(e) => setLogProofFile(e.target.files?.[0] ?? null)}
                  />
                </Button>
                {logProofFile && (
                  <Button
                    size="small"
                    color="inherit"
                    onClick={() => setLogProofFile(null)}
                    sx={{ textTransform: 'none' }}
                  >
                    {t('Remove')}
                  </Button>
                )}
              </Stack>
              <MutationProblemAlert
                error={recordWork.error}
                isError={recordWork.isError}
                fallbackMessage={t('Could not record the work.')}
              />
              <LoadingButton
                size="small"
                variant="contained"
                loading={recordWork.isPending || logProofUploading}
                disabled={!(logTaskId || tasks.data?.[0]?.id) || !logHours || Number(logHours) <= 0}
                onClick={async () => {
                  const effectiveTaskId = logTaskId || tasks.data?.[0]?.id;
                  if (!effectiveTaskId) return;
                  let uploadedProofUrl: string | null = null;
                  if (logProofFile) {
                    setLogProofUploading(true);
                    try {
                      const uploaded = await maintenanceApi.uploadRepairProof(
                        workOrder.id,
                        logProofFile,
                      );
                      uploadedProofUrl = uploaded.repairProofUrl;
                    } finally {
                      setLogProofUploading(false);
                    }
                  }
                  recordWork.mutate(
                    {
                      taskId: effectiveTaskId,
                      hours: Number(logHours),
                      asLeftCondition: logCondition.trim() || null,
                      testReadings: logReadings.trim() || null,
                      repairProofUrl: uploadedProofUrl,
                    },
                    {
                      onSuccess: () => {
                        setLogHours('');
                        setLogCondition('');
                        setLogReadings('');
                        setLogProofFile(null);
                      },
                    },
                  );
                }}
                sx={{ textTransform: 'none', borderRadius: '8px' }}
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
                name: taskName.trim(),
                method: taskMethod.trim() || null,
                assignedEngineerUserId: taskEngineer || engineers[0]?.userId || null,
              },
              {
                onSuccess: () => {
                  setTaskName('');
                  setTaskMethod('');
                  setTaskEngineer('');
                  setTaskOpen(false);
                },
              },
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
                value={taskEngineer || engineers[0]?.userId || ''}
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
            <Button onClick={() => setTaskOpen(false)} sx={{ textTransform: 'none' }}>{t('Cancel')}</Button>
            <LoadingButton
              type="submit"
              variant="contained"
              loading={createTask.isPending}
              disabled={!taskName.trim()}
              sx={{ textTransform: 'none', borderRadius: '8px' }}
            >
              {t('Add task')}
            </LoadingButton>
          </DialogActions>
        </form>
      </Dialog>
    </Stack>
  );
}
