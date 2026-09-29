import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Add, CloudUploadOutlined, DownloadOutlined } from '@mui/icons-material';
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
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getErrorMessage } from '@/shared/api/errorMessage';
import { DataTable, type DataTableColumn } from '@/shared/ui/DataTable';
import { EmptyState } from '@/shared/ui/EmptyState';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryState } from '@/shared/ui/QueryState';
import { StatusChip } from '@/shared/ui/StatusChip';
import type { Asset } from '../api/assetApi';
import { documentApi } from '../api/documentApi';
import { useAssetDocuments, useUploadDocument } from '../hooks/useAssetDocuments';
import { useAssets, useCreateAsset } from '../hooks/useAssets';
import { useCategories } from '../hooks/useCatalog';

const DOCUMENT_TYPES = ['OWNERSHIP', 'INSPECTION_HISTORY', 'MAINTENANCE_RECORD', 'OTHER'];

export function AssetsPage() {
  const roles = useAuthStore((state) => state.roles);
  const isClient = roles.includes('CLIENT');
  const { data, isLoading, error, refetch } = useAssets({ page: 1, pageSize: 50 });
  const createAsset = useCreateAsset();
  const categories = useCategories();
  const navigate = useNavigate();

  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Asset | null>(null);

  const columns: DataTableColumn<Asset>[] = [
    { id: 'code', label: 'Code', width: 160, render: (asset) => asset.code },
    { id: 'name', label: 'Name', render: (asset) => asset.name },
    { id: 'location', label: 'Location', render: (asset) => asset.locationText || '—' },
    {
      id: 'status',
      label: 'Status',
      width: 160,
      render: (asset) => <StatusChip status={asset.status} />,
    },
    {
      id: 'actions',
      label: '',
      width: 260,
      render: (asset) => (
        <Stack direction="row" spacing={1}>
          {isClient && asset.status === 'PENDING_REVIEW' && (
            <Button
              size="small"
              onClick={(event) => {
                event.stopPropagation();
                void navigate(`/client/schedule-proposals/${asset.id}`);
              }}
            >
              Proposed schedules
            </Button>
          )}
          {isClient && asset.status === 'ACTIVE' && (
            <Button
              size="small"
              onClick={(event) => {
                event.stopPropagation();
                void navigate(`/client/inspection-schedules/${asset.id}`);
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
    <Button variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)}>
      New asset
    </Button>
  ) : undefined;

  return (
    <Box>
      <PageHeader
        title="Assets"
        subtitle="Infrastructure assets registered for inspection"
        actions={newAssetButton}
      />
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
          columns={columns}
          rows={data?.items ?? []}
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
        <DialogTitle>Register an asset</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
            <TextField
              required
              label="Code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
            <TextField
              required
              label="Name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <TextField
              required
              select
              label="Category"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
            >
              {activeCategories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {category.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              required
              label="Location"
              value={locationText}
              onChange={(event) => setLocationText(event.target.value)}
            />
            <TextField
              label="Description"
              multiline
              minRows={2}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
            <Typography variant="caption" color="text.secondary">
              The asset is submitted for Service Manager review before inspection scheduling.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={pending}>
            Submit for review
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

  const uploadAllowed = asset?.status === 'ACTIVE' || asset?.status === 'INACTIVE';

  return (
    <Drawer anchor="right" open={Boolean(asset)} onClose={onClose}>
      <Box sx={{ width: 420, p: 3 }}>
        <Typography variant="h6">{asset?.name}</Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {asset?.code} · {asset?.locationText}
        </Typography>
        <Box sx={{ my: 1 }}>{asset && <StatusChip status={asset.status} />}</Box>
        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" gutterBottom>
          Documents
        </Typography>
        {documents.data?.length ? (
          <List dense>
            {documents.data.map((document) => (
              <ListItem key={document.id} disableGutters>
                <ListItemText
                  primary={document.fileName}
                  secondary={`${document.documentType} · ${(
                    document.sizeBytes / 1024
                  ).toFixed(1)} KB`}
                />
                {asset && (
                  <Button
                    size="small"
                    startIcon={<DownloadOutlined />}
                    href={documentApi.contentPath(asset.id, document.id)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open
                  </Button>
                )}
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
