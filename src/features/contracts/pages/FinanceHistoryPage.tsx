import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
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
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import { PageHeader } from '@/shared/ui/PageHeader';
import { EmptyState } from '@/shared/ui/EmptyState';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import { StatusChip } from '@/shared/ui/StatusChip';
import { useToastStore } from '@/shared/ui/Toast';
import { useLocale } from '@/shared/i18n/LocaleProvider';
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
type RevenueFilter = 'ALL' | 'REFUNDED';

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
  const inspector = roles.includes('INSPECTOR');
  const manager = !inspector && roles.includes('MANAGER');
  const isPayoutView = manager && mode === 'payouts';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const [params, setParams] = useSearchParams();
  const page = Math.max(0, Number(params.get('page') ?? '0') || 0);
  const [payoutFilter, setPayoutFilter] = useState<PayoutFilter>('ALL');
  const [revenueFilter, setRevenueFilter] = useState<RevenueFilter>('ALL');
  const [requestError, setRequestError] = useState<string | null>(null);

  const historyQuery = useQuery({
    queryKey: ['finance-history', inspector ? 'inspector' : 'customer', page],
    enabled: !manager,
    queryFn: () => inspector
      ? contractApi.listInspectorFinanceHistory(page, 20)
      : contractApi.listCustomerFinanceHistory(page, 20),
  });

  const hasActiveFilter = isPayoutView ? payoutFilter !== 'ALL' : revenueFilter !== 'ALL';
  const managerPageSize = hasActiveFilter ? 100 : 20;
  const managerHistoryQuery = useQuery({
    queryKey: ['finance-history', 'manager', page, managerPageSize],
    enabled: manager,
    queryFn: () => contractApi.listManagerFinanceHistory(page, managerPageSize),
  });

  const activeQuery = manager ? managerHistoryQuery : historyQuery;
  const items = manager
    ? (managerHistoryQuery.data?.content ?? null)
    : (historyQuery.data?.content ?? null);
  const filteredManagerItems = useMemo(() => {
    const content = managerHistoryQuery.data?.content ?? [];
    if (isPayoutView) {
      if (payoutFilter === 'ALL') return content;
      return content.filter((item) => (item.payoutStatus ?? 'PENDING').toUpperCase() === payoutFilter);
    }
    if (revenueFilter === 'REFUNDED') {
      return content.filter((item) => item.refundedAmount > 0);
    }
    return content;
  }, [isPayoutView, managerHistoryQuery.data?.content, payoutFilter, revenueFilter]);
  const eligibleItemsInPage = useMemo(
    () =>
      (managerHistoryQuery.data?.content ?? []).filter(
        (item) => (item.payoutStatus ?? '').toUpperCase() === 'ELIGIBLE',
      ),
    [managerHistoryQuery.data?.content],
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
  const [payoutRef, setPayoutRef] = useState('');
  const [payoutBusy, setPayoutBusy] = useState(false);
  const [payoutError, setPayoutError] = useState<string | null>(null);

  const openDetail = async (item: OccurrenceFinanceHistoryItem | ManagerFinanceHistoryItem) => {
    setDetailLoading(true);
    setDetail(null);
    setPayoutError(null);
    setPayoutRef('');
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
    setPayoutRef('');
    setPayoutError(null);
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.delete('occurrence');
      return next;
    }, { replace: false });
  };

  const handleSettlePayout = async () => {
    if (!detail || !payoutRef.trim()) return;
    setPayoutBusy(true);
    setPayoutError(null);
    try {
      await contractApi.recordOccurrencePayout(detail.requestId, detail.occurrenceId, {
        payoutReference: payoutRef.trim(),
      });
      setPayoutRef('');
      showToast(t('Inspector partner payout settled.'), 'success');
      const [refreshedDetail] = await Promise.all([
        contractApi.getManagerFinanceHistoryDetail(detail.occurrenceId),
        managerHistoryQuery.refetch(),
        queryClient.invalidateQueries({ queryKey: contractQueryKeys.requests() }),
        queryClient.invalidateQueries({ queryKey: ['inspections'] }),
      ]);
      setDetail(refreshedDetail);
    } catch (err) {
      setPayoutError(extractContractErrorText(err, 'Could not settle payout.'));
    } finally {
      setPayoutBusy(false);
    }
  };

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

  const detailPayoutStatus = detail?.payout?.status ?? detail?.payoutStatus ?? 'PENDING';
  const detailCanSettlePayout = Boolean(
    isPayoutView &&
      detail &&
      detail.paymentStatus === 'PAID' &&
      !detail.payout?.heldForRefund &&
      (!['PAID', 'SETTLED'].includes(detailPayoutStatus) ||
        Boolean(detail.payout?.reference?.startsWith('AUTO-DISBURSE')) ||
        Boolean(detail.payoutReference?.startsWith('AUTO-DISBURSE'))),
  );
  const managerDialogOpen = Boolean(manager && (detailLoading || detail !== null));

  return (
    <Box className="workspace-page">
      <PageHeader title={title} breadcrumbs={[{ label: t('Operations'), to: dashboardPath }, { label: title }]} />
      <Stack spacing={2}>
        {manager && managerSummary && (
          <Paper
            variant="outlined"
            sx={{
              borderRadius: '12px',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              overflow: 'hidden',
              boxShadow: 'none',
            }}
          >
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
              }}
            >
              {isPayoutView ? (
                <>
                  <SummaryStatCell
                    label={t('Eligible for payout')}
                    value={money(eligibleTotalInPage, locale, managerSummary.currency)}
                    note={`${eligibleCountInPage} ${t('ready')}`}
                    accent={eligibleCountInPage > 0 ? 'warning' : 'default'}
                  />
                  <SummaryStatCell
                    label={t('Pending payout')}
                    value={money(managerSummary.pendingInspectorPayout, locale, managerSummary.currency)}
                    divided
                  />
                  <SummaryStatCell
                    label={t('Settled payouts')}
                    value={money(managerSummary.paidInspectorPayout, locale, managerSummary.currency)}
                    note={`TNCN ${money(managerSummary.totalTncnWithheld, locale, managerSummary.currency)}`}
                    divided
                  />
                </>
              ) : (
                <>
                  <SummaryStatCell
                    label={t('Collected (Net)')}
                    value={money(managerSummary.netPlatformInflow, locale, managerSummary.currency)}
                    note={`${managerSummary.transactionCount} ${t('transactions')}`}
                  />
                  <SummaryStatCell
                    label={t('Commission earned')}
                    value={money(managerSummary.totalCommissionEarned, locale, managerSummary.currency)}
                    note={
                      managerSummary.totalRefunded > 0
                        ? `${t('Refunded amount')}: ${money(managerSummary.totalRefunded, locale, managerSummary.currency)}`
                        : undefined
                    }
                    accent="success"
                    divided
                  />
                  <SummaryStatCell
                    label={t('VAT collected')}
                    value={money(managerSummary.totalVatAmount, locale, managerSummary.currency)}
                    divided
                  />
                </>
              )}
            </Box>
          </Paper>
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
          <Paper variant="outlined" sx={{ borderRadius: '12px', overflow: 'hidden', bgcolor: 'background.paper', boxShadow: 'none' }}>
            {manager ? (
              <>
                {(isPayoutView || (managerSummary?.totalRefunded ?? 0) > 0) && (
                  <Stack
                    direction="row"
                    spacing={0.75}
                    sx={{
                      px: 2,
                      py: 1.25,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      flexWrap: 'wrap',
                      gap: 0.75,
                      alignItems: 'center',
                    }}
                  >
                    {(isPayoutView
                      ? ([
                          { id: 'ALL', label: t('All records') },
                          {
                            id: 'ELIGIBLE',
                            label:
                              eligibleCountInPage > 0
                                ? `${t('Payout eligible')} (${eligibleCountInPage})`
                                : t('Payout eligible'),
                          },
                          { id: 'PENDING', label: t('Pending / On hold') },
                          { id: 'PAID', label: t('Payout settled') },
                        ] as const)
                      : ([
                          { id: 'ALL', label: t('All records') },
                          { id: 'REFUNDED', label: t('Refunded') },
                        ] as const)
                    ).map((option) => {
                      const active = isPayoutView
                        ? payoutFilter === option.id
                        : revenueFilter === option.id;
                      return (
                        <Chip
                          key={option.id}
                          size="small"
                          clickable
                          label={option.label}
                          color={active ? 'primary' : 'default'}
                          variant={active ? 'filled' : 'outlined'}
                          onClick={() => {
                            if (isPayoutView) {
                              setPayoutFilter(option.id as PayoutFilter);
                            } else {
                              setRevenueFilter(option.id as RevenueFilter);
                            }
                            setParams((current) => {
                              const next = new URLSearchParams(current);
                              next.delete('page');
                              return next;
                            });
                          }}
                          sx={{
                            borderRadius: '8px',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            borderColor: active ? undefined : 'divider',
                          }}
                        />
                      );
                    })}
                  </Stack>
                )}

                {filteredManagerItems.length === 0 ? (
                  <Box sx={{ p: 4 }}>
                    <EmptyState
                      title={
                        isPayoutView
                          ? t('No matching payout records')
                          : t('No matching revenue records')
                      }
                    />
                  </Box>
                ) : (
                  <TableContainer>
                    <Table size="medium">
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
                                {formatShortDate(item.paymentConfirmedAt)}
                              </TableCell>
                              {isPayoutView ? (
                                <>
                                  <TableCell>
                                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                                      {item.inspectorName ?? '—'}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                      {item.assetName ?? t('Asset')}
                                    </Typography>
                                    {subtitle && (
                                      <Typography variant="caption" color="text.secondary">
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
                                  <TableCell>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {item.assetName ?? t('Asset')}
                                    </Typography>
                                    {subtitle && (
                                      <Typography variant="caption" color="text.secondary">
                                        {subtitle}
                                      </Typography>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                      {item.customerName ?? '—'}
                                    </Typography>
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
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
              <Typography variant="body2" color="text.secondary">{total} {t('records')}</Typography>
              <Stack direction="row" sx={{ gap: 1 }}>
                <Button disabled={page === 0} onClick={() => setParams({ page: String(page - 1) })}>{t('Previous')}</Button>
                <Button disabled={(page + 1) * pageSize >= total} onClick={() => setParams({ page: String(page + 1) })}>{t('Next')}</Button>
              </Stack>
            </Stack>
          </Paper>
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
                    p: 1.75,
                    borderRadius: '10px',
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                  }}
                >
                  <Stack spacing={1.25}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {t('Settle Inspector payout')}
                    </Typography>
                    {payoutError && (
                      <Alert severity="error" onClose={() => setPayoutError(null)} sx={{ borderRadius: '8px' }}>
                        {payoutError}
                      </Alert>
                    )}
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                      <TextField
                        size="small"
                        placeholder={t('Bank transfer reference (e.g. UNC-VCB-20261110)')}
                        value={payoutRef}
                        onChange={(e) => setPayoutRef(e.target.value)}
                        sx={{ flex: 1 }}
                      />
                      <LoadingButton
                        size="small"
                        variant="contained"
                        color="primary"
                        loading={payoutBusy}
                        disabled={!payoutRef.trim()}
                        onClick={() => void handleSettlePayout()}
                        sx={{
                          textTransform: 'none',
                          fontWeight: 650,
                          whiteSpace: 'nowrap',
                          borderRadius: '8px',
                          boxShadow: 'none',
                        }}
                      >
                        {t('Settle Inspector payout')}
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
    </Box>
  );
}

function Detail({ label, value }: { label: string; value: string | number | null | undefined }) {
  return <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2 }}><Typography color="text.secondary">{label}</Typography><Typography sx={{ textAlign: 'right', fontWeight: 500 }}>{value ?? '—'}</Typography></Stack>;
}

function SummaryStatCell({
  label,
  value,
  note,
  accent = 'default',
  divided = false,
}: {
  label: string;
  value: string;
  note?: string | undefined;
  accent?: 'default' | 'success' | 'warning';
  divided?: boolean;
}) {
  const valueColor =
    accent === 'success'
      ? 'success.main'
      : accent === 'warning'
        ? 'warning.dark'
        : 'text.primary';
  return (
    <Box
      sx={{
        p: { xs: 2, sm: 2.25 },
        borderTop: divided ? { xs: '1px solid', sm: 'none' } : 'none',
        borderLeft: divided ? { xs: 'none', sm: '1px solid' } : 'none',
        borderColor: 'divider',
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
        {label}
      </Typography>
      <Typography
        variant="h6"
        sx={{
          fontWeight: 700,
          color: valueColor,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </Typography>
      {note && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.35, fontVariantNumeric: 'tabular-nums' }}>
          {note}
        </Typography>
      )}
    </Box>
  );
}
