import { useMemo } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import ListAltOutlined from '@mui/icons-material/ListAltOutlined';
import { useInspections } from '@/features/inspections/hooks/useInspections';
import { resolveInspectorFinanceBreakdown } from '@/features/inspections/utils/inspectorFinance';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { MetricCard } from '@/shared/ui/MetricCard';
import {
  InspectorMonthlyRevenueChart,
  type MonthRevenueData,
} from '../components/InspectorMonthlyRevenueChart';
import type { InspectionListItem } from '@/features/inspections/api/inspectionApi';
import { useAuthStore } from '@/features/auth/store/authStore';
import { inspectorProfileApi } from '@/features/admin/api/inspectorProfileApi';
import { mf1DroneApi } from '@/features/assets/api/mf1DroneApi';
import FlightRounded from '@mui/icons-material/FlightRounded';

/**
 * Partner Drone Inspector Dashboard (`/operations/dashboard`).
 *
 * Replaces redundant flight mission table with real monthly personal revenue chart & settlement breakdown.
 * 1. 3 Essential Real KPIs (Assigned Missions, Completed Reports, Net Earnings)
 * 2. Interactive Monthly Personal Revenue & Net Payout Chart (12 Months)
 * 3. Monthly Financial Settlement Table (Month, Missions, Gross, Commission, Net, Disbursement status)
 */
