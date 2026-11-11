import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pilotLicenseClassApi } from '@/features/auth/api/pilotLicenseClassApi';
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
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import VerifiedUserOutlined from '@mui/icons-material/VerifiedUserOutlined';
import DownloadRounded from '@mui/icons-material/DownloadRounded';
import {
  inspectorProfileApi,
  type UpdateInspectorProfileInput,
  type CreateInspectorFlightLogInput,
} from '../api/inspectorProfileApi';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { useAuthStore } from '@/features/auth/store/authStore';

interface InspectorProfileDialogProps {
  open: boolean;
  onClose: () => void;
  inspectorId: string | null;
}

export function InspectorProfileDialog({ open, onClose, inspectorId }: InspectorProfileDialogProps) {
  const { locale } = useLocale();
  const tr = (vi: string, en: string) => (locale === 'vi' ? vi : en);
  const dateLocale = locale === 'vi' ? 'vi-VN' : 'en-US';

  const queryClient = useQueryClient();
  const roles = useAuthStore((state) => state.roles);
  const canApprovePartner = roles.includes('ADMIN') || roles.includes('MANAGER');
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
  const licenseClassesQuery = useQuery({
    queryKey: ['pilot-license-classes', 'active'],
    queryFn: pilotLicenseClassApi.listActive,
    staleTime: 60_000,
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
  // Signed Partner Contract preview
  const [contractBlobUrl, setContractBlobUrl] = useState<string | null>(null);
  const [contractContentType, setContractContentType] = useState<string>('');
  const [contractLoading, setContractLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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

      // Fetch partner contract scan if available
      if (p.hasPartnerContract && inspectorId) {
        setContractLoading(true);
        inspectorProfileApi
          .getPartnerContractBlobUrl(inspectorId)
          .then(({ blobUrl, contentType }) => {
            setContractBlobUrl(blobUrl);
            setContractContentType(contentType);
          })
          .catch(() => {
            setContractBlobUrl(null);
            setContractContentType('');
          })
          .finally(() => setContractLoading(false));
      } else {
        setContractBlobUrl(null);
        setContractContentType('');
      }
      setRejectReason(p.rejectionReason || '');
    }
  }, [profileQuery.data, inspectorId]);

  // Clean up blob URL on unmount or change
  useEffect(() => {
    return () => {
      if (licenseScanBlobUrl) {
        URL.revokeObjectURL(licenseScanBlobUrl);
      }
      if (contractBlobUrl) {
        URL.revokeObjectURL(contractBlobUrl);
      }
    };
  }, [licenseScanBlobUrl, contractBlobUrl]);

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
      setSuccessMessage(
        tr(
          'Đã cập nhật hồ sơ phi công Inspector thành công!',
          'Inspector pilot profile updated successfully.',
        ),
      );
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
      setSuccessMessage(
        tr(
          'Đã tải lên và lưu trữ bản scan giấy phép bay trên MinIO thành công!',
          'Pilot license scan uploaded and stored successfully.',
        ),
      );
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
      setSuccessMessage(
        tr(
          'Đã ghi nhận nhiệm vụ bay vào lịch sử thành công!',
          'Flight mission recorded in log history.',
        ),
      );
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

  // Upload Signed Partner Contract Mutation
  const uploadContractMutation = useMutation({
    mutationFn: (file: File) => {
      if (!inspectorId) throw new Error('Missing inspector ID');
      return inspectorProfileApi.uploadPartnerContract(inspectorId, file);
    },
    onSuccess: async (updated) => {
      setErrorMessage(null);
      queryClient.setQueryData(['inspector-profile', inspectorId], updated);
      queryClient.invalidateQueries({ queryKey: ['mf1-inspectors-list'] });
      setSuccessMessage('Đã tải lên Hợp đồng Đối tác đã ký và khóa mã băm SHA-256 trên MinIO!');
      setTimeout(() => setSuccessMessage(null), 5000);
      if (inspectorId) {
        setContractLoading(true);
        try {
          const { blobUrl, contentType } = await inspectorProfileApi.getPartnerContractBlobUrl(inspectorId);
          setContractBlobUrl(blobUrl);
          setContractContentType(contentType);
        } catch {
          // ignore
        } finally {
          setContractLoading(false);
        }
      }
    },
    onError: () => {
      setErrorMessage('Không thể tải lên hợp đồng. Vui lòng chọn tệp PDF, PNG, JPG hoặc WebP hợp lệ.');
    },
  });

  // Approve Onboarding Mutation
  const approveOnboardingMutation = useMutation({
    mutationFn: () => {
      if (!inspectorId) throw new Error('Missing inspector ID');
      return inspectorProfileApi.approveOnboarding(inspectorId);
    },
    onSuccess: (updated) => {
      setErrorMessage(null);
      queryClient.setQueryData(['inspector-profile', inspectorId], updated);
      queryClient.invalidateQueries({ queryKey: ['mf1-inspectors-list'] });
      queryClient.invalidateQueries({ queryKey: ['platform-users'] });
      setSuccessMessage('Đã phê duyệt kích hoạt Đối tác Inspector! Phi công đã sẵn sàng nhận nhiệm vụ bay.');
      setTimeout(() => setSuccessMessage(null), 5000);
    },
    onError: () => {
      setErrorMessage('Chưa đủ điều kiện phê duyệt: Cần có đủ (1) Bản scan Bằng lái và (2) Bản scan Hợp đồng đã ký (SHA-256).');
    },
  });

  // Reject Onboarding Mutation
  const rejectOnboardingMutation = useMutation({
    mutationFn: (reason: string) => {
      if (!inspectorId) throw new Error('Missing inspector ID');
      return inspectorProfileApi.rejectOnboarding(inspectorId, reason);
    },
    onSuccess: (updated) => {
      setErrorMessage(null);
      queryClient.setQueryData(['inspector-profile', inspectorId], updated);
      queryClient.invalidateQueries({ queryKey: ['mf1-inspectors-list'] });
      setSuccessMessage('Đã gửi yêu cầu bổ sung hồ sơ/hợp đồng cho Inspector.');
      setTimeout(() => setSuccessMessage(null), 5000);
    },
  });

  const handleContractFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadContractMutation.mutate(file);
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
        <DialogTitle
          sx={{
            m: 0,
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            bgcolor: 'background.default',
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              src={profile?.avatarUrl ?? undefined}
              alt={profile?.fullName ?? 'Inspector'}
              sx={{ width: 44, height: 44, bgcolor: 'primary.main', fontWeight: 700 }}
            >
              {profile?.fullName?.slice(0, 1) || 'I'}
            </Avatar>
            <Box>
              <Typography variant="h6" component="h2" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary' }}>
                {tr(
                  'Hồ sơ Đối tác Inspector & Kinh nghiệm bay',
                  'Partner Inspector Profile & Flight Experience',
                )}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {profile?.fullName} · {profile?.email}
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
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
              <Typography color="text.secondary">
                {tr('Không tìm thấy thông tin Inspector.', 'Inspector profile not found.')}
              </Typography>
            </Box>
          ) : (
            <Box>
              {/* TOP STATS BAR */}
              <Box sx={{ px: 3, py: 2, bgcolor: 'background.default', borderBottom: 1, borderColor: 'divider' }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
                  <Box
                    sx={{
                      p: 1.5,
                      bgcolor: 'background.paper',
                      borderRadius: '8px',
                      border: 1,
                      borderColor: 'divider',
                      textAlign: 'center',
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                      {tr('Tổng giờ bay tích lũy', 'Total Flight Hours')}
                    </Typography>
                    <Typography variant="h5" component="div" sx={{ fontWeight: 800, color: 'text.primary' }}>
                      {profile.totalFlightHours}{' '}
                      <Box component="span" sx={{ fontSize: '0.85rem', fontWeight: 500 }}>
                        {tr('giờ', 'hrs')}
                      </Box>
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      ({tr('Trước đây:', 'Prior:')} {profile.priorFlightHours}h + {tr('Tại cty:', 'Platform:')}{' '}
                      {profile.companyFlightHours}h)
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      p: 1.5,
                      bgcolor: 'background.paper',
                      borderRadius: '8px',
                      border: 1,
                      borderColor: 'divider',
                      textAlign: 'center',
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                      {tr('Nhiệm vụ bay tại công ty', 'Platform Flight Missions')}
                    </Typography>
                    <Typography variant="h5" component="div" sx={{ fontWeight: 800, color: 'info.main' }}>
                      {profile.companyFlightsCount}{' '}
                      <Box component="span" sx={{ fontSize: '0.85rem', fontWeight: 500 }}>
                        {tr('chuyến bay', 'missions')}
                      </Box>
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {tr('Thời lượng:', 'Duration:')} {profile.companyFlightHours}{' '}
                      {tr('giờ hoạt động', 'active hours')}
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      p: 1.5,
                      bgcolor: 'background.paper',
                      borderRadius: '8px',
                      border: 1,
                      borderColor: 'divider',
                      textAlign: 'center',
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase' }}>
                      {tr('Giấy phép bay UAV', 'UAV Pilot License')}
                    </Typography>
                    <Box sx={{ mt: 0.5 }}>
                      {profile.licenseExpirationStatus === 'VALID' ? (
                        <Chip
                          size="small"
                          icon={<CheckCircleRounded />}
                          label={tr(
                            `CÒN HẠN (${profile.licenseRemainingDays} ngày)`,
                            `VALID (${profile.licenseRemainingDays}d left)`,
                          )}
                          color="success"
                          sx={{ fontWeight: 700 }}
                        />
                      ) : profile.licenseExpirationStatus === 'EXPIRING_SOON' ? (
                        <Chip
                          size="small"
                          icon={<WarningAmberRounded />}
                          label={tr(
                            `SẮP HẾT HẠN (Còn ${profile.licenseRemainingDays} ngày)`,
                            `EXPIRING SOON (${profile.licenseRemainingDays}d)`,
                          )}
                          color="warning"
                          sx={{ fontWeight: 700 }}
                        />
                      ) : profile.licenseExpirationStatus === 'EXPIRED' ? (
                        <Chip
                          size="small"
                          icon={<ErrorOutlineRounded />}
                          label={tr('ĐÃ HẾT HẠN', 'EXPIRED')}
                          color="error"
                          sx={{ fontWeight: 700 }}
                        />
                      ) : (
                        <Chip size="small" label={tr('Chưa cập nhật bằng', 'License not set')} color="default" />
                      )}
                    </Box>
                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}>
                      {tr('Số:', 'No.:')} {profile.pilotLicenseNumber || '—'}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {successMessage && (
                <Box sx={{ px: 3, pt: 2 }}>
                  <Alert severity="success">{successMessage}</Alert>
                </Box>
              )}
              {errorMessage && (
                <Box sx={{ px: 3, pt: 2 }}>
                  <Alert severity="error" onClose={() => setErrorMessage(null)}>
                    {errorMessage}
                  </Alert>
                </Box>
              )}

              {/* TABS NAVIGATION */}
              <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
                <Tabs value={currentTab} onChange={(_, val) => setCurrentTab(val)} variant="scrollable">
                  <Tab
                    icon={<BadgeOutlined />}
                    iconPosition="start"
                    label={tr('1. Thông tin cá nhân', '1. Personal Info')}
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  />
                  <Tab
                    icon={<FlightTakeoffRounded />}
                    iconPosition="start"
                    label={tr('2. Bằng lái & Bản Scan', '2. Pilot License & Scan')}
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  />
                  <Tab
                    icon={<DescriptionOutlined />}
                    iconPosition="start"
                    label={tr(
                      `3. Hợp đồng Đối tác & Duyệt (${profile.onboardingStatus === 'APPROVED' ? 'Đã duyệt' : 'Chờ duyệt'})`,
                      `3. Partner Contract & Approval (${profile.onboardingStatus === 'APPROVED' ? 'Approved' : 'Pending'})`,
                    )}
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  />
                  <Tab
                    icon={<HistoryEduRounded />}
                    iconPosition="start"
                    label={tr('4. Kinh nghiệm bay', '4. Flight Experience')}
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  />
                  <Tab
                    icon={<FlightTakeoffRounded />}
                    iconPosition="start"
                    label={tr(
                      `5. Lịch sử bay (${profile.companyFlightsCount})`,
                      `5. Flight Log (${profile.companyFlightsCount})`,
                    )}
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  />
                </Tabs>
              </Box>

              {/* TAB 0: PERSONAL INFO */}
              {currentTab === 0 && (
                <Box component="form" onSubmit={handleSaveProfile} sx={{ p: 3 }}>
                  <Typography variant="h6" component="h2" sx={{ fontWeight: 700, fontSize: '0.875rem', mb: 2, color: 'text.primary' }}>
                    {tr('Thông tin định danh và liên hệ nhân sự', 'Identity & Contact Information')}
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                    <TextField
                      fullWidth
                      required
                      label={tr('Họ và tên', 'Full name')}
                      value={form.fullName}
                      onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    />
                    <TextField
                      fullWidth
                      disabled
                      label={tr('Email đăng nhập', 'Sign-in email')}
                      value={profile.email}
                      helperText={tr(
                        'Email do hệ thống quản lý, không thể thay đổi trực tiếp',
                        'System-managed email address cannot be modified directly',
                      )}
                    />
                    <TextField
                      fullWidth
                      label={tr('Số điện thoại liên hệ', 'Phone number')}
                      placeholder="0912 345 678"
                      value={form.phoneNumber || ''}
                      onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                    />
                    <TextField
                      fullWidth
                      label={tr('Số CCCD / Hộ chiếu', 'National ID / Passport')}
                      placeholder="001092008899"
                      value={form.citizenId || ''}
                      onChange={(e) => setForm({ ...form, citizenId: e.target.value })}
                    />
                    <TextField
                      fullWidth
                      type="date"
                      label={tr('Ngày tháng năm sinh', 'Date of birth')}
                      slotProps={{ inputLabel: { shrink: true } }}
                      value={form.dateOfBirth || ''}
                      onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                    />
                    <TextField
                      fullWidth
                      label={tr('Địa chỉ thường trú / Công tác', 'Operating address')}
                      placeholder={tr('VD: Ba Đình, Hà Nội', 'e.g. Ba Dinh, Hanoi')}
                      value={form.address || ''}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                    />
                    <Box sx={{ gridColumn: { xs: 'span 1', sm: 'span 2' } }}>
                      <TextField
                        fullWidth
                        multiline
                        rows={2}
                        label={tr('Ghi chú nội bộ về nhân sự', 'Internal personnel notes')}
                        placeholder={tr(
                          'Nhận xét của Manager về tác phong, kỹ luật, sức khỏe bay...',
                          'Manager notes on professionalism, safety compliance, medical readiness...',
                        )}
                        value={form.notes || ''}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      />
                    </Box>
                  </Box>

                  <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      disabled={updateMutation.isPending}
                      sx={{ textTransform: 'none', fontWeight: 600, px: 3, borderRadius: '8px' }}
                    >
                      {updateMutation.isPending
                        ? tr('Đang lưu…', 'Saving…')
                        : tr('Lưu thông tin cá nhân', 'Save personal info')}
                    </Button>
                  </Box>
                </Box>
              )}

              {/* TAB 1: PILOT LICENSE & SCAN */}
              {currentTab === 1 && (
                <Box component="form" onSubmit={handleSaveProfile} sx={{ p: 3 }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '7fr 5fr' }, gap: 3 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Typography variant="h6" component="h2" sx={{ fontWeight: 700, fontSize: '0.875rem', mb: 0.5, color: 'text.primary' }}>
                        {tr(
                          'Thông tin Giấy phép điều khiển tàu bay không người lái (UAV)',
                          'UAV Remote Pilot License Details',
                        )}
                      </Typography>
                      <TextField
                        fullWidth
                        label={tr('Số hiệu bằng lái / Chứng chỉ phi công', 'Pilot license / Certificate number')}
                        placeholder="VD: DC-2026-0012845"
                        value={form.pilotLicenseNumber || ''}
                        onChange={(e) => setForm({ ...form, pilotLicenseNumber: e.target.value })}
                        helperText={tr(
                          'Định dạng cấp phép chính thức (VD: DC-YYYY-XXXXXXX)',
                          'Official license format (e.g. DC-YYYY-XXXXXXX)',
                        )}
                      />
                      <TextField
                        select
                        fullWidth
                        label={tr('Hạng bằng lái UAV', 'UAV pilot license class')}
                        value={form.pilotLicenseClass || ''}
                        onChange={(e) => setForm({ ...form, pilotLicenseClass: e.target.value })}
                        helperText={
                          licenseClassesQuery.isLoading
                            ? tr('Đang tải danh mục hạng bằng…', 'Loading license classes…')
                            : undefined
                        }
                        disabled={licenseClassesQuery.isLoading || licenseClassesQuery.isError}
                      >
                        <MenuItem value="">
                          <em>{tr('Chưa chọn hạng bằng', 'No class selected')}</em>
                        </MenuItem>
                        {licenseClassesQuery.data?.map((licenseClass) => (
                          <MenuItem key={licenseClass.id} value={licenseClass.name}>
                            {licenseClass.name}
                          </MenuItem>
                        ))}
                        {form.pilotLicenseClass &&
                          !licenseClassesQuery.data?.some(
                            (licenseClass) => licenseClass.name === form.pilotLicenseClass,
                          ) && (
                            <MenuItem value={form.pilotLicenseClass}>
                              {form.pilotLicenseClass} ({tr('Đã ngừng hoạt động', 'Inactive')})
                            </MenuItem>
                          )}
                      </TextField>
                      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                        <TextField
                          fullWidth
                          type="date"
                          label={tr('Ngày cấp bằng', 'Issue date')}
                          slotProps={{ inputLabel: { shrink: true } }}
                          value={form.pilotLicenseIssuedDate || ''}
                          onChange={(e) => setForm({ ...form, pilotLicenseIssuedDate: e.target.value })}
                        />
                        <TextField
                          fullWidth
                          type="date"
                          label={tr('Ngày hết hạn bằng lái', 'Expiration date')}
                          slotProps={{ inputLabel: { shrink: true } }}
                          value={form.pilotLicenseExpiresAt || ''}
                          onChange={(e) => setForm({ ...form, pilotLicenseExpiresAt: e.target.value })}
                        />
                      </Box>
                      <TextField
                        fullWidth
                        label={tr('Cơ quan / Đơn vị cấp phép', 'Issuing authority')}
                        placeholder={tr(
                          'VD: Cục Tác chiến - Bộ Tổng Tham mưu / Cục Hàng không Việt Nam',
                          'e.g. Operations Department / Civil Aviation Authority of Vietnam',
                        )}
                        value={form.pilotLicenseAuthority || ''}
                        onChange={(e) => setForm({ ...form, pilotLicenseAuthority: e.target.value })}
                      />

                      <Box sx={{ pt: 1 }}>
                        <Button
                          type="submit"
                          variant="contained"
                          color="primary"
                          disabled={updateMutation.isPending}
                          sx={{ textTransform: 'none', fontWeight: 600, px: 3, borderRadius: '8px' }}
                        >
                          {updateMutation.isPending
                            ? tr('Đang lưu…', 'Saving…')
                            : tr('Lưu thông tin giấy phép', 'Save license info')}
                        </Button>
                      </Box>
                    </Box>

                    {/* Right column: License scan */}
                    <Box>
                      <Typography variant="h6" component="h2" sx={{ fontWeight: 700, fontSize: '0.875rem', mb: 1, color: 'text.primary' }}>
                        {tr('Bản scan giấy phép bay (Lưu trữ MinIO)', 'Scanned Pilot License (MinIO Storage)')}
                      </Typography>
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 2,
                          textAlign: 'center',
                          borderRadius: '10px',
                          borderStyle: profile.hasLicenseScan ? 'solid' : 'dashed',
                          borderColor: profile.hasLicenseScan ? 'success.main' : 'divider',
                          bgcolor: 'background.default',
                        }}
                      >
                        {licenseScanLoading ? (
                          <Box sx={{ py: 6 }}>
                            <CircularProgress size={28} />
                            <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
                              {tr('Đang tải bản scan từ MinIO…', 'Loading license scan…')}
                            </Typography>
                          </Box>
                        ) : licenseScanBlobUrl ? (
                          <Box>
                            <Card variant="outlined" sx={{ position: 'relative', mb: 1.5, borderRadius: '8px' }}>
                              <CardMedia
                                component="img"
                                height="180"
                                image={licenseScanBlobUrl}
                                alt={tr('Bản scan bằng lái', 'Pilot license scan')}
                                sx={{ objectFit: 'contain', bgcolor: 'action.hover' }}
                              />
                              <IconButton
                                size="small"
                                onClick={() => setZoomScanOpen(true)}
                                sx={{
                                  position: 'absolute',
                                  top: 6,
                                  right: 6,
                                  bgcolor: 'background.paper',
                                  '&:hover': { bgcolor: 'background.default' },
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
                                {tr('Xem phóng to', 'Zoom in')}
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                component="a"
                                href={licenseScanBlobUrl}
                                download={`Scan-Bang-Lai-${profile.fullName.replace(/\s+/g, '_')}.png`}
                                sx={{ textTransform: 'none' }}
                              >
                                {tr('Tải về', 'Download')}
                              </Button>
                            </Box>
                          </Box>
                        ) : (
                          <Box sx={{ py: 4 }}>
                            <BadgeOutlined sx={{ fontSize: 44, color: 'text.secondary', mb: 1 }} />
                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                              {tr('Chưa có bản scan giấy phép', 'No license scan uploaded yet')}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 2 }}>
                              {tr('Hỗ trợ định dạng PDF, JPG, PNG hoặc WebP', 'Supports PDF, JPG, PNG, or WebP')}
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
                            ? tr('Đang tải lên MinIO…', 'Uploading…')
                            : profile.hasLicenseScan
                              ? tr('Tải lên bản scan mới thay thế', 'Replace license scan')
                              : tr('Chọn tệp scan để tải lên', 'Upload license scan')}
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

              {/* TAB 2: HỢP ĐỒNG ĐỐI TÁC & PHÊ DUYỆT (HYBRID ONBOARDING SHA-256) */}
              {currentTab === 2 && (
                <Box sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    {/* BƯỚC 1: TẢI DỰ THẢO HỢP ĐỒNG PDF */}
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2.5,
                        borderRadius: '12px',
                        borderColor: '#cbd5e1',
                        bgcolor: '#f8fafc',
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        justifyContent: 'space-between',
                        alignItems: { xs: 'flex-start', sm: 'center' },
                        gap: 2,
                      }}
                    >
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                          Bước 1 — Tải Dự thảo Hợp đồng Đối tác (PDF điền sẵn thông tin)
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          Hệ thống tự động trích xuất Họ tên, CCCD ({profile.citizenId || 'chưa nhập'}), Số bằng lái ({profile.pilotLicenseNumber || 'chưa nhập'}) và điều khoản chia sẻ doanh thu (85% Net Payout) thành file PDF chuẩn để hai bên ký trực tiếp hoặc ký số CA.
                        </Typography>
                      </Box>
                      <Button
                        variant="contained"
                        startIcon={<DownloadRounded />}
                        onClick={() => {
                          if (inspectorId) {
                            void inspectorProfileApi.downloadDraftPartnerContractPdf(inspectorId, profile.fullName);
                          }
                        }}
                        sx={{
                          bgcolor: '#087E8B',
                          textTransform: 'none',
                          fontWeight: 650,
                          whiteSpace: 'nowrap',
                          '&:hover': { bgcolor: '#066B70' },
                        }}
                      >
                        Tải Dự thảo Hợp đồng (PDF)
                      </Button>
                    </Paper>

                    {/* BƯỚC 2: UPLOAD BẢN SCAN HỢP ĐỒNG ĐÃ KÝ + MÃ BĂM SHA-256 */}
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2.5,
                        borderRadius: '12px',
                        borderColor: profile.hasPartnerContract ? '#10b981' : '#cbd5e1',
                        bgcolor: profile.hasPartnerContract ? '#f0fdf4' : '#ffffff',
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: { xs: 'column', sm: 'row' },
                          justifyContent: 'space-between',
                          alignItems: { xs: 'flex-start', sm: 'center' },
                          gap: 1.5,
                          mb: 2,
                        }}
                      >
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                            Bước 2 — Upload Bản scan Hợp đồng đã ký (Khóa toàn vẹn SHA-256 trên MinIO)
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Sau khi ký hợp đồng (ký tay có đóng dấu hoặc ký số CA hợp pháp), tải file PDF/Ảnh chụp hợp đồng lên MinIO.
                          </Typography>
                        </Box>

                        <Button
                          component="label"
                          variant="outlined"
                          startIcon={<CloudUploadOutlined />}
                          disabled={uploadContractMutation.isPending}
                          sx={{ textTransform: 'none', fontWeight: 650, whiteSpace: 'nowrap', bgcolor: '#ffffff' }}
                        >
                          {uploadContractMutation.isPending
                            ? 'Đang băm SHA-256 & tải lên…'
                            : profile.hasPartnerContract
                              ? 'Tải lên bản Hợp đồng mới thay thế'
                              : 'Chọn file Hợp đồng đã ký (PDF/Ảnh)'}
                          <input
                            hidden
                            type="file"
                            accept="application/pdf,image/png,image/jpeg,image/webp"
                            onChange={handleContractFileSelected}
                          />
                        </Button>
                      </Box>

                      {profile.partnerContractSha256 && (
                        <Box
                          sx={{
                            p: 1.5,
                            mb: 2,
                            bgcolor: '#ffffff',
                            borderRadius: '8px',
                            border: '1px solid #bbf7d0',
                          }}
                        >
                          <Typography variant="caption" sx={{ fontWeight: 700, color: '#166534', display: 'block' }}>
                            🔒 Mã băm toàn vẹn chống sửa đổi (SHA-256 Checksum trên MinIO):
                          </Typography>
                          <Typography
                            sx={{
                              fontFamily: 'monospace',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              color: '#0f172a',
                              wordBreak: 'break-all',
                              mt: 0.25,
                            }}
                          >
                            {profile.partnerContractSha256}
                          </Typography>
                          {profile.partnerContractUploadedAt && (
                            <Typography variant="caption" color="text.secondary">
                              Thời điểm lưu trữ: {new Date(profile.partnerContractUploadedAt).toLocaleString('vi-VN')}
                            </Typography>
                          )}
                        </Box>
                      )}

                      {contractLoading ? (
                        <Box sx={{ py: 4, textAlign: 'center' }}>
                          <CircularProgress size={26} />
                          <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                            Đang tải hợp đồng từ MinIO…
                          </Typography>
                        </Box>
                      ) : contractBlobUrl ? (
                        <Box sx={{ textAlign: 'center' }}>
                          {contractContentType.includes('pdf') ? (
                            <iframe
                              src={contractBlobUrl}
                              title="Signed Partner Contract PDF"
                              style={{ width: '100%', height: '320px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#fff' }}
                            />
                          ) : (
                            <Box
                              component="img"
                              src={contractBlobUrl}
                              alt="Bản scan hợp đồng đã ký"
                              sx={{ maxHeight: 280, maxWidth: '100%', objectFit: 'contain', borderRadius: '8px', border: '1px solid #cbd5e1', bgcolor: '#fff' }}
                            />
                          )}
                          <Box sx={{ mt: 1 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              component="a"
                              href={contractBlobUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{ textTransform: 'none', bgcolor: '#ffffff' }}
                            >
                              Mở xem toàn màn hình / Tải về
                            </Button>
                          </Box>
                        </Box>
                      ) : (
                        <Alert severity="warning">
                          Chưa có bản scan Hợp đồng Đối tác đã ký trên MinIO. Vui lòng tải Dự thảo Hợp đồng ở Bước 1, ký tên và tải lên tại đây.
                        </Alert>
                      )}
                    </Paper>

                    {/* BƯỚC 3: CỔNG DUYỆT KÍCH HOẠT ĐỐI TÁC (HARD GATE) */}
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2.5,
                        borderRadius: '12px',
                        borderColor: '#e2e8f0',
                        bgcolor: '#f8fafc',
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                          Bước 3 — Cổng Phê duyệt Kích hoạt Đối tác (Onboarding Gate)
                        </Typography>
                        <Chip
                          icon={<VerifiedUserOutlined />}
                          label={
                            profile.onboardingStatus === 'APPROVED'
                              ? 'ĐÃ PHÊ DUYỆT — SẴN SÀNG NHẬN NHIỆM VỤ BAY'
                              : profile.onboardingStatus === 'REJECTED'
                                ? 'YÊU CẦU BỔ SUNG HỒ SƠ'
                                : 'ĐANG CHỜ MANAGER PHÊ DUYỆT'
                          }
                          color={
                            profile.onboardingStatus === 'APPROVED'
                              ? 'success'
                              : profile.onboardingStatus === 'REJECTED'
                                ? 'error'
                                : 'warning'
                          }
                          size="small"
                          sx={{ fontWeight: 700 }}
                        />
                      </Box>

                      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5, mb: 2 }}>
                        <Box
                          sx={{
                            p: 1.5,
                            bgcolor: '#ffffff',
                            borderRadius: '8px',
                            border: profile.hasLicenseScan ? '1px solid #86efac' : '1px solid #fecaca',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                          }}
                        >
                          {profile.hasLicenseScan ? (
                            <CheckCircleRounded color="success" fontSize="small" />
                          ) : (
                            <ErrorOutlineRounded color="error" fontSize="small" />
                          )}
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            (1) Bản scan Bằng lái UAV: {profile.hasLicenseScan ? 'Đã lưu MinIO' : 'Chưa tải lên'}
                          </Typography>
                        </Box>

                        <Box
                          sx={{
                            p: 1.5,
                            bgcolor: '#ffffff',
                            borderRadius: '8px',
                            border: profile.hasPartnerContract ? '1px solid #86efac' : '1px solid #fecaca',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                          }}
                        >
                          {profile.hasPartnerContract ? (
                            <CheckCircleRounded color="success" fontSize="small" />
                          ) : (
                            <ErrorOutlineRounded color="error" fontSize="small" />
                          )}
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            (2) Hợp đồng đã ký (SHA-256): {profile.hasPartnerContract ? 'Đã lưu MinIO' : 'Chưa tải lên'}
                          </Typography>
                        </Box>
                      </Box>

                      {profile.rejectionReason && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                          <strong>Lý do yêu cầu bổ sung:</strong> {profile.rejectionReason}
                        </Alert>
                      )}

                      {canApprovePartner ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                            <Button
                              variant="contained"
                              color="success"
                              startIcon={<CheckCircleRounded />}
                              disabled={
                                !profile.hasLicenseScan ||
                                !profile.hasPartnerContract ||
                                approveOnboardingMutation.isPending
                              }
                              onClick={() => approveOnboardingMutation.mutate()}
                              sx={{ textTransform: 'none', fontWeight: 700 }}
                            >
                              {approveOnboardingMutation.isPending
                                ? 'Đang phê duyệt…'
                                : profile.onboardingStatus === 'APPROVED'
                                  ? 'Đã phê duyệt kích hoạt (Cập nhật lại)'
                                  : 'Phê duyệt kích hoạt Đối tác (Approve)'}
                            </Button>
                          </Box>

                          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mt: 1 }}>
                            <TextField
                              size="small"
                              fullWidth
                              label="Lý do yêu cầu bổ sung / từ chối (nếu hồ sơ chưa đạt)"
                              placeholder="VD: Hợp đồng thiếu chữ ký trang 2 hoặc ảnh bằng lái bị mờ..."
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              sx={{ bgcolor: '#ffffff' }}
                            />
                            <Button
                              variant="outlined"
                              color="error"
                              disabled={!rejectReason.trim() || rejectOnboardingMutation.isPending}
                              onClick={() => rejectOnboardingMutation.mutate(rejectReason.trim())}
                              sx={{ textTransform: 'none', fontWeight: 650, whiteSpace: 'nowrap' }}
                            >
                              Yêu cầu bổ sung
                            </Button>
                          </Box>
                        </Box>
                      ) : (
                        <Alert severity={profile.onboardingStatus === 'APPROVED' ? 'success' : 'info'}>
                          {profile.onboardingStatus === 'APPROVED'
                            ? 'Hồ sơ và Hợp đồng Đối tác của bạn đã được Platform Manager phê duyệt. Bạn đã đủ điều kiện nhận nhiệm vụ bay!'
                            : 'Sau khi bạn tải lên đủ (1) Bản scan Bằng lái ở Tab 2 và (2) Bản scan Hợp đồng đã ký ở trên, Platform Manager sẽ kiểm tra và bấm Phê duyệt kích hoạt tài khoản của bạn.'}
                        </Alert>
                      )}
                    </Paper>
                  </Box>
                </Box>
              )}

              {/* TAB 3: KINH NGHIỆM BAY */}
              {currentTab === 3 && (
                <Box component="form" onSubmit={handleSaveProfile} sx={{ p: 3 }}>
                  <Typography variant="h6" component="h2" sx={{ fontWeight: 700, fontSize: '0.875rem', mb: 2, color: 'text.primary' }}>
                    {tr(
                      'Kinh nghiệm bay, loại thiết bị và lĩnh vực kiểm định chuyên môn',
                      'Flight Experience, Certified Aircraft & Inspection Specializations',
                    )}
                  </Typography>

                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                    <TextField
                      fullWidth
                      type="number"
                      slotProps={{ htmlInput: { step: '0.5', min: '0' } }}
                      label={tr(
                        'Số giờ bay tích lũy trước khi vào công ty (giờ)',
                        'Prior flight hours before joining platform (hrs)',
                      )}
                      placeholder="150.5"
                      value={form.priorFlightHours ?? 0}
                      onChange={(e) => setForm({ ...form, priorFlightHours: parseFloat(e.target.value) || 0 })}
                      helperText={tr(
                        'Tổng giờ bay tích lũy trên các dự án trước đây',
                        'Total verified flight hours from prior projects',
                      )}
                    />
                    <TextField
                      fullWidth
                      disabled
                      label={tr('Số giờ bay tại công ty (giờ)', 'Platform flight hours (hrs)')}
                      value={tr(
                        `${profile.companyFlightHours} giờ (từ ${profile.companyFlightsCount} nhiệm vụ)`,
                        `${profile.companyFlightHours} hrs (across ${profile.companyFlightsCount} missions)`,
                      )}
                      helperText={tr(
                        'Tự động tính từ các chuyến bay nội bộ đã ghi nhận',
                        'Automatically calculated from recorded platform flight missions',
                      )}
                    />
                    <Box sx={{ gridColumn: { xs: 'span 1', sm: 'span 2' } }}>
                      <TextField
                        fullWidth
                        label={tr(
                          'Các dòng Drone đã thành thạo / Có chứng chỉ bay',
                          'Certified / Proficient Drone Models',
                        )}
                        placeholder="DJI Matrice 350 RTK, Mavic 3 Enterprise / Thermal, Autel EVO Max 4T"
                        value={form.certifiedDroneModels || ''}
                        onChange={(e) => setForm({ ...form, certifiedDroneModels: e.target.value })}
                        helperText={tr('Phân tách bằng dấu phẩy', 'Comma-separated list')}
                      />
                      {form.certifiedDroneModels && (
                        <Box sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 0.75, mt: 1 }}>
                          {form.certifiedDroneModels.split(',').map((model, idx) => (
                            <Chip
                              key={idx}
                              size="small"
                              color="primary"
                              variant="outlined"
                              label={model.trim()}
                              sx={{ fontWeight: 600 }}
                            />
                          ))}
                        </Box>
                      )}
                    </Box>
                    <Box sx={{ gridColumn: { xs: 'span 1', sm: 'span 2' } }}>
                      <TextField
                        fullWidth
                        label={tr(
                          'Lĩnh vực / Chuyên môn kiểm định hạ tầng',
                          'Infrastructure Inspection Specializations',
                        )}
                        placeholder={tr(
                          'VD: Đường dây tải điện cao thế, Cánh quạt tuabin gió, Trang trại điện mặt trời',
                          'e.g. High-voltage power lines, Wind turbine blades, Solar farms',
                        )}
                        value={form.specializations || ''}
                        onChange={(e) => setForm({ ...form, specializations: e.target.value })}
                        helperText={tr('Phân tách bằng dấu phẩy', 'Comma-separated list')}
                      />
                      {form.specializations && (
                        <Box sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 0.75, mt: 1 }}>
                          {form.specializations.split(',').map((spec, idx) => (
                            <Chip
                              key={idx}
                              size="small"
                              color="success"
                              variant="outlined"
                              label={spec.trim()}
                              sx={{ fontWeight: 600 }}
                            />
                          ))}
                        </Box>
                      )}
                    </Box>
                    <Box sx={{ gridColumn: { xs: 'span 1', sm: 'span 2' } }}>
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label={tr(
                          'Tóm tắt kinh nghiệm bay & Đánh giá năng lực',
                          'Flight Experience Summary & Competency Assessment',
                        )}
                        placeholder={tr(
                          'Mô tả quá trình đào tạo, các dự án tiêu biểu đã tham gia, kỹ năng xử lý gió mạnh, bay gần nguồn từ trường cao thế...',
                          'Describe training background, key projects, high-wind handling, EMI corridor experience...',
                        )}
                        value={form.experienceSummary || ''}
                        onChange={(e) => setForm({ ...form, experienceSummary: e.target.value })}
                      />
                    </Box>
                  </Box>

                  <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      disabled={updateMutation.isPending}
                      sx={{ textTransform: 'none', fontWeight: 600, px: 3, borderRadius: '8px' }}
                    >
                      {updateMutation.isPending
                        ? tr('Đang lưu…', 'Saving…')
                        : tr('Lưu thông tin kinh nghiệm', 'Save experience')}
                    </Button>
                  </Box>
                </Box>
              )}

              {/* TAB 4: LỊCH SỬ BAY TẠI CÔNG TY */}
              {currentTab === 4 && (
                <Box sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box>
                      <Typography variant="h6" component="h2" sx={{ fontWeight: 700, fontSize: '0.875rem', color: 'text.primary' }}>
                        {tr(
                          'Nhật ký các nhiệm vụ bay nội bộ tại công ty',
                          'Platform Flight Mission Logbook',
                        )}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {tr(
                          'Ghi nhận thời gian bay, dòng drone sử dụng và kết quả thực hiện nhiệm vụ.',
                          'Record flight duration, aircraft used, and mission safety outcomes.',
                        )}
                      </Typography>
                    </Box>
                    <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      startIcon={<AddCircleOutlineRounded />}
                      onClick={() => setLogOpen(true)}
                      sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
                    >
                      {tr('+ Ghi nhận chuyến bay mới', '+ Record Flight Mission')}
                    </Button>
                  </Box>

                  {flightLogsQuery.isLoading ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <CircularProgress size={24} />
                    </Box>
                  ) : (flightLogsQuery.data ?? []).length === 0 ? (
                    <Paper
                      variant="outlined"
                      sx={{ p: 4, textAlign: 'center', borderRadius: '10px', bgcolor: 'background.default' }}
                    >
                      <FlightTakeoffRounded sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                        {tr(
                          'Chưa có chuyến bay nào được ghi nhận cho phi công này',
                          'No flight missions recorded for this pilot yet',
                        )}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {tr(
                          'Bấm nút "+ Ghi nhận chuyến bay mới" để thêm thông tin chuyến bay đầu tiên.',
                          'Use "+ Record Flight Mission" to log the first mission.',
                        )}
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
                            borderColor: 'divider',
                            display: 'flex',
                            flexDirection: { xs: 'column', sm: 'row' },
                            justifyContent: 'space-between',
                            alignItems: { xs: 'flex-start', sm: 'center' },
                            gap: 1.5,
                          }}
                        >
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <Typography sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.9375rem' }}>
                                {log.missionTitle}
                              </Typography>
                              <Chip
                                size="small"
                                label={log.flightCode}
                                variant="outlined"
                                sx={{ height: 22, fontSize: '0.75rem', fontWeight: 700 }}
                              />
                              <Chip
                                size="small"
                                label={log.inspectionType}
                                color="primary"
                                variant="outlined"
                                sx={{ height: 22, fontSize: '0.75rem', fontWeight: 600 }}
                              />
                            </Box>

                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                              {tr('Thiết bị:', 'Aircraft:')} <strong>{log.droneModel}</strong>{' '}
                              {log.droneSerialNumber && `(S/N: ${log.droneSerialNumber})`} ·{' '}
                              {tr('Địa điểm:', 'Location:')} <strong>{log.location}</strong>
                            </Typography>

                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              {tr('Ngày bay:', 'Flight date:')}{' '}
                              {new Date(log.flightDate).toLocaleDateString(dateLocale)} ·{' '}
                              {tr('Thời lượng:', 'Duration:')}{' '}
                              <strong>
                                {log.flightDurationMinutes} {tr('phút', 'min')}
                              </strong>{' '}
                              ({log.flightDurationHours} {tr('giờ', 'hrs')})
                              {log.notes && ` · ${tr('Ghi chú:', 'Note:')} ${log.notes}`}
                            </Typography>
                          </Box>

                          <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1 }}>
                            {log.safetyIncident ? (
                              <Chip
                                size="small"
                                label={tr('Có sự cố', 'Incident')}
                                color="error"
                                sx={{ fontWeight: 700 }}
                              />
                            ) : (
                              <Chip
                                size="small"
                                label={tr('An toàn', 'Safe')}
                                color="success"
                                sx={{ fontWeight: 700 }}
                              />
                            )}
                            <IconButton
                              size="small"
                              color="error"
                              aria-label={tr('Xóa nhật ký bay', 'Delete flight log')}
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

        <DialogActions sx={{ px: 3, py: 2, bgcolor: 'background.default', borderTop: 1, borderColor: 'divider' }}>
          <Button onClick={onClose} variant="outlined" sx={{ textTransform: 'none', fontWeight: 600 }}>
            {tr('Đóng', 'Close')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG: RECORD NEW FLIGHT MISSION */}
      <Dialog open={logOpen} onClose={() => setLogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700 }}>
          {tr('Ghi nhận Chuyến bay / Nhiệm vụ bay mới', 'Record New Flight Mission')}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              fullWidth
              required
              label={tr('Mã chuyến bay / Ký hiệu', 'Flight code')}
              placeholder="FL-2026-105"
              value={logForm.flightCode}
              onChange={(e) => setLogForm({ ...logForm, flightCode: e.target.value })}
            />
            <TextField
              fullWidth
              required
              type="date"
              label={tr('Ngày thực hiện bay', 'Flight date')}
              slotProps={{ inputLabel: { shrink: true } }}
              value={logForm.flightDate}
              onChange={(e) => setLogForm({ ...logForm, flightDate: e.target.value })}
            />
            <TextField
              fullWidth
              required
              label={tr('Tên nhiệm vụ / Công trình kiểm định', 'Mission title / Inspected asset')}
              placeholder={tr(
                'VD: Khảo sát đường dây 500kV đoạn Nho Quan - Thường Tín',
                'e.g. 500kV transmission line inspection',
              )}
              value={logForm.missionTitle}
              onChange={(e) => setLogForm({ ...logForm, missionTitle: e.target.value })}
            />
            <TextField
              fullWidth
              required
              label={tr('Dòng Drone sử dụng', 'Drone model')}
              placeholder="DJI Matrice 350 RTK"
              value={logForm.droneModel}
              onChange={(e) => setLogForm({ ...logForm, droneModel: e.target.value })}
            />
            <TextField
              fullWidth
              label={tr('Số Serial Drone (tùy chọn)', 'Drone serial number (optional)')}
              placeholder="1581F5GJD2203001"
              value={logForm.droneSerialNumber || ''}
              onChange={(e) => setLogForm({ ...logForm, droneSerialNumber: e.target.value })}
            />
            <TextField
              fullWidth
              required
              label={tr('Địa điểm / Khu vực bay', 'Location / Operating sector')}
              placeholder={tr(
                'VD: Cột 125-132, Huyện Phú Xuyên, Hà Nội',
                'e.g. Towers 125-132, Phu Xuyen, Hanoi',
              )}
              value={logForm.location}
              onChange={(e) => setLogForm({ ...logForm, location: e.target.value })}
            />
            <TextField
              fullWidth
              required
              type="number"
              slotProps={{ htmlInput: { min: '1' } }}
              label={tr('Thời lượng bay (phút)', 'Flight duration (minutes)')}
              placeholder="75"
              value={logForm.flightDurationMinutes}
              onChange={(e) =>
                setLogForm({ ...logForm, flightDurationMinutes: parseInt(e.target.value, 10) || 0 })
              }
            />
            <TextField
              fullWidth
              required
              label={tr('Loại hình kiểm định', 'Inspection type')}
              placeholder={tr(
                'VD: Đường dây điện cao thế / Pin mặt trời / Tuabin gió',
                'e.g. High-voltage power line / Solar / Wind turbine',
              )}
              value={logForm.inspectionType}
              onChange={(e) => setLogForm({ ...logForm, inspectionType: e.target.value })}
            />
            <TextField
              fullWidth
              multiline
              rows={2}
              label={tr('Ghi chú chuyến bay', 'Flight notes')}
              placeholder={tr(
                'Tình trạng thời tiết, gió, chất lượng dữ liệu thu thập...',
                'Weather conditions, wind speed, evidence capture quality...',
              )}
              value={logForm.notes || ''}
              onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setLogOpen(false)} sx={{ textTransform: 'none' }}>
            {tr('Hủy', 'Cancel')}
          </Button>
          <Button
            variant="contained"
            color="primary"
            disabled={
              recordLogMutation.isPending ||
              !logForm.flightCode.trim() ||
              !logForm.missionTitle.trim() ||
              !logForm.droneModel.trim() ||
              !logForm.location.trim() ||
              logForm.flightDurationMinutes <= 0
            }
            onClick={() => recordLogMutation.mutate(logForm)}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            {recordLogMutation.isPending ? tr('Đang lưu…', 'Saving…') : tr('Lưu chuyến bay', 'Save mission')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG: ZOOM LICENSE SCAN */}
      <Dialog open={zoomScanOpen} onClose={() => setZoomScanOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography sx={{ fontWeight: 700 }}>
            {tr('Bản scan Giấy phép bay', 'Pilot License Scan')} - {profile?.fullName}
          </Typography>
          <IconButton onClick={() => setZoomScanOpen(false)} size="small">
            <CloseRounded />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 1, bgcolor: 'background.default', textAlign: 'center' }}>
          {licenseScanBlobUrl && (
            <Box
              component="img"
              src={licenseScanBlobUrl}
              alt={tr('Scan giấy phép bay', 'Pilot license scan')}
              sx={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
