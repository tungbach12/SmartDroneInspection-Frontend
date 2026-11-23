import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import FlightTakeoffRounded from '@mui/icons-material/FlightTakeoffRounded';
import PictureAsPdfRounded from '@mui/icons-material/PictureAsPdfRounded';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getErrorMessage } from '@/shared/api/errorMessage';
import { isConflict } from '@/shared/api/problem';
import { MutationProblemAlert } from '@/shared/ui/MutationProblemAlert';
import {
  useAuthorManualDraft,
  useFieldSessions,
  useGenerateReportDraft,
  useInspection,
  useInspectionEvidence,
  useInspectionFindings,
  useInspectionWorkflowState,
  useReinspectionVerifications,
  useReportVersions,
  useSubmitReportVersion,
  useWithdrawReportVersion,
} from '../hooks/useInspections';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { useToastStore } from '@/shared/ui/Toast';
import { DraftProgressTracker } from '../components/DraftProgressTracker';
import { StepActionBar } from '../components/StepActionBar';
import { getOrGeneratePersistedAiSummary } from '@/features/reports/components/ReportAiSummaryCard';
import { ReportAuthoringPanel } from '@/features/reports/components/ReportAuthoringPanel';
import { ReportDerivedSections } from '@/features/reports/components/ReportDerivedSections';
import { FlightOperationsReportView } from '@/features/reports/components/FlightOperationsReportView';
import type { InspectionReport } from '../api/inspectionApi';
import { summarizeVerdictExpiry } from '../lib/verdictExpiry';
import type { ReinspectionVerificationItem } from '../api/inspectionApi';
import { useLocale } from '@/shared/i18n/LocaleProvider';

const NEXT_STEP: Record<string, string> = {
  SUBMITTED: 'Submitted for Manager review. Report sections and sources are locked while awaiting review.',
  RETURNED: 'Returned for revision. Re-evaluate findings and submit again.',
  APPROVED: 'Approved by the Manager and awaiting immutable PDF publication.',
  PUBLISHED: 'Published. This report version and its PDF are immutable.',
  SUPERSEDED: 'Superseded by a newer published version.',
};

/**
 * Step 7: Report Synthesis — automated compilation from confirmed findings,
 * submission for Manager review, and version history.
 */
