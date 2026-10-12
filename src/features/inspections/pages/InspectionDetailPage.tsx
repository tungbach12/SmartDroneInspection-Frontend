import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import { useAuthStore } from '@/features/auth/store/authStore';
import { InspectorWorkspace } from '@/features/inspections/components/InspectorWorkspace';
import { FindingDecisionControls } from '@/features/inspections/components/FindingDecisionControls';
import {
  useDecideFinding,
  useInspectionEvidence,
  useInspectionFindings,
  useReportVersions,
} from '@/features/inspections/hooks/useInspections';
import { inspectionApi } from '@/features/inspections/api/inspectionApi';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { EmptyState } from '@/shared/ui/EmptyState';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryState } from '@/shared/ui/QueryState';
import { StatusChip } from '@/shared/ui/StatusChip';

const SEVERITY_COLOR: Record<string, 'error' | 'warning' | 'info' | 'default'> = {
  HIGH: 'error',
  MEDIUM: 'warning',
  LOW: 'info',
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function InspectionDetailPage() {
  const { inspectionId = '' } = useParams();
  const navigate = useNavigate();
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null);
  const roles = useAuthStore((state) => state.roles);
  const isInspector = roles.includes('INSPECTOR');
  // MF3-09 is the qualified reviewer's decision; the Inspector who authored the finding is not it.
  const isReviewer = roles.includes('ORG_ADMIN');

  const evidence = useInspectionEvidence(inspectionId);
  const findings = useInspectionFindings(inspectionId);
  const versions = useReportVersions(inspectionId);
  const decideFinding = useDecideFinding(inspectionId);

  const evidenceItems = evidence.data ?? [];
  const selectedEvidence =
    evidenceItems.find((item) => item.id === selectedEvidenceId) ?? evidenceItems[0] ?? null;

  return (
    <Box className="workspace-page workspace-page--inspections" sx={{ maxWidth: 1040, mx: 'auto' }}>
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBackRounded />}
          onClick={() => navigate(-1)}
          sx={{
            color: '#475467',
            fontWeight: 600,
            fontSize: '14px',
            textTransform: 'none',
            borderRadius: '8px',
            mb: 2,
            '&:hover': { bgcolor: '#f2f4f7' },
          }}
        >
          Back to list
        </Button>

        <PageHeader
          title="Inspection Detail"
          subtitle={`Inspection ID: ${inspectionId} · Field evidence, verified findings and reports`}
        />
      </Box>

      <Stack spacing={3}>
        {/* Report Overview Card */}
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 2.5, sm: 3 },
            borderRadius: '16px',
            border: '1px solid #eaecf0',
            bgcolor: '#ffffff',
            boxShadow: '0 1px 3px rgba(16, 24, 40, 0.05)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#101828' }}>
                Report summary
              </Typography>
              {versions.data && versions.data.length > 0 && (
                <Chip
                  size="small"
                  label={`${versions.data.length} version(s)`}
                  sx={{ borderRadius: '6px', fontWeight: 600 }}
                />
              )}
            </Box>

            {versions.data && versions.data.length > 0 && (
              <Button
                variant="outlined"
                size="small"
                endIcon={<ArrowForwardRounded />}
                onClick={() => navigate(`../reports/${inspectionId}`)}
                sx={{
                  borderRadius: '8px',
                  fontWeight: 600,
                  textTransform: 'none',
                  borderColor: '#d0d5dd',
                  color: '#344054',
                  '&:hover': { borderColor: '#3758f9', color: '#3758f9' },
                }}
              >
                Open report document
              </Button>
            )}
          </Box>

          {versions.data?.map((version) => (
            <Box key={version.id} sx={{ py: 1, borderTop: '1px solid #f2f4f7', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#101828' }}>
                  Version {version.versionNo}
                </Typography>
                <StatusChip status={version.status} />
              </Stack>
              <Typography variant="caption" sx={{ color: '#667085' }}>
                {version.narrative ? `${version.narrative.length} characters` : 'Narrative pending'}
              </Typography>
            </Box>
          ))}
          {versions.data?.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No report has been authored for this inspection yet.
            </Typography>
          )}
        </Paper>

        {/* MF3 decision flow: MF3-01/02 upload, MF3-03 quality decision, MF3-05 detection,
            MF3-06 findings and MF3-07 draft. Report 3 places these on the inspection, so they
            belong on this route rather than only behind a row click on the list. */}
        <InspectorWorkspace inspectionId={inspectionId} isInspector={isInspector} />

        {/* The stored captures and their provenance. Intake happens in Step 1 above, so this
            card only reads. */}
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 2.5, sm: 3 },
            borderRadius: '16px',
            border: '1px solid #eaecf0',
            bgcolor: '#ffffff',
            boxShadow: '0 1px 3px rgba(16, 24, 40, 0.05)',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#101828', mb: 2.5 }}>
            Evidence register ({evidenceItems.length})
          </Typography>
          <QueryState
            isLoading={evidence.isLoading}
            error={evidence.error}
            onRetry={() => void evidence.refetch()}
            isEmpty={evidenceItems.length === 0 && !evidence.isLoading}
            empty={
              <EmptyState
                title="No evidence recorded"
                description="Upload captures in Step 1 above; they appear here with previews and provenance."
              />
            }
          >
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'minmax(240px, 320px) minmax(0, 1fr)' },
                gap: 2.5,
              }}
            >
              <Stack spacing={1}>
                {evidenceItems.map((item) => {
                  const isSelected = item.id === selectedEvidence?.id;
                  return (
                    <Paper
                      key={item.id}
                      variant="outlined"
                      sx={{
                        p: 1.75,
                        cursor: 'pointer',
                        borderRadius: '10px',
                        border: '1px solid',
                        borderColor: isSelected ? '#3758f9' : '#eaecf0',
                        bgcolor: isSelected ? '#eff3ff' : '#ffffff',
                        transition: 'all 0.15s ease',
                        '&:hover': {
                          borderColor: isSelected ? '#3758f9' : '#d0d5dd',
                          bgcolor: isSelected ? '#eff3ff' : '#f9fafb',
                        },
                      }}
                      onClick={() => setSelectedEvidenceId(item.id)}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#101828', wordBreak: 'break-word' }}>
                        {item.fileName}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#667085', display: 'block', mt: 0.25 }}>
                        {item.contentType} · {formatBytes(item.sizeBytes)}
                      </Typography>
                    </Paper>
                  );
                })}
              </Stack>

              {selectedEvidence && (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2.5,
                    borderRadius: '12px',
                    border: '1px solid #eaecf0',
                    bgcolor: '#fafbfc',
                  }}
                >
                  <Stack spacing={2}>
                    {selectedEvidence.contentType.startsWith('image/') ? (
                      <AuthenticatedImage
                        src={inspectionApi.evidenceContentUrl(inspectionId, selectedEvidence.id)}
                        alt={selectedEvidence.fileName}
                        maxHeight={460}
                        sx={{
                          border: '1px solid #eaecf0',
                          borderRadius: '8px',
                          bgcolor: '#ffffff',
                        }}
                      />
                    ) : (
                      <Alert severity="info">
                        {selectedEvidence.contentType} has no inline preview.
                      </Alert>
                    )}
                    <Box>
                      <Typography variant="caption" sx={{ color: '#475467', fontFamily: 'monospace', display: 'block', wordBreak: 'break-all' }}>
                        SHA-256 {selectedEvidence.checksumSha256}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#667085', display: 'block', mt: 0.5 }}>
                        Captured {selectedEvidence.captureTime ?? 'time not recorded'} · Source{' '}
                        {selectedEvidence.source}
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              )}
            </Box>
          </QueryState>
        </Paper>

        {/* Findings Card */}
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 2.5, sm: 3 },
            borderRadius: '16px',
            border: '1px solid #eaecf0',
            bgcolor: '#ffffff',
            boxShadow: '0 1px 3px rgba(16, 24, 40, 0.05)',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#101828' }}>
            Findings ({(findings.data ?? []).length})
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            MF3-06 lets the assigned Inspector record a finding; MF3-09 lets a qualified reviewer
            who is not the author decide whether it is official. Only confirmed findings reach the
            report and the repair scope.
          </Typography>

          <QueryState
            isLoading={findings.isLoading}
            error={findings.error}
            onRetry={() => void findings.refetch()}
            isEmpty={(findings.data ?? []).length === 0 && !findings.isLoading}
            empty={
              <EmptyState
                title="No findings recorded"
                description="Findings appear once the Inspector records one in Step 4; a qualified reviewer then decides whether it is official."
              />
            }
          >
            <Stack spacing={2}>
              {findings.data?.map((finding) => (
                <Paper
                  key={finding.id}
                  variant="outlined"
                  sx={{
                    p: { xs: 2, sm: 2.5 },
                    borderRadius: '14px',
                    border: '1px solid #eaecf0',
                    bgcolor: '#ffffff',
                    boxShadow: '0 1px 3px rgba(16, 24, 40, 0.04)',
                  }}
                >
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', md: finding.evidenceId ? '1.3fr 0.7fr' : '1fr' },
                      gap: 2.5,
                      alignItems: 'start',
                    }}
                  >
                    <Stack spacing={1}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                        <Typography variant="body1" sx={{ fontWeight: 700, color: '#101828' }}>
                          {finding.defectLabel}
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                          <Chip
                            size="small"
                            color={SEVERITY_COLOR[finding.severity] ?? 'default'}
                            label={finding.severity}
                            sx={{ borderRadius: '6px', fontWeight: 600 }}
                          />
                          <StatusChip status={finding.decision ?? 'PENDING'} />
                          {finding.repairRequired && (
                            <Chip size="small" color="error" variant="outlined" label="Repair required" sx={{ borderRadius: '6px', fontWeight: 600 }} />
                          )}
                        </Stack>
                      </Stack>
                      <Typography variant="body2" sx={{ color: '#475467' }}>
                        {finding.locationDescription}
                      </Typography>
                      {finding.technicalNotes && (
                        <Typography variant="caption" sx={{ color: '#667085', display: 'block', lineHeight: 1.5 }}>
                          Notes: {finding.technicalNotes}
                        </Typography>
                      )}
                      {finding.recommendedAction && (
                        <Box sx={{ mt: 1, p: 1.25, borderRadius: '6px', bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                          <Typography variant="caption" sx={{ color: '#1d4ed8', fontWeight: 600, display: 'block' }}>
                            Action: {finding.recommendedAction}
                          </Typography>
                        </Box>
                      )}
                    </Stack>

                    {finding.evidenceId && (
                      <Box
                        sx={{
                          borderRadius: '10px',
                          border: '1px solid #eaecf0',
                          overflow: 'hidden',
                          p: 1.25,
                          bgcolor: '#f8fafc',
                        }}
                      >
                        <Typography variant="caption" sx={{ fontWeight: 600, color: '#64748b', display: 'block', mb: 0.75 }}>
                          Defect photo capture
                        </Typography>
                        <AuthenticatedImage
                          src={inspectionApi.evidenceContentUrl(inspectionId, finding.evidenceId)}
                          alt={finding.defectLabel}
                          maxHeight={160}
                          sx={{ borderRadius: '6px', width: '100%' }}
                        />
                      </Box>
                    )}
                  </Box>
                  {/* A finding the reviewer has not decided is not official yet, so the report
                      and the repair scope cannot use it. */}
                  {isReviewer && !finding.decision ? (
                    <FindingDecisionControls
                      findingId={finding.id}
                      defectLabel={finding.defectLabel}
                      isPending={decideFinding.isPending}
                      error={decideFinding.isError ? decideFinding.error : null}
                      onDecide={(findingId, decision, rationale) =>
                        decideFinding.mutate({ findingId, decision, rationale })
                      }
                    />
                  ) : null}
                </Paper>
              ))}
            </Stack>
          </QueryState>
        </Paper>
      </Stack>
    </Box>
  );
}
