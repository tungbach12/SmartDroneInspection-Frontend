import { useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import EditNoteRounded from '@mui/icons-material/EditNoteRounded';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getErrorMessage } from '@/shared/api/errorMessage';
import { isConflict } from '@/shared/api/problem';
import { MutationProblemAlert } from '@/shared/ui/MutationProblemAlert';
import {
  useAuthorManualDraft,
  useGenerateReportDraft,
  useInspectionEvidence,
  useInspectionFindings,
  useInspectionWorkflowState,
  useReportVersions,
  useSaveReportSections,
  useSubmitReportVersion,
  useVerifyReportVersion,
  useWithdrawReportVersion,
} from '../hooks/useInspections';
import { DraftProgressTracker } from '../components/DraftProgressTracker';
import { AiMotionFigure } from '../components/AiMotionFigure';
import { ReportAuthoringPanel } from '@/features/reports/components/ReportAuthoringPanel';
import type { ReportSectionValues } from '@/features/reports/components/ReportSectionForm';
import { useLocale } from '@/shared/i18n/LocaleProvider';

const NEXT_STEP: Record<string, string> = {
  DRAFT: 'Edit the report sections below, then click Verify as author when ready.',
  AUTHOR_VERIFIED: 'Author-verified. Submit the report for Organization Manager review.',
  SUBMITTED: 'Submitted for Organization Manager review. Report sections and sources are locked while awaiting review.',
  RETURNED: 'Returned for revision. Update the sections and re-verify, or create a new version if findings changed.',
  APPROVED: 'Approved by the Organization Manager and awaiting immutable PDF publication.',
  PUBLISHED: 'Published. This report version and its PDF are immutable.',
  SUPERSEDED: 'Superseded by a newer published version.',
};

/**
 * Step 4: Report Synthesis — unified in-place report creation, section authoring,
 * PDF preview/download, and author verification/submission/withdrawal.
 */
