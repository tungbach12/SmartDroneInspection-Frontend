import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddRounded from '@mui/icons-material/AddRounded';
import EditRounded from '@mui/icons-material/EditRounded';
import { DataTable, type DataTableColumn } from '@/shared/ui/DataTable';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryState } from '@/shared/ui/QueryState';
import { pilotLicenseClassApi, type PilotLicenseClass } from '@/features/auth/api/pilotLicenseClassApi';

interface LicenseClassForm {
  name: string;
  description: string;
}

const emptyForm: LicenseClassForm = { name: '', description: '' };

export default function PilotLicenseClassesPage() {
  const queryClient = useQueryClient();
  const classesQuery = useQuery({
    queryKey: ['pilot-license-classes', 'admin'],
    queryFn: pilotLicenseClassApi.listAll,
  });
  const [editing, setEditing] = useState<PilotLicenseClass | null>(null);
  const [form, setForm] = useState<LicenseClassForm>(emptyForm);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deactivating, setDeactivating] = useState<PilotLicenseClass | null>(null);

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
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm);
    },
  });
  const deactivateMutation = useMutation({
    mutationFn: (id: string) => pilotLicenseClassApi.deactivate(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['pilot-license-classes'] });
      setDeactivating(null);
    },
  });

  const columns = useMemo<DataTableColumn<PilotLicenseClass>[]>(
    () => [
      {
        id: 'name',
        label: 'Hạng bằng lái',
        render: (item) => <Typography sx={{ fontWeight: 650 }}>{item.name}</Typography>,
      },
      { id: 'description', label: 'Mô tả', render: (item) => item.description || '—' },
      {
        id: 'active',
        label: 'Trạng thái',
        render: (item) => (
          <Chip
            size="small"
            color={item.active ? 'success' : 'default'}
            label={item.active ? 'Đang hoạt động' : 'Đã ngừng'}
          />
        ),
      },
      {
        id: 'actions',
        label: 'Thao tác',
        align: 'right',
        render: (item) => (
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
            <IconButton
              aria-label={`Sửa ${item.name}`}
              size="small"
              onClick={() => {
                setEditing(item);
                setForm({ name: item.name, description: item.description || '' });
                setDialogOpen(true);
              }}
            >
              <EditRounded fontSize="small" />
            </IconButton>
            {item.active && (
              <Button size="small" color="warning" onClick={() => setDeactivating(item)}>
                Ngừng hoạt động
              </Button>
            )}
          </Stack>
        ),
      },
    ],
    [],
  );

  return (
    <Box className="workspace-page" sx={{ width: '100%', maxWidth: 1200, mx: 'auto' }}>
      <PageHeader
        title="Danh mục hạng bằng lái UAV"
        subtitle="Quản lý các hạng bằng lái Inspector có thể chọn khi đăng ký hoặc cập nhật hồ sơ."
        breadcrumbs={[{ label: 'Home', to: '/admin/dashboard' }, { label: 'Hạng bằng lái UAV' }]}
        actions={(
          <Button
            variant="contained"
            startIcon={<AddRounded />}
            onClick={() => {
              setEditing(null);
              setForm(emptyForm);
              setDialogOpen(true);
            }}
          >
            Thêm hạng bằng
          </Button>
        )}
      />

      <QueryState
        isLoading={classesQuery.isLoading}
        error={classesQuery.error}
        onRetry={() => void classesQuery.refetch()}
      >
        <DataTable<PilotLicenseClass>
          rows={classesQuery.data ?? []}
          columns={columns}
          rowKey={(item) => item.id}
          emptyMessage="Chưa có hạng bằng lái nào."
        />
      </QueryState>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? 'Sửa hạng bằng lái' : 'Thêm hạng bằng lái'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {saveMutation.isError && <Alert severity="error">{saveMutation.error.message}</Alert>}
            <TextField
              autoFocus
              label="Tên hạng bằng lái *"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              slotProps={{ htmlInput: { maxLength: 64 } }}
              fullWidth
              required
            />
            <TextField
              select
              label="Trạng thái"
              value={editing?.active ? 'active' : 'inactive'}
              onChange={(event) =>
                setEditing((current) =>
                  current ? { ...current, active: event.target.value === 'active' } : current,
                )
              }
              fullWidth
              disabled={!editing}
            >
              <MenuItem value="active">Đang hoạt động</MenuItem>
              <MenuItem value="inactive">Đã ngừng hoạt động</MenuItem>
            </TextField>
            <TextField
              label="Mô tả"
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
          <Button onClick={() => setDialogOpen(false)}>Hủy</Button>
          <Button
            variant="contained"
            disabled={!form.name.trim() || saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? 'Đang lưu…' : 'Lưu'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deactivating)}
        title="Ngừng hạng bằng lái?"
        message={`“${deactivating?.name ?? ''}” sẽ không còn xuất hiện khi đăng ký mới. Hồ sơ hiện có vẫn được giữ nguyên.`}
        confirmLabel="Ngừng hoạt động"
        confirmColor="warning"
        onCancel={() => setDeactivating(null)}
        onConfirm={() => {
          if (deactivating) deactivateMutation.mutate(deactivating.id);
        }}
        loading={deactivateMutation.isPending}
      />
      {deactivateMutation.isError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          Không thể ngừng hoạt động hạng bằng lái. Vui lòng thử lại.
        </Alert>
      )}
    </Box>
  );
}
