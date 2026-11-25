import { Box, Button, Chip, Link, Stack, Typography } from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import type {
  GuidelineMatch,
  HistoricalCaseMatch,
  KnowledgeRecommendationResponse,
} from '../api/inspectionApi';

export interface KnowledgeRecommendationPanelProps {
  data?: KnowledgeRecommendationResponse | null | undefined;
  isLoading?: boolean | undefined;
  /** When provided, each historical case gets a one-click "Apply" action for its technical note. */
  onApplyNote?: ((note: string) => void) | undefined;
}

const clampTwoLines = {
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
} as const;

const microChip = {
  height: 20,
  fontSize: '0.7rem',
  fontWeight: 700,
  '& .MuiChip-label': { px: 0.75 },
} as const;

function severitySx(severity: string) {
  const upper = severity.toUpperCase();
  return (muiTheme: { palette: { mode: string } }) => {
    const dark = muiTheme.palette.mode === 'dark';
    if (upper === 'CRITICAL' || upper === 'HIGH') {
      return {
        ...microChip,
        bgcolor: dark ? 'rgba(239, 68, 68, 0.16)' : '#fef2f2',
        color: dark ? '#FCA5A5' : '#991b1b',
        borderColor: dark ? 'rgba(239, 68, 68, 0.35)' : '#fecaca',
      };
    }
    if (upper === 'MEDIUM') {
      return {
        ...microChip,
        bgcolor: dark ? 'rgba(245, 158, 11, 0.16)' : '#fef9c3',
        color: dark ? '#FCD34D' : '#713f12',
        borderColor: dark ? 'rgba(245, 158, 11, 0.35)' : '#fde047',
      };
    }
    return {
      ...microChip,
      bgcolor: dark ? 'rgba(16, 185, 129, 0.16)' : '#f0fdf4',
      color: dark ? '#6EE7B7' : '#166534',
      borderColor: dark ? 'rgba(16, 185, 129, 0.35)' : '#bbf7d0',
    };
  };
}

function outcomeText(outcome: string): string {
  return outcome.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (ch) => ch.toUpperCase());
}

/**
 * Compact, inline strip of source-backed historical cases and guidelines.
 * Presentational only: the caller owns fetching, expanding and the optional Apply action.
 */
export function KnowledgeRecommendationPanel({
  data,
  isLoading = false,
  onApplyNote,
}: KnowledgeRecommendationPanelProps) {
  const { t } = useLocale();
  const cases = data?.cases ?? [];
  const guidelines = data?.guidelines ?? [];

  if (isLoading) {
    return (
      <Box data-testid="knowledge-recommendation-panel" sx={{ py: 0.75, display: 'flex' }}>
        <CircularProgress size={14} />
      </Box>
    );
  }

  if (cases.length === 0 && guidelines.length === 0) return null;

  return (
    <Stack
      data-testid="knowledge-recommendation-panel"
      spacing={0.25}
      sx={{
        mt: 0.5,
        p: 0.75,
        borderRadius: '8px',
        bgcolor: (theme) =>
          theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#f8fafc',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      {cases.length > 0 && (
        <Box>
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              fontSize: '0.65rem',
              fontWeight: 700,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              color: 'text.secondary',
              mb: 0.25,
            }}
          >
            {t('Cases')}
          </Typography>
          {cases.map((item: HistoricalCaseMatch) => {
            const context = item.sameAsset
              ? t('Same building')
              : item.sameOrganization
                ? t('Same org')
                : t('Benchmark');
            return (
              <Box
                key={item.id}
                data-testid="knowledge-case-row"
                sx={{ py: 0.5, borderTop: '1px solid', borderColor: 'divider' }}
              >
                <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
                  <Chip
                    size="small"
                    variant="outlined"
                    color="primary"
                    label={`${Math.round(item.similarity * 100)}%`}
                    sx={microChip}
                  />
                  <Chip size="small" variant="outlined" label={context} sx={microChip} />
                  <Chip size="small" variant="outlined" label={item.severity} sx={severitySx(item.severity)} />
                  <Typography sx={{ fontWeight: 700, fontSize: '0.8125rem' }}>
                    {item.defectLabel}
                  </Typography>
                  <Chip
                    size="small"
                    variant="outlined"
                    label={outcomeText(item.outcome)}
                    sx={microChip}
                  />
                  {onApplyNote && (
                    <Button
                      size="small"
                      onClick={() => onApplyNote(item.technicalNotes)}
                      sx={{
                        minWidth: 0,
                        minHeight: 20,
                        px: 0.9,
                        py: 0,
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        textTransform: 'none',
                        borderRadius: '999px',
                        lineHeight: 1,
                      }}
                    >
                      {t('Apply')}
                    </Button>
                  )}
                </Stack>
                <Typography
                  variant="caption"
                  sx={{ color: 'text.secondary', lineHeight: 1.4, mt: 0.25, ...clampTwoLines }}
                >
                  {item.technicalNotes}
                </Typography>
              </Box>
            );
          })}
        </Box>
      )}

      {guidelines.length > 0 && (
        <Box>
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              fontSize: '0.65rem',
              fontWeight: 700,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              color: 'text.secondary',
              mb: 0.25,
              mt: cases.length > 0 ? 0.5 : 0,
            }}
          >
            {t('Standards')}
          </Typography>
          {guidelines.map((item: GuidelineMatch) => (
            <Box
              key={item.id}
              data-testid="knowledge-guideline-row"
              sx={{ py: 0.5, borderTop: '1px solid', borderColor: 'divider' }}
            >
              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
                <Chip
                  size="small"
                  variant="outlined"
                  color="primary"
                  label={item.standardCode}
                  sx={microChip}
                />
                <Typography sx={{ fontWeight: 700, fontSize: '0.8125rem' }}>
                  {item.title}
                </Typography>
                {item.referenceUrl && (
                  <Link
                    href={item.referenceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t('Open reference')}
                    sx={{ display: 'inline-flex', lineHeight: 0 }}
                  >
                    <OpenInNewRounded sx={{ fontSize: 14 }} />
                  </Link>
                )}
              </Stack>
              <Typography
                variant="caption"
                sx={{ color: 'text.secondary', lineHeight: 1.4, mt: 0.25, ...clampTwoLines }}
              >
                {item.guidance}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Stack>
  );
}
