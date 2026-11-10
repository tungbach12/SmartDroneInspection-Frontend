import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import PictureAsPdfOutlined from '@mui/icons-material/PictureAsPdfOutlined';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import { MutationProblemAlert } from '@/shared/ui/MutationProblemAlert';
import { QueryState } from '@/shared/ui/QueryState';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import {
  useAcceptanceCompliance,
  useAcceptanceDecisions,
  useCloseWorkOrder,
  useReconciliation,
  useReconcileCosts,
  useRecordAcceptance,
  useTasks,
} from '../../hooks/useMaintenance';
import { type WorkOrder } from '../../api/maintenanceApi';
import { DetailField } from '../DetailField';

export interface CostsTabProps {
  workOrder: WorkOrder;
  isOrgAdmin: boolean;
  isEngineer?: boolean;
}

export function CostsTab({
  workOrder,
  isOrgAdmin,
  isEngineer = !isOrgAdmin,
}: CostsTabProps) {
  const { formatDateTime, t } = useLocale();
  const hasApprovedBaseline =
    workOrder.status !== 'DRAFT' && workOrder.status !== 'AWAITING_APPROVAL';
  const reconciliation = useReconciliation(workOrder.id, hasApprovedBaseline);
  const acceptance = useAcceptanceDecisions(workOrder.id);
  const recordAcceptance = useRecordAcceptance(workOrder.id);
  const reconcile = useReconcileCosts(workOrder.id);
  const close = useCloseWorkOrder(workOrder.id);
  const tasks = useTasks(workOrder.id);
  const compliance = useAcceptanceCompliance(
    workOrder.id,
    isOrgAdmin && workOrder.status === 'SUBMITTED_FOR_ACCEPTANCE',
  );

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

  const requiresDecisionComments = decision !== 'ACCEPTED';

  return (
    <Stack spacing={2.5}>
      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: '10px', border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700, color: 'text.primary', mb: 1.5 }}>
          {t('Cost reconciliation')}
        </Typography>
        {!hasApprovedBaseline ? (
          <Typography variant="body2" color="text.secondary">
            {t('Cost reconciliation summary will be available once an estimate baseline is approved.')}
          </Typography>
        ) : (
          <QueryState
            isLoading={reconciliation.isLoading}
            error={reconciliation.error}
            onRetry={() => void reconciliation.refetch()}
          >
            {null}
          </QueryState>
        )}
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
                  ? t('Not applicable')
                  : `${reconciliation.data.variancePercent}%`
              }
            />
          </Box>
        ) : null}

        {isOrgAdmin && workOrder.status === 'COST_RECONCILED' ? (
          <Box sx={{ mt: 2 }}>
            <MutationProblemAlert
              error={close.error}
              isError={close.isError}
              fallbackMessage={t('Could not close the work order.')}
            />
            <LoadingButton
              size="small"
              variant="contained"
              color="success"
              loading={close.isPending}
              onClick={() => close.mutate()}
              sx={{ textTransform: 'none', borderRadius: '8px' }}
            >
              {t('Close work order')}
            </LoadingButton>
          </Box>
        ) : null}

        {isOrgAdmin && workOrder.status === 'ACCEPTED' ? (
          <Box
            sx={{
              mt: 2,
              p: 2,
              bgcolor: 'background.default',
              borderRadius: '8px',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: 1, mb: 1.5 }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                {t('Record actual cost')}
              </Typography>
              {reconciliation.data ? (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    setLineDescription(t('Chi phí thực tế nghiệm thu theo dự toán'));
                    setLineQuantity('1');
                    setLineRate(reconciliation.data.authorizedAmount.toString());
                    setLineCurrency(reconciliation.data.currency);
                  }}
                  sx={{ textTransform: 'none', borderRadius: '8px' }}
                >
                  {t('Lấy số liệu từ Dự toán đã duyệt')}
                </Button>
              ) : null}
            </Stack>
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
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <LoadingButton
                  size="small"
                  variant="contained"
                  loading={reconcile.isPending}
                  disabled={
                    !lineDescription.trim() ||
                    !lineRate ||
                    !(selectedTaskId || tasks.data?.[0]?.id)
                  }
                  onClick={() => {
                    const effectiveTaskId = selectedTaskId || tasks.data?.[0]?.id;
                    if (!effectiveTaskId) return;
                    reconcile.mutate(
                      {
                        actualLines: [
                          {
                            taskId: effectiveTaskId,
                            lineKind: 'MATERIAL',
                            description: lineDescription.trim(),
                            quantity: Number(lineQuantity),
                            unitRate: Number(lineRate),
                            currency: lineCurrency,
                          },
                        ],
                      },
                      {
                        onSuccess: () => {
                          setLineDescription('');
                          setLineRate('');
                        },
                      },
                    );
                  }}
                  sx={{ textTransform: 'none', borderRadius: '8px' }}
                >
                  {t('Reconcile costs')}
                </LoadingButton>
              </Stack>
              <Alert severity="info" sx={{ borderRadius: '8px' }}>
                {t('Actual cost lines never overwrite an estimate line. The variance is computed by the platform from the approved baseline, the approved changes and these actuals.')}
              </Alert>
            </Stack>
          </Box>
        ) : null}
      </Paper>

      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: '10px', border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700, color: 'text.primary', mb: 1.5 }}>
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
              <Box
                key={entry.id}
                sx={{
                  p: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: '8px',
                  bgcolor: 'background.default',
                }}
              >
                <Stack
                  direction="row"
                  spacing={1.5}
                  sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 650, color: 'text.primary' }}>
                    {entry.decision}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {formatDateTime(new Date(entry.decidedAt))}
                  </Typography>
                </Stack>
                {entry.technicalComments ? (
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.75 }}>
                    {entry.technicalComments}
                  </Typography>
                ) : null}
              </Box>
            ))}
          </Stack>
        ) : null}

        {workOrder.reinspectionId && (
          <Box
            sx={{
              mt: 2,
              p: 2,
              bgcolor: 'action.hover',
              border: '1px solid',
              borderColor: 'secondary.main',
              borderRadius: '8px',
            }}
          >
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
            >
              <Box>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Chip
                    label={
                      workOrder.status === 'REINSPECTION_REQUIRED'
                        ? t('Re-inspection in progress')
                        : workOrder.status === 'REWORK_REQUIRED'
                          ? t('Rework required after re-inspection')
                          : t('Re-inspection completed')
                    }
                    color={
                      workOrder.status === 'REWORK_REQUIRED'
                        ? 'warning'
                        : workOrder.status === 'REINSPECTION_REQUIRED'
                          ? 'info'
                          : 'secondary'
                    }
                    size="small"
                    sx={{ fontWeight: 700, fontSize: '0.75rem' }}
                  />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {t('Target flight verification on file')}
                  </Typography>
                </Stack>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                  {workOrder.status === 'REWORK_REQUIRED'
                    ? t(
                        'The latest re-inspection report found unresolved defects. Please resume execution, record additional repair work logs, and submit a revised completion report for re-inspection.',
                      )
                    : t(
                        'The flight crew verified the repaired defect in the field. Review the published re-inspection report before deciding final acceptance.',
                      )}
                </Typography>
              </Box>
              <Button
                variant="outlined"
                color="secondary"
                size="small"
                startIcon={<PictureAsPdfOutlined />}
                onClick={() =>
                  window.open(
                    `${isOrgAdmin ? '/client' : isEngineer ? '/operations' : '/admin'}/inspections/${workOrder.reinspectionId}/${isOrgAdmin || isEngineer ? 'report' : 'review'}`,
                    '_blank',
                  )
                }
                sx={{ textTransform: 'none', fontWeight: 600, flexShrink: 0, borderRadius: '8px' }}
              >
                {t('View Re-inspection Report')}
              </Button>
            </Stack>
          </Box>
        )}

        {isOrgAdmin && workOrder.status === 'SUBMITTED_FOR_ACCEPTANCE' && compliance.data ? (
          <Box
            sx={{
              p: 2,
              bgcolor: 'background.default',
              borderRadius: '8px',
              border: '1px solid',
              borderColor: 'info.light',
              mt: 2,
            }}
          >
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: 1 }}
            >
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <AutoAwesomeOutlined color="primary" />
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'info.main' }}>
                    {t('RAG Thẩm tra Nghiệm thu Kỹ thuật')}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {t('Tự động đối soát số đo thử nghiệm hiện trường với tiêu chuẩn nghiệm thu TCVN')}
                  </Typography>
                </Box>
              </Stack>
              <Chip
                label={`${compliance.data.complianceScore}% ${compliance.data.status}`}
                color={compliance.data.complianceScore >= 75 ? 'success' : 'warning'}
                size="small"
                sx={{ fontWeight: 700 }}
              />
            </Stack>
            <Typography variant="body2" sx={{ color: 'text.primary', mt: 1, fontStyle: 'italic' }}>
              "{compliance.data.technicalSummary}"
            </Typography>
            <Stack spacing={0.75} sx={{ mt: 1.5 }}>
              {compliance.data.checks.map((check, idx) => (
                <Box
                  key={idx}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 1.25,
                    bgcolor: 'background.paper',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary' }}>
                      {check.criteriaName}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                      {check.actualMeasured}
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    label={check.resultStatus}
                    color={check.resultStatus === 'PASSED' ? 'success' : 'warning'}
                    sx={{ height: 20, fontSize: '0.75rem', fontWeight: 700 }}
                  />
                </Box>
              ))}
            </Stack>
            <Button
              size="small"
              variant="contained"
              color="primary"
              sx={{ mt: 1.5, textTransform: 'none', borderRadius: '8px' }}
              onClick={() => {
                setDecision(compliance.data!.recommendation);
                setComments(compliance.data!.technicalSummary);
              }}
            >
              {`${t('Áp dụng kết luận thẩm tra')} (${compliance.data.recommendation})`}
            </Button>
          </Box>
        ) : null}

        {isOrgAdmin && workOrder.status === 'SUBMITTED_FOR_ACCEPTANCE' ? (
          <Box
            sx={{
              mt: 2,
              p: 2,
              bgcolor: 'background.default',
              borderRadius: '8px',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary', mb: 1.5 }}>
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
                required={requiresDecisionComments}
                multiline
                minRows={2}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                helperText={
                  requiresDecisionComments
                    ? t('Required when returning for rework or requesting re-inspection.')
                    : undefined
                }
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
                disabled={requiresDecisionComments && !comments.trim()}
                onClick={() =>
                  recordAcceptance.mutate(
                    {
                      decision,
                      technicalComments: comments.trim() || null,
                      acceptanceChecklist: checklist.trim() || null,
                      testResult: testResult.trim() || null,
                    },
                    {
                      onSuccess: () => {
                        setComments('');
                        setChecklist('');
                        setTestResult('');
                      },
                    },
                  )
                }
                sx={{ textTransform: 'none', borderRadius: '8px' }}
              >
                {t('Record decision')}
              </LoadingButton>
              <Alert severity="warning" sx={{ borderRadius: '8px' }}>
                {t('Only the designated independent reviewer can record this. The engineer who did the work cannot accept it.')}
              </Alert>
            </Stack>
          </Box>
        ) : null}
      </Paper>
    </Stack>
  );
}
