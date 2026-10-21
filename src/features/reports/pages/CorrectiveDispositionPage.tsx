import { useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import EngineeringOutlined from '@mui/icons-material/EngineeringOutlined';
import { useAuthStore } from '@/features/auth/store/authStore';
import { MutationProblemAlert } from '@/shared/ui/MutationProblemAlert';
import { QueryState } from '@/shared/ui/QueryState';
import {
  useCompleteCorrectiveHandoff,
  useDeclareNoCorrectiveWork,
  useInspectionFindings,
  useInspectionWorkflowState,
  useRecordCorrectiveAction,
  useReportVersions,
} from '@/features/inspections/hooks/useInspections';

/**
 * MF3-12 and MF3-13: the corrective disposition, as a phase of its own.
 *
 * <p>This is a disposition, not an edit. The published report version is immutable, and what is
 * recorded here is the accountable operational conclusion drawn from it: for every confirmed
 * finding, whether corrective work is required, with a rationale, a required priority and an
 * optional due date - or an explicit no-repair outcome with a rationale.
 *
 * <p>It lives apart from the report review screen on purpose. Beside the approve and publish
 * buttons, a per-finding form reads as "editing the report", which is exactly what a published
 * version forbids. Here the wording is about the corrective work, and the report stays where it
 * was published.
 */
export default function CorrectiveDispositionPage() {
  const { inspectionId = '' } = useParams<{ inspectionId: string }>();
  const roles = useAuthStore((state) => state.roles);
  const canReview = roles.includes('ORG_ADMIN');

  const versions = useReportVersions(inspectionId);
  const findings = useInspectionFindings(inspectionId);
  const workflow = useInspectionWorkflowState(inspectionId);
  const recordCorrectiveAction = useRecordCorrectiveAction(inspectionId);
  const completeCorrectiveHandoff = useCompleteCorrectiveHandoff(inspectionId);
  const declareNoCorrectiveWork = useDeclareNoCorrectiveWork(inspectionId);

  const [correctiveReasons, setCorrectiveReasons] = useState<Record<string, string>>({});
  const [correctiveChoices, setCorrectiveChoices] = useState<Record<string, boolean>>({});
  const [correctivePriorities, setCorrectivePriorities] = useState<Record<string, string>>({});
  const [correctiveDueDates, setCorrectiveDueDates] = useState<Record<string, string>>({});
  const [noRepairRationale, setNoRepairRationale] = useState('');

  const publishedVersion =
    versions.data?.find((version) => version.status === 'PUBLISHED') ?? null;

  // Only the findings the Inspector confirmed (or decided) are official report findings, so only
  // those carry a corrective outcome. Pending or rejected AI suggestions are not findings.
  const officialFindings = (findings.data ?? []).filter(
    (finding) => finding.status === 'CONFIRMED',
  );
  const correctiveActionPending = officialFindings.filter(
    (finding) => finding.correctiveActionReviewedByUserId == null,
  );
  const handoffRecorded = workflow.data?.status === 'REPAIR_PENDING' || workflow.data?.status === 'COMPLETED';

  if (!canReview) {
    return (
      <Alert severity="info" sx={{ borderRadius: '12px' }}>
        The corrective disposition is recorded by the organization administrator.
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
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
          <EngineeringOutlined color="primary" />
          <Typography variant="h6">Corrective disposition</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Recorded after publication and against the published version. The report PDF is not
          changed by anything on this screen.
        </Typography>

        <QueryState
          isLoading={versions.isLoading || findings.isLoading}
          error={versions.error ?? findings.error}
          onRetry={() => {
            void versions.refetch();
            void findings.refetch();
          }}
        >
          {null}
        </QueryState>

        {!publishedVersion ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            There is no published report version yet, so there is nothing to disposition. Publish
            the approved version from the report review screen first.
          </Alert>
        ) : (
          <Stack spacing={1.5} sx={{ mt: 2 }}>
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
                label={`${officialFindings.length} official finding(s)`}
              />
              {correctiveActionPending.length > 0 ? (
                <Chip
                  size="small"
                  color="warning"
                  variant="outlined"
                  label={`${correctiveActionPending.length} awaiting an outcome`}
                />
              ) : null}
            </Stack>

            {handoffRecorded ? (
              <Alert severity="success">
                The corrective outcome for this publication is recorded. The handoff to MF4 is
                recorded; a work order is created by the maintenance workflow, not from here.
              </Alert>
            ) : null}

            {officialFindings.length === 0 ? (
              <Stack spacing={2}>
                <Alert severity="info">
                  This inspection has no official findings. The no-repair outcome is recorded with a
                  reason rather than inferred from an empty list.
                </Alert>
                <TextField
                  required
                  multiline
                  minRows={2}
                  label="No-repair rationale for the observed scope"
                  value={noRepairRationale}
                  onChange={(event) => setNoRepairRationale(event.target.value)}
                />
                <Box>
                  <Button
                    variant="contained"
                    disabled={declareNoCorrectiveWork.isPending || !noRepairRationale.trim()}
                    onClick={() => declareNoCorrectiveWork.mutate(noRepairRationale.trim())}
                  >
                    {declareNoCorrectiveWork.isPending
                      ? 'Recording…'
                      : 'Record no corrective work and close inspection'}
                  </Button>
                </Box>
              </Stack>
            ) : (
              <Stack spacing={2}>
                {officialFindings.map((finding) => {
                  const rationale = correctiveReasons[finding.id] ?? '';
                  const reviewed = finding.correctiveActionReviewedByUserId != null;
                  const required =
                    correctiveChoices[finding.id] ?? finding.correctiveActionRequired;
                  return (
                    <Paper key={finding.id} variant="outlined" sx={{ p: 2 }}>
                      <Stack spacing={1.5}>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {finding.defectLabel}
                          </Typography>
                          <Chip size="small" label={finding.severity} />
                        </Stack>
                        {reviewed ? (
                          <Alert severity="success">
                            {finding.correctiveActionRequired
                              ? `Corrective action required${finding.correctiveActionPriority ? ` · ${finding.correctiveActionPriority}` : ''}${finding.correctiveActionDueAt ? ` · due ${new Date(finding.correctiveActionDueAt).toLocaleDateString()}` : ''}. `
                              : 'No corrective action required within scope. '}
                            {finding.correctiveActionRationale}
                          </Alert>
                        ) : (
                          <>
                            <TextField
                              select
                              label="Corrective action"
                              value={required ? 'YES' : 'NO'}
                              onChange={(event) =>
                                setCorrectiveChoices((current) => ({
                                  ...current,
                                  [finding.id]: event.target.value === 'YES',
                                }))
                              }
                            >
                              <MenuItem value="YES">Required — proceed to MF4 triage</MenuItem>
                              <MenuItem value="NO">Not required within observed scope</MenuItem>
                            </TextField>
                            {required ? (
                              <>
                                <TextField
                                  select
                                  required
                                  label="Corrective-action priority"
                                  value={correctivePriorities[finding.id] ?? ''}
                                  onChange={(event) =>
                                    setCorrectivePriorities((current) => ({
                                      ...current,
                                      [finding.id]: event.target.value,
                                    }))
                                  }
                                >
                                  {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((priority) => (
                                    <MenuItem key={priority} value={priority}>
                                      {priority}
                                    </MenuItem>
                                  ))}
                                </TextField>
                                <TextField
                                  label="Due date (optional)"
                                  type="date"
                                  value={correctiveDueDates[finding.id] ?? ''}
                                  onChange={(event) =>
                                    setCorrectiveDueDates((current) => ({
                                      ...current,
                                      [finding.id]: event.target.value,
                                    }))
                                  }
                                  slotProps={{ inputLabel: { shrink: true } }}
                                />
                              </>
                            ) : null}
                            <TextField
                              required
                              multiline
                              minRows={2}
                              label="Corrective action rationale"
                              value={rationale}
                              onChange={(event) =>
                                setCorrectiveReasons((current) => ({
                                  ...current,
                                  [finding.id]: event.target.value,
                                }))
                              }
                            />
                            <Box>
                              <Button
                                variant="contained"
                                disabled={
                                  recordCorrectiveAction.isPending ||
                                  !rationale.trim() ||
                                  (required && !correctivePriorities[finding.id])
                                }
                                onClick={() => {
                                  const priority = correctivePriorities[finding.id];
                                  const dueDate = correctiveDueDates[finding.id];
                                  recordCorrectiveAction.mutate({
                                    findingId: finding.id,
                                    correctiveActionRequired: required,
                                    ...(required && priority ? { priority } : {}),
                                    ...(required && dueDate
                                      ? { dueAt: new Date(`${dueDate}T23:59:59`).toISOString() }
                                      : {}),
                                    rationale: rationale.trim(),
                                  });
                                }}
                              >
                                Record corrective action
                              </Button>
                            </Box>
                          </>
                        )}
                      </Stack>
                    </Paper>
                  );
                })}

                <Box>
                  <Button
                    variant="contained"
                    disabled={
                      completeCorrectiveHandoff.isPending || correctiveActionPending.length > 0
                    }
                    onClick={() => completeCorrectiveHandoff.mutate()}
                  >
                    {completeCorrectiveHandoff.isPending
                      ? 'Handing off…'
                      : 'Complete corrective handoff to MF4'}
                  </Button>
                </Box>
                {correctiveActionPending.length > 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    {correctiveActionPending.length} finding(s) still need an outcome. Every official
                    finding carries an explicit outcome before the handoff.
                  </Typography>
                ) : null}
              </Stack>
            )}

            <MutationProblemAlert
              error={
                recordCorrectiveAction.error ??
                completeCorrectiveHandoff.error ??
                declareNoCorrectiveWork.error
              }
              isError={
                recordCorrectiveAction.isError ||
                completeCorrectiveHandoff.isError ||
                declareNoCorrectiveWork.isError
              }
              fallbackMessage="Could not record the corrective outcome."
            />

            {(completeCorrectiveHandoff.isSuccess || declareNoCorrectiveWork.isSuccess) && (
              <Alert severity="success">
                Corrective outcome recorded. Inspection status:{' '}
                {(completeCorrectiveHandoff.data ?? declareNoCorrectiveWork.data)?.inspectionStatus}.
              </Alert>
            )}
          </Stack>
        )}
      </Paper>
    </Stack>
  );
}
