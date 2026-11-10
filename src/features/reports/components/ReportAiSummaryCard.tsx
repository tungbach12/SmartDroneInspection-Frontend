import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import CheckCircleOutlineRounded from '@mui/icons-material/CheckCircleOutlineRounded';
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded';
import ErrorOutlineRounded from '@mui/icons-material/ErrorOutlineRounded';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import { useReportAiSummary } from '@/features/inspections/hooks/useInspections';
import type { Finding, ReportAiSummary } from '@/features/inspections/api/inspectionApi';
import { useLocale } from '@/shared/i18n/LocaleProvider';

export interface ReportAiSummaryCardProps {
  inspectionId: string;
  versionId: string;
  summary?: string | null | undefined;
  findings?: Finding[] | undefined;
}

function deriveSummaryDetailsFromPersisted(
  persistedSummary: string,
  findings: Finding[],
): ReportAiSummary {
  const confirmed = findings.filter((f) => f.status === 'CONFIRMED' && !f.isDeleted);
  const hasCritical = confirmed.some((f) => f.severity === 'CRITICAL');
  const hasHigh = confirmed.some((f) => f.severity === 'HIGH');
  const hasMedium = confirmed.some((f) => f.severity === 'MEDIUM');
  const overallRisk: ReportAiSummary['overallRisk'] = hasCritical
    ? 'CRITICAL'
    : hasHigh
      ? 'HIGH'
      : hasMedium
        ? 'MEDIUM'
        : 'LOW';

  const keyHighlights: string[] = [];
  if (confirmed.length === 0) {
    keyHighlights.push('No structural defects observed');
  } else {
    confirmed
      .filter((f) => f.severity === 'CRITICAL' || f.severity === 'HIGH')
      .forEach((f) => keyHighlights.push(`${f.defectLabel} (${f.severity})`));
    if (keyHighlights.length === 0) {
      keyHighlights.push(`${confirmed.length} defect(s) confirmed at moderate severity`);
    }
  }

  const recommendedActions =
    confirmed.length === 0
      ? 'Routine periodic drone inspection schedule is recommended.'
      : 'Timely maintenance intervention recommended for confirmed defects.';

  return {
    summary: persistedSummary,
    keyHighlights,
    recommendedActions,
    overallRisk,
  };
}

export function ReportAiSummaryCard({
  inspectionId,
  versionId,
  summary: persistedSummary,
  findings = [],
}: ReportAiSummaryCardProps) {
  const { t } = useLocale();
  const hasPersistedSummary = Boolean(persistedSummary && persistedSummary.trim().length > 0);
  const {
    data: fetchedAiSummary,
    isLoading,
    error,
  } = useReportAiSummary(inspectionId, versionId, {
    enabled: !hasPersistedSummary,
  });

  const aiSummary: ReportAiSummary | undefined = hasPersistedSummary
    ? deriveSummaryDetailsFromPersisted(persistedSummary!.trim(), findings)
    : fetchedAiSummary;

  if (!hasPersistedSummary && isLoading) {
    return (
      <Card
        variant="outlined"
        sx={{
          borderRadius: '12px',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          p: 2,
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <CircularProgress size={20} color="primary" />
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
            {t('Generating AI executive summary…')}
          </Typography>
        </Stack>
      </Card>
    );
  }

  if ((!hasPersistedSummary && error) || !aiSummary) {
    return null;
  }

  const riskColor =
    aiSummary.overallRisk === 'CRITICAL' || aiSummary.overallRisk === 'HIGH'
      ? 'error'
      : aiSummary.overallRisk === 'MEDIUM'
        ? 'warning'
        : 'success';

  const riskIcon =
    aiSummary.overallRisk === 'CRITICAL' || aiSummary.overallRisk === 'HIGH' ? (
      <ErrorOutlineRounded fontSize="small" />
    ) : aiSummary.overallRisk === 'MEDIUM' ? (
      <WarningAmberRounded fontSize="small" />
    ) : (
      <CheckCircleOutlineRounded fontSize="small" />
    );

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: '12px',
        borderColor: 'primary.light',
        bgcolor: (theme) =>
          theme.palette.mode === 'dark' ? 'rgba(14, 165, 233, 0.08)' : 'rgba(240, 249, 255, 0.9)',
        boxShadow: 'none',
        overflow: 'hidden',
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Stack spacing={1.5}>
          {/* Header */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.25}
            sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' } }}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <AutoAwesomeRounded sx={{ color: 'primary.main', fontSize: 20 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                {t('AI Executive Summary')}
              </Typography>
              <Chip
                size="small"
                label={t('LLM Digest')}
                sx={{
                  height: 20,
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                }}
              />
            </Stack>

            <Chip
              size="small"
              icon={riskIcon}
              label={`${t('Overall Risk')}: ${t(aiSummary.overallRisk)}`}
              color={riskColor}
              sx={{ fontWeight: 700, fontSize: '0.75rem' }}
            />
          </Stack>

          {/* Summary Text */}
          <Typography
            variant="body2"
            sx={{ color: 'text.primary', lineHeight: 1.6, fontWeight: 500 }}
          >
            {aiSummary.summary}
          </Typography>

          {/* Key Highlights */}
          {aiSummary.keyHighlights && aiSummary.keyHighlights.length > 0 && (
            <Box sx={{ mt: 0.5 }}>
              <Typography
                variant="caption"
                sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}
              >
                {t('Key Highlights')}
              </Typography>
              <List dense disablePadding sx={{ mt: 0.5 }}>
                {aiSummary.keyHighlights.map((highlight, index) => (
                  <ListItem key={index} disableGutters sx={{ py: 0.25 }}>
                    <ListItemIcon sx={{ minWidth: 20, color: 'primary.main' }}>
                      <InfoOutlined sx={{ fontSize: 15 }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}>
                          {highlight}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {/* Recommended Actions */}
          {aiSummary.recommendedActions && (
            <Box
              sx={{
                p: 1.25,
                borderRadius: '8px',
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.25 }}>
                {t('Recommended Actions')}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.primary', fontSize: '0.8125rem' }}>
                {aiSummary.recommendedActions}
              </Typography>
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
