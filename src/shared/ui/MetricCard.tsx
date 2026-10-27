import React from 'react';
import { Box, Typography } from '@mui/material';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import ApartmentOutlined from '@mui/icons-material/ApartmentOutlined';
import CheckCircleOutlineRounded from '@mui/icons-material/CheckCircleOutlineRounded';
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded';
import AccountBalanceWalletOutlined from '@mui/icons-material/AccountBalanceWalletOutlined';
import PersonOutlineRounded from '@mui/icons-material/PersonOutlineRounded';
import FlashOnRounded from '@mui/icons-material/FlashOnRounded';
import FlightTakeoffRounded from '@mui/icons-material/FlightTakeoffRounded';
import BuildOutlined from '@mui/icons-material/BuildOutlined';
import AccessTimeRounded from '@mui/icons-material/AccessTimeRounded';
import ShieldOutlined from '@mui/icons-material/ShieldOutlined';
import FactCheckOutlined from '@mui/icons-material/FactCheckOutlined';

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
  iconType,
}) => {
  const { t } = useLocale();
  const renderIcon = () => {
    const iconProps = { sx: { fontSize: 20 } };
    switch (iconType) {
      case 'building':
        return <ApartmentOutlined {...iconProps} />;
      case 'check-circle':
        return <CheckCircleOutlineRounded {...iconProps} />;
      case 'alert':
        return <WarningAmberRounded {...iconProps} />;
      case 'wallet':
        return <AccountBalanceWalletOutlined {...iconProps} />;
      case 'user':
        return <PersonOutlineRounded {...iconProps} />;
      case 'lightning':
        return <FlashOnRounded {...iconProps} />;
      case 'plane':
        return <FlightTakeoffRounded {...iconProps} />;
      case 'wrench':
        return <BuildOutlined {...iconProps} />;
      case 'clock':
        return <AccessTimeRounded {...iconProps} />;
      case 'report':
        return <FactCheckOutlined {...iconProps} />;
      case 'shield':
      default:
        return <ShieldOutlined {...iconProps} />;
    }
  };

  // Soft icon treatments derived from theme palette (light/dark aware).
  const getIconTheme = () => {
    switch (iconType) {
      case 'check-circle':
        return {
          bg: 'color-mix(in srgb, var(--mui-palette-success-main) 14%, transparent)',
          color: 'success.main',
        };
      case 'alert':
        return {
          bg: 'color-mix(in srgb, var(--mui-palette-error-main) 12%, transparent)',
          color: 'error.main',
        };
      case 'wrench':
        return {
          bg: 'color-mix(in srgb, var(--mui-palette-warning-main) 16%, transparent)',
          color: 'warning.main',
        };
      case 'plane':
      case 'report':
      case 'building':
      default:
        return {
          bg: 'color-mix(in srgb, var(--mui-palette-primary-main) 12%, transparent)',
          color: 'primary.main',
        };
    }
  };

  const iconTheme = getIconTheme();

  return (
    <Box
      component="div"
      role="group"
      aria-label={`${t(label)}: ${value}`}
      sx={{
        backgroundColor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '16px',
        p: { xs: 2, sm: 2.5 },
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 1px 3px 0 rgba(16, 24, 40, 0.05), 0 1px 2px 0 rgba(16, 24, 40, 0.03)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        '&:hover': {
          boxShadow: '0 4px 8px -2px rgba(16, 24, 40, 0.08), 0 2px 4px -2px rgba(16, 24, 40, 0.04)',
        },
      }}
    >
      {/* Top row: icon & title */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2 }}>
        <Box
          sx={{
            display: 'flex',
            width: 38,
            height: 38,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '10px',
            bgcolor: iconTheme.bg,
            color: iconTheme.color,
            flexShrink: 0,
          }}
        >
          {renderIcon()}
        </Box>
        <Typography
          variant="body2"
          sx={{
            color: 'text.secondary',
            fontSize: '0.875rem',
            fontWeight: 500,
            lineHeight: 1.3,
          }}
        >
          {t(label)}
        </Typography>
      </Box>

      {/* Middle: large bold value */}
      <Typography
        component="p"
        sx={{
          color: 'text.primary',
          fontSize: { xs: '1.625rem', sm: '1.875rem' },
          fontWeight: 700,
          letterSpacing: '-0.025em',
          lineHeight: 1.2,
          mb: 1.5,
        }}
      >
        {t(value)}
      </Typography>

      {/* Bottom: trend pill & subtext */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        {change && (
          <Box
            component="span"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              borderRadius: '9999px',
              fontWeight: 500,
              py: '2px',
              px: '8px',
              fontSize: '12px',
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
