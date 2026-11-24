import { useMemo, useState, type ReactNode } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Link,
  Pagination,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import CheckCircleOutlineRounded from '@mui/icons-material/CheckCircleOutlineRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import HighlightOffRounded from '@mui/icons-material/HighlightOffRounded';
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded';
import UploadFileRounded from '@mui/icons-material/UploadFileRounded';
import FactCheckOutlined from '@mui/icons-material/FactCheckOutlined';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import AssignmentIndOutlined from '@mui/icons-material/AssignmentIndOutlined';
import FlightTakeoffRounded from '@mui/icons-material/FlightTakeoffRounded';
import ApartmentOutlined from '@mui/icons-material/ApartmentOutlined';
import { AdminTableToolbar } from '../components/AdminTableToolbar';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  mf1ReviewApi,
  type DroneRegistrationApplication,
  type ProspectiveCustomerReview,
} from '../api/mf1ReviewApi';
import {
  inspectorApplicationApi,
  type InspectorApplication,
} from '@/features/auth/api/inspectorApplicationApi';
import { droneFeatureConfigApi } from '@/features/assets/api/droneFeatureConfigApi';
import { EmptyState } from '@/shared/ui/EmptyState';
import { PageHeader } from '@/shared/ui/PageHeader';
import { StatusChip } from '@/shared/ui/StatusChip';
import { QueryState } from '@/shared/ui/QueryState';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useLocale } from '@/shared/i18n/LocaleProvider';

type QueueId = 'inspectors' | 'drones' | 'customers';
type SortOption = 'NEWEST' | 'OLDEST' | 'NAME_ASC';
type LicenseClassFilter = 'ALL' | 'CLASS_A' | 'CLASS_B';
type ScanFilter = 'ALL' | 'HAS_SCAN' | 'MISSING_SCAN';
type DroneTierFilter = 'ALL' | 'CLASS_A' | 'CLASS_B_REQUIRED' | 'LICENSE_MISMATCH';

function matchesLicenseClass(rawClass: string | null | undefined, expected: 'CLASS_A' | 'CLASS_B'): boolean {
  const normalized = (rawClass ?? '').trim().toUpperCase();
  if (expected === 'CLASS_B') {
    return normalized.includes('B') || normalized === 'CLASS_B';
  }
  return (normalized.includes('A') || normalized === 'CLASS_A') && !normalized.includes('B');
}

interface EvidenceDoc {
  label: string;
  type: string;
  url: string;
  isPdf: boolean;
  failed?: boolean;
}

function stripLegacySpecsFromModel(rawModel?: string | null): string {
  if (!rawModel) return '';
  return rawModel
    .replace(/\s*\[[^\]]*(?:MTOW:|Thời gian bay:|Flight time:|Camera(?:\s*\/\s*Sensor)?:)[^\]]*\]\s*$/i, '')
    .trim();
}

function resolveMtowCategoryInfo(mtow: number): {
  categoryLabel: string;
  requiredPilotLicenseLabel: string;
  requiresClassB: boolean;
} {
  if (mtow < 0.25) {
    return {
      categoryLabel: 'Loại 1 (< 0.25 kg)',
      requiredPilotLicenseLabel: 'Bằng Hạng A',
      requiresClassB: false,
    };
  }
  if (mtow < 2) {
    return {
      categoryLabel: 'Loại 2 (0.25 – < 2 kg)',
      requiredPilotLicenseLabel: 'Bằng Hạng A / B',
      requiresClassB: false,
    };
  }
  if (mtow < 25) {
    return {
      categoryLabel: 'Loại 3 (2 – < 25 kg)',
      requiredPilotLicenseLabel: 'Bằng Hạng B (≥ 2 kg)',
      requiresClassB: true,
    };
  }
  if (mtow < 150) {
    return {
      categoryLabel: 'Loại 4 (25 – < 150 kg)',
      requiredPilotLicenseLabel: 'Bằng Hạng B (≥ 2 kg)',
      requiresClassB: true,
    };
  }
  return {
    categoryLabel: 'Loại 5 (≥ 150 kg)',
    requiredPilotLicenseLabel: 'Bằng Hạng B (≥ 2 kg)',
    requiresClassB: true,
  };
}

function extractLegacyDroneSpecs(rawModel?: string | null): {
  mtowKg: number | null;
  maxFlightTimeMinutes: number | null;
  cameraSensor: string | null;
} {
  if (!rawModel) return { mtowKg: null, maxFlightTimeMinutes: null, cameraSensor: null };
  const mtowMatch = rawModel.match(/MTOW:\s*(\d+(?:[.,]\d+)?)/i);
  const timeMatch = rawModel.match(/(?:Thời gian bay|Flight time):\s*(\d+)/i);
  const camMatch = rawModel.match(/Camera(?:\s*\/\s*Sensor)?:\s*([^|\]]+)/i);
  const parsedMtow = mtowMatch?.[1] ? Number(mtowMatch[1].replace(',', '.')) : NaN;
  const parsedTime = timeMatch?.[1] ? Number(timeMatch[1]) : NaN;
  return {
    mtowKg: Number.isFinite(parsedMtow) && parsedMtow > 0 ? parsedMtow : null,
    maxFlightTimeMinutes: Number.isFinite(parsedTime) && parsedTime > 0 ? parsedTime : null,
    cameraSensor: camMatch?.[1]?.trim() || null,
  };
}

function classifyDroneLegalTier(
  applicationOrRaw?: DroneRegistrationApplication | string | null,
): {
  categoryLabel: string;
  requiredPilotLicenseLabel: string;
  requiresClassB: boolean;
} {
  const application =
    typeof applicationOrRaw === 'object' && applicationOrRaw !== null ? applicationOrRaw : null;
  const rawText = typeof applicationOrRaw === 'string' ? applicationOrRaw : application?.model;

  if (application?.mtowKg != null && application.mtowKg > 0) {
    return resolveMtowCategoryInfo(application.mtowKg);
  }
  if (application?.legalCategory) {
    const categoryRepresentativeMtow: Record<string, number> = {
      CATEGORY_1: 0.2,
      CATEGORY_2: 1.0,
      CATEGORY_3: 5.0,
      CATEGORY_4: 50.0,
      CATEGORY_5: 160.0,
    };
    const mappedMtow = categoryRepresentativeMtow[application.legalCategory];
    if (mappedMtow != null) {
      return resolveMtowCategoryInfo(mappedMtow);
    }
  }

  const legacySpecs = extractLegacyDroneSpecs(rawText);
  if (legacySpecs.mtowKg != null) {
    return resolveMtowCategoryInfo(legacySpecs.mtowKg);
  }

  const text = (rawText ?? '').toLowerCase();
  const fallbackMtow =
    text.includes('matrice') ||
    text.includes('m300') ||
    text.includes('m350') ||
    text.includes('m30') ||
    text.includes('inspire') ||
    text.includes('agras')
      ? 9.2
      : text.includes('mini')
        ? 0.249
        : 0.92;
  return resolveMtowCategoryInfo(fallbackMtow);
}

