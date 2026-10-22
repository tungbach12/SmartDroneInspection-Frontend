import { useRef, useState, type FormEvent } from 'react';
import { Add, DescriptionOutlined } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getErrorMessage } from '@/shared/api/errorMessage';
import { DataTable, type DataTableColumn } from '@/shared/ui/DataTable';
import { EmptyState } from '@/shared/ui/EmptyState';
import { QueryState } from '@/shared/ui/QueryState';
import { StatusChip } from '@/shared/ui/StatusChip';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import type {
  Drone,
  DroneDocument,
  DroneDocumentStatus,
  DroneServiceability,
} from '../api/droneApi';
import {
  useCreateDrone,
  useDrone,
  useDroneDocuments,
  useDrones,
  useUpdateDroneDocumentStatus,
  useUpdateDroneServiceability,
  useUploadDroneDocument,
} from '../hooks/useDrones';

const SERVICEABILITY_VALUES: DroneServiceability[] = [
  'ACTIVE',
  'MAINTENANCE',
  'SUSPENDED',
  'RETIRED',
];
const DOCUMENT_STATUSES: DroneDocumentStatus[] = [
  'PENDING_REVIEW',
  'ACTIVE',
  'EXPIRED',
  'REJECTED',
  'REVOKED',
];
const ALLOWED_DOCUMENT_TYPES =
  'image/png,image/jpeg,image/webp,application/pdf';

export function DroneInventoryPanel() {
  const { t } = useLocale();
  const roles = useAuthStore((state) => state.roles);
  const canManage = roles.includes('ORG_ADMIN');
  const drones = useDrones();
  const createDrone = useCreateDrone();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const columns: DataTableColumn<Drone>[] = [
    {
      id: 'serial',
      label: 'Serial number',
      render: (drone) => drone.serialNumber,
    },
    { id: 'model', label: 'Model', render: (drone) => drone.model || '—' },
    {
      id: 'manufacturer',
      label: 'Manufacturer',
      render: (drone) => drone.manufacturer || '—',
    },
    {
      id: 'serviceability',
      label: 'Serviceability',
      render: (drone) => <StatusChip status={drone.serviceability} />,
    },
    {
      id: 'details',
      label: '',
      render: (drone) => (
        <Button size="small" onClick={() => setSelectedId(drone.id)}>
          {t('Open drone')}
        </Button>
      ),
    },
  ];

  const registerButton = canManage ? (
    <Button
      variant="contained"
      startIcon={<Add />}
      onClick={() => setCreateOpen(true)}
    >
      {t('Register drone')}
    </Button>
  ) : undefined;

  return (
    <Stack spacing={2}>
      <Alert severity="info">
        Serviceability describes the recorded maintenance state only; it does
        not confirm permission to fly or operational readiness.
      </Alert>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        {registerButton}
      </Box>
      <QueryState
        isLoading={drones.isLoading}
        error={drones.error}
        onRetry={() => void drones.refetch()}
        loadingLabel={t('Loading drones…')}
        isEmpty={Boolean(drones.data && drones.data.length === 0)}
        empty={
          <EmptyState
            title={t('No drones registered')}
            description={t('Register an organization drone to keep its serviceability and documents together.')}
            action={registerButton}
          />
        }
      >
        <DataTable
          columns={columns}
          rows={drones.data ?? []}
          rowKey={(drone) => drone.id}
          searchable
          searchPlaceholder={t('Search by serial number or model…')}
          searchPredicate={(drone, query) =>
            drone.serialNumber.toLowerCase().includes(query) ||
            (drone.model ?? '').toLowerCase().includes(query) ||
            (drone.manufacturer ?? '').toLowerCase().includes(query)
          }
        />
      </QueryState>
      <CreateDroneDialog
        open={createOpen}
        pending={createDrone.isPending}
        errorMessage={
          createDrone.isError
            ? getErrorMessage(
                createDrone.error,
                'Could not register the drone.',
              )
            : null
        }
        onClose={() => setCreateOpen(false)}
        onSubmit={(input) =>
          createDrone.mutate(input, { onSuccess: () => setCreateOpen(false) })
        }
      />
      <DroneDetailDrawer
        droneId={selectedId}
        canManage={canManage}
        onClose={() => setSelectedId(null)}
      />
    </Stack>
  );
}

