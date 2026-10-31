import { Box, Chip, Stack, Typography } from '@mui/material';
import type {
  EvidenceItem,
  InspectionReport,
  Finding,
  ReinspectionVerificationItem,
} from '@/features/inspections/api/inspectionApi';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { inspectionApi } from '@/features/inspections/api/inspectionApi';
import { useLocale } from '@/shared/i18n/LocaleProvider';

export interface ReportDerivedSectionsProps {
  version: InspectionReport;
  findings: Finding[];
  evidenceList: EvidenceItem[];
  inspectionId: string;
  reinspectionVerifications?: ReinspectionVerificationItem[] | undefined;
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
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <Box component="section" sx={{ mb: 3 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.25 }}>
        <Typography component="h2" sx={{ fontSize: '0.9375rem', fontWeight: 700, color: 'text.primary' }}>
          {title}
        </Typography>
        {typeof count === 'number' && (
          <Chip size="small" label={count} sx={{ height: 20, fontSize: '0.75rem', fontWeight: 700 }} />
        )}
      </Stack>
      {children}
    </Box>
  );
}

function SummaryItem({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value?.trim()) return null;
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500, fontSize: '0.8125rem', wordBreak: 'break-word' }}>
        {value}
      </Typography>
    </Box>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  const { t } = useLocale();
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5, py: 0.4, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.75rem', flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.primary', fontSize: '0.75rem', textAlign: 'right', wordBreak: 'break-word' }}>
        {value?.trim() ? value : <Box component="span" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>{t('Not supplied')}</Box>}
      </Typography>
    </Box>
  );
}

