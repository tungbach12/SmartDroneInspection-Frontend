import { useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  ButtonGroup,
  Checkbox,
  Chip,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  TablePagination,
  Typography,
} from '@mui/material';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import CloudUploadOutlined from '@mui/icons-material/CloudUploadOutlined';
import CropRounded from '@mui/icons-material/CropRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import InsertDriveFileOutlined from '@mui/icons-material/InsertDriveFileOutlined';
import MovieOutlined from '@mui/icons-material/MovieOutlined';
import PauseRounded from '@mui/icons-material/PauseRounded';
import PlaceOutlined from '@mui/icons-material/PlaceOutlined';
import PlayArrowRounded from '@mui/icons-material/PlayArrowRounded';
import PlayCircleOutlineRounded from '@mui/icons-material/PlayCircleOutlineRounded';
import RefreshRounded from '@mui/icons-material/RefreshRounded';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getErrorMessage } from '@/shared/api/errorMessage';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { useToastStore } from '@/shared/ui/Toast';
import { inspectionApi, type EvidenceItem } from '../api/inspectionApi';
import {
  useInvalidateInspectionEvidence,
  useInspectionEvidence,
  useInspectionEvidenceQuery,
  useInspectionFindings,
  useInspectionWorkflowState,
  useFieldSessions,
  useReportVersions,
  useRetireEvidence,
  useRetryEvidenceProcessing,
  useBulkRetireEvidence,
  useUploadInspectionEvidence,
  useInspection,
  useReinspectionVerifications,
  useUpdateReinspectionVerification,
} from '../hooks/useInspections';
import { EvidenceGpsMapDialog } from '../components/EvidenceGpsMapDialog';
import { TargetFlightShotList } from '../components/TargetFlightShotList';
import { VideoFrameCropDialog } from '../components/VideoFrameCropDialog';
import { AuthenticatedMedia, type MediaSeekRequest } from '@/shared/ui/AuthenticatedMedia';
import { EmptyState } from '@/shared/ui/EmptyState';
import { QueryState } from '@/shared/ui/QueryState';
import type { EvidenceQueryFilters } from '../hooks/useInspections';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import {
  resolveUniqueEvidenceFileName,
  type DuplicateFilenameResolution,
} from '../utils/evidenceFileName';

const MAX_IMAGE_OR_DOC_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 2 * 1024 * 1024 * 1024;
const DEFAULT_CHUNK_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_CHUNK_RETRIES = 3;

interface QueuedUploadFile {
  id: string;
  file: File;
}

interface DuplicateUploadNotice {
  id: string;
  originalName: string;
  resolvedName: string;
}

interface SavedUploadRef {
  sessionId: string;
  fileName: string;
  sizeBytes: number;
}

function savedUploadStorageKey(inspectionId: string): string {
  return `sdi-resumable-uploads:${inspectionId}`;
}

function savedUploadEntryKey(fileName: string, sizeBytes: number): string {
  return `${fileName}::${sizeBytes}`;
}

function readSavedUploads(inspectionId: string): Record<string, SavedUploadRef> {
  if (!inspectionId || typeof window === 'undefined' || !window.sessionStorage) return {};
  try {
    const raw = window.sessionStorage.getItem(savedUploadStorageKey(inspectionId));
    return raw ? (JSON.parse(raw) as Record<string, SavedUploadRef>) : {};
  } catch {
    return {};
  }
}

