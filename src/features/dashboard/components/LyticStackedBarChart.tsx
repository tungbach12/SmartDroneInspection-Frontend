import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { useLocale } from '@/shared/i18n/LocaleProvider';

export interface LyticStackedBarChartProps {
  title: string;
  categories: string[];
  channels: Array<{
    name: string;
    color: string;
    data: number[];
  }>;
  maxStack?: number;
}

export const LyticStackedBarChart: React.FC<LyticStackedBarChartProps> = ({
  title,
  categories,
  channels,
  maxStack = 120,
}) => {
  const { t } = useLocale();
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const svgWidth = 520;
  const svgHeight = 260;
  const paddingLeft = 40;
  const paddingRight = 15;
  const paddingTop = 15;
  const paddingBottom = 35;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  const dataMax = Math.max(
    ...categories.map((_, catIdx) =>
      channels.reduce((sum, ch) => sum + (ch.data[catIdx] ?? 0), 0)
    ),
    1
  );
  const effectiveMax = Math.max(maxStack > 0 ? maxStack : 5, dataMax, 4);

  const yTicks = [
    effectiveMax,
    Math.round((effectiveMax * 3) / 4),
    Math.round((effectiveMax * 2) / 4),
    Math.round((effectiveMax * 1) / 4),
    0,
  ];
  const barWidth = Math.min(24, (chartWidth / categories.length) * 0.45);

  const nextAdminColors = ['#3758F9', '#06B6D4', '#0EA5E9', '#93C5FD'] as const;

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
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography
          sx={{
            color: 'text.primary',
            fontSize: '1rem',
            fontWeight: 600,
          }}
        >
          {t(title)}
        </Typography>
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

      {/* Legend Row */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 2,
          mb: 2,
        }}
      >
        {channels.map((ch, idx) => (
          <Box key={ch.name} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '2px',
                bgcolor: nextAdminColors[idx % nextAdminColors.length] ?? ch.color,
              }}
            />
            <Typography sx={{ color: '#71717A', fontSize: '0.75rem', fontWeight: 500 }}>
              {t(ch.name)}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Chart SVG */}
      <Box sx={{ width: '100%', position: 'relative', flexGrow: 1, minHeight: 220, display: 'flex', alignItems: 'center' }}>
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ width: '100%', height: 'auto', maxHeight: 280, overflow: 'visible' }}
        >
          {/* Horizontal Gridlines & Y-Axis Labels */}
          {yTicks.map((tick, i) => {
            const y = paddingTop + (i / (yTicks.length - 1)) * chartHeight;
            return (
              <g key={tick}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - paddingRight}
                  y2={y}
                  stroke="#E5E7EB"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  fill="#71717A"
                  fontSize="12"
                  fontFamily="Inter, sans-serif"
                  fontWeight="400"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Stacked Bars */}
          {categories.map((cat, catIdx) => {
            const groupX = paddingLeft + (catIdx + 0.5) * (chartWidth / categories.length);
            const x = groupX - barWidth / 2;

            let runningSum = 0;
            return (
              <g key={cat}>
                {channels.map((ch, chIdx) => {
                  const val = ch.data[catIdx] ?? 0;
                  runningSum += val;
                  const segmentHeight = (val / effectiveMax) * chartHeight;
                  const y = paddingTop + chartHeight - (runningSum / effectiveMax) * chartHeight;
                  const isTop = chIdx === channels.length - 1;
                  const segColor = nextAdminColors[chIdx % nextAdminColors.length] ?? ch.color;

                  return (
                    <rect
                      key={ch.name}
                      x={x}
                      y={y}
                      width={barWidth}
                      height={Math.max(0, segmentHeight)}
                      fill={segColor}
                      rx={isTop ? 4 : 0}
                      ry={isTop ? 4 : 0}
                    />
                  );
                })}

                {/* X-Axis Category Label */}
                <text
                  x={groupX}
                  y={svgHeight - 10}
                  textAnchor="middle"
                  fill="#71717A"
                  fontSize="12"
                  fontFamily="Inter, sans-serif"
                  fontWeight="400"
                >
                  {t(cat)}
                </text>

                {/* Hover Hit Box */}
                <rect
                  x={groupX - chartWidth / categories.length / 2}
                  y={paddingTop}
                  width={chartWidth / categories.length}
                  height={chartHeight}
                  fill="transparent"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoverIdx(catIdx)}
                  onMouseLeave={() => setHoverIdx(null)}
                />
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip */}
        {hoverIdx !== null && (
          <Box
            sx={{
              position: 'absolute',
              top: 5,
              right: 15,
              bgcolor: 'text.primary',
              color: 'background.paper',
              borderRadius: '8px',
              p: 1.25,
              fontSize: '0.75rem',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.2)',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          >
            <Typography sx={{ fontWeight: 600, fontSize: '0.75rem', mb: 0.5 }}>
              {categories[hoverIdx]}
            </Typography>
            {channels.map((ch, idx) => (
              <Box key={ch.name} sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '2px',
                    bgcolor: nextAdminColors[idx % nextAdminColors.length] ?? ch.color,
                  }}
                />
                <span>{ch.name}: {ch.data[hoverIdx]}</span>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
};
