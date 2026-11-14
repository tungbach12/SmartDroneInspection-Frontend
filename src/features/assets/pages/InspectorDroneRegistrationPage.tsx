import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  CardMedia,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
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
import { droneDocumentConfigApi } from '../api/droneDocumentConfigApi';
import { droneFeatureConfigApi } from '../api/droneFeatureConfigApi';
import {
  mf1DroneApi,
  uploadDroneEvidence,
  type DroneRegistrationInput,
  type InspectorDrone,
  type DroneRegistrationApplication,
} from '../api/mf1DroneApi';
import { PageHeader } from '@/shared/ui/PageHeader';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
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
  maxWindResistanceMps: string;
  maxAltitudeMeters: string;
  opticalZoomLevel: string;
  features: string[];
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
  maxWindResistanceMps: '12',
  maxAltitudeMeters: '',
  opticalZoomLevel: '1',
  features: ['RTK_POSITIONING'],
};

type ConfiguredDroneDocument = {
  code: string;
  titleVi: string;
  titleEn: string;
  descriptionVi: string;
  descriptionEn: string;
  isRequired: boolean;
};

const DEFAULT_FEATURES: Array<{
  code: string;
  nameVi: string;
  nameEn: string;
  category: string;
}> = [
  { code: 'RTK_POSITIONING', nameVi: 'Định vị chính xác RTK', nameEn: 'RTK GNSS Positioning', category: 'CAPABILITY' },
  { code: 'THERMAL_CAMERA', nameVi: 'Camera nhiệt (Thermal)', nameEn: 'Thermal Camera', category: 'CAPABILITY' },
  { code: 'LIDAR_SCANNER', nameVi: 'Cảm biến quét LiDAR', nameEn: 'LiDAR Scanner', category: 'CAPABILITY' },
  { code: 'OBSTACLE_AVOIDANCE', nameVi: 'Tránh va chạm đa hướng', nameEn: 'Omnidirectional Obstacle Sensing', category: 'SAFETY' },
  { code: 'FAILSAFE_RTH', nameVi: 'Tự quay về khi mất sóng (RTH)', nameEn: 'Failsafe Return-to-Home (RTH)', category: 'SAFETY' },
  { code: 'WEATHERPROOF_IP', nameVi: 'Kháng nước & bụi (IP54/IP55)', nameEn: 'Weatherproof (IP54/IP55)', category: 'SAFETY' },
];

const DEFAULT_DOCUMENTS: ConfiguredDroneDocument[] = [
  {
    code: 'REGISTRATION',
    titleVi: 'Đăng ký drone',
    titleEn: 'Drone Registration',
    descriptionVi: 'Giấy chứng nhận đăng ký hoặc đăng ký tạm thời',
    descriptionEn: 'Official registration certificate',
    isRequired: true,
  },
  {
    code: 'OWNERSHIP',
    titleVi: 'Chứng từ sở hữu',
    titleEn: 'Proof of Ownership',
    descriptionVi: 'Hóa đơn tài chính, hợp đồng hoặc tờ khai hải quan',
    descriptionEn: 'Invoice, sales contract, or customs form',
    isRequired: true,
  },
  {
    code: 'INSPECTION',
    titleVi: 'Kiểm định kỹ thuật',
    titleEn: 'Technical Inspection',
    descriptionVi: 'Chứng nhận/biên bản kiểm định an toàn kỹ thuật',
    descriptionEn: 'Technical safety inspection certificate',
    isRequired: true,
  },
];

function parseDroneModelDisplay(rawModel?: string | null): {
  name: string;
  mtow: string | null;
  flightTime: string | null;
  camera: string | null;
} {
  if (!rawModel) return { name: 'Drone', mtow: null, flightTime: null, camera: null };
  const bracketIdx = rawModel.indexOf('[');
  const name = bracketIdx >= 0 ? rawModel.slice(0, bracketIdx).trim() : rawModel.trim();
  const mtowMatch = rawModel.match(/MTOW:\s*([^|\]]+)/i);
  const timeMatch = rawModel.match(/Thời gian bay:\s*([^|\]]+)/i);
  const camMatch = rawModel.match(/Camera(?:\s*\/\s*Sensor)?:\s*([^|\]]+)/i);
  return {
    name: name || rawModel,
    mtow: mtowMatch?.[1]?.trim() ?? null,
    flightTime: timeMatch?.[1]?.trim() ?? null,
    camera: camMatch?.[1]?.trim() ?? null,
  };
}