function writeSavedUploads(inspectionId: string, entries: Record<string, SavedUploadRef>) {
  if (!inspectionId || typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    if (Object.keys(entries).length === 0) {
      window.sessionStorage.removeItem(savedUploadStorageKey(inspectionId));
    } else {
      window.sessionStorage.setItem(savedUploadStorageKey(inspectionId), JSON.stringify(entries));
    }
  } catch {
    // Ignore storage quota / private mode failures.
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatMmSs(seconds: number | null | undefined): string {
  const safe = Math.max(0, Math.floor(seconds ?? 0));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatMmSsTenths(seconds: number | null | undefined): string {
  const safe = Math.max(0, seconds ?? 0);
  const mins = Math.floor(safe / 60);
  const secs = safe - mins * 60;
  return `${String(mins).padStart(2, '0')}:${secs.toFixed(1).padStart(4, '0')}`;
}

function hasValidGps(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): boolean {
  return (
    latitude != null &&
    longitude != null &&
    Number.isFinite(Number(latitude)) &&
    Number.isFinite(Number(longitude))
  );
}

export default function InspectionEvidencePage() {
  const { t, formatDateTime } = useLocale();
  const showToast = useToastStore((state) => state.showToast);
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
  const allEvidence = useInspectionEvidence(isInspector ? inspectionId : null);
  const workflow = useInspectionWorkflowState(inspectionId);
  const findingsQuery = useInspectionFindings(inspectionId);
  const sessionHistory = useFieldSessions(inspectionId, isInspector);
  const versions = useReportVersions(inspectionId);
  const invalidateEvidence = useInvalidateInspectionEvidence(inspectionId);
  const upload = useUploadInspectionEvidence(inspectionId);
  const retire = useRetireEvidence(inspectionId);
  const retryProcessing = useRetryEvidenceProcessing(inspectionId);
  const bulkRetire = useBulkRetireEvidence(inspectionId);

  const inspectionQuery = useInspection?.(inspectionId);
  const inspection = inspectionQuery?.data;
  const isReinspection = inspection?.inspectionType === 'RE_INSPECTION';
  const reinspectionVerifications = useReinspectionVerifications?.(
    isReinspection ? inspectionId : '',
  );
  const updateVerificationMutation = useUpdateReinspectionVerification?.(inspectionId);

  const handleLinkEvidence = async (verificationId: string, evidenceId: string) => {
    const item = reinspectionVerifications?.data?.find((v) => v.id === verificationId);
    if (!item || !updateVerificationMutation) return;
    await updateVerificationMutation.mutateAsync({
      verificationId,
      payload: {
        resolutionStatus: item.resolutionStatus,
        newEvidenceId: evidenceId ? evidenceId : null,
        inspectorNotes: item.inspectorNotes ?? null,
      },
    });
  };

  const [queue, setQueue] = useState<QueuedUploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [fileErrors, setFileErrors] = useState<Record<string, { label: string; message: string }>>({});
  const [fileProgress, setFileProgress] = useState<Record<string, number>>({});
  const [duplicateUploadNotices, setDuplicateUploadNotices] = useState<DuplicateUploadNotice[]>([]);
  const [activeUploadSession, setActiveUploadSession] = useState<{
    queueId: string;
    fileName: string;
    sessionId: string;
  } | null>(null);
  const [savedUploads, setSavedUploads] = useState<Record<string, SavedUploadRef>>(() =>
    readSavedUploads(inspectionId),
  );
  const queueCounterRef = useRef(0);
  const activeAbortRef = useRef<AbortController | null>(null);
  const cancelledFilesRef = useRef<Set<string>>(new Set());
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null);
  const [mapDialogEvidence, setMapDialogEvidence] = useState<EvidenceItem | null>(null);
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingLinkedFindings, setDeletingLinkedFindings] = useState(false);
  const [deleteLinkedError, setDeleteLinkedError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const seekNonceRef = useRef(0);
  const [seekRequest, setSeekRequest] = useState<MediaSeekRequest | null>(null);
  const [videoPlayback, setVideoPlayback] = useState<{
    evidenceId: string | null;
    currentTime: number;
    duration: number;
    paused: boolean;
  }>({ evidenceId: null, currentTime: 0, duration: 0, paused: true });
  const [cropDialogState, setCropDialogState] = useState<{
    open: boolean;
    frameDataUrl: string | null;
    naturalWidth: number;
    naturalHeight: number;
    timestampSeconds: number;
  }>({
    open: false,
    frameDataUrl: null,
    naturalWidth: 960,
    naturalHeight: 720,
    timestampSeconds: 0,
  });
  const [savingCropped, setSavingCropped] = useState(false);
  const [videoActionError, setVideoActionError] = useState<string | null>(null);
  const [videoCaptureNotice, setVideoCaptureNotice] = useState<string | null>(null);

  const displayedEvidenceItems = evidence.data?.items ?? [];
  const totalEvidenceCount = evidence.data?.totalCount ?? 0;
  const activeCount = evidence.data?.activeCount ?? 0;
  const retiredCount = evidence.data?.retiredCount ?? 0;
  const currentEvidenceItems = displayedEvidenceItems.filter((item) => !item.isDeleted);
  const currentVersion = versions.data?.[0] ?? null;
  const evidenceLocked =
    Boolean(
      currentVersion && ['SUBMITTED', 'APPROVED', 'PUBLISHED', 'SUPERSEDED'].includes(currentVersion.status),
    ) || workflow.data?.status === 'COMPLETED';
  const isReturnedRevision = currentVersion?.status === 'RETURNED';
  const completedFieldSessionId = sessionHistory.data
    ?.filter((session) => session.status === 'FIELD_COMPLETED')
    .at(-1)?.id;
  const hasCompletedFieldSession = Boolean(completedFieldSessionId);
  const canEditEvidence =
    isInspector &&
    (workflow.data?.status === 'FIELD_COMPLETED' ||
      hasCompletedFieldSession) &&
    !evidenceLocked;
  const canUploadEvidence =
    isInspector &&
    (workflow.data?.status === 'FIELD_COMPLETED' ||
      hasCompletedFieldSession) &&
    !evidenceLocked;
  const selectedEvidence =
    displayedEvidenceItems.find((item) => item.id === selectedEvidenceId) ??
    displayedEvidenceItems[0] ??
    null;
  const isPlaybackForSelected = Boolean(
    selectedEvidence && videoPlayback.evidenceId === selectedEvidence.id,
  );
  const activeVideoTime = isPlaybackForSelected ? videoPlayback.currentTime : 0;
  const activeVideoDuration = isPlaybackForSelected ? videoPlayback.duration : 0;
  const activeVideoPaused = isPlaybackForSelected ? videoPlayback.paused : true;

  const hasPendingProcessing = displayedEvidenceItems.some(
    (item) => item.processingStatus === 'PENDING' || item.processingStatus === 'PROCESSING',
  );

  useEffect(() => {
    setSavedUploads(readSavedUploads(inspectionId));
  }, [inspectionId]);

  useEffect(() => {
    if (!hasPendingProcessing) return;
    const timer = window.setInterval(() => {
      void evidence.refetch();
    }, 4000);
    return () => window.clearInterval(timer);
  }, [hasPendingProcessing, evidence]);

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

  const updateSavedUploadMap = (
    updater: (prev: Record<string, SavedUploadRef>) => Record<string, SavedUploadRef>,
  ) => {
    setSavedUploads((prev) => {
      const next = updater(prev);
      writeSavedUploads(inspectionId, next);
      return next;
    });
  };

  const handleStageFiles = (chosen: File[]) => {
    if (chosen.length === 0) return;
    const existingVideoBytes = queue
      .filter((item) => item.file.type === 'video/mp4')
      .reduce((sum, item) => sum + item.file.size, 0);
    let runningVideoBytes = existingVideoBytes;
    const accepted: QueuedUploadFile[] = [];
    const errors: Record<string, { label: string; message: string }> = {};

    for (const file of chosen) {
      if (file.size <= 0) {
        errors[`stage:${file.name}:${queueCounterRef.current++}`] = {
          label: file.name,
          message: t('File is empty and cannot be uploaded.'),
        };
        continue;
      }
      const isMp4 = file.type === 'video/mp4';
      if (isMp4) {
        if (file.size > MAX_VIDEO_BYTES || runningVideoBytes + file.size > MAX_VIDEO_BYTES) {
          errors[`stage:${file.name}:${queueCounterRef.current++}`] = {
            label: file.name,
            message: t('Video uploads cannot exceed 2 GB in total.'),
          };
          continue;
        }
        runningVideoBytes += file.size;
      } else if (file.size > MAX_IMAGE_OR_DOC_BYTES) {
        errors[`stage:${file.name}:${queueCounterRef.current++}`] = {
          label: file.name,
          message: t('Images and PDFs cannot exceed 10 MB.'),
        };
        continue;
      }
      accepted.push({
        id: `${file.name}::${file.size}::${queueCounterRef.current++}`,
        file,
      });
    }

    if (accepted.length > 0) {
      setQueue((prev) => [...prev, ...accepted]);
    }
    if (Object.keys(errors).length > 0) {
      setFileErrors((prev) => ({ ...prev, ...errors }));
    }
  };

  const removeFromQueue = (queueId: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== queueId));
    setFileErrors((prev) => {
      if (!(queueId in prev)) return prev;
      const next = { ...prev };
      delete next[queueId];
      return next;
    });
    setFileProgress((prev) => {
      if (!(queueId in prev)) return prev;
      const next = { ...prev };
      delete next[queueId];
      return next;
    });
  };

  const uploadResumableVideo = async (item: QueuedUploadFile): Promise<string | null> => {
    const { file } = item;
    const entryKey = savedUploadEntryKey(file.name, file.size);
    let session = null as Awaited<ReturnType<typeof inspectionApi.beginEvidenceUpload>> | null;
    const existingRef = readSavedUploads(inspectionId)[entryKey];

    if (existingRef) {
      try {
        const remoteStatus = await inspectionApi.getEvidenceUploadStatus(
          inspectionId,
          existingRef.sessionId,
        );
        if (remoteStatus.status === 'OPEN') {
          session = remoteStatus;
        } else if (remoteStatus.status === 'PROCESSING' || remoteStatus.status === 'READY') {
          updateSavedUploadMap((prev) => {
            const next = { ...prev };
            delete next[entryKey];
            return next;
          });
          setFileProgress((prev) => ({ ...prev, [item.id]: 100 }));
          return remoteStatus.fileName;
        }
      } catch {
        // Session expired/not found; clear stale reference and create a fresh session below.
      }
    }

    if (!session) {
      session = await inspectionApi.beginEvidenceUpload(inspectionId, {
        fileName: file.name,
        contentType: file.type || 'video/mp4',
        totalSizeBytes: file.size,
        ...(completedFieldSessionId ? { fieldSessionId: completedFieldSessionId } : {}),
      });
      updateSavedUploadMap((prev) => ({
        ...prev,
        [entryKey]: {
          sessionId: session!.sessionId,
          fileName: file.name,
          sizeBytes: file.size,
        },
      }));
    }

    setActiveUploadSession({
      queueId: item.id,
      fileName: session.fileName || file.name,
      sessionId: session.sessionId,
    });
    const chunkSize = session.chunkSizeBytes || DEFAULT_CHUNK_SIZE_BYTES;
    const completedSet = new Set(session.uploadedPartNumbers ?? []);
    const initialCompletedBytes = Array.from(completedSet).reduce((sum, partNo) => {
      const start = (partNo - 1) * chunkSize;
      const end = Math.min(file.size, start + chunkSize);
      return sum + Math.max(0, end - start);
    }, 0);
    setFileProgress((prev) => ({
      ...prev,
      [item.id]: Math.min(99, Math.round((initialCompletedBytes / file.size) * 100)),
    }));

    for (let partNo = 1; partNo <= session.totalParts; partNo++) {
      if (cancelledFilesRef.current.has(item.id)) {
        return null;
      }
      if (completedSet.has(partNo)) continue;
      const start = (partNo - 1) * chunkSize;
      const end = Math.min(file.size, start + chunkSize);
      const chunk = file.slice(start, end, file.type || 'video/mp4');

      let attempt = 0;
      let uploaded = false;
      while (!uploaded) {
        if (cancelledFilesRef.current.has(item.id)) {
          return null;
        }
        attempt += 1;
        const controller = new AbortController();
        activeAbortRef.current = controller;
        try {
          const updatedSession = await inspectionApi.uploadEvidencePart(
            inspectionId,
            session.sessionId,
            partNo,
            chunk,
            {
              signal: controller.signal,
              onProgress: (loaded) => {
                const confirmedBytes = (partNo - 1) * chunkSize;
                const pct = Math.min(99, Math.round(((confirmedBytes + loaded) / file.size) * 100));
                setFileProgress((prev) => ({ ...prev, [item.id]: pct }));
              },
            },
          );
          for (const donePart of updatedSession.uploadedPartNumbers ?? [partNo]) {
            completedSet.add(donePart);
          }
          uploaded = true;
        } catch (chunkErr) {
          if (cancelledFilesRef.current.has(item.id) || attempt >= MAX_CHUNK_RETRIES) {
            throw chunkErr;
          }
          await new Promise((resolve) => window.setTimeout(resolve, attempt * 400));
        } finally {
          if (activeAbortRef.current === controller) {
            activeAbortRef.current = null;
          }
        }
      }
    }

    const completedSession = await inspectionApi.completeEvidenceUpload(
      inspectionId,
      session.sessionId,
    );
    updateSavedUploadMap((prev) => {
      const next = { ...prev };
      delete next[entryKey];
      return next;
    });
    setFileProgress((prev) => ({ ...prev, [item.id]: 100 }));
    await invalidateEvidence();
    const resolvedFileName = completedSession.fileName || session.fileName || file.name;
    if (resolvedFileName !== file.name) {
      showToast(
        `${t('Duplicate filename')} "${file.name}" → ${t('saved as')} "${resolvedFileName}"`,
        'info',
      );
    } else {
      showToast(`Uploaded ${resolvedFileName}`, 'success');
    }
    return resolvedFileName;
  };

  const handleCancelResumableUpload = async (item: QueuedUploadFile) => {
    const { file } = item;
    cancelledFilesRef.current.add(item.id);
    activeAbortRef.current?.abort();
    const saved = savedUploads[savedUploadEntryKey(file.name, file.size)];
    if (saved) {
      try {
        await inspectionApi.cancelEvidenceUpload(inspectionId, saved.sessionId);
      } catch {
        // Ignore cancellation errors if session already expired/completed.
      }
      updateSavedUploadMap((prev) => {
        const next = { ...prev };
        delete next[savedUploadEntryKey(file.name, file.size)];
        return next;
      });
    }
    setActiveUploadSession((curr) => (curr?.queueId === item.id ? null : curr));
    removeFromQueue(item.id);
  };

  const uploadQueue = async () => {
    if (uploading || queue.length === 0) return;
    setUploading(true);
    cancelledFilesRef.current.clear();
    for (const item of [...queue]) {
      const { file } = item;
      if (cancelledFilesRef.current.has(item.id)) continue;
      try {
        let resolvedName: string | null = null;
        if (file.type === 'video/mp4') {
          resolvedName = await uploadResumableVideo(item);
        } else {
          const uploaded = await upload.mutateAsync({
            file,
            ...(completedFieldSessionId ? { fieldSessionId: completedFieldSessionId } : {}),
          });
          resolvedName = uploaded?.fileName ?? null;
        }
        if (resolvedName && resolvedName !== file.name) {
          setDuplicateUploadNotices((prev) => [
            ...prev,
            { id: item.id, originalName: file.name, resolvedName },
          ]);
        }
        if (!cancelledFilesRef.current.has(item.id)) {
          setQueue((prev) => prev.filter((queued) => queued.id !== item.id));
          setFileErrors((prev) => {
            if (!(item.id in prev)) return prev;
            const next = { ...prev };
            delete next[item.id];
            return next;
          });
          setFileProgress((prev) => {
            if (!(item.id in prev)) return prev;
            const next = { ...prev };
            delete next[item.id];
            return next;
          });
        }
      } catch (error) {
        if (cancelledFilesRef.current.has(item.id)) continue;
        setFileErrors((prev) => ({
          ...prev,
          [item.id]: {
            label: file.name,
            message: getErrorMessage(error, 'Upload failed. Retry to safely try again.'),
          },
        }));
      } finally {
        setActiveUploadSession((curr) => (curr?.queueId === item.id ? null : curr));
      }
    }
    setUploading(false);
  };

  const knownEvidenceItems = Array.isArray(allEvidence.data)
    ? allEvidence.data
    : ((allEvidence.data as { items?: typeof displayedEvidenceItems } | undefined)?.items ??
      displayedEvidenceItems);
  const stagedResolutionById = new Map<string, DuplicateFilenameResolution>();
  const takenLowerNames = new Set(
    knownEvidenceItems
      .map((item) => item.fileName?.toLowerCase())
      .filter((name): name is string => Boolean(name)),
  );
  for (const item of queue) {
    stagedResolutionById.set(item.id, resolveUniqueEvidenceFileName(item.file.name, takenLowerNames));
  }
  const stagedDuplicates = queue
    .map((item) => ({ item, resolution: stagedResolutionById.get(item.id)! }))
    .filter(({ resolution }) => resolution.isDuplicate);

  const allPageActiveSelected =
    currentEvidenceItems.length > 0 && selectedBatchIds.length === currentEvidenceItems.length;

  const hasBatchSelection = selectedBatchIds.length > 0;
  const deleteButtonLabel = allPageActiveSelected
    ? `${t('Delete all')} (${currentEvidenceItems.length})`
    : hasBatchSelection
      ? `${t('Delete selected')} (${selectedBatchIds.length})`
      : t('Delete evidence');

  const deleteTargetIds = hasBatchSelection
    ? selectedBatchIds.length > 0
      ? selectedBatchIds
      : currentEvidenceItems.map((e) => e.id)
    : selectedEvidence && !selectedEvidence.isDeleted
      ? [selectedEvidence.id]
      : [];
  const linkedFindingsForTargets = (findingsQuery.data ?? []).filter(
    (finding) => !finding.isDeleted && Boolean(finding.evidenceId) && deleteTargetIds.includes(finding.evidenceId!),
  );

  const handleOpenDeleteConfirm = () => {
    setDeleteLinkedError(null);
    setShowDeleteConfirm(true);
    void findingsQuery.refetch?.();
  };

  const handleDeleteAction = async () => {
    if (deleteTargetIds.length === 0) return;
    setDeleteLinkedError(null);

    if (linkedFindingsForTargets.length > 0) {
      setDeletingLinkedFindings(true);
      try {
        // Delete sequentially to avoid concurrent confirmation-reopen lock contention on the inspection row.
        for (const finding of linkedFindingsForTargets) {
          await inspectionApi.deleteFinding(inspectionId, finding.id);
        }
        await invalidateEvidence();
        void findingsQuery.refetch?.();
      } catch (error) {
        setDeleteLinkedError(
          getErrorMessage(error, 'Could not remove linked findings before deleting captures.'),
        );
        return;
      } finally {
        setDeletingLinkedFindings(false);
      }
    }

    if (hasBatchSelection) {
      try {
        await bulkRetire.mutateAsync(deleteTargetIds);
        setSelectedBatchIds([]);
        setShowDeleteConfirm(false);
      } catch (error) {
        void findingsQuery.refetch?.();
        setDeleteLinkedError(getErrorMessage(error, 'Bulk delete was not completed.'));
      }
    } else if (selectedEvidence && !selectedEvidence.isDeleted) {
      retire.mutate(selectedEvidence.id);
      setShowDeleteConfirm(false);
    }
  };

  const handleOpenCropFromVideo = () => {
    setVideoActionError(null);
    setVideoCaptureNotice(null);
    const videoEl = videoRef.current;
    if (!videoEl || videoEl.readyState < 2) {
      setVideoActionError(t('Wait for the video to load before capturing a frame.'));
      return;
    }
    videoEl.pause();
    const w = videoEl.videoWidth || 960;
    const h = videoEl.videoHeight || 720;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoEl, 0, 0, w, h);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setCropDialogState({
      open: true,
      frameDataUrl: dataUrl,
      naturalWidth: w,
      naturalHeight: h,
      timestampSeconds: videoEl.currentTime || 0,
    });
  };

  const handleSaveCroppedFrame = async (file: File, locationDescription: string) => {
    if (!selectedEvidence) return;
    const sourceVideoId = selectedEvidence.id;
    const capturedTimestamp = Math.round(cropDialogState.timestampSeconds * 10) / 10;
    setSavingCropped(true);
    try {
      // Pin selection to the source video so refetching keeps the video and timeline intact.
      setSelectedEvidenceId(sourceVideoId);
      const sessionTarget = selectedEvidence.fieldSessionId ?? completedFieldSessionId;
      const saved = await upload.mutateAsync({
        file,
        ...(sessionTarget ? { fieldSessionId: sessionTarget } : {}),
        sourceVideoEvidenceId: sourceVideoId,
        sourceTimestampSeconds: capturedTimestamp,
      });
      if (locationDescription) {
        await inspectionApi.updateEvidenceLocation(inspectionId, saved.id, locationDescription);
      }
      await evidence.refetch();
      setCropDialogState((prev) => ({ ...prev, open: false }));
      setVideoCaptureNotice(
        `${t('Saved captured frame')} ${saved.fileName} (${formatMmSs(capturedTimestamp)}).`,
      );
    } finally {
      setSavingCropped(false);
    }
  };

  const nextSeekNonce = () => {
    seekNonceRef.current += 1;
    return seekNonceRef.current;
  };

  const openVideoAtTimestamp = (videoEvidenceId: string, timestampSeconds: number) => {
    setVideoActionError(null);
    setVideoCaptureNotice(null);
    if (fileTypeFilter === 'IMAGE') {
      setFileTypeFilter('ALL');
    }
    setSelectedEvidenceId(videoEvidenceId);
    setSeekRequest({ timestampSeconds, nonce: nextSeekNonce() });
    setVideoPlayback((prev) => ({
      evidenceId: videoEvidenceId,
      currentTime: Math.max(0, timestampSeconds),
      duration: prev.evidenceId === videoEvidenceId ? prev.duration : 0,
      paused: true,
    }));
  };

  const seekCurrentVideo = (timestampSeconds: number) => {
    const target = Math.max(0, timestampSeconds);
    setSeekRequest({ timestampSeconds: target, nonce: nextSeekNonce() });
    if (videoRef.current && videoRef.current.readyState >= 1) {
      videoRef.current.currentTime = target;
      videoRef.current.pause();
    }
    if (selectedEvidence) {
      setVideoPlayback((prev) => ({
        evidenceId: selectedEvidence.id,
        currentTime: target,
        duration: prev.evidenceId === selectedEvidence.id ? prev.duration : 0,
        paused: true,
      }));
    }
  };

  const stepVideoTime = (deltaSeconds: number) => {
    const videoEl = videoRef.current;
    const activeDuration =
      videoEl && Number.isFinite(videoEl.duration) && videoEl.duration > 0
        ? videoEl.duration
        : activeVideoDuration;
    const baseTime =
      videoEl && videoEl.readyState >= 1 ? videoEl.currentTime : activeVideoTime;
    const clamped = Math.max(
      0,
      activeDuration > 0 ? Math.min(activeDuration, baseTime + deltaSeconds) : baseTime + deltaSeconds,
    );
    seekCurrentVideo(Math.round(clamped * 10) / 10);
  };

  const handleToggleVideoPlayPause = () => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    if (videoEl.paused) {
      void videoEl.play?.();
    } else {
      videoEl.pause?.();
    }
  };

  const selectedHasGps = hasValidGps(selectedEvidence?.latitude, selectedEvidence?.longitude);

  return (
    <Stack className="trace-ledger-workspace" spacing={2}>
      {isReinspection && (
        <TargetFlightShotList
          mode="evidence-assignment"
          inspectionId={inspectionId}
          sourceInspectionId={inspection?.sourceInspectionId}
          items={reinspectionVerifications?.data ?? []}
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
          className="trace-stage-panel"
          sx={{
            p: { xs: 2, sm: 2.25 },
            borderRadius: '8px',
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
                  ? t('Upload photos (max 10 MB), documents, or MP4 videos (up to 2 GB, resumable).')
                  : `${queue.length} ${t('file(s) staged')}`}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              <Button
                component={canUploadEvidence ? 'label' : 'button'}
                variant="outlined"
                size="small"
                disabled={!canUploadEvidence}
                startIcon={<CloudUploadOutlined fontSize="small" />}
                aria-label={canUploadEvidence ? t('Choose files') : t('Choose files (locked)')}
                sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
              >
                {canUploadEvidence ? t('Choose files') : t('Choose files (locked)')}
                {canUploadEvidence && (
                  <input
                    hidden
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/webp,image/tiff,video/mp4,application/pdf"
                    onChange={(event) => {
                      const chosen = Array.from(event.target.files ?? []);
                      handleStageFiles(chosen);
                      event.target.value = '';
                    }}
                  />
                )}
              </Button>
              <Button
                variant={queue.length > 0 ? 'contained' : 'outlined'}
                size="small"
                disabled={!canUploadEvidence || queue.length === 0 || uploading}
                onClick={() => void uploadQueue()}
                sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
              >
                {uploading ? t('Uploading files…') : t('Upload')}
              </Button>
              {activeCount > 0 && !uploading && (
                <Button
                  component={RouterLink}
                  to="../findings"
                  variant={queue.length === 0 ? 'contained' : 'outlined'}
                  size="small"
                  endIcon={<ArrowForwardRounded fontSize="small" />}
                  sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                >
                  {t('Continue to Defect Findings')}
                </Button>
              )}
            </Stack>
          </Stack>

          {evidenceLocked && (
            <Alert severity="info" sx={{ mt: 1.5, borderRadius: '10px' }}>
              {currentVersion?.status === 'SUBMITTED'
                ? t(
                    'Evidence is locked while the report is submitted for review. Withdraw the unreviewed submission or ask the reviewer to return it before making changes.',
                  )
                : t(
                    'Evidence is locked because the report is approved or published.',
                  )}
            </Alert>
          )}
          {isReturnedRevision && (
            <Alert severity="info" sx={{ mt: 1.5, borderRadius: '10px' }}>
              {t('Returned for revision. Update evidence, then reconfirm findings and resubmit the report.')}
            </Alert>
          )}

          {Object.values(savedUploads)
            .filter(
              (entry) =>
                !queue.some(
                  (q) =>
                    savedUploadEntryKey(q.file.name, q.file.size) ===
                    savedUploadEntryKey(entry.fileName, entry.sizeBytes),
                ),
            )
            .map((entry) => (
              <Alert key={entry.sessionId} severity="info" sx={{ mt: 1.5, borderRadius: '10px' }}>
                {t('Interrupted upload found for')} <strong>{entry.fileName}</strong> ({formatBytes(entry.sizeBytes)}).{' '}
                {t('Reselect the exact same file to resume uploading remaining chunks.')}
              </Alert>
            ))}

          {stagedDuplicates.length > 0 && (
            <Alert severity="info" sx={{ mt: 1.5, borderRadius: '10px' }}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {t(
                    'Duplicate filename detected — existing captures are preserved and upload is not blocked. Will be auto-numbered as:',
                  )}
                </Typography>
                <Stack spacing={0.25} sx={{ mt: 0.5 }}>
                  {stagedDuplicates.map(({ item, resolution }) => (
                    <Typography key={item.id} variant="caption" component="div">
                      <strong>{resolution.originalName}</strong> → <strong>{resolution.resolvedName}</strong>
                    </Typography>
                  ))}
                </Stack>
              </Box>
            </Alert>
          )}

          {duplicateUploadNotices.length > 0 && (
            <Alert
              severity="info"
              sx={{ mt: 1.5, borderRadius: '10px' }}
              onClose={() => setDuplicateUploadNotices([])}
            >
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {t('Duplicate filename notice — automatically renamed on upload:')}
                </Typography>
                <Stack spacing={0.25} sx={{ mt: 0.5 }}>
                  {duplicateUploadNotices.map((notice) => (
                    <Typography key={notice.id} variant="caption" component="div">
                      <strong>{notice.originalName}</strong> → <strong>{notice.resolvedName}</strong>
                    </Typography>
                  ))}
                </Stack>
              </Box>
            </Alert>
          )}

          {Object.entries(fileErrors)
            .filter(([key]) => !queue.some((q) => q.id === key))
            .map(([key, err]) => (
              <Alert
                key={key}
                severity="error"
                sx={{ mt: 1.5, borderRadius: '10px' }}
                onClose={() =>
                  setFileErrors((prev) => {
                    const next = { ...prev };
                    delete next[key];
                    return next;
                  })
                }
              >
                <strong>{err.label}:</strong> {err.message}
              </Alert>
            ))}

          {queue.length > 0 && canEditEvidence && (
            <Stack spacing={0.75} sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
              {queue.map((item) => {
                const { file } = item;
                const pct = fileProgress[item.id];
                const isActiveResumable = activeUploadSession?.queueId === item.id;
                const hasSavedSession = Boolean(
                  savedUploads[savedUploadEntryKey(file.name, file.size)],
                );
                const resolution = stagedResolutionById.get(item.id);
                const itemError = fileErrors[item.id];
                return (
                  <Box key={item.id}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <InsertDriveFileOutlined fontSize="small" sx={{ color: 'text.secondary' }} />
                      <Typography variant="body2" sx={{ fontWeight: 600, flexGrow: 1 }}>
                        {file.name}{' '}
                        <Typography component="span" variant="caption" color="text.secondary">
                          ({formatBytes(file.size)})
                          {resolution?.isDuplicate
                            ? ` · ${t('Will save as')}: ${resolution.resolvedName}`
                            : ''}
                          {typeof pct === 'number' ? ` · ${pct}%` : ''}
                          {hasSavedSession && !isActiveResumable ? ` · ${t('Resumable')}` : ''}
                        </Typography>
                      </Typography>
                      {isActiveResumable ? (
                        <Button
                          size="small"
                          color="warning"
                          onClick={() => void handleCancelResumableUpload(item)}
                        >
                          {t('Cancel upload')}
                        </Button>
                      ) : (
                        <Button size="small" color="error" onClick={() => removeFromQueue(item.id)}>
                          {t('Remove')}
                        </Button>
                      )}
                    </Stack>
                    {typeof pct === 'number' && (
                      <LinearProgress
                        variant="determinate"
                        value={pct}
                        sx={{ mt: 0.5, borderRadius: 1 }}
                      />
                    )}
                    {itemError && (
                      <Alert severity="error" sx={{ mt: 0.5 }}>
                        {itemError.message}
                      </Alert>
                    )}
                  </Box>
                );
              })}
            </Stack>
          )}
        </Paper>
      )}

      <Paper
        variant="outlined"
        className="trace-stage-panel trace-evidence-register"
        sx={{
          p: { xs: 2, sm: 2.5 },
          borderRadius: '8px',
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
            <Typography variant="h6" component="h2" sx={{ fontWeight: 700 }}>
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
              description={t('Upload captures above to review them here.')}
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
                      onClick={() => {
                        setVideoActionError(null);
                        setVideoCaptureNotice(null);
                        setSelectedEvidenceId(item.id);
                      }}
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
                              <Chip size="small" color="error" variant="outlined" label={t('Deleted')} sx={{ height: 22, fontSize: '0.75rem' }} />
                            )}
                            {!item.isDeleted &&
                              (item.processingStatus === 'PENDING' ||
                                item.processingStatus === 'PROCESSING') && (
                                <Chip
                                  size="small"
                                  color="info"
                                  variant="outlined"
                                  label={t('Processing')}
                                  sx={{ height: 22, fontSize: '0.75rem' }}
                                />
                              )}
                            {!item.isDeleted && item.processingStatus === 'FAILED' && (
                              <Chip
                                size="small"
                                color="error"
                                variant="outlined"
                                label={t('Failed')}
                                sx={{ height: 22, fontSize: '0.75rem' }}
                              />
                            )}
                            {item.sourceVideoEvidenceId && (
                              <Chip
                                size="small"
                                icon={<MovieOutlined sx={{ fontSize: 13 }} />}
                                label={formatMmSs(item.sourceTimestampSeconds)}
                                color="secondary"
                                variant="outlined"
                                sx={{ height: 22, fontSize: '0.75rem' }}
                              />
                            )}
                          </Stack>
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
                            {item.contentType} · {formatBytes(item.sizeBytes)}
                          </Typography>
                        </Box>
                      </Stack>
                    </Paper>
                  );
                })}

                {/* Select All & Co-located Batch Delete Bar */}
                {canEditEvidence && currentEvidenceItems.length > 0 && (
                  <Box sx={{ pt: 0.75, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
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
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Chip
                          size="small"
                          label={`${selectedBatchIds.length} ${t('selected')}`}
                          sx={{ height: 22, fontSize: '0.75rem', fontWeight: 600 }}
                        />
                        <Button
                          size="small"
                          color="error"
                          variant="outlined"
                          startIcon={<DeleteOutlineRounded fontSize="small" />}
                          disabled={deletingLinkedFindings || retire.isPending || bulkRetire.isPending}
                          onClick={handleOpenDeleteConfirm}
                          sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                        >
                          {deletingLinkedFindings || retire.isPending || bulkRetire.isPending
                            ? t('Deleting…')
                            : deleteButtonLabel}
                        </Button>
                      </Stack>
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
                    borderRadius: '10px',
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                  }}
                >
                  <Stack spacing={2}>
                    {selectedEvidence.sourceVideoEvidenceId && (
                      <Alert
                        severity="info"
                        icon={<MovieOutlined fontSize="small" />}
                        action={
                          <Button
                            size="small"
                            color="primary"
                            variant="outlined"
                            startIcon={<PlayCircleOutlineRounded fontSize="small" />}
                            onClick={() =>
                              openVideoAtTimestamp(
                                selectedEvidence.sourceVideoEvidenceId!,
                                selectedEvidence.sourceTimestampSeconds ?? 0,
                              )
                            }
                            sx={{ textTransform: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}
                          >
                            {`${t('Watch in video')} @ ${formatMmSs(selectedEvidence.sourceTimestampSeconds)}`}
                          </Button>
                        }
                        sx={{ borderRadius: '8px', alignItems: 'center' }}
                      >
                        {`${t('Captured from video frame')} (${formatMmSs(selectedEvidence.sourceTimestampSeconds)})`}
                      </Alert>
                    )}

                    {/* Top: Media Preview (Photo or Video) */}
                    {selectedEvidence.contentType.startsWith('image/') ||
                    selectedEvidence.contentType.startsWith('video/') ? (
                      <Stack spacing={1.5}>
                        <Box
                          sx={{
                            p: selectedEvidence.contentType.startsWith('video/') ? 1 : 1.5,
                            borderRadius: '10px',
                            bgcolor: selectedEvidence.contentType.startsWith('video/')
                              ? '#0b0f17'
                              : 'action.hover',
                            border: '1px solid',
                            borderColor: 'divider',
                            overflow: 'hidden',
                          }}
                        >
                          {selectedEvidence.contentType.startsWith('video/') &&
                          selectedEvidence.processingStatus &&
                          selectedEvidence.processingStatus !== 'READY' ? (
                            <Alert
                              severity={
                                selectedEvidence.processingStatus === 'FAILED' ? 'error' : 'info'
                              }
                              action={
                                selectedEvidence.processingStatus === 'FAILED' && canUploadEvidence ? (
                                  <Button
                                    size="small"
                                    color="inherit"
                                    startIcon={<RefreshRounded fontSize="small" />}
                                    disabled={retryProcessing.isPending}
                                    onClick={() => retryProcessing.mutate(selectedEvidence.id)}
                                  >
                                    {t('Retry processing')}
                                  </Button>
                                ) : undefined
                              }
                            >
                              {selectedEvidence.processingStatus === 'FAILED'
                                ? selectedEvidence.processingError ||
                                  t('Video transcoding failed. Retry processing to try again.')
                                : t(
                                    'Video is being processed into a streamable 1080p rendition. Playback will become available once ready.',
                                  )}
                            </Alert>
                          ) : (
                            <AuthenticatedMedia
                              src={inspectionApi.evidenceContentUrl(inspectionId, selectedEvidence.id)}
                              posterSrc={
                                selectedEvidence.contentType.startsWith('video/') &&
                                selectedEvidence.hasThumbnail
                                  ? inspectionApi.evidenceContentUrl(
                                      inspectionId,
                                      selectedEvidence.id,
                                      'thumb',
                                    )
                                  : undefined
                              }
                              alt={selectedEvidence.fileName}
                              contentType={selectedEvidence.contentType}
                              videoRef={videoRef}
                              seekRequest={seekRequest}
                              onVideoStateChange={(state) =>
                                setVideoPlayback({
                                  evidenceId: selectedEvidence.id,
                                  ...state,
                                })
                              }
                              maxHeight={480}
                              sx={{ borderRadius: '8px' }}
                            />
                          )}
                        </Box>
                        {selectedEvidence.contentType.startsWith('video/') && canUploadEvidence && (
                          <Paper
                            variant="outlined"
                            sx={{
                              p: 1.5,
                              borderRadius: '10px',
                              bgcolor: 'action.hover',
                              borderColor: 'divider',
                            }}
                          >
                            <Stack spacing={1.25}>
                              <Stack
                                direction={{ xs: 'column', sm: 'row' }}
                                spacing={1}
                                sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}
                              >
                                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                                    {t('Video tools')}
                                  </Typography>
                                  <Chip
                                    size="small"
                                    variant="outlined"
                                    label={
                                      activeVideoDuration > 0
                                        ? `${formatMmSsTenths(activeVideoTime)} / ${formatMmSsTenths(activeVideoDuration)}`
                                        : formatMmSsTenths(activeVideoTime)
                                    }
                                    sx={{
                                      height: 22,
                                      fontSize: '0.72rem',
                                      fontVariantNumeric: 'tabular-nums',
                                      fontWeight: 600,
                                    }}
                                  />
                                </Stack>
                                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={
                                      activeVideoPaused ? (
                                        <PlayArrowRounded fontSize="small" />
                                      ) : (
                                        <PauseRounded fontSize="small" />
                                      )
                                    }
                                    disabled={Boolean(
                                      selectedEvidence.processingStatus &&
                                        selectedEvidence.processingStatus !== 'READY',
                                    )}
                                    onClick={handleToggleVideoPlayPause}
                                    sx={{ textTransform: 'none', fontWeight: 600, bgcolor: 'background.paper' }}
                                  >
                                    {activeVideoPaused ? t('Play') : t('Pause')}
                                  </Button>
                                  <ButtonGroup
                                    size="small"
                                    variant="outlined"
                                    disabled={Boolean(
                                      selectedEvidence.processingStatus &&
                                        selectedEvidence.processingStatus !== 'READY',
                                    )}
                                    sx={{ bgcolor: 'background.paper' }}
                                  >
                                    <Button onClick={() => stepVideoTime(-1)} sx={{ px: 1 }}>
                                      -1s
                                    </Button>
                                    <Button onClick={() => stepVideoTime(-0.1)} sx={{ px: 1 }}>
                                      -0.1s
                                    </Button>
                                    <Button onClick={() => stepVideoTime(0.1)} sx={{ px: 1 }}>
                                      +0.1s
                                    </Button>
                                    <Button onClick={() => stepVideoTime(1)} sx={{ px: 1 }}>
                                      +1s
                                    </Button>
                                  </ButtonGroup>
                                <Button
                                  size="small"
                                  variant="contained"
                                  aria-label={t('Capture frame')}
                                  startIcon={<CropRounded fontSize="small" />}
                                  disabled={
                                    Boolean(
                                      selectedEvidence.processingStatus &&
                                        selectedEvidence.processingStatus !== 'READY',
                                     )
                                  }
                                  onClick={handleOpenCropFromVideo}
                                  sx={{ textTransform: 'none', fontWeight: 600 }}
                                >
                                  {`${t('Capture frame')} · ${formatMmSs(activeVideoTime)}`}
                                </Button>
                              </Stack>
                            </Stack>

                            {displayedEvidenceItems.some(
                              (ev) => ev.sourceVideoEvidenceId === selectedEvidence.id,
                            ) && (
                              <Stack
                                direction="row"
                                spacing={0.75}
                                sx={{
                                  pt: 1,
                                  borderTop: '1px dashed',
                                  borderColor: 'divider',
                                  flexWrap: 'wrap',
                                  gap: 0.75,
                                  alignItems: 'center',
                                }}
                              >
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                  {t('Extracted frames:')}
                                </Typography>
                                {displayedEvidenceItems
                                  .filter((ev) => ev.sourceVideoEvidenceId === selectedEvidence.id)
                                  .sort(
                                    (a, b) =>
                                      (a.sourceTimestampSeconds ?? 0) -
                                      (b.sourceTimestampSeconds ?? 0),
                                  )
                                  .map((child) => (
                                    <Chip
                                      key={child.id}
                                      size="small"
                                      variant="outlined"
                                      color="secondary"
                                      icon={<PlayCircleOutlineRounded sx={{ fontSize: 15 }} />}
                                      label={`${formatMmSs(child.sourceTimestampSeconds)} · ${child.fileName}`}
                                      onClick={() =>
                                        seekCurrentVideo(child.sourceTimestampSeconds ?? 0)
                                      }
                                      sx={{ cursor: 'pointer', bgcolor: 'background.paper' }}
                                    />
                                  ))}
                              </Stack>
                            )}

                            {videoCaptureNotice && (
                              <Alert severity="success" onClose={() => setVideoCaptureNotice(null)}>
                                {videoCaptureNotice}
                              </Alert>
                            )}

                            {videoActionError && (
                              <Alert severity="error" onClose={() => setVideoActionError(null)}>
                                {videoActionError}
                              </Alert>
                            )}
                          </Stack>
                        </Paper>
                        )}
                        {selectedEvidence.contentType.startsWith('video/') &&
                          !canUploadEvidence &&
                          displayedEvidenceItems.some(
                            (ev) => ev.sourceVideoEvidenceId === selectedEvidence.id,
                          ) && (
                            <Stack
                              direction="row"
                              spacing={0.75}
                              sx={{ flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}
                            >
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                {t('Extracted frames:')}
                              </Typography>
                              {displayedEvidenceItems
                                .filter((ev) => ev.sourceVideoEvidenceId === selectedEvidence.id)
                                .sort(
                                  (a, b) =>
                                    (a.sourceTimestampSeconds ?? 0) -
                                    (b.sourceTimestampSeconds ?? 0),
                                )
                                .map((child) => (
                                  <Chip
                                    key={child.id}
                                    size="small"
                                    variant="outlined"
                                    color="secondary"
                                    icon={<PlayCircleOutlineRounded sx={{ fontSize: 15 }} />}
                                    label={`${formatMmSs(child.sourceTimestampSeconds)} · ${child.fileName}`}
                                    onClick={() =>
                                      seekCurrentVideo(child.sourceTimestampSeconds ?? 0)
                                    }
                                    sx={{ cursor: 'pointer' }}
                                  />
                                ))}
                            </Stack>
                          )}
                      </Stack>
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
                        <Stack
                          direction="row"
                          spacing={1}
                          sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.75, mt: 0.25 }}
                        >
                          <Typography variant="caption" color="text.secondary">
                            {selectedEvidence.contentType} · {formatBytes(selectedEvidence.sizeBytes)}
                            {selectedEvidence.captureTime ? ` · ${t('Captured')} ${formatDateTime(new Date(selectedEvidence.captureTime))}` : ''}
                          </Typography>
                          {selectedHasGps && (
                            <Chip
                              size="small"
                              variant="outlined"
                              color="primary"
                              icon={<PlaceOutlined sx={{ fontSize: 15 }} />}
                              label={t('View on map')}
                              onClick={() => setMapDialogEvidence(selectedEvidence)}
                              sx={{ height: 22, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                            />
                          )}
                        </Stack>
                      </Box>

                      {canEditEvidence && !selectedEvidence.isDeleted && !hasBatchSelection && (
                        <Box sx={{ flexShrink: 0 }}>
                          <Button
                            size="small"
                            color="error"
                            variant="outlined"
                            startIcon={<DeleteOutlineRounded fontSize="small" />}
                            disabled={deletingLinkedFindings || retire.isPending || bulkRetire.isPending}
                            onClick={handleOpenDeleteConfirm}
                            sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                          >
                            {deletingLinkedFindings || retire.isPending || bulkRetire.isPending
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
        maxWidth={linkedFindingsForTargets.length > 0 ? 'sm' : 'xs'}
        title={
          linkedFindingsForTargets.length > 0
            ? t('Confirm Deletion with Linked Findings')
            : hasBatchSelection
              ? t('Confirm Batch Deletion')
              : t('Confirm Evidence Deletion')
        }
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
        confirmLabel={
          linkedFindingsForTargets.length > 0
            ? t('Delete findings & captures')
            : t('Confirm delete')
        }
        cancelLabel={t('Cancel')}
        loading={deletingLinkedFindings || retire.isPending || bulkRetire.isPending}
        onCancel={() => {
          setDeleteLinkedError(null);
          setShowDeleteConfirm(false);
        }}
        onConfirm={handleDeleteAction}
      >
        {linkedFindingsForTargets.length > 0 && (
          <Alert severity="warning" sx={{ mt: 1.5, borderRadius: '8px' }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
              {linkedFindingsForTargets.length}{' '}
              {t('active finding(s) cite the selected capture(s).')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t(
                'If you accept, these linked findings will be removed before deleting the selected capture(s). Historical audit records remain preserved.',
              )}
            </Typography>
            <Stack component="ul" spacing={0.25} sx={{ mt: 0.75, mb: 0, pl: 2.25 }}>
              {linkedFindingsForTargets.slice(0, 5).map((finding) => {
                const citedCapture = displayedEvidenceItems.find(
                  (ev) => ev.id === finding.evidenceId,
                );
                return (
                  <Typography component="li" variant="caption" key={finding.id}>
                    <strong>{finding.findingCode || finding.defectLabel}</strong>
                    {finding.defectLabel && finding.findingCode ? ` · ${finding.defectLabel}` : ''}
                    {` (${finding.severity})`}
                    {citedCapture ? ` — ${citedCapture.fileName}` : ''}
                  </Typography>
                );
              })}
              {linkedFindingsForTargets.length > 5 && (
                <Typography component="li" variant="caption" color="text.secondary">
                  +{linkedFindingsForTargets.length - 5} {t('more linked finding(s)')}
                </Typography>
              )}
            </Stack>
          </Alert>
        )}
        {deleteLinkedError && (
          <Alert severity="error" sx={{ mt: 1.5, borderRadius: '8px' }}>
            {deleteLinkedError}
          </Alert>
        )}
      </ConfirmDialog>

      <VideoFrameCropDialog
        key={
          cropDialogState.open
            ? `${selectedEvidence?.id ?? 'video'}-${cropDialogState.timestampSeconds}`
            : 'closed'
        }
        open={cropDialogState.open}
        frameDataUrl={cropDialogState.frameDataUrl}
        naturalWidth={cropDialogState.naturalWidth}
        naturalHeight={cropDialogState.naturalHeight}
        timestampSeconds={cropDialogState.timestampSeconds}
        sourceVideoName={selectedEvidence?.fileName ?? 'mission.mp4'}
        existingFileNames={displayedEvidenceItems.map((item) => item.fileName)}
        saving={savingCropped}
        onClose={() => setCropDialogState((prev) => ({ ...prev, open: false }))}
        onSaveCroppedFile={handleSaveCroppedFrame}
      />

      {mapDialogEvidence && hasValidGps(mapDialogEvidence.latitude, mapDialogEvidence.longitude) && (
        <EvidenceGpsMapDialog
          open
          onClose={() => setMapDialogEvidence(null)}
          fileName={mapDialogEvidence.fileName}
          latitude={Number(mapDialogEvidence.latitude)}
          longitude={Number(mapDialogEvidence.longitude)}
          captureTime={mapDialogEvidence.captureTime}
          locationDescription={mapDialogEvidence.locationDescription}
        />
      )}
    </Stack>
  );
}
