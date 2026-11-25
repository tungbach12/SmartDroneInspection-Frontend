import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddRounded from '@mui/icons-material/AddRounded';
import EditRounded from '@mui/icons-material/EditRounded';
import { DataTable, type DataTableColumn } from '@/shared/ui/DataTable';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryState } from '@/shared/ui/QueryState';
import { StatusChip } from '@/shared/ui/StatusChip';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { AdminTableToolbar } from '@/features/admin/components/AdminTableToolbar';
import { pilotLicenseClassApi, type PilotLicenseClass } from '@/features/auth/api/pilotLicenseClassApi';
import { useToastStore } from '@/shared/ui/Toast';

interface LicenseClassForm {
  name: string;
  description: string;
}

const emptyForm: LicenseClassForm = { name: '', description: '' };

interface PilotLicenseClassesPageProps {
  /** Rendered inside the Drone & Flight config workspace, which owns the page header. */
  embedded?: boolean;
}

export default function PilotLicenseClassesPage({ embedded = false }: PilotLicenseClassesPageProps) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);
  const classesQuery = useQuery({
    queryKey: ['pilot-license-classes', 'admin'],
    queryFn: pilotLicenseClassApi.listAll,
  });
  const [editing, setEditing] = useState<PilotLicenseClass | null>(null);
  const [form, setForm] = useState<LicenseClassForm>(emptyForm);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deactivating, setDeactivating] = useState<PilotLicenseClass | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const saveMutation = useMutation({
    mutationFn: () =>
      editing
        ? pilotLicenseClassApi.update(editing.id, {
            ...form,
            active: editing.active && !deactivating,
          })
        : pilotLicenseClassApi.create({ ...form, active: true }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['pilot-license-classes'] });
      showToast(editing ? t('License class updated') : t('License class created'), 'success');
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm);
    },
  });
  const deactivateMutation = useMutation({
    mutationFn: (id: string) => pilotLicenseClassApi.deactivate(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['pilot-license-classes'] });
      showToast(t('License class deactivated'), 'success');
      setDeactivating(null);
    },
  });

  const columns = useMemo<DataTableColumn<PilotLicenseClass>[]>(
    () => [
      {
        id: 'name',
        label: t('License class'),
        sortValue: (item) => item.name,
        width: 180,
        render: (item) => <Typography sx={{ fontWeight: 650, fontSize: '0.875rem' }}>{item.name}</Typography>,
      },
      {
        id: 'description',
        label: t('Description'),
        render: (item) => (
          <Typography variant="body2" color="text.secondary">
            {item.description || '—'}
          </Typography>
        ),
      },
      {
        id: 'active',
        label: t('Status'),
        sortValue: (item) => (item.active ? '0-Active' : '1-Inactive'),
        width: 150,
        render: (item) => (
          <StatusChip
            status={item.active ? 'ACTIVE' : 'INACTIVE'}
            label={item.active ? t('Active') : t('Inactive')}
          />
        ),
      },
      {
        id: 'actions',
        label: t('Actions'),
        align: 'right',
        width: 190,
        noWrap: true,
        render: (item) => (
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', alignItems: 'center' }}>
            <Tooltip title={t('Edit')}>
              <IconButton
                aria-label={`${t('Edit')} ${item.name}`}
                size="small"
                onClick={() => {
                  saveMutation.reset();
                  setEditing(item);
                  setForm({ name: item.name, description: item.description || '' });
                  setDialogOpen(true);
                }}
              >
                <EditRounded fontSize="small" />
              </IconButton>
            </Tooltip>
            {item.active && (
              <Button
                size="small"
                variant="outlined"
                color="warning"
                onClick={() => {
                  deactivateMutation.reset();
                  setDeactivating(item);
                }}
              >
                {t('Deactivate')}
              </Button>
            )}
          </Stack>
        ),
      },
    ],
    [deactivateMutation, saveMutation, t],
  );

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (classesQuery.data ?? []).filter((item) => {
      if (query) {
        const matches =
          item.name.toLowerCase().includes(query) ||
          (item.description ?? '').toLowerCase().includes(query);
        if (!matches) return false;
      }
      if (statusFilter === 'ACTIVE' && !item.active) return false;
      if (statusFilter === 'INACTIVE' && item.active) return false;
      return true;
    });
  }, [classesQuery.data, search, statusFilter]);

  return (
    <Box sx={embedded ? undefined : { width: '100%', maxWidth: 1200, mx: 'auto' }}>
      {!embedded && (
        <PageHeader
          title={t('UAV Pilot License Classes')}
          subtitle={t('Manage the UAV pilot license tiers inspectors can select during onboarding or profile updates.')}
          breadcrumbs={[{ label: t('Governance'), to: '/admin/dashboard' }, { label: t('UAV license classes') }]}
          actions={(
            <Button
              variant="contained"
              startIcon={<AddRounded />}
              onClick={() => {
                saveMutation.reset();
                setEditing(null);
                setForm(emptyForm);
                setDialogOpen(true);
              }}
            >
              {t('Add license class')}
            </Button>
          )}
        />
      )}

      <AdminTableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={t('Search license class name')}
        visibleCount={rows.length}
        totalCount={classesQuery.data?.length ?? 0}
        onClearAll={() => setStatusFilter('ALL')}
        actions={
          embedded ? (
            <Button
              variant="contained"
              size="small"
              startIcon={<AddRounded />}
              onClick={() => {
                saveMutation.reset();
                setEditing(null);
                setForm(emptyForm);
                setDialogOpen(true);
              }}
              sx={{ whiteSpace: 'nowrap' }}
            >
              {t('Add license class')}
            </Button>
          ) : undefined
        }
        filters={[
          {
            key: 'status',
            label: t('Status'),
            value: statusFilter,
            options: [
              { value: 'ALL', label: t('All statuses') },
              { value: 'ACTIVE', label: t('Active') },
              { value: 'INACTIVE', label: t('Inactive') },
            ],
            onChange: (value) => setStatusFilter(value as 'ALL' | 'ACTIVE' | 'INACTIVE'),
          },
        ]}
      />

      {deactivateMutation.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {t('Could not deactivate the license class. Please try again.')}
        </Alert>
      )}

      <QueryState
        isLoading={classesQuery.isLoading}
        error={classesQuery.error}
        onRetry={() => void classesQuery.refetch()}
      >
        <DataTable<PilotLicenseClass>
          rows={rows}
          columns={columns}
          rowKey={(item) => item.id}
          emptyMessage={t('No license classes configured yet.')}
        />
      </QueryState>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? t('Edit license class') : t('Add license class')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {saveMutation.isError && <Alert severity="error">{saveMutation.error.message}</Alert>}
            <TextField
              autoFocus
              size="small"
              label={`${t('License class name')} *`}
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              slotProps={{ htmlInput: { maxLength: 64 } }}
              fullWidth
              required
            />
            <TextField
              select
              size="small"
              label={t('Status')}
              value={editing?.active ? 'active' : 'inactive'}
              onChange={(event) =>
                setEditing((current) =>
                  current ? { ...current, active: event.target.value === 'active' } : current,
                )
              }
              fullWidth
              disabled={!editing}
            >
              <MenuItem value="active">{t('Active')}</MenuItem>
              <MenuItem value="inactive">{t('Inactive')}</MenuItem>
            </TextField>
            <TextField
              size="small"
              label={t('Description')}
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              slotProps={{ htmlInput: { maxLength: 500 } }}
              fullWidth
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>{t('Cancel')}</Button>
          <Button
            variant="contained"
            disabled={!form.name.trim() || saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? t('Saving…') : t('Save')}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deactivating)}
        title={t('Deactivate license class?')}
        message={t('New registrations will no longer see this license class. Existing inspector profiles stay intact.')}
        confirmLabel={t('Deactivate')}
        cancelLabel={t('Cancel')}
        confirmColor="warning"
        onCancel={() => setDeactivating(null)}
        onConfirm={() => {
          if (deactivating) deactivateMutation.mutate(deactivating.id);
        }}
        loading={deactivateMutation.isPending}
      />
    </Box>
  );
}
