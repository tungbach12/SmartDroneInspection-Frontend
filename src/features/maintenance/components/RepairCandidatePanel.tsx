import { useMemo, useState } from 'react';
import {
  Alert,
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
import AssignmentTurnedInOutlined from '@mui/icons-material/AssignmentTurnedInOutlined';
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useWorkforceUsers } from '@/features/workforce/hooks/useWorkforce';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import { MutationProblemAlert } from '@/shared/ui/MutationProblemAlert';
import { QueryState } from '@/shared/ui/QueryState';
import { StatusChip } from '@/shared/ui/StatusChip';
import {
  useCreateWorkOrder,
  useRepairCandidates,
  useSuggestWorkOrderScope,
} from '../hooks/useMaintenance';
import type { RepairCandidate, SuggestedTask } from '../api/maintenanceApi';
import { useLocale } from '@/shared/i18n/LocaleProvider';

interface RepairCandidatePanelProps {
  onCreated: () => void;
}

/**
 * MF4-01 and MF4-02: triage the published repair-required findings and open a work order.
 *
 * The candidate list is the seam where MF3 hands its confirmed findings to MF4. It shows only
 * findings that already carry a published report version and no live work order, because a
 * finding already under repair is not a new triage decision.
 */
export function RepairCandidatePanel({ onCreated }: RepairCandidatePanelProps) {
  const { t } = useLocale();
  const candidates = useRepairCandidates();
  const createWorkOrder = useCreateWorkOrder();
  const suggestScope = useSuggestWorkOrderScope();
  const workforce = useWorkforceUsers();

  const [target, setTarget] = useState<RepairCandidate | null>(null);
  const [correctiveScope, setCorrectiveScope] = useState('');
  const [acceptanceCriteria, setAcceptanceCriteria] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
  const [dueAt, setDueAt] = useState('');
  const [budgetApprover, setBudgetApprover] = useState('');
  const [standards, setStandards] = useState<string[]>([]);
  const [suggestedTasks, setSuggestedTasks] = useState<SuggestedTask[]>([]);

  const currentUser = useAuthStore((state) => state.user);
  const orgAdmins = useMemo(() => {
    const list = (workforce.data ?? []).filter(
      (member) => member.roles.includes('ORG_MANAGER') && member.status === 'ACTIVE',
    );
    if (list.length > 0) return list;
    if (currentUser?.roles.includes('ORG_MANAGER')) {
      return [
        {
          userId: currentUser.id,
          email: currentUser.email,
          fullName: currentUser.fullName,
          roles: currentUser.roles,
          status: 'ACTIVE',
          organizationId: currentUser.organizationId ?? '',
        },
      ];
    }
    return [];
  }, [workforce.data, currentUser]);

  const effectiveBudgetApprover = budgetApprover || orgAdmins[0]?.userId || '';
  const items = candidates.data ?? [];

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: '16px', border: '1px solid #eaecf0' }}>
      <Stack spacing={2}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <AssignmentTurnedInOutlined color="primary" />
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#101828' }}>
              {t('Repair candidates')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('Confirmed findings on a published report that still need corrective work.')}
            </Typography>
          </Box>
        </Stack>

        <MutationProblemAlert
          error={createWorkOrder.error}
          isError={createWorkOrder.isError}
          fallbackMessage={t('Could not create the work order.')}
        />

        <QueryState
          isLoading={candidates.isLoading}
          error={candidates.error}
          onRetry={() => void candidates.refetch()}
          isEmpty={items.length === 0}
          loadingLabel={t('Loading repair candidates…')}
          empty={
            <Typography variant="body2" color="text.secondary">
              {t('No repair-required finding is waiting for corrective work.')}
            </Typography>
          }
        >
          {null}
        </QueryState>

        {items.length > 0 ? (
          <Stack spacing={1.5}>
            {items.map((candidate) => (
              <Box
                key={candidate.findingId}
                sx={{ p: 1.5, border: '1px solid #e2e8f0', borderRadius: 1.5 }}
              >
                <Stack
                  direction="row"
                  spacing={1.5}
                  sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#101828' }}>
                        {candidate.findingCode} · {candidate.defectLabel}
                      </Typography>
                      <StatusChip status={candidate.severity} />
                    </Stack>
                    <Typography variant="body2" sx={{ color: '#475467', mt: 0.5 }}>
                      {candidate.technicalNotes}
                    </Typography>
                    {candidate.recommendedAction ? (
                      <Typography variant="caption" sx={{ color: '#667085', display: 'block', mt: 0.5 }}>
                        {t('Recommended:')} {candidate.recommendedAction}
                      </Typography>
                    ) : null}
                  </Box>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => {
                      setTarget(candidate);
                      setCorrectiveScope(candidate.recommendedAction ?? '');
                      setAcceptanceCriteria('');
                      setPriority(
                        candidate.severity === 'CRITICAL'
                          ? 'URGENT'
                          : candidate.severity === 'HIGH'
                            ? 'HIGH'
                            : candidate.severity === 'LOW'
                              ? 'LOW'
                              : 'NORMAL',
                      );
                      setDueAt('');
                      setBudgetApprover(orgAdmins[0]?.userId ?? '');
                      setStandards([]);
                      setSuggestedTasks([]);
                    }}
                  >
                    {t('Open work order')}
                  </Button>
                </Stack>
              </Box>
            ))}
          </Stack>
        ) : null}
      </Stack>

      <Dialog open={Boolean(target)} onClose={() => setTarget(null)} fullWidth maxWidth="sm">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!target) return;
            createWorkOrder.mutate(
              {
                assetId: target.assetId,
                sourceReportVersionId: target.reportVersionId,
                sourceFindingId: target.findingId,
                budgetApproverUserId: effectiveBudgetApprover,
                priority,
                dueAt: dueAt ? new Date(dueAt).toISOString() : null,
                correctiveScope: correctiveScope.trim(),
                acceptanceCriteria: acceptanceCriteria.trim() || null,
              },
              {
                onSuccess: () => {
                  setTarget(null);
                  onCreated();
                },
              },
            );
          }}
        >
          <DialogTitle sx={{ fontWeight: 700 }}>{t('Open a work order')}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <MutationProblemAlert
                error={createWorkOrder.error}
                isError={createWorkOrder.isError}
                fallbackMessage={t('Could not create the work order.')}
              />
              {target ? (
                <Alert severity="info">
                  {target.findingCode} · {target.defectLabel}
                </Alert>
              ) : null}
              <Stack
                direction="row"
                spacing={1}
                sx={{ justifyContent: 'space-between', alignItems: 'center' }}
              >
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 700, color: '#344054', textTransform: 'uppercase' }}
                >
                  {t('Corrective Specification')}
                </Typography>
                <LoadingButton
                  size="small"
                  variant="outlined"
                  startIcon={<AutoAwesomeOutlined />}
                  loading={suggestScope.isPending}
                  onClick={() => {
                    if (!target) return;
                    suggestScope.mutate(
                      {
                        sourceReportVersionId: target.reportVersionId,
                        sourceFindingId: target.findingId,
                        findingCode: target.findingCode,
                        defectLabel: target.defectLabel,
                        description: target.technicalNotes,
                        severity: target.severity,
                        recommendedAction: target.recommendedAction,
                        component: target.component,
                        locationDescription: target.locationDescription,
                        measurement: target.measurement,
                      },
                      {
                        onSuccess: (data) => {
                          if (data.correctiveScope) setCorrectiveScope(data.correctiveScope);
                          if (data.acceptanceCriteria) setAcceptanceCriteria(data.acceptanceCriteria);
                          setStandards(data.referenceStandards ?? []);
                          setSuggestedTasks(data.suggestedTasks ?? []);
                        },
                      },
                    );
                  }}
                >
                  {t('AI Suggest Scope & Criteria (RAG)')}
                </LoadingButton>
              </Stack>
              <MutationProblemAlert
                error={suggestScope.error}
                isError={suggestScope.isError}
                fallbackMessage={t('Could not generate scope suggestions.')}
              />
              {standards.length > 0 ? (
                <Stack
                  direction="row"
                  spacing={0.75}
                  sx={{ flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}
                >
                  <Typography variant="caption" sx={{ color: '#475467', fontWeight: 600 }}>
                    {t('Standards:')}
                  </Typography>
                  {standards.map((std) => (
                    <Chip
                      key={std}
                      label={std}
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ height: 22, fontSize: 11 }}
                    />
                  ))}
                </Stack>
              ) : null}
              {suggestedTasks.length > 0 ? (
                <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 1.5, border: '1px solid #e2e8f0' }}>
                  <Typography variant="caption" sx={{ color: '#344054', fontWeight: 700, display: 'block', mb: 0.5 }}>
                    {t('Recommended repair steps:')}
                  </Typography>
                  <Stack spacing={0.5}>
                    {suggestedTasks.map((task) => (
                      <Typography key={task.taskNumber} variant="caption" sx={{ color: '#475467' }}>
                        {task.taskNumber}. <strong>{task.name}</strong>
                        {task.method ? ` — ${task.method}` : ''}
                      </Typography>
                    ))}
                  </Stack>
                </Box>
              ) : null}
              <TextField
                label={t('Corrective scope')}
                required
                multiline
                minRows={3}
                value={correctiveScope}
                onChange={(e) => setCorrectiveScope(e.target.value)}
                helperText={t('What has to be repaired to close this finding.')}
              />
              <TextField
                label={t('Acceptance criteria')}
                multiline
                minRows={2}
                value={acceptanceCriteria}
                onChange={(e) => setAcceptanceCriteria(e.target.value)}
                helperText={t('What proves the repair is acceptable.')}
              />
              <Stack direction="row" spacing={2}>
                <TextField
                  select
                  label={t('Priority')}
                  value={priority}
                  onChange={(e) =>
                    setPriority(e.target.value as typeof priority)
                  }
                  fullWidth
                >
                  <MenuItem value="LOW">{t('Low')}</MenuItem>
                  <MenuItem value="NORMAL">{t('Medium')}</MenuItem>
                  <MenuItem value="HIGH">{t('High')}</MenuItem>
                  <MenuItem value="URGENT">{t('Critical')}</MenuItem>
                </TextField>
                <TextField
                  label={t('Due')}
                  type="datetime-local"
                  value={dueAt}
                  onChange={(e) => setDueAt(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                  fullWidth
                />
              </Stack>
              <TextField
                select
                label={t('Budget approver')}
                required
                value={effectiveBudgetApprover}
                onChange={(e) => setBudgetApprover(e.target.value)}
                helperText={t('The Organization Manager who approves the cost baseline.')}
              >
                {orgAdmins.map((admin) => (
                  <MenuItem key={admin.userId} value={admin.userId}>
                    {admin.fullName} ({admin.email})
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setTarget(null)}>{t('Cancel')}</Button>
            <LoadingButton
              type="submit"
              variant="contained"
              loading={createWorkOrder.isPending}
              disabled={!correctiveScope.trim() || !effectiveBudgetApprover}
            >
              {t('Create work order')}
            </LoadingButton>
          </DialogActions>
        </form>
      </Dialog>
    </Paper>
  );
}
