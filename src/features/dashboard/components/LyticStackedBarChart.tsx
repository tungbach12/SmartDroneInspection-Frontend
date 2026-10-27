import React, { useState } from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import MoreHorizRounded from '@mui/icons-material/MoreHorizRounded';
import { useTheme } from '@mui/material/styles';
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
  const theme = useTheme();

  const svgWidth = 520;
  const svgHeight = 260;
  const paddingLeft = 40;
  const paddingRight = 15;
  const paddingTop = 15;
  const paddingBottom = 35;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  const yTicks = [120, 100, 80, 60, 40, 20, 0];
  const barWidth = Math.min(24, (chartWidth / categories.length) * 0.45);

  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: '16px',
        p: { xs: 2, sm: 2.5 },
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
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
            fontSize: '18px',
            fontWeight: 600,
          }}
        >
          {t(title)}
        </Typography>

        <IconButton
          size="small"
          aria-label={t('Acquisition channels options')}
          sx={{
            color: 'text.secondary',
            p: 0.75,
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <MoreHorizRounded fontSize="small" />
        </IconButton>
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
        {channels.map((ch) => (
          <Box key={ch.name} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: ch.color }} />
            <Typography sx={{ color: 'text.secondary', fontSize: '12px' }}>
              {t(ch.name)}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Chart SVG */}
      <Box sx={{ width: '100%', position: 'relative', flexGrow: 1, minHeight: 220 }}>
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          preserveAspectRatio="none"
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
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
                  stroke={theme.palette.divider}
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  fill={theme.palette.text.secondary}
                  fontSize="12"
                  fontFamily={theme.typography.fontFamily}
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
                  const segmentHeight = (val / maxStack) * chartHeight;
                  const y = paddingTop + chartHeight - (runningSum / maxStack) * chartHeight;
                  const isTop = chIdx === channels.length - 1;

                  return (
                    <rect
                      key={ch.name}
                      x={x}
                      y={y}
                      width={barWidth}
                      height={Math.max(0, segmentHeight)}
                      fill={ch.color}
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
                  fill={theme.palette.text.secondary}
                  fontSize="12"
                  fontFamily={theme.typography.fontFamily}
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
              fontSize: '11px',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.2)',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          >
            <Typography sx={{ fontWeight: 600, fontSize: '11px', mb: 0.5 }}>
              {categories[hoverIdx]}
            </Typography>
            {channels.map((ch) => (
              <Box key={ch.name} sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: ch.color }} />
                <span>{ch.name}: {ch.data[hoverIdx]}</span>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
};
