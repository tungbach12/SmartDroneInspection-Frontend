import { Box, Step, StepLabel, Stepper, Typography } from '@mui/material';
import { useLocale } from '@/shared/i18n/LocaleProvider';

interface ContractLifecycleStepperProps {
  status: string;
  role: 'CUSTOMER' | 'MANAGER';
}

const ROLE_STEPS = {
  CUSTOMER: [
    { key: 'OPEN', label: '1. Request submitted' },
    { key: 'QUOTED', label: '2. Review manager quote' },
    { key: 'CONTRACT_SIGNED', label: '3. Accept terms & sign contract' },
    { key: 'ASSIGNED', label: '4. Inspection scheduled' },
  ],
  MANAGER: [
    { key: 'OPEN', label: '1. Review customer request' },
    { key: 'QUOTED', label: '2. Prepare & discuss quote' },
    { key: 'CONTRACT_SIGNED', label: '3. Record signed contract' },
    { key: 'ASSIGNED', label: '4. Assign inspection team' },
  ],
} as const;

export function ContractLifecycleStepper({ status, role }: ContractLifecycleStepperProps) {
  const { t } = useLocale();
  const steps = ROLE_STEPS[role];
  const acceptedStep = steps.findIndex((step) => step.key === 'CONTRACT_SIGNED');
  const activeStep = (() => {
    switch (status) {
      case 'OPEN':
        return 0;
      case 'QUOTED':
        return 1;
      case 'ACCEPTED':
      case 'CONTRACT_SIGNED':
        return acceptedStep;
      case 'ASSIGNED':
        return steps.length - 1;
      default:
        return 0;
    }
  })();
  const completedThrough = status === 'ASSIGNED' ? steps.length - 1 : activeStep;

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 2.5 },
        bgcolor: 'background.paper',
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: 'none',
      }}
    >
      <Stepper
        activeStep={activeStep}
        alternativeLabel
        sx={{
          '& .MuiStepLabel-label': {
            fontWeight: 600,
            fontSize: '0.875rem',
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
        {steps.map((step, idx) => (
          <Step key={step.key} completed={idx < completedThrough}>
            <StepLabel>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {t(step.label)}
              </Typography>
            </StepLabel>
          </Step>
        ))}
      </Stepper>
    </Box>
  );
}