export default function InspectionDraftPage() {
  const { t } = useLocale();
  const { inspectionId = '' } = useParams();
  const isInspector = useAuthStore((state) => state.roles.includes('INSPECTOR'));
  const userId = useAuthStore((state) => state.user?.id ?? state.userId);

  const workflow = useInspectionWorkflowState(inspectionId);
  const versions = useReportVersions(inspectionId);
  const findings = useInspectionFindings(inspectionId);
  const evidence = useInspectionEvidence(inspectionId);

  const createDraft = useGenerateReportDraft(inspectionId);
  const authorManualDraft = useAuthorManualDraft(inspectionId);
  const saveSections = useSaveReportSections(inspectionId);
  const verify = useVerifyReportVersion(inspectionId);
  const submit = useSubmitReportVersion(inspectionId);
  const withdraw = useWithdrawReportVersion(inspectionId);

  const [openVersionId, setOpenVersionId] = useState<string | null>(null);

  const versionList = versions.data ?? [];
  const openVersion =
    versionList.find((v) => v.id === openVersionId) ??
    versionList[0] ??
    null;

  const inspectionStatus = workflow.data?.status ?? '';
  const findingsConfirmed =
    Boolean(workflow.data?.findingsSnapshotHash) &&
    ['REPORT_DRAFT', 'REPORT_PUBLISHED', 'REPAIR_PENDING', 'COMPLETED'].includes(
      inspectionStatus,
    );
  const isPublished = ['REPORT_PUBLISHED', 'REPAIR_PENDING', 'COMPLETED'].includes(
    inspectionStatus,
  );
  const latestStatus = versionList[0]?.status;
  const isLockedInReview =
    latestStatus === 'SUBMITTED' ||
    latestStatus === 'APPROVED' ||
    latestStatus === 'PUBLISHED';

  const isAuthor = Boolean(
    openVersion && (!openVersion.authorUserId || userId === openVersion.authorUserId),
  );
  const canWithdrawSubmission = Boolean(
    isInspector &&
      isAuthor &&
      openVersion?.status === 'SUBMITTED' &&
      openVersion.reviewerUserId == null &&
      openVersion.reviewedAt == null,
  );
  const canEditReturnedText = Boolean(
    isInspector && isAuthor && openVersion?.status === 'RETURNED',
  );
  const currentFindingsConfirmationAt =
    workflow.data?.findingsConfirmedAt ?? openVersion?.reportContext?.findingsConfirmedAt;
  const sourcesChangedAfterVersion = Boolean(
    openVersion &&
      ((inspectionStatus === 'FIELD_COMPLETED' &&
        workflow.data?.findingsConfirmedAt == null) ||
        (currentFindingsConfirmationAt &&
          openVersion.createdAt &&
          new Date(currentFindingsConfirmationAt).getTime() >
            new Date(openVersion.createdAt).getTime())),
  );
  const canEditOpenVersion = Boolean(
    isInspector &&
      isAuthor &&
      !sourcesChangedAfterVersion &&
      (openVersion?.status === 'DRAFT' || openVersion?.status === 'RETURNED'),
  );

  const handleSaveSections = async (sections: ReportSectionValues) => {
    if (!openVersion) return;
    await saveSections.mutateAsync({
      versionId: openVersion.id,
      sections: {
        ...sections,
        overallCondition: sections.overallCondition || null,
      },
    });
    await versions.refetch();
  };

  return (
    <Stack spacing={2.5}>
      {!isInspector && (
        <Alert severity="info" sx={{ borderRadius: '12px' }}>
          Organization Manager review actions are available on the Review report tab. This stage is
          retained for read-only status and version history.
        </Alert>
      )}

      {isInspector && (
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 2, sm: 2.5 },
            borderRadius: '16px',
            borderColor: '#e2e8f0',
          }}
        >
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            sx={{ alignItems: { xs: 'flex-start', md: 'center' }, justifyContent: 'space-between' }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                {versionList.length > 0 ? t('Create new report version') : t('Create report draft')}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {t(
                  'Generate an AI-assisted draft from your confirmed findings and field records, or start a blank structured draft.',
                )}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1.25} sx={{ flexWrap: 'wrap', gap: 1 }}>
              <Button
                variant="contained"
                disabled={
                  !isInspector ||
                  isPublished ||
                  isLockedInReview ||
                  createDraft.isPending ||
                  !findingsConfirmed
                }
                startIcon={
                  createDraft.isPending ? (
                    <AiMotionFigure name="draftBurst" size={20} />
                  ) : (
                    <AutoAwesomeOutlined fontSize="small" />
                  )
                }
                onClick={() => createDraft.mutate()}
                sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
              >
                {createDraft.isPending ? 'Compiling report…' : 'Generate report draft'}
              </Button>

              <Button
                variant="outlined"
                disabled={
                  !isInspector ||
                  isPublished ||
                  isLockedInReview ||
                  !findingsConfirmed ||
                  authorManualDraft.isPending
                }
                startIcon={
                  authorManualDraft.isPending ? (
                    <AiMotionFigure name="draftRibbon" size={18} />
                  ) : (
                    <EditNoteRounded fontSize="small" />
                  )
                }
                onClick={() => authorManualDraft.mutate({})}
                sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
              >
                {authorManualDraft.isPending ? 'Creating draft…' : 'Create manual draft'}
              </Button>
            </Stack>
          </Stack>

          <Stack spacing={1.5} sx={{ mt: 1.5 }}>
            {isPublished ? (
              <Alert severity="success" sx={{ borderRadius: '10px' }}>
                {t('The report has been published. This version is immutable.')}
              </Alert>
            ) : !findingsConfirmed ? (
              <Alert
                severity="info"
                sx={{ borderRadius: '10px' }}
                action={
                  <Button component={RouterLink} to="../findings" color="inherit" size="small">
                    {t('Go to Findings')}
                  </Button>
                }
              >
                {t(
                  'Confirm the reviewed findings in Step 3 before creating or updating a report draft.',
                )}
              </Alert>
            ) : sourcesChangedAfterVersion ? (
              <Alert severity="info" sx={{ borderRadius: '10px' }}>
                {t(
                  'Findings were reconfirmed after Version ' +
                    (openVersion?.versionNo ?? 1) +
                    ' was created. Generate a new draft version above to include your latest changes.',
                )}
              </Alert>
            ) : null}

            {createDraft.isPending && <DraftProgressTracker />}
            {createDraft.isSuccess && (
              <Alert severity="success" sx={{ borderRadius: '10px' }}>
                {t('Report draft created. Review and edit the sections below.')}
              </Alert>
            )}
            {createDraft.isError && (
              <Alert severity="warning" sx={{ borderRadius: '10px' }}>
                {getErrorMessage(createDraft.error, 'The report draft was not created.')}
              </Alert>
            )}
            {authorManualDraft.isError && (
              <Alert severity="error" sx={{ borderRadius: '10px' }}>
                {getErrorMessage(authorManualDraft.error, 'The structured draft was not saved.')}
              </Alert>
            )}
          </Stack>
        </Paper>
      )}

      {versionList.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 2.5, sm: 3 },
            borderRadius: '16px',
            borderColor: '#e2e8f0',
            textAlign: 'center',
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a' }}>
            {t('No report version yet')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {t(
              'Once findings are confirmed in Step 3, generate an AI-assisted draft or create a blank manual draft above to author the report here.',
            )}
          </Typography>
        </Paper>
      ) : (
        <>
          {versionList.length > 1 && (
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: '14px',
                borderColor: '#e2e8f0',
                bgcolor: '#ffffff',
              }}
            >
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="body2" sx={{ color: '#475467', fontWeight: 700 }}>
                  {t('Report versions:')}
                </Typography>
                {versionList.map((version) => {
                  const isSelected = openVersion?.id === version.id;
                  return (
                    <Chip
                      key={version.id}
                      label={`v${version.versionNo} · ${version.status}`}
                      variant={isSelected ? 'filled' : 'outlined'}
                      color={isSelected ? 'primary' : 'default'}
                      onClick={() => setOpenVersionId(version.id)}
                      sx={{ cursor: 'pointer', fontWeight: 600, borderRadius: '8px' }}
                    />
                  );
                })}
              </Stack>
            </Paper>
          )}

          {openVersion && (
            <>
              <Paper
                variant="outlined"
                sx={{
                  p: { xs: 2, sm: 2.5 },
                  borderRadius: '16px',
                  borderColor: '#e2e8f0',
                  bgcolor: '#ffffff',
                }}
              >
                <Stack spacing={1.75}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1.5}
                    sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between' }}
                  >
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>
                        {t('Version')} {openVersion.versionNo}
                      </Typography>
                      <Chip
                        size="small"
                        label={openVersion.status}
                        color={
                          openVersion.status === 'PUBLISHED' || openVersion.status === 'APPROVED'
                            ? 'success'
                            : openVersion.status === 'RETURNED'
                              ? 'warning'
                              : 'primary'
                        }
                        sx={{ fontWeight: 700 }}
                      />
                    </Stack>

                    {isInspector && isAuthor && (
                      <Stack direction="row" spacing={1.25} sx={{ flexWrap: 'wrap', gap: 1 }}>
                        {!sourcesChangedAfterVersion &&
                          (openVersion.status === 'DRAFT' || canEditReturnedText) && (
                            <Button
                              variant="contained"
                              disabled={verify.isPending}
                              onClick={() => verify.mutate(openVersion.id)}
                              sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                            >
                              {verify.isPending ? 'Verifying…' : 'Verify as author'}
                            </Button>
                          )}

                        {!sourcesChangedAfterVersion && openVersion.status === 'AUTHOR_VERIFIED' && (
                          <Button
                            variant="contained"
                            color="success"
                            disabled={submit.isPending}
                            onClick={() => submit.mutate(openVersion.id)}
                            sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                          >
                            {submit.isPending ? 'Submitting…' : 'Submit for review'}
                          </Button>
                        )}

                        {canWithdrawSubmission && (
                          <Button
                            variant="outlined"
                            color="warning"
                            disabled={withdraw.isPending}
                            onClick={() => withdraw.mutate({ versionId: openVersion.id })}
                            sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                          >
                            {withdraw.isPending ? 'Withdrawing…' : 'Withdraw submission and revise'}
                          </Button>
                        )}
                      </Stack>
                    )}
                  </Stack>

                  <Alert
                    severity={
                      openVersion.status === 'PUBLISHED'
                        ? 'success'
                        : openVersion.status === 'RETURNED'
                          ? 'warning'
                          : 'info'
                    }
                    sx={{ borderRadius: '10px' }}
                  >
                    {NEXT_STEP[openVersion.status] ?? openVersion.status}
                    {openVersion.returnReason ? ` — Reason: ${openVersion.returnReason}` : ''}
                  </Alert>

                  {verify.isError && (
                    <MutationProblemAlert
                      error={verify.error}
                      isError
                      fallbackMessage={
                        isConflict(verify.error)
                          ? t(
                              'The server refused this verification. Confirm findings in Step 3 and create a new draft version if evidence or findings changed.',
                            )
                          : t('Could not verify this report draft.')
                      }
                    />
                  )}
                  {submit.isError && (
                    <MutationProblemAlert
                      error={submit.error}
                      isError
                      fallbackMessage={
                        isConflict(submit.error)
                          ? t(
                              'The server refused this submission. Confirm findings in Step 3 and create a new draft version if evidence or findings changed.',
                            )
                          : t('Could not submit this report draft.')
                      }
                    />
                  )}
                  {withdraw.isError && (
                    <MutationProblemAlert
                      error={withdraw.error}
                      isError
                      fallbackMessage={t('Could not withdraw this submission.')}
                    />
                  )}
                </Stack>
              </Paper>

              <ReportAuthoringPanel
                key={openVersion.id}
                version={openVersion}
                findings={findings.data ?? []}
                evidenceList={(evidence.data ?? []).filter((item) => !item.isDeleted)}
                inspectionId={inspectionId}
                canEdit={canEditOpenVersion}
                onSaveSections={handleSaveSections}
              />
            </>
          )}
        </>
      )}
    </Stack>
  );
}
