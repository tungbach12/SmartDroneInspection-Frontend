import React from 'react';
import { Box, Typography } from '@mui/material';
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

export interface LyticMetricCardProps {
  label: string;
  value: string;
  change: string;
  positive: boolean;
  subtext: string;
  iconType?: string;
}

export const LyticMetricCard: React.FC<LyticMetricCardProps> = ({
  label,
  value,
  change,
  positive,
  subtext,
  iconType,
}) => {
  const renderIcon = () => {
    const iconProps = { sx: { fontSize: 20, color: 'var(--lytic-primary, #3758F9)' } };
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
      case 'shield':
      default:
        return <ShieldOutlined {...iconProps} />;
    }
  };

  return (
    <Box
      component="div"
      role="group"
      aria-label={`${label}: ${value}`}
      sx={{
        backgroundColor: 'var(--lytic-bg-card, #ffffff)',
        border: '1px solid var(--lytic-border, #e5e7eb)',
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        '&:hover': {
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.06), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
        },
      }}
    >
      {/* Top row with icon & title */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          borderBottom: '1px solid var(--lytic-border-light, #f3f4f6)',
          px: 1.5,
          py: 1.25,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            width: 36,
            height: 36,
            border: '1px solid var(--lytic-border-light, #f3f4f6)',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            bgcolor: 'var(--lytic-primary-light, #eff3ff)',
            flexShrink: 0,
          }}
        >
          {renderIcon()}
        </Box>
        <Typography
          variant="body2"
          sx={{
            color: 'var(--lytic-text, #6b7280)',
            fontSize: '14px',
            fontWeight: 500,
            lineHeight: 1.2,
          }}
        >
          {label}
        </Typography>
      </Box>

      {/* Bottom section with big value, trend pill, and subtext */}
      <Box sx={{ px: 2, py: 1.5 }}>
        <Typography
          component="p"
          sx={{
            color: 'var(--lytic-title, #1f2937)',
            fontSize: { xs: '22px', sm: '24px' },
            fontWeight: 700,
            letterSpacing: '-0.025em',
            lineHeight: '32px',
            mb: 1.5,
          }}
        >
          {value}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Box
            component="span"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              borderRadius: '9999px',
              fontWeight: 500,
              py: '2px',
              px: '8px',
              fontSize: '12px',
              bgcolor: positive
                ? 'var(--lytic-success-bg, #dcfce7)'
                : 'var(--lytic-error-bg, #fee2e2)',
              color: positive
                ? 'var(--lytic-success-text, #16a34a)'
                : 'var(--lytic-error-text, #dc2626)',
              lineHeight: 1.4,
              flexShrink: 0,
            }}
          >
            {change}
          </Box>

          <Typography
            variant="caption"
            sx={{
              color: 'var(--lytic-text, #6b7280)',
              fontSize: '12px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {subtext}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};
