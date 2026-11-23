import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
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
import SearchRounded from '@mui/icons-material/SearchRounded';
import ApartmentRounded from '@mui/icons-material/ApartmentRounded';
import EditOutlined from '@mui/icons-material/EditOutlined';
import PhotoLibraryOutlined from '@mui/icons-material/PhotoLibraryOutlined';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import ChevronLeftRounded from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import InsertDriveFileOutlined from '@mui/icons-material/InsertDriveFileOutlined';
import AddPhotoAlternateOutlined from '@mui/icons-material/AddPhotoAlternateOutlined';
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded';
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
import { formatLocationLabel } from '@/shared/ui/formatLocation';
import {
  AssetLocationPickerModal,
  GoogleMapsLocationCard,
  buildGoogleMapsExternalUrl,
} from '../components/AssetLocationPickerModal';
import { evaluateAirspace } from '@/shared/airspace/airspaceZones';

const DOCUMENT_TYPES = ['OWNERSHIP', 'INSPECTION_HISTORY', 'MAINTENANCE_RECORD', 'OTHER'] as const;

function formatLocation(text: string | null): string {
  return formatLocationLabel(text);
}

function formatGpsLocationText(locale: string, lat: number, lon: number): string {
  return locale === 'vi'
    ? `Vị trí hiện tại (${lat.toFixed(4)}, ${lon.toFixed(4)})`
    : `Current Location (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
}

function formatPinnedLocationText(
  locale: string,
  lat: number,
  lon: number,
  placeName?: string,
): string {
  const trimmed = placeName?.trim();
  if (trimmed) return trimmed;
  return locale === 'vi'
    ? `Vị trí đã ghim (${lat.toFixed(4)}, ${lon.toFixed(4)})`
    : `Pinned Location (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
}

function ReadOnlyLocationField({ value }: { value: string }) {
  const { locale, t } = useLocale();
  return (
    <TextField
      label={t('Location')}
      required
      fullWidth
      value={value}
      placeholder={
        locale === 'vi'
          ? 'Chọn vị trí bằng GPS hoặc Google Maps bên dưới'
          : 'Select a location via GPS or Google Maps below'
      }
      helperText={
        locale === 'vi'
          ? 'Chỉ đọc — dùng "Lấy GPS của tôi" hoặc "Chọn trên Google Maps" bên dưới để cập nhật vị trí.'
          : 'Read-only — use "Use my GPS" or "Pick on Google Maps" below to set the location.'
      }
      slotProps={{
        input: { readOnly: true },
        htmlInput: { readOnly: true },
      }}
      sx={{
        '& .MuiInputBase-root': { bgcolor: 'action.hover' },
        '& .MuiInputBase-input': {
          cursor: 'default',
          caretColor: 'transparent',
        },
      }}
    />
  );
}

function AssetCard({
  asset,
  categoryName,
  isClient,
  onSelect,
  onRequestInspection,
}: {
  asset: Asset;
  categoryName?: string | undefined;
  isClient: boolean;
  onSelect: (asset: Asset) => void;
  onRequestInspection?: ((asset: Asset) => void) | undefined;
}) {
  const { t } = useLocale();
  const documents = useAssetDocuments(asset.id);
  const imageDocs = (documents.data ?? []).filter((doc) =>
    doc.contentType?.toLowerCase().startsWith('image/'),
  );
  const primaryImage = imageDocs[0];
  const checkpointCount = asset.inspectionItems?.length ?? 0;

  return (
    <Card
      variant="outlined"
      onClick={() => onSelect(asset)}
      sx={{
        p: 2.5,
        borderRadius: '12px',
        borderColor: 'divider',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: 'pointer',
        transition: 'border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease',
        '&:hover': {
          borderColor: 'primary.light',
          boxShadow: '0 6px 18px rgba(15, 23, 42, 0.08)',
        },
      }}
    >
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1.5 }}>
          <Box sx={{ display: 'flex', gap: 1.75, alignItems: 'flex-start', minWidth: 0, flex: 1 }}>
            <Box
              sx={{
                width: 84,
                height: 84,
                flexShrink: 0,
                borderRadius: '10px',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'action.hover',
                display: 'grid',
                placeItems: 'center',
                color: 'primary.main',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {primaryImage ? (
                <>
                  <AuthenticatedImage
                    src={`/assets/${asset.id}/documents/${primaryImage.id}/content`}
                    alt={asset.name}
                    maxHeight={84}
                    sx={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                  />
                  {imageDocs.length > 1 && (
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 4,
                        right: 4,
                        px: 0.75,
                        py: 0.125,
                        borderRadius: '6px',
                        bgcolor: 'rgba(15, 23, 42, 0.78)',
                        color: '#FFFFFF',
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        lineHeight: 1.4,
                      }}
                    >
                      1/{imageDocs.length}
                    </Box>
                  )}
                </>
              ) : (
                <ApartmentRounded sx={{ fontSize: 30 }} />
              )}
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
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
                {asset.footprintAreaSquareMeters != null && (
                  <Chip
                    size="small"
                    variant="outlined"
                    label={`${asset.footprintAreaSquareMeters} m²`}
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
              {t('Google Maps')}
            </Typography>
            {asset.latitude != null && asset.longitude != null ? (
              <Button
                size="small"
                variant="text"
                component="a"
                href={buildGoogleMapsExternalUrl(asset.latitude, asset.longitude)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => event.stopPropagation()}
                endIcon={<OpenInNewRounded sx={{ fontSize: 14 }} />}
                sx={{
                  p: 0,
                  minWidth: 0,
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  textTransform: 'none',
                }}
              >
                {t('Open Google Maps')}
              </Button>
            ) : (
              <Typography sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.875rem' }}>
                —
              </Typography>
            )}
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
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 1,
          flexWrap: 'wrap',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
          {imageDocs.length > 0 ? (
            <Chip
              size="small"
              icon={<PhotoLibraryOutlined sx={{ fontSize: 14 }} />}
              label={`${imageDocs.length} ${t('photos')}`}
              variant="outlined"
              sx={{ height: 24, fontSize: '0.75rem', borderRadius: '6px' }}
            />
          ) : isClient && asset.status !== 'RETIRED' ? (
            <Typography variant="caption" color="text.secondary" noWrap>
              {t('No photo yet — open details to upload')}
            </Typography>
          ) : null}
        </Box>

        <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
          {isClient && asset.status === 'ACTIVE' && onRequestInspection && (
            <Button
              size="small"
              variant="text"
              endIcon={<ArrowForwardRounded sx={{ fontSize: 16 }} />}
              onClick={(event) => {
                event.stopPropagation();
                onRequestInspection(asset);
              }}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.8125rem',
                borderRadius: '8px',
              }}
            >
              {t('Request inspection')}
            </Button>
          )}
          <Button
            size="small"
            variant="outlined"
            onClick={(event) => {
              event.stopPropagation();
              onSelect(asset);
            }}
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
        </Stack>
      </Box>
    </Card>
  );
}

