import React from 'react';
import { Box, Typography } from '@mui/material';
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
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '12px',
        p: '20px',
        boxShadow: 'none',
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
              fontSize: '1rem',
              fontWeight: 600,
              lineHeight: 1.4,
            }}
          >
            {t(title)}
          </Typography>
          <Typography
            sx={{
              color: '#71717A',
              fontSize: '0.875rem',
              mt: 0.5,
            }}
          >
            {t(subtitle)}
          </Typography>
        </Box>
        <Box
          sx={{
            color: '#9CA3AF',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 0.5,
            flexShrink: 0,
          }}
        >
          <svg width="18" height="4" viewBox="0 0 18 4" fill="none">
            <path d="M4 2C4 3.10457 3.10457 4 2 4C0.89543 4 0 3.10457 0 2C0 0.89543 0.89543 0 2 0C3.10457 0 4 0.89543 4 2Z" fill="currentColor" />
            <path d="M11 2C11 3.10457 10.1046 4 9 4C7.89543 4 7 3.10457 7 2C7 0.89543 7.89543 0 9 0C10.1046 0 11 0.89543 11 2Z" fill="currentColor" />
            <path d="M18 2C18 3.10457 17.1046 4 16 4C14.8954 4 14 3.10457 14 2C14 0.89543 14.8954 0 16 0C17.1046 0 18 0.89543 18 2Z" fill="currentColor" />
          </svg>
        </Box>
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
              stroke="#3758F9"
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
                fontSize: '1.5rem',
                fontWeight: 600,
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
              }}
            >
              {targetValue}
            </Typography>
            <Typography
              sx={{
                color: '#71717A',
                fontSize: '0.75rem',
                fontWeight: 500,
                mt: 0.25,
              }}
            >
              {t(targetLabel)}
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
        {subMetrics.map((item, idx) => (
          <Box key={item.label}>
            <Typography
              sx={{
                color: '#71717A',
                fontSize: '0.875rem',
                mb: 1,
              }}
            >
              {t(item.label)}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
              <Typography
                sx={{
                  color: 'text.primary',
                  fontSize: '1rem',
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {t(item.value)}
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
                      bgcolor: idx === 0 ? '#3758F9' : '#06B6D4',
                      borderRadius: '9999px',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </Box>
                <Typography
                  sx={{
                    color: '#71717A',
                    fontSize: '0.75rem',
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
