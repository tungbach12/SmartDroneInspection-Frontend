import { useEffect, useRef, useState, type FormEvent } from 'react';
import {  } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import Add from '@mui/icons-material/Add';
import ShuffleRounded from '@mui/icons-material/ShuffleRounded';
import Close from '@mui/icons-material/Close';
import CloudUploadOutlined from '@mui/icons-material/CloudUploadOutlined';
import DownloadOutlined from '@mui/icons-material/DownloadOutlined';
import PlaceRounded from '@mui/icons-material/PlaceRounded';
import SearchRounded from '@mui/icons-material/SearchRounded';
import ApartmentRounded from '@mui/icons-material/ApartmentRounded';
import { useIsDarkMode } from '@/app/layouts/ColorModeContext';
import { useToastStore } from '@/shared/ui/Toast';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getErrorMessage } from '@/shared/api/errorMessage';
import { isPermissionDenied } from '@/shared/api/problem';
import { EmptyState } from '@/shared/ui/EmptyState';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryState } from '@/shared/ui/QueryState';
import { StatusChip } from '@/shared/ui/StatusChip';
import { MetricCard } from '@/shared/ui/MetricCard';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import type { Asset } from '../api/assetApi';
import { documentApi, type AssetDocument } from '../api/documentApi';
import { useAssetDocuments, useUploadDocument } from '../hooks/useAssetDocuments';
import {
  useAssets,
  useCreateAsset,
  useUpdateAsset,
  useRetireAsset,
  useUpdateAssetInspectionItems,
} from '../hooks/useAssets';
import { useCategories, useChecklistTemplates } from '../hooks/useCatalog';
import { useInspections } from '@/features/inspections/hooks/useInspections';
import { InspectionWorkDetailDialog } from '@/features/inspections/components/InspectionWorkDetailDialog';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { AssetLocationPickerModal } from '../components/AssetLocationPickerModal';

function formatLocation(text: string | null): string {
  if (!text) return '—';
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === 'object') {
      if (parsed.label) return String(parsed.label);
      if (parsed.latitude != null && parsed.longitude != null) {
        return `${Number(parsed.latitude).toFixed(4)}, ${Number(parsed.longitude).toFixed(4)}`;
      }
    }
  } catch {
    // not JSON
  }
  return text;
}

