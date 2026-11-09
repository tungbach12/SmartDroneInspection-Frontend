import { useState, useEffect } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import CheckCircleOutlineRounded from '@mui/icons-material/CheckCircleOutlineRounded';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import HighlightOffRounded from '@mui/icons-material/HighlightOffRounded';
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded';
import ZoomInRounded from '@mui/icons-material/ZoomInRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import FlightRounded from '@mui/icons-material/FlightRounded';
import BadgeOutlined from '@mui/icons-material/BadgeOutlined';
import ApartmentOutlined from '@mui/icons-material/ApartmentOutlined';
import FactCheckOutlined from '@mui/icons-material/FactCheckOutlined';
import VerifiedUserOutlined from '@mui/icons-material/VerifiedUserOutlined';
import HistoryRounded from '@mui/icons-material/HistoryRounded';
import PersonAddAlt from '@mui/icons-material/PersonAddAlt';
import RefreshRounded from '@mui/icons-material/RefreshRounded';
import FlightTakeoffRounded from '@mui/icons-material/FlightTakeoffRounded';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  mf1ReviewApi,
  type DroneRegistrationApplication,
  type ProspectiveCustomerReview,
} from '../api/mf1ReviewApi';
import {
  inspectorProfileApi,
  type InspectorProfile,
} from '../api/inspectorProfileApi';
import { useCreatePlatformUser } from '../hooks/usePlatformUsers';
import { InspectorProfileDialog } from '../components/InspectorProfileDialog';
import { PageHeader } from '@/shared/ui/PageHeader';
import { useAuthStore } from '@/features/auth/store/authStore';

const ALL_PANELS = [
  'Drone registrations',
  'Drone history',
  'Inspector partners',
  'Customer airspace',
] as const;
type Panel = (typeof ALL_PANELS)[number];
type ReviewItem = ProspectiveCustomerReview | DroneRegistrationApplication;

interface EvidenceDoc {
  label: string;
  type: string;
  url: string;
  isPdf: boolean;
  failed?: boolean;
}

