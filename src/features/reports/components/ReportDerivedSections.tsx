import { Box, Chip, Stack, Typography } from '@mui/material';
import type {
  EvidenceItem,
  InspectionReportVersion,
  Finding,
} from '@/features/inspections/api/inspectionApi';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { inspectionApi } from '@/features/inspections/api/inspectionApi';
import { useLocale } from '@/shared/i18n/LocaleProvider';

export interface ReportDerivedSectionsProps {
  version: InspectionReportVersion;
  findings: Finding[];
  evidenceList: EvidenceItem[];
  inspectionId: string;
  executiveSummary?: React.ReactNode;
  limitations?: React.ReactNode;
  purposeScope?: React.ReactNode;
  method?: React.ReactNode;
  conclusions?: React.ReactNode;
}

function formatDateTime(
  value: string | null | undefined,
  format: (input: Date | string | number, options?: Intl.DateTimeFormatOptions) => string,
  fallback: string,
): string {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return format(parsed);
}

function ReadOnlySection({
  title,
  accountable,
  description,
  children,
}: {
  title: string;
  accountable: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Box component="section" sx={{ mb: 3.5 }}>
      <Box sx={{ mb: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5, flexWrap: 'wrap' }}>
          <Typography component="h2" sx={{ fontSize: '0.9375rem', fontWeight: 700, color: '#101828' }}>
            {title}
          </Typography>
          <Chip size="small" label={accountable} sx={{ height: 18, fontSize: '10px', fontWeight: 700 }} />
        </Stack>
        <Typography variant="body2" sx={{ color: '#667085', fontSize: '0.8125rem' }}>
          {description}
        </Typography>
      </Box>
      {children}
    </Box>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  const { t } = useLocale();
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '180px 1fr' }, gap: { xs: 0.25, sm: 1.5 }, py: 0.75, borderBottom: '1px solid #f2f4f7' }}>
      <Typography variant="body2" sx={{ color: '#475467', fontWeight: 600, fontSize: '0.8125rem' }}>{label}</Typography>
      <Typography variant="body2" sx={{ color: '#101828', fontSize: '0.8125rem', wordBreak: 'break-word' }}>
        {value?.trim() ? value : <Box component="span" sx={{ color: '#98a2b3', fontStyle: 'italic' }}>{t('Not supplied')}</Box>}
      </Typography>
    </Box>
  );
}

