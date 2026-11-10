import { useState } from 'react';
import {
  Box,
  Chip,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import TrendingUpRounded from '@mui/icons-material/TrendingUpRounded';
import { useLocale } from '@/shared/i18n/LocaleProvider';

export interface MonthRevenueData {
  month: number;
  label: string;
  fullLabel: string;
  missionCount: number;
  grossAmount: number;
  commissionAmount: number;
  netPayoutAmount: number;
  disbursedAmount: number;
}

interface InspectorMonthlyRevenueChartProps {
  monthlyData: MonthRevenueData[];
  totalGross: number;
  totalNet: number;
  totalCommission: number;
  totalDisbursed: number;
}

/**
 * Interactive Monthly Personal Revenue & Net Payout Chart for Partner Inspector.
 * Visualizes gross order value, platform commission deduction, and actual net payout per month.
 */
export function InspectorMonthlyRevenueChart({
  monthlyData,
  totalGross,
  totalNet,
  totalCommission,
  totalDisbursed,
}: InspectorMonthlyRevenueChartProps) {
  const { formatNumber, t } = useLocale();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // SVG Chart Dimensions
  const svgWidth = 760;
  const svgHeight = 280;
  const paddingLeft = 65;
  const paddingRight = 25;
  const paddingTop = 30;
  const paddingBottom = 40;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  // Maximum value for scale
  const maxNetMonth = Math.max(...monthlyData.map((m) => m.grossAmount), 0);
  const scaleMax = maxNetMonth > 0 ? Math.ceil(maxNetMonth / 5_000_000) * 5_000_000 + 2_000_000 : 15_000_000;

  const yTicks = [
    0,
    Math.round(scaleMax * 0.25),
    Math.round(scaleMax * 0.5),
    Math.round(scaleMax * 0.75),
    scaleMax,
  ];

  const getX = (index: number) => paddingLeft + (index + 0.5) * (chartWidth / monthlyData.length);
  const getY = (val: number) => paddingTop + chartHeight - (val / scaleMax) * chartHeight;

  const activeMonth = hoveredIndex !== null ? monthlyData[hoveredIndex] : null;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: '20px',
        borderRadius: '12px',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        boxShadow: 'none',
      }}
    >
      <Stack spacing={2}>
        {/* Header with Title & Legend */}
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          sx={{ justifyContent: 'space-between', alignItems: { md: 'center' } }}
        >
          <Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Typography
                component="h2"
                sx={{ fontSize: '1rem', fontWeight: 600, color: 'text.primary' }}
              >
                {t('Monthly Personal Revenue & Net Earnings')}
              </Typography>
              <Chip
                size="small"
                icon={<TrendingUpRounded sx={{ fontSize: '14px !important', color: '#15803D' }} />}
                label={t('Year 2026')}
                sx={{
                  height: 22,
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  bgcolor: '#F0FDF4',
                  color: '#15803D',
                }}
              />
            </Stack>
            <Typography variant="caption" sx={{ color: '#71717A', display: 'block', mt: 0.25, fontSize: '0.875rem' }}>
              {t('Track monthly order revenue, 15% platform commission deductions, and net payouts received.')}
            </Typography>
          </Box>

          {/* Legend */}
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: '#3758F9' }} />
              <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 500, fontSize: '0.75rem' }}>
                {t('Net payout')}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: '#A855F7' }} />
              <Typography variant="caption" sx={{ color: '#71717A', fontWeight: 500, fontSize: '0.75rem' }}>
                {t('Platform commission (15%)')}
              </Typography>
            </Stack>
          </Stack>
        </Stack>

        <Divider />

        {/* SVG Chart Container */}
        <Box sx={{ width: '100%', overflowX: 'auto', position: 'relative' }}>
          <Box sx={{ minWidth: 620, position: 'relative' }}>
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
            >
              <defs>
                <linearGradient id="netPayoutGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3758F9" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#3758F9" stopOpacity="0.85" />
                </linearGradient>
                <linearGradient id="commGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#A855F7" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#D8B4FE" stopOpacity="0.75" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid lines & Y labels */}
              {yTicks.map((tickVal) => {
                const y = getY(tickVal);
                return (
                  <g key={tickVal}>
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2={svgWidth - paddingRight}
                      y2={y}
                      stroke="#E5E7EB"
                      strokeDasharray={tickVal === 0 ? 'none' : '3 3'}
                    />
                    <text
                      x={paddingLeft - 8}
                      y={y + 4}
                      textAnchor="end"
                      fontSize="12"
                      fill="#71717A"
                      fontFamily="Inter, sans-serif"
                    >
                      {tickVal >= 1_000_000
                        ? `${(tickVal / 1_000_000).toFixed(0)}M`
                        : tickVal === 0
                          ? '0'
                          : formatNumber(tickVal)}
                    </text>
                  </g>
                );
              })}

              {/* Monthly Grouped / Stacked Bars */}
              {monthlyData.map((m, idx) => {
                const centerX = getX(idx);
                const barWidth = 24;
                const netH = (m.netPayoutAmount / scaleMax) * chartHeight;
                const commH = (m.commissionAmount / scaleMax) * chartHeight;
                const isHovered = hoveredIndex === idx;
                const hasData = m.grossAmount > 0;

                const netY = paddingTop + chartHeight - netH;
                const commY = netY - commH;

                return (
                  <g
                    key={m.month}
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    style={{ cursor: hasData ? 'pointer' : 'default' }}
                  >
                    {/* Hover Backdrop Column */}
                    {isHovered && (
                      <rect
                        x={centerX - barWidth - 4}
                        y={paddingTop}
                        width={barWidth * 2 + 8}
                        height={chartHeight}
                        fill="currentColor"
                        opacity="0.04"
                        rx="4"
                      />
                    )}

                    {/* Net Payout Bar */}
                    {hasData && (
                      <>
                        <rect
                          x={centerX - barWidth / 2}
                          y={netY}
                          width={barWidth}
                          height={Math.max(netH, 2)}
                          fill="url(#netPayoutGrad)"
                          rx="3"
                          style={{
                            transition: 'opacity 0.2s ease',
                            opacity: isHovered ? 1 : 0.88,
                          }}
                        />

                        {/* Commission Stacked Top Bar */}
                        <rect
                          x={centerX - barWidth / 2}
                          y={commY}
                          width={barWidth}
                          height={Math.max(commH, 2)}
                          fill="url(#commGrad)"
                          rx="3"
                          style={{
                            transition: 'opacity 0.2s ease',
                            opacity: isHovered ? 1 : 0.85,
                          }}
                        />

                        {/* Top Total Value Label */}
                        <text
                          x={centerX}
                          y={commY - 6}
                          textAnchor="middle"
                          fontSize="9.5"
                          fontWeight="600"
                          fill="#3758F9"
                          fontFamily="Inter, sans-serif"
                        >
                          {formatNumber(m.netPayoutAmount)} ₫
                        </text>
                      </>
                    )}

                    {/* Empty placeholder dot when 0 */}
                    {!hasData && (
                      <circle
                        cx={centerX}
                        cy={paddingTop + chartHeight}
                        r="2.5"
                        fill="currentColor"
                        opacity="0.15"
                      />
                    )}

                    {/* X Month Label */}
                    <text
                      x={centerX}
                      y={svgHeight - 14}
                      textAnchor="middle"
                      fontSize="12"
                      fontWeight={hasData ? 600 : 400}
                      fill={hasData ? '#18181B' : '#71717A'}
                      fontFamily="Inter, sans-serif"
                    >
                      {m.label}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip Overlay */}
            {activeMonth && activeMonth.grossAmount > 0 && (
              <Paper
                elevation={3}
                sx={{
                  position: 'absolute',
                  top: 10,
                  right: 20,
                  p: 1.5,
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  minWidth: 200,
                  pointerEvents: 'none',
                  zIndex: 2,
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  {activeMonth.fullLabel}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.75 }}>
                  {activeMonth.missionCount} {t('missions completed')}
                </Typography>
                <Divider sx={{ my: 0.5 }} />
                <Stack spacing={0.5}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {t('Order total')}:
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 650 }}>
                      {formatNumber(activeMonth.grossAmount)} ₫
                    </Typography>
                  </Stack>
                  <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                    <Typography variant="caption" sx={{ color: '#8C520B' }}>
                      {t('Commission (15%)')}:
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 650, color: '#8C520B' }}>
                      - {formatNumber(activeMonth.commissionAmount)} ₫
                    </Typography>
                  </Stack>
                  <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                    <Typography variant="caption" sx={{ color: '#176B52', fontWeight: 700 }}>
                      {t('Net payout')}:
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#176B52' }}>
                      {formatNumber(activeMonth.netPayoutAmount)} ₫
                    </Typography>
                  </Stack>
                </Stack>
              </Paper>
            )}
          </Box>
        </Box>

        {/* 3 Summary Items Below Chart (flat, non-nested) */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
            gap: 1.5,
            pt: 1.5,
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box
            sx={{
              p: 1.5,
              borderRadius: '8px',
              bgcolor: 'background.default',
            }}
          >
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              {t('Total Contract Order Value')}
            </Typography>
            <Typography
              sx={{
                fontSize: '1.125rem',
                fontWeight: 700,
                color: 'text.primary',
                mt: 0.25,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formatNumber(totalGross)} ₫
            </Typography>
          </Box>

          <Box
            sx={{
              p: 1.5,
              borderRadius: '8px',
              bgcolor: 'background.default',
            }}
          >
            <Typography variant="caption" sx={{ color: '#8C520B', fontWeight: 600 }}>
              {t('Platform Commission Retained (15%)')}
            </Typography>
            <Typography
              sx={{
                fontSize: '1.125rem',
                fontWeight: 700,
                color: '#8C520B',
                mt: 0.25,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              - {formatNumber(totalCommission)} ₫
            </Typography>
          </Box>

          <Box
            sx={{
              p: 1.5,
              borderRadius: '8px',
              bgcolor: 'rgba(23, 107, 82, 0.06)',
            }}
          >
            <Typography variant="caption" sx={{ color: '#176B52', fontWeight: 650 }}>
              {t('Total Net Earnings')} ({formatNumber(totalDisbursed)} ₫ {t('disbursed')})
            </Typography>
            <Typography
              sx={{
                fontSize: '1.125rem',
                fontWeight: 700,
                color: '#176B52',
                mt: 0.25,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formatNumber(totalNet)} ₫
            </Typography>
          </Box>
        </Box>
      </Stack>
    </Paper>
  );
}
