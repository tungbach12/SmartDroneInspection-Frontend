import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  Divider,
  InputAdornment,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import Add from '@mui/icons-material/Add';
import RefreshRounded from '@mui/icons-material/RefreshRounded';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import HourglassEmptyRounded from '@mui/icons-material/HourglassEmptyRounded';
import PaidOutlined from '@mui/icons-material/PaidOutlined';
import SearchRounded from '@mui/icons-material/SearchRounded';
import { getSectionPath } from '@/app/permissions/accessPolicy';
import { useAssets } from '@/features/assets/hooks/useAssets';
import { useAuthStore } from '@/features/auth/store/authStore';
import { contractApi, type ServiceRequest } from '@/features/contracts/api/contractApi';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { EmptyState } from '@/shared/ui/EmptyState';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryState } from '@/shared/ui/QueryState';
import type { InspectionListItem } from '../api/inspectionApi';
import { useInspections } from '../hooks/useInspections';

type CustomerQuickFilter = 'ALL' | 'IN_PROGRESS' | 'REPORT_READY' | 'ACTION_NEEDED';

interface EnrichedCustomerInspection extends InspectionListItem {
  resolvedAssetName: string;
  resolvedAssetCode: string | null;
  resolvedObjective: string;
  resolvedReportAccepted: boolean;
  resolvedPaymentStatus: 'PAID' | 'PAYMENT_DUE' | 'PENDING' | 'NOT_APPLICABLE';
  resolvedPaymentAmount: number | null;
  stageIndex: number;
  stageShortLabel: string;
}

function computeStageInfo(row: InspectionListItem): { index: number; shortLabel: string } {
  if (row.reportStatus === 'PUBLISHED') {
    return { index: 5, shortLabel: 'Step 5/5 · Report published' };
  }
  if (
    row.status === 'UNDER_REVIEW' ||
    row.reportStatus === 'SUBMITTED' ||
    row.reportStatus === 'APPROVED'
  ) {
    return { index: 4, shortLabel: 'Step 4/5 · In technical review' };
  }
  if (row.status === 'FIELD_COMPLETED') {
    return { index: 3, shortLabel: 'Step 3/5 · AI & findings' };
  }
  if (row.status === 'IN_PROGRESS') {
    return { index: 2, shortLabel: 'Step 2/5 · Aerial flight' };
  }
  return { index: 1, shortLabel: 'Step 1/5 · Scheduled' };
}

/**
 * Customer Inspections & Deliverables Page (`/client/inspections`).
 *
 * Designed for low visual noise and full responsiveness:
 * - Desktop (`md+`): 4-column table (Asset & Scope, Status & Report, Service Fee, Action)
 * - Tablet/Mobile (`< md`): stacked responsive cards with zero horizontal overflow
 */
