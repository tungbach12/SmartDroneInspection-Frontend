import { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { MutationProblemAlert } from '@/shared/ui/MutationProblemAlert';
import { QueryState } from '@/shared/ui/QueryState';
import { StatusChip } from '@/shared/ui/StatusChip';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import {
  useChanges,
  useDecideChange,
  useProposeChange,
} from '../../hooks/useMaintenance';
import { type WorkOrder } from '../../api/maintenanceApi';

export interface ChangesTabProps {
  workOrder: WorkOrder;
  isOrgAdmin: boolean;
  isEngineer?: boolean;
}

export function ChangesTab({
  workOrder,
  isOrgAdmin,
  isEngineer = !isOrgAdmin,
}: ChangesTabProps) {
  const { t } = useLocale();
  const changes = useChanges(workOrder.id);
  const propose = useProposeChange(workOrder.id);
  const decide = useDecideChange(workOrder.id);

  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [delta, setDelta] = useState('');

  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
          {t('Change requests')}
        </Typography>
        {isEngineer && workOrder.status !== 'CLOSED' ? (
          <Button size="small" variant="outlined" onClick={() => setOpen(true)} sx={{ textTransform: 'none', borderRadius: '8px' }}>
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
            {t('No change proposed. A change widens scope, cost or time and authorizes nothing until approved.')}
          </Typography>
        }
      >
        {null}
      </QueryState>

      {changes.data && changes.data.length > 0 ? (
        <Stack spacing={1.5}>
          {changes.data.map((change) => (
            <Box
              key={change.id}
              sx={{
                p: 2,
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
                  {t('Change #')}{change.changeNumber}
                  {change.proposedDelta ? ` · ${change.proposedDelta}` : ''}
                </Typography>
                <StatusChip status={change.status} />
              </Stack>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                {change.reason}
              </Typography>
              {isOrgAdmin && (change.status === 'AWAITING_APPROVAL' || change.status === 'PROPOSED') ? (
                <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
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
                    sx={{ textTransform: 'none', borderRadius: '8px' }}
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
                    sx={{ textTransform: 'none', borderRadius: '8px' }}
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
                    sx={{ textTransform: 'none' }}
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
      <MutationProblemAlert
        error={decide.error}
        isError={decide.isError}
        fallbackMessage={t('Could not decide the change.')}
      />

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            propose.mutate(
              {
                reason: reason.trim(),
                proposedDelta: delta ? Number(delta) : null,
              },
              {
                onSuccess: () => {
                  setReason('');
                  setDelta('');
                  setOpen(false);
                },
              },
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
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOpen(false)} sx={{ textTransform: 'none' }}>{t('Cancel')}</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={!reason.trim()}
              sx={{ textTransform: 'none', borderRadius: '8px' }}
            >
              {t('Propose')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Paper>
  );
}
