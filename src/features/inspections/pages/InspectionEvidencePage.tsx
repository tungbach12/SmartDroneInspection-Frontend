import { useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  MenuItem,
  Paper,
  Stack,
  TextField,
  TablePagination,
  Typography,
} from '@mui/material';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getErrorMessage } from '@/shared/api/errorMessage';
import { inspectionApi } from '../api/inspectionApi';
import {
  useDecideEvidenceQuality,
  useEvidenceQualityHistory,
  useInspectionEvidenceQuery,
  useInspectionWorkflowState,
  useFieldSessions,
  useReportVersions,
  useRetireEvidence,
  useBulkRetireEvidence,
  useUploadInspectionEvidence,
} from '../hooks/useInspections';
import { AuthenticatedImage } from '@/shared/ui/AuthenticatedImage';
import { EmptyState } from '@/shared/ui/EmptyState';
import { QueryState } from '@/shared/ui/QueryState';
import type { EvidenceQueryFilters } from '../hooks/useInspections';
import type { EvidenceQualityDecisionType } from '../api/inspectionApi';

/**
 * Decisions that carry a stated reason. Accepting the set does not: the reason field is hidden
 * until one of these is chosen, so an ordinary acceptance stays a single click (Report 3 MF3-03).
 */
const REASON_DECISIONS = ['ADDITIONAL_SESSION_REQUIRED'] as const;
/** Labels shared by the decision buttons and the confirm step so they never drift apart. */
const DECISION_LABELS: Record<EvidenceQualityDecisionType, string> = {
  ACCEPTED: 'Accept evidence set',
  REUPLOAD_REQUIRED: 'Re-upload required (legacy)',
  ADDITIONAL_SESSION_REQUIRED: 'Additional session needed',
  LIMITED: 'Accept with limitation (legacy)',
};
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
  const navigate = useNavigate();
  const isInspector = useAuthStore((state) => state.roles.includes('INSPECTOR'));

  const [filterMode, setFilterMode] = useState<EvidenceQueryFilters['status']>('ACTIVE');
  const [fileTypeFilter, setFileTypeFilter] = useState<EvidenceQueryFilters['mediaType']>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const evidence = useInspectionEvidenceQuery(inspectionId, {
    status: filterMode,
    mediaType: fileTypeFilter,
    search: searchQuery,
    page,
    pageSize,
  });
  const quality = useEvidenceQualityHistory(inspectionId);
  const workflow = useInspectionWorkflowState(inspectionId);
  // The field-session route is Inspector-only, so a reviewer does not request it.
  const sessionHistory = useFieldSessions(inspectionId, isInspector);
  const versions = useReportVersions(inspectionId);
  const upload = useUploadInspectionEvidence(inspectionId);
  const retire = useRetireEvidence(inspectionId);
  const bulkRetire = useBulkRetireEvidence(inspectionId);
  const decideQuality = useDecideEvidenceQuality(inspectionId);

  const [queue, setQueue] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [fileErrors, setFileErrors] = useState<Record<string, string>>({});
  const [shotListComparison, setShotListComparison] = useState('');
  const [limitationReason, setLimitationReason] = useState('');
  // Which reason-carrying decision is being confirmed. Null until the Inspector picks one, so the
  // reason field only appears when it is actually required.
  const [pendingDecision, setPendingDecision] = useState<
    (typeof REASON_DECISIONS)[number] | null
  >(null);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null);
  const [retireReason, setRetireReason] = useState('');
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [bulkRetireReason, setBulkRetireReason] = useState('');
  const [showBulkRetireForm, setShowBulkRetireForm] = useState(false);

  const displayedEvidenceItems = evidence.data?.items ?? [];
  const totalEvidenceCount = evidence.data?.totalCount ?? 0;
  const activeCount = evidence.data?.activeCount ?? 0;
  const retiredCount = evidence.data?.retiredCount ?? 0;
  const currentEvidenceItems = displayedEvidenceItems.filter((item) => item.retiredAt == null);
  const comparison = shotListComparison.trim();
  const reason = limitationReason.trim();
  const latestQualityDecision = quality.data?.[0] ?? null;
  const latestDecision = latestQualityDecision?.decision ?? null;
  const qualityIsCurrent = Boolean(
    latestQualityDecision &&
      (!evidence.data?.latestCreatedAt ||
        evidence.data.latestCreatedAt <= latestQualityDecision.decidedAt) &&
      (!evidence.data?.latestRetiredAt ||
        evidence.data.latestRetiredAt <= latestQualityDecision.decidedAt),
  );
  const currentVersion = versions.data?.[0] ?? null;
  const evidenceLocked = Boolean(currentVersion && ['SUBMITTED', 'APPROVED', 'PUBLISHED', 'SUPERSEDED'].includes(currentVersion.status));
  const completedFieldSessionId = sessionHistory.data?.filter(
    (session) => session.status === 'FIELD_COMPLETED',
  ).at(-1)?.id;
  const canAssessEvidence = isInspector && workflow.data?.status === 'FIELD_COMPLETED';
  const canEditEvidence = canAssessEvidence && !evidenceLocked;
  const canUploadEvidence = isInspector && !evidenceLocked;
  const selectedEvidence =
    displayedEvidenceItems.find((item) => item.id === selectedEvidenceId) ??
    displayedEvidenceItems[0] ??
    null;
  const updateStatus = (value: EvidenceQueryFilters['status']) => {
    setFilterMode(value);
    setPage(1);
    setSelectedBatchIds([]);
  };
  const updateMediaType = (value: EvidenceQueryFilters['mediaType']) => {
    setFileTypeFilter(value);
    setPage(1);
    setSelectedBatchIds([]);
  };
  const updateSearch = (value: string) => {
    setSearchQuery(value);
    setPage(1);
    setSelectedBatchIds([]);
  };

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
        await upload.mutateAsync({
          file,
          ...(completedFieldSessionId ? { fieldSessionId: completedFieldSessionId } : {}),
        });
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
          Review the accepted evidence set and its recorded coverage decision below. Original captures
          and quality decisions are read-only for Organization Admin reviewers.
        </Alert>
      )}

      {isInspector && <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Typography variant="h6">Evidence intake</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          MF3-01/02 intake. Choose one or more captures; each file uploads with its own call.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: 'center' }}>
          {canUploadEvidence && <Button component="label" variant="outlined" aria-label="Choose evidence files">
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
            disabled={!canUploadEvidence || queue.length === 0 || uploading}
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
      </Paper>}

      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Typography variant="h6">{isInspector ? 'Evidence quality decision' : 'Inspector evidence assessment'}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {isInspector
            ? 'MF3-03: compare the captured set against the shot-list — component coverage, focus and exposure, and the modality the scope asked for. Only the Inspector makes this call.'
            : 'Read the assigned Inspector’s latest recorded coverage assessment. The decision and comparison are shown for review; this page does not accept or change evidence on the Inspector’s behalf.'}
        </Typography>
        {canAssessEvidence && activeCount === 0 && (
          <Alert severity="info" sx={{ mb: 1.5 }}>
            Upload current captures before recording the evidence-quality decision.
          </Alert>
        )}
        {isInspector && workflow.data?.status === 'PREPARING' && (
          <Alert severity="info" sx={{ mb: 1.5 }}>
            Additional field work was requested. Continue in MF2 Preparation, then submit the new plan for independent ORG_ADMIN readiness review before starting another session.
            {' '}
            <Button component={RouterLink} to="../preparation" size="small">Open Preparation</Button>
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
        {!qualityIsCurrent && latestQualityDecision && (
          <Alert severity="warning" sx={{ mb: 1.5 }}>
            The evidence set changed after this decision. {isInspector
              ? 'Compare the current captures with the shot-list and record a new quality decision before analysis or report drafting.'
              : 'This historical assessment is shown for context; the Inspector must reassess the current set.'}
          </Alert>
        )}
        <Stack spacing={1.5}>
          {canAssessEvidence && <TextField
            label="Shot-list comparison"
            helperText="Required. What the set covers and what it does not — the report discloses this, and a disclosed gap is not evidence of no defect."
            multiline
            minRows={2}
            value={shotListComparison}
            onChange={(event) => setShotListComparison(event.target.value)}
            slotProps={{ htmlInput: { maxLength: 8000 } }}
          />}
          {latestQualityDecision && (
            <Paper
              variant="outlined"
              sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: '8px' }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>
                {DECISION_LABELS[latestQualityDecision.decision]} recorded{' '}
                {new Date(latestQualityDecision.decidedAt).toLocaleString()}
                {qualityIsCurrent ? '' : ' — no longer current, shown for reference'}
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                {latestQualityDecision.shotListComparison?.trim() ||
                  'No shot-list comparison was recorded.'}
              </Typography>
              {latestQualityDecision.limitationReason?.trim() && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                  Limitation or reason: {latestQualityDecision.limitationReason}
                </Typography>
              )}
            </Paper>
          )}
          {canAssessEvidence && <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              disabled={!canEditEvidence || decideQuality.isPending || activeCount === 0 || !comparison}
              onClick={() =>
                decideQuality.mutate({
                  decision: 'ACCEPTED',
                  shotListComparison: comparison,
                })
              }
            >
              {DECISION_LABELS.ACCEPTED}
            </Button>
            {REASON_DECISIONS.map((decision) => (
              <Button
                key={decision}
                variant="outlined"
                disabled={!canEditEvidence || decideQuality.isPending || activeCount === 0 || !comparison}
                onClick={() => setPendingDecision(decision)}
              >
                {DECISION_LABELS[decision]}
              </Button>
            ))}
            <Button
              component={RouterLink}
              to="../preparation"
              variant="text"
              sx={{ alignSelf: 'flex-start' }}
            >
              Review the shot-list in preparation
            </Button>
          </Stack>}
          {pendingDecision && canAssessEvidence && (
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'action.hover', borderRadius: '8px' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Confirm “{DECISION_LABELS[pendingDecision]}”
              </Typography>
              <Stack spacing={1.5}>
                <TextField
                  label="Why is another field session needed?"
                  helperText="Describe the uncovered scope and why another field visit is necessary."
                  multiline
                  minRows={2}
                  autoFocus
                  value={limitationReason}
                  onChange={(event) => setLimitationReason(event.target.value)}
                  slotProps={{ htmlInput: { maxLength: 2000 } }}
                />
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="contained"
                    disabled={decideQuality.isPending || !reason || !comparison}
                    onClick={() =>
                      decideQuality.mutate(
                        {
                          decision: pendingDecision,
                          shotListComparison: comparison,
                          limitationReason: reason,
                        },
                        {
                          onSuccess: () => {
                            setPendingDecision(null);
                            setLimitationReason('');
                            navigate('../preparation');
                          },
                        },
                      )
                    }
                  >
                    Confirm {DECISION_LABELS[pendingDecision]}
                  </Button>
                  <Button onClick={() => setPendingDecision(null)}>Cancel</Button>
                </Stack>
              </Stack>
            </Paper>
          )}
          {canAssessEvidence && <Typography variant="caption" color="text.secondary">
            Only an accepted set unlocks advisory detection and report drafting. Additional-session requests return to MF2 preparation and independent readiness review; the system never starts the session automatically.
          </Typography>}
        </Stack>
        {decideQuality.isError && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {getErrorMessage(decideQuality.error, 'The evidence decision was not recorded.')}
          </Alert>
        )}
      </Paper>

      {/* The stored captures and their provenance. Intake happens above, so this card only reads. */}
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1.5}
          sx={{ alignItems: { md: 'center' }, justifyContent: 'space-between', mb: 2 }}
        >
          <Box>
            <Typography variant="h6">Evidence register</Typography>
            <Typography variant="body2" color="text.secondary">
              Showing {displayedEvidenceItems.length} of {totalEvidenceCount} matching captures
            </Typography>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ minWidth: { sm: 'min(100%, 620px)' } }}>
            <TextField
              size="small"
              label="Search evidence"
              value={searchQuery}
              onChange={(event) => updateSearch(event.target.value)}
              sx={{ flex: 1 }}
            />
            <TextField
              select
              size="small"
              label="File type"
              value={fileTypeFilter}
              onChange={(event) => updateMediaType(event.target.value as typeof fileTypeFilter)}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="ALL">All types</MenuItem>
              <MenuItem value="IMAGE">Images</MenuItem>
              <MenuItem value="VIDEO">Video</MenuItem>
              <MenuItem value="DOCUMENT">Documents</MenuItem>
            </TextField>
            <TextField
              select
              size="small"
              label="Evidence status"
              value={filterMode}
              onChange={(event) => updateStatus(event.target.value as typeof filterMode)}
              sx={{ minWidth: 170 }}
            >
              <MenuItem value="ACTIVE">Active only ({activeCount})</MenuItem>
              <MenuItem value="RETIRED">Retired audit ({retiredCount})</MenuItem>
              <MenuItem value="ALL">All evidence ({activeCount + retiredCount})</MenuItem>
            </TextField>
          </Stack>
        </Stack>

        {canEditEvidence && activeCount > 0 && (
          <Paper variant="outlined" sx={{ p: 1.5, mb: 2, bgcolor: 'background.default', borderRadius: '10px' }}>
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Button
                    size="small"
                    onClick={() => {
                      if (selectedBatchIds.length === currentEvidenceItems.length) {
                        setSelectedBatchIds([]);
                      } else {
                        setSelectedBatchIds(currentEvidenceItems.map((e) => e.id));
                      }
                    }}
                  >
                    {selectedBatchIds.length === currentEvidenceItems.length ? 'Deselect all' : `Select all active on this page (${currentEvidenceItems.length})`}
                  </Button>
                  {selectedBatchIds.length > 0 && (
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      {selectedBatchIds.length} capture(s) selected
                    </Typography>
                  )}
                </Stack>
                <Button
                  size="small"
                  color="warning"
                  variant="outlined"
                  onClick={() => setShowBulkRetireForm((prev) => !prev)}
                >
                  {showBulkRetireForm
                    ? 'Cancel bulk retire'
                    : selectedBatchIds.length > 0
                      ? `Bulk retire selected (${selectedBatchIds.length})`
                      : `Bulk retire all active (${activeCount})`}
                </Button>
              </Stack>

              {showBulkRetireForm && (
                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'action.hover', borderRadius: '8px' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                    Retire {selectedBatchIds.length > 0 ? selectedBatchIds.length : activeCount} capture(s) with a shared audit reason
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                    Original files and checksums remain preserved for audit. Remove or re-link any findings citing these captures first.
                  </Typography>
                  <Stack spacing={1.5}>
                    <TextField
                      size="small"
                      label="Shared reason for retiring batch"
                      placeholder="e.g. Uploaded wrong SD card from another site / invalid flight session"
                      value={bulkRetireReason}
                      onChange={(e) => setBulkRetireReason(e.target.value)}
                      required
                    />
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="contained"
                        color="warning"
                        disabled={bulkRetire.isPending || !bulkRetireReason.trim()}
                        onClick={async () => {
                          const targets =
                            selectedBatchIds.length > 0
                              ? selectedBatchIds
                              : currentEvidenceItems.map((e) => e.id);
                          await bulkRetire.mutateAsync({
                            evidenceIds: targets,
                            reason: bulkRetireReason.trim(),
                          });
                          setSelectedBatchIds([]);
                          setBulkRetireReason('');
                          setShowBulkRetireForm(false);
                        }}
                      >
                        {bulkRetire.isPending ? 'Retiring captures…' : 'Confirm bulk retire'}
                      </Button>
                      <Button size="small" onClick={() => { setShowBulkRetireForm(false); setBulkRetireReason(''); }}>
                        Cancel
                      </Button>
                    </Stack>
                    {bulkRetire.isError && (
                      <Alert severity="error">
                        {getErrorMessage(bulkRetire.error, 'Bulk retirement was not completed.')}
                      </Alert>
                    )}
                  </Stack>
                </Paper>
              )}
            </Stack>
          </Paper>
        )}

        <QueryState
          isLoading={evidence.isLoading}
          error={evidence.error}
          onRetry={() => void evidence.refetch()}
          isEmpty={totalEvidenceCount === 0 && !evidence.isLoading}
          empty={
            <EmptyState
              title="No evidence recorded"
              description="Upload captures above; they appear here with previews and provenance."
            />
          }
        >
          {displayedEvidenceItems.length === 0 && totalEvidenceCount > 0 ? (
            <EmptyState
              title="No evidence matches these filters"
              description="Change the search text or filters to see other captures. Retired captures are available under Evidence status."
            />
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'minmax(240px, 320px) minmax(0, 1fr)' },
                gap: 2.5,
              }}
            >
              <Stack spacing={1}>
              {displayedEvidenceItems.map((item) => {
                const isSelected = item.id === selectedEvidence?.id;
                const isChecked = selectedBatchIds.includes(item.id);
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
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      {canEditEvidence && !item.retiredAt && (
                        <Checkbox
                          size="small"
                          checked={isChecked}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            setSelectedBatchIds((prev) =>
                              e.target.checked ? [...prev, item.id] : prev.filter((id) => id !== item.id)
                            );
                          }}
                          sx={{ p: 0.25 }}
                        />
                      )}
                      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', wordBreak: 'break-word' }}>
                            {item.fileName}
                          </Typography>
                          {item.retiredAt && <Chip size="small" color="warning" label="Retired — audit copy" />}
                        </Stack>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
                          {item.contentType} · {formatBytes(item.sizeBytes)}
                        </Typography>
                      </Box>
                    </Stack>
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
          )}
          <TablePagination
            component="div"
            count={totalEvidenceCount}
            page={page - 1}
            onPageChange={(_event, nextPage) => {
              setSelectedBatchIds([]);
              setPage(nextPage + 1);
            }}
            rowsPerPage={pageSize}
            onRowsPerPageChange={(event) => {
              setPageSize(Number(event.target.value));
              setPage(1);
            }}
            rowsPerPageOptions={[25, 50, 100]}
          />
        </QueryState>
      </Paper>
    </Stack>
  );
}
