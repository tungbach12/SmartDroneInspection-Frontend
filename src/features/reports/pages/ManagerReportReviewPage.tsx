import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import {
  getSectionPath,
  PORTAL_IDS,
  type PortalId,
} from '@/app/permissions/accessPolicy';
import { useAuthStore } from '@/features/auth/store/authStore';
import {
  useInspection,
  useInspectionEvidence,
  useInspectionFindings,
  useReinspectionVerifications,
  useReportPaymentStatus,
  useReportVersions,
  useReviewReportVersion,
} from '@/features/inspections/hooks/useInspections';
import { PlatformSettlementInvoiceCard } from '@/features/inspections/components/PlatformSettlementInvoiceCard';
import { ReportAiSummaryCard } from '@/features/reports/components/ReportAiSummaryCard';
import { ReportDeliverableTabs } from '@/features/reports/components/ReportDeliverableTabs';
import { EmptyState } from '@/shared/ui/EmptyState';
import { getErrorMessage } from '@/shared/api/errorMessage';
import { isConflict } from '@/shared/api/problem';
import { MutationProblemAlert, RefusalNotice } from '@/shared/ui/MutationProblemAlert';
import { QueryState } from '@/shared/ui/QueryState';
import { useLocale } from '@/shared/i18n/LocaleProvider';

const MANAGER_STATUS_BANNER: Record<string, string> = {
  SUBMITTED: 'Waiting for a qualified reviewer to publish or return.',
  RETURNED: 'Returned to the author for revision.',
  PUBLISHED: 'Published. This version is immutable.',
  SUPERSEDED: 'Superseded by a later version.',
};

/**
 * Dedicated Report Review page for Platform Manager (/manager/inspections/:id/review).
 * Focused strictly on reviewing submitted reports, publishing approved versions, and viewing platform commission.
 */
export default function ManagerReportReviewPage() {
  const { t } = useLocale();
  const { inspectionId = '' } = useParams<{ inspectionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const portal = (location.pathname.split('/').filter(Boolean)[0] ??
    PORTAL_IDS[0]) as PortalId;
  const userId = useAuthStore((state) => state.userId);

  const [openVersionId, setOpenVersionId] = useState<string | null>(null);
  const [reviewReason, setReviewReason] = useState('');
  const [showReturnBox, setShowReturnBox] = useState(false);

  const inspectionQuery = useInspection(inspectionId);
  const versions = useReportVersions(inspectionId);
  const findings = useInspectionFindings(inspectionId);
  const evidence = useInspectionEvidence(inspectionId);
  const reinspectionVerifications = useReinspectionVerifications(inspectionId);
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
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Button
              startIcon={<ArrowBackRounded />}
              onClick={() => navigate(`${getSectionPath(portal, 'inspections')}?view=reports`)}
              sx={{
                color: 'text.secondary',
                fontWeight: 600,
                fontSize: '0.875rem',
                textTransform: 'none',
                borderRadius: '8px',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              Back to review queue
            </Button>
          </Box>
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

      <QueryState
        isLoading={versions.isLoading}
        error={versions.error}
        isEmpty={!versions.data?.length}
        onRetry={() => void versions.refetch()}
        empty={
          <EmptyState
            title={t('No report versions found')}
            description={t('The assigned Inspector creates a report draft once field evidence is accepted.')}
          />
        }
      >
        {openVersion && (
          <Stack spacing={3}>
            <Alert
              severity={
                openVersion.status === 'PUBLISHED' ||
                (review.isSuccess && !review.variables?.reason)
                  ? 'success'
                  : 'info'
              }
              sx={{
                borderRadius: '10px',
                fontWeight: 500,
                fontSize: '0.875rem',
              }}
            >
              {openVersion.status === 'PUBLISHED' ||
              (review.isSuccess && !review.variables?.reason)
                ? `${t('Published version')} ${review.data?.versionNo ?? openVersion.versionNo}. ${t('This version is immutable and delivered to the Customer.')}`
                : (MANAGER_STATUS_BANNER[openVersion.status] ?? openVersion.status)}
            </Alert>

            {openVersion.status === 'SUBMITTED' && !isAuthor && (
              <Paper
                variant="outlined"
                sx={{
                  p: 2.5,
                  borderRadius: '16px',
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
                  <ReportAiSummaryCard inspectionId={inspectionId} versionId={openVersion.id} />
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

            <PlatformSettlementInvoiceCard
              inspectionId={inspectionId}
              paymentDetails={paymentStatusQuery.data}
            />

            <ReportDeliverableTabs
              inspectionId={inspectionId}
              versions={versions.data}
              openVersion={openVersion}
              onSelectVersion={setOpenVersionId}
              findings={findings.data ?? []}
              evidenceList={evidence.data ?? []}
              reinspectionVerifications={reinspectionVerifications.data}
              assetName={inspectionQuery.data?.assetName}
              droneSummary={resolvedDroneSummary}
              flightPermitFileName={resolvedPermitFileName}
            />
          </Stack>
        )}
      </QueryState>
    </Box>
  );
}
