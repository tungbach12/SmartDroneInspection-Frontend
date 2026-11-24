import React from 'react';
import { Box, Typography } from '@mui/material';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import {
  GlassAiFindingsIcon,
  GlassAssetIcon,
  GlassDroneIcon,
  GlassIconBadge,
  GlassPaymentIcon,
  GlassPermitIcon,
  GlassReportIcon,
  GlassScheduleIcon,
  GlassTrendDownIcon,
  GlassTrendUpIcon,
  GlassUsersIcon,
  GlassWarningIcon,
  type GlassTone,
} from './GradientGlassIcons';

export interface MetricCardProps {
  label: string;
  value: string;
  change?: string | undefined;
  positive?: boolean;
  showTrend?: boolean;
  subtext?: string;
  iconType?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  change,
  positive = true,
  showTrend = true,
  subtext,
  iconType,
}) => {
  const { t } = useLocale();

  const getGlassIconConfig = (): { tone: GlassTone; icon: React.ReactNode } => {
    switch (iconType) {
      case 'building':
        return { tone: 'blue', icon: <GlassAssetIcon size={20} /> };
      case 'plane':
      case 'flight':
        return { tone: 'cyan', icon: <GlassDroneIcon size={20} /> };
      case 'eye':
        return { tone: 'indigo', icon: <GlassAiFindingsIcon size={20} /> };
      case 'dollar':
      case 'check-circle':
      case 'wallet':
      case 'fact-check':
        return { tone: 'emerald', icon: <GlassPaymentIcon size={20} /> };
      case 'clock':
      case 'access-time':
        return { tone: 'blue', icon: <GlassScheduleIcon size={20} /> };
      case 'users':
      case 'user':
      case 'lightning':
        return { tone: 'cyan', icon: <GlassUsersIcon size={20} /> };
      case 'alert':
        return { tone: 'amber', icon: <GlassWarningIcon size={20} /> };
      case 'shield':
        return { tone: 'blue', icon: <GlassPermitIcon size={20} /> };
      case 'wrench':
      case 'box':
      case 'report':
      default:
        return { tone: 'blue', icon: <GlassReportIcon size={20} /> };
    }
  };

  const iconConfig = getGlassIconConfig();

  return (
    <Box
      component="div"
      role="group"
      aria-label={`${t(label)}: ${value}`}
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '10px',
        p: '20px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'none',
      }}
    >
      {/* Top Row: Style 5 Gradient Glass icon badge */}
      <GlassIconBadge size={38} borderRadius="10px" tone={iconConfig.tone}>
        {iconConfig.icon}
      </GlassIconBadge>

      {/* Middle Value */}
      <Typography
        component="p"
        sx={{
          mt: '24px',
          mb: '5px',
          fontSize: { xs: '1.25rem', md: '1.5rem' },
          lineHeight: { xs: '1.75rem', md: '2rem' },
          fontWeight: 600,
          color: 'text.primary',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {t(value)}
      </Typography>

      {/* Bottom Row: Label on left, Change / Subtext on right */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 1,
        }}
      >
        <Box sx={{ minWidth: 0, flex: '1 1 auto' }}>
          <Typography
            variant="body2"
            sx={{
              fontSize: '0.875rem',
              lineHeight: '1.25rem',
              fontWeight: 500,
              color: 'text.secondary',
            }}
          >
            {t(label)}
          </Typography>
          {subtext && change && (
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.75rem',
                lineHeight: '1rem',
                color: 'text.secondary',
                display: 'block',
                mt: 0.25,
                opacity: 0.8,
              }}
            >
              {t(subtext)}
            </Typography>
          )}
        </Box>

        {change ? (
          <Box
            component="span"
            sx={{
              fontSize: '0.75rem',
              lineHeight: '1rem',
              fontWeight: 600,
              color: showTrend
                ? (positive ? '#15803D' : '#DC2626')
                : 'text.secondary',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              flexShrink: 0,
            }}
          >
            <span>{t(change)}</span>
            {showTrend &&
              (positive ? <GlassTrendUpIcon size={14} /> : <GlassTrendDownIcon size={14} />)}
          </Box>
        ) : subtext ? (
          <Typography
            variant="caption"
            sx={{
              fontSize: '0.75rem',
              lineHeight: '1rem',
              color: 'text.secondary',
              flexShrink: 0,
              opacity: 0.8,
            }}
          >
            {t(subtext)}
          </Typography>
        ) : null}
      </Box>
    </Box>
  );
};
