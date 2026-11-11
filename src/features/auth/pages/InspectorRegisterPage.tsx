import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  InputAdornment,
  Paper,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  ArrowBackRounded,
  ArrowForwardRounded,
  CheckCircleRounded,
  VerifiedUserOutlined,
  DeleteOutlined,
  InsertDriveFileOutlined,
  EmailOutlined,
  HelpOutlineRounded,
  CloseRounded,
} from '@mui/icons-material';
import { Link as RouterLink, Navigate } from 'react-router-dom';
import { AuthPageLayout } from '../components/AuthPageLayout';
import { AuthLoadingScreen } from '../components/AuthSessionBootstrapper';
import {
  getAuthErrorMessage,
  sendRegistrationOtp,
} from '../api/authApi';
import { inspectorApplicationApi } from '../api/inspectorApplicationApi';
import { getAuthRedirectTarget } from '../utils/authRedirect';
import { useAuthStore } from '../store/authStore';
import { useQuery } from '@tanstack/react-query';
import { pilotLicenseClassApi } from '../api/pilotLicenseClassApi';

const authInputSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: '#F8FBFA',
    borderRadius: '8px',
    color: '#173B36',
    fontSize: '14px',
    '& fieldset': {
      borderColor: '#D6E4E0',
      transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    },
    '&:hover fieldset': {
      borderColor: '#96BDB5',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#087E8B',
      borderWidth: '1.5px',
      boxShadow: '0 0 0 3px rgba(8, 126, 139, 0.13)',
    },
  },
  '& .MuiInputLabel-root': {
    color: '#5F7872',
    fontSize: '14px',
    '&.Mui-focused': {
      color: '#087E8B',
    },
  },
  '& .MuiInputBase-input': {
    py: '12px',
    fontSize: '14px',
    '&::placeholder': {
      color: '#607972',
      opacity: 1,
    },
  },
};

const STEPS = [
  'Tài khoản',
  'CCCD & Bằng chứng bằng lái',
  'Xác thực OTP & Nộp hồ sơ',
];

