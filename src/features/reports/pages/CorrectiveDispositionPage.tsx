import { useMemo, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import EngineeringOutlined from '@mui/icons-material/EngineeringOutlined';
import CheckCircleOutlineRounded from '@mui/icons-material/CheckCircleOutlineRounded';
import { useAuthStore } from '@/features/auth/store/authStore';
import { MutationProblemAlert } from '@/shared/ui/MutationProblemAlert';
import { QueryState } from '@/shared/ui/QueryState';
import {
  useCompleteCorrectiveHandoff,
  useInspectionFindings,
  useInspectionWorkflowState,
  useReportVersions,
} from '@/features/inspections/hooks/useInspections';

/**
 * Send to Maintenance: forward confirmed inspection findings to the maintenance team.
 *
 * <p>The administrator does not enter individual rationales, priorities, or due dates;
 * that triage belongs to the maintenance team. By default, all confirmed findings are selected
 * to forward as repair candidates. Sending an empty selection closes the inspection without
 * forwarding findings; this decision is final for the inspection.
 */
export default function CorrectiveDispositionPage() {
  const { inspectionId = '' } = useParams<{ inspectionId: string }>();
  const roles = useAuthStore((state) => state.roles);
  const canReview = roles.includes('ORG_ADMIN');

  const versions = useReportVersions(inspectionId);
  const findings = useInspectionFindings(inspectionId);
  const workflow = useInspectionWorkflowState(inspectionId);
  const completeCorrectiveHandoff = useCompleteCorrectiveHandoff(inspectionId);
  const [confirmCompletionOpen, setConfirmCompletionOpen] = useState(false);

  const publishedVersion =
    versions.data?.find((version) => version.status === 'PUBLISHED') ?? null;

  // Only Inspector-confirmed findings are official defects eligible for repair.
  const officialFindings = useMemo(
    () => (findings.data ?? []).filter((f) => f.status === 'CONFIRMED'),
    [findings.data],
  );

  const unforwardedFindings = useMemo(
    () => officialFindings.filter((finding) => finding.forwardedToMaintenanceAt == null),
    [officialFindings],
  );

  const alreadyForwardedFindings = useMemo(
    () => officialFindings.filter((finding) => finding.forwardedToMaintenanceAt != null),
    [officialFindings],
  );

  // Selected findings default to all current unforwarded rows; keep user edits only for that set.
  const findingKey = unforwardedFindings.map((finding) => finding.id).join('|');
  const [selection, setSelection] = useState<{ findingKey: string; ids: Set<string> } | null>(null);
  const selectedIds =
    selection?.findingKey === findingKey
      ? selection.ids
      : new Set(unforwardedFindings.map((finding) => finding.id));

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelection({ findingKey, ids: next });
  };

  const selectAll = () => {
    setSelection({ findingKey, ids: new Set(unforwardedFindings.map((finding) => finding.id)) });
  };

  const deselectAll = () => {
    setSelection({ findingKey, ids: new Set() });
  };

  const handleSend = () => {
    if (selectedIds.size === 0 && workflow.data?.status === 'REPORT_PUBLISHED') {
      setConfirmCompletionOpen(true);
      return;
    }
    completeCorrectiveHandoff.mutate(Array.from(selectedIds));
  };

  const confirmCompletionWithoutForwarding = () => {
    setConfirmCompletionOpen(false);
    completeCorrectiveHandoff.mutate([]);
  };

  if (!canReview) {
    return (
      <Alert severity="info" sx={{ borderRadius: '12px' }}>
        Forwarding findings to maintenance is reserved for the organization administrator.
      </Alert>
    );
  }

  return (
    <Stack spacing={2}>
      <Button
        component={RouterLink}
        to="../review"
        startIcon={<ArrowBackRounded />}
        sx={{ alignSelf: 'flex-start', color: 'text.secondary', fontWeight: 500, textTransform: 'none' }}
      >
        Back to report review
      </Button>

      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
          <EngineeringOutlined color="primary" />
          <Typography variant="h6">Send to Maintenance</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Forward selected confirmed findings to the maintenance team as repair candidates. The maintenance team
          will triage, estimate, and create work orders. By default all findings are selected. Sending no findings
          completes this inspection without maintenance forwarding.
        </Typography>

        <QueryState
          isLoading={versions.isLoading || findings.isLoading || workflow.isLoading}
          error={versions.error ?? findings.error ?? workflow.error}
          onRetry={() => {
            void versions.refetch();
            void findings.refetch();
            void workflow.refetch();
          }}
        >
          {null}
        </QueryState>

        {!publishedVersion ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            There is no published report version yet. Publish the approved report version from the
            Report Review tab before forwarding findings.
          </Alert>
        ) : (
          <Stack spacing={2} sx={{ mt: 2 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Chip
                size="small"
                color="primary"
                variant="outlined"
                label={`Published version ${publishedVersion.versionNo}`}
              />
              <Chip
                size="small"
                variant="outlined"
                label={`${officialFindings.length} confirmed finding(s)`}
              />
              {alreadyForwardedFindings.length > 0 && (
                <Chip
                  size="small"
                  color="success"
                  variant="outlined"
                  label={`${alreadyForwardedFindings.length} already forwarded`}
                />
              )}
            </Stack>

            {workflow.data?.status === 'COMPLETED' ? (
              <Alert severity="success" icon={<CheckCircleOutlineRounded />}>
                This inspection is complete. Its maintenance decision is final; additional findings
                cannot be forwarded from this inspection.
              </Alert>
            ) : officialFindings.length === 0 ? (
              <Alert severity="info">
                No confirmed findings are awaiting maintenance. The published report records the
                Inspector’s explicit no-findings acknowledgment and observed coverage.
              </Alert>
            ) : (
              <Stack spacing={2}>
                {unforwardedFindings.length > 0 ? (
                  <>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        Findings ready to forward ({selectedIds.size} of {unforwardedFindings.length} selected):
                      </Typography>
                      <Stack direction="row" spacing={1}>
                        <Button size="small" onClick={selectAll} disabled={selectedIds.size === unforwardedFindings.length}>
                          Select all
                        </Button>
                        <Button size="small" onClick={deselectAll} disabled={selectedIds.size === 0}>
                          Deselect all
                        </Button>
                      </Stack>
                    </Stack>

                    <Stack spacing={1.5}>
                      {unforwardedFindings.map((finding) => {
                        const checked = selectedIds.has(finding.id);
                        return (
                          <Card
                            key={finding.id}
                            variant="outlined"
                            sx={{
                              borderColor: checked ? 'primary.main' : 'divider',
                              bgcolor: checked ? 'action.hover' : 'background.paper',
                            }}
                          >
                            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                              <FormControlLabel
                                control={
                                  <Checkbox
                                    checked={checked}
                                    onChange={() => toggleSelect(finding.id)}
                                  />
                                }
                                label={
                                  <Box sx={{ ml: 0.5 }}>
                                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                                      <Chip size="small" label={finding.findingCode} />
                                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                        {finding.defectLabel}
                                      </Typography>
                                      <Chip size="small" label={finding.severity} />
                                      {finding.evidenceId && (
                                        <Typography variant="caption" color="text.secondary">
                                          Evidence · {finding.evidenceId.slice(0, 8)}…
                                        </Typography>
                                      )}
                                    </Stack>
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                      {finding.technicalNotes}
                                    </Typography>
                                  </Box>
                                }
                                sx={{ width: '100%', alignItems: 'flex-start' }}
                              />
                            </CardContent>
                          </Card>
                        );
                      })}
                    </Stack>

                    <Box sx={{ pt: 1 }}>
                      <Button
                        variant="contained"
                        size="large"
                        startIcon={<EngineeringOutlined />}
                        disabled={completeCorrectiveHandoff.isPending || !workflow.data}
                        onClick={handleSend}
                      >
                        {completeCorrectiveHandoff.isPending
                          ? 'Saving maintenance decision…'
                          : selectedIds.size === 0
                            ? workflow.data?.status === 'REPAIR_PENDING'
                              ? 'Leave remaining findings unforwarded'
                              : 'Complete inspection without forwarding'
                            : `Send ${selectedIds.size} finding(s) to Maintenance`}
                      </Button>
                    </Box>

                    {selectedIds.size === 0 && (
                      <Alert severity="info">
                        {workflow.data?.status === 'REPAIR_PENDING'
                          ? 'No additional findings selected. The inspection remains in maintenance; these findings can be forwarded later.'
                          : 'Completing now closes the inspection without forwarding; this decision is final.'}
                      </Alert>
                    )}
                  </>
                ) : (
                  <Alert severity="success" icon={<CheckCircleOutlineRounded />}>
                    All confirmed findings from this report have already been forwarded to Maintenance.
                  </Alert>
                )}

                {alreadyForwardedFindings.length > 0 && unforwardedFindings.length > 0 && (
                  <Box sx={{ pt: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 1 }}>
                      Already forwarded findings ({alreadyForwardedFindings.length}):
                    </Typography>
                    <Stack spacing={1}>
                      {alreadyForwardedFindings.map((finding) => (
                        <Paper key={finding.id} variant="outlined" sx={{ p: 1.5, opacity: 0.85 }}>
                          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                            <Chip size="small" label={finding.findingCode} />
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {finding.defectLabel}
                            </Typography>
                            <Chip size="small" color="success" variant="outlined" label="Forwarded to Maintenance" />
                          </Stack>
                        </Paper>
                      ))}
                    </Stack>
                  </Box>
                )}
              </Stack>
            )}

            <MutationProblemAlert
              error={completeCorrectiveHandoff.error}
              isError={completeCorrectiveHandoff.isError}
              fallbackMessage="Could not forward findings to maintenance."
            />

            {completeCorrectiveHandoff.isSuccess && (
              <Alert severity="success">
                Findings successfully forwarded to Maintenance. Inspection status:{' '}
                {completeCorrectiveHandoff.data?.inspectionStatus}.
              </Alert>
            )}
          </Stack>
        )}
      </Paper>

      <Dialog
        open={confirmCompletionOpen}
        onClose={() => setConfirmCompletionOpen(false)}
        aria-labelledby="complete-inspection-dialog-title"
      >
        <DialogTitle id="complete-inspection-dialog-title">Complete without forwarding?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This closes the inspection without sending findings to Maintenance. A completed inspection
            cannot be reopened for later forwarding.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmCompletionOpen(false)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={confirmCompletionWithoutForwarding}
            disabled={completeCorrectiveHandoff.isPending}
          >
            Confirm completion without forwarding
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