export default function Mf1ReviewPage() {
  const roles = useAuthStore((state) => state.roles);
  const isAdmin = roles.includes('ADMIN');

  const availablePanels: Panel[] = isAdmin
    ? ['Drone registrations', 'Drone history', 'Inspector partners', 'Customer airspace']
    : ['Drone registrations', 'Drone history', 'Inspector partners'];

  const [panel, setPanel] = useState<Panel>('Drone registrations');
  const [selected, setSelected] = useState<ReviewItem | null>(null);
  const [action, setAction] = useState<'approve' | 'reject'>('approve');
  const [reviewNote, setReviewNote] = useState('');
  const [evidenceDocs, setEvidenceDocs] = useState<EvidenceDoc[]>([]);
  const [activeDocIndex, setActiveDocIndex] = useState(0);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);

  // State for Inspector Profile management
  const [selectedInspectorId, setSelectedInspectorId] = useState<string | null>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);

  // State for adding new Inspector
  const [createInspectorOpen, setCreateInspectorOpen] = useState(false);
  const [createEmail, setCreateEmail] = useState('');
  const [createFullName, setCreateFullName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [issuedPassword, setIssuedPassword] = useState<{
    email: string;
    temporaryPassword: string;
  } | null>(null);

  const queryClient = useQueryClient();
  const createPlatformUser = useCreatePlatformUser();

  useEffect(() => {
    if (!availablePanels.includes(panel) && availablePanels.length > 0) {
      setPanel(availablePanels[0]!);
    }
  }, [availablePanels, panel]);

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

  const inspectorProfiles = useQuery({
    queryKey: ['mf1-inspectors-list'],
    queryFn: inspectorProfileApi.list,
    retry: false,
    refetchInterval: 8000,
  });

  const closeDialog = () => {
    if (pending) return;
    setSelected(null);
    setReviewNote('');
    evidenceDocs.forEach((d) => {
      if (d.url) URL.revokeObjectURL(d.url);
    });
    setEvidenceDocs([]);
    setActiveDocIndex(0);
    setEvidenceLoading(false);
    setError(null);
  };

  const openReview = async (item: ReviewItem) => {
    evidenceDocs.forEach((d) => {
      if (d.url) URL.revokeObjectURL(d.url);
    });
    setEvidenceDocs([]);
    setActiveDocIndex(0);
    setSelected(item);
    setAction('approve');
    setError(null);
    setEvidenceLoading(true);

    try {
      const isDroneApp = panel === 'Drone registrations' || panel === 'Drone history';
      const documentsToFetch = isDroneApp
        ? [
            {
              label: 'Giấy chứng nhận đăng ký drone',
              type: 'REGISTRATION',
              load: () => mf1ReviewApi.droneEvidence(item.id, 'REGISTRATION'),
            },
            {
              label: 'Giấy tờ sở hữu / Hóa đơn tài chính',
              type: 'OWNERSHIP',
              load: () => mf1ReviewApi.droneEvidence(item.id, 'OWNERSHIP'),
            },
            {
              label: 'Giấy kiểm định / Chứng nhận an toàn kỹ thuật',
              type: 'INSPECTION',
              load: () => mf1ReviewApi.droneEvidence(item.id, 'INSPECTION'),
            },
          ]
        : [];

      if (documentsToFetch.length === 0) {
        setEvidenceLoading(false);
        return;
      }

      const results = await Promise.allSettled(
        documentsToFetch.map(async (doc) => {
          const blob = await doc.load();
          const isPdf = blob.type === 'application/pdf' || blob.type.endsWith('/pdf');
          const url = URL.createObjectURL(blob);
          return {
            label: doc.label,
            type: doc.type,
            url,
            isPdf,
          };
        }),
      );

      const docs: EvidenceDoc[] = results.map((res, index) => {
        if (res.status === 'fulfilled') {
          return res.value;
        }
        return {
          label: documentsToFetch[index]?.label ?? 'Tài liệu',
          type: documentsToFetch[index]?.type ?? 'UNKNOWN',
          url: '',
          isPdf: false,
          failed: true,
        };
      });

      setEvidenceDocs(docs);
    } catch {
      setError('Không thể tải tài liệu hình ảnh. Vui lòng thử lại sau.');
    } finally {
      setEvidenceLoading(false);
    }
  };

  const review = async () => {
    if (!selected) return;
    if (action === 'reject' && !reviewNote.trim()) {
      setError('Vui lòng nêu rõ lý do từ chối để Inspector bổ sung lại.');
      return;
    }
    if (panel === 'Customer airspace' && action === 'approve' && !reviewNote.trim()) {
      setError('Ghi chú xét duyệt là bắt buộc đối với vùng bay khách hàng.');
      return;
    }

    setPending(true);
    setError(null);
    try {
      if (panel === 'Customer airspace') {
        if (action === 'approve') await mf1ReviewApi.approveCustomer(selected.id, reviewNote.trim());
        else await mf1ReviewApi.rejectCustomer(selected.id, reviewNote.trim());
      } else {
        if (action === 'approve') await mf1ReviewApi.approveDrone(selected.id);
        else await mf1ReviewApi.rejectDrone(selected.id, reviewNote.trim());
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['mf1-reviews'] }),
        queryClient.invalidateQueries({ queryKey: ['mf1-inspectors-list'] }),
      ]);
      closeDialog();
    } catch {
      setError('Không thể lưu quyết định duyệt. Vui lòng tải lại trang và thử lại.');
    } finally {
      setPending(false);
    }
  };

  const handleCreateInspector = async () => {
    if (!createEmail.trim() || !createFullName.trim()) {
      setCreateError('Vui lòng nhập đầy đủ họ tên và email đối tác.');
      return;
    }
    setCreateError(null);
    try {
      const res = await createPlatformUser.mutateAsync({
        email: createEmail.trim(),
        fullName: createFullName.trim(),
        actorZone: 'INSPECTOR_PARTNER',
        roles: ['INSPECTOR'],
      });
      setCreateInspectorOpen(false);
      setCreateEmail('');
      setCreateFullName('');
      if (res?.temporaryPassword) {
        setIssuedPassword({ email: res.user.email, temporaryPassword: res.temporaryPassword });
      }
      await queryClient.invalidateQueries({ queryKey: ['mf1-inspectors-list'] });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Không thể tạo đối tác Inspector. Vui lòng thử lại.';
      setCreateError(message);
    }
  };

  const getTabLabel = (name: Panel) => {
    if (name === 'Drone registrations') {
      const count = drones.data?.length ?? 0;
      return `Đăng ký Drone chờ duyệt (${count})`;
    }
    if (name === 'Drone history') {
      const count = droneHistory.data?.length ?? 0;
      return `Lịch sử thẩm định Drone (${count})`;
    }
    if (name === 'Inspector partners') {
      const count = inspectorProfiles.data?.length ?? 0;
      return `Hồ sơ đối tác Inspector (${count})`;
    }
    const count = customers.data?.length ?? 0;
    return `Vùng bay khách hàng (${count})`;
  };

  const getTabIcon = (name: Panel) => {
    if (name === 'Drone registrations') return <FlightRounded fontSize="small" />;
    if (name === 'Drone history') return <HistoryRounded fontSize="small" />;
    if (name === 'Inspector partners') return <BadgeOutlined fontSize="small" />;
    return <ApartmentOutlined fontSize="small" />;
  };

  const activeDoc = evidenceDocs[activeDocIndex];

  return (
    <Box className="workspace-page" sx={{ maxWidth: 1200, mx: 'auto', pb: 6 }}>
      <PageHeader
        title="Xét duyệt hồ sơ Onboarding (MF1)"
        subtitle="Quản lý hồ sơ đối tác Inspector, thẩm định phương tiện bay và lịch sử phê duyệt drone."
      />

      <Paper
        variant="outlined"
        sx={{
          mt: 2.5,
          borderRadius: '16px',
          bgcolor: 'background.paper',
          overflow: 'hidden',
          borderColor: '#eaecf0',
          boxShadow: '0 1px 3px rgba(16, 24, 40, 0.05)',
        }}
      >
        <Tabs
          value={panel}
          onChange={(_, value: Panel) => setPanel(value)}
          aria-label="MF1 review queues"
          variant="scrollable"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            px: 2,
            bgcolor: '#fafafa',
            '& .MuiTab-root': {
              minHeight: 52,
              fontWeight: 650,
              textTransform: 'none',
              fontSize: '14.5px',
              gap: 1,
            },
          }}
        >
          {availablePanels.map((name) => (
            <Tab
              key={name}
              value={name}
              icon={getTabIcon(name)}
              iconPosition="start"
              label={getTabLabel(name)}
            />
          ))}
        </Tabs>

        {/* ===================== TAB 1: ĐĂNG KÝ DRONE CHỜ DUYỆT ===================== */}
        {panel === 'Drone registrations' && (
          <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
            {drones.isLoading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 6, gap: 2 }}>
                <CircularProgress size={26} />
                <Typography color="text.secondary">Đang tải danh sách chờ thẩm định…</Typography>
              </Box>
            ) : (drones.data ?? []).length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8, px: 2 }}>
                <VerifiedUserOutlined sx={{ fontSize: 48, color: '#98a2b3', mb: 1.5 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#344054' }}>
                  Không có hồ sơ đăng ký drone nào đang chờ duyệt
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Tất cả các hồ sơ đăng ký đã được thẩm định xong. Xem lại các drone đã duyệt tại tab{' '}
                  <strong>Lịch sử thẩm định Drone</strong>.
                </Typography>
              </Box>
            ) : (
              <Stack spacing={2}>
                {(drones.data ?? []).map((droneApp) => (
                  <Card
                    key={droneApp.id}
                    variant="outlined"
                    sx={{
                      borderRadius: '12px',
                      borderColor: '#e2e8f0',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderColor: '#94a3b8',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                      },
                    }}
                  >
                    <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: { xs: 'column', md: 'row' },
                          justifyContent: 'space-between',
                          alignItems: { xs: 'flex-start', md: 'center' },
                          gap: 2,
                        }}
                      >
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 0.75 }}>
                            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.05rem', color: '#0f172a' }}>
                              {droneApp.model ?? 'Thiết bị Drone'}
                            </Typography>
                            {droneApp.manufacturer && (
                              <Chip
                                label={`Hãng: ${droneApp.manufacturer}`}
                                size="small"
                                sx={{ fontWeight: 600, bgcolor: '#f1f5f9' }}
                              />
                            )}
                            <Chip
                              label="Chờ duyệt giấy tờ"
                              size="small"
                              sx={{
                                fontWeight: 600,
                                bgcolor: '#fef3c7',
                                color: '#b45309',
                                border: '1px solid #fde68a',
                              }}
                            />
                          </Box>

                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                            <Typography variant="body2" sx={{ color: '#334155', fontSize: '13.5px' }}>
                              👤 <strong>Người gửi đơn:</strong> {droneApp.inspectorFullName || 'Inspector'} ({droneApp.inspectorEmail || '—'})
                            </Typography>
                            {droneApp.inspectorPilotLicenseNumber && (
                              <Chip
                                label={`Bằng lái: ${droneApp.inspectorPilotLicenseNumber}`}
                                size="small"
                                variant="outlined"
                                sx={{ height: 20, fontSize: '11px', color: '#0284c7', borderColor: '#bae6fd' }}
                              />
                            )}
                          </Box>

                          <Box
                            sx={{
                              display: 'grid',
                              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' },
                              gap: 1.5,
                              mt: 1.5,
                              p: 1.5,
                              bgcolor: '#f8fafc',
                              borderRadius: '8px',
                            }}
                          >
                            <Typography variant="body2">
                              <span style={{ color: '#64748b' }}>Số Serial:</span>{' '}
                              <strong style={{ fontFamily: 'monospace', color: '#0f172a' }}>
                                {droneApp.serialNumber}
                              </strong>
                            </Typography>
                            <Typography variant="body2">
                              <span style={{ color: '#64748b' }}>Số đăng ký:</span>{' '}
                              <strong style={{ color: '#0f172a' }}>{droneApp.registrationNumber}</strong>
                            </Typography>
                            <Typography variant="body2">
                              <span style={{ color: '#64748b' }}>Hạn đăng ký:</span>{' '}
                              <strong style={{ color: '#0f172a' }}>
                                {droneApp.registrationExpiresAt
                                  ? new Date(droneApp.registrationExpiresAt).toLocaleDateString('vi-VN')
                                  : '—'}
                              </strong>
                            </Typography>
                          </Box>
                        </Box>

                        <Button
                          variant="contained"
                          startIcon={<FactCheckOutlined />}
                          onClick={() => void openReview(droneApp)}
                          sx={{
                            px: 3,
                            py: 1,
                            borderRadius: '8px',
                            textTransform: 'none',
                            fontWeight: 650,
                            bgcolor: '#3758F9',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 2px 6px rgba(55, 88, 249, 0.25)',
                            '&:hover': { bgcolor: '#2b45cb' },
                          }}
                        >
                          Thẩm định hồ sơ
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </Box>
        )}

        {/* ===================== TAB 2: LỊCH SỬ THẨM ĐỊNH DRONE ===================== */}
        {panel === 'Drone history' && (
          <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b' }}>
                Lịch sử các phương tiện Drone đã qua thẩm định
              </Typography>
              <Button
                size="small"
                startIcon={<RefreshRounded />}
                onClick={() => void droneHistory.refetch()}
                disabled={droneHistory.isFetching}
                sx={{ textTransform: 'none' }}
              >
                Làm mới
              </Button>
            </Box>

            {droneHistory.isLoading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 6, gap: 2 }}>
                <CircularProgress size={26} />
                <Typography color="text.secondary">Đang tải lịch sử thẩm định drone…</Typography>
              </Box>
            ) : (droneHistory.data ?? []).length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8, px: 2 }}>
                <HistoryRounded sx={{ fontSize: 48, color: '#98a2b3', mb: 1.5 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#344054' }}>
                  Chưa có lịch sử thẩm định drone nào
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Các hồ sơ sau khi được phê duyệt hoặc từ chối sẽ được lưu trữ đầy đủ tại đây.
                </Typography>
              </Box>
            ) : (
              <Stack spacing={2}>
                {(droneHistory.data ?? []).map((app) => (
                  <Card
                    key={app.id}
                    variant="outlined"
                    sx={{
                      borderRadius: '12px',
                      borderColor: app.status === 'APPROVED' ? '#bbf7d0' : '#fecaca',
                      bgcolor: app.status === 'APPROVED' ? '#f0fdf4' : '#fef2f2',
                    }}
                  >
                    <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: { xs: 'column', md: 'row' },
                          justifyContent: 'space-between',
                          alignItems: { xs: 'flex-start', md: 'center' },
                          gap: 2,
                        }}
                      >
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 0.75 }}>
                            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.05rem', color: '#0f172a' }}>
                              {app.model ?? 'Thiết bị Drone'}
                            </Typography>
                            {app.manufacturer && (
                              <Chip
                                label={`Hãng: ${app.manufacturer}`}
                                size="small"
                                sx={{ fontWeight: 600, bgcolor: '#ffffff' }}
                              />
                            )}
                            <Chip
                              icon={app.status === 'APPROVED' ? <CheckCircleRounded /> : <HighlightOffRounded />}
                              label={app.status === 'APPROVED' ? 'ĐÃ PHÊ DUYỆT' : 'ĐÃ TỪ CHỐI'}
                              color={app.status === 'APPROVED' ? 'success' : 'error'}
                              size="small"
                              sx={{ fontWeight: 700 }}
                            />
                          </Box>

                          <Typography variant="body2" sx={{ color: '#334155', fontSize: '13.5px', mb: 1 }}>
                            👤 <strong>Người nộp đơn:</strong> {app.inspectorFullName || 'Inspector'} ({app.inspectorEmail || '—'})
                          </Typography>

                          <Box
                            sx={{
                              display: 'grid',
                              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' },
                              gap: 1.5,
                              p: 1.5,
                              bgcolor: '#ffffff',
                              borderRadius: '8px',
                              border: '1px solid #e2e8f0',
                            }}
                          >
                            <Typography variant="body2">
                              <span style={{ color: '#64748b' }}>Số Serial:</span>{' '}
                              <strong style={{ fontFamily: 'monospace' }}>{app.serialNumber}</strong>
                            </Typography>
                            <Typography variant="body2">
                              <span style={{ color: '#64748b' }}>Số đăng ký:</span>{' '}
                              <strong>{app.registrationNumber}</strong>
                            </Typography>
                            <Typography variant="body2">
                              <span style={{ color: '#64748b' }}>Hạn kiểm định:</span>{' '}
                              <strong>
                                {app.registrationExpiresAt
                                  ? new Date(app.registrationExpiresAt).toLocaleDateString('vi-VN')
                                  : '—'}
                              </strong>
                            </Typography>
                          </Box>

                          <Box sx={{ mt: 1.5, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                            <Typography variant="caption" sx={{ color: '#475569' }}>
                              🛡️ <strong>Thẩm định bởi:</strong> {app.reviewerFullName || 'Platform Manager'}
                            </Typography>
                            {app.reviewedAt && (
                              <Typography variant="caption" sx={{ color: '#475569' }}>
                                🕒 <strong>Thời gian duyệt:</strong> {new Date(app.reviewedAt).toLocaleString('vi-VN')}
                              </Typography>
                            )}
                            {app.reviewNote && (
                              <Typography variant="caption" sx={{ color: '#b91c1c' }}>
                                📝 <strong>Ghi chú:</strong> {app.reviewNote}
                              </Typography>
                            )}
                          </Box>
                        </Box>

                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<OpenInNewRounded />}
                          onClick={() => void openReview(app)}
                          sx={{ textTransform: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}
                        >
                          Xem lại hồ sơ scan
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </Box>
        )}

        {/* ===================== TAB 3: HỒ SƠ ĐỐI TÁC INSPECTOR ===================== */}
        {panel === 'Inspector partners' && (
          <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between',
                alignItems: { xs: 'flex-start', sm: 'center' },
                gap: 1.5,
                mb: 2.5,
                p: 2,
                bgcolor: '#f8fafc',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
              }}
            >
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a' }}>
                  Quản lý hồ sơ đối tác Inspector
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Theo quy trình MF1: Manager trực tiếp tạo đối tác sau khi ký hợp đồng giấy offline, lưu scan bằng lái, quản lý giờ bay và chứng chỉ drone.
                </Typography>
              </Box>

              <Button
                variant="contained"
                startIcon={<PersonAddAlt />}
                onClick={() => setCreateInspectorOpen(true)}
                sx={{
                  bgcolor: '#3758F9',
                  textTransform: 'none',
                  fontWeight: 650,
                  borderRadius: '8px',
                  px: 2.5,
                  py: 1,
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 6px rgba(55, 88, 249, 0.25)',
                  '&:hover': { bgcolor: '#2b45cb' },
                }}
              >
                + Thêm mới đối tác Inspector
              </Button>
            </Box>

            {inspectorProfiles.isLoading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 6, gap: 2 }}>
                <CircularProgress size={26} />
                <Typography color="text.secondary">Đang tải danh sách phi công đối tác…</Typography>
              </Box>
            ) : (inspectorProfiles.data ?? []).length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8, px: 2 }}>
                <BadgeOutlined sx={{ fontSize: 48, color: '#98a2b3', mb: 1.5 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#344054' }}>
                  Chưa có đối tác Inspector nào
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
                  Bấm nút bên trên để tạo tài khoản và hồ sơ đối tác Inspector đầu tiên.
                </Typography>
              </Box>
            ) : (
              <Stack spacing={2}>
                {(inspectorProfiles.data ?? []).map((insp: InspectorProfile) => (
                  <Card
                    key={insp.id}
                    variant="outlined"
                    sx={{
                      borderRadius: '12px',
                      borderColor: '#e2e8f0',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderColor: '#94a3b8',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                      },
                    }}
                  >
                    <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: { xs: 'column', md: 'row' },
                          justifyContent: 'space-between',
                          alignItems: { xs: 'flex-start', md: 'center' },
                          gap: 2,
                        }}
                      >
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
                          <Avatar
                            src={insp.avatarUrl ?? undefined}
                            alt={insp.fullName}
                            sx={{ width: 48, height: 48, bgcolor: '#3758F9', fontWeight: 700 }}
                          >
                            {insp.fullName.slice(0, 1) || 'I'}
                          </Avatar>

                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 0.5 }}>
                              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.05rem', color: '#0f172a' }}>
                                {insp.fullName}
                              </Typography>
                              <Chip
                                label={insp.status === 'ACTIVE' ? 'Đang hoạt động' : insp.status}
                                size="small"
                                color={insp.status === 'ACTIVE' ? 'success' : 'default'}
                                sx={{ fontWeight: 600 }}
                              />
                              <Chip
                                label={
                                  insp.licenseExpirationStatus === 'VALID'
                                    ? `Bằng lái: Còn hạn ${insp.licenseRemainingDays ?? 0} ngày`
                                    : insp.licenseExpirationStatus === 'EXPIRING_SOON'
                                      ? `Bằng lái: Sắp hết hạn (${insp.licenseRemainingDays ?? 0} ngày)`
                                      : insp.licenseExpirationStatus === 'EXPIRED'
                                        ? 'Bằng lái: ĐÃ HẾT HẠN'
                                        : 'Bằng lái: Chưa cập nhật hạn'
                                }
                                size="small"
                                color={
                                  insp.licenseExpirationStatus === 'VALID'
                                    ? 'info'
                                    : insp.licenseExpirationStatus === 'EXPIRING_SOON'
                                      ? 'warning'
                                      : insp.licenseExpirationStatus === 'EXPIRED'
                                        ? 'error'
                                        : 'default'
                                }
                                sx={{ fontWeight: 600 }}
                              />
                              <Chip
                                label={insp.hasLicenseScan ? 'Scan MinIO: Đã lưu' : 'Scan MinIO: Chưa tải'}
                                size="small"
                                variant="outlined"
                                color={insp.hasLicenseScan ? 'success' : 'default'}
                                sx={{ fontWeight: 600 }}
                              />
                            </Box>

                            <Typography variant="body2" sx={{ color: '#475569', mb: 1 }}>
                              ✉️ {insp.email} {insp.phoneNumber && `· 📞 ${insp.phoneNumber}`}
                            </Typography>

                            <Box
                              sx={{
                                display: 'grid',
                                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' },
                                gap: 1.5,
                                p: 1.5,
                                bgcolor: '#f8fafc',
                                borderRadius: '8px',
                              }}
                            >
                              <Typography variant="body2">
                                <span style={{ color: '#64748b' }}>Số GPLX:</span>{' '}
                                <strong>{insp.pilotLicenseNumber || 'Chưa cập nhật'}</strong>
                              </Typography>
                              <Typography variant="body2">
                                <span style={{ color: '#64748b' }}>Tổng giờ bay:</span>{' '}
                                <strong style={{ color: '#0284c7' }}>{insp.totalFlightHours} giờ</strong>{' '}
                                <span style={{ fontSize: '11px', color: '#64748b' }}>
                                  ({insp.priorFlightHours}h trước + {insp.companyFlightHours}h cty)
                                </span>
                              </Typography>
                              <Typography variant="body2">
                                <span style={{ color: '#64748b' }}>Chứng chỉ Drone:</span>{' '}
                                <strong>{insp.certifiedDroneModels || 'Chưa cập nhật'}</strong>
                              </Typography>
                            </Box>
                          </Box>
                        </Box>

                        <Button
                          variant="contained"
                          startIcon={<FlightTakeoffRounded />}
                          onClick={() => {
                            setSelectedInspectorId(insp.id);
                            setProfileDialogOpen(true);
                          }}
                          sx={{
                            px: 2.5,
                            py: 1,
                            borderRadius: '8px',
                            textTransform: 'none',
                            fontWeight: 650,
                            bgcolor: '#3758F9',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 2px 6px rgba(55, 88, 249, 0.25)',
                            '&:hover': { bgcolor: '#2b45cb' },
                          }}
                        >
                          Hồ sơ phi công & MinIO Scan
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </Box>
        )}

        {/* ===================== TAB 4: VÙNG BAY KHÁCH HÀNG (ADMIN ONLY) ===================== */}
        {panel === 'Customer airspace' && isAdmin && (
          <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
            {customers.isLoading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 6, gap: 2 }}>
                <CircularProgress size={26} />
                <Typography color="text.secondary">Đang tải danh sách vùng bay…</Typography>
              </Box>
            ) : (customers.data ?? []).length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8, px: 2 }}>
                <ApartmentOutlined sx={{ fontSize: 48, color: '#98a2b3', mb: 1.5 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#344054' }}>
                  Không có vùng bay khách hàng nào chờ duyệt
                </Typography>
              </Box>
            ) : (
              <Stack spacing={2}>
                {(customers.data ?? []).map((customerApp) => (
                  <Card key={customerApp.id} variant="outlined" sx={{ borderRadius: '12px', borderColor: '#e2e8f0' }}>
                    <CardContent sx={{ p: 2.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                            {customerApp.organizationName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Tài sản: {customerApp.assetName} · Vùng bay: {customerApp.airspaceClassification}
                          </Typography>
                        </Box>
                        <Button variant="outlined" onClick={() => void openReview(customerApp)}>
                          Thẩm định
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </Box>
        )}
      </Paper>

      {/* ===================== DIALOG TẠO ĐỐI TÁC INSPECTOR MỚI ===================== */}
      <Dialog
        open={createInspectorOpen}
        onClose={() => setCreateInspectorOpen(false)}
        fullWidth
        maxWidth="xs"
        slotProps={{ paper: { sx: { borderRadius: '16px', p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Thêm mới Đối tác Inspector</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Nhập thông tin phi công đối tác sau khi ký hợp đồng offline. Hệ thống sẽ tạo tài khoản, kích hoạt và gửi mật khẩu tạm qua email cho đối tác.
          </Typography>

          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              required
              fullWidth
              label="Họ và tên Inspector"
              placeholder="VD: Nguyễn Văn Bay"
              value={createFullName}
              onChange={(e) => setCreateFullName(e.target.value)}
            />
            <TextField
              required
              fullWidth
              type="email"
              label="Email liên hệ (Nhận mật khẩu tạm)"
              placeholder="VD: bay.pilot@gmail.com"
              value={createEmail}
              onChange={(e) => setCreateEmail(e.target.value)}
            />

            {createError && <Alert severity="error">{createError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateInspectorOpen(false)} disabled={createPlatformUser.isPending}>
            Hủy
          </Button>
          <Button
            variant="contained"
            disabled={createPlatformUser.isPending || !createEmail.trim() || !createFullName.trim()}
            onClick={() => void handleCreateInspector()}
            sx={{ bgcolor: '#3758F9', '&:hover': { bgcolor: '#2b45cb' } }}
          >
            {createPlatformUser.isPending ? 'Đang tạo…' : 'Tạo đối tác & Gửi email'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ===================== MODAL MẬT KHẨU TẠM ===================== */}
      <Dialog
        open={Boolean(issuedPassword)}
        onClose={() => setIssuedPassword(null)}
        fullWidth
        maxWidth="xs"
        slotProps={{ paper: { sx: { borderRadius: '16px', p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Tài khoản Inspector đã tạo</DialogTitle>
        <DialogContent>
          <Alert severity="success" sx={{ mb: 2 }}>
            Tài khoản Inspector đã được kích hoạt. Thông tin đăng nhập đã được gửi tới email đối tác.
          </Alert>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Email:</strong> {issuedPassword?.email}
          </Typography>
          <Box sx={{ p: 1.5, bgcolor: '#f1f5f9', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
            <Typography variant="caption" color="text.secondary">
              Mật khẩu tạm thời:
            </Typography>
            <Typography sx={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>
              {issuedPassword?.temporaryPassword}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="contained" onClick={() => setIssuedPassword(null)} sx={{ bgcolor: '#3758F9' }}>
            Đã hiểu
          </Button>
        </DialogActions>
      </Dialog>

      {/* ===================== MODAL HỒ SƠ PHI CÔNG CHI TIẾT (4 TABS) ===================== */}
      {selectedInspectorId && (
        <InspectorProfileDialog
          inspectorId={selectedInspectorId}
          open={profileDialogOpen}
          onClose={() => {
            setProfileDialogOpen(false);
            setSelectedInspectorId(null);
            void queryClient.invalidateQueries({ queryKey: ['mf1-inspectors-list'] });
          }}
        />
      )}

      {/* ===================== MODAL THẨM ĐỊNH HỒ SƠ & GIẤY TỜ SCAN ===================== */}
      <Dialog
        open={Boolean(selected)}
        onClose={closeDialog}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '16px', overflow: 'hidden' } } }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            bgcolor: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            py: 2,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
            {panel === 'Drone history'
              ? 'Chi tiết Hồ sơ Phương tiện Drone (Đã thẩm định)'
              : 'Thẩm định hồ sơ Phương tiện Drone'}
          </Typography>
          <IconButton size="small" onClick={closeDialog} disabled={pending}>
            <CloseRounded />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          {selected && (
            <Stack spacing={2.5}>
              {/* Thông tin người nộp */}
              <Box sx={{ p: 2, bgcolor: '#f1f5f9', borderRadius: '10px' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#334155', mb: 1 }}>
                  👤 Thông tin Người nộp đơn (Inspector đối tác)
                </Typography>
                {'inspectorFullName' in selected && (
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
                    <Typography variant="body2">
                      Họ và tên: <strong>{selected.inspectorFullName || 'Inspector'}</strong>
                    </Typography>
                    <Typography variant="body2">
                      Email liên hệ: <strong>{selected.inspectorEmail || '—'}</strong>
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Thông số kỹ thuật drone */}
              {'model' in selected && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a', mb: 0.5 }}>
                    Thông tin kỹ thuật & Khai báo pháp lý
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#475569', mb: 1.5 }}>
                    {selected.model}
                  </Typography>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' },
                      gap: 1.5,
                      p: 1.5,
                      bgcolor: '#f8fafc',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <Box>
                      <Typography variant="caption" color="text.secondary">Hãng sản xuất:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{selected.manufacturer || '—'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Số Serial thân máy:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                        {selected.serialNumber}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Số đăng ký cơ quan cấp:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{selected.registrationNumber}</Typography>
                    </Box>
                  </Box>
                </Box>
              )}

              {/* HÌNH ẢNH GIẤY TỜ THẨM ĐỊNH (SCAN MINIO) */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a', mb: 1 }}>
                  Tài liệu hình ảnh giấy tờ bắt buộc (Lưu trữ an toàn MinIO)
                </Typography>

                {evidenceLoading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 6, gap: 1.5 }}>
                    <CircularProgress size={24} />
                    <Typography variant="body2" color="text.secondary">Đang tải bản scan tài liệu từ MinIO…</Typography>
                  </Box>
                ) : evidenceDocs.length === 0 ? (
                  <Alert severity="warning">Không tìm thấy tài liệu đính kèm cho đơn đăng ký này.</Alert>
                ) : (
                  <Box sx={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                    <Tabs
                      value={activeDocIndex}
                      onChange={(_, i: number) => setActiveDocIndex(i)}
                      variant="scrollable"
                      sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}
                    >
                      {evidenceDocs.map((doc) => (
                        <Tab
                          key={doc.type}
                          label={`📄 ${doc.label}`}
                          sx={{ textTransform: 'none', fontWeight: 600, fontSize: '13px' }}
                        />
                      ))}
                    </Tabs>

                    <Box sx={{ p: 2, bgcolor: '#ffffff', textAlign: 'center', minHeight: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      {activeDoc && (
                        <Box sx={{ width: '100%' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                              {activeDoc.label}
                            </Typography>
                            {activeDoc.url && (
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                {!activeDoc.isPdf && (
                                  <Button
                                    size="small"
                                    startIcon={<ZoomInRounded />}
                                    onClick={() => setZoomUrl(activeDoc.url)}
                                    sx={{ textTransform: 'none' }}
                                  >
                                    Phóng to
                                  </Button>
                                )}
                                <Button
                                  size="small"
                                  startIcon={<OpenInNewRounded />}
                                  component="a"
                                  href={activeDoc.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  sx={{ textTransform: 'none' }}
                                >
                                  Mở tab mới
                                </Button>
                              </Box>
                            )}
                          </Box>

                          {activeDoc.failed ? (
                            <Alert severity="error">Không thể hiển thị tài liệu này từ máy chủ lưu trữ MinIO.</Alert>
                          ) : activeDoc.isPdf ? (
                            <iframe
                              src={activeDoc.url}
                              title={activeDoc.label}
                              style={{ width: '100%', height: '400px', border: 'none', borderRadius: '8px' }}
                            />
                          ) : (
                            <Box
                              component="img"
                              src={activeDoc.url}
                              alt={activeDoc.label}
                              sx={{
                                maxHeight: 380,
                                maxWidth: '100%',
                                objectFit: 'contain',
                                borderRadius: '8px',
                                border: '1px solid #f1f5f9',
                                cursor: 'zoom-in',
                              }}
                              onClick={() => setZoomUrl(activeDoc.url)}
                            />
                          )}
                        </Box>
                      )}
                    </Box>
                  </Box>
                )}
              </Box>

              {/* KHU VỰC QUYẾT ĐỊNH THẨM ĐỊNH (CHỈ KHI CHƯA DUYỆT) */}
              {panel !== 'Drone history' && (
                <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a', mb: 1 }}>
                    {isAdmin ? 'Quyết định của Platform Admin' : 'Quyết định của Platform Manager'}
                  </Typography>

                  <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
                    <Button
                      variant={action === 'approve' ? 'contained' : 'outlined'}
                      color="success"
                      startIcon={<CheckCircleOutlineRounded />}
                      onClick={() => setAction('approve')}
                      sx={{ textTransform: 'none', fontWeight: 650 }}
                    >
                      Phê duyệt đạt chuẩn
                    </Button>
                    <Button
                      variant={action === 'reject' ? 'contained' : 'outlined'}
                      color="error"
                      startIcon={<HighlightOffRounded />}
                      onClick={() => setAction('reject')}
                      sx={{ textTransform: 'none', fontWeight: 650 }}
                    >
                      Từ chối / Yêu cầu bổ sung
                    </Button>
                  </Box>

                  {action === 'approve' ? (
                    <Alert severity="success">
                      <strong>Xác nhận phê duyệt:</strong> Số Serial, số đăng ký và thông số kỹ thuật trùng khớp với hình ảnh Giấy đăng ký, Giấy tờ sở hữu và Giấy kiểm định an toàn hợp lệ theo Luật Phòng không nhân dân 2024 & Nghị định 288/2025/NĐ-CP.
                    </Alert>
                  ) : (
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      label="Lý do từ chối / Hướng dẫn bổ sung hồ sơ"
                      placeholder="VD: Ảnh chụp giấy kiểm định bị mờ số Serial, yêu cầu chụp lại rõ nét..."
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                    />
                  )}
                </Box>
              )}

              {error && <Alert severity="error">{error}</Alert>}
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={closeDialog} disabled={pending}>
            Đóng
          </Button>
          {panel !== 'Drone history' && (
            <Button
              variant="contained"
              color={action === 'approve' ? 'success' : 'error'}
              onClick={() => void review()}
              disabled={pending}
              sx={{ px: 3, fontWeight: 650 }}
            >
              {pending ? 'Đang lưu…' : action === 'approve' ? 'Xác nhận phê duyệt' : 'Xác nhận từ chối'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* MODAL ZOOM ẢNH SCAN */}
      <Dialog open={Boolean(zoomUrl)} onClose={() => setZoomUrl(null)} maxWidth="lg">
        <DialogTitle sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
          <IconButton size="small" onClick={() => setZoomUrl(null)}>
            <CloseRounded />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 2, textAlign: 'center' }}>
          {zoomUrl && (
            <Box
              component="img"
              src={zoomUrl}
              alt="Zoom scan"
              sx={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
