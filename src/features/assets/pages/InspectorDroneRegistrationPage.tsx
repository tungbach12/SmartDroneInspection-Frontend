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
  CircularProgress,
  Collapse,
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
import AddRounded from '@mui/icons-material/AddRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import CloudUploadOutlined from '@mui/icons-material/CloudUploadOutlined';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import FlightTakeoffRounded from '@mui/icons-material/FlightTakeoffRounded';
import RefreshRounded from '@mui/icons-material/RefreshRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import VerifiedUserOutlined from '@mui/icons-material/VerifiedUserOutlined';
import BuildCircleOutlined from '@mui/icons-material/BuildCircleOutlined';
import AppRegistrationOutlined from '@mui/icons-material/AppRegistrationOutlined';
import EventAvailableOutlined from '@mui/icons-material/EventAvailableOutlined';
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded';
import DocumentScannerOutlined from '@mui/icons-material/DocumentScannerOutlined';
import { droneDocumentConfigApi } from '../api/droneDocumentConfigApi';
import { droneFeatureConfigApi } from '../api/droneFeatureConfigApi';
import {
  mf1DroneApi,
  uploadDroneEvidence,
  type DroneRegistrationInput,
  type DroneSpecExtractionResult,
  type InspectorDrone,
  type DroneRegistrationApplication,
} from '../api/mf1DroneApi';
import { extractImageText } from '../utils/imageOcr';
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
  features: [],
};

