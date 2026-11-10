import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  CardMedia,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import AddCircleOutlineRounded from '@mui/icons-material/AddCircleOutlineRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import CloudUploadOutlined from '@mui/icons-material/CloudUploadOutlined';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import FlightTakeoffRounded from '@mui/icons-material/FlightTakeoffRounded';
import RefreshRounded from '@mui/icons-material/RefreshRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import VerifiedUserOutlined from '@mui/icons-material/VerifiedUserOutlined';
import BuildCircleOutlined from '@mui/icons-material/BuildCircleOutlined';
import AppRegistrationOutlined from '@mui/icons-material/AppRegistrationOutlined';
import EventAvailableOutlined from '@mui/icons-material/EventAvailableOutlined';
import {
  mf1DroneApi,
  uploadDroneEvidence,
  type DroneEvidenceType,
  type DroneRegistrationInput,
  type InspectorDrone,
  type DroneRegistrationApplication,
} from '../api/mf1DroneApi';
import { PageHeader } from '@/shared/ui/PageHeader';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { useAuthStore } from '@/features/auth/store/authStore';
import { MetricCard } from '@/shared/ui/MetricCard';

interface DroneFormState {
  droneName: string;
  manufacturer: string;
  serialNumber: string;
  registrationNumber: string;
  registrationExpiresAt: string;
  mtowKg: string;
  maxFlightTimeMinutes: string;
  cameraSensor: string;
  safetyFeatures: string;
}

const initialForm: DroneFormState = {
  droneName: '',
  manufacturer: '',
  serialNumber: '',
  registrationNumber: '',
  registrationExpiresAt: '',
  mtowKg: '',
  maxFlightTimeMinutes: '',
  cameraSensor: '',
  safetyFeatures: '',
};

const REQUIRED_DOCUMENTS: Array<{
  type: DroneEvidenceType;
  title: string;
  description: string;
}> = [
  {
    type: 'REGISTRATION',
    title: 'Ảnh Giấy chứng nhận đăng ký drone',
    description: 'Chụp rõ nét giấy chứng nhận đăng ký do cơ quan chức năng cấp, thể hiện rõ số hiệu.',
  },
  {
    type: 'OWNERSHIP',
    title: 'Ảnh Giấy tờ sở hữu / Hóa đơn tài chính',
    description: 'Hóa đơn VAT, tờ khai hải quan nhập khẩu hoặc văn bản chuyển nhượng quyền sở hữu hợp pháp.',
  },
  {
    type: 'INSPECTION',
    title: 'Ảnh Giấy kiểm định / Chứng nhận an toàn kỹ thuật',
    description: 'Biên bản kiểm định định kỳ hoặc Giấy chứng nhận chất lượng xuất xưởng (CoC/CoA) còn hạn.',
  },
];

function classifyDroneByMtow(rawText?: string | null): {
  categoryCode: string;
  categoryLabel: string;
  requiredLicenseLabel: string;
  requiresClassB: boolean;
} | null {
  if (!rawText) return null;
  const match = rawText.match(/(?:MTOW:\s*)?(\d+(?:[.,]\d+)?)\s*(?:kg)?/i);
  if (!match?.[1]) return null;
  const mtow = Number(match[1].replace(',', '.'));
  if (!Number.isFinite(mtow) || mtow <= 0) return null;
  if (mtow < 0.25) {
    return {
      categoryCode: 'Loại 1 (< 0.25 kg)',
      categoryLabel: 'Loại 1 (< 0.25 kg) · Điều 4 NĐ 288/2025/NĐ-CP',
      requiredLicenseLabel: 'Hạng A (bay kiểm định thương mại vẫn bắt buộc có Phép bay)',
      requiresClassB: false,
    };
  }
  if (mtow < 2) {
    return {
      categoryCode: 'Loại 2 (0.25 – < 2 kg)',
      categoryLabel: 'Loại 2 (0.25 – < 2 kg) · Điều 4 NĐ 288/2025/NĐ-CP',
      requiredLicenseLabel: 'Bằng lái Hạng A (VLOS) hoặc Hạng B (BVLOS)',
      requiresClassB: false,
    };
  }
  if (mtow < 25) {
    return {
      categoryCode: 'Loại 3 (2 – < 25 kg)',
      categoryLabel: 'Loại 3 (2 – < 25 kg) · Điều 4 NĐ 288/2025/NĐ-CP',
      requiredLicenseLabel: 'Bắt buộc Bằng lái Hạng B (Điều 27 NĐ 288/2025/NĐ-CP)',
      requiresClassB: true,
    };
  }
  if (mtow < 150) {
    return {
      categoryCode: 'Loại 4 (25 – < 150 kg)',
      categoryLabel: 'Loại 4 (25 – < 150 kg) · Điều 4 NĐ 288/2025/NĐ-CP',
      requiredLicenseLabel: 'Bắt buộc Bằng lái Hạng B (Điều 27 NĐ 288/2025/NĐ-CP)',
      requiresClassB: true,
    };
  }
  return {
    categoryCode: 'Loại 5 (≥ 150 kg)',
    categoryLabel: 'Loại 5 (≥ 150 kg) · Điều 4 NĐ 288/2025/NĐ-CP',
    requiredLicenseLabel: 'Bắt buộc Bằng lái Hạng B (Điều 27 NĐ 288/2025/NĐ-CP)',
    requiresClassB: true,
  };
}

