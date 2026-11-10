import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useLocale } from '@/shared/i18n/LocaleProvider';

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
  series1Data,
  series2Name,
  series2Data,
  months,
  yTicks,
  maxVal = 100000,
}) => {
  const { formatNumber, t } = useLocale();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const theme = useTheme();

  // SVG Chart Dimensions
  const svgWidth = 720;
  const svgHeight = 280;
  const paddingLeft = 55;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  const divisor = Math.max(months.length - 1, 1);
  const getX = (index: number) => paddingLeft + (index / divisor) * chartWidth;
  const getY = (val: number) => paddingTop + chartHeight - (val / (maxVal || 1)) * chartHeight;

  // Build smooth cubic bezier spline SVG path matching NextAdmin ApexCharts smooth area curve
  const buildSmoothPath = (data: number[]) => {
    if (!data.length) return '';
    const points = data.map((val, idx) => ({ x: getX(idx), y: getY(val) }));
    if (points.length === 1) {
      return `M ${points[0]!.x.toFixed(1)} ${points[0]!.y.toFixed(1)}`;
    }
    let d = `M ${points[0]!.x.toFixed(1)} ${points[0]!.y.toFixed(1)}`;
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i]!;
      const next = points[i + 1]!;
      const cpx1 = (curr.x + (next.x - curr.x) * 0.45).toFixed(1);
      const cpy1 = curr.y.toFixed(1);
      const cpx2 = (next.x - (next.x - curr.x) * 0.45).toFixed(1);
      const cpy2 = next.y.toFixed(1);
      d += ` C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${next.x.toFixed(1)} ${next.y.toFixed(1)}`;
    }
    return d;
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

  const series2Total = series2Data.reduce((acc, v) => acc + v, 0);
  const secondaryHeadline = formatNumber(Math.round(series2Total * 10) / 10);

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
      {/* Top Header Row */}
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          gap: 3,
        }}
      >
        {/* Left: Two side-by-side KPI callout blocks */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 2, sm: 4 },
          }}
        >
          {/* Block 1 */}
          <Box>
            <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '2px',
                  bgcolor: '#3758F9',
                  flexShrink: 0,
                }}
              />
              <Typography
                sx={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: 'text.secondary',
                }}
              >
                {t(series1Name)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Typography
                component="span"
                sx={{
                  fontSize: { xs: '1.25rem', md: '1.5rem' },
                  fontWeight: 600,
                  color: 'text.primary',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {t(headlineValue)}
              </Typography>
              <Box
                component="span"
                sx={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#16A34A',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                }}
              >
                <span>{t(trendBadge)}</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M8 13.3332L8 2.6665M4 6.6665L8 2.6665L12 6.6665"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Box>
              <Typography
                component="span"
                sx={{
                  fontSize: '0.875rem',
                  color: 'text.secondary',
                }}
              >
                {t(headerLabel)}
              </Typography>
            </Box>
          </Box>

          {/* Block 2 */}
          <Box>
            <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '2px',
                  bgcolor: '#06B6D4',
                  flexShrink: 0,
                }}
              />
              <Typography
                sx={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: 'text.secondary',
                }}
              >
                {t(series2Name)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography
                component="span"
                sx={{
                  fontSize: { xs: '1.25rem', md: '1.5rem' },
                  fontWeight: 600,
                  color: 'text.primary',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {secondaryHeadline}
              </Typography>
              <Box
                component="span"
                sx={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#16A34A',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                }}
              >
                <span>+8.2%</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M8 13.3332L8 2.6665M4 6.6665L8 2.6665L12 6.6665"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Right: NextAdmin "Monthly ⌄" selector pill */}
        <Box
          sx={{
            height: 34,
            px: 1.5,
            borderRadius: '8px',
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 1,
            fontSize: '0.875rem',
            fontWeight: 500,
            color: 'text.primary',
            boxShadow: '0 1px 2px 0 rgba(16,24,40,0.05)',
            flexShrink: 0,
            userSelect: 'none',
          }}
        >
          <span>{t('Monthly')}</span>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M4 6L8 10L12 6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Box>
      </Box>

      {/* SVG Responsive Chart */}
      <Box sx={{ width: '100%', position: 'relative', flexGrow: 1, minHeight: 260 }}>
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          preserveAspectRatio="none"
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
        >
          <defs>
            <linearGradient id="nextadminAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3758F9" stopOpacity="0.2" />
              <stop offset="95%" stopColor="#3758F9" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Horizontal Dashed Gridlines & Y-Axis Labels */}
          {yTicks.map((tick, i) => {
            const y = paddingTop + chartHeight - (i / Math.max(yTicks.length - 1, 1)) * chartHeight;
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
                  x={paddingLeft - 10}
                  y={y + 4}
                  textAnchor="end"
                  fill="#71717A"
                  fontSize="12"
                  fontFamily="Inter, sans-serif"
                  fontWeight="400"
                >
                  {t(tick)}
                </text>
              </g>
            );
          })}

          {/* Area Fill for Series 1 */}
          <path d={series1Area} fill="url(#nextadminAreaGrad)" />

          {/* Smooth Spline Strokes */}
          <path
            d={series1Path}
            fill="none"
            stroke="#3758F9"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={series2Path}
            fill="none"
            stroke="#06B6D4"
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
                stroke="#71717A"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <circle
                cx={getX(hoverIndex)}
                cy={getY(series1Data[hoverIndex] ?? 0)}
                r="4.5"
                fill="#3758F9"
                stroke={theme.palette.background.paper}
                strokeWidth="2"
              />
              <circle
                cx={getX(hoverIndex)}
                cy={getY(series2Data[hoverIndex] ?? 0)}
                r="4.5"
                fill="#06B6D4"
                stroke={theme.palette.background.paper}
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
                fill="#71717A"
                fontSize="12"
                fontFamily="Inter, sans-serif"
                fontWeight="400"
              >
                {t(m)}
              </text>
            );
          })}

          {/* Transparent Hover Hit Areas */}
          {months.map((_, idx) => {
            const x = getX(idx) - (chartWidth / divisor) / 2;
            const width = chartWidth / divisor;
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
              {t(months[hoverIndex] ?? '')} {t('Performance')}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: '#3758F9' }} />
              <span>{t(series1Name)}: {(series1Data[hoverIndex] == null ? undefined : formatNumber(series1Data[hoverIndex]))}</span>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: '#06B6D4' }} />
              <span>{t(series2Name)}: {(series2Data[hoverIndex] == null ? undefined : formatNumber(series2Data[hoverIndex]))}</span>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};
