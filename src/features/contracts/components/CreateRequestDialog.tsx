import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddBusinessRoundedIcon from '@mui/icons-material/AddBusinessRounded';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import { type CreateServiceRequestInput } from '../api/contractApi';
import { useCreateServiceRequest } from '../hooks/useContracts';

interface CreateRequestDialogProps {
  open: boolean;
  onClose: () => void;
  assets: { id: string; name: string; code: string }[];
  onCreated: (requestId: string) => void;
  onError: (message: string) => void;
}

const plusDays = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

export function CreateRequestDialog({
  open,
  onClose,
  assets,
  onCreated,
  onError,
}: CreateRequestDialogProps) {
  const create = useCreateServiceRequest();
  const [assetId, setAssetId] = useState('');
  const [description, setDescription] = useState('');
  const [from, setFrom] = useState(plusDays(1));
  const [until, setUntil] = useState(plusDays(14));
  const [requestType, setRequestType] = useState<'ONE_TIME' | 'RECURRING'>('ONE_TIME');
  const [unit, setUnit] = useState('MONTH');
  const [interval, setInterval] = useState('1');
  const [recurrenceLimit, setRecurrenceLimit] = useState<'COUNT' | 'END_DATE'>('COUNT');
  const [count, setCount] = useState('4');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(plusDays(90));
  const [validationError, setValidationError] = useState('');

  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Ho_Chi_Minh', []);

  const handleSubmit = async () => {
    setValidationError('');
    if (!assetId) {
      setValidationError('Vui lòng chọn công trình / tài sản cần kiểm định.');
      return;
    }
    if (!description.trim()) {
      setValidationError('Vui lòng mô tả chi tiết phạm vi khảo sát hoặc yêu cầu kiểm định.');
      return;
    }
    if (until < from) {
      setValidationError('Ngày kết thúc mong muốn phải sau hoặc bằng ngày bắt đầu.');
      return;
    }

    const recurrenceInterval = Number(interval);
    const occurrenceCount = Number(count);
    if (
      requestType === 'RECURRING' &&
      (!Number.isInteger(recurrenceInterval) ||
        recurrenceInterval < 1 ||
        recurrenceInterval > 52 ||
        (recurrenceLimit === 'COUNT' && (!Number.isInteger(occurrenceCount) || occurrenceCount < 1 || occurrenceCount > 100)) ||
        (recurrenceLimit === 'END_DATE' && (recurrenceEndDate < from || recurrenceEndDate > until)))
    ) {
      setValidationError('Vui lòng nhập khoảng chu kỳ lặp và số đợt bay hợp lệ trong khoảng thời gian yêu cầu.');
      return;
    }

    const input: CreateServiceRequestInput = {
      assetId,
      description: description.trim(),
      requestedFrom: from,
      requestedUntil: until,
      timezone,
      requestType,
      ...(requestType === 'RECURRING'
        ? {
            recurrenceUnit: unit,
            recurrenceInterval,
            ...(recurrenceLimit === 'COUNT' ? { occurrenceCount } : { recurrenceEndDate }),
          }
        : {}),
    };

    try {
      const request = await create.mutateAsync(input);
      onCreated(request.id);
      onClose();
      setDescription('');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Không thể tạo yêu cầu dịch vụ.';
      setValidationError(msg);
      onError(msg);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
        <AddBusinessRoundedIcon color="primary" />
        Tạo Yêu cầu Kiểm định Dịch vụ Mới
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          {validationError && (
            <Alert severity="error" onClose={() => setValidationError('')}>
              {validationError}
            </Alert>
          )}

          <FormControl fullWidth size="small" required>
            <InputLabel id="dialog-asset-label">Công trình / Tài sản</InputLabel>
            <Select
              labelId="dialog-asset-label"
              label="Công trình / Tài sản"
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
            >
              {assets.map((asset) => (
                <MenuItem key={asset.id} value={asset.id}>
                  {asset.code} — {asset.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Phạm vi & Yêu cầu khảo sát"
            required
            multiline
            minRows={3}
            size="small"
            placeholder="Ví dụ: Kiểm tra vết nứt trụ cầu T2, quét 3D bề mặt dầm nhịp chính và chụp ảnh độ phân giải cao..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField
              label="Thời gian mong muốn từ"
              type="date"
              size="small"
              fullWidth
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="Thời gian mong muốn đến"
              type="date"
              size="small"
              fullWidth
              value={until}
              onChange={(e) => setUntil(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Stack>

          <Typography variant="caption" color="text.secondary">
            Khung giờ làm việc mặc định: 08:00–17:00 · Múi giờ: {timezone}
          </Typography>

          <FormControl fullWidth size="small">
            <InputLabel id="dialog-type-label">Hình thức kiểm định</InputLabel>
            <Select
              labelId="dialog-type-label"
              label="Hình thức kiểm định"
              value={requestType}
              onChange={(e) => setRequestType(e.target.value as 'ONE_TIME' | 'RECURRING')}
            >
              <MenuItem value="ONE_TIME">Một lần (One-time mission)</MenuItem>
              <MenuItem value="RECURRING">Định kỳ (Recurring missions)</MenuItem>
            </Select>
          </FormControl>

          {requestType === 'RECURRING' && (
            <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: 'primary.main' }}>
                Thiết lập chu kỳ kiểm định
              </Typography>
              <Stack spacing={1.5}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="dialog-unit-label">Đơn vị chu kỳ</InputLabel>
                    <Select
                      labelId="dialog-unit-label"
                      label="Đơn vị chu kỳ"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                    >
                      <MenuItem value="DAY">Mỗi ngày</MenuItem>
                      <MenuItem value="WEEK">Mỗi tuần</MenuItem>
                      <MenuItem value="MONTH">Mỗi tháng</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    label="Khoảng lặp (ví dụ: mỗi 2 tuần)"
                    type="number"
                    size="small"
                    fullWidth
                    value={interval}
                    onChange={(e) => setInterval(e.target.value)}
                    slotProps={{ htmlInput: { min: 1, max: 52 } }}
                  />
                </Stack>

                <FormControl fullWidth size="small">
                  <InputLabel id="dialog-bound-label">Giới hạn chu kỳ</InputLabel>
                  <Select
                    labelId="dialog-bound-label"
                    label="Giới hạn chu kỳ"
                    value={recurrenceLimit}
                    onChange={(e) => setRecurrenceLimit(e.target.value as 'COUNT' | 'END_DATE')}
                  >
                    <MenuItem value="COUNT">Theo tổng số đợt bay</MenuItem>
                    <MenuItem value="END_DATE">Theo ngày kết thúc chu kỳ</MenuItem>
                  </Select>
                </FormControl>

                {recurrenceLimit === 'COUNT' ? (
                  <TextField
                    label="Tổng số đợt bay dự kiến"
                    type="number"
                    size="small"
                    fullWidth
                    value={count}
                    onChange={(e) => setCount(e.target.value)}
                    slotProps={{ htmlInput: { min: 1, max: 100 } }}
                  />
                ) : (
                  <TextField
                    label="Ngày kết thúc chu kỳ"
                    type="date"
                    size="small"
                    fullWidth
                    value={recurrenceEndDate}
                    onChange={(e) => setRecurrenceEndDate(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: from, max: until } }}
                  />
                )}
                <Typography variant="caption" color="text.secondary">
                  * Báo giá sẽ được tính theo từng đợt bay (VND/đợt). Quản lý sẽ gán phi công cụ thể cho từng đợt sau khi hợp đồng ký kết.
                </Typography>
              </Stack>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">
          Hủy bỏ
        </Button>
        <LoadingButton
          variant="contained"
          loading={create.isPending}
          onClick={() => void handleSubmit()}
          disabled={!assetId || !description.trim()}
        >
          Gửi yêu cầu dịch vụ
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
