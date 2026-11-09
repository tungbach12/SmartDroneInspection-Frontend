import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import PictureAsPdfOutlined from '@mui/icons-material/PictureAsPdfOutlined';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import { MutationProblemAlert } from '@/shared/ui/MutationProblemAlert';
import { QueryState } from '@/shared/ui/QueryState';
import { StatusChip } from '@/shared/ui/StatusChip';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import {
  useCreateMaintenanceReport,
  useMaintenanceReportVersions,
  useSubmitMaintenanceReport,
  useVerifyMaintenanceReport,
  useWorkOrderTransition,
} from '../../hooks/useMaintenance';
import { maintenanceApi, type WorkOrder } from '../../api/maintenanceApi';

export interface ReportTabProps {
  workOrder: WorkOrder;
  isOrgAdmin: boolean;
  isEngineer?: boolean;
}

export function ReportTab({
  workOrder,
  isOrgAdmin,
  isEngineer = !isOrgAdmin,
}: ReportTabProps) {
  const { t } = useLocale();
  const reports = useMaintenanceReportVersions(workOrder.id);
  const createReport = useCreateMaintenanceReport(workOrder.id);
  const verifyReport = useVerifyMaintenanceReport(workOrder.id);
  const submitReport = useSubmitMaintenanceReport(workOrder.id);
  const transition = useWorkOrderTransition(workOrder.id);

  const [content, setContent] = useState('');
  const [isDrafting, setIsDrafting] = useState(false);
  const [confirmSubmitReportOpen, setConfirmSubmitReportOpen] = useState(false);
  const [submittingVersionNo, setSubmittingVersionNo] = useState<number | null>(null);

  const handleAutoDraft = async () => {
    try {
      setIsDrafting(true);
      const draft = await maintenanceApi.getReportDraft(workOrder.id);
      if (draft.content) {
        setContent(draft.content);
      }
    } catch {
      // Handled silently
    } finally {
      setIsDrafting(false);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary', mb: 1.5 }}>
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
            <Box
              key={version.id}
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
                  {t('Version')} {version.versionNo}
                </Typography>
                <StatusChip status={version.status} />
              </Stack>
              {version.contentSnapshot ? (
                <Typography
                  variant="body2"
                  sx={{ color: 'text.primary', mt: 1, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}
                >
                  {version.contentSnapshot}
                </Typography>
              ) : null}
              <Stack direction="row" spacing={1} sx={{ mt: 1.5, alignItems: 'center' }}>
                {isEngineer &&
                version.versionNo === reports.data[0]?.versionNo &&
                (version.status === 'DRAFT' || version.status === 'RETURNED') &&
                !['SUBMITTED_FOR_ACCEPTANCE', 'ACCEPTED', 'COST_RECONCILED', 'CLOSED'].includes(
                  workOrder.status,
                ) ? (
                  <LoadingButton
                    size="small"
                    variant="outlined"
                    loading={verifyReport.isPending && verifyReport.variables === version.versionNo}
                    onClick={() => verifyReport.mutate(version.versionNo)}
                    sx={{ textTransform: 'none', borderRadius: '8px' }}
                  >
                    {t('Verify against sources')}
                  </LoadingButton>
                ) : null}
                {isEngineer && version.status === 'AUTHOR_VERIFIED' ? (
                  <LoadingButton
                    size="small"
                    variant="contained"
                    disabled={workOrder.status !== 'WORK_COMPLETED'}
                    loading={submitReport.isPending && submitReport.variables === version.versionNo}
                    onClick={() => {
                      setSubmittingVersionNo(version.versionNo);
                      setConfirmSubmitReportOpen(true);
                    }}
                    sx={{ textTransform: 'none', borderRadius: '8px' }}
                  >
                    {t('Submit for acceptance')}
                  </LoadingButton>
                ) : null}
                <Button
                  size="small"
                  variant="text"
                  startIcon={<PictureAsPdfOutlined />}
                  onClick={() => {
                    const isDraft =
                      version.status === 'DRAFT' ||
                      version.status === 'AUTHOR_VERIFIED' ||
                      version.status === 'RETURNED';
                    void maintenanceApi
                      .downloadReportPdf(workOrder.id, version.versionNo, isEngineer && isDraft)
                      .then((blob) => {
                        const url = URL.createObjectURL(blob);
                        window.open(url, '_blank', 'noopener,noreferrer');
                      });
                  }}
                  sx={{ textTransform: 'none' }}
                >
                  {t('Download PDF')}
                </Button>
              </Stack>
            </Box>
          ))}
        </Stack>
      ) : null}

      <MutationProblemAlert
        error={verifyReport.error}
        isError={verifyReport.isError}
        fallbackMessage={t('Could not verify the report.')}
      />
      <MutationProblemAlert
        error={submitReport.error}
        isError={submitReport.isError}
        fallbackMessage={t('Could not submit the report.')}
      />
      <MutationProblemAlert
        error={transition.error}
        isError={transition.isError}
        fallbackMessage={t('Could not update the work order.')}
      />

      {isEngineer && workOrder.status === 'IN_PROGRESS' ? (
        <Alert
          severity="info"
          sx={{ mt: 1.5, borderRadius: '8px' }}
          action={
            <LoadingButton
              size="small"
              variant="outlined"
              loading={transition.isPending}
              onClick={() => transition.mutate('declare-complete')}
              sx={{ textTransform: 'none', borderRadius: '8px' }}
            >
              {t('Declare work completed')}
            </LoadingButton>
          }
        >
          {t('Verify all work logs and declare physical work completed before submitting the report for acceptance.')}
        </Alert>
      ) : null}

      {isEngineer &&
      !['SUBMITTED_FOR_ACCEPTANCE', 'ACCEPTED', 'COST_RECONCILED', 'CLOSED'].includes(
        workOrder.status,
      ) ? (
        <Box
          sx={{
            mt: 2,
            p: 2,
            bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'background.default' : '#f8fafc'),
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
              {t('Draft a completion report')}
            </Typography>
            <LoadingButton
              size="small"
              variant="outlined"
              color="primary"
              startIcon={<AutoAwesomeOutlined />}
              loading={isDrafting}
              onClick={handleAutoDraft}
              sx={{ textTransform: 'none', borderRadius: '8px' }}
            >
              {t('Tự động tổng hợp từ nhật ký & công việc')}
            </LoadingButton>
          </Stack>
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
              onClick={() =>
                createReport.mutate(content.trim(), {
                  onSuccess: () => setContent(''),
                })
              }
              sx={{ textTransform: 'none', borderRadius: '8px' }}
            >
              {t('Draft report')}
            </LoadingButton>
          </Stack>
        </Box>
      ) : null}

      <ConfirmDialog
        open={confirmSubmitReportOpen}
        title={t('Confirm Completion Report Submission')}
        message={t(
          'Are you sure you want to submit this completion report for acceptance? The report and maintenance records will be locked while awaiting independent reviewer decision.',
        )}
        confirmLabel={t('Confirm & Submit')}
        cancelLabel={t('Cancel')}
        loading={submitReport.isPending}
        confirmColor="primary"
        onCancel={() => setConfirmSubmitReportOpen(false)}
        onConfirm={() => {
          if (submittingVersionNo != null) {
            submitReport.mutate(submittingVersionNo, {
              onSuccess: () => setConfirmSubmitReportOpen(false),
            });
          }
        }}
      />
    </Paper>
  );
}