export function AssetsPage() {
  const { formatNumber, t } = useLocale();
  const roles = useAuthStore((state) => state.roles);
  const isClient = roles.includes('CUSTOMER');
  const { data, isLoading, error, refetch } = useAssets({ page: 1, pageSize: 50 });
  const createAsset = useCreateAsset();
  const showToast = useToastStore((state) => state.showToast);
  const categories = useCategories();

  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Asset | null>(null);
  const [selectedInspectionId, setSelectedInspectionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'ACTIVE' | 'PENDING_REVIEW' | 'INACTIVE' | 'RETIRED'
  >('ACTIVE');

  const items = data?.items ?? [];
  const totalCount = data?.totalCount ?? items.length;
  const activeCount = items.filter((a) => a.status === 'ACTIVE').length;
  const pendingCount = items.filter((a) => a.status === 'PENDING_REVIEW').length;
  const checkpointsConfiguredCount = items.filter((a) => (a.inspectionItems?.length ?? 0) > 0).length;
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredItems = items.filter((asset) => {
    if (asset.status !== statusFilter) return false;
    if (!normalizedQuery) return true;
    return (
      asset.name.toLowerCase().includes(normalizedQuery) ||
      asset.code.toLowerCase().includes(normalizedQuery) ||
      formatLocation(asset.locationText).toLowerCase().includes(normalizedQuery)
    );
  });

  const categoryNameById = new Map((categories.data ?? []).map((c) => [c.id, c.name]));

  const newAssetButton = isClient ? (
    <Button
      variant="contained"
      startIcon={<Add />}
      onClick={() => setCreateOpen(true)}
      sx={{
        borderRadius: '8px',
        px: 2,
        py: 0.875,
        bgcolor: 'primary.main',
        fontSize: '0.875rem',
        fontWeight: 600,
        textTransform: 'none',
        boxShadow: 'none',
      }}
    >
      {t('New asset')}
    </Button>
  ) : undefined;

  return (
    <Box className="workspace-page workspace-page--assets">
      <PageHeader
        title={t('Assets')}
        breadcrumbs={[{ label: t('Operations'), to: '/client/dashboard' }, { label: t('Assets') }]}
      />
      {/* 4 Lytic KPI Metric Cards */}
      {isClient && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
            gap: 2.5,
            mb: 3,
          }}
        >
          <MetricCard
            label={t('Total Assets')}
            value={isLoading ? '…' : formatNumber(totalCount)}
            change={t('Catalog')}
            positive
            subtext="registered structures"
            iconType="building"
          />
          <MetricCard
            label={t('Active Assets')}
            value={isLoading ? '…' : formatNumber(activeCount)}
            change="CLEAR"
            positive
            subtext="airspace clearance verified"
            iconType="check-circle"
          />
          <MetricCard
            label={t('Pending Review')}
            value={isLoading ? '…' : formatNumber(pendingCount)}
            change={pendingCount > 0 ? 'PENDING_REVIEW' : 'CLEAR'}
            positive={pendingCount === 0}
            subtext="awaiting verification"
            iconType="alert"
          />
          <MetricCard
            label={t('Checkpoints Configured')}
            value={isLoading ? '…' : formatNumber(checkpointsConfiguredCount)}
            change={checkpointsConfiguredCount > 0 ? t('Ready') : t('Standard')}
            positive
            subtext="assets with custom checkpoints"
            iconType="shield"
          />
        </Box>
      )}

      <QueryState
        isLoading={isLoading}
        error={error}
        onRetry={() => void refetch()}
        isEmpty={Boolean(data && data.items.length === 0)}
        empty={
          <EmptyState
            title={t('No assets registered')}
            description={t('Add an infrastructure asset before requesting an inspection.')}
            action={newAssetButton}
          />
        }
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, mb: 2.5 }}
        >
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' }, width: { xs: '100%', sm: 'auto' } }}>
            <TextField
              size="small"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('Search by id, name, or code…')}
              sx={{ width: { xs: '100%', sm: 280 }, bgcolor: 'background.paper', borderRadius: '8px' }}
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
            <TextField
              select
              size="small"
              label={t('Status')}
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value as 'ACTIVE' | 'PENDING_REVIEW' | 'INACTIVE' | 'RETIRED',
                )
              }
              sx={{ minWidth: { xs: '100%', sm: 180 }, bgcolor: 'background.paper', borderRadius: '8px' }}
            >
              <MenuItem value="ACTIVE">{t('ACTIVE')}</MenuItem>
              <MenuItem value="PENDING_REVIEW">{t('PENDING_REVIEW')}</MenuItem>
              <MenuItem value="INACTIVE">{t('INACTIVE')}</MenuItem>
              <MenuItem value="RETIRED">{t('RETIRED')}</MenuItem>
            </TextField>
          </Stack>
          {newAssetButton}
        </Stack>

        {filteredItems.length === 0 ? (
          <Paper
            variant="outlined"
            sx={{ p: 4, borderRadius: '10px', textAlign: 'center', borderColor: 'divider' }}
          >
            <Typography variant="body2" color="text.secondary">
              {t('No matching assets found.')}
            </Typography>
          </Paper>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2.5 }}>
            {filteredItems.map((asset) => {
              const categoryName = categoryNameById.get(asset.categoryId);
              const checkpointCount = asset.inspectionItems?.length ?? 0;
              return (
                <Card
                  key={asset.id}
                  variant="outlined"
                  sx={{
                    p: 2.5,
                    borderRadius: '10px',
                    borderColor: 'divider',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'border-color 160ms ease, box-shadow 160ms ease',
                    '&:hover': {
                      borderColor: 'primary.light',
                      boxShadow: '0 4px 14px rgba(15, 23, 42, 0.06)',
                    },
                  }}
                >
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1.5 }}>
                      <Box sx={{ display: 'flex', gap: 1.75, alignItems: 'flex-start', minWidth: 0 }}>
                        <Box
                          sx={{
                            width: 56,
                            height: 56,
                            flexShrink: 0,
                            borderRadius: '10px',
                            border: 1,
                            borderColor: 'divider',
                            bgcolor: 'action.hover',
                            display: 'grid',
                            placeItems: 'center',
                            color: 'primary.main',
                          }}
                        >
                          <ApartmentRounded sx={{ fontSize: 26 }} />
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            variant="subtitle1"
                            component="h2"
                            sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.3 }}
                          >
                            {asset.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
                            {categoryName ? `${categoryName} · ` : ''}
                            {formatLocation(asset.locationText)}
                          </Typography>
                          <Stack direction="row" spacing={0.75} sx={{ mt: 0.75, flexWrap: 'wrap', gap: 0.5 }}>
                            {!isClient && (
                              <Chip
                                size="small"
                                variant="outlined"
                                label={`${checkpointCount} ${t('checkpoints')}`}
                                sx={{ height: 22, fontSize: '0.75rem', fontWeight: 600, borderRadius: '6px' }}
                              />
                            )}
                            {asset.structureHeightMeters != null && (
                              <Chip
                                size="small"
                                variant="outlined"
                                label={`${asset.structureHeightMeters} m`}
                                sx={{ height: 22, fontSize: '0.75rem', fontWeight: 600, borderRadius: '6px' }}
                              />
                            )}
                          </Stack>
                        </Box>
                      </Box>
                      <StatusChip status={asset.status} />
                    </Box>

                    <Divider sx={{ my: 1.75 }} />

                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, fontSize: '0.875rem' }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {t('Asset Code:')}
                        </Typography>
                        <Typography sx={{ fontWeight: 600, fontFamily: 'monospace', color: 'text.primary', fontSize: '0.875rem' }}>
                          {asset.code}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {t('GPS Coordinates:')}
                        </Typography>
                        <Typography sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.875rem' }}>
                          {asset.latitude != null && asset.longitude != null
                            ? `${asset.latitude.toFixed(4)}°, ${asset.longitude.toFixed(4)}°`
                            : '—'}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      mt: 2,
                      pt: 1.5,
                      borderTop: '1px solid',
                      borderColor: 'divider',
                      display: 'flex',
                      justifyContent: 'flex-end',
                    }}
                  >
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => setSelected(asset)}
                      sx={{
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: '0.8125rem',
                        borderRadius: '8px',
                        px: 2,
                      }}
                    >
                      {t('Detail')}
                    </Button>
                  </Box>
                </Card>
              );
            })}
          </Box>
        )}
      </QueryState>

      <CreateAssetDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        categories={categories.data ?? []}
        pending={createAsset.isPending}
        errorMessage={
          createAsset.isError
            ? getErrorMessage(createAsset.error, 'Could not create the asset.')
            : null
        }
        onSubmit={(input, initialPhoto) =>
          createAsset.mutate(input, {
            onSuccess: async (created) => {
              if (initialPhoto && created?.id) {
                try {
                  await documentApi.upload(
                    created.id,
                    initialPhoto,
                    'ASSET_PHOTO',
                    undefined,
                    true,
                  );
                } catch (error) {
                  showToast(
                    getErrorMessage(error, t('The asset was created, but its photo could not be uploaded. Try again from the asset details.')),
                    'error',
                  );
                }
              }
              setCreateOpen(false);
            },
          })
        }
      />

      <AssetDetailDrawer
        asset={items.find((a) => a.id === selected?.id) ?? selected}
        onClose={() => setSelected(null)}
        onAssetUpdated={(updated) => setSelected(updated)}
        onSelectInspection={(id) => setSelectedInspectionId(id)}
      />
      <InspectionWorkDetailDialog
        open={Boolean(selectedInspectionId)}
        inspectionId={selectedInspectionId}
        onClose={() => setSelectedInspectionId(null)}
      />
    </Box>
  );
}

