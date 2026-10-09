import React, { useState } from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import MoreHorizRounded from '@mui/icons-material/MoreHorizRounded';

export interface LyticPerformanceChartProps {
  headerLabel: string;
  headlineValue: string;
  trendBadge: string;
  series1Name: string;
  series1Color: string;
  series1Data: number[];
  series2Name: string;
  series2Color: string;
  series2Data: number[];
  months: string[];
  yTicks: string[];
  maxVal?: number;
}

export const LyticPerformanceChart: React.FC<LyticPerformanceChartProps> = ({
  headerLabel,
  headlineValue,
  trendBadge,
  series1Name,
  series1Color = '#3758F9',
  series1Data,
  series2Name,
  series2Color = '#F97316',
  series2Data,
  months,
  yTicks,
  maxVal = 100000,
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // SVG Chart Dimensions
  const svgWidth = 720;
  const svgHeight = 280;
  const paddingLeft = 55;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  const getX = (index: number) => paddingLeft + (index / (months.length - 1)) * chartWidth;
  const getY = (val: number) => paddingTop + chartHeight - (val / maxVal) * chartHeight;

  // Build SVG Paths
  const buildSmoothPath = (data: number[]) => {
    if (!data.length) return '';
    return data.map((val, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx).toFixed(1)} ${getY(val).toFixed(1)}`).join(' ');
  };

  const buildAreaPath = (data: number[]) => {
    if (!data.length) return '';
    const linePath = buildSmoothPath(data);
    const lastX = getX(data.length - 1).toFixed(1);
    const bottomY = (paddingTop + chartHeight).toFixed(1);
    const firstX = getX(0).toFixed(1);
    return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  };

  const series1Path = buildSmoothPath(series1Data);
  const series1Area = buildAreaPath(series1Data);
  const series2Path = buildSmoothPath(series2Data);
  const series2Area = buildAreaPath(series2Data);

  return (
    <Box
      sx={{
        backgroundColor: 'var(--lytic-bg-card, #ffffff)',
        border: '1px solid var(--lytic-border, #e5e7eb)',
        borderRadius: '12px',
        p: { xs: 2, sm: 2.5 },
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--lytic-border-light, #f3f4f6)',
          pb: 2,
          mb: 2,
        }}
      >
        <Box>
          <Typography
            sx={{
              color: 'var(--lytic-text, #6b7280)',
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              mb: 0.5,
            }}
          >
            {headerLabel}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Typography
              component="span"
              sx={{
                color: 'var(--lytic-title, #1f2937)',
                fontSize: { xs: '22px', sm: '24px' },
                fontWeight: 700,
                letterSpacing: '-0.02em',
                lineHeight: 1,
              }}
            >
              {headlineValue}
            </Typography>
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
                bgcolor: 'var(--lytic-success-bg, #dcfce7)',
                color: 'var(--lytic-success-text, #16a34a)',
              }}
            >
              {trendBadge}
            </Box>
          </Box>
        </Box>

        <IconButton
          size="small"
          aria-label="Revenue performance options"
          sx={{
            color: 'var(--lytic-text, #6b7280)',
            p: 0.75,
            '&:hover': { bgcolor: 'var(--lytic-border-light, #f3f4f6)' },
          }}
        >
          <MoreHorizRounded fontSize="small" />
        </IconButton>
      </Box>

      {/* SVG Responsive Chart */}
      <Box sx={{ width: '100%', position: 'relative', flexGrow: 1, minHeight: 260 }}>
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          preserveAspectRatio="none"
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
        >
          <defs>
            <linearGradient id="lyticBlueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={series1Color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={series1Color} stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="lyticOrangeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={series2Color} stopOpacity="0.30" />
              <stop offset="100%" stopColor={series2Color} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Dotted Horizontal Grid Lines & Y-Axis Labels */}
          {yTicks.map((tick, i) => {
            const y = paddingTop + (i / (yTicks.length - 1)) * chartHeight;
            return (
              <g key={tick}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - paddingRight}
                  y2={y}
                  stroke="var(--lytic-border, #e5e7eb)"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft - 10}
                  y={y + 4}
                  textAnchor="end"
                  fill="var(--lytic-text, #6b7280)"
                  fontSize="12"
                  fontFamily="var(--lytic-font)"
                  fontWeight="400"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Area Fills */}
          <path d={series1Area} fill="url(#lyticBlueGradient)" />
          <path d={series2Area} fill="url(#lyticOrangeGradient)" />

          {/* Line Strokes */}
          <path
            d={series1Path}
            fill="none"
            stroke={series1Color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={series2Path}
            fill="none"
            stroke={series2Color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Active Hover Crosshair & Dots */}
          {hoverIndex !== null && (
            <g>
              <line
                x1={getX(hoverIndex)}
                y1={paddingTop}
                x2={getX(hoverIndex)}
                y2={paddingTop + chartHeight}
                stroke="#9ca3af"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <circle
                cx={getX(hoverIndex)}
                cy={getY(series1Data[hoverIndex] ?? 0)}
                r="4.5"
                fill={series1Color}
                stroke="#ffffff"
                strokeWidth="2"
              />
              <circle
                cx={getX(hoverIndex)}
                cy={getY(series2Data[hoverIndex] ?? 0)}
                r="4.5"
                fill={series2Color}
                stroke="#ffffff"
                strokeWidth="2"
              />
            </g>
          )}

          {/* X-Axis Month Labels */}
          {months.map((m, idx) => {
            const x = getX(idx);
            return (
              <text
                key={m}
                x={x}
                y={svgHeight - 12}
                textAnchor="middle"
                fill="var(--lytic-text, #6b7280)"
                fontSize="12"
                fontFamily="var(--lytic-font)"
                fontWeight="400"
              >
                {m}
              </text>
            );
          })}

          {/* Transparent Hover Hit Areas */}
          {months.map((_, idx) => {
            const x = getX(idx) - (chartWidth / (months.length - 1)) / 2;
            const width = chartWidth / (months.length - 1);
            return (
              <rect
                key={idx}
                x={x}
                y={paddingTop}
                width={width}
                height={chartHeight}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoverIndex(idx)}
                onMouseLeave={() => setHoverIndex(null)}
              />
            );
          })}
        </svg>

        {/* Floating Tooltip */}
        {hoverIndex !== null && (
          <Box
            sx={{
              position: 'absolute',
              top: 10,
              right: 15,
              bgcolor: 'var(--lytic-title, #1f2937)',
              color: '#ffffff',
              borderRadius: '8px',
              p: 1.25,
              fontSize: '11px',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.2)',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          >
            <Typography sx={{ fontWeight: 600, fontSize: '11px', mb: 0.5 }}>
              {months[hoverIndex]} Performance
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: series1Color }} />
              <span>{series1Name}: {series1Data[hoverIndex]?.toLocaleString()}</span>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: series2Color }} />
              <span>{series2Name}: {series2Data[hoverIndex]?.toLocaleString()}</span>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};
