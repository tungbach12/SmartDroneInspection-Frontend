import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import CloudUploadOutlined from '@mui/icons-material/CloudUploadOutlined';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import InsertDriveFileOutlined from '@mui/icons-material/InsertDriveFileOutlined';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getErrorMessage } from '@/shared/api/errorMessage';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { inspectionApi } from '../api/inspectionApi';
import {
  useInspectionEvidenceQuery,
  useInspectionWorkflowState,
  useFieldSessions,
  useReportVersions,
  useRetireEvidence,
  useBulkRetireEvidence,
  useUploadInspectionEvidence,
  useInspection,
  useReinspectionVerifications,
  useUpdateReinspectionVerification,
} from '../hooks/useInspections';
import { TargetFlightShotList } from '../components/TargetFlightShotList';
import { AuthenticatedMedia } from '@/shared/ui/AuthenticatedMedia';
import { EmptyState } from '@/shared/ui/EmptyState';
import { QueryState } from '@/shared/ui/QueryState';
import type { EvidenceQueryFilters } from '../hooks/useInspections';
import { useLocale } from '@/shared/i18n/LocaleProvider';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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

  const inspectionQuery = useInspection(inspectionId);
  const inspection = inspectionQuery.data;
  const isReinspection = inspection?.inspectionType === 'RE_INSPECTION';
  const navigate = useNavigate();

  useEffect(() => {
    if (isReinspection) {
      navigate('../findings', { replace: true });
    }
  }, [isReinspection, navigate]);

  const reinspectionVerifications = useReinspectionVerifications(isReinspection ? inspectionId : '');
  const updateVerificationMutation = useUpdateReinspectionVerification(inspectionId);

  const handleLinkEvidence = async (verificationId: string, evidenceId: string) => {
    const item = reinspectionVerifications.data?.find((v) => v.id === verificationId);
    if (!item) return;
    await updateVerificationMutation.mutateAsync({
      verificationId,
      payload: {
        resolutionStatus: item.resolutionStatus,
        newEvidenceId: evidenceId ? evidenceId : null,
        inspectorNotes: item.inspectorNotes ?? null,
      },
    });
  };

  const [queue, setQueue] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [fileErrors, setFileErrors] = useState<Record<string, string>>({});
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null);
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
  const completedFieldSessionId = sessionHistory.data
    ?.filter((session) => session.status === 'FIELD_COMPLETED')
    .at(-1)?.id;
  const hasCompletedFieldSession = Boolean(completedFieldSessionId);
  const canEditEvidence =
    isInspector &&
    (['FIELD_COMPLETED', 'REPORT_DRAFT'].includes(workflow.data?.status ?? '') ||
      hasCompletedFieldSession) &&
    !evidenceLocked;
  const canUploadEvidence =
    isInspector &&
    (['FIELD_COMPLETED', 'REPORT_DRAFT'].includes(workflow.data?.status ?? '') ||
      hasCompletedFieldSession) &&
    !evidenceLocked;
  const selectedEvidence =
    displayedEvidenceItems.find((item) => item.id === selectedEvidenceId) ??
    displayedEvidenceItems[0] ??
    null;

  const updateStatus = (value: EvidenceQueryFilters['status']) => {
    setFilterMode(value);
    setPage(1);
    setSelectedBatchIds([]);
    setShowDeleteConfirm(false);
  };
  const updateMediaType = (value: EvidenceQueryFilters['mediaType']) => {
    setFileTypeFilter(value);
    setPage(1);
    setSelectedBatchIds([]);
    setShowDeleteConfirm(false);
  };
  const updateSearch = (value: string) => {
    setSearchQuery(value);
    setPage(1);
    setSelectedBatchIds([]);
    setShowDeleteConfirm(false);
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

  const allPageActiveSelected =
    currentEvidenceItems.length > 0 && selectedBatchIds.length === currentEvidenceItems.length;

  const hasBatchSelection = selectedBatchIds.length > 0;
  const deleteButtonLabel = allPageActiveSelected
    ? `${t('Delete all')} (${currentEvidenceItems.length})`
    : hasBatchSelection
      ? `${t('Delete selected')} (${selectedBatchIds.length})`
      : t('Delete evidence');

  const handleDeleteAction = async () => {
    if (hasBatchSelection) {
      const targets =
        selectedBatchIds.length > 0 ? selectedBatchIds : currentEvidenceItems.map((e) => e.id);
      await bulkRetire.mutateAsync(targets);
      setSelectedBatchIds([]);
      setShowDeleteConfirm(false);
    } else if (selectedEvidence && !selectedEvidence.isDeleted) {
      retire.mutate(selectedEvidence.id);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <Stack spacing={2}>
      {isReinspection && (
        <TargetFlightShotList
          mode="evidence-assignment"
          inspectionId={inspectionId}
          sourceInspectionId={inspection?.sourceInspectionId}
          items={reinspectionVerifications.data ?? []}
          evidenceList={currentEvidenceItems}
          onLinkEvidence={handleLinkEvidence}
          readOnly={!canEditEvidence}
        />
      )}

      {!isInspector && (
        <Alert severity="info" sx={{ borderRadius: '12px' }}>
          Review the current evidence set below. Original captures are read-only for Organization
          Manager reviewers.
        </Alert>
      )}

      {isInspector && (
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 2, sm: 2.25 },
            borderRadius: '14px',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between' }}
          >
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                {t('Evidence intake')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {queue.length === 0
                  ? t('Select inspection photos, videos, or documents to upload.')
                  : `${queue.length} ${t('file(s) staged')}`}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              {canUploadEvidence && (
                <Button
                  component="label"
                  variant="outlined"
                  size="small"
                  startIcon={<CloudUploadOutlined fontSize="small" />}
                  aria-label={t('Choose evidence files')}
                  sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                >
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
              <Button
                variant="contained"
                size="small"
                disabled={!canUploadEvidence || queue.length === 0 || uploading}
                onClick={() => void uploadQueue()}
                sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
              >
                {uploading ? t('Uploading…') : t('Upload staged files')}
              </Button>
            </Stack>
          </Stack>

          {evidenceLocked && (
            <Alert severity="info" sx={{ mt: 1.5, borderRadius: '10px' }}>
              {t(
                'Evidence is locked while the report is submitted or after publication. Withdraw the submission if it has not been reviewed, or ask the reviewer to return it before making changes.',
              )}
            </Alert>
          )}
          {isReturnedRevision && (
            <Alert severity="info" sx={{ mt: 1.5, borderRadius: '10px' }}>
              {t('This report was returned for revision. Update evidence as requested, then verify and resubmit the report.')}
            </Alert>
          )}

          {queue.length > 0 && canEditEvidence && (
            <Stack spacing={0.75} sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
              {queue.map((file) => (
                <Box key={file.name}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <InsertDriveFileOutlined fontSize="small" sx={{ color: 'text.secondary' }} />
                    <Typography variant="body2" sx={{ fontWeight: 600, flexGrow: 1 }}>
                      {file.name}
                    </Typography>
                    <Button size="small" color="error" onClick={() => removeFromQueue(file.name)}>
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
        </Paper>
      )}

      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2, sm: 2.5 },
          borderRadius: '14px',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Stack
          direction={{ xs: 'column', lg: 'row' }}
          spacing={1.5}
          sx={{ alignItems: { lg: 'center' }, justifyContent: 'space-between', mb: 2 }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {t('Evidence register')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('Showing')} {displayedEvidenceItems.length} {t('of')} {totalEvidenceCount}{' '}
              {t('matching captures')}
            </Typography>
          </Box>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            sx={{ minWidth: { sm: 'min(100%, 580px)' } }}
          >
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
              sx={{ minWidth: 140 }}
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
              sx={{ minWidth: 165 }}
            >
              <MenuItem value="ACTIVE">
                {t('Active only (')}
                {activeCount})
              </MenuItem>
              <MenuItem value="RETIRED">
                {t('Deleted (')}
                {retiredCount})
              </MenuItem>
              <MenuItem value="ALL">
                {t('All evidence (')}
                {activeCount + retiredCount})
              </MenuItem>
            </TextField>
          </Stack>
        </Stack>

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
              description={t('Change the search text or filters to see other captures.')}
            />
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'minmax(260px, 340px) minmax(0, 1fr)' },
                gap: 2,
                alignItems: 'start',
              }}
            >
              {/* Left Column: Evidence File List */}
              <Stack spacing={1}>
                {displayedEvidenceItems.map((item) => {
                  const isSelected = item.id === selectedEvidence?.id;
                  const isChecked = selectedBatchIds.includes(item.id);
                  return (
                    <Paper
                      key={item.id}
                      variant="outlined"
                      sx={{
                        px: 1.5,
                        py: 1.25,
                        cursor: 'pointer',
                        borderRadius: '10px',
                        border: '1px solid',
                        borderColor: isSelected ? 'primary.main' : 'divider',
                        bgcolor: isSelected ? 'action.selected' : 'background.paper',
                        transition: 'border-color 0.15s ease, background-color 0.15s ease',
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
                                e.target.checked
                                  ? [...prev, item.id]
                                  : prev.filter((id) => id !== item.id),
                              );
                            }}
                            sx={{ p: 0.25 }}
                          />
                        )}
                        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                          <Stack
                            direction="row"
                            spacing={0.75}
                            sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 0.5 }}
                          >
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: isSelected ? 700 : 600,
                                color: 'text.primary',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                              title={item.fileName}
                            >
                              {item.fileName}
                            </Typography>
                            {item.isDeleted && (
                              <Chip size="small" color="error" variant="outlined" label={t('Deleted')} sx={{ height: 20, fontSize: '0.7rem' }} />
                            )}
                          </Stack>
                          <Typography
                            variant="caption"
                            sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}
                          >
                            {item.contentType} · {formatBytes(item.sizeBytes)}
                          </Typography>
                        </Box>
                      </Stack>
                    </Paper>
                  );
                })}

                {/* Select All Button relocated below the file list */}
                {canEditEvidence && currentEvidenceItems.length > 0 && (
                  <Box sx={{ pt: 0.75, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Button
                      size="small"
                      onClick={() => {
                        if (allPageActiveSelected) {
                          setSelectedBatchIds([]);
                        } else {
                          setSelectedBatchIds(currentEvidenceItems.map((e) => e.id));
                        }
                      }}
                      sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.8125rem' }}
                    >
                      {allPageActiveSelected
                        ? t('Deselect all')
                        : `${t('Select all')} (${currentEvidenceItems.length})`}
                    </Button>
                    {hasBatchSelection && (
                      <Chip
                        size="small"
                        label={`${selectedBatchIds.length} ${t('selected')}`}
                        sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }}
                      />
                    )}
                  </Box>
                )}
              </Stack>

              {/* Right Column: Preview Card (Image on top, Details & Delete below) */}
              {selectedEvidence && (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: '12px',
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                  }}
                >
                  <Stack spacing={2}>
                    {/* Top: Media Preview (Photo or Video) */}
                    {selectedEvidence.contentType.startsWith('image/') ||
                    selectedEvidence.contentType.startsWith('video/') ? (
                      <Box
                        sx={{
                          p: 1.5,
                          borderRadius: '10px',
                          bgcolor: 'action.hover',
                          border: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <AuthenticatedMedia
                          src={inspectionApi.evidenceContentUrl(inspectionId, selectedEvidence.id)}
                          alt={selectedEvidence.fileName}
                          contentType={selectedEvidence.contentType}
                          maxHeight={460}
                          sx={{ borderRadius: '8px' }}
                        />
                      </Box>
                    ) : (
                      <Alert severity="info">
                        {selectedEvidence.contentType} {t('has no inline preview.')}
                      </Alert>
                    )}

                    {/* Bottom: Info Bar & Actions switched below image */}
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1.5}
                      sx={{
                        alignItems: { xs: 'flex-start', sm: 'center' },
                        justifyContent: 'space-between',
                        pt: 1.5,
                        borderTop: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography
                          variant="subtitle2"
                          sx={{ fontWeight: 700, color: 'text.primary', wordBreak: 'break-word' }}
                        >
                          {selectedEvidence.fileName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {selectedEvidence.contentType} · {formatBytes(selectedEvidence.sizeBytes)}
                          {selectedEvidence.captureTime ? ` · ${t('Captured')} ${selectedEvidence.captureTime}` : ''}
                        </Typography>
                      </Box>

                      {canEditEvidence && (!selectedEvidence.isDeleted || hasBatchSelection) && (
                        <Box sx={{ flexShrink: 0 }}>
                          <Button
                            size="small"
                            color="error"
                            variant="outlined"
                            startIcon={<DeleteOutlineRounded fontSize="small" />}
                            disabled={retire.isPending || bulkRetire.isPending}
                            onClick={() => setShowDeleteConfirm(true)}
                            sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                          >
                            {retire.isPending || bulkRetire.isPending
                              ? t('Deleting…')
                              : deleteButtonLabel}
                          </Button>
                        </Box>
                      )}
                    </Stack>

                    {selectedEvidence.isDeleted && (
                      <Alert severity="warning" sx={{ borderRadius: '8px' }}>
                        {t('Deleted from the active evidence set. The original bytes remain available for audit.')}
                      </Alert>
                    )}

                    {retire.isError && (
                      <Alert severity="error">
                        {getErrorMessage(retire.error, 'The capture was not deleted.')}
                      </Alert>
                    )}

                    {bulkRetire.isError && (
                      <Alert severity="error">
                        {getErrorMessage(bulkRetire.error, 'Bulk delete was not completed.')}
                      </Alert>
                    )}
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

      <ConfirmDialog
        open={showDeleteConfirm}
        title={hasBatchSelection ? t('Confirm Batch Deletion') : t('Confirm Evidence Deletion')}
        message={
          hasBatchSelection
            ? t(
                `Are you sure you want to delete ${selectedBatchIds.length} selected evidence capture(s)? Deleted captures will be excluded from the report set, but preserved for audit.`,
              )
            : t(
                `Are you sure you want to delete evidence "${selectedEvidence?.fileName ?? ''}"? It will be marked as deleted and excluded from report generation while preserving historical audit records.`,
              )
        }
        severity="danger"
        confirmLabel={t('Confirm delete')}
        cancelLabel={t('Cancel')}
        loading={retire.isPending || bulkRetire.isPending}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteAction}
      />
    </Stack>
  );
}
