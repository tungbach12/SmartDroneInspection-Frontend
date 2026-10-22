import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
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
import { useWorkforceUsers } from '@/features/workforce/hooks/useWorkforce';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import { MutationProblemAlert } from '@/shared/ui/MutationProblemAlert';
import { QueryState } from '@/shared/ui/QueryState';
import { StatusChip } from '@/shared/ui/StatusChip';
import {
  useCreateWorkOrder,
  useRepairCandidates,
} from '../hooks/useMaintenance';
import type { RepairCandidate } from '../api/maintenanceApi';
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
  const workforce = useWorkforceUsers();

  const [target, setTarget] = useState<RepairCandidate | null>(null);
  const [correctiveScope, setCorrectiveScope] = useState('');
  const [acceptanceCriteria, setAcceptanceCriteria] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [dueAt, setDueAt] = useState('');
  const [budgetApprover, setBudgetApprover] = useState('');

  const orgAdmins = (workforce.data ?? []).filter(
    (member) => member.roles.includes('ORG_ADMIN') && member.status === 'ACTIVE',
  );

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
                    {candidate.description ? (
                      <Typography variant="body2" sx={{ color: '#475467', mt: 0.5 }}>
                        {candidate.description}
                      </Typography>
                    ) : null}
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
                          ? 'CRITICAL'
                          : candidate.severity === 'HIGH'
                            ? 'HIGH'
                            : 'MEDIUM',
                      );
                      setDueAt('');
                      setBudgetApprover(orgAdmins[0]?.userId ?? '');
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
                budgetApproverUserId: budgetApprover,
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
                  <MenuItem value="MEDIUM">{t('Medium')}</MenuItem>
                  <MenuItem value="HIGH">{t('High')}</MenuItem>
                  <MenuItem value="CRITICAL">{t('Critical')}</MenuItem>
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
                value={budgetApprover}
                onChange={(e) => setBudgetApprover(e.target.value)}
                helperText={t('The Organization Admin who approves the cost baseline.')}
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
              disabled={!correctiveScope.trim() || !budgetApprover}
            >
              {t('Create work order')}
            </LoadingButton>
          </DialogActions>
        </form>
      </Dialog>
    </Paper>
  );
}
