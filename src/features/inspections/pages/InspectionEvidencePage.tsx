import { useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getErrorMessage } from '@/shared/api/errorMessage';
import { inspectionApi } from '../api/inspectionApi';
import {
  useDecideEvidenceQuality,
  useEvidenceQualityHistory,
  useInspectionEvidence,
  useReportVersions,
  useRetireEvidence,
  useUploadInspectionEvidence,
} from '../hooks/useInspections';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { EmptyState } from '@/shared/ui/EmptyState';
import { QueryState } from '@/shared/ui/QueryState';
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
/**
 * MF3-01/02 upload plus the MF3-03 set-level Accept, one stage of the inspection workspace.
 *
 * Bulk upload is a client-side sequential loop: POST /evidence takes one file per call, so each
 * queued file is sent in order. A failed file stays in the queue with its error and does not
 * remove or block the others.
 */
export default function InspectionEvidencePage() {
  const { inspectionId = '' } = useParams();
  const isInspector = useAuthStore((state) => state.roles.includes('INSPECTOR'));

  const evidence = useInspectionEvidence(inspectionId);
  const quality = useEvidenceQualityHistory(inspectionId);
  const versions = useReportVersions(inspectionId);
  const upload = useUploadInspectionEvidence(inspectionId);
  const retire = useRetireEvidence(inspectionId);
  const decideQuality = useDecideEvidenceQuality(inspectionId);

  const [queue, setQueue] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [fileErrors, setFileErrors] = useState<Record<string, string>>({});
  const [shotListComparison, setShotListComparison] = useState('');
  const [limitationReason, setLimitationReason] = useState('');
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null);
  const [retireReason, setRetireReason] = useState('');

  const evidenceItems = evidence.data ?? [];
  const currentEvidenceItems = evidenceItems.filter((item) => item.retiredAt == null);
  const comparison = shotListComparison.trim();
  const reason = limitationReason.trim();
  const latestQualityDecision = quality.data?.[0] ?? null;
  const latestDecision = latestQualityDecision?.decision ?? null;
  const qualityIsCurrent = Boolean(
    latestQualityDecision &&
      evidenceItems.every((item) => {
        const notAddedAfter = item.createdAt <= latestQualityDecision.decidedAt;
        const notRetiredAfter = !item.retiredAt || item.retiredAt <= latestQualityDecision.decidedAt;
        return notAddedAfter && notRetiredAfter;
      }),
  );
  const currentVersion = versions.data?.[0] ?? null;
  const evidenceLocked = Boolean(currentVersion && ['SUBMITTED', 'APPROVED', 'PUBLISHED', 'SUPERSEDED'].includes(currentVersion.status));
  const canEditEvidence = isInspector && !evidenceLocked;
  const selectedEvidence =
    evidenceItems.find((item) => item.id === selectedEvidenceId) ?? evidenceItems[0] ?? null;

  const removeFromQueue = (name: string) => {
    setQueue((prev) => prev.filter((file) => file.name !== name));
    setFileErrors((prev) => {
      if (!(name in prev)) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const uploadQueue = async () => {
    if (uploading || queue.length === 0) return;
    setUploading(true);
    // Sequential so the server sees one file per call and a failure cannot lose the rest.
    for (const file of [...queue]) {
      try {
        await upload.mutateAsync(file);
        setQueue((prev) => prev.filter((queued) => queued !== file));
        setFileErrors((prev) => {
          if (!(file.name in prev)) return prev;
          const next = { ...prev };
          delete next[file.name];
          return next;
        });
      } catch (error) {
        setFileErrors((prev) => ({
          ...prev,
          [file.name]: getErrorMessage(error, 'Upload failed. Retry to safely try again.'),
        }));
      }
    }
    setUploading(false);
  };

  return (
    <Stack spacing={2}>
      {!isInspector && (
        <Alert severity="info" sx={{ borderRadius: '12px' }}>
          You are viewing this inspection as a reader. Evidence intake and the evidence-quality
          decision belong to the assigned Inspector.
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Typography variant="h6">Evidence upload</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          MF3-01/02 intake. Choose one or more captures; each file uploads with its own call.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: 'center' }}>
          {canEditEvidence && <Button component="label" variant="outlined" aria-label="Choose evidence files">
            Choose evidence files
            <input
              hidden
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp,image/tiff,video/mp4,application/pdf"
              onChange={(event) => {
                const chosen = Array.from(event.target.files ?? []);
                if (chosen.length > 0) {
                  setQueue((prev) => [...prev, ...chosen]);
                }
                event.target.value = '';
              }}
            />
          </Button>}
          <Typography variant="body2" sx={{ flexGrow: 1 }}>
            {queue.length === 0 ? 'No files staged' : `${queue.length} file(s) staged`}
          </Typography>
          <Button
            variant="contained"
            disabled={!canEditEvidence || queue.length === 0 || uploading}
            onClick={() => void uploadQueue()}
          >
            {uploading ? 'Uploading…' : 'Upload staged files'}
          </Button>
        </Stack>
        {evidenceLocked && <Alert severity="info" sx={{ mt: 1 }}>Evidence is locked while the report is submitted or after publication. If the reviewer returns the report, you can correct the evidence set.</Alert>}
        {queue.length > 0 && canEditEvidence && (
          <Stack spacing={1} sx={{ mt: 2 }}>
            {queue.map((file) => (
              <Box key={file.name}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, flexGrow: 1 }}>
                    {file.name}
                  </Typography>
                  <Button size="small" onClick={() => removeFromQueue(file.name)}>
                    Remove
                  </Button>
                </Stack>
                {fileErrors[file.name] && (
                  <Alert severity="error" sx={{ mt: 0.5 }}>
                    {fileErrors[file.name]}
                  </Alert>
                )}
              </Box>
            ))}
          </Stack>
        )}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
          Uploaded captures become eligible for advisory detection once the set is accepted below.
        </Typography>
      </Paper>

      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Typography variant="h6">Evidence quality decision</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          MF3-03: compare the captured set against the shot-list — component coverage, focus and
          exposure, and the modality the scope asked for. Only the Inspector makes this call.
        </Typography>
        {evidenceItems.length === 0 && (
          <Alert severity="info" sx={{ mb: 1.5 }}>
            Upload current captures before recording the evidence-quality decision.
          </Alert>
        )}
        {latestDecision && (
          <Chip
            size="small"
            sx={{ mb: 1 }}
            color={qualityIsCurrent ? (latestDecision === 'ACCEPTED' ? 'success' : 'warning') : 'warning'}
            label={qualityIsCurrent ? latestDecision.replaceAll('_', ' ') : 'EVIDENCE SET CHANGED — REASSESS'}
          />
        )}
        {!qualityIsCurrent && latestQualityDecision && canEditEvidence && (
          <Alert severity="warning" sx={{ mb: 1.5 }}>
            The evidence set changed after this decision. Compare the current captures with the shot-list and record a new quality decision before analysis or report drafting.
          </Alert>
        )}
        <Stack spacing={1.5}>
          <TextField
            label="Shot-list comparison"
            helperText="Required. What the set covers and what it does not — the report discloses this, and a disclosed gap is not evidence of no defect."
            multiline
            minRows={2}
            value={shotListComparison}
            onChange={(event) => setShotListComparison(event.target.value)}
            slotProps={{ htmlInput: { maxLength: 8000 } }}
          />
          <TextField
            label="Limitation or reason (required for limited, re-upload or additional session)"
            multiline
            minRows={2}
            value={limitationReason}
            onChange={(event) => setLimitationReason(event.target.value)}
            slotProps={{ htmlInput: { maxLength: 2000 } }}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button
              variant="contained"
              disabled={!canEditEvidence || decideQuality.isPending || currentEvidenceItems.length === 0 || !comparison}
              onClick={() =>
                decideQuality.mutate({
                  decision: 'ACCEPTED',
                  shotListComparison: comparison,
                })
              }
            >
              Accept evidence set
            </Button>
            <Button
              variant="outlined"
              disabled={!canEditEvidence || decideQuality.isPending || currentEvidenceItems.length === 0 || !reason || !comparison}
              onClick={() =>
                decideQuality.mutate({
                  decision: 'REUPLOAD_REQUIRED',
                  shotListComparison: comparison,
                  limitationReason: reason,
                })
              }
            >
              Re-upload required
            </Button>
            <Button
              variant="outlined"
              disabled={!canEditEvidence || decideQuality.isPending || currentEvidenceItems.length === 0 || !reason || !comparison}
              onClick={() =>
                decideQuality.mutate({
                  decision: 'ADDITIONAL_SESSION_REQUIRED',
                  shotListComparison: comparison,
                  limitationReason: reason,
                })
              }
            >
              Additional session needed
            </Button>
            <Button
              variant="outlined"
              disabled={!canEditEvidence || decideQuality.isPending || currentEvidenceItems.length === 0 || !reason || !comparison}
              onClick={() =>
                decideQuality.mutate({
                  decision: 'LIMITED',
                  shotListComparison: comparison,
                  limitationReason: reason,
                })
              }
            >
              Accept with limitation
            </Button>
            <Button
              component={RouterLink}
              to="../preparation"
              variant="text"
              sx={{ alignSelf: 'flex-start' }}
            >
              Review the shot-list in preparation
            </Button>
          </Stack>
        </Stack>
        {decideQuality.isError && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {getErrorMessage(decideQuality.error, 'The evidence decision was not recorded.')}
          </Alert>
        )}
      </Paper>

      {/* The stored captures and their provenance. Intake happens above, so this card only reads. */}
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
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
              description="Upload captures above; they appear here with previews and provenance."
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
                      borderColor: isSelected ? 'primary.main' : 'divider',
                      bgcolor: isSelected ? 'primary.light' : 'background.paper',
                    }}
                    onClick={() => setSelectedEvidenceId(item.id)}
                  >
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', wordBreak: 'break-word' }}>
                        {item.fileName}
                      </Typography>
                      {item.retiredAt && <Chip size="small" color="warning" label="Retired — audit copy" />}
                    </Stack>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
                      {item.contentType} · {formatBytes(item.sizeBytes)}
                    </Typography>
                  </Paper>
                );
              })}
            </Stack>

            {selectedEvidence && (
              <Paper
                variant="outlined"
                sx={{ p: 2.5, borderRadius: '12px', border: '1px solid',
                      borderColor: 'divider', bgcolor: 'background.default' }}
              >
                <Stack spacing={2}>
                  {selectedEvidence.contentType.startsWith('image/') ? (
                    <AuthenticatedImage
                      src={inspectionApi.evidenceContentUrl(inspectionId, selectedEvidence.id)}
                      alt={selectedEvidence.fileName}
                      maxHeight={460}
                      sx={{ border: '1px solid',
                      borderColor: 'divider', borderRadius: '8px', bgcolor: 'background.paper' }}
                    />
                  ) : (
                    <Alert severity="info">
                      {selectedEvidence.contentType} has no inline preview.
                    </Alert>
                  )}
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace', display: 'block', wordBreak: 'break-all' }}>
                      SHA-256 {selectedEvidence.checksumSha256}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                      Captured {selectedEvidence.captureTime ?? 'time not recorded'} · Source{' '}
                      {selectedEvidence.source}
                    </Typography>
                    {selectedEvidence.retiredAt ? (
                      <Alert severity="warning" sx={{ mt: 1 }}>
                        Retired from the current evidence set on {new Date(selectedEvidence.retiredAt).toLocaleString()}. The original bytes remain available for audit.
                        {selectedEvidence.retirementReason ? ` Reason: ${selectedEvidence.retirementReason}` : ''}
                      </Alert>
                    ) : canEditEvidence ? (
                      <Stack spacing={1} sx={{ mt: 1.5 }}>
                        <TextField
                          size="small"
                          label="Reason for replacing this capture"
                          value={retireReason}
                          onChange={(event) => setRetireReason(event.target.value)}
                          helperText="The original capture and checksum stay in the audit record. Remove or re-link findings that use it first."
                        />
                        <Button
                          color="warning"
                          variant="outlined"
                          disabled={!retireReason.trim() || retire.isPending}
                          onClick={() => retire.mutate({ evidenceId: selectedEvidence.id, reason: retireReason.trim() }, { onSuccess: () => setRetireReason('') })}
                          sx={{ alignSelf: 'flex-start' }}
                        >
                          {retire.isPending ? 'Retiring capture…' : 'Retire from current evidence set'}
                        </Button>
                        {retire.isError && <Alert severity="error">{getErrorMessage(retire.error, 'The capture was not retired.')}</Alert>}
                      </Stack>
                    ) : null}
                  </Box>
                </Stack>
              </Paper>
            )}
          </Box>
        </QueryState>
      </Paper>
    </Stack>
  );
}