type ConfiguredDroneDocument = {
  code: string;
  titleVi: string;
  titleEn: string;
  descriptionVi: string;
  descriptionEn: string;
  isRequired: boolean;
};

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
  const [capabilitiesExpanded, setCapabilitiesExpanded] = useState(false);
  const [customFeatureInput, setCustomFeatureInput] = useState('');
  const [tabIndex, setTabIndex] = useState<'APPROVED' | 'APPLICATIONS'>('APPROVED');
  const [autoFilledFields, setAutoFilledFields] = useState<Partial<Record<keyof DroneFormState, boolean>>>({});
  const [scanResult, setScanResult] = useState<DroneSpecExtractionResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

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
  const effectiveFeatures = activeFeatureConfigs;

  const applications = useQuery({
    queryKey: ['inspector-drone-applications'],
    queryFn: mf1DroneApi.mine,
    enabled: isInspector,
    refetchInterval: isInspector ? 10000 : false,
    retry: false,
  });

  const extractSpecsMutation = useMutation({
    mutationFn: async (file: File) => {
      const ocrText = file.type.startsWith('image/') ? await extractImageText(file) : '';
      return mf1DroneApi.extractSpecs(file, ocrText);
    },
    onMutate: () => {
      setScanError(null);
    },
    onSuccess: (result) => {
      setScanResult(result);
      const marked: Partial<Record<keyof DroneFormState, boolean>> = {};
      setForm((current) => {
        const next = { ...current };
        if (result.model) {
          next.droneName = result.model;
          marked.droneName = true;
        }
        if (result.manufacturer) {
          next.manufacturer = result.manufacturer;
          marked.manufacturer = true;
        }
        if (result.serialNumber) {
          next.serialNumber = result.serialNumber;
          marked.serialNumber = true;
        }
        if (result.registrationNumber) {
          next.registrationNumber = result.registrationNumber;
          marked.registrationNumber = true;
        }
        if (result.registrationExpiresAt) {
          next.registrationExpiresAt = result.registrationExpiresAt;
          marked.registrationExpiresAt = true;
        }
        if (result.mtowKg != null) {
          next.mtowKg = String(result.mtowKg);
          marked.mtowKg = true;
        }
        if (result.maxFlightTimeMinutes != null) {
          next.maxFlightTimeMinutes = String(result.maxFlightTimeMinutes);
          marked.maxFlightTimeMinutes = true;
        }
        if (result.maxWindResistanceMps != null) {
          next.maxWindResistanceMps = String(result.maxWindResistanceMps);
          marked.maxWindResistanceMps = true;
        }
        if (result.maxAltitudeMeters != null) {
          next.maxAltitudeMeters = String(result.maxAltitudeMeters);
          marked.maxAltitudeMeters = true;
        }
        if (result.opticalZoomLevel) {
          next.opticalZoomLevel = result.opticalZoomLevel.replace(/x$/i, '');
          marked.opticalZoomLevel = true;
        }
        if (result.cameraSensor) {
          next.cameraSensor = result.cameraSensor;
          marked.cameraSensor = true;
        }
        if (result.features && result.features.length > 0) {
          next.features = Array.from(new Set([...current.features, ...result.features]));
          marked.features = true;
        }
        return next;
      });
      setAutoFilledFields(marked);
      if (result.features && result.features.length > 0) {
        setCapabilitiesExpanded(true);
      }
    },
    onError: (err) => {
      setScanResult(null);
      setScanError(
        err instanceof Error
          ? err.message
          : tr(
              'Không thể đọc thông số từ tệp này. Vui lòng kiểm tra định dạng PNG/JPG/WebP/PDF.',
              'Could not extract specs from this file. Check PNG/JPG/WebP/PDF format.',
            ),
      );
    },
  });

  const [fleetActionError, setFleetActionError] = useState<string | null>(null);
  const [detailTarget, setDetailTarget] = useState<{
    drone?: InspectorDrone | undefined;
    application?: DroneRegistrationApplication | undefined;
  } | null>(null);
  const [detailDocs, setDetailDocs] = useState<
    Array<{ label: string; type: string; url: string; isPdf: boolean; failed?: boolean }>
  >([]);
  const [detailDocsLoading, setDetailDocsLoading] = useState(false);

  const serviceabilityMutation = useMutation({
    mutationFn: ({ droneId, serviceability }: { droneId: string; serviceability: 'ACTIVE' | 'RETIRED' }) =>
      mf1DroneApi.updateMyDroneServiceability(droneId, serviceability),
    onMutate: async ({ droneId, serviceability }) => {
      setFleetActionError(null);
      await queryClient.cancelQueries({ queryKey: ['inspector-drones'] });
      const previousDrones = queryClient.getQueryData<InspectorDrone[]>(['inspector-drones']);
      queryClient.setQueryData<InspectorDrone[]>(['inspector-drones'], (current) =>
        current?.map((item) => (item.id === droneId ? { ...item, serviceability } : item)),
      );
      return { previousDrones };
    },
    onSuccess: (updatedDrone) => {
      setFleetActionError(null);
      queryClient.setQueryData<InspectorDrone[]>(['inspector-drones'], (current) =>
        current?.map((item) => (item.id === updatedDrone.id ? updatedDrone : item)),
      );
      setDetailTarget((prev) =>
        prev?.drone?.id === updatedDrone.id ? { ...prev, drone: updatedDrone } : prev,
      );
      void queryClient.invalidateQueries({ queryKey: ['inspector-drones'] });
    },
    onError: (err, _variables, context) => {
      if (context?.previousDrones) {
        queryClient.setQueryData(['inspector-drones'], context.previousDrones);
      }
      setFleetActionError(
        err instanceof Error
          ? err.message
          : tr('Không thể cập nhật trạng thái hoạt động của drone.', 'Could not update drone serviceability.'),
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
  const activeDronesCount = approvedDrones.filter((d) => d.serviceability === 'ACTIVE').length;
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

      const rawMtow = formData.mtowKg ? Number(formData.mtowKg.replace(',', '.').replace(/[^\d.]/g, '')) : NaN;
      const parsedMtowKg = Number.isFinite(rawMtow) && rawMtow > 0 ? Number(rawMtow.toFixed(2)) : undefined;
      const rawFlightMinutes = formData.maxFlightTimeMinutes
        ? parseInt(formData.maxFlightTimeMinutes.replace(/[^\d]/g, ''), 10)
        : NaN;
      const parsedFlightMinutes =
        Number.isFinite(rawFlightMinutes) && rawFlightMinutes > 0 ? rawFlightMinutes : undefined;
      const cleanedCameraSensor = formData.cameraSensor.trim() || undefined;
      const zoomValue = formData.opticalZoomLevel ? formData.opticalZoomLevel.replace(/[^0-9.]/g, '') : '';
      const features = formData.features;
      const hasThermal = features.includes('THERMAL_CAMERA');
      const hasRtk = features.includes('RTK_POSITIONING');

      const rawName = formData.droneName.trim();
      const finalModel = rawName.length > 1000 ? rawName.slice(0, 1000) : rawName;

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
        mtowKg: parsedMtowKg,
        maxFlightTimeMinutes: parsedFlightMinutes,
        cameraSensor: cleanedCameraSensor,
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
          ? 'Đã gửi hồ sơ đăng ký thiết bị drone thành công! Manager sẽ xác minh giấy tờ trước khi kích hoạt.'
          : 'Drone registration application submitted! Manager will verify the documents before activation.',
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
    setAutoFilledFields((current) => (current[field] ? { ...current, [field]: false } : current));
  };

  const handleScanSpecFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    extractSpecsMutation.mutate(file);
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
    setCapabilitiesExpanded(false);
    setCustomFeatureInput('');
    setAutoFilledFields({});
    setScanResult(null);
    setScanError(null);
    setOpenRegisterDialog(true);
  };

  const handleAddCustomFeature = () => {
    const trimmed = customFeatureInput.trim();
    if (!trimmed) return;
    const normalized = trimmed.toLowerCase();
    const matchedConfig = effectiveFeatures.find(
      (f) =>
        f.code.toLowerCase() === normalized ||
        f.nameVi.toLowerCase() === normalized ||
        f.nameEn.toLowerCase() === normalized,
    );
    const valueToAdd = matchedConfig ? matchedConfig.code : trimmed;
    setForm((curr) => {
      const exists = curr.features.some((c) => c.toLowerCase() === valueToAdd.toLowerCase());
      return exists ? curr : { ...curr, features: [...curr.features, valueToAdd] };
    });
    setCustomFeatureInput('');
  };

  const customFeatures = form.features.filter(
    (code) => !effectiveFeatures.some((f) => f.code === code),
  );

  const hasAtLeastOneImage = imageFiles.length > 0 || existingImageKeys.length > 0;
  const requiredDocumentCodes = new Set(effectiveConfigs.filter((doc) => doc.isRequired).map((doc) => doc.code));
  const allDocumentsUploaded = [...requiredDocumentCodes].every((code) => {
    if (code === 'OWNERSHIP') return true;
    if (code === 'REGISTRATION') return Boolean(files[code] || existingFileKeys[code]);
    if (code === 'INSPECTION') return Boolean(files[code] || existingFileKeys[code]);
    return Boolean(files[code] || existingFileKeys[code]);
  });

  const revokeDetailDocs = (
    docs: Array<{ label: string; type: string; url: string; isPdf: boolean; failed?: boolean }>,
  ) => {
    docs.forEach((doc) => {
      if (doc.url) URL.revokeObjectURL(doc.url);
    });
  };

  const closeDetailModal = () => {
    setDetailTarget(null);
    setDetailDocs((prev) => {
      revokeDetailDocs(prev);
      return [];
    });
    setDetailDocsLoading(false);
  };

  const loadApplicationEvidence = async (application: DroneRegistrationApplication) => {
    setDetailDocsLoading(true);
    try {
      const docEntries: Array<{ code: string; label: string }> = [];
      if (application.documentFiles && Object.keys(application.documentFiles).length > 0) {
        Object.entries(application.documentFiles).forEach(([code, key]) => {
          if (!key) return;
          const cfg = effectiveConfigs.find((c) => c.code === code);
          docEntries.push({
            code,
            label: cfg ? (locale === 'vi' ? cfg.titleVi : cfg.titleEn) : code,
          });
        });
      } else {
        if (application.registrationFileKey) {
          docEntries.push({ code: 'REGISTRATION', label: tr('Đăng ký drone', 'Drone Registration') });
        }
        if (application.ownershipFileKey) {
          docEntries.push({ code: 'OWNERSHIP', label: tr('Chứng từ sở hữu', 'Proof of Ownership') });
        }
        if (application.inspectionFileKey) {
          docEntries.push({ code: 'INSPECTION', label: tr('Kiểm định kỹ thuật', 'Technical Inspection') });
        }
      }
      if (docEntries.length === 0) {
        setDetailDocs([]);
        return;
      }
      const results = await Promise.allSettled(
        docEntries.map(async (entry) => {
          const blob = await mf1DroneApi.evidence(application.id, entry.code);
          return {
            label: entry.label,
            type: entry.code,
            url: URL.createObjectURL(blob),
            isPdf: blob.type === 'application/pdf' || blob.type.endsWith('/pdf'),
          };
        }),
      );
      setDetailDocs(
        results.map((result, idx) =>
          result.status === 'fulfilled'
            ? result.value
            : {
              label: docEntries[idx]?.label ?? tr('Tài liệu', 'Document'),
              type: docEntries[idx]?.code ?? 'UNKNOWN',
              url: '',
              isPdf: false,
              failed: true,
            },
        ),
      );
    } finally {
      setDetailDocsLoading(false);
    }
  };

  const openDroneDetail = (drone: InspectorDrone) => {
    const matchedApp = applicationList.find(
      (a) => a.droneId === drone.id || a.serialNumber === drone.serialNumber,
    );
    setDetailDocs((prev) => {
      revokeDetailDocs(prev);
      return [];
    });
    setDetailTarget({ drone, ...(matchedApp ? { application: matchedApp } : {}) });
    if (matchedApp) {
      void loadApplicationEvidence(matchedApp);
    } else {
      setDetailDocsLoading(false);
    }
  };

  const openApplicationDetail = (application: DroneRegistrationApplication) => {
    setDetailDocs((prev) => {
      revokeDetailDocs(prev);
      return [];
    });
    setDetailTarget({ application });
    void loadApplicationEvidence(application);
  };

  const renderDroneFeatures = (
    features?: string[] | null,
    hasThermalCamera?: boolean,
    hasRtk?: boolean,
  ) => {
    const items =
      features && features.length > 0
        ? features.map((code) => {
          const f = effectiveFeatures.find((item) => item.code === code);
          return { code, label: f ? (locale === 'vi' ? f.nameVi : f.nameEn) : code };
        })
        : [
          ...(hasRtk ? [{ code: 'RTK_POSITIONING', label: 'RTK GNSS' }] : []),
          ...(hasThermalCamera
            ? [{ code: 'THERMAL_CAMERA', label: tr('Camera nhiệt', 'Thermal Camera') }]
            : []),
        ];
    return items;
  };

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
          value={activeDronesCount.toString()}
          change={activeDronesCount > 0 ? tr('Sẵn sàng', 'Ready') : undefined}
          subtext={tr('Đang hoạt động', 'Active in fleet')}
          iconType="flight"
          positive={activeDronesCount > 0}
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
              {fleetActionError && (
                <Alert
                  severity="error"
                  sx={{ mb: 2, borderRadius: '8px' }}
                  onClose={() => setFleetActionError(null)}
                >
                  {fleetActionError}
                </Alert>
              )}
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
                      'Hãy gửi hồ sơ đăng ký thiết bị bay kèm đầy đủ giấy tờ kỹ thuật. Manager sẽ kiểm tra và kích hoạt để bạn sử dụng trong các ca kiểm định.',
                      'Submit a drone registration application with the required technical documents. The Manager will verify and activate your drone for field inspections.',
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
                      onClick={() => openDroneDetail(drone)}
                      sx={{
                        p: 2.5,
                        borderRadius: '10px',
                        borderColor: 'divider',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        opacity: drone.serviceability === 'RETIRED' ? 0.8 : 1,
                        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                        '&:hover': {
                          borderColor: 'primary.main',
                          boxShadow: '0 4px 14px rgba(15,23,42,0.08)',
                        },
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
                                const displayCamera = drone.cameraSensor ?? parsed.camera;
                                const displayFlightTime =
                                  drone.maxFlightTimeMinutes != null
                                    ? `${drone.maxFlightTimeMinutes} ${tr('phút', 'min')}`
                                    : parsed.flightTime;
                                return (
                                  <>
                                    <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.3 }}>
                                      {parsed.name}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
                                      {tr('Hãng sản xuất:', 'Manufacturer:')}{' '}
                                      <strong>{drone.manufacturer || tr('Chưa cập nhật', 'Not specified')}</strong>
                                      {displayCamera ? ` · Cam: ${displayCamera}` : ''}
                                      {displayFlightTime ? ` · ${displayFlightTime}` : ''}
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
                            icon={drone.serviceability === 'ACTIVE' ? <VerifiedUserOutlined style={{ fontSize: 14 }} /> : undefined}
                            label={
                              drone.serviceability === 'ACTIVE'
                                ? tr('ĐANG HOẠT ĐỘNG', 'ACTIVE')
                                : drone.serviceability === 'RETIRED'
                                  ? tr('NGƯNG HOẠT ĐỘNG', 'RETIRED')
                                  : drone.serviceability === 'SUSPENDED'
                                    ? tr('ĐÌNH CHỈ', 'SUSPENDED')
                                    : tr('BẢO TRÌ', 'MAINTENANCE')
                            }
                            color={
                              drone.serviceability === 'ACTIVE'
                                ? 'success'
                                : drone.serviceability === 'RETIRED'
                                  ? 'default'
                                  : drone.serviceability === 'SUSPENDED'
                                    ? 'error'
                                    : 'warning'
                            }
                            variant={drone.serviceability === 'RETIRED' ? 'outlined' : 'filled'}
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
                        onClick={(e) => e.stopPropagation()}
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
                        {(() => {
                          const isActive = drone.serviceability === 'ACTIVE';
                          const isSuspended = drone.serviceability === 'SUSPENDED';
                          const isUpdatingThisDrone =
                            serviceabilityMutation.isPending &&
                            serviceabilityMutation.variables?.droneId === drone.id;
                          return (
                            <Button
                              size="small"
                              variant="outlined"
                              color={isActive ? 'warning' : 'success'}
                              disabled={isUpdatingThisDrone || isSuspended}
                              onClick={() =>
                                serviceabilityMutation.mutate({
                                  droneId: drone.id,
                                  serviceability: isActive ? 'RETIRED' : 'ACTIVE',
                                })
                              }
                              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
                            >
                              {isUpdatingThisDrone
                                ? tr('Đang cập nhật…', 'Updating…')
                                : isActive
                                  ? tr('Ngưng hoạt động', 'Retire')
                                  : tr('Kích hoạt lại', 'Set Active')}
                            </Button>
                          );
                        })()}
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<BuildCircleOutlined />}
                          disabled={drone.serviceability === 'RETIRED' || drone.serviceability === 'SUSPENDED'}
                          onClick={() => {
                            const matchedApp = applicationList.find(
                              (a) => a.droneId === drone.id || a.serialNumber === drone.serialNumber,
                            );
                            const parsed = parseDroneModelDisplay(drone.model);
                            const fallbackFeatures: string[] = [];
                            if (drone.hasRtk) fallbackFeatures.push('RTK_POSITIONING');
                            if (drone.hasThermalCamera) fallbackFeatures.push('THERMAL_CAMERA');
                            handleOpenRegister(
                              {
                                droneName: parsed.name === 'Drone' && !drone.model ? '' : parsed.name,
                                manufacturer: drone.manufacturer || '',
                                serialNumber: drone.serialNumber || '',
                                registrationNumber: drone.registrationNumber || '',
                                registrationExpiresAt: drone.registrationExpiresAt
                                  ? drone.registrationExpiresAt.slice(0, 10)
                                  : '',
                                mtowKg:
                                  drone.mtowKg != null
                                    ? String(drone.mtowKg)
                                    : parsed.mtow?.replace(/[^\d.,]/g, '') || '',
                                maxFlightTimeMinutes:
                                  drone.maxFlightTimeMinutes != null
                                    ? String(drone.maxFlightTimeMinutes)
                                    : parsed.flightTime?.replace(/[^\d]/g, '') || '',
                                cameraSensor: drone.cameraSensor || parsed.camera || '',
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
                      onClick={() => openApplicationDetail(app)}
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
                        cursor: 'pointer',
                        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                        '&:hover': {
                          borderColor: 'primary.main',
                          boxShadow: '0 4px 14px rgba(15,23,42,0.08)',
                        },
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
                            const displayMtow =
                              app.mtowKg != null ? `${app.mtowKg} kg` : parsed.mtow;
                            const displayFlightTime =
                              app.maxFlightTimeMinutes != null
                                ? `${app.maxFlightTimeMinutes} ${tr('phút', 'min')}`
                                : parsed.flightTime;
                            const displayCamera = app.cameraSensor ?? parsed.camera;
                            const specSummary = [
                              displayMtow,
                              displayFlightTime,
                              displayCamera,
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

                      <Box
                        onClick={(e) => e.stopPropagation()}
                        sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0, flexWrap: 'wrap' }}
                      >
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
                              const parsed = parseDroneModelDisplay(app.model);
                              const fallbackFeatures: string[] = [];
                              if (app.hasRtk) fallbackFeatures.push('RTK_POSITIONING');
                              if (app.hasThermalCamera) fallbackFeatures.push('THERMAL_CAMERA');
                              handleOpenRegister(
                                {
                                  droneName: parsed.name === 'Drone' && !app.model ? '' : parsed.name,
                                  manufacturer: app.manufacturer || '',
                                  serialNumber: app.serialNumber || '',
                                  registrationNumber: app.registrationNumber || '',
                                  registrationExpiresAt: app.registrationExpiresAt
                                    ? app.registrationExpiresAt.slice(0, 10)
                                    : '',
                                  mtowKg:
                                    app.mtowKg != null
                                      ? String(app.mtowKg)
                                      : parsed.mtow?.replace(/[^\d.,]/g, '') || '',
                                  maxFlightTimeMinutes:
                                    app.maxFlightTimeMinutes != null
                                      ? String(app.maxFlightTimeMinutes)
                                      : parsed.flightTime?.replace(/[^\d]/g, '') || '',
                                  cameraSensor: app.cameraSensor || parsed.camera || '',
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
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1.5,
                  mb: 1.75,
                  flexWrap: 'wrap',
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {tr('1. Thông tin thiết bị', '1. Airframe Specifications')}
                </Typography>
                <Button
                  component="label"
                  variant="outlined"
                  size="small"
                  disabled={extractSpecsMutation.isPending}
                  startIcon={
                    extractSpecsMutation.isPending ? (
                      <CircularProgress size={14} />
                    ) : (
                      <DocumentScannerOutlined fontSize="small" />
                    )
                  }
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                  {extractSpecsMutation.isPending
                    ? tr('Đang quét...', 'Scanning...')
                    : tr('Quét ảnh / PDF', 'Scan Photo / PDF')}
                  <input
                    hidden
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp,.pdf,image/png,image/jpeg,image/webp,application/pdf"
                    onChange={handleScanSpecFile}
                  />
                </Button>
              </Box>

              {scanError && (
                <Alert severity="error" sx={{ mb: 2, py: 0.5, borderRadius: '8px' }}>
                  {scanError}
                </Alert>
              )}

              {scanResult && scanResult.suggestedFields.length === 0 && (
                <Alert severity="warning" sx={{ mb: 2, py: 0.5, borderRadius: '8px' }}>
                  <Typography variant="caption" sx={{ display: 'block', fontWeight: 600 }}>
                    {tr(
                      'Không đọc được thông số từ tệp này. Hãy thử ảnh rõ hơn hoặc PDF có văn bản.',
                      'Could not extract fields from this file. Try a clearer photo or text PDF.',
                    )}
                  </Typography>
                </Alert>
              )}

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <TextField
                  required
                  label={tr('Tên Drone / Model *', 'Drone Model *')}
                  placeholder={tr('VD: DJI Matrice 350 RTK, Autel EVO Max 4T', 'e.g. DJI Matrice 350 RTK, Autel EVO Max 4T')}
                  value={form.droneName}
                  onChange={updateField('droneName')}
                  error={submitAttempted && !form.droneName.trim()}
                  helperText={autoFilledFields.droneName ? tr('Tự động điền — vui lòng đối chiếu', 'Auto-filled — please verify') : undefined}
                />
                <TextField
                  required
                  label={tr('Hãng sản xuất *', 'Manufacturer *')}
                  placeholder={tr('VD: DJI, Autel Robotics, Skydio', 'e.g. DJI, Autel Robotics, Skydio')}
                  value={form.manufacturer}
                  onChange={updateField('manufacturer')}
                  error={submitAttempted && !form.manufacturer.trim()}
                  helperText={autoFilledFields.manufacturer ? tr('Tự động điền — vui lòng đối chiếu', 'Auto-filled — please verify') : undefined}
                />
                <TextField
                  required
                  label={tr('Số Serial thân máy *', 'Airframe Serial Number *')}
                  placeholder={tr('VD: 1581F4B0C2301001', 'e.g. 1581F4B0C2301001')}
                  value={form.serialNumber}
                  onChange={updateField('serialNumber')}
                  error={submitAttempted && !form.serialNumber.trim()}
                  helperText={autoFilledFields.serialNumber ? tr('Tự động điền — đối chiếu ký tự 0/O, 1/I', 'Auto-filled — verify 0/O, 1/I characters') : undefined}
                />
                <TextField
                  required
                  label={tr('Số Đăng ký phương tiện *', 'UAV Registration Number *')}
                  placeholder={tr('VD: ĐK-2026-00892', 'e.g. DK-2026-00892')}
                  value={form.registrationNumber}
                  onChange={updateField('registrationNumber')}
                  error={submitAttempted && !form.registrationNumber.trim()}
                  helperText={autoFilledFields.registrationNumber ? tr('Tự động điền — vui lòng đối chiếu', 'Auto-filled — please verify') : undefined}
                />
                <TextField
                  required
                  type="date"
                  label={tr('Ngày hết hạn đăng ký *', 'Registration Expiry *')}
                  value={form.registrationExpiresAt}
                  onChange={updateField('registrationExpiresAt')}
                  slotProps={{ inputLabel: { shrink: true } }}
                  error={submitAttempted && !form.registrationExpiresAt}
                  helperText={autoFilledFields.registrationExpiresAt ? tr('Tự động điền — kiểm tra DD/MM/YYYY', 'Auto-filled — verify DD/MM/YYYY') : undefined}
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
                  label={tr('Trần bay tối đa', 'Max Altitude')}
                  placeholder={tr('VD: 5000', 'e.g. 5000')}
                  value={form.maxAltitudeMeters}
                  onChange={updateField('maxAltitudeMeters')}
                  type="number"
                  slotProps={{ htmlInput: { min: 0, step: '0.1' }, input: { endAdornment: <InputAdornment position="end">m</InputAdornment> } }}
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
                />
                <TextField
                  label={tr('Độ phân giải Camera (MP)', 'Camera Resolution (MP)')}
                  placeholder={tr('VD: 48 MP', 'e.g. 48 MP')}
                  value={form.cameraSensor}
                  onChange={updateField('cameraSensor')}
                  sx={{ gridColumn: { sm: '1 / -1' } }}
                />
                <Box sx={{ gridColumn: { xs: '1 / -1' }, mt: 0.5 }}>
                  <Box
                    sx={{
                      borderRadius: '8px',
                      border: 1,
                      borderColor: 'divider',
                      bgcolor: 'background.default',
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      role="button"
                      tabIndex={0}
                      onClick={() => setCapabilitiesExpanded((v) => !v)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setCapabilitiesExpanded((v) => !v);
                        }
                      }}
                      aria-expanded={capabilitiesExpanded}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1,
                        px: 1.5,
                        py: 1.1,
                        cursor: 'pointer',
                        userSelect: 'none',
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {tr('Tính năng & An toàn', 'Capabilities & Safety Checklist')}
                          </Typography>
                          <Chip
                            size="small"
                            color={form.features.length > 0 ? 'primary' : 'default'}
                            variant="outlined"
                            label={tr(`${form.features.length} đã chọn`, `${form.features.length} selected`)}
                            sx={{ height: 22, fontSize: '0.74rem', fontWeight: 600 }}
                          />
                        </Box>
                      <ExpandMoreRounded
                        fontSize="small"
                        sx={{
                          color: 'text.secondary',
                          transform: capabilitiesExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 160ms ease',
                        }}
                      />
                    </Box>

                    {!capabilitiesExpanded && form.features.length > 0 && (
                      <Box sx={{ px: 1.5, pb: 1.25, display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                        {form.features.map((code) => {
                          const feat = effectiveFeatures.find((item) => item.code === code);
                          const label = feat ? (locale === 'vi' ? feat.nameVi : feat.nameEn) : code;
                          return (
                            <Chip
                              key={code}
                              size="small"
                              label={label}
                              onDelete={() =>
                                setForm((curr) => ({
                                  ...curr,
                                  features: curr.features.filter((c) => c !== code),
                                }))
                              }
                              sx={{ fontSize: '0.76rem' }}
                            />
                          );
                        })}
                      </Box>
                    )}

                    <Collapse in={capabilitiesExpanded} unmountOnExit>
                      <Divider />
                      <Box sx={{ p: 1.5 }}>
                        {effectiveFeatures.length === 0 ? (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                            {tr(
                              'Chưa có danh mục tính năng cấu hình sẵn. Bạn có thể tự thêm tính năng bên dưới.',
                              'No pre-configured capabilities yet. Add custom capabilities below.',
                            )}
                          </Typography>
                        ) : (
                          <Box
                            sx={{
                              display: 'grid',
                              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                              gap: 1,
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
                        )}

                        {customFeatures.length > 0 && (
                          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 1.5 }}>
                            {customFeatures.map((custom) => (
                              <Chip
                                key={custom}
                                size="small"
                                color="primary"
                                variant="outlined"
                                label={custom}
                                onDelete={() =>
                                  setForm((curr) => ({
                                    ...curr,
                                    features: curr.features.filter((c) => c !== custom),
                                  }))
                                }
                              />
                            ))}
                          </Box>
                        )}

                        <Box sx={{ display: 'flex', gap: 1, mt: 1.5, alignItems: 'center' }}>
                          <TextField
                            size="small"
                            fullWidth
                            placeholder={tr(
                              'Thêm tính năng khác (VD: Loa phát thanh, Cảm biến khí)...',
                              'Add custom capability (e.g. Loudspeaker, Gas sensor)...',
                            )}
                            value={customFeatureInput}
                            onChange={(e) => setCustomFeatureInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddCustomFeature();
                              }
                            }}
                          />
                          <Button
                            type="button"
                            size="small"
                            variant="outlined"
                            startIcon={<AddRounded />}
                            onClick={handleAddCustomFeature}
                            disabled={!customFeatureInput.trim()}
                            sx={{ textTransform: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}
                          >
                            {tr('Thêm', 'Add')}
                          </Button>
                        </Box>
                      </Box>
                    </Collapse>
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
                  <Typography variant="caption" color="text.secondary">
                    {tr('PNG, JPG, WebP · tối đa 10 MB/ảnh', 'PNG, JPG, WebP · up to 10 MB/photo')}
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

      {/* MODAL DIALOG: XEM CHI TIẾT DRONE / HỒ SƠ ĐÃ GỬI */}
      <Dialog
        open={Boolean(detailTarget)}
        onClose={closeDetailModal}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '12px' } } }}
      >
        {detailTarget && (() => {
          const drone = detailTarget.drone;
          const app = detailTarget.application;
          const rawModel = drone?.model ?? app?.model ?? null;
          const parsed = parseDroneModelDisplay(rawModel);
          const manufacturer = drone?.manufacturer ?? app?.manufacturer;
          const serialNumber = drone?.serialNumber ?? app?.serialNumber ?? '—';
          const registrationNumber = drone?.registrationNumber ?? app?.registrationNumber ?? '—';
          const registrationExpiresAt = drone?.registrationExpiresAt ?? app?.registrationExpiresAt;
          const mtowKg = drone?.mtowKg ?? app?.mtowKg;
          const maxFlightTimeMinutes = drone?.maxFlightTimeMinutes ?? app?.maxFlightTimeMinutes;
          const cameraSensor = drone?.cameraSensor ?? app?.cameraSensor ?? parsed.camera;
          const maxWindResistanceMps = drone?.maxWindResistanceMps ?? app?.maxWindResistanceMps;
          const maxAltitudeMeters = drone?.maxAltitudeMeters ?? app?.maxAltitudeMeters;
          const opticalZoomLevel = drone?.opticalZoomLevel ?? app?.opticalZoomLevel;
          const legalClass = classifyDroneByMtow(mtowKg ?? rawModel);
          const featureItems = renderDroneFeatures(
            drone?.features ?? app?.features,
            drone?.hasThermalCamera ?? app?.hasThermalCamera,
            drone?.hasRtk ?? app?.hasRtk,
          );
          const photoUrls =
            drone && drone.imageFileKeys && drone.imageFileKeys.length > 0
              ? drone.imageFileKeys.map(
                (_, idx) => `/api/v1/drone-registration-applications/drones/${drone.id}/image?index=${idx}`,
              )
              : app && app.imageFileKeys && app.imageFileKeys.length > 0
                ? app.imageFileKeys.map(
                  (_, idx) => `/api/v1/drone-registration-applications/${app.id}/evidence/DRONE_IMAGE_${idx}`,
                )
                : [];

          return (
            <>
              <DialogTitle
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1.5,
                  fontWeight: 700,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap', minWidth: 0 }}>
                  <Typography variant="h6" component="span" sx={{ fontWeight: 700 }}>
                    {parsed.name}
                  </Typography>
                  {drone ? (
                    <Chip
                      size="small"
                      color={
                        drone.serviceability === 'ACTIVE'
                          ? 'success'
                          : drone.serviceability === 'RETIRED'
                            ? 'default'
                            : drone.serviceability === 'SUSPENDED'
                              ? 'error'
                              : 'warning'
                      }
                      variant={drone.serviceability === 'RETIRED' ? 'outlined' : 'filled'}
                      label={
                        drone.serviceability === 'ACTIVE'
                          ? tr('ĐANG HOẠT ĐỘNG', 'ACTIVE')
                          : drone.serviceability === 'RETIRED'
                            ? tr('NGƯNG HOẠT ĐỘNG', 'RETIRED')
                            : drone.serviceability === 'SUSPENDED'
                              ? tr('ĐÌNH CHỈ', 'SUSPENDED')
                              : tr('ĐANG BẢO TRÌ', 'MAINTENANCE')
                      }
                      sx={{ fontWeight: 700, fontSize: '0.72rem' }}
                    />
                  ) : app ? (
                    <Chip
                      size="small"
                      color={
                        app.status === 'APPROVED'
                          ? 'success'
                          : app.status === 'REJECTED'
                            ? 'error'
                            : 'warning'
                      }
                      label={app.status}
                      sx={{ fontWeight: 700, fontSize: '0.72rem' }}
                    />
                  ) : null}
                </Box>
                <IconButton
                  size="small"
                  onClick={closeDetailModal}
                  aria-label={tr('Đóng', 'Close')}
                >
                  <CloseRounded fontSize="small" />
                </IconButton>
              </DialogTitle>

              <DialogContent dividers>
                <Stack spacing={2.5}>
                  {app?.reviewNote && (
                    <Alert severity={app.status === 'REJECTED' ? 'error' : 'info'}>
                      <strong>{tr('Phản hồi của Manager:', 'Manager review note:')}</strong> {app.reviewNote}
                    </Alert>
                  )}

                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {tr('Hãng sản xuất', 'Manufacturer')}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {manufacturer || '—'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {tr('Số Serial thân máy', 'Airframe Serial Number')}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                        {serialNumber}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {tr('Số đăng ký phương tiện', 'Registration Number')}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {registrationNumber}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {tr('Hạn đăng kiểm / đăng ký', 'Registration Expiry')}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {registrationExpiresAt
                          ? new Date(registrationExpiresAt).toLocaleDateString(
                            locale === 'vi' ? 'vi-VN' : 'en-US',
                          )
                          : '—'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        MTOW
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {mtowKg != null ? `${mtowKg} kg` : parsed.mtow || '—'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {tr('Thời gian bay tối đa', 'Max Flight Time')}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {maxFlightTimeMinutes != null
                          ? `${maxFlightTimeMinutes} ${tr('phút', 'min')}`
                          : parsed.flightTime || '—'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {tr('Camera / Cảm biến', 'Camera / Sensor')}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {cameraSensor || '—'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {tr('Kháng gió tối đa', 'Wind Resistance')}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {maxWindResistanceMps != null ? `${maxWindResistanceMps} m/s` : '—'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {tr('Trần bay & Zoom', 'Max Altitude & Zoom')}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {[
                          maxAltitudeMeters != null ? `${maxAltitudeMeters} m` : null,
                          opticalZoomLevel ? `Zoom ${opticalZoomLevel}` : null,
                        ]
                          .filter(Boolean)
                          .join(' · ') || '—'}
                      </Typography>
                    </Box>
                  </Box>

                  {legalClass && (
                    <Box sx={{ p: 1.5, borderRadius: '8px', bgcolor: 'action.hover' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {legalClass.categoryLabel}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {tr('Yêu cầu bằng lái:', 'Required pilot license:')} {legalClass.requiredLicenseLabel}
                      </Typography>
                    </Box>
                  )}

                  {featureItems.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                        {tr('Tính năng & An toàn', 'Capabilities & Safety')}
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                        {featureItems.map((item) => (
                          <Chip
                            key={item.code}
                            size="small"
                            label={item.label}
                            sx={{ borderRadius: '6px', fontWeight: 500 }}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}

                  {photoUrls.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                        {tr('Hình ảnh thiết bị bay', 'Drone Photos')}
                      </Typography>
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                          gap: 1.5,
                        }}
                      >
                        {photoUrls.map((url, idx) => (
                          <Paper
                            key={url}
                            variant="outlined"
                            sx={{
                              borderRadius: '8px',
                              overflow: 'hidden',
                              p: 1,
                              display: 'flex',
                              justifyContent: 'center',
                              bgcolor: 'background.default',
                            }}
                          >
                            <AuthenticatedImage
                              src={url}
                              alt={`${parsed.name} #${idx + 1}`}
                              maxHeight={220}
                            />
                          </Paper>
                        ))}
                      </Box>
                    </Box>
                  )}

                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                      {tr('Giấy tờ pháp lý đính kèm', 'Attached Legal Documents')}
                    </Typography>
                    {detailDocsLoading ? (
                      <Typography variant="body2" color="text.secondary">
                        {tr('Đang tải tài liệu…', 'Loading documents…')}
                      </Typography>
                    ) : detailDocs.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        {tr('Không có tài liệu đính kèm khả dụng.', 'No attached legal documents available.')}
                      </Typography>
                    ) : (
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                          gap: 1.5,
                        }}
                      >
                        {detailDocs.map((doc) => (
                          <Paper key={doc.type} variant="outlined" sx={{ p: 1.5, borderRadius: '8px' }}>
                            <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 1 }}>
                              {doc.label}
                            </Typography>
                            {doc.failed ? (
                              <Alert severity="warning">
                                {tr('Không thể tải xem trước tài liệu.', 'Unable to preview document.')}
                              </Alert>
                            ) : doc.isPdf ? (
                              <Box
                                component="iframe"
                                src={doc.url}
                                title={doc.label}
                                sx={{ width: '100%', height: 220, border: 0, borderRadius: '6px' }}
                              />
                            ) : (
                              <Box
                                component="img"
                                src={doc.url}
                                alt={doc.label}
                                sx={{
                                  width: '100%',
                                  maxHeight: 220,
                                  objectFit: 'contain',
                                  borderRadius: '6px',
                                  bgcolor: 'background.default',
                                }}
                              />
                            )}
                            {doc.url && !doc.failed && (
                              <Button
                                size="small"
                                href={doc.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                startIcon={<OpenInNewRounded fontSize="small" />}
                                sx={{ mt: 0.75, textTransform: 'none' }}
                              >
                                {tr('Mở toàn màn hình', 'Open full size')}
                              </Button>
                            )}
                          </Paper>
                        ))}
                      </Box>
                    )}
                  </Box>
                </Stack>
              </DialogContent>
            </>
          );
        })()}
      </Dialog>
    </Box>
  );
}
