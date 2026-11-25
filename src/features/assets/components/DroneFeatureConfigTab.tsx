import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AddCircleOutlineRounded from '@mui/icons-material/AddCircleOutlineRounded';
import EditOutlined from '@mui/icons-material/EditOutlined';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import ToggleOnRounded from '@mui/icons-material/ToggleOnRounded';
import ToggleOffOutlined from '@mui/icons-material/ToggleOffOutlined';
import CloseRounded from '@mui/icons-material/CloseRounded';
import {
  droneFeatureConfigApi,
  type DroneFeatureCategory,
  type DroneFeatureConfig,
  type CreateDroneFeatureConfigInput,
  type UpdateDroneFeatureConfigInput,
} from '../api/droneFeatureConfigApi';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { getErrorMessage } from '@/shared/api/errorMessage';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { AdminTableToolbar } from '@/features/admin/components/AdminTableToolbar';

function generateFeatureCode(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
}

interface FormState {
  code: string;
  nameVi: string;
  nameEn: string;
  descriptionVi: string;
  descriptionEn: string;
  category: DroneFeatureCategory;
  isActive: boolean;
  displayOrder: number;
}

const initialForm: FormState = {
  code: '',
  nameVi: '',
  nameEn: '',
  descriptionVi: '',
  descriptionEn: '',
  category: 'CAPABILITY',
  isActive: true,
  displayOrder: 1,
};

