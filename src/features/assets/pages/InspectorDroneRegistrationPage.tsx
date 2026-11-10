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
  titleVi: string;
  titleEn: string;
  descriptionVi: string;
  descriptionEn: string;
}> = [
  {
    type: 'REGISTRATION',
    titleVi: 'Ảnh Giấy chứng nhận đăng ký drone',
    titleEn: 'Drone Registration Certificate',
    descriptionVi: 'Chụp rõ nét giấy chứng nhận đăng ký do cơ quan chức năng cấp, thể hiện rõ số hiệu.',
    descriptionEn: 'Clear scan or photo of the official UAV registration certificate showing the registration number.',
  },
  {
    type: 'OWNERSHIP',
    titleVi: 'Ảnh Giấy tờ sở hữu / Hóa đơn tài chính',
    titleEn: 'Proof of Ownership / Commercial Invoice',
    descriptionVi: 'Hóa đơn VAT, tờ khai hải quan nhập khẩu hoặc văn bản chuyển nhượng quyền sở hữu hợp pháp.',
    descriptionEn: 'VAT invoice, customs declaration, or legal transfer of ownership document.',
  },
  {
    type: 'INSPECTION',
    titleVi: 'Ảnh Giấy kiểm định / Chứng nhận an toàn kỹ thuật',
    titleEn: 'Technical Safety & Airworthiness Certificate',
    descriptionVi: 'Biên bản kiểm định định kỳ hoặc Giấy chứng nhận chất lượng xuất xưởng (CoC/CoA) còn hạn.',
    descriptionEn: 'Valid periodic airworthiness inspection report or Certificate of Conformity (CoC/CoA).',
  },
];

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
        if (!file) {
          throw new Error(
            locale === 'vi'
              ? `Vui lòng tải lên ${type.toLowerCase()}.`
              : `Please upload ${type.toLowerCase()} document.`,
          );
        }
        return uploadDroneEvidence(file, type);
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

      return mf1DroneApi.submit(input);
    },
    onSuccess: async () => {
      setForm(initialForm);
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

  const handleOpenRegister = (initialData?: Partial<DroneFormState>) => {
    if (initialData) {
      setForm((prev) => ({ ...prev, ...initialData }));
    } else {
      setForm(initialForm);
    }
    setOpenRegisterDialog(true);
  };

  const allDocumentsUploaded = Boolean(files.REGISTRATION && files.OWNERSHIP && files.INSPECTION);

  return (
    <Box className="workspace-page">
      <PageHeader
        title={tr('Drone của tôi', 'My Drones')}
        subtitle={tr(
          'Quản lý danh sách thiết bị bay của bạn đã được duyệt và theo dõi các hồ sơ đăng ký đang chờ phê duyệt.',
          'Manage your approved inspection drones and track pending registration applications.',
        )}
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
              {applications.isFetching || drones.isFetching
                ? tr('Đang làm mới…', 'Refreshing…')
                : tr('Làm mới', 'Refresh')}
            </Button>
            <Button
              variant="contained"
              size="medium"
              startIcon={<AddCircleOutlineRounded />}
              onClick={() => handleOpenRegister()}
              sx={{
                borderRadius: '8px',
                px: 2.5,
                bgcolor: 'primary.main',
                fontWeight: 600,
                textTransform: 'none',
                boxShadow: 'none',
                '&:hover': { bgcolor: 'primary.dark' },
              }}
            >
              {tr('Đăng ký Drone mới', 'Register New Drone')}
            </Button>
          </Stack>
        }
      />

      {/* KPI METRICS OVERVIEW */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2, mt: 2 }}>
        <MetricCard
          label={tr('Drone sẵn sàng bay', 'Flight-ready Drones')}
          value={approvedDrones.length.toString()}
          subtext={tr('Đã thẩm định hồ sơ kỹ thuật', 'Verified technical documentation')}
          iconType="flight"
          positive={approvedDrones.length > 0}
        />
        <MetricCard
          label={tr('Hồ sơ đang chờ duyệt', 'Pending Applications')}
          value={pendingCount.toString()}
          subtext={tr('Manager đang xác minh', 'Under Manager verification')}
          iconType="access-time"
          positive={pendingCount === 0}
        />
        <MetricCard
          label={tr('Tổng hồ sơ đã gửi', 'Total Applications')}
          value={applicationList.length.toString()}
          subtext={tr('Lịch sử đăng ký', 'Registration history')}
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
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
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
                              <Typography sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.875rem' }}>
                                {new Date(drone.registrationExpiresAt).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US')}
                              </Typography>
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
                            handleOpenRegister({
                              droneName: drone.model?.split('[')[0]?.trim() || '',
                              manufacturer: drone.manufacturer || '',
                              serialNumber: drone.serialNumber || '',
                              registrationNumber: drone.registrationNumber || '',
                            });
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
                              handleOpenRegister({
                                droneName: app.model?.split('[')[0]?.trim() || '',
                                manufacturer: app.manufacturer || '',
                                serialNumber: app.serialNumber || '',
                                registrationNumber: app.registrationNumber || '',
                              });
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

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <TextField
                  required
                  label={tr('Tên Drone / Model', 'Drone Model')}
                  placeholder={tr('VD: DJI Matrice 350 RTK, Autel EVO Max 4T', 'e.g. DJI Matrice 350 RTK, Autel EVO Max 4T')}
                  value={form.droneName}
                  onChange={updateField('droneName')}
                  helperText={tr('Tên thương mại đầy đủ của thiết bị', 'Full commercial model designation')}
                />
                <TextField
                  required
                  label={tr('Hãng sản xuất', 'Manufacturer')}
                  placeholder={tr('VD: DJI, Autel Robotics, Skydio', 'e.g. DJI, Autel Robotics, Skydio')}
                  value={form.manufacturer}
                  onChange={updateField('manufacturer')}
                />
                <TextField
                  required
                  label={tr('Số Serial thân máy (Serial number)', 'Airframe Serial Number')}
                  placeholder={tr('VD: 1581F4B0C2301001', 'e.g. 1581F4B0C2301001')}
                  value={form.serialNumber}
                  onChange={updateField('serialNumber')}
                  helperText={tr(
                    'Mã số duy nhất in trên tem thân máy (phải khớp giấy tờ)',
                    'Unique airframe serial number (must match official documents)',
                  )}
                />
                <TextField
                  required
                  label={tr('Số đăng ký phương tiện bay', 'UAV Registration Number')}
                  placeholder={tr('VD: VN-UAV-2026-0889', 'e.g. VN-UAV-2026-0889')}
                  value={form.registrationNumber}
                  onChange={updateField('registrationNumber')}
                  helperText={tr(
                    'Số đăng ký do cơ quan có thẩm quyền cấp',
                    'Registration number issued by the civil aviation / defense authority',
                  )}
                />
                <TextField
                  required
                  type="date"
                  label={tr('Ngày hết hạn đăng ký / kiểm định', 'Registration / Airworthiness Expiry Date')}
                  value={form.registrationExpiresAt}
                  onChange={updateField('registrationExpiresAt')}
                  slotProps={{ inputLabel: { shrink: true } }}
                  helperText={tr(
                    'Thiết bị phải còn hạn đăng ký để được duyệt',
                    'Registration must be valid at the time of review',
                  )}
                />
                <TextField
                  label={tr('Trọng lượng cất cánh tối đa (MTOW)', 'Max Takeoff Weight (MTOW)')}
                  placeholder={tr('VD: 6.47 kg', 'e.g. 6.47 kg')}
                  value={form.mtowKg}
                  onChange={updateField('mtowKg')}
                />
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
                {REQUIRED_DOCUMENTS.map((doc) => {
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
