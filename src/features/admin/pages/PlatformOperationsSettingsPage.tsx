import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryState } from '@/shared/ui/QueryState';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { contractQueryKeys } from '@/features/contracts/api/contractApi';
import { operationsSettingsApi } from '../api/operationsSettingsApi';

const MIN_TIMEOUT_HOURS = 1;
const MAX_TIMEOUT_HOURS = 720;
const MIN_LEAD_DAYS = 0;
const MAX_LEAD_DAYS = 365;
const DEFAULT_LEAD_DAYS = 20;
const MIN_API_TIMEOUT_SECONDS = 10;
const MAX_API_TIMEOUT_SECONDS = 600;
const DEFAULT_API_TIMEOUT_SECONDS = 120;

interface PlatformOperationsSettingsPageProps {
  /** Rendered inside the Platform settings hub, which owns the page header. */
  embedded?: boolean;
}

export default function PlatformOperationsSettingsPage({
  embedded = false,
}: PlatformOperationsSettingsPageProps) {
  const { locale, t } = useLocale();
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ['admin', 'operations-settings'],
    queryFn: operationsSettingsApi.getSettings,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Parameters<typeof operationsSettingsApi.updateSettings>[0]) =>
      operationsSettingsApi.updateSettings(payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(['admin', 'operations-settings'], updated);
      void queryClient.invalidateQueries({ queryKey: contractQueryKeys.schedulingPolicy() });
    },
  });

  const [hoursInput, setHoursInput] = useState<string | null>(null);
  const [leadDaysInput, setLeadDaysInput] = useState<string | null>(null);
  const [apiTimeoutInput, setApiTimeoutInput] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const effectiveValue =
    hoursInput !== null
      ? hoursInput
      : settingsQuery.data?.assignmentAcceptanceTimeoutHours != null
        ? String(settingsQuery.data.assignmentAcceptanceTimeoutHours)
        : '24';

  const effectiveLeadDaysValue =
    leadDaysInput !== null
      ? leadDaysInput
      : settingsQuery.data?.serviceRequestLeadDays != null
        ? String(settingsQuery.data.serviceRequestLeadDays)
        : String(DEFAULT_LEAD_DAYS);

  const effectiveApiTimeoutValue =
    apiTimeoutInput !== null
      ? apiTimeoutInput
      : settingsQuery.data?.apiRequestTimeoutSeconds != null
        ? String(settingsQuery.data.apiRequestTimeoutSeconds)
        : String(DEFAULT_API_TIMEOUT_SECONDS);

  const parsedHours = Number(effectiveValue);
  const isHoursInvalid =
    effectiveValue.trim() !== '' &&
    (!Number.isInteger(parsedHours) ||
      parsedHours < MIN_TIMEOUT_HOURS ||
      parsedHours > MAX_TIMEOUT_HOURS);

  const parsedLeadDays = Number(effectiveLeadDaysValue);
  const isLeadDaysInvalid =
    effectiveLeadDaysValue.trim() !== '' &&
    (!Number.isInteger(parsedLeadDays) ||
      parsedLeadDays < MIN_LEAD_DAYS ||
      parsedLeadDays > MAX_LEAD_DAYS);

  const parsedApiTimeout = Number(effectiveApiTimeoutValue);
  const isApiTimeoutInvalid =
    effectiveApiTimeoutValue.trim() !== '' &&
    (!Number.isInteger(parsedApiTimeout) ||
      parsedApiTimeout < MIN_API_TIMEOUT_SECONDS ||
      parsedApiTimeout > MAX_API_TIMEOUT_SECONDS);

  const isInvalid = isHoursInvalid || isLeadDaysInvalid || isApiTimeoutInvalid;

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

    if (
      effectiveLeadDaysValue.trim() === '' ||
      !Number.isInteger(parsedLeadDays) ||
      parsedLeadDays < MIN_LEAD_DAYS ||
      parsedLeadDays > MAX_LEAD_DAYS
    ) {
      setValidationError(
        locale === 'vi'
          ? `Số ngày đặt lịch trước tối thiểu phải là số nguyên từ ${MIN_LEAD_DAYS} đến ${MAX_LEAD_DAYS} ngày.`
          : `Minimum service request lead time must be a whole number between ${MIN_LEAD_DAYS} and ${MAX_LEAD_DAYS} days.`,
      );
      return;
    }

    if (
      effectiveApiTimeoutValue.trim() === '' ||
      !Number.isInteger(parsedApiTimeout) ||
      parsedApiTimeout < MIN_API_TIMEOUT_SECONDS ||
      parsedApiTimeout > MAX_API_TIMEOUT_SECONDS
    ) {
      setValidationError(
        locale === 'vi'
          ? `Thời gian chờ phản hồi API phải là số nguyên từ ${MIN_API_TIMEOUT_SECONDS} đến ${MAX_API_TIMEOUT_SECONDS} giây.`
          : `API request timeout must be a whole number between ${MIN_API_TIMEOUT_SECONDS} and ${MAX_API_TIMEOUT_SECONDS} seconds.`,
      );
      return;
    }

    await updateMutation.mutateAsync({
      assignmentAcceptanceTimeoutHours: parsedHours,
      serviceRequestLeadDays: parsedLeadDays,
      apiRequestTimeoutSeconds: parsedApiTimeout,
    });
    setHoursInput(String(parsedHours));
    setLeadDaysInput(String(parsedLeadDays));
    setApiTimeoutInput(String(parsedApiTimeout));
    setSaveSuccess(true);
  };

  return (
    <Box sx={embedded ? undefined : { width: '100%', maxWidth: 960, mx: 'auto' }}>
      {!embedded && (
        <PageHeader
          title={t('Operations settings')}
          breadcrumbs={[
            { label: t('Governance'), to: '/admin/dashboard' },
            { label: t('Operations settings') },
          ]}
        />
      )}

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
                    ? 'Thời hạn xác nhận phân công'
                    : 'Assignment acceptance window'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {locale === 'vi'
                    ? 'Tự động hủy phân công và báo lại cho Manager nếu Inspector không xác nhận kịp thời hạn.'
                    : 'Auto-cancels an assignment and notifies the Manager if the Inspector does not accept in time.'}
                </Typography>
              </Box>

              <TextField
                label={
                  locale === 'vi'
                    ? 'Thời hạn xác nhận (giờ)'
                    : 'Assignment acceptance timeout (hours)'
                }
                type="number"
                value={effectiveValue}
                onChange={(e) => setHoursInput(e.target.value)}
                error={isHoursInvalid}
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

              <Divider />

              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {locale === 'vi'
                    ? 'Thời gian đặt lịch trước tối thiểu'
                    : 'Service request scheduling lead time'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {locale === 'vi'
                    ? 'Số ngày tối thiểu tính từ hôm nay cho ngày kiểm định đầu tiên khi Customer tạo yêu cầu.'
                    : 'Minimum days from today before a Customer’s first requested inspection date.'}
                </Typography>
              </Box>

              <TextField
                label={
                  locale === 'vi'
                    ? 'Số ngày đặt trước tối thiểu (ngày)'
                    : 'Minimum scheduling lead time (days)'
                }
                type="number"
                value={effectiveLeadDaysValue}
                onChange={(e) => setLeadDaysInput(e.target.value)}
                error={isLeadDaysInvalid}
                helperText={
                  locale === 'vi'
                    ? `Giá trị hợp lệ: ${MIN_LEAD_DAYS}–${MAX_LEAD_DAYS} ngày (mặc định ${DEFAULT_LEAD_DAYS} ngày).`
                    : `Allowed range: ${MIN_LEAD_DAYS}–${MAX_LEAD_DAYS} days (default ${DEFAULT_LEAD_DAYS} days).`
                }
                slotProps={{
                  htmlInput: {
                    min: MIN_LEAD_DAYS,
                    max: MAX_LEAD_DAYS,
                    step: 1,
                  },
                }}
                sx={{ maxWidth: 360 }}
              />

              <Divider />

              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {locale === 'vi'
                    ? 'Thời gian chờ phản hồi API'
                    : 'API request timeout'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {locale === 'vi'
                    ? 'Thời gian tối đa trình duyệt chờ phản hồi API (bao gồm phân tích ảnh và soạn nháp AI) trước khi báo quá thời gian.'
                    : 'Maximum time the web client waits for API responses (including AI analysis and drafting requests) before timing out.'}
                </Typography>
              </Box>

              <TextField
                label={
                  locale === 'vi'
                    ? 'Thời gian chờ API (giây)'
                    : 'API request timeout (seconds)'
                }
                type="number"
                value={effectiveApiTimeoutValue}
                onChange={(e) => setApiTimeoutInput(e.target.value)}
                error={isApiTimeoutInvalid}
                helperText={
                  locale === 'vi'
                    ? `Giá trị hợp lệ: ${MIN_API_TIMEOUT_SECONDS}–${MAX_API_TIMEOUT_SECONDS} giây (mặc định ${DEFAULT_API_TIMEOUT_SECONDS} giây).`
                    : `Allowed range: ${MIN_API_TIMEOUT_SECONDS}–${MAX_API_TIMEOUT_SECONDS} seconds (default ${DEFAULT_API_TIMEOUT_SECONDS} seconds).`
                }
                slotProps={{
                  htmlInput: {
                    min: MIN_API_TIMEOUT_SECONDS,
                    max: MAX_API_TIMEOUT_SECONDS,
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