interface CreateAssetDialogProps {
  open: boolean;
  onClose: () => void;
  categories: { id: string; name: string; active: boolean }[];
  pending: boolean;
  errorMessage: string | null;
  onSubmit: (
    input: {
      name: string;
      code: string;
      description: string | null;
      categoryId: string;
      locationText: string;
      latitude: number | null;
      longitude: number | null;
      inspectionItems: string[];
      structureHeightMeters: number | null;
      footprintAreaSquareMeters: number | null;
    },
    initialPhoto?: File | null,
  ) => void;
}

/** Blank → null (not provided); a valid non-negative number → number; anything else → undefined. */
function parseDimension(text: string): number | null | undefined {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  const value = Number(trimmed);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

function parseOptionalDimension(text: string): number | null | undefined {
  return parseDimension(text);
}

function parseOptionalCoordinate(
  text: string,
  minimum: number,
  maximum: number,
): number | null | undefined {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  const value = Number(trimmed);
  return Number.isFinite(value) && value >= minimum && value <= maximum ? value : undefined;
}

function generateRandomAssetCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 5; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `AST-${rand}`;
}

function CreateAssetDialogForm({
  categories,
  pending,
  errorMessage,
  onClose,
  onSubmit,
}: CreateAssetDialogProps) {
  const { locale, t } = useLocale();
  const isDark = useIsDarkMode();
  const [code, setCode] = useState(() => generateRandomAssetCode());
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [locationText, setLocationText] = useState('');
  const [latitudeText, setLatitudeText] = useState('10.7789');
  const [longitudeText, setLongitudeText] = useState('106.7082');
  const [heightText, setHeightText] = useState('');
  const [areaText, setAreaText] = useState('');
  const [description, setDescription] = useState('');
  const [initialPhoto, setInitialPhoto] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsFeedback, setGpsFeedback] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (photoPreviewUrl) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
    };
  }, [photoPreviewUrl]);

  const handleGetCurrentGpsLocation = () => {
    setGpsFeedback(null);
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsFeedback(
        locale === 'vi'
          ? 'Trình duyệt không hỗ trợ định vị GPS.'
          : 'Browser does not support GPS geolocation.',
      );
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLoading(false);
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lon = Number(pos.coords.longitude.toFixed(6));
        setLatitudeText(String(lat));
        setLongitudeText(String(lon));
        setGpsFeedback(
          locale === 'vi'
            ? `✓ Đã lấy tọa độ GPS thiết bị của bạn: ${lat}°N, ${lon}°E`
            : `✓ Retrieved your device GPS coordinates: ${lat}°N, ${lon}°E`,
        );
        if (!locationText || locationText === 'Chưa cập nhật địa chỉ' || locationText === 'Công trình mới') {
          setLocationText(
            locale === 'vi'
              ? `Vị trí GPS (${lat.toFixed(4)}, ${lon.toFixed(4)})`
              : `GPS Location (${lat.toFixed(4)}, ${lon.toFixed(4)})`,
          );
        }
      },
      () => {
        setGpsLoading(false);
        setGpsFeedback(
          locale === 'vi'
            ? 'Không lấy được GPS (chưa cấp quyền vị trí). Vui lòng nhập trực tiếp tọa độ bên dưới.'
            : 'Could not retrieve GPS location (permission denied). Please enter coordinates manually below.',
        );
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const activeCategories = categories.filter((category) => category.active);
  const parsedLat = latitudeText.trim() !== '' && !Number.isNaN(Number(latitudeText)) ? Number(latitudeText) : null;
  const parsedLon = longitudeText.trim() !== '' && !Number.isNaN(Number(longitudeText)) ? Number(longitudeText) : null;

  const heightValue = parseDimension(heightText);
  const areaValue = parseDimension(areaText);
  const dimensionsInvalid = heightValue === undefined || areaValue === undefined;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (dimensionsInvalid) return;
    onSubmit(
      {
        code,
        name,
        categoryId,
        locationText,
        latitude: parsedLat,
        longitude: parsedLon,
        description: description || null,
        inspectionItems: [],
        structureHeightMeters: heightValue,
        footprintAreaSquareMeters: areaValue,
      },
      initialPhoto,
    );
  };

  return (
    <form onSubmit={submit}>
      <DialogTitle sx={{ fontWeight: 700 }}>{t('New Asset')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {errorMessage && (
            <Alert severity="error">
              {errorMessage.includes('SUBSCRIPTION_INACTIVE') ||
              errorMessage.toLowerCase().includes('subscription')
                ? 'Your organization subscription is inactive or expired. Please contact the platform administrator to activate or renew your subscription.'
                : errorMessage}
            </Alert>
          )}
          <TextField
            label={t('Asset code')}
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="AST-X7K9A"
            helperText={
              locale === 'vi'
                ? 'Mã định danh tự động tạo ngẫu nhiên (có thể chỉnh sửa hoặc bấm đổi mã)'
                : 'Auto-generated identifier (editable or click to regenerate)'
            }
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip
                      title={
                        locale === 'vi' ? 'Tạo lại mã ngẫu nhiên' : 'Regenerate random code'
                      }
                    >
                      <IconButton
                        size="small"
                        edge="end"
                        onClick={() => setCode(generateRandomAssetCode())}
                        aria-label={
                          locale === 'vi' ? 'Tạo lại mã ngẫu nhiên' : 'Regenerate random code'
                        }
                      >
                        <ShuffleRounded sx={{ fontSize: 18, color: 'primary.main' }} />
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                ),
              },
            }}
          />
          <TextField
            label={t('Asset name')}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('e.g. North Crossing Main Span')}
          />
          <TextField
            select
            label={t('Category')}
            required
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            {activeCategories.map((cat) => (
              <MenuItem key={cat.id} value={cat.id}>
                {cat.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label={t('Location')}
            required
            value={locationText}
            onChange={(e) => setLocationText(e.target.value)}
            placeholder={t('e.g. Km 12+300, Highway 1A')}
            helperText={t('Physical description or GPS coordinates')}
          />
          <Box
            sx={{
              p: 1.75,
              borderRadius: '10px',
              bgcolor: isDark ? 'rgba(30, 41, 59, 0.45)' : 'background.default',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.25, flexWrap: 'wrap', gap: 1 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <PlaceRounded sx={{ fontSize: 18, color: 'primary.main' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  {t('Asset Coordinates')}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={gpsLoading ? <CircularProgress size={14} /> : undefined}
                  onClick={handleGetCurrentGpsLocation}
                  disabled={gpsLoading}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    borderRadius: '8px',
                    borderColor: 'info.main',
                    color: 'info.main',
                    bgcolor: 'action.hover',
                    '&:hover': {
                      borderColor: 'info.dark',
                      bgcolor: 'action.selected',
                    },
                  }}
                >
                  {gpsLoading
                    ? locale === 'vi'
                      ? 'Đang lấy GPS…'
                      : 'Locating…'
                    : locale === 'vi'
                      ? 'Lấy GPS của tôi'
                      : 'Use my GPS'}
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => setMapPickerOpen(true)}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    borderRadius: '8px',
                    bgcolor: 'primary.main',
                    boxShadow: 'none',
                    '&:hover': { bgcolor: 'primary.dark' },
                  }}
                >
                  {locale === 'vi' ? 'Mở bản đồ cắm kim' : 'Pick on map'}
                </Button>
              </Stack>
            </Stack>

            {gpsFeedback && (
              <Alert
                severity={gpsFeedback.startsWith('✓') ? 'success' : 'info'}
                sx={{ mb: 1.5, py: 0.25, borderRadius: '8px', fontSize: '0.75rem' }}
              >
                {gpsFeedback}
              </Alert>
            )}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label={t('Latitude')}
                value={latitudeText}
                onChange={(e) => setLatitudeText(e.target.value)}
                placeholder="10.7805"
                fullWidth
                autoComplete="off"
                slotProps={{
                  htmlInput: { inputMode: 'decimal', spellCheck: false, 'data-lpignore': 'true' },
                }}
                helperText={t('e.g. 10.7805 (Ba Son Bridge)')}
              />
              <TextField
                label={t('Longitude')}
                value={longitudeText}
                onChange={(e) => setLongitudeText(e.target.value)}
                placeholder="106.7108"
                fullWidth
                autoComplete="off"
                slotProps={{
                  htmlInput: { inputMode: 'decimal', spellCheck: false, 'data-lpignore': 'true' },
                }}
                helperText={t('e.g. 106.7108 (Ba Son Bridge)')}
              />
            </Stack>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label={t('Structure height (m)')}
              value={heightText}
              onChange={(e) => setHeightText(e.target.value)}
              fullWidth
              error={heightValue === undefined}
              autoComplete="off"
              slotProps={{ htmlInput: { inputMode: 'decimal', spellCheck: false } }}
              helperText={
                heightValue === undefined
                  ? t('Enter a number of 0 or more')
                  : t('Optional. Used to check the drone maximum altitude.')
              }
            />
            <TextField
              label={t('Footprint area (m²)')}
              value={areaText}
              onChange={(e) => setAreaText(e.target.value)}
              fullWidth
              error={areaValue === undefined}
              autoComplete="off"
              slotProps={{ htmlInput: { inputMode: 'decimal', spellCheck: false } }}
              helperText={
                areaValue === undefined
                  ? t('Enter a number of 0 or more')
                  : t('Optional. Shown to the manager when choosing a partner.')
              }
            />
          </Stack>

          <TextField
            label={t('Description')}
            multiline
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <Box
            sx={{
              p: 1.75,
              borderRadius: '10px',
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.default',
            }}
          >
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
            >
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 650, color: 'text.primary' }}>
                  {t('Asset photo (optional)')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('Attach a reference photo of the structure so reviewers and pilots can identify it visually.')}
                </Typography>
              </Box>
              <Button
                variant="outlined"
                size="small"
                component="label"
                startIcon={<CloudUploadOutlined />}
                sx={{ textTransform: 'none', fontWeight: 600, flexShrink: 0 }}
              >
                {initialPhoto ? initialPhoto.name : t('Choose image')}
                <input
                  hidden
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => {
                    const nextFile = event.target.files?.[0] ?? null;
                    if (photoPreviewUrl) {
                      URL.revokeObjectURL(photoPreviewUrl);
                    }
                    setInitialPhoto(nextFile);
                    setPhotoPreviewUrl(nextFile ? URL.createObjectURL(nextFile) : null);
                  }}
                />
              </Button>
            </Stack>
            {photoPreviewUrl && (
              <Box sx={{ mt: 1.5 }}>
                <Box
                  component="img"
                  src={photoPreviewUrl}
                  alt={name || t('Asset preview')}
                  sx={{
                    width: '100%',
                    maxHeight: 200,
                    objectFit: 'cover',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: 'divider',
                    display: 'block',
                  }}
                />
              </Box>
            )}
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={pending}>
          {t('Cancel')}
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={pending || dimensionsInvalid}
        >
          {pending ? 'Creating…' : 'Create Asset'}
        </Button>
      </DialogActions>

      <AssetLocationPickerModal
        open={mapPickerOpen}
        onClose={() => setMapPickerOpen(false)}
        initialLatitude={parsedLat}
        initialLongitude={parsedLon}
        assetName={name}
        onApplyCoordinates={(lat, lon, placeName) => {
          setLatitudeText(String(lat));
          setLongitudeText(String(lon));
          if (placeName && (!locationText || locationText === 'Công trình mới')) {
            setLocationText(placeName);
          }
          setGpsFeedback(
            locale === 'vi'
              ? `✓ Đã chọn tọa độ trên bản đồ: ${lat}°N, ${lon}°E`
              : `✓ Selected coordinates on map: ${lat}°N, ${lon}°E`,
          );
        }}
      />
    </form>
  );
}

