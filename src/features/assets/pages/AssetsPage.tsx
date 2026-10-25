import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
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
} from '@mui/material';
import Add from '@mui/icons-material/Add';
import Close from '@mui/icons-material/Close';
import CloudUploadOutlined from '@mui/icons-material/CloudUploadOutlined';
import DownloadOutlined from '@mui/icons-material/DownloadOutlined';
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
import { useAssets, useCreateAsset, useAssetPair, useReassignAssetPair } from '../hooks/useAssets';
import { useCategories } from '../hooks/useCatalog';
import { useDroneSelection } from '../hooks/useDrones';
import { useWorkforceUsers } from '@/features/workforce/hooks/useWorkforce';
import { CreateInspectionDialog } from '@/features/inspections/components/CreateInspectionDialog';
import { DroneInventoryPanel } from './DroneInventoryPanel';
import { FlightPermitPanel } from './FlightPermitPanel';
import { useLocale } from '@/shared/i18n/LocaleProvider';

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

  const items = data?.items ?? [];
  const totalCount = data?.totalCount ?? items.length;
  const activeCount = items.filter((a) => a.status === 'ACTIVE').length;
  const pendingCount = items.filter((a) => a.status === 'PENDING_REVIEW').length;

  const columns: DataTableColumn<Asset>[] = [
    {
      id: 'code',
      label: 'Code',
      width: 160,
      render: (asset) => (
        <Typography sx={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.8125rem', color: '#101828' }}>
          {asset.code}
        </Typography>
      ),
    },
    {
      id: 'name',
      label: 'Asset Name',
      render: (asset) => (
        <Typography sx={{ fontWeight: 600, color: '#101828', fontSize: '0.875rem' }}>
          {asset.name}
        </Typography>
      ),
    },
    {
      id: 'location',
      label: 'Location',
      render: (asset) => (
        <Typography sx={{ color: '#475467', fontSize: '0.875rem' }}>
          {formatLocation(asset.locationText)}
        </Typography>
      ),
    },
    {
      id: 'defaultPair',
      label: 'Assigned Pair',
      width: 200,
      render: (asset) => {
        if (!asset.defaultPair) {
          return (
            <Typography sx={{ fontSize: '0.8125rem', color: '#94a3b8', fontStyle: 'italic' }}>
              {t('Unassigned')}
            </Typography>
          );
        }
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b' }}>
              👤 {asset.defaultPair.inspectorName ?? 'Inspector'}
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>
              🛸 {asset.defaultPair.droneSerialNumber ?? 'Drone'}
            </Typography>
          </Box>
        );
      },
    },
    {
      id: 'status',
      label: 'Status',
      width: 160,
      render: (asset) => <StatusChip status={asset.status} />,
    },
    {
      id: 'actions',
      label: '',
      width: 240,
      align: 'right',
      render: (asset) => (
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
          {isClient && asset.status === 'ACTIVE' && (
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
          <Tab label={t('Permits')} />
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
      />
      <CreateInspectionDialog
        open={Boolean(inspectionAssetId)}
        onClose={() => setInspectionAssetId(null)}
        preselectedAssetId={inspectionAssetId}
        onSuccess={() => void refetch()}
      />
      </>}
      {isClient && resourceTab === 1 && <DroneInventoryPanel />}
      {isClient && resourceTab === 2 && <FlightPermitPanel />}
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
    defaultInspectorId?: string | null;
    defaultDroneId?: string | null;
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
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [locationText, setLocationText] = useState('');
  const [description, setDescription] = useState('');
  const [defaultInspectorId, setDefaultInspectorId] = useState('');
  const [defaultDroneId, setDefaultDroneId] = useState('');

  const activeCategories = categories.filter((category) => category.active);
  const workforceQuery = useWorkforceUsers?.() ?? { data: [] };
  const droneSelectionQuery = useDroneSelection?.() ?? { data: [] };

  const inspectors = (workforceQuery?.data ?? []).filter(
    (u) => Array.isArray(u?.roles) && u.roles.includes('INSPECTOR') && u.status === 'ACTIVE',
  );
  const drones = (droneSelectionQuery?.data ?? []).filter((d) => d?.serviceability !== 'RETIRED');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit({
      code,
      name,
      categoryId,
      locationText,
      description: description || null,
      defaultInspectorId: defaultInspectorId || null,
      defaultDroneId: defaultDroneId || null,
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
          <TextField
            label={t('Description')}
            multiline
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <TextField
            select
            label={t('Default Inspector (optional)')}
            value={defaultInspectorId}
            onChange={(e) => setDefaultInspectorId(e.target.value)}
            helperText={t('Default operational inspector paired with this asset')}
          >
            <MenuItem value="">
              <em>{t('None')}</em>
            </MenuItem>
            {inspectors.map((inspector) => (
              <MenuItem key={inspector.userId} value={inspector.userId}>
                {inspector.fullName} ({inspector.email})
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label={t('Default Drone (optional)')}
            value={defaultDroneId}
            onChange={(e) => setDefaultDroneId(e.target.value)}
            helperText={t('Default operational drone paired with this asset')}
          >
            <MenuItem value="">
              <em>{t('None')}</em>
            </MenuItem>
            {drones.map((drone) => (
              <MenuItem key={drone.id} value={drone.id}>
                {drone.serialNumber} {drone.model ? `(${drone.model})` : ''} - {drone.serviceability}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={pending}>
          {t('Cancel')}
        </Button>
        <Button type="submit" variant="contained" disabled={pending}>
          {pending ? 'Creating…' : 'Create Asset'}
        </Button>
      </DialogActions>
    </form>
  );
}

function CreateAssetDialog(props: CreateAssetDialogProps) {
  return (
    <Dialog open={props.open} onClose={props.onClose} fullWidth maxWidth="sm">
      {props.open ? <CreateAssetDialogForm {...props} /> : null}
    </Dialog>
  );
}

function ReassignPairDialog({
  open,
  onClose,
  assetId,
  currentInspectorId,
  currentDroneId,
}: {
  open: boolean;
  onClose: () => void;
  assetId: string;
  currentInspectorId?: string | null | undefined;
  currentDroneId?: string | null | undefined;
}) {
  const { t } = useLocale();
  const reassignMutation = useReassignAssetPair?.() ?? {
    mutate: () => {},
    isPending: false,
    isError: false,
    error: null,
  };
  const workforceQuery = useWorkforceUsers?.() ?? { data: [] };
  const droneSelectionQuery = useDroneSelection?.() ?? { data: [] };

  const [inspectorId, setInspectorId] = useState(currentInspectorId ?? '');
  const [droneId, setDroneId] = useState(currentDroneId ?? '');
  const [reason, setReason] = useState('');

  const inspectors = (workforceQuery?.data ?? []).filter(
    (u) => Array.isArray(u?.roles) && u.roles.includes('INSPECTOR') && u.status === 'ACTIVE',
  );
  const drones = (droneSelectionQuery?.data ?? []).filter((d) => d?.serviceability !== 'RETIRED');

  const handleReassign = (e: FormEvent) => {
    e.preventDefault();
    if (!inspectorId || !droneId) return;
    reassignMutation.mutate(
      { assetId, input: { inspectorId, droneId, reason: reason.trim() || undefined } },
      {
        onSuccess: () => {
          onClose();
          setReason('');
        },
      },
    );
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <form onSubmit={handleReassign}>
        <DialogTitle sx={{ fontWeight: 700 }}>{t('Reassign Operational Pair')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {reassignMutation.isError && (
              <Alert severity="error">
                {getErrorMessage(reassignMutation.error, 'Reassignment failed.')}
              </Alert>
            )}
            <TextField
              select
              label={t('Inspector')}
              required
              value={inspectorId}
              onChange={(e) => setInspectorId(e.target.value)}
            >
              {inspectors.map((ins) => (
                <MenuItem key={ins.userId} value={ins.userId}>
                  {ins.fullName} ({ins.email})
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Drone"
              required
              value={droneId}
              onChange={(e) => setDroneId(e.target.value)}
            >
              {drones.map((d) => (
                <MenuItem key={d.id} value={d.id}>
                  {d.serialNumber} {d.model ? `(${d.model})` : ''} - {d.serviceability}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label={t('Reassignment Reason')}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('e.g. Schedule adjustment or maintenance')}
            />
            <Typography variant="caption" color="text.secondary">
              {t('The asset must be active before inspection scheduling.')}
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={reassignMutation.isPending}>
            {t('Cancel')}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={reassignMutation.isPending || !inspectorId || !droneId || !reason.trim()}
          >
            {reassignMutation.isPending ? 'Saving…' : 'Confirm Reassignment'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

function OperationalPairSection({ assetId, isClient }: { assetId: string; isClient: boolean }) {
  const { formatDate, t } = useLocale();
  const pairQuery = useAssetPair?.(assetId) ?? { data: undefined, isLoading: false };
  const [dialogOpen, setDialogOpen] = useState(false);
  const pair = pairQuery.data;

  return (
    <Box sx={{ my: 1.5, p: 2, bgcolor: '#f8fafc', borderRadius: 1.5, border: '1px solid #e2e8f0' }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#334155' }}>
          {t('Operational Pair')}
        </Typography>
        {isClient && (
          <Button
            size="small"
            variant="text"
            onClick={() => setDialogOpen(true)}
            sx={{ textTransform: 'none', fontSize: '12px' }}
          >
            {t('Reassign')}
          </Button>
        )}
      </Stack>

      {pairQuery.isLoading ? (
        <CircularProgress size={18} />
      ) : pair ? (
        <Stack spacing={0.5}>
          <Typography variant="body2" color="text.secondary">
            <strong>{t('Inspector:')}</strong> {pair.inspectorName ?? pair.inspectorUserId}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>Drone:</strong> {pair.droneSerialNumber} {pair.droneModel ? `(${pair.droneModel})` : ''}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('Status:')} {pair.status} {t('· Since:')} {formatDate(new Date(pair.validFrom))}
          </Typography>
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary">
          {t('No default pair currently assigned.')}
        </Typography>
      )}

      {dialogOpen && (
        <ReassignPairDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          assetId={assetId}
          currentInspectorId={pair?.inspectorUserId}
          currentDroneId={pair?.droneId}
        />
      )}
    </Box>
  );
}

function AssetDetailDrawer({
  asset,
  onClose,
  onNewInspection,
}: {
  asset: Asset | null;
  onClose: () => void;
  onNewInspection?: (assetId: string) => void;
}) {
  const { t } = useLocale();
  const roles = useAuthStore((state) => state.roles);
  const isClient = roles.includes('ORG_MANAGER');
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
      <Box sx={{ width: { xs: '100vw', sm: 420 }, maxWidth: '100vw', p: { xs: 2, sm: 3 } }}>
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
        {isClient && asset?.status === 'ACTIVE' && (
          <Button
            variant="contained"
            fullWidth
            onClick={() => {
              if (asset) onNewInspection?.(asset.id);
              onClose();
            }}
            sx={{
              mt: 1.5,
              mb: 1,
              bgcolor: '#3758f9',
              fontSize: '13px',
              fontWeight: 600,
              textTransform: 'none',
              boxShadow: 'none',
              '&:hover': { bgcolor: '#2b45cb' },
            }}
          >
            {t('Create Inspection')}
          </Button>
        )}
        {asset && <OperationalPairSection assetId={asset.id} isClient={isClient} />}
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
    </Drawer>
  );
}

export default AssetsPage;
