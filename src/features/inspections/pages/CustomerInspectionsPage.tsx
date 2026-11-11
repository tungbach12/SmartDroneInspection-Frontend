import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  Divider,
  InputAdornment,
  MenuItem,
  Pagination,
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
import Add from '@mui/icons-material/Add';
import RefreshRounded from '@mui/icons-material/RefreshRounded';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import FilterListRounded from '@mui/icons-material/FilterListRounded';
import SearchRounded from '@mui/icons-material/SearchRounded';
import { getSectionPath } from '@/app/permissions/accessPolicy';
import { useAssets } from '@/features/assets/hooks/useAssets';
import { useAuthStore } from '@/features/auth/store/authStore';
import { contractApi, type ServiceRequest } from '@/features/contracts/api/contractApi';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { EmptyState } from '@/shared/ui/EmptyState';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryState } from '@/shared/ui/QueryState';
import { StatusChip } from '@/shared/ui/StatusChip';
import type { InspectionListItem } from '../api/inspectionApi';
import { InspectionWorkDetailDialog } from '../components/InspectionWorkDetailDialog';
import { useInspections } from '../hooks/useInspections';
import {
  resolveInitialStepForRow,
  resolveRowStageSubtitle,
} from '../utils/workflowStepResolver';

function parseLocationLabel(raw?: string | null): string | null {
  if (!raw || !raw.trim()) return null;
  const trimmed = raw.trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as { label?: string };
      return parsed.label?.trim() || null;
    } catch {
      return null;
    }
  }
  return trimmed;
}

function formatWindowTime(
  start: string | null,
  end: string | null,
  format: (input: Date | string | number, options?: Intl.DateTimeFormatOptions) => string,
): string | null {
  if (!start) return null;
  try {
    const startTime = format(new Date(start), { hour: '2-digit', minute: '2-digit' });
    if (!end) return startTime;
    const endTime = format(new Date(end), { hour: '2-digit', minute: '2-digit' });
    return `${startTime} – ${endTime}`;
  } catch {
    return null;
  }
}

type CustomerQuickFilter = 'ALL' | 'IN_PROGRESS' | 'REPORT_READY' | 'ACTION_NEEDED';

interface EnrichedCustomerInspection extends InspectionListItem {
  resolvedAssetName: string;
  resolvedAssetCode: string | null;
  resolvedObjective: string;
  resolvedReportAccepted: boolean;
  resolvedPaymentStatus: 'PAID' | 'PAYMENT_DUE' | 'PENDING' | 'NOT_APPLICABLE';
  resolvedPaymentAmount: number | null;
}

/**
 * Customer Inspections & Deliverables Page (`/client/inspections`).
 */