export default function InspectionReportPage() {
  const { t, locale } = useLocale();
  const showToast = useToastStore((state) => state.showToast);
  const outletContext = useOutletContext<{ onReportDirtyChange?: (dirty: boolean) => void }>() as
    | { onReportDirtyChange?: (dirty: boolean) => void }
    | null;
  const onReportDirtyChange = outletContext?.onReportDirtyChange;
  const { inspectionId = '' } = useParams();
  const isInspector = useAuthStore((state) => state.roles.includes('INSPECTOR'));
  const userId = useAuthStore((state) => state.user?.id ?? state.userId);

  const workflow = useInspectionWorkflowState(inspectionId);
  const versions = useReportVersions(inspectionId);
  const findings = useInspectionFindings(inspectionId);
  const evidence = useInspectionEvidence(inspectionId);
  const reinspectionVerifications = useReinspectionVerifications?.(inspectionId);
  const fieldSessionsQuery = useFieldSessions?.(inspectionId);

  const createDraft = useGenerateReportDraft(inspectionId);
  const authorManualDraft = useAuthorManualDraft(inspectionId);
  const submit = useSubmitReportVersion(inspectionId);
  const withdraw = useWithdrawReportVersion(inspectionId);

  const [openVersionId, setOpenVersionId] = useState<string | null>(null);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [activeDocTab, setActiveDocTab] = useState<'inspection' | 'flight'>('inspection');

  const versionList = versions.data ?? [];
  const openVersion =
    versionList.find((v) => v.id === openVersionId) ??
    versionList[0] ??
    null;

  const inspectionStatus = workflow.data?.status ?? '';
  const findingsConfirmed =
    Boolean(workflow.data?.findingsConfirmedAt) &&
    ['FIELD_COMPLETED', 'UNDER_REVIEW', 'COMPLETED'].includes(inspectionStatus);

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
    isInspector && isAuthor && !sourcesChangedAfterVersion && openVersion?.status === 'RETURNED',
  );

  const isSubmitting = createDraft.isPending || submit.isPending;

  const inspectionQuery = useInspection?.(inspectionId);
  const inspectionData = inspectionQuery?.data;
  const fieldSessionItems = fieldSessionsQuery?.data ?? [];
  const latestFieldSessionId =
    openVersion?.reportContext?.fieldSessions?.at(-1)?.id ??
    fieldSessionItems.at(-1)?.id ??
    null;

  const activeEvidenceList = useMemo(
    () => (evidence.data ?? []).filter((item) => !item.isDeleted),
    [evidence.data],
  );

  const draftPreviewVersion: InspectionReport = useMemo(() => {
    const verifications = reinspectionVerifications?.data ?? [];
    const isReinspection =
      inspectionData?.inspectionType === 'RE_INSPECTION' || verifications.length > 0;
    const resolvedCount = verifications.filter((v) => v.resolutionStatus === 'RESOLVED').length;
    const unresolvedCount = verifications.filter((v) => v.resolutionStatus === 'UNRESOLVED').length;
    const inconclusiveCount = verifications.filter((v) => v.resolutionStatus === 'INCONCLUSIVE').length;

    const autoSummary = getOrGeneratePersistedAiSummary({
      inspectionId,
      assetName: inspectionData?.assetName,
      findings: findings.data ?? [],
      evidenceList: activeEvidenceList,
      evidenceCount: activeEvidenceList.length,
      locale,
      persist: findingsConfirmed && !findings.isLoading,
    }).summaryData.summary;

    const reinspectionSummary =
      locale === 'vi'
        ? `Báo cáo bay kiểm tra lại đối chiếu Trước ↔ Sau cho công trình ${inspectionData?.assetName || 'công trình'}. Đã đối soát ${verifications.length} khuyết tật mục tiêu (${resolvedCount} ĐÃ KHẮC PHỤC${unresolvedCount > 0 ? `, ${unresolvedCount} CHƯA KHẮC PHỤC` : ''}${inconclusiveCount > 0 ? `, ${inconclusiveCount} CHƯA KẾT LUẬN` : ''}) cùng ${activeEvidenceList.length} bằng chứng bay lại.`
        : `Post-remediation re-inspection Before vs After verification report for ${inspectionData?.assetName || 'the inspected structure'}. Verified ${verifications.length} target defect(s) (${resolvedCount} RESOLVED${unresolvedCount > 0 ? `, ${unresolvedCount} UNRESOLVED` : ''}${inconclusiveCount > 0 ? `, ${inconclusiveCount} INCONCLUSIVE` : ''}) with ${activeEvidenceList.length} field evidence capture(s).`;

    return {
      id: `preview-${inspectionId}`,
      inspectionReportId: `preview-${inspectionId}`,
      versionNo: 1,
      status: 'DRAFT',
      authorUserId: userId ?? '',
      submittedAt: null,
      reviewerUserId: null,
      reviewedAt: null,
      returnReason: null,
      publishedAt: null,
      createdAt: new Date().toISOString(),
      summary: isReinspection ? reinspectionSummary : autoSummary,
      omissionDisclosure: null,
      reportContext: {
        organizationName: null,
        assetCode: null,
        assetName: inspectionData?.assetName ?? null,
        assetLocation: inspectionData?.locationText ?? null,
        assetCategory: null,
        assignedDrone: inspectionData?.droneSerialNumber
          ? {
              serialNumber: inspectionData.droneSerialNumber,
              manufacturer: null,
              model: inspectionData.droneModel ?? null,
            }
          : null,
        inspectionItems: inspectionData?.inspectionItems ?? null,
        flightPermitFileName: inspectionData?.flightPermitFileName ?? null,
        flightPermitUploadedAt: inspectionData?.flightPermitUploadedAt ?? null,
        fieldSessions: fieldSessionItems.map((s) => ({
          id: s.id,
          status: s.status,
          startedAt: s.startedAt,
          endedAt: s.endedAt,
          preFlightChecklistNote: s.preFlightChecklistNote,
          postponementReason: s.postponementReason,
          abortReason: s.abortReason,
          outcomeNotes: s.outcomeNotes,
          droneSerialNumber: inspectionData?.droneSerialNumber ?? null,
          droneManufacturer: null,
          droneModel: inspectionData?.droneModel ?? null,
        })),
        reviewerQualificationDisclosure: null,
        findingsConfirmedAt: workflow.data?.findingsConfirmedAt ?? null,
      },
    };
  }, [
    inspectionId,
    userId,
    findings.data,
    findings.isLoading,
    findingsConfirmed,
    activeEvidenceList,
    reinspectionVerifications?.data,
    inspectionData,
    workflow.data,
    fieldSessionItems,
    locale,
  ]);

  return (
    <Stack className="trace-ledger-workspace" spacing={2}>
      {openVersion && <VerdictExpiryBanner verifications={reinspectionVerifications?.data} />}
      {!isInspector && (
        <Alert severity="info" sx={{ borderRadius: '12px' }}>
          {t('Manager review actions are available on the Review report tab. This stage is retained for read-only status and version history.')}
        </Alert>
      )}

      {openVersion && (
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
                  <Typography variant="h6" component="h2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                    {`${t('Version')} ${openVersion.versionNo}`}
                  </Typography>
                  <Chip
                    size="small"
                    variant={openVersion.status === 'PUBLISHED' ? 'outlined' : 'filled'}
                    label={openVersion.status}
                    color={
                      openVersion.status === 'PUBLISHED'
                        ? 'success'
                        : openVersion.status === 'RETURNED'
                          ? 'warning'
                          : 'primary'
                    }
                    sx={
                      openVersion.status === 'PUBLISHED'
                        ? {
                            fontWeight: 700,
                            bgcolor: '#ECFDF5',
                            borderColor: '#A7F3D0',
                            color: '#047857',
                          }
                        : { fontWeight: 700 }
                    }
                  />
                  {openVersion.status === 'PUBLISHED' && (
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                      {t('The report has been published. This version is immutable.')}
                    </Typography>
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
              </Box>
            </Stack>

            {openVersion.status === 'PUBLISHED' ? null : !findingsConfirmed ? (
              <Alert
                severity="info"
                sx={{ borderRadius: '10px' }}
                action={
                  <Button component={RouterLink} to="../findings" color="inherit" size="small">
                    {t('Go to Findings')}
                  </Button>
                }
              >
                {t('Confirm the reviewed findings before compiling the report.')}
              </Alert>
            ) : sourcesChangedAfterVersion ? (
              <Alert severity="warning" sx={{ borderRadius: '10px' }}>
                {t(
                  'Findings were reconfirmed after Version ' +
                    openVersion.versionNo +
                    ' was created. A new report version will be compiled to include your latest changes.',
                )}
              </Alert>
            ) : (
              <Alert
                severity={openVersion.status === 'RETURNED' ? 'warning' : 'info'}
                sx={{ borderRadius: '10px' }}
              >
                {t(NEXT_STEP[openVersion.status] ?? openVersion.status)}
                {openVersion.returnReason ? ` — ${t('Reason:')} ${openVersion.returnReason}` : ''}
              </Alert>
            )}

            {createDraft.isPending && <DraftProgressTracker />}
            {createDraft.isError && (
              <Alert severity="warning" sx={{ borderRadius: '10px' }}>
                {getErrorMessage(createDraft.error, 'The report was not generated.')}
              </Alert>
            )}
            {authorManualDraft.isError && (
              <Alert severity="error" sx={{ borderRadius: '10px' }}>
                {getErrorMessage(authorManualDraft.error, 'The structured report was not saved.')}
              </Alert>
            )}
            {submit.isError && (
              <MutationProblemAlert
                error={submit.error}
                isError
                fallbackMessage={
                  isConflict(submit.error)
                    ? t('Submission blocked. Confirm findings and create a new report version if evidence or findings changed.')
                    : t('Could not submit this report.')
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

      {createDraft.isPending && versionList.length === 0 && (
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 2.5, sm: 3 },
            borderRadius: '10px',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <DraftProgressTracker />
        </Paper>
      )}

      {!createDraft.isPending && versionList.length === 0 ? (
        <Stack spacing={2}>
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 2, sm: 2.5 },
              borderRadius: '10px',
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}
          >
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              sx={{ alignItems: { xs: 'flex-start', md: 'center' }, justifyContent: 'space-between' }}
            >
              <Box>
                <Typography variant="h6" component="h2" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
                  {findingsConfirmed ? t('Review reports') : t('Report not ready')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {findingsConfirmed
                    ? t('Check both reports before submitting.')
                    : t('Confirm findings before compiling the reports.')}
                </Typography>
              </Box>

              {!findingsConfirmed && (
                <Button
                  component={RouterLink}
                  to="../findings"
                  variant="outlined"
                  sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                >
                  {t('Go to Findings')}
                </Button>
              )}
            </Stack>
          </Paper>

          {findingsConfirmed && (
            <Paper
              variant="outlined"
              sx={{
                p: { xs: 2.5, sm: 3 },
                borderRadius: '10px',
                borderColor: 'divider',
                bgcolor: 'background.paper',
              }}
            >
              <Tabs
                value={activeDocTab}
                onChange={(_, val: 'inspection' | 'flight') => setActiveDocTab(val)}
                sx={{ mb: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}
              >
                <Tab
                  value="inspection"
                  icon={<PictureAsPdfRounded fontSize="small" />}
                  iconPosition="start"
                  label={t('Findings report')}
                  sx={{ textTransform: 'none', fontWeight: 700 }}
                />
                <Tab
                  value="flight"
                  icon={<FlightTakeoffRounded fontSize="small" />}
                  iconPosition="start"
                  label={t('Flight operations')}
                  sx={{ textTransform: 'none', fontWeight: 700 }}
                />
              </Tabs>

              {activeDocTab === 'inspection' ? (
                <ReportDerivedSections
                  version={draftPreviewVersion}
                  findings={findings.data ?? []}
                  evidenceList={activeEvidenceList}
                  fieldSessions={fieldSessionsQuery?.data}
                  inspectionId={inspectionId}
                  reinspectionVerifications={reinspectionVerifications?.data}
                />
              ) : (
                <FlightOperationsReportView
                  inspectionId={inspectionId}
                  fieldSessionId={latestFieldSessionId}
                  version={draftPreviewVersion}
                  evidenceList={activeEvidenceList}
                  assetName={inspectionData?.assetName}
                  droneSummary={
                    [inspectionData?.droneModel, inspectionData?.droneSerialNumber]
                      .filter(Boolean)
                      .join(' · ') || null
                  }
                  flightPermitFileName={inspectionData?.flightPermitFileName}
                />
              )}
            </Paper>
          )}
        </Stack>
      ) : (
        openVersion && (
          <Box>
            <Paper
              variant="outlined"
              sx={{
                px: 2,
                pt: 1,
                borderRadius: '12px 12px 0 0',
                borderBottom: 0,
                borderColor: 'divider',
                bgcolor: 'background.paper',
              }}
            >
              <Tabs
                value={activeDocTab}
                onChange={(_, val: 'inspection' | 'flight') => setActiveDocTab(val)}
              >
                <Tab
                  value="inspection"
                  icon={<PictureAsPdfRounded fontSize="small" />}
                  iconPosition="start"
                  label={t('Findings report')}
                  sx={{ textTransform: 'none', fontWeight: 700 }}
                />
                <Tab
                  value="flight"
                  icon={<FlightTakeoffRounded fontSize="small" />}
                  iconPosition="start"
                  label={t('Flight operations')}
                  sx={{ textTransform: 'none', fontWeight: 700 }}
                />
              </Tabs>
            </Paper>

            <Box sx={{ '& > .MuiPaper-root': { borderTopLeftRadius: 0, borderTopRightRadius: 0 } }}>
              {activeDocTab === 'inspection' ? (
                <ReportAuthoringPanel
                  key={openVersion.id}
                  version={openVersion}
                  findings={findings.data ?? []}
                  evidenceList={activeEvidenceList}
                  fieldSessions={fieldSessionsQuery?.data}
                  inspectionId={inspectionId}
                  reinspectionVerifications={reinspectionVerifications?.data}
                  canEdit={canEditOpenVersion}
                  onDirtyChange={onReportDirtyChange}
                  droneSummary={
                    [inspectionData?.droneModel, inspectionData?.droneSerialNumber]
                      .filter(Boolean)
                      .join(' · ') || null
                  }
                  flightPermitFileName={
                    openVersion.reportContext?.flightPermitFileName ??
                    inspectionData?.flightPermitFileName
                  }
                />
              ) : (
                <FlightOperationsReportView
                  inspectionId={inspectionId}
                  fieldSessionId={latestFieldSessionId}
                  version={openVersion}
                  evidenceList={activeEvidenceList}
                  assetName={openVersion.reportContext?.assetName ?? inspectionData?.assetName}
                  flightPermitFileName={
                    openVersion.reportContext?.flightPermitFileName ??
                    inspectionData?.flightPermitFileName
                  }
                />
              )}
            </Box>
          </Box>
        )
      )}

      {isInspector && (
        <StepActionBar
          backTo="../findings"
          backLabel={t('Defect Findings')}
          secondaryActions={
            openVersion && canWithdrawSubmission ? (
              <Button
                variant="outlined"
                color="warning"
                disabled={withdraw.isPending}
                onClick={() => withdraw.mutate({ versionId: openVersion.id })}
                sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
              >
                {withdraw.isPending ? t('Withdrawing…') : t('Withdraw submission and revise')}
              </Button>
            ) : undefined
          }
          primaryAction={
            !createDraft.isPending && versionList.length === 0 && findingsConfirmed ? (
              <Button
                variant="contained"
                color="primary"
                size="medium"
                disabled={isSubmitting}
                onClick={() => setConfirmSubmitOpen(true)}
                sx={{
                  borderRadius: '8px',
                  px: 2.5,
                  py: 1,
                  textTransform: 'none',
                  fontWeight: 650,
                  whiteSpace: 'nowrap',
                }}
              >
                {isSubmitting ? t('Submitting…') : t('Submit for review')}
              </Button>
            ) : openVersion && isAuthor && canEditReturnedText ? (
              <Button
                variant="contained"
                color="primary"
                size="medium"
                disabled={isSubmitting}
                onClick={() => setConfirmSubmitOpen(true)}
                sx={{
                  borderRadius: '8px',
                  px: 2.5,
                  py: 1,
                  textTransform: 'none',
                  fontWeight: 650,
                  whiteSpace: 'nowrap',
                }}
              >
                {isSubmitting
                  ? t('Submitting…')
                  : sourcesChangedAfterVersion
                    ? t('Compile & submit new version')
                    : t('Submit for review')}
              </Button>
            ) : undefined
          }
        />
      )}

      <ConfirmDialog
        open={confirmSubmitOpen}
        title={t('Confirm Report Submission')}
        cancelLabel={t('Cancel')}
        confirmLabel={t('Confirm and Submit')}
        loading={isSubmitting}
        maxWidth="sm"
        onCancel={() => setConfirmSubmitOpen(false)}
        onConfirm={() => {
          if (
            openVersion &&
            openVersion.status === 'RETURNED' &&
            !sourcesChangedAfterVersion
          ) {
            submit.mutate(openVersion.id, {
              onSuccess: () => setConfirmSubmitOpen(false),
            });
          } else {
            createDraft.mutate(draftPreviewVersion.summary, {
              onSuccess: () => {
                setConfirmSubmitOpen(false);
                showToast(t('Report compiled successfully. Review the sections below.'));
              },
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
                'By submitting, I confirm I reviewed both reports and take responsibility for their contents.',
              )}
            </Typography>
          </Alert>

          <Alert severity="warning" sx={{ borderRadius: '8px' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
              {t('Audit & Review Notice')}
            </Typography>
            <Typography variant="body2">
              {t(
                'Reports and source records are locked during Manager review.',
              )}
            </Typography>
          </Alert>
        </Stack>
      </ConfirmDialog>
    </Stack>
  );
}

/**
 * Warns before the report stage fails. The backend blocks authoring, submission and publication
 * with `RESOLUTION_EXPIRED` once a RESOLVED re-inspection verdict lapses, so surface it here
 * instead of letting the Inspector discover it at the review gate.
 */
function VerdictExpiryBanner({
  verifications,
}: {
  verifications: ReinspectionVerificationItem[] | null | undefined;
}) {
  const { t, formatDateTime } = useLocale();
  const { expired, expiringSoon } = summarizeVerdictExpiry(verifications);

  if (expired.length > 0) {
    const earliest = expired
      .map((item) => item.validUntil)
      .filter((value): value is string => Boolean(value))
      .sort()[0];
    return (
      <Alert severity="error" sx={{ borderRadius: '8px' }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {t(
            '{count} RESOLVED re-inspection verdict(s) have expired. Re-verify those defects with fresh evidence before authoring, submitting or publishing this report.',
          ).replace('{count}', String(expired.length))}
        </Typography>
        {earliest && (
          <Typography variant="caption" sx={{ display: 'block', mt: 0.25 }}>
            {t('Earliest expiry').concat(`: ${formatDateTime(earliest)}`)}
          </Typography>
        )}
      </Alert>
    );
  }

  if (expiringSoon.length > 0) {
    const next = expiringSoon
      .map((item) => item.validUntil)
      .filter((value): value is string => Boolean(value))
      .sort()[0];
    return (
      <Alert severity="warning" sx={{ borderRadius: '8px' }}>
        {t(
          '{count} RESOLVED re-inspection verdict(s) expire within 14 days. Complete and publish this report before then, or re-verify the defects.',
        )
          .replace('{count}', String(expiringSoon.length))
          .concat(next ? ` ${t('Next expiry').concat(`: ${formatDateTime(next)}`)}` : '')}
      </Alert>
    );
  }

  return null;
}
