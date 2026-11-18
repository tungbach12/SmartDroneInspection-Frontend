import { Box, Chip, Stack, Step, StepButton, StepLabel, Stepper, Typography } from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { type ContractRole, resolveActiveStepIndex } from './contractStage';

interface ContractLifecycleStepperProps {
  status: string;
  role: ContractRole;
  hasOccurrences?: boolean;
  selectedStep?: number;
  onSelectStep?: (stepIndex: number) => void;
}

const getRoleSteps = (status: string, role: ContractRole) =>
  role === 'CUSTOMER'
    ? ([
        { key: 'OPEN', label: 'Request submitted' },
        { key: 'QUOTED', label: 'Review quote' },
        { key: 'CONTRACT_SIGNED', label: 'Sign contract' },
        {
          key: 'ASSIGNED',
          label: status === 'ASSIGNED' ? 'Scheduled' : 'Preparing schedule',
        },
      ] as const)
    : ([
        { key: 'OPEN', label: 'Review request' },
        { key: 'QUOTED', label: 'Prepare quote' },
        { key: 'CONTRACT_SIGNED', label: 'Record contract' },
        { key: 'ASSIGNED', label: 'Assign team' },
      ] as const);

export function ContractLifecycleStepper({
  status,
  role,
  hasOccurrences = false,
  selectedStep,
  onSelectStep,
}: ContractLifecycleStepperProps) {
  const { t } = useLocale();
  const steps = getRoleSteps(status, role);
  const activeStep = resolveActiveStepIndex(status, hasOccurrences);
  const completedThrough = status === 'ASSIGNED' ? steps.length : activeStep;
  const maxAccessibleStep = status === 'ASSIGNED' ? steps.length - 1 : activeStep;
  const viewedStep =
    selectedStep !== undefined && selectedStep >= 0 && selectedStep <= maxAccessibleStep
      ? selectedStep
      : activeStep;
  const viewedStepDef = steps[viewedStep] ?? steps[0];

  return (
    <Box
      sx={{
        px: { xs: 1.75, sm: 2.5 },
        py: { xs: 1.5, sm: 2.5 },
        bgcolor: 'background.paper',
        borderRadius: '8px',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      {/* Compact step bar on phones so 4 labels never wrap mid-word */}
      <Stack spacing={1.25} sx={{ display: { xs: 'flex', sm: 'none' } }}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main', fontVariantNumeric: 'tabular-nums' }}>
            {t('Step')} {viewedStep + 1}/{steps.length} · {t(viewedStepDef.label)}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
            {Math.min(completedThrough, steps.length)}/{steps.length}
          </Typography>
        </Stack>
        <Box sx={{ display: 'flex', gap: 0.75 }}>
          {steps.map((step, idx) => {
            const isCompleted = idx < completedThrough;
            const isViewed = idx === viewedStep;
            const isClickable = Boolean(onSelectStep) && idx <= maxAccessibleStep;
            return (
              <Chip
                key={step.key}
                size="small"
                clickable={isClickable}
                onClick={isClickable ? () => onSelectStep?.(idx) : undefined}
                icon={isCompleted ? <CheckCircleRoundedIcon sx={{ fontSize: 14 }} /> : undefined}
                label={`${idx + 1}`}
                variant={isViewed ? 'filled' : 'outlined'}
                color={isViewed || isCompleted ? 'primary' : 'default'}
                aria-label={`${t('Step')} ${idx + 1}: ${t(step.label)}`}
                aria-current={isViewed ? 'step' : undefined}
                sx={{
                  flex: 1,
                  height: 28,
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  fontVariantNumeric: 'tabular-nums',
                }}
              />
            );
          })}
        </Box>
      </Stack>

      <Stepper
        nonLinear={Boolean(onSelectStep)}
        activeStep={viewedStep}
        alternativeLabel
        sx={{
          display: { xs: 'none', sm: 'flex' },
          minWidth: 0,
          '& .MuiStep-root': { px: 1, flex: '1 1 0', minWidth: 0 },
          '& .MuiStepConnector-root': { top: 13 },
          '& .MuiStepIcon-root': { fontSize: 26 },
          '& .MuiStepLabel-root': { px: 0 },
          '& .MuiStepLabel-label': {
            fontWeight: 600,
            fontSize: '0.875rem',
            mt: 0.75,
            wordBreak: 'break-word',
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