export default function InspectorRegisterPage() {
  const status = useAuthStore((state) => state.status);
  const roles = useAuthStore((state) => state.roles);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const licenseClassesQuery = useQuery({
    queryKey: ['pilot-license-classes', 'active'],
    queryFn: pilotLicenseClassApi.listActive,
    staleTime: 60_000,
  });

  const [activeStep, setActiveStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Step 0: Account & Credentials
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 1: Identity, UAV License & Document Scan
  const [citizenId, setCitizenId] = useState('');
  const [address, setAddress] = useState('');
  const [pilotLicenseNumber, setPilotLicenseNumber] = useState('');
  const [pilotLicenseClass, setPilotLicenseClass] = useState('');
  const [pilotLicenseExpiresAt, setPilotLicenseExpiresAt] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [licenseScanFileKey, setLicenseScanFileKey] = useState<string | null>(null);
  const [uploadingScan, setUploadingScan] = useState(false);
  const [helpGuideOpen, setHelpGuideOpen] = useState(false);

  // Step 2: OTP Verification & Submission
  const [otpCode, setOtpCode] = useState('');
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [otpChannel, setOtpChannel] = useState<'EMAIL' | 'SMS'>('EMAIL');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [submittingApplication, setSubmittingApplication] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  if (status === 'checking') {
    return <AuthLoadingScreen />;
  }

  if (status === 'authenticated') {
    const destination = getAuthRedirectTarget(null, roles);
    return <Navigate to={destination} replace />;
  }

  const validateStep0 = (): boolean => {
    setErrorMessage(null);
    if (!fullName.trim()) {
      setErrorMessage('Vui lòng nhập họ và tên đầy đủ của bạn.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMessage('Vui lòng nhập địa chỉ email hợp lệ.');
      return false;
    }
    if (password.length < 8) {
      setErrorMessage('Mật khẩu phải có ít nhất 8 ký tự.');
      return false;
    }
    if (
      !/[A-Z]/.test(password) ||
      !/[0-9]/.test(password) ||
      !/[^A-Za-z0-9]/.test(password)
    ) {
      setErrorMessage(
        'Mật khẩu cần có ít nhất 1 chữ hoa, 1 chữ số và 1 ký tự đặc biệt.',
      );
      return false;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp.');
      return false;
    }
    return true;
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check size limit: 50MB
    if (file.size > 50 * 1024 * 1024) {
      setErrorMessage('Kích thước tệp không được vượt quá 50MB.');
      return;
    }

    setSelectedFile(file);
    setErrorMessage(null);
    setUploadingScan(true);

    try {
      const fileKey = await inspectorApplicationApi.uploadLicenseScan(file);
      setLicenseScanFileKey(fileKey);
    } catch (err) {
      setSelectedFile(null);
      setLicenseScanFileKey(null);
      setErrorMessage(getAuthErrorMessage(err));
    } finally {
      setUploadingScan(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setLicenseScanFileKey(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateStep1 = (): boolean => {
    setErrorMessage(null);
    if (!citizenId.trim() || citizenId.trim().length < 9) {
      setErrorMessage('Vui lòng nhập số CCCD / Hộ chiếu hợp lệ (tối thiểu 9 ký tự).');
      return false;
    }
    if (!pilotLicenseNumber.trim()) {
      setErrorMessage('Vui lòng nhập Số hiệu Bằng lái / Chứng chỉ điều khiển UAV.');
      return false;
    }
    if (!pilotLicenseClass) {
      setErrorMessage('Vui lòng chọn hạng bằng lái UAV.');
      return false;
    }
    if (!licenseScanFileKey) {
      setErrorMessage('Vui lòng tải lên tài liệu / ảnh chụp bằng chứng bằng lái UAV.');
      return false;
    }
    return true;
  };

  const handleProceedToOtp = async () => {
    if (!validateStep1()) return;

    setSendingOtp(true);
    setErrorMessage(null);
    try {
      const channel = phoneNumber.trim() ? otpChannel : 'EMAIL';
      const otpRes = await sendRegistrationOtp({
        email: email.trim(),
        phoneNumber: phoneNumber.trim() || undefined,
        channel,
      });
      setChallengeToken(otpRes.challengeToken);
      setOtpCode('');
      setCountdown(60);
      setActiveStep(2);
    } catch (err) {
      setErrorMessage(getAuthErrorMessage(err));
    } finally {
      setSendingOtp(false);
    }
  };

  const handleResendOtp = async (targetChannel?: 'EMAIL' | 'SMS') => {
    const ch = targetChannel ?? otpChannel;
    setSendingOtp(true);
    setErrorMessage(null);
    try {
      const otpRes = await sendRegistrationOtp({
        email: email.trim(),
        phoneNumber: phoneNumber.trim() || undefined,
        channel: ch,
      });
      setOtpChannel(ch);
      setChallengeToken(otpRes.challengeToken);
      setCountdown(60);
    } catch (err) {
      setErrorMessage(getAuthErrorMessage(err));
    } finally {
      setSendingOtp(false);
    }
  };

  const handleSubmitApplication = async () => {
    if (!challengeToken || otpCode.length !== 6 || !licenseScanFileKey) return;
    setSubmittingApplication(true);
    setErrorMessage(null);
    try {
      await inspectorApplicationApi.submit({
        email: email.trim(),
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim() || undefined,
        password,
        citizenId: citizenId.trim(),
        address: address.trim() || 'Chưa cung cấp',
        pilotLicenseNumber: pilotLicenseNumber.trim(),
        pilotLicenseClass: pilotLicenseClass.trim(),
        pilotLicenseExpiresAt: pilotLicenseExpiresAt
          ? new Date(pilotLicenseExpiresAt).toISOString()
          : undefined,
        licenseScanFileKey,
        otpChallengeToken: challengeToken,
        otpCode: otpCode.trim(),
      });
      setSubmittedSuccess(true);
    } catch (err) {
      setErrorMessage(getAuthErrorMessage(err));
    } finally {
      setSubmittingApplication(false);
    }
  };

  if (submittedSuccess) {
    return (
      <AuthPageLayout
        title="Nộp Hồ sơ Thành công"
        subtitleText="SmartDroneInspection Partner Network"
        backLabel="Quay lại trang chủ"
        backTo="/"
        heroTagline={{
          line1: 'Partner UAV Network,',
          line2: 'Verified & Certified',
        }}
      >
        <Stack spacing={3} sx={{ textAlign: 'center', py: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                bgcolor: '#E6F4F1',
                display: 'grid',
                placeItems: 'center',
                color: '#087E8B',
              }}
            >
              <CheckCircleRounded sx={{ fontSize: 44 }} />
            </Box>
          </Box>

          <Stack spacing={1}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#173B36' }}>
              Hồ sơ của bạn đã được gửi tới Manager xét duyệt!
            </Typography>
            <Typography variant="body2" sx={{ color: '#4B6B64', lineHeight: 1.6 }}>
              Chúng tôi đã gửi email xác nhận đã nhận hồ sơ tới <strong>{email}</strong>.
              Người quản lý (Manager) sẽ xem xét thông tin bằng lái và chứng chỉ của bạn.
            </Typography>
          </Stack>

          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: '10px',
              bgcolor: '#F8FBFA',
              borderColor: '#D6E4E0',
              textAlign: 'left',
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#173B36', mb: 1 }}>
              Quy trình tiếp theo:
            </Typography>
            <Typography variant="body2" sx={{ color: '#4B6B64', fontSize: '13px', mb: 0.75 }}>
              1. <strong>Xét duyệt hồ sơ:</strong> Manager xem xét thông tin và bằng chứng bằng lái bạn đã nộp.
            </Typography>
            <Typography variant="body2" sx={{ color: '#4B6B64', fontSize: '13px', mb: 0.75 }}>
              2. <strong>Thông báo qua Email:</strong> Kết quả (Đồng ý hoặc Từ chối kèm lý do) sẽ được gửi qua email.
            </Typography>
            <Typography variant="body2" sx={{ color: '#4B6B64', fontSize: '13px' }}>
              3. <strong>Ký hợp đồng trực tiếp:</strong> Sau khi được chấp thuận, bạn và Manager sẽ gặp mặt trực tiếp để ký hợp đồng hợp tác và kích hoạt tài khoản.
            </Typography>
          </Paper>

          <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'center' }}>
            <Button
              component={RouterLink}
              to="/"
              variant="outlined"
              sx={{
                minHeight: 42,
                borderRadius: '8px',
                borderColor: '#96BDB5',
                color: '#173B36',
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              Về trang chủ
            </Button>
            <Button
              component={RouterLink}
              to="/login"
              variant="contained"
              sx={{
                minHeight: 42,
                borderRadius: '8px',
                bgcolor: '#087E8B',
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': { bgcolor: '#066B70' },
              }}
            >
              Đến trang Đăng nhập
            </Button>
          </Stack>
        </Stack>
      </AuthPageLayout>
    );
  }

  return (
    <AuthPageLayout
      title="Đăng ký Đối tác Phi công"
      subtitleText="Bạn là Khách hàng Doanh nghiệp?"
      subtitleLinkText="Đăng ký tài khoản Customer"
      subtitleLinkTo="/register"
      backLabel="Quay lại trang chủ"
      backTo="/"
      socialPrompt="Hoặc đăng nhập nếu đã có tài khoản"
      heroTagline={{
        line1: 'Partner UAV Network,',
        line2: 'Verified & Certified',
      }}
    >
      <Stack spacing={2.25}>
        {/* STEPPER HEADER */}
        <Stepper
          activeStep={activeStep}
          alternativeLabel
          sx={{
            pt: 0.5,
            pb: 0.5,
            '& .MuiStepLabel-label': {
              fontSize: '11.5px',
              fontWeight: 600,
              mt: '4px !important',
            },
            '& .MuiStepIcon-root.Mui-active': { color: '#087E8B' },
            '& .MuiStepIcon-root.Mui-completed': { color: '#10b981' },
          }}
        >
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* ===================== STEP 0: THÔNG TIN TÀI KHOẢN ===================== */}
        {activeStep === 0 && (
          <Stack spacing={1.75}>
            <TextField
              label="Họ và tên đầy đủ *"
              placeholder="Nguyễn Văn Bay"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              fullWidth
              sx={authInputSx}
            />

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
              <TextField
                label="Email đăng ký *"
                placeholder="pilot@gmail.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                sx={authInputSx}
              />
              <TextField
                label="Số điện thoại"
                placeholder="0912345678"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                fullWidth
                sx={authInputSx}
              />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
              <TextField
                label="Mật khẩu *"
                placeholder="••••••••••••"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
                sx={authInputSx}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          edge="end"
                          sx={{ color: '#758984' }}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <TextField
                label="Xác nhận mật khẩu *"
                placeholder="••••••••••••"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                fullWidth
                sx={authInputSx}
              />
            </Box>

            {errorMessage && (
              <Alert severity="error" sx={{ borderRadius: 2, py: 0.5 }}>
                {errorMessage}
              </Alert>
            )}

            <Button
              type="button"
              variant="contained"
              size="large"
              endIcon={<ArrowForwardRounded />}
              onClick={() => {
                if (validateStep0()) setActiveStep(1);
              }}
              sx={{
                minHeight: 46,
                borderRadius: '8px',
                bgcolor: '#087E8B',
                fontSize: '14.5px',
                fontWeight: 600,
                textTransform: 'none',
                '&:hover': { bgcolor: '#066B70' },
              }}
            >
              Tiếp tục
            </Button>
          </Stack>
        )}

        {/* ===================== STEP 1: CCCD, BẰNG LÁI & TẢI ẢNH BẰNG CHỨNG ===================== */}
        {activeStep === 1 && (
          <Stack spacing={1.75}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
              <TextField
                label="Số CCCD / Hộ chiếu *"
                placeholder="001098012345"
                value={citizenId}
                onChange={(e) => setCitizenId(e.target.value)}
                fullWidth
                sx={authInputSx}
              />
              <TextField
                label="Số Giấy phép / Bằng lái UAV *"
                placeholder="VD: DC-2026-0012845"
                value={pilotLicenseNumber}
                onChange={(e) => setPilotLicenseNumber(e.target.value)}
                fullWidth
                sx={authInputSx}
              />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
              <FormControl fullWidth sx={authInputSx}>
                <InputLabel id="pilot-license-class-label">Hạng bằng lái UAV *</InputLabel>
                <Select
                  labelId="pilot-license-class-label"
                  label="Hạng bằng lái UAV *"
                  value={pilotLicenseClass}
                  onChange={(event) => setPilotLicenseClass(event.target.value)}
                  disabled={licenseClassesQuery.isLoading || licenseClassesQuery.isError}
                >
                  <MenuItem value=""><em>Chọn hạng bằng lái</em></MenuItem>
                  {licenseClassesQuery.data?.map((licenseClass) => (
                    <MenuItem key={licenseClass.id} value={licenseClass.name}>
                      {licenseClass.name}
                    </MenuItem>
                  ))}
                </Select>
                {licenseClassesQuery.isLoading && <CircularProgress size={16} sx={{ position: 'absolute', right: 36, top: 18 }} />}
              </FormControl>
              <TextField
                type="date"
                label="Ngày hết hạn bằng lái"
                slotProps={{ inputLabel: { shrink: true } }}
                value={pilotLicenseExpiresAt}
                onChange={(e) => setPilotLicenseExpiresAt(e.target.value)}
                fullWidth
                sx={authInputSx}
              />
            </Box>

            <TextField
              label="Địa chỉ thường trú / Khu vực hoạt động"
              placeholder="Quận Cầu Giấy, Hà Nội"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              fullWidth
              sx={authInputSx}
            />

            {/* BẰNG CHỨNG BẰNG LÁI VÀ CHỨNG CHỈ */}
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: '8px',
                bgcolor: licenseScanFileKey ? '#F0FDF4' : '#F8FBFA',
                borderColor: licenseScanFileKey ? '#86EFAC' : '#D6E4E0',
                borderStyle: licenseScanFileKey ? 'solid' : 'dashed',
              }}
            >
              {!selectedFile ? (
                <Stack spacing={1.5} sx={{ py: 0.5 }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '14px', color: '#173B36' }}>
                      Tải lên Hồ sơ &amp; Bằng chứng giấy tờ *
                    </Typography>

                    <Tooltip title="Xem hướng dẫn chi tiết về hồ sơ cần nộp" arrow>
                      <IconButton
                        size="small"
                        onClick={() => setHelpGuideOpen(true)}
                        sx={{
                          color: '#087E8B',
                          p: 0.5,
                          '&:hover': { bgcolor: 'rgba(8, 126, 139, 0.08)' },
                        }}
                        aria-label="Hướng dẫn chuẩn bị hồ sơ"
                      >
                        <HelpOutlineRounded sx={{ fontSize: 20 }} />
                      </IconButton>
                    </Tooltip>
                  </Stack>

                  {/* Clean, styled custom button using label wrapper */}
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', pt: 0.5 }}>
                    <Box
                      component="label"
                      htmlFor="pilot-license-file-input"
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        px: 2.5,
                        py: 1,
                        bgcolor: '#087E8B',
                        color: '#FFFFFF',
                        borderRadius: '6px',
                        fontSize: '13.5px',
                        fontWeight: 600,
                        cursor: uploadingScan ? 'not-allowed' : 'pointer',
                        transition: 'background-color 0.2s ease',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                        '&:hover': {
                          bgcolor: '#066B70',
                        },
                      }}
                    >
                      {uploadingScan ? 'Đang tải lên MinIO…' : 'Chọn tệp tải lên'}
                      <input
                        id="pilot-license-file-input"
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.webp"
                        disabled={uploadingScan}
                        onChange={(e) => void handleFileChange(e)}
                        style={{ display: 'none' }}
                      />
                    </Box>

                    {uploadingScan ? (
                      <CircularProgress size={20} sx={{ color: '#087E8B' }} />
                    ) : (
                      <Typography sx={{ fontSize: '12.5px', color: '#64748B' }}>
                        Chưa có tệp nào được chọn
                      </Typography>
                    )}
                  </Stack>

                  <Typography sx={{ fontSize: '11.5px', color: '#64748B' }}>
                    Hỗ trợ định dạng PDF, JPG, PNG hoặc WEBP (tối đa 50MB). Bấm vào dấu chấm hỏi (?) ở góc phải để xem tài liệu cần nộp.
                  </Typography>
                </Stack>
              ) : (
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                  <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', overflow: 'hidden' }}>
                    <InsertDriveFileOutlined sx={{ color: '#16A34A', fontSize: 26 }} />
                    <Box sx={{ overflow: 'hidden' }}>
                      <Typography
                        sx={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#15803D',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                        }}
                      >
                        {selectedFile.name}
                      </Typography>
                      <Typography sx={{ fontSize: '11px', color: '#65A30D' }}>
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Đã tải lên MinIO an toàn
                      </Typography>
                    </Box>
                  </Stack>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={handleRemoveFile}
                    title="Xóa tệp và chọn lại"
                  >
                    <DeleteOutlined fontSize="small" />
                  </IconButton>
                </Stack>
              )}
            </Paper>

            {licenseClassesQuery.isError && (
              <Alert severity="error" sx={{ borderRadius: 2, py: 0.5 }}>
                Không thể tải danh mục hạng bằng lái. Vui lòng tải lại trang.
              </Alert>
            )}
            {errorMessage && (
              <Alert severity="error" sx={{ borderRadius: 2, py: 0.5 }}>
                {errorMessage}
              </Alert>
            )}

            <Stack direction="row" spacing={1.5}>
              <Button
                type="button"
                variant="outlined"
                startIcon={<ArrowBackRounded />}
                onClick={() => {
                  setErrorMessage(null);
                  setActiveStep(0);
                }}
                sx={{
                  minHeight: 44,
                  borderRadius: '8px',
                  borderColor: '#96BDB5',
                  color: '#173B36',
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                Quay lại
              </Button>
              <Button
                type="button"
                variant="contained"
                endIcon={sendingOtp ? <CircularProgress size={16} color="inherit" /> : <VerifiedUserOutlined />}
                disabled={sendingOtp || uploadingScan || licenseClassesQuery.isLoading || licenseClassesQuery.isError}
                onClick={() => void handleProceedToOtp()}
                sx={{
                  flex: 1,
                  minHeight: 44,
                  borderRadius: '8px',
                  bgcolor: '#087E8B',
                  fontSize: '14.5px',
                  fontWeight: 600,
                  textTransform: 'none',
                  '&:hover': { bgcolor: '#066B70' },
                }}
              >
                {sendingOtp ? 'Đang gửi mã OTP…' : 'Tiếp tục'}
              </Button>
            </Stack>
          </Stack>
        )}

        {/* ===================== STEP 2: XÁC THỰC OTP & NỘP HỒ SƠ ===================== */}
        {activeStep === 2 && (
          <Stack spacing={2}>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: '10px',
                bgcolor: '#F8FBFA',
                borderColor: '#D6E4E0',
              }}
            >
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
                <EmailOutlined sx={{ color: '#087E8B', fontSize: 20 }} />
                <Typography sx={{ fontWeight: 700, fontSize: '14px', color: '#173B36' }}>
                  Xác thực danh tính &amp; Nộp hồ sơ chờ Manager duyệt
                </Typography>
              </Stack>
              <Typography sx={{ fontSize: '12.5px', color: '#4B6B64', mb: 1 }}>
                Mã OTP đã được gửi đến địa chỉ <strong>{email}</strong>. Vui lòng nhập mã để hoàn tất gửi đơn đăng ký đối tác phi công.
              </Typography>
            </Paper>

            {phoneNumber.trim() && (
              <Stack direction="row" spacing={1}>
                <Chip
                  label="Nhận qua Email"
                  clickable
                  color={otpChannel === 'EMAIL' ? 'primary' : 'default'}
                  onClick={() => void handleResendOtp('EMAIL')}
                />
                <Chip
                  label="Nhận qua SMS"
                  clickable
                  color={otpChannel === 'SMS' ? 'primary' : 'default'}
                  onClick={() => void handleResendOtp('SMS')}
                />
              </Stack>
            )}

            <TextField
              autoFocus
              label="Nhập mã OTP (6 chữ số)"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              slotProps={{
                htmlInput: {
                  maxLength: 6,
                  style: {
                    textAlign: 'center',
                    letterSpacing: '8px',
                    fontSize: '22px',
                    fontWeight: 'bold',
                  },
                },
              }}
              fullWidth
              required
              sx={authInputSx}
            />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                {countdown > 0 ? `Gửi lại mã sau ${countdown}s` : 'Bạn chưa nhận được mã?'}
              </Typography>
              <Button
                size="small"
                disabled={countdown > 0 || sendingOtp}
                onClick={() => void handleResendOtp()}
                sx={{ textTransform: 'none', fontWeight: 600, color: '#087E8B' }}
              >
                Gửi lại mã OTP
              </Button>
            </Box>

            {errorMessage && (
              <Alert severity="error" sx={{ borderRadius: 2, py: 0.5 }}>
                {errorMessage}
              </Alert>
            )}

            <Stack direction="row" spacing={1.5}>
              <Button
                type="button"
                variant="outlined"
                startIcon={<ArrowBackRounded />}
                onClick={() => {
                  setErrorMessage(null);
                  setActiveStep(1);
                }}
                disabled={submittingApplication}
                sx={{
                  minHeight: 44,
                  borderRadius: '8px',
                  borderColor: '#96BDB5',
                  color: '#173B36',
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                Quay lại
              </Button>
              <Button
                type="button"
                variant="contained"
                startIcon={submittingApplication ? <CircularProgress size={16} color="inherit" /> : <CheckCircleRounded />}
                disabled={otpCode.length !== 6 || submittingApplication}
                onClick={() => void handleSubmitApplication()}
                sx={{
                  flex: 1,
                  minHeight: 44,
                  borderRadius: '8px',
                  bgcolor: '#087E8B',
                  fontSize: '14.5px',
                  fontWeight: 600,
                  textTransform: 'none',
                  '&:hover': { bgcolor: '#066B70' },
                }}
              >
                {submittingApplication ? 'Đang gửi hồ sơ…' : 'Xác thực & Nộp hồ sơ xét duyệt'}
              </Button>
            </Stack>
          </Stack>
        )}

        <Box sx={{ textAlign: 'center', pt: 0.5 }}>
          <Typography variant="caption" sx={{ color: '#5F7872' }}>
            Đã có tài khoản đối tác?{' '}
            <RouterLink
              to="/login"
              style={{ color: '#087E8B', fontWeight: 700, textDecoration: 'none' }}
            >
              Đăng nhập ngay
            </RouterLink>
          </Typography>
        </Box>
      </Stack>

      {/* POPUP HƯỚNG DẪN CHUẨN BỊ HỒ SƠ */}
      <Dialog
        open={helpGuideOpen}
        onClose={() => setHelpGuideOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '12px',
              p: 1,
            },
          },
        }}
      >
        <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#173B36', fontSize: '16px' }}>
            Hướng dẫn chuẩn bị Hồ sơ &amp; Bằng chứng giấy tờ
          </Typography>
          <IconButton
            aria-label="Đóng"
            onClick={() => setHelpGuideOpen(false)}
            sx={{ color: '#64748B' }}
            size="small"
          >
            <CloseRounded />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 2.5 }}>
          <Stack spacing={2}>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: '13.5px', color: '#0F766E', mb: 0.75 }}>
                1. Giấy phép điều khiển UAV (Bắt buộc)
              </Typography>
              <Typography sx={{ fontSize: '13px', color: '#334155', lineHeight: 1.6 }}>
                • Chụp rõ nét cả <strong>mặt trước</strong> và <strong>mặt sau</strong> của Giấy phép điều khiển phương tiện bay do cơ quan có thẩm quyền của Nhà nước Việt Nam cấp.<br />
                • Đảm bảo thấy rõ: Số giấy phép (VD: <em>DC-YYYY-XXXXXXX</em>), Hạng bằng (Hạng A hoặc Hạng B), ngày cấp và ngày hết hạn.<br />
                • Ảnh chụp không bị lóa sáng, mất góc hoặc nhòe mờ thông tin.
              </Typography>
            </Box>

            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: '13.5px', color: '#0F766E', mb: 0.75 }}>
                2. Căn cước công dân / Hộ chiếu (Bắt buộc)
              </Typography>
              <Typography sx={{ fontSize: '13px', color: '#334155', lineHeight: 1.6 }}>
                • Chụp ảnh CCCD 2 mặt hoặc trang thông tin Hộ chiếu còn hiệu lực để Manager đối chiếu trùng khớp họ tên, ngày sinh và số định danh cá nhân với giấy phép bay.
              </Typography>
            </Box>

            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: '13.5px', color: '#0F766E', mb: 0.75 }}>
                3. Định dạng và Dung lượng tệp
              </Typography>
              <Typography sx={{ fontSize: '13px', color: '#334155', lineHeight: 1.6 }}>
                • Hỗ trợ định dạng: <strong>PDF, JPG, PNG, WEBP</strong>.<br />
                • Dung lượng tối đa: <strong>50MB</strong>.<br />
                • <strong>Khuyên dùng:</strong> Quét (scan) hoặc gộp toàn bộ ảnh CCCD và Giấy phép bay thành <strong>1 file PDF</strong> nhiều trang để nộp nhanh chóng và lưu trữ đẹp nhất.
              </Typography>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setHelpGuideOpen(false)}
            variant="contained"
            sx={{
              borderRadius: '6px',
              bgcolor: '#087E8B',
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              '&:hover': { bgcolor: '#066B70' },
            }}
          >
            Đã hiểu
          </Button>
        </DialogActions>
      </Dialog>
    </AuthPageLayout>
  );
}
