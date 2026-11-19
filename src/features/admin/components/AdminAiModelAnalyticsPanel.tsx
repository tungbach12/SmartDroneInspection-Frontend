import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControlLabel,
  LinearProgress,
  Paper,
  Slider,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import CheckCircleOutlineRounded from '@mui/icons-material/CheckCircleOutlineRounded';
import CancelOutlined from '@mui/icons-material/CancelOutlined';
import TuneRounded from '@mui/icons-material/TuneRounded';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import {
  usePlatformAiAnalytics,
  useUpdatePlatformAiSettings,
} from '@/features/admin/hooks/usePlatformAiSettings';
import type { PlatformAiAnalytics } from '@/features/inspections/api/inspectionApi';
import { StatusChip } from '@/shared/ui/StatusChip';
import { useLocale } from '@/shared/i18n/LocaleProvider';

export function AdminAiThresholdConfigCard({
  data,
}: {
  data: PlatformAiAnalytics;
}) {
  const { t } = useLocale();
  const updateSettings = useUpdatePlatformAiSettings();

  const [overrideEnabled, setOverrideEnabled] = useState<boolean | null>(null);
  const [overrideThreshold, setOverrideThreshold] = useState<number | null>(null);

  const savedEnabled = data.autoConfirmEnabled ?? true;
  const savedThreshold = Number(data.autoConfirmThreshold ?? 85);
  const enabled = overrideEnabled ?? savedEnabled;
  const threshold = overrideThreshold ?? savedThreshold;
  const isDirty = enabled !== savedEnabled || threshold !== savedThreshold;

  const commitSave = () => {
    const clamped = Math.max(0, Math.min(100, Number(threshold) || 0));
    updateSettings.mutate(
      {
        autoConfirmEnabled: enabled,
        autoConfirmThreshold: clamped,
      },
      {
        onSuccess: () => {
          setOverrideEnabled(null);
          setOverrideThreshold(null);
        },
      },
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    commitSave();
  };

  return (
    <Paper
      variant="outlined"
      component="form"
      onSubmit={handleSave}
      sx={{
        p: { xs: 2, sm: 2.5 },
        borderRadius: '10px',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Stack spacing={2.5}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
        >
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '8px',
                bgcolor: 'rgba(55, 88, 249, 0.10)',
                color: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <TuneRounded fontSize="small" />
            </Box>
            <Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant="h6" component="h2" sx={{ fontWeight: 700, fontSize: '1rem', lineHeight: 1.25 }}>
                  {t('AI Auto-Confirm Threshold')}
                </Typography>
                {isDirty && <StatusChip status="pending" label={t('Unsaved changes')} />}
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {t('Automatically mark new detections as CONFIRMED when confidence meets the threshold. Pending findings stay with the Inspector for review.')}
              </Typography>
            </Box>
          </Stack>

          <FormControlLabel
            control={
              <Switch
                checked={enabled}
                onChange={(e) => setOverrideEnabled(e.target.checked)}
                color="primary"
              />
            }
            label={
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {enabled ? t('Enabled') : t('Disabled')}
              </Typography>
            }
          />
        </Stack>

        {updateSettings.isError && (
          <Alert severity="error">
            {updateSettings.error instanceof Error
              ? updateSettings.error.message
              : t('Could not update AI threshold configuration.')}
          </Alert>
        )}

        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2.5}
          sx={{ alignItems: { md: 'center' } }}
        >
          <Box sx={{ flex: 1, minWidth: { xs: 0, sm: 220 }, px: 1.5 }}>
            <Slider
              disabled={!enabled}
              value={threshold}
              min={50}
              max={100}
              step={1}
              aria-label={t('AI auto-confirm confidence threshold')}
              getAriaLabel={() => t('AI auto-confirm confidence threshold')}
              marks={[
                { value: 50, label: '50%' },
                { value: 70, label: '70%' },
                { value: 85, label: '85%' },
                { value: 100, label: '100%' },
              ]}
              valueLabelDisplay="auto"
              valueLabelFormat={(v) => `${v}%`}
              onChange={(_, val) => setOverrideThreshold(val as number)}
            />
          </Box>

          <TextField
            size="small"
            type="number"
            disabled={!enabled}
            label={t('Threshold (%)')}
            value={threshold}
            onChange={(e) => setOverrideThreshold(Number(e.target.value))}
            slotProps={{ htmlInput: { min: 0, max: 100, step: 1 } }}
            sx={{
              width: { xs: '100%', sm: 130 },
              flexShrink: 0,
              '& .MuiOutlinedInput-root': { height: 38 },
            }}
          />

          <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
            {isDirty && (
              <Button
                type="button"
                size="small"
                variant="outlined"
                color="inherit"
                disabled={updateSettings.isPending}
                onClick={() => {
                  setOverrideEnabled(null);
                  setOverrideThreshold(null);
                }}
              >
                {t('Reset')}
              </Button>
            )}
            <Button
              type="submit"
              variant="contained"
              disabled={updateSettings.isPending}
            >
              {updateSettings.isPending ? t('Saving…') : t('Save threshold')}
            </Button>
          </Stack>
        </Stack>
      </Stack>
    </Paper>
  );
}

export function AdminAiTelemetrySummary({
  data,
  showConfigLink = false,
}: {
  data: PlatformAiAnalytics;
  showConfigLink?: boolean;
}) {
  const { t } = useLocale();

  const healthTone: 'success' | 'warning' | 'error' =
    data.rejectionRatePercent <= 20
      ? 'success'
      : data.rejectionRatePercent <= 40
        ? 'warning'
        : 'error';

  const healthLabel =
    data.rejectionRatePercent <= 20
      ? t('Model healthy')
      : data.rejectionRatePercent <= 40
        ? t('Monitor closely')
        : t('High rejection rate');

  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 2, sm: 2.5 },
        borderRadius: '10px',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        minWidth: 0,
      }}
    >
      <Stack spacing={2.5}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
        >
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '8px',
                bgcolor: 'rgba(55, 88, 249, 0.10)',
                color: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <AutoAwesomeOutlined fontSize="small" />
            </Box>
            <Typography variant="h6" component="h2" sx={{ fontWeight: 700, fontSize: '1rem' }}>
              {t('AI Model Performance & Confidence')}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            <StatusChip
              status={data.autoConfirmEnabled ? 'scheduled' : 'inactive'}
              tone={data.autoConfirmEnabled ? 'info' : 'default'}
              label={
                data.autoConfirmEnabled
                  ? `${t('Auto-confirm')} ≥ ${Number(data.autoConfirmThreshold).toFixed(0)}%`
                  : t('Auto-confirm: Off')
              }
            />
            <StatusChip
              status={healthTone}
              tone={healthTone}
              label={healthLabel}
            />
            {showConfigLink && (
              <Button
                component={RouterLink}
                to="/admin/platform-settings?tab=ai"
                size="small"
                variant="outlined"
                endIcon={<ArrowForwardRounded sx={{ fontSize: 15 }} />}
              >
                {t('Configure')}
              </Button>
            )}
          </Stack>
        </Stack>

        {/* 4 KPI Summary Metrics */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
            gap: 2,
            py: 2,
            borderTop: 1,
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              {t('TOTAL AI DETECTIONS')}
            </Typography>
            <Typography variant="h5" component="div" sx={{ fontWeight: 800, mt: 0.5, fontVariantNumeric: 'tabular-nums' }}>
              {data.totalAiDetections}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('Auto-confirmed')}: <strong>{data.autoConfirmedFindings}</strong> · {t('Pending')}:{' '}
              <strong>{data.pendingAiFindings}</strong>
            </Typography>
          </Box>

          <Box>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
              <CheckCircleOutlineRounded color="success" sx={{ fontSize: 16 }} />
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                {t('ACCEPTANCE RATE')}
              </Typography>
            </Stack>
            <Typography variant="h5" component="div" sx={{ fontWeight: 800, color: 'success.main', mt: 0.5, fontVariantNumeric: 'tabular-nums' }}>
              {data.acceptanceRatePercent}%
            </Typography>
            <Typography variant="caption" color="text.secondary">
              <strong>{data.confirmedAiFindings}</strong> {t('confirmed findings')}
            </Typography>
          </Box>

          <Box>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
              <CancelOutlined color="error" sx={{ fontSize: 16 }} />
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                {t('REJECTED / REMOVED')}
              </Typography>
            </Stack>
            <Typography
              variant="h5"
              component="div"
              sx={{
                fontWeight: 800,
                color: data.rejectionRatePercent > 30 ? 'error.main' : 'text.primary',
                mt: 0.5,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {data.rejectedAiFindings} ({data.rejectionRatePercent}%)
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('Rejected')}: <strong>{data.rejectedPendingFindings}</strong> ·{' '}
              {t('Removed')}: <strong>{data.removedConfirmedAiFindings}</strong>
            </Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
              {t('AVG CONFIDENCE')}
            </Typography>
            <Typography variant="h5" component="div" sx={{ fontWeight: 800, color: 'primary.main', mt: 0.5, fontVariantNumeric: 'tabular-nums' }}>
              {data.averageConfidencePercent}%
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('Confirmed avg')}: <strong>{data.averageConfirmedConfidencePercent}%</strong> ·{' '}
              {t('Manual')}: <strong>{data.manualFindingsCount}</strong>
            </Typography>
          </Box>
        </Box>

        {data.rejectionRatePercent > 35 && (
          <Alert severity="warning">
            {t('Rejection rate is high (> 35%). Consider raising the Auto-Confirm threshold.')}
          </Alert>
        )}

        {/* Confidence Distribution & Model Breakdown */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1fr) minmax(0, 1fr)' },
            gap: 3,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" component="h3" sx={{ fontWeight: 700, fontSize: '0.875rem', mb: 1.5 }}>
              {t('Confidence Distribution')}
            </Typography>
            <Stack spacing={1.25}>
              {data.confidenceBuckets.map((bucket) => {
                const maxTotal = Math.max(
                  1,
                  ...data.confidenceBuckets.map((b) => b.totalCount),
                );
                const progress = Math.round((bucket.totalCount / maxTotal) * 100);
                const isAboveThreshold =
                  data.autoConfirmEnabled &&
                  bucket.minPercent >= Number(data.autoConfirmThreshold);
                return (
                  <Box key={bucket.bucketLabel}>
                    <Stack
                      direction="row"
                      sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 0.4, gap: 1, flexWrap: 'wrap' }}
                    >
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 72, fontVariantNumeric: 'tabular-nums' }}>
                          {bucket.bucketLabel}
                        </Typography>
                        {isAboveThreshold && (
                          <StatusChip status="approved" label={t('Auto-confirm')} />
                        )}
                      </Stack>
                      <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        <strong>{bucket.totalCount}</strong> ({bucket.confirmedCount} ✓ ·{' '}
                        {bucket.rejectedCount} ✕ · {bucket.pendingCount} …)
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={progress}
                      aria-label={`${t('Confidence distribution')} ${bucket.bucketLabel}`}
                      color={isAboveThreshold ? 'success' : 'primary'}
                      sx={{ height: 7, borderRadius: 4 }}
                    />
                  </Box>
                );
              })}
            </Stack>
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" component="h3" sx={{ fontWeight: 700, fontSize: '0.875rem', mb: 1.5 }}>
              {t('Model & Defect Breakdown')}
            </Typography>
            <TableContainer sx={{ width: '100%', overflowX: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: '8px' }}>
              <Table size="small" aria-label={t('Model & Defect Breakdown')} sx={{ minWidth: 420 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>
                      {t('Model / Defect Label')}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>
                      {t('Total')}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>
                      {t('Confirmed')}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>
                      {t('Rejected')}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>
                      {t('Avg Conf')}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.modelBreakdown.length > 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        sx={{
                          py: 0.625,
                          bgcolor: 'background.default',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: 'text.secondary',
                          textTransform: 'uppercase',
                          letterSpacing: '0.03em',
                        }}
                      >
                        {t('Models')}
                      </TableCell>
                    </TableRow>
                  )}
                  {data.modelBreakdown.map((m) => (
                    <TableRow key={`model-${m.modelName}`}>
                      <TableCell sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                        <Chip
                          size="small"
                          label={m.modelName}
                          color="primary"
                          variant="outlined"
                          sx={{ height: 22, fontSize: '0.75rem', fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.8125rem', fontVariantNumeric: 'tabular-nums' }}>
                        {m.totalDetections}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontSize: '0.8125rem', color: 'success.main', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
                      >
                        {m.confirmedCount} ({m.acceptanceRatePercent}%)
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          fontSize: '0.8125rem',
                          color: m.rejectedCount > 0 ? 'error.main' : 'text.secondary',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {m.rejectedCount}
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.8125rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                        {m.avgConfidencePercent}%
                      </TableCell>
                    </TableRow>
                  ))}
                  {data.defectBreakdown.length > 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        sx={{
                          py: 0.625,
                          bgcolor: 'background.default',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: 'text.secondary',
                          textTransform: 'uppercase',
                          letterSpacing: '0.03em',
                        }}
                      >
                        {t('Defect classes')}
                      </TableCell>
                    </TableRow>
                  )}
                  {data.defectBreakdown.slice(0, 5).map((d) => (
                    <TableRow key={`defect-${d.defectLabel}`}>
                      <TableCell sx={{ fontSize: '0.8125rem' }}>{d.defectLabel}</TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.8125rem', fontVariantNumeric: 'tabular-nums' }}>
                        {d.totalDetections}
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.8125rem', color: 'success.main', fontVariantNumeric: 'tabular-nums' }}>
                        {d.confirmedCount}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          fontSize: '0.8125rem',
                          color: d.rejectedCount > 0 ? 'error.main' : 'text.secondary',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {d.rejectedCount}
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.8125rem', fontVariantNumeric: 'tabular-nums' }}>
                        {d.avgConfidencePercent}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Box>
      </Stack>
    </Paper>
  );
}

export function AdminAiModelAnalyticsPanel({
  mode = 'full',
}: {
  mode?: 'full' | 'telemetry-only';
}) {
  const analyticsQuery = usePlatformAiAnalytics(true);
  const data = analyticsQuery.data;

  if (!data) {
    return null;
  }

  if (mode === 'telemetry-only') {
    return <AdminAiTelemetrySummary data={data} showConfigLink />;
  }

  return (
    <Stack spacing={2.5} sx={{ minWidth: 0 }}>
      <AdminAiThresholdConfigCard data={data} />
      <AdminAiTelemetrySummary data={data} />
    </Stack>
  );
}
