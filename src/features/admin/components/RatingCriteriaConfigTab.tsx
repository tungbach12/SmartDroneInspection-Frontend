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
import CloseRounded from '@mui/icons-material/CloseRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import EditOutlined from '@mui/icons-material/EditOutlined';
import { useToastStore } from '@/shared/ui/Toast';
import ToggleOffOutlined from '@mui/icons-material/ToggleOffOutlined';
import ToggleOnRounded from '@mui/icons-material/ToggleOnRounded';
import { AdminTableToolbar } from '@/features/admin/components/AdminTableToolbar';
import { getErrorMessage } from '@/shared/api/errorMessage';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import {
  ratingCriteriaApi,
  ratingCriteriaKeys,
  type CreateRatingCriterionInput,
  type RatingCriterionConfig,
  type RatingRaterRole,
  type UpdateRatingCriterionInput,
} from '../api/ratingCriteriaApi';

interface FormState {
  raterRole: RatingRaterRole;
  code: string;
  labelEn: string;
  labelVi: string;
  descriptionEn: string;
  descriptionVi: string;
  displayOrder: number;
  active: boolean;
}

const initialForm: FormState = {
  raterRole: 'CUSTOMER',
  code: '',
  labelEn: '',
  labelVi: '',
  descriptionEn: '',
  descriptionVi: '',
  displayOrder: 1,
  active: true,
};

