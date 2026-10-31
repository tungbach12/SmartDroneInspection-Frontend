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
                alt={t('Compiling report in progress')}
              />
            ))}
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              {t('Compiling inspection report')}
            </Typography>
          </Stack>
          <LinearProgress sx={{ borderRadius: 4 }} />
          <Alert severity="info" sx={{ borderRadius: '8px' }}>
            {t(
              'Compiling report automatically from confirmed findings and evidence records. The report will appear when ready for review.',
            )}
          </Alert>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <AiMotionFigure name="draftBurst" size={22} alt={t('Compiling report in progress')} />
            <Typography variant="caption" color="text.secondary">
              {t('You can keep working in another tab; this process runs automatically.')}
            </Typography>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
