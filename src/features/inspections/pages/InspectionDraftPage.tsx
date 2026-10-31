import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
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
  useSubmitReportVersion,
  useVerifyReportVersion,
  useWithdrawReportVersion,
  useReinspectionVerifications,
} from '../hooks/useInspections';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { DraftProgressTracker } from '../components/DraftProgressTracker';
import { AiMotionFigure } from '../components/AiMotionFigure';
import { ReportAuthoringPanel } from '@/features/reports/components/ReportAuthoringPanel';
import type { ReportSectionValues } from '@/features/reports/components/ReportSectionForm';
import { useLocale } from '@/shared/i18n/LocaleProvider';

const NEXT_STEP: Record<string, string> = {
  DRAFT: 'Review and edit the report sections below, then click Submit when ready.',
  AUTHOR_VERIFIED: 'Report verified. Submit the report for Platform Manager review.',
  SUBMITTED: 'Submitted for Platform Manager review. Report sections and sources are locked while awaiting review.',
  RETURNED: 'Returned for revision. Update the sections and submit again.',
  APPROVED: 'Approved by the Platform Manager and awaiting immutable PDF publication.',
  PUBLISHED: 'Published. This report version and its PDF are immutable.',
  SUPERSEDED: 'Superseded by a newer published version.',
};

/**
 * Step 4: Report Synthesis — unified in-place report creation, section authoring,
 * PDF preview/download, and author verification/submission/withdrawal.
 */
