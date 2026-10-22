import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import MoreHorizRounded from '@mui/icons-material/MoreHorizRounded';
import { useTheme } from '@mui/material/styles';
import { useLocale } from '@/shared/i18n/LocaleProvider';

export interface LyticRadialGaugeCardProps {
  title: string;
  subtitle: string;
  targetValue: string;
  targetLabel: string;
  percentage: number;
  subMetrics: Array<{
    label: string;
    value: string;
    percentage: number;
  }>;
}

export const LyticRadialGaugeCard: React.FC<LyticRadialGaugeCardProps> = ({
  title,
  subtitle,
  targetValue,
  targetLabel,
  percentage,
  subMetrics,
}) => {
  const { t } = useLocale();
  const theme = useTheme();

  // Semi-circle SVG gauge calculation
  // Radius: 85, Center: (120, 95)
  const cx = 120;
  const cy = 95;
  const r = 80;
  const strokeWidth = 14;

  // Arc angles: Starts from 180 deg (left) to 0 deg (right)
  // An extra 15 degrees on each side for the Lytic horseshoe shape: 195 deg to -15 deg = 210 deg total span
  const totalAngle = 200;
  const startAngle = 190;
  const endAngle = startAngle - (percentage / 100) * totalAngle;

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY - radius * Math.sin(angleInRadians),
    };
  };

  const describeArc = (x: number, y: number, radius: number, startA: number, endA: number) => {
    const start = polarToCartesian(x, y, radius, startA);
    const end = polarToCartesian(x, y, radius, endA);
    const largeArcFlag = Math.abs(startA - endA) <= 180 ? '0' : '1';
    return ['M', start.x, start.y, 'A', radius, radius, 0, largeArcFlag, 1, end.x, end.y].join(' ');
  };

  const bgArc = describeArc(cx, cy, r, 190, -10);
  const progressArc = describeArc(cx, cy, r, 190, endAngle);

  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: '16px',
        p: { xs: 2.5, sm: 3 },
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box>
          <Typography
            sx={{
              color: 'text.primary',
              fontSize: '16px',
              fontWeight: 600,
              lineHeight: 1.3,
            }}
          >
            {title}
          </Typography>
          <Typography
            sx={{
              color: 'text.secondary',
              fontSize: '14px',
              mt: 0.5,
            }}
          >
            {subtitle}
          </Typography>
        </Box>

        <IconButton
          size="small"
          aria-label={t('Gauge options')}
          sx={{
            color: 'text.secondary',
            p: 0.75,
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <MoreHorizRounded fontSize="small" />
        </IconButton>
      </Box>

      {/* Semi-circle Gauge Centerpiece */}
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', my: 'auto', py: 1 }}>
        <Box sx={{ position: 'relative', width: 240, height: 130 }}>
          <svg viewBox="0 0 240 130" style={{ width: '100%', height: '100%' }}>
            {/* Background Track Arc */}
            <path
              d={bgArc}
              fill="none"
              stroke={theme.palette.divider}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            {/* Active Progress Arc */}
            <path
              d={progressArc}
              fill="none"
              stroke={theme.palette.primary.main}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
          </svg>

          {/* Center Target Text */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 8,
              left: '50%',
              transform: 'translateX(-50%)',
              textAlign: 'center',
            }}
          >
            <Typography
              sx={{
                color: 'text.primary',
                fontSize: '24px',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
              }}
            >
              {targetValue}
            </Typography>
            <Typography
              sx={{
                color: 'text.secondary',
                fontSize: '12px',
                fontWeight: 500,
                mt: 0.25,
              }}
            >
              {targetLabel}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Sub-metrics with Progress Bars */}
      <Box
        sx={{
          borderTop: 1,
          borderColor: 'divider',
          mt: 3,
          pt: 3,
          display: 'flex',
          flexDirection: 'column',
          gap: 2.5,
        }}
      >
        {subMetrics.map((item) => (
          <Box key={item.label}>
            <Typography
              sx={{
                color: 'text.secondary',
                fontSize: '14px',
                mb: 1,
              }}
            >
              {item.label}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
              <Typography
                sx={{
                  color: 'text.primary',
                  fontSize: '16px',
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {item.value}
              </Typography>
              <Box sx={{ width: 160, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    position: 'relative',
                    height: 8,
                    width: '100%',
                    bgcolor: 'action.hover',
                    borderRadius: '9999px',
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      height: '100%',
                      width: `${item.percentage}%`,
                      bgcolor: 'primary.main',
                      borderRadius: '9999px',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </Box>
                <Typography
                  sx={{
                    color: 'text.secondary',
                    fontSize: '12px',
                    fontWeight: 500,
                    width: 32,
                    textAlign: 'right',
                  }}
                >
                  {item.percentage}%
                </Typography>
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};
