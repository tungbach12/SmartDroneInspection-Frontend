import { useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import type { PartnerCandidate } from '@/features/contracts/api/contractApi';
import { PartnerCandidateResults } from '@/features/contracts/components/PartnerCandidateResults';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import { MutationProblemAlert } from '@/shared/ui/MutationProblemAlert';
import type { InspectionDetail } from '../api/inspectionApi';
import { useReassignCandidates, useReassignInspection } from '../hooks/useInspections';

export interface ReassignInspectionDialogProps {
  open: boolean;
  inspection: InspectionDetail | null | undefined;
  onClose: () => void;
}

export function ReassignInspectionDialog({
  open,
  inspection,
  onClose,
}: ReassignInspectionDialogProps) {
  const { t, formatDateTime } = useLocale();
  const inspectionId = inspection?.id ?? null;
  const candidatesQuery = useReassignCandidates(inspectionId, open && Boolean(inspectionId));
  const reassign = useReassignInspection(inspectionId);

  const [selectedInspectorId, setSelectedInspectorId] = useState('');
  const [selectedDroneId, setSelectedDroneId] = useState('');

  const handleClose = () => {
    setSelectedInspectorId('');
    setSelectedDroneId('');
    onClose();
  };

  const handleSelectPair = (candidate: PartnerCandidate) => {
    setSelectedInspectorId(candidate.inspectorId);
    setSelectedDroneId(candidate.droneId);
  };

  const handleSubmit = () => {
    if (!selectedInspectorId) return;
    reassign.mutate(
      {
        inspectorId: selectedInspectorId,
        droneId: selectedDroneId || null,
      },
      {
        onSuccess: () => {
          handleClose();
        },
      },
    );
  };

  const windowSummary =
    inspection?.plannedStartAt && inspection?.plannedEndAt
      ? `${formatDateTime(new Date(inspection.plannedStartAt))} – ${formatDateTime(new Date(inspection.plannedEndAt))}`
      : undefined;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        {t('Reassign Inspector & Drone')}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {inspection?.reassignmentRequired && (
            <Alert severity="warning" sx={{ borderRadius: '8px' }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {t('Assigned inspector declined this mission.')}
              </Typography>
              {inspection.declineReason && (
                <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                  {t('Reason')}: {inspection.declineReason}
                </Typography>
              )}
            </Alert>
          )}

          {candidatesQuery.isError ? (
            <MutationProblemAlert
              error={candidatesQuery.error}
              isError={candidatesQuery.isError}
              fallbackMessage={t('Could not evaluate partner candidates for reassignment.')}
            />
          ) : (
            <PartnerCandidateResults
              embedded
              candidates={candidatesQuery.data ?? null}
              loading={candidatesQuery.isLoading}
              {...(windowSummary ? { windowSummary } : {})}
              selectedInspectorId={selectedInspectorId}
              selectedDroneId={selectedDroneId}
              onSelectPair={handleSelectPair}
            />
          )}

          <MutationProblemAlert
            error={reassign.error}
            isError={reassign.isError}
            fallbackMessage={t('Could not reassign inspection.')}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} color="inherit">
          {t('Cancel')}
        </Button>
        <LoadingButton
          variant="contained"
          loading={reassign.isPending}
          disabled={!selectedInspectorId}
          onClick={handleSubmit}
        >
          {t('Confirm reassignment')}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
