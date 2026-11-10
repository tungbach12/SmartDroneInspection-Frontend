import React from 'react';
import { Box, Typography } from '@mui/material';
import { useLocale } from '@/shared/i18n/LocaleProvider';

export interface MetricCardProps {
  label: string;
  value: string;
  change?: string;
  positive?: boolean;
  subtext?: string;
  iconType?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  change,
  positive = true,
  subtext,
}) => {
  const { t } = useLocale();

  return (
    <Box
      component="div"
      role="group"
      aria-label={`${t(label)}: ${value}`}
      sx={{
        backgroundColor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '10px',
        p: { xs: 2, sm: 2.25 },
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'border-color 0.15s ease',
        '&:hover': {
          borderColor: 'text.secondary',
        },
      }}
    >
      <Typography
        variant="body2"
        sx={{
          color: 'text.secondary',
          fontSize: '0.84rem',
          fontWeight: 550,
          lineHeight: 1.35,
          mb: 1.25,
        }}
      >
        {t(label)}
      </Typography>

      <Typography
        component="p"
        sx={{
          color: 'text.primary',
          fontSize: { xs: '1.625rem', sm: '1.875rem' },
          fontWeight: 700,
          letterSpacing: '-0.03em',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1.15,
          mb: 1.25,
        }}
      >
        {t(value)}
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        {change && (
          <Box
            component="span"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              borderRadius: '6px',
              fontWeight: 600,
              py: '2px',
              px: '7px',
              fontSize: '11.5px',
              bgcolor: positive
                ? 'color-mix(in srgb, var(--mui-palette-success-main) 12%, transparent)'
                : 'color-mix(in srgb, var(--mui-palette-error-main) 12%, transparent)',
              color: positive ? 'success.main' : 'error.main',
              lineHeight: 1.4,
              flexShrink: 0,
            }}
          >
            {t(change)}
          </Box>
        )}

        {subtext && (
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontSize: '12px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {t(subtext)}
          </Typography>
        )}
      </Box>
    </Box>
  );
};
