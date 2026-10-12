import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  Alert,
  Box,
  Button,
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
} from '@mui/material';
import Add from '@mui/icons-material/Add';
import Close from '@mui/icons-material/Close';
import CloudUploadOutlined from '@mui/icons-material/CloudUploadOutlined';
import DownloadOutlined from '@mui/icons-material/DownloadOutlined';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getErrorMessage } from '@/shared/api/errorMessage';
import { isPermissionDenied } from '@/shared/api/problem';
import { DataTable, type DataTableColumn } from '@/shared/ui/DataTable';
import { EmptyState } from '@/shared/ui/EmptyState';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryState } from '@/shared/ui/QueryState';
import { StatusChip } from '@/shared/ui/StatusChip';
import { LyticMetricCard } from '@/features/dashboard/components/LyticMetricCard';
import type { Asset } from '../api/assetApi';
import { documentApi, type AssetDocument } from '../api/documentApi';
import { useAssetDocuments, useUploadDocument } from '../hooks/useAssetDocuments';
import { useAssets, useCreateAsset } from '../hooks/useAssets';
import { useCategories } from '../hooks/useCatalog';

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
  const roles = useAuthStore((state) => state.roles);
  const isClient = roles.includes('ORG_ADMIN');
  const { data, isLoading, error, refetch } = useAssets({ page: 1, pageSize: 50 });
  const createAsset = useCreateAsset();
  const categories = useCategories();
  const navigate = useNavigate();

  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Asset | null>(null);

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
          {isClient && asset.status === 'PENDING_REVIEW' && (
            <Button
              size="small"
              variant="outlined"
              onClick={(event) => {
                event.stopPropagation();
                void navigate(`/client/schedule-proposals/${asset.id}`);
              }}
              sx={{
                borderRadius: '8px',
                borderColor: '#d0d5dd',
                color: '#344054',
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'none',
                '&:hover': { borderColor: '#3758f9', color: '#3758f9' },
              }}
            >
              Proposed schedules
            </Button>
          )}
          {isClient && asset.status === 'ACTIVE' && (
            <Button
              size="small"
              variant="outlined"
              onClick={(event) => {
                event.stopPropagation();
                void navigate(`/client/inspection-schedules/${asset.id}`);
              }}
              sx={{
                borderRadius: '8px',
                borderColor: '#d0d5dd',
                color: '#344054',
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'none',
                '&:hover': { borderColor: '#3758f9', color: '#3758f9' },
              }}
            >
              Schedules
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
      New asset
    </Button>
  ) : undefined;

  return (
    <Box className="workspace-page workspace-page--assets">
      <PageHeader
        title="Assets"
        subtitle="Infrastructure assets registered for inspection"
        actions={newAssetButton}
      />

      {/* 4 Lytic KPI Metric Cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
          gap: 2.5,
          mb: 3,
        }}
      >
        <LyticMetricCard
          label="Total Assets"
          value={isLoading ? '…' : totalCount.toLocaleString()}
          change="+100% paired"
          positive
          subtext="registered structures"
          iconType="building"
        />
        <LyticMetricCard
          label="Active Assets"
          value={isLoading ? '…' : activeCount.toLocaleString()}
          change="Operational"
          positive
          subtext="ready for inspection"
          iconType="check-circle"
        />
        <LyticMetricCard
          label="Pending Review"
          value={isLoading ? '…' : pendingCount.toLocaleString()}
          change={pendingCount > 0 ? 'Action due' : 'Clear'}
          positive={pendingCount === 0}
          subtext="awaiting verification"
          iconType="alert"
        />
        <LyticMetricCard
          label="Inspection Schedules"
          value={isLoading ? '…' : activeCount.toLocaleString()}
          change="Scheduled"
          positive
          subtext="active maintenance plans"
          iconType="shield"
        />
      </Box>

      <QueryState
        isLoading={isLoading}
        error={error}
        onRetry={() => void refetch()}
        isEmpty={Boolean(data && data.items.length === 0)}
        empty={
          <EmptyState
            title="No assets registered"
            description="Add an infrastructure asset before requesting an inspection."
            action={newAssetButton}
          />
        }
      >
        <DataTable
          title="Asset records"
          columns={columns}
          rows={items}
          rowKey={(asset) => asset.id}
          searchable
          searchPlaceholder="Search by name or code…"
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

      <AssetDetailDrawer asset={selected} onClose={() => setSelected(null)} />
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
  }) => void;
}

function CreateAssetDialog({
  open,
  onClose,
  categories,
  pending,
  errorMessage,
  onSubmit,
}: CreateAssetDialogProps) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [locationText, setLocationText] = useState('');
  const [description, setDescription] = useState('');

  const activeCategories = categories.filter((category) => category.active);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit({
      code,
      name,
      categoryId,
      locationText,
      description: description || null,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <form onSubmit={submit}>
        <DialogTitle sx={{ fontWeight: 700 }}>New Asset</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {errorMessage && <Typography color="error">{errorMessage}</Typography>}
            <TextField
              label="Asset code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. BR-NORTH-01"
              helperText="Unique identifier for the structure"
            />
            <TextField
              label="Asset name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. North Crossing Main Span"
            />
            <TextField
              select
              label="Category"
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
              label="Location"
              required
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
              placeholder="e.g. Km 12+300, Highway 1A"
              helperText="Physical description or GPS coordinates"
            />
            <TextField
              label="Description"
              multiline
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={pending}>
            {pending ? 'Creating…' : 'Create Asset'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

function AssetDetailDrawer({ asset, onClose }: { asset: Asset | null; onClose: () => void }) {
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
          <IconButton onClick={onClose} aria-label="Close drawer">
            <Close />
          </IconButton>
        </Stack>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {asset?.code} · {formatLocation(asset?.locationText ?? null)}
        </Typography>
        <Box sx={{ my: 1 }}>{asset && <StatusChip status={asset.status} />}</Box>
        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" gutterBottom>
          Documents
        </Typography>
        {downloadDenied ? (
          <Alert severity="warning" data-testid="document-access-denied">
            <strong>Permission required</strong> —{' '}
            {getErrorMessage(
              downloadError ?? documents.error,
              'You are not allowed to view these documents.',
            )}
          </Alert>
        ) : documents.isLoading ? (
          <Typography variant="body2" color="text.secondary">
            Loading documents…
          </Typography>
        ) : documents.error ? (
          <Alert severity="error">Could not load documents.</Alert>
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
                  Open
                </Button>
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No documents uploaded yet.
          </Typography>
        )}

        <Divider sx={{ my: 2 }} />
        {uploadAllowed ? (
          <Stack spacing={2}>
            <TextField
              select
              size="small"
              label="Document type"
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
              label="Document date"
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
              Upload document
            </Button>
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Document upload is available after review.
          </Typography>
        )}
      </Box>
    </Drawer>
  );
}

export default AssetsPage;
