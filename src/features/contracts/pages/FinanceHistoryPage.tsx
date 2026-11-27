import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
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
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import { AdminTableToolbar } from '@/features/admin/components/AdminTableToolbar';
import type { SepayCheckoutDetails } from '@/features/inspections/api/inspectionApi';
import { SepayPayoutQrDialog } from '@/features/reports/components/SepayPayoutQrDialog';
import { formatVietQrBankDisplay } from '@/shared/constants/vietQrBanks';
import { SepayVietQrLogoMark } from '@/shared/ui/PaymentBrandLogos';
import { PageHeader } from '@/shared/ui/PageHeader';
import { EmptyState } from '@/shared/ui/EmptyState';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import { MetricCard } from '@/shared/ui/MetricCard';
import { StatusChip } from '@/shared/ui/StatusChip';
import { useToastStore } from '@/shared/ui/Toast';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { InspectorPayoutBankCard } from '@/features/auth/components/profile/InspectorPayoutBankCard';
import { useAuthStore } from '@/features/auth/store/authStore';
import {
  contractApi,
  contractQueryKeys,
  type ManagerFinanceHistoryItem,
  type OccurrenceFinanceHistoryDetail,
  type OccurrenceFinanceHistoryItem,
} from '../api/contractApi';
import { extractContractErrorText } from '../shared/contractStage';

function formatConciseSubtitle(assetName: string | null, description: string | null): string | null {
  if (!description) return null;
  const trimmed = description.trim();
  if (!trimmed) return null;
  if (assetName) {
    const assetLower = assetName.trim().toLowerCase();
    const descLower = trimmed.toLowerCase();
    if (descLower === assetLower || descLower === `${assetLower} · inspection` || descLower.startsWith(`${assetLower} ·`)) {
      const remainder = trimmed.slice(assetName.trim().length).replace(/^\s*·\s*/, '').trim();
      if (!remainder || remainder.toLowerCase() === 'inspection') return null;
      return remainder;
    }
  }
  return trimmed;
}

