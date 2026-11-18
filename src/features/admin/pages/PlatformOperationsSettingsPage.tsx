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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryState } from '@/shared/ui/QueryState';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { operationsSettingsApi } from '../api/operationsSettingsApi';

const MIN_TIMEOUT_HOURS = 1;
const MAX_TIMEOUT_HOURS = 720;

export default function PlatformOperationsSettingsPage() {
  const { locale, t } = useLocale();
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ['admin', 'operations-settings'],
    queryFn: operationsSettingsApi.getSettings,
  });

  const updateMutation = useMutation({
    mutationFn: operationsSettingsApi.updateSettings,
    onSuccess: (updated) => {
      queryClient.setQueryData(['admin', 'operations-settings'], updated);
    },
  });

  const [hoursInput, setHoursInput] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const effectiveValue =
    hoursInput !== null
      ? hoursInput
      : settingsQuery.data?.assignmentAcceptanceTimeoutHours != null
        ? String(settingsQuery.data.assignmentAcceptanceTimeoutHours)
        : '24';

  const parsedHours = Number(effectiveValue);
  const isInvalid =
    effectiveValue.trim() !== '' &&
    (!Number.isInteger(parsedHours) ||
      parsedHours < MIN_TIMEOUT_HOURS ||
      parsedHours > MAX_TIMEOUT_HOURS);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaveSuccess(false);
    setValidationError(null);

    if (
      effectiveValue.trim() === '' ||
      !Number.isInteger(parsedHours) ||
      parsedHours < MIN_TIMEOUT_HOURS ||
      parsedHours > MAX_TIMEOUT_HOURS
    ) {
      setValidationError(
        locale === 'vi'
          ? `Thời hạn xác nhận phân công phải là số nguyên từ ${MIN_TIMEOUT_HOURS} đến ${MAX_TIMEOUT_HOURS} giờ.`
          : `Assignment acceptance timeout must be a whole number between ${MIN_TIMEOUT_HOURS} and ${MAX_TIMEOUT_HOURS} hours.`,
      );
      return;
    }

    await updateMutation.mutateAsync({ assignmentAcceptanceTimeoutHours: parsedHours });
    setHoursInput(String(parsedHours));
    setSaveSuccess(true);
  };

  return (
    <Box className="workspace-page" sx={{ width: '100%', maxWidth: 960, mx: 'auto' }}>
      <PageHeader
        title={t('Operations settings')}
        breadcrumbs={[
          { label: t('Governance'), to: '/admin/dashboard' },
          { label: t('Operations settings') },
        ]}
      />

      <QueryState
        isLoading={settingsQuery.isLoading}
        error={settingsQuery.error}
        onRetry={() => void settingsQuery.refetch()}
      >
        <Stack spacing={2.5}>
          {saveSuccess && (
            <Alert severity="success" onClose={() => setSaveSuccess(false)}>
              {locale === 'vi'
                ? 'Đã lưu cấu hình điều phối thành công.'
                : 'Operations settings updated successfully.'}
            </Alert>
          )}

          {validationError && (
            <Alert severity="error" onClose={() => setValidationError(null)}>
              {validationError}
            </Alert>
          )}

          <Paper
            variant="outlined"
            component="form"
            onSubmit={(e) => void handleSave(e)}
            sx={{ p: { xs: 2, sm: 3 }, borderRadius: '8px' }}
          >
            <Stack spacing={2.25}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {locale === 'vi'
                    ? 'Thời hạn xác nhận phân công ở Bước 4 (Step 4)'
                    : 'Step 4 Dispatch Assignment Acceptance Window'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {locale === 'vi'
                    ? 'Nếu Inspector được phân công không bấm Chấp nhận (Accept) trong khoảng thời gian này, hệ thống sẽ tự động hủy phân công do quá hạn, giải phóng lịch cho đội bay cũ, gửi thông báo cho Manager phụ trách và đưa đợt kiểm tra về trạng thái chờ phân công lại.'
                    : 'If an assigned Inspector does not accept within this window, the system automatically cancels the assignment due to timeout, releases the team schedule, notifies the owning Manager, and returns the occurrence to pending assignment.'}
                </Typography>
              </Box>

              <TextField
                label={
                  locale === 'vi'
                    ? 'Thời hạn xác nhận phân công (giờ)'
                    : 'Assignment acceptance timeout (hours)'
                }
                type="number"
                value={effectiveValue}
                onChange={(e) => setHoursInput(e.target.value)}
                error={isInvalid}
                helperText={
                  locale === 'vi'
                    ? `Giá trị hợp lệ: ${MIN_TIMEOUT_HOURS}–${MAX_TIMEOUT_HOURS} giờ (mặc định 24 giờ).`
                    : `Allowed range: ${MIN_TIMEOUT_HOURS}–${MAX_TIMEOUT_HOURS} hours (default 24 hours).`
                }
                slotProps={{
                  htmlInput: {
                    min: MIN_TIMEOUT_HOURS,
                    max: MAX_TIMEOUT_HOURS,
                    step: 1,
                  },
                }}
                sx={{ maxWidth: 360 }}
              />

              {settingsQuery.data?.updatedAt && (
                <Typography variant="caption" color="text.secondary">
                  {locale === 'vi' ? 'Cập nhật gần nhất:' : 'Last updated:'}{' '}
                  {new Date(settingsQuery.data.updatedAt).toLocaleString()}
                </Typography>
              )}

              <Box>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={updateMutation.isPending || isInvalid}
                  sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 700, boxShadow: 'none' }}
                >
                  {updateMutation.isPending
                    ? locale === 'vi'
                      ? 'Đang lưu…'
                      : 'Saving…'
                    : locale === 'vi'
                      ? 'Lưu cấu hình'
                      : 'Save settings'}
                </Button>
              </Box>
            </Stack>
          </Paper>
        </Stack>
      </QueryState>
    </Box>
  );
}