export default function InspectionDraftPage() {
  const { t } = useLocale();
  const { onReportDirtyChange } = useOutletContext<{ onReportDirtyChange?: (dirty: boolean) => void }>();
  const { inspectionId = '' } = useParams();
  const isInspector = useAuthStore((state) => state.roles.includes('INSPECTOR'));
  const userId = useAuthStore((state) => state.user?.id ?? state.userId);

  const workflow = useInspectionWorkflowState(inspectionId);
  const versions = useReportVersions(inspectionId);
  const findings = useInspectionFindings(inspectionId);
  const evidence = useInspectionEvidence(inspectionId);
  const reinspectionVerifications = useReinspectionVerifications(inspectionId);

  const createDraft = useGenerateReportDraft(inspectionId);
  const authorManualDraft = useAuthorManualDraft(inspectionId);
  const verify = useVerifyReportVersion(inspectionId);
  const submit = useSubmitReportVersion(inspectionId);
  const withdraw = useWithdrawReportVersion(inspectionId);

  const [openVersionId, setOpenVersionId] = useState<string | null>(null);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);

  const versionList = versions.data ?? [];
  const openVersion =
    versionList.find((v) => v.id === openVersionId) ??
    versionList[0] ??
    null;

  const inspectionStatus = workflow.data?.status ?? '';
  const findingsConfirmed =
    Boolean(workflow.data?.findingsSnapshotHash) &&
    ['FIELD_COMPLETED', 'UNDER_REVIEW', 'COMPLETED'].includes(
      inspectionStatus,
    );
  const isPublished = inspectionStatus === 'COMPLETED';
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

  const handleSaveSections = async (_sections: ReportSectionValues) => {
    // Report sections are derived automatically from confirmed records.
  };

  return (
    <Stack className="trace-ledger-workspace" spacing={2}>
      {!isInspector && (
        <Alert severity="info" sx={{ borderRadius: '12px' }}>
          {t('Organization Manager review actions are available on the Review report tab. This stage is retained for read-only status and version history.')}
        </Alert>
      )}

      {(isInspector || openVersion) && (
        <Paper
          variant="outlined"
          className="trace-stage-panel"
          sx={{
            p: { xs: 2, sm: 2.5 },
            borderRadius: '8px',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Stack spacing={1.5}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={1.5}
              sx={{ alignItems: { xs: 'flex-start', md: 'center' }, justifyContent: 'space-between' }}
            >
              <Box>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary' }}>
                    {openVersion ? `${t('Version')} ${openVersion.versionNo}` : t('Create report draft')}
                  </Typography>
                  {openVersion && (
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
                  )}
                  {versionList.length > 1 &&
                    versionList.map((version) => {
                      const isSelected = openVersion?.id === version.id;
                      return (
                        <Chip
                          key={version.id}
                          size="small"
                          label={`v${version.versionNo} · ${version.status}`}
                          variant={isSelected ? 'filled' : 'outlined'}
                          color={isSelected ? 'primary' : 'default'}
                          onClick={() => setOpenVersionId(version.id)}
                          sx={{ cursor: 'pointer', fontWeight: 600, borderRadius: '8px' }}
                        />
                      );
                    })}
                </Stack>
                {!openVersion && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                    {t(
                      'Generate the report from your confirmed findings, evidence, and field records.',
                    )}
                  </Typography>
                )}
              </Box>

              {isInspector && (
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                  {openVersion && isAuthor && !sourcesChangedAfterVersion && (openVersion.status === 'DRAFT' || openVersion.status === 'AUTHOR_VERIFIED' || canEditReturnedText) && (
                    <Button
                      variant="contained"
                      color="primary"
                      disabled={submit.isPending}
                      onClick={() => setConfirmSubmitOpen(true)}
                      sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                    >
                      {submit.isPending ? t('Submitting…') : t('Submit for review')}
                    </Button>
                  )}

                  {canWithdrawSubmission && openVersion && (
                    <Button
                      variant="outlined"
                      color="warning"
                      disabled={withdraw.isPending}
                      onClick={() => withdraw.mutate({ versionId: openVersion.id })}
                      sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                    >
                      {withdraw.isPending ? t('Withdrawing…') : t('Withdraw submission and revise')}
                    </Button>
                  )}

                  <Button
                    variant={openVersion && !sourcesChangedAfterVersion ? 'outlined' : 'contained'}
                    size={openVersion ? 'small' : 'medium'}
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
                    {createDraft.isPending ? t('Compiling report…') : t('Generate report draft')}
                  </Button>
                </Stack>
              )}
            </Stack>

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
              <Alert severity="warning" sx={{ borderRadius: '10px' }}>
                {t(
                  'Findings were reconfirmed after Version ' +
                    (openVersion?.versionNo ?? 1) +
                    ' was created. Generate a new draft version above to include your latest changes.',
                )}
              </Alert>
            ) : openVersion ? (
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
                {t(NEXT_STEP[openVersion.status] ?? openVersion.status)}
                {openVersion.returnReason ? ` — ${t('Reason:')} ${openVersion.returnReason}` : ''}
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
      )}

      {versionList.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 2.5, sm: 3 },
            borderRadius: '16px',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            textAlign: 'center',
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
            {t('No report version yet')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {t(
              'Once findings are confirmed in Step 3, generate an AI-assisted draft or create a blank manual draft above to author the report here.',
            )}
          </Typography>
        </Paper>
      ) : (
        openVersion && (
          <ReportAuthoringPanel
            key={openVersion.id}
            version={openVersion}
            findings={findings.data ?? []}
            evidenceList={(evidence.data ?? []).filter((item) => !item.isDeleted)}
            inspectionId={inspectionId}
            canEdit={canEditOpenVersion}
            onSaveSections={handleSaveSections}
            onDirtyChange={onReportDirtyChange}
            reinspectionVerifications={reinspectionVerifications.data}
          />
        )
      )}

      <ConfirmDialog
        open={confirmSubmitOpen}
        title={t('Confirm Report Submission')}
        cancelLabel={t('Cancel')}
        confirmLabel={t('Confirm and Submit')}
        loading={submit.isPending}
        maxWidth="sm"
        onCancel={() => setConfirmSubmitOpen(false)}
        onConfirm={() => {
          if (openVersion) {
            submit.mutate(openVersion.id, {
              onSuccess: () => setConfirmSubmitOpen(false),
            });
          }
        }}
      >
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Alert severity="info" sx={{ borderRadius: '8px' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
              {t('Inspector Professional Accountability')}
            </Typography>
            <Typography variant="body2">
              {t(
                'As the inspecting author, by submitting this report you certify that all observations, technical assessments, defect classifications, and field evidence have been thoroughly reviewed and verified in accordance with technical standards.',
              )}
            </Typography>
          </Alert>

          <Alert severity="warning" sx={{ borderRadius: '8px' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
              {t('Audit & Review Notice')}
            </Typography>
            <Typography variant="body2">
              {t(
                'Upon submission, this report version, along with all associated evidence and findings, will be locked from further edits while awaiting Platform Manager review. Changes can only be made if the report is returned with requested revisions.',
              )}
            </Typography>
          </Alert>
        </Stack>
      </ConfirmDialog>
    </Stack>
  );
}
