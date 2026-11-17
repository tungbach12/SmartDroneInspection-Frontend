import { useState } from 'react';
import { Link as RouterLink, useLocation, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { PageBreadcrumbs } from '@/shared/ui/PageBreadcrumbs';
import {
  getSectionPath,
  PORTAL_IDS,
  type PortalId,
} from '@/app/permissions/accessPolicy';
import { useAuthStore } from '@/features/auth/store/authStore';
import {
  useFieldSessions,
  useInspection,
  useInspectionEvidence,
  useInspectionFindings,
  useReinspectionVerifications,
  useReportPaymentStatus,
  useReportVersions,
  useReviewReportVersion,
} from '@/features/inspections/hooks/useInspections';
import { FlightPermitPreviewDialog } from '@/features/inspections/components/FlightPermitPreviewDialog';
import { FlightPermitVerificationPanel } from '@/features/inspections/components/FlightPermitVerificationPanel';
import { PlatformSettlementInvoiceCard } from '@/features/inspections/components/PlatformSettlementInvoiceCard';
import { FlightOperationsReportView } from '@/features/reports/components/FlightOperationsReportView';
import { ReportAiSummaryCard } from '@/features/reports/components/ReportAiSummaryCard';
import { ReportDeliverableTabs } from '@/features/reports/components/ReportDeliverableTabs';
import { EmptyState } from '@/shared/ui/EmptyState';
import { getErrorMessage } from '@/shared/api/errorMessage';
import { isConflict } from '@/shared/api/problem';
import { MutationProblemAlert, RefusalNotice } from '@/shared/ui/MutationProblemAlert';
import { QueryState } from '@/shared/ui/QueryState';
import { useLocale } from '@/shared/i18n/LocaleProvider';

export interface ManagerReportReviewPageProps {
  stage?: 'audit' | 'review' | 'settlement';
}

/**
 * Dedicated Report Review page for Platform Manager (/manager/inspections/:id/audit | /review | /settlement).
 * Focused strictly on reviewing submitted reports, publishing approved versions, and viewing platform commission.
 */
export default function ManagerReportReviewPage({
  stage,
}: ManagerReportReviewPageProps = {}) {
  const { t } = useLocale();
  const { inspectionId = '' } = useParams<{ inspectionId: string }>();
  const location = useLocation();
  const portal = (location.pathname.split('/').filter(Boolean)[0] ??
    PORTAL_IDS[0]) as PortalId;
  const roles = useAuthStore((state) => state.roles);
  const userId = useAuthStore((state) => state.userId);
  const canVerifyPermit = roles.includes('MANAGER') || roles.includes('ADMIN');
  const showAuditStage = stage === 'audit';
  const showReviewStage = !stage || stage === 'review';
  const showSettlementStage = !stage || stage === 'settlement';

  const [openVersionId, setOpenVersionId] = useState<string | null>(null);
  const [reviewReason, setReviewReason] = useState('');
  const [showReturnBox, setShowReturnBox] = useState(false);
  const [permitPreviewOpen, setPermitPreviewOpen] = useState(false);

  const inspectionQuery = useInspection(inspectionId);
  const fieldSessionsQuery = useFieldSessions(inspectionId);
  const versions = useReportVersions(inspectionId);
  const findings = useInspectionFindings(inspectionId);
  const evidence = useInspectionEvidence(inspectionId);
  const reinspectionVerifications = useReinspectionVerifications?.(inspectionId);
  const review = useReviewReportVersion(inspectionId);
  const paymentStatusQuery = useReportPaymentStatus(inspectionId);

  const openVersion =
    versions.data?.find((version) => version.id === openVersionId) ??
    versions.data?.[0] ??
    null;

  const isAuthor = Boolean(openVersion && userId === openVersion.authorUserId);
  const reportReadLoading =
    findings.isLoading || evidence.isLoading || Boolean(findings.error || evidence.error);

  const resolvedDroneSummary =
    [
      openVersion?.reportContext?.assignedDrone?.manufacturer,
      openVersion?.reportContext?.assignedDrone?.model ?? inspectionQuery.data?.droneModel,
      openVersion?.reportContext?.assignedDrone?.serialNumber ??
        inspectionQuery.data?.droneSerialNumber,
    ]
      .filter(Boolean)
      .join(' · ') || null;
  const resolvedPermitFileName =
    openVersion?.reportContext?.flightPermitFileName ??
    inspectionQuery.data?.flightPermitFileName ??
    null;

  const isEmbeddedInInspectionWorkspace = location.pathname.includes('/inspections/');

  return (
    <Box className="workspace-page workspace-page--reports" sx={{ width: '100%', maxWidth: '1440px', mx: 'auto' }}>
      {!isEmbeddedInInspectionWorkspace && (
        <Box sx={{ mb: 3 }}>
          <PageBreadcrumbs
            items={[
              { label: t('Dashboard'), to: getSectionPath(portal, 'dashboard') },
              {
                label: t('Inspections'),
                to: getSectionPath(portal, 'inspections'),
              },
              { label: t('Inspection Report') },
            ]}
          />
          <Typography
            component="h1"
            sx={{
              fontSize: { xs: '1.5rem', sm: '1.875rem' },
              fontWeight: 700,
              color: 'text.primary',
              letterSpacing: '-0.025em',
            }}
          >
            {t('Inspection Report')}
          </Typography>
        </Box>
      )}

      {showAuditStage ? (
        <Stack spacing={2.5}>
          {inspectionQuery.data && (
            <FlightPermitVerificationPanel
              inspection={inspectionQuery.data}
              canReview={canVerifyPermit}
              onPreviewPermit={() => setPermitPreviewOpen(true)}
              compact
              showAirspace={false}
              showPendingPrompt={false}
            />
          )}

          {inspectionQuery.data?.flightPermitFileName && (
            <FlightPermitPreviewDialog
              open={permitPreviewOpen}
              onClose={() => setPermitPreviewOpen(false)}
              inspectionId={inspectionId}
              fileName={inspectionQuery.data.flightPermitFileName}
              uploadedAt={inspectionQuery.data.flightPermitUploadedAt}
              assetName={inspectionQuery.data.assetName}
              droneSummary={resolvedDroneSummary}
              permitNumber={inspectionQuery.data.flightPermitNumber}
              issuingAuthority={inspectionQuery.data.flightPermitAuthority}
              validFrom={inspectionQuery.data.flightPermitValidFrom}
              validTo={inspectionQuery.data.flightPermitValidTo}
              verificationStatus={inspectionQuery.data.flightPermitVerificationStatus}
              fileSha256={inspectionQuery.data.flightPermitFileSha256}
            />
          )}

          <FlightOperationsReportView
            inspectionId={inspectionId}
            fieldSessionId={
              openVersion?.reportContext?.fieldSessions?.at(-1)?.id ??
              fieldSessionsQuery.data?.at(-1)?.id ??
              null
            }
            version={openVersion}
            evidenceList={evidence.data ?? []}
            assetName={inspectionQuery.data?.assetName}
            droneSummary={resolvedDroneSummary}
            flightPermitFileName={resolvedPermitFileName}
            collapsible
          />

          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              component={RouterLink}
              to="../review"
              variant="contained"
              sx={{ textTransform: 'none', fontWeight: 650, flexShrink: 0 }}
            >
              {t('Continue to Report Decision')}
            </Button>
          </Box>
        </Stack>
      ) : showSettlementStage && stage === 'settlement' ? (
        <Stack spacing={2.5}>
          <PlatformSettlementInvoiceCard
            inspectionId={inspectionId}
            paymentDetails={paymentStatusQuery.data}
          />
        </Stack>
      ) : (
      <QueryState
        isLoading={versions.isLoading}
        error={versions.error}
        isEmpty={!versions.data?.length}
        onRetry={() => void versions.refetch()}
        empty={
          <EmptyState
            title={t('No report versions found')}
            description={
              inspectionQuery.data?.inspectorName
                ? `${t('Waiting for')} ${inspectionQuery.data.inspectorName} ${t('to finalize findings and submit the technical report.')}`
                : t('The assigned Inspector creates a report draft once field evidence is accepted.')
            }
          />
        }
      >
        {openVersion && (
          <Stack spacing={3}>
            {showReviewStage && openVersion.status === 'SUBMITTED' && !isAuthor && (
              <Paper
                variant="outlined"
                sx={{
                  p: 2.5,
                  borderRadius: '10px',
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                }}
              >
                <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary', mb: 1.5 }}>
                  {t('Actions for Version')} {openVersion.versionNo}
                </Typography>

                <Stack spacing={2}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {t('Review the submitted report')}
                  </Typography>
                  <ReportAiSummaryCard
                    inspectionId={inspectionId}
                    versionId={openVersion.id}
                    summary={openVersion.summary}
                    findings={findings.data ?? []}
                  />
                  {reportReadLoading ? (
                    <Alert severity={findings.error || evidence.error ? 'error' : 'info'}>
                      {findings.error || evidence.error
                        ? 'Could not load the report sources. Retry before approving or returning.'
                        : 'Loading report sources…'}
                    </Alert>
                  ) : (
                    <Alert severity="info">
                      {t('Review the report, Inspector-confirmed findings, evidence, and limitations together. This is a report-level decision; the Organization Manager does not separately accept each finding.')}
                    </Alert>
                  )}
                  {showReturnBox ? (
                    <Stack spacing={1.5}>
                      <TextField
                        label={t('Reason for return')}
                        placeholder={t('Required when returning for author revisions')}
                        multiline
                        minRows={2}
                        autoFocus
                        value={reviewReason}
                        onChange={(e) => setReviewReason(e.target.value)}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                      />
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                        <Button
                          variant="contained"
                          color="error"
                          disabled={review.isPending || reportReadLoading || !reviewReason.trim()}
                          onClick={() =>
                            review.mutate({
                              versionId: openVersion.id,
                              reason: reviewReason.trim(),
                            })
                          }
                          sx={{ borderRadius: '8px', px: 2.5 }}
                        >
                          {t('Return with reason')}
                        </Button>
                        <Button
                          variant="outlined"
                          color="inherit"
                          disabled={review.isPending}
                          onClick={() => {
                            setShowReturnBox(false);
                            setReviewReason('');
                          }}
                          sx={{ borderRadius: '8px', px: 2 }}
                        >
                          {t('Cancel')}
                        </Button>
                      </Stack>
                    </Stack>
                  ) : (
                    <Stack direction="row" spacing={1.5}>
                      <Button
                        variant="contained"
                        color="success"
                        disabled={review.isPending || reportReadLoading}
                        onClick={() => review.mutate({ versionId: openVersion.id })}
                        sx={{ borderRadius: '8px', px: 2.5 }}
                      >
                        {review.isPending ? t('Publishing…') : t('Approve & publish')}
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        disabled={review.isPending || reportReadLoading}
                        onClick={() => setShowReturnBox(true)}
                        sx={{ borderRadius: '8px', px: 2.5 }}
                      >
                        {t('Return with reason')}
                      </Button>
                    </Stack>
                  )}
                  {review.isError && isConflict(review.error) ? (
                    <RefusalNotice
                      testId="report-review-refusal"
                      reason={getErrorMessage(review.error, '')}
                      fallbackMessage={t('The server refused this report review. Refresh the report before trying again.')}
                    />
                  ) : null}
                  <MutationProblemAlert
                    error={review.error}
                    isError={review.isError && !isConflict(review.error)}
                    fallbackMessage={t('Could not record this report review.')}
                  />
                </Stack>
              </Paper>
            )}

            {showSettlementStage && (
              <PlatformSettlementInvoiceCard
                inspectionId={inspectionId}
                paymentDetails={paymentStatusQuery.data}
              />
            )}

            {showReviewStage && (
              <ReportDeliverableTabs
                inspectionId={inspectionId}
                versions={versions.data}
                openVersion={openVersion}
                onSelectVersion={setOpenVersionId}
                findings={findings.data ?? []}
                evidenceList={evidence.data ?? []}
                fieldSessions={fieldSessionsQuery.data}
                reinspectionVerifications={reinspectionVerifications?.data}
                assetName={inspectionQuery.data?.assetName}
                droneSummary={resolvedDroneSummary}
                flightPermitFileName={resolvedPermitFileName}
              />
            )}
          </Stack>
        )}
      </QueryState>
      )}
    </Box>
  );
}