export function InspectorDashboardPage() {
  const { formatNumber, t } = useLocale();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const profileQuery = useQuery({
    queryKey: ['inspector-profile', user?.id],
    queryFn: () => (user?.id ? inspectorProfileApi.get(user.id) : null),
    enabled: Boolean(user?.id),
  });
  const myProfile = profileQuery.data;

  const dronesQuery = useQuery({
    queryKey: ['inspector-active-drones'],
    queryFn: mf1DroneApi.drones,
    enabled: Boolean(user?.id),
  });
  const myDrones = dronesQuery.data ?? [];
  const droneCount = myDrones.length;

  const inspectionsQuery = useInspections({ page: 1, pageSize: 50 }, true);
  const items = useInspectionsQueryItems(inspectionsQuery.data?.items);

  // Compute live real metrics
  const totalAssigned = items.length;
  const inProgressMissions = items.filter(
    (i) => i.status === 'IN_PROGRESS' || i.status === 'FIELD_COMPLETED' || i.status === 'SCHEDULED',
  ).length;
  const publishedReports = items.filter((i) => i.reportStatus === 'PUBLISHED').length;

  // Monthly revenue aggregation
  const { monthlyData, totalGross, totalNet, totalCommission, totalDisbursed, activeMonths } =
    useMemo(() => {
      const months: MonthRevenueData[] = Array.from({ length: 12 }, (_, i) => {
        const monthNum = i + 1;
        return {
          month: monthNum,
          label: `Thg ${monthNum}`,
          fullLabel: `${t('Month')} ${monthNum} / 2026`,
          missionCount: 0,
          grossAmount: 0,
          commissionAmount: 0,
          netPayoutAmount: 0,
          disbursedAmount: 0,
        };
      });

      let grossSum = 0;
      let commissionSum = 0;
      let netSum = 0;
      let disbursedSum = 0;

      for (const item of items) {
        const fin = resolveInspectorFinanceBreakdown(item.id, item);
        if (!fin) continue;

        grossSum += fin.totalPrice;
        commissionSum += fin.commissionAmount;
        netSum += fin.netPayoutAmount;
        if (fin.isDisbursed) {
          disbursedSum += fin.netPayoutAmount;
        }

        const date = item.plannedStartAt ? new Date(item.plannedStartAt) : new Date();
        const monthIdx = date.getMonth();
        const targetMonth = monthIdx >= 0 && monthIdx < 12 ? months[monthIdx] : undefined;
        if (targetMonth) {
          targetMonth.missionCount += 1;
          targetMonth.grossAmount += fin.totalPrice;
          targetMonth.commissionAmount += fin.commissionAmount;
          targetMonth.netPayoutAmount += fin.netPayoutAmount;
          if (fin.isDisbursed) {
            targetMonth.disbursedAmount += fin.netPayoutAmount;
          }
        }
      }

      // Filter active months sorted descending (most recent first)
      const active = months
        .filter((m) => m.grossAmount > 0)
        .sort((a, b) => b.month - a.month);

      return {
        monthlyData: months,
        totalGross: grossSum,
        totalNet: netSum,
        totalCommission: commissionSum,
        totalDisbursed: disbursedSum,
        activeMonths: active,
      };
    }, [items, t]);

  const disbursementPercent =
    totalNet > 0 ? Math.round((totalDisbursed / totalNet) * 100) : 100;

  return (
    <Box sx={{ width: '100%', maxWidth: 1400, mx: 'auto' }}>
      <Stack spacing={3}>
        {/* Header Bar */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
        >
          <Box>
            <Typography
              component="h1"
              sx={{
                fontSize: '1.5rem',
                fontWeight: 600,
                color: 'text.primary',
                letterSpacing: '-0.01em',
                lineHeight: '2rem',
              }}
            >
              {t('Inspector Dashboard')}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: '#71717A',
                fontSize: '0.875rem',
                fontWeight: 400,
                lineHeight: '1.25rem',
                mt: '4px',
              }}
            >
              {t('Personal monthly revenue, commission deductions, and flight mission overview.')}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<CalendarMonthOutlined sx={{ fontSize: 16 }} />}
              onClick={() => navigate('/operations/inspections?view=calendar')}
              sx={{
                height: 38,
                px: 1.75,
                borderRadius: '8px',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                color: 'text.primary',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
              }}
            >
              {t('Flight Schedule')}
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<ListAltOutlined sx={{ fontSize: 16 }} />}
              onClick={() => navigate('/operations/inspections')}
              sx={{
                height: 38,
                px: 1.75,
                borderRadius: '8px',
                bgcolor: '#3758F9',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                boxShadow: 'none',
                '&:hover': { bgcolor: '#4338CA', boxShadow: 'none' },
              }}
            >
              {t('All Inspections')}
            </Button>
          </Stack>
        </Stack>

        {/* License Expiry / Expiration Warning Banner */}
        {myProfile &&
          (myProfile.licenseExpirationStatus === 'EXPIRED' ||
            myProfile.licenseExpirationStatus === 'EXPIRING_SOON') && (
            <Alert
              severity={
                myProfile.licenseExpirationStatus === 'EXPIRED'
                  ? 'error'
                  : (myProfile.licenseRemainingDays ?? 99) <= 7
                    ? 'warning'
                    : 'info'
              }
              action={
                <Button
                  color="inherit"
                  size="small"
                  endIcon={<ArrowForwardRounded sx={{ fontSize: 15 }} />}
                  onClick={() => navigate('/operations/partner-onboarding')}
                  sx={{ textTransform: 'none', fontWeight: 700, whiteSpace: 'nowrap' }}
                >
                  {myProfile.licenseExpirationStatus === 'EXPIRED'
                    ? 'Cập nhật bằng lái ngay'
                    : 'Gia hạn / Cập nhật'}
                </Button>
              }
              sx={{ borderRadius: '10px', alignItems: 'center' }}
            >
              {myProfile.licenseExpirationStatus === 'EXPIRED'
                ? `Khẩn cấp: Giấy phép điều khiển UAV ${myProfile.pilotLicenseNumber || ''} của bạn đã hết hạn${
                    myProfile.pilotLicenseExpiresAt
                      ? ` (${new Date(myProfile.pilotLicenseExpiresAt).toLocaleDateString('vi-VN')})`
                      : ''
                  }. Tài khoản tạm thời bị khóa quyền nhận lịch bay và bắt đầu chuyến bay mới cho đến khi cập nhật bằng gia hạn.`
                : `Cảnh báo: Giấy phép điều khiển UAV ${myProfile.pilotLicenseNumber || ''} của bạn sẽ hết hạn sau ${
                    myProfile.licenseRemainingDays ?? 0
                  } ngày${
                    myProfile.pilotLicenseExpiresAt
                      ? ` (ngày ${new Date(myProfile.pilotLicenseExpiresAt).toLocaleDateString('vi-VN')})`
                      : ''
                  }. Vui lòng gia hạn và tải lên bản scan mới để tránh gián đoạn lịch bay.`}
            </Alert>
          )}

        {/* Minimal 1-line notice ONLY when onboarding is not yet approved */}
        {myProfile && myProfile.onboardingStatus !== 'APPROVED' && (
          <Alert
            severity={myProfile.onboardingStatus === 'REJECTED' ? 'error' : 'warning'}
            action={
              <Button
                color="inherit"
                size="small"
                endIcon={<ArrowForwardRounded sx={{ fontSize: 15 }} />}
                onClick={() => navigate('/operations/partner-onboarding')}
                sx={{ textTransform: 'none', fontWeight: 700, whiteSpace: 'nowrap' }}
              >
                Hoàn tất hồ sơ
              </Button>
            }
            sx={{ borderRadius: '10px', alignItems: 'center' }}
          >
            {myProfile.onboardingStatus === 'REJECTED'
              ? `Hồ sơ cần bổ sung: ${myProfile.rejectionReason || 'Vui lòng kiểm tra lại bằng lái và hợp đồng.'}`
              : 'Tài khoản đang chờ hoàn tất Bằng lái & Hợp đồng đối tác để bắt đầu nhận nhiệm vụ bay.'}
          </Alert>
        )}

        {/* Notice when Inspector has no active drones registered */}
        {!dronesQuery.isLoading && droneCount === 0 && (
          <Alert
            severity="info"
            icon={<FlightRounded fontSize="inherit" />}
            action={
              <Button
                color="inherit"
                size="small"
                endIcon={<ArrowForwardRounded sx={{ fontSize: 15 }} />}
                onClick={() => navigate('/operations/inspector-drones')}
                sx={{ textTransform: 'none', fontWeight: 700, whiteSpace: 'nowrap' }}
              >
                Đăng ký Drone ngay
              </Button>
            }
            sx={{ borderRadius: '10px', alignItems: 'center' }}
          >
            Đội bay của bạn chưa có Drone nào. Hãy đăng ký thiết bị Drone (kèm 3 giấy tờ pháp lý) để sẵn sàng được phân công nhiệm vụ bay kiểm tra.
          </Alert>
        )}

        {/* 3 Focused Real Metric Cards */}
        <Box
          role="region"
          aria-label={t('Inspector summary metrics')}
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(3, 1fr)',
            },
            gap: 2.5,
          }}
        >
          <MetricCard
            label={t('Assigned missions')}
            value={String(totalAssigned)}
            change={
              inProgressMissions > 0
                ? `${inProgressMissions} ${t('in progress')}`
                : t('All up to date')
            }
            positive={inProgressMissions === 0}
            subtext={t('drone field surveys')}
            iconType="plane"
          />

          <MetricCard
            label={t('Official reports')}
            value={`${publishedReports} / ${totalAssigned}`}
            change={
              publishedReports === totalAssigned
                ? t('All completed')
                : `${totalAssigned - publishedReports} ${t('in review/progress')}`
            }
            positive={true}
            subtext={t('verified deliverables')}
            iconType="shield"
          />

          <MetricCard
            label={t('Net payout earnings')}
            value={`${formatNumber(totalNet)} ₫`}
            change={`${disbursementPercent}% ${t('disbursed')}`}
            positive={true}
            subtext={t('after 15% platform commission')}
            iconType="wallet"
          />
        </Box>

        {/* Monthly Personal Revenue & Net Payout Chart */}
        <InspectorMonthlyRevenueChart
          monthlyData={monthlyData}
          totalGross={totalGross}
          totalNet={totalNet}
          totalCommission={totalCommission}
          totalDisbursed={totalDisbursed}
        />

        {/* Monthly Financial Settlement Table */}
        <Paper
          variant="outlined"
          sx={{
            borderRadius: '12px',
            border: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden',
            bgcolor: 'background.paper',
            boxShadow: 'none',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 2.5,
              py: 2,
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box>
              <Typography
                component="h2"
                sx={{ fontSize: '1rem', fontWeight: 600, color: 'text.primary' }}
              >
                {t('Monthly Settlement Breakdown')}
              </Typography>
              <Typography variant="caption" sx={{ color: '#71717A', fontSize: '0.875rem' }}>
                {t('Consolidated monthly orders, platform commission, and disbursement records')}
              </Typography>
            </Box>
            <Button
              size="small"
              variant="text"
              endIcon={<ArrowForwardRounded sx={{ fontSize: 14 }} />}
              onClick={() => navigate('/operations/inspections')}
              sx={{ color: '#3758F9', textTransform: 'none', fontWeight: 600, fontSize: '0.875rem' }}
            >
              {t('View inspection orders')}
            </Button>
          </Box>

          <TableContainer>
            <Table aria-label={t('Monthly settlement table')}>
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      bgcolor: 'rgba(244, 244, 245, 0.5)',
                      color: '#71717A',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      py: 1.5,
                      px: 2.5,
                      textTransform: 'uppercase',
                    }}
                  >
                    {t('Billing Period')}
                  </TableCell>
                  <TableCell
                    sx={{
                      bgcolor: 'rgba(244, 244, 245, 0.5)',
                      color: '#71717A',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      py: 1.5,
                      px: 2,
                      width: 120,
                      textTransform: 'uppercase',
                    }}
                  >
                    {t('Missions')}
                  </TableCell>
                  <TableCell
                    sx={{
                      bgcolor: 'rgba(244, 244, 245, 0.5)',
                      color: '#71717A',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      py: 1.5,
                      px: 2,
                      width: 150,
                      textTransform: 'uppercase',
                    }}
                  >
                    {t('Order Value')}
                  </TableCell>
                  <TableCell
                    sx={{
                      bgcolor: 'rgba(244, 244, 245, 0.5)',
                      color: '#71717A',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      py: 1.5,
                      px: 2,
                      width: 150,
                      textTransform: 'uppercase',
                    }}
                  >
                    {t('Commission (15%)')}
                  </TableCell>
                  <TableCell
                    sx={{
                      bgcolor: 'rgba(244, 244, 245, 0.5)',
                      color: '#71717A',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      py: 1.5,
                      px: 2,
                      width: 160,
                      textTransform: 'uppercase',
                    }}
                  >
                    {t('Net Payout')}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      bgcolor: 'rgba(244, 244, 245, 0.5)',
                      color: '#71717A',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      py: 1.5,
                      px: 2.5,
                      width: 160,
                      textTransform: 'uppercase',
                    }}
                  >
                    {t('Disbursement')}
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {activeMonths.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Typography
                        color="text.secondary"
                        sx={{ py: 6, textAlign: 'center', fontSize: '0.875rem' }}
                      >
                        {t('No completed mission billing records yet.')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  activeMonths.map((m) => (
                    <TableRow
                      key={m.month}
                      hover
                      onClick={() => navigate('/operations/inspections')}
                      tabIndex={0}
                      sx={{
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                    >
                      {/* Col 1: Month */}
                      <TableCell sx={{ py: 1.75, px: 2.5 }}>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 650, color: 'text.primary', fontSize: '0.875rem' }}
                        >
                          {m.fullLabel}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {t('Settled occurrence cycle')}
                        </Typography>
                      </TableCell>

                      {/* Col 2: Missions */}
                      <TableCell sx={{ py: 1.75, px: 2 }}>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 600, color: 'text.primary', fontVariantNumeric: 'tabular-nums' }}
                        >
                          {m.missionCount} {t('missions')}
                        </Typography>
                      </TableCell>

                      {/* Col 3: Order Value */}
                      <TableCell sx={{ py: 1.75, px: 2 }}>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 600, color: 'text.primary', fontVariantNumeric: 'tabular-nums' }}
                        >
                          {formatNumber(m.grossAmount)} ₫
                        </Typography>
                      </TableCell>

                      {/* Col 4: Commission */}
                      <TableCell sx={{ py: 1.75, px: 2 }}>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 600, color: '#8C520B', fontVariantNumeric: 'tabular-nums' }}
                        >
                          - {formatNumber(m.commissionAmount)} ₫
                        </Typography>
                      </TableCell>

                      {/* Col 5: Net Payout */}
                      <TableCell sx={{ py: 1.75, px: 2 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 700,
                            color: '#176B52',
                            fontSize: '0.875rem',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {formatNumber(m.netPayoutAmount)} ₫
                        </Typography>
                      </TableCell>

                      {/* Col 6: Disbursement Status & Arrow */}
                      <TableCell align="right" sx={{ py: 1.75, px: 2.5 }}>
                        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', alignItems: 'center' }}>
                          <Chip
                            size="small"
                            icon={<CheckCircleRounded sx={{ fontSize: '14px !important', color: '#176B52' }} />}
                            label={t('Disbursed (100%)')}
                            sx={{
                              height: 22,
                              borderRadius: '5px',
                              fontSize: '0.75rem',
                              fontWeight: 650,
                              bgcolor: 'rgba(23, 107, 82, 0.1)',
                              color: '#176B52',
                            }}
                          />
                          <ArrowForwardRounded sx={{ fontSize: 16, color: 'text.secondary' }} />
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Stack>
    </Box>
  );
}

function useInspectionsQueryItems(items?: InspectionListItem[]): InspectionListItem[] {
  return useMemo(() => items ?? [], [items]);
}