export function ReportDerivedSections({
  version,
  findings,
  evidenceList,
  inspectionId,
  executiveSummary,
  limitations,
  purposeScope,
  method,
  conclusions,
}: ReportDerivedSectionsProps) {
  const { t, formatDateTime: formatDateTimeValue } = useLocale();
  const reportableFindings = findings.filter((finding) => finding.status === 'CONFIRMED');
  const context = version.reportContext;

  return (
    <Box>
      <ReadOnlySection
        title={t('Identification')}
        accountable={t('Inspector · Organization Admin')}
        description={t('Report and inspection identifiers, version, asset and approval records.')}
      >
        <Box>
          <Field label={t('Report reference')} value={`SDI-RPT-${version.id.slice(0, 8).toUpperCase()}-V${version.versionNo}`} />
          <Field label={t('Version / status')} value={`v${version.versionNo} · ${version.status}`} />
          <Field label={t('Inspection ID')} value={inspectionId} />
          <Field label={t('Organization')} value={context?.organizationName} />
          <Field label={t('Asset')} value={context?.assetName} />
          <Field label={t('Asset code')} value={context?.assetCode} />
          <Field label={t('Asset location')} value={context?.assetLocation} />
          <Field label={t('Asset category')} value={context?.assetCategory} />
          <Field label={t('Author')} value={version.authorUserId} />
          <Field label={t('Submitted')} value={formatDateTime(version.submittedAt, formatDateTimeValue, t('Not supplied'))} />
          <Field label={t('Reviewer')} value={version.reviewerUserId} />
          <Field label={t('Review decision')} value={formatDateTime(version.reviewedAt, formatDateTimeValue, t('Not supplied'))} />
          <Field label={t('Published')} value={formatDateTime(version.publishedAt, formatDateTimeValue, t('Not supplied'))} />
        </Box>
      </ReadOnlySection>

      {executiveSummary}
      {limitations}
      {purposeScope}
      {method}

      {context && (
        <ReadOnlySection
          title={t('Inspection preparation and recorded session context')}
          accountable={t('Inspector · Organization Admin reviewer')}
          description={t('Source records from inspection preparation, readiness review and recorded field sessions. These records do not certify flight, permits or professional qualifications.')}
        >
          <Box>
            <Field label={t('Assigned Drone')} value={[context.assignedDrone?.manufacturer, context.assignedDrone?.model, context.assignedDrone?.serialNumber].filter(Boolean).join(' · ')} />
            <Field label={t('Preparation version / status')} value={context.preparation ? `v${context.preparation.version} · ${context.preparation.status}` : null} />
            <Field label={t('Planned shot list')} value={context.preparation?.shotList} />
            <Field label={t('Evidence types requested')} value={context.preparation?.evidenceTypes} />
            <Field label={t('Access constraints')} value={context.preparation?.accessConstraints} />
            <Field label={t('Safety observations')} value={context.preparation?.safetyObservations} />
            <Field label={t('Permit document references')} value={context.preparation?.permitDocumentReferences} />
            <Field label={t('Readiness decision')} value={context.preparation?.readinessDecision} />
            <Field label={t('Readiness decision time')} value={formatDateTime(context.preparation?.readinessDecisionAt, formatDateTimeValue, t('Not supplied'))} />
            <Field label={t('Readiness reason')} value={context.preparation?.readinessReason} />
            <Field label={t('Findings confirmation')} value={formatDateTime(context.findingsConfirmedAt, formatDateTimeValue, t('Not supplied'))} />
            {context.fieldSessions.map((session) => (
              <Box key={session.id} sx={{ mt: 1, p: 1.5, border: '1px solid #e4e7ec', borderRadius: '8px' }}>
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>{t('Field session ·')} {session.status}</Typography>
                <Field label={t('Started')} value={formatDateTime(session.startedAt, formatDateTimeValue, t('Not supplied'))} />
                <Field label={t('Ended')} value={formatDateTime(session.endedAt, formatDateTimeValue, t('Not supplied'))} />
                <Field label={t('Pre-flight checklist note')} value={session.preFlightChecklistNote} />
                <Field label={t('Postponement reason')} value={session.postponementReason} />
                <Field label={t('Abort reason')} value={session.abortReason} />
                <Field label={t('Recorded limitations')} value={session.limitations} />
                <Field label={t('Assigned Drone reference')} value={[session.droneManufacturer, session.droneModel, session.droneSerialNumber].filter(Boolean).join(' · ')} />
              </Box>
            ))}
            <Field label={t('Reviewer qualification disclosure')} value={context.reviewerQualificationDisclosure} />
          </Box>
        </ReadOnlySection>
      )}

      <ReadOnlySection
        title={t('Evidence register')}
        accountable={t('Inspector · SYSTEM indexes')}
        description={t('Evidence linked to this report version, with capture time, GPS when available, and its shared asset location.')}
      >
        {evidenceList.length === 0 ? (
          <Typography variant="body2" sx={{ color: '#98a2b3', fontStyle: 'italic', fontSize: '0.8125rem' }}>{t('No evidence was linked to this version.')}</Typography>
        ) : (
          <Stack spacing={1.5}>
            {evidenceList.map((item) => {
              const linkedFindings = reportableFindings.filter((finding) => finding.evidenceId === item.id);
              return (
                <Box key={item.id} sx={{ border: '1px solid #e4e7ec', borderRadius: '10px', p: 1.5 }}>
                  {item.contentType.startsWith('image/') && (
                    <AuthenticatedImage src={inspectionApi.evidenceContentUrl(inspectionId, item.id)} alt={item.fileName} maxHeight={240} sx={{ borderRadius: '8px', border: '1px solid #eaecf0' }} />
                  )}
                  <Box sx={{ mt: 1 }}>
                    <Field label={t('Evidence ID')} value={item.id} />
                    <Field label={t('File')} value={item.fileName} />
                    <Field label={t('Capture time')} value={formatDateTime(item.captureTime, formatDateTimeValue, t('Not supplied'))} />
                    <Field label={t('Asset location')} value={item.locationDescription} />
                    <Field label="GPS" value={item.latitude != null && item.longitude != null ? `${item.latitude}, ${item.longitude}` : null} />
                    <Field label={t('Linked findings')} value={linkedFindings.length ? linkedFindings.map((finding) => `${finding.defectLabel} (${finding.severity})`).join('; ') : null} />
                  </Box>
                </Box>
              );
            })}
          </Stack>
        )}
      </ReadOnlySection>

      <ReadOnlySection
        title={t('Confirmed findings')}
        accountable={t('Inspector-confirmed · reviewed with the report')}
        description={t('The Organization Admin reviews these findings as part of the complete report; they are not separately accepted.')}
      >
        {reportableFindings.length === 0 ? (
          <Typography variant="body2" sx={{ color: '#98a2b3', fontStyle: 'italic', fontSize: '0.8125rem' }}>{t('No Inspector-confirmed findings were recorded for this version.')}</Typography>
        ) : (
          <Stack spacing={2}>
            {reportableFindings.map((finding) => {
              const linkedEvidence = evidenceList.find((item) => item.id === finding.evidenceId);
              return (
                <Box key={finding.id} sx={{ border: '1px solid #e4e7ec', borderRadius: '10px', p: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', md: linkedEvidence ? '1.3fr 0.7fr' : '1fr' }, gap: 2.5 }}>
                  <Box>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1, flexWrap: 'wrap' }}>
                      <Typography sx={{ fontWeight: 700 }}>{finding.defectLabel}</Typography>
                      <Chip size="small" label={finding.severity} />
                      {finding.status === 'CONFIRMED' && <Chip size="small" color="success" label={t('Inspector-confirmed')} />}
                    </Stack>
                    <Field label={t('Asset location')} value={linkedEvidence?.locationDescription} />
                    <Field label={t('Technical notes')} value={finding.technicalNotes} />
                    <Field label={t('Recommended action')} value={finding.recommendedAction} />
                    <Field label={t('Inspector confirmation')} value={finding.status === 'CONFIRMED' ? t('Confirmed') : t('Not supplied')} />
                    <Field label={t('Model')} value={finding.modelName} />
                  </Box>
                  {linkedEvidence && linkedEvidence.contentType.startsWith('image/') && (
                    <Box sx={{ borderRadius: '8px', border: '1px solid #eaecf0', overflow: 'hidden', p: 1.25, bgcolor: '#f8fafc' }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: '#475467', display: 'block', mb: 0.75 }}>{t('Defect evidence photograph')}</Typography>
                      <AuthenticatedImage src={inspectionApi.evidenceContentUrl(inspectionId, linkedEvidence.id)} alt={finding.defectLabel} maxHeight={220} sx={{ borderRadius: '6px' }} />
                    </Box>
                  )}
                </Box>
              );
            })}
          </Stack>
        )}
      </ReadOnlySection>

      {conclusions}

      <ReadOnlySection title={t('Appendices')} accountable={t('Inspector · SYSTEM compiles')} description={t('Evidence index and source-linked inspection context are shown above.')}>
        <Typography variant="body2" sx={{ color: '#475467', fontSize: '0.8125rem' }}>
        title={t('Evidence register')}
        accountable={t('Inspector · SYSTEM indexes')}
        description={t('Evidence linked to this report version, with capture time, GPS when available, and its shared asset location.')}
        </Typography>
      </ReadOnlySection>

      <ReadOnlySection title={t('Approval and revisions')} accountable={t('Organization Admin · SYSTEM records')} description={t('Who approved this version and when. A correction is issued as a new linked version; a published version is never altered.')}>
        <Box>
          <Field label={t('Submitted')} value={formatDateTime(version.submittedAt, formatDateTimeValue, t('Not supplied'))} />
          <Field label={t('Reviewer approval')} value={formatDateTime(version.reviewedAt, formatDateTimeValue, t('Not supplied'))} />
          <Field label={t('Return rationale')} value={version.returnReason} />
          <Field label={t('Approved version')} value={formatDateTime(version.publishedAt, formatDateTimeValue, t('Not supplied'))} />
        </Box>
        <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#667085', fontStyle: 'italic' }}>
          {t('Application approval is not a certified digital signature.')}
        </Typography>
      </ReadOnlySection>
    </Box>
  );
}
