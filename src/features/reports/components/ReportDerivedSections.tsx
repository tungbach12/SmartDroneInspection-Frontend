import { Alert, Box, Chip, Stack, Typography } from '@mui/material';
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

function findingComponentLocation(findings: VerifiedFinding[], evidenceId: string): string | null {
  const values = new Set<string>();
  for (const finding of findings) {
    if (finding.evidenceId !== evidenceId) continue;
    const component = finding.component?.trim();
    const location = finding.locationDescription?.trim();
    const value =
      component && location
        ? component === location
          ? component
          : `${component} — ${location}`
        : component || location;
    if (value) values.add(value);
  }
  return values.size ? [...values].join('; ') : null;
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
    // An Inspector proposal belongs in the draft. Only a reviewer-rejected finding is excluded;
  // publication still refuses while any proposal is undecided.
  const official = findings.filter((finding) => finding.decision !== 'REJECTED');
  const pendingReview = findings.filter((finding) => !finding.decision);

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
        accountable="Inspector proposal · Organization Admin decision"
        description="Every finding the assigned Inspector confirmed appears here with its source evidence and the reviewer decision once one is recorded. A finding the reviewer rejected is excluded."
      >
        {official.length === 0 ? (
          <Stack spacing={1.5}>
            <Typography variant="body2" sx={{ color: '#98a2b3', fontStyle: 'italic', fontSize: '0.8125rem' }}>
              No confirmed findings were recorded for this version.
            </Typography>
            {pendingReview.length > 0 && (
              <Alert severity="warning" sx={{ fontSize: '0.8125rem' }}>
                {pendingReview.length} finding(s) recommended by the Inspector are awaiting final review decision by an Organization Admin in Findings before entering the official report.
              </Alert>
            )}
          </Stack>
        ) : (
          <Stack spacing={2}>
            {pendingReview.length > 0 && (
              <Alert severity="info" sx={{ fontSize: '0.8125rem', mb: 0.5 }}>
                {pendingReview.length} additional finding(s) recommended by Inspector await Organization Admin decision in Findings.
              </Alert>
            )}
            {official.map((finding) => {
              const linkedEvidence = finding.evidenceId
                ? evidenceList.find((e) => e.id === finding.evidenceId)
                : null;
              return (
                <Box
                  key={finding.id}
                  sx={{
                    border: '1px solid #e4e7ec',
                    borderRadius: '10px',
                    p: 2,
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr',
                      md: linkedEvidence ? '1.3fr 0.7fr' : '1fr',
                    },
                    gap: 2.5,
                    alignItems: 'start',
                  }}
                >
                  <Box>
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 0.5 }}
                    >
                      <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: '#101828' }}>
                        {finding.defectLabel}
                      </Typography>
                      <Chip
                        size="small"
                        label={finding.severity}
                        sx={{ height: 20, fontSize: '10px', fontWeight: 700 }}
                      />
                      <StatusChip status={finding.decision ?? 'UNREVIEWED'} />
                      {finding.repairRequired && (
                        <Chip
                          size="small"
                          color="error"
                          label="Repair required"
                          sx={{ height: 20, fontSize: '10px', fontWeight: 700 }}
                        />
                      )}
                    </Stack>
                    <Field label="Component" value={finding.component} />
                    <Field label="Location" value={finding.locationDescription} />
                    <Field label="Observed condition" value={finding.observedCondition} />
                    <Field label="Measurement" value={finding.measurement} />
                    <Field label="Technical notes" value={finding.technicalNotes} />
                    <Field label="Recommended action" value={finding.recommendedAction} />
                    {linkedEvidence && (
                      <Field
                        label="Attached evidence"
                        value={`${linkedEvidence.fileName} (${linkedEvidence.id.slice(0, 8)})`}
                      />
                    )}
                  </Box>

                  {linkedEvidence && (
                    <Box
                      sx={{
                        borderRadius: '8px',
                        border: '1px solid #eaecf0',
                        overflow: 'hidden',
                        p: 1.25,
                        bgcolor: '#f8fafc',
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{ fontWeight: 600, color: '#475467', display: 'block', mb: 0.75 }}
                      >
                        Defect evidence photograph
                      </Typography>
                      {linkedEvidence.contentType.startsWith('image/') ? (
                        <AuthenticatedImage
                          src={inspectionApi.evidenceContentUrl(inspectionId, linkedEvidence.id)}
                          alt={finding.defectLabel}
                          maxHeight={220}
                          sx={{ borderRadius: '6px' }}
                        />
                      ) : (
                        <Typography variant="body2" sx={{ color: '#475467' }}>
                          {linkedEvidence.fileName} ({linkedEvidence.contentType})
                        </Typography>
                      )}
                      <Typography
                        variant="caption"
                        sx={{
                          display: 'block',
                          mt: 0.75,
                          color: '#667085',
                          fontSize: '0.6875rem',
                          wordBreak: 'break-all',
                        }}
                      >
                        SHA-256: {linkedEvidence.checksumSha256.slice(0, 16)}…
                      </Typography>
                    </Box>
                  )}
                </Box>
              );
            })}
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
            {evidenceList.map((item) => {
              const attachedFindings = official.filter((f) => f.evidenceId === item.id);
              const attachedFinding = attachedFindings[0];
              return (
                <Box
                  key={item.id}
                  sx={{ border: '1px solid #e4e7ec', borderRadius: '10px', p: 1.5 }}
                >
                  {item.contentType.startsWith('image/') && (
                    <AuthenticatedImage
                      src={inspectionApi.evidenceContentUrl(inspectionId, item.id)}
                      alt={item.fileName}
                      maxHeight={240}
                      sx={{ borderRadius: '8px', border: '1px solid #eaecf0' }}
                    />
                  )}
                  <Box sx={{ mt: 1 }}>
                    <Field label="Evidence ID" value={item.id} />
                    <Field label="File" value={item.fileName} />
                    {attachedFinding && (
                      <Field
                        label="Defect association"
                        value={`${attachedFinding.defectLabel} (${attachedFinding.severity})`}
                      />
                    )}
                    <Field label="Capture time" value={formatDateTime(item.captureTime)} />
                    <Field
                      label="Location"
                      value={
                        item.latitude != null && item.longitude != null
                          ? `${item.latitude}, ${item.longitude}`
                          : findingComponentLocation(attachedFindings, item.id)
                      }
                    />
                    <Field label="SHA-256" value={item.checksumSha256} />
                  </Box>
                </Box>
              );
            })}
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