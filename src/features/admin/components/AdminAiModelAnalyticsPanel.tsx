import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
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
import InsightsRounded from '@mui/icons-material/InsightsRounded';
import TuneRounded from '@mui/icons-material/TuneRounded';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import {
  usePlatformAiAnalytics,
  useUpdatePlatformAiSettings,
} from '@/features/admin/hooks/usePlatformAiSettings';
import type { PlatformAiAnalytics } from '@/features/inspections/api/inspectionApi';
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
  const [applyToPending, setApplyToPending] = useState(true);

  const enabled = overrideEnabled ?? data.autoConfirmEnabled ?? true;
  const threshold = overrideThreshold ?? Number(data.autoConfirmThreshold ?? 85);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const clamped = Math.max(0, Math.min(100, Number(threshold) || 0));
    updateSettings.mutate({
      autoConfirmEnabled: enabled,
      autoConfirmThreshold: clamped,
      applyToPending,
    });
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
                bgcolor: 'action.selected',
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
              <Typography variant="h6" component="h2" sx={{ fontWeight: 700, fontSize: '1rem', lineHeight: 1.25 }}>
                {t('AI Auto-Confirm Threshold')}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t('Automatically mark findings as CONFIRMED when confidence meets threshold')}
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

        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={3}
          sx={{ alignItems: { md: 'center' } }}
        >
          <Box sx={{ flex: 1, minWidth: 220, px: 1.5 }}>
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
            sx={{ width: 130, flexShrink: 0 }}
          />

          <FormControlLabel
            control={
              <Checkbox
                size="small"
                disabled={!enabled}
                checked={applyToPending}
                onChange={(e) => setApplyToPending(e.target.checked)}
              />
            }
            label={
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                {t('Apply to pending findings')}
              </Typography>
            }
          />

          <Button
            type="submit"
            variant="contained"
            disabled={updateSettings.isPending}
            sx={{
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 700,
              px: 2.5,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {updateSettings.isPending ? t('Saving…') : t('Save threshold')}
          </Button>
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

  const healthColor: 'success' | 'warning' | 'error' =
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
                bgcolor: 'action.selected',
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
            <Chip
              size="small"
              icon={<TuneRounded fontSize="small" />}
              color={data.autoConfirmEnabled ? 'primary' : 'default'}
              label={
                data.autoConfirmEnabled
                  ? `Auto-confirm ≥ ${Number(data.autoConfirmThreshold).toFixed(0)}%`
                  : t('Auto-confirm: Off')
              }
              sx={{ fontWeight: 700 }}
            />
            <Chip
              size="small"
              icon={<InsightsRounded fontSize="small" />}
              color={healthColor}
              variant="outlined"
              label={healthLabel}
              sx={{ fontWeight: 700 }}
            />
            {showConfigLink && (
              <Button
                component={RouterLink}
                to="/admin/ai-settings"
                size="small"
                variant="outlined"
                endIcon={<ArrowForwardRounded sx={{ fontSize: 15 }} />}
                sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
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
            <Typography variant="h5" component="div" sx={{ fontWeight: 800, mt: 0.5 }}>
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
            <Typography variant="h5" component="div" sx={{ fontWeight: 800, color: 'success.main', mt: 0.5 }}>
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
            <Typography variant="h5" component="div" sx={{ fontWeight: 800, color: 'primary.main', mt: 0.5 }}>
              {data.averageConfidencePercent}%
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('Confirmed avg')}: <strong>{data.averageConfirmedConfidencePercent}%</strong> ·{' '}
              {t('Manual')}: <strong>{data.manualFindingsCount}</strong>
            </Typography>
          </Box>
        </Box>

        {data.rejectionRatePercent > 35 && (
          <Alert severity="warning" sx={{ borderRadius: '10px' }}>
            {t('Rejection rate is high (> 35%). Consider raising the Auto-Confirm threshold.')}
          </Alert>
        )}

        {/* Confidence Distribution & Model Breakdown */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
            gap: 3,
          }}
        >
          <Box>
            <Typography variant="h6" component="h2" sx={{ fontWeight: 700, fontSize: '0.875rem', mb: 1.5 }}>
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
                      sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 0.4 }}
                    >
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 72 }}>
                          {bucket.bucketLabel}
                        </Typography>
                        {isAboveThreshold && (
                          <Chip
                            size="small"
                            color="success"
                            variant="outlined"
                            label={t('Auto-confirm')}
                            sx={{ height: 20, fontSize: '0.75rem', fontWeight: 700 }}
                          />
                        )}
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
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

          <Box>
            <Typography variant="h6" component="h2" sx={{ fontWeight: 700, fontSize: '0.875rem', mb: 1.5 }}>
              {t('Model & Defect Breakdown')}
            </Typography>
            <TableContainer>
              <Table size="small" aria-label={t('Model & Defect Breakdown')}>
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
                  {data.modelBreakdown.map((m) => (
                    <TableRow key={`model-${m.modelName}`}>
                      <TableCell sx={{ fontSize: '0.78rem', fontWeight: 700 }}>
                        <Chip
                          size="small"
                          label={m.modelName}
                          color="primary"
                          variant="outlined"
                          sx={{ height: 22, fontSize: '0.75rem', fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.78rem' }}>
                        {m.totalDetections}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontSize: '0.78rem', color: 'success.main', fontWeight: 700 }}
                      >
                        {m.confirmedCount} ({m.acceptanceRatePercent}%)
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          fontSize: '0.78rem',
                          color: m.rejectedCount > 0 ? 'error.main' : 'text.secondary',
                        }}
                      >
                        {m.rejectedCount}
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.78rem', fontWeight: 600 }}>
                        {m.avgConfidencePercent}%
                      </TableCell>
                    </TableRow>
                  ))}
                  {data.defectBreakdown.slice(0, 5).map((d) => (
                    <TableRow key={`defect-${d.defectLabel}`}>
                      <TableCell sx={{ fontSize: '0.78rem' }}>{d.defectLabel}</TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.78rem' }}>
                        {d.totalDetections}
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.78rem', color: 'success.main' }}>
                        {d.confirmedCount}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          fontSize: '0.78rem',
                          color: d.rejectedCount > 0 ? 'error.main' : 'text.secondary',
                        }}
                      >
                        {d.rejectedCount}
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.78rem' }}>
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
    <Stack spacing={2.5}>
      <AdminAiThresholdConfigCard data={data} />
      <AdminAiTelemetrySummary data={data} />
    </Stack>
  );
}
