import { Chip, Stack, Typography } from '@mui/material';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import { useLocale } from '@/shared/i18n/LocaleProvider';

interface InspectorRatingSummaryBadgeProps {
  averageRating?: number | null | undefined;
  ratingCount?: number | null | undefined;
  variant?: 'chip' | 'inline';
  showEmpty?: boolean;
}

export function InspectorRatingSummaryBadge({
  averageRating,
  ratingCount,
  variant = 'chip',
  showEmpty = false,
}: InspectorRatingSummaryBadgeProps) {
  const { t } = useLocale();
  const count = ratingCount ?? 0;

  if (count <= 0 || averageRating == null) {
    if (!showEmpty) {
      return null;
    }
    if (variant === 'inline') {
      return (
        <Typography variant="body2" color="text.secondary">
          {t('No ratings yet')}
        </Typography>
      );
    }
    return (
      <Chip
        size="small"
        variant="outlined"
        label={t('No ratings yet')}
        sx={{ height: 22, fontSize: '0.75rem', fontWeight: 500, color: 'text.secondary' }}
      />
    );
  }

  const scoreText = averageRating.toFixed(1);

  if (variant === 'inline') {
    return (
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
        <StarRoundedIcon sx={{ fontSize: 17, color: '#f59e0b' }} />
        <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
          {scoreText}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          ({count})
        </Typography>
      </Stack>
    );
  }

  return (
    <Chip
      size="small"
      variant="outlined"
      icon={<StarRoundedIcon sx={{ fontSize: '15px !important', color: '#f59e0b' }} />}
      label={`${scoreText} (${count})`}
      sx={{
        height: 22,
        fontSize: '0.75rem',
        fontWeight: 700,
        fontVariantNumeric: 'tabular-nums',
        borderColor: 'rgba(245, 158, 11, 0.45)',
        bgcolor: 'rgba(245, 158, 11, 0.08)',
        color: 'text.primary',
      }}
    />
  );
}
