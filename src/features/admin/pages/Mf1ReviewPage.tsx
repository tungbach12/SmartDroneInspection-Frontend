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
import { useLocale } from '@/shared/i18n/LocaleProvider';

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
  const { locale } = useLocale();
  const tr = (vi: string, en: string) => (locale === 'vi' ? vi : en);
  const dateLocale = locale === 'vi' ? 'vi-VN' : 'en-US';

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
      const droneApplication = isDroneApp ? (item as DroneRegistrationApplication) : null;
      let documentsToFetch: Array<{ label: string; type: string; load: () => Promise<Blob> }> = [];

      if (droneApplication) {
        if (droneApplication.documentFiles && Object.keys(droneApplication.documentFiles).length > 0) {
          documentsToFetch = Object.entries(droneApplication.documentFiles).map(([code]) => ({
            label: code,
            type: code,
            load: () => mf1ReviewApi.droneEvidence(item.id, code),
          }));
        } else {
          documentsToFetch = [
            {
              label: tr('Đăng ký drone', 'Drone registration'),
              type: 'REGISTRATION',
              load: () => mf1ReviewApi.droneEvidence(item.id, 'REGISTRATION'),
            },
            {
              label: tr('Chứng từ sở hữu', 'Proof of ownership'),
              type: 'OWNERSHIP',
              load: () => mf1ReviewApi.droneEvidence(item.id, 'OWNERSHIP'),
            },
          ];
          if (droneApplication.inspectionFileKey) {
            documentsToFetch.push({
              label: tr('Kiểm định an toàn', 'Safety inspection'),
              type: 'INSPECTION',
              load: () => mf1ReviewApi.droneEvidence(item.id, 'INSPECTION'),
            });
          }
        }
        if (droneApplication.imageFileKeys && droneApplication.imageFileKeys.length > 0) {
          droneApplication.imageFileKeys.forEach((_, idx) => {
            documentsToFetch.push({
              label: tr(`Ảnh drone #${idx + 1}`, `Drone Photo #${idx + 1}`),
              type: `DRONE_IMAGE_${idx}`,
              load: () => mf1ReviewApi.droneEvidence(item.id, `DRONE_IMAGE_${idx}`),
            });
          });
        }
      }

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
          label: documentsToFetch[index]?.label ?? tr('Tài liệu', 'Document'),
          type: documentsToFetch[index]?.type ?? 'UNKNOWN',
          url: '',
          isPdf: false,
          failed: true,
        };
      });

      setEvidenceDocs(docs);
    } catch {
      setError(
        tr(
          'Không thể tải tài liệu hình ảnh. Vui lòng thử lại sau.',
          'Could not load document evidence. Please try again later.',
        ),
      );
    } finally {
      setEvidenceLoading(false);
    }
  };

  const review = async () => {
    if (!selected) return;
    if (action === 'reject' && !reviewNote.trim()) {
      setError(
        tr(
          'Vui lòng nêu rõ lý do từ chối để Inspector bổ sung lại.',
          'Please provide a clear rejection reason so the applicant can resubmit.',
        ),
      );
      return;
    }
    if (panel === 'Customer airspace' && action === 'approve' && !reviewNote.trim()) {
      setError(
        tr(
          'Ghi chú xét duyệt là bắt buộc đối với vùng bay khách hàng.',
          'A review note is required when approving customer airspace.',
        ),
      );
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
      setError(
        tr(
          'Không thể lưu quyết định duyệt. Vui lòng tải lại trang và thử lại.',
          'Could not save review decision. Please reload and try again.',
        ),
      );
    } finally {
      setPending(false);
    }
  };

  const handleCreateInspector = async () => {
    if (!createEmail.trim() || !createFullName.trim()) {
      setCreateError(
        tr(
          'Vui lòng nhập đầy đủ họ tên và email đối tác.',
          'Please enter both the partner inspector full name and email.',
        ),
      );
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
        err instanceof Error
          ? err.message
          : tr(
              'Không thể tạo đối tác Inspector. Vui lòng thử lại.',
              'Could not create partner inspector account. Please try again.',
            );
      setCreateError(message);
    }
  };

  const getTabLabel = (name: Panel) => {
    if (name === 'Drone registrations') {
      const count = drones.data?.length ?? 0;
      return tr(`Đăng ký Drone chờ duyệt (${count})`, `Partner Drone Registrations (${count})`);
    }
    if (name === 'Drone history') {
      const count = droneHistory.data?.length ?? 0;
      return tr(`Lịch sử thẩm định Drone (${count})`, `Drone Review History (${count})`);
    }
    if (name === 'Inspector partners') {
      const count = inspectorProfiles.data?.length ?? 0;
      return tr(`Hồ sơ đối tác Inspector (${count})`, `Partner Inspector Applications (${count})`);
    }
    const count = customers.data?.length ?? 0;
    return tr(`Vùng bay khách hàng (${count})`, `Customer Airspace & Assets (${count})`);
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
        title={tr('Xét duyệt hồ sơ Onboarding (MF1)', 'Onboarding & Compliance Reviews (MF1)')}
        breadcrumbs={[
          { label: 'Home', to: isAdmin ? '/admin/dashboard' : '/manager/dashboard' },
          { label: tr('Duyệt onboarding', 'Onboarding reviews') },
        ]}
      />

      <Box sx={{ mt: 2.5 }}>
        <Tabs
          value={panel}
          onChange={(_, value: Panel) => setPanel(value)}
          aria-label="MF1 review queues"
          variant="scrollable"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            mb: 2.5,
            '& .MuiTab-root': {
              minHeight: 48,
              fontWeight: 650,
              textTransform: 'none',
              fontSize: '0.875rem',
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

        {/* ===================== TAB 1: PARTNER DRONE REGISTRATIONS ===================== */}
        {panel === 'Drone registrations' && (
          <Box>
            {drones.isLoading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 6, gap: 2 }}>
                <CircularProgress size={26} />
                <Typography color="text.secondary">
                  {tr('Đang tải danh sách chờ thẩm định…', 'Loading pending drone registrations…')}
                </Typography>
              </Box>
            ) : (drones.data ?? []).length === 0 ? (
              <Card variant="outlined" sx={{ borderRadius: '10px', borderColor: 'divider', textAlign: 'center', py: 8, px: 2 }}>
                <VerifiedUserOutlined sx={{ fontSize: 48, color: 'text.secondary', mb: 1.5 }} />
                <Typography variant="h6" component="h2" sx={{ fontWeight: 600, fontSize: '1rem', color: 'text.primary' }}>
                  {tr(
                    'Không có hồ sơ đăng ký drone nào đang chờ duyệt',
                    'No drone registration records pending review',
                  )}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {tr(
                    'Tất cả các hồ sơ đăng ký đã được thẩm định xong. Xem lại các drone đã duyệt tại tab ',
                    'All submitted drone registration records have been reviewed. View past decisions in ',
                  )}
                  <strong>{tr('Lịch sử thẩm định Drone', 'Drone Review History')}</strong>.
                </Typography>
              </Card>
            ) : (
              <Stack spacing={2}>
                {(drones.data ?? []).map((droneApp) => (
                  <Card
                    key={droneApp.id}
                    variant="outlined"
                    sx={{
                      borderRadius: '10px',
                      borderColor: 'divider',
                      transition: 'border-color 0.2s ease',
                      '&:hover': {
                        borderColor: 'primary.main',
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
                            <Typography variant="h6" component="h2" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary' }}>
                              {droneApp.model ?? tr('Thiết bị Drone', 'Drone Aircraft')}
                            </Typography>
                            {droneApp.manufacturer && (
                              <Chip
                                label={`${tr('Hãng', 'Make')}: ${droneApp.manufacturer}`}
                                size="small"
                                variant="outlined"
                                sx={{ fontWeight: 600 }}
                              />
                            )}
                            <Chip
                              label={tr('Chờ duyệt giấy tờ', 'Pending document review')}
                              size="small"
                              color="warning"
                              variant="outlined"
                              sx={{ fontWeight: 600 }}
                            />
                          </Box>

                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                            <Typography variant="body2" sx={{ color: 'text.primary', fontSize: '0.875rem' }}>
                              <strong>{tr('Người gửi đơn:', 'Applicant:')}</strong>{' '}
                              {droneApp.inspectorFullName || 'Inspector'} ({droneApp.inspectorEmail || '—'})
                            </Typography>
                            {droneApp.inspectorPilotLicenseNumber && (
                              <Chip
                                label={`${tr('Bằng lái', 'License')}: ${droneApp.inspectorPilotLicenseNumber}${droneApp.inspectorPilotLicenseClass ? ` (${droneApp.inspectorPilotLicenseClass === 'CLASS_A' ? 'Hạng A < 2 kg' : 'Hạng B ≥ 2 kg'})` : ''}`}
                                size="small"
                                color="info"
                                variant="outlined"
                                sx={{ height: 22, fontSize: '0.75rem' }}
                              />
                            )}
                            {(() => {
                              const tier = classifyDroneLegalTier(droneApp.model);
                              return (
                                <Chip
                                  label={`${tier.categoryLabel} · Yêu cầu ${tier.requiredPilotLicenseLabel}`}
                                  size="small"
                                  color={tier.requiresClassB ? 'warning' : 'success'}
                                  variant="outlined"
                                  sx={{ height: 20, fontSize: '11px', fontWeight: 600 }}
                                />
                              );
                            })()}
                          </Box>

                          {(() => {
                            const tier = classifyDroneLegalTier(droneApp.model);
                            if (tier.requiresClassB && droneApp.inspectorPilotLicenseClass === 'CLASS_A') {
                              return (
                                <Alert severity="warning" sx={{ mb: 1.5, py: 0.5 }}>
                                  <strong>Lưu ý pháp lý (Điều 27 NĐ 288/2025/NĐ-CP):</strong> Thiết bị thuộc {tier.categoryLabel} (MTOW ≥ 2 kg, bắt buộc <strong>Bằng lái Hạng B</strong>), nhưng hồ sơ của Inspector hiện đang khai báo <strong>Bằng Hạng A (&lt; 2 kg)</strong>. Cần cập nhật Bằng Hạng B trước khi điều phối bay ở WF-02.
                                </Alert>
                              );
                            }
                            return null;
                          })()}

                          <Box
                            sx={{
                              display: 'grid',
                              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' },
                              gap: 1.5,
                              mt: 1.5,
                              p: 1.5,
                              bgcolor: 'background.default',
                              borderRadius: '8px',
                            }}
                          >
                            <Typography variant="body2">
                              <Box component="span" sx={{ color: 'text.secondary' }}>
                                {tr('Số Serial:', 'Serial Number:')}
                              </Box>{' '}
                              <Box component="strong" sx={{ fontFamily: 'monospace', color: 'text.primary' }}>
                                {droneApp.serialNumber}
                              </Box>
                            </Typography>
                            <Typography variant="body2">
                              <Box component="span" sx={{ color: 'text.secondary' }}>
                                {tr('Số đăng ký:', 'Registration No.:')}
                              </Box>{' '}
                              <Box component="strong" sx={{ color: 'text.primary' }}>
                                {droneApp.registrationNumber}
                              </Box>
                            </Typography>
                            <Typography variant="body2">
                              <Box component="span" sx={{ color: 'text.secondary' }}>
                                {tr('Hạn đăng ký:', 'Expires:')}
                              </Box>{' '}
                              <Box component="strong" sx={{ color: 'text.primary' }}>
                                {droneApp.registrationExpiresAt
                                  ? new Date(droneApp.registrationExpiresAt).toLocaleDateString(dateLocale)
                                  : '—'}
                              </Box>
                            </Typography>
                          </Box>
                        </Box>

                        <Button
                          variant="contained"
                          color="primary"
                          startIcon={<FactCheckOutlined />}
                          onClick={() => void openReview(droneApp)}
                          sx={{
                            px: 3,
                            py: 1,
                            borderRadius: '8px',
                            textTransform: 'none',
                            fontWeight: 650,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {tr('Thẩm định hồ sơ', 'Review application')}
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </Box>
        )}

        {/* ===================== TAB 2: DRONE REVIEW HISTORY ===================== */}
        {panel === 'Drone history' && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" component="h2" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary' }}>
                {tr(
                  'Lịch sử các phương tiện Drone đã qua thẩm định',
                  'Reviewed Drone Registration History',
                )}
              </Typography>
              <Button
                size="small"
                startIcon={<RefreshRounded />}
                onClick={() => void droneHistory.refetch()}
                disabled={droneHistory.isFetching}
                sx={{ textTransform: 'none' }}
              >
                {tr('Làm mới', 'Refresh')}
              </Button>
            </Box>

            {droneHistory.isLoading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 6, gap: 2 }}>
                <CircularProgress size={26} />
                <Typography color="text.secondary">
                  {tr('Đang tải lịch sử thẩm định drone…', 'Loading drone review history…')}
                </Typography>
              </Box>
            ) : (droneHistory.data ?? []).length === 0 ? (
              <Card variant="outlined" sx={{ borderRadius: '10px', borderColor: 'divider', textAlign: 'center', py: 8, px: 2 }}>
                <HistoryRounded sx={{ fontSize: 48, color: 'text.secondary', mb: 1.5 }} />
                <Typography variant="h6" component="h2" sx={{ fontWeight: 600, fontSize: '1rem', color: 'text.primary' }}>
                  {tr('Chưa có lịch sử thẩm định drone nào', 'No drone review history yet')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {tr(
                    'Các hồ sơ sau khi được phê duyệt hoặc từ chối sẽ được lưu trữ đầy đủ tại đây.',
                    'Approved and rejected drone registration applications will be archived here.',
                  )}
                </Typography>
              </Card>
            ) : (
              <Stack spacing={2}>
                {(droneHistory.data ?? []).map((app) => (
                  <Card
                    key={app.id}
                    variant="outlined"
                    sx={{
                      borderRadius: '10px',
                      borderColor: app.status === 'APPROVED' ? 'success.main' : 'error.main',
                      bgcolor: 'background.paper',
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
                            <Typography variant="h6" component="h2" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary' }}>
                              {app.model ?? tr('Thiết bị Drone', 'Drone Aircraft')}
                            </Typography>
                            {app.manufacturer && (
                              <Chip
                                label={`${tr('Hãng', 'Make')}: ${app.manufacturer}`}
                                size="small"
                                variant="outlined"
                                sx={{ fontWeight: 600 }}
                              />
                            )}
                            <Chip
                              icon={app.status === 'APPROVED' ? <CheckCircleRounded /> : <HighlightOffRounded />}
                              label={
                                app.status === 'APPROVED'
                                  ? tr('ĐÃ PHÊ DUYỆT', 'APPROVED')
                                  : tr('ĐÃ TỪ CHỐI', 'REJECTED')
                              }
                              color={app.status === 'APPROVED' ? 'success' : 'error'}
                              size="small"
                              sx={{ fontWeight: 700 }}
                            />
                          </Box>

                          <Typography variant="body2" sx={{ color: 'text.primary', fontSize: '0.875rem', mb: 1 }}>
                            <strong>{tr('Người nộp đơn:', 'Applicant:')}</strong>{' '}
                            {app.inspectorFullName || 'Inspector'} ({app.inspectorEmail || '—'})
                          </Typography>

                          <Box
                            sx={{
                              display: 'grid',
                              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' },
                              gap: 1.5,
                              p: 1.5,
                              bgcolor: 'background.default',
                              borderRadius: '8px',
                              border: 1,
                              borderColor: 'divider',
                            }}
                          >
                            <Typography variant="body2">
                              <Box component="span" sx={{ color: 'text.secondary' }}>
                                {tr('Số Serial:', 'Serial Number:')}
                              </Box>{' '}
                              <Box component="strong" sx={{ fontFamily: 'monospace' }}>
                                {app.serialNumber}
                              </Box>
                            </Typography>
                            <Typography variant="body2">
                              <Box component="span" sx={{ color: 'text.secondary' }}>
                                {tr('Số đăng ký:', 'Registration No.:')}
                              </Box>{' '}
                              <strong>{app.registrationNumber}</strong>
                            </Typography>
                            <Typography variant="body2">
                              <Box component="span" sx={{ color: 'text.secondary' }}>
                                {tr('Hạn kiểm định:', 'Inspection Expiry:')}
                              </Box>{' '}
                              <strong>
                                {app.registrationExpiresAt
                                  ? new Date(app.registrationExpiresAt).toLocaleDateString(dateLocale)
                                  : '—'}
                              </strong>
                            </Typography>
                          </Box>

                          <Box sx={{ mt: 1.5, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              <strong>{tr('Thẩm định bởi:', 'Reviewed by:')}</strong>{' '}
                              {app.reviewerFullName || 'Platform Manager'}
                            </Typography>
                            {app.reviewedAt && (
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                <strong>{tr('Thời gian duyệt:', 'Reviewed at:')}</strong>{' '}
                                {new Date(app.reviewedAt).toLocaleString(dateLocale)}
                              </Typography>
                            )}
                            {app.reviewNote && (
                              <Typography variant="caption" sx={{ color: 'error.main' }}>
                                <strong>{tr('Ghi chú:', 'Note:')}</strong> {app.reviewNote}
                              </Typography>
                            )}
                          </Box>
                        </Box>

                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<OpenInNewRounded />}
                          onClick={() => void openReview(app)}
                          sx={{ textTransform: 'none', fontWeight: 600, whiteSpace: 'nowrap', borderRadius: '8px' }}
                        >
                          {tr('Xem lại hồ sơ scan', 'View scanned documents')}
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </Box>
        )}

        {/* ===================== TAB 3: PARTNER INSPECTOR APPLICATIONS ===================== */}
        {panel === 'Inspector partners' && (
          <Box>
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between',
                alignItems: { xs: 'flex-start', sm: 'center' },
                gap: 1.5,
                mb: 2.5,
                p: 2,
                bgcolor: 'background.default',
                borderRadius: '10px',
                border: 1,
                borderColor: 'divider',
              }}
            >
              <Box>
                <Typography variant="h6" component="h2" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary' }}>
                  {tr('Danh sách đối tác Inspector', 'Partner Inspector Roster')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {tr(
                    'Quản lý thông tin bằng lái, giờ bay tích lũy và dòng thiết bị drone được chứng nhận.',
                    'Manage pilot licenses, accumulated flight hours, and certified drone models.',
                  )}
                </Typography>
              </Box>

              <Button
                variant="contained"
                color="primary"
                startIcon={<PersonAddAlt />}
                onClick={() => setCreateInspectorOpen(true)}
                sx={{
                  textTransform: 'none',
                  fontWeight: 650,
                  borderRadius: '8px',
                  px: 2.5,
                  py: 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {tr('+ Thêm mới đối tác Inspector', '+ Add Partner Inspector')}
              </Button>
            </Box>

            {inspectorProfiles.isLoading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 6, gap: 2 }}>
                <CircularProgress size={26} />
                <Typography color="text.secondary">
                  {tr('Đang tải danh sách phi công đối tác…', 'Loading partner inspectors…')}
                </Typography>
              </Box>
            ) : (inspectorProfiles.data ?? []).length === 0 ? (
              <Card variant="outlined" sx={{ borderRadius: '10px', borderColor: 'divider', textAlign: 'center', py: 8, px: 2 }}>
                <BadgeOutlined sx={{ fontSize: 48, color: 'text.secondary', mb: 1.5 }} />
                <Typography variant="h6" component="h2" sx={{ fontWeight: 600, fontSize: '1rem', color: 'text.primary' }}>
                  {tr('Chưa có đối tác Inspector nào', 'No partner inspector profiles yet')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
                  {tr(
                    'Bấm nút bên trên để tạo tài khoản và hồ sơ đối tác Inspector đầu tiên.',
                    'Use the button above to provision the first partner inspector account and profile.',
                  )}
                </Typography>
              </Card>
            ) : (
              <Stack spacing={2}>
                {(inspectorProfiles.data ?? []).map((insp: InspectorProfile) => (
                  <Card
                    key={insp.id}
                    variant="outlined"
                    sx={{
                      borderRadius: '10px',
                      borderColor: 'divider',
                      transition: 'border-color 0.2s ease',
                      '&:hover': {
                        borderColor: 'primary.main',
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
                            sx={{ width: 48, height: 48, bgcolor: 'primary.main', fontWeight: 700 }}
                          >
                            {insp.fullName.slice(0, 1) || 'I'}
                          </Avatar>

                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 0.5 }}>
                              <Typography variant="h6" component="h2" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary' }}>
                                {insp.fullName}
                              </Typography>
                              <Chip
                                label={
                                  insp.status === 'ACTIVE'
                                    ? tr('Đang hoạt động', 'Active')
                                    : insp.status
                                }
                                size="small"
                                color={insp.status === 'ACTIVE' ? 'success' : 'default'}
                                sx={{ fontWeight: 600 }}
                              />
                              <Chip
                                label={
                                  insp.licenseExpirationStatus === 'VALID'
                                    ? tr(
                                        `Bằng lái: Còn hạn ${insp.licenseRemainingDays ?? 0} ngày`,
                                        `License: Valid (${insp.licenseRemainingDays ?? 0}d left)`,
                                      )
                                    : insp.licenseExpirationStatus === 'EXPIRING_SOON'
                                      ? tr(
                                          `Bằng lái: Sắp hết hạn (${insp.licenseRemainingDays ?? 0} ngày)`,
                                          `License: Expiring soon (${insp.licenseRemainingDays ?? 0}d)`,
                                        )
                                      : insp.licenseExpirationStatus === 'EXPIRED'
                                        ? tr('Bằng lái: ĐÃ HẾT HẠN', 'License: EXPIRED')
                                        : tr('Bằng lái: Chưa cập nhật hạn', 'License: Expiry not set')
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
                                label={
                                  insp.hasLicenseScan
                                    ? tr('Bản scan GPLX: Đã lưu', 'License scan: Uploaded')
                                    : tr('Bản scan GPLX: Chưa tải', 'License scan: Missing')
                                }
                                size="small"
                                variant="outlined"
                                color={insp.hasLicenseScan ? 'success' : 'default'}
                                sx={{ fontWeight: 600 }}
                              />
                            </Box>

                            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                              {insp.email} {insp.phoneNumber && `· ${insp.phoneNumber}`}
                            </Typography>

                            <Box
                              sx={{
                                display: 'grid',
                                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' },
                                gap: 1.5,
                                p: 1.5,
                                bgcolor: 'background.default',
                                borderRadius: '8px',
                              }}
                            >
                              <Typography variant="body2">
                                <Box component="span" sx={{ color: 'text.secondary' }}>
                                  {tr('Số GPLX:', 'License No.:')}
                                </Box>{' '}
                                <strong>{insp.pilotLicenseNumber || tr('Chưa cập nhật', 'Not set')}</strong>
                              </Typography>
                              <Typography variant="body2">
                                <Box component="span" sx={{ color: 'text.secondary' }}>
                                  {tr('Tổng giờ bay:', 'Total flight hours:')}
                                </Box>{' '}
                                <Box component="strong" sx={{ color: 'info.main' }}>
                                  {insp.totalFlightHours} {tr('giờ', 'hrs')}
                                </Box>{' '}
                                <Box component="span" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                                  ({insp.priorFlightHours}h {tr('trước', 'prior')} + {insp.companyFlightHours}h{' '}
                                  {tr('cty', 'platform')})
                                </Box>
                              </Typography>
                              <Typography variant="body2">
                                <Box component="span" sx={{ color: 'text.secondary' }}>
                                  {tr('Chứng chỉ Drone:', 'Certified models:')}
                                </Box>{' '}
                                <strong>{insp.certifiedDroneModels || tr('Chưa cập nhật', 'Not set')}</strong>
                              </Typography>
                            </Box>
                          </Box>
                        </Box>

                        <Button
                          variant="outlined"
                          color="primary"
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
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {tr('Hồ sơ phi công', 'Pilot profile')}
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </Box>
        )}

        {/* ===================== TAB 4: CUSTOMER AIRSPACE & ASSETS (ADMIN ONLY) ===================== */}
        {panel === 'Customer airspace' && isAdmin && (
          <Box>
            {customers.isLoading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 6, gap: 2 }}>
                <CircularProgress size={26} />
                <Typography color="text.secondary">
                  {tr('Đang tải danh sách vùng bay…', 'Loading customer airspace reviews…')}
                </Typography>
              </Box>
            ) : (customers.data ?? []).length === 0 ? (
              <Card variant="outlined" sx={{ borderRadius: '10px', borderColor: 'divider', textAlign: 'center', py: 8, px: 2 }}>
                <ApartmentOutlined sx={{ fontSize: 48, color: 'text.secondary', mb: 1.5 }} />
                <Typography variant="h6" component="h2" sx={{ fontWeight: 600, fontSize: '1rem', color: 'text.primary' }}>
                  {tr(
                    'Không có vùng bay khách hàng nào chờ duyệt',
                    'No customer airspace records pending review',
                  )}
                </Typography>
              </Card>
            ) : (
              <Stack spacing={2}>
                {(customers.data ?? []).map((customerApp) => (
                  <Card key={customerApp.id} variant="outlined" sx={{ borderRadius: '10px', borderColor: 'divider' }}>
                    <CardContent sx={{ p: 2.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="h6" component="h2" sx={{ fontWeight: 700, fontSize: '1rem' }}>
                            {customerApp.organizationName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {tr('Tài sản:', 'Asset:')} {customerApp.assetName} · {tr('Vùng bay:', 'Airspace:')}{' '}
                            {customerApp.airspaceClassification}
                          </Typography>
                        </Box>
                        <Button
                          variant="outlined"
                          onClick={() => void openReview(customerApp)}
                          sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                        >
                          {tr('Thẩm định', 'Review')}
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </Box>
        )}
      </Box>

      {/* ===================== DIALOG: CREATE PARTNER INSPECTOR ===================== */}
      <Dialog
        open={createInspectorOpen}
        onClose={() => setCreateInspectorOpen(false)}
        fullWidth
        maxWidth="xs"
        slotProps={{ paper: { sx: { borderRadius: '10px', p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {tr('Thêm mới Đối tác Inspector', 'Add Partner Inspector')}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {tr(
              'Nhập thông tin phi công đối tác sau khi ký hợp đồng offline. Hệ thống sẽ tạo tài khoản, kích hoạt và gửi mật khẩu tạm qua email cho đối tác.',
              'Enter partner pilot details after offline contract signing. The platform will create the account and issue a one-time password.',
            )}
          </Typography>

          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              required
              fullWidth
              label={tr('Họ và tên Inspector', 'Inspector full name')}
              placeholder={tr('VD: Nguyễn Văn Bay', 'e.g. Nguyen Van Bay')}
              value={createFullName}
              onChange={(e) => setCreateFullName(e.target.value)}
            />
            <TextField
              required
              fullWidth
              type="email"
              label={tr('Email liên hệ (Nhận mật khẩu tạm)', 'Contact email (Receives temporary password)')}
              placeholder="bay.pilot@example.com"
              value={createEmail}
              onChange={(e) => setCreateEmail(e.target.value)}
            />

            {createError && <Alert severity="error">{createError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateInspectorOpen(false)} disabled={createPlatformUser.isPending}>
            {tr('Hủy', 'Cancel')}
          </Button>
          <Button
            variant="contained"
            color="primary"
            disabled={createPlatformUser.isPending || !createEmail.trim() || !createFullName.trim()}
            onClick={() => void handleCreateInspector()}
          >
            {createPlatformUser.isPending
              ? tr('Đang tạo…', 'Creating…')
              : tr('Tạo đối tác & Gửi email', 'Create partner & send email')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ===================== DIALOG: TEMPORARY PASSWORD ===================== */}
      <Dialog
        open={Boolean(issuedPassword)}
        onClose={() => setIssuedPassword(null)}
        fullWidth
        maxWidth="xs"
        slotProps={{ paper: { sx: { borderRadius: '10px', p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {tr('Tài khoản Inspector đã tạo', 'Partner Inspector Account Created')}
        </DialogTitle>
        <DialogContent>
          <Alert severity="success" sx={{ mb: 2 }}>
            {tr(
              'Tài khoản Inspector đã được kích hoạt. Thông tin đăng nhập đã được gửi tới email đối tác.',
              'Partner inspector account is active. Sign-in credentials have been issued.',
            )}
          </Alert>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Email:</strong> {issuedPassword?.email}
          </Typography>
          <Box sx={{ p: 1.5, bgcolor: 'background.default', borderRadius: '8px', border: 1, borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary">
              {tr('Mật khẩu tạm thời:', 'Temporary password:')}
            </Typography>
            <Typography sx={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1rem', color: 'text.primary' }}>
              {issuedPassword?.temporaryPassword}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="contained" color="primary" onClick={() => setIssuedPassword(null)}>
            {tr('Đã hiểu', 'Done')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ===================== DIALOG: INSPECTOR PROFILE ===================== */}
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

      {/* ===================== DIALOG: APPLICATION & EVIDENCE REVIEW ===================== */}
      <Dialog
        open={Boolean(selected)}
        onClose={closeDialog}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '10px', overflow: 'hidden' } } }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            bgcolor: 'background.default',
            borderBottom: 1,
            borderColor: 'divider',
            py: 2,
          }}
        >
          <Typography variant="h6" component="h2" sx={{ fontWeight: 700, fontSize: '1rem' }}>
            {panel === 'Drone history'
              ? tr(
                  'Chi tiết Hồ sơ Phương tiện Drone (Đã thẩm định)',
                  'Drone Registration Record Details (Reviewed)',
                )
              : tr('Thẩm định hồ sơ Phương tiện Drone', 'Review Compliance Application')}
          </Typography>
          <IconButton size="small" onClick={closeDialog} disabled={pending}>
            <CloseRounded />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          {selected && (
            <Stack spacing={2.5}>
              {'organizationName' in selected ? (
                <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: '10px' }}>
                  <Typography variant="h6" component="h3" sx={{ fontWeight: 700, fontSize: '0.875rem', color: 'text.primary', mb: 1 }}>
                    {tr(
                      'Thông tin Tổ chức & Tài sản đăng ký',
                      'Organization & Registered Asset Information',
                    )}
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
                    <Typography variant="body2">
                      {tr('Tổ chức:', 'Organization:')}{' '}
                      <strong>
                        {selected.organizationName} ({selected.organizationCode})
                      </strong>
                    </Typography>
                    <Typography variant="body2">
                      {tr('Tài sản:', 'Asset:')}{' '}
                      <strong>
                        {selected.assetName} ({selected.assetCode})
                      </strong>
                    </Typography>
                    <Typography variant="body2">
                      {tr('Phân loại vùng bay:', 'Airspace classification:')}{' '}
                      <strong>{selected.airspaceClassification}</strong>
                    </Typography>
                  </Box>
                </Box>
              ) : (
                <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: '10px' }}>
                  <Typography variant="h6" component="h3" sx={{ fontWeight: 700, fontSize: '0.875rem', color: 'text.primary', mb: 1 }}>
                    {tr(
                      'Thông tin Người nộp đơn (Inspector đối tác)',
                      'Applicant Information (Partner Inspector)',
                    )}
                  </Typography>
                  {'inspectorFullName' in selected && (
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
                      <Typography variant="body2">
                        {tr('Họ và tên:', 'Full name:')}{' '}
                        <strong>{selected.inspectorFullName || 'Inspector'}</strong>
                      </Typography>
                      <Typography variant="body2">
                        {tr('Email liên hệ:', 'Contact email:')}{' '}
                        <strong>{selected.inspectorEmail || '—'}</strong>
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}

              {'model' in selected && (
                <Box>
                  <Typography variant="h6" component="h3" sx={{ fontWeight: 700, fontSize: '0.875rem', color: 'text.primary', mb: 0.5 }}>
                    {tr('Thông tin kỹ thuật & Khai báo pháp lý', 'Technical Specifications & Legal Declaration')}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
                    {selected.model}
                  </Typography>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' },
                      gap: 1.5,
                      p: 1.5,
                      bgcolor: 'background.default',
                      borderRadius: '8px',
                      border: 1,
                      borderColor: 'divider',
                    }}
                  >
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {tr('Hãng sản xuất:', 'Manufacturer:')}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {selected.manufacturer || '—'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {tr('Số Serial thân máy:', 'Airframe serial number:')}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                        {selected.serialNumber}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {tr('Số đăng ký cơ quan cấp:', 'Official registration number:')}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {selected.registrationNumber}
                      </Typography>
                    </Box>
                  </Box>

                  {('maxWindResistanceMps' in selected && selected.maxWindResistanceMps != null) ||
                  ('maxAltitudeMeters' in selected && selected.maxAltitudeMeters != null) ||
                  ('hasThermalCamera' in selected && selected.hasThermalCamera) ||
                  ('hasRtk' in selected && selected.hasRtk) ? (
                    <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
                      {'maxWindResistanceMps' in selected && selected.maxWindResistanceMps != null && (
                        <Chip size="small" variant="outlined" label={tr(`Kháng gió: ${selected.maxWindResistanceMps} m/s`, `Wind resistance: ${selected.maxWindResistanceMps} m/s`)} />
                      )}
                      {'maxAltitudeMeters' in selected && selected.maxAltitudeMeters != null && (
                        <Chip size="small" variant="outlined" label={tr(`Trần bay tối đa: ${selected.maxAltitudeMeters} m`, `Declared maximum altitude: ${selected.maxAltitudeMeters} m`)} />
                      )}
                      {'opticalZoomLevel' in selected && selected.opticalZoomLevel && (
                        <Chip size="small" variant="outlined" label={`Zoom: ${selected.opticalZoomLevel}`} />
                      )}
                      {'hasThermalCamera' in selected && selected.hasThermalCamera && (
                        <Chip size="small" color="secondary" label={tr('Camera nhiệt', 'Thermal Camera')} />
                      )}
                      {'hasRtk' in selected && selected.hasRtk && (
                        <Chip size="small" color="primary" label="RTK GNSS" />
                      )}
                    </Box>
                  ) : null}
                </Box>
              )}

              {'model' in selected && (
                <Box>
                  <Typography variant="h6" component="h3" sx={{ fontWeight: 700, fontSize: '0.875rem', color: 'text.primary', mb: 1 }}>
                    {tr('Tài liệu hình ảnh giấy tờ đính kèm', 'Attached Supporting Documents')}
                  </Typography>

                  {evidenceLoading ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 6, gap: 1.5 }}>
                      <CircularProgress size={24} />
                      <Typography variant="body2" color="text.secondary">
                        {tr('Đang tải bản scan tài liệu từ MinIO…', 'Loading scanned documents from storage…')}
                      </Typography>
                    </Box>
                  ) : evidenceDocs.length === 0 ? (
                    <Alert severity="warning">
                      {tr(
                        'Không tìm thấy tài liệu đính kèm cho đơn đăng ký này.',
                        'No supporting documents found for this registration application.',
                      )}
                    </Alert>
                  ) : (
                    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: '10px', overflow: 'hidden' }}>
                      <Tabs
                        value={activeDocIndex}
                        onChange={(_, i: number) => setActiveDocIndex(i)}
                        variant="scrollable"
                        sx={{ bgcolor: 'background.default', borderBottom: 1, borderColor: 'divider' }}
                      >
                        {evidenceDocs.map((doc) => (
                          <Tab
                            key={doc.type}
                            label={doc.label}
                            sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.8125rem' }}
                          />
                        ))}
                      </Tabs>

                      <Box
                        sx={{
                          p: 2,
                          bgcolor: 'background.paper',
                          textAlign: 'center',
                          minHeight: 300,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {activeDoc && (
                          <Box sx={{ width: '100%' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
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
                                      {tr('Phóng to', 'Zoom in')}
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
                                    {tr('Mở tab mới', 'Open in new tab')}
                                  </Button>
                                </Box>
                              )}
                            </Box>

                            {activeDoc.failed ? (
                              <Alert severity="error">
                                {tr(
                                  'Không thể hiển thị tài liệu này từ máy chủ lưu trữ MinIO.',
                                  'Could not display this document from storage.',
                                )}
                              </Alert>
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
                                  border: 1,
                                  borderColor: 'divider',
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
              )}

              {panel !== 'Drone history' && (
                <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: '10px', border: 1, borderColor: 'divider' }}>
                  <Typography variant="h6" component="h3" sx={{ fontWeight: 700, fontSize: '0.875rem', color: 'text.primary', mb: 1 }}>
                    {isAdmin
                      ? tr('Quyết định của Platform Admin', 'Platform Admin Decision')
                      : tr('Quyết định của Platform Manager', 'Platform Manager Decision')}
                  </Typography>

                  <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
                    <Button
                      variant={action === 'approve' ? 'contained' : 'outlined'}
                      color="success"
                      startIcon={<CheckCircleOutlineRounded />}
                      onClick={() => setAction('approve')}
                      sx={{ textTransform: 'none', fontWeight: 650 }}
                    >
                      {tr('Phê duyệt đạt chuẩn', 'Approve application')}
                    </Button>
                    <Button
                      variant={action === 'reject' ? 'contained' : 'outlined'}
                      color="error"
                      startIcon={<HighlightOffRounded />}
                      onClick={() => setAction('reject')}
                      sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                      {tr('Từ chối / Yêu cầu bổ sung', 'Reject / Request changes')}
                    </Button>
                  </Box>

                  {action === 'approve' && panel !== 'Customer airspace' ? (
                    <Alert severity="success">
                      <strong>{tr('Xác nhận phê duyệt:', 'Approval confirmation:')}</strong>{' '}
                      {tr(
                        'Thông số kỹ thuật trùng khớp với hồ sơ đăng ký, sở hữu và kiểm định an toàn hợp lệ.',
                        'Technical specifications match valid registration, ownership, and safety inspection records.',
                      )}
                    </Alert>
                  ) : (
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      label={
                        action === 'approve'
                          ? tr('Ghi chú phê duyệt vùng bay', 'Airspace approval note')
                          : tr('Lý do từ chối / Hướng dẫn bổ sung hồ sơ', 'Rejection reason / Resubmission instructions')
                      }
                      placeholder={
                        action === 'approve'
                          ? tr('Nhập ghi chú xác nhận an toàn vùng bay...', 'Enter airspace compliance verification note...')
                          : tr('Nhập lý do từ chối hoặc yêu cầu bổ sung...', 'Enter rejection reason or required corrections...')
                      }
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
            {tr('Đóng', 'Close')}
          </Button>
          {panel !== 'Drone history' && (
            <Button
              variant="contained"
              color={action === 'approve' ? 'success' : 'error'}
              onClick={() => void review()}
              disabled={pending}
              sx={{ px: 3, fontWeight: 650 }}
            >
              {pending
                ? tr('Đang lưu…', 'Saving…')
                : action === 'approve'
                  ? tr('Xác nhận phê duyệt', 'Confirm approval')
                  : tr('Xác nhận từ chối', 'Confirm rejection')}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* DIALOG: ZOOM SCAN */}
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
