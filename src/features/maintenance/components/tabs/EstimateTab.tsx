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
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import { MutationProblemAlert } from '@/shared/ui/MutationProblemAlert';
import { QueryState } from '@/shared/ui/QueryState';
import { StatusChip } from '@/shared/ui/StatusChip';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import {
  useCreateEstimateVersion,
  useDecideEstimate,
  useEstimateVersions,
  useSubmitEstimate,
  useSuggestEstimate,
} from '../../hooks/useMaintenance';
import {
  type CostLineKind,
  type SuggestedEstimateLine,
  type WorkOrder,
} from '../../api/maintenanceApi';

export interface EstimateTabProps {
  workOrder: WorkOrder;
  isOrgAdmin: boolean;
  isEngineer?: boolean;
}

export function EstimateTab({
  workOrder,
  isOrgAdmin,
  isEngineer = !isOrgAdmin,
}: EstimateTabProps) {
  const { t } = useLocale();
  const estimates = useEstimateVersions(workOrder.id);
  const createEstimate = useCreateEstimateVersion(workOrder.id);
  const submitEstimate = useSubmitEstimate(workOrder.id);
  const decideEstimate = useDecideEstimate(workOrder.id);
  const suggestEstimate = useSuggestEstimate(workOrder.id);

  const [open, setOpen] = useState(false);
  const [currency, setCurrency] = useState('VND');
  const [lineKind, setLineKind] = useState<CostLineKind>('LABOR');
  const [snapshot, setSnapshot] = useState('');
  const [lineDescription, setLineDescription] = useState('');
  const [lineQuantity, setLineQuantity] = useState('1');
  const [lineRate, setLineRate] = useState('');
  const [suggestedLines, setSuggestedLines] = useState<SuggestedEstimateLine[] | null>(null);

  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: '10px', border: '1px solid', borderColor: 'divider' }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700, color: 'text.primary' }}>
          {t('Estimate versions')}
        </Typography>
        {isEngineer && workOrder.status !== 'CLOSED' ? (
          <Button size="small" variant="outlined" onClick={() => setOpen(true)} sx={{ textTransform: 'none', borderRadius: '8px' }}>
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
            <Box
              key={version.id}
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
                  {t('Version')} {version.versionNo} · {version.baselineTotal ?? '—'} {version.currency}
                </Typography>
                <StatusChip status={version.status} />
              </Stack>
              {version.assumptions ? (
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                  {version.assumptions}
                </Typography>
              ) : null}
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                {isEngineer && version.status === 'DRAFT' ? (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => submitEstimate.mutate(version.versionNo)}
                    sx={{ textTransform: 'none', borderRadius: '8px' }}
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
                      sx={{ textTransform: 'none', borderRadius: '8px' }}
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
                      sx={{ textTransform: 'none', borderRadius: '8px' }}
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
        error={submitEstimate.error}
        isError={submitEstimate.isError}
        fallbackMessage={t('Could not submit the estimate.')}
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
            const linesToSubmit =
              suggestedLines && suggestedLines.length > 0
                ? suggestedLines.map((l) => ({
                    taskId: l.taskId ?? null,
                    lineKind: l.lineKind,
                    description: l.description,
                    quantity: l.quantity,
                    unit: l.unit ?? null,
                    unitRate: l.unitRate,
                  }))
                : [
                    {
                      lineKind,
                      description: lineDescription.trim(),
                      quantity: Number(lineQuantity),
                      unitRate: Number(lineRate),
                    },
                  ];

            createEstimate.mutate(
              {
                currency,
                assumptions: snapshot.trim() || null,
                lines: linesToSubmit,
              },
              {
                onSuccess: () => {
                  setLineDescription('');
                  setLineQuantity('1');
                  setLineRate('');
                  setSnapshot('');
                  setSuggestedLines(null);
                  setOpen(false);
                },
              },
            );
          }}
        >
          <DialogTitle sx={{ fontWeight: 700 }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{t('New estimate version')}</span>
              <LoadingButton
                size="small"
                variant="outlined"
                color="primary"
                startIcon={<AutoAwesomeOutlined />}
                loading={suggestEstimate.isPending}
                onClick={() => {
                  suggestEstimate.mutate(undefined, {
                    onSuccess: (data) => {
                      if (data.currency) setCurrency(data.currency);
                      if (data.assumptions) setSnapshot(data.assumptions);
                      const first = data.lines?.[0];
                      if (data.lines && first) {
                        setSuggestedLines(data.lines);
                        setLineDescription(first.description);
                        setLineKind(first.lineKind);
                        setLineQuantity(first.quantity.toString());
                        setLineRate(first.unitRate.toString());
                      }
                    },
                  });
                }}
                sx={{ textTransform: 'none', borderRadius: '8px' }}
              >
                {t('AI Gợi ý Định mức (RAG)')}
              </LoadingButton>
            </Stack>
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <MutationProblemAlert
                error={createEstimate.error}
                isError={createEstimate.isError}
                fallbackMessage={t('Could not create the estimate.')}
              />
              <MutationProblemAlert
                error={suggestEstimate.error}
                isError={suggestEstimate.isError}
                fallbackMessage={t('Could not generate estimate suggestions.')}
              />
              {suggestedLines && suggestedLines.length > 0 ? (
                <Box
                  sx={{
                    p: 1.5,
                    bgcolor: 'background.default',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: 'info.light',
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 700, color: 'info.main', display: 'block', mb: 0.5 }}
                  >
                    {`${t('Định mức kỹ thuật đề xuất')} (${suggestedLines.length} ${t('dòng')}):`}
                  </Typography>
                  <Stack spacing={0.5}>
                    {suggestedLines.map((line, idx) => (
                      <Typography key={idx} variant="caption" sx={{ color: 'text.secondary' }}>
                        • [{line.lineKind}] {line.description}: {line.quantity}{' '}
                        {line.unit ? `${line.unit} ` : ''}x {line.unitRate} {currency}
                      </Typography>
                    ))}
                  </Stack>
                </Box>
              ) : null}
              <Stack direction="row" spacing={2}>
                <TextField
                  select
                  label={t('Currency')}
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  fullWidth
                >
                  <MenuItem value="VND">VND</MenuItem>
                  <MenuItem value="USD">USD</MenuItem>
                </TextField>
                <TextField
                  select
                  label={t('Line kind')}
                  value={lineKind}
                  onChange={(e) => setLineKind(e.target.value as CostLineKind)}
                  fullWidth
                >
                  <MenuItem value="LABOR">LABOR</MenuItem>
                  <MenuItem value="MATERIAL">MATERIAL</MenuItem>
                  <MenuItem value="EQUIPMENT">EQUIPMENT</MenuItem>
                  <MenuItem value="EXTERNAL_SERVICE">EXTERNAL_SERVICE</MenuItem>
                  <MenuItem value="OTHER">OTHER</MenuItem>
                  <MenuItem value="CONTINGENCY">CONTINGENCY</MenuItem>
                </TextField>
              </Stack>
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
              <Alert severity="info" sx={{ borderRadius: '8px' }}>
                {t('The platform totals the priced lines. A missing rate is not recorded as zero.')}
              </Alert>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOpen(false)} sx={{ textTransform: 'none' }}>{t('Cancel')}</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={!lineDescription.trim() || !lineRate}
              sx={{ textTransform: 'none', borderRadius: '8px' }}
            >
              {t('Create estimate')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Paper>
  );
}
