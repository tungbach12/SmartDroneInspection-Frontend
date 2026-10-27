import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Stack,
  TextField,
  Typography,
  Tab,
  Tabs,
  CircularProgress,
  Paper,
} from '@mui/material';
import Add from '@mui/icons-material/Add';
import Close from '@mui/icons-material/Close';
import CloudUploadOutlined from '@mui/icons-material/CloudUploadOutlined';
import DownloadOutlined from '@mui/icons-material/DownloadOutlined';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import PlaceRounded from '@mui/icons-material/PlaceRounded';
import GppBadRounded from '@mui/icons-material/GppBadRounded';
import { useIsDarkMode } from '@/app/layouts/ColorModeContext';
import { evaluateAirspace } from '@/shared/airspace/airspaceZones';
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
import { useAssets, useCreateAsset, useRetireAsset } from '../hooks/useAssets';
import { useCategories } from '../hooks/useCatalog';
import { CreateInspectionDialog } from '@/features/inspections/components/CreateInspectionDialog';
import { useRecurringSchedules } from '@/features/inspections/hooks/useRecurringSchedules';
import { RecurringScheduleDetailDialog } from '@/features/inspections/components/RecurringScheduleDetailDialog';
import { useInspections } from '@/features/inspections/hooks/useInspections';
import { InspectionWorkDetailDialog } from '@/features/inspections/components/InspectionWorkDetailDialog';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import { DroneInventoryPanel } from './DroneInventoryPanel';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { AirspaceNoFlyMap } from '@/shared/airspace/AirspaceNoFlyMap';

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
  const isClient = roles.includes('ORG_MANAGER');
  const { data, isLoading, error, refetch } = useAssets({ page: 1, pageSize: 50 });
  const createAsset = useCreateAsset();
  const categories = useCategories();

  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Asset | null>(null);
  const [resourceTab, setResourceTab] = useState(0);
  const [inspectionAssetId, setInspectionAssetId] = useState<string | null>(null);
  const [recurringAssetId, setRecurringAssetId] = useState<string | null>(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [selectedInspectionId, setSelectedInspectionId] = useState<string | null>(null);

  const items = data?.items ?? [];
  const totalCount = data?.totalCount ?? items.length;
  const activeCount = items.filter((a) => a.status === 'ACTIVE').length;
  const pendingCount = items.filter((a) => a.status === 'PENDING_REVIEW').length;

  const columns: DataTableColumn<Asset>[] = [
    {
      id: 'code',
      label: t('Code'),
      width: 160,
      render: (asset) => (
        <Typography sx={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.8125rem', color: 'text.primary' }}>
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
    {
      id: 'actions',
      label: '',
      width: 280,
      align: 'right',
      render: (asset) => (
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
          {isClient && asset.status === 'ACTIVE' && (
            <>
              <Button
                size="small"
                variant="contained"
                onClick={(event) => {
                  event.stopPropagation();
                  setInspectionAssetId(asset.id);
                }}
                sx={{
                  borderRadius: '8px',
                  bgcolor: '#3758f9',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 600,
                  textTransform: 'none',
                  boxShadow: 'none',
                  '&:hover': { bgcolor: '#2b45cb' },
                }}
              >
                {t('New inspection')}
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<EventRepeatIcon sx={{ fontSize: 15 }} />}
                onClick={(event) => {
                  event.stopPropagation();
                  setRecurringAssetId(asset.id);
                }}
                sx={{
                  borderRadius: '8px',
                  borderColor: '#3758f9',
                  color: '#3758f9',
                  fontSize: '12px',
                  fontWeight: 600,
                  textTransform: 'none',
                  '&:hover': { bgcolor: 'rgba(55, 88, 249, 0.05)', borderColor: '#2b45cb' },
                }}
              >
                {t('Recurring schedule')}
              </Button>
            </>
          )}
        </Stack>
      ),
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
        bgcolor: '#3758F9',
        fontSize: '14px',
        fontWeight: 600,
        textTransform: 'none',
        boxShadow: 'none',
        '&:hover': { bgcolor: '#2b45cb', boxShadow: '0 1px 2px rgba(16,24,40,0.05)' },
      }}
    >
      {t('New asset')}
    </Button>
  ) : undefined;

  return (
    <Box className="workspace-page workspace-page--assets">
      <PageHeader
        title={t('Assets')}
        subtitle={t('Infrastructure assets registered for inspection')}
        actions={resourceTab === 0 ? newAssetButton : undefined}
      />
      {/* 4 Lytic KPI Metric Cards */}
      {(!isClient || resourceTab === 0) && (
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
            change={t('+100% paired')}
            positive
            subtext="registered structures"
            iconType="building"
          />
          <MetricCard
            label={t('Active Assets')}
            value={isLoading ? '…' : formatNumber(activeCount)}
            change={t('Operational')}
            positive
            subtext="ready for inspection"
            iconType="check-circle"
          />
          <MetricCard
            label={t('Pending Review')}
            value={isLoading ? '…' : formatNumber(pendingCount)}
            change={pendingCount > 0 ? 'Action due' : 'Clear'}
            positive={pendingCount === 0}
            subtext="awaiting verification"
            iconType="alert"
          />
          <MetricCard
            label={t('Inspection Schedules')}
            value={isLoading ? '…' : formatNumber(activeCount)}
            change={t('Scheduled')}
            positive
            subtext="active maintenance plans"
            iconType="shield"
          />
        </Box>
      )}
      {isClient && (
        <Tabs value={resourceTab} onChange={(_event, value: number) => setResourceTab(value)} aria-label={t('Asset resources')}>
          <Tab label={t('Assets')} />
          <Tab label={t('Drones')} />
        </Tabs>
      )}
      {(!isClient || resourceTab === 0) && <>

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
          title={t('Asset records')}
          columns={columns}
          rows={items}
          rowKey={(asset) => asset.id}
          searchable
          searchPlaceholder={t('Search by name or code…')}
          searchPredicate={(asset, query) =>
            asset.name.toLowerCase().includes(query) || asset.code.toLowerCase().includes(query)
          }
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
        asset={selected}
        onClose={() => setSelected(null)}
        onNewInspection={(id) => setInspectionAssetId(id)}
        onNewRecurringSchedule={(id) => setRecurringAssetId(id)}
        onSelectSchedule={(id) => setSelectedScheduleId(id)}
        onSelectInspection={(id) => setSelectedInspectionId(id)}
      />
      <CreateInspectionDialog
        open={Boolean(inspectionAssetId)}
        onClose={() => setInspectionAssetId(null)}
        preselectedAssetId={inspectionAssetId}
        onSuccess={() => void refetch()}
      />
      <CreateInspectionDialog
        open={Boolean(recurringAssetId)}
        onClose={() => setRecurringAssetId(null)}
        preselectedAssetId={recurringAssetId}
        initialScheduleMode="RECURRING"
        onSuccess={() => void refetch()}
      />
      <RecurringScheduleDetailDialog
        open={Boolean(selectedScheduleId)}
        scheduleId={selectedScheduleId}
        onClose={() => setSelectedScheduleId(null)}
      />
      <InspectionWorkDetailDialog
        open={Boolean(selectedInspectionId)}
        inspectionId={selectedInspectionId}
        onClose={() => setSelectedInspectionId(null)}
      />
      </>}
      {isClient && resourceTab === 1 && <DroneInventoryPanel />}
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

function CreateAssetDialogForm({
  categories,
  pending,
  errorMessage,
  onClose,
  onSubmit,
}: CreateAssetDialogProps) {
  const { t } = useLocale();
  const isDark = useIsDarkMode();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [locationText, setLocationText] = useState('');
  const [latitudeText, setLatitudeText] = useState('10.7789');
  const [longitudeText, setLongitudeText] = useState('106.7082');
  const [description, setDescription] = useState('');
  const [inspectionItemsText, setInspectionItemsText] = useState('');

  const activeCategories = categories.filter((category) => category.active);
  const parsedLat = latitudeText.trim() !== '' && !Number.isNaN(Number(latitudeText)) ? Number(latitudeText) : null;
  const parsedLon = longitudeText.trim() !== '' && !Number.isNaN(Number(longitudeText)) ? Number(longitudeText) : null;

  const airspaceEval =
    parsedLat != null && parsedLon != null ? evaluateAirspace(parsedLat, parsedLon) : null;
  const isNoFlyZone = airspaceEval?.classification === 'NO_FLY_ZONE';

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (isNoFlyZone) {
      return;
    }
    const items = inspectionItemsText
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    onSubmit({
      code,
      name,
      categoryId,
      locationText,
      latitude: parsedLat,
      longitude: parsedLon,
      description: description || null,
      inspectionItems: items,
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
            placeholder={t('e.g. BR-NORTH-01')}
            helperText={t('Unique identifier for the structure')}
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
              borderRadius: '12px',
              bgcolor: isDark ? 'rgba(30, 41, 59, 0.45)' : '#f8fafc',
              border: '1px solid',
              borderColor: isNoFlyZone ? 'error.main' : 'divider',
            }}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.25 }}>
              <PlaceRounded sx={{ fontSize: 18, color: isNoFlyZone ? 'error.main' : 'primary.main' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                {t('Tọa độ vị trí công trình')}
              </Typography>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label={t('Vĩ độ (Latitude)')}
                value={latitudeText}
                onChange={(e) => setLatitudeText(e.target.value)}
                placeholder="10.7805"
                fullWidth
                autoComplete="off"
                error={isNoFlyZone}
                slotProps={{
                  htmlInput: { inputMode: 'decimal', spellCheck: false, 'data-lpignore': 'true' },
                }}
                helperText={t('VD: 10.7805 (Cầu Ba Son)')}
              />
              <TextField
                label={t('Kinh độ (Longitude)')}
                value={longitudeText}
                onChange={(e) => setLongitudeText(e.target.value)}
                placeholder="106.7108"
                fullWidth
                autoComplete="off"
                error={isNoFlyZone}
                slotProps={{
                  htmlInput: { inputMode: 'decimal', spellCheck: false, 'data-lpignore': 'true' },
                }}
                helperText={t('VD: 106.7108 (Cầu Ba Son)')}
              />
            </Stack>

            {isNoFlyZone && (
              <Alert
                severity="error"
                icon={<GppBadRounded sx={{ fontSize: 20 }} />}
                sx={{
                  mt: 1.5,
                  borderRadius: '10px',
                  border: '1px solid',
                  borderColor: 'error.main',
                  py: 0.5,
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'error.main' }}>
                  {t('Vị trí công trình nằm trong VÙNG CẤM BAY (NO-FLY ZONE)!')}
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', mt: 0.25, color: 'text.primary' }}>
                  {t(
                    'Không thể tạo mới tài sản tại tọa độ cấm bay quân sự / hàng không tuyệt đối theo Quyết định 18/2020/QĐ-TTg. Vui lòng chọn vị trí ở vùng an toàn (ngoài vùng cấm bay) để tiếp tục tạo công trình.',
                  )}
                </Typography>
              </Alert>
            )}
          </Box>

          <AirspaceNoFlyMap
            assetName={name || 'Công trình mới'}
            locationText={locationText}
            latitude={parsedLat}
            longitude={parsedLon}
            compact
            onSelectCoordinates={(lat, lon, placeName) => {
              setLatitudeText(String(lat));
              setLongitudeText(String(lon));
              if (placeName && (!locationText || locationText === 'Công trình mới')) {
                setLocationText(placeName);
              }
            }}
          />

          <TextField
            label={t('Description')}
            multiline
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <TextField
            label={t('Inspection Items / Checkpoints')}
            multiline
            rows={3}
            value={inspectionItemsText}
            onChange={(e) => setInspectionItemsText(e.target.value)}
            placeholder={t('e.g. Mố cầu M1, Trụ P1, Dầm chính, Khe co giãn')}
            helperText={t('List components or checkpoints to inspect (separated by comma or newline)')}
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
          color={isNoFlyZone ? 'error' : 'primary'}
          disabled={pending || isNoFlyZone}
        >
          {pending ? 'Creating…' : 'Create Asset'}
        </Button>
      </DialogActions>
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

function InspectionItemsSection({ items }: { items: string[] }) {
  const { t } = useLocale();
  return (
    <Box sx={{ my: 1.5, p: 2, bgcolor: 'background.default', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary', mb: 1 }}>
        {t('Inspection Checkpoints')}
      </Typography>
      {items && items.length > 0 ? (
        <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.75 }}>
          {items.map((item, idx) => (
            <Chip key={idx} label={item} size="small" variant="outlined" />
          ))}
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary">
          {t('No inspection checkpoints defined for this asset.')}
        </Typography>
      )}
    </Box>
  );
}

function AssetRecurringSchedulesSection({
  assetId,
  isClient,
  onNewRecurringSchedule,
  onSelectSchedule,
}: {
  assetId: string;
  isClient: boolean;
  onNewRecurringSchedule?: (assetId: string) => void;
  onSelectSchedule?: (scheduleId: string) => void;
}) {
  const { t } = useLocale();
  const schedulesQuery = useRecurringSchedules({ assetId });
  const schedules = schedulesQuery.data?.items ?? [];
  const hasActiveSchedule = schedules.some((s) => s.status === 'ACTIVE');

  return (
    <Box sx={{ my: 1.5, p: 2, bgcolor: 'background.default', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography
          variant="subtitle2"
          sx={{ fontWeight: 600, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 0.75 }}
        >
          <EventRepeatIcon sx={{ fontSize: 18, color: 'primary.main' }} />
          {t('Recurring inspection schedules')}
        </Typography>
        {isClient && (
          hasActiveSchedule ? (
            <Chip
              size="small"
              label={t('Active schedule running')}
              color="success"
              variant="outlined"
              sx={{ fontSize: '11px', height: 22, fontWeight: 600 }}
            />
          ) : (
            <Button
              size="small"
              variant="text"
              startIcon={<Add sx={{ fontSize: 14 }} />}
              onClick={() => onNewRecurringSchedule?.(assetId)}
              sx={{ textTransform: 'none', fontSize: '12px', fontWeight: 600 }}
            >
              {t('Add schedule')}
            </Button>
          )
        )}
      </Stack>

      {schedulesQuery.isLoading ? (
        <CircularProgress size={18} sx={{ my: 1 }} />
      ) : schedules.length > 0 ? (
        <Stack spacing={1}>
          {schedules.map((schedule) => (
            <Paper
              key={schedule.id}
              variant="outlined"
              sx={{
                p: 1.25,
                borderRadius: '8px',
                bgcolor: 'background.paper',
                cursor: 'pointer',
                transition: 'all 120ms ease',
                '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
              }}
              onClick={() => onSelectSchedule?.(schedule.id)}
            >
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box sx={{ minWidth: 0, flex: 1, pr: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }} noWrap>
                    {t('Every')} {schedule.interval} {t(schedule.unit)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                    {schedule.inspectorName ?? t('Assigned Inspector')}
                    {schedule.droneSerialNumber ? ` · ${schedule.droneSerialNumber}` : ''}
                  </Typography>
                </Box>
                <Chip
                  label={t(schedule.status)}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    bgcolor:
                      schedule.status === 'ACTIVE'
                        ? 'rgba(16, 185, 129, 0.1)'
                        : schedule.status === 'PAUSED'
                          ? 'rgba(245, 158, 11, 0.1)'
                          : 'rgba(148, 163, 184, 0.1)',
                    color:
                      schedule.status === 'ACTIVE'
                        ? 'success.main'
                        : schedule.status === 'PAUSED'
                          ? 'warning.main'
                          : 'text.secondary',
                  }}
                />
              </Stack>
            </Paper>
          ))}
        </Stack>
      ) : (
        <Box sx={{ py: 1, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
            {t('No recurring schedule configured for this asset yet.')}
          </Typography>
          {isClient && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<EventRepeatIcon sx={{ fontSize: 14 }} />}
              onClick={() => onNewRecurringSchedule?.(assetId)}
              sx={{ mt: 1, textTransform: 'none', fontSize: '11px', borderRadius: '6px' }}
            >
              {t('Set up recurring schedule')}
            </Button>
          )}
        </Box>
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
          sx={{ height: 20, fontSize: '0.6875rem', fontWeight: 600 }}
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
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
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
  onNewInspection,
  onNewRecurringSchedule,
  onSelectSchedule,
  onSelectInspection,
}: {
  asset: Asset | null;
  onClose: () => void;
  onNewInspection?: (assetId: string) => void;
  onNewRecurringSchedule?: (assetId: string) => void;
  onSelectSchedule?: (scheduleId: string) => void;
  onSelectInspection?: (inspectionId: string) => void;
}) {
  const { t } = useLocale();
  const roles = useAuthStore((state) => state.roles);
  const isClient = roles.includes('ORG_MANAGER');
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

  const uploadAllowed = asset?.status === 'ACTIVE' || asset?.status === 'INACTIVE';
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
    <Drawer anchor="right" open={Boolean(asset)} onClose={onClose}>
      <Box sx={{ width: { xs: '100vw', sm: 540 }, maxWidth: '100vw', p: { xs: 2, sm: 3 } }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
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
          <Alert severity="info" sx={{ my: 1.5, borderRadius: 1.5, fontSize: '0.8125rem' }}>
            {t(
              'This asset has been completed and archived. Inspection history and documents remain available for audit and reference.',
            )}
          </Alert>
        )}
        {isClient && asset?.status === 'ACTIVE' && (
          <>
            <Stack direction="row" spacing={1} sx={{ mt: 1.5, mb: 1 }}>
              <Button
                variant="contained"
                fullWidth
                onClick={() => {
                  if (asset) onNewInspection?.(asset.id);
                  onClose();
                }}
                sx={{
                  bgcolor: '#3758f9',
                  fontSize: '12px',
                  fontWeight: 600,
                  textTransform: 'none',
                  boxShadow: 'none',
                  '&:hover': { bgcolor: '#2b45cb' },
                }}
              >
                {t('New inspection')}
              </Button>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<EventRepeatIcon sx={{ fontSize: 16 }} />}
                onClick={() => {
                  if (asset) onNewRecurringSchedule?.(asset.id);
                  onClose();
                }}
                sx={{
                  borderColor: '#3758f9',
                  color: '#3758f9',
                  fontSize: '12px',
                  fontWeight: 600,
                  textTransform: 'none',
                  '&:hover': { bgcolor: 'rgba(55, 88, 249, 0.05)', borderColor: '#2b45cb' },
                }}
              >
                {t('Recurring schedule')}
              </Button>
            </Stack>
            <Button
              variant="outlined"
              color="error"
              fullWidth
              size="small"
              onClick={() => setConfirmRetireOpen(true)}
              sx={{
                mb: 1.5,
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'none',
                borderColor: '#fca5a5',
                color: '#dc2626',
                '&:hover': { bgcolor: '#fef2f2', borderColor: '#ef4444' },
              }}
            >
              {t('Complete & Archive Asset')}
            </Button>
          </>
        )}
        {asset && <InspectionItemsSection items={asset.inspectionItems ?? []} />}
        {asset && (
          <Box sx={{ my: 1.5 }}>
            <AirspaceNoFlyMap
              assetName={asset.name}
              locationText={asset.locationText}
              latitude={asset.latitude}
              longitude={asset.longitude}
              compact
            />
          </Box>
        )}
        {asset && (
          <AssetRecurringSchedulesSection
            assetId={asset.id}
            isClient={isClient}
            onNewRecurringSchedule={(id) => {
              onNewRecurringSchedule?.(id);
              onClose();
            }}
            onSelectSchedule={(id) => onSelectSchedule?.(id)}
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
      </Box>

      <Dialog
        open={confirmRetireOpen}
        onClose={() => setConfirmRetireOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {t('Complete & Archive Contract')}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#475569', mt: 1 }}>
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
