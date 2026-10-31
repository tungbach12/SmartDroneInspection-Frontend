import { Box, Step, StepLabel, Stepper, Typography } from '@mui/material';

interface ContractLifecycleStepperProps {
  status: string;
}

const STEPS = [
  { key: 'OPEN', label: '1. Gửi yêu cầu', desc: 'Khách hàng tạo yêu cầu kiểm định' },
  { key: 'QUOTED', label: '2. Báo giá & Đàm phán', desc: 'Trao đổi chi phí, phi công & drone' },
  { key: 'ACCEPTED', label: '3. Chấp thuận điều khoản', desc: 'Khách hàng duyệt báo giá dịch vụ' },
  { key: 'CONTRACT_SIGNED', label: '4. Ký kết hợp đồng', desc: 'Tải văn bản hợp đồng có chữ ký' },
  { key: 'ASSIGNED', label: '5. Phân công bay', desc: 'Sẵn sàng triển khai kiểm định' },
];

export function ContractLifecycleStepper({ status }: ContractLifecycleStepperProps) {
  const getActiveStep = () => {
    switch (status) {
      case 'OPEN':
        return 0;
      case 'QUOTED':
        return 1;
      case 'ACCEPTED':
        return 2;
      case 'CONTRACT_SIGNED':
        return 3;
      case 'ASSIGNED':
        return 4;
      default:
        return 0;
    }
  };

  const activeStep = getActiveStep();

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 2.5 },
        bgcolor: 'background.paper',
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <Stepper
        activeStep={activeStep}
        alternativeLabel
        sx={{
          '& .MuiStepLabel-label': {
            fontWeight: 600,
            fontSize: '0.85rem',
            mt: 0.5,
          },
          '& .MuiStepLabel-label.Mui-active': {
            color: 'primary.main',
            fontWeight: 700,
          },
          '& .MuiStepLabel-label.Mui-completed': {
            color: 'text.primary',
          },
        }}
      >
        {STEPS.map((step, idx) => (
          <Step key={step.key} completed={idx < activeStep || status === 'ASSIGNED'}>
            <StepLabel>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {step.label}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: { xs: 'none', md: 'block' }, fontSize: '0.75rem', mt: 0.25 }}
              >
                {step.desc}
              </Typography>
            </StepLabel>
          </Step>
        ))}
      </Stepper>
    </Box>
  );
}