export default function InspectorDroneRegistrationPage() {
  const { t } = useLocale();
  const [form, setForm] = useState<DroneFormState>(initialForm);
  const [files, setFiles] = useState<Record<DroneEvidenceType, File | null>>({
    REGISTRATION: null,
    OWNERSHIP: null,
    INSPECTION: null,
  });
  const [previews, setPreviews] = useState<Record<DroneEvidenceType, string | null>>({
    REGISTRATION: null,
    OWNERSHIP: null,
    INSPECTION: null,
  });
  const [editingApplicationId, setEditingApplicationId] = useState<string | null>(null);
  const [existingFileKeys, setExistingFileKeys] = useState<Record<DroneEvidenceType, string | null>>({
    REGISTRATION: null,
    OWNERSHIP: null,
    INSPECTION: null,
  });
  const [message, setMessage] = useState<string | null>(null);
  const [openRegisterDialog, setOpenRegisterDialog] = useState(false);
  const [tabIndex, setTabIndex] = useState<'APPROVED' | 'APPLICATIONS'>('APPROVED');

  const queryClient = useQueryClient();
  const isInspector = useAuthStore((state) => state.roles).includes('INSPECTOR');

  const applications = useQuery({
    queryKey: ['inspector-drone-applications'],
    queryFn: mf1DroneApi.mine,
    enabled: isInspector,
    refetchInterval: isInspector ? 10000 : false,
    retry: false,
  });

  const drones = useQuery({
    queryKey: ['inspector-drones'],
    queryFn: mf1DroneApi.drones,
    enabled: isInspector,
    refetchInterval: isInspector ? 10000 : false,
    retry: false,
  });

  const approvedDrones: InspectorDrone[] = drones.data ?? [];
  const applicationList: DroneRegistrationApplication[] = applications.data ?? [];
  const pendingCount = applicationList.filter((a) => a.status === 'PENDING').length;

  const submit = useMutation({
    mutationFn: async (formData: DroneFormState) => {
      const upload = async (type: DroneEvidenceType) => {
        const file = files[type];
        if (file) {
          return uploadDroneEvidence(file, type);
        }
        if (existingFileKeys[type]) {
          return existingFileKeys[type]!;
        }
        throw new Error(`Vui lòng tải lên ${type.toLowerCase()}.`);
      };

      const [registrationFileKey, ownershipFileKey, inspectionFileKey] = await Promise.all([
        upload('REGISTRATION'),
        upload('OWNERSHIP'),
        upload('INSPECTION'),
      ]);

      const specsParts: string[] = [];
      if (formData.mtowKg) {
        const mtow = formData.mtowKg.toLowerCase().includes('kg') ? formData.mtowKg.trim() : `${formData.mtowKg.trim()} kg`;
        specsParts.push(`MTOW: ${mtow}`);
      }
      if (formData.maxFlightTimeMinutes) {
        const time =
          formData.maxFlightTimeMinutes.toLowerCase().includes('phút') || formData.maxFlightTimeMinutes.toLowerCase().includes('p')
            ? formData.maxFlightTimeMinutes.trim()
            : `${formData.maxFlightTimeMinutes.trim()} phút`;
        specsParts.push(`Thời gian bay: ${time}`);
      }
      if (formData.cameraSensor) specsParts.push(`Camera/Sensor: ${formData.cameraSensor.trim()}`);
      if (formData.safetyFeatures) specsParts.push(`An toàn: ${formData.safetyFeatures.trim()}`);

      const formattedModel =
        specsParts.length > 0 ? `${formData.droneName.trim()} [${specsParts.join(' | ')}]` : formData.droneName.trim();
      const finalModel = formattedModel.length > 1000 ? formattedModel.slice(0, 1000) : formattedModel;

      const input: DroneRegistrationInput = {
        serialNumber: formData.serialNumber.trim(),
        model: finalModel,
        manufacturer: formData.manufacturer.trim(),
        registrationNumber: formData.registrationNumber.trim(),
        registrationExpiresAt: new Date(formData.registrationExpiresAt).toISOString(),
        registrationFileKey,
        ownershipFileKey,
        inspectionFileKey,
      };

      if (editingApplicationId) {
        return mf1DroneApi.resubmit(editingApplicationId, input);
      }
      return mf1DroneApi.submit(input);
    },
    onSuccess: async () => {
      setForm(initialForm);
      setEditingApplicationId(null);
      setExistingFileKeys({ REGISTRATION: null, OWNERSHIP: null, INSPECTION: null });
      Object.values(previews).forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
      setFiles({ REGISTRATION: null, OWNERSHIP: null, INSPECTION: null });
      setPreviews({ REGISTRATION: null, OWNERSHIP: null, INSPECTION: null });
      setMessage('Đã gửi hồ sơ đăng ký thiết bị drone thành công! Platform Manager sẽ xác minh giấy tờ trước khi kích hoạt.');
      setOpenRegisterDialog(false);
      setTabIndex('APPLICATIONS');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['inspector-drone-applications'] }),
        queryClient.invalidateQueries({ queryKey: ['inspector-drones'] }),
      ]);
    },
  });

  const updateField = (field: keyof DroneFormState) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleFileChange = (type: DroneEvidenceType) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (previews[type]) {
      URL.revokeObjectURL(previews[type]!);
    }
    setFiles((current) => ({ ...current, [type]: file }));
    if (file && file.type.startsWith('image/')) {
      setPreviews((current) => ({ ...current, [type]: URL.createObjectURL(file) }));
    } else {
      setPreviews((current) => ({ ...current, [type]: null }));
    }
  };

  const handleRemoveFile = (type: DroneEvidenceType) => {
    if (previews[type]) {
      URL.revokeObjectURL(previews[type]!);
    }
    setFiles((current) => ({ ...current, [type]: null }));
    setPreviews((current) => ({ ...current, [type]: null }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    submit.mutate(form);
  };

  const handleOpenRegister = (
    initialData?: Partial<DroneFormState>,
    existingApp?: {
      id: string;
      registrationFileKey?: string | null;
      ownershipFileKey?: string | null;
      inspectionFileKey?: string | null;
    },
  ) => {
    if (initialData) {
      setForm({ ...initialForm, ...initialData });
    } else {
      setForm(initialForm);
    }
    setEditingApplicationId(existingApp?.id ?? null);
    setExistingFileKeys({
      REGISTRATION: existingApp?.registrationFileKey ?? null,
      OWNERSHIP: existingApp?.ownershipFileKey ?? null,
      INSPECTION: existingApp?.inspectionFileKey ?? null,
    });
    setOpenRegisterDialog(true);
  };

  const allDocumentsUploaded = Boolean(
    (files.REGISTRATION || existingFileKeys.REGISTRATION) &&
      (files.OWNERSHIP || existingFileKeys.OWNERSHIP) &&
      (files.INSPECTION || existingFileKeys.INSPECTION),
  );

  return (
    <Box className="workspace-page">
      <PageHeader
        title={t('Drone của tôi')}
        subtitle={t('Quản lý danh sách thiết bị bay của bạn đã được duyệt và theo dõi các hồ sơ đăng ký đang chờ phê duyệt.')}
        actions={
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshRounded />}
              onClick={() => {
                void applications.refetch();
                void drones.refetch();
              }}
              disabled={applications.isFetching || drones.isFetching}
              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
            >
              {applications.isFetching || drones.isFetching ? 'Đang làm mới…' : 'Làm mới'}
            </Button>
            <Button
              variant="contained"
              size="medium"
              startIcon={<AddCircleOutlineRounded />}
              onClick={() => handleOpenRegister()}
              sx={{
                borderRadius: '8px',
                px: 2.5,
                bgcolor: '#087E8B',
                fontWeight: 600,
                textTransform: 'none',
                boxShadow: 'none',
                '&:hover': { bgcolor: '#066B70' },
              }}
            >
              {t('Đăng ký Drone mới')}
            </Button>
          </Stack>
        }
      />

      {/* KPI METRICS OVERVIEW */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2.5, mb: 3 }}>
        <MetricCard
          label={t('Drone sẵn sàng bay')}
          value={approvedDrones.length.toString()}
          subtext={t('Đã thẩm định hồ sơ kỹ thuật')}
          iconType="flight"
          positive={approvedDrones.length > 0}
        />
        <MetricCard
          label={t('Hồ sơ đang chờ duyệt')}
          value={pendingCount.toString()}
          subtext={t('Manager đang xác minh')}
          iconType="access-time"
          positive={pendingCount === 0}
        />
        <MetricCard
          label={t('Tổng hồ sơ đã gửi')}
          value={applicationList.length.toString()}
          subtext={t('Lịch sử đăng ký')}
          iconType="fact-check"
          positive
        />
      </Box>

      {message && (
        <Alert severity="success" role="status" sx={{ mt: 2, borderRadius: 2 }} onClose={() => setMessage(null)}>
          {message}
        </Alert>
      )}

      {/* TABS CHUYỂN ĐỔI: DRONE ĐÃ ĐƯỢC DUYỆT VS HỒ SƠ ĐÃ GỬI */}
      <Paper variant="outlined" sx={{ mt: 3, borderRadius: '16px', overflow: 'hidden' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, pt: 1, bgcolor: '#F8FBFA' }}>
          <Tabs
            value={tabIndex}
            onChange={(_, val) => setTabIndex(val)}
            textColor="primary"
            indicatorColor="primary"
            sx={{ '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: '14px', py: 1.5 } }}
          >
            <Tab
              value="APPROVED"
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>{t('Đội bay hoạt động')}</span>
                  <Chip size="small" label={approvedDrones.length} color="success" sx={{ height: 20, fontSize: '11px', fontWeight: 700 }} />
                </Box>
              }
            />
            <Tab
              value="APPLICATIONS"
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>{t('Hồ sơ đăng ký đã nộp')}</span>
                  <Chip
                    size="small"
                    label={applicationList.length}
                    color={pendingCount > 0 ? 'warning' : 'default'}
                    sx={{ height: 20, fontSize: '11px', fontWeight: 700 }}
                  />
                </Box>
              }
            />
          </Tabs>
        </Box>

        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          {/* TAB 1: DANH SÁCH DRONE HOẠT ĐỘNG (APPROVED) */}
          {tabIndex === 'APPROVED' && (
            <Box>
              {drones.isLoading ? (
                <Typography color="text.secondary">Đang tải danh sách Drone…</Typography>
              ) : approvedDrones.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <FlightTakeoffRounded sx={{ fontSize: 48, color: '#94a3b8', mb: 1.5 }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#334155' }}>
                    {t('Chưa có Drone nào được duyệt')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 480, mx: 'auto', mt: 0.5, mb: 2.5 }}>
                    {t('Hãy gửi hồ sơ đăng ký thiết bị bay kèm đầy đủ giấy tờ kỹ thuật. Platform Manager sẽ kiểm tra và kích hoạt để bạn sử dụng trong các ca kiểm định.')}
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddCircleOutlineRounded />}
                    onClick={() => handleOpenRegister()}
                    sx={{
                      borderRadius: '8px',
                      bgcolor: '#087E8B',
                      textTransform: 'none',
                      fontWeight: 600,
                      '&:hover': { bgcolor: '#066B70' },
                    }}
                  >
                    {t('Bổ sung hồ sơ Drone ngay')}
                  </Button>
                </Box>
              ) : (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2.5 }}>
                  {approvedDrones.map((drone) => (
                    <Card
                      key={drone.id}
                      variant="outlined"
                      sx={{
                        p: 2.5,
                        borderRadius: '14px',
                        border: '1px solid #E2E8F0',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                          <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0F172A', lineHeight: 1.3 }}>
                              {drone.model ?? 'Thiết bị bay kiểm định'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mt: 0.25 }}>
                              Hãng sản xuất: <strong>{drone.manufacturer || 'Chưa cập nhật'}</strong>
                            </Typography>
                            {(() => {
                              const legalClass = classifyDroneByMtow(drone.model);
                              if (!legalClass) return null;
                              return (
                                <Stack direction="row" spacing={0.75} sx={{ mt: 0.75, flexWrap: 'wrap', gap: 0.5 }}>
                                  <Chip
                                    size="small"
                                    variant="outlined"
                                    color={legalClass.requiresClassB ? 'info' : 'default'}
                                    label={legalClass.categoryCode}
                                    sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }}
                                  />
                                  <Chip
                                    size="small"
                                    variant="outlined"
                                    label={legalClass.requiresClassB ? 'Yêu cầu Bằng Hạng B' : 'Bằng Hạng A/B'}
                                    sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }}
                                  />
                                </Stack>
                              );
                            })()}
                          </Box>
                          <Chip
                            icon={<VerifiedUserOutlined style={{ fontSize: 14 }} />}
                            label="ĐÃ DUYỆT"
                            color="success"
                            size="small"
                            sx={{ fontWeight: 700, fontSize: '11px', height: 24 }}
                          />
                        </Box>

                        <Divider sx={{ my: 1.75 }} />

                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, fontSize: '13px' }}>
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              Số Serial thân máy:
                            </Typography>
                            <Typography sx={{ fontWeight: 600, fontFamily: 'monospace', color: '#1E293B', fontSize: '13px' }}>
                              {drone.serialNumber}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              Số đăng ký phương tiện:
                            </Typography>
                            <Typography sx={{ fontWeight: 600, color: '#1E293B', fontSize: '13px' }}>
                              {drone.registrationNumber || '—'}
                            </Typography>
                          </Box>
                          {drone.registrationExpiresAt && (
                            <Box sx={{ gridColumn: '1 / -1' }}>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <EventAvailableOutlined sx={{ fontSize: 14 }} /> Hạn kiểm định / đăng ký:
                              </Typography>
                              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 0.25, flexWrap: 'wrap' }}>
                                <Typography sx={{ fontWeight: 600, color: '#0F172A', fontSize: '13px' }}>
                                  {new Date(drone.registrationExpiresAt).toLocaleDateString('vi-VN')}
                                </Typography>
                                {(() => {
                                  const daysLeft =
                                    drone.registrationRemainingDays ??
                                    Math.floor(
                                      (new Date(drone.registrationExpiresAt).getTime() - Date.now()) /
                                        (1000 * 60 * 60 * 24),
                                    );
                                  if (daysLeft < 0) {
                                    return (
                                      <Chip
                                        size="small"
                                        color="error"
                                        label="Đã quá hạn đăng kiểm"
                                        sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700 }}
                                      />
                                    );
                                  }
                                  if (daysLeft <= 30) {
                                    return (
                                      <Chip
                                        size="small"
                                        color="warning"
                                        label={`Sắp hết hạn (${daysLeft} ngày)`}
                                        sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700 }}
                                      />
                                    );
                                  }
                                  return (
                                    <Chip
                                      size="small"
                                      color="success"
                                      variant="outlined"
                                      label={`Còn hạn (${daysLeft} ngày)`}
                                      sx={{ height: 20, fontSize: '0.68rem', fontWeight: 600 }}
                                    />
                                  );
                                })()}
                              </Stack>
                            </Box>
                          )}
                        </Box>
                      </Box>

                      <Box sx={{ mt: 2.5, pt: 1.5, borderTop: '1px dashed #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<BuildCircleOutlined />}
                          onClick={() => {
                            const matchedApp = applicationList.find(
                              (a) => a.droneId === drone.id || a.serialNumber === drone.serialNumber,
                            );
                            const mtowMatch = drone.model?.match(/MTOW:\s*([\d.,]+)/i);
                            handleOpenRegister(
                              {
                                droneName: drone.model?.split('[')[0]?.trim() || '',
                                manufacturer: drone.manufacturer || '',
                                serialNumber: drone.serialNumber || '',
                                registrationNumber: drone.registrationNumber || '',
                                registrationExpiresAt: drone.registrationExpiresAt
                                  ? drone.registrationExpiresAt.slice(0, 10)
                                  : '',
                                mtowKg: mtowMatch?.[1] || (drone.mtowKg ? String(drone.mtowKg) : ''),
                              },
                              matchedApp
                                ? {
                                    id: matchedApp.id,
                                    registrationFileKey: matchedApp.registrationFileKey ?? null,
                                    ownershipFileKey: matchedApp.ownershipFileKey ?? null,
                                    inspectionFileKey: matchedApp.inspectionFileKey ?? null,
                                  }
                                : undefined,
                            );
                          }}
                          sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
                        >
                          Cập nhật / Gia hạn
                        </Button>
                      </Box>
                    </Card>
                  ))}
                </Box>
              )}
            </Box>
          )}

          {/* TAB 2: DANH SÁCH HỒ SƠ ĐÃ GỬI (APPLICATIONS) */}
          {tabIndex === 'APPLICATIONS' && (
            <Box>
              {applications.isLoading ? (
                <Typography color="text.secondary">Đang tải danh sách hồ sơ…</Typography>
              ) : applicationList.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 5 }}>
                  <AppRegistrationOutlined sx={{ fontSize: 44, color: '#94a3b8', mb: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#334155' }}>
                    Chưa có hồ sơ đăng ký nào
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
                    Tất cả các hồ sơ nộp lên sẽ được lưu vết và theo dõi trạng thái thẩm định tại đây.
                  </Typography>
                </Box>
              ) : (
                <Stack spacing={2}>
                  {applicationList.map((app) => (
                    <Box
                      key={app.id}
                      sx={{
                        p: 2.5,
                        borderRadius: '12px',
                        border: '1px solid',
                        borderColor:
                          app.status === 'APPROVED'
                            ? '#BBF7D0'
                            : app.status === 'REJECTED'
                              ? '#FECACA'
                              : '#E2E8F0',
                        bgcolor:
                          app.status === 'APPROVED'
                            ? '#F0FDF4'
                            : app.status === 'REJECTED'
                              ? '#FEF2F2'
                              : '#FFFFFF',
                        display: 'flex',
                        flexDirection: { xs: 'column', md: 'row' },
                        justifyContent: 'space-between',
                        alignItems: { xs: 'flex-start', md: 'center' },
                        gap: 2,
                      }}
                    >
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography sx={{ fontWeight: 700, color: '#0F172A', fontSize: '15px' }}>
                            {app.model || 'Drone'}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748B' }}>
                            ({app.manufacturer || 'Hãng chưa rõ'})
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ color: '#475569', mt: 0.5, fontSize: '13px' }}>
                          Số Serial: <strong style={{ fontFamily: 'monospace' }}>{app.serialNumber}</strong> · Số đăng ký:{' '}
                          <strong>{app.registrationNumber}</strong> · Nộp ngày:{' '}
                          {new Date(app.createdAt).toLocaleDateString('vi-VN')}
                        </Typography>
                        {app.reviewNote && (
                          <Alert severity={app.status === 'REJECTED' ? 'error' : 'info'} sx={{ mt: 1, py: 0.25, px: 1.5, fontSize: '12.5px' }}>
                            <strong>Phản hồi của Manager:</strong> {app.reviewNote}
                          </Alert>
                        )}
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
                        <Chip
                          label={
                            app.status === 'APPROVED'
                              ? 'ĐÃ PHÊ DUYỆT'
                              : app.status === 'REJECTED'
                                ? 'TỪ CHỐI / CẦN SỬA'
                                : 'ĐANG CHỜ DUYỆT'
                          }
                          color={
                            app.status === 'APPROVED'
                              ? 'success'
                              : app.status === 'REJECTED'
                                ? 'error'
                                : 'warning'
                          }
                          sx={{ fontWeight: 700, fontSize: '12px' }}
                        />
                        {app.status === 'REJECTED' && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={() => {
                              const mtowMatch = app.model?.match(/MTOW:\s*([\d.,]+)/i);
                              handleOpenRegister(
                                {
                                  droneName: app.model?.split('[')[0]?.trim() || '',
                                  manufacturer: app.manufacturer || '',
                                  serialNumber: app.serialNumber || '',
                                  registrationNumber: app.registrationNumber || '',
                                  registrationExpiresAt: app.registrationExpiresAt
                                    ? app.registrationExpiresAt.slice(0, 10)
                                    : '',
                                  mtowKg: mtowMatch?.[1] || '',
                                },
                                {
                                  id: app.id,
                                  registrationFileKey: app.registrationFileKey ?? null,
                                  ownershipFileKey: app.ownershipFileKey ?? null,
                                  inspectionFileKey: app.inspectionFileKey ?? null,
                                },
                              );
                            }}
                            sx={{ textTransform: 'none', fontWeight: 600, fontSize: '12px' }}
                          >
                            Chỉnh sửa & Nộp lại
                          </Button>
                        )}
                      </Box>
                    </Box>
                  ))}
                </Stack>
              )}
            </Box>
          )}
        </Box>
      </Paper>

      {/* MODAL DIALOG: THỰC HIỆN ĐĂNG KÝ VÀ CẬP NHẬT DRONE */}
      <Dialog
        open={openRegisterDialog}
        onClose={() => setOpenRegisterDialog(false)}
        maxWidth="md"
        fullWidth
        scroll="paper"
        slotProps={{ paper: { sx: { borderRadius: '16px' } } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <FlightTakeoffRounded color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {t('Khai báo hồ sơ Drone')}
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setOpenRegisterDialog(false)}>
            <CloseRounded />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ p: { xs: 2.5, sm: 3.5 } }}>
          <Stack component="form" id="drone-register-form" spacing={3} onSubmit={handleSubmit}>
            {/* THÔNG SỐ KỸ THUẬT */}
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                1. Thông tin & Thông số kỹ thuật
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Nhập chính xác tên, số Serial và thông số kỹ thuật của thiết bị bay.
              </Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <TextField
                  required
                  label="Tên Drone / Model"
                  placeholder="VD: DJI Matrice 350 RTK, Autel EVO Max 4T"
                  value={form.droneName}
                  onChange={updateField('droneName')}
                  helperText="Tên thương mại đầy đủ của thiết bị"
                />
                <TextField
                  required
                  label="Hãng sản xuất"
                  placeholder="VD: DJI, Autel Robotics, Skydio"
                  value={form.manufacturer}
                  onChange={updateField('manufacturer')}
                />
                <TextField
                  required
                  label="Số Serial thân máy (Serial number)"
                  placeholder="VD: 1581F4B0C2301001"
                  value={form.serialNumber}
                  onChange={updateField('serialNumber')}
                  helperText="Mã số duy nhất in trên tem thân máy (phải khớp giấy tờ)"
                />
                <TextField
                  required
                  label="Số đăng ký phương tiện bay"
                  placeholder="VD: VN-UAV-2026-0889"
                  value={form.registrationNumber}
                  onChange={updateField('registrationNumber')}
                  helperText="Số đăng ký do cơ quan có thẩm quyền cấp"
                />
                <TextField
                  required
                  type="date"
                  label="Ngày hết hạn đăng ký / kiểm định"
                  value={form.registrationExpiresAt}
                  onChange={updateField('registrationExpiresAt')}
                  slotProps={{ inputLabel: { shrink: true } }}
                  helperText="Thiết bị phải còn hạn đăng ký để được duyệt"
                />
                <TextField
                  label="Trọng lượng cất cánh tối đa (MTOW)"
                  placeholder="VD: 4.07 kg"
                  value={form.mtowKg}
                  onChange={updateField('mtowKg')}
                  helperText="Căn cứ phân loại phương tiện bay theo Điều 4 Nghị định 288/2025/NĐ-CP"
                />
                {(() => {
                  const legalInfo = classifyDroneByMtow(form.mtowKg);
                  if (!legalInfo) return null;
                  return (
                    <Box sx={{ gridColumn: { xs: '1 / -1' } }}>
                      <Alert severity={legalInfo.requiresClassB ? 'info' : 'success'} sx={{ py: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 650 }}>
                          Phân loại pháp lý: {legalInfo.categoryLabel}
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block' }}>
                          Điều kiện người điều khiển: {legalInfo.requiredLicenseLabel}
                        </Typography>
                      </Alert>
                    </Box>
                  );
                })()}
                <TextField
                  label="Thời gian bay tối đa"
                  placeholder="VD: 55 phút"
                  value={form.maxFlightTimeMinutes}
                  onChange={updateField('maxFlightTimeMinutes')}
                />
                <TextField
                  label="Tải trọng Cảm biến / Camera (Payload)"
                  placeholder="VD: Zenmuse H20T (Camera nhiệt + Zoom 23x)"
                  value={form.cameraSensor}
                  onChange={updateField('cameraSensor')}
                />
                <Box sx={{ gridColumn: { xs: '1 / -1' } }}>
                  <TextField
                    fullWidth
                    label="Tính năng an toàn & Hệ thống hỗ trợ"
                    placeholder="VD: Geofencing tự né vùng cấm bay, Failsafe Return-to-Home, Cảm biến tránh va chạm 6 hướng"
                    value={form.safetyFeatures}
                    onChange={updateField('safetyFeatures')}
                  />
                </Box>
              </Box>
            </Box>

            <Divider />

            {/* HÌNH ẢNH GIẤY TỜ BẮT BUỘC */}
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                2. Hình ảnh giấy tờ bắt buộc (Chụp ảnh / Scan rõ nét)
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Yêu cầu hình ảnh rõ nét số Serial, số đăng ký và con dấu kiểm định (PNG, JPG, PDF tối đa 10 MB/file).
              </Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
                {REQUIRED_DOCUMENTS.map((doc) => {
                  const file = files[doc.type];
                  const preview = previews[doc.type];

                  return (
                    <Paper
                      key={doc.type}
                      variant="outlined"
                      sx={{
                        p: 1.75,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        borderRadius: '12px',
                        border: file ? '1.5px solid #12B76A' : '1px solid #eaecf0',
                        bgcolor: file ? '#F6FEF9' : '#FCFCFD',
                      }}
                    >
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                          {file ? (
                            <CheckCircleRounded sx={{ color: '#12B76A', fontSize: 18 }} />
                          ) : (
                            <CloudUploadOutlined sx={{ color: '#667085', fontSize: 18 }} />
                          )}
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '13px' }}>
                            {doc.title}
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.25 }}>
                          {doc.description}
                        </Typography>

                        {preview ? (
                          <Card variant="outlined" sx={{ mb: 1.25, position: 'relative' }}>
                            <CardMedia
                              component="img"
                              height="120"
                              image={preview}
                              alt={doc.title}
                              sx={{ objectFit: 'contain', bgcolor: '#0000000a' }}
                            />
                            <IconButton
                              size="small"
                              color="error"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveFile(doc.type);
                              }}
                              sx={{
                                position: 'absolute',
                                top: 4,
                                right: 4,
                                bgcolor: 'rgba(255, 255, 255, 0.9)',
                                '&:hover': { bgcolor: '#ffffff' },
                                zIndex: 15,
                              }}
                            >
                              <DeleteOutlineRounded fontSize="small" />
                            </IconButton>
                          </Card>
                        ) : file ? (
                          <Box sx={{ mb: 1.25, p: 0.75, bgcolor: '#ffffff', borderRadius: 1, border: '1px solid #d0d5dd' }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '12px' }} noWrap>
                              📄 {file.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {(file.size / (1024 * 1024)).toFixed(2)} MB
                            </Typography>
                          </Box>
                        ) : null}
                      </Box>

                      <Box sx={{ position: 'relative', width: '100%', mt: 1 }}>
                        <Button
                          type="button"
                          fullWidth
                          variant={file ? 'outlined' : 'contained'}
                          color={file ? 'success' : 'primary'}
                          size="small"
                          startIcon={<CloudUploadOutlined />}
                          sx={{ textTransform: 'none', borderRadius: '8px', pointerEvents: 'none', fontSize: '12px' }}
                        >
                          {file ? 'Đổi tệp khác' : 'Chọn tệp giấy tờ'}
                        </Button>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,application/pdf"
                          onChange={handleFileChange(doc.type)}
                          onClick={(e) => {
                            (e.target as HTMLInputElement).value = '';
                          }}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            opacity: 0,
                            cursor: 'pointer',
                            zIndex: 10,
                          }}
                        />
                      </Box>
                    </Paper>
                  );
                })}
              </Box>
            </Box>

            {submit.isError && (
              <Alert severity="error">
                {(() => {
                  const err = submit.error as {
                    response?: { data?: { detail?: string; message?: string } };
                    message?: string;
                  };
                  const detail = err?.response?.data?.detail || err?.response?.data?.message || err?.message;
                  return detail ? `Không thể gửi hồ sơ: ${detail}` : 'Không thể gửi hồ sơ đăng ký. Vui lòng thử lại.';
                })()}
              </Alert>
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setOpenRegisterDialog(false)} color="inherit" sx={{ textTransform: 'none', fontWeight: 600 }}>
            {t('Hủy')}
          </Button>
          <Button
            type="submit"
            form="drone-register-form"
            variant="contained"
            disabled={
              submit.isPending ||
              !form.droneName.trim() ||
              !form.serialNumber.trim() ||
              !form.registrationNumber.trim() ||
              !form.registrationExpiresAt ||
              !allDocumentsUploaded
            }
            sx={{
              borderRadius: '8px',
              px: 3,
              bgcolor: '#087E8B',
              fontWeight: 600,
              textTransform: 'none',
              boxShadow: 'none',
              '&:hover': { bgcolor: '#066B70' },
            }}
          >
            {submit.isPending ? 'Đang gửi hồ sơ…' : 'Gửi hồ sơ Drone để duyệt'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
