import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardMedia,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import CloseRounded from '@mui/icons-material/CloseRounded';
import CloudUploadOutlined from '@mui/icons-material/CloudUploadOutlined';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded';
import ErrorOutlineRounded from '@mui/icons-material/ErrorOutlineRounded';
import FlightTakeoffRounded from '@mui/icons-material/FlightTakeoffRounded';
import BadgeOutlined from '@mui/icons-material/BadgeOutlined';
import HistoryEduRounded from '@mui/icons-material/HistoryEduRounded';
import ZoomInRounded from '@mui/icons-material/ZoomInRounded';
import AddCircleOutlineRounded from '@mui/icons-material/AddCircleOutlineRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import {
  inspectorProfileApi,
  type UpdateInspectorProfileInput,
  type CreateInspectorFlightLogInput,
} from '../api/inspectorProfileApi';

interface InspectorProfileDialogProps {
  open: boolean;
  onClose: () => void;
  inspectorId: string | null;
}

export function InspectorProfileDialog({ open, onClose, inspectorId }: InspectorProfileDialogProps) {
  const queryClient = useQueryClient();
  const [currentTab, setCurrentTab] = useState(0);

  // Profile Query
  const profileQuery = useQuery({
    queryKey: ['inspector-profile', inspectorId],
    queryFn: () => (inspectorId ? inspectorProfileApi.get(inspectorId) : null),
    enabled: Boolean(inspectorId && open),
  });

  // Flight Logs Query
  const flightLogsQuery = useQuery({
    queryKey: ['inspector-flight-logs', inspectorId],
    queryFn: () => (inspectorId ? inspectorProfileApi.listFlightLogs(inspectorId) : []),
    enabled: Boolean(inspectorId && open),
  });

  // Form State
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

  // Flight Log Form State
  const [logOpen, setLogOpen] = useState(false);
  const [logForm, setLogForm] = useState<CreateInspectorFlightLogInput>({
    flightCode: '',
    flightDate: new Date().toISOString().slice(0, 10),
    missionTitle: '',
    droneModel: '',
    droneSerialNumber: '',
    location: '',
    flightDurationMinutes: 60,
    inspectionType: 'Đường dây điện cao thế',
    safetyIncident: false,
    notes: '',
  });

  // Scanned license preview
  const [licenseScanBlobUrl, setLicenseScanBlobUrl] = useState<string | null>(null);
  const [licenseScanLoading, setLicenseScanLoading] = useState(false);
  const [zoomScanOpen, setZoomScanOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sync profile data to form
  useEffect(() => {
    if (profileQuery.data) {
      const p = profileQuery.data;
      setForm({
        fullName: p.fullName || '',
        phoneNumber: p.phoneNumber || '',
        citizenId: p.citizenId || '',
        dateOfBirth: p.dateOfBirth || '',
        address: p.address || '',
        notes: p.notes || '',
        pilotLicenseNumber: p.pilotLicenseNumber || '',
        pilotLicenseClass: p.pilotLicenseClass || '',
        pilotLicenseIssuedDate: p.pilotLicenseIssuedDate || '',
        pilotLicenseExpiresAt: p.pilotLicenseExpiresAt
          ? p.pilotLicenseExpiresAt.slice(0, 10)
          : '',
        pilotLicenseAuthority: p.pilotLicenseAuthority || '',
        priorFlightHours: p.priorFlightHours || 0,
        certifiedDroneModels: p.certifiedDroneModels || '',
        specializations: p.specializations || '',
        experienceSummary: p.experienceSummary || '',
      });

      // Fetch license scan if available
      if (p.hasLicenseScan && inspectorId) {
        setLicenseScanLoading(true);
        inspectorProfileApi
          .getLicenseScanBlobUrl(inspectorId)
          .then(({ blobUrl }) => setLicenseScanBlobUrl(blobUrl))
          .catch(() => setLicenseScanBlobUrl(null))
          .finally(() => setLicenseScanLoading(false));
      } else {
        setLicenseScanBlobUrl(null);
      }
    }
  }, [profileQuery.data, inspectorId]);

  // Clean up blob URL on unmount or change
  useEffect(() => {
    return () => {
      if (licenseScanBlobUrl) {
        URL.revokeObjectURL(licenseScanBlobUrl);
      }
    };
  }, [licenseScanBlobUrl]);

  // Update Profile Mutation
  const updateMutation = useMutation({
    mutationFn: (input: UpdateInspectorProfileInput) => {
      if (!inspectorId) throw new Error('Missing inspector ID');
      const formattedInput = {
        ...input,
        pilotLicenseExpiresAt: input.pilotLicenseExpiresAt
          ? new Date(input.pilotLicenseExpiresAt).toISOString()
          : null,
      };
      return inspectorProfileApi.update(inspectorId, formattedInput);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['inspector-profile', inspectorId], updated);
      queryClient.invalidateQueries({ queryKey: ['platform-users'] });
      setSuccessMessage('Đã cập nhật hồ sơ phi công Inspector thành công!');
      setTimeout(() => setSuccessMessage(null), 4000);
    },
  });

  // Upload Scan Mutation
  const uploadScanMutation = useMutation({
    mutationFn: (file: File) => {
      if (!inspectorId) throw new Error('Missing inspector ID');
      return inspectorProfileApi.uploadLicenseScan(inspectorId, file);
    },
    onSuccess: async (updated) => {
      queryClient.setQueryData(['inspector-profile', inspectorId], updated);
      setSuccessMessage('Đã tải lên và lưu trữ bản scan giấy phép bay trên MinIO thành công!');
      setTimeout(() => setSuccessMessage(null), 4000);
      if (inspectorId) {
        setLicenseScanLoading(true);
        try {
          const { blobUrl } = await inspectorProfileApi.getLicenseScanBlobUrl(inspectorId);
          setLicenseScanBlobUrl(blobUrl);
        } catch {
          // ignore
        } finally {
          setLicenseScanLoading(false);
        }
      }
    },
  });

  // Record Flight Log Mutation
  const recordLogMutation = useMutation({
    mutationFn: (input: CreateInspectorFlightLogInput) => {
      if (!inspectorId) throw new Error('Missing inspector ID');
      return inspectorProfileApi.recordFlightLog(inspectorId, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspector-flight-logs', inspectorId] });
      queryClient.invalidateQueries({ queryKey: ['inspector-profile', inspectorId] });
      setLogOpen(false);
      setLogForm({
        flightCode: '',
        flightDate: new Date().toISOString().slice(0, 10),
        missionTitle: '',
        droneModel: '',
        droneSerialNumber: '',
        location: '',
        flightDurationMinutes: 60,
        inspectionType: 'Đường dây điện cao thế',
        safetyIncident: false,
        notes: '',
      });
      setSuccessMessage('Đã ghi nhận nhiệm vụ bay vào lịch sử thành công!');
      setTimeout(() => setSuccessMessage(null), 4000);
    },
  });

  // Delete Flight Log Mutation
  const deleteLogMutation = useMutation({
    mutationFn: (logId: string) => {
      if (!inspectorId) throw new Error('Missing inspector ID');
      return inspectorProfileApi.deleteFlightLog(inspectorId, logId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspector-flight-logs', inspectorId] });
      queryClient.invalidateQueries({ queryKey: ['inspector-profile', inspectorId] });
    },
  });

  const handleScanFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadScanMutation.mutate(file);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(form);
  };

  const profile = profileQuery.data;

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              src={profile?.avatarUrl ?? undefined}
              alt={profile?.fullName ?? 'Inspector'}
              sx={{ width: 44, height: 44, bgcolor: '#3758F9', fontWeight: 700 }}
            >
              {profile?.fullName?.slice(0, 1) || 'I'}
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#0f172a' }}>
                Hồ sơ Đối tác Inspector & Kinh nghiệm bay
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b' }}>
                {profile?.fullName} · {profile?.email}
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ color: '#64748b' }}>
            <CloseRounded />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 0 }}>
          {profileQuery.isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
              <CircularProgress size={36} />
            </Box>
          ) : !profile ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">Không tìm thấy thông tin Inspector.</Typography>
            </Box>
          ) : (
            <Box>
              {/* TOP STATS BAR */}
              <Box sx={{ px: 3, py: 2, bgcolor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
                  <Box sx={{ p: 1.5, bgcolor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                      Tổng giờ bay tích lũy
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#1e293b' }}>
                      {profile.totalFlightHours} <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>giờ</span>
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      (Trước đây: {profile.priorFlightHours}h + Tại cty: {profile.companyFlightHours}h)
                    </Typography>
                  </Box>

                  <Box sx={{ p: 1.5, bgcolor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                      Nhiệm vụ bay tại công ty
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#0284c7' }}>
                      {profile.companyFlightsCount} <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>chuyến bay</span>
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      Thời lượng: {profile.companyFlightHours} giờ hoạt động
                    </Typography>
                  </Box>

                  <Box sx={{ p: 1.5, bgcolor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                      Giấy phép bay UAV
                    </Typography>
                    <Box sx={{ mt: 0.5 }}>
                      {profile.licenseExpirationStatus === 'VALID' ? (
                        <Chip
                          size="small"
                          icon={<CheckCircleRounded />}
                          label={`CÒN HẠN (${profile.licenseRemainingDays} ngày)`}
                          color="success"
                          sx={{ fontWeight: 700 }}
                        />
                      ) : profile.licenseExpirationStatus === 'EXPIRING_SOON' ? (
                        <Chip
                          size="small"
                          icon={<WarningAmberRounded />}
                          label={`SẮP HẾT HẠN (Còn ${profile.licenseRemainingDays} ngày)`}
                          color="warning"
                          sx={{ fontWeight: 700 }}
                        />
                      ) : profile.licenseExpirationStatus === 'EXPIRED' ? (
                        <Chip
                          size="small"
                          icon={<ErrorOutlineRounded />}
                          label="ĐÃ HẾT HẠN"
                          color="error"
                          sx={{ fontWeight: 700 }}
                        />
                      ) : (
                        <Chip size="small" label="Chưa cập nhật bằng" color="default" />
                      )}
                    </Box>
                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: '#64748b' }}>
                      Số: {profile.pilotLicenseNumber || '—'}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {successMessage && (
                <Box sx={{ px: 3, pt: 2 }}>
                  <Alert severity="success">{successMessage}</Alert>
                </Box>
              )}

              {/* TABS NAVIGATION */}
              <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
                <Tabs value={currentTab} onChange={(_, val) => setCurrentTab(val)}>
                  <Tab icon={<BadgeOutlined />} iconPosition="start" label="1. Thông tin cá nhân & Nhân sự" sx={{ textTransform: 'none', fontWeight: 600 }} />
                  <Tab icon={<FlightTakeoffRounded />} iconPosition="start" label="2. Giấy phép & Bản Scan" sx={{ textTransform: 'none', fontWeight: 600 }} />
                  <Tab icon={<HistoryEduRounded />} iconPosition="start" label="3. Kinh nghiệm bay" sx={{ textTransform: 'none', fontWeight: 600 }} />
                  <Tab icon={<FlightTakeoffRounded />} iconPosition="start" label={`4. Lịch sử bay tại công ty (${profile.companyFlightsCount})`} sx={{ textTransform: 'none', fontWeight: 600 }} />
                </Tabs>
              </Box>

              {/* TAB 0: THÔNG TIN CÁ NHÂN */}
              {currentTab === 0 && (
                <Box component="form" onSubmit={handleSaveProfile} sx={{ p: 3 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: '#1e293b' }}>
                    Thông tin định danh và liên hệ nhân sự
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                    <TextField
                      fullWidth
                      required
                      label="Họ và tên"
                      value={form.fullName}
                      onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    />
                    <TextField
                      fullWidth
                      disabled
                      label="Email đăng nhập"
                      value={profile.email}
                      helperText="Email do hệ thống quản lý, không thể thay đổi trực tiếp"
                    />
                    <TextField
                      fullWidth
                      label="Số điện thoại liên hệ"
                      placeholder="VD: 0912 345 678"
                      value={form.phoneNumber || ''}
                      onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                    />
                    <TextField
                      fullWidth
                      label="Số CCCD / Hộ chiếu"
                      placeholder="VD: 001092008899"
                      value={form.citizenId || ''}
                      onChange={(e) => setForm({ ...form, citizenId: e.target.value })}
                    />
                    <TextField
                      fullWidth
                      type="date"
                      label="Ngày tháng năm sinh"
                      slotProps={{ inputLabel: { shrink: true } }}
                      value={form.dateOfBirth || ''}
                      onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                    />
                    <TextField
                      fullWidth
                      label="Địa chỉ thường trú / Công tác"
                      placeholder="VD: Ba Đình, Hà Nội"
                      value={form.address || ''}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                    />
                    <Box sx={{ gridColumn: { xs: 'span 1', sm: 'span 2' } }}>
                      <TextField
                        fullWidth
                        multiline
                        rows={2}
                        label="Ghi chú nội bộ về nhân sự"
                        placeholder="Nhận xét của Manager về tác phong, kỹ luật, sức khỏe bay..."
                        value={form.notes || ''}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      />
                    </Box>
                  </Box>

                  <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={updateMutation.isPending}
                      sx={{ bgcolor: '#3758F9', textTransform: 'none', fontWeight: 600, px: 3 }}
                    >
                      {updateMutation.isPending ? 'Đang lưu…' : 'Lưu thông tin cá nhân'}
                    </Button>
                  </Box>
                </Box>
              )}

              {/* TAB 1: GIẤY PHÉP BAY & BẢN SCAN */}
              {currentTab === 1 && (
                <Box component="form" onSubmit={handleSaveProfile} sx={{ p: 3 }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '7fr 5fr' }, gap: 3 }}>
                    {/* Cột trái: Thông tin bằng lái */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, color: '#1e293b' }}>
                        Thông tin Giấy phép điều khiển tàu bay không người lái (UAV)
                      </Typography>
                      <TextField
                        fullWidth
                        label="Số hiệu bằng lái / Chứng chỉ phi công"
                        placeholder="VD: VN-UAV-2025-00892"
                        value={form.pilotLicenseNumber || ''}
                        onChange={(e) => setForm({ ...form, pilotLicenseNumber: e.target.value })}
                        helperText="Số cấp phép chính thức từ cơ quan quản lý hàng không"
                      />
                      <TextField
                        select
                        fullWidth
                        label="Hạng bằng lái / Loại chứng chỉ (Điều 27 NĐ 288/2025/NĐ-CP)"
                        value={form.pilotLicenseClass || ''}
                        onChange={(e) => setForm({ ...form, pilotLicenseClass: e.target.value })}
                        helperText="Hạng A: bay trực quan VLOS (< 2 kg) · Hạng B: bay thiết bị/BVLOS & mọi Drone ≥ 2 kg"
                      >
                        <MenuItem value="">
                          <em>Chưa chọn hạng bằng</em>
                        </MenuItem>
                        <MenuItem value="CLASS_A">
                          Hạng A — Điều khiển trực quan VLOS (Loại 2: 0.25 – &lt; 2 kg)
                        </MenuItem>
                        <MenuItem value="CLASS_B">
                          Hạng B — Điều khiển bằng thiết bị / BVLOS (Loại 3–5: ≥ 2 kg)
                        </MenuItem>
                        {form.pilotLicenseClass &&
                          form.pilotLicenseClass !== 'CLASS_A' &&
                          form.pilotLicenseClass !== 'CLASS_B' && (
                            <MenuItem value={form.pilotLicenseClass}>
                              {form.pilotLicenseClass}
                            </MenuItem>
                          )}
                      </TextField>
                      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                        <TextField
                          fullWidth
                          type="date"
                          label="Ngày cấp bằng"
                          slotProps={{ inputLabel: { shrink: true } }}
                          value={form.pilotLicenseIssuedDate || ''}
                          onChange={(e) => setForm({ ...form, pilotLicenseIssuedDate: e.target.value })}
                        />
                        <TextField
                          fullWidth
                          type="date"
                          label="Ngày hết hạn bằng lái"
                          slotProps={{ inputLabel: { shrink: true } }}
                          value={form.pilotLicenseExpiresAt || ''}
                          onChange={(e) => setForm({ ...form, pilotLicenseExpiresAt: e.target.value })}
                        />
                      </Box>
                      <TextField
                        fullWidth
                        label="Cơ quan / Đơn vị cấp phép"
                        placeholder="VD: Cục Tác chiến - Bộ Tổng Tham mưu / Cục Hàng không Việt Nam"
                        value={form.pilotLicenseAuthority || ''}
                        onChange={(e) => setForm({ ...form, pilotLicenseAuthority: e.target.value })}
                      />

                      <Box sx={{ pt: 1 }}>
                        <Button
                          type="submit"
                          variant="contained"
                          disabled={updateMutation.isPending}
                          sx={{ bgcolor: '#3758F9', textTransform: 'none', fontWeight: 600, px: 3 }}
                        >
                          {updateMutation.isPending ? 'Đang lưu…' : 'Lưu thông tin giấy phép'}
                        </Button>
                      </Box>
                    </Box>

                    {/* Cột phải: Bản scan giấy phép bay MinIO */}
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: '#1e293b' }}>
                        Bản scan giấy phép bay (Lưu trữ MinIO)
                      </Typography>
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 2,
                          textAlign: 'center',
                          borderRadius: '12px',
                          border: profile.hasLicenseScan ? '1.5px solid #10b981' : '1px dashed #94a3b8',
                          bgcolor: profile.hasLicenseScan ? '#f0fdf4' : '#f8fafc',
                        }}
                      >
                        {licenseScanLoading ? (
                          <Box sx={{ py: 6 }}>
                            <CircularProgress size={28} />
                            <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#64748b' }}>
                              Đang tải bản scan từ MinIO…
                            </Typography>
                          </Box>
                        ) : licenseScanBlobUrl ? (
                          <Box>
                            <Card variant="outlined" sx={{ position: 'relative', mb: 1.5 }}>
                              <CardMedia
                                component="img"
                                height="180"
                                image={licenseScanBlobUrl}
                                alt="Bản scan bằng lái"
                                sx={{ objectFit: 'contain', bgcolor: '#0000000a' }}
                              />
                              <IconButton
                                size="small"
                                onClick={() => setZoomScanOpen(true)}
                                sx={{
                                  position: 'absolute',
                                  top: 6,
                                  right: 6,
                                  bgcolor: 'rgba(255, 255, 255, 0.9)',
                                  '&:hover': { bgcolor: '#ffffff' },
                                }}
                              >
                                <ZoomInRounded fontSize="small" />
                              </IconButton>
                            </Card>
                            <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, justifyContent: 'center' }}>
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<ZoomInRounded />}
                                onClick={() => setZoomScanOpen(true)}
                                sx={{ textTransform: 'none' }}
                              >
                                Xem phóng to
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                component="a"
                                href={licenseScanBlobUrl}
                                download={`Scan-Bang-Lai-${profile.fullName.replace(/\s+/g, '_')}.png`}
                                sx={{ textTransform: 'none' }}
                              >
                                Tải về
                              </Button>
                            </Box>
                          </Box>
                        ) : (
                          <Box sx={{ py: 4 }}>
                            <BadgeOutlined sx={{ fontSize: 44, color: '#94a3b8', mb: 1 }} />
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#475569' }}>
                              Chưa có bản scan giấy phép
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 2 }}>
                              Hỗ trợ định dạng PDF, JPG, PNG hoặc WebP
                            </Typography>
                          </Box>
                        )}

                        <Divider sx={{ my: 1.5 }} />

                        <Button
                          component="label"
                          variant="outlined"
                          size="small"
                          startIcon={<CloudUploadOutlined />}
                          disabled={uploadScanMutation.isPending}
                          sx={{ textTransform: 'none', fontWeight: 600 }}
                        >
                          {uploadScanMutation.isPending
                            ? 'Đang tải lên MinIO…'
                            : profile.hasLicenseScan
                              ? 'Tải lên bản scan mới thay thế'
                              : 'Chọn tệp scan để tải lên'}
                          <input
                            hidden
                            type="file"
                            accept="image/png,image/jpeg,image/webp,application/pdf"
                            onChange={handleScanFileSelected}
                          />
                        </Button>
                      </Paper>
                    </Box>
                  </Box>
                </Box>
              )}

              {/* TAB 2: KINH NGHIỆM BAY */}
              {currentTab === 2 && (
                <Box component="form" onSubmit={handleSaveProfile} sx={{ p: 3 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: '#1e293b' }}>
                    Kinh nghiệm bay, loại thiết bị và lĩnh vực kiểm định chuyên môn
                  </Typography>

                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                    <TextField
                      fullWidth
                      type="number"
                      slotProps={{ htmlInput: { step: '0.5', min: '0' } }}
                      label="Số giờ bay tích lũy trước khi vào công ty (giờ)"
                      placeholder="VD: 150.5"
                      value={form.priorFlightHours ?? 0}
                      onChange={(e) => setForm({ ...form, priorFlightHours: parseFloat(e.target.value) || 0 })}
                      helperText="Tổng giờ bay tích lũy trên các dự án trước đây"
                    />
                    <TextField
                      fullWidth
                      disabled
                      label="Số giờ bay tại công ty (giờ)"
                      value={`${profile.companyFlightHours} giờ (từ ${profile.companyFlightsCount} nhiệm vụ)`}
                      helperText="Tự động tính từ các chuyến bay nội bộ đã ghi nhận"
                    />
                    <Box sx={{ gridColumn: { xs: 'span 1', sm: 'span 2' } }}>
                      <TextField
                        fullWidth
                        label="Các dòng Drone đã thành thạo / Có chứng chỉ bay"
                        placeholder="VD: DJI Matrice 350 RTK, Mavic 3 Enterprise / Thermal, Autel EVO Max 4T, Flyability Elios 3"
                        value={form.certifiedDroneModels || ''}
                        onChange={(e) => setForm({ ...form, certifiedDroneModels: e.target.value })}
                        helperText="Phân tách bằng dấu phẩy"
                      />
                      {form.certifiedDroneModels && (
                        <Box sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 0.75, mt: 1 }}>
                          {form.certifiedDroneModels.split(',').map((model, idx) => (
                            <Chip key={idx} size="small" label={model.trim()} sx={{ fontWeight: 600, bgcolor: '#e0e7ff', color: '#3730a3' }} />
                          ))}
                        </Box>
                      )}
                    </Box>
                    <Box sx={{ gridColumn: { xs: 'span 1', sm: 'span 2' } }}>
                      <TextField
                        fullWidth
                        label="Lĩnh vực / Chuyên môn kiểm định hạ tầng"
                        placeholder="VD: Đường dây tải điện cao thế, Cánh quạt tuabin gió, Trang trại điện mặt trời, Cầu đường & hầm chui"
                        value={form.specializations || ''}
                        onChange={(e) => setForm({ ...form, specializations: e.target.value })}
                        helperText="Phân tách bằng dấu phẩy"
                      />
                      {form.specializations && (
                        <Box sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 0.75, mt: 1 }}>
                          {form.specializations.split(',').map((spec, idx) => (
                            <Chip key={idx} size="small" label={spec.trim()} sx={{ fontWeight: 600, bgcolor: '#f0fdf4', color: '#166534' }} />
                          ))}
                        </Box>
                      )}
                    </Box>
                    <Box sx={{ gridColumn: { xs: 'span 1', sm: 'span 2' } }}>
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="Tóm tắt kinh nghiệm bay & Đánh giá năng lực"
                        placeholder="Mô tả quá trình đào tạo, các dự án tiêu biểu đã tham gia, kỹ năng xử lý gió mạnh, bay gần nguồn từ trường cao thế..."
                        value={form.experienceSummary || ''}
                        onChange={(e) => setForm({ ...form, experienceSummary: e.target.value })}
                      />
                    </Box>
                  </Box>

                  <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={updateMutation.isPending}
                      sx={{ bgcolor: '#3758F9', textTransform: 'none', fontWeight: 600, px: 3 }}
                    >
                      {updateMutation.isPending ? 'Đang lưu…' : 'Lưu thông tin kinh nghiệm'}
                    </Button>
                  </Box>
                </Box>
              )}

              {/* TAB 3: LỊCH SỬ BAY TẠI CÔNG TY */}
              {currentTab === 3 && (
                <Box sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                        Nhật ký các nhiệm vụ bay nội bộ tại công ty
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Ghi nhận thời gian bay, dòng drone sử dụng và kết quả thực hiện nhiệm vụ.
                      </Typography>
                    </Box>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<AddCircleOutlineRounded />}
                      onClick={() => setLogOpen(true)}
                      sx={{ bgcolor: '#3758F9', textTransform: 'none', fontWeight: 600 }}
                    >
                      + Ghi nhận chuyến bay mới
                    </Button>
                  </Box>

                  {flightLogsQuery.isLoading ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <CircularProgress size={24} />
                    </Box>
                  ) : (flightLogsQuery.data ?? []).length === 0 ? (
                    <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: '12px', bgcolor: '#f8fafc' }}>
                      <FlightTakeoffRounded sx={{ fontSize: 40, color: '#94a3b8', mb: 1 }} />
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#475569' }}>
                        Chưa có chuyến bay nào được ghi nhận cho phi công này
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Bấm nút "+ Ghi nhận chuyến bay mới" để thêm thông tin chuyến bay đầu tiên.
                      </Typography>
                    </Paper>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      {(flightLogsQuery.data ?? []).map((log) => (
                        <Paper
                          key={log.id}
                          variant="outlined"
                          sx={{
                            p: 2,
                            borderRadius: '10px',
                            border: '1px solid #e2e8f0',
                            display: 'flex',
                            flexDirection: { xs: 'column', sm: 'row' },
                            justifyContent: 'space-between',
                            alignItems: { xs: 'flex-start', sm: 'center' },
                            gap: 1.5,
                          }}
                        >
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <Typography sx={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>
                                {log.missionTitle}
                              </Typography>
                              <Chip size="small" label={log.flightCode} sx={{ height: 20, fontSize: 11, fontWeight: 700, bgcolor: '#e2e8f0' }} />
                              <Chip
                                size="small"
                                label={log.inspectionType}
                                color="primary"
                                variant="outlined"
                                sx={{ height: 20, fontSize: 11, fontWeight: 600 }}
                              />
                            </Box>

                            <Typography variant="body2" sx={{ color: '#475569' }}>
                              Thiết bị: <strong>{log.droneModel}</strong> {log.droneSerialNumber && `(S/N: ${log.droneSerialNumber})`} · Địa điểm: <strong>{log.location}</strong>
                            </Typography>

                            <Typography variant="caption" sx={{ color: '#64748b' }}>
                              Ngày bay: {new Date(log.flightDate).toLocaleDateString('vi-VN')} · Thời lượng: <strong>{log.flightDurationMinutes} phút</strong> ({log.flightDurationHours} giờ)
                              {log.notes && ` · Ghi chú: ${log.notes}`}
                            </Typography>
                          </Box>

                          <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1 }}>
                            {log.safetyIncident ? (
                              <Chip size="small" label="Có sự cố" color="error" sx={{ fontWeight: 700 }} />
                            ) : (
                              <Chip size="small" label="An toàn" color="success" sx={{ fontWeight: 700 }} />
                            )}
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => deleteLogMutation.mutate(log.id)}
                              disabled={deleteLogMutation.isPending}
                            >
                              <DeleteOutlineRounded fontSize="small" />
                            </IconButton>
                          </Box>
                        </Paper>
                      ))}
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
          <Button onClick={onClose} variant="outlined" sx={{ textTransform: 'none', fontWeight: 600 }}>
            Đóng
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG GHI NHẬN CHUYẾN BAY MỚI */}
      <Dialog open={logOpen} onClose={() => setLogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700 }}>Ghi nhận Chuyến bay / Nhiệm vụ bay mới</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              fullWidth
              required
              label="Mã chuyến bay / Ký hiệu"
              placeholder="VD: FL-2026-105"
              value={logForm.flightCode}
              onChange={(e) => setLogForm({ ...logForm, flightCode: e.target.value })}
            />
            <TextField
              fullWidth
              required
              type="date"
              label="Ngày thực hiện bay"
              slotProps={{ inputLabel: { shrink: true } }}
              value={logForm.flightDate}
              onChange={(e) => setLogForm({ ...logForm, flightDate: e.target.value })}
            />
            <TextField
              fullWidth
              required
              label="Tên nhiệm vụ / Công trình kiểm định"
              placeholder="VD: Khảo sát đường dây 500kV đoạn Nho Quan - Thường Tín"
              value={logForm.missionTitle}
              onChange={(e) => setLogForm({ ...logForm, missionTitle: e.target.value })}
            />
            <TextField
              fullWidth
              required
              label="Dòng Drone sử dụng"
              placeholder="VD: DJI Matrice 350 RTK"
              value={logForm.droneModel}
              onChange={(e) => setLogForm({ ...logForm, droneModel: e.target.value })}
            />
            <TextField
              fullWidth
              label="Số Serial Drone (tùy chọn)"
              placeholder="VD: 1581F5GJD2203001"
              value={logForm.droneSerialNumber || ''}
              onChange={(e) => setLogForm({ ...logForm, droneSerialNumber: e.target.value })}
            />
            <TextField
              fullWidth
              required
              label="Địa điểm / Khu vực bay"
              placeholder="VD: Cột 125-132, Huyện Phú Xuyên, Hà Nội"
              value={logForm.location}
              onChange={(e) => setLogForm({ ...logForm, location: e.target.value })}
            />
            <TextField
              fullWidth
              required
              type="number"
              slotProps={{ htmlInput: { min: '1' } }}
              label="Thời lượng bay (phút)"
              placeholder="VD: 75"
              value={logForm.flightDurationMinutes}
              onChange={(e) => setLogForm({ ...logForm, flightDurationMinutes: parseInt(e.target.value, 10) || 0 })}
            />
            <TextField
              fullWidth
              required
              label="Loại hình kiểm định"
              placeholder="VD: Đường dây điện cao thế / Pin mặt trời / Tuabin gió"
              value={logForm.inspectionType}
              onChange={(e) => setLogForm({ ...logForm, inspectionType: e.target.value })}
            />
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Ghi chú chuyến bay"
              placeholder="Tình trạng thời tiết, gió, chất lượng dữ liệu thu thập..."
              value={logForm.notes || ''}
              onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setLogOpen(false)} sx={{ textTransform: 'none' }}>
            Hủy
          </Button>
          <Button
            variant="contained"
            disabled={
              recordLogMutation.isPending ||
              !logForm.flightCode.trim() ||
              !logForm.missionTitle.trim() ||
              !logForm.droneModel.trim() ||
              !logForm.location.trim() ||
              logForm.flightDurationMinutes <= 0
            }
            onClick={() => recordLogMutation.mutate(logForm)}
            sx={{ bgcolor: '#3758F9', textTransform: 'none', fontWeight: 600 }}
          >
            {recordLogMutation.isPending ? 'Đang lưu…' : 'Lưu chuyến bay'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG PHÓNG TO BẢN SCAN GIẤY PHÉP */}
      <Dialog open={zoomScanOpen} onClose={() => setZoomScanOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography sx={{ fontWeight: 700 }}>Bản scan Giấy phép bay - {profile?.fullName}</Typography>
          <IconButton onClick={() => setZoomScanOpen(false)} size="small">
            <CloseRounded />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 1, bgcolor: '#0f172a', textAlign: 'center' }}>
          {licenseScanBlobUrl && (
            <img
              src={licenseScanBlobUrl}
              alt="Scan giấy phép bay"
              style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