export function CustomerInspectionsPage() {
  const { t, formatDate, formatNumber } = useLocale();
  const navigate = useNavigate();

  const [quickFilter, setQuickFilter] = useState<CustomerQuickFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const listFilters = useMemo(() => ({ page, pageSize }), [page, pageSize]);
  const inspections = useInspections(listFilters, true);
  const assetsQuery = useAssets({ page: 1, pageSize: 100 }, true);
  const accessToken = useAuthStore((state) => state.accessToken);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);

  useEffect(() => {
    if (!accessToken || !accessToken.includes('.')) return;
    let active = true;
    contractApi
      .listRequests()
      .then((res) => {
        if (active && Array.isArray(res)) {
          setServiceRequests(res);
        }
      })
      .catch(() => {
        // Fallback gracefully in unit tests or offline
      });
    return () => {
      active = false;
    };
  }, [accessToken]);

  const assetById = useMemo(() => {
    const map = new Map<string, { name: string; code: string }>();
    for (const asset of assetsQuery.data?.items ?? []) {
      map.set(asset.id, { name: asset.name, code: asset.code });
    }
    return map;
  }, [assetsQuery.data?.items]);

  const occurrenceByInspectionId = useMemo(() => {
    const map = new Map<
      string,
      {
        description: string;
        totalPrice: number | null;
        paymentStatus: string;
        reportAccepted: boolean;
      }
    >();
    for (const req of serviceRequests) {
      const quotePriceVnd =
        req.quotes?.find((q) => q.versionNo === req.acceptedQuoteVersion)?.pricePerOccurrenceVnd ??
        req.quotes?.[0]?.pricePerOccurrenceVnd ??
        null;
      for (const occ of req.occurrences ?? []) {
        if (!occ.inspectionId) continue;
        map.set(occ.inspectionId, {
          description: req.description,
          totalPrice: occ.totalPrice ?? quotePriceVnd ?? null,
          paymentStatus: occ.paymentStatus ?? 'PENDING',
          reportAccepted: Boolean(occ.reportAcceptedAt),
        });
      }
    }
    return map;
  }, [serviceRequests]);

  const enrichedItems = useMemo<EnrichedCustomerInspection[]>(() => {
    const rawItems = inspections.data?.items ?? [];
    return rawItems.map((row) => {
      const asset = assetById.get(row.assetId);
      const occ = occurrenceByInspectionId.get(row.id);
      const stage = computeStageInfo(row);

      const resolvedAssetName =
        row.assetName || asset?.name || `${t('Asset')} #${row.assetId.slice(0, 8)}`;
      const resolvedAssetCode = row.assetCode || asset?.code || null;
      const resolvedObjective =
        row.objective || occ?.description || `${t('Inspection')} #${row.id.slice(0, 8)}`;

      const resolvedPaymentAmount =
        row.paymentAmount != null ? row.paymentAmount : (occ?.totalPrice ?? null);
      const rawPaymentStatus = (
        row.paymentStatus ??
        occ?.paymentStatus ??
        'NOT_APPLICABLE'
      ).toUpperCase();
      const resolvedPaymentStatus: EnrichedCustomerInspection['resolvedPaymentStatus'] =
        rawPaymentStatus === 'PAID'
          ? 'PAID'
          : rawPaymentStatus === 'PAYMENT_DUE'
            ? 'PAYMENT_DUE'
            : rawPaymentStatus === 'PENDING'
              ? 'PENDING'
              : 'NOT_APPLICABLE';
      const resolvedReportAccepted = Boolean(
        row.reportAccepted ?? occ?.reportAccepted ?? resolvedPaymentStatus === 'PAID',
      );

      return {
        ...row,
        resolvedAssetName,
        resolvedAssetCode,
        resolvedObjective,
        resolvedReportAccepted,
        resolvedPaymentStatus,
        resolvedPaymentAmount,
        stageIndex: stage.index,
        stageShortLabel: stage.shortLabel,
      };
    });
  }, [inspections.data?.items, assetById, occurrenceByInspectionId, t]);

  const inProgressCount = enrichedItems.filter(
    (item) => item.reportStatus !== 'PUBLISHED' && item.status !== 'CANCELLED',
  ).length;
  const publishedReportsCount = enrichedItems.filter(
    (item) => item.reportStatus === 'PUBLISHED',
  ).length;
  const actionNeededItems = enrichedItems.filter(
    (item) =>
      item.resolvedPaymentStatus === 'PAYMENT_DUE' ||
      (item.reportStatus === 'PUBLISHED' && !item.resolvedReportAccepted) ||
      (item.pendingAction === 'CORRECTIVE_DISPOSITION' && item.inspectionType !== 'RE_INSPECTION'),
  );
  const totalPaidVnd = enrichedItems
    .filter((item) => item.resolvedPaymentStatus === 'PAID')
    .reduce((sum, item) => sum + (item.resolvedPaymentAmount ?? 0), 0);

  const displayedItems = useMemo(() => {
    return enrichedItems.filter((item) => {
      if (quickFilter === 'IN_PROGRESS' && item.reportStatus === 'PUBLISHED') return false;
      if (quickFilter === 'REPORT_READY' && item.reportStatus !== 'PUBLISHED') return false;
      if (quickFilter === 'ACTION_NEEDED') {
        const needsAction =
          item.resolvedPaymentStatus === 'PAYMENT_DUE' ||
          (item.reportStatus === 'PUBLISHED' && !item.resolvedReportAccepted) ||
          (item.pendingAction === 'CORRECTIVE_DISPOSITION' &&
            item.inspectionType !== 'RE_INSPECTION');
        if (!needsAction) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const haystack = [
          item.resolvedAssetName,
          item.resolvedAssetCode ?? '',
          item.resolvedObjective,
          item.id,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [enrichedItems, quickFilter, searchQuery]);

  const openPrimaryDestination = (row: EnrichedCustomerInspection) => {
    if (row.reportStatus === 'PUBLISHED') {
      navigate(`${getSectionPath('client', 'inspections')}/${row.id}/report`);
      return;
    }
    navigate(`${getSectionPath('client', 'inspections')}/${row.id}/tracking`);
  };

  const openMaintenanceHandoff = (inspectionId: string) => {
    navigate(`${getSectionPath('client', 'inspections')}/${inspectionId}/corrective`);
  };

  const formatVnd = (amount: number | null) => {
    if (amount == null || amount <= 0) return null;
    return `${formatNumber(amount)} ₫`;
  };

  return (
    <Box className="workspace-page workspace-page--inspections">
      <PageHeader
        title={t('Nhật ký & Lịch sử các đợt kiểm tra')}
        subtitle={t('Theo dõi toàn bộ lịch sử đợt kiểm tra, tiến độ bay thực địa, báo cáo thẩm định và kết quả khắc phục công trình.')}
        actions={
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshRounded />}
              onClick={() => void inspections.refetch()}
              disabled={inspections.isFetching}
              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
            >
              {inspections.isFetching ? t('Đang tải…') : t('Làm mới')}
            </Button>
            <Button
              variant="contained"
              size="medium"
              startIcon={<Add />}
              onClick={() => navigate('/client/contracts')}
              sx={{
                borderRadius: '8px',
                px: 2,
                bgcolor: '#087E8B',
                fontSize: '0.875rem',
                fontWeight: 600,
                textTransform: 'none',
                boxShadow: 'none',
                '&:hover': { bgcolor: '#066B70' },
              }}
            >
              {t('Yêu cầu kiểm định mới')}
            </Button>
          </Stack>
        }
      />

      <Stack spacing={2}>
        {/* Clean Filter, Search & Financial Snapshot Bar */}
        <Paper
          variant="outlined"
          sx={{
            p: 1.25,
            borderRadius: '10px',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1.25}
            sx={{ alignItems: { md: 'center' }, justifyContent: 'space-between' }}
          >
            <Stack
              direction="row"
              spacing={0.75}
              sx={{
                overflowX: 'auto',
                pb: { xs: 0.25, md: 0 },
                '&::-webkit-scrollbar': { display: 'none' },
                scrollbarWidth: 'none',
              }}
            >
              {(
                [
                  { id: 'ALL', label: `${t('All')} (${enrichedItems.length})` },
                  { id: 'IN_PROGRESS', label: `${t('In progress')} (${inProgressCount})` },
                  { id: 'REPORT_READY', label: `${t('Report available')} (${publishedReportsCount})` },
                  {
                    id: 'ACTION_NEEDED',
                    label: `${t('Action needed')} (${actionNeededItems.length})`,
                  },
                ] as const
              ).map((tab) => {
                const active = quickFilter === tab.id;
                return (
                  <Button
                    key={tab.id}
                    size="small"
                    variant={active ? 'contained' : 'text'}
                    onClick={() => setQuickFilter(tab.id)}
                    sx={{
                      borderRadius: '8px',
                      textTransform: 'none',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      px: 1.5,
                      py: 0.6,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      boxShadow: 'none',
                      color: active ? 'primary.contrastText' : 'text.secondary',
                    }}
                  >
                    {tab.label}
                  </Button>
                );
              })}
            </Stack>

            <Stack
              direction="row"
              spacing={1.5}
              sx={{ alignItems: 'center', width: { xs: '100%', md: 'auto' } }}
            >
              <TextField
                size="small"
                placeholder={t('Search asset, code, or scope…')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ width: { xs: '100%', md: 240 }, flexShrink: 0 }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchRounded sx={{ fontSize: 18, color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              {totalPaidVnd > 0 && (
                <Chip
                  icon={<PaidOutlined sx={{ fontSize: '15px !important', color: '#176B52' }} />}
                  label={`${formatNumber(totalPaidVnd)} ₫ ${t('settled')}`}
                  variant="outlined"
                  size="small"
                  sx={{
                    height: 32,
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: 650,
                    color: '#176B52',
                    borderColor: 'rgba(23, 107, 82, 0.3)',
                    bgcolor: 'rgba(23, 107, 82, 0.04)',
                    display: { xs: 'none', sm: 'inline-flex' },
                    flexShrink: 0,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                />
              )}
            </Stack>
          </Stack>
        </Paper>

        {/* Inspections Content: Responsive Desktop Table (`md+`) & Mobile Cards (`< md`) */}
        <QueryState
          isLoading={inspections.isLoading}
          error={inspections.error}
          isEmpty={displayedItems.length === 0}
          onRetry={() => void inspections.refetch()}
          loadingLabel={t('Loading inspections…')}
          empty={
            <EmptyState
              title={t('No inspections available')}
              description={
                quickFilter !== 'ALL' || searchQuery.trim()
                  ? t('No inspection missions match your current filter criteria.')
                  : t('Inspections scheduled for your organization will appear here.')
              }
            />
          }
        >
          <Paper
            variant="outlined"
            sx={{
              overflow: 'hidden',
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: '10px',
              boxShadow: 'none',
            }}
          >
            {/* Desktop Table (`md+`) */}
            <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}>
              <Table aria-label={t('Inspections table')}>
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{
                        bgcolor: 'background.default',
                        color: 'text.secondary',
                        fontSize: '0.75rem',
                        fontWeight: 650,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        py: 1.25,
                        px: 2.5,
                      }}
                    >
                      {t('Asset & Scope')}
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: 'background.default',
                        color: 'text.secondary',
                        fontSize: '0.75rem',
                        fontWeight: 650,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        py: 1.25,
                        px: 2,
                        width: 240,
                      }}
                    >
                      {t('Report & Progress')}
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: 'background.default',
                        color: 'text.secondary',
                        fontSize: '0.75rem',
                        fontWeight: 650,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        py: 1.25,
                        px: 2,
                        width: 190,
                      }}
                    >
                      {t('Service Fee')}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        bgcolor: 'background.default',
                        color: 'text.secondary',
                        fontSize: '0.75rem',
                        fontWeight: 650,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        py: 1.25,
                        px: 2.5,
                        width: 220,
                      }}
                    >
                      {t('Action')}
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {displayedItems.map((row) => {
                    const isPublished = row.reportStatus === 'PUBLISHED';
                    const needsMaintenance =
                      row.pendingAction === 'CORRECTIVE_DISPOSITION' &&
                      row.inspectionType !== 'RE_INSPECTION';
                    const feeDisplay = formatVnd(row.resolvedPaymentAmount);

                    return (
                      <TableRow
                        key={row.id}
                        hover
                        onClick={() => openPrimaryDestination(row)}
                        onKeyDown={(event) => {
                          if (
                            event.target === event.currentTarget &&
                            (event.key === 'Enter' || event.key === ' ')
                          ) {
                            event.preventDefault();
                            openPrimaryDestination(row);
                          }
                        }}
                        tabIndex={0}
                        sx={{
                          cursor: 'pointer',
                          '&:hover': { bgcolor: 'action.hover' },
                        }}
                      >
                        {/* Col 1: Asset & Scope (2 concise lines) */}
                        <TableCell sx={{ py: 1.75, px: 2.5 }}>
                          <Stack spacing={0.5}>
                            <Stack
                              direction="row"
                              spacing={1}
                              sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.5 }}
                            >
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: 650, color: 'text.primary', fontSize: '0.875rem' }}
                              >
                                {row.resolvedAssetName}
                              </Typography>
                              {row.resolvedAssetCode && (
                                <Chip
                                  size="small"
                                  label={row.resolvedAssetCode}
                                  variant="outlined"
                                  sx={{
                                    height: 20,
                                    borderRadius: '5px',
                                    fontSize: '0.75rem',
                                    fontFamily: 'monospace',
                                    fontWeight: 600,
                                  }}
                                />
                              )}
                              {row.inspectionType === 'RE_INSPECTION' && (
                                <Chip
                                  size="small"
                                  color="secondary"
                                  label={t('Re-inspection')}
                                  sx={{
                                    height: 20,
                                    borderRadius: '5px',
                                    fontSize: '0.75rem',
                                    fontWeight: 650,
                                  }}
                                />
                              )}
                            </Stack>

                            <Typography
                              variant="caption"
                              sx={{
                                color: 'text.secondary',
                                display: 'block',
                                fontVariantNumeric: 'tabular-nums',
                              }}
                            >
                              {row.resolvedObjective}
                              {row.plannedStartAt
                                ? ` · ${formatDate(new Date(row.plannedStartAt), {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}`
                                : ''}
                            </Typography>
                          </Stack>
                        </TableCell>

                        {/* Col 2: Consolidated Report & Progress */}
                        <TableCell sx={{ py: 1.75, px: 2 }}>
                          {isPublished ? (
                            <Stack spacing={0.5}>
                              <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                                <CheckCircleRounded sx={{ fontSize: 16, color: '#176B52' }} />
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: 650,
                                    color: '#176B52',
                                    fontSize: '0.875rem',
                                    fontVariantNumeric: 'tabular-nums',
                                  }}
                                >
                                  {t('Report ready')} · v{row.reportVersionNo ?? 1}
                                </Typography>
                              </Stack>
                              <Typography
                                variant="caption"
                                sx={{
                                  color: row.resolvedReportAccepted ? 'text.secondary' : '#8C520B',
                                  fontWeight: row.resolvedReportAccepted ? 500 : 650,
                                }}
                              >
                                {row.resolvedReportAccepted
                                  ? t('✓ Accepted')
                                  : t('● Awaiting your acceptance')}
                              </Typography>
                            </Stack>
                          ) : (
                            <Stack spacing={0.5}>
                              <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                                <HourglassEmptyRounded sx={{ fontSize: 16, color: '#225F85' }} />
                                <Typography
                                  variant="body2"
                                  sx={{ fontWeight: 600, color: '#225F85', fontSize: '0.875rem' }}
                                >
                                  {t(row.stageShortLabel)}
                                </Typography>
                              </Stack>
                              <Stack direction="row" spacing={0.5} sx={{ maxWidth: 120, pt: 0.25 }}>
                                {[1, 2, 3, 4, 5].map((step) => (
                                  <Box
                                    key={step}
                                    sx={{
                                      flex: 1,
                                      height: 3.5,
                                      borderRadius: '3px',
                                      bgcolor:
                                        step <= row.stageIndex
                                          ? 'primary.main'
                                          : 'divider',
                                    }}
                                  />
                                ))}
                              </Stack>
                            </Stack>
                          )}
                        </TableCell>

                        {/* Col 3: Service Fee (Clean Amount + Compact Badge) */}
                        <TableCell sx={{ py: 1.75, px: 2 }}>
                          <Stack spacing={0.5} sx={{ alignItems: 'flex-start' }}>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 700,
                                color: 'text.primary',
                                fontSize: '0.875rem',
                                fontVariantNumeric: 'tabular-nums',
                              }}
                            >
                              {feeDisplay ?? t('Included')}
                            </Typography>
                            {row.resolvedPaymentStatus === 'PAID' ? (
                              <Chip
                                size="small"
                                label={t('Paid')}
                                sx={{
                                  height: 20,
                                  borderRadius: '5px',
                                  fontSize: '0.75rem',
                                  fontWeight: 650,
                                  bgcolor: 'rgba(23, 107, 82, 0.1)',
                                  color: '#176B52',
                                }}
                              />
                            ) : row.resolvedPaymentStatus === 'PAYMENT_DUE' ? (
                              <Chip
                                size="small"
                                label={t('Payment due via PayOS')}
                                sx={{
                                  height: 20,
                                  borderRadius: '5px',
                                  fontSize: '0.75rem',
                                  fontWeight: 650,
                                  bgcolor: 'rgba(140, 82, 11, 0.12)',
                                  color: '#8C520B',
                                }}
                              />
                            ) : (
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                {isPublished ? t('Accept to pay') : t('Billed on report')}
                              </Typography>
                            )}
                          </Stack>
                        </TableCell>

                        {/* Col 4: Actions (Horizontal on single row) */}
                        <TableCell align="right" sx={{ py: 1.75, px: 2.5 }}>
                          <Stack
                            direction="row"
                            spacing={1}
                            sx={{ justifyContent: 'flex-end', alignItems: 'center' }}
                          >
                            {needsMaintenance && (
                              <Button
                                size="small"
                                variant="text"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openMaintenanceHandoff(row.id);
                                }}
                                sx={{
                                  borderRadius: '8px',
                                  fontWeight: 600,
                                  fontSize: '0.75rem',
                                  textTransform: 'none',
                                  color: '#8C520B',
                                  px: 1,
                                  py: 0.5,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {t('Maintenance')}
                              </Button>
                            )}
                            <Button
                              size="small"
                              variant={
                                isPublished && !row.resolvedReportAccepted ? 'contained' : 'outlined'
                              }
                              onClick={(event) => {
                                event.stopPropagation();
                                openPrimaryDestination(row);
                              }}
                              endIcon={<ArrowForwardRounded sx={{ fontSize: 14 }} />}
                              sx={{
                                borderRadius: '8px',
                                fontWeight: 600,
                                fontSize: '0.75rem',
                                textTransform: 'none',
                                px: 1.5,
                                py: 0.5,
                                boxShadow: 'none',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {isPublished ? t('View report') : t('Track progress')}
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Mobile / Tablet Card List (`< md`) */}
            <Stack
               divider={<Divider />}
              sx={{ display: { xs: 'flex', md: 'none' } }}
            >
              {displayedItems.map((row) => {
                const isPublished = row.reportStatus === 'PUBLISHED';
                const needsMaintenance =
                  row.pendingAction === 'CORRECTIVE_DISPOSITION' &&
                  row.inspectionType !== 'RE_INSPECTION';
                const feeDisplay = formatVnd(row.resolvedPaymentAmount);

                return (
                  <Box
                    key={row.id}
                    onClick={() => openPrimaryDestination(row)}
                    sx={{
                      p: 2,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <Stack spacing={1.25}>
                      <Stack
                        direction="row"
                        sx={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.875rem' }}
                          >
                            {row.resolvedAssetName}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {row.resolvedObjective}
                          </Typography>
                        </Box>
                        <Chip
                          size="small"
                          label={
                            isPublished
                              ? `${t('Report')} v${row.reportVersionNo ?? 1}`
                              : t(row.stageShortLabel)
                          }
                          sx={{
                            height: 22,
                            borderRadius: '5px',
                            fontSize: '0.75rem',
                            fontWeight: 650,
                            flexShrink: 0,
                            bgcolor: isPublished
                              ? 'rgba(23, 107, 82, 0.1)'
                              : 'rgba(34, 95, 133, 0.1)',
                            color: isPublished ? '#176B52' : '#225F85',
                          }}
                        />
                      </Stack>

                      <Stack
                        direction="row"
                        sx={{
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: 1,
                        }}
                      >
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 700,
                              color: 'text.primary',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {feeDisplay ?? t('Included')}
                          </Typography>
                          <Chip
                            size="small"
                            label={
                              row.resolvedPaymentStatus === 'PAID'
                                ? t('Paid')
                                : row.resolvedPaymentStatus === 'PAYMENT_DUE'
                                  ? t('Payment due')
                                  : t('Pending')
                            }
                            sx={{
                              height: 20,
                              borderRadius: '5px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              bgcolor:
                                row.resolvedPaymentStatus === 'PAID'
                                  ? 'rgba(23, 107, 82, 0.1)'
                                  : 'action.hover',
                              color:
                                row.resolvedPaymentStatus === 'PAID'
                                  ? '#176B52'
                                  : 'text.secondary',
                            }}
                          />
                        </Stack>

                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                          {needsMaintenance && (
                            <Button
                              size="small"
                              variant="text"
                              onClick={(event) => {
                                event.stopPropagation();
                                openMaintenanceHandoff(row.id);
                              }}
                              sx={{
                                borderRadius: '8px',
                                fontWeight: 600,
                                fontSize: '0.75rem',
                                textTransform: 'none',
                                color: '#8C520B',
                                px: 1,
                              }}
                            >
                              {t('Maintenance')}
                            </Button>
                          )}
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={(event) => {
                              event.stopPropagation();
                              openPrimaryDestination(row);
                            }}
                            endIcon={<ArrowForwardRounded sx={{ fontSize: 14 }} />}
                            sx={{
                              borderRadius: '8px',
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              textTransform: 'none',
                              px: 1.5,
                            }}
                          >
                            {isPublished ? t('View report') : t('Track')}
                          </Button>
                        </Stack>
                      </Stack>
                    </Stack>
                  </Box>
                );
              })}
            </Stack>

            <TablePagination
              component="div"
              count={inspections.data?.totalCount ?? displayedItems.length}
              page={Math.max((inspections.data?.page ?? page) - 1, 0)}
              onPageChange={(_e, nextPage) => setPage(nextPage + 1)}
              rowsPerPage={inspections.data?.pageSize ?? pageSize}
              onRowsPerPageChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              rowsPerPageOptions={[10, 20, 50]}
              sx={{
                borderTop: '1px solid',
                borderColor: 'divider',
              }}
            />
          </Paper>
        </QueryState>
      </Stack>
    </Box>
  );
}

export default CustomerInspectionsPage;
