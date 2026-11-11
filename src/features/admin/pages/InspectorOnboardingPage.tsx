import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { pilotLicenseClassApi } from '@/features/auth/api/pilotLicenseClassApi';
import {
  Alert,
  Box,
  Button,
  Chip,
  MenuItem,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';
import CloudUploadOutlined from '@mui/icons-material/CloudUploadOutlined';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import DownloadRounded from '@mui/icons-material/DownloadRounded';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import {
  inspectorProfileApi,
  type UpdateInspectorProfileInput,
} from '@/features/admin/api/inspectorProfileApi';
import { mf1DroneApi } from '@/features/assets/api/mf1DroneApi';
import FlightRounded from '@mui/icons-material/FlightRounded';
import { PageHeader } from '@/shared/ui/PageHeader';

const STEPS = [
  '1. CCCD & Bằng lái UAV',
  '2. Ký Hợp đồng Đối tác',
  '3. Kết quả Phê duyệt',
];

export default function InspectorOnboardingPage() {
  const user = useAuthStore((state) => state.user);
  const inspectorId = user?.id ?? null;
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [activeStep, setActiveStep] = useState(0);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: ['inspector-profile', inspectorId],
    queryFn: () => (inspectorId ? inspectorProfileApi.get(inspectorId) : null),
    enabled: Boolean(inspectorId),
  });
  const profile = profileQuery.data;

  const dronesQuery = useQuery({
    queryKey: ['inspector-active-drones'],
    queryFn: mf1DroneApi.drones,
    enabled: Boolean(inspectorId),
  });
  const myDrones = dronesQuery.data ?? [];
  const licenseClassesQuery = useQuery({
    queryKey: ['pilot-license-classes', 'active'],
    queryFn: pilotLicenseClassApi.listActive,
    staleTime: 60_000,
  });

  const [form, setForm] = useState<UpdateInspectorProfileInput>({
    fullName: '',
    phoneNumber: '',
    citizenId: '',
    dateOfBirth: '',
    address: '',
    notes: '',
    pilotLicenseNumber: '',
    pilotLicenseClass: '',
    pilotLicenseIssuedDate: '',
    pilotLicenseExpiresAt: '',
    pilotLicenseAuthority: '',
    priorFlightHours: 0,
    certifiedDroneModels: '',
    specializations: '',
    experienceSummary: '',
  });

  useEffect(() => {
    if (profile) {
      setForm({
        fullName: profile.fullName || '',
        phoneNumber: profile.phoneNumber || '',
        citizenId: profile.citizenId || '',
        dateOfBirth: profile.dateOfBirth || '',
        address: profile.address || '',
        notes: profile.notes || '',
        pilotLicenseNumber: profile.pilotLicenseNumber || '',
        pilotLicenseClass: profile.pilotLicenseClass || '',
        pilotLicenseIssuedDate: profile.pilotLicenseIssuedDate || '',
        pilotLicenseExpiresAt: profile.pilotLicenseExpiresAt
          ? profile.pilotLicenseExpiresAt.slice(0, 10)
          : '',
        pilotLicenseAuthority: profile.pilotLicenseAuthority || '',
        priorFlightHours: profile.priorFlightHours || 0,
        certifiedDroneModels: profile.certifiedDroneModels || '',
        specializations: profile.specializations || '',
        experienceSummary: profile.experienceSummary || '',
      });
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: (input: UpdateInspectorProfileInput) => {
      if (!inspectorId) throw new Error('Missing inspector ID');
      return inspectorProfileApi.update(inspectorId, {
        ...input,
        pilotLicenseExpiresAt: input.pilotLicenseExpiresAt
          ? new Date(input.pilotLicenseExpiresAt).toISOString()
          : null,
      });
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['inspector-profile', inspectorId], updated);
      setSuccessMessage('Đã lưu thông tin hồ sơ.');
    },
  });

  const uploadLicenseMutation = useMutation({
    mutationFn: (file: File) => {
      if (!inspectorId) throw new Error('Missing inspector ID');
      return inspectorProfileApi.uploadLicenseScan(inspectorId, file);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['inspector-profile', inspectorId], updated);
      setSuccessMessage('Đã tải lên bản scan Bằng lái thành công.');
    },
  });

  const uploadContractMutation = useMutation({
    mutationFn: (file: File) => {
      if (!inspectorId) throw new Error('Missing inspector ID');
      return inspectorProfileApi.uploadPartnerContract(inspectorId, file);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['inspector-profile', inspectorId], updated);
      setSuccessMessage('Đã tải lên Hợp đồng đã ký (đã khóa mã băm SHA-256).');
    },
  });

  if (profileQuery.isLoading || !profile) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box className="workspace-page" sx={{ maxWidth: 760, mx: 'auto', pb: 6 }}>
      <PageHeader
        title="Hồ sơ & Hợp đồng Đối tác"
        subtitle="Hoàn tất 3 bước đơn giản để kích hoạt tài khoản nhận nhiệm vụ bay."
      />

      <Paper
        variant="outlined"
        sx={{
          mt: 2.5,
          p: { xs: 2.5, sm: 3.5 },
          borderRadius: '14px',
          borderColor: 'divider',
        }}
      >
        <Stepper activeStep={activeStep} sx={{ mb: 3.5 }}>
          {STEPS.map((label, idx) => {
            const done =
              (idx === 0 && Boolean(profile.hasLicenseScan && profile.pilotLicenseNumber)) ||
              (idx === 1 && Boolean(profile.hasPartnerContract)) ||
              (idx === 2 && profile.onboardingStatus === 'APPROVED');
            return (
              <Step
                key={label}
                completed={done}
                sx={{ cursor: 'pointer' }}
                onClick={() => {
                  setSuccessMessage(null);
                  setActiveStep(idx);
                }}
              >
                <StepLabel>{label}</StepLabel>
              </Step>
            );
          })}
        </Stepper>

        {successMessage && (
          <Alert
            severity="success"
            onClose={() => setSuccessMessage(null)}
            sx={{ mb: 2.5, borderRadius: '8px' }}
          >
            {successMessage}
          </Alert>
        )}

        {(profile.licenseExpirationStatus === 'EXPIRED' ||
          profile.licenseExpirationStatus === 'EXPIRING_SOON') && (
          <Alert
            severity={
              profile.licenseExpirationStatus === 'EXPIRED'
                ? 'error'
                : (profile.licenseRemainingDays ?? 99) <= 7
                  ? 'warning'
                  : 'info'
            }
            sx={{ mb: 2.5, borderRadius: '8px' }}
          >
            {profile.licenseExpirationStatus === 'EXPIRED'
              ? `Giấy phép điều khiển UAV ${profile.pilotLicenseNumber || ''} đã hết hạn${
                  profile.pilotLicenseExpiresAt
                    ? ` từ ngày ${new Date(profile.pilotLicenseExpiresAt).toLocaleDateString('vi-VN')}`
                    : ''
                }. Vui lòng cập nhật "Ngày hết hạn bằng lái" mới và tải lên bản scan gia hạn bên dưới rồi nhấn "Lưu thông tin".`
              : `Giấy phép điều khiển UAV ${profile.pilotLicenseNumber || ''} sẽ hết hạn sau ${
                  profile.licenseRemainingDays ?? 0
                } ngày${
                  profile.pilotLicenseExpiresAt
                    ? ` (${new Date(profile.pilotLicenseExpiresAt).toLocaleDateString('vi-VN')})`
                    : ''
                }. Bạn có thể cập nhật ngày hết hạn mới và tải lên bản scan gia hạn tại đây.`}
          </Alert>
        )}

        {/* ===================== BƯỚC 1: CCCD & BẰNG LÁI ===================== */}
        {activeStep === 0 && (
          <Stack spacing={2.5}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField
                size="small"
                label="Họ và tên"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                fullWidth
              />
              <TextField
                size="small"
                label="Số điện thoại"
                value={form.phoneNumber || ''}
                onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                fullWidth
              />
              <TextField
                size="small"
                label="Số CCCD / Hộ chiếu *"
                value={form.citizenId || ''}
                onChange={(e) => setForm({ ...form, citizenId: e.target.value })}
                fullWidth
              />
              <TextField
                size="small"
                label="Số hiệu Bằng lái UAV *"
                value={form.pilotLicenseNumber || ''}
                onChange={(e) => setForm({ ...form, pilotLicenseNumber: e.target.value })}
                fullWidth
              />
              <TextField
                select
                size="small"
                label="Hạng bằng lái UAV"
                value={form.pilotLicenseClass || ''}
                onChange={(e) => setForm({ ...form, pilotLicenseClass: e.target.value })}
                fullWidth
                disabled={licenseClassesQuery.isLoading || licenseClassesQuery.isError}
                helperText={licenseClassesQuery.isError ? 'Không thể tải danh mục hạng bằng lái.' : undefined}
              >
                <MenuItem value=""><em>Chưa chọn hạng bằng</em></MenuItem>
                {licenseClassesQuery.data?.map((licenseClass) => (
                  <MenuItem key={licenseClass.id} value={licenseClass.name}>{licenseClass.name}</MenuItem>
                ))}
                {form.pilotLicenseClass && !licenseClassesQuery.data?.some((item) => item.name === form.pilotLicenseClass) && (
                  <MenuItem value={form.pilotLicenseClass}>{form.pilotLicenseClass} (đã ngừng hoạt động)</MenuItem>
                )}
              </TextField>
              <TextField
                size="small"
                type="date"
                label="Ngày hết hạn bằng lái"
                slotProps={{ inputLabel: { shrink: true } }}
                value={form.pilotLicenseExpiresAt || ''}
                onChange={(e) => setForm({ ...form, pilotLicenseExpiresAt: e.target.value })}
                fullWidth
              />
            </Box>

            <Divider />

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, p: 2, bgcolor: 'action.hover', borderRadius: '10px' }}
            >
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Bản scan Bằng lái UAV
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {profile.hasLicenseScan ? 'Đã tải lên MinIO' : 'Chưa tải lên (Hỗ trợ Ảnh hoặc PDF)'}
                </Typography>
              </Box>

              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                {profile.hasLicenseScan && (
                  <Chip size="small" color="success" icon={<CheckCircleRounded />} label="Đã tải lên" />
                )}
                <Button
                  component="label"
                  size="small"
                  variant="outlined"
                  startIcon={<CloudUploadOutlined />}
                  disabled={uploadLicenseMutation.isPending}
                  sx={{ textTransform: 'none', fontWeight: 600, bgcolor: 'background.paper' }}
                >
                  {uploadLicenseMutation.isPending ? 'Đang tải…' : 'Tải ảnh/PDF Bằng lái'}
                  <input
                    hidden
                    type="file"
                    accept="image/png,image/jpeg,image/webp,application/pdf"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadLicenseMutation.mutate(f);
                    }}
                  />
                </Button>
              </Stack>
            </Stack>

            <Stack direction="row" sx={{ justifyContent: 'space-between', pt: 1 }}>
              <Button
                variant="outlined"
                disabled={updateMutation.isPending}
                onClick={() => updateMutation.mutate(form)}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                {updateMutation.isPending ? 'Đang lưu…' : 'Lưu thông tin'}
              </Button>
              <Button
                variant="contained"
                endIcon={<ArrowForwardRounded />}
                onClick={() => {
                  updateMutation.mutate(form);
                  setActiveStep(1);
                }}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Tiếp tục Bước 2
              </Button>
            </Stack>
          </Stack>
        )}

        {/* ===================== BƯỚC 2: HỢP ĐỒNG ĐỐI TÁC ===================== */}
        {activeStep === 1 && (
          <Stack spacing={2.5}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, p: 2, bgcolor: 'action.hover', borderRadius: '10px' }}
            >
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  1. Tải Dự thảo Hợp đồng Đối tác (PDF)
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Hợp đồng mẫu đã điền sẵn tên, CCCD và số bằng lái của bạn để in ra ký hoặc ký số.
                </Typography>
              </Box>
              <Button
                size="small"
                variant="outlined"
                startIcon={<DownloadRounded />}
                onClick={() => {
                  if (inspectorId) {
                    void inspectorProfileApi.downloadDraftPartnerContractPdf(inspectorId, profile.fullName);
                  }
                }}
                sx={{ textTransform: 'none', fontWeight: 600, whiteSpace: 'nowrap', bgcolor: 'background.paper' }}
              >
                Tải file PDF mẫu
              </Button>
            </Stack>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, p: 2, bgcolor: 'action.hover', borderRadius: '10px' }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  2. Tải lên Hợp đồng đã ký (Khóa mã băm SHA-256)
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', wordBreak: 'break-all' }}>
                  {profile.partnerContractSha256
                    ? `SHA-256: ${profile.partnerContractSha256}`
                    : 'Chưa tải lên bản scan hợp đồng đã ký.'}
                </Typography>
              </Box>

              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexShrink: 0 }}>
                {profile.hasPartnerContract && (
                  <Chip size="small" color="success" icon={<CheckCircleRounded />} label="Đã lưu" />
                )}
                <Button
                  component="label"
                  size="small"
                  variant="contained"
                  startIcon={<CloudUploadOutlined />}
                  disabled={uploadContractMutation.isPending}
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                  {uploadContractMutation.isPending ? 'Đang tải…' : 'Upload Hợp đồng đã ký'}
                  <input
                    hidden
                    type="file"
                    accept="application/pdf,image/png,image/jpeg,image/webp"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadContractMutation.mutate(f);
                    }}
                  />
                </Button>
              </Stack>
            </Stack>

            <Stack direction="row" sx={{ justifyContent: 'space-between', pt: 1 }}>
              <Button
                variant="outlined"
                startIcon={<ArrowBackRounded />}
                onClick={() => setActiveStep(0)}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Quay lại
              </Button>
              <Button
                variant="contained"
                endIcon={<ArrowForwardRounded />}
                onClick={() => setActiveStep(2)}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Tiếp tục Bước 3
              </Button>
            </Stack>
          </Stack>
        )}

        {/* ===================== BƯỚC 3: KẾT QUẢ PHÊ DUYỆT ===================== */}
        {activeStep === 2 && (
          <Stack spacing={2.5}>
            <Alert
              severity={
                profile.onboardingStatus === 'APPROVED'
                  ? 'success'
                  : profile.onboardingStatus === 'REJECTED'
                    ? 'error'
                    : 'info'
              }
              sx={{ borderRadius: '10px' }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {profile.onboardingStatus === 'APPROVED'
                  ? 'Tài khoản Đối tác đã được phê duyệt kích hoạt!'
                  : profile.onboardingStatus === 'REJECTED'
                    ? `Yêu cầu bổ sung: ${profile.rejectionReason || 'Vui lòng kiểm tra lại hồ sơ'}`
                    : 'Đang chờ Platform Manager kiểm tra và phê duyệt kích hoạt.'}
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                • Bản scan Bằng lái UAV: <strong>{profile.hasLicenseScan ? 'Đã nộp' : 'Chưa nộp'}</strong>
                {'  |  '}
                • Hợp đồng đã ký (SHA-256): <strong>{profile.hasPartnerContract ? 'Đã nộp' : 'Chưa nộp'}</strong>
              </Typography>
            </Alert>

            {/* DRONE FLEET READINESS CARD */}
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              sx={{
                justifyContent: 'space-between',
                alignItems: { sm: 'center' },
                p: 2,
                borderRadius: '10px',
                border: '1px solid',
                borderColor: myDrones.length > 0 ? '#bbf7d0' : '#fed7aa',
                bgcolor: myDrones.length > 0 ? '#f0fdf4' : '#fffbeb',
              }}
            >
              <Box>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <FlightRounded color={myDrones.length > 0 ? 'success' : 'warning'} fontSize="small" />
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    Phương tiện bay trong đội bay: {myDrones.length > 0 ? `${myDrones.length} Drone sẵn sàng` : 'Chưa có Drone nào'}
                  </Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  {myDrones.length > 0
                    ? 'Đội bay đã có thiết bị hợp lệ được cấp phép hoạt động.'
                    : 'Để thực hiện chuyến bay thực địa, bạn cần đăng ký Drone (kèm 3 giấy tờ thẩm định: Đăng ký, Sở hữu, Kiểm định).'}
                </Typography>
              </Box>

              <Button
                size="small"
                variant={myDrones.length > 0 ? 'outlined' : 'contained'}
                endIcon={<ArrowForwardRounded sx={{ fontSize: 15 }} />}
                onClick={() => navigate('/operations/inspector-drones')}
                sx={{
                  textTransform: 'none',
                  fontWeight: 650,
                  whiteSpace: 'nowrap',
                  bgcolor: myDrones.length > 0 ? 'background.paper' : '#f97316',
                  '&:hover': { bgcolor: myDrones.length > 0 ? 'action.hover' : '#ea580c' },
                }}
              >
                {myDrones.length > 0 ? 'Quản lý đội bay' : 'Đăng ký Drone ngay'}
              </Button>
            </Stack>

            <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
              <Button
                variant="outlined"
                startIcon={<ArrowBackRounded />}
                onClick={() => setActiveStep(1)}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Quay lại Bước 2
              </Button>
            </Box>
          </Stack>
        )}
      </Paper>
    </Box>
  );
}
