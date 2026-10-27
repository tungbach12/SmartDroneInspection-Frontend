import { useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
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
import { useLocale } from '@/shared/i18n/LocaleProvider';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
/**
 * MF3-01/02 evidence intake, one stage of the inspection workspace.
 *
 * Bulk upload is a client-side sequential loop: POST /evidence takes one file per call, so each
 * queued file is sent in order. A failed file stays in the queue with its error and does not
 * remove or block the others.
 */
export default function InspectionEvidencePage() {
  const { t } = useLocale();
  const { inspectionId = '' } = useParams();
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
  const workflow = useInspectionWorkflowState(inspectionId);
  const sessionHistory = useFieldSessions(inspectionId, isInspector);
  const versions = useReportVersions(inspectionId);
  const upload = useUploadInspectionEvidence(inspectionId);
  const retire = useRetireEvidence(inspectionId);
  const bulkRetire = useBulkRetireEvidence(inspectionId);

  const [queue, setQueue] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [fileErrors, setFileErrors] = useState<Record<string, string>>({});
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null);
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [showBulkRetireForm, setShowBulkRetireForm] = useState(false);

  const displayedEvidenceItems = evidence.data?.items ?? [];
  const totalEvidenceCount = evidence.data?.totalCount ?? 0;
  const activeCount = evidence.data?.activeCount ?? 0;
  const retiredCount = evidence.data?.retiredCount ?? 0;
  const currentEvidenceItems = displayedEvidenceItems.filter((item) => !item.isDeleted);
  const currentVersion = versions.data?.[0] ?? null;
  const evidenceLocked =
    Boolean(
      currentVersion && ['SUBMITTED', 'APPROVED', 'PUBLISHED', 'SUPERSEDED'].includes(currentVersion.status),
    ) || ['REPORT_PUBLISHED', 'REPAIR_PENDING', 'COMPLETED'].includes(workflow.data?.status ?? '');
  const isReturnedRevision = currentVersion?.status === 'RETURNED';
  const completedFieldSessionId = sessionHistory.data?.filter(
    (session) => session.status === 'FIELD_COMPLETED',
  ).at(-1)?.id;
  const canEditEvidence =
    isInspector && ['FIELD_COMPLETED', 'REPORT_DRAFT'].includes(workflow.data?.status ?? '') && !evidenceLocked;
  const [checklistConfirmed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(`inspection_checklist_confirmed_${inspectionId}`) === 'true';
    } catch {
      return false;
    }
  });

  const rawCanUploadEvidence =
    isInspector && ['FIELD_COMPLETED', 'REPORT_DRAFT'].includes(workflow.data?.status ?? '') && !evidenceLocked;
  const canUploadEvidence = rawCanUploadEvidence || (isInspector && checklistConfirmed && !evidenceLocked);
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
          Review the current evidence set below. Original captures are read-only for Organization
          Manager reviewers.
        </Alert>
      )}

      {isInspector && (
        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
          <Typography variant="h6">{t('Evidence intake')}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {t('MF3-01/02 intake. Choose one or more captures; each file uploads with its own call.')}
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: 'center' }}>
            {canUploadEvidence && (
              <Button component="label" variant="outlined" aria-label={t('Choose evidence files')}>
                {t('Choose evidence files')}
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
              </Button>
            )}
            <Typography variant="body2" sx={{ flexGrow: 1 }}>
              {queue.length === 0 ? t('No files staged') : `${queue.length} ${t('file(s) staged')}`}
            </Typography>
            <Button
              variant="contained"
              disabled={!canUploadEvidence || queue.length === 0 || uploading}
              onClick={() => void uploadQueue()}
            >
              {uploading ? t('Uploading…') : t('Upload staged files')}
            </Button>
          </Stack>
          {evidenceLocked && (
            <Alert severity="info" sx={{ mt: 1 }}>
              {t(
                'Evidence is locked while the report is submitted or after publication. Withdraw the submission if it has not been reviewed, or ask the reviewer to return it before making changes.',
              )}
            </Alert>
          )}
          {isReturnedRevision && (
            <Alert severity="info" sx={{ mt: 1 }}>
              {t('This report was returned for revision. Update evidence as requested, then verify and resubmit the report.')}
            </Alert>
          )}
        {queue.length > 0 && canEditEvidence && (
          <Stack spacing={1} sx={{ mt: 2 }}>
            {queue.map((file) => (
              <Box key={file.name}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, flexGrow: 1 }}>
                    {file.name}
                  </Typography>
                  <Button size="small" onClick={() => removeFromQueue(file.name)}>
                    {t('Remove')}
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
          {t('Uploaded captures are the source for advisory detection and the report. Analysis runs only when you ask for it, on the Findings step.')}
        </Typography>
      </Paper>
      )}

      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Typography variant="h6">{t('Evidence coverage')}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {t('The Inspector records what the evidence covers and any limitations in the authored report. This register preserves active and retired captures; it does not issue an evidence-quality decision.')}
        </Typography>
        <Button
          component={RouterLink}
          to="../field-session"
          variant="text"
          sx={{ alignSelf: 'flex-start' }}
        >
          {t('Review checkpoints in field session')}
        </Button>
      </Paper>

      {/* The stored captures and their provenance. Intake happens above, so this card only reads. */}
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1.5}
          sx={{ alignItems: { md: 'center' }, justifyContent: 'space-between', mb: 2 }}
        >
          <Box>
            <Typography variant="h6">{t('Evidence register')}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t('Showing')} {displayedEvidenceItems.length} {t('of')} {totalEvidenceCount} {t('matching captures')}
            </Typography>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ minWidth: { sm: 'min(100%, 620px)' } }}>
            <TextField
              size="small"
              label={t('Search evidence')}
              value={searchQuery}
              onChange={(event) => updateSearch(event.target.value)}
              sx={{ flex: 1 }}
            />
            <TextField
              select
              size="small"
              label={t('File type')}
              value={fileTypeFilter}
              onChange={(event) => updateMediaType(event.target.value as typeof fileTypeFilter)}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="ALL">{t('All types')}</MenuItem>
              <MenuItem value="IMAGE">{t('Images')}</MenuItem>
              <MenuItem value="VIDEO">Video</MenuItem>
              <MenuItem value="DOCUMENT">{t('Documents')}</MenuItem>
            </TextField>
            <TextField
              select
              size="small"
              label={t('Evidence status')}
              value={filterMode}
              onChange={(event) => updateStatus(event.target.value as typeof filterMode)}
              sx={{ minWidth: 170 }}
            >
              <MenuItem value="ACTIVE">{t('Active only (')}{activeCount})</MenuItem>
              <MenuItem value="RETIRED">{t('Retired audit (')}{retiredCount})</MenuItem>
              <MenuItem value="ALL">{t('All evidence (')}{activeCount + retiredCount})</MenuItem>
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
                      {selectedBatchIds.length} {t('capture(s) selected')}
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
                    {t('Retire')} {selectedBatchIds.length > 0 ? selectedBatchIds.length : activeCount} {t('capture(s)')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                    {t('Original files remain preserved for audit. Remove or re-link any findings citing these captures first.')}
                  </Typography>
                  <Stack spacing={1.5}>
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="contained"
                        color="warning"
                        disabled={bulkRetire.isPending}
                        onClick={async () => {
                          const targets =
                            selectedBatchIds.length > 0
                              ? selectedBatchIds
                              : currentEvidenceItems.map((e) => e.id);
                          await bulkRetire.mutateAsync(targets);
                          setSelectedBatchIds([]);
                          setShowBulkRetireForm(false);
                        }}
                      >
                        {bulkRetire.isPending ? 'Retiring captures…' : 'Confirm bulk retire'}
                      </Button>
                      <Button size="small" onClick={() => setShowBulkRetireForm(false)}>
                        {t('Cancel')}
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
              title={t('No evidence recorded')}
              description={t('Upload captures above; they appear here with previews and provenance.')}
            />
          }
        >
          {displayedEvidenceItems.length === 0 && totalEvidenceCount > 0 ? (
            <EmptyState
              title={t('No evidence matches these filters')}
              description={t('Change the search text or filters to see other captures. Retired captures are available under Evidence status.')}
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
                      {canEditEvidence && !item.isDeleted && (
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
                          {item.isDeleted && <Chip size="small" color="warning" label={t('Retired')} />}
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
                      {selectedEvidence.contentType} {t('has no inline preview.')}
                    </Alert>
                  )}
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                      {t('Captured')} {selectedEvidence.captureTime ?? 'time not recorded'}
                    </Typography>
                    {selectedEvidence.isDeleted ? (
                      <Alert severity="warning" sx={{ mt: 1 }}>
                        {t('Retired from the current evidence set. The original bytes remain available for audit.')}
                      </Alert>
                    ) : canEditEvidence ? (
                      <Stack spacing={1} sx={{ mt: 1.5 }}>
                        <Button
                          color="warning"
                          variant="outlined"
                          disabled={retire.isPending}
                          onClick={() => retire.mutate(selectedEvidence.id)}
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
