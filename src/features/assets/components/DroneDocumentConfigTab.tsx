import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
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
  droneDocumentConfigApi,
  type DroneDocumentConfig,
  type CreateDroneDocumentConfigInput,
  type UpdateDroneDocumentConfigInput,
} from '../api/droneDocumentConfigApi';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';

interface FormState {
  code: string;
  titleVi: string;
  titleEn: string;
  descriptionVi: string;
  descriptionEn: string;
  isRequired: boolean;
  isActive: boolean;
  displayOrder: number;
}

const initialForm: FormState = {
  code: '',
  titleVi: '',
  titleEn: '',
  descriptionVi: '',
  descriptionEn: '',
  isRequired: true,
  isActive: true,
  displayOrder: 1,
};

export function DroneDocumentConfigTab() {
  const { locale } = useLocale();
  const tr = (vi: string, en: string) => (locale === 'vi' ? vi : en);
  const queryClient = useQueryClient();

  const [openDialog, setOpenDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<DroneDocumentConfig | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const configsQuery = useQuery({
    queryKey: ['drone-document-configs-admin'],
    queryFn: () => droneDocumentConfigApi.list(true),
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['drone-document-configs-admin'] });
    await queryClient.invalidateQueries({ queryKey: ['drone-document-configs-active'] });
  };

  const createMutation = useMutation({
    mutationFn: (input: CreateDroneDocumentConfigInput) => droneDocumentConfigApi.create(input),
    onSuccess: async () => {
      setOpenDialog(false);
      setForm(initialForm);
      setErrorMsg(null);
      await invalidate();
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to create document config';
      setErrorMsg(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateDroneDocumentConfigInput }) =>
      droneDocumentConfigApi.update(id, input),
    onSuccess: async () => {
      setOpenDialog(false);
      setEditingItem(null);
      setForm(initialForm);
      setErrorMsg(null);
      await invalidate();
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to update document config';
      setErrorMsg(msg);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => droneDocumentConfigApi.toggleActive(id),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => droneDocumentConfigApi.delete(id),
    onSuccess: async () => {
      setDeletingId(null);
      await invalidate();
    },
  });

  const handleOpenCreate = () => {
    setEditingItem(null);
    const maxOrder = Math.max(0, ...(configsQuery.data ?? []).map((c) => c.displayOrder));
    setForm({ ...initialForm, displayOrder: maxOrder + 1 });
    setErrorMsg(null);
    setOpenDialog(true);
  };

  const handleOpenEdit = (item: DroneDocumentConfig) => {
    setEditingItem(item);
    setForm({
      code: item.code,
      titleVi: item.titleVi,
      titleEn: item.titleEn,
      descriptionVi: item.descriptionVi || '',
      descriptionEn: item.descriptionEn || '',
      isRequired: item.isRequired,
      isActive: item.isActive,
      displayOrder: item.displayOrder,
    });
    setErrorMsg(null);
    setOpenDialog(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      updateMutation.mutate({
        id: editingItem.id,
        input: {
          titleVi: form.titleVi.trim(),
          titleEn: form.titleEn.trim(),
          descriptionVi: form.descriptionVi.trim(),
          descriptionEn: form.descriptionEn.trim(),
          isRequired: form.isRequired,
          isActive: form.isActive,
          displayOrder: Number(form.displayOrder) || 0,
        },
      });
    } else {
      createMutation.mutate({
        code: form.code.trim().toUpperCase(),
        titleVi: form.titleVi.trim(),
        titleEn: form.titleEn.trim(),
        descriptionVi: form.descriptionVi.trim(),
        descriptionEn: form.descriptionEn.trim(),
        isRequired: form.isRequired,
        isActive: form.isActive,
        displayOrder: Number(form.displayOrder) || 0,
      });
    }
  };

  const configs = configsQuery.data ?? [];

  return (
    <Card variant="outlined" sx={{ borderRadius: '12px' }}>
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
          <Box>
            <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>
              {tr('Cấu hình danh mục giấy tờ Drone', 'Drone Document Requirements')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {tr(
                'Thiết lập các loại tài liệu Inspector cần nộp khi khai báo phương tiện bay.',
                'Configure required and optional documents Inspectors must submit for drone registration.',
              )}
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddCircleOutlineRounded />}
            onClick={handleOpenCreate}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
          >
            {tr('Thêm loại giấy tờ', 'Add Document')}
          </Button>
        </Box>

        {configsQuery.isLoading ? (
          <Typography color="text.secondary">{tr('Đang tải cấu hình…', 'Loading configurations…')}</Typography>
        ) : configs.length === 0 ? (
          <Alert severity="info">{tr('Chưa có loại giấy tờ nào. Nhấn Thêm để tạo mới.', 'No document configs found. Click Add to create.')}</Alert>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 700 }}>{tr('Thứ tự', 'Order')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{tr('Mã (Code)', 'Code')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{tr('Tên tài liệu', 'Document Title')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{tr('Mô tả', 'Description')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{tr('Quy định', 'Requirement')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{tr('Trạng thái', 'Status')}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>{tr('Thao tác', 'Actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {configs.map((cfg) => (
                  <TableRow key={cfg.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{cfg.displayOrder}</TableCell>
                    <TableCell>
                      <Chip size="small" label={cfg.code} sx={{ fontFamily: 'monospace', fontWeight: 700 }} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 650 }}>
                        {locale === 'vi' ? cfg.titleVi : cfg.titleEn}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {locale === 'vi' ? cfg.titleEn : cfg.titleVi}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 280 }}>
                      <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                        {locale === 'vi' ? cfg.descriptionVi || '—' : cfg.descriptionEn || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={cfg.isRequired ? tr('Bắt buộc', 'Required') : tr('Tùy chọn', 'Optional')}
                        color={cfg.isRequired ? 'warning' : 'default'}
                        variant={cfg.isRequired ? 'filled' : 'outlined'}
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

        {/* DIALOG THÊM / SỬA CẤU HÌNH */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {editingItem
                ? tr('Chỉnh sửa loại giấy tờ', 'Edit Document Type')
                : tr('Thêm loại giấy tờ mới', 'New Document Type')}
            </Typography>
            <IconButton size="small" onClick={() => setOpenDialog(false)}>
              <CloseRounded />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            <Stack component="form" id="doc-config-form" spacing={2.5} onSubmit={handleSubmit} sx={{ pt: 1 }}>
              {errorMsg && <Alert severity="error">{errorMsg}</Alert>}
              {!editingItem && (
                <TextField
                  required
                  label={tr('Mã loại giấy tờ (Code)', 'Document Code')}
                  placeholder="VD: INSURANCE, AIRWORTHINESS"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') })}
                  helperText={tr('Chữ hoa không dấu, gạch dưới (A-Z, 0-9, _)', 'Uppercase letters, numbers, underscore only')}
                />
              )}
              <TextField
                required
                label={tr('Tiêu đề tiếng Việt', 'Vietnamese Title')}
                placeholder="VD: Giấy chứng nhận bảo hiểm trách nhiệm"
                value={form.titleVi}
                onChange={(e) => setForm({ ...form, titleVi: e.target.value })}
              />
              <TextField
                required
                label={tr('Tiêu đề tiếng Anh', 'English Title')}
                placeholder="e.g. Third-Party Liability Insurance Certificate"
                value={form.titleEn}
                onChange={(e) => setForm({ ...form, titleEn: e.target.value })}
              />
              <TextField
                multiline
                rows={2}
                label={tr('Mô tả tiếng Việt', 'Vietnamese Description')}
                placeholder="VD: Hợp đồng bảo hiểm còn hạn đối với phương tiện bay"
                value={form.descriptionVi}
                onChange={(e) => setForm({ ...form, descriptionVi: e.target.value })}
              />
              <TextField
                multiline
                rows={2}
                label={tr('Mô tả tiếng Anh', 'English Description')}
                placeholder="e.g. Valid liability insurance policy covering the UAV"
                value={form.descriptionEn}
                onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })}
              />
              <Stack direction="row" spacing={3} sx={{ alignItems: 'center' }}>
                <TextField
                  type="number"
                  label={tr('Thứ tự hiển thị', 'Display Order')}
                  value={form.displayOrder}
                  onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) || 0 })}
                  sx={{ width: 140 }}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={form.isRequired}
                      onChange={(e) => setForm({ ...form, isRequired: e.target.checked })}
                    />
                  }
                  label={tr('Bắt buộc nộp', 'Required')}
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
            <Button onClick={() => setOpenDialog(false)} color="inherit">
              {tr('Hủy', 'Cancel')}
            </Button>
            <Button
              type="submit"
              form="doc-config-form"
              variant="contained"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? tr('Đang lưu…', 'Saving…')
                : tr('Lưu cấu hình', 'Save Config')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* DIALOG XÁC NHẬN XÓA */}
        <ConfirmDialog
          open={Boolean(deletingId)}
          title={tr('Xóa loại giấy tờ?', 'Delete Document Type?')}
          message={tr(
            'Hành động này sẽ xóa cấu hình loại giấy tờ này khỏi hệ thống. Nếu loại giấy tờ này đã có hồ sơ sử dụng, hãy cân nhắc tắt (Tạm ẩn) thay vì xóa.',
            'This will delete the document config. If applications already use this type, consider deactivating it instead.',
          )}
          confirmLabel={tr('Xóa vĩnh viễn', 'Delete')}
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