export function AssetsPage() {
  const { formatNumber, t } = useLocale();
  const navigate = useNavigate();
  const roles = useAuthStore((state) => state.roles);
  const isClient = roles.includes('CUSTOMER');
  const { data, isLoading, error, refetch } = useAssets({ page: 1, pageSize: 50 });
  const createAsset = useCreateAsset();
  const uploadInitialPhoto = useUploadDocument('');
  const showToast = useToastStore((state) => state.showToast);
  const categories = useCategories();

  const [createOpen, setCreateOpen] = useState(false);
  const [uploadingInitialPhotos, setUploadingInitialPhotos] = useState(false);
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
            {filteredItems.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                categoryName={categoryNameById.get(asset.categoryId)}
                isClient={isClient}
                onSelect={(picked) => setSelected(picked)}
                onRequestInspection={() => navigate('/client/contracts')}
              />
            ))}
          </Box>
        )}
      </QueryState>

      <CreateAssetDialog
        open={createOpen}
        onClose={() => {
          if (!uploadingInitialPhotos) setCreateOpen(false);
        }}
        categories={categories.data ?? []}
        pending={createAsset.isPending || uploadingInitialPhotos}
        errorMessage={
          createAsset.isError
            ? getErrorMessage(createAsset.error, 'Could not create the asset.')
            : null
        }
        onSubmit={(input, initialPhotos) =>
          createAsset.mutate(input, {
            onSuccess: async (created) => {
              const filesToUpload = initialPhotos ?? [];
              if (filesToUpload.length > 0 && created?.id) {
                setUploadingInitialPhotos(true);
                let failedCount = 0;
                let lastError: unknown = null;
                try {
                  for (let i = 0; i < filesToUpload.length; i++) {
                    const file = filesToUpload[i]!;
                    try {
                      if (uploadInitialPhoto.mutateAsync) {
                        await uploadInitialPhoto.mutateAsync({
                          assetId: created.id,
                          file,
                          documentType: 'ASSET_PHOTO',
                          primaryImage: i === 0,
                        });
                      } else {
                        await documentApi.upload(
                          created.id,
                          file,
                          'ASSET_PHOTO',
                          undefined,
                          i === 0,
                        );
                      }
                    } catch (uploadError) {
                      failedCount++;
                      lastError = uploadError;
                    }
                  }
                } finally {
                  setUploadingInitialPhotos(false);
                }
                if (failedCount > 0) {
                  showToast(
                    getErrorMessage(
                      lastError,
                      t(
                        `The asset was created, but ${failedCount} photo(s) could not be uploaded. Try again from the asset details.`,
                      ),
                    ),
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
        categoryName={selected ? categoryNameById.get(selected.categoryId) : undefined}
        onClose={() => setSelected(null)}
        onAssetUpdated={(updated) => setSelected(updated)}
        onSelectInspection={(id) => setSelectedInspectionId(id)}
        onRequestInspection={() => {
          setSelected(null);
          navigate('/client/contracts');
        }}
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
    initialPhotos?: File[],
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
  const [code, setCode] = useState(() => generateRandomAssetCode());
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [locationText, setLocationText] = useState('');
  const [latitude, setLatitude] = useState<number | null>(10.7789);
  const [longitude, setLongitude] = useState<number | null>(106.7082);
  const [mapPlaceLabel, setMapPlaceLabel] = useState<string | null>(null);
  const [heightText, setHeightText] = useState('');
  const [areaText, setAreaText] = useState('');
  const [description, setDescription] = useState('');
  const [initialPhotos, setInitialPhotos] = useState<Array<{ file: File; previewUrl: string }>>([]);
  const photoUrlsRef = useRef<string[]>([]);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsFeedback, setGpsFeedback] = useState<string | null>(null);

  useEffect(() => {
    const urls = photoUrlsRef.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

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
        setLatitude(lat);
        setLongitude(lon);
        setMapPlaceLabel(locale === 'vi' ? 'Vị trí GPS thiết bị' : 'Current device GPS');
        setGpsFeedback(
          locale === 'vi'
            ? '✓ Đã cập nhật vị trí GPS hiện tại lên Google Maps.'
            : '✓ Updated Google Maps pin to your current GPS location.',
        );
        setLocationText(formatGpsLocationText(locale, lat, lon));
      },
      () => {
        setGpsLoading(false);
        setGpsFeedback(
          locale === 'vi'
            ? 'Không lấy được GPS (chưa cấp quyền vị trí). Vui lòng chọn trực tiếp trên Google Maps.'
            : 'Could not retrieve GPS location (permission denied). Please pick directly on Google Maps.',
        );
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const activeCategories = categories.filter((category) => category.active);

  const heightValue = parseDimension(heightText);
  const areaValue = parseDimension(areaText);
  const dimensionsInvalid = heightValue === undefined || areaValue === undefined;
  const locationMissing = !locationText.trim();
  const isNoFlyZone =
    latitude != null &&
    longitude != null &&
    evaluateAirspace(latitude, longitude).classification === 'NO_FLY_ZONE';

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (dimensionsInvalid || isNoFlyZone || locationMissing) return;
    onSubmit(
      {
        code,
        name,
        categoryId,
        locationText,
        latitude,
        longitude,
        description: description || null,
        inspectionItems: [],
        structureHeightMeters: heightValue,
        footprintAreaSquareMeters: areaValue,
      },
      initialPhotos.map((item) => item.file),
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
            label={t('Description')}
            multiline
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <ReadOnlyLocationField value={locationText} />
          <GoogleMapsLocationCard
            latitude={latitude}
            longitude={longitude}
            placeLabel={mapPlaceLabel}
            gpsLoading={gpsLoading}
            gpsFeedback={gpsFeedback}
            onUseMyGps={handleGetCurrentGpsLocation}
            onOpenMapPicker={() => setMapPickerOpen(true)}
            onClearLocation={() => {
              setLatitude(null);
              setLongitude(null);
              setMapPlaceLabel(null);
              setGpsFeedback(null);
              setLocationText('');
            }}
          />

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
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 650, color: 'text.primary' }}>
                  {t('Asset photos (optional)')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('Attach reference photos of the structure so reviewers and pilots can identify it visually.')}
                </Typography>
              </Box>
              <Button
                variant="outlined"
                size="small"
                component="label"
                startIcon={<CloudUploadOutlined />}
                sx={{ textTransform: 'none', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}
              >
                {initialPhotos.length > 0
                  ? `${t('Add photos')} (${initialPhotos.length})`
                  : t('Choose images')}
                <input
                  hidden
                  multiple
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => {
                    const picked = Array.from(event.target.files ?? []);
                    if (picked.length === 0) return;
                    const nextItems = picked.map((file) => {
                      const previewUrl = URL.createObjectURL(file);
                      photoUrlsRef.current.push(previewUrl);
                      return { file, previewUrl };
                    });
                    setInitialPhotos((prev) => [...prev, ...nextItems]);
                    event.target.value = '';
                  }}
                />
              </Button>
            </Stack>
            {initialPhotos.length > 0 && (
              <Box
                sx={{
                  mt: 1.5,
                  display: 'grid',
                  gridTemplateColumns:
                    initialPhotos.length === 1
                      ? '1fr'
                      : 'repeat(auto-fill, minmax(160px, 1fr))',
                  gap: 1.25,
                }}
              >
                {initialPhotos.map((item, idx) => (
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
                    <Box
                      sx={{
                        height: initialPhotos.length === 1 ? 260 : 160,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        p: 0.75,
                        bgcolor: 'background.default',
                      }}
                    >
                      <Box
                        component="img"
                        src={item.previewUrl}
                        alt={item.file.name || name || t('Asset preview')}
                        sx={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          width: 'auto',
                          height: 'auto',
                          objectFit: 'contain',
                          display: 'block',
                          borderRadius: '4px',
                        }}
                      />
                    </Box>
                    {idx === 0 && initialPhotos.length > 1 && (
                      <Chip
                        size="small"
                        color="primary"
                        label={t('Primary')}
                        sx={{
                          position: 'absolute',
                          top: 6,
                          left: 6,
                          height: 20,
                          fontSize: '0.6875rem',
                          fontWeight: 600,
                        }}
                      />
                    )}
                    <IconButton
                      size="small"
                      aria-label={t('Remove photo')}
                      onClick={() => {
                        URL.revokeObjectURL(item.previewUrl);
                        photoUrlsRef.current = photoUrlsRef.current.filter((u) => u !== item.previewUrl);
                        setInitialPhotos((prev) => prev.filter((_, index) => index !== idx));
                      }}
                      sx={{
                        position: 'absolute',
                        top: 6,
                        right: 6,
                        bgcolor: 'rgba(15, 23, 42, 0.72)',
                        color: '#FFFFFF',
                        '&:hover': { bgcolor: 'rgba(15, 23, 42, 0.92)' },
                      }}
                    >
                      <Close sx={{ fontSize: 14 }} />
                    </IconButton>
                    <Typography
                      variant="caption"
                      noWrap
                      title={item.file.name}
                      sx={{
                        display: 'block',
                        px: 1,
                        py: 0.5,
                        borderTop: '1px solid',
                        borderColor: 'divider',
                        color: 'text.secondary',
                        bgcolor: 'background.paper',
                      }}
                    >
                      {item.file.name}
                    </Typography>
                  </Box>
                ))}
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
          disabled={pending || dimensionsInvalid || isNoFlyZone || locationMissing}
        >
          {pending ? 'Creating…' : 'Create Asset'}
        </Button>
      </DialogActions>

      <AssetLocationPickerModal
        open={mapPickerOpen}
        onClose={() => setMapPickerOpen(false)}
        initialLatitude={latitude}
        initialLongitude={longitude}
        assetName={name}
        onApplyCoordinates={(lat, lon, placeName) => {
          setLatitude(lat);
          setLongitude(lon);
          setMapPlaceLabel(placeName ?? null);
          setLocationText(formatPinnedLocationText(locale, lat, lon, placeName));
          setGpsFeedback(
            locale === 'vi'
              ? `✓ Đã ghim vị trí trên Google Maps${placeName ? `: ${placeName}` : ''}.`
              : `✓ Pinned location on Google Maps${placeName ? `: ${placeName}` : ''}.`,
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
  const editable = canEdit && asset.status !== 'RETIRED' && !asset.checkpointsLocked;

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
        {editable && !editing && (
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
      {canEdit && asset.checkpointsLocked && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          {t('Checkpoints are locked after the first inspection.')}
        </Typography>
      )}

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
  categoryName,
  onClose,
  onAssetUpdated,
  onSelectInspection,
  onRequestInspection,
}: {
  asset: Asset | null;
  categoryName?: string | undefined;
  onClose: () => void;
  onAssetUpdated?: (updated: Asset) => void;
  onSelectInspection?: (inspectionId: string) => void;
  onRequestInspection?: ((asset: Asset) => void) | undefined;
}) {
  const { locale, t } = useLocale();
  const roles = useAuthStore((state) => state.roles);
  const isClient = roles.includes('CUSTOMER');
  const canEditInspectionItems = isClient;
  const updateMutation = useUpdateAsset();
  const retireMutation = useRetireAsset();
  const [confirmRetireOpen, setConfirmRetireOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editLatitude, setEditLatitude] = useState<number | null>(null);
  const [editLongitude, setEditLongitude] = useState<number | null>(null);
  const [editPlaceLabel, setEditPlaceLabel] = useState<string | null>(null);
  const [editGpsLoading, setEditGpsLoading] = useState(false);
  const [editGpsFeedback, setEditGpsFeedback] = useState<string | null>(null);
  const [editHeight, setEditHeight] = useState('');
  const [editArea, setEditArea] = useState('');
  const [editAssetId, setEditAssetId] = useState<string | null>(null);
  const [editMapPickerOpen, setEditMapPickerOpen] = useState(false);
  const editingCurrentAsset = editing && editAssetId === asset?.id;
  const startEditing = () => {
    if (!asset) return;
    setEditAssetId(asset.id);
    setEditName(asset.name);
    setEditDescription(asset.description ?? '');
    setEditLocation(formatLocation(asset.locationText) === '—' ? '' : formatLocation(asset.locationText));
    setEditLatitude(asset.latitude);
    setEditLongitude(asset.longitude);
    setEditPlaceLabel(null);
    setEditGpsFeedback(null);
    setEditHeight(asset.structureHeightMeters == null ? '' : String(asset.structureHeightMeters));
    setEditArea(asset.footprintAreaSquareMeters == null ? '' : String(asset.footprintAreaSquareMeters));
    setEditing(true);
  };

  const handleEditCurrentGpsLocation = () => {
    setEditGpsFeedback(null);
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setEditGpsFeedback(
        locale === 'vi'
          ? 'Trình duyệt không hỗ trợ định vị GPS.'
          : 'Browser does not support GPS geolocation.',
      );
      return;
    }
    setEditGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setEditGpsLoading(false);
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lon = Number(pos.coords.longitude.toFixed(6));
        setEditLatitude(lat);
        setEditLongitude(lon);
        setEditPlaceLabel(locale === 'vi' ? 'Vị trí GPS thiết bị' : 'Current device GPS');
        setEditGpsFeedback(
          locale === 'vi'
            ? '✓ Đã cập nhật vị trí GPS hiện tại lên Google Maps.'
            : '✓ Updated Google Maps pin to your current GPS location.',
        );
        setEditLocation(formatGpsLocationText(locale, lat, lon));
      },
      () => {
        setEditGpsLoading(false);
        setEditGpsFeedback(
          locale === 'vi'
            ? 'Không lấy được GPS. Vui lòng chọn trực tiếp trên Google Maps.'
            : 'Could not retrieve GPS location. Please pick directly on Google Maps.',
        );
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const documents = useAssetDocuments(asset?.id ?? '');
  const upload = useUploadDocument(asset?.id ?? '');
  const [documentType, setDocumentType] = useState<string>('OWNERSHIP');
  const [documentDate, setDocumentDate] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<Array<{ file: File; previewUrl: string | null }>>([]);
  const [uploadingBatch, setUploadingBatch] = useState(false);
  const [activeImageId, setActiveImageId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<unknown>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setActiveImageId(null);
    setEditing(false);
    setSelectedFiles([]);
    setDocumentDate('');
    setDocumentType('OWNERSHIP');
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
  const activeImageIndex = activeImageDoc
    ? imageDocs.findIndex((doc) => doc.id === activeImageDoc.id)
    : -1;
  const hasNonImageSelected = selectedFiles.some(
    (item) => !item.file.type.startsWith('image/'),
  );

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
  const isEditNoFlyZone =
    editLatitude != null &&
    editLongitude != null &&
    evaluateAirspace(editLatitude, editLongitude).classification === 'NO_FLY_ZONE';
  const editInvalid =
    !editName.trim() ||
    !editLocation.trim() ||
    parsedEditHeight === undefined ||
    parsedEditArea === undefined ||
    isEditNoFlyZone;
  const saveAssetEdit = () => {
    if (!asset || editInvalid) return;
    updateMutation.mutate(
      {
        assetId: asset.id,
        input: {
          name: editName.trim(),
          description: editDescription.trim() || null,
          locationText: editLocation.trim(),
          latitude: editLatitude,
          longitude: editLongitude,
          structureHeightMeters: parsedEditHeight ?? null,
          footprintAreaSquareMeters: parsedEditArea ?? null,
          clearCoordinates: editLatitude == null || editLongitude == null,
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

  const clearSelectedFiles = () => {
    for (const item of selectedFiles) {
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
    }
    setSelectedFiles([]);
  };

  const handleUploadSelectedFiles = async () => {
    if (selectedFiles.length === 0) return;

    if (selectedFiles.length === 1) {
      const single = selectedFiles[0]!;
      const isImg = single.file.type.startsWith('image/');
      const shouldSetPrimary = isImg && !primaryImageDoc;
      upload.mutate(
        {
          file: single.file,
          documentType: isImg ? 'ASSET_PHOTO' : documentType,
          ...(documentDate ? { documentDate } : {}),
          ...(shouldSetPrimary ? { primaryImage: true } : {}),
        },
        {
          onSuccess: () => {
            setDownloadError(null);
            clearSelectedFiles();
          },
        },
      );
      return;
    }

    setUploadingBatch(true);
    let assignedPrimary = Boolean(primaryImageDoc);
    try {
      for (const item of selectedFiles) {
        const isImg = item.file.type.startsWith('image/');
        const shouldSetPrimary = isImg && !assignedPrimary;
        const payload = {
          file: item.file,
          documentType: isImg ? 'ASSET_PHOTO' : documentType,
          ...(documentDate ? { documentDate } : {}),
          ...(shouldSetPrimary ? { primaryImage: true } : {}),
        };
        if (upload.mutateAsync) {
          await upload.mutateAsync(payload);
        } else {
          await new Promise<void>((resolve, reject) => {
            upload.mutate(payload, {
              onSuccess: () => resolve(),
              onError: (err) => reject(err),
            });
          });
        }
        if (shouldSetPrimary) {
          assignedPrimary = true;
        }
      }
      setDownloadError(null);
      clearSelectedFiles();
    } finally {
      setUploadingBatch(false);
    }
  };

  const triggerPickFiles = () => {
    uploadSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    fileInputRef.current?.click();
  };

  const stepActiveImage = (delta: number) => {
    if (imageDocs.length <= 1 || activeImageIndex < 0) return;
    const nextIndex = (activeImageIndex + delta + imageDocs.length) % imageDocs.length;
    const nextDoc = imageDocs[nextIndex];
    if (nextDoc) {
      setActiveImageId(nextDoc.id);
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
          <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box sx={{ minWidth: 0 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant="h6" component="span" sx={{ fontWeight: 700 }}>
                  {asset?.name}
                </Typography>
                {asset && <StatusChip status={asset.status} />}
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {asset?.code}
                {categoryName ? ` · ${categoryName}` : ''}
                {` · ${formatLocation(asset?.locationText ?? null)}`}
              </Typography>
            </Box>
            <IconButton onClick={onClose} aria-label={t('Close detail popup')}>
              <Close />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent dividers sx={{ p: { xs: 2, sm: 3 } }}>
          {asset && editingCurrentAsset ? (
            <Stack spacing={2}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                {t('Edit asset details')}
              </Typography>
              <TextField
                label={t('Asset name')}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                fullWidth
              />
              <TextField
                label={t('Description')}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                multiline
                rows={3}
                fullWidth
              />
              <ReadOnlyLocationField value={editLocation} />
              <GoogleMapsLocationCard
                latitude={editLatitude}
                longitude={editLongitude}
                placeLabel={editPlaceLabel}
                gpsLoading={editGpsLoading}
                gpsFeedback={editGpsFeedback}
                onUseMyGps={handleEditCurrentGpsLocation}
                onOpenMapPicker={() => setEditMapPickerOpen(true)}
                onClearLocation={() => {
                  setEditLatitude(null);
                  setEditLongitude(null);
                  setEditPlaceLabel(null);
                  setEditGpsFeedback(null);
                  setEditLocation('');
                }}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  label={t('Structure height (m)')}
                  value={editHeight}
                  onChange={(e) => setEditHeight(e.target.value)}
                  error={parsedEditHeight === undefined}
                  fullWidth
                />
                <TextField
                  label={t('Footprint area (m²)')}
                  value={editArea}
                  onChange={(e) => setEditArea(e.target.value)}
                  error={parsedEditArea === undefined}
                  fullWidth
                />
              </Stack>
              {updateMutation.isError && (
                <Alert severity="error">
                  {getErrorMessage(updateMutation.error, t('Could not update the asset.'))}
                </Alert>
              )}
            </Stack>
          ) : (
            <Stack spacing={2.5}>
              {asset?.status === 'RETIRED' && (
                <Alert severity="info" sx={{ borderRadius: '10px', fontSize: '0.875rem' }}>
                  {t(
                    'This asset has been completed and archived. Inspection history and documents remain available for audit and reference.',
                  )}
                </Alert>
              )}
              {isClient && asset?.status === 'PENDING_REVIEW' && (
                <Alert severity="info" sx={{ borderRadius: '10px', fontSize: '0.875rem' }}>
                  {t('Asset is pending review. You can attach photos or supporting documents while waiting.')}
                </Alert>
              )}
              {isClient && asset?.status === 'ACTIVE' && imageDocs.length === 0 && (
                <Alert severity="info" sx={{ borderRadius: '10px', fontSize: '0.875rem' }}>
                  {t('Upload at least one photo so it displays on the asset card and helps pilots recognize the structure.')}
                </Alert>
              )}

              {/* Split Overview: Media Gallery + Specifications */}
              {asset && (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.15fr) minmax(0, 1fr)' },
                    gap: 2,
                    alignItems: 'stretch',
                  }}
                >
                  {/* Photos & Media Card */}
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      minWidth: 0,
                      borderRadius: '12px',
                      borderColor: 'divider',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Box>
                      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mb: 1.25 }}>
                        <PhotoLibraryOutlined sx={{ fontSize: 18, color: 'primary.main' }} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          {t('Photos & Media')}
                        </Typography>
                        {imageDocs.length > 0 && (
                          <Chip
                            size="small"
                            label={imageDocs.length}
                            sx={{ height: 20, fontSize: '0.75rem', fontWeight: 600 }}
                          />
                        )}
                      </Stack>

                      {activeImageDoc ? (
                        <Stack spacing={1}>
                          <Box
                            sx={{
                              borderRadius: '10px',
                              overflow: 'hidden',
                              border: '1px solid',
                              borderColor: 'divider',
                              bgcolor: 'background.default',
                              display: 'flex',
                              justifyContent: 'center',
                              alignItems: 'center',
                              position: 'relative',
                              minHeight: 220,
                            }}
                          >
                            <AuthenticatedImage
                              src={`/assets/${asset.id}/documents/${activeImageDoc.id}/content`}
                              alt={activeImageDoc.fileName || asset.name}
                              maxHeight={280}
                              sx={{
                                width: '100%',
                                height: 'auto',
                                maxHeight: 280,
                                objectFit: 'contain',
                                display: 'block',
                              }}
                            />
                            {imageDocs.length > 1 && (
                              <>
                                <Chip
                                  size="small"
                                  label={`${activeImageIndex + 1} / ${imageDocs.length}`}
                                  sx={{
                                    position: 'absolute',
                                    top: 8,
                                    right: 8,
                                    bgcolor: 'rgba(15, 23, 42, 0.72)',
                                    color: '#FFFFFF',
                                    fontWeight: 600,
                                  }}
                                />
                                <IconButton
                                  size="small"
                                  aria-label="Previous photo"
                                  onClick={() => stepActiveImage(-1)}
                                  sx={{
                                    position: 'absolute',
                                    left: 8,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    bgcolor: 'rgba(15, 23, 42, 0.6)',
                                    color: '#FFFFFF',
                                    '&:hover': { bgcolor: 'rgba(15, 23, 42, 0.85)' },
                                  }}
                                >
                                  <ChevronLeftRounded />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  aria-label="Next photo"
                                  onClick={() => stepActiveImage(1)}
                                  sx={{
                                    position: 'absolute',
                                    right: 8,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    bgcolor: 'rgba(15, 23, 42, 0.6)',
                                    color: '#FFFFFF',
                                    '&:hover': { bgcolor: 'rgba(15, 23, 42, 0.85)' },
                                  }}
                                >
                                  <ChevronRightRounded />
                                </IconButton>
                              </>
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
                                      width: 64,
                                      height: 48,
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
                                      maxHeight={48}
                                      sx={{ width: '100%', height: '100%', objectFit: 'contain', bgcolor: 'background.default' }}
                                    />
                                  </Box>
                                );
                              })}
                            </Stack>
                          )}
                        </Stack>
                      ) : (
                        <Box
                          onClick={uploadAllowed ? triggerPickFiles : undefined}
                          sx={{
                            minHeight: 200,
                            borderRadius: '10px',
                            border: '1px dashed',
                            borderColor: 'divider',
                            bgcolor: 'background.default',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            p: 2.5,
                            textAlign: 'center',
                            cursor: uploadAllowed ? 'pointer' : 'default',
                            transition: 'border-color 150ms ease',
                            ...(uploadAllowed ? { '&:hover': { borderColor: 'primary.main' } } : {}),
                          }}
                        >
                          <AddPhotoAlternateOutlined sx={{ fontSize: 34, color: 'text.secondary', mb: 1 }} />
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                            {t('No photo uploaded yet')}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, maxWidth: 260 }}>
                            {t('Upload a reference photo so reviewers and pilots can visually identify this asset.')}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Paper>

                  {/* Asset Specifications Card */}
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      minWidth: 0,
                      borderRadius: '12px',
                      borderColor: 'divider',
                      bgcolor: 'background.default',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1.5,
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                      {t('Asset specifications')}
                    </Typography>

                    <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 1.5 }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {t('Category')}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>
                          {categoryName ?? '—'}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {t('Asset Code:')}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace', overflowWrap: 'anywhere' }}>
                          {asset.code}
                        </Typography>
                      </Box>
                      <Box sx={{ gridColumn: '1 / -1' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {t('Location')}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>
                          {formatLocation(asset.locationText)}
                        </Typography>
                      </Box>
                      <Box sx={{ gridColumn: '1 / -1' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {t('Google Maps')}
                        </Typography>
                        {asset.latitude != null && asset.longitude != null ? (
                          <Button
                            size="small"
                            variant="text"
                            component="a"
                            href={buildGoogleMapsExternalUrl(asset.latitude, asset.longitude)}
                            target="_blank"
                            rel="noopener noreferrer"
                            endIcon={<OpenInNewRounded sx={{ fontSize: 14 }} />}
                            sx={{ p: 0, minWidth: 0, fontWeight: 600, fontSize: '0.875rem', textTransform: 'none' }}
                          >
                            {t('Open Google Maps')}
                          </Button>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            —
                          </Typography>
                        )}
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {t('Structure height (m)')}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {asset.structureHeightMeters != null ? `${asset.structureHeightMeters} m` : '—'}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {t('Footprint area (m²)')}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {asset.footprintAreaSquareMeters != null
                            ? `${asset.footprintAreaSquareMeters} m²`
                            : '—'}
                        </Typography>
                      </Box>
                    </Box>

                    <Divider />

                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
                        {t('Description')}
                      </Typography>
                      <Typography
                        variant="body2"
                        color={asset.description ? 'text.primary' : 'text.secondary'}
                        sx={{ overflowWrap: 'anywhere' }}
                      >
                        {asset.description?.trim() || t('No description provided.')}
                      </Typography>
                    </Box>
                  </Paper>
                </Box>
              )}

              {/* Attached Documents & Upload Card */}
              <Paper
                ref={uploadSectionRef}
                variant="outlined"
                sx={{ p: 2, borderRadius: '12px', borderColor: 'divider' }}
              >
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.25 }}>
                  <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                    <InsertDriveFileOutlined sx={{ fontSize: 18, color: 'primary.main' }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {t('Attached documents')}
                    </Typography>
                    {documents.data && documents.data.length > 0 && (
                      <Chip
                        size="small"
                        label={documents.data.length}
                        sx={{ height: 20, fontSize: '0.75rem', fontWeight: 600 }}
                      />
                    )}
                  </Stack>
                </Stack>

                {downloadDenied ? (
                  <Alert severity="warning" data-testid="document-access-denied" sx={{ mb: 1.5 }}>
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
                  <Alert severity="error" sx={{ mb: 1.5 }}>
                    {t('Could not load documents.')}
                  </Alert>
                ) : documents.data?.length ? (
                  <List dense disablePadding>
                    {documents.data.map((document) => (
                      <ListItem
                        key={document.id}
                        disableGutters
                        sx={{
                          px: 1.5,
                          py: 1,
                          mb: 0.75,
                          gap: 1.5,
                          borderRadius: '8px',
                          border: '1px solid',
                          borderColor: 'divider',
                          bgcolor: 'background.default',
                        }}
                      >
                        <ListItemText
                          sx={{ minWidth: 0, m: 0 }}
                          primary={
                            <Stack
                              direction="row"
                              spacing={1}
                              sx={{ alignItems: 'center', minWidth: 0 }}
                            >
                              <Typography
                                variant="body2"
                                noWrap
                                title={document.fileName}
                                sx={{ fontWeight: 600, minWidth: 0 }}
                              >
                                {document.fileName}
                              </Typography>
                              <Chip
                                size="small"
                                variant="outlined"
                                label={document.documentType}
                                sx={{ height: 20, fontSize: '0.6875rem', flexShrink: 0 }}
                              />
                            </Stack>
                          }
                          secondary={`${(document.sizeBytes / 1024).toFixed(1)} KB`}
                        />
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<DownloadOutlined />}
                          disabled={downloading === document.id}
                          onClick={() => void openDocument(document)}
                          sx={{ textTransform: 'none', borderRadius: '8px', flexShrink: 0 }}
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
                    {uploadAllowed ? (
                      <>
                        <input
                          ref={fileInputRef}
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
                        {selectedFiles.length > 0 && (
                          <>
                            <Divider sx={{ my: 2 }} />
                            <Stack spacing={1.5}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                {`${t('Selected files')}: ${selectedFiles.length}`}
                              </Typography>
                              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
                                <TextField
                                  size="small"
                                  type="date"
                                  label={t('Document date')}
                                  value={documentDate}
                                  onChange={(event) => setDocumentDate(event.target.value)}
                                  slotProps={{ inputLabel: { shrink: true } }}
                                />
                                {hasNonImageSelected && (
                                  <TextField
                                    select
                                    size="small"
                                    label={t('Document type')}
                                    value={documentType}
                                    onChange={(event) => setDocumentType(event.target.value)}
                                    sx={{ minWidth: 180 }}
                                  >
                                    {DOCUMENT_TYPES.map((typeOption) => (
                                      <MenuItem key={typeOption} value={typeOption}>
                                        {typeOption}
                                      </MenuItem>
                                    ))}
                                  </TextField>
                                )}
                              </Stack>

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
                                          height: 110,
                                          objectFit: 'contain',
                                          display: 'block',
                                          bgcolor: 'background.default',
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
                              {upload.isError && (
                                <Alert severity="error">{getErrorMessage(upload.error, 'Upload failed.')}</Alert>
                              )}
                              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <Button
                                  variant="contained"
                                  disabled={upload.isPending || uploadingBatch}
                                  onClick={() => void handleUploadSelectedFiles()}
                                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
                                >
                                  {uploadingBatch || upload.isPending ? t('Uploading…') : t('Upload document')}
                                </Button>
                              </Box>
                            </Stack>
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="body2" color="text.secondary">
                          {t('Document upload is available after review.')}
                        </Typography>
                      </>
                    )}
                  </>
                )}
              </Paper>

              {asset && (
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
            </Stack>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            px: 3,
            py: 1.5,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          {asset && editingCurrentAsset ? (
            <Stack direction="row" spacing={1} sx={{ ml: 'auto' }}>
              <Button onClick={() => setEditing(false)} sx={{ textTransform: 'none' }}>
                {t('Cancel')}
              </Button>
              <Button
                variant="contained"
                disabled={editInvalid || updateMutation.isPending}
                onClick={saveAssetEdit}
                sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
              >
                {t('Save changes')}
              </Button>
            </Stack>
          ) : (
            <>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                {asset && isClient && asset.status !== 'RETIRED' && (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<EditOutlined sx={{ fontSize: 16 }} />}
                    onClick={startEditing}
                    sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
                  >
                    {t('Edit asset')}
                  </Button>
                )}
                {uploadAllowed && (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<CloudUploadOutlined sx={{ fontSize: 16 }} />}
                    onClick={triggerPickFiles}
                    sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
                  >
                    {t('Add photos or documents')}
                  </Button>
                )}
                {isClient && asset?.status === 'ACTIVE' && (
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={() => setConfirmRetireOpen(true)}
                    sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
                  >
                    {t('Complete & Archive Asset')}
                  </Button>
                )}
              </Stack>
              <Stack direction="row" spacing={1} sx={{ ml: 'auto' }}>
                <Button onClick={onClose} sx={{ textTransform: 'none' }}>
                  {t('Close')}
                </Button>
                {isClient && asset?.status === 'ACTIVE' && onRequestInspection && (
                  <Button
                    size="small"
                    variant="contained"
                    endIcon={<ArrowForwardRounded />}
                    onClick={() => onRequestInspection(asset)}
                    sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px', boxShadow: 'none' }}
                  >
                    {t('Request inspection')}
                  </Button>
                )}
              </Stack>
            </>
          )}
        </DialogActions>
      </Dialog>

      <AssetLocationPickerModal
        open={editMapPickerOpen}
        onClose={() => setEditMapPickerOpen(false)}
        initialLatitude={editLatitude}
        initialLongitude={editLongitude}
        assetName={editName}
        onApplyCoordinates={(lat, lon, placeName) => {
          setEditLatitude(lat);
          setEditLongitude(lon);
          setEditPlaceLabel(placeName ?? null);
          setEditLocation(formatPinnedLocationText(locale, lat, lon, placeName));
          setEditGpsFeedback(
            locale === 'vi'
              ? `✓ Đã ghim vị trí trên Google Maps${placeName ? `: ${placeName}` : ''}.`
              : `✓ Pinned location on Google Maps${placeName ? `: ${placeName}` : ''}.`,
          );
        }}
      />

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
