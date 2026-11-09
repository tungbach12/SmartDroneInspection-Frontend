import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Paper,
  Stack,
  TextField,
} from '@mui/material';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useWorkforceUsers } from '@/features/workforce/hooks/useWorkforce';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import { MutationProblemAlert } from '@/shared/ui/MutationProblemAlert';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import {
  useAssignTeam,
  useCloseWorkOrder,
  useWorkOrderTransition,
} from '../../hooks/useMaintenance';
import { type WorkOrder } from '../../api/maintenanceApi';
import { DetailField } from '../DetailField';

export interface OverviewTabProps {
  workOrder: WorkOrder;
  isOrgAdmin: boolean;
  isEngineer?: boolean;
  onOpenInspection?: (() => void) | undefined;
}

export function OverviewTab({
  workOrder,
  isOrgAdmin,
  isEngineer = !isOrgAdmin,
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
        return (
          workOrder.status !== 'REWORK_REQUIRED' &&
          workOrder.status !== 'REINSPECTION_REQUIRED'
        );
      default:
        return false;
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
      <Stack spacing={2.5}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2.5 }}>
          <DetailField label={t('Acceptance criteria')} value={workOrder.acceptanceCriteria} />
          <DetailField label={t('Due')} value={workOrder.dueAt ? formatDateTime(new Date(workOrder.dueAt)) : t('Not set')} />
          <DetailField
            label={t('Budget approver')}
            value={workOrder.budgetApproverName ?? workOrder.budgetApproverUserId}
          />
          <DetailField
            label={t('Team lead')}
            value={workOrder.teamLeadName ?? workOrder.teamLeadUserId}
          />
          <DetailField
            label={t('Report author')}
            value={workOrder.reportAuthorName ?? workOrder.reportAuthorUserId}
          />
          <DetailField
            label={t('Accepting reviewer')}
            value={workOrder.acceptingReviewerName ?? workOrder.acceptingReviewerUserId}
          />
        </Box>

        {onOpenInspection ? (
          <Box>
            <Button size="small" variant="outlined" onClick={onOpenInspection} sx={{ textTransform: 'none', borderRadius: '8px' }}>
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
          {isEngineer
            ? engineerActions.map((entry) => (
                <LoadingButton
                  key={entry.action}
                  size="small"
                  variant="outlined"
                  disabled={isActionDisabled(entry.action)}
                  loading={transition.isPending && transition.variables === entry.action}
                  onClick={() => transition.mutate(entry.action)}
                  sx={{ textTransform: 'none', borderRadius: '8px' }}
                >
                  {t(entry.label)}
                </LoadingButton>
              ))
            : null}
          {isOrgAdmin && !workOrder.teamLeadUserId ? (
            <Button
              size="small"
              variant="outlined"
              onClick={() => setTeamOpen(true)}
              sx={{ textTransform: 'none', borderRadius: '8px' }}
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
              sx={{ textTransform: 'none', borderRadius: '8px' }}
            >
              {t('Close work order')}
            </LoadingButton>
          ) : null}
        </Stack>

        <Alert severity="info" sx={{ borderRadius: '8px' }}>
          {t('A work order closes only after independent acceptance and cost reconciliation. Closing is not a shortcut: the platform keeps the record either way.')}
        </Alert>

        <AssignTeamDialog
          open={teamOpen}
          isOrgAdmin={isOrgAdmin}
          onClose={() => setTeamOpen(false)}
          workOrderId={workOrder.id}
          onAssigned={() => setTeamOpen(false)}
        />
      </Stack>
    </Paper>
  );
}

function AssignTeamDialog({
  open,
  isOrgAdmin,
  onClose,
  workOrderId,
  onAssigned,
}: {
  open: boolean;
  isOrgAdmin: boolean;
  onClose: () => void;
  workOrderId: string;
  onAssigned: () => void;
}) {
  const { t } = useLocale();
  const assignTeam = useAssignTeam(workOrderId);
  const workforce = useWorkforceUsers(open && isOrgAdmin);
  const currentUser = useAuthStore((state) => state.user);

  const engineers = useMemo(() => {
    return (workforce.data ?? []).filter(
      (member) => member.roles.includes('MAINTENANCE_ENGINEER') && member.status === 'ACTIVE',
    );
  }, [workforce.data]);

  const orgAdmins = useMemo(() => {
    const list = (workforce.data ?? []).filter(
      (member) => member.roles.includes('CUSTOMER') && member.status === 'ACTIVE',
    );
    if (list.length > 0) return list;
    if (currentUser?.roles.includes('CUSTOMER')) {
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

  const [leadUserId, setLeadUserId] = useState('');
  const [reportAuthorUserId, setReportAuthorUserId] = useState('');
  const [acceptingReviewerUserId, setAcceptingReviewerUserId] = useState('');
  const [reason, setReason] = useState('');

  const effectiveLead = leadUserId || engineers[0]?.userId || '';
  const effectiveAuthor = reportAuthorUserId || engineers[0]?.userId || '';
  const effectiveReviewer = acceptingReviewerUserId || orgAdmins[0]?.userId || '';

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          assignTeam.mutate(
            {
              leadUserId: effectiveLead,
              reportAuthorUserId: effectiveAuthor,
              acceptingReviewerUserId: effectiveReviewer,
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
              value={effectiveLead}
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
              value={effectiveAuthor}
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
              value={effectiveReviewer}
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
            <Alert severity="warning" sx={{ borderRadius: '8px' }}>
              {t('The lead and the report author may be the same engineer. The accepting reviewer may not be on the executing team, and the platform refuses that assignment.')}
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} sx={{ textTransform: 'none' }}>{t('Cancel')}</Button>
          <LoadingButton
            type="submit"
            variant="contained"
            loading={assignTeam.isPending}
            disabled={!effectiveLead || !effectiveAuthor || !effectiveReviewer}
            sx={{ textTransform: 'none', borderRadius: '8px' }}
          >
            {t('Assign team')}
          </LoadingButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}
