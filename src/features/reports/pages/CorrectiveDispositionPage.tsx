import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
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
  useDeclareNoCorrectiveWork,
  useInspectionFindings,
  useReportVersions,
} from '@/features/inspections/hooks/useInspections';

/**
 * Send to Maintenance: forward confirmed inspection findings to the maintenance team.
 *
 * <p>The administrator does not enter individual rationales, priorities, or due dates;
 * that triage belongs to the maintenance team. By default, all confirmed findings are selected
 * to forward as repair candidates. The administrator may deselect any items they wish to postpone.
 * Deselecting all items publishes the report without creating candidates; omitted findings can
 * still be forwarded later.
 */
export default function CorrectiveDispositionPage() {
  const { inspectionId = '' } = useParams<{ inspectionId: string }>();
  const roles = useAuthStore((state) => state.roles);
  const canReview = roles.includes('ORG_ADMIN');

  const versions = useReportVersions(inspectionId);
  const findings = useInspectionFindings(inspectionId);
  const completeCorrectiveHandoff = useCompleteCorrectiveHandoff(inspectionId);
  const declareNoCorrectiveWork = useDeclareNoCorrectiveWork(inspectionId);

  const publishedVersion =
    versions.data?.find((version) => version.status === 'PUBLISHED') ?? null;

  // Only Inspector-confirmed findings are official defects eligible for repair.
  const officialFindings = useMemo(
    () => (findings.data ?? []).filter((f) => f.status === 'CONFIRMED'),
    [findings.data],
  );

  const unforwardedFindings = useMemo(
    () => officialFindings.filter((f) => !f.repairRequired && f.correctiveActionReviewedByUserId == null),
    [officialFindings],
  );

  const alreadyForwardedFindings = useMemo(
    () => officialFindings.filter((f) => f.repairRequired || f.correctiveActionReviewedByUserId != null),
    [officialFindings],
  );

  // Selected findings to forward: default to all unforwarded findings.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (unforwardedFindings.length > 0) {
      setSelectedIds(new Set(unforwardedFindings.map((f) => f.id)));
    } else {
      setSelectedIds(new Set());
    }
  }, [unforwardedFindings]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(unforwardedFindings.map((f) => f.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleSend = () => {
    if (selectedIds.size === 0) return;
    completeCorrectiveHandoff.mutate(Array.from(selectedIds));
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
          Forward confirmed findings to the maintenance team as repair candidates. The maintenance team
          will triage, estimate, and create work orders. By default all findings are selected; you can
          deselect items you wish to postpone.
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

            {officialFindings.length === 0 ? (
              <Stack spacing={2}>
                <Alert severity="info">
                  This inspection has no confirmed defect findings. You can complete the inspection
                  without sending repair work to maintenance.
                </Alert>
                <Box>
                  <Button
                    variant="contained"
                    disabled={declareNoCorrectiveWork.isPending}
                    onClick={() => declareNoCorrectiveWork.mutate('No findings observed in inspected scope')}
                  >
                    {declareNoCorrectiveWork.isPending ? 'Closing…' : 'Complete inspection without repair'}
                  </Button>
                </Box>
              </Stack>
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
                                      {finding.locationDescription && (
                                        <Typography variant="caption" color="text.secondary">
                                          {finding.locationDescription}
                                        </Typography>
                                      )}
                                    </Stack>
                                    {finding.description && (
                                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                        {finding.description}
                                      </Typography>
                                    )}
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
                        disabled={completeCorrectiveHandoff.isPending || selectedIds.size === 0}
                        onClick={handleSend}
                      >
                        {completeCorrectiveHandoff.isPending
                          ? 'Forwarding to Maintenance…'
                          : `Send ${selectedIds.size} finding(s) to Maintenance`}
                      </Button>
                    </Box>

                    {selectedIds.size === 0 && (
                      <Alert severity="info">
                        No findings selected. The report remains published without sending items to maintenance.
                        You can return here anytime to forward findings later.
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
              error={completeCorrectiveHandoff.error ?? declareNoCorrectiveWork.error}
              isError={completeCorrectiveHandoff.isError || declareNoCorrectiveWork.isError}
              fallbackMessage="Could not forward findings to maintenance."
            />

            {(completeCorrectiveHandoff.isSuccess || declareNoCorrectiveWork.isSuccess) && (
              <Alert severity="success">
                Findings successfully forwarded to Maintenance. Inspection status:{' '}
                {(completeCorrectiveHandoff.data ?? declareNoCorrectiveWork.data)?.inspectionStatus}.
              </Alert>
            )}
          </Stack>
        )}
      </Paper>
    </Stack>
  );
}
