import { Box, Step, StepButton, StepLabel, Stepper, Typography } from '@mui/material';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { type ContractRole, resolveActiveStepIndex } from './contractStage';

interface ContractLifecycleStepperProps {
  status: string;
  role: ContractRole;
  selectionOpen?: boolean;
  hasSelectedPair?: boolean;
  selectedStep?: number;
  onSelectStep?: (stepIndex: number) => void;
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
    { key: 'QUOTED', label: '2. Prepare' },
    { key: 'CONTRACT_SIGNED', label: '3. Record signed contract' },
    { key: 'ASSIGNED', label: '4. Assign inspection team' },
  ],
} as const;

export function ContractLifecycleStepper({
  status,
  role,
  selectionOpen = false,
  hasSelectedPair = false,
  selectedStep,
  onSelectStep,
}: ContractLifecycleStepperProps) {
  const { t } = useLocale();
  const steps = ROLE_STEPS[role];
  const activeStep = resolveActiveStepIndex(status, role, selectionOpen, hasSelectedPair);
  const completedThrough = status === 'ASSIGNED' ? steps.length : activeStep;
  const maxAccessibleStep = status === 'ASSIGNED' ? steps.length - 1 : activeStep;
  const viewedStep =
    selectedStep !== undefined && selectedStep >= 0 && selectedStep <= maxAccessibleStep
      ? selectedStep
      : activeStep;

  return (
    <Box
      sx={{
        px: { xs: 1.5, sm: 2.5 },
        py: { xs: 2, sm: 2.5 },
        bgcolor: 'background.paper',
        borderRadius: '10px',
        border: '1px solid',
        borderColor: 'divider',
        overflowX: 'auto',
      }}
    >
      <Stepper
        nonLinear={Boolean(onSelectStep)}
        activeStep={viewedStep}
        alternativeLabel
        sx={{
          minWidth: 460,
          '& .MuiStep-root': { px: { xs: 0.5, sm: 1 } },
          '& .MuiStepConnector-root': { top: 13 },
          '& .MuiStepIcon-root': { fontSize: { xs: 24, sm: 26 } },
          '& .MuiStepLabel-label': {
            fontWeight: 600,
            fontSize: '0.8125rem',
            mt: 0.75,
          },
          '& .MuiStepLabel-label.Mui-active': {
            color: 'primary.main',
            fontWeight: 700,
          },
          '& .MuiStepLabel-label.Mui-completed': {
            color: 'text.primary',
          },
          '@media (max-width: 600px)': {
            '& .MuiStepLabel-label': { fontSize: '0.6875rem', lineHeight: 1.25 },
          },
        }}
      >
        {steps.map((step, idx) => {
          const isCompleted = idx < completedThrough;
          const isClickable = Boolean(onSelectStep) && idx <= maxAccessibleStep;
          const isViewed = idx === viewedStep;
          const labelNode = (
            <Typography
              variant="body2"
              sx={{
                fontWeight: 700,
                fontSize: 'inherit',
                color: isViewed ? 'primary.main' : undefined,
                textDecoration: isViewed && viewedStep !== activeStep ? 'underline' : 'none',
                textUnderlineOffset: '3px',
              }}
            >
              {t(step.label)}
            </Typography>
          );

          return (
            <Step key={step.key} completed={isCompleted}>
              {isClickable ? (
                <StepButton
                  onClick={() => onSelectStep?.(idx)}
                  aria-current={isViewed ? 'step' : undefined}
                  sx={{ m: 0, p: 0.5, borderRadius: '8px' }}
                >
                  {labelNode}
                </StepButton>
              ) : (
                <StepLabel>{labelNode}</StepLabel>
              )}
            </Step>
          );
        })}
      </Stepper>
    </Box>
  );
}
