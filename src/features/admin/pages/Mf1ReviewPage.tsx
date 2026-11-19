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
  Link,
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
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import CheckCircleOutlineRounded from '@mui/icons-material/CheckCircleOutlineRounded';
import HighlightOffRounded from '@mui/icons-material/HighlightOffRounded';
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded';
import UploadFileRounded from '@mui/icons-material/UploadFileRounded';
import FactCheckOutlined from '@mui/icons-material/FactCheckOutlined';
import AssignmentIndOutlined from '@mui/icons-material/AssignmentIndOutlined';
import FlightTakeoffRounded from '@mui/icons-material/FlightTakeoffRounded';
import ApartmentOutlined from '@mui/icons-material/ApartmentOutlined';
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
import { PageHeader } from '@/shared/ui/PageHeader';
import { StatusChip } from '@/shared/ui/StatusChip';
import { QueryState } from '@/shared/ui/QueryState';
import { AdminTableToolbar } from '../components/AdminTableToolbar';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useLocale } from '@/shared/i18n/LocaleProvider';

type QueueId = 'inspectors' | 'drones' | 'customers';
type SortOption = 'NEWEST' | 'OLDEST';

interface EvidenceDoc {
  label: string;
  type: string;
  url: string;
  isPdf: boolean;
  failed?: boolean;
}

