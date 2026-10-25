import { Link as RouterLink, useParams } from 'react-router-dom';
import { Alert, Button, Stack } from '@mui/material';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import { useAuthStore } from '@/features/auth/store/authStore';
import InspectionPreparationPanel from './InspectionPreparationPanel';
import ReadinessReviewPanel from './ReadinessReviewPanel';
import { useInspectionPreparations } from '../hooks/useInspections';
import { useLocale } from '@/shared/i18n/LocaleProvider';

/**
 * MF2 preparation, one stage of the inspection workspace.
 *
 * Mounts the existing preparation and readiness panels unchanged; no panel forms or endpoints
 * change here.
 */
export default function InspectionPreparationPage() {
  const { t } = useLocale();
  const { inspectionId = '' } = useParams();
  const roles = useAuthStore((state) => state.roles);
  const isInspector = roles.includes('INSPECTOR');
  const isReviewer = roles.includes('ORG_MANAGER');
  const preparations = useInspectionPreparations(inspectionId);
  // The reviewer's decision is about a submitted version, so the panel targets the newest
  // submission. A draft that is still open belongs to the Inspector, and a superseded version
  // has already been decided.
  const activePreparationId =
    preparations.data?.find((preparation) => preparation.status === 'SUBMITTED')?.id ?? null;

  return (
    <Stack spacing={2}>
      <Button
        component={RouterLink}
        to={isReviewer ? '../review' : '..'}
        startIcon={<ArrowBackRounded />}
        sx={{ alignSelf: 'flex-start', color: 'text.secondary', fontWeight: 500, textTransform: 'none' }}
      >
        {isReviewer ? 'Back to inspection review' : 'Back to inspection'}
      </Button>
      {isReviewer && <Alert severity="info">{t('Read the submitted preparation and its documented readiness decision. This view does not establish legal clearance or independently verify credentials beyond recorded workflow data.')}</Alert>}
      <InspectionPreparationPanel inspectionId={inspectionId} isInspector={isInspector} />
      {isReviewer && activePreparationId ? (
        <ReadinessReviewPanel inspectionId={inspectionId} preparationId={activePreparationId} />
      ) : null}
      {isReviewer && !activePreparationId ? (
        <Alert severity="info">
          No preparation is submitted for review at the moment. A readiness decision is made on a
          submitted version, so nothing is waiting here until the Inspector submits one.
        </Alert>
      ) : null}
    </Stack>
  );
}