export function ReportDerivedSections({
  version,
  findings,
  evidenceList,
  inspectionId,
  reinspectionVerifications,
}: ReportDerivedSectionsProps) {
  const { t, formatDateTime: formatDateTimeValue } = useLocale();
  const reportableFindings = findings.filter((finding) => finding.status === 'CONFIRMED');
  const context = version.reportContext;
  const droneSummary = [
    context?.assignedDrone?.manufacturer,
    context?.assignedDrone?.model,
    context?.assignedDrone?.serialNumber,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Box>
      <ReadOnlySection title={t('Identification')}>
        <Box
          sx={{
            p: 1.75,
            borderRadius: '10px',
            bgcolor: 'action.hover',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
              gap: 1.5,
            }}
          >
            <SummaryItem
              label={t('Report reference')}
              value={`SDI-RPT-${version.id.slice(0, 8).toUpperCase()}-V${version.versionNo}`}
            />
            <SummaryItem
              label={t('Version / status')}
              value={`v${version.versionNo} · ${version.status}`}
            />
            <SummaryItem label={t('Organization')} value={context?.organizationName} />
            <SummaryItem
              label={t('Asset')}
              value={[context?.assetName, context?.assetCode].filter(Boolean).join(' · ')}
            />
            <SummaryItem label={t('Asset location')} value={context?.assetLocation} />
            <SummaryItem label={t('Asset category')} value={context?.assetCategory} />
            <SummaryItem label={t('Assigned Drone')} value={droneSummary} />
            {context?.findingsConfirmedAt && (
              <SummaryItem
                label={t('Findings confirmation')}
                value={formatDateTime(context.findingsConfirmedAt, formatDateTimeValue, '')}
              />
            )}
            {version.submittedAt && (
              <SummaryItem
                label={t('Submitted')}
                value={formatDateTime(version.submittedAt, formatDateTimeValue, '')}
              />
            )}
            {version.reviewedAt && (
              <SummaryItem
                label={t('Review decision')}
                value={formatDateTime(version.reviewedAt, formatDateTimeValue, '')}
              />
            )}
            {version.publishedAt && (
              <SummaryItem
                label={t('Published')}
                value={formatDateTime(version.publishedAt, formatDateTimeValue, '')}
              />
            )}
            {version.returnReason && (
              <SummaryItem label={t('Return rationale')} value={version.returnReason} />
            )}
          </Box>

          {context?.fieldSessions && context.fieldSessions.length > 0 && (
            <Stack spacing={1} sx={{ mt: 1.5, pt: 1.25, borderTop: '1px solid', borderColor: 'divider' }}>
              {context.fieldSessions.map((session) => (
                <Stack
                  key={session.id}
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={{ xs: 0.5, sm: 2 }}
                  sx={{ fontSize: '0.75rem', color: 'text.secondary', flexWrap: 'wrap' }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {t('Field session ·')} {session.status}
                  </Typography>
                  {session.startedAt && (
                    <Typography variant="caption">
                      {t('Started')}: {formatDateTime(session.startedAt, formatDateTimeValue, '')}
                    </Typography>
                  )}
                  {session.endedAt && (
                    <Typography variant="caption">
                      {t('Ended')}: {formatDateTime(session.endedAt, formatDateTimeValue, '')}
                    </Typography>
                  )}
                  {session.preFlightChecklistNote && (
                    <Typography variant="caption">
                      {t('Pre-flight checklist note')}: {session.preFlightChecklistNote}
                    </Typography>
                  )}
                  {session.outcomeNotes && (
                    <Typography variant="caption">
                      {t('Outcome notes')}: {session.outcomeNotes}
                    </Typography>
                  )}
                  {session.postponementReason && (
                    <Typography variant="caption">
                      {t('Postponement reason')}: {session.postponementReason}
                    </Typography>
                  )}
                  {session.abortReason && (
                    <Typography variant="caption">
                      {t('Abort reason')}: {session.abortReason}
                    </Typography>
                  )}
                </Stack>
              ))}
            </Stack>
          )}
        </Box>
      </ReadOnlySection>

      {/* Target Defect Verifications (for Re-inspection) */}
      {reinspectionVerifications && reinspectionVerifications.length > 0 && (
        <ReadOnlySection
          title={t('Target defect verifications')}
          count={reinspectionVerifications.length}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
              gap: 1.5,
              mb: 3,
            }}
          >
            {reinspectionVerifications.map((item) => (
              <Box
                key={item.id}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: '10px',
                  p: 1.5,
                  bgcolor: 'background.paper',
                }}
              >
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {item.sourceFindingCode ? `${item.sourceFindingCode} · ` : ''}
                    {item.sourceDefectLabel}
                  </Typography>
                  <Chip
                    size="small"
                    label={t(item.resolutionStatus)}
                    color={
                      item.resolutionStatus === 'RESOLVED'
                        ? 'success'
                        : item.resolutionStatus === 'UNRESOLVED'
                          ? 'error'
                          : 'warning'
                    }
                    sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }}
                  />
                </Stack>
                {item.sourceSeverity && (
                  <Field label={t('Original Severity')} value={item.sourceSeverity} />
                )}
                {item.inspectorNotes && (
                  <Field label={t('Inspector Notes')} value={item.inspectorNotes} />
                )}
                {item.newEvidenceId && (
                  <Box sx={{ mt: 1 }}>
                    <AuthenticatedImage
                      src={inspectionApi.evidenceContentUrl(inspectionId, item.newEvidenceId)}
                      alt="Verified Evidence"
                      maxHeight={140}
                      sx={{ borderRadius: '6px', border: '1px solid', borderColor: 'divider' }}
                    />
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        </ReadOnlySection>
      )}

      <ReadOnlySection title={t('Confirmed findings')} count={reportableFindings.length}>
        {reportableFindings.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic', fontSize: '0.8125rem' }}>
            {t('No Inspector-confirmed findings were recorded for this version.')}
          </Typography>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
              gap: 1.5,
            }}
          >
            {reportableFindings.map((finding) => {
              const linkedEvidence = evidenceList.find((item) => item.id === finding.evidenceId);
              const distinctNotes =
                finding.technicalNotes?.trim() &&
                finding.technicalNotes.trim().toLowerCase() !== finding.defectLabel.trim().toLowerCase()
                  ? finding.technicalNotes.trim()
                  : null;
              return (
                <Box
                  key={finding.id}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: '10px',
                    p: 1.5,
                    display: 'flex',
                    gap: 1.5,
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mb: 0.75, flexWrap: 'wrap', gap: 0.5 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }}>{finding.defectLabel}</Typography>
                      <Chip size="small" label={finding.severity} sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }} />
                      {finding.status === 'CONFIRMED' && (
                        <Chip
                          size="small"
                          color="success"
                          label={t('Inspector-confirmed')}
                          sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }}
                        />
                      )}
                    </Stack>
                    {linkedEvidence?.locationDescription?.trim() && (
                      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                        <b>{t('Asset location')}:</b> {linkedEvidence.locationDescription}
                      </Typography>
                    )}
                    {distinctNotes && (
                      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 0.25 }}>
                        <b>{t('Technical notes')}:</b> {distinctNotes}
                      </Typography>
                    )}
                    {finding.recommendedAction?.trim() && (
                      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 0.25 }}>
                        <b>{t('Recommended action')}:</b> {finding.recommendedAction}
                      </Typography>
                    )}
                    {linkedEvidence?.fileName && (
                      <Typography variant="caption" sx={{ display: 'block', color: 'text.disabled', mt: 0.5 }}>
                        {linkedEvidence.fileName}
                      </Typography>
                    )}
                  </Box>
                  {linkedEvidence && linkedEvidence.contentType.startsWith('image/') && (
                    <Box sx={{ width: 108, flexShrink: 0 }}>
                      <AuthenticatedImage
                        src={inspectionApi.evidenceContentUrl(inspectionId, linkedEvidence.id)}
                        alt={finding.defectLabel}
                        maxHeight={82}
                        sx={{ borderRadius: '6px', border: '1px solid', borderColor: 'divider' }}
                      />
                    </Box>
                  )}
                </Box>
              );
            })}
          </Box>
        )}
      </ReadOnlySection>

      <ReadOnlySection title={t('Evidence register')} count={evidenceList.length}>
        {evidenceList.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic', fontSize: '0.8125rem' }}>
            {t('No evidence was linked to this version.')}
          </Typography>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
              gap: 1.5,
            }}
          >
            {evidenceList.map((item) => {
              const linkedFindings = reportableFindings.filter((finding) => finding.evidenceId === item.id);
              return (
                <Box
                  key={item.id}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: '10px',
                    p: 1.25,
                  }}
                >
                  {item.contentType.startsWith('image/') && (
                    <AuthenticatedImage
                      src={inspectionApi.evidenceContentUrl(inspectionId, item.id)}
                      alt={item.fileName}
                      maxHeight={120}
                      sx={{ borderRadius: '6px', border: '1px solid', borderColor: 'divider', mb: 1 }}
                    />
                  )}
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      fontSize: '0.8125rem',
                      mb: 0.5,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={item.fileName}
                  >
                    {item.fileName}
                  </Typography>
                  <Field label={t('Asset location')} value={item.locationDescription} />
                  {item.captureTime && (
                    <Field
                      label={t('Capture time')}
                      value={formatDateTime(item.captureTime, formatDateTimeValue, '')}
                    />
                  )}
                  {item.latitude != null && item.longitude != null && (
                    <Field label="GPS" value={`${item.latitude}, ${item.longitude}`} />
                  )}
                  {linkedFindings.length > 0 && (
                    <Field
                      label={t('Linked findings')}
                      value={linkedFindings.map((f) => `${f.defectLabel} (${f.severity})`).join('; ')}
                    />
                  )}
                </Box>
              );
            })}
          </Box>
        )}
      </ReadOnlySection>
    </Box>
  );
}
