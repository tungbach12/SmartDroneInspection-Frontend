import { Alert, Card, CardContent, LinearProgress, Stack, Typography } from '@mui/material';
import { AiMotionFigure } from './AiMotionFigure';
import { useLocale } from '@/shared/i18n/LocaleProvider';

const draftingFigures = ['draftStack', 'draftRibbon'] as const;

/**
 * The API returns a completed draft or an error; it does not report intermediate stages.
 *
 * The motion is playful but deliberately indeterminate — it never claims a stage, a percentage,
 * or a remaining time, because none of those exist in the contract.
 */
export function DraftProgressTracker() {
  const { t } = useLocale();
  return (
    <Card
      variant="outlined"
      sx={{
        mt: 2,
        borderRadius: '12px',
        borderColor: 'primary.main',
        bgcolor: 'background.paper',
        backgroundImage:
          'linear-gradient(115deg, color-mix(in srgb, var(--mui-palette-primary-main) 7%, transparent) 0%, transparent 45%)',
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
            {draftingFigures.map((figure) => (
              <AiMotionFigure
                key={figure}
                name={figure}
                size={figure === 'draftStack' ? 40 : 32}
                alt={t('Report drafting in progress')}
              />
            ))}
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              {t('Generating report draft')}
            </Typography>
          </Stack>
          <LinearProgress sx={{ borderRadius: 4 }} />
          <Alert severity="info" sx={{ borderRadius: '8px' }}>
            Waiting for the report-drafting service. Progress stages are not available. The draft
            will appear when the request completes; you must review and verify every section before
            submitting it.
          </Alert>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <AiMotionFigure name="draftBurst" size={22} alt={t('Report drafting in progress')} />
            <Typography variant="caption" color="text.secondary">
              {t('You can keep working in another tab; this request continues on its own.')}
            </Typography>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
