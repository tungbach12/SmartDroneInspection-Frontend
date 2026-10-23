import {
  CloseRounded,
  PrintRounded,
  SecurityRounded,
  VerifiedRounded,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import type { Subscription } from '../api/subscriptionApi';

interface ContractDocumentModalProps {
  open: boolean;
  onClose: () => void;
  subscription: Subscription | null;
}

export default function ContractDocumentModal({
  open,
  onClose,
  subscription,
}: ContractDocumentModalProps) {
  if (!subscription) return null;

  const snapshot = subscription.termsSnapshot;

  const handlePrint = () => {
    window.print();
  };

  const requestedPrice = snapshot?.proposedPriceUsd ?? null;
  const approvedPrice = subscription.agreedAmountUsd ?? null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      sx={{
        '& @media print': {
          position: 'static',
          zIndex: 'auto',
        },
      }}
    >
      <DialogTitle
        sx={{
          bgcolor: '#0f172a',
          color: '#ffffff',
          py: 2,
          px: 3,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          '@media print': { display: 'none' },
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <VerifiedRounded sx={{ color: '#0A968A' }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Subscription Order & Contract Terms Preview
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            size="small"
            startIcon={<PrintRounded />}
            onClick={handlePrint}
            sx={{
              bgcolor: '#0A968A',
              color: '#ffffff',
              fontWeight: 700,
              textTransform: 'none',
              '&:hover': { bgcolor: '#087a70' },
            }}
          >
            Print / Save as PDF
          </Button>
          <Button
            size="small"
            onClick={onClose}
            sx={{ color: '#94a3b8', minWidth: 36, p: 0.5 }}
          >
            <CloseRounded />
          </Button>
        </Stack>
      </DialogTitle>

      <DialogContent
        sx={{
          p: { xs: 2.5, sm: 4 },
          bgcolor: '#f8fafc',
          '@media print': { p: 0, bgcolor: '#ffffff' },
        }}
      >
        {/* Printable Contract Container */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 5 },
            bgcolor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            fontFamily: 'serif',
            color: '#0f172a',
            '@media print': {
              border: 'none',
              p: 0,
              boxShadow: 'none',
            },
          }}
        >
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 4, pb: 3, borderBottom: '2px solid #0f172a' }}>
            <Typography
              variant="overline"
              sx={{ letterSpacing: '0.15em', fontWeight: 800, color: '#0A968A', fontSize: '0.85rem' }}
            >
              SMARTDRONEINSPECTION INFRASTRUCTURE PLATFORM
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 900, textTransform: 'uppercase', mt: 1, letterSpacing: '0.02em' }}>
              ENTERPRISE SUBSCRIPTION ORDER SUMMARY
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#475467', mt: 0.5 }}>
              TÓM TẮT ĐƠN ĐĂNG KÝ VÀ ĐIỀU KHOẢN DỊCH VỤ DOANH NGHIỆP
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mt: 1, fontFamily: 'monospace' }}>
              Subscription ID: <strong>{subscription.id}</strong>
            </Typography>
            <Alert severity="warning" sx={{ mt: 2, textAlign: 'left' }}>
              Draft for legal review. This application-generated summary is not a certified
              electronic signature or a legal opinion.
            </Alert>
          </Box>

          {/* Section 1: The Parties */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, textTransform: 'uppercase', color: '#0f172a', mb: 1.5, pb: 0.5, borderBottom: '1px solid #cbd5e1' }}>
              1. CÁC BÊN GIAO KẾT HỢP ĐỒNG (THE PARTIES)
            </Typography>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f8fafc', height: '100%' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0A968A', mb: 1 }}>
                    BÊN A (BÊN CUNG CẤP DỊCH VỤ / PLATFORM PROVIDER):
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Smart Drone Inspection Platform Inc.
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', color: '#475467', mt: 0.5 }}>
                    <strong>Đại diện pháp luật:</strong> Platform Executive Administration
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', color: '#475467' }}>
                    <strong>Tài khoản thanh toán:</strong> JPMorgan Chase Bank, N.A. (SWIFT: CHASUS33XXX)
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', color: '#475467' }}>
                    <strong>Mức độ sẵn sàng:</strong> Theo SLA được hai bên phê duyệt (nếu có)
                  </Typography>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f8fafc', height: '100%' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0A968A', mb: 1 }}>
                    BÊN B (BÊN SỬ DỤNG DỊCH VỤ / CUSTOMER ORGANIZATION):
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {subscription.organizationName}
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', color: '#475467', mt: 0.5 }}>
                    <strong>Mã tổ chức (Org ID):</strong> <code>{subscription.organizationId}</code>
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', color: '#475467' }}>
                    <strong>Người gửi yêu cầu:</strong> {snapshot?.agreedByFullName || 'Organization Admin'}
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', color: '#475467' }}>
                    <strong>Email giao dịch:</strong> {snapshot?.agreedByUserEmail || 'N/A'}
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', color: '#475467' }}>
                    <strong>Thời điểm gửi yêu cầu:</strong> {snapshot?.agreedAt ? new Date(snapshot.agreedAt).toLocaleString() : 'N/A'}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Box>

          {/* Section 2: Scope & Operational Boundaries */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, textTransform: 'uppercase', color: '#0f172a', mb: 1, pb: 0.5, borderBottom: '1px solid #cbd5e1' }}>
              2. PHẠM VI DỊCH VỤ & MIỄN TRỪ TRÁCH NHIỆM BAY (SERVICE SCOPE & DISCLAIMER)
            </Typography>
            <Typography variant="body2" sx={{ color: '#334155', mb: 1, lineHeight: 1.6 }}>
              Bên A cấp cho Bên B quyền truy cập và sử dụng có thời hạn đối với Nền tảng Quản trị Kiểm tra Hạ tầng bằng Drone (SmartDroneInspection SaaS Platform) phục vụ toàn bộ chu trình quản lý tài sản, lập kế hoạch bay, thu thập bằng chứng, phân tích khiếm khuyết AI và chuyển tiếp đơn hàng bảo trì sửa chữa.
            </Typography>
            <Alert
              severity="warning"
              icon={<SecurityRounded sx={{ color: '#b45309' }} />}
              sx={{
                bgcolor: '#fffbeb',
                border: '1px solid #fef3c7',
                color: '#92400e',
                borderRadius: '8px',
                '& .MuiAlert-message': { fontSize: '0.85rem', lineHeight: 1.5 },
              }}
            >
              <strong>Aviation & Airspace Operational Responsibility:</strong> Căn cứ Luật Hàng không Dân dụng và Luật Phòng không nhân dân 2024, phần mềm chỉ hỗ trợ số hóa và kiểm tra điều kiện an toàn bay trên dữ liệu. Bên B hoàn toàn tự chịu trách nhiệm pháp lý về việc xin phép bay, chứng chỉ phi công điều khiển phương tiện bay không người lái (UAV) và an toàn vùng trời.
            </Alert>
          </Box>

          {/* Section 3: Commercial Terms & Pricing */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, textTransform: 'uppercase', color: '#0f172a', mb: 1, pb: 0.5, borderBottom: '1px solid #cbd5e1' }}>
              3. ĐIỀU KHOẢN THƯƠNG MẠI & GIÁ TRỊ HỢP ĐỒNG (COMMERCIAL TERMS & VALUATION)
            </Typography>
            <Box
              sx={{
                p: 2.5,
                bgcolor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}
            >
              <Grid container spacing={2}>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                    GÓI DỊCH VỤ
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                    {subscription.planCode}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                    THỜI HẠN THUÊ BAO
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                    {subscription.billingPeriodMonths} Tháng
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                    NGÀY HIỆU LỰC
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                    {subscription.startsAt ? new Date(subscription.startsAt).toLocaleDateString() : 'Chờ kích hoạt'}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                    NGÀY HẾT HẠN
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                    {subscription.endsAt ? new Date(subscription.endsAt).toLocaleDateString() : 'Chờ kích hoạt'}
                  </Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                sx={{
                  justifyContent: 'space-between',
                  alignItems: { xs: 'flex-start', sm: 'center' },
                }}
              >
                <Box>
                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                    GIÁ NIÊM YẾT CHUẨN: ${(snapshot?.standardTotalPriceUsd ?? 0).toLocaleString()} USD
                  </Typography>
                  {requestedPrice !== null && (
                    <Typography variant="caption" sx={{ color: '#b45309', display: 'block', fontWeight: 700 }}>
                      GIÁ KHÁCH HÀNG ĐỀ XUẤT (CHƯA ĐƯỢC PHÊ DUYỆT): ${requestedPrice.toLocaleString()} USD
                    </Typography>
                  )}
                  {snapshot?.negotiationNotes && (
                    <Typography variant="caption" sx={{ color: '#475467', display: 'block', fontStyle: 'italic', mt: 0.5 }}>
                      "Ghi chú thỏa thuận: {snapshot.negotiationNotes}"
                    </Typography>
                  )}
                </Box>
                <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>
                    {approvedPrice !== null ? 'GIÁ TRỊ ĐƯỢC NỀN TẢNG PHÊ DUYỆT' : 'GIÁ TRỊ HỢP ĐỒNG CHỜ PHÊ DUYỆT'}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: approvedPrice !== null ? '#0A968A' : '#b45309' }}>
                    {approvedPrice !== null ? `$${approvedPrice.toLocaleString()} USD` : 'Pending price approval'}
                  </Typography>
                  <Chip
                    size="small"
                    label={subscription.status}
                    color={subscription.status === 'ACTIVE' ? 'success' : 'warning'}
                    sx={{ fontWeight: 700, mt: 0.5 }}
                  />
                </Box>
              </Stack>
            </Box>
          </Box>

          {/* Section 4: Clauses from Snapshot */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, textTransform: 'uppercase', color: '#0f172a', mb: 1.5, pb: 0.5, borderBottom: '1px solid #cbd5e1' }}>
              4. CÁC ĐIỀU KHOẢN BỔ SUNG & BẢO MẬT DỮ LIỆU (GENERAL TERMS & DATA SOVEREIGNTY)
            </Typography>
            <Stack spacing={1.5}>
              {snapshot?.clauses?.map((c, index) => (
                <Box key={c.id}>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                    4.{index + 1}. {c.title}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#475467', lineHeight: 1.5, display: 'block', mt: 0.5 }}>
                    {c.text}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Box>

          <Alert severity="warning" sx={{ mt: 3 }}>
            This document is an application-generated subscription and terms summary. Recorded
            checkbox acceptance is not a certified digital signature and does not by itself
            establish legal enforceability. Have the final agreement reviewed by qualified counsel.
          </Alert>

          {/* Section 5: Acknowledgment Status */}
          <Box sx={{ mt: 5, pt: 3, borderTop: '2px solid #0f172a', pageBreakInside: 'avoid' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, textTransform: 'uppercase', color: '#0f172a', mb: 2 }}>
              5. TRẠNG THÁI CHẤP THUẬN VÀ XÁC NHẬN (ACKNOWLEDGMENT STATUS)
            </Typography>
            <Grid container spacing={4}>
              <Grid size={{ xs: 6 }}>
                <Box sx={{ textAlign: 'center', p: 2, border: '1px dashed #cbd5e1', borderRadius: '8px' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    ĐẠI DIỆN BÊN A (PROVIDER)
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 2 }}>
                    Smart Drone Inspection Platform Inc.
                  </Typography>
                  <Box sx={{ py: 1.5, color: '#0A968A', fontWeight: 800 }}>
                    {subscription.status === 'ACTIVE' ? (
                      <Chip
                        icon={<VerifiedRounded />}
                        label="ADMINISTRATIVELY CONFIRMED"
                        color="success"
                        variant="outlined"
                        sx={{ fontWeight: 700 }}
                      />
                    ) : (
                      <Chip label="PENDING CONFIRMATION" color="warning" variant="outlined" sx={{ fontWeight: 700 }} />
                    )}
                  </Box>
                  {subscription.confirmedByUserId && (
                    <Typography variant="caption" sx={{ display: 'block', color: '#64748b' }}>
                      Administrator ID: <code>{subscription.confirmedByUserId}</code>
                    </Typography>
                  )}
                  {subscription.confirmedAt && (
                    <Typography variant="caption" sx={{ display: 'block', color: '#64748b' }}>
                      Confirmation date: {new Date(subscription.confirmedAt).toLocaleDateString()}
                    </Typography>
                  )}
                </Box>
              </Grid>

              <Grid size={{ xs: 6 }}>
                <Box sx={{ textAlign: 'center', p: 2, border: '1px dashed #cbd5e1', borderRadius: '8px' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    ĐẠI DIỆN BÊN B (CUSTOMER)
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 2 }}>
                    {subscription.organizationName}
                  </Typography>
                  <Box sx={{ py: 1.5, color: '#0A968A', fontWeight: 800 }}>
                    <Chip
                      icon={<VerifiedRounded />}
                      label={snapshot?.agreedAt ? 'TERMS ACCEPTANCE RECORDED' : 'TERMS ACCEPTANCE NOT RECORDED'}
                      color={snapshot?.agreedAt ? 'primary' : 'default'}
                      variant="outlined"
                      sx={{ fontWeight: 700 }}
                    />
                  </Box>
                  <Typography variant="caption" sx={{ display: 'block', color: '#0f172a', fontWeight: 700 }}>
                    {snapshot?.agreedByFullName || 'Authorized Signatory'}
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', color: '#64748b' }}>
                    Email: {snapshot?.agreedByUserEmail || 'N/A'}
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', color: '#64748b' }}>
                    Terms accepted: {snapshot?.agreedAt ? new Date(snapshot.agreedAt).toLocaleString() : 'Not recorded'}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0', '@media print': { display: 'none' } }}>
        <Button onClick={onClose} sx={{ color: '#64748b', fontWeight: 600 }}>
          Close
        </Button>
        <Button
          variant="contained"
          startIcon={<PrintRounded />}
          onClick={handlePrint}
          sx={{
            bgcolor: '#0A968A',
            color: '#ffffff',
            fontWeight: 700,
            textTransform: 'none',
            '&:hover': { bgcolor: '#087a70' },
          }}
        >
          Print / Save as PDF
        </Button>
      </DialogActions>
    </Dialog>
  );
}
