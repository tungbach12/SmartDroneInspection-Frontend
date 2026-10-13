import { Link as RouterLink, useParams } from 'react-router-dom';
import { Button, Stack } from '@mui/material';
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
  const isInspector = useAuthStore((state) => state.roles.includes('INSPECTOR'));
  const preparations = useInspectionPreparations(inspectionId);
  const activePreparationId = preparations.data?.[0]?.id ?? null;
  const isReviewer = !isInspector;

  return (
    <Stack spacing={2}>
      <Button
        component={RouterLink}
        to=".."
        startIcon={<ArrowBackRounded />}
        sx={{ alignSelf: 'flex-start', color: '#475467', fontWeight: 600, textTransform: 'none' }}
      >
        Back to inspection
      </Button>
      <InspectionPreparationPanel inspectionId={inspectionId} isInspector={isInspector} />
      {isReviewer && activePreparationId ? (
        <ReadinessReviewPanel inspectionId={inspectionId} preparationId={activePreparationId} />
      ) : null}
    </Stack>
  );
}
