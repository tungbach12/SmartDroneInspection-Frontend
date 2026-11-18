import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import PaidOutlinedIcon from '@mui/icons-material/PaidOutlined';
import { PageHeader } from '@/shared/ui/PageHeader';
import { EmptyState } from '@/shared/ui/EmptyState';
import { MetricCard } from '@/shared/ui/MetricCard';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { useAuthStore } from '@/features/auth/store/authStore';
import {
  contractApi,
  type ManagerFinanceHistoryItem,
  type OccurrenceFinanceHistoryDetail,
  type OccurrenceFinanceHistoryItem,
} from '../api/contractApi';

function money(value: number | null | undefined, locale: string, currency = 'VND') {
  if (value == null) return '—';
  return new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function FinanceHistoryPage() {
  const { locale, t, formatDateTime } = useLocale();
  const roles = useAuthStore((state) => state.roles);
  const inspector = roles.includes('INSPECTOR');
  const manager = !inspector && roles.includes('MANAGER');
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const page = Math.max(0, Number(params.get('page') ?? '0') || 0);
  const [requestError, setRequestError] = useState<string | null>(null);

  const historyQuery = useQuery({
    queryKey: ['finance-history', inspector ? 'inspector' : 'customer', page],
    enabled: !manager,
    queryFn: () => inspector
      ? contractApi.listInspectorFinanceHistory(page, 20)
      : contractApi.listCustomerFinanceHistory(page, 20),
  });

  const managerHistoryQuery = useQuery({
    queryKey: ['finance-history', 'manager', page],
    enabled: manager,
    queryFn: () => contractApi.listManagerFinanceHistory(page, 20),
  });

  const activeQuery = manager ? managerHistoryQuery : historyQuery;
  const items = manager
    ? (managerHistoryQuery.data?.content ?? null)
    : (historyQuery.data?.content ?? null);
  const total = activeQuery.data?.totalElements ?? 0;
  const loading = activeQuery.isLoading;
  const pageSize = 20;
  const error =
    requestError ??
    (activeQuery.isError ? t('Unable to load payment history. Please try again.') : null);

  const [detail, setDetail] = useState<OccurrenceFinanceHistoryDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const openDetail = async (item: OccurrenceFinanceHistoryItem | ManagerFinanceHistoryItem) => {
    setDetailLoading(true);
    setDetail(null);
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
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.delete('occurrence');
      return next;
    }, { replace: false });
  };

  const title = manager
    ? t('Platform revenue & commissions')
    : inspector
      ? t('Payout history')
      : t('Payment history');
  const amountLabel = inspector ? t('Net received') : t('Amount paid');
  const formatTime = (value: string | null) => value ? formatDateTime(value) : '—';
  const dashboardPath = manager
    ? '/manager/dashboard'
    : inspector
      ? '/operations/dashboard'
      : '/client/dashboard';
  const managerSummary = managerHistoryQuery.data?.summary ?? null;

  return (
    <Box className="workspace-page">
      <PageHeader title={title} breadcrumbs={[{ label: t('Operations'), to: dashboardPath }, { label: title }]} />
      <Stack spacing={2}>
        <Alert severity="info" icon={<PaidOutlinedIcon />}>
          {manager
            ? t('This history shows all customer payments collected into the platform, earned commission, taxes, and inspector payouts.')
            : inspector
              ? t('This history shows payouts actually recorded as paid to your account.')
              : t('This history shows confirmed service payments made by your organization.')}
        </Alert>

        {manager && managerSummary && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 2,
            }}
          >
            <MetricCard
              label={t('Platform inflow (Net)')}
              value={money(managerSummary.netPlatformInflow, locale, managerSummary.currency)}
              change={`${managerSummary.transactionCount} ${t('transactions')}`}
              positive
              subtext={`${t('Gross collected')}: ${money(managerSummary.totalCustomerPaid, locale, managerSummary.currency)}`}
              iconType="building"
            />
            <MetricCard
              label={t('Commission earned')}
              value={money(managerSummary.totalCommissionEarned, locale, managerSummary.currency)}
              change="COMMISSION"
              positive
              subtext={
                managerSummary.totalRefunded > 0
                  ? `${t('Refunded amount')}: ${money(managerSummary.totalRefunded, locale, managerSummary.currency)}`
                  : t('Platform commission')
              }
              iconType="check-circle"
            />
            <MetricCard
              label={t('Inspector payout')}
              value={money(managerSummary.paidInspectorPayout, locale, managerSummary.currency)}
              change={managerSummary.pendingInspectorPayout > 0 ? t('Pending payout') : 'PAID'}
              positive={managerSummary.pendingInspectorPayout === 0}
              subtext={`${t('Pending payout')}: ${money(managerSummary.pendingInspectorPayout, locale, managerSummary.currency)}`}
              iconType="shield"
            />
            <MetricCard
              label={t('Taxes (VAT & TNCN)')}
              value={money(
                managerSummary.totalVatAmount + managerSummary.totalTncnWithheld,
                locale,
                managerSummary.currency,
              )}
              change="TAX"
              positive
              subtext={`VAT ${money(managerSummary.totalVatAmount, locale, managerSummary.currency)} · TNCN ${money(managerSummary.totalTncnWithheld, locale, managerSummary.currency)}`}
              iconType="alert"
            />
          </Box>
        )}

        {error && <Alert severity="error" onClose={() => setRequestError(null)}>{error}</Alert>}
        {loading && <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}><CircularProgress /></Box>}

        {!loading && items?.length === 0 && (
          <EmptyState
            title={manager ? t('No platform revenue records yet') : t('No payment history yet')}
            description={t('Confirmed payments will appear here.')}
          />
        )}

        {!loading && Boolean(items?.length) && (
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
            {manager ? (
              <TableContainer>
                <Table size="medium">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('Date')}</TableCell>
                      <TableCell>{t('Inspection')}</TableCell>
                      <TableCell>{t('Customer')} / {t('Inspector')}</TableCell>
                      <TableCell align="right">{t('Collected')}</TableCell>
                      <TableCell align="right">{t('Platform commission')}</TableCell>
                      <TableCell align="right">{t('Payout')}</TableCell>
                      <TableCell>{t('Method')}</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(items as ManagerFinanceHistoryItem[]).map((item) => (
                      <TableRow
                        key={item.occurrenceId}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => void openDetail(item)}
                      >
                        <TableCell>{formatTime(item.paymentConfirmedAt)}</TableCell>
                        <TableCell>
                          <Typography sx={{ fontWeight: 600 }}>
                            {item.assetName ?? t('Asset')}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.requestDescription ?? `${t('Occurrence')} #${item.occurrenceIndex}`}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {item.customerName ?? '—'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            → {item.inspectorName ?? '—'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography sx={{ fontWeight: 700 }}>
                            {money(item.netPlatformInflow, locale, item.currency)}
                          </Typography>
                          {item.refundedAmount > 0 && (
                            <Typography variant="caption" color="error.main" sx={{ display: 'block' }}>
                              -{money(item.refundedAmount, locale, item.currency)}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.75} sx={{ justifyContent: 'flex-end', alignItems: 'center' }}>
                            <Typography sx={{ fontWeight: 700, color: 'success.main' }}>
                              {money(item.netCommissionAmount, locale, item.currency)}
                            </Typography>
                            {item.commissionRate != null && (
                              <Chip
                                size="small"
                                label={`${item.commissionRate}%`}
                                sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }}
                              />
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {money(item.inspectorNetPayout, locale, item.currency)}
                          </Typography>
                          <Chip
                            size="small"
                            color={item.payoutStatus === 'PAID' ? 'success' : 'warning'}
                            label={t(item.payoutStatus)}
                            sx={{ mt: 0.25, height: 20, fontSize: '0.6875rem' }}
                          />
                        </TableCell>
                        <TableCell>{item.paymentMethod ?? '—'}</TableCell>
                        <TableCell>
                          <Button size="small" endIcon={<OpenInNewRoundedIcon />}>
                            {t('Details')}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Table size="medium">
                <TableHead><TableRow>
                  <TableCell>{t('Date')}</TableCell>
                  <TableCell>{t('Inspection')}</TableCell>
                  <TableCell>{inspector ? t('Customer') : t('Inspector')}</TableCell>
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
                    <TableCell>{item.counterpartyName ?? '—'}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{money(item.amount, locale, item.currency)}</TableCell>
                    <TableCell>{item.paymentMethod ?? '—'}</TableCell>
                    <TableCell><Chip size="small" color="success" label={t(item.status)} /></TableCell>
                    <TableCell><Button size="small" endIcon={<OpenInNewRoundedIcon />}>{t('Details')}</Button></TableCell>
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

      <Dialog open={detailLoading || detail !== null} onClose={closeDetail} fullWidth maxWidth="sm">
        <DialogTitle>
          {manager
            ? t('Platform finance details')
            : inspector
              ? t('Payout details')
              : t('Payment details')}
        </DialogTitle>
        <DialogContent dividers>
          {detailLoading && <Box sx={{ display: 'grid', placeItems: 'center', py: 4 }}><CircularProgress /></Box>}
          {detail && <Stack spacing={2}>
            {manager ? (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="overline">{t('Total collected (VAT incl.)')}</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {money(detail.paymentAmount ?? detail.totalPrice, locale, detail.currency)}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: { sm: 'right' } }}>
                  <Typography variant="overline" color="success.main">{t('Platform commission')}</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: 'success.main' }}>
                    {money(detail.commissionAmount, locale, detail.currency)}
                  </Typography>
                </Box>
              </Stack>
            ) : (
              <Box>
                <Typography variant="overline">{inspector ? t('Net received') : t('Amount paid')}</Typography>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {money(inspector ? detail.inspectorNetPayout : detail.paymentAmount, locale, detail.currency)}
                </Typography>
              </Box>
            )}
            <Divider />
            <Detail label={t('Status')} value={inspector ? detail.payoutStatus : detail.paymentStatus} />
            <Detail label={t('Payment method')} value={detail.payment?.method} />
            <Detail label={t('Payment confirmed')} value={formatTime(detail.paymentConfirmedAt)} />
            {manager && <>
              <Detail label={t('Service base')} value={money(detail.serviceBaseAmount, locale, detail.currency)} />
              <Detail
                label={detail.vatRate != null ? `${t('VAT')} (${detail.vatRate}%)` : t('VAT')}
                value={money(detail.vatAmount, locale, detail.currency)}
              />
              <Detail
                label={detail.commissionRate != null ? `${t('Platform commission')} (${detail.commissionRate}%)` : t('Platform commission')}
                value={money(detail.commissionAmount, locale, detail.currency)}
              />
              <Detail label={t('Gross payout')} value={money(detail.inspectorGrossPayout, locale, detail.currency)} />
              <Detail
                label={detail.tncnRate != null ? `${t('Tax withheld')} (${detail.tncnRate}%)` : t('Tax withheld')}
                value={money(detail.tncnAmount, locale, detail.currency)}
              />
              <Detail label={t('Inspector payout')} value={money(detail.inspectorNetPayout, locale, detail.currency)} />
              <Detail label={t('Payment reference')} value={detail.payment?.reference} />
              <Detail label={t('Payout status')} value={detail.payoutStatus} />
              <Detail label={t('Payout reference')} value={detail.payoutReference} />
              <Detail label={t('Payout recorded')} value={formatTime(detail.payoutRecordedAt)} />
              <Detail label={t('Refund status')} value={detail.refundStatus} />
              <Detail label={t('Refunded amount')} value={money(detail.refundedAmount, locale, detail.currency)} />
            </>}
            {inspector && <>
              <Detail label={t('Gross payout')} value={money(detail.inspectorGrossPayout, locale, detail.currency)} />
              <Detail label={t('Tax withheld')} value={money(detail.tncnAmount, locale, detail.currency)} />
              <Detail label={t('Payout reference')} value={detail.payoutReference} />
              <Detail label={t('Payout recorded')} value={formatTime(detail.payoutRecordedAt)} />
              <Detail label={t('Refund status')} value={detail.refundStatus} />
              <Detail label={t('Refunded amount')} value={money(detail.refundedAmount, locale, detail.currency)} />
            </>}
            {!inspector && !manager && <>
              <Detail label={t('Service base')} value={money(detail.serviceBaseAmount, locale, detail.currency)} />
              <Detail label={t('VAT')} value={money(detail.vatAmount, locale, detail.currency)} />
              <Detail label={t('Payment reference')} value={detail.payment?.reference} />
              <Detail label={t('Refund status')} value={detail.refundStatus} />
              <Detail label={t('Refunded amount')} value={money(detail.refundedAmount, locale, detail.currency)} />
            </>}
            <Detail label={t('Occurrence')} value={`#${detail.occurrenceIndex}`} />
          </Stack>}
        </DialogContent>
        <DialogActions>
          {detail && (
            <Button
              startIcon={<OpenInNewRoundedIcon />}
              onClick={() =>
                navigate(
                  manager
                    ? `/manager/contracts?requestId=${detail.requestId}`
                    : `${inspector ? '/operations' : '/client'}/contracts`,
                )
              }
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