export default function Mf1ReviewPage({
  fixedQueue,
}: {
  fixedQueue?: QueueId;
} = {}) {
  const { locale, t } = useLocale();
  const tr = (vi: string, en: string) => (locale === 'vi' ? vi : en);
  const dateLocale = locale === 'vi' ? 'vi-VN' : 'en-US';

  const roles = useAuthStore((state) => state.roles);
  const isAdmin = roles.includes('ADMIN');
  const queryClient = useQueryClient();

  const queues = [
    { id: 'inspectors' as const, label: tr('Đơn Inspector', 'Inspector Applications'), icon: <AssignmentIndOutlined fontSize="small" /> },
    { id: 'drones' as const, label: tr('Duyệt Drone', 'Drone Registrations'), icon: <FlightTakeoffRounded fontSize="small" /> },
    ...(isAdmin
      ? [{ id: 'customers' as const, label: tr('Vùng bay khách hàng', 'Customer Airspace'), icon: <ApartmentOutlined fontSize="small" /> }]
      : []),
  ];

  const [selectedQueue, setSelectedQueue] = useState<QueueId>('drones');
  const queue = fixedQueue ?? selectedQueue;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [licenseClassFilter, setLicenseClassFilter] = useState<LicenseClassFilter>('ALL');
  const [scanFilter, setScanFilter] = useState<ScanFilter>('ALL');
  const [droneTierFilter, setDroneTierFilter] = useState<DroneTierFilter>('ALL');
  const [sort, setSort] = useState<SortOption>('NEWEST');
  const [page, setPage] = useState(0);
  const rowsPerPage = 10;

  // Review dialog state for drone registrations and customer airspace
  const [selected, setSelected] = useState<ReviewItem | null>(null);
  const [reviewQueue, setReviewQueue] = useState<'drones' | 'customers'>('drones');
  const [pendingDecision, setPendingDecision] = useState<'approve' | 'reject' | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [evidenceDocs, setEvidenceDocs] = useState<EvidenceDoc[]>([]);
  const [droneImages, setDroneImages] = useState<Array<{ label: string; url: string; failed?: boolean }>>([]);
  const [telemetryLoading, setTelemetryLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inspector application review dialog state
  const [selectedApplication, setSelectedApplication] = useState<InspectorApplication | null>(null);
  const [appPendingDecision, setAppPendingDecision] = useState<'approve' | 'reject' | null>(null);
  const [appRejectReason, setAppRejectReason] = useState('');
  const [appScanUrl, setAppScanUrl] = useState<string | null>(null);
  const [appScanIsPdf, setAppScanIsPdf] = useState(false);
  const [appScanLoading, setAppScanLoading] = useState(false);
  const [appPending, setAppPending] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);
  const [uploadingContractId, setUploadingContractId] = useState<string | null>(null);

  const customers = useQuery({
    queryKey: ['mf1-reviews', 'customers'],
    queryFn: mf1ReviewApi.pendingCustomers,
    enabled: isAdmin && (!fixedQueue || fixedQueue === 'customers'),
    retry: false,
  });

  const drones = useQuery({
    queryKey: ['mf1-reviews', 'drones'],
    queryFn: mf1ReviewApi.pendingDrones,
    enabled: !fixedQueue || fixedQueue === 'drones',
    retry: false,
    refetchInterval: 5000,
  });

  const droneHistory = useQuery({
    queryKey: ['mf1-reviews', 'drones-history'],
    queryFn: mf1ReviewApi.droneHistory,
    enabled: !fixedQueue || fixedQueue === 'drones',
    retry: false,
    refetchInterval: 8000,
  });

  const pendingInspectorApps = useQuery({
    queryKey: ['mf1-reviews', 'inspector-applications', 'pending'],
    queryFn: inspectorApplicationApi.listPending,
    enabled: !fixedQueue || fixedQueue === 'inspectors',
    retry: false,
    refetchInterval: 8000,
  });

  const awaitingContractApps = useQuery({
    queryKey: ['mf1-reviews', 'inspector-applications', 'awaiting-contract'],
    queryFn: inspectorApplicationApi.listApprovedAwaitingContract,
    enabled: !fixedQueue || fixedQueue === 'inspectors',
    retry: false,
    refetchInterval: 8000,
  });

  const featureConfigsQuery = useQuery({
    queryKey: ['drone-feature-configs-active'],
    queryFn: () => droneFeatureConfigApi.list(false),
    retry: false,
  });
  const droneFeatureConfigs = featureConfigsQuery.data ?? [];

  const changeQueue = (next: QueueId) => {
    setSelectedQueue(next);
    setSearch('');
    setStatusFilter('ALL');
    setLicenseClassFilter('ALL');
    setScanFilter('ALL');
    setDroneTierFilter('ALL');
    setSort('NEWEST');
    setPage(0);
  };

  const clearAllFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setLicenseClassFilter('ALL');
    setScanFilter('ALL');
    setDroneTierFilter('ALL');
    setSort('NEWEST');
    setPage(0);
  };

  const inspectorCounts = useMemo(
    () => ({
      all: (pendingInspectorApps.data?.length ?? 0) + (awaitingContractApps.data?.length ?? 0),
      pending: pendingInspectorApps.data?.length ?? 0,
      awaiting: awaitingContractApps.data?.length ?? 0,
    }),
    [awaitingContractApps.data?.length, pendingInspectorApps.data?.length],
  );

  const inspectorRows = useMemo(() => {
    const pending = (pendingInspectorApps.data ?? []).map((application) => ({
      kind: 'PENDING' as const,
      application,
    }));
    const awaiting = (awaitingContractApps.data ?? []).map((application) => ({
      kind: 'AWAITING_CONTRACT' as const,
      application,
    }));
    const query = search.trim().toLowerCase();
    const rows = [...pending, ...awaiting].filter(({ kind, application }) => {
      if (statusFilter === 'PENDING' && kind !== 'PENDING') return false;
      if (statusFilter === 'APPROVED' && kind !== 'AWAITING_CONTRACT') return false;
      if (licenseClassFilter !== 'ALL' && !matchesLicenseClass(application.pilotLicenseClass, licenseClassFilter)) {
        return false;
      }
      if (scanFilter === 'HAS_SCAN' && !application.hasLicenseScan) return false;
      if (scanFilter === 'MISSING_SCAN' && application.hasLicenseScan) return false;
      if (!query) return true;
      return (
        application.fullName.toLowerCase().includes(query) ||
        application.email.toLowerCase().includes(query) ||
        (application.phoneNumber ?? '').toLowerCase().includes(query) ||
        application.pilotLicenseNumber.toLowerCase().includes(query) ||
        application.citizenId.toLowerCase().includes(query)
      );
    });
    return rows.sort((left, right) => {
      if (sort === 'NAME_ASC') {
        return left.application.fullName.localeCompare(right.application.fullName, dateLocale, {
          sensitivity: 'base',
        });
      }
      const leftDate = new Date(left.application.createdAt).getTime();
      const rightDate = new Date(right.application.createdAt).getTime();
      return sort === 'NEWEST' ? rightDate - leftDate : leftDate - rightDate;
    });
  }, [
    awaitingContractApps.data,
    dateLocale,
    licenseClassFilter,
    pendingInspectorApps.data,
    scanFilter,
    search,
    sort,
    statusFilter,
  ]);

  const droneCounts = useMemo(() => {
    const pending = drones.data?.length ?? 0;
    let approved = 0;
    let rejected = 0;
    for (const app of droneHistory.data ?? []) {
      if (app.status === 'APPROVED') approved += 1;
      else rejected += 1;
    }
    return {
      all: pending + approved + rejected,
      pending,
      approved,
      rejected,
    };
  }, [droneHistory.data, drones.data?.length]);

  const droneRows = useMemo(() => {
    const pending = (drones.data ?? []).map((application) => ({
      status: 'PENDING' as const,
      application,
    }));
    const history = (droneHistory.data ?? []).map((application) => ({
      status: application.status === 'APPROVED' ? ('APPROVED' as const) : ('REJECTED' as const),
      application,
    }));
    const query = search.trim().toLowerCase();
    return [...pending, ...history]
      .filter(({ status, application }) => {
        if (statusFilter !== 'ALL' && status !== statusFilter) return false;
        if (droneTierFilter !== 'ALL') {
          const tier = classifyDroneLegalTier(application);
          const mismatch = tier.requiresClassB && application.inspectorPilotLicenseClass === 'CLASS_A';
          if (droneTierFilter === 'CLASS_A' && tier.requiresClassB) return false;
          if (droneTierFilter === 'CLASS_B_REQUIRED' && !tier.requiresClassB) return false;
          if (droneTierFilter === 'LICENSE_MISMATCH' && !mismatch) return false;
        }
        if (!query) return true;
        return (
          (application.model ?? '').toLowerCase().includes(query) ||
          (application.manufacturer ?? '').toLowerCase().includes(query) ||
          application.serialNumber.toLowerCase().includes(query) ||
          application.registrationNumber.toLowerCase().includes(query) ||
          (application.inspectorFullName ?? '').toLowerCase().includes(query) ||
          (application.inspectorEmail ?? '').toLowerCase().includes(query)
        );
      })
      .sort((left, right) => {
        if (sort === 'NAME_ASC') {
          const leftName = stripLegacySpecsFromModel(left.application.model) || left.application.model || '';
          const rightName = stripLegacySpecsFromModel(right.application.model) || right.application.model || '';
          return leftName.localeCompare(rightName, dateLocale, { sensitivity: 'base' });
        }
        const leftDate = new Date(left.application.createdAt).getTime();
        const rightDate = new Date(right.application.createdAt).getTime();
        return sort === 'NEWEST' ? rightDate - leftDate : leftDate - rightDate;
      });
  }, [dateLocale, droneHistory.data, droneTierFilter, drones.data, search, sort, statusFilter]);

  const customerRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...(customers.data ?? [])]
      .filter((review) => {
        if (statusFilter !== 'ALL' && review.status !== statusFilter) return false;
        if (!query) return true;
        return (
          review.organizationName.toLowerCase().includes(query) ||
          review.organizationCode.toLowerCase().includes(query) ||
          review.assetName.toLowerCase().includes(query) ||
          review.assetCode.toLowerCase().includes(query) ||
          (review.airspaceClassification ?? '').toLowerCase().includes(query)
        );
      })
      .sort((left, right) => {
        if (sort === 'NAME_ASC') {
          return left.organizationName.localeCompare(right.organizationName, dateLocale, {
            sensitivity: 'base',
          });
        }
        const leftDate = new Date(left.createdAt).getTime();
        const rightDate = new Date(right.createdAt).getTime();
        return sort === 'NEWEST' ? rightDate - leftDate : leftDate - rightDate;
      });
  }, [customers.data, dateLocale, search, sort, statusFilter]);

  const statusOptions =
    queue === 'inspectors'
      ? [
          { value: 'ALL', label: `${tr('Tất cả', 'All')} (${inspectorCounts.all})` },
          { value: 'PENDING', label: `${tr('Chờ duyệt', 'Pending')} (${inspectorCounts.pending})` },
          { value: 'APPROVED', label: `${tr('Chờ hợp đồng', 'Awaiting contract')} (${inspectorCounts.awaiting})` },
        ]
      : queue === 'drones'
        ? [
            { value: 'ALL', label: `${tr('Tất cả', 'All')} (${droneCounts.all})` },
            { value: 'PENDING', label: `${tr('Chờ duyệt', 'Pending')} (${droneCounts.pending})` },
            { value: 'APPROVED', label: `${tr('Đã duyệt', 'Approved')} (${droneCounts.approved})` },
            { value: 'REJECTED', label: `${tr('Từ chối', 'Rejected')} (${droneCounts.rejected})` },
          ]
        : [
            { value: 'ALL', label: `${tr('Tất cả', 'All')} (${customers.data?.length ?? 0})` },
            { value: 'PENDING', label: `${tr('Chờ duyệt', 'Pending')} (${customers.data?.length ?? 0})` },
          ];

  const clearReview = () => {
    setSelected(null);
    setPendingDecision(null);
    setReviewNote('');
    evidenceDocs.forEach((doc) => {
      if (doc.url) URL.revokeObjectURL(doc.url);
    });
    droneImages.forEach((img) => {
      if (img.url) URL.revokeObjectURL(img.url);
    });
    setEvidenceDocs([]);
    setDroneImages([]);
    setTelemetryLoading(false);
    setError(null);
  };

  const openDroneReview = async (application: DroneRegistrationApplication) => {
    clearReview();
    setReviewQueue('drones');
    setSelected(application);
    setTelemetryLoading(true);
    try {
      const documents = Object.keys(application.documentFiles ?? {}).length
        ? Object.keys(application.documentFiles ?? {}).map((code) => ({
            label: code,
            type: code,
            load: () => mf1ReviewApi.droneEvidence(application.id, code),
          }))
        : [
            {
              label: tr('Đăng ký drone', 'Drone registration'),
              type: 'REGISTRATION',
              load: () => mf1ReviewApi.droneEvidence(application.id, 'REGISTRATION'),
            },
            {
              label: tr('Chứng từ sở hữu', 'Proof of ownership'),
              type: 'OWNERSHIP',
              load: () => mf1ReviewApi.droneEvidence(application.id, 'OWNERSHIP'),
            },
          ];
      const imageEntries = (application.imageFileKeys ?? []).map((_, index) => ({
        label: tr(`Ảnh drone #${index + 1}`, `Drone photo #${index + 1}`),
        type: `DRONE_IMAGE_${index}`,
        load: () => mf1ReviewApi.droneEvidence(application.id, `DRONE_IMAGE_${index}`),
      }));
      const [docResults, imageResults] = await Promise.all([
        Promise.allSettled(
          documents.map(async (doc) => {
            const blob = await doc.load();
            return {
              label: doc.label,
              type: doc.type,
              url: URL.createObjectURL(blob),
              isPdf: blob.type === 'application/pdf' || blob.type.endsWith('/pdf'),
            };
          }),
        ),
        Promise.allSettled(
          imageEntries.map(async (entry) => {
            const blob = await entry.load();
            return {
              label: entry.label,
              url: URL.createObjectURL(blob),
            };
          }),
        ),
      ]);
      setEvidenceDocs(
        docResults.map((result, index) =>
          result.status === 'fulfilled'
            ? result.value
            : {
                label: documents[index]?.label ?? tr('Tài liệu', 'Document'),
                type: documents[index]?.type ?? 'UNKNOWN',
                url: '',
                isPdf: false,
                failed: true,
              },
        ),
      );
      setDroneImages(
        imageResults.map((result, index) =>
          result.status === 'fulfilled'
            ? result.value
            : {
                label: imageEntries[index]?.label ?? tr('Ảnh drone', 'Drone photo'),
                url: '',
                failed: true,
              },
        ),
      );
    } catch {
      setError(tr('Không thể tải tài liệu hình ảnh. Vui lòng thử lại sau.', 'Could not load document evidence. Please try again later.'));
    } finally {
      setTelemetryLoading(false);
    }
  };

  const openCustomerReview = (review: ProspectiveCustomerReview) => {
    clearReview();
    setReviewQueue('customers');
    setSelected(review);
  };

  const submitReview = async (decision: 'approve' | 'reject') => {
    if (!selected) return;
    if (decision === 'reject' && !reviewNote.trim()) {
      setError(tr('Vui lòng nêu rõ lý do từ chối để Inspector bổ sung lại.', 'Please provide a clear rejection reason so the applicant can resubmit.'));
      return;
    }
    if (reviewQueue === 'customers' && decision === 'approve' && !reviewNote.trim()) {
      setError(tr('Ghi chú xét duyệt là bắt buộc đối với vùng bay khách hàng.', 'A review note is required when approving customer airspace.'));
      return;
    }
    setPending(true);
    setPendingDecision(decision);
    setError(null);
    try {
      if (reviewQueue === 'customers') {
        if (decision === 'approve') await mf1ReviewApi.approveCustomer(selected.id, reviewNote.trim());
        else await mf1ReviewApi.rejectCustomer(selected.id, reviewNote.trim());
      } else if (decision === 'approve') {
        await mf1ReviewApi.approveDrone(selected.id);
      } else {
        await mf1ReviewApi.rejectDrone(selected.id, reviewNote.trim());
      }
      await queryClient.invalidateQueries({ queryKey: ['mf1-reviews'] });
      clearReview();
    } catch {
      setError(tr('Không thể lưu quyết định duyệt. Vui lòng tải lại trang và thử lại.', 'Could not save review decision. Please reload and try again.'));
    } finally {
      setPending(false);
      setPendingDecision(null);
    }
  };

  const closeInspectorAppDialog = () => {
    if (appPending) return;
    setSelectedApplication(null);
    setAppPendingDecision(null);
    setAppRejectReason('');
    if (appScanUrl) URL.revokeObjectURL(appScanUrl);
    setAppScanUrl(null);
    setAppScanIsPdf(false);
    setAppScanLoading(false);
    setAppError(null);
  };

  const openInspectorAppReview = async (application: InspectorApplication) => {
    if (appScanUrl) URL.revokeObjectURL(appScanUrl);
    setAppScanUrl(null);
    setAppScanIsPdf(false);
    setSelectedApplication(application);
    setAppPendingDecision(null);
    setAppRejectReason('');
    setAppError(null);
    if (!application.hasLicenseScan) return;
    setAppScanLoading(true);
    try {
      const blob = await inspectorApplicationApi.getLicenseScanBlob(application.id);
      setAppScanUrl(URL.createObjectURL(blob));
      setAppScanIsPdf(blob.type.toLowerCase().includes('pdf'));
    } catch {
      setAppError(tr('Không thể tải bản scan bằng lái.', 'Could not load the license scan.'));
    } finally {
      setAppScanLoading(false);
    }
  };

  const submitInspectorAppReview = async (decision: 'approve' | 'reject') => {
    if (!selectedApplication) return;
    setAppError(null);
    if (decision === 'reject' && appRejectReason.trim().length === 0) {
      setAppError(tr('Vui lòng nhập lý do từ chối để hệ thống gửi email thông báo cho ứng viên.', 'Please enter a rejection reason to notify the applicant by email.'));
      return;
    }
    setAppPending(true);
    setAppPendingDecision(decision);
    try {
      if (decision === 'approve') await inspectorApplicationApi.approve(selectedApplication.id);
      else await inspectorApplicationApi.reject(selectedApplication.id, appRejectReason.trim());
      await queryClient.invalidateQueries({ queryKey: ['mf1-reviews', 'inspector-applications'] });
      await queryClient.invalidateQueries({ queryKey: ['platform-users'] });
      closeInspectorAppDialog();
    } catch (err: unknown) {
      setAppError(err instanceof Error ? err.message : tr('Không thể xử lý đơn đăng ký Inspector. Vui lòng thử lại.', 'Could not process this inspector application. Please try again.'));
    } finally {
      setAppPending(false);
      setAppPendingDecision(null);
    }
  };

  const uploadSignedContract = async (application: InspectorApplication, file: File) => {
    setUploadingContractId(application.id);
    setAppError(null);
    try {
      await inspectorApplicationApi.uploadSignedContract(application.id, file);
      await queryClient.invalidateQueries({ queryKey: ['mf1-reviews', 'inspector-applications'] });
    } catch (err: unknown) {
      setAppError(err instanceof Error ? err.message : tr('Không thể tải lên bản scan hợp đồng. Vui lòng thử lại.', 'Could not upload signed contract scan. Please try again.'));
    } finally {
      setUploadingContractId(null);
    }
  };

  const queueCounts = {
    inspectors: (pendingInspectorApps.data?.length ?? 0) + (awaitingContractApps.data?.length ?? 0),
    drones: (drones.data?.length ?? 0) + (droneHistory.data?.length ?? 0),
    customers: customers.data?.length ?? 0,
  };

  const visibleCount =
    queue === 'inspectors' ? inspectorRows.length : queue === 'drones' ? droneRows.length : customerRows.length;
  const totalCount = queueCounts[queue];
  const maxPage = Math.max(0, Math.ceil(visibleCount / rowsPerPage) - 1);
  const safePage = Math.min(page, maxPage);
  const pagedInspectorRows = inspectorRows.slice(safePage * rowsPerPage, (safePage + 1) * rowsPerPage);
  const pagedDroneRows = droneRows.slice(safePage * rowsPerPage, (safePage + 1) * rowsPerPage);
  const pagedCustomerRows = customerRows.slice(safePage * rowsPerPage, (safePage + 1) * rowsPerPage);

  const hasActiveFilters =
    search.trim().length > 0 ||
    statusFilter !== 'ALL' ||
    licenseClassFilter !== 'ALL' ||
    scanFilter !== 'ALL' ||
    droneTierFilter !== 'ALL' ||
    sort !== 'NEWEST';

  const pageTitle = fixedQueue
    ? fixedQueue === 'inspectors'
      ? t('Inspector applications')
      : fixedQueue === 'drones'
        ? t('Drone registrations')
        : t('Customer airspace')
    : tr('Xét duyệt hồ sơ (MF1)', 'Compliance reviews');

  return (
    <Box className="workspace-page" sx={{ maxWidth: 1200, mx: 'auto', pb: 6 }}>
      <PageHeader
        title={pageTitle}
        breadcrumbs={[
          { label: tr('Quản trị', 'Governance'), to: isAdmin ? '/admin/dashboard' : '/manager/dashboard' },
          { label: pageTitle },
        ]}
      />

      {!fixedQueue && (
        <Tabs
          value={queue}
          onChange={(_, value: QueueId) => changeQueue(value)}
          aria-label="MF1 review queues"
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            mb: 2,
            '& .MuiTab-root': {
              minHeight: 44,
              fontWeight: 600,
              textTransform: 'none',
              fontSize: '0.875rem',
              px: 1.75,
              gap: 0.75,
            },
          }}
        >
          {queues.map((entry) => (
            <Tab
              key={entry.id}
              value={entry.id}
              icon={entry.icon}
              iconPosition="start"
              label={`${entry.label} (${queueCounts[entry.id]})`}
            />
          ))}
        </Tabs>
      )}

      <AdminTableToolbar
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(0);
        }}
        searchPlaceholder={
          queue === 'inspectors'
            ? tr('Tìm tên, email, SĐT, bằng lái…', 'Search name, email, phone, license…')
            : queue === 'drones'
              ? tr('Tìm model, serial, đăng ký, inspector…', 'Search drone, serial, reg, applicant…')
              : tr('Tìm khách hàng, mã, tài sản hoặc vùng bay…', 'Search customer, code, asset, or airspace…')
        }
        visibleCount={visibleCount}
        totalCount={totalCount}
        onClearAll={clearAllFilters}
        filters={
          queue === 'inspectors'
            ? [
                {
                  key: 'status',
                  label: tr('Trạng thái', 'Status'),
                  value: statusFilter,
                  options: statusOptions,
                  onChange: (value) => {
                    setStatusFilter(value);
                    setPage(0);
                  },
                  width: 155,
                },
                {
                  key: 'licenseClass',
                  label: tr('Hạng bằng lái', 'License class'),
                  value: licenseClassFilter,
                  options: [
                    { value: 'ALL', label: tr('Tất cả hạng', 'All classes') },
                    { value: 'CLASS_A', label: tr('Hạng A', 'Class A') },
                    { value: 'CLASS_B', label: tr('Hạng B', 'Class B') },
                  ],
                  onChange: (value) => {
                    setLicenseClassFilter(value as LicenseClassFilter);
                    setPage(0);
                  },
                  width: 125,
                },
                {
                  key: 'scan',
                  label: tr('Bản scan', 'License scan'),
                  value: scanFilter,
                  options: [
                    { value: 'ALL', label: tr('Tất cả tài liệu', 'All documents') },
                    { value: 'HAS_SCAN', label: tr('Đã có scan', 'Scan uploaded') },
                    { value: 'MISSING_SCAN', label: tr('Thiếu scan', 'Missing scan') },
                  ],
                  onChange: (value) => {
                    setScanFilter(value as ScanFilter);
                    setPage(0);
                  },
                  width: 135,
                },
                {
                  key: 'sort',
                  label: tr('Sắp xếp', 'Sort'),
                  value: sort,
                  allValue: 'NEWEST',
                  options: [
                    { value: 'NEWEST', label: tr('Mới nhất', 'Newest first') },
                    { value: 'OLDEST', label: tr('Cũ nhất', 'Oldest first') },
                    { value: 'NAME_ASC', label: tr('Tên A–Z', 'Name A–Z') },
                  ],
                  onChange: (value) => setSort(value as SortOption),
                  width: 125,
                },
              ]
            : queue === 'drones'
              ? [
                  {
                    key: 'status',
                    label: tr('Trạng thái', 'Status'),
                    value: statusFilter,
                    options: statusOptions,
                    onChange: (value) => {
                      setStatusFilter(value);
                      setPage(0);
                    },
                    width: 155,
                  },
                  {
                    key: 'tier',
                    label: tr('Phân hạng MTOW', 'Aircraft tier'),
                    value: droneTierFilter,
                    options: [
                      { value: 'ALL', label: tr('Tất cả hạng bay', 'All tiers') },
                      { value: 'CLASS_A', label: tr('Nhẹ (< 2 kg)', 'Light (< 2 kg)') },
                      { value: 'CLASS_B_REQUIRED', label: tr('Cần Hạng B (≥ 2 kg)', 'Class B req (≥ 2 kg)') },
                      { value: 'LICENSE_MISMATCH', label: tr('Cảnh báo thiếu Hạng B', 'License mismatch') },
                    ],
                    onChange: (value) => {
                      setDroneTierFilter(value as DroneTierFilter);
                      setPage(0);
                    },
                    width: 185,
                  },
                  {
                    key: 'sort',
                    label: tr('Sắp xếp', 'Sort'),
                    value: sort,
                    allValue: 'NEWEST',
                    options: [
                      { value: 'NEWEST', label: tr('Mới nhất', 'Newest first') },
                      { value: 'OLDEST', label: tr('Cũ nhất', 'Oldest first') },
                      { value: 'NAME_ASC', label: tr('Model A–Z', 'Model A–Z') },
                    ],
                    onChange: (value) => setSort(value as SortOption),
                    width: 145,
                  },
                ]
              : [
                  {
                    key: 'status',
                    label: tr('Trạng thái', 'Status'),
                    value: statusFilter,
                    options: statusOptions,
                    onChange: (value) => {
                      setStatusFilter(value);
                      setPage(0);
                    },
                    width: 155,
                  },
                  {
                    key: 'sort',
                    label: tr('Sắp xếp', 'Sort'),
                    value: sort,
                    allValue: 'NEWEST',
                    options: [
                      { value: 'NEWEST', label: tr('Mới nhất', 'Newest first') },
                      { value: 'OLDEST', label: tr('Cũ nhất', 'Oldest first') },
                      { value: 'NAME_ASC', label: tr('Tên A–Z', 'Name A–Z') },
                    ],
                    onChange: (value) => setSort(value as SortOption),
                    width: 150,
                  },
                ]
        }
      />

      {queue === 'inspectors' && (
        <QueryState
          isLoading={pendingInspectorApps.isLoading || awaitingContractApps.isLoading}
          error={pendingInspectorApps.error ?? awaitingContractApps.error}
          onRetry={() => {
            void pendingInspectorApps.refetch();
            void awaitingContractApps.refetch();
          }}
          isEmpty={inspectorRows.length === 0}
          empty={
            <EmptyState
              title={tr('Không có hồ sơ Inspector nào.', 'No inspector applications')}
              description={tr('Thử điều chỉnh từ khóa tìm kiếm hoặc xóa bộ lọc đang áp dụng.', 'Try adjusting your search or clearing the active filters.')}
              action={
                hasActiveFilters ? (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={clearAllFilters}
                    sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                  >
                    {tr('Xóa bộ lọc', 'Clear filters')}
                  </Button>
                ) : undefined
              }
            />
          }
        >
          <QueueTable
            headers={[
              tr('Ứng viên', 'Applicant'),
              tr('Bằng lái', 'License'),
              tr('Tài liệu', 'Documents'),
              tr('Ngày nộp', 'Submitted'),
              '',
            ]}
            ariaLabel={tr('Đơn đăng ký Inspector', 'Inspector applications')}
            totalCount={inspectorRows.length}
            page={safePage}
            rowsPerPage={rowsPerPage}
            onPageChange={setPage}
            summaryText={`${t('Showing')} ${safePage * rowsPerPage + 1}–${Math.min((safePage + 1) * rowsPerPage, inspectorRows.length)} ${t('of')} ${inspectorRows.length}`}
          >
            {pagedInspectorRows.map(({ kind, application }) => (
              <TableRow
                key={application.id}
                hover
                tabIndex={0}
                onClick={() => void openInspectorAppReview(application)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    void openInspectorAppReview(application);
                  }
                }}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell>
                  <Typography sx={{ fontWeight: 650, fontSize: '0.875rem' }}>
                    {application.fullName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {application.email} · {tr('CCCD', 'Citizen ID')}: {application.citizenId}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{application.pilotLicenseNumber}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {application.pilotLicenseClass}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
                    <Chip
                      size="small"
                      label={application.hasLicenseScan ? tr('Bằng lái', 'License scan') : tr('Thiếu bằng lái', 'Missing license')}
                      color={application.hasLicenseScan ? 'success' : 'error'}
                      variant="outlined"
                      sx={{ fontWeight: 600 }}
                    />
                    <Chip
                      size="small"
                      label={kind === 'AWAITING_CONTRACT' ? tr('Chờ hợp đồng', 'Awaiting contract') : tr('Chờ duyệt', 'Pending')}
                      color={kind === 'AWAITING_CONTRACT' ? 'info' : 'warning'}
                      variant="outlined"
                      sx={{ fontWeight: 600 }}
                    />
                  </Stack>
                </TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  {new Date(application.createdAt).toLocaleDateString(dateLocale)}
                </TableCell>
                <TableCell align="right">
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<FactCheckOutlined />}
                    onClick={(event) => {
                      event.stopPropagation();
                      void openInspectorAppReview(application);
                    }}
                    sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                  >
                    {tr('Xem hồ sơ & Duyệt', 'Review application')}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </QueueTable>
        </QueryState>
      )}

      {queue === 'drones' && (
        <QueryState
          isLoading={drones.isLoading || droneHistory.isLoading}
          error={drones.error ?? droneHistory.error}
          onRetry={() => {
            void drones.refetch();
            void droneHistory.refetch();
          }}
          isEmpty={droneRows.length === 0}
          empty={
            <EmptyState
              title={tr('Không có hồ sơ drone nào.', 'No drone registrations')}
              description={tr('Thử điều chỉnh từ khóa tìm kiếm hoặc xóa bộ lọc đang áp dụng.', 'Try adjusting your search or clearing the active filters.')}
              action={
                hasActiveFilters ? (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={clearAllFilters}
                    sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                  >
                    {tr('Xóa bộ lọc', 'Clear filters')}
                  </Button>
                ) : undefined
              }
            />
          }
        >
          <QueueTable
            headers={[
              tr('Drone', 'Drone'),
              tr('Người gửi', 'Applicant'),
              tr('Serial / Đăng ký', 'Serial / Registration'),
              tr('Trạng thái', 'Status'),
              '',
            ]}
            ariaLabel={tr('Đăng ký Drone', 'Drone registrations')}
            totalCount={droneRows.length}
            page={safePage}
            rowsPerPage={rowsPerPage}
            onPageChange={setPage}
            summaryText={`${t('Showing')} ${safePage * rowsPerPage + 1}–${Math.min((safePage + 1) * rowsPerPage, droneRows.length)} ${t('of')} ${droneRows.length}`}
          >
            {pagedDroneRows.map(({ status, application }) => {
              const cleanModel = stripLegacySpecsFromModel(application.model) || application.model;
              const legacySpecs = extractLegacyDroneSpecs(application.model);
              const mtowKg = application.mtowKg ?? legacySpecs.mtowKg;
              const maxFlightTime =
                application.maxFlightTimeMinutes ?? legacySpecs.maxFlightTimeMinutes;
              const cameraSensor = application.cameraSensor ?? legacySpecs.cameraSensor;
              const tier = classifyDroneLegalTier(application);
              const licenseWarning =
                tier.requiresClassB && application.inspectorPilotLicenseClass === 'CLASS_A';
              const specLine = [
                mtowKg != null ? `${mtowKg} kg` : null,
                maxFlightTime != null ? `${maxFlightTime} ${tr('phút', 'min')}` : null,
                cameraSensor,
              ]
                .filter(Boolean)
                .join(' · ');
              return (
                <TableRow
                  key={application.id}
                  hover
                  tabIndex={0}
                  onClick={() => void openDroneReview(application)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      void openDroneReview(application);
                    }
                  }}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>
                    <Typography sx={{ fontWeight: 650, fontSize: '0.875rem' }}>
                      {cleanModel || tr('Thiết bị Drone', 'Drone Aircraft')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {application.manufacturer || '—'} · {tier.categoryLabel}
                    </Typography>
                    {specLine && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontVariantNumeric: 'tabular-nums' }}>
                        {specLine}
                      </Typography>
                    )}
                    {licenseWarning && (
                      <Typography variant="caption" sx={{ display: 'block', color: 'warning.main' }}>
                        {tr('Cần Bằng Hạng B', 'Class B license required')}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {application.inspectorFullName || 'Inspector'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {application.inspectorEmail || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {application.serialNumber}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {application.registrationNumber}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <StatusChip
                      status={
                        status === 'APPROVED' ? 'approved' : status === 'REJECTED' ? 'rejected' : 'pending'
                      }
                      label={
                        status === 'APPROVED'
                          ? tr('Đã duyệt', 'Approved')
                          : status === 'REJECTED'
                            ? tr('Từ chối', 'Rejected')
                            : tr('Chờ duyệt', 'Pending')
                      }
                    />
                  </TableCell>
                  <TableCell align="right">
                    {status === 'PENDING' ? (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<FactCheckOutlined />}
                        onClick={(event) => {
                          event.stopPropagation();
                          void openDroneReview(application);
                        }}
                        sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                      >
                        {tr('Thẩm định hồ sơ', 'Review application')}
                      </Button>
                    ) : (
                      <Button
                        size="small"
                        variant="outlined"
                        color="inherit"
                        startIcon={<VisibilityOutlined />}
                        onClick={(event) => {
                          event.stopPropagation();
                          void openDroneReview(application);
                        }}
                        sx={{
                          borderRadius: '8px',
                          textTransform: 'none',
                          fontWeight: 600,
                          borderColor: 'divider',
                          color: 'text.secondary',
                        }}
                      >
                        {tr('Xem chi tiết', 'View details')}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </QueueTable>
        </QueryState>
      )}

      {queue === 'customers' && (
        <QueryState
          isLoading={customers.isLoading}
          error={customers.error}
          onRetry={() => void customers.refetch()}
          isEmpty={customerRows.length === 0}
          empty={
            <EmptyState
              title={tr('Không có vùng bay khách hàng nào.', 'No customer airspace reviews')}
              description={tr('Thử điều chỉnh từ khóa tìm kiếm hoặc xóa bộ lọc đang áp dụng.', 'Try adjusting your search or clearing the active filters.')}
              action={
                hasActiveFilters ? (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={clearAllFilters}
                    sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                  >
                    {tr('Xóa bộ lọc', 'Clear filters')}
                  </Button>
                ) : undefined
              }
            />
          }
        >
          <QueueTable
            headers={[
              tr('Khách hàng', 'Customer'),
              tr('Tài sản', 'Asset'),
              tr('Phân loại vùng bay', 'Airspace'),
              tr('Ngày nộp', 'Submitted'),
              '',
            ]}
            ariaLabel={tr('Vùng bay khách hàng', 'Customer airspace')}
            totalCount={customerRows.length}
            page={safePage}
            rowsPerPage={rowsPerPage}
            onPageChange={setPage}
            summaryText={`${t('Showing')} ${safePage * rowsPerPage + 1}–${Math.min((safePage + 1) * rowsPerPage, customerRows.length)} ${t('of')} ${customerRows.length}`}
          >
            {pagedCustomerRows.map((review) => (
              <TableRow
                key={review.id}
                hover
                tabIndex={0}
                onClick={() => openCustomerReview(review)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openCustomerReview(review);
                  }
                }}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell>
                  <Typography sx={{ fontWeight: 650, fontSize: '0.875rem' }}>
                    {review.organizationName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {review.organizationCode}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{review.assetName}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {review.assetCode}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    variant="outlined"
                    label={review.airspaceClassification || 'UNKNOWN'}
                    sx={{ fontWeight: 600 }}
                  />
                </TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  {new Date(review.createdAt).toLocaleDateString(dateLocale)}
                </TableCell>
                <TableCell align="right">
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<FactCheckOutlined />}
                    onClick={(event) => {
                      event.stopPropagation();
                      openCustomerReview(review);
                    }}
                    sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                  >
                    {tr('Thẩm định', 'Review')}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </QueueTable>
        </QueryState>
      )}

      {/* Drone / customer review dialog */}
      <Dialog open={Boolean(selected)} onClose={() => (pending ? undefined : clearReview())} fullWidth maxWidth="md">
        {selected && (
          <>
            <DialogTitle
              sx={{
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                pr: 1.5,
              }}
            >
              <span>{tr('Thẩm định hồ sơ Phương tiện Drone', 'Review Compliance Application')}</span>
              <IconButton
                size="small"
                onClick={clearReview}
                disabled={pending}
                aria-label={tr('Đóng', 'Close')}
                sx={{ color: 'text.secondary' }}
              >
                <CloseRounded fontSize="small" />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <Stack spacing={2}>
                {error && <Alert severity="error">{error}</Alert>}

                {reviewQueue === 'drones' ? (
                  <>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                        gap: 1.5,
                      }}
                    >
                      {(() => {
                        const droneApp = selected as DroneRegistrationApplication;
                        const legacy = extractLegacyDroneSpecs(droneApp.model);
                        const mtowVal = droneApp.mtowKg ?? legacy.mtowKg;
                        const flightTimeVal =
                          droneApp.maxFlightTimeMinutes ?? legacy.maxFlightTimeMinutes;
                        const cameraVal = droneApp.cameraSensor ?? legacy.cameraSensor;
                        return (
                          <>
                            <DetailField
                              label={tr('Drone', 'Drone')}
                              value={stripLegacySpecsFromModel(droneApp.model) || droneApp.model}
                            />
                            <DetailField label={tr('Serial', 'Serial')} value={droneApp.serialNumber} />
                            <DetailField
                              label={tr('Số đăng ký', 'Registration')}
                              value={droneApp.registrationNumber}
                            />
                            {mtowVal != null && <DetailField label="MTOW" value={`${mtowVal} kg`} />}
                            {flightTimeVal != null && (
                              <DetailField
                                label={tr('Thời gian bay tối đa', 'Max flight time')}
                                value={`${flightTimeVal} ${tr('phút', 'min')}`}
                              />
                            )}
                            {cameraVal && (
                              <DetailField
                                label={tr('Camera / Cảm biến', 'Camera / Sensor')}
                                value={cameraVal}
                              />
                            )}
                            <DetailField
                              label={tr('Người gửi', 'Applicant')}
                              value={droneApp.inspectorFullName}
                            />
                            <DetailField
                              label={tr('Email', 'Email')}
                              value={droneApp.inspectorEmail}
                            />
                            <DetailField
                              label={tr('Bằng lái', 'Pilot license')}
                              value={droneApp.inspectorPilotLicenseNumber}
                            />
                          </>
                        );
                      })()}
                    </Box>
                    {(() => {
                      const droneApp = selected as DroneRegistrationApplication;
                      const featureCodes =
                        droneApp.features && droneApp.features.length > 0
                          ? droneApp.features
                          : [
                              ...(droneApp.hasRtk ? ['RTK_POSITIONING'] : []),
                              ...(droneApp.hasThermalCamera ? ['THERMAL_CAMERA'] : []),
                            ];
                      if (featureCodes.length === 0) return null;
                      return (
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                            {tr('Tính năng & An toàn khai báo', 'Declared Capabilities & Safety')}
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                            {featureCodes.map((code) => {
                              const cfg = droneFeatureConfigs.find((item) => item.code === code);
                              const label = cfg ? (locale === 'vi' ? cfg.nameVi : cfg.nameEn) : code;
                              return <Chip key={code} size="small" label={label} variant="outlined" />;
                            })}
                          </Box>
                        </Box>
                      );
                    })()}
                    <Divider />
                    {((selected as DroneRegistrationApplication).imageFileKeys?.length ?? 0) > 0 && (
                      <Box>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem', mb: 1 }}>
                          {tr('Hình ảnh thiết bị bay', 'Drone photos')}
                        </Typography>
                        {telemetryLoading ? (
                          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', py: 2 }}>
                            <CircularProgress size={22} />
                            <Typography color="text.secondary">
                              {tr('Đang tải ảnh drone…', 'Loading drone photos…')}
                            </Typography>
                          </Stack>
                        ) : (
                          <Box
                            sx={{
                              display: 'grid',
                              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                              gap: 1.5,
                            }}
                          >
                            {droneImages.map((img) => (
                              <Box
                                key={img.label}
                                sx={{
                                  border: '1px solid',
                                  borderColor: 'divider',
                                  borderRadius: '8px',
                                  p: 1.25,
                                }}
                              >
                                <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.75 }}>
                                  {img.label}
                                </Typography>
                                {img.failed || !img.url ? (
                                  <Typography variant="caption" color="error.main">
                                    {tr('Không tải được ảnh', 'Photo unavailable')}
                                  </Typography>
                                ) : (
                                  <Box
                                    component="img"
                                    src={img.url}
                                    alt={img.label}
                                    sx={{
                                      width: '100%',
                                      height: 180,
                                      objectFit: 'contain',
                                      borderRadius: '6px',
                                      bgcolor: 'background.default',
                                    }}
                                  />
                                )}
                                {img.url && (
                                  <Link
                                    href={img.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    underline="hover"
                                    sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mt: 0.75, fontSize: '0.75rem' }}
                                  >
                                    <OpenInNewRounded sx={{ fontSize: 14 }} />
                                    {tr('Mở toàn màn hình', 'Open full size')}
                                  </Link>
                                )}
                              </Box>
                            ))}
                          </Box>
                        )}
                      </Box>
                    )}
                    <Box>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem', mb: 1 }}>
                        {tr('Tài liệu đính kèm', 'Evidence documents')}
                      </Typography>
                      {telemetryLoading ? (
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', py: 2 }}>
                          <CircularProgress size={22} />
                          <Typography color="text.secondary">
                            {tr('Đang tải tài liệu…', 'Loading documents…')}
                          </Typography>
                        </Stack>
                      ) : evidenceDocs.length === 0 ? (
                        <Alert severity="info">{tr('Không có tài liệu đính kèm.', 'No evidence documents attached.')}</Alert>
                      ) : (
                        <Box
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                            gap: 1.5,
                          }}
                        >
                          {evidenceDocs.map((doc) => (
                            <Box
                              key={`${doc.type}-${doc.label}`}
                              sx={{
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: '8px',
                                p: 1.25,
                              }}
                            >
                              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.75 }}>
                                {doc.label}
                              </Typography>
                              {doc.failed || !doc.url ? (
                                <Typography variant="caption" color="error.main">
                                  {tr('Không tải được tài liệu', 'Document unavailable')}
                                </Typography>
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
                                    height: 180,
                                    objectFit: 'contain',
                                    borderRadius: '6px',
                                    bgcolor: 'background.default',
                                  }}
                                />
                              )}
                              {doc.url && (
                                <Link
                                  href={doc.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  underline="hover"
                                  sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mt: 0.75, fontSize: '0.75rem' }}
                                >
                                  <OpenInNewRounded sx={{ fontSize: 14 }} />
                                  {tr('Mở toàn màn hình', 'Open full size')}
                                </Link>
                              )}
                            </Box>
                          ))}
                        </Box>
                      )}
                    </Box>
                  </>
                ) : (
                  <Box
                    sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}
                  >
                    <DetailField label={tr('Khách hàng', 'Customer')} value={(selected as ProspectiveCustomerReview).organizationName} />
                    <DetailField label={tr('Mã khách hàng', 'Customer code')} value={(selected as ProspectiveCustomerReview).organizationCode} />
                    <DetailField label={tr('Tài sản', 'Asset')} value={(selected as ProspectiveCustomerReview).assetName} />
                    <DetailField label={tr('Mã tài sản', 'Asset code')} value={(selected as ProspectiveCustomerReview).assetCode} />
                    <DetailField
                      label={tr('Phân loại vùng bay', 'Airspace classification')}
                      value={(selected as ProspectiveCustomerReview).airspaceClassification}
                    />
                    <DetailField
                      label={tr('Ngày nộp', 'Submitted')}
                      value={new Date((selected as ProspectiveCustomerReview).createdAt).toLocaleString(dateLocale)}
                    />
                  </Box>
                )}

                <Divider />

                {reviewQueue === 'drones' &&
                (selected as DroneRegistrationApplication).status !== 'PENDING' ? (
                  <Alert
                    severity={
                      (selected as DroneRegistrationApplication).status === 'APPROVED'
                        ? 'success'
                        : 'error'
                    }
                    variant="outlined"
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {(selected as DroneRegistrationApplication).status === 'APPROVED'
                        ? tr('Hồ sơ drone đã được phê duyệt', 'Drone registration approved')
                        : tr('Hồ sơ drone đã bị từ chối', 'Drone registration rejected')}
                    </Typography>
                    {(selected as DroneRegistrationApplication).reviewNote && (
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {(selected as DroneRegistrationApplication).reviewNote}
                      </Typography>
                    )}
                  </Alert>
                ) : (
                  <TextField
                    multiline
                    minRows={3}
                    label={
                      reviewQueue === 'customers'
                        ? tr('Ghi chú duyệt / Lý do từ chối (bắt buộc)', 'Review note / Rejection reason (required)')
                        : tr('Ghi chú duyệt / Lý do từ chối (bắt buộc nếu từ chối)', 'Review note / Rejection reason (required to reject)')
                    }
                    value={reviewNote}
                    onChange={(event) => setReviewNote(event.target.value)}
                  />
                )}
              </Stack>
            </DialogContent>
            {!(
              reviewQueue === 'drones' &&
              (selected as DroneRegistrationApplication).status !== 'PENDING'
            ) && (
              <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<HighlightOffRounded />}
                  onClick={() => void submitReview('reject')}
                  disabled={pending}
                  sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, px: 2.5 }}
                >
                  {pending && pendingDecision === 'reject'
                    ? tr('Đang lưu…', 'Saving…')
                    : tr('Từ chối', 'Reject')}
                </Button>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<CheckCircleOutlineRounded />}
                  onClick={() => void submitReview('approve')}
                  disabled={pending}
                  sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, px: 2.5 }}
                >
                  {pending && pendingDecision === 'approve'
                    ? tr('Đang lưu…', 'Saving…')
                    : tr('Duyệt', 'Approve')}
                </Button>
              </DialogActions>
            )}
          </>
        )}
      </Dialog>

      {/* Inspector application review dialog */}
      <Dialog open={Boolean(selectedApplication)} onClose={closeInspectorAppDialog} fullWidth maxWidth="md">
        {selectedApplication && (
          <>
            <DialogTitle
              sx={{
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                pr: 1.5,
              }}
            >
              <span>{tr('Thẩm định Đơn đăng ký Inspector', 'Review Inspector Application')}</span>
              <IconButton
                size="small"
                onClick={closeInspectorAppDialog}
                disabled={appPending}
                aria-label={tr('Đóng', 'Close')}
                sx={{ color: 'text.secondary' }}
              >
                <CloseRounded fontSize="small" />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <Stack spacing={2}>
                {appError && <Alert severity="error">{appError}</Alert>}
                <Box
                  sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}
                >
                  <DetailField label={tr('Họ tên', 'Full name')} value={selectedApplication.fullName} />
                  <DetailField label={tr('Email', 'Email')} value={selectedApplication.email} />
                  <DetailField label={tr('Điện thoại', 'Phone')} value={selectedApplication.phoneNumber} />
                  <DetailField label={tr('CCCD', 'Citizen ID')} value={selectedApplication.citizenId} />
                  <DetailField
                    label={tr('Số bằng lái', 'License number')}
                    value={selectedApplication.pilotLicenseNumber}
                  />
                  <DetailField
                    label={tr('Hạng bằng', 'License class')}
                    value={selectedApplication.pilotLicenseClass}
                  />
                  <DetailField
                    label={tr('Hết hạn bằng', 'License expiry')}
                    value={selectedApplication.pilotLicenseExpiresAt}
                  />
                  <DetailField label={tr('Địa chỉ', 'Address')} value={selectedApplication.address} />
                </Box>

                <Divider />

                <Box>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem', mb: 1 }}>
                    {tr('Bản scan bằng lái', 'License scan')}
                  </Typography>
                  {appScanLoading ? (
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', py: 2 }}>
                      <CircularProgress size={22} />
                      <Typography color="text.secondary">{tr('Đang tải bản scan…', 'Loading scan…')}</Typography>
                    </Stack>
                  ) : appScanUrl ? (
                    appScanIsPdf ? (
                      <Box
                        component="iframe"
                        src={appScanUrl}
                        title={tr('Bản scan bằng lái', 'License scan')}
                        sx={{ width: '100%', height: 320, border: 0, borderRadius: '8px' }}
                      />
                    ) : (
                      <Box
                        component="img"
                        src={appScanUrl}
                        alt={tr('Bản scan bằng lái', 'License scan')}
                        sx={{
                          maxWidth: '100%',
                          maxHeight: 320,
                          objectFit: 'contain',
                          borderRadius: '8px',
                          border: '1px solid',
                          borderColor: 'divider',
                        }}
                      />
                    )
                  ) : (
                    <Alert severity="warning">
                      {tr('Chưa có bản scan bằng lái.', 'No license scan attached.')}
                    </Alert>
                  )}
                </Box>

                <Divider />

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<UploadFileRounded />}
                    disabled={uploadingContractId === selectedApplication.id}
                  >
                    {uploadingContractId === selectedApplication.id
                      ? tr('Đang tải lên…', 'Uploading…')
                      : tr('Tải lên hợp đồng đã ký', 'Upload signed contract')}
                    <input
                      type="file"
                      hidden
                      accept="application/pdf,image/png,image/jpeg,image/webp"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = '';
                        if (file) void uploadSignedContract(selectedApplication, file);
                      }}
                    />
                  </Button>
                  {selectedApplication.hasSignedContract && (
                    <Chip
                      size="small"
                      color="success"
                      variant="outlined"
                      label={tr('Đã có hợp đồng đã ký', 'Signed contract uploaded')}
                      sx={{ alignSelf: 'center', fontWeight: 600 }}
                    />
                  )}
                </Stack>

                <Divider />

                <TextField
                  multiline
                  minRows={3}
                  label={tr(
                    'Lý do từ chối (bắt buộc nếu từ chối)',
                    'Rejection reason (required when rejecting)',
                  )}
                  value={appRejectReason}
                  onChange={(event) => setAppRejectReason(event.target.value)}
                />
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
              <Button
                variant="outlined"
                color="error"
                startIcon={<HighlightOffRounded />}
                onClick={() => void submitInspectorAppReview('reject')}
                disabled={appPending}
                sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, px: 2.5 }}
              >
                {appPending && appPendingDecision === 'reject'
                  ? tr('Đang lưu…', 'Saving…')
                  : tr('Từ chối', 'Reject')}
              </Button>
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckCircleOutlineRounded />}
                onClick={() => void submitInspectorAppReview('approve')}
                disabled={appPending}
                sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, px: 2.5 }}
              >
                {appPending && appPendingDecision === 'approve'
                  ? tr('Đang lưu…', 'Saving…')
                  : tr('Duyệt', 'Approve')}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}

