import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
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
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import Add from '@mui/icons-material/Add';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import HourglassEmptyRounded from '@mui/icons-material/HourglassEmptyRounded';
import PlaceOutlined from '@mui/icons-material/PlaceOutlined';
import { useAssets } from '@/features/assets/hooks/useAssets';
import { useAuthStore } from '@/features/auth/store/authStore';
import { contractApi, type ServiceRequest } from '@/features/contracts/api/contractApi';
import { inspectionApi, type InspectionListItem } from '@/features/inspections/api/inspectionApi';
import { formatLocation } from '@/shared/airspace/airspaceZones';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { MetricCard } from '@/shared/ui/MetricCard';
import { StatusChip } from '@/shared/ui/StatusChip';
import { DashboardHeaderActions } from '../components/LyticHeaderActions';

/**
 * Customer Organization Dashboard (`/client/dashboard`).
 *
 * Focused, zero-redundancy overview:
 * 1. 4 non-overlapping KPIs (Registered assets, Active surveys, Published reports, Settled fees)
 * 2. 2-column responsive layout:
 *    - Left: Recent Inspections, Reports & Fee Status (table on `sm+`, cards on `xs`)
 *    - Right: Asset Overview register
 */
export function CustomerDashboardPage() {
  const { formatNumber, t } = useLocale();
  const navigate = useNavigate();
  const accessToken = useAuthStore((state) => state.accessToken);

  const assets = useAssets({ page: 1, pageSize: 50 }, true);

  const [inspectionsList, setInspectionsList] = useState<InspectionListItem[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);

  const loadCustomerPortfolioData = useCallback(async () => {
    if (!accessToken || !accessToken.includes('.')) return;
    const [inspResult, reqResult] = await Promise.allSettled([
      inspectionApi.list({ page: 1, pageSize: 50 }),
      contractApi.listRequests(),
    ]);
    if (inspResult.status === 'fulfilled' && inspResult.value?.items) {
      setInspectionsList(inspResult.value.items);
    }
    if (reqResult.status === 'fulfilled' && Array.isArray(reqResult.value)) {
      setServiceRequests(reqResult.value);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadCustomerPortfolioData();
  }, [loadCustomerPortfolioData]);

  const assetList = useMemo(() => assets.data?.items ?? [], [assets.data?.items]);
  const activeAssetsCount = assetList.filter((a) => a.status === 'ACTIVE').length;

  const assetMap = useMemo(() => {
    const map = new Map<string, { name: string; code: string; locationText: string | null }>();
    for (const a of assetList) {
      map.set(a.id, { name: a.name, code: a.code, locationText: a.locationText ?? null });
    }
    return map;
  }, [assetList]);

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
      for (const occ of req.occurrences ?? []) {
        if (!occ.inspectionId) continue;
        map.set(occ.inspectionId, {
          description: req.description,
          totalPrice: occ.totalPrice ?? null,
          paymentStatus: occ.paymentStatus ?? 'PENDING',
          reportAccepted: Boolean(occ.reportAcceptedAt),
        });
      }
    }
    return map;
  }, [serviceRequests]);

  const enrichedInspections = useMemo(() => {
    return inspectionsList.map((row) => {
      const asset = assetMap.get(row.assetId);
      const occ = occurrenceByInspectionId.get(row.id);
      const amount = row.paymentAmount ?? occ?.totalPrice ?? null;
      const paymentStatus = (
        row.paymentStatus ??
        occ?.paymentStatus ??
        'NOT_APPLICABLE'
      ).toUpperCase();
      const reportAccepted = Boolean(
        row.reportAccepted ?? occ?.reportAccepted ?? paymentStatus === 'PAID',
      );
      return {
        ...row,
        resolvedAssetName:
          row.assetName || asset?.name || `${t('Asset')} #${row.assetId.slice(0, 8)}`,
        resolvedAssetCode: row.assetCode || asset?.code || null,
        resolvedObjective:
          row.objective || occ?.description || `${t('Inspection')} #${row.id.slice(0, 8)}`,
        resolvedAmount: amount,
        resolvedPaymentStatus: paymentStatus,
        resolvedReportAccepted: reportAccepted,
      };
    });
  }, [inspectionsList, assetMap, occurrenceByInspectionId, t]);

  const publishedReportsCount = enrichedInspections.filter(
    (item) => item.reportStatus === 'PUBLISHED',
  ).length;
  const inReviewOrFlightCount = enrichedInspections.filter(
    (item) => item.reportStatus !== 'PUBLISHED' && item.status !== 'CANCELLED',
  ).length;
  const totalPaidVnd = enrichedInspections
    .filter((item) => item.resolvedPaymentStatus === 'PAID')
    .reduce((sum, item) => sum + (item.resolvedAmount ?? 0), 0);

  const inspectionCountByAssetId = useMemo(() => {
    const counts = new Map<string, { total: number; published: number }>();
    for (const item of enrichedInspections) {
      const current = counts.get(item.assetId) ?? { total: 0, published: 0 };
      current.total += 1;
      if (item.reportStatus === 'PUBLISHED') current.published += 1;
      counts.set(item.assetId, current);
    }
    return counts;
  }, [enrichedInspections]);

  const metrics = [
    {
      id: 'registered_assets',
      label: t('Registered assets'),
      value: assets.error
        ? '-'
        : assets.isLoading
          ? '...'
          : formatNumber(assets.data?.totalCount ?? 0),
      change: `${formatNumber(activeAssetsCount)} ${t('Active')}`,
      positive: true,
      subtext: t('structures in your organization'),
      iconType: 'building',
    },
    {
      id: 'active_surveys',
      label: t('In progress'),
      value: formatNumber(inReviewOrFlightCount),
      change: inReviewOrFlightCount > 0 ? t('In review') : t('Clear'),
      positive: true,
      subtext: t('field surveys & AI analysis'),
      iconType: 'clock',
    },
    {
      id: 'inspection_reports',
      label: t('Official reports'),
      value:
        enrichedInspections.length > 0
          ? `${publishedReportsCount}/${enrichedInspections.length}`
          : `${publishedReportsCount}`,
      change: t('Ready'),
      positive: true,
      subtext: t('official deliverables ready'),
      iconType: 'check-circle',
    },
    {
      id: 'settled_fees',
      label: t('Settled fees'),
      value: totalPaidVnd > 0 ? `${formatNumber(totalPaidVnd)} ₫` : '0 ₫',
      change: t('Paid'),
      positive: true,
      subtext: `${serviceRequests.length} ${t('requests')}`,
      iconType: 'shield',
    },
  ];

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 1400,
        mx: 'auto',
      }}
    >
      {/* Top Header Controls */}
      <Box
        sx={{
          display: 'flex',
          alignItems: { xs: 'flex-start', md: 'center' },
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 1.5,
          mb: 3,
        }}
      >
        <Box>
          <Typography
            component="h1"
            sx={{
              color: 'text.primary',
              fontSize: '1.5rem',
              fontWeight: 600,
              letterSpacing: '-0.01em',
              lineHeight: '2rem',
            }}
          >
            {t('Organization portfolio & deliverables')}
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
            {t('Monitor registered assets, published inspection reports, and PayOS fee settlements.')}
          </Typography>
        </Box>

        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1, flexShrink: 0 }}
        >
          <Button
            component={RouterLink}
            to="/client/contracts"
            variant="contained"
            color="primary"
            startIcon={<Add />}
            sx={{
              height: 40,
              px: 1.75,
              borderRadius: '8px',
              bgcolor: '#3758F9',
              fontSize: '0.875rem',
              fontWeight: 600,
              textTransform: 'none',
              whiteSpace: 'nowrap',
              boxShadow: 'none',
              '&:hover': { bgcolor: '#4338CA', boxShadow: 'none' },
            }}
          >
            {t('New service request')}
          </Button>
          <DashboardHeaderActions
            currentRole="CUSTOMER"
            availableRoles={['CUSTOMER']}
            onRoleChange={() => {}}
            onRefresh={() => {
              void assets.refetch();
              void loadCustomerPortfolioData();
            }}
            onExport={() => {
              window.print();
            }}
          />
        </Stack>
      </Box>

      {/* Row 1: 4 Distinct KPI Cards */}
      <Box
        role="region"
        aria-label={t('Workspace metrics')}
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            lg: 'repeat(4, 1fr)',
          },
          gap: 2.5,
          mb: 3,
        }}
      >
        {metrics.map((st) => (
          <MetricCard
            key={st.id}
            label={st.label}
            value={st.value}
            change={st.change}
            positive={st.positive}
            subtext={st.subtext}
            iconType={st.iconType}
          />
        ))}
      </Box>

      {/* Row 2: 2-Column Responsive Split — Inspections & Deliverables (Left) + Asset Overview (Right) */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            lg: 'minmax(0, 1.35fr) minmax(0, 1fr)',
          },
          gap: 2.5,
          alignItems: 'start',
        }}
      >
        {/* Left: Recent Inspections, Reports & Fee Status */}
        <Paper
          variant="outlined"
          sx={{
            borderRadius: '12px',
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            boxShadow: 'none',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              px: 2.5,
              py: 2,
              borderBottom: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
            }}
          >
            <Typography
              component="h2"
              sx={{ fontSize: '1rem', fontWeight: 600, color: 'text.primary' }}
            >
              {t('Inspections, reports & fee status')}
            </Typography>
            <Button
              component={RouterLink}
              to="/client/inspections"
              size="small"
              endIcon={<ArrowForwardRounded sx={{ fontSize: 16 }} />}
              sx={{
                color: '#3758F9',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                borderRadius: '8px',
                whiteSpace: 'nowrap',
              }}
            >
              {t('View all')}
            </Button>
          </Box>

          {enrichedInspections.length === 0 ? (
            <Box sx={{ p: 3 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {t('No active inspection missions loaded yet.')}
              </Typography>
            </Box>
          ) : (
            <>
              {/* Desktop / Tablet Table (`sm+`) */}
              <TableContainer sx={{ display: { xs: 'none', sm: 'block' } }}>
                <Table size="small" aria-label={t('Recent customer inspections')}>
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
                        }}
                      >
                        {t('Asset & Scope')}
                      </TableCell>
                      <TableCell
                        sx={{
                          bgcolor: 'rgba(244, 244, 245, 0.5)',
                          color: '#71717A',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          py: 1.5,
                          px: 1.5,
                        }}
                      >
                        {t('Report')}
                      </TableCell>
                      <TableCell
                        sx={{
                          bgcolor: 'rgba(244, 244, 245, 0.5)',
                          color: '#71717A',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          py: 1.5,
                          px: 1.5,
                        }}
                      >
                        {t('Fee')}
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
                        }}
                      >
                        {t('Action')}
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {enrichedInspections.slice(0, 5).map((item) => {
                      const isPublished = item.reportStatus === 'PUBLISHED';
                      return (
                        <TableRow
                          key={item.id}
                          hover
                          onClick={() =>
                            navigate(
                              `/client/inspections/${item.id}/${isPublished ? 'report' : 'tracking'}`,
                            )
                          }
                          sx={{ cursor: 'pointer' }}
                        >
                          <TableCell sx={{ py: 1.5, px: 2.5 }}>
                            <Stack
                              direction="row"
                              spacing={0.75}
                              sx={{ alignItems: 'center', flexWrap: 'wrap' }}
                            >
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: 650, color: 'text.primary' }}
                              >
                                {item.resolvedAssetName}
                              </Typography>
                            </Stack>
                            <Typography
                              variant="caption"
                              sx={{ color: 'text.secondary', display: 'block' }}
                            >
                              {item.resolvedObjective}
                            </Typography>
                          </TableCell>

                          <TableCell sx={{ py: 1.5, px: 1.5 }}>
                            {isPublished ? (
                              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                                <CheckCircleRounded sx={{ fontSize: 15, color: '#176B52' }} />
                                <Typography
                                  variant="caption"
                                  sx={{
                                    fontWeight: 650,
                                    color: '#176B52',
                                    fontVariantNumeric: 'tabular-nums',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  v{item.reportVersionNo ?? 1} ·{' '}
                                  {item.resolvedReportAccepted ? t('Accepted') : t('Ready')}
                                </Typography>
                              </Stack>
                            ) : (
                              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                                <HourglassEmptyRounded sx={{ fontSize: 15, color: '#225F85' }} />
                                <Typography
                                  variant="caption"
                                  sx={{
                                    fontWeight: 600,
                                    color: '#225F85',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {t('In review')}
                                </Typography>
                              </Stack>
                            )}
                          </TableCell>

                          <TableCell sx={{ py: 1.5, px: 1.5 }}>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 700,
                                color: 'text.primary',
                                fontVariantNumeric: 'tabular-nums',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {item.resolvedAmount
                                ? `${formatNumber(item.resolvedAmount)} ₫`
                                : t('Included')}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{
                                color:
                                  item.resolvedPaymentStatus === 'PAID'
                                    ? '#176B52'
                                    : item.resolvedPaymentStatus === 'PAYMENT_DUE'
                                      ? '#8C520B'
                                      : 'text.secondary',
                                fontWeight: 600,
                              }}
                            >
                              {item.resolvedPaymentStatus === 'PAID'
                                ? t('Paid')
                                : item.resolvedPaymentStatus === 'PAYMENT_DUE'
                                  ? t('Payment due')
                                  : t('Pending')}
                            </Typography>
                          </TableCell>

                          <TableCell align="right" sx={{ py: 1.5, px: 2.5 }}>
                            <Stack
                              direction="row"
                              spacing={0.75}
                              sx={{ justifyContent: 'flex-end', alignItems: 'center' }}
                            >
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(
                                    `/client/inspections/${item.id}/${isPublished ? 'report' : 'tracking'}`,
                                  );
                                }}
                                sx={{
                                  borderRadius: '8px',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  textTransform: 'none',
                                  px: 1.25,
                                  py: 0.4,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {isPublished ? t('View report') : t('Track')}
                              </Button>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Mobile Stack (`xs`) */}
              <Stack divider={<Divider />} sx={{ display: { xs: 'flex', sm: 'none' } }}>
                {enrichedInspections.slice(0, 5).map((item) => {
                  const isPublished = item.reportStatus === 'PUBLISHED';
                  return (
                    <Box
                      key={item.id}
                      onClick={() =>
                        navigate(
                          `/client/inspections/${item.id}/${isPublished ? 'report' : 'tracking'}`,
                        )
                      }
                      sx={{ p: 2, cursor: 'pointer' }}
                    >
                      <Stack
                        direction="row"
                        sx={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 650, color: 'text.primary' }}>
                            {item.resolvedAssetName}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                            {item.resolvedObjective}
                          </Typography>
                        </Box>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 700,
                            fontVariantNumeric: 'tabular-nums',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                          }}
                        >
                          {item.resolvedAmount ? `${formatNumber(item.resolvedAmount)} ₫` : t('Included')}
                        </Typography>
                      </Stack>
                      <Stack
                        direction="row"
                        spacing={1.5}
                        sx={{
                          mt: 1,
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                        }}
                      >
                        {isPublished ? (
                          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                            <CheckCircleRounded sx={{ fontSize: 14, color: '#176B52' }} />
                            <Typography
                              variant="caption"
                              sx={{
                                fontWeight: 650,
                                color: '#176B52',
                                fontVariantNumeric: 'tabular-nums',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              v{item.reportVersionNo ?? 1} ·{' '}
                              {item.resolvedReportAccepted ? t('Accepted') : t('Ready')}
                            </Typography>
                          </Stack>
                        ) : (
                          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                            <HourglassEmptyRounded sx={{ fontSize: 14, color: '#225F85' }} />
                            <Typography
                              variant="caption"
                              sx={{
                                fontWeight: 600,
                                color: '#225F85',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {t('In review')}
                            </Typography>
                          </Stack>
                        )}
                        <Typography
                          variant="caption"
                          sx={{
                            color:
                              item.resolvedPaymentStatus === 'PAID'
                                ? '#176B52'
                                : item.resolvedPaymentStatus === 'PAYMENT_DUE'
                                  ? '#8C520B'
                                  : 'text.secondary',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.resolvedPaymentStatus === 'PAID'
                            ? t('Paid')
                            : item.resolvedPaymentStatus === 'PAYMENT_DUE'
                              ? t('Payment due')
                              : t('Pending')}
                        </Typography>
                      </Stack>
                    </Box>
                  );
                })}
              </Stack>
            </>
          )}
        </Paper>

        {/* Right: Asset Overview Register */}
        <Paper
          variant="outlined"
          sx={{
            borderRadius: '12px',
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            boxShadow: 'none',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              px: 2.5,
              py: 2,
              borderBottom: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
            }}
          >
            <Typography
              component="h2"
              sx={{
                color: 'text.primary',
                fontSize: '1rem',
                fontWeight: 600,
              }}
            >
              {t('Asset overview')}
            </Typography>
            <Button
              component={RouterLink}
              to="/client/assets"
              size="small"
              endIcon={<ArrowForwardRounded sx={{ fontSize: 16 }} />}
              sx={{
                color: '#3758F9',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                borderRadius: '8px',
                whiteSpace: 'nowrap',
              }}
            >
              {t('View all assets')}
            </Button>
          </Box>

          {assets.isLoading ? (
            <Box sx={{ p: 3 }}>
              <Typography color="text.secondary">{t('Loading assets...')}</Typography>
            </Box>
          ) : assets.error ? (
            <Box sx={{ p: 3 }}>
              <Typography color="text.secondary">
                {t('Asset summary is temporarily unavailable.')}
              </Typography>
            </Box>
          ) : assetList.length === 0 ? (
            <Box sx={{ p: 3 }}>
              <Typography color="text.secondary">{t('No assets registered yet.')}</Typography>
            </Box>
          ) : (
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small" aria-label={t('Asset overview')}>
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
                      }}
                    >
                      {t('Asset')}
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: 'rgba(244, 244, 245, 0.5)',
                        color: '#71717A',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        py: 1.5,
                        px: 1.5,
                      }}
                    >
                      {t('Status')}
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
                      }}
                    >
                      {t('Reports')}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {assetList.slice(0, 6).map((asset) => {
                    const counts = inspectionCountByAssetId.get(asset.id);
                    return (
                      <TableRow
                        key={asset.id}
                        hover
                        onClick={() => navigate('/client/assets')}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell sx={{ py: 1.5, px: 2.5 }}>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 650, color: 'text.primary' }}
                          >
                            {asset.name}
                          </Typography>
                          <Stack
                            direction="row"
                            spacing={0.5}
                            sx={{ alignItems: 'center', color: 'text.secondary' }}
                          >
                            <PlaceOutlined sx={{ fontSize: 13 }} />
                            <Typography variant="caption">
                              {formatLocation(asset.locationText)}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell sx={{ py: 1.5, px: 1.5 }}>
                          <StatusChip status={asset.status} />
                        </TableCell>
                        <TableCell align="right" sx={{ py: 1.5, px: 2.5 }}>
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 600,
                              color: 'text.secondary',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {counts ? `${counts.published}/${counts.total}` : '0'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Box>
    </Box>
  );
}

export default CustomerDashboardPage;