function CreateAssetDialog(props: CreateAssetDialogProps) {
  return (
    <Dialog open={props.open} onClose={props.onClose} fullWidth maxWidth="md">
      {props.open ? <CreateAssetDialogForm {...props} /> : null}
    </Dialog>
  );
}

function InspectionItemsEditor({
  asset,
  onCancel,
  onSaved,
}: {
  asset: Asset;
  onCancel: () => void;
  onSaved: (updated: Asset) => void;
}) {
  const { t } = useLocale();
  const [draftItems, setDraftItems] = useState<string[]>(asset.inspectionItems ?? []);
  const [customInput, setCustomInput] = useState('');
  const updateItemsMutation = useUpdateAssetInspectionItems();
  const categoryTemplatesQuery = useChecklistTemplates(
    { type: 'CATEGORY_INSPECTION_ITEM', categoryId: asset.categoryId },
    Boolean(asset.categoryId),
  );

  const addCustomItem = () => {
    const val = customInput.trim();
    if (val && !draftItems.includes(val)) {
      setDraftItems((prev) => [...prev, val]);
      setCustomInput('');
    }
  };

  const toggleItem = (label: string) => {
    setDraftItems((prev) =>
      prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label],
    );
  };

  const handleSave = () => {
    updateItemsMutation.mutate(
      { assetId: asset.id, inspectionItems: draftItems },
      {
        onSuccess: (updated) => {
          onSaved(updated);
        },
      },
    );
  };

  const categorySuggestions = (categoryTemplatesQuery.data ?? [])
    .filter((tpl) => tpl.active && !draftItems.includes(tpl.label))
    .map((tpl) => tpl.label);

  return (
    <Stack spacing={1.5}>
      {draftItems.length > 0 ? (
        <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.75 }}>
          {draftItems.map((item, idx) => (
            <Chip
              key={idx}
              label={item}
              size="small"
              color="primary"
              variant="outlined"
              onDelete={() => toggleItem(item)}
            />
          ))}
        </Stack>
      ) : (
        <Typography variant="caption" color="text.secondary">
          {t('No items selected yet. Add custom checkpoints or pick from category templates below.')}
        </Typography>
      )}

      {categorySuggestions.length > 0 && (
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            {t('Standard category items (click to add):')}
          </Typography>
          <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
            {categorySuggestions.map((label) => (
              <Chip
                key={label}
                label={`+ ${label}`}
                size="small"
                variant="outlined"
                onClick={() => toggleItem(label)}
                sx={{ cursor: 'pointer', fontSize: '0.72rem' }}
              />
            ))}
          </Stack>
        </Box>
      )}

      <Stack direction="row" spacing={1}>
        <TextField
          size="small"
          fullWidth
          placeholder={t('Add custom inspection item (e.g. West facade 18F crack)...')}
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addCustomItem();
            }
          }}
        />
        <Button
          size="small"
          variant="outlined"
          onClick={addCustomItem}
          disabled={!customInput.trim()}
          sx={{ textTransform: 'none', fontWeight: 600, flexShrink: 0 }}
        >
          {t('Add')}
        </Button>
      </Stack>

      <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
        <Button
          size="small"
          onClick={onCancel}
          disabled={updateItemsMutation.isPending}
          sx={{ textTransform: 'none' }}
        >
          {t('Cancel')}
        </Button>
        <Button
          size="small"
          variant="contained"
          onClick={handleSave}
          disabled={updateItemsMutation.isPending}
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          {updateItemsMutation.isPending ? t('Saving…') : t('Save checkpoints')}
        </Button>
      </Stack>
    </Stack>
  );
}

