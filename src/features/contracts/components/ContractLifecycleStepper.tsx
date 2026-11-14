import { Box, Step, StepLabel, Stepper, Typography } from '@mui/material';
import { useLocale } from '@/shared/i18n/LocaleProvider';

interface ContractLifecycleStepperProps {
  status: string;
  role: 'CUSTOMER' | 'MANAGER';
  selectionOpen?: boolean;
  hasSelectedPair?: boolean;
}

const ROLE_STEPS = {
  CUSTOMER: [
    { key: 'OPEN', label: '1. Submit request' },
    { key: 'PAIR', label: '2. Manager selects partner' },
    { key: 'QUOTED', label: '3. Review quotation' },
    { key: 'CONTRACT_SIGNED', label: '4. Accept terms and sign agreement' },
    { key: 'ASSIGNED', label: '5. Inspection dispatched' },
  ],
  MANAGER: [
    { key: 'OPEN', label: '1. Review customer request' },
    { key: 'PAIR', label: '2. Select Inspector & drone' },
    { key: 'QUOTED', label: '3. Prepare quotation' },
    { key: 'CONTRACT_SIGNED', label: '4. Record signed agreement' },
    { key: 'ASSIGNED', label: '5. Dispatch inspection team' },
  ],
} as const;

export function ContractLifecycleStepper({
  status,
  role,
  selectionOpen = false,
  hasSelectedPair = false,
}: ContractLifecycleStepperProps) {
  const { t } = useLocale();
  const steps = ROLE_STEPS[role];
  const acceptedStep = steps.findIndex((step) => step.key === 'CONTRACT_SIGNED');
  const activeStep = (() => {
    if (status === 'OPEN' && role === 'MANAGER') {
      if (selectionOpen) return 1;
      if (hasSelectedPair) return 2;
      return 1;
    }
    switch (status) {
      case 'OPEN':
        return 0;
      case 'QUOTED':
        return 2;
      case 'ACCEPTED':
        return role === 'CUSTOMER' ? 2 : 3;
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
          overflowX: 'auto',
          '& .MuiStep-root': { px: { xs: 0.25, sm: 1 } },
          '& .MuiStepConnector-root': { top: 12 },
          '& .MuiStepIcon-root': { fontSize: { xs: 24, sm: 28 } },
          '& .MuiStepLabel-labelContainer': { maxWidth: { xs: 94, sm: 180 } },
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
          '@media (max-width: 600px)': {
            '& .MuiStepLabel-label': { fontSize: '0.6875rem', lineHeight: 1.2 },
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
