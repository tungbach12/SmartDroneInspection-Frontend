import { useEffect, useRef, useState, type FormEvent } from 'react';
import {  } from 'react-router-dom';
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
  Drawer,
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
import MyLocationRounded from '@mui/icons-material/MyLocationRounded';
import { useIsDarkMode } from '@/app/layouts/ColorModeContext';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getErrorMessage } from '@/shared/api/errorMessage';
import { isPermissionDenied } from '@/shared/api/problem';
import { DataTable, type DataTableColumn } from '@/shared/ui/DataTable';
import { EmptyState } from '@/shared/ui/EmptyState';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryState } from '@/shared/ui/QueryState';
import { StatusChip } from '@/shared/ui/StatusChip';
import { MetricCard } from '@/shared/ui/MetricCard';
import type { Asset } from '../api/assetApi';
import { documentApi, type AssetDocument } from '../api/documentApi';
import { useAssetDocuments, useUploadDocument } from '../hooks/useAssetDocuments';
import {
  useAssets,
  useCreateAsset,
  useRetireAsset,
  useUpdateAssetInspectionItems,
} from '../hooks/useAssets';
import { useCategories, useChecklistTemplates } from '../hooks/useCatalog';
import { useInspections } from '@/features/inspections/hooks/useInspections';
import { InspectionWorkDetailDialog } from '@/features/inspections/components/InspectionWorkDetailDialog';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { AssetLocationPickerModal } from '../components/AssetLocationPickerModal';