function CreateDroneDialog({
  open,
  pending,
  errorMessage,
  onClose,
  onSubmit,
}: {
  open: boolean;
  pending: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onSubmit: (input: {
    serialNumber: string;
    model?: string;
    manufacturer?: string;
    payloadMetadata?: string;
    notes?: string;
  }) => void;
}) {
  const { t } = useLocale();
  const [serialNumber, setSerialNumber] = useState('');
  const [model, setModel] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [payloadMetadata, setPayloadMetadata] = useState('');
  const [notes, setNotes] = useState('');
  const [metadataError, setMetadataError] = useState<string | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    let metadata: string | undefined;
    if (payloadMetadata.trim()) {
      try {
        JSON.parse(payloadMetadata);
        metadata = payloadMetadata;
        setMetadataError(null);
      } catch {
        setMetadataError('Enter valid JSON for payload metadata.');
        return;
      }
    }
    onSubmit({
      serialNumber: serialNumber.trim(),
      ...(model.trim() ? { model: model.trim() } : {}),
      ...(manufacturer.trim() ? { manufacturer: manufacturer.trim() } : {}),
      ...(metadata ? { payloadMetadata: metadata } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <form onSubmit={submit}>
        <DialogTitle>{t('Register drone')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
            <TextField
              required
              label={t('Serial number')}
              value={serialNumber}
              onChange={(event) => setSerialNumber(event.target.value)}
            />
            <TextField
              label={t('Model')}
              value={model}
              onChange={(event) => setModel(event.target.value)}
            />
            <TextField
              label={t('Manufacturer')}
              value={manufacturer}
              onChange={(event) => setManufacturer(event.target.value)}
            />
            <TextField
              label={t('Payload metadata JSON')}
              value={payloadMetadata}
              onChange={(event) => {
                setPayloadMetadata(event.target.value);
                setMetadataError(null);
              }}
              multiline
              minRows={3}
              error={Boolean(metadataError)}
              helperText={
                metadataError ??
                'Optional JSON object describing carried equipment.'
              }
            />
            <TextField
              label={t('Notes')}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="contained" disabled={pending}>
            {t('Register drone')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

function DroneDetailDrawer({
  droneId,
  canManage,
  onClose,
}: {
  droneId: string | null;
  canManage: boolean;
  onClose: () => void;
}) {
  const { formatDate, t } = useLocale();
    const isOpen = Boolean(droneId);
  const drone = useDrone(droneId ?? '', isOpen);
  const documents = useDroneDocuments(droneId ?? '', isOpen);
  const updateServiceability = useUpdateDroneServiceability();
  const upload = useUploadDroneDocument(droneId ?? '');
  const updateDocumentStatus = useUpdateDroneDocumentStatus(droneId ?? '');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documentType, setDocumentType] = useState('AIRWORTHINESS');
  const [issuer, setIssuer] = useState('');
  const [documentReference, setDocumentReference] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');

  const clearSelectedFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const close = () => {
    clearSelectedFile();
    onClose();
  };

  const documentColumns: DataTableColumn<DroneDocument>[] = [
    {
      id: 'type',
      label: 'Document',
      render: (document) => document.documentType,
    },
    {
      id: 'issuer',
      label: 'Issuer / reference',
      render: (document) =>
        [document.issuer, document.documentReference]
          .filter(Boolean)
          .join(' · ') || '—',
    },
    {
      id: 'validUntil',
      label: 'Valid until',
      render: (document) =>
        document.validUntil
          ? formatDate(new Date(document.validUntil))
          : '—',
    },
    {
      id: 'status',
      label: 'Recorded status',
      render: (document) => <StatusChip status={document.status} />,
    },
    {
      id: 'review',
      label: 'Internal status',
      render: (document) =>
        canManage && document.status !== 'REVOKED' ? (
          <TextField
            select
            size="small"
            label={`Document status for ${document.documentType}`}
            value={document.status}
            onChange={(event) =>
              updateDocumentStatus.mutate({
                documentId: document.id,
                status: event.target.value as DroneDocumentStatus,
              })
            }
          >
            {DOCUMENT_STATUSES.map((status) => (
              <MenuItem key={status} value={status}>
                {status}
              </MenuItem>
            ))}
          </TextField>
        ) : null,
    },
  ];

  const onChooseFile = (nextFile: File | null) => {
    setFile(nextFile);
  };

  return (
    <Drawer anchor="right" open={Boolean(droneId)} onClose={close}>
      <Box
        sx={{
          width: { xs: '100vw', sm: 640 },
          maxWidth: '100vw',
          p: { xs: 2, sm: 3 },
        }}
      >
        {drone.isLoading ? (
          <Typography role="status">{t('Loading drone…')}</Typography>
        ) : drone.error ? (
          <Alert
            severity="error"
            action={
              <Button onClick={() => void drone.refetch()}>{t('Retry drone')}</Button>
            }
          >
            {getErrorMessage(drone.error, 'Could not load drone details.')}
          </Alert>
        ) : drone.data ? (
          <>
            <Typography variant="h6">{drone.data.serialNumber}</Typography>
            <Typography variant="body2" color="text.secondary">
              {drone.data.manufacturer || '—'} · {drone.data.model || '—'}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              {t('Serviceability:')} {drone.data.serviceability}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Serviceability is not flight clearance or a permit/readiness
              determination.
            </Typography>
            {canManage && (
              <TextField
                select
                fullWidth
                sx={{ mt: 2 }}
                label={t('Serviceability')}
                value={drone.data.serviceability}
                disabled={updateServiceability.isPending}
                onChange={(event) =>
                  updateServiceability.mutate({
                    id: drone.data!.id,
                    serviceability: event.target.value as DroneServiceability,
                  })
                }
              >
                {SERVICEABILITY_VALUES.map((status) => (
                  <MenuItem key={status} value={status}>
                    {status}
                  </MenuItem>
                ))}
              </TextField>
            )}
            {updateServiceability.isError && (
              <Alert severity="error" sx={{ mt: 1 }}>
                {getErrorMessage(
                  updateServiceability.error,
                  'Could not update serviceability.',
                )}
              </Alert>
            )}
            <Typography variant="subtitle1" sx={{ mt: 3 }}>
              {t('Drone documents')}
            </Typography>
            <QueryState
              isLoading={documents.isLoading}
              error={documents.error}
              onRetry={() => void documents.refetch()}
              loadingLabel={t('Loading drone documents…')}
              isEmpty={Boolean(documents.data && documents.data.length === 0)}
              empty={
                <EmptyState
                  title={t('No drone documents')}
                  description={t('Upload a record such as an airworthiness or maintenance document.')}
                />
              }
            >
              <DataTable
                columns={documentColumns}
                rows={documents.data ?? []}
                rowKey={(document) => document.id}
              />
            </QueryState>
            {updateDocumentStatus.isError && (
              <Alert severity="error">
                {getErrorMessage(
                  updateDocumentStatus.error,
                  'Could not update the document status.',
                )}
              </Alert>
            )}
            {canManage && (
              <Stack spacing={1.5} sx={{ mt: 2 }}>
                <Typography variant="subtitle2">
                  {t('Add a document record')}
                </Typography>
                <TextField
                  label={t('Document type')}
                  value={documentType}
                  onChange={(event) => setDocumentType(event.target.value)}
                />
                <TextField
                  label={t('Issuer')}
                  value={issuer}
                  onChange={(event) => setIssuer(event.target.value)}
                />
                <TextField
                  label={t('Document reference')}
                  value={documentReference}
                  onChange={(event) => setDocumentReference(event.target.value)}
                />
                <TextField
                  type="datetime-local"
                  label={t('Valid from')}
                  value={validFrom}
                  onChange={(event) => setValidFrom(event.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField
                  type="datetime-local"
                  label={t('Valid until')}
                  value={validUntil}
                  onChange={(event) => setValidUntil(event.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<DescriptionOutlined />}
                >
                  {file?.name ?? 'Choose document file'}
                  <input
                    ref={fileInputRef}
                    hidden
                    type="file"
                    accept={ALLOWED_DOCUMENT_TYPES}
                    onChange={(event) =>
                      onChooseFile(event.target.files?.[0] ?? null)
                    }
                  />
                </Button>
                {upload.isError && (
                  <Alert severity="error">
                    {getErrorMessage(
                      upload.error,
                      'Upload failed. Check the file type and size, then try again.',
                    )}
                  </Alert>
                )}
                <Button
                  variant="contained"
                  disabled={!file || upload.isPending}
                  onClick={() => {
                    if (!file || !droneId) return;
                    upload.mutate(
                      {
                        file,
                        documentType,
                        ...(issuer.trim() ? { issuer: issuer.trim() } : {}),
                        ...(documentReference.trim()
                          ? { documentReference: documentReference.trim() }
                          : {}),
                        ...(validFrom
                          ? { validFrom: new Date(validFrom).toISOString() }
                          : {}),
                        ...(validUntil
                          ? { validUntil: new Date(validUntil).toISOString() }
                          : {}),
                      },
                      { onSuccess: clearSelectedFile },
                    );
                  }}
                >
                  {t('Upload document')}
                </Button>
              </Stack>
            )}
          </>
        ) : null}
      </Box>
    </Drawer>
  );
}