function InspectionItemsSection({
  asset,
  canEdit,
  onAssetUpdated,
}: {
  asset: Asset;
  canEdit: boolean;
  onAssetUpdated?: ((updated: Asset) => void) | undefined;
}) {
  const { t } = useLocale();
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setEditing(false);
  }, [asset.id]);

  const items = asset.inspectionItems ?? [];

  return (
    <Box
      sx={{
        my: 1.5,
        p: 2,
        bgcolor: 'background.default',
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>
          {t('Inspection Checkpoints')}
        </Typography>
        {canEdit && !editing && (
          <Button
            size="small"
            variant="text"
            onClick={() => setEditing(true)}
            sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem', py: 0 }}
          >
            {t('+ Add / Edit custom items')}
          </Button>
        )}
      </Stack>

      {!editing ? (
        items.length > 0 ? (
          <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.75 }}>
            {items.map((item, idx) => (
              <Chip key={idx} label={item} size="small" variant="outlined" />
            ))}
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            {t('No inspection checkpoints defined for this asset.')}
          </Typography>
        )
      ) : (
        <InspectionItemsEditor
          asset={asset}
          onCancel={() => setEditing(false)}
          onSaved={(updated) => {
            setEditing(false);
            onAssetUpdated?.(updated);
          }}
        />
      )}
    </Box>
  );
}