function classifyDroneLegalTier(rawText?: string | null): {
  categoryLabel: string;
  requiredPilotLicenseLabel: string;
  requiresClassB: boolean;
} {
  const text = (rawText ?? '').toLowerCase();
  const match = rawText?.match(/(?:MTOW:\s*)?(\d+(?:[.,]\d+)?)\s*(?:kg)?/i);
  const parsedMtow = match?.[1] ? Number(match[1].replace(',', '.')) : NaN;
  const mtow =
    Number.isFinite(parsedMtow) && parsedMtow > 0
      ? parsedMtow
      : text.includes('matrice') ||
          text.includes('m300') ||
          text.includes('m350') ||
          text.includes('m30') ||
          text.includes('inspire') ||
          text.includes('agras')
        ? 9.2
        : text.includes('mini')
          ? 0.249
          : 0.92;

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

export default function Mf1ReviewPage() {
  const { locale } = useLocale();
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

  const [queue, setQueue] = useState<QueueId>('drones');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sort, setSort] = useState<SortOption>('NEWEST');

  // Review dialog state for drone registrations and customer airspace
  const [selected, setSelected] = useState<ReviewItem | null>(null);
  const [reviewQueue, setReviewQueue] = useState<'drones' | 'customers'>('drones');
  const [action, setAction] = useState<'approve' | 'reject'>('approve');
  const [reviewNote, setReviewNote] = useState('');
  const [evidenceDocs, setEvidenceDocs] = useState<EvidenceDoc[]>([]);
  const [telemetryLoading, setTelemetryLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inspector application review dialog state
  const [selectedApplication, setSelectedApplication] = useState<InspectorApplication | null>(null);
  const [appAction, setAppAction] = useState<'approve' | 'reject'>('approve');
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
    enabled: isAdmin,
    retry: false,
  });

  const drones = useQuery({
    queryKey: ['mf1-reviews', 'drones'],
    queryFn: mf1ReviewApi.pendingDrones,
    retry: false,
    refetchInterval: 5000,
  });

  const droneHistory = useQuery({
    queryKey: ['mf1-reviews', 'drones-history'],
    queryFn: mf1ReviewApi.droneHistory,
    retry: false,
    refetchInterval: 8000,
  });

  const pendingInspectorApps = useQuery({
    queryKey: ['mf1-reviews', 'inspector-applications', 'pending'],
    queryFn: inspectorApplicationApi.listPending,
    retry: false,
    refetchInterval: 8000,
  });

  const awaitingContractApps = useQuery({
    queryKey: ['mf1-reviews', 'inspector-applications', 'awaiting-contract'],
    queryFn: inspectorApplicationApi.listApprovedAwaitingContract,
    retry: false,
    refetchInterval: 8000,
  });

  const changeQueue = (next: QueueId) => {
    setQueue(next);
    setSearch('');
    setStatusFilter('ALL');
    setSort('NEWEST');
  };

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
      if (!query) return true;
      return (
        application.fullName.toLowerCase().includes(query) ||
        application.email.toLowerCase().includes(query) ||
        application.pilotLicenseNumber.toLowerCase().includes(query) ||
        application.citizenId.toLowerCase().includes(query)
      );
    });
    return rows.sort((left, right) => {
      const leftDate = new Date(left.application.createdAt).getTime();
      const rightDate = new Date(right.application.createdAt).getTime();
      return sort === 'NEWEST' ? rightDate - leftDate : leftDate - rightDate;
    });
  }, [awaitingContractApps.data, pendingInspectorApps.data, search, sort, statusFilter]);

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
        const leftDate = new Date(left.application.createdAt).getTime();
        const rightDate = new Date(right.application.createdAt).getTime();
        return sort === 'NEWEST' ? rightDate - leftDate : leftDate - rightDate;
      });
  }, [droneHistory.data, drones.data, search, sort, statusFilter]);

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
        const leftDate = new Date(left.createdAt).getTime();
        const rightDate = new Date(right.createdAt).getTime();
        return sort === 'NEWEST' ? rightDate - leftDate : leftDate - rightDate;
      });
  }, [customers.data, search, sort, statusFilter]);

  const statusOptions =
    queue === 'inspectors'
      ? [
          { value: 'ALL', label: tr('Tất cả', 'All') },
          { value: 'PENDING', label: tr('Chờ duyệt', 'Pending') },
          { value: 'APPROVED', label: tr('Đã duyệt', 'Approved') },
        ]
      : queue === 'drones'
        ? [
            { value: 'ALL', label: tr('Tất cả', 'All') },
            { value: 'PENDING', label: tr('Chờ duyệt', 'Pending') },
            { value: 'APPROVED', label: tr('Đã duyệt', 'Approved') },
            { value: 'REJECTED', label: tr('Từ chối', 'Rejected') },
          ]
        : [
            { value: 'ALL', label: tr('Tất cả', 'All') },
            { value: 'PENDING', label: tr('Chờ duyệt', 'Pending') },
          ];

  const clearReview = () => {
    setSelected(null);
    setReviewNote('');
    evidenceDocs.forEach((doc) => {
      if (doc.url) URL.revokeObjectURL(doc.url);
    });
    setEvidenceDocs([]);
    setTelemetryLoading(false);
    setError(null);
  };

  const openDroneReview = async (application: DroneRegistrationApplication) => {
    clearReview();
    setReviewQueue('drones');
    setSelected(application);
    setAction('approve');
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
      const results = await Promise.allSettled(
        documents.map(async (doc) => {
          const blob = await doc.load();
          return {
            label: doc.label,
            type: doc.type,
            url: URL.createObjectURL(blob),
            isPdf: blob.type === 'application/pdf' || blob.type.endsWith('/pdf'),
          };
        }),
      );
      setEvidenceDocs(
        results.map((result, index) =>
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
    setAction('approve');
  };

  const submitReview = async () => {
    if (!selected) return;
    if (action === 'reject' && !reviewNote.trim()) {
      setError(tr('Vui lòng nêu rõ lý do từ chối để Inspector bổ sung lại.', 'Please provide a clear rejection reason so the applicant can resubmit.'));
      return;
    }
    if (reviewQueue === 'customers' && action === 'approve' && !reviewNote.trim()) {
      setError(tr('Ghi chú xét duyệt là bắt buộc đối với vùng bay khách hàng.', 'A review note is required when approving customer airspace.'));
      return;
    }
    setPending(true);
    setError(null);
    try {
      if (reviewQueue === 'customers') {
        if (action === 'approve') await mf1ReviewApi.approveCustomer(selected.id, reviewNote.trim());
        else await mf1ReviewApi.rejectCustomer(selected.id, reviewNote.trim());
      } else if (action === 'approve') {
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
    }
  };

  const closeInspectorAppDialog = () => {
    if (appPending) return;
    setSelectedApplication(null);
    setAppAction('approve');
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
    setAppAction('approve');
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

  const submitInspectorAppReview = async () => {
    if (!selectedApplication) return;
    setAppError(null);
    if (appAction === 'reject' && appRejectReason.trim().length === 0) {
      setAppError(tr('Vui lòng nhập lý do từ chối để hệ thống gửi email thông báo cho ứng viên.', 'Please enter a rejection reason to notify the applicant by email.'));
      return;
    }
    setAppPending(true);
    try {
      if (appAction === 'approve') await inspectorApplicationApi.approve(selectedApplication.id);
      else await inspectorApplicationApi.reject(selectedApplication.id, appRejectReason.trim());
      await queryClient.invalidateQueries({ queryKey: ['mf1-reviews', 'inspector-applications'] });
      await queryClient.invalidateQueries({ queryKey: ['platform-users'] });
      closeInspectorAppDialog();
    } catch (err: unknown) {
      setAppError(err instanceof Error ? err.message : tr('Không thể xử lý đơn đăng ký Inspector. Vui lòng thử lại.', 'Could not process this inspector application. Please try again.'));
    } finally {
      setAppPending(false);
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

  return (
    <Box className="workspace-page" sx={{ maxWidth: 1200, mx: 'auto', pb: 6 }}>
      <PageHeader
        title={tr('Xét duyệt hồ sơ Onboarding (MF1)', 'Onboarding & Compliance Reviews (MF1)')}
        subtitle={tr(
          'Xác minh hồ sơ Inspector, đăng ký Drone và vùng bay khách hàng trước khi cấp phép hoạt động.',
          'Verify inspector applications, drone registrations, and customer airspace before operations begin.',
        )}
        breadcrumbs={[
          { label: tr('Quản trị', 'Governance'), to: isAdmin ? '/admin/dashboard' : '/manager/dashboard' },
          { label: tr('Duyệt onboarding', 'Onboarding reviews') },
        ]}
      />

      <Tabs
        value={queue}
        onChange={(_, value: QueueId) => changeQueue(value)}
        aria-label="MF1 review queues"
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          mb: 2.5,
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

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', mb: 1.5 }}
      >
        <ToggleButtonGroup
          exclusive
          size="small"
          value={statusFilter}
          onChange={(_, value: string | null) => {
            if (value) setStatusFilter(value);
          }}
          aria-label={tr('Trạng thái duyệt', 'Review status')}
        >
          {statusOptions.map((option) => (
            <ToggleButton key={option.value} value={option.value} sx={{ px: 1.75, fontWeight: 600 }}>
              {option.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Stack>

      <AdminTableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={
          queue === 'inspectors'
            ? tr('Tìm theo tên, email, CCCD hoặc bằng lái', 'Search name, email, citizen ID, or license')
            : queue === 'drones'
              ? tr('Tìm theo drone, serial hoặc người gửi', 'Search drone, serial, or applicant')
              : tr('Tìm theo tổ chức, tài sản hoặc vùng bay', 'Search organization, asset, or airspace')
        }
        visibleCount={visibleCount}
        totalCount={totalCount}
        onClearAll={() => setStatusFilter('ALL')}
        filters={[
          {
            key: 'sort',
            label: tr('Sắp xếp', 'Sort'),
            value: sort,
            options: [
              { value: 'NEWEST', label: tr('Mới nhất', 'Newest first') },
              { value: 'OLDEST', label: tr('Cũ nhất', 'Oldest first') },
            ],
            onChange: (value) => setSort(value as SortOption),
          },
        ]}
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
          empty={<Alert severity="info">{tr('Không có hồ sơ Inspector nào khớp bộ lọc.', 'No inspector applications match the filters.')}</Alert>}
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
          >
            {inspectorRows.map(({ kind, application }) => (
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
                    variant="contained"
                    startIcon={<FactCheckOutlined />}
                    onClick={(event) => {
                      event.stopPropagation();
                      void openInspectorAppReview(application);
                    }}
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
          empty={<Alert severity="info">{tr('Không có hồ sơ drone nào khớp bộ lọc.', 'No drone registrations match the filters.')}</Alert>}
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
          >
            {droneRows.map(({ status, application }) => {
              const tier = classifyDroneLegalTier(application.model);
              const licenseWarning =
                tier.requiresClassB && application.inspectorPilotLicenseClass === 'CLASS_A';
              return (
                <TableRow
                  key={application.id}
                  hover
                  tabIndex={0}
                  onClick={() => {
                    if (status === 'PENDING') void openDroneReview(application);
                  }}
                  onKeyDown={(event) => {
                    if ((event.key === 'Enter' || event.key === ' ') && status === 'PENDING') {
                      event.preventDefault();
                      void openDroneReview(application);
                    }
                  }}
                  sx={{ cursor: status === 'PENDING' ? 'pointer' : 'default' }}
                >
                  <TableCell>
                    <Typography sx={{ fontWeight: 650, fontSize: '0.875rem' }}>
                      {application.model ?? tr('Thiết bị Drone', 'Drone Aircraft')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {application.manufacturer || '—'} · {tier.categoryLabel}
                    </Typography>
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
                    {status === 'PENDING' && (
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<FactCheckOutlined />}
                        onClick={(event) => {
                          event.stopPropagation();
                          void openDroneReview(application);
                        }}
                      >
                        {tr('Thẩm định hồ sơ', 'Review application')}
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
          empty={<Alert severity="info">{tr('Không có vùng bay khách hàng nào khớp bộ lọc.', 'No customer airspace reviews match the filters.')}</Alert>}
        >
          <QueueTable
            headers={[
              tr('Tổ chức', 'Organization'),
              tr('Tài sản', 'Asset'),
              tr('Phân loại vùng bay', 'Airspace'),
              tr('Ngày nộp', 'Submitted'),
              '',
            ]}
            ariaLabel={tr('Vùng bay khách hàng', 'Customer airspace')}
          >
            {customerRows.map((review) => (
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
                    variant="contained"
                    startIcon={<FactCheckOutlined />}
                    onClick={(event) => {
                      event.stopPropagation();
                      openCustomerReview(review);
                    }}
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
            <DialogTitle sx={{ fontWeight: 700 }}>
              {tr('Thẩm định hồ sơ Phương tiện Drone', 'Review Compliance Application')}
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
                      <DetailField label={tr('Drone', 'Drone')} value={(selected as DroneRegistrationApplication).model} />
                      <DetailField label={tr('Serial', 'Serial')} value={(selected as DroneRegistrationApplication).serialNumber} />
                      <DetailField
                        label={tr('Số đăng ký', 'Registration')}
                        value={(selected as DroneRegistrationApplication).registrationNumber}
                      />
                      <DetailField
                        label={tr('Người gửi', 'Applicant')}
                        value={(selected as DroneRegistrationApplication).inspectorFullName}
                      />
                      <DetailField
                        label={tr('Email', 'Email')}
                        value={(selected as DroneRegistrationApplication).inspectorEmail}
                      />
                      <DetailField
                        label={tr('Bằng lái', 'Pilot license')}
                        value={(selected as DroneRegistrationApplication).inspectorPilotLicenseNumber}
                      />
                    </Box>
                    <Divider />
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
                    <DetailField label={tr('Tổ chức', 'Organization')} value={(selected as ProspectiveCustomerReview).organizationName} />
                    <DetailField label={tr('Mã tổ chức', 'Organization code')} value={(selected as ProspectiveCustomerReview).organizationCode} />
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

                <Stack direction="row" spacing={1}>
                  <Button
                    variant={action === 'approve' ? 'contained' : 'outlined'}
                    color="success"
                    startIcon={<CheckCircleOutlineRounded />}
                    onClick={() => setAction('approve')}
                  >
                    {tr('Duyệt', 'Approve')}
                  </Button>
                  <Button
                    variant={action === 'reject' ? 'contained' : 'outlined'}
                    color="error"
                    startIcon={<HighlightOffRounded />}
                    onClick={() => setAction('reject')}
                  >
                    {tr('Từ chối', 'Reject')}
                  </Button>
                </Stack>

                <TextField
                  multiline
                  minRows={3}
                  label={
                    action === 'reject'
                      ? tr('Lý do từ chối (bắt buộc)', 'Rejection reason (required)')
                      : tr('Ghi chú duyệt', 'Review note')
                  }
                  value={reviewNote}
                  onChange={(event) => setReviewNote(event.target.value)}
                />
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
              <Button onClick={clearReview} disabled={pending} color="inherit">
                {tr('Hủy', 'Cancel')}
              </Button>
              <Button
                variant="contained"
                color={action === 'reject' ? 'error' : 'primary'}
                onClick={() => void submitReview()}
                disabled={pending}
              >
                {pending
                  ? tr('Đang lưu…', 'Saving…')
                  : action === 'reject'
                    ? tr('Xác nhận từ chối', 'Confirm rejection')
                    : tr('Xác nhận duyệt', 'Confirm approval')}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Inspector application review dialog */}
      <Dialog open={Boolean(selectedApplication)} onClose={closeInspectorAppDialog} fullWidth maxWidth="md">
        {selectedApplication && (
          <>
            <DialogTitle sx={{ fontWeight: 700 }}>
              {tr('Thẩm định Đơn đăng ký Inspector', 'Review Inspector Application')}
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

                <Stack direction="row" spacing={1}>
                  <Button
                    variant={appAction === 'approve' ? 'contained' : 'outlined'}
                    color="success"
                    startIcon={<CheckCircleOutlineRounded />}
                    onClick={() => setAppAction('approve')}
                  >
                    {tr('Duyệt', 'Approve')}
                  </Button>
                  <Button
                    variant={appAction === 'reject' ? 'contained' : 'outlined'}
                    color="error"
                    startIcon={<HighlightOffRounded />}
                    onClick={() => setAppAction('reject')}
                  >
                    {tr('Từ chối', 'Reject')}
                  </Button>
                </Stack>

                {appAction === 'reject' && (
                  <TextField
                    multiline
                    minRows={3}
                    required
                    label={tr('Lý do từ chối', 'Rejection reason')}
                    value={appRejectReason}
                    onChange={(event) => setAppRejectReason(event.target.value)}
                  />
                )}
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
              <Button onClick={closeInspectorAppDialog} disabled={appPending} color="inherit">
                {tr('Hủy', 'Cancel')}
              </Button>
              <Button
                variant="contained"
                color={appAction === 'reject' ? 'error' : 'primary'}
                onClick={() => void submitInspectorAppReview()}
                disabled={appPending}
              >
                {appPending
                  ? tr('Đang lưu…', 'Saving…')
                  : appAction === 'reject'
                    ? tr('Xác nhận từ chối', 'Confirm rejection')
                    : tr('Xác nhận duyệt', 'Confirm approval')}
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
}: {
  headers: string[];
  ariaLabel: string;
  children: ReactNode;
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
