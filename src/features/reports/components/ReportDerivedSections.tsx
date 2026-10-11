import { Box, Chip, Stack, Typography } from '@mui/material';
import type {
  EvidenceItem,
  InspectionReportVersion,
  VerifiedFinding,
} from '@/features/inspections/api/inspectionApi';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { StatusChip } from '@/shared/ui/StatusChip';
import { inspectionApi } from '@/features/inspections/api/inspectionApi';

/**
 * The report sections that are derived from the reviewed records rather than authored.
 *
 * <p>These are shown read-only on purpose. Editing them here would have no effect, because the
 * delivered document renders them from the same records — and the Confirmed findings section is the
 * finding decision itself, which only a reviewer changes through the finding workflow.
 */
export interface ReportDerivedSectionsProps {
  version: InspectionReportVersion;
  findings: VerifiedFinding[];
  evidenceList: EvidenceItem[];
  inspectionId: string;
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return 'Not supplied';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
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
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
          <Typography
            component="h2"
            sx={{
              fontSize: '0.9375rem',
              fontWeight: 700,
              color: '#101828',
              letterSpacing: '-0.01em',
            }}
          >
            {title}
          </Typography>
          <Chip
            size="small"
            label={accountable}
            sx={{
              height: 18,
              fontSize: '10px',
              fontWeight: 700,
              bgcolor: '#eef4ff',
              color: '#3538cd',
            }}
          />
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
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '180px 1fr' },
        gap: { xs: 0.25, sm: 1.5 },
        py: 0.75,
        borderBottom: '1px solid #f2f4f7',
      }}
    >
      <Typography variant="body2" sx={{ color: '#475467', fontWeight: 600, fontSize: '0.8125rem' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ color: '#101828', fontSize: '0.8125rem', wordBreak: 'break-word' }}>
        {value?.trim() ? value : <Box component="span" sx={{ color: '#98a2b3', fontStyle: 'italic' }}>Not supplied</Box>}
      </Typography>
    </Box>
  );
}

export function ReportDerivedSections({
  version,
  findings,
  evidenceList,
  inspectionId,
}: ReportDerivedSectionsProps) {
  const official = findings.filter(
    (finding) => finding.decision === 'CONFIRMED' || finding.decision === 'MODIFIED',
  );

  return (
    <Box>
      <ReadOnlySection
        title="Identification"
        accountable="Inspector · reviewer confirms"
        description="Report reference, asset, inspection references, dates and the people accountable."
      >
        <Box>
          <Field label="Report reference" value={`SDI-RPT-${version.id.slice(0, 8).toUpperCase()}-V${version.versionNo}`} />
          <Field label="Version" value={`v${version.versionNo}`} />
          <Field label="Status" value={version.status} />
          <Field label="Inspection ID" value={inspectionId} />
          <Field label="Author" value={version.authorUserId} />
          <Field label="Author verification" value={formatDateTime(version.authorVerifiedAt)} />
          <Field label="Reviewer" value={version.reviewerUserId} />
          <Field label="Review decision" value={formatDateTime(version.reviewedAt)} />
          <Field label="Published" value={formatDateTime(version.publishedAt)} />
          <Field label="Evidence snapshot hash" value={version.evidenceSnapshotHash} />
          <Field label="Model provenance" value={version.llmModel ? `${version.llmModel} · ${version.promptVersion ?? 'no prompt version'}` : null} />
        </Box>
      </ReadOnlySection>

      <ReadOnlySection
        title="Confirmed findings"
        accountable="Organization Admin final decision"
        description="Rendered from the reviewed finding records. Severity and decision are changed through the finding workflow, not by editing the report."
      >
        {official.length === 0 ? (
          <Typography variant="body2" sx={{ color: '#98a2b3', fontStyle: 'italic', fontSize: '0.8125rem' }}>
            No confirmed findings were recorded for this version.
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {official.map((finding) => (
              <Box
                key={finding.id}
                sx={{ border: '1px solid #e4e7ec', borderRadius: '10px', p: 1.5 }}
              >
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
                  <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700, color: '#101828' }}>
                    {finding.defectLabel}
                  </Typography>
                  <Chip size="small" label={finding.severity} sx={{ height: 20, fontSize: '10px', fontWeight: 700 }} />
                  <StatusChip status={finding.decision ?? 'UNREVIEWED'} />
                  {finding.repairRequired && (
                    <Chip size="small" color="error" label="Repair required" sx={{ height: 20, fontSize: '10px', fontWeight: 700 }} />
                  )}
                </Stack>
                <Field label="Component" value={finding.component} />
                <Field label="Location" value={finding.locationDescription} />
                <Field label="Observed condition" value={finding.observedCondition} />
                <Field label="Measurement" value={finding.measurement} />
                <Field label="Technical notes" value={finding.technicalNotes} />
                <Field label="Recommended action" value={finding.recommendedAction} />
              </Box>
            ))}
          </Stack>
        )}
      </ReadOnlySection>

      <ReadOnlySection
        title="Evidence register"
        accountable="Inspector · SYSTEM indexes"
        description="Every evidence item linked to this version with its checksum. Missing capture metadata is disclosed rather than shown as blank."
      >
        {evidenceList.length === 0 ? (
          <Typography variant="body2" sx={{ color: '#98a2b3', fontStyle: 'italic', fontSize: '0.8125rem' }}>
            No evidence was linked to this version.
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {evidenceList.map((item) => (
              <Box
                key={item.id}
                sx={{ border: '1px solid #e4e7ec', borderRadius: '10px', p: 1.5 }}
              >
                {item.contentType.startsWith('image/') && (
                  <AuthenticatedImage
                    src={inspectionApi.evidenceContentUrl(inspectionId, item.id)}
                    alt={item.fileName}
                    maxHeight={320}
                    sx={{ borderRadius: '8px', border: '1px solid #eaecf0' }}
                  />
                )}
                <Box sx={{ mt: 1 }}>
                  <Field label="Evidence ID" value={item.id} />
                  <Field label="File" value={item.fileName} />
                  <Field label="Capture time" value={formatDateTime(item.captureTime)} />
                  <Field
                    label="Location"
                    value={
                      item.latitude != null && item.longitude != null
                        ? `${item.latitude}, ${item.longitude}`
                        : null
                    }
                  />
                  <Field label="SHA-256" value={item.checksumSha256} />
                </Box>
              </Box>
            ))}
          </Stack>
        )}
      </ReadOnlySection>

      <ReadOnlySection
        title="Approval and revisions"
        accountable="Organization Admin · SYSTEM records"
        description="Who approved this version and when. A correction is issued as a new linked version; a published version is never altered."
      >
        <Box>
          <Field label="Author confirmation" value={formatDateTime(version.authorVerifiedAt)} />
          <Field label="Reviewer approval" value={formatDateTime(version.reviewedAt)} />
          <Field label="Return rationale" value={version.reviewReason} />
          <Field label="Approved version" value={formatDateTime(version.publishedAt)} />
        </Box>
        <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#667085', fontStyle: 'italic' }}>
          The approval recorded here is an application approval and is not a certified digital
          signature.
        </Typography>
      </ReadOnlySection>

      <ReadOnlySection
        title="Appendices"
        accountable="Inspector · SYSTEM compiles"
        description="Checklist responses, source documents and session logs are held against the inspection record and linked from the platform."
      >
        <Typography variant="body2" sx={{ color: '#475467', fontSize: '0.8125rem' }}>
          Evidence photographs are listed in the Evidence register above with their checksums. The
          delivered PDF reproduces them as numbered plates.
        </Typography>
      </ReadOnlySection>
    </Box>
  );
}