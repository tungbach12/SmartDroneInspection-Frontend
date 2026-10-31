import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Paper,
  Stack,
  Step,
  StepContent,
  StepLabel,
  Stepper,
  Typography,
} from '@mui/material';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import RadioButtonCheckedRounded from '@mui/icons-material/RadioButtonCheckedRounded';
import RadioButtonUncheckedRounded from '@mui/icons-material/RadioButtonUncheckedRounded';
import FlightTakeoffRounded from '@mui/icons-material/FlightTakeoffRounded';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import PlaceOutlined from '@mui/icons-material/PlaceOutlined';
import PersonOutlineRounded from '@mui/icons-material/PersonOutlineRounded';
import AirplanemodeActiveRounded from '@mui/icons-material/AirplanemodeActiveRounded';
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import AssignmentTurnedInOutlined from '@mui/icons-material/AssignmentTurnedInOutlined';
import {
  useInspection,
  useInspectionEvidence,
  useInspectionWorkflowState,
  useReportVersions,
} from '../hooks/useInspections';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { StatusChip } from '@/shared/ui/StatusChip';

export default function InspectionProgressPage() {
  const { t } = useLocale();
  const { inspectionId = '' } = useParams<{ inspectionId: string }>();
  const navigate = useNavigate();

  const inspectionQuery = useInspection(inspectionId);
  const inspection = inspectionQuery.data;
  const workflowQuery = useInspectionWorkflowState(inspectionId);
  const workflow = workflowQuery.data;
  const evidenceQuery = useInspectionEvidence(inspectionId);
  const activeCaptures = (evidenceQuery.data ?? []).filter((item) => !item.isDeleted).length;
  const versionsQuery = useReportVersions(inspectionId);
  const publishedVersion = versionsQuery.data?.find((v) => v.status === 'PUBLISHED');
  const hasPublishedVersion = Boolean(publishedVersion);

  const status = workflow?.status ?? inspection?.status ?? 'SCHEDULED';

  // Determine stage progression:
  // 1. Mission setup & dispatch
  // 2. Drone aerial flight operation
  // 3. Evidence intake & AI defect detection
  // 4. Platform Manager technical review
  // 5. Official publication & deliverable
  const isStage1Complete = ['IN_PROGRESS', 'FIELD_COMPLETED', 'UNDER_REVIEW', 'COMPLETED'].includes(status);
  const isStage2Complete = ['FIELD_COMPLETED', 'UNDER_REVIEW', 'COMPLETED'].includes(status);
  const isStage3Complete = ['UNDER_REVIEW', 'COMPLETED'].includes(status);
  const isStage4Complete = ['COMPLETED'].includes(status) || hasPublishedVersion;
  const isStage5Complete = hasPublishedVersion;

  const currentStageIndex = isStage5Complete
    ? 4
    : isStage4Complete
      ? 4
      : isStage3Complete
        ? 3
        : isStage2Complete
          ? 2
          : isStage1Complete
            ? 1
            : 0;

  const STAGES = [
    {
      title: t('Mission dispatch & flight permit'),
      complete: isStage1Complete,
      active: currentStageIndex === 0,
      description: t('Flight operations scheduled and airspace clearances registered.'),
      icon: DescriptionOutlined,
    },
    {
      title: t('Aerial drone survey'),
      complete: isStage2Complete,
      active: currentStageIndex === 1,
      description: t('Certified drone pilot conducts field flight and automated data capture.'),
      icon: FlightTakeoffRounded,
    },
    {
      title: t('Evidence intake & AI defect analysis'),
      complete: isStage3Complete,
      active: currentStageIndex === 2,
      description: t('Field images uploaded, validated, and processed through AI vision detection models.'),
      icon: AutoAwesomeOutlined,
    },
    {
      title: t('Technical report review'),
      complete: isStage4Complete,
      active: currentStageIndex === 3,
      description: t('Platform Manager audits defect assessments, technical notes, and report accuracy.'),
      icon: AssignmentTurnedInOutlined,
    },
    {
      title: t('Official report publication'),
      complete: isStage5Complete,
      active: currentStageIndex === 4,
      description: t('Official stamped deliverable published and available for client acceptance and download.'),
      icon: CheckCircleRounded,
    },
  ];

  return (
    <Stack spacing={3}>
      {/* Header Info Banner */}
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2.5, sm: 3 },
          borderRadius: '16px',
          bgcolor: 'background.paper',
          borderColor: 'divider',
        }}
      >
        <Stack spacing={2}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: 1 }}
          >
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary' }}>
                {inspection?.assetName ?? t('Inspection Mission')}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
                <Chip
                  size="small"
                  label={
                    inspection?.inspectionType === 'RE_INSPECTION'
                      ? t('Re-inspection (Audit)')
                      : t('Standard Inspection')
                  }
                  color={inspection?.inspectionType === 'RE_INSPECTION' ? 'secondary' : 'default'}
                  variant="outlined"
                  sx={{ fontWeight: 600 }}
                />
                <StatusChip status={status} />
              </Stack>
            </Box>

            {hasPublishedVersion && (
              <Button
                variant="contained"
                color="primary"
                endIcon={<ArrowForwardRounded />}
                onClick={() => navigate('../report')}
                sx={{ borderRadius: '8px', px: 2.5, fontWeight: 700, textTransform: 'none' }}
              >
                {t('View official report')}
              </Button>
            )}
          </Stack>

          <Divider />

          {/* Quick Info Grid */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' },
              gap: 2,
            }}
          >
            <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
              <PlaceOutlined color="action" />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  {t('Target Asset')}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {inspection?.assetName ?? '—'}
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
              <PersonOutlineRounded color="action" />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  {t('Assigned Pilot')}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {inspection?.inspectorName ?? '—'}
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
              <AirplanemodeActiveRounded color="action" />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  {t('Drone Model')}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {inspection?.droneModel ?? '—'}
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
              <AutoAwesomeOutlined color="action" />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  {t('Collected Imagery')}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {activeCaptures > 0 ? `${activeCaptures} ${t('photos')}` : t('Pending flight')}
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Stack>
      </Paper>

      {/* Contextual Status Guidance */}
      {!hasPublishedVersion ? (
        <Alert severity="info" sx={{ borderRadius: '12px' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.25 }}>
            {status === 'UNDER_REVIEW'
              ? t('Quality Review in Progress')
              : status === 'IN_PROGRESS' || status === 'FIELD_COMPLETED'
                ? t('Field Survey in Progress')
                : t('Inspection Scheduled')}
          </Typography>
          <Typography variant="body2">
            {status === 'UNDER_REVIEW'
              ? t('The field flight and AI analysis are complete. The Platform Manager is currently conducting technical quality review. Once approved and published, the official report will become available here.')
              : t('Field operations and data collection are in progress. Track mission progress below; you will be notified as soon as the final report is published.')}
          </Typography>
        </Alert>
      ) : (
        <Alert
          severity="success"
          sx={{ borderRadius: '12px' }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => navigate('../report')}
              sx={{ fontWeight: 700, textTransform: 'none' }}
            >
              {t('Open report')} →
            </Button>
          }
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {t('Official report has been published!')}
          </Typography>
          <Typography variant="body2">
            {t('The final technical inspection report is ready for your review, acceptance, and download.')}
          </Typography>
        </Alert>
      )}

      {/* 5-Step Visual Timeline */}
      <Card variant="outlined" sx={{ borderRadius: '16px', bgcolor: 'background.paper', borderColor: 'divider' }}>
        <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>
            {t('Inspection Lifecycle Progress')}
          </Typography>

          <Stepper orientation="vertical" nonLinear activeStep={currentStageIndex}>
            {STAGES.map((stage, idx) => {
              const isPast = stage.complete;
              const isCurrent = stage.active && !stage.complete;

              return (
                <Step key={stage.title} active={isCurrent} completed={isPast}>
                  <StepLabel
                    icon={
                      isPast ? (
                        <CheckCircleRounded sx={{ color: 'success.main', fontSize: 24 }} />
                      ) : isCurrent ? (
                        <RadioButtonCheckedRounded sx={{ color: 'primary.main', fontSize: 24 }} />
                      ) : (
                        <RadioButtonUncheckedRounded sx={{ color: 'text.disabled', fontSize: 24 }} />
                      )
                    }
                  >
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: isCurrent || isPast ? 700 : 500,
                        color: isCurrent ? 'primary.main' : isPast ? 'text.primary' : 'text.secondary',
                      }}
                    >
                      {stage.title}
                    </Typography>
                  </StepLabel>
                  <StepContent>
                    <Box sx={{ pb: idx === STAGES.length - 1 ? 0 : 2, pt: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">
                        {stage.description}
                      </Typography>
                      {isCurrent && (
                        <Chip
                          size="small"
                          label={t('Current Stage')}
                          color="primary"
                          sx={{ mt: 1, fontWeight: 600, height: 22, fontSize: '0.75rem' }}
                        />
                      )}
                    </Box>
                  </StepContent>
                </Step>
              );
            })}
          </Stepper>
        </CardContent>
      </Card>
    </Stack>
  );
}
