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
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  Paper,
  Radio,
  RadioGroup,
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
import HandymanOutlined from '@mui/icons-material/HandymanOutlined';
import PrecisionManufacturingOutlined from '@mui/icons-material/PrecisionManufacturingOutlined';
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
  droneOriginType: 'COMMERCIAL' | 'DIY';
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
  droneOriginType: 'COMMERCIAL',
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

const getRequiredDocuments = (originType: 'COMMERCIAL' | 'DIY'): Array<{
  type: DroneEvidenceType;
  titleVi: string;
  titleEn: string;
  descriptionVi: string;
  descriptionEn: string;
}> => [
  {
    type: 'REGISTRATION',
    titleVi: '1. Giấy chứng nhận đăng ký phương tiện bay (Bộ Công an cấp)',
    titleEn: '1. UAV Registration Certificate (Ministry of Public Security)',
    descriptionVi:
      originType === 'DIY'
        ? 'Chụp rõ nét Giấy chứng nhận đăng ký phương tiện bay không người lái do Công an tỉnh/TP cấp sau khi mang thiết bị tự lắp ráp đến kiểm tra thực tế (Thông tư 78/2026/TT-BCA).'
        : 'Chụp rõ nét Giấy chứng nhận đăng ký phương tiện bay không người lái do Công an tỉnh/thành phố hoặc Cục A05 cấp theo Thông tư 78/2026/TT-BCA.',
    descriptionEn:
      originType === 'DIY'
        ? 'Official UAV Registration Certificate issued by Police following physical verification of the custom-built airframe (Circular 78/2026/TT-BCA).'
        : 'Official UAV Registration Certificate issued by Provincial Police or Cyber Security Department (A05) under Circular 78/2026/TT-BCA.',
  },
  {
    type: 'OWNERSHIP',
    titleVi: originType === 'DIY' ? '2. Giấy tờ nguồn gốc linh kiện (Tùy chọn bổ sung)' : '2. Giấy tờ sở hữu hợp pháp / Hóa đơn (Tùy chọn bổ sung)',
    titleEn: originType === 'DIY' ? '2. Component Origin / Invoices (Optional addition)' : '2. Proof of Legal Ownership / Invoice (Optional addition)',
    descriptionVi:
      originType === 'DIY'
        ? '(Không bắt buộc nếu đã có Giấy đăng ký Công an cấp). Có thể đính kèm Hóa đơn VAT, chứng từ mua các cụm linh kiện chính hoặc bản tự kê khai.'
        : '(Không bắt buộc nếu đã có Giấy đăng ký Công an cấp). Có thể đính kèm Hóa đơn VAT, tờ khai hải quan nhập khẩu hoặc văn bản chuyển nhượng quyền sở hữu.',
    descriptionEn:
      originType === 'DIY'
        ? '(Optional if official Police Registration is provided). Optional VAT invoices or component declarations.'
        : '(Optional if official Police Registration is provided). Optional VAT invoice, customs import declaration, or transfer contract.',
  },
  {
    type: 'INSPECTION',
    titleVi: originType === 'DIY' ? '3. Biên bản kiểm định an toàn / Giấy thử nghiệm kỹ thuật' : '3. Giấy chứng nhận kiểm định / Xuất xưởng an toàn kỹ thuật (CoC)',
    titleEn: originType === 'DIY' ? '3. Technical Safety Test Record / Airworthiness Verification' : '3. Technical Safety & Conformity Certificate (CoC)',
    descriptionVi:
      originType === 'DIY'
        ? 'Biên bản kiểm tra an toàn kỹ thuật, phiếu thử nghiệm bay đạt tiêu chuẩn hoặc bản thuyết minh kỹ thuật đã được cơ quan chức năng xác nhận.'
        : 'Giấy chứng nhận xuất xưởng của nhà sản xuất (CoC/CoA) hoặc biên bản kiểm định kỹ thuật an toàn phương tiện bay còn hạn.',
    descriptionEn:
      originType === 'DIY'
        ? 'Official airworthiness safety inspection record, flight test report, or technical specification dossier endorsed by competent authority.'
        : 'Valid manufacturer Certificate of Conformity (CoC) or authorized technical safety inspection record.',
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
  const { locale } = useLocale();
  const tr = (vi: string, en: string) => (locale === 'vi' ? vi : en);
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
        if (type === 'OWNERSHIP') {
          // Ownership document is optional because police registration certificate already validates legal origin
          return '';
        }
        throw new Error(
          locale === 'vi'
            ? `Vui lòng tải lên ${type.toLowerCase()}.`
            : `Please upload ${type.toLowerCase()} document.`,
        );
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
      setMessage(
        locale === 'vi'
          ? 'Đã gửi hồ sơ đăng ký thiết bị drone thành công! Platform Manager sẽ xác minh giấy tờ trước khi kích hoạt.'
          : 'Drone registration application submitted! Platform Manager will verify the documents before activation.',
      );
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
      (files.INSPECTION || existingFileKeys.INSPECTION),
  );

  return (
    <Box className="workspace-page">
      <PageHeader
        title={tr('Drone của tôi', 'My Drones')}
        breadcrumbs={[{ label: 'Home', to: '/operations/dashboard' }, { label: tr('Drone của tôi', 'My drones') }]}
      />

      {/* KPI METRICS OVERVIEW */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2, mt: 2 }}>
        <MetricCard
          label={tr('Drone sẵn sàng bay', 'Flight-ready Drones')}
          value={approvedDrones.length.toString()}
          change={approvedDrones.length > 0 ? tr('Sẵn sàng', 'Ready') : undefined}
          subtext={tr('Đã duyệt', 'Verified docs')}
          iconType="flight"
          positive={approvedDrones.length > 0}
        />
        <MetricCard
          label={tr('Hồ sơ đang chờ duyệt', 'Pending Applications')}
          value={pendingCount.toString()}
          change={pendingCount === 0 ? tr('Ổn định', 'Clear') : tr('Chờ', 'Pending')}
          subtext={tr('Manager xác minh', 'Verification')}
          iconType="access-time"
          positive={pendingCount === 0}
        />
        <MetricCard
          label={tr('Tổng hồ sơ đã gửi', 'Total Applications')}
          value={applicationList.length.toString()}
          change={tr('Đã lưu', 'Recorded')}
          subtext={tr('Lịch sử đăng ký', 'Registration')}
          iconType="fact-check"
          positive
        />
      </Box>

      {message && (
        <Alert severity="success" role="status" sx={{ mt: 2, borderRadius: '8px' }} onClose={() => setMessage(null)}>
          {message}
        </Alert>
      )}

      {/* TABS CHUYỂN ĐỔI: DRONE ĐÃ ĐƯỢC DUYỆT VS HỒ SƠ ĐÃ GỬI */}
      <Box sx={{ mt: 3 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: 1,
            borderColor: 'divider',
            flexWrap: 'wrap',
            gap: 1.5,
            pb: 0.5,
          }}
        >
          <Tabs
            value={tabIndex}
            onChange={(_, val) => setTabIndex(val)}
            textColor="primary"
            indicatorColor="primary"
            sx={{ '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: '0.875rem', py: 1.5 } }}
          >
            <Tab
              value="APPROVED"
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>{tr('Đội bay hoạt động', 'Active Fleet')}</span>
                  <Chip size="small" label={approvedDrones.length} color="success" sx={{ height: 20, fontSize: '0.75rem', fontWeight: 700 }} />
                </Box>
              }
            />
            <Tab
              value="APPLICATIONS"
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>{tr('Hồ sơ đăng ký đã nộp', 'Submitted Applications')}</span>
                  <Chip
                    size="small"
                    label={applicationList.length}
                    color={pendingCount > 0 ? 'warning' : 'default'}
                    sx={{ height: 20, fontSize: '0.75rem', fontWeight: 700 }}
                  />
                </Box>
              }
            />
          </Tabs>

          <Stack direction="row" spacing={1.25} sx={{ pb: { xs: 1, sm: 0 } }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshRounded />}
              onClick={() => {
                void applications.refetch();
                void drones.refetch();
              }}
              disabled={applications.isFetching || drones.isFetching}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: '8px',
                height: 38,
                borderColor: 'divider',
                color: 'text.secondary',
              }}
            >
              {applications.isFetching || drones.isFetching
                ? tr('Đang làm mới…', 'Refreshing…')
                : tr('Làm mới', 'Refresh')}
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddCircleOutlineRounded />}
              onClick={() => handleOpenRegister()}
              sx={{
                borderRadius: '8px',
                px: 2,
                height: 38,
                bgcolor: 'primary.main',
                fontWeight: 600,
                fontSize: '0.875rem',
                textTransform: 'none',
                boxShadow: 'none',
                '&:hover': { bgcolor: 'primary.dark' },
              }}
            >
              {tr('Đăng ký Drone mới', 'Register New Drone')}
            </Button>
          </Stack>
        </Box>

        <Box sx={{ pt: 2.5 }}>
          {/* TAB 1: DANH SÁCH DRONE HOẠT ĐỘNG (APPROVED) */}
          {tabIndex === 'APPROVED' && (
            <Box>
              {drones.isLoading ? (
                <Typography color="text.secondary">
                  {tr('Đang tải danh sách Drone…', 'Loading drones…')}
                </Typography>
              ) : approvedDrones.length === 0 ? (
                <Paper variant="outlined" sx={{ textAlign: 'center', py: 6, px: 2, borderRadius: '10px', borderColor: 'divider' }}>
                  <FlightTakeoffRounded sx={{ fontSize: 48, color: 'text.secondary', mb: 1.5 }} />
                  <Typography variant="h6" component="h2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {tr('Chưa có Drone nào được duyệt', 'No Approved Drones Yet')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 480, mx: 'auto', mt: 0.5, mb: 2.5 }}>
                    {tr(
                      'Hãy gửi hồ sơ đăng ký thiết bị bay kèm đầy đủ giấy tờ kỹ thuật. Platform Manager sẽ kiểm tra và kích hoạt để bạn sử dụng trong các ca kiểm định.',
                      'Submit a drone registration application with the required technical documents. The Platform Manager will verify and activate your drone for field inspections.',
                    )}
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddCircleOutlineRounded />}
                    onClick={() => handleOpenRegister()}
                    sx={{
                      borderRadius: '8px',
                      bgcolor: 'primary.main',
                      textTransform: 'none',
                      fontWeight: 600,
                      '&:hover': { bgcolor: 'primary.dark' },
                    }}
                  >
                    {tr('Bổ sung hồ sơ Drone ngay', 'Submit Drone Application')}
                  </Button>
                </Paper>
              ) : (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2.5 }}>
                  {approvedDrones.map((drone) => (
                    <Card
                      key={drone.id}
                      variant="outlined"
                      sx={{
                        p: 2.5,
                        borderRadius: '10px',
                        borderColor: 'divider',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                          <Box>
                            <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.3 }}>
                              {drone.model ?? tr('Thiết bị bay kiểm định', 'Inspection Drone')}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
                              {tr('Hãng sản xuất:', 'Manufacturer:')}{' '}
                              <strong>{drone.manufacturer || tr('Chưa cập nhật', 'Not specified')}</strong>
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
                            label={tr('ĐÃ DUYỆT', 'APPROVED')}
                            color="success"
                            size="small"
                            sx={{ fontWeight: 700, fontSize: '0.75rem', height: 24 }}
                          />
                        </Box>

                        <Divider sx={{ my: 1.75 }} />

                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, fontSize: '0.875rem' }}>
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              {tr('Số Serial thân máy:', 'Airframe Serial Number:')}
                            </Typography>
                            <Typography sx={{ fontWeight: 600, fontFamily: 'monospace', color: 'text.primary', fontSize: '0.875rem' }}>
                              {drone.serialNumber}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              {tr('Số đăng ký phương tiện:', 'Registration Number:')}
                            </Typography>
                            <Typography sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.875rem' }}>
                              {drone.registrationNumber || '—'}
                            </Typography>
                          </Box>
                          {drone.registrationExpiresAt && (
                            <Box sx={{ gridColumn: '1 / -1' }}>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <EventAvailableOutlined sx={{ fontSize: 14 }} />{' '}
                                {tr('Hạn kiểm định / đăng ký:', 'Registration / Airworthiness Expiry:')}
                              </Typography>
                              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 0.25, flexWrap: 'wrap' }}>
                                <Typography sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.875rem' }}>
                                  {new Date(drone.registrationExpiresAt).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US')}
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
                                        label={tr('Đã quá hạn đăng kiểm', 'Expired')}
                                        sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700 }}
                                      />
                                    );
                                  }
                                  if (daysLeft <= 30) {
                                    return (
                                      <Chip
                                        size="small"
                                        color="warning"
                                        label={tr(`Sắp hết hạn (${daysLeft} ngày)`, `Expiring soon (${daysLeft}d)`)}
                                        sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700 }}
                                      />
                                    );
                                  }
                                  return (
                                    <Chip
                                      size="small"
                                      color="success"
                                      variant="outlined"
                                      label={tr(`Còn hạn (${daysLeft} ngày)`, `Valid (${daysLeft}d)`)}
                                      sx={{ height: 20, fontSize: '0.68rem', fontWeight: 600 }}
                                    />
                                  );
                                })()}
                              </Stack>
                            </Box>
                          )}
                        </Box>
                      </Box>

                      <Box sx={{ mt: 2.5, pt: 1.5, borderTop: '1px dashed', borderColor: 'divider', display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
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
                          {tr('Cập nhật / Gia hạn', 'Update / Renew')}
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
                <Typography color="text.secondary">
                  {tr('Đang tải danh sách hồ sơ…', 'Loading applications…')}
                </Typography>
              ) : applicationList.length === 0 ? (
                <Paper variant="outlined" sx={{ textAlign: 'center', py: 5, px: 2, borderRadius: '10px', borderColor: 'divider' }}>
                  <AppRegistrationOutlined sx={{ fontSize: 44, color: 'text.secondary', mb: 1 }} />
                  <Typography variant="h6" component="h2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                    {tr('Chưa có hồ sơ đăng ký nào', 'No Registration Applications Yet')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
                    {tr(
                      'Tất cả các hồ sơ nộp lên sẽ được lưu vết và theo dõi trạng thái thẩm định tại đây.',
                      'All submitted drone registration applications and their verification status will appear here.',
                    )}
                  </Typography>
                </Paper>
              ) : (
                <Stack spacing={2}>
                  {applicationList.map((app) => (
                    <Paper
                      key={app.id}
                      variant="outlined"
                      sx={{
                        p: 2.5,
                        borderRadius: '10px',
                        borderColor:
                          app.status === 'APPROVED'
                            ? 'success.light'
                            : app.status === 'REJECTED'
                              ? 'error.light'
                              : 'divider',
                        bgcolor: 'background.paper',
                        display: 'flex',
                        flexDirection: { xs: 'column', md: 'row' },
                        justifyContent: 'space-between',
                        alignItems: { xs: 'flex-start', md: 'center' },
                        gap: 2,
                      }}
                    >
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.875rem' }}>
                            {app.model || 'Drone'}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            ({app.manufacturer || tr('Hãng chưa rõ', 'Unknown manufacturer')})
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, fontSize: '0.875rem' }}>
                          {tr('Số Serial:', 'Serial:')} <strong style={{ fontFamily: 'monospace' }}>{app.serialNumber}</strong> ·{' '}
                          {tr('Số đăng ký:', 'Registration No.:')} <strong>{app.registrationNumber}</strong> ·{' '}
                          {tr('Nộp ngày:', 'Submitted:')}{' '}
                          {new Date(app.createdAt).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US')}
                        </Typography>
                        {app.reviewNote && (
                          <Alert severity={app.status === 'REJECTED' ? 'error' : 'info'} sx={{ mt: 1, py: 0.25, px: 1.5, fontSize: '0.75rem' }}>
                            <strong>{tr('Phản hồi của Manager:', 'Manager review note:')}</strong> {app.reviewNote}
                          </Alert>
                        )}
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
                        <Chip
                          label={
                            app.status === 'APPROVED'
                              ? tr('ĐÃ PHÊ DUYỆT', 'APPROVED')
                              : app.status === 'REJECTED'
                                ? tr('TỪ CHỐI / CẦN SỬA', 'REJECTED / REVISION NEEDED')
                                : tr('ĐANG CHỜ DUYỆT', 'PENDING REVIEW')
                          }
                          color={
                            app.status === 'APPROVED'
                              ? 'success'
                              : app.status === 'REJECTED'
                                ? 'error'
                                : 'warning'
                          }
                          sx={{ fontWeight: 700, fontSize: '0.75rem' }}
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
                            sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem' }}
                          >
                            {tr('Nộp lại hồ sơ', 'Resubmit Application')}
                          </Button>
                        )}
                      </Box>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Box>
          )}
        </Box>
      </Box>

      {/* MODAL DIALOG: THỰC HIỆN ĐĂNG KÝ VÀ CẬP NHẬT DRONE */}
      <Dialog
        open={openRegisterDialog}
        onClose={() => setOpenRegisterDialog(false)}
        maxWidth="md"
        fullWidth
        scroll="paper"
        slotProps={{ paper: { sx: { borderRadius: '10px' } } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <FlightTakeoffRounded color="primary" />
            <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>
              {tr('Khai báo hồ sơ Drone', 'Drone Registration Application')}
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setOpenRegisterDialog(false)} aria-label={tr('Đóng', 'Close')}>
            <CloseRounded />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ p: { xs: 2.5, sm: 3.5 } }}>
          <Stack component="form" id="drone-register-form" spacing={3} onSubmit={handleSubmit}>
            {/* THÔNG SỐ KỸ THUẬT */}
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                {tr('1. Thông tin & Thông số kỹ thuật', '1. Airframe Identification & Specifications')}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {tr(
                  'Nhập chính xác tên, số Serial và thông số kỹ thuật của thiết bị bay.',
                  'Enter the exact model name, airframe serial number, and technical specifications.',
                )}
              </Typography>

              <Box sx={{ mb: 2.5, p: 2, bgcolor: '#F8FBFA', borderRadius: '8px', border: '1px solid #D6E4E0' }}>
                <FormControl component="fieldset">
                  <FormLabel component="legend" sx={{ fontWeight: 700, fontSize: '13.5px', color: '#173B36', mb: 1 }}>
                    {tr('Nguồn gốc thiết bị bay (Theo Luật Phòng không nhân dân 2024 & TT 78/2026/TT-BCA):', 'Airframe Origin (Under Air Defense Law 2024 & Circular 78/2026):')}
                  </FormLabel>
                  <RadioGroup
                    row
                    value={form.droneOriginType}
                    onChange={(e) => {
                      const origin = e.target.value as 'COMMERCIAL' | 'DIY';
                      setForm((current) => ({
                        ...current,
                        droneOriginType: origin,
                        manufacturer: origin === 'DIY' ? (current.manufacturer || 'Tự lắp ráp (DIY / Custom-built)') : (current.manufacturer === 'Tự lắp ráp (DIY / Custom-built)' ? '' : current.manufacturer),
                        droneName: origin === 'DIY' ? (current.droneName || 'Drone tự lắp ráp kiểm định') : current.droneName,
                      }));
                    }}
                  >
                    <FormControlLabel
                      value="COMMERCIAL"
                      control={<Radio size="small" sx={{ color: '#087E8B', '&.Mui-checked': { color: '#087E8B' } }} />}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <PrecisionManufacturingOutlined sx={{ fontSize: 18, color: '#087E8B' }} />
                          <Typography sx={{ fontSize: '13.5px', fontWeight: 600 }}>
                            {tr('Thiết bị thương mại chính hãng (DJI, Autel...)', 'Commercial Ready-to-Fly (DJI, Autel...)')}
                          </Typography>
                        </Box>
                      }
                    />
                    <FormControlLabel
                      value="DIY"
                      control={<Radio size="small" sx={{ color: '#087E8B', '&.Mui-checked': { color: '#087E8B' } }} />}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <HandymanOutlined sx={{ fontSize: 18, color: '#087E8B' }} />
                          <Typography sx={{ fontSize: '13.5px', fontWeight: 600 }}>
                            {tr('Drone tự lắp ráp / Tự chế kỹ thuật (DIY / Custom-built)', 'Custom-built / DIY Drone')}
                          </Typography>
                        </Box>
                      }
                    />
                  </RadioGroup>
                </FormControl>

                {form.droneOriginType === 'DIY' && (
                  <Alert severity="warning" sx={{ mt: 1.5, py: 0.5, fontSize: '12.5px', borderRadius: '6px' }}>
                    <strong>Lưu ý pháp lý cho Drone tự build (Thông tư 78/2026/TT-BCA):</strong> Phương tiện bay tự lắp ráp vẫn bắt buộc phải đăng ký với cơ quan Công an để được cấp Giấy chứng nhận đăng ký, gắn tem/mã định danh quản lý bay và có biên bản kiểm định an toàn kỹ thuật trước khi được xét duyệt bay kiểm định.
                  </Alert>
                )}
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <TextField
                  required
                  label={form.droneOriginType === 'DIY' ? tr('Tên cấu hình Drone tự build *', 'Custom Drone Name *') : tr('Tên Drone / Model *', 'Drone Model *')}
                  placeholder={form.droneOriginType === 'DIY' ? tr('VD: CineLifter 7-inch, VTOL Mapping DIY', 'e.g. CineLifter 7-inch, VTOL Mapping DIY') : tr('VD: DJI Matrice 350 RTK, Autel EVO Max 4T', 'e.g. DJI Matrice 350 RTK, Autel EVO Max 4T')}
                  value={form.droneName}
                  onChange={updateField('droneName')}
                  helperText={form.droneOriginType === 'DIY' ? tr('Tên định danh cấu hình phương tiện tự lắp ráp', 'Custom build project designation') : tr('Tên thương mại đầy đủ của thiết bị', 'Full commercial model designation')}
                />
                <TextField
                  required
                  label={form.droneOriginType === 'DIY' ? tr('Đơn vị / Cá nhân lắp ráp *', 'Builder / Assembler *') : tr('Hãng sản xuất *', 'Manufacturer *')}
                  placeholder={form.droneOriginType === 'DIY' ? tr('Tự lắp ráp (DIY / Custom-built)', 'Custom-built') : tr('VD: DJI, Autel Robotics, Skydio', 'e.g. DJI, Autel Robotics, Skydio')}
                  value={form.manufacturer}
                  onChange={updateField('manufacturer')}
                  helperText={form.droneOriginType === 'DIY' ? tr('Cá nhân hoặc xưởng cơ khí/điện tử chế tạo', 'Individual assembler or custom drone lab') : tr('Hãng chế tạo nguyên chiếc', 'Airframe manufacturer')}
                />
                <TextField
                  required
                  label={form.droneOriginType === 'DIY' ? tr('Mã Serial Mạch điều khiển bay (FC Serial / MCU ID) *', 'Flight Controller (FC) Serial / MCU ID *') : tr('Số Serial thân máy (Airframe Serial Number) *', 'Airframe Serial Number *')}
                  placeholder={form.droneOriginType === 'DIY' ? tr('VD: FC-STM32H7-0091823 hoặc Pixhawk SN', 'e.g. FC-STM32H7-0091823 or Pixhawk SN') : tr('VD: 1581F4B0C2301001', 'e.g. 1581F4B0C2301001')}
                  value={form.serialNumber}
                  onChange={updateField('serialNumber')}
                  helperText={form.droneOriginType === 'DIY' ? tr('Mã số định danh chip/mạch FC hoặc số khung máy', 'Unique FC hardware UID or airframe serial') : tr('Mã số duy nhất in trên tem thân máy (phải khớp hóa đơn/tờ khai)', 'Unique airframe serial number')}
                />
                <TextField
                  required
                  label={tr('Số Đăng ký Phương tiện bay (Bộ Công an cấp) *', 'UAV Registration Number (Police Authority) *')}
                  placeholder={tr('VD: ĐK-2026-00892', 'e.g. DK-2026-00892')}
                  value={form.registrationNumber}
                  onChange={updateField('registrationNumber')}
                  helperText={tr(
                    'Số trên Giấy chứng nhận đăng ký do Công an tỉnh/TP hoặc Cục A05 cấp',
                    'Registration number issued by Provincial Police or Cyber Security Dept (A05)',
                  )}
                />
                <TextField
                  required
                  type="date"
                  label={tr('Ngày hết hạn đăng ký / kiểm định *', 'Registration / Airworthiness Expiry Date *')}
                  value={form.registrationExpiresAt}
                  onChange={updateField('registrationExpiresAt')}
                  slotProps={{ inputLabel: { shrink: true } }}
                  helperText={tr(
                    'Thời hạn kiểm định/đăng ký phương tiện bay',
                    'Airworthiness registration validity period',
                  )}
                />
                <TextField
                  label={tr('Trọng lượng cất cánh tối đa MTOW (kg) *', 'Max Takeoff Weight MTOW (kg) *')}
                  placeholder={tr('VD: 4.07', 'e.g. 4.07')}
                  value={form.mtowKg}
                  onChange={updateField('mtowKg')}
                  helperText={tr(
                    'Căn cứ phân Loại 1 – Loại 5 phương tiện bay theo Điều 4 Nghị định 288/2025/NĐ-CP',
                    'Basis for Category 1 to 5 classification under Decree 288/2025/ND-CP',
                  )}
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
                  label={tr('Thời gian bay tối đa', 'Max Flight Endurance')}
                  placeholder={tr('VD: 55 phút', 'e.g. 55 mins')}
                  value={form.maxFlightTimeMinutes}
                  onChange={updateField('maxFlightTimeMinutes')}
                />
                <TextField
                  label={tr('Tải trọng Cảm biến / Camera (Payload)', 'Camera / Sensor Payload')}
                  placeholder={tr('VD: Zenmuse H20T (Camera nhiệt + Zoom 23x)', 'e.g. Zenmuse H20T (Thermal + 23x Optical Zoom)')}
                  value={form.cameraSensor}
                  onChange={updateField('cameraSensor')}
                />
                <Box sx={{ gridColumn: { xs: '1 / -1' } }}>
                  <TextField
                    fullWidth
                    label={tr('Tính năng an toàn & Hệ thống hỗ trợ', 'Safety Features & Avionics')}
                    placeholder={tr(
                      'VD: Geofencing tự né vùng cấm bay, Failsafe Return-to-Home, Cảm biến tránh va chạm 6 hướng',
                      'e.g. No-Fly Zone geofencing, Failsafe Return-to-Home, 6-directional obstacle sensing',
                    )}
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
                {tr(
                  '2. Hình ảnh giấy tờ bắt buộc (Chụp ảnh / Scan rõ nét)',
                  '2. Mandatory Supporting Documents (Clear Photo / Scan)',
                )}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {tr(
                  'Yêu cầu hình ảnh rõ nét số Serial, số đăng ký và con dấu kiểm định (PNG, JPG, PDF tối đa 10 MB/file).',
                  'Ensure serial numbers, registration numbers, and official stamps are legible (PNG, JPG, PDF up to 10 MB per file).',
                )}
              </Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
                {getRequiredDocuments(form.droneOriginType).map((doc) => {
                  const file = files[doc.type];
                  const preview = previews[doc.type];
                  const docTitle = locale === 'vi' ? doc.titleVi : doc.titleEn;
                  const docDescription = locale === 'vi' ? doc.descriptionVi : doc.descriptionEn;

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
                        borderRadius: '10px',
                        border: '1.5px solid',
                        borderColor: file ? 'success.main' : 'divider',
                        bgcolor: 'background.paper',
                      }}
                    >
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                          {file ? (
                            <CheckCircleRounded sx={{ color: 'success.main', fontSize: 18 }} />
                          ) : (
                            <CloudUploadOutlined sx={{ color: 'text.secondary', fontSize: 18 }} />
                          )}
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.875rem' }}>
                            {docTitle}
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.25 }}>
                          {docDescription}
                        </Typography>

                        {preview ? (
                          <Box sx={{ mb: 1.25, position: 'relative', borderRadius: '8px', overflow: 'hidden' }}>
                            <CardMedia
                              component="img"
                              height="120"
                              image={preview}
                              alt={docTitle}
                              sx={{ objectFit: 'contain', bgcolor: 'action.hover' }}
                            />
                            <IconButton
                              size="small"
                              color="error"
                              aria-label={tr('Xóa tệp', 'Remove file')}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveFile(doc.type);
                              }}
                              sx={{
                                position: 'absolute',
                                top: 4,
                                right: 4,
                                bgcolor: 'background.paper',
                                '&:hover': { bgcolor: 'background.default' },
                                zIndex: 15,
                              }}
                            >
                              <DeleteOutlineRounded fontSize="small" />
                            </IconButton>
                          </Box>
                        ) : file ? (
                          <Box sx={{ mb: 1.25, p: 0.75, bgcolor: 'background.default', borderRadius: '8px', border: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.75rem' }} noWrap>
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
                          sx={{ textTransform: 'none', borderRadius: '8px', pointerEvents: 'none', fontSize: '0.75rem' }}
                        >
                          {file ? tr('Đổi tệp khác', 'Replace file') : tr('Chọn tệp giấy tờ', 'Choose document')}
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
                  return detail
                    ? tr(`Không thể gửi hồ sơ: ${detail}`, `Could not submit application: ${detail}`)
                    : tr('Không thể gửi hồ sơ đăng ký. Vui lòng thử lại.', 'Could not submit application. Please try again.');
                })()}
              </Alert>
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setOpenRegisterDialog(false)} color="inherit" sx={{ textTransform: 'none', fontWeight: 600 }}>
            {tr('Hủy', 'Cancel')}
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
              bgcolor: 'primary.main',
              fontWeight: 600,
              textTransform: 'none',
              boxShadow: 'none',
              '&:hover': { bgcolor: 'primary.dark' },
            }}
          >
            {submit.isPending
              ? tr('Đang gửi hồ sơ…', 'Submitting…')
              : tr('Gửi hồ sơ Drone để duyệt', 'Submit Drone Application')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