export function CustomerInspectionsPage() {
  const { t, formatDate, formatNumber } = useLocale();
  const navigate = useNavigate();

  const [quickFilter, setQuickFilter] = useState<CustomerQuickFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [selectedWorkDetailId, setSelectedWorkDetailId] = useState<string | null>(null);

  const listFilters = useMemo(() => ({ page: 1, pageSize: 100 }), []);
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
      const isPublishedReport = row.reportStatus === 'PUBLISHED';
      const resolvedPaymentStatus: EnrichedCustomerInspection['resolvedPaymentStatus'] =
        !isPublishedReport
          ? 'PENDING'
          : rawPaymentStatus === 'PAID'
            ? 'PAID'
            : rawPaymentStatus === 'PAYMENT_DUE'
              ? 'PAYMENT_DUE'
              : rawPaymentStatus === 'PENDING'
                ? 'PENDING'
                : 'NOT_APPLICABLE';
      const resolvedReportAccepted =
        isPublishedReport &&
        Boolean(row.reportAccepted ?? occ?.reportAccepted ?? resolvedPaymentStatus === 'PAID');

      return {
        ...row,
        resolvedAssetName,
        resolvedAssetCode,
        resolvedObjective,
        resolvedReportAccepted,
        resolvedPaymentStatus,
        resolvedPaymentAmount,
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
      (item.reportStatus === 'PUBLISHED' && !item.resolvedReportAccepted)
  );

  const displayedItems = useMemo(() => {
    return enrichedItems.filter((item) => {
      if (quickFilter === 'IN_PROGRESS' && item.reportStatus === 'PUBLISHED') return false;
      if (quickFilter === 'REPORT_READY' && item.reportStatus !== 'PUBLISHED') return false;
      if (quickFilter === 'ACTION_NEEDED') {
        const needsAction =
          item.resolvedPaymentStatus === 'PAYMENT_DUE' ||
          (item.reportStatus === 'PUBLISHED' && !item.resolvedReportAccepted);
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

  const pagedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return displayedItems.slice(start, start + pageSize);
  }, [displayedItems, page, pageSize]);

  const openPrimaryDestination = (row: EnrichedCustomerInspection) => {
    const targetStep = resolveInitialStepForRow(row, 'customer', {
      resolvedReportAccepted: row.resolvedReportAccepted,
      resolvedPaymentStatus: row.resolvedPaymentStatus,
    });
    navigate(
      `${getSectionPath('client', 'inspections')}/${row.id}/${targetStep}`,
      targetStep === 'tracking' ? { state: { autoResumeStep: true } } : undefined,
    );
  };

  const formatVnd = (amount: number | null) => {
    if (amount == null || amount <= 0) return null;
    return `${formatNumber(amount)} ₫`;
  };

  return (
    <Box className="workspace-page workspace-page--inspections">
      <PageHeader
        title={t('Inspections')}
        breadcrumbs={[{ label: 'Home', to: '/client/dashboard' }, { label: t('Inspections') }]}
      />

      <Stack spacing={2}>
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
              borderRadius: '12px',
              boxShadow: 'none',
            }}
          >
            {/* Card Header / NextAdmin Toolbar */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: { xs: 2, sm: 2.5 },
                py: 2,
                borderBottom: '1px solid',
                borderColor: 'divider',
                flexWrap: 'wrap',
                gap: 1.5,
              }}
            >
              <TextField
                size="small"
                placeholder={t('Search by asset, code, or scope…')}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchRounded fontSize="small" sx={{ color: '#71717A' }} />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{
                  width: { xs: '100%', sm: 280, md: 320 },
                  '& .MuiOutlinedInput-root': {
                    height: 40,
                    borderRadius: '8px',
                    bgcolor: 'background.paper',
                    fontSize: '0.875rem',
                  },
                }}
              />

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
                <TextField
                  select
                  size="small"
                  value={quickFilter}
                  onChange={(e) => {
                    setQuickFilter(e.target.value as 'ALL' | 'IN_PROGRESS' | 'REPORT_READY' | 'ACTION_NEEDED');
                    setPage(1);
                  }}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <FilterListRounded fontSize="small" sx={{ color: '#71717A' }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{
                    minWidth: 170,
                    '& .MuiOutlinedInput-root': {
                      height: 40,
                      borderRadius: '8px',
                      bgcolor: 'background.paper',
                      fontSize: '0.875rem',
                    },
                  }}
                >
                  <MenuItem value="ALL">{t('All')} ({enrichedItems.length})</MenuItem>
                  <MenuItem value="IN_PROGRESS">{t('In progress')} ({inProgressCount})</MenuItem>
                  <MenuItem value="REPORT_READY">{t('Report available')} ({publishedReportsCount})</MenuItem>
                  <MenuItem value="ACTION_NEEDED">{t('Action needed')} ({actionNeededItems.length})</MenuItem>
                </TextField>

                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<RefreshRounded />}
                  onClick={() => void inspections.refetch()}
                  disabled={inspections.isFetching}
                  sx={{
                    height: 40,
                    borderRadius: '8px',
                    textTransform: 'none',
                    fontWeight: 600,
                    px: 1.75,
                    borderColor: 'divider',
                    color: 'text.secondary',
                    '&:hover': { borderColor: 'text.secondary', bgcolor: 'transparent' },
                  }}
                >
                  {inspections.isFetching ? t('Loading…') : t('Refresh')}
                </Button>

                <Button
                  variant="contained"
                  size="small"
                  startIcon={<Add />}
                  onClick={() => navigate('/client/contracts')}
                  sx={{
                    height: 40,
                    borderRadius: '8px',
                    px: 2,
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    textTransform: 'none',
                    boxShadow: 'none',
                  }}
                >
                  {t('New inspection request')}
                </Button>
              </Box>
            </Box>
            {/* Desktop Table (`md+`) */}
            <TableContainer sx={{ display: { xs: 'none', md: 'block' }, overflowX: 'auto' }}>
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
                        py: 1.5,
                        px: 1.5,
                        minWidth: 200,
                      }}
                    >
                      {t('Asset')}
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: 'background.default',
                        color: 'text.secondary',
                        fontSize: '0.75rem',
                        fontWeight: 650,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        py: 1.5,
                        px: 1.5,
                        width: 130,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {t('Schedule')}
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: 'background.default',
                        color: 'text.secondary',
                        fontSize: '0.75rem',
                        fontWeight: 650,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        py: 1.5,
                        px: 1.5,
                        width: 145,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {t('Stage')}
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: 'background.default',
                        color: 'text.secondary',
                        fontSize: '0.75rem',
                        fontWeight: 650,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        py: 1.5,
                        px: 1.5,
                        width: 125,
                        whiteSpace: 'nowrap',
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
                        py: 1.5,
                        px: 1.5,
                        width: 140,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {t('Action')}
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {pagedItems.map((row) => {
                    const isPublished = row.reportStatus === 'PUBLISHED';
                    const feeDisplay = formatVnd(row.resolvedPaymentAmount);
                    const locationLabel = parseLocationLabel(row.assetLocation);
                    const scheduleDate = row.plannedStartAt
                      ? formatDate(new Date(row.plannedStartAt), {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : formatDate(new Date(row.updatedAt), {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        });
                    const scheduleWindow = formatWindowTime(
                      row.plannedStartAt,
                      row.plannedEndAt,
                      formatDate,
                    );
                    const customerStepSubtitle = resolveRowStageSubtitle(row, 'customer', {
                      resolvedReportAccepted: row.resolvedReportAccepted,
                      resolvedPaymentStatus: row.resolvedPaymentStatus,
                    });

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
                        {/* Col 1: Asset & Location (Clean 2 lines) */}
                        <TableCell sx={{ py: 1.75, px: 1.5 }}>
                          <Stack spacing={0.35} sx={{ minWidth: 0 }}>
                            <Stack
                              direction="row"
                              spacing={1}
                              sx={{ alignItems: 'center', minWidth: 0 }}
                            >
                              <Typography
                                variant="body2"
                                noWrap
                                title={row.resolvedAssetName}
                                sx={{
                                  fontWeight: 650,
                                  color: 'text.primary',
                                  fontSize: '0.875rem',
                                  maxWidth: { md: 210, lg: 260 },
                                }}
                              >
                                {row.resolvedAssetName}
                              </Typography>
                              {row.resolvedAssetCode && (
                                <Chip
                                  size="small"
                                  label={row.resolvedAssetCode}
                                  variant="outlined"
                                  sx={{
                                    height: 18,
                                    borderRadius: '5px',
                                    fontSize: '0.75rem',
                                    fontFamily: 'monospace',
                                    fontWeight: 600,
                                    flexShrink: 0,
                                  }}
                                />
                              )}
                            </Stack>

                            <Typography
                              variant="caption"
                              noWrap
                              title={locationLabel ?? row.resolvedObjective}
                              sx={{
                                color: 'text.secondary',
                                display: 'block',
                                maxWidth: { md: 210, lg: 260 },
                              }}
                            >
                              {locationLabel ?? row.resolvedObjective}
                            </Typography>
                          </Stack>
                        </TableCell>

                        {/* Col 2: Schedule */}
                        <TableCell sx={{ py: 1.75, px: 1.5, whiteSpace: 'nowrap' }}>
                          <Stack spacing={0.25}>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 600,
                                color: 'text.primary',
                                fontSize: '0.875rem',
                                fontVariantNumeric: 'tabular-nums',
                              }}
                            >
                              {scheduleDate}
                            </Typography>
                            {scheduleWindow && (
                              <Typography
                                variant="caption"
                                sx={{
                                  color: 'text.secondary',
                                  fontVariantNumeric: 'tabular-nums',
                                }}
                              >
                                {scheduleWindow}
                              </Typography>
                            )}
                          </Stack>
                        </TableCell>

                        {/* Col 3: Stage & Status */}
                        <TableCell sx={{ py: 1.75, px: 1.5, whiteSpace: 'nowrap' }}>
                          <Stack spacing={0.35} sx={{ alignItems: 'flex-start' }}>
                            <StatusChip status={isPublished ? 'PUBLISHED' : row.status} />
                            <Typography
                              variant="caption"
                              sx={{
                                color: 'text.secondary',
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                pl: 0.25,
                              }}
                            >
                              {customerStepSubtitle}
                            </Typography>
                          </Stack>
                        </TableCell>

                        {/* Col 4: Service Fee */}
                        <TableCell sx={{ py: 1.75, px: 1.5, whiteSpace: 'nowrap' }}>
                          <Stack spacing={0.25} sx={{ alignItems: 'flex-start' }}>
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
                            <Typography
                              variant="caption"
                              sx={{
                                fontWeight: 600,
                                fontSize: '0.75rem',
                                color:
                                  row.resolvedPaymentStatus === 'PAID'
                                    ? '#176B52'
                                    : row.resolvedPaymentStatus === 'PAYMENT_DUE'
                                      ? '#8C520B'
                                      : 'text.secondary',
                              }}
                            >
                              {row.resolvedPaymentStatus === 'PAID'
                                ? t('Paid')
                                : row.resolvedPaymentStatus === 'PAYMENT_DUE'
                                  ? t('Payment due')
                                  : isPublished
                                    ? t('Accept to pay')
                                    : t('Billed on report')}
                            </Typography>
                          </Stack>
                        </TableCell>

                        {/* Col 5: Actions (Clean 2 buttons: Overview + Open) */}
                        <TableCell align="right" sx={{ py: 1.75, px: 1.5, whiteSpace: 'nowrap' }}>
                          <Stack
                            direction="row"
                            spacing={0.75}
                            sx={{ justifyContent: 'flex-end', alignItems: 'center' }}
                          >
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedWorkDetailId(row.id);
                              }}
                              sx={{
                                borderRadius: '8px',
                                borderColor: 'divider',
                                color: 'text.secondary',
                                fontWeight: 600,
                                fontSize: '0.75rem',
                                textTransform: 'none',
                                px: 1.25,
                                py: 0.5,
                                whiteSpace: 'nowrap',
                                '&:hover': {
                                  borderColor: 'text.primary',
                                  color: 'text.primary',
                                  bgcolor: 'action.hover',
                                },
                              }}
                            >
                              {t('Overview')}
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              aria-label={isPublished ? t('View report') : t('Open')}
                              onClick={(event) => {
                                event.stopPropagation();
                                openPrimaryDestination(row);
                              }}
                              endIcon={<ArrowForwardRounded sx={{ fontSize: '14px !important' }} />}
                              sx={{
                                borderRadius: '8px',
                                borderColor: 'divider',
                                color: 'text.primary',
                                fontWeight: 600,
                                fontSize: '0.75rem',
                                textTransform: 'none',
                                px: 1.25,
                                py: 0.5,
                                boxShadow: 'none',
                                whiteSpace: 'nowrap',
                                '&:hover': {
                                  borderColor: 'primary.main',
                                  color: 'primary.main',
                                  bgcolor: 'primary.light',
                                },
                              }}
                            >
                              {isPublished ? t('View report') : t('Open')}
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
              {pagedItems.map((row) => {
                const isPublished = row.reportStatus === 'PUBLISHED';
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
                        <StatusChip status={isPublished ? 'PUBLISHED' : row.status} />
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
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 600,
                              color:
                                row.resolvedPaymentStatus === 'PAID'
                                  ? '#176B52'
                                  : row.resolvedPaymentStatus === 'PAYMENT_DUE'
                                    ? '#8C520B'
                                    : 'text.secondary',
                            }}
                          >
                            {row.resolvedPaymentStatus === 'PAID'
                              ? t('Paid')
                              : row.resolvedPaymentStatus === 'PAYMENT_DUE'
                                ? t('Payment due')
                                : isPublished
                                  ? t('Accept to pay')
                                  : t('Billed on report')}
                          </Typography>
                        </Stack>

                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedWorkDetailId(row.id);
                            }}
                            sx={{
                              borderRadius: '8px',
                              borderColor: 'divider',
                              color: 'text.secondary',
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              textTransform: 'none',
                              px: 1.25,
                            }}
                          >
                            {t('Overview')}
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            aria-label={isPublished ? t('View report') : t('Open')}
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
                            {isPublished ? t('View report') : t('Open')}
                          </Button>
                        </Stack>
                      </Stack>
                    </Stack>
                  </Box>
                );
              })}
            </Stack>

            {/* NextAdmin Pagination Footer */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: { xs: 2, sm: 2.5 },
                py: 1.5,
                borderTop: '1px solid',
                borderColor: 'divider',
                flexWrap: 'wrap',
                gap: 1.5,
              }}
            >
              <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                {displayedItems.length === 0
                  ? t('Showing 0 From 0')
                  : `Showing ${Math.min((page - 1) * pageSize + 1, displayedItems.length)}–${Math.min(page * pageSize, displayedItems.length)} From ${displayedItems.length}`}
              </Typography>

              <Pagination
                count={Math.max(1, Math.ceil(displayedItems.length / pageSize))}
                page={page}
                onChange={(_e, newPage) => setPage(newPage)}
                shape="rounded"
                size="small"
                siblingCount={1}
                boundaryCount={1}
              />
            </Box>
          </Paper>
        </QueryState>
      </Stack>

      <InspectionWorkDetailDialog
        open={Boolean(selectedWorkDetailId)}
        inspectionId={selectedWorkDetailId}
        onClose={() => setSelectedWorkDetailId(null)}
      />
    </Box>
  );
}

export default CustomerInspectionsPage;