type ReviewItem = ProspectiveCustomerReview | DroneRegistrationApplication;

function QueueTable({
  headers,
  ariaLabel,
  children,
  totalCount,
  page,
  rowsPerPage,
  onPageChange,
  summaryText,
}: {
  headers: string[];
  ariaLabel: string;
  children: ReactNode;
  totalCount: number;
  page: number;
  rowsPerPage: number;
  onPageChange: (nextPage: number) => void;
  summaryText: string;
}) {
  return (
    <Paper variant="outlined" sx={{ borderRadius: '10px', overflow: 'hidden', borderColor: 'divider' }}>
      <TableContainer>
        <Table aria-label={ariaLabel}>
          <TableHead>
            <TableRow>
              {headers.map((header, index) => (
                <TableCell
                  key={header || `actions-${index}`}
                  align={index === headers.length - 1 ? 'right' : 'left'}
                  sx={{
                    bgcolor: (muiTheme) =>
                      muiTheme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.03)'
                        : '#F9FAFB',
                    color: 'text.secondary',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    letterSpacing: '0.02em',
                    py: 1.25,
                    px: 2,
                  }}
                >
                  {header}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>{children}</TableBody>
        </Table>
      </TableContainer>
      {totalCount > 0 && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: { xs: 2, sm: 2.5 },
            py: 1.5,
            borderTop: '1px solid',
            borderColor: 'divider',
            flexWrap: 'wrap',
            gap: 1.5,
          }}
        >
          <Typography
            variant="body2"
            sx={{ color: 'text.secondary', fontSize: '0.875rem', fontVariantNumeric: 'tabular-nums' }}
          >
            {summaryText}
          </Typography>
          <Pagination
            count={Math.max(1, Math.ceil(totalCount / rowsPerPage))}
            page={page + 1}
            onChange={(_, nextPage) => onPageChange(nextPage - 1)}
            shape="rounded"
            size="small"
            sx={{
              '& .MuiPaginationItem-root': {
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.8125rem',
                color: 'text.primary',
              },
              '& .MuiPaginationItem-page.Mui-selected': {
                bgcolor: 'primary.main',
                color: '#FFFFFF',
                '&:hover': { bgcolor: 'primary.dark' },
              },
              '& .MuiPaginationItem-previousNext': {
                border: '1px solid',
                borderColor: 'divider',
              },
            }}
          />
        </Box>
      )}
    </Paper>
  );
}

function DetailField({ label, value }: { label: string; value?: string | null | undefined }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography variant="body2" color={value ? 'text.primary' : 'text.secondary'} sx={{ overflowWrap: 'anywhere' }}>
        {value || '—'}
      </Typography>
    </Box>
  );
}