function AssetInspectionHistorySection({
  assetId,
  onSelectInspection,
}: {
  assetId: string;
  onSelectInspection?: (id: string) => void;
}) {
  const { t, formatDate } = useLocale();
  const inspectionsQuery = useInspections({ page: 1, pageSize: 100 });
  const assetInspections = (inspectionsQuery.data?.items ?? []).filter(
    (insp) => insp.assetId === assetId,
  );

  return (
    <Box sx={{ my: 1.5, p: 2, bgcolor: 'background.default', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.25 }}>
        <Typography
          variant="subtitle2"
          sx={{ fontWeight: 600, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 0.75 }}
        >
          <HistoryRoundedIcon sx={{ fontSize: 18, color: 'primary.main' }} />
          {t('Inspection history')}
        </Typography>
        <Chip
          size="small"
          label={`${assetInspections.length} ${t('missions')}`}
          sx={{ height: 20, fontSize: '0.75rem', fontWeight: 600 }}
        />
      </Stack>

      {inspectionsQuery.isLoading ? (
        <CircularProgress size={18} sx={{ my: 1 }} />
      ) : assetInspections.length > 0 ? (
        <Stack spacing={1}>
          {assetInspections.map((insp) => (
            <Paper
              key={insp.id}
              variant="outlined"
              sx={{
                p: 1.25,
                borderRadius: '8px',
                bgcolor: 'background.paper',
                cursor: 'pointer',
                transition: 'all 120ms ease',
                '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
              }}
              onClick={() => onSelectInspection?.(insp.id)}
            >
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box sx={{ minWidth: 0, flex: 1, pr: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }} noWrap>
                    {t('Inspection')} #{insp.id.slice(0, 8)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                    {formatDate(new Date(insp.plannedStartAt ?? insp.createdAt))}
                  </Typography>
                </Box>
                <StatusChip status={insp.status} />
              </Stack>
            </Paper>
          ))}
        </Stack>
      ) : (
        <Box sx={{ py: 1, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
            {t('No inspection history recorded for this asset yet.')}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

function AssetDetailDrawer({
  asset,
  onClose,
  onAssetUpdated,
  onSelectInspection,
}: {
  asset: Asset | null;
  onClose: () => void;
  onAssetUpdated?: (updated: Asset) => void;
  onSelectInspection?: (inspectionId: string) => void;
}) {
  const { t } = useLocale();
  const roles = useAuthStore((state) => state.roles);
  const isClient = roles.includes('CUSTOMER');
  const canEditInspectionItems =
    roles.includes('MANAGER') || roles.includes('ADMIN');
  const updateMutation = useUpdateAsset();
  const retireMutation = useRetireAsset();
  const [confirmRetireOpen, setConfirmRetireOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editLatitude, setEditLatitude] = useState('');
  const [editLongitude, setEditLongitude] = useState('');
  const [editHeight, setEditHeight] = useState('');
  const [editArea, setEditArea] = useState('');
  const [editAssetId, setEditAssetId] = useState<string | null>(null);
  const editingCurrentAsset = editing && editAssetId === asset?.id;
  const startEditing = () => {
    if (!asset) return;
    setEditAssetId(asset.id);
    setEditName(asset.name);
    setEditDescription(asset.description ?? '');
    setEditLocation(formatLocation(asset.locationText) === '—' ? '' : formatLocation(asset.locationText));
    setEditLatitude(asset.latitude == null ? '' : String(asset.latitude));
    setEditLongitude(asset.longitude == null ? '' : String(asset.longitude));
    setEditHeight(asset.structureHeightMeters == null ? '' : String(asset.structureHeightMeters));
    setEditArea(asset.footprintAreaSquareMeters == null ? '' : String(asset.footprintAreaSquareMeters));
    setEditing(true);
  };

  const documents = useAssetDocuments(asset?.id ?? '');
  const upload = useUploadDocument(asset?.id ?? '');
  const [documentDate, setDocumentDate] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<Array<{ file: File; previewUrl: string | null }>>([]);
  const [uploadingBatch, setUploadingBatch] = useState(false);
  const [activeImageId, setActiveImageId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<unknown>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    setActiveImageId(null);
  }, [asset?.id]);

  useEffect(() => {
    return () => {
      for (const item of selectedFiles) {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      }
    };
  }, [selectedFiles]);

  const imageDocs = (documents.data ?? []).filter(
    (doc) => doc.contentType?.toLowerCase().startsWith('image/'),
  );
  const primaryImageDoc = imageDocs[0];
  const activeImageDoc =
    imageDocs.find((doc) => doc.id === activeImageId) ?? primaryImageDoc;
  // A blob URL outlives this component unless it is revoked, and a download that resolves after the
  // drawer closed must not write state that no longer has a home.
  const liveObjectUrls = useRef<Set<string>>(new Set());
  const revokeTimers = useRef<Set<number>>(new Set());
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    // Read both sets through locals so cleanup acts on exactly what this effect created,
    // independent of any later reassignment.
    const urls = liveObjectUrls.current;
    const timers = revokeTimers.current;
    return () => {
      mounted.current = false;
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
      timers.clear();
      for (const url of urls) {
        URL.revokeObjectURL(url);
      }
      urls.clear();
    };
  }, []);

  const handleConfirmRetire = () => {
    if (!asset) return;
    retireMutation.mutate(asset.id, {
      onSuccess: () => {
        setConfirmRetireOpen(false);
        onClose();
      },
    });
  };

  const uploadAllowed = isClient && (asset?.status === 'ACTIVE' || asset?.status === 'INACTIVE');
  const parsedEditHeight = parseOptionalDimension(editHeight);
  const parsedEditArea = parseOptionalDimension(editArea);
  const parsedEditLatitude = parseOptionalCoordinate(editLatitude, -90, 90);
  const parsedEditLongitude = parseOptionalCoordinate(editLongitude, -180, 180);
  const coordinatesPartiallyMissing =
    (editLatitude.trim() === '') !== (editLongitude.trim() === '');
  const editInvalid =
    !editName.trim() ||
    !editLocation.trim() ||
    coordinatesPartiallyMissing ||
    parsedEditHeight === undefined ||
    parsedEditArea === undefined ||
    parsedEditLatitude === undefined ||
    parsedEditLongitude === undefined;
  const saveAssetEdit = () => {
    if (!asset || editInvalid) return;
    updateMutation.mutate(
      {
        assetId: asset.id,
        input: {
          name: editName.trim(),
          description: editDescription.trim() || null,
          locationText: editLocation.trim(),
          latitude: parsedEditLatitude ?? null,
          longitude: parsedEditLongitude ?? null,
          structureHeightMeters: parsedEditHeight ?? null,
          footprintAreaSquareMeters: parsedEditArea ?? null,
          clearCoordinates: editLatitude.trim() === '' && editLongitude.trim() === '',
          clearStructureHeight: editHeight.trim() === '',
          clearFootprintArea: editArea.trim() === '',
          clearDescription: editDescription.trim() === '',
        },
      },
      {
        onSuccess: (updated) => {
          onAssetUpdated?.(updated);
          setEditing(false);
        },
      },
    );
  };
  const downloadDenied = isPermissionDenied(downloadError) || isPermissionDenied(documents.error);

  const openDocument = async (storedDocument: AssetDocument) => {
    if (!asset) return;
    setDownloadError(null);
    setDownloading(storedDocument.id);
    try {
      const blob = await documentApi.content(asset.id, storedDocument.id);
      if (!mounted.current) return;
      const url = URL.createObjectURL(blob);
      liveObjectUrls.current.add(url);
      const anchor = window.document.createElement('a');
      anchor.href = url;
      anchor.download = storedDocument.fileName;
      anchor.click();
      // Deferred so the browser can start the transfer; the URL is revoked here or, if the drawer
      // closes first, by the unmount cleanup.
      const timer = window.setTimeout(() => {
        revokeTimers.current.delete(timer);
        liveObjectUrls.current.delete(url);
        URL.revokeObjectURL(url);
      }, 1000);
      revokeTimers.current.add(timer);
    } catch (error) {
      if (!mounted.current) return;
      setDownloadError(error);
    } finally {
      if (mounted.current) {
        setDownloading(null);
      }
    }
  };

  return (
    <>
      <Dialog
        open={Boolean(asset)}
        onClose={onClose}
        fullWidth
        maxWidth="md"
        scroll="paper"
        slotProps={{
          paper: {
            sx: { borderRadius: '14px' },
          },
        }}
      >
        <DialogTitle sx={{ pb: 1.5 }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h6" component="span" sx={{ fontWeight: 700, display: 'block' }}>
                {asset?.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {asset?.code} · {formatLocation(asset?.locationText ?? null)}
              </Typography>
            </Box>
            <IconButton onClick={onClose} aria-label={t('Close detail popup')}>
              <Close />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ p: { xs: 2, sm: 3 } }}>
          <Box sx={{ mb: 1.5 }}>{asset && <StatusChip status={asset.status} />}</Box>
        {asset && editingCurrentAsset && (
          <Stack spacing={1.5} sx={{ my: 2 }}>
            <TextField label={t('Asset name')} value={editName} onChange={(e) => setEditName(e.target.value)} required />
            <TextField label={t('Location')} value={editLocation} onChange={(e) => setEditLocation(e.target.value)} required />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField label={t('Latitude')} value={editLatitude} onChange={(e) => setEditLatitude(e.target.value)} error={parsedEditLatitude === undefined} fullWidth />
              <TextField label={t('Longitude')} value={editLongitude} onChange={(e) => setEditLongitude(e.target.value)} error={parsedEditLongitude === undefined} fullWidth />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField label={t('Structure height (m)')} value={editHeight} onChange={(e) => setEditHeight(e.target.value)} error={parsedEditHeight === undefined} fullWidth />
              <TextField label={t('Footprint area (m²)')} value={editArea} onChange={(e) => setEditArea(e.target.value)} error={parsedEditArea === undefined} fullWidth />
            </Stack>
            <TextField label={t('Description')} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} multiline rows={2} />
            {updateMutation.isError && <Alert severity="error">{getErrorMessage(updateMutation.error, t('Could not update the asset.'))}</Alert>}
            <Stack direction="row" sx={{ justifyContent: 'flex-end' }} spacing={1}>
              <Button onClick={() => setEditing(false)}>{t('Cancel')}</Button>
              <Button variant="contained" disabled={editInvalid || updateMutation.isPending} onClick={saveAssetEdit}>{t('Save changes')}</Button>
            </Stack>
          </Stack>
        )}
        {asset && activeImageDoc && (
          <Stack spacing={1} sx={{ my: 1.5 }}>
            <Box
              sx={{
                p: 1,
                borderRadius: '10px',
                overflow: 'hidden',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.default',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'relative',
              }}
            >
              <AuthenticatedImage
                src={`/assets/${asset.id}/documents/${activeImageDoc.id}/content`}
                alt={activeImageDoc.fileName || asset.name}
                maxHeight={380}
                sx={{
                  width: '100%',
                  height: 'auto',
                  maxHeight: 380,
                  objectFit: 'contain',
                  borderRadius: '6px',
                }}
              />
              {imageDocs.length > 1 && (
                <Chip
                  size="small"
                  label={`${imageDocs.findIndex((d) => d.id === activeImageDoc.id) + 1} / ${imageDocs.length}`}
                  sx={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    bgcolor: 'rgba(15, 23, 42, 0.72)',
                    color: '#FFFFFF',
                    fontWeight: 600,
                  }}
                />
              )}
            </Box>
            {imageDocs.length > 1 && (
              <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 0.5 }}>
                {imageDocs.map((imgDoc) => {
                  const isSelected = imgDoc.id === activeImageDoc.id;
                  return (
                    <Box
                      key={imgDoc.id}
                      onClick={() => setActiveImageId(imgDoc.id)}
                      sx={{
                        width: 72,
                        height: 54,
                        flexShrink: 0,
                        borderRadius: '8px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        border: '2px solid',
                        borderColor: isSelected ? 'primary.main' : 'divider',
                        opacity: isSelected ? 1 : 0.72,
                        transition: 'all 0.15s ease',
                        '&:hover': { opacity: 1 },
                      }}
                    >
                      <AuthenticatedImage
                        src={`/assets/${asset.id}/documents/${imgDoc.id}/content`}
                        alt={imgDoc.fileName}
                        maxHeight={54}
                        sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Stack>
        )}
        {asset?.status === 'RETIRED' && (
          <Alert severity="info" sx={{ my: 1.5, borderRadius: '8px', fontSize: '0.875rem' }}>
            {t(
              'This asset has been completed and archived. Inspection history and documents remain available for audit and reference.',
            )}
          </Alert>
        )}
        {asset && !isClient && (
          <InspectionItemsSection
            asset={asset}
            canEdit={canEditInspectionItems && asset.status !== 'RETIRED'}
            onAssetUpdated={onAssetUpdated}
          />
        )}
        {asset && (
          <AssetInspectionHistorySection
            assetId={asset.id}
            onSelectInspection={(id) => {
              onSelectInspection?.(id);
              onClose();
            }}
          />
        )}
        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" gutterBottom>
          Tài liệu đính kèm
        </Typography>
        {downloadDenied ? (
          <Alert severity="warning" data-testid="document-access-denied">
            <strong>{t('Permission required')}</strong> —{' '}
            {getErrorMessage(
              downloadError ?? documents.error,
              'You are not allowed to view these documents.',
            )}
          </Alert>
        ) : documents.isLoading ? (
          <Typography variant="body2" color="text.secondary">
            {t('Loading documents…')}
          </Typography>
        ) : documents.error ? (
          <Alert severity="error">{t('Could not load documents.')}</Alert>
        ) : documents.data?.length ? (
          <List dense>
            {documents.data.map((document) => (
              <ListItem key={document.id} disableGutters>
                <ListItemText
                  primary={document.fileName}
                  secondary={`${(document.sizeBytes / 1024).toFixed(1)} KB`}
                />
                <Button
                  size="small"
                  startIcon={<DownloadOutlined />}
                  disabled={downloading === document.id}
                  onClick={() => void openDocument(document)}
                >
                  {t('Open')}
                </Button>
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography variant="body2" color="text.secondary">
            {t('No documents uploaded yet.')}
          </Typography>
        )}

        {isClient && (
          <>
            <Divider sx={{ my: 2 }} />
            {uploadAllowed ? (
              <Stack spacing={2}>
                <TextField
                  size="small"
                  type="date"
                  label={t('Document date')}
                  value={documentDate}
                  onChange={(event) => setDocumentDate(event.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <Button variant="outlined" component="label" startIcon={<CloudUploadOutlined />}>
                  {selectedFiles.length > 0
                    ? `Đã chọn ${selectedFiles.length} tệp`
                    : 'Thêm ảnh hoặc tài liệu'}
                  <input
                    hidden
                    multiple
                    type="file"
                    accept="image/png,image/jpeg,image/webp,application/pdf"
                    onChange={(event) => {
                      const picked = Array.from(event.target.files ?? []);
                      if (picked.length === 0) return;
                      const nextItems = picked.map((f) => ({
                        file: f,
                        previewUrl: f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
                      }));
                      setSelectedFiles((prev) => [...prev, ...nextItems]);
                      event.target.value = '';
                    }}
                  />
                </Button>
                {selectedFiles.length > 0 && (
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(92px, 1fr))',
                      gap: 1,
                    }}
                  >
                    {selectedFiles.map((item, idx) => (
                      <Box
                        key={`${item.file.name}-${item.file.size}-${idx}`}
                        sx={{
                          position: 'relative',
                          borderRadius: '8px',
                          border: '1px solid',
                          borderColor: 'divider',
                          overflow: 'hidden',
                          bgcolor: 'background.default',
                        }}
                      >
                        {item.previewUrl ? (
                          <Box
                            component="img"
                            src={item.previewUrl}
                            alt={item.file.name}
                            sx={{
                              width: '100%',
                              height: 76,
                              objectFit: 'cover',
                              display: 'block',
                            }}
                          />
                        ) : (
                          <Box
                            sx={{
                              height: 76,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              px: 0.75,
                              textAlign: 'center',
                            }}
                          >
                            <Typography variant="caption" noWrap sx={{ maxWidth: '100%' }}>
                              {item.file.name}
                            </Typography>
                          </Box>
                        )}
                        <IconButton
                          size="small"
                          aria-label={t('Remove file')}
                          onClick={() => {
                            if (item.previewUrl) {
                              URL.revokeObjectURL(item.previewUrl);
                            }
                            setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
                          }}
                          sx={{
                            position: 'absolute',
                            top: 2,
                            right: 2,
                            bgcolor: 'rgba(15, 23, 42, 0.72)',
                            color: '#FFFFFF',
                            p: 0.25,
                            '&:hover': { bgcolor: 'rgba(15, 23, 42, 0.9)' },
                          }}
                        >
                          <Close sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Box>
                    ))}
                  </Box>
                )}
                {upload.isError && (
                  <Alert severity="error">{getErrorMessage(upload.error, 'Upload failed.')}</Alert>
                )}
                <Button
                  variant="contained"
                  disabled={selectedFiles.length === 0 || upload.isPending || uploadingBatch}
                  onClick={async () => {
                    if (selectedFiles.length === 0) return;
                    setUploadingBatch(true);
                    let assignedPrimary = Boolean(primaryImageDoc);
                    try {
                      for (const item of selectedFiles) {
                        const isImg = item.file.type.startsWith('image/');
                        const shouldSetPrimary = isImg && !assignedPrimary;
                        await upload.mutateAsync({
                          file: item.file,
                          documentType: isImg ? 'ASSET_PHOTO' : 'OTHER',
                          ...(documentDate ? { documentDate } : {}),
                          ...(shouldSetPrimary ? { primaryImage: true } : {}),
                        });
                        if (shouldSetPrimary) {
                          assignedPrimary = true;
                        }
                      }
                      setDownloadError(null);
                      for (const item of selectedFiles) {
                        if (item.previewUrl) {
                          URL.revokeObjectURL(item.previewUrl);
                        }
                      }
                      setSelectedFiles([]);
                    } finally {
                      setUploadingBatch(false);
                    }
                  }}
                >
                  {uploadingBatch || upload.isPending ? t('Uploading…') : t('Upload')}
                </Button>
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                {t('Document upload is available after review.')}
              </Typography>
            )}
          </>
        )}

        {isClient && asset?.status === 'ACTIVE' && (
          <>
            <Divider sx={{ my: 2.5 }} />
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}>
                {t('Lifecycle & Archive')}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                {t('Archive this asset when inspection and maintenance operations are complete. Historical records remain preserved.')}
              </Typography>
              <Button
                variant="outlined"
                color="error"
                fullWidth
                size="small"
                onClick={() => setConfirmRetireOpen(true)}
                sx={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  borderRadius: '8px',
                  borderColor: 'error.light',
                  color: 'error.main',
                  '&:hover': { bgcolor: 'action.hover', borderColor: 'error.main' },
                }}
              >
                {t('Complete & Archive Asset')}
              </Button>
            </Box>
          </>
        )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          {asset && isClient && asset.status !== 'RETIRED' && !editingCurrentAsset && (
            <Button variant="outlined" onClick={startEditing}>
              {t('Edit asset')}
            </Button>
          )}
          <Button onClick={onClose}>{t('Close')}</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={confirmRetireOpen}
        onClose={() => setConfirmRetireOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {t('Complete & Archive Asset')}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
            {t(
              'Are you sure you want to complete work and archive this asset? The asset will be set to RETIRED. All historical inspections, reports, and evidence will remain safely preserved in the history section.',
            )}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmRetireOpen(false)} disabled={retireMutation.isPending}>
            {t('Cancel')}
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmRetire}
            disabled={retireMutation.isPending}
            sx={{ fontWeight: 600 }}
          >
            {retireMutation.isPending ? t('Archiving…') : t('Confirm Archive')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default AssetsPage;