export function DroneFeatureConfigTab() {
  const { locale } = useLocale();
  const tr = (vi: string, en: string) => (locale === 'vi' ? vi : en);
  const queryClient = useQueryClient();

  const [openDialog, setOpenDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<DroneFeatureConfig | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [codeManuallyEdited, setCodeManuallyEdited] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | DroneFeatureCategory>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const configsQuery = useQuery({
    queryKey: ['drone-feature-configs-admin'],
    queryFn: () => droneFeatureConfigApi.list(true),
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['drone-feature-configs-admin'] });
    await queryClient.invalidateQueries({ queryKey: ['drone-feature-configs-active'] });
  };

  const createMutation = useMutation({
    mutationFn: (input: CreateDroneFeatureConfigInput) => droneFeatureConfigApi.create(input),
    onSuccess: async () => {
      setOpenDialog(false);
      setForm(initialForm);
      setErrorMsg(null);
      await invalidate();
    },
    onError: (err: unknown) => {
      setErrorMsg(getErrorMessage(err, 'Failed to create feature config'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateDroneFeatureConfigInput }) =>
      droneFeatureConfigApi.update(id, input),
    onSuccess: async () => {
      setOpenDialog(false);
      setEditingItem(null);
      setForm(initialForm);
      setErrorMsg(null);
      await invalidate();
    },
    onError: (err: unknown) => {
      setErrorMsg(getErrorMessage(err, 'Failed to update feature config'));
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => droneFeatureConfigApi.toggleActive(id),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => droneFeatureConfigApi.delete(id),
    onSuccess: async () => {
      setDeletingId(null);
      await invalidate();
    },
  });

  const handleOpenCreate = () => {
    setEditingItem(null);
    const maxOrder = Math.max(0, ...(configsQuery.data ?? []).map((c) => c.displayOrder));
    setForm({ ...initialForm, displayOrder: maxOrder + 1 });
    setCodeManuallyEdited(false);
    setErrorMsg(null);
    setOpenDialog(true);
  };

  const handleOpenEdit = (item: DroneFeatureConfig) => {
    setEditingItem(item);
    setForm({
      code: item.code,
      nameVi: item.nameVi,
      nameEn: item.nameEn,
      descriptionVi: item.descriptionVi || '',
      descriptionEn: item.descriptionEn || '',
      category: item.category === 'CAPABILITY' ? 'CAPABILITY' : 'SAFETY',
      isActive: item.isActive,
      displayOrder: item.displayOrder,
    });
    setCodeManuallyEdited(true);
    setErrorMsg(null);
    setOpenDialog(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedNameVi = form.nameVi.trim() || form.nameEn.trim();
    const resolvedNameEn = form.nameEn.trim() || form.nameVi.trim();
    if (!resolvedNameVi || !resolvedNameEn) {
      setErrorMsg(tr('Vui lòng nhập ít nhất tên tiếng Việt hoặc tiếng Anh.', 'Please provide a feature name.'));
      return;
    }
    const resolvedCode = form.code.trim().toUpperCase() || generateFeatureCode(resolvedNameEn);
    if (!resolvedCode) {
      setErrorMsg(tr('Vui lòng nhập mã tính năng hợp lệ.', 'Please enter a valid feature code.'));
      return;
    }
    if (editingItem) {
      updateMutation.mutate({
        id: editingItem.id,
        input: {
          nameVi: resolvedNameVi,
          nameEn: resolvedNameEn,
          descriptionVi: form.descriptionVi.trim(),
          descriptionEn: form.descriptionEn.trim(),
          category: form.category,
          isActive: form.isActive,
          displayOrder: Number(form.displayOrder) || 0,
        },
      });
    } else {
      createMutation.mutate({
        code: resolvedCode,
        nameVi: resolvedNameVi,
        nameEn: resolvedNameEn,
        descriptionVi: form.descriptionVi.trim(),
        descriptionEn: form.descriptionEn.trim(),
        category: form.category,
        isActive: form.isActive,
        displayOrder: Number(form.displayOrder) || 0,
      });
    }
  };

  const configs = useMemo(() => configsQuery.data ?? [], [configsQuery.data]);
  const filteredConfigs = useMemo(() => {
    const query = search.trim().toLowerCase();
    return configs.filter((config) => {
      if (query) {
        const matches =
          config.code.toLowerCase().includes(query) ||
          config.nameEn.toLowerCase().includes(query) ||
          config.nameVi.toLowerCase().includes(query);
        if (!matches) return false;
      }
      if (categoryFilter !== 'ALL' && config.category !== categoryFilter) return false;
      if (statusFilter === 'ACTIVE' && !config.isActive) return false;
      if (statusFilter === 'INACTIVE' && config.isActive) return false;
      return true;
    });
  }, [categoryFilter, configs, search, statusFilter]);

  return (
    <Card variant="outlined" sx={{ borderRadius: '12px' }}>
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
          <Box>
            <Typography variant="h6" component="h2" sx={{ fontWeight: 700, fontSize: '1rem' }}>
              {tr('Cấu hình Tính năng & An toàn Drone', 'Drone Features & Safety Checklist')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {tr('Quản lý danh sách tính năng & an toàn của Drone.', 'Manage drone capability and safety options.')}
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddCircleOutlineRounded />}
            onClick={handleOpenCreate}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
          >
            {tr('Thêm tính năng', 'Add Feature')}
          </Button>
        </Box>

        <AdminTableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder={tr('Tìm theo mã hoặc tên tính năng', 'Search code or feature name')}
          visibleCount={filteredConfigs.length}
          totalCount={configs.length}
          filters={[
            {
              key: 'category',
              label: tr('Nhóm', 'Category'),
              value: categoryFilter,
              options: [
                { value: 'ALL', label: tr('Tất cả', 'All categories') },
                { value: 'SAFETY', label: tr('An toàn', 'Safety') },
                { value: 'CAPABILITY', label: tr('Năng lực', 'Capability') },
              ],
              onChange: (value) => setCategoryFilter(value as 'ALL' | DroneFeatureCategory),
            },
            {
              key: 'status',
              label: tr('Trạng thái', 'Status'),
              value: statusFilter,
              options: [
                { value: 'ALL', label: tr('Tất cả', 'All statuses') },
                { value: 'ACTIVE', label: tr('Đang áp dụng', 'Active') },
                { value: 'INACTIVE', label: tr('Tạm ẩn', 'Inactive') },
              ],
              onChange: (value) =>
                setStatusFilter(value as 'ALL' | 'ACTIVE' | 'INACTIVE'),
            },
          ]}
        />

        {configsQuery.isLoading ? (
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={22} />
            <Typography color="text.secondary">{tr('Đang tải cấu hình…', 'Loading configurations…')}</Typography>
          </Stack>
        ) : configsQuery.isError ? (
          <Alert
            severity="error"
            action={
              <Button size="small" color="inherit" onClick={() => void configsQuery.refetch()}>
                {tr('Thử lại', 'Try again')}
              </Button>
            }
          >
            {tr('Không thể tải cấu hình tính năng Drone.', 'Could not load the drone feature configurations.')}
          </Alert>
        ) : filteredConfigs.length === 0 ? (
          <Alert severity="info">
            {configs.length === 0
              ? tr('Chưa có tính năng nào. Nhấn Thêm để tạo mới.', 'No features configured yet. Click Add to create.')
              : tr('Không có tính năng nào khớp bộ lọc.', 'No features match the current filters.')}
          </Alert>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 700 }}>{tr('Thứ tự', 'Order')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{tr('Mã (Code)', 'Code')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{tr('Tên tính năng', 'Feature Name')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{tr('Nhóm', 'Category')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{tr('Trạng thái', 'Status')}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>{tr('Thao tác', 'Actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredConfigs.map((cfg) => (
                  <TableRow key={cfg.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{cfg.displayOrder}</TableCell>
                    <TableCell>
                      <Chip size="small" label={cfg.code} sx={{ fontFamily: 'monospace', fontWeight: 700 }} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 650 }}>
                        {locale === 'vi' ? cfg.nameVi : cfg.nameEn}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {locale === 'vi' ? cfg.descriptionVi || '—' : cfg.descriptionEn || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={cfg.category === 'CAPABILITY' ? tr('Năng lực', 'Capability') : tr('An toàn', 'Safety')}
                        color={cfg.category === 'CAPABILITY' ? 'primary' : 'secondary'}
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={cfg.isActive ? tr('Đang áp dụng', 'Active') : tr('Tạm ẩn', 'Inactive')}
                        color={cfg.isActive ? 'success' : 'default'}
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                        <IconButton
                          size="small"
                          color={cfg.isActive ? 'success' : 'default'}
                          onClick={() => toggleMutation.mutate(cfg.id)}
                          title={cfg.isActive ? tr('Nhấn để tạm ẩn', 'Click to deactivate') : tr('Nhấn để kích hoạt', 'Click to activate')}
                        >
                          {cfg.isActive ? <ToggleOnRounded fontSize="small" /> : <ToggleOffOutlined fontSize="small" />}
                        </IconButton>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleOpenEdit(cfg)}
                          title={tr('Chỉnh sửa', 'Edit')}
                        >
                          <EditOutlined fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setDeletingId(cfg.id)}
                          title={tr('Xóa', 'Delete')}
                        >
                          <DeleteOutlineRounded fontSize="small" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* DIALOG THÊM / SỬA */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {editingItem
                ? tr('Chỉnh sửa tính năng', 'Edit Drone Feature')
                : tr('Thêm tính năng mới', 'New Drone Feature')}
            </Typography>
            <IconButton size="small" onClick={() => setOpenDialog(false)}>
              <CloseRounded />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            <Stack component="form" id="feature-config-form" spacing={2.5} onSubmit={handleSubmit} sx={{ pt: 1 }}>
              {errorMsg && <Alert severity="error">{errorMsg}</Alert>}
              <TextField
                required={!form.nameEn.trim()}
                label={tr('Tên tiếng Việt', 'Vietnamese Name')}
                placeholder="VD: Loa phát thanh / Cảm biến khí"
                value={form.nameVi}
                onChange={(e) => {
                  const nextVi = e.target.value;
                  setForm((curr) => ({
                    ...curr,
                    nameVi: nextVi,
                    code:
                      !editingItem && !codeManuallyEdited && !curr.nameEn.trim()
                        ? generateFeatureCode(nextVi)
                        : curr.code,
                  }));
                }}
              />
              <TextField
                required={!form.nameVi.trim()}
                label={tr('Tên tiếng Anh', 'English Name')}
                placeholder="e.g. Loudspeaker Payload"
                value={form.nameEn}
                onChange={(e) => {
                  const nextEn = e.target.value;
                  setForm((curr) => ({
                    ...curr,
                    nameEn: nextEn,
                    code:
                      !editingItem && !codeManuallyEdited
                        ? generateFeatureCode(nextEn || curr.nameVi)
                        : curr.code,
                  }));
                }}
              />
              {!editingItem && (
                <TextField
                  label={tr('Mã tính năng (Code - tự tạo nếu để trống)', 'Feature Code (auto-generated if omitted)')}
                  placeholder="VD: LOUDSPEAKER_PAYLOAD"
                  value={form.code}
                  onChange={(e) => {
                    setCodeManuallyEdited(true);
                    setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') });
                  }}
                  helperText={tr('Tự tạo nếu để trống (A-Z, 0-9, _)', 'Auto-generated if blank (A-Z, 0-9, _)')}
                />
              )}
              <TextField
                multiline
                rows={2}
                label={tr('Mô tả tiếng Việt', 'Vietnamese Description')}
                value={form.descriptionVi}
                onChange={(e) => setForm({ ...form, descriptionVi: e.target.value })}
              />
              <TextField
                multiline
                rows={2}
                label={tr('Mô tả tiếng Anh', 'English Description')}
                value={form.descriptionEn}
                onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })}
              />
              <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <FormControl sx={{ minWidth: 160 }}>
                  <InputLabel id="feature-category-label">{tr('Nhóm', 'Category')}</InputLabel>
                  <Select
                    labelId="feature-category-label"
                    label={tr('Nhóm', 'Category')}
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as DroneFeatureCategory })}
                  >
                    <MenuItem value="CAPABILITY">{tr('Năng lực (Capability)', 'Capability')}</MenuItem>
                    <MenuItem value="SAFETY">{tr('An toàn (Safety)', 'Safety')}</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  type="number"
                  label={tr('Thứ tự', 'Order')}
                  value={form.displayOrder}
                  onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) || 0 })}
                  sx={{ width: 110 }}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={form.isActive}
                      onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    />
                  }
                  label={tr('Đang áp dụng', 'Active')}
                />
              </Stack>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button
              type="submit"
              form="feature-config-form"
              variant="contained"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? tr('Đang lưu…', 'Saving…')
                : tr('Lưu cấu hình', 'Save Config')}
            </Button>
          </DialogActions>
        </Dialog>

        <ConfirmDialog
          open={Boolean(deletingId)}
          title={tr('Xóa tính năng?', 'Delete Drone Feature?')}
          message={tr(
            'Hành động này sẽ xóa tính năng khỏi danh mục cấu hình.',
            'This will permanently delete the feature configuration.',
          )}
          confirmLabel={tr('Xóa', 'Delete')}
          cancelLabel={tr('Hủy', 'Cancel')}
          onConfirm={() => deletingId && deleteMutation.mutate(deletingId)}
          onCancel={() => setDeletingId(null)}
          loading={deleteMutation.isPending}
          severity="danger"
        />
      </CardContent>
    </Card>
  );
}
