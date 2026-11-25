import { useMemo } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { useMyInspectorRatings } from '@/features/inspections/hooks/useInspectorRatings';
import { InspectorRatingsBreakdownPanel } from '@/features/inspections/components/InspectorRatingDialog';

/**
 * Partner Drone Inspector Dashboard (`/operations/dashboard`).
 *
 * Replaces redundant flight mission table with real monthly personal revenue chart & settlement breakdown.
 * 1. 3 Essential Real KPIs (Assigned Missions, Completed Reports, Net Earnings)
 * 2. Interactive Monthly Personal Revenue & Net Payout Chart (12 Months)
 * 3. Monthly Financial Settlement Table (Month, Missions, Gross, Commission, Net, Disbursement status)
 */
export function InspectorDashboardPage() {
  const { formatNumber, locale, t } = useLocale();
  const tr = (vi: string, en: string) => (locale === 'vi' ? vi : en);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'ratings' ? 'ratings' : 'overview';
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
  const myRatingsQuery = useMyInspectorRatings(0, 8, Boolean(user?.id));
  const myDrones = dronesQuery.data ?? [];
  const droneCount = myDrones.length;
  const activeDroneCount = myDrones.filter((d) => d.serviceability === 'ACTIVE').length;

  const inspectionsQuery = useInspections({ page: 1, pageSize: 50 }, true);
  const items = useInspectionsQueryItems(inspectionsQuery.data?.items);

  // Compute live real metrics
  const totalAssigned = items.length;
  const inProgressMissions = items.filter(
    (i) => i.status === 'IN_PROGRESS' || i.status === 'FIELD_COMPLETED' || i.status === 'SCHEDULED',
  ).length;
  const publishedReports = items.filter((i) => i.reportStatus === 'PUBLISHED').length;
  const upcomingMissions = useMemo(
    () =>
      items
        .filter((i) => i.status === 'SCHEDULED' || i.status === 'IN_PROGRESS')
        .sort((a, b) => {
          const ta = a.plannedStartAt ? new Date(a.plannedStartAt).getTime() : Number.MAX_SAFE_INTEGER;
          const tb = b.plannedStartAt ? new Date(b.plannedStartAt).getTime() : Number.MAX_SAFE_INTEGER;
          return ta - tb;
        })
        .slice(0, 4),
    [items],
  );

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
                bgcolor: '#2B84EB',
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

        <Tabs
          value={activeTab}
          onChange={(_, val: 'overview' | 'ratings') =>
            setSearchParams(val === 'ratings' ? { tab: 'ratings' } : {}, { replace: true })
          }
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab value="overview" label={t('Overview')} sx={{ textTransform: 'none', fontWeight: 650 }} />
          <Tab
            value="ratings"
            label={
              myRatingsQuery.data?.summary.ratingCount
                ? `${t('Ratings')} (${(myRatingsQuery.data.summary.averageRating ?? 0).toFixed(1)}★ · ${myRatingsQuery.data.summary.ratingCount})`
                : t('Ratings')
            }
            sx={{ textTransform: 'none', fontWeight: 650 }}
          />
        </Tabs>

        {activeTab === 'ratings' ? (
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: '10px', borderColor: 'divider' }}>
            {myRatingsQuery.data ? (
              <InspectorRatingsBreakdownPanel
                profile={myRatingsQuery.data}
                portalBase="/operations"
                onNavigate={(to) => navigate(to)}
              />
            ) : (
              <Typography variant="body2" color="text.secondary">
                {t('No ratings yet')}
              </Typography>
            )}
          </Paper>
        ) : (
          <>

        {/* License Expiry / Expiration Warning Banner */}
        {myProfile &&
          (myProfile.licenseExpirationStatus === 'EXPIRED' ||
            myProfile.licenseExpirationStatus === 'EXPIRING_SOON') && (() => {
            const isExpired = myProfile.licenseExpirationStatus === 'EXPIRED';
            const remainingDays = myProfile.licenseRemainingDays ?? 0;
            const expiryDateText = myProfile.pilotLicenseExpiresAt
              ? new Date(myProfile.pilotLicenseExpiresAt).toLocaleDateString('vi-VN')
              : null;
            const severity = isExpired ? 'error' : remainingDays <= 7 ? 'warning' : 'info';

            return (
              <Alert
                severity={severity}
                action={
                  <Button
                    color={severity}
                    variant="outlined"
                    size="small"
                    endIcon={<ArrowForwardRounded sx={{ fontSize: 15 }} />}
                    onClick={() => navigate('/operations/settings?tab=pilot-profile')}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 650,
                      whiteSpace: 'nowrap',
                      borderRadius: '8px',
                      px: 1.75,
                      py: 0.65,
                      bgcolor: 'background.paper',
                    }}
                  >
                    {isExpired ? 'Cập nhật bằng lái ngay' : 'Gia hạn / Cập nhật'}
                  </Button>
                }
                sx={{
                  borderRadius: '12px',
                  px: 2.25,
                  py: 1.5,
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  border: 1,
                  borderColor: `${severity}.light`,
                  '& .MuiAlert-message': { py: 0.25, flex: 1 },
                  '& .MuiAlert-action': {
                    pt: 0,
                    pl: { xs: 0, sm: 2 },
                    alignItems: 'center',
                  },
                }}
              >
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', mb: 0.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                    {isExpired
                      ? 'Giấy phép điều khiển UAV đã hết hạn'
                      : 'Giấy phép điều khiển UAV sắp hết hạn'}
                  </Typography>
                  <Chip
                    size="small"
                    color={severity}
                    variant="outlined"
                    label={
                      isExpired
                        ? expiryDateText
                          ? `Hết hạn ngày ${expiryDateText}`
                          : 'Đã hết hạn'
                        : expiryDateText
                          ? `Còn ${remainingDays} ngày · ${expiryDateText}`
                          : `Còn ${remainingDays} ngày`
                    }
                    sx={{ height: 22, fontSize: '0.75rem', fontWeight: 650 }}
                  />
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                  {myProfile.pilotLicenseNumber ? (
                    <>
                      Số bằng{' '}
                      <Box component="span" sx={{ fontWeight: 650, color: 'text.primary', fontFamily: 'monospace' }}>
                        {myProfile.pilotLicenseNumber}
                      </Box>
                      {' — '}
                    </>
                  ) : null}
                  {isExpired
                    ? 'Tài khoản tạm thời bị khóa quyền nhận lịch bay và bắt đầu chuyến bay mới cho đến khi cập nhật bằng gia hạn.'
                    : 'Vui lòng gia hạn và tải lên bản scan mới để tránh gián đoạn lịch bay.'}
                </Typography>
              </Alert>
            );
          })()}

        {/* Minimal 1-line notice ONLY when onboarding is not yet approved */}
        {myProfile && myProfile.onboardingStatus !== 'APPROVED' && (
          <Alert
            severity={myProfile.onboardingStatus === 'REJECTED' ? 'error' : 'warning'}
            action={
              <Button
                color="inherit"
                size="small"
                endIcon={<ArrowForwardRounded sx={{ fontSize: 15 }} />}
                onClick={() => navigate('/operations/settings?tab=pilot-profile')}
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

        {/* 4 Focused Real Metric Cards (NextAdmin layout) */}
        <Box
          role="region"
          aria-label={t('Inspector summary metrics')}
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              lg: 'repeat(4, 1fr)',
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
            iconType="shield"
          />

          <MetricCard
            label={t('Net payout earnings')}
            value={`${formatNumber(totalNet)} ₫`}
            change={`${disbursementPercent}% ${t('disbursed')}`}
            positive={true}
            iconType="wallet"
          />

          <MetricCard
            label={t('Active Drones')}
            value={`${activeDroneCount} / ${droneCount}`}
            change={`${myProfile?.totalFlightHours ?? 0}h ${t('flight hrs')}`}
            positive={activeDroneCount > 0}
            iconType="users"
          />
        </Box>

        {/* Upcoming Flight Missions / Flight Permit Check (CRM Upcoming Tasks style) */}
        <Paper
          variant="outlined"
          sx={{
            p: 2.5,
            borderRadius: '12px',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            boxShadow: 'none',
          }}
        >
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography component="h2" sx={{ fontSize: '1rem', fontWeight: 600 }}>
              {tr('Nhiệm vụ sắp tới / Cần nộp Flight Permit', 'Upcoming Missions & Flight Permits')}
            </Typography>
            <Button
              size="small"
              endIcon={<ArrowForwardRounded sx={{ fontSize: 15 }} />}
              onClick={() => navigate('/operations/inspections')}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              {tr('Xem tất cả', 'View all')}
            </Button>
          </Stack>
          {upcomingMissions.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {tr('Hiện không có nhiệm vụ sắp tới hoặc đang bay.', 'No scheduled or in-progress missions.')}
            </Typography>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                gap: 1.25,
              }}
            >
              {upcomingMissions.map((mission) => {
                const permitReady = mission.flightPermitVerificationStatus === 'APPROVED';
                const plannedText = mission.plannedStartAt
                  ? new Date(mission.plannedStartAt).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : tr('Chưa xếp giờ', 'TBD');
                return (
                  <Box
                    key={mission.id}
                    onClick={() => navigate(`/operations/inspections/${mission.id}`)}
                    sx={{
                      p: 1.5,
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'background.default',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 1.5,
                      cursor: 'pointer',
                      '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 650 }} noWrap>
                        {mission.assetName || mission.assetCode || tr('Ca kiểm định', 'Inspection')}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                        {plannedText}
                        {mission.droneSerialNumber ? ` · ${mission.droneSerialNumber}` : ''}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      color={permitReady ? 'success' : 'warning'}
                      variant={permitReady ? 'outlined' : 'filled'}
                      label={
                        permitReady
                          ? tr('Đã có phép bay', 'Permit ready')
                          : tr('Nộp phép bay', 'Upload permit')
                      }
                      sx={{ height: 22, fontSize: '0.72rem', fontWeight: 650, flexShrink: 0 }}
                    />
                  </Box>
                );
              })}
            </Box>
          )}
        </Paper>

        {/* Monthly Personal Revenue & Net Payout Chart */}
        <InspectorMonthlyRevenueChart
          monthlyData={monthlyData}
          totalGross={totalGross}
          totalNet={totalNet}
          totalCommission={totalCommission}
          totalDisbursed={totalDisbursed}
        />

        {/* 2-Column Overview Cards (NextAdmin bottom grid) */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
            gap: 2.5,
          }}
        >
          <Paper
            variant="outlined"
            sx={{
              p: 2.5,
              borderRadius: '12px',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              boxShadow: 'none',
            }}
          >
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {t('My Drone Fleet')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {activeDroneCount} {t('active')} · {droneCount - activeDroneCount} {t('unactive')}
                </Typography>
              </Box>
              <Button
                size="small"
                endIcon={<ArrowForwardRounded sx={{ fontSize: 15 }} />}
                onClick={() => navigate('/operations/inspector-drones')}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                {t('Manage')}
              </Button>
            </Stack>

            {myDrones.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                {t('No drones registered yet.')}
              </Typography>
            ) : (
              <Stack spacing={1.25}>
                {myDrones.slice(0, 4).map((drone) => (
                  <Stack
                    key={drone.id}
                    direction="row"
                    sx={{
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      p: 1.5,
                      borderRadius: '8px',
                      bgcolor: 'action.hover',
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 650 }} noWrap>
                        {drone.model?.split('[')[0]?.trim() || drone.serialNumber}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                        SN: {drone.serialNumber}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={drone.serviceability === 'ACTIVE' ? 'Active' : 'Unactive'}
                      color={drone.serviceability === 'ACTIVE' ? 'success' : 'warning'}
                      variant="outlined"
                      sx={{ fontWeight: 650, fontSize: '0.75rem' }}
                    />
                  </Stack>
                ))}
              </Stack>
            )}
          </Paper>

          <Paper
            variant="outlined"
            sx={{
              p: 2.5,
              borderRadius: '12px',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              boxShadow: 'none',
            }}
          >
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {t('Pilot License & Flight Readiness')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {myProfile?.pilotLicenseClass || t('Not set')}
                </Typography>
              </Box>
              <Button
                size="small"
                endIcon={<ArrowForwardRounded sx={{ fontSize: 15 }} />}
                onClick={() => navigate('/operations/settings?tab=pilot-profile')}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                {t('Profile')}
              </Button>
            </Stack>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 1.5,
              }}
            >
              <Box sx={{ p: 1.5, borderRadius: '8px', bgcolor: 'action.hover' }}>
                <Typography variant="caption" color="text.secondary">
                  {t('License Number')}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace', mt: 0.25 }}>
                  {myProfile?.pilotLicenseNumber || '—'}
                </Typography>
              </Box>
              <Box sx={{ p: 1.5, borderRadius: '8px', bgcolor: 'action.hover' }}>
                <Typography variant="caption" color="text.secondary">
                  {t('License Expiry')}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.25 }}>
                  {myProfile?.pilotLicenseExpiresAt
                    ? new Date(myProfile.pilotLicenseExpiresAt).toLocaleDateString('vi-VN')
                    : '—'}
                </Typography>
              </Box>
              <Box sx={{ p: 1.5, borderRadius: '8px', bgcolor: 'action.hover' }}>
                <Typography variant="caption" color="text.secondary">
                  {t('Total Flight Hours')}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.25 }}>
                  {myProfile?.totalFlightHours ?? 0} hrs
                </Typography>
              </Box>
              <Box sx={{ p: 1.5, borderRadius: '8px', bgcolor: 'action.hover' }}>
                <Typography variant="caption" color="text.secondary">
                  {t('Partner Contract')}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.25 }}>
                  {myProfile?.hasPartnerContract ? t('Signed & Active') : t('Pending')}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Box>

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
            <Typography
              component="h2"
              sx={{ fontSize: '1rem', fontWeight: 600, color: 'text.primary' }}
            >
              {t('Monthly Settlement Breakdown')}
            </Typography>
            <Button
              size="small"
              variant="text"
              endIcon={<ArrowForwardRounded sx={{ fontSize: 14 }} />}
              onClick={() => navigate('/operations/inspections')}
              sx={{ color: '#2B84EB', textTransform: 'none', fontWeight: 600, fontSize: '0.875rem' }}
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
                      bgcolor: (muiTheme) => (muiTheme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#F9FAFB'),
                      color: 'text.secondary',
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
                      bgcolor: (muiTheme) => (muiTheme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#F9FAFB'),
                      color: 'text.secondary',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      py: 1.5,
                      px: 2,
                      width: 140,
                      textTransform: 'uppercase',
                    }}
                  >
                    {t('Missions')}
                  </TableCell>
                  <TableCell
                    sx={{
                      bgcolor: (muiTheme) => (muiTheme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#F9FAFB'),
                      color: 'text.secondary',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      py: 1.5,
                      px: 2,
                      width: 180,
                      textTransform: 'uppercase',
                    }}
                  >
                    {t('Net Payout')}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      bgcolor: (muiTheme) => (muiTheme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#F9FAFB'),
                      color: 'text.secondary',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      py: 1.5,
                      px: 2.5,
                      width: 180,
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
                    <TableCell colSpan={4}>
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

                      {/* Col 3: Net Payout */}
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

                      {/* Col 4: Disbursement Status & Arrow */}
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
          </>
        )}
      </Stack>
    </Box>
  );
}

function useInspectionsQueryItems(items?: InspectionListItem[]): InspectionListItem[] {
  return useMemo(() => items ?? [], [items]);
}