function money(value: number | null | undefined, locale: string, currency = 'VND') {
  if (value == null) return '—';
  return new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

type PayoutFilter = 'ALL' | 'ELIGIBLE' | 'PENDING' | 'PAID';
type RevenueFilter = 'ALL' | 'PAID_ONLY' | 'REFUNDED';
type FinanceSort = 'DATE_DESC' | 'DATE_ASC' | 'AMOUNT_DESC' | 'SECONDARY_DESC';

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  const last = parts[parts.length - 1];
  if (!first) return '?';
  if (parts.length === 1 || !last) return first.slice(0, 2).toUpperCase();
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

function getItemSortTimestamp(item: ManagerFinanceHistoryItem, isPayoutView: boolean): number {
  const raw = isPayoutView
    ? (item.payoutRecordedAt ?? item.paymentConfirmedAt ?? item.payoutUpdatedAt ?? null)
    : (item.paymentConfirmedAt ?? item.payoutUpdatedAt ?? null);
  return raw ? new Date(raw).getTime() : 0;
}

function resolvePayoutChipMeta(status: string | null | undefined) {
  const normalized = (status ?? 'PENDING').toUpperCase();
  if (normalized === 'PAID' || normalized === 'SETTLED') {
    return { status: 'settled', label: 'Payout settled', tone: 'success' as const };
  }
  if (normalized === 'ELIGIBLE') {
    return { status: 'payout_pending', label: 'Payout eligible', tone: 'warning' as const };
  }
  return { status: 'payout_locked', label: 'Payout pending', tone: 'default' as const };
}

export default function FinanceHistoryPage({
  mode = 'revenue',
}: {
  mode?: 'revenue' | 'payouts' | undefined;
} = {}) {
  const { locale, t, formatDate, formatDateTime } = useLocale();
  const roles = useAuthStore((state) => state.roles);
  const currentUser = useAuthStore((state) => state.user);
  const inspector = roles.includes('INSPECTOR');
  const manager = !inspector && roles.includes('MANAGER');
  const isPayoutView = manager && mode === 'payouts';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const [bankDialogOpen, setBankDialogOpen] = useState(false);
  const [params, setParams] = useSearchParams();
  const page = Math.max(0, Number(params.get('page') ?? '0') || 0);
  const [payoutFilter, setPayoutFilter] = useState<PayoutFilter>('ALL');
  const [revenueFilter, setRevenueFilter] = useState<RevenueFilter>('ALL');
  const [revenueMethodFilter, setRevenueMethodFilter] = useState<string>('ALL');
  const [payoutInspectorFilter, setPayoutInspectorFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<FinanceSort>('DATE_DESC');
  const [requestError, setRequestError] = useState<string | null>(null);

  const resetPageParam = () => {
    setParams((current) => {
      if (!current.has('page')) return current;
      const next = new URLSearchParams(current);
      next.delete('page');
      return next;
    });
  };

  const historyQuery = useQuery({
    queryKey: ['finance-history', inspector ? 'inspector' : 'customer', page],
    enabled: !manager,
    queryFn: () => inspector
      ? contractApi.listInspectorFinanceHistory(page, 20)
      : contractApi.listCustomerFinanceHistory(page, 20),
  });

  const hasActiveFilter = isPayoutView
    ? payoutFilter !== 'ALL' ||
      payoutInspectorFilter !== 'ALL' ||
      search.trim().length > 0 ||
      sortOrder !== 'DATE_DESC'
    : revenueFilter !== 'ALL' ||
      revenueMethodFilter !== 'ALL' ||
      search.trim().length > 0 ||
      sortOrder !== 'DATE_DESC';
  const managerPageSize = hasActiveFilter ? 100 : 20;
  const managerScope = isPayoutView ? 'PAYOUTS' : 'REVENUE';
  const managerHistoryQuery = useQuery({
    queryKey: ['finance-history', 'manager', isPayoutView ? 'payouts' : 'revenue', page, managerPageSize],
    enabled: manager,
    placeholderData: (previousData) => previousData,
    queryFn: () => contractApi.listManagerFinanceHistory(page, managerPageSize, managerScope),
  });

  const activeQuery = manager ? managerHistoryQuery : historyQuery;
  const items = manager
    ? (managerHistoryQuery.data?.content ?? null)
    : (historyQuery.data?.content ?? null);

  const managerContent = useMemo(
    () => managerHistoryQuery.data?.content ?? [],
    [managerHistoryQuery.data?.content],
  );

  const revenueMethodOptions = useMemo(() => {
    const methods = new Set<string>(['VNPAY', 'SEPAY']);
    managerContent.forEach((item) => {
      if (item.paymentMethod) {
        methods.add(item.paymentMethod.toUpperCase());
      }
    });
    return [
      { value: 'ALL', label: t('All methods') },
      ...Array.from(methods)
        .sort()
        .map((method) => ({ value: method, label: method })),
    ];
  }, [managerContent, t]);

  const payoutInspectorOptions = useMemo(() => {
    const byKey = new Map<string, string>();
    managerContent.forEach((item) => {
      const label = item.inspectorName?.trim();
      const key = item.inspectorId ?? label;
      if (key && label && !byKey.has(key)) {
        byKey.set(key, label);
      }
    });
    return [
      { value: 'ALL', label: t('All inspectors') },
      ...Array.from(byKey.entries())
        .sort((a, b) => a[1].localeCompare(b[1], locale, { sensitivity: 'base' }))
        .map(([value, label]) => ({ value, label })),
    ];
  }, [locale, managerContent, t]);

  const clearAllManagerControls = () => {
    setSearch('');
    setPayoutFilter('ALL');
    setRevenueFilter('ALL');
    setRevenueMethodFilter('ALL');
    setPayoutInspectorFilter('ALL');
    setSortOrder('DATE_DESC');
    resetPageParam();
  };

  const filteredManagerItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = managerContent.filter((item) => {
      if (isPayoutView) {
        if (payoutFilter !== 'ALL' && (item.payoutStatus ?? 'PENDING').toUpperCase() !== payoutFilter) {
          return false;
        }
        if (payoutInspectorFilter !== 'ALL') {
          const itemInspectorKey = item.inspectorId ?? item.inspectorName?.trim() ?? '';
          if (itemInspectorKey !== payoutInspectorFilter) return false;
        }
      } else {
        if (revenueFilter === 'REFUNDED' && !(item.refundedAmount > 0)) {
          return false;
        }
        if (revenueFilter === 'PAID_ONLY' && item.refundedAmount > 0) {
          return false;
        }
        if (
          revenueMethodFilter !== 'ALL' &&
          (item.paymentMethod ?? '').toUpperCase() !== revenueMethodFilter
        ) {
          return false;
        }
      }

      if (!query) return true;
      return (
        (item.assetName ?? '').toLowerCase().includes(query) ||
        (item.requestDescription ?? '').toLowerCase().includes(query) ||
        (item.customerName ?? '').toLowerCase().includes(query) ||
        (item.inspectorName ?? '').toLowerCase().includes(query) ||
        (item.paymentReference ?? '').toLowerCase().includes(query) ||
        (item.payoutReference ?? '').toLowerCase().includes(query) ||
        (item.paymentMethod ?? '').toLowerCase().includes(query)
      );
    });

    return [...filtered].sort((left, right) => {
      if (sortOrder === 'DATE_ASC') {
        return getItemSortTimestamp(left, isPayoutView) - getItemSortTimestamp(right, isPayoutView);
      }
      if (sortOrder === 'AMOUNT_DESC') {
        const leftAmount = isPayoutView ? (left.inspectorNetPayout ?? 0) : (left.netPlatformInflow ?? 0);
        const rightAmount = isPayoutView ? (right.inspectorNetPayout ?? 0) : (right.netPlatformInflow ?? 0);
        return rightAmount - leftAmount;
      }
      if (sortOrder === 'SECONDARY_DESC') {
        if (isPayoutView) {
          return (left.inspectorName ?? '').localeCompare(right.inspectorName ?? '', locale, {
            sensitivity: 'base',
          });
        }
        return (right.netCommissionAmount ?? 0) - (left.netCommissionAmount ?? 0);
      }
      return getItemSortTimestamp(right, isPayoutView) - getItemSortTimestamp(left, isPayoutView);
    });
  }, [
    isPayoutView,
    locale,
    managerContent,
    payoutFilter,
    payoutInspectorFilter,
    revenueFilter,
    revenueMethodFilter,
    search,
    sortOrder,
  ]);

  const payoutStatusCounts = useMemo(() => {
    let eligible = 0;
    let pending = 0;
    let paid = 0;
    for (const item of managerContent) {
      const status = (item.payoutStatus ?? 'PENDING').toUpperCase();
      if (status === 'ELIGIBLE') eligible += 1;
      else if (status === 'PAID' || status === 'SETTLED') paid += 1;
      else pending += 1;
    }
    return { all: managerContent.length, eligible, pending, paid };
  }, [managerContent]);

  const eligibleItemsInPage = useMemo(
    () =>
      managerContent.filter(
        (item) => (item.payoutStatus ?? '').toUpperCase() === 'ELIGIBLE',
      ),
    [managerContent],
  );
  const eligibleCountInPage = eligibleItemsInPage.length;
  const eligibleTotalInPage = useMemo(
    () => eligibleItemsInPage.reduce((sum, item) => sum + (item.inspectorNetPayout || 0), 0),
    [eligibleItemsInPage],
  );
  const total = activeQuery.data?.totalElements ?? 0;
  const loading = activeQuery.isLoading;
  const pageSize = manager ? managerPageSize : 20;
  const error =
    requestError ??
    (activeQuery.isError ? t('Unable to load payment history. Please try again.') : null);

  const [detail, setDetail] = useState<OccurrenceFinanceHistoryDetail | null>(null);
  const [selectedManagerItem, setSelectedManagerItem] = useState<ManagerFinanceHistoryItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [payoutQrDetails, setPayoutQrDetails] = useState<SepayCheckoutDetails | undefined>(undefined);
  const [payoutBusy, setPayoutBusy] = useState(false);
  const [payoutChecking, setPayoutChecking] = useState(false);
  const [payoutError, setPayoutError] = useState<string | null>(null);

  const openDetail = async (item: OccurrenceFinanceHistoryItem | ManagerFinanceHistoryItem) => {
    setDetailLoading(true);
    setDetail(null);
    setPayoutError(null);
    setPayoutQrDetails(undefined);
    setSelectedManagerItem(manager ? (item as ManagerFinanceHistoryItem) : null);
    try {
      const result = manager
        ? await contractApi.getManagerFinanceHistoryDetail(item.occurrenceId)
        : inspector
          ? await contractApi.getInspectorFinanceHistoryDetail(item.occurrenceId)
          : await contractApi.getCustomerFinanceHistoryDetail(item.occurrenceId);
      setDetail(result);
      setParams((current) => {
        const next = new URLSearchParams(current);
        next.set('occurrence', item.occurrenceId);
        return next;
      }, { replace: false });
    } catch {
      setRequestError(t('Unable to load payment details. Please try again.'));
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetail(null);
    setSelectedManagerItem(null);
    setPayoutQrDetails(undefined);
    setPayoutError(null);
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.delete('occurrence');
      return next;
    }, { replace: false });
  };

  const refreshDetailPayoutStatus = async (occurrenceId: string) => {
    setPayoutChecking(true);
    try {
      const refreshedDetail = await contractApi.getManagerFinanceHistoryDetail(occurrenceId);
      setDetail(refreshedDetail);
      const nextStatus = (
        refreshedDetail.payout?.status ??
        refreshedDetail.payoutStatus ??
        ''
      ).toUpperCase();
      if (nextStatus === 'PAID' || nextStatus === 'SETTLED') {
        setPayoutQrDetails(undefined);
        showToast(t('Inspector payout confirmed via SePay.'), 'success');
        await Promise.all([
          managerHistoryQuery.refetch(),
          queryClient.invalidateQueries({ queryKey: contractQueryKeys.requests() }),
          queryClient.invalidateQueries({ queryKey: ['inspections'] }),
        ]);
      }
    } catch {
      // Keep polling quietly when transient background check fails
    } finally {
      setPayoutChecking(false);
    }
  };

  const handleOpenSepayPayoutQr = async () => {
    if (!detail) return;
    setPayoutBusy(true);
    setPayoutError(null);
    try {
      const details = await contractApi.createOccurrenceSepayPayoutLink(
        detail.requestId,
        detail.occurrenceId,
      );
      if (details?.checkoutUrl) {
        setPayoutQrDetails(details);
      } else {
        setPayoutError(t('The VietQR code could not be generated.'));
      }
    } catch (err) {
      setPayoutError(extractContractErrorText(err, 'Could not create SePay payout QR link.'));
    } finally {
      setPayoutBusy(false);
    }
  };

  useEffect(() => {
    if (!payoutQrDetails || !detail?.occurrenceId) return;
    const intervalId = window.setInterval(() => {
      void refreshDetailPayoutStatus(detail.occurrenceId);
    }, 3000);
    return () => window.clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payoutQrDetails, detail?.occurrenceId]);

  const title = manager
    ? isPayoutView
      ? t('Inspector payouts')
      : t('Revenue & payments')
    : inspector
      ? t('Payout history')
      : t('Payment history');
  const amountLabel = inspector ? t('Net received') : t('Amount paid');
  const formatTime = (value: string | null) => value ? formatDateTime(value) : '—';
  const formatShortDate = (value: string | null) =>
    value ? formatDate(value, { dateStyle: 'medium' }) : '—';
  const dashboardPath = manager
    ? '/manager/dashboard'
    : inspector
      ? '/operations/dashboard'
      : '/client/dashboard';
  const managerSummary = managerHistoryQuery.data?.summary ?? null;

  const detailPayoutStatus = (detail?.payout?.status ?? detail?.payoutStatus ?? 'PENDING').toUpperCase();
  const detailHasCompleteBankDetails = Boolean(
    detail?.payout?.bankName?.trim() &&
      detail?.payout?.bankAccountNumber?.trim() &&
      detail?.payout?.bankAccountHolder?.trim(),
  );
  const detailCanSettlePayout = Boolean(
    isPayoutView &&
      detail &&
      !detail.payout?.heldForRefund &&
      (detailPayoutStatus === 'ELIGIBLE' ||
        Boolean(detail.payout?.reference?.startsWith('AUTO-DISBURSE')) ||
        Boolean(detail.payoutReference?.startsWith('AUTO-DISBURSE'))),
  );
  const managerDialogOpen = Boolean(manager && (detailLoading || detail !== null));

  return (
    <Box className="workspace-page">
      <PageHeader title={title} breadcrumbs={[{ label: t('Operations'), to: dashboardPath }, { label: title }]} />
      <Stack spacing={2}>
        {inspector && (
          currentUser?.payoutBankName?.trim() &&
          currentUser?.payoutBankAccountNumber?.trim() &&
          currentUser?.payoutBankAccountHolder?.trim() ? (
            <Paper
              variant="outlined"
              sx={{
                px: 2,
                py: 1.5,
                borderRadius: '12px',
                borderColor: 'divider',
                bgcolor: 'background.paper',
              }}
            >
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
              >
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>
                    {t('Payout bank account')}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {currentUser.payoutBankName} · <Box component="span" sx={{ fontFamily: 'monospace' }}>{currentUser.payoutBankAccountNumber}</Box> · {currentUser.payoutBankAccountHolder}
                    {currentUser.payoutBankBranch ? ` (${currentUser.payoutBankBranch})` : ''}
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setBankDialogOpen(true)}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px', flexShrink: 0 }}
                >
                  {t('Edit bank account')}
                </Button>
              </Stack>
            </Paper>
          ) : (
            <Alert
              severity="warning"
              sx={{ borderRadius: '10px', alignItems: 'center' }}
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => setBankDialogOpen(true)}
                  sx={{ textTransform: 'none', fontWeight: 650, whiteSpace: 'nowrap' }}
                >
                  {t('Set up bank account')}
                </Button>
              }
            >
              {t('Set up your payout bank account so the Platform Manager can transfer your earnings.')}
            </Alert>
          )
        )}
        {manager && managerSummary && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
              gap: 2,
            }}
          >
            {isPayoutView ? (
              (() => {
                const onHoldAmount = Math.max(0, managerSummary.pendingInspectorPayout - eligibleTotalInPage);
                const settledRatio =
                  managerSummary.totalInspectorNetPayout > 0
                    ? Math.round((managerSummary.paidInspectorPayout / managerSummary.totalInspectorNetPayout) * 100)
                    : 0;
                return (
                  <>
                    <MetricCard
                      label={t('Eligible for payout')}
                      value={money(eligibleTotalInPage, locale, managerSummary.currency)}
                      change={eligibleCountInPage > 0 ? `${eligibleCountInPage} ${t('ready')}` : t('Up to date')}
                      showTrend={false}
                      subtext={t('cleared for VietQR disbursement')}
                      iconType="shield"
                    />
                    <MetricCard
                      label={t('Settled payouts')}
                      value={money(managerSummary.paidInspectorPayout, locale, managerSummary.currency)}
                      change={t('Disbursed')}
                      showTrend={false}
                      subtext={`${t('TNCN withheld')}: ${money(managerSummary.totalTncnWithheld, locale, managerSummary.currency)}`}
                      iconType="wallet"
                    />
                    <MetricCard
                      label={t('Total net payout')}
                      value={money(managerSummary.totalInspectorNetPayout, locale, managerSummary.currency)}
                      change={`${settledRatio}% ${t('settled')}`}
                      showTrend={false}
                      subtext={
                        onHoldAmount > 0
                          ? `${t('On hold')}: ${money(onHoldAmount, locale, managerSummary.currency)}`
                          : t('total inspector net obligation')
                      }
                      iconType="building"
                    />
                  </>
                );
              })()
            ) : (
              <>
                <MetricCard
                  label={t('Collected (Net)')}
                  value={money(managerSummary.netPlatformInflow, locale, managerSummary.currency)}
                  change={`${managerSummary.transactionCount} ${t('transactions')}`}
                  showTrend={false}
                  subtext={
                    managerSummary.totalRefunded > 0
                      ? `${t('Refunded')}: ${money(managerSummary.totalRefunded, locale, managerSummary.currency)}`
                      : t('gross customer inflow net of refunds')
                  }
                  iconType="building"
                />
                <MetricCard
                  label={t('Commission earned')}
                  value={money(managerSummary.totalCommissionEarned, locale, managerSummary.currency)}
                  change={
                    managerSummary.netPlatformInflow > 0
                      ? `${((managerSummary.totalCommissionEarned / managerSummary.netPlatformInflow) * 100).toFixed(1)}% ${t('of net')}`
                      : undefined
                  }
                  showTrend={managerSummary.totalCommissionEarned > 0}
                  positive
                  subtext={t('platform service fee revenue')}
                  iconType="wallet"
                />
                <MetricCard
                  label={t('VAT collected')}
                  value={money(managerSummary.totalVatAmount, locale, managerSummary.currency)}
                  change={t('Tax reserve')}
                  showTrend={false}
                  subtext={t('output value-added tax')}
                  iconType="shield"
                />
              </>
            )}
          </Box>
        )}

        {error && <Alert severity="error" onClose={() => setRequestError(null)}>{error}</Alert>}
        {loading && <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}><CircularProgress /></Box>}

        {!loading && items?.length === 0 && (
          <EmptyState
            title={
              manager
                ? isPayoutView
                  ? t('No payout records yet')
                  : t('No revenue records yet')
                : t('No payment history yet')
            }
          />
        )}

        {!loading && Boolean(items?.length) && (
          <Stack spacing={0}>
            {manager && (
              <AdminTableToolbar
                searchValue={search}
                onSearchChange={(value) => {
                  setSearch(value);
                  resetPageParam();
                }}
                searchPlaceholder={
                  isPayoutView
                    ? t('Search inspector, asset, payout ref…')
                    : t('Search asset, customer, reference…')
                }
                searchLabel={isPayoutView ? t('Search payouts') : t('Search revenue')}
                visibleCount={filteredManagerItems.length}
                totalCount={managerContent.length}
                onClearAll={clearAllManagerControls}
                filters={
                  isPayoutView
                    ? [
                        {
                          key: 'status',
                          label: t('Status'),
                          value: payoutFilter,
                          options: [
                            {
                              value: 'ALL',
                              label:
                                payoutStatusCounts.all > 0
                                  ? `${t('All statuses')} (${payoutStatusCounts.all})`
                                  : t('All statuses'),
                            },
                            {
                              value: 'ELIGIBLE',
                              label:
                                eligibleCountInPage > 0
                                  ? `${t('Payout eligible')} (${eligibleCountInPage})`
                                  : t('Payout eligible'),
                            },
                            {
                              value: 'PENDING',
                              label:
                                payoutStatusCounts.pending > 0
                                  ? `${t('Pending / On hold')} (${payoutStatusCounts.pending})`
                                  : t('Pending / On hold'),
                            },
                            {
                              value: 'PAID',
                              label:
                                payoutStatusCounts.paid > 0
                                  ? `${t('Payout settled')} (${payoutStatusCounts.paid})`
                                  : t('Payout settled'),
                            },
                          ],
                          onChange: (value) => {
                            setPayoutFilter(value as PayoutFilter);
                            resetPageParam();
                          },
                          width: 195,
                        },
                        {
                          key: 'inspector',
                          label: t('Inspector'),
                          value: payoutInspectorFilter,
                          options: payoutInspectorOptions,
                          onChange: (value) => {
                            setPayoutInspectorFilter(value);
                            resetPageParam();
                          },
                          width: 170,
                        },
                        {
                          key: 'sort',
                          label: t('Sort'),
                          value: sortOrder,
                          allValue: 'DATE_DESC',
                          options: [
                            { value: 'DATE_DESC', label: t('Newest first') },
                            { value: 'DATE_ASC', label: t('Oldest first') },
                            { value: 'AMOUNT_DESC', label: t('Highest payout') },
                            { value: 'SECONDARY_DESC', label: t('Inspector A–Z') },
                          ],
                          onChange: (value) => setSortOrder(value as FinanceSort),
                          width: 150,
                        },
                      ]
                    : [
                        {
                          key: 'status',
                          label: t('Status'),
                          value: revenueFilter,
                          options: [
                            { value: 'ALL', label: t('All statuses') },
                            { value: 'PAID_ONLY', label: t('Paid only') },
                            { value: 'REFUNDED', label: t('Refunded') },
                          ],
                          onChange: (value) => {
                            setRevenueFilter(value as RevenueFilter);
                            resetPageParam();
                          },
                          width: 145,
                        },
                        {
                          key: 'method',
                          label: t('Method'),
                          value: revenueMethodFilter,
                          options: revenueMethodOptions,
                          onChange: (value) => {
                            setRevenueMethodFilter(value);
                            resetPageParam();
                          },
                          width: 140,
                        },
                        {
                          key: 'sort',
                          label: t('Sort'),
                          value: sortOrder,
                          allValue: 'DATE_DESC',
                          options: [
                            { value: 'DATE_DESC', label: t('Newest first') },
                            { value: 'DATE_ASC', label: t('Oldest first') },
                            { value: 'AMOUNT_DESC', label: t('Highest inflow') },
                            { value: 'SECONDARY_DESC', label: t('Highest commission') },
                          ],
                          onChange: (value) => setSortOrder(value as FinanceSort),
                          width: 175,
                        },
                      ]
                }
              />
            )}

            <Paper variant="outlined" sx={{ borderRadius: '12px', overflow: 'hidden', bgcolor: 'background.paper', boxShadow: 'none' }}>
            {manager ? (
              <>
                {filteredManagerItems.length === 0 ? (
                  <Box sx={{ p: 4 }}>
                    <EmptyState
                      title={
                        isPayoutView
                          ? t('No matching payout records')
                          : t('No matching revenue records')
                      }
                      description={t('Try adjusting your search or clearing the active filters.')}
                      action={
                        hasActiveFilter ? (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={clearAllManagerControls}
                            sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                          >
                            {t('Clear filters')}
                          </Button>
                        ) : undefined
                      }
                    />
                  </Box>
                ) : (
                  <TableContainer>
                    <Table
                      size="medium"
                      sx={{
                        '& th, & td': { px: 1.5 },
                      }}
                    >
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'background.default' }}>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>{t('Date')}</TableCell>
                          <TableCell>{isPayoutView ? t('Inspector') : t('Inspection')}</TableCell>
                          <TableCell>{isPayoutView ? t('Inspection') : t('Customer')}</TableCell>
                          {!isPayoutView && <TableCell>{t('Method')}</TableCell>}
                          <TableCell align="right">
                            {isPayoutView ? t('Inspector net payout') : t('Collected')}
                          </TableCell>
                          <TableCell align={isPayoutView ? 'left' : 'right'}>
                            {isPayoutView ? t('Status') : t('Platform commission')}
                          </TableCell>
                          <TableCell />
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredManagerItems.map((item) => {
                          const chipMeta = resolvePayoutChipMeta(item.payoutStatus);
                          const isEligible = (item.payoutStatus ?? '').toUpperCase() === 'ELIGIBLE';
                          const subtitle = formatConciseSubtitle(item.assetName, item.requestDescription);
                          return (
                            <TableRow
                              key={item.occurrenceId}
                              hover
                              sx={{ cursor: 'pointer' }}
                              onClick={() => void openDetail(item)}
                            >
                              <TableCell sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: 'text.secondary' }}>
                                {isPayoutView
                                  ? formatShortDate(
                                      item.payoutRecordedAt ??
                                        item.paymentConfirmedAt ??
                                        item.payoutUpdatedAt ??
                                        null,
                                    )
                                  : formatShortDate(item.paymentConfirmedAt)}
                              </TableCell>
                               {isPayoutView ? (
                                <>
                                  <TableCell sx={{ maxWidth: 195, overflow: 'hidden' }}>
                                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
                                      <Avatar
                                        sx={{
                                          width: 28,
                                          height: 28,
                                          flexShrink: 0,
                                          fontSize: '0.75rem',
                                          fontWeight: 700,
                                          bgcolor: 'primary.main',
                                          color: 'primary.contrastText',
                                        }}
                                      >
                                        {getInitials(item.inspectorName)}
                                      </Avatar>
                                      <Typography
                                        variant="body2"
                                        noWrap
                                        title={item.inspectorName ?? undefined}
                                        sx={{ fontWeight: 600, color: 'text.primary', minWidth: 0 }}
                                      >
                                        {item.inspectorName ?? '—'}
                                      </Typography>
                                    </Stack>
                                  </TableCell>
                                  <TableCell sx={{ maxWidth: 210, overflow: 'hidden' }}>
                                    <Typography variant="body2" noWrap title={item.assetName ?? undefined} sx={{ fontWeight: 500 }}>
                                      {item.assetName ?? t('Asset')}
                                    </Typography>
                                    {subtitle && (
                                      <Typography variant="caption" color="text.secondary" noWrap title={subtitle} sx={{ display: 'block' }}>
                                        {subtitle}
                                      </Typography>
                                    )}
                                  </TableCell>
                                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                                      {money(item.inspectorNetPayout, locale, item.currency)}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                                      <StatusChip
                                        status={chipMeta.status}
                                        label={chipMeta.label}
                                        tone={chipMeta.tone}
                                      />
                                      {item.payoutReference && (
                                        <Typography
                                          variant="caption"
                                          color="text.secondary"
                                          sx={{ fontFamily: 'monospace' }}
                                        >
                                          {item.payoutReference}
                                        </Typography>
                                      )}
                                    </Stack>
                                  </TableCell>
                                </>
                              ) : (
                                <>
                                  <TableCell sx={{ maxWidth: 185, overflow: 'hidden' }}>
                                    <Typography variant="body2" noWrap title={item.assetName ?? undefined} sx={{ fontWeight: 600 }}>
                                      {item.assetName ?? t('Asset')}
                                    </Typography>
                                    {subtitle && (
                                      <Typography variant="caption" color="text.secondary" noWrap title={subtitle} sx={{ display: 'block' }}>
                                        {subtitle}
                                      </Typography>
                                    )}
                                  </TableCell>
                                  <TableCell sx={{ maxWidth: 165, overflow: 'hidden' }}>
                                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
                                      <Avatar
                                        src={item.customerId
                                          ? managerHistoryQuery.data?.customerAvatarUrls?.[item.customerId]
                                          : undefined}
                                        aria-hidden="true"
                                        sx={{
                                          width: 28,
                                          height: 28,
                                          flexShrink: 0,
                                          fontSize: '0.75rem',
                                          fontWeight: 700,
                                          bgcolor: 'action.selected',
                                          color: 'text.primary',
                                        }}
                                      >
                                        {getInitials(item.customerName)}
                                      </Avatar>
                                      <Typography
                                        variant="body2"
                                        noWrap
                                        title={item.customerName ?? undefined}
                                        sx={{ fontWeight: 500, minWidth: 0 }}
                                      >
                                        {item.customerName ?? '—'}
                                      </Typography>
                                    </Stack>
                                  </TableCell>
                                  <TableCell sx={{ whiteSpace: 'nowrap', color: 'text.secondary' }}>
                                    {item.paymentMethod ?? '—'}
                                  </TableCell>
                                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                      {money(item.netPlatformInflow, locale, item.currency)}
                                    </Typography>
                                    {item.refundedAmount > 0 && (
                                      <Typography variant="caption" color="error.main" sx={{ display: 'block' }}>
                                        -{money(item.refundedAmount, locale, item.currency)}
                                      </Typography>
                                    )}
                                  </TableCell>
                                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                                    <Stack direction="row" spacing={0.75} sx={{ justifyContent: 'flex-end', alignItems: 'center' }}>
                                      <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.main' }}>
                                        {money(item.netCommissionAmount, locale, item.currency)}
                                      </Typography>
                                      {item.commissionRate != null && (
                                        <Chip
                                          size="small"
                                          label={`${item.commissionRate}%`}
                                          sx={{ height: 20, fontSize: '0.75rem', fontWeight: 600 }}
                                        />
                                      )}
                                    </Stack>
                                  </TableCell>
                                </>
                              )}
                              <TableCell align="right">
                                <Button
                                  size="small"
                                  variant={isPayoutView && isEligible ? 'contained' : 'outlined'}
                                  color={isPayoutView && isEligible ? 'primary' : 'inherit'}
                                  sx={{
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    whiteSpace: 'nowrap',
                                    borderRadius: '8px',
                                    borderColor: isPayoutView && isEligible ? undefined : 'divider',
                                    color: isPayoutView && isEligible ? undefined : 'text.secondary',
                                    boxShadow: 'none',
                                  }}
                                >
                                  {isPayoutView && isEligible ? t('Settle payout') : t('Details')}
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </>
            ) : (
              <Table size="medium">
                <TableHead><TableRow>
                  <TableCell>{t('Date')}</TableCell>
                  <TableCell>{t('Inspection')}</TableCell>
                  {inspector && <TableCell>{t('Customer')}</TableCell>}
                  <TableCell align="right">{amountLabel}</TableCell>
                  <TableCell>{t('Method')}</TableCell>
                  <TableCell>{t('Status')}</TableCell>
                  <TableCell />
                </TableRow></TableHead>
                <TableBody>{(items as OccurrenceFinanceHistoryItem[]).map((item) => (
                  <TableRow key={item.occurrenceId} hover sx={{ cursor: 'pointer' }} onClick={() => void openDetail(item)}>
                    <TableCell>{formatTime(item.confirmedAt)}</TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600 }}>{item.assetName ?? t('Asset')}</Typography>
                      <Typography variant="caption" color="text.secondary">{item.requestDescription ?? `${t('Occurrence')} #${item.occurrenceIndex}`}</Typography>
                    </TableCell>
                    {inspector && <TableCell>{item.counterpartyName ?? '—'}</TableCell>}
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{money(item.amount, locale, item.currency)}</TableCell>
                    <TableCell>{item.paymentMethod ?? '—'}</TableCell>
                    <TableCell><Chip size="small" color="success" label={t(item.status)} /></TableCell>
                    <TableCell><Button size="small">{t('Details')}</Button></TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            )}
            <Stack
              direction="row"
              sx={{
                justifyContent: 'space-between',
                alignItems: 'center',
                px: 2.5,
                py: 1.5,
                borderTop: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {manager
                  ? `${t('Showing')} ${filteredManagerItems.length} ${t('of')} ${total} ${t('records')}`
                  : `${total} ${t('records')}`}
              </Typography>
              <Stack direction="row" sx={{ gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={page === 0}
                  onClick={() => setParams({ page: String(page - 1) })}
                  sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                >
                  {t('Previous')}
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={(page + 1) * pageSize >= total}
                  onClick={() => setParams({ page: String(page + 1) })}
                  sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                >
                  {t('Next')}
                </Button>
              </Stack>
            </Stack>
          </Paper>
          </Stack>
        )}
      </Stack>

      <Dialog
        open={managerDialogOpen}
        onClose={closeDetail}
        fullWidth
        maxWidth="sm"
        slotProps={{
          paper: {
            sx: {
              borderRadius: '12px',
              bgcolor: 'background.paper',
            },
          },
        }}
      >
        <DialogTitle sx={{ pr: 6 }}>
          <Typography variant="subtitle1" component="span" sx={{ fontWeight: 700, display: 'block' }}>
            {t('Platform finance details')}
          </Typography>
          {selectedManagerItem && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
              {selectedManagerItem.assetName ?? t('Asset')}
              {isPayoutView && selectedManagerItem.inspectorName
                ? ` · ${selectedManagerItem.inspectorName}`
                : !isPayoutView && selectedManagerItem.customerName
                  ? ` · ${selectedManagerItem.customerName}`
                  : ''}
            </Typography>
          )}
          <IconButton
            size="small"
            onClick={closeDetail}
            aria-label={t('Close')}
            sx={{ position: 'absolute', right: 12, top: 12 }}
          >
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {detailLoading && <Box sx={{ display: 'grid', placeItems: 'center', py: 5 }}><CircularProgress /></Box>}
          {detail && (
            <Stack spacing={2}>
              <Box
                sx={{
                  p: 1.75,
                  borderRadius: '10px',
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.default',
                }}
              >
                {isPayoutView ? (
                  <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        {t('Inspector net payout')}
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                        {money(detail.inspectorNetPayout, locale, detail.currency)}
                      </Typography>
                    </Box>
                    <StatusChip
                      status={resolvePayoutChipMeta(detailPayoutStatus).status}
                      label={resolvePayoutChipMeta(detailPayoutStatus).label}
                      tone={resolvePayoutChipMeta(detailPayoutStatus).tone}
                    />
                  </Stack>
                ) : (
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        {t('Total collected (VAT incl.)')}
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                        {money(detail.paymentAmount ?? detail.totalPrice, locale, detail.currency)}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: { sm: 'right' } }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        {t('Platform commission')}
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: 'success.main', fontVariantNumeric: 'tabular-nums' }}>
                        {money(detail.commissionAmount, locale, detail.currency)}
                      </Typography>
                    </Box>
                  </Stack>
                )}
              </Box>

              {isPayoutView && detail.payout?.heldForRefund && (
                <Alert severity="warning" sx={{ borderRadius: '8px' }}>
                  {t('Inspector payout is held while a customer refund is recorded and reconciled.')}
                </Alert>
              )}

              {detailCanSettlePayout && (
                <Box
                  sx={{
                    borderRadius: '10px',
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.default',
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      px: 2,
                      py: 1.5,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'background.paper',
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {t('Recipient bank account')}
                    </Typography>
                  </Box>

                  <Stack spacing={1.5} sx={{ p: 2 }}>
                    {detailHasCompleteBankDetails ? (
                      <Stack spacing={0.75}>
                        <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2 }}>
                          <Typography variant="body2" color="text.secondary">{t('Bank name')}</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>
                            {formatVietQrBankDisplay(detail.payout?.bankName)}
                          </Typography>
                        </Stack>
                        <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2 }}>
                          <Typography variant="body2" color="text.secondary">{t('Bank account number')}</Typography>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 650 }}>
                            {detail.payout?.bankAccountNumber}
                          </Typography>
                        </Stack>
                        <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2 }}>
                          <Typography variant="body2" color="text.secondary">{t('Account holder name')}</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>
                            {detail.payout?.bankAccountHolder}
                            {detail.payout?.bankBranch ? ` · ${detail.payout.bankBranch}` : ''}
                          </Typography>
                        </Stack>
                      </Stack>
                    ) : (
                      <Alert severity="warning" sx={{ borderRadius: '8px' }}>
                        {t('Inspector has not entered payout bank details yet.')}
                      </Alert>
                    )}

                    {payoutError && (
                      <Alert severity="error" onClose={() => setPayoutError(null)} sx={{ borderRadius: '8px' }}>
                        {payoutError}
                      </Alert>
                    )}

                    <Divider sx={{ borderStyle: 'dashed' }} />

                    <Stack
                      direction="row"
                      spacing={1.25}
                      sx={{ alignItems: 'center', justifyContent: 'flex-end' }}
                    >
                      <LoadingButton
                        size="small"
                        variant="outlined"
                        loading={payoutBusy}
                        disabled={!detailHasCompleteBankDetails}
                        onClick={() => void handleOpenSepayPayoutQr()}
                        sx={{
                          justifyContent: 'flex-start',
                          alignItems: 'center',
                          minHeight: 50,
                          textTransform: 'none',
                          fontWeight: 650,
                          whiteSpace: 'nowrap',
                          borderRadius: '10px',
                          boxShadow: 'none',
                          px: 1.75,
                          py: 0.75,
                          borderColor: 'divider',
                          bgcolor: 'background.paper',
                          color: 'text.primary',
                          '&:hover': {
                            borderColor: 'primary.main',
                            bgcolor: 'action.hover',
                          },
                        }}
                      >
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                          <SepayVietQrLogoMark />
                          <Typography variant="body2" sx={{ fontWeight: 650, color: 'inherit' }}>
                            {t('Pay Inspector via SePay (VietQR)')}
                          </Typography>
                        </Stack>
                      </LoadingButton>
                    </Stack>
                  </Stack>
                </Box>
              )}

              {isPayoutView ? (
                <Stack spacing={0.9}>
                  <Detail label={t('Gross payout')} value={money(detail.inspectorGrossPayout, locale, detail.currency)} />
                  <Detail
                    label={detail.tncnRate != null ? `${t('Tax withheld')} (${detail.tncnRate}%)` : t('Tax withheld')}
                    value={money(detail.tncnAmount, locale, detail.currency)}
                  />
                  <Detail label={t('Inspector net payout')} value={money(detail.inspectorNetPayout, locale, detail.currency)} />
                  <Detail label={t('Payout status')} value={detail.payout?.status ?? detail.payoutStatus} />
                  <Detail label={t('Payout reference')} value={detail.payout?.reference ?? detail.payoutReference} />
                  <Detail label={t('Payout recorded')} value={formatTime(detail.payoutRecordedAt)} />
                  <Detail label={t('Customer payment')} value={detail.paymentStatus} />
                  <Detail label={t('Payment confirmed')} value={formatTime(detail.paymentConfirmedAt)} />
                </Stack>
              ) : (
                <Stack spacing={0.9}>
                  <Detail label={t('Status')} value={detail.paymentStatus} />
                  <Detail label={t('Payment method')} value={detail.payment?.method} />
                  <Detail label={t('Payment confirmed')} value={formatTime(detail.paymentConfirmedAt)} />
                  <Detail label={t('Payment reference')} value={detail.payment?.reference} />
                  <Detail label={t('Service base')} value={money(detail.serviceBaseAmount, locale, detail.currency)} />
                  <Detail
                    label={detail.vatRate != null ? `${t('VAT')} (${detail.vatRate}%)` : t('VAT')}
                    value={money(detail.vatAmount, locale, detail.currency)}
                  />
                  <Detail
                    label={detail.commissionRate != null ? `${t('Platform commission')} (${detail.commissionRate}%)` : t('Platform commission')}
                    value={money(detail.commissionAmount, locale, detail.currency)}
                  />
                  {((detail.refundStatus && detail.refundStatus !== 'NONE') || (detail.refundedAmount ?? 0) > 0) && (
                    <>
                      <Detail label={t('Refund status')} value={detail.refundStatus} />
                      <Detail label={t('Refunded amount')} value={money(detail.refundedAmount, locale, detail.currency)} />
                    </>
                  )}
                </Stack>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.75, justifyContent: 'space-between' }}>
          {detail ? (
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              startIcon={<OpenInNewRoundedIcon fontSize="small" />}
              onClick={() => navigate(`/manager/contracts?requestId=${detail.requestId}`)}
              sx={{
                borderRadius: '8px',
                borderColor: 'divider',
                color: 'text.secondary',
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              {t('Open service request')}
            </Button>
          ) : (
            <Box />
          )}
          <Button size="small" onClick={closeDetail} sx={{ textTransform: 'none', fontWeight: 600 }}>
            {t('Close')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!manager && (detailLoading || detail !== null)} onClose={closeDetail} fullWidth maxWidth="sm">
        <DialogTitle>
          {inspector ? t('Payout details') : t('Payment details')}
        </DialogTitle>
        <DialogContent dividers>
          {detailLoading && <Box sx={{ display: 'grid', placeItems: 'center', py: 4 }}><CircularProgress /></Box>}
          {detail && <Stack spacing={2}>
            <Box>
              <Typography variant="overline">{inspector ? t('Net received') : t('Amount paid')}</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {money(inspector ? detail.inspectorNetPayout : detail.paymentAmount, locale, detail.currency)}
              </Typography>
            </Box>
            <Divider />
            <Detail label={t('Status')} value={inspector ? detail.payoutStatus : detail.paymentStatus} />
            <Detail label={t('Payment method')} value={detail.payment?.method} />
            <Detail label={t('Payment confirmed')} value={formatTime(detail.paymentConfirmedAt)} />
            {inspector && <>
              {detail.serviceBaseAmount != null && (
                <Detail label={t('Service base')} value={money(detail.serviceBaseAmount, locale, detail.currency)} />
              )}
              {detail.commissionAmount != null && (
                <Detail
                  label={detail.commissionRate != null ? `${t('Platform commission')} (${detail.commissionRate}%)` : t('Platform commission')}
                  value={money(detail.commissionAmount, locale, detail.currency)}
                />
              )}
              <Detail label={t('Gross payout')} value={money(detail.inspectorGrossPayout, locale, detail.currency)} />
              <Detail
                label={detail.tncnRate != null ? `${t('Tax withheld')} (${detail.tncnRate}%)` : t('Tax withheld')}
                value={money(detail.tncnAmount, locale, detail.currency)}
              />
              <Detail label={t('Payout reference')} value={detail.payoutReference} />
              <Detail label={t('Payout recorded')} value={formatTime(detail.payoutRecordedAt)} />
              {((detail.refundStatus && detail.refundStatus !== 'NONE') || (detail.refundedAmount ?? 0) > 0) && <>
                <Detail label={t('Refund status')} value={detail.refundStatus} />
                <Detail label={t('Refunded amount')} value={money(detail.refundedAmount, locale, detail.currency)} />
              </>}
            </>}
            {!inspector && <>
              <Detail label={t('Service base')} value={money(detail.serviceBaseAmount, locale, detail.currency)} />
              <Detail
                label={detail.vatRate != null ? `${t('VAT')} (${detail.vatRate}%)` : t('VAT')}
                value={money(detail.vatAmount, locale, detail.currency)}
              />
              {((detail.refundStatus && detail.refundStatus !== 'NONE') || (detail.refundedAmount ?? 0) > 0) && <>
                <Detail label={t('Refund status')} value={detail.refundStatus} />
                <Detail label={t('Refunded amount')} value={money(detail.refundedAmount, locale, detail.currency)} />
              </>}
            </>}
            <Detail label={t('Occurrence')} value={`#${detail.occurrenceIndex}`} />
          </Stack>}
        </DialogContent>
        <DialogActions>
          {detail && (
            <Button
              startIcon={<OpenInNewRoundedIcon />}
              onClick={() => navigate(`${inspector ? '/operations' : '/client'}/contracts`)}
            >
              {t('Open service request')}
            </Button>
          )}
          <Button startIcon={<ArrowBackRoundedIcon />} onClick={closeDetail}>{t('Close')}</Button>
        </DialogActions>
      </Dialog>

      {inspector && (
        <Dialog
          open={bankDialogOpen}
          onClose={() => setBankDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogContent sx={{ pt: 3 }}>
            <InspectorPayoutBankCard compact onSaved={() => setBankDialogOpen(false)} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setBankDialogOpen(false)}>{t('Close')}</Button>
          </DialogActions>
        </Dialog>
      )}

      <SepayPayoutQrDialog
        details={payoutQrDetails}
        amountVnd={
          detail && detail.inspectorNetPayout != null
            ? money(Math.round(detail.inspectorNetPayout), locale, detail.currency)
            : undefined
        }
        inspectorName={selectedManagerItem?.inspectorName}
        bankName={detail?.payout?.bankName}
        bankAccountNumber={detail?.payout?.bankAccountNumber}
        bankAccountHolder={detail?.payout?.bankAccountHolder}
        checking={payoutChecking}
        onCheckNow={() => {
          if (detail?.occurrenceId) {
            void refreshDetailPayoutStatus(detail.occurrenceId);
          }
        }}
        onMockPay={
          manager && detail && payoutQrDetails
            ? async () => {
                try {
                  await contractApi.recordOccurrencePayout(
                    detail.requestId,
                    detail.occurrenceId,
                    { payoutReference: `SEPAY-MOCK-${payoutQrDetails.orderCode}` },
                  );
                  await refreshDetailPayoutStatus(detail.occurrenceId);
                } catch (err) {
                  setPayoutError(
                    extractContractErrorText(err, 'Could not settle payout.'),
                  );
                }
              }
            : undefined
        }
        onClose={() => setPayoutQrDetails(undefined)}
      />
    </Box>
  );
}

function Detail({ label, value }: { label: string; value: string | number | null | undefined }) {
  return <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2 }}><Typography color="text.secondary">{label}</Typography><Typography sx={{ textAlign: 'right', fontWeight: 500 }}>{value ?? '—'}</Typography></Stack>;
}