function classifyDroneByMtow(rawText?: string | number | null): {
  categoryCode: string;
  categoryLabel: string;
  requiredLicenseLabel: string;
  requiresClassB: boolean;
} | null {
  if (rawText == null || rawText === '') return null;
  let mtow: number;
  if (typeof rawText === 'number') {
    mtow = rawText;
  } else {
    const explicitMatch = rawText.match(/MTOW:\s*(\d+(?:[.,]\d+)?)/i);
    const pureNumberMatch = rawText.trim().match(/^(\d+(?:[.,]\d+)?)\s*(?:kg)?$/i);
    const matchedStr = explicitMatch?.[1] ?? pureNumberMatch?.[1];
    if (!matchedStr) return null;
    mtow = Number(matchedStr.replace(',', '.'));
  }
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
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [previews, setPreviews] = useState<Record<string, string | null>>({});
  const [existingFileKeys, setExistingFileKeys] = useState<Record<string, string | null>>({});
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const [existingImageKeys, setExistingImageKeys] = useState<string[]>([]);
  const [editingApplicationId, setEditingApplicationId] = useState<string | null>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [openRegisterDialog, setOpenRegisterDialog] = useState(false);
  const [tabIndex, setTabIndex] = useState<'APPROVED' | 'APPLICATIONS'>('APPROVED');

  const queryClient = useQueryClient();
  const isInspector = useAuthStore((state) => state.roles).includes('INSPECTOR');

  const docConfigsQuery = useQuery({
    queryKey: ['drone-document-configs-active'],
    queryFn: () => droneDocumentConfigApi.list(false),
  });
  const activeConfigs = docConfigsQuery.data ?? [];
  const effectiveConfigs = activeConfigs.length > 0 ? activeConfigs : DEFAULT_DOCUMENTS;

  const featureConfigsQuery = useQuery({
    queryKey: ['drone-feature-configs-active'],
    queryFn: () => droneFeatureConfigApi.list(false),
  });
  const activeFeatureConfigs = featureConfigsQuery.data ?? [];
  const effectiveFeatures = activeFeatureConfigs.length > 0 ? activeFeatureConfigs : DEFAULT_FEATURES;

  const applications = useQuery({
    queryKey: ['inspector-drone-applications'],
    queryFn: mf1DroneApi.mine,
    enabled: isInspector,
    refetchInterval: isInspector ? 10000 : false,
    retry: false,
  });

  const [droneToDelete, setDroneToDelete] = useState<InspectorDrone | null>(null);
  const [fleetActionError, setFleetActionError] = useState<string | null>(null);

  const serviceabilityMutation = useMutation({
    mutationFn: ({ droneId, serviceability }: { droneId: string; serviceability: 'ACTIVE' | 'MAINTENANCE' }) =>
      mf1DroneApi.updateMyDroneServiceability(droneId, serviceability),
    onSuccess: async () => {
      setFleetActionError(null);
      await queryClient.invalidateQueries({ queryKey: ['mf1', 'inspector', 'drones'] });
    },
    onError: (err) => {
      setFleetActionError(
        err instanceof Error
          ? err.message
          : tr('Không thể cập nhật trạng thái hoạt động của drone.', 'Could not update drone serviceability.'),
      );
    },
  });

  const deleteDroneMutation = useMutation({
    mutationFn: (droneId: string) => mf1DroneApi.deleteMyDrone(droneId),
    onSuccess: async () => {
      setFleetActionError(null);
      setDroneToDelete(null);
      await queryClient.invalidateQueries({ queryKey: ['mf1', 'inspector', 'drones'] });
    },
    onError: (err) => {
      setFleetActionError(
        err instanceof Error
          ? err.message
          : tr('Không thể xóa drone. Vui lòng thử lại.', 'Could not delete drone. Please try again.'),
      );
    },
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
      const uploadedMap: Record<string, string> = {};
      for (const doc of effectiveConfigs) {
        const file = files[doc.code];
        if (file) {
          uploadedMap[doc.code] = await uploadDroneEvidence(file, doc.code);
        } else if (existingFileKeys[doc.code]) {
          uploadedMap[doc.code] = existingFileKeys[doc.code]!;
        } else if (doc.isRequired) {
          throw new Error(
            locale === 'vi'
              ? `Vui lòng tải lên ${doc.titleVi}.`
              : `Please upload ${doc.titleEn}.`,
          );
        }
      }

      const uploadedImageKeys: string[] = [];
      for (const img of imageFiles) {
        const key = await uploadDroneEvidence(img, 'DRONE_IMAGE');
        uploadedImageKeys.push(key);
      }
      const finalImageKeys = [...existingImageKeys, ...uploadedImageKeys];
      if (finalImageKeys.length === 0) {
        throw new Error(
          locale === 'vi'
            ? 'Vui lòng tải lên ít nhất 1 hình ảnh của thiết bị bay.'
            : 'Please upload at least 1 drone photo.',
        );
      }

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
      if (formData.cameraSensor) {
        const cam = formData.cameraSensor.toUpperCase().includes('MP') ? formData.cameraSensor.trim() : `${formData.cameraSensor.trim()} MP`;
        specsParts.push(`Camera: ${cam}`);
      }
      const zoomValue = formData.opticalZoomLevel ? formData.opticalZoomLevel.replace(/[^0-9.]/g, '') : '';
      const features = formData.features;
      const hasThermal = features.includes('THERMAL_CAMERA');
      const hasRtk = features.includes('RTK_POSITIONING');

      const formattedModel =
        specsParts.length > 0 ? `${formData.droneName.trim()} [${specsParts.join(' | ')}]` : formData.droneName.trim();
      const finalModel = formattedModel.length > 1000 ? formattedModel.slice(0, 1000) : formattedModel;

      const input: DroneRegistrationInput = {
        serialNumber: formData.serialNumber.trim(),
        model: finalModel,
        manufacturer: formData.manufacturer.trim(),
        registrationNumber: formData.registrationNumber.trim(),
        registrationExpiresAt: new Date(formData.registrationExpiresAt).toISOString(),
        registrationFileKey: uploadedMap['REGISTRATION'] || '',
        ownershipFileKey: uploadedMap['OWNERSHIP'] || '',
        inspectionFileKey: uploadedMap['INSPECTION'] || undefined,
        maxWindResistanceMps: formData.maxWindResistanceMps ? Number(formData.maxWindResistanceMps) : undefined,
        maxAltitudeMeters:
          formData.maxAltitudeMeters.trim() === '' ? undefined : Number(formData.maxAltitudeMeters),
        opticalZoomLevel: zoomValue ? `${zoomValue}x` : '1x',
        hasThermalCamera: hasThermal,
        hasRtk,
        documentFiles: uploadedMap,
        imageFileKeys: finalImageKeys,
        features,
      };

      if (editingApplicationId) {
        return mf1DroneApi.resubmit(editingApplicationId, input);
      }
      return mf1DroneApi.submit(input);
    },
    onSuccess: async () => {
      setForm(initialForm);
      setEditingApplicationId(null);
      setExistingFileKeys({});
      Object.values(previews).forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));
      setFiles({});
      setPreviews({});
      setImageFiles([]);
      setImagePreviews([]);
      setImageError(null);
      setExistingImageKeys([]);
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

  const handleFileChange = (code: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (previews[code]) {
      URL.revokeObjectURL(previews[code]!);
    }
    setFiles((current) => ({ ...current, [code]: file }));
    if (file && file.type.startsWith('image/')) {
      setPreviews((current) => ({ ...current, [code]: URL.createObjectURL(file) }));
    } else {
      setPreviews((current) => ({ ...current, [code]: null }));
    }
  };

  const handleRemoveFile = (code: string) => {
    if (previews[code]) {
      URL.revokeObjectURL(previews[code]!);
    }
    setFiles((current) => ({ ...current, [code]: null }));
    setPreviews((current) => ({ ...current, [code]: null }));
  };

  const handleImageFilesAdd = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    if (selected.length === 0) return;
    const oversizedFile = selected.find((file) => file.size > 10 * 1024 * 1024);
    const invalidFile = selected.find((file) => !['image/png', 'image/jpeg', 'image/webp'].includes(file.type));
    if (oversizedFile || invalidFile) {
      setImageError(
        tr(
          oversizedFile ? 'Mỗi ảnh không được vượt quá 10 MB.' : 'Chỉ chấp nhận ảnh PNG, JPG hoặc WebP.',
          oversizedFile ? 'Each photo must be 10 MB or smaller.' : 'Only PNG, JPG, or WebP photos are accepted.',
        ),
      );
      event.target.value = '';
      return;
    }
    setImageError(null);
    const newPreviews = selected.map((f) => URL.createObjectURL(f));
    setImageFiles((prev) => [...prev, ...selected]);
    setImagePreviews((prev) => [...prev, ...newPreviews]);
    event.target.value = '';
  };

  const handleRemoveImage = (index: number) => {
    if (index < existingImageKeys.length) {
      setExistingImageKeys((prev) => prev.filter((_, i) => i !== index));
    } else {
      const fileIdx = index - existingImageKeys.length;
      if (imagePreviews[fileIdx]) URL.revokeObjectURL(imagePreviews[fileIdx]);
      setImageFiles((prev) => prev.filter((_, i) => i !== fileIdx));
      setImagePreviews((prev) => prev.filter((_, i) => i !== fileIdx));
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setSubmitAttempted(true);

    const missingFields =
      !form.droneName.trim() ||
      !form.manufacturer.trim() ||
      !form.serialNumber.trim() ||
      !form.registrationNumber.trim() ||
      !form.registrationExpiresAt;
    const altitudeValue = form.maxAltitudeMeters.trim();
    const invalidAltitude =
      altitudeValue !== '' &&
      (!Number.isFinite(Number(altitudeValue)) || Number(altitudeValue) < 0);

    if (missingFields || invalidAltitude || !hasAtLeastOneImage || !allDocumentsUploaded) {
      return;
    }

    submit.mutate(form);
  };

  const handleOpenRegister = (
    initialData?: Partial<DroneFormState>,
    existingApp?: {
      id: string;
      registrationFileKey?: string | null;
      ownershipFileKey?: string | null;
      inspectionFileKey?: string | null;
      documentFiles?: Record<string, string> | null;
      imageFileKeys?: string[] | null;
    },
  ) => {
    setSubmitAttempted(false);
    if (initialData) {
      setForm({ ...initialForm, ...initialData });
    } else {
      setForm(initialForm);
    }
    setEditingApplicationId(existingApp?.id ?? null);
    const initialKeys: Record<string, string | null> = {};
    if (existingApp?.documentFiles) {
      Object.entries(existingApp.documentFiles).forEach(([k, v]) => {
        initialKeys[k] = v;
      });
    }
    if (existingApp?.registrationFileKey) initialKeys['REGISTRATION'] = existingApp.registrationFileKey;
    if (existingApp?.ownershipFileKey) initialKeys['OWNERSHIP'] = existingApp.ownershipFileKey;
    if (existingApp?.inspectionFileKey) initialKeys['INSPECTION'] = existingApp.inspectionFileKey;
    setExistingFileKeys(initialKeys);
    setFiles({});
    setPreviews({});
    imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    setImageFiles([]);
    setImagePreviews([]);
    setExistingImageKeys(existingApp?.imageFileKeys ? [...existingApp.imageFileKeys] : []);
    setOpenRegisterDialog(true);
  };

  const hasAtLeastOneImage = imageFiles.length > 0 || existingImageKeys.length > 0;
  const requiredDocumentCodes = new Set(effectiveConfigs.filter((doc) => doc.isRequired).map((doc) => doc.code));
  const allDocumentsUploaded = [...requiredDocumentCodes].every((code) => {
    if (code === 'OWNERSHIP') return true;
    if (code === 'REGISTRATION') return Boolean(files[code] || existingFileKeys[code]);
    if (code === 'INSPECTION') return Boolean(files[code] || existingFileKeys[code]);
    return Boolean(files[code] || existingFileKeys[code]);
  });

  return (
    <Box className="workspace-page">
      <PageHeader
        title={tr('Drone của tôi', 'My Drones')}
        breadcrumbs={[{ label: tr('Vận hành', 'Operations'), to: '/operations/dashboard' }, { label: tr('Drone của tôi', 'My drones') }]}
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
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1.5 }}>
                          <Box sx={{ display: 'flex', gap: 1.75, alignItems: 'flex-start', minWidth: 0 }}>
                            {(drone.primaryImageKey || (drone.imageFileKeys && drone.imageFileKeys.length > 0)) && (
                              <Box
                                sx={{
                                  width: 76,
                                  height: 76,
                                  flexShrink: 0,
                                  borderRadius: '8px',
                                  overflow: 'hidden',
                                  border: 1,
                                  borderColor: 'divider',
                                  bgcolor: 'action.hover',
                                  '& img': { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
                                }}
                              >
                                <AuthenticatedImage
                                  src={`/api/v1/drone-registration-applications/drones/${drone.id}/image?index=0`}
                                  alt={drone.model || drone.serialNumber}
                                  maxHeight={76}
                                />
                              </Box>
                            )}
                            <Box sx={{ minWidth: 0 }}>
                              {(() => {
                                const parsed = parseDroneModelDisplay(drone.model);
                                return (
                                  <>
                                    <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.3 }}>
                                      {parsed.name}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
                                      {tr('Hãng sản xuất:', 'Manufacturer:')}{' '}
                                      <strong>{drone.manufacturer || tr('Chưa cập nhật', 'Not specified')}</strong>
                                      {parsed.camera ? ` · Cam: ${parsed.camera}` : ''}
                                      {parsed.flightTime ? ` · ${parsed.flightTime}` : ''}
                                    </Typography>
                                  </>
                                );
                              })()}
                              {(() => {
                                const legalClass = classifyDroneByMtow(drone.mtowKg ?? drone.model);
                                if (!legalClass) return null;
                                return (
                                  <Stack direction="row" spacing={0.75} sx={{ mt: 0.75, flexWrap: 'wrap', gap: 0.5 }}>
                                    <Chip
                                      size="small"
                                      variant="outlined"
                                      color={legalClass.requiresClassB ? 'info' : 'default'}
                                      label={legalClass.categoryCode}
                                      sx={{ height: 22, fontSize: '0.75rem', fontWeight: 600, borderRadius: '6px' }}
                                    />
                                    <Chip
                                      size="small"
                                      variant="outlined"
                                      label={legalClass.requiresClassB ? tr('Yêu cầu Bằng Hạng B', 'Requires Class B') : tr('Bằng Hạng A/B', 'Class A/B')}
                                      sx={{ height: 22, fontSize: '0.75rem', fontWeight: 600, borderRadius: '6px' }}
                                    />
                                  </Stack>
                                );
                              })()}
                            </Box>
                          </Box>
                          <Chip
                            icon={<VerifiedUserOutlined style={{ fontSize: 14 }} />}
                            label={tr('ĐÃ DUYỆT', 'APPROVED')}
                            color="success"
                            size="small"
                            sx={{ fontWeight: 700, fontSize: '0.75rem', height: 24, flexShrink: 0 }}
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
                          {(drone.maxWindResistanceMps != null || drone.maxAltitudeMeters != null || (drone.opticalZoomLevel && !['1', '1x', 'NONE_1X'].includes(drone.opticalZoomLevel))) && (
                            <Box sx={{ gridColumn: '1 / -1' }}>
                              <Typography variant="caption" color="text.secondary">
                                {[
                                  drone.maxWindResistanceMps != null ? `${tr('Kháng gió', 'Wind')}: ${drone.maxWindResistanceMps} m/s` : null,
                                  drone.maxAltitudeMeters != null ? `${tr('Trần bay khai báo', 'Declared max altitude')}: ${drone.maxAltitudeMeters} m` : null,
                                  drone.opticalZoomLevel && !['1', '1x', 'NONE_1X'].includes(drone.opticalZoomLevel)
                                    ? `Zoom: ${drone.opticalZoomLevel}`
                                    : null,
                                ]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </Typography>
                            </Box>
                          )}
                          {(drone.hasThermalCamera || drone.hasRtk || (drone.features && drone.features.length > 0)) && (
                            <Box sx={{ gridColumn: '1 / -1', display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 0.25 }}>
                              {drone.features && drone.features.length > 0 ? (
                                drone.features.map((code) => {
                                  const f = effectiveFeatures.find((item) => item.code === code);
                                  const label = f ? (locale === 'vi' ? f.nameVi : f.nameEn) : code;
                                  return (
                                    <Chip
                                      key={code}
                                      size="small"
                                      label={label}
                                      sx={{
                                        height: 22,
                                        fontSize: '0.75rem',
                                        fontWeight: 500,
                                        borderRadius: '6px',
                                        bgcolor: 'action.hover',
                                        color: 'text.primary',
                                      }}
                                    />
                                  );
                                })
                              ) : (
                                <>
                                  {drone.hasThermalCamera && (
                                    <Chip size="small" label={tr('Camera nhiệt', 'Thermal')} sx={{ height: 22, fontSize: '0.75rem', borderRadius: '6px', bgcolor: 'action.hover' }} />
                                  )}
                                  {drone.hasRtk && (
                                    <Chip size="small" label="RTK GNSS" sx={{ height: 22, fontSize: '0.75rem', borderRadius: '6px', bgcolor: 'action.hover' }} />
                                  )}
                                </>
                              )}
                            </Box>
                          )}
                        </Box>
                      </Box>

                      <Box
                        sx={{
                          mt: 2.5,
                          pt: 1.5,
                          borderTop: '1px dashed',
                          borderColor: 'divider',
                          display: 'flex',
                          justifyContent: 'flex-end',
                          flexWrap: 'wrap',
                          gap: 1,
                        }}
                      >
                        <Button
                          size="small"
                          variant="outlined"
                          color={drone.serviceability === 'ACTIVE' ? 'warning' : 'success'}
                          disabled={serviceabilityMutation.isPending}
                          onClick={() =>
                            serviceabilityMutation.mutate({
                              droneId: drone.id,
                              serviceability:
                                drone.serviceability === 'ACTIVE' ? 'MAINTENANCE' : 'ACTIVE',
                            })
                          }
                          sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
                        >
                          {drone.serviceability === 'ACTIVE'
                            ? tr('Unactive (Đang sửa chữa)', 'Set Unactive (Maintenance)')
                            : tr('Kích hoạt lại (Active)', 'Set Active')}
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<BuildCircleOutlined />}
                          onClick={() => {
                            const matchedApp = applicationList.find(
                              (a) => a.droneId === drone.id || a.serialNumber === drone.serialNumber,
                            );
                            const mtowMatch = drone.model?.match(/MTOW:\s*([\d.,]+)/i);
                            const fallbackFeatures: string[] = [];
                            if (drone.hasRtk) fallbackFeatures.push('RTK_POSITIONING');
                            if (drone.hasThermalCamera) fallbackFeatures.push('THERMAL_CAMERA');
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
                                maxWindResistanceMps: drone.maxWindResistanceMps != null ? String(drone.maxWindResistanceMps) : '12',
                                maxAltitudeMeters: drone.maxAltitudeMeters != null ? String(drone.maxAltitudeMeters) : '',
                                opticalZoomLevel: drone.opticalZoomLevel ? drone.opticalZoomLevel.replace(/x/i, '') : '1',
                                features: drone.features && drone.features.length > 0 ? drone.features : fallbackFeatures,
                              },
                              matchedApp
                                ? {
                                    id: matchedApp.id,
                                    registrationFileKey: matchedApp.registrationFileKey ?? null,
                                    ownershipFileKey: matchedApp.ownershipFileKey ?? null,
                                    inspectionFileKey: matchedApp.inspectionFileKey ?? null,
                                    documentFiles: matchedApp.documentFiles ?? null,
                                    imageFileKeys: matchedApp.imageFileKeys ?? null,
                                  }
                                : undefined,
                            );
                          }}
                          sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
                        >
                          {tr('Cập nhật', 'Update')}
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          startIcon={<DeleteOutlineRounded />}
                          onClick={() => {
                            setFleetActionError(null);
                            setDroneToDelete(drone);
                          }}
                          sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
                        >
                          {tr('Xóa drone', 'Delete')}
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
                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', minWidth: 0, flex: 1 }}>
                        {app.imageFileKeys && app.imageFileKeys.length > 0 && (
                          <Box
                            sx={{
                              width: 72,
                              height: 72,
                              flexShrink: 0,
                              borderRadius: '8px',
                              overflow: 'hidden',
                              border: 1,
                              borderColor: 'divider',
                              bgcolor: 'action.hover',
                              '& img': { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
                            }}
                          >
                            <AuthenticatedImage
                              src={`/api/v1/drone-registration-applications/${app.id}/evidence/DRONE_IMAGE_0`}
                              alt={app.model || app.serialNumber}
                              maxHeight={72}
                            />
                          </Box>
                        )}
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                        {(() => {
                          const parsed = parseDroneModelDisplay(app.model);
                          const specSummary = [
                            parsed.mtow,
                            parsed.flightTime,
                            parsed.camera,
                            app.maxWindResistanceMps != null ? `${tr('Gió', 'Wind')} ${app.maxWindResistanceMps} m/s` : null,
                            app.maxAltitudeMeters != null ? `${tr('Trần bay tối đa', 'Maximum altitude')} ${app.maxAltitudeMeters} m` : null,
                            app.opticalZoomLevel && !['1', '1x', 'NONE_1X'].includes(app.opticalZoomLevel)
                              ? `Zoom ${app.opticalZoomLevel}`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(' · ');

                          const featureLabels =
                            app.features && app.features.length > 0
                              ? app.features.map((code) => {
                                  const f = effectiveFeatures.find((item) => item.code === code);
                                  return { code, label: f ? (locale === 'vi' ? f.nameVi : f.nameEn) : code };
                                })
                              : [
                                  ...(app.hasRtk ? [{ code: 'RTK_POSITIONING', label: 'RTK GNSS' }] : []),
                                  ...(app.hasThermalCamera ? [{ code: 'THERMAL_CAMERA', label: tr('Camera nhiệt', 'Thermal Camera') }] : []),
                                ];

                          return (
                            <>
                              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}>
                                <Typography sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.95rem' }}>
                                  {parsed.name}
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                                  · {app.manufacturer || tr('Hãng chưa rõ', 'Unknown manufacturer')}
                                </Typography>
                              </Box>

                              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, fontSize: '0.82rem' }}>
                                {tr('Serial:', 'Serial:')}{' '}
                                <strong style={{ fontFamily: 'monospace', color: 'inherit' }}>{app.serialNumber}</strong> ·{' '}
                                {tr('Số ĐK:', 'Reg No.:')} <strong>{app.registrationNumber}</strong> ·{' '}
                                {tr('Nộp:', 'Submitted:')}{' '}
                                {new Date(app.createdAt).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US')}
                              </Typography>

                              {specSummary && (
                                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 0.5 }}>
                                  {specSummary}
                                </Typography>
                              )}

                              {featureLabels.length > 0 && (
                                <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 1 }}>
                                  {featureLabels.map((item) => (
                                    <Chip
                                      key={item.code}
                                      size="small"
                                      label={item.label}
                                      sx={{
                                        height: 22,
                                        fontSize: '0.75rem',
                                        fontWeight: 500,
                                        borderRadius: '6px',
                                        bgcolor: 'action.hover',
                                        color: 'text.primary',
                                      }}
                                    />
                                  ))}
                                </Box>
                              )}
                            </>
                          );
                        })()}
                        {app.reviewNote && (
                          <Alert severity={app.status === 'REJECTED' ? 'error' : 'info'} sx={{ mt: 1.25, py: 0.25, px: 1.5, fontSize: '0.75rem' }}>
                            <strong>{tr('Phản hồi của Manager:', 'Manager review note:')}</strong> {app.reviewNote}
                          </Alert>
                        )}
                        </Box>
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
                              const fallbackFeatures: string[] = [];
                              if (app.hasRtk) fallbackFeatures.push('RTK_POSITIONING');
                              if (app.hasThermalCamera) fallbackFeatures.push('THERMAL_CAMERA');
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
                                  maxWindResistanceMps: app.maxWindResistanceMps != null ? String(app.maxWindResistanceMps) : '12',
                                  maxAltitudeMeters: app.maxAltitudeMeters != null ? String(app.maxAltitudeMeters) : '',
                                  opticalZoomLevel: app.opticalZoomLevel ? app.opticalZoomLevel.replace(/x/i, '') : '1',
                                  features: app.features && app.features.length > 0 ? app.features : fallbackFeatures,
                                },
                                {
                                  id: app.id,
                                  registrationFileKey: app.registrationFileKey ?? null,
                                  ownershipFileKey: app.ownershipFileKey ?? null,
                                  inspectionFileKey: app.inspectionFileKey ?? null,
                                  documentFiles: app.documentFiles ?? null,
                                  imageFileKeys: app.imageFileKeys ?? null,
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
          <Stack component="form" id="drone-register-form" noValidate spacing={3} onSubmit={handleSubmit}>
            {/* THÔNG SỐ KỸ THUẬT */}
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                {tr('1. Thông tin thiết bị', '1. Airframe Specifications')}
              </Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <TextField
                  required
                  label={tr('Tên Drone / Model *', 'Drone Model *')}
                  placeholder={tr('VD: DJI Matrice 350 RTK, Autel EVO Max 4T', 'e.g. DJI Matrice 350 RTK, Autel EVO Max 4T')}
                  value={form.droneName}
                  onChange={updateField('droneName')}
                  error={submitAttempted && !form.droneName.trim()}
                  helperText={tr('Tên thương mại đầy đủ của thiết bị', 'Full commercial model designation')}
                />
                <TextField
                  required
                  label={tr('Hãng sản xuất *', 'Manufacturer *')}
                  placeholder={tr('VD: DJI, Autel Robotics, Skydio', 'e.g. DJI, Autel Robotics, Skydio')}
                  value={form.manufacturer}
                  onChange={updateField('manufacturer')}
                  error={submitAttempted && !form.manufacturer.trim()}
                  helperText={tr('Hãng chế tạo nguyên chiếc', 'Airframe manufacturer')}
                />
                <TextField
                  required
                  label={tr('Số Serial thân máy (Airframe Serial Number) *', 'Airframe Serial Number *')}
                  placeholder={tr('VD: 1581F4B0C2301001', 'e.g. 1581F4B0C2301001')}
                  value={form.serialNumber}
                  onChange={updateField('serialNumber')}
                  error={submitAttempted && !form.serialNumber.trim()}
                  helperText={tr('Mã số duy nhất in trên tem thân máy (phải khớp hóa đơn/tờ khai)', 'Unique airframe serial number')}
                />
                <TextField
                  required
                  label={tr('Số Đăng ký Phương tiện bay (Bộ Công an cấp) *', 'UAV Registration Number (Police Authority) *')}
                  placeholder={tr('VD: ĐK-2026-00892', 'e.g. DK-2026-00892')}
                  value={form.registrationNumber}
                  onChange={updateField('registrationNumber')}
                  error={submitAttempted && !form.registrationNumber.trim()}
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
                  error={submitAttempted && !form.registrationExpiresAt}
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
                  const shortCat = legalInfo?.categoryCode.split('(')[0]?.trim();
                  return (
                    <TextField
                      label={tr('Trọng lượng cất cánh (MTOW)', 'Max Takeoff Weight (MTOW)')}
                      placeholder="9.2"
                      value={form.mtowKg}
                      onChange={updateField('mtowKg')}
                      slotProps={{
                        input: {
                          endAdornment: (
                            <InputAdornment position="end" sx={{ gap: 0.75 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                kg
                              </Typography>
                              {legalInfo && shortCat && (
                                <Chip
                                  size="small"
                                  color={legalInfo.requiresClassB ? 'warning' : 'success'}
                                  variant="outlined"
                                  label={`${shortCat} · ${legalInfo.requiresClassB ? tr('Bằng B', 'Class B') : tr('Hạng A/B', 'Class A/B')}`}
                                  sx={{
                                    height: 22,
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    borderRadius: '6px',
                                  }}
                                />
                              )}
                            </InputAdornment>
                          ),
                        },
                      }}
                    />
                  );
                })()}
                <TextField
                  label={tr('Thời gian bay tối đa', 'Max Flight Time')}
                  placeholder={tr('55 phút', '55 mins')}
                  value={form.maxFlightTimeMinutes}
                  onChange={updateField('maxFlightTimeMinutes')}
                />
                <TextField
                  label={tr('Kháng gió tối đa', 'Max Wind Resistance')}
                  placeholder="VD: 12 m/s"
                  value={form.maxWindResistanceMps}
                  onChange={updateField('maxWindResistanceMps')}
                  type="number"
                  slotProps={{ htmlInput: { step: '0.5' } }}
                />
                <TextField
                  label={tr('Trần bay tối đa theo thông số hãng', 'Manufacturer maximum flight altitude')}
                  placeholder={tr('VD: 5000', 'e.g. 5000')}
                  value={form.maxAltitudeMeters}
                  onChange={updateField('maxAltitudeMeters')}
                  type="number"
                  slotProps={{ htmlInput: { min: 0, step: '0.1' }, input: { endAdornment: <InputAdornment position="end">m</InputAdornment> } }}
                  helperText={tr('Không bắt buộc. Giá trị khai báo xấp xỉ; không phải xác nhận clearance/giấy phép bay.', 'Optional. Approximate declared value; not flight clearance or permit confirmation.')}
                  error={form.maxAltitudeMeters.trim() !== '' && (!Number.isFinite(Number(form.maxAltitudeMeters)) || Number(form.maxAltitudeMeters) < 0)}
                />
                <TextField
                  label={tr('Zoom quang học', 'Optical Zoom')}
                  placeholder="1x"
                  value={form.opticalZoomLevel}
                  onChange={updateField('opticalZoomLevel')}
                  slotProps={{
                    htmlInput: { min: 1, step: 1 },
                    input: {
                      endAdornment: <InputAdornment position="end">x</InputAdornment>,
                    },
                  }}
                  helperText={tr('Mặc định 1x nếu không có zoom', 'Default 1x if no zoom')}
                />
                <TextField
                  label={tr('Độ phân giải Camera (MP)', 'Camera Resolution (MP)')}
                  placeholder={tr('VD: 48 MP', 'e.g. 48 MP')}
                  value={form.cameraSensor}
                  onChange={updateField('cameraSensor')}
                />
                <Box sx={{ gridColumn: { xs: '1 / -1' }, mt: 0.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                    {tr('Tính năng & An toàn', 'Capabilities & Safety Checklist')}
                  </Typography>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                      gap: 1,
                      p: 1.5,
                      borderRadius: '8px',
                      border: 1,
                      borderColor: 'divider',
                      bgcolor: 'background.default',
                    }}
                  >
                    {effectiveFeatures.map((feat) => {
                      const checked = form.features.includes(feat.code);
                      return (
                        <FormControlLabel
                          key={feat.code}
                          sx={{ m: 0 }}
                          control={
                            <Checkbox
                              size="small"
                              checked={checked}
                              onChange={(e) => {
                                const isChecked = e.target.checked;
                                setForm((curr) => ({
                                  ...curr,
                                  features: isChecked
                                    ? [...curr.features, feat.code]
                                    : curr.features.filter((c) => c !== feat.code),
                                }));
                              }}
                            />
                          }
                          label={
                            <Typography variant="body2" sx={{ fontSize: '0.84rem', fontWeight: checked ? 600 : 400 }}>
                              {locale === 'vi' ? feat.nameVi : feat.nameEn}
                            </Typography>
                          }
                        />
                      );
                    })}
                  </Box>
                </Box>
              </Box>
            </Box>

            <Divider />

            {/* HÌNH ẢNH THIẾT BỊ BAY */}
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 1 }}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {tr('2. Hình ảnh thiết bị bay * (Tối thiểu 1 ảnh)', '2. Drone Images * (Min 1 photo)')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {tr(
                      'Tải lên ảnh chụp thực tế thân máy, tem số serial hoặc cụm camera (PNG, JPG, WebP tối đa 10 MB/ảnh).',
                      'Upload clear photos of the drone, serial tag, or camera payload (PNG, JPG, WebP up to 10 MB per photo).',
                    )}
                  </Typography>
                </Box>
                <Button
                  component="label"
                  size="small"
                  variant="outlined"
                  startIcon={<CloudUploadOutlined />}
                  sx={{ textTransform: 'none', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600 }}
                >
                  {tr('Thêm ảnh drone', 'Upload Photos')}
                  <input
                    type="file"
                    hidden
                    multiple
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleImageFilesAdd}
                  />
                </Button>
              </Box>

              {imageError && (
                <Alert severity="error" sx={{ mt: 1 }} onClose={() => setImageError(null)}>
                  {imageError}
                </Alert>
              )}

              {imagePreviews.length === 0 && existingImageKeys.length === 0 ? (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2.5,
                    textAlign: 'center',
                    border: '1.5px dashed',
                    borderColor: submitAttempted && !hasAtLeastOneImage ? 'error.main' : 'warning.main',
                    bgcolor: submitAttempted && !hasAtLeastOneImage ? 'error.50' : 'action.hover',
                    borderRadius: '8px',
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      color: submitAttempted && !hasAtLeastOneImage ? 'error.main' : 'warning.dark',
                    }}
                  >
                    {tr(
                      '⚠ Chưa có ảnh nào. Vui lòng tải lên ít nhất 1 ảnh chụp thực tế của thiết bị bay.',
                      '⚠ No photos uploaded yet. Please upload at least 1 clear photo of the drone.',
                    )}
                  </Typography>
                </Paper>
              ) : (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: 1.5 }}>
                  {existingImageKeys.map((_, idx) => (
                    <Box
                      key={`existing-${idx}`}
                      sx={{
                        position: 'relative',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        border: 1,
                        borderColor: 'divider',
                        height: 110,
                        bgcolor: 'action.hover',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        p: 1,
                        textAlign: 'center',
                      }}
                    >
                      <Typography variant="caption" sx={{ fontWeight: 600, color: 'success.main' }}>
                        ✓ {tr(`Ảnh đã lưu #${idx + 1}`, `Saved Photo #${idx + 1}`)}
                      </Typography>
                      {idx === 0 && (
                        <Chip
                          size="small"
                          label={tr('Ảnh chính', 'Primary')}
                          color="primary"
                          sx={{ position: 'absolute', top: 4, left: 4, height: 18, fontSize: '0.62rem', fontWeight: 700 }}
                        />
                      )}
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleRemoveImage(idx)}
                        sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'background.paper', '&:hover': { bgcolor: 'background.default' } }}
                      >
                        <DeleteOutlineRounded fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                  {imagePreviews.map((url, idx) => {
                    const totalIndex = existingImageKeys.length + idx;
                    return (
                      <Box
                        key={`preview-${idx}`}
                        sx={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: 1, borderColor: 'divider', height: 110 }}
                      >
                        <CardMedia
                          component="img"
                          height="110"
                          image={url}
                          alt={`Drone photo ${totalIndex + 1}`}
                          sx={{ objectFit: 'cover' }}
                        />
                        {totalIndex === 0 && (
                          <Chip
                            size="small"
                            label={tr('Ảnh chính', 'Primary')}
                            color="primary"
                            sx={{ position: 'absolute', top: 4, left: 4, height: 18, fontSize: '0.62rem', fontWeight: 700 }}
                          />
                        )}
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveImage(totalIndex)}
                          sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'background.paper', '&:hover': { bgcolor: 'background.default' } }}
                        >
                          <DeleteOutlineRounded fontSize="small" />
                        </IconButton>
                      </Box>
                    );
                  })}
                </Box>
              )}
            </Box>

            <Divider />

            {/* HÌNH ẢNH GIẤY TỜ BẮT BUỘC */}
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                {tr('3. Giấy tờ đính kèm', '3. Supporting Documents')}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {tr(
                  'Định dạng PNG, JPG, PDF (tối đa 10 MB/tệp)',
                  'PNG, JPG, PDF up to 10 MB per file',
                )}
              </Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: effectiveConfigs.length > 2 ? '1fr 1fr 1fr' : '1fr 1fr' }, gap: 2 }}>
                {effectiveConfigs.map((doc) => {
                  const file = files[doc.code];
                  const preview = previews[doc.code];
                  const docTitle = locale === 'vi' ? doc.titleVi : doc.titleEn;
                  const docDescription = locale === 'vi' ? doc.descriptionVi : doc.descriptionEn;
                  const isUploaded = Boolean(file || existingFileKeys[doc.code]);
                  const showDocError = submitAttempted && doc.isRequired && !isUploaded;

                  return (
                    <Paper
                      key={doc.code}
                      variant="outlined"
                      sx={{
                        p: 1.75,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        borderRadius: '10px',
                        border: '1.5px solid',
                        borderColor: isUploaded ? 'success.main' : showDocError ? 'error.main' : 'divider',
                        bgcolor: showDocError ? 'error.50' : 'background.paper',
                      }}
                    >
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75, flexWrap: 'wrap' }}>
                          {isUploaded ? (
                            <CheckCircleRounded sx={{ color: 'success.main', fontSize: 18 }} />
                          ) : (
                            <CloudUploadOutlined sx={{ color: 'text.secondary', fontSize: 18 }} />
                          )}
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.875rem' }}>
                            {docTitle}
                          </Typography>
                          <Chip
                            size="small"
                            label={doc.isRequired ? tr('Bắt buộc', 'Required') : tr('Tùy chọn', 'Optional')}
                            color={doc.isRequired ? 'warning' : 'default'}
                            variant={doc.isRequired ? 'filled' : 'outlined'}
                            sx={{ height: 20, fontSize: '0.68rem', fontWeight: 600 }}
                          />
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
                                handleRemoveFile(doc.code);
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
                        ) : existingFileKeys[doc.code] ? (
                          <Box sx={{ mb: 1.25, p: 0.75, bgcolor: 'background.default', borderRadius: '8px', border: '1px solid', borderColor: 'success.light' }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'success.main' }} noWrap>
                              ✓ {tr('Tệp đã lưu', 'Existing uploaded file')}
                            </Typography>
                          </Box>
                        ) : null}
                      </Box>

                      <Box sx={{ position: 'relative', width: '100%', mt: 1 }}>
                        <Button
                          type="button"
                          fullWidth
                          variant={isUploaded ? 'outlined' : 'contained'}
                          color={isUploaded ? 'success' : 'primary'}
                          size="small"
                          startIcon={<CloudUploadOutlined />}
                          sx={{ textTransform: 'none', borderRadius: '8px', pointerEvents: 'none', fontSize: '0.75rem' }}
                        >
                          {isUploaded ? tr('Đổi tệp khác', 'Replace file') : tr('Chọn tệp giấy tờ', 'Choose document')}
                        </Button>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,application/pdf"
                          onChange={handleFileChange(doc.code)}
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
            disabled={submit.isPending}
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
              : tr('Gửi hồ sơ', 'Submit Application')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(droneToDelete)}
        onClose={() => {
          if (!deleteDroneMutation.isPending) setDroneToDelete(null);
        }}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '10px', p: 0.5 } } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {tr('Xác nhận xóa drone', 'Confirm Delete Drone')}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {tr(
              `Bạn có chắc muốn xóa thiết bị ${droneToDelete?.model?.split('[')[0]?.trim() || droneToDelete?.serialNumber || ''} khỏi đội bay của bạn? Thiết bị sẽ ngừng hoạt động và không thể điều phối bay mới.`,
              `Are you sure you want to remove ${droneToDelete?.model?.split('[')[0]?.trim() || droneToDelete?.serialNumber || ''} from your fleet? It will be retired and excluded from future dispatches.`,
            )}
          </Typography>
          {fleetActionError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {fleetActionError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setDroneToDelete(null)}
            disabled={deleteDroneMutation.isPending}
            sx={{ textTransform: 'none' }}
          >
            {tr('Hủy', 'Cancel')}
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={deleteDroneMutation.isPending || !droneToDelete}
            onClick={() => {
              if (droneToDelete) {
                deleteDroneMutation.mutate(droneToDelete.id);
              }
            }}
            sx={{ textTransform: 'none', fontWeight: 650 }}
          >
            {deleteDroneMutation.isPending ? tr('Đang xóa…', 'Deleting…') : tr('Xác nhận xóa', 'Delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