export function RatingCriteriaConfigTab() {
  const { locale, t } = useLocale();
  const tr = (vi: string, en: string) => (locale === 'vi' ? vi : en);
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.showToast);

  const [openDialog, setOpenDialog] = useState(false);
  const [editing, setEditing] = useState<RatingCriterionConfig | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | RatingRaterRole>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const configsQuery = useQuery({
    queryKey: ratingCriteriaKeys.admin(),
    queryFn: () => ratingCriteriaApi.listAdmin(),
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ratingCriteriaKeys.all });
    await queryClient.invalidateQueries({ queryKey: ['inspection-rating'] });
    await queryClient.invalidateQueries({ queryKey: ['inspector-ratings'] });
  };

  const createMutation = useMutation({
    mutationFn: (input: CreateRatingCriterionInput) => ratingCriteriaApi.create(input),
    onSuccess: async () => {
      setOpenDialog(false);
      setForm(initialForm);
      setErrorMsg(null);
      await invalidate();
      showToast(tr('Đã tạo tiêu chí đánh giá.', 'Rating criterion created.'), 'success');
    },
    onError: (err: unknown) => {
      setErrorMsg(getErrorMessage(err, tr('Không thể tạo tiêu chí.', 'Could not create criterion.')));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateRatingCriterionInput }) =>
      ratingCriteriaApi.update(id, input),
    onSuccess: async () => {
      setOpenDialog(false);
      setEditing(null);
      setForm(initialForm);
      setErrorMsg(null);
      await invalidate();
      showToast(tr('Đã cập nhật tiêu chí đánh giá.', 'Rating criterion updated.'), 'success');
    },
    onError: (err: unknown) => {
      setErrorMsg(getErrorMessage(err, tr('Không thể cập nhật tiêu chí.', 'Could not update criterion.')));
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => ratingCriteriaApi.toggleActive(id),
    onSuccess: async () => {
      setErrorMsg(null);
      await invalidate();
      showToast(tr('Đã cập nhật trạng thái tiêu chí.', 'Criterion status updated.'), 'success');
    },
    onError: (err: unknown) => {
      setErrorMsg(getErrorMessage(err, tr('Không thể đổi trạng thái tiêu chí.', 'Could not toggle criterion.')));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => ratingCriteriaApi.remove(id),
    onSuccess: async () => {
      setDeletingId(null);
      setErrorMsg(null);
      await invalidate();
      showToast(tr('Đã xóa tiêu chí đánh giá.', 'Rating criterion deleted.'), 'success');
    },
    onError: (err: unknown) => {
      setDeletingId(null);
      setErrorMsg(
        getErrorMessage(
          err,
          tr(
            'Không thể xóa tiêu chí đã có đánh giá; hãy tạm tắt (Deactivate) thay thế.',
            'Cannot delete a criterion already used in ratings; deactivate it instead.',
          ),
        ),
      );
    },
  });

  const allItems = useMemo(() => configsQuery.data ?? [], [configsQuery.data]);
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allItems.filter((item) => {
      if (roleFilter !== 'ALL' && item.raterRole !== roleFilter) return false;
      if (statusFilter === 'ACTIVE' && !item.active) return false;
      if (statusFilter === 'INACTIVE' && item.active) return false;
      if (!q) return true;
      return (
        item.code.toLowerCase().includes(q) ||
        item.labelEn.toLowerCase().includes(q) ||
        item.labelVi.toLowerCase().includes(q)
      );
    });
  }, [allItems, roleFilter, search, statusFilter]);

  const openCreate = () => {
    setEditing(null);
    setErrorMsg(null);
    const nextOrder =
      allItems.filter((i) => i.raterRole === 'CUSTOMER').reduce((m, i) => Math.max(m, i.displayOrder), 0) + 1;
    setForm({ ...initialForm, displayOrder: nextOrder });
    setOpenDialog(true);
  };

  const openEdit = (item: RatingCriterionConfig) => {
    setEditing(item);
    setErrorMsg(null);
    setForm({
      raterRole: item.raterRole,
      code: item.code,
      labelEn: item.labelEn,
      labelVi: item.labelVi,
      descriptionEn: item.descriptionEn ?? '',
      descriptionVi: item.descriptionVi ?? '',
      displayOrder: item.displayOrder,
      active: item.active,
    });
    setOpenDialog(true);
  };

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.labelEn.trim() || !form.labelVi.trim()) return;
    if (editing) {
      updateMutation.mutate({
        id: editing.id,
        input: {
          labelEn: form.labelEn.trim(),
          labelVi: form.labelVi.trim(),
          descriptionEn: form.descriptionEn.trim() || null,
          descriptionVi: form.descriptionVi.trim() || null,
          displayOrder: form.displayOrder,
          active: form.active,
        },
      });
      return;
    }
    if (!form.code.trim()) return;
    createMutation.mutate({
      raterRole: form.raterRole,
      code: form.code.trim(),
      labelEn: form.labelEn.trim(),
      labelVi: form.labelVi.trim(),
      descriptionEn: form.descriptionEn.trim() || null,
      descriptionVi: form.descriptionVi.trim() || null,
      displayOrder: form.displayOrder,
      active: form.active,
    });
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <Card variant="outlined" sx={{ borderRadius: '8px' }}>
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack spacing={2}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
          >
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {tr('Tiêu chí đánh giá Inspector', 'Inspector rating criteria')}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {tr(
                  'Cấu hình danh sách tiêu chí chấm điểm riêng cho Customer và Manager. Cần ít nhất 1 tiêu chí đang bật cho mỗi vai trò.',
                  'Configure rating sub-criteria independently for Customer and Manager evaluations. At least one active criterion is required per role.',
                )}
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddCircleOutlineRounded />}
              onClick={openCreate}
              sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 700, flexShrink: 0 }}
            >
              {tr('Thêm tiêu chí', 'Add criterion')}
            </Button>
          </Stack>

          {errorMsg && (
            <Alert severity="error" onClose={() => setErrorMsg(null)}>
              {errorMsg}
            </Alert>
          )}

          <AdminTableToolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder={tr('Tìm mã hoặc tên tiêu chí…', 'Search criterion code or label…')}
            visibleCount={rows.length}
            totalCount={allItems.length}
            onClearAll={() => {
              setRoleFilter('ALL');
              setStatusFilter('ALL');
            }}
            filters={[
              {
                key: 'role',
                label: tr('Vai trò đánh giá', 'Rater role'),
                value: roleFilter,
                options: [
                  { value: 'ALL', label: tr('Tất cả', 'All roles') },
                  { value: 'CUSTOMER', label: t('Customer') },
                  { value: 'MANAGER', label: t('Manager') },
                ],
                onChange: (value) => setRoleFilter(value as 'ALL' | RatingRaterRole),
              },
              {
                key: 'status',
                label: t('Status'),
                value: statusFilter,
                options: [
                  { value: 'ALL', label: t('All') },
                  { value: 'ACTIVE', label: t('Active') },
                  { value: 'INACTIVE', label: tr('Tạm tắt', 'Inactive') },
                ],
                onChange: (value) => setStatusFilter(value as 'ALL' | 'ACTIVE' | 'INACTIVE'),
              },
            ]}
          />

          {configsQuery.isLoading ? (
            <Box sx={{ py: 5, display: 'grid', placeItems: 'center' }}>
              <CircularProgress size={26} />
            </Box>
          ) : (
            <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: '8px' }}>
              <Table size="small" aria-label={tr('Tiêu chí đánh giá Inspector', 'Inspector rating criteria')}>
                <TableHead>
                  <TableRow>
                    <TableCell>{tr('Vai trò', 'Role')}</TableCell>
                    <TableCell>{tr('Mã', 'Code')}</TableCell>
                    <TableCell>{tr('Nhãn hiển thị', 'Label')}</TableCell>
                    <TableCell align="center">{tr('Thứ tự', 'Order')}</TableCell>
                    <TableCell>{t('Status')}</TableCell>
                    <TableCell align="right" />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          {tr('Không tìm thấy tiêu chí phù hợp.', 'No matching rating criteria found.')}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((item) => (
                      <TableRow key={item.id} hover>
                        <TableCell>
                          <Chip
                            size="small"
                            color={item.raterRole === 'MANAGER' ? 'secondary' : 'primary'}
                            variant="outlined"
                            label={t(item.raterRole === 'MANAGER' ? 'Manager' : 'Customer')}
                            sx={{ fontWeight: 600 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                            {item.code}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {locale === 'vi' ? item.labelVi : item.labelEn}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {locale === 'vi' ? item.labelEn : item.labelVi}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">{item.displayOrder}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={item.active ? t('Active') : tr('Tạm tắt', 'Inactive')}
                            color={item.active ? 'success' : 'default'}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                          <IconButton
                            size="small"
                            aria-label={item.active ? tr('Tạm tắt', 'Deactivate') : tr('Kích hoạt', 'Activate')}
                            onClick={() => toggleMutation.mutate(item.id)}
                          >
                            {item.active ? (
                              <ToggleOnRounded color="success" fontSize="small" />
                            ) : (
                              <ToggleOffOutlined fontSize="small" />
                            )}
                          </IconButton>
                          <IconButton
                            size="small"
                            aria-label={tr('Chỉnh sửa', 'Edit')}
                            onClick={() => openEdit(item)}
                          >
                            <EditOutlined fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            aria-label={t('Delete')}
                            onClick={() => setDeletingId(item.id)}
                          >
                            <DeleteOutlineRounded fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Stack>
      </CardContent>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} fullWidth maxWidth="sm">
        <form onSubmit={handleSave}>
          <DialogTitle sx={{ pr: 5 }}>
            {editing ? tr('Cập nhật tiêu chí', 'Update criterion') : tr('Thêm tiêu chí mới', 'Add rating criterion')}
            <IconButton
              aria-label={t('Close')}
              onClick={() => setOpenDialog(false)}
              size="small"
              sx={{ position: 'absolute', right: 12, top: 12 }}
            >
              <CloseRounded fontSize="small" />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <FormControl size="small" fullWidth disabled={Boolean(editing)}>
                  <InputLabel>{tr('Vai trò', 'Rater role')}</InputLabel>
                  <Select
                    label={tr('Vai trò', 'Rater role')}
                    value={form.raterRole}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        raterRole: e.target.value as RatingRaterRole,
                      }))
                    }
                  >
                    <MenuItem value="CUSTOMER">{t('Customer')}</MenuItem>
                    <MenuItem value="MANAGER">{t('Manager')}</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  required
                  size="small"
                  fullWidth
                  disabled={Boolean(editing)}
                  label={tr('Mã (camelCase)', 'Code (camelCase)')}
                  placeholder="reportClarity"
                  value={form.code}
                  onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
                />
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  required
                  size="small"
                  fullWidth
                  label={tr('Tên tiếng Anh', 'Label (EN)')}
                  value={form.labelEn}
                  onChange={(e) => setForm((prev) => ({ ...prev, labelEn: e.target.value }))}
                />
                <TextField
                  required
                  size="small"
                  fullWidth
                  label={tr('Tên tiếng Việt', 'Label (VI)')}
                  value={form.labelVi}
                  onChange={(e) => setForm((prev) => ({ ...prev, labelVi: e.target.value }))}
                />
              </Stack>

              <TextField
                size="small"
                fullWidth
                label={tr('Mô tả ngắn (EN)', 'Short hint (EN)')}
                value={form.descriptionEn}
                onChange={(e) => setForm((prev) => ({ ...prev, descriptionEn: e.target.value }))}
              />
              <TextField
                size="small"
                fullWidth
                label={tr('Mô tả ngắn (VI)', 'Short hint (VI)')}
                value={form.descriptionVi}
                onChange={(e) => setForm((prev) => ({ ...prev, descriptionVi: e.target.value }))}
              />

              <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                <TextField
                  size="small"
                  type="number"
                  label={tr('Thứ tự', 'Order')}
                  value={form.displayOrder}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, displayOrder: Number(e.target.value) || 1 }))
                  }
                  sx={{ width: 120 }}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={form.active}
                      onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
                    />
                  }
                  label={t('Active')}
                />
              </Stack>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button type="submit" variant="contained" disabled={isSaving}>
              {isSaving ? t('Saving…') : t('Save')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deletingId)}
        title={tr('Xóa tiêu chí đánh giá', 'Delete rating criterion')}
        message={tr(
          'Tiêu chí đã từng được chấm điểm không thể xóa cứng — hãy tắt (Inactive) để giữ nguyên lịch sử.',
          'Criteria referenced by existing ratings cannot be hard-deleted; deactivate them instead to preserve history.',
        )}
        confirmLabel={t('Delete')}
        cancelLabel={t('Cancel')}
        severity="danger"
        loading={deleteMutation.isPending}
        onCancel={() => setDeletingId(null)}
        onConfirm={() => {
          if (deletingId) deleteMutation.mutate(deletingId);
        }}
      />
    </Card>
  );
}
