import { useState } from 'react';
import { Link as RouterLink, useLocation, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Stack,
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
import { ReportDeliverableTabs } from '@/features/reports/components/ReportDeliverableTabs';
import { ReportReviewDecisionBar } from '@/features/reports/components/ReportReviewDecisionBar';
import { EmptyState } from '@/shared/ui/EmptyState';
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
  const userId = useAuthStore((state) => state.userId);
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
  const auditFieldSessionId =
    openVersion?.reportContext?.fieldSessions?.at(-1)?.id ??
    fieldSessionsQuery.data?.at(-1)?.id ??
    null;

  const isPaid =
    Boolean(paymentStatusQuery.data?.paid) ||
    paymentStatusQuery.data?.paymentStatus === 'PAID';
  const isAccepted = Boolean(paymentStatusQuery.data?.reportAccepted) || isPaid;

  const notPublished = Boolean(openVersion && openVersion.status !== 'PUBLISHED');
  const customerStatusNotice = notPublished ? (
    <Alert severity="info" sx={{ borderRadius: '10px', py: 0.75 }} aria-live="polite">
      {t('Not yet published')}
    </Alert>
  ) : isPaid ? (
    <Alert severity="success" sx={{ borderRadius: '10px', py: 0.75 }} aria-live="polite">
      {t('Paid & settled')}
    </Alert>
  ) : (
    <Alert severity="info" sx={{ borderRadius: '10px', py: 0.75 }} aria-live="polite">
      {isAccepted
        ? t('Customer accepted the report. Awaiting payment.')
        : t('Report published. Awaiting customer acceptance.')}
    </Alert>
  );

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

          {auditFieldSessionId && (
            <FlightOperationsReportView
              inspectionId={inspectionId}
              fieldSessionId={auditFieldSessionId}
              version={openVersion}
              evidenceList={evidence.data ?? []}
              assetName={inspectionQuery.data?.assetName}
              droneSummary={resolvedDroneSummary}
              flightPermitFileName={resolvedPermitFileName}
              collapsible
            />
          )}

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
          {notPublished && customerStatusNotice}
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
            {showReviewStage && openVersion.status === 'PUBLISHED' && customerStatusNotice}

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

            {showReviewStage && openVersion.status === 'SUBMITTED' && !isAuthor && (
              <ReportReviewDecisionBar
                isPending={review.isPending}
                reportReadLoading={reportReadLoading}
                hasReadError={Boolean(findings.error || evidence.error)}
                showReturnBox={showReturnBox}
                reviewReason={reviewReason}
                onReviewReasonChange={setReviewReason}
                onShowReturnBox={setShowReturnBox}
                onApprove={() => review.mutate({ versionId: openVersion.id })}
                onReturn={() =>
                  review.mutate({
                    versionId: openVersion.id,
                    reason: reviewReason.trim(),
                  })
                }
                reviewError={review.error}
                isReviewError={review.isError}
              />
            )}

            {stage === 'review' && openVersion.status === 'PUBLISHED' && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  component={RouterLink}
                  to="../settlement"
                  variant="contained"
                  sx={{ textTransform: 'none', fontWeight: 650, borderRadius: '8px', px: 2.5, flexShrink: 0 }}
                >
                  {t('Continue to Commission & Settlement')}
                </Button>
              </Box>
            )}
          </Stack>
        )}
      </QueryState>
      )}
    </Box>
  );
}