const DOCUMENT_TYPES = ['OWNERSHIP', 'INSPECTION_HISTORY', 'MAINTENANCE_RECORD', 'OTHER'];

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
  const categories = useCategories();

  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Asset | null>(null);
  const [selectedInspectionId, setSelectedInspectionId] = useState<string | null>(null);

  const items = data?.items ?? [];
  const totalCount = data?.totalCount ?? items.length;
  const activeCount = items.filter((a) => a.status === 'ACTIVE').length;
  const pendingCount = items.filter((a) => a.status === 'PENDING_REVIEW').length;
  const checkpointsConfiguredCount = items.filter((a) => (a.inspectionItems?.length ?? 0) > 0).length;

  const columns: DataTableColumn<Asset>[] = [
    {
      id: 'code',
      label: t('Code'),
      width: 160,
      render: (asset) => (
        <Typography sx={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.75rem', color: 'text.primary' }}>
          {asset.code}
        </Typography>
      ),
    },
    {
      id: 'name',
      label: t('Asset Name'),
      render: (asset) => (
        <Typography sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.875rem' }}>
          {asset.name}
        </Typography>
      ),
    },
    {
      id: 'location',
      label: t('Location'),
      render: (asset) => (
        <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
          {formatLocation(asset.locationText)}
        </Typography>
      ),
    },
    {
      id: 'status',
      label: t('Status'),
      width: 160,
      render: (asset) => <StatusChip status={asset.status} />,
    },
  ];

  const newAssetButton = isClient ? (
    <Button
      variant="contained"
      startIcon={<Add />}
      onClick={() => setCreateOpen(true)}
      sx={{
        borderRadius: '10px',
        px: 2.5,
        py: 1,
        bgcolor: 'primary.main',
        fontSize: '0.875rem',
        fontWeight: 600,
        textTransform: 'none',
        boxShadow: 'none',
        '&:hover': { bgcolor: 'primary.dark', boxShadow: '0 1px 2px rgba(16,24,40,0.05)' },
      }}
    >
      {t('New asset')}
    </Button>
  ) : undefined;

  return (
    <Box className="workspace-page workspace-page--assets">
      <PageHeader
        title={t('Assets')}
        breadcrumbs={[{ label: 'Home', to: '/client/dashboard' }, { label: t('Assets') }]}
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
        <DataTable
          columns={columns}
          rows={items}
          rowKey={(asset) => asset.id}
          searchable
          searchPlaceholder={t('Search by id, name, or code…')}
          searchPredicate={(asset, query) =>
            asset.name.toLowerCase().includes(query) || asset.code.toLowerCase().includes(query)
          }
          actions={newAssetButton}
          onRowClick={(asset) => setSelected(asset)}
        />
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
        onSubmit={(input) => createAsset.mutate(input, { onSuccess: () => setCreateOpen(false) })}
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
  onSubmit: (input: {
    name: string;
    code: string;
    description: string | null;
    categoryId: string;
    locationText: string;
    latitude: number | null;
    longitude: number | null;
    inspectionItems: string[];
  }) => void;
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
  const [description, setDescription] = useState('');
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsFeedback, setGpsFeedback] = useState<string | null>(null);

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

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit({
      code,
      name,
      categoryId,
      locationText,
      latitude: parsedLat,
      longitude: parsedLon,
      description: description || null,
      inspectionItems: [],
    });
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
                  startIcon={
                    gpsLoading ? (
                      <CircularProgress size={14} />
                    ) : (
                      <MyLocationRounded sx={{ fontSize: 15 }} />
                    )
                  }
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
                      ? '📍 Lấy GPS của tôi'
                      : '📍 Use my GPS'}
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<PlaceRounded sx={{ fontSize: 15 }} />}
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
                  {locale === 'vi' ? '🗺️ Mở bản đồ cắm kim' : '🗺️ Pick on map'}
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

          <TextField
            label={t('Description')}
            multiline
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={pending}>
          {t('Cancel')}
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={pending}
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
  const retireMutation = useRetireAsset();
  const [confirmRetireOpen, setConfirmRetireOpen] = useState(false);
  const documents = useAssetDocuments(asset?.id ?? '');
  const upload = useUploadDocument(asset?.id ?? '');
  const [documentType, setDocumentType] = useState<string>(DOCUMENT_TYPES[0] ?? 'OTHER');
  const [documentDate, setDocumentDate] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [downloadError, setDownloadError] = useState<unknown>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
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
    <Drawer
      anchor="right"
      open={Boolean(asset)}
      onClose={onClose}
      sx={{ zIndex: (theme) => theme.zIndex.drawer + 2 }}
    >
      <Box sx={{ width: { xs: '100vw', sm: 540 }, maxWidth: '100vw', p: { xs: 2, sm: 3 } }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>
            {asset?.name}
          </Typography>
          <IconButton onClick={onClose} aria-label={t('Close drawer')}>
            <Close />
          </IconButton>
        </Stack>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {asset?.code} · {formatLocation(asset?.locationText ?? null)}
        </Typography>
        <Box sx={{ my: 1 }}>{asset && <StatusChip status={asset.status} />}</Box>
        {asset?.status === 'RETIRED' && (
          <Alert severity="info" sx={{ my: 1.5, borderRadius: '8px', fontSize: '0.875rem' }}>
            {t(
              'This asset has been completed and archived. Inspection history and documents remain available for audit and reference.',
            )}
          </Alert>
        )}
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
        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" gutterBottom>
          {t('Documents')}
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
                  secondary={`${document.documentType} · ${(
                    document.sizeBytes / 1024
                  ).toFixed(1)} KB`}
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
                  select
                  size="small"
                  label={t('Document type')}
                  value={documentType}
                  onChange={(event) => setDocumentType(event.target.value)}
                >
                  {DOCUMENT_TYPES.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  size="small"
                  type="date"
                  label={t('Document date')}
                  value={documentDate}
                  onChange={(event) => setDocumentDate(event.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <Button variant="outlined" component="label" startIcon={<CloudUploadOutlined />}>
                  {file ? file.name : 'Choose file'}
                  <input
                    hidden
                    type="file"
                    accept="image/png,image/jpeg,image/webp,application/pdf"
                    onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  />
                </Button>
                {upload.isError && (
                  <Alert severity="error">{getErrorMessage(upload.error, 'Upload failed.')}</Alert>
                )}
                <Button
                  variant="contained"
                  disabled={!file || upload.isPending}
                  onClick={() => {
                    if (!file) return;
                    upload.mutate(
                      {
                        file,
                        documentType,
                        ...(documentDate ? { documentDate } : {}),
                      },
                      { onSuccess: () => setFile(null) },
                    );
                  }}
                >
                  {t('Upload document')}
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
      </Box>

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
    </Drawer>
  );
}

export default AssetsPage;
