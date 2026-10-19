import { Link as RouterLink, useParams } from 'react-router-dom';
import { Alert, Button, Stack } from '@mui/material';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import { useAuthStore } from '@/features/auth/store/authStore';
import InspectionPreparationPanel from './InspectionPreparationPanel';
import ReadinessReviewPanel from './ReadinessReviewPanel';
import { useInspectionPreparations } from '../hooks/useInspections';

/**
 * MF2 preparation, one stage of the inspection workspace.
 *
 * Mounts the existing preparation and readiness panels unchanged; no panel forms or endpoints
 * change here.
 */
export default function InspectionPreparationPage() {
  const { inspectionId = '' } = useParams();
  const roles = useAuthStore((state) => state.roles);
  const isInspector = roles.includes('INSPECTOR');
  const isReviewer = roles.includes('ORG_ADMIN');
  const preparations = useInspectionPreparations(inspectionId);
  const activePreparationId = preparations.data?.[0]?.id ?? null;

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
      {isReviewer && <Alert severity="info">Read the submitted preparation and its documented readiness decision. This view does not establish legal clearance or independently verify credentials beyond recorded workflow data.</Alert>}
      <InspectionPreparationPanel inspectionId={inspectionId} isInspector={isInspector} />
      {isReviewer && activePreparationId ? (
        <ReadinessReviewPanel inspectionId={inspectionId} preparationId={activePreparationId} />
      ) : null}
    </Stack>
  );
}
